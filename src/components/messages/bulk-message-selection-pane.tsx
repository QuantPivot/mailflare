"use client";

import { CheckSquare2 } from "lucide-react";
import { useState } from "react";
import type { BulkMessageAction } from "@/app/api/messages/bulk/types";
import { BulkMessageToolbar } from "./bulk-message-toolbar";
import type { BulkMessageSelectionPaneProps } from "./types";
import { runBulkMessageAction } from "./utils";
import { useT } from "@/i18n/use-t";
import { confirmPermanentDelete } from "./permanent-delete";

export function BulkMessageSelectionPane({
	selectedMessages,
	onClearSelection,
	onDeleted,
}: BulkMessageSelectionPaneProps) {
	const t = useT();

	const [pending, setPending] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const hasUnreadSelection = selectedMessages.some((message) => !message.read);

	async function runAction(action: BulkMessageAction) {
		if (pending || selectedMessages.length === 0) return;
		const messageIds = [...new Set(selectedMessages.flatMap((message) => message.threadMessageIds ?? [message.id]))];
		if (action === "delete" && !confirmPermanentDelete(messageIds.length, t)) return;

		setPending(true);
		setError(null);
		try {
			await runBulkMessageAction(messageIds, action);
			onClearSelection();
			if (action === "delete") onDeleted();
		} catch (nextError) {
			setError(nextError instanceof Error ? nextError.message : "Unable to update selected messages");
		} finally {
			setPending(false);
		}
	}

	return (
		<div className="flex h-full items-center justify-center p-8">
			<div className="w-full max-w-xl text-center">
				<div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-blue-50 dark:bg-blue-950/50 text-blue-700 dark:text-blue-300">
					<CheckSquare2 className="h-6 w-6" />
				</div>
				<h2 className="mt-4 text-lg font-semibold text-neutral-900 dark:text-neutral-100">
					{t("{count} selected", { count: selectedMessages.length })}</h2>
				<p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">
					{t("Choose an action to apply to the selected emails.")}</p>
				<div className="mt-5 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-card p-3 shadow-sm">
					<BulkMessageToolbar
						selectedCount={selectedMessages.length}
						permanentDelete={selectedMessages.every((message) => message.status === "trash")}
						hasUnreadSelection={hasUnreadSelection}
						onAction={runAction}
						onClearSelection={onClearSelection}
						pending={pending}
						hideSelectedCount
					/>
				</div>
				{error && <p role="alert" className="mt-3 text-sm text-red-600 dark:text-red-400">{t(error)}</p>}
			</div>
		</div>
	);
}
