import { authFetch } from "@/lib/auth/client";
import type { DnsAuthRecord, DnsAuthStatus, DomainPreflightResponse } from "./types";

export const dnsAuthRecords: DnsAuthRecord[] = ["mx", "spf", "dkim", "dmarc"];

export const dnsAuthDescriptions: Record<DnsAuthRecord, string> = {
	mx: "Routes incoming email to Mailflare",
	spf: "Authorizes Mailflare to send email",
	dkim: "Signs outgoing email for deliverability",
	dmarc: "Helps prevent email spoofing",
};

export function getDnsAuthStatusLabel(status: DnsAuthStatus): string {
	switch (status) {
		case "ok":
			return "found";
		case "missing":
			return "missing";
		default:
			return "not verified";
	}
}

export function getDnsAuthItemClass(status: DnsAuthStatus): string {
	switch (status) {
		case "ok":
			return "bg-green-50 dark:bg-green-950/50 text-green-800 dark:text-green-300";
		case "missing":
			return "bg-red-50 dark:bg-red-950/50 text-red-800 dark:text-red-300";
		default:
			return "bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300";
	}
}

export async function checkDomain(hostname: string): Promise<DomainPreflightResponse> {
	const response = await authFetch("/api/domains/check", {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify({ hostname }),
	});
	const data = (await response.json()) as Omit<DomainPreflightResponse, "ok">;
	return { ok: response.ok, ...data };
}
