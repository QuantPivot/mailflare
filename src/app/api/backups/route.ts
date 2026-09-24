import { NextResponse } from "next/server";
import { assertAdmin } from "@/lib/auth/admin";
import { requireSessionUser } from "@/lib/api/auth";
import { getBackupConfigurationStatus } from "@/lib/backups/export";
import { runDatabaseBackup } from "@/lib/backups/runner";
import {
	createBackupRecord,
	getBackupSettings,
	listBackups,
	updateBackupSettings,
} from "@/lib/backups/service";
import { getEnv } from "@/lib/cloudflare";
import { parseBackupSettingsInput } from "./utils";

async function requireAdmin(request: Request) {
	const env = getEnv();
	const session = await requireSessionUser(env, request);
	if (session.error) return session.error;
	const user = session.user;
	assertAdmin(user);
	return { env, user };
}

export async function GET(request: Request) {
	try {
		const access = await requireAdmin(request);
		if (access instanceof Response) return access;
		const { env } = access;
		const [settings, backupList] = await Promise.all([
			getBackupSettings(env),
			listBackups(env),
		]);
		return NextResponse.json({
			settings,
			backups: backupList,
			configuration: getBackupConfigurationStatus(env),
		});
	} catch {
		return NextResponse.json({ error: "Forbidden" }, { status: 403 });
	}
}

export async function PUT(request: Request) {
	try {
		const access = await requireAdmin(request);
		if (access instanceof Response) return access;
		const { env } = access;
		const input = parseBackupSettingsInput(await request.json());
		if (!input) return NextResponse.json({ error: "Invalid backup settings" }, { status: 400 });
		await updateBackupSettings(env, input);
		return NextResponse.json({ ok: true });
	} catch {
		return NextResponse.json({ error: "Forbidden" }, { status: 403 });
	}
}

export async function POST(request: Request) {
	try {
		const access = await requireAdmin(request);
		if (access instanceof Response) return access;
		const { env, user } = access;
		const backupId = await createBackupRecord(env, "manual", user.id);
		await runDatabaseBackup(env, backupId);
		return NextResponse.json({ backupId });
	} catch (error) {
		const message = error instanceof Error ? error.message : "Failed to run backup";
		return NextResponse.json({ error: message }, { status: 400 });
	}
}
