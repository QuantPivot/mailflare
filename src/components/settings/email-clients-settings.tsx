"use client";

import { useState } from "react";
import { Copy, KeyRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createJmapApiKey } from "./utils";
import { useT } from "@/i18n/use-t";

/**
 * Settings > Account card for connecting an external mail app over JMAP.
 * Mints an API key with the `jmap` scope and shows the details once.
 */
export function EmailClientsSettings() {
	const t = useT();

	const [name, setName] = useState("");
	const [key, setKey] = useState<string | null>(null);
	const [error, setError] = useState<string | null>(null);
	const [busy, setBusy] = useState(false);
	const [copied, setCopied] = useState<string | null>(null);
	const server = typeof window !== "undefined" ? window.location.origin : "";

	async function submit(event: React.FormEvent) {
		event.preventDefault();
		setBusy(true);
		setError(null);
		try {
			setKey(await createJmapApiKey(name.trim() || "Mail app"));
			setName("");
		} catch (err) {
			setError(err instanceof Error ? err.message : "Could not create a key");
		} finally {
			setBusy(false);
		}
	}

	function copy(label: string, value: string) {
		void navigator.clipboard.writeText(value).then(() => setCopied(label));
	}

	return (
		<div className="space-y-4">
			<p className="text-sm text-neutral-500 dark:text-neutral-400">
				{t("Apps that speak JMAP (Mailtemi, Twake Mail, aerc, and others) can read and send your mail. Point the app at this server and sign in with your email address and an API key as the password.")}</p>
			{key ? (
				<div className="space-y-3 rounded-2xl bg-neutral-50 dark:bg-neutral-950 p-4">
					<Field label={t("Server")} value={server} onCopy={copy} copied={copied} />
					<Field label={t("Username")} value={t("any value")} onCopy={copy} copied={copied} />
					<Field label={t("Password (API key)")} value={key} onCopy={copy} copied={copied} mono />
					<p className="text-xs text-neutral-500 dark:text-neutral-400">
						{t("This key is shown once. It can be revoked from the API keys page. Session discovery is at")}{" "}<code>{server}/.well-known/jmap</code>.
					</p>
				</div>
			) : (
				<form onSubmit={submit} className="flex flex-wrap items-end gap-3">
					<div className="min-w-56 flex-1 space-y-2">
						<Label htmlFor="jmap-key-name">{t("Device or app name")}</Label>
						<Input id="jmap-key-name" value={name} onChange={(event) => setName(event.target.value)} placeholder={t("Phone")} />
					</div>
					<Button type="submit" disabled={busy}>
						<KeyRound className="h-4 w-4" />
						{busy ? t("Creating...") : t("Create app password")}
					</Button>
					{error && <p className="w-full text-sm text-red-600 dark:text-red-400">{t(error)}</p>}
				</form>
			)}
		</div>
	);
}

function Field({ label, value, onCopy, copied, mono }: { label: string; value: string; onCopy: (label: string, value: string) => void; copied: string | null; mono?: boolean }) {
	const t = useT();

	return (
		<div className="flex items-center gap-3">
			<span className="w-36 shrink-0 text-xs font-medium uppercase tracking-wide text-neutral-500 dark:text-neutral-400">{label}</span>
			<code className={`min-w-0 flex-1 truncate rounded-md bg-card px-2 py-1 text-sm ${mono ? "font-mono" : "font-sans"}`}>{value}</code>
			<Button type="button" variant="ghost" size="sm" onClick={() => onCopy(label, value)} aria-label={t("Copy {value0}", { value0: String(label) })}>
				<Copy className="h-4 w-4" />
				{copied === label ? t("Copied") : t("Copy")}
			</Button>
		</div>
	);
}
