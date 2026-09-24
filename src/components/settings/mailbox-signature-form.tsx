"use client";

import { useEffect, useState } from "react";
import { useSelectedMailbox } from "@/components/mailbox-provider";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { updateMailboxSignature } from "./utils";
import { useT } from "@/i18n/use-t";

export function MailboxSignatureForm() {
	const t = useT();

	const { selectedMailbox, setSelectedMailbox, isLoading } = useSelectedMailbox();
	const [signature, setSignature] = useState("");
	const [savedSignature, setSavedSignature] = useState("");
	const [status, setStatus] = useState<string | null>(null);
	const [saving, setSaving] = useState(false);

	useEffect(() => {
		const nextSignature = selectedMailbox?.signature ?? "";
		setSignature(nextSignature);
		setSavedSignature(nextSignature);
		setStatus(null);
	}, [selectedMailbox?.id, selectedMailbox?.signature]);

	async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
		event.preventDefault();
		if (!selectedMailbox) return;
		setSaving(true);
		setStatus(null);
		try {
			const saved = await updateMailboxSignature(selectedMailbox.id, signature);
			setSignature(saved);
			setSavedSignature(saved);
			setSelectedMailbox({ ...selectedMailbox, signature: saved });
			setStatus("Saved");
		} catch (error) {
			setStatus(error instanceof Error ? error.message : "Failed to update signature");
		} finally {
			setSaving(false);
		}
	}

	if (isLoading) return <p className="text-sm text-neutral-500 dark:text-neutral-400">{t("Loading inbox…")}</p>;
	if (!selectedMailbox) return <p className="text-sm text-neutral-500 dark:text-neutral-400">{t("Select an inbox to configure its signature.")}</p>;

	const address = `${selectedMailbox.localPart}@${selectedMailbox.hostname}`;
	const canManage = selectedMailbox.permission === "full_access";

	return (
		<form onSubmit={onSubmit} className="space-y-4">
			<div className="space-y-2">
				<Label htmlFor="mailboxSignature">{t("Signature for {address}", { address })}</Label>
				<Textarea
					id="mailboxSignature"
					value={signature}
					onChange={(event) => setSignature(event.target.value)}
					placeholder={t("Your name\nRole or company\nContact details")}
					rows={6}
					disabled={!canManage || saving}
				/>
				<p className="text-xs leading-5 text-neutral-500 dark:text-neutral-400">
					{t("This signature is added when composing from the selected inbox.")}</p>
			</div>
			<div className="flex items-center gap-3">
				<Button type="submit" disabled={!canManage || saving || signature.trim() === savedSignature}>
					{saving ? t("Saving...") : t("Save signature")}
				</Button>
				{!canManage && <p className="text-sm text-neutral-500 dark:text-neutral-400">{t("Full access is required to edit this signature.")}</p>}
				{status && <p className="text-sm text-neutral-500 dark:text-neutral-400">{t(status)}</p>}
			</div>
		</form>
	);
}
