"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import type { ManagedAccount } from "../types";
import { fetchManagedAccount, saveManagedAccount } from "../utils";
import { useT } from "@/i18n/use-t";

export default function AccountPermissionsPage() {
	const t = useT();

	const { id } = useParams<{ id: string }>();
	const [account, setAccount] = useState<ManagedAccount | null>(null);
	const [saving, setSaving] = useState(false);
	const [message, setMessage] = useState<string | null>(null);

	useEffect(() => {
		void fetchManagedAccount(id)
			.then(setAccount)
			.catch((error) => setMessage(error instanceof Error ? error.message : "Unable to load permissions"));
	}, [id]);

	async function savePermissions() {
		if (!account) return;
		setSaving(true);
		setMessage(null);
		try {
			await saveManagedAccount(account);
			setMessage("Permissions updated");
		} catch (error) {
			setMessage(error instanceof Error ? error.message : "Unable to update permissions");
		} finally {
			setSaving(false);
		}
	}

	return (
		<div className="space-y-6">
			<div>
				<h1 className="text-3xl font-medium text-neutral-900">{t("Permissions")}</h1>
				<p className="mt-2 text-sm text-neutral-500">{t("Control what this account can manage.")}</p>
			</div>
			<div className="overflow-hidden rounded-3xl bg-white">
				<table className="w-full text-left">
					<thead className="border-b border-neutral-100 bg-neutral-50 text-xs font-semibold uppercase tracking-wide text-neutral-500">
						<tr>
							<th className="px-5 py-3">{t("Permission")}</th>
							<th className="w-28 px-5 py-3 text-center">{t("Allowed")}</th>
						</tr>
					</thead>
					<tbody className="divide-y divide-neutral-100">
						<tr>
							<td className="px-5 py-4">
								<p className="text-sm font-semibold text-neutral-900">{t("Administrator access")}</p>
								<p className="mt-1 text-xs text-neutral-500">{t("Access administration pages and manage Team settings.")}</p>
							</td>
							<td className="px-5 py-4 text-center">
								<Checkbox
									aria-label={t("Allow administrator access")}
									checked={account?.role === "admin"}
									disabled={!account}
									onChange={(event) => account && setAccount({ ...account, role: event.target.checked ? "admin" : "user" })}
								/>
							</td>
						</tr>
						<tr>
							<td className="px-5 py-4">
								<p className="text-sm font-semibold text-neutral-900">{t("Manage mailboxes")}</p>
								<p className="mt-1 text-xs text-neutral-500">{t("Allow this account to add and remove its own inboxes.")}</p>
							</td>
							<td className="px-5 py-4 text-center">
								<Checkbox
									aria-label={t("Allow mailbox management")}
									checked={account?.canManageMailboxes ?? false}
									disabled={!account}
									onChange={(event) => account && setAccount({ ...account, canManageMailboxes: event.target.checked })}
								/>
							</td>
						</tr>
					</tbody>
				</table>
			</div>
			<Button onClick={() => void savePermissions()} disabled={!account || saving}>
				{saving ? t("Saving...") : t("Save permissions")}
			</Button>
			{message && <p className="text-sm text-neutral-500">{t(message)}</p>}
		</div>
	);
}
