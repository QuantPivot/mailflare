import { eq } from "drizzle-orm";
import { getDb } from "@/db";
import { licenseSettings } from "@/db/schema";
import type { LicenseEntitlements, LicensePlan, LicenseStatus, PaymugLicenseAction } from "./types";
import { hashLicenseKey, parseFeatures } from "./utils";

const LICENSE_SETTINGS_ID = "default";

async function getOrCreateLicenseSettings(env: CloudflareEnv) {
	const db = getDb(env);
	await db
		.insert(licenseSettings)
		.values({ id: LICENSE_SETTINGS_ID, instanceId: crypto.randomUUID() })
		.onConflictDoNothing({ target: licenseSettings.id });
	const [settings] = await db
		.select()
		.from(licenseSettings)
		.where(eq(licenseSettings.id, LICENSE_SETTINGS_ID))
		.limit(1);
	if (!settings) throw new Error("Unable to initialize license settings");
	return settings;
}

function toLicenseStatus(settings: typeof licenseSettings.$inferSelect): LicenseStatus {
	const active = settings.state === "active" && (settings.plan === "pro" || settings.plan === "team");
	return {
		plan: active ? settings.plan : "community",
		state: settings.state,
		features: parseFeatures(settings.features),
		instanceId: settings.instanceId,
		instanceUrl: settings.instanceUrl,
		active,
		activatedAt: settings.activatedAt,
		validatedAt: settings.validatedAt,
	};
}

export async function getLicenseStatus(env: CloudflareEnv): Promise<LicenseStatus> {
	return toLicenseStatus(await getOrCreateLicenseSettings(env));
}

export async function getLicenseEntitlements(env: CloudflareEnv): Promise<LicenseEntitlements> {
	try {
		const status = await getLicenseStatus(env);
		return {
			plan: status.plan,
			canCustomizeBranding: status.active && (status.plan === "pro" || status.plan === "team"),
			canManageAccounts: status.active && status.plan === "team",
			canForwardEmail: status.active && (status.plan === "pro" || status.plan === "team"),
		};
	} catch {
		return { plan: "community", canCustomizeBranding: false, canManageAccounts: false, canForwardEmail: false };
	}
}

async function updateLicenseLocally(
	env: CloudflareEnv,
	action: PaymugLicenseAction,
	licenseKey: string,
	instanceUrl: string,
	requestedPlan?: Exclude<LicensePlan, "community">,
): Promise<LicenseStatus> {
	const settings = await getOrCreateLicenseSettings(env);
	const licenseKeyHash = licenseKey ? await hashLicenseKey(licenseKey) : null;
	const plan = action === "activate" ? requestedPlan : settings.plan;
	if (plan !== "pro" && plan !== "team") throw new Error("Choose the license product to activate");

	// This self-hosted installation accepts any non-empty key without remote validation.
	const now = new Date();
	const db = getDb(env);

	if (action === "deactivate") {
		await db
			.update(licenseSettings)
			.set({
				licenseKeyHash: null,
				plan: "community",
				state: "deactivated",
				features: "[]",
				validatedAt: now,
				updatedAt: now,
			})
			.where(eq(licenseSettings.id, LICENSE_SETTINGS_ID));
		return getLicenseStatus(env);
	}

	await db
		.update(licenseSettings)
		.set({
			licenseKeyHash: licenseKeyHash ?? settings.licenseKeyHash,
			instanceUrl: action === "activate" ? instanceUrl : settings.instanceUrl,
			plan,
			state: "active",
			activatedAt: action === "activate" ? now : settings.activatedAt,
			validatedAt: now,
			updatedAt: now,
		})
		.where(eq(licenseSettings.id, LICENSE_SETTINGS_ID));

	return getLicenseStatus(env);
}

export function activateLicense(
	env: CloudflareEnv,
	licenseKey: string,
	instanceUrl: string,
	plan: Exclude<LicensePlan, "community">,
) {
	return updateLicenseLocally(env, "activate", licenseKey, instanceUrl, plan);
}

export function validateLicense(env: CloudflareEnv, licenseKey: string, instanceUrl: string) {
	return updateLicenseLocally(env, "validate", licenseKey, instanceUrl);
}

export function deactivateLicense(env: CloudflareEnv) {
	return updateLicenseLocally(env, "deactivate", "", "");
}
