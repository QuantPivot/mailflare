"use client";

import { useState } from "react";
import { Archive, Clock, Mail, MailOpen, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Tooltip } from "@/components/ui/tooltip";
import type { MessageListRowActionsProps, RowMessageAction } from "./types";
import { getSnoozePresets, isMessageSnoozed, snoozeMessage, unsnoozeMessage } from "./message-list-row-actions-utils";
import { useT } from "@/i18n/use-t";

export function MessageListRowActions({ message, onAction }: MessageListRowActionsProps) {
	const t = useT();

	const [snoozeOpen, setSnoozeOpen] = useState(false);
	const [snoozedUntil, setSnoozedUntil] = useState(() => getSnoozePresets()[0].value);
	const [snoozing, setSnoozing] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [pendingAction, setPendingAction] = useState(false);
	const permanentDelete = message.status === "trash";
	const deleteLabel = permanentDelete ? t("Delete permanently") : t("Trash");
	const snoozePresets = getSnoozePresets();
	const snoozed = isMessageSnoozed(message.snoozedUntil);
	const readAction = message.read ? "unread" : "read";

	async function runAction(action: RowMessageAction): Promise<void> {
		if (pendingAction) return;
		setPendingAction(true);
		try {
			await onAction(action);
		} catch (nextError) {
			setError(nextError instanceof Error ? nextError.message : "Unable to update selected messages");
		} finally {
			setPendingAction(false);
		}
	}

	async function handleSnooze() {
		setSnoozing(true);
		setError(null);
		try {
			await snoozeMessage(message.id, snoozedUntil);
			setSnoozeOpen(false);
		} catch (nextError) {
			setError(nextError instanceof Error ? nextError.message : "Unable to snooze message");
		} finally {
			setSnoozing(false);
		}
	}

	return (
		<>
			<div className="pointer-events-none absolute right-6 top-1/2 z-10 flex -translate-y-1/2 items-center gap-1 pl-3 opacity-0 transition-opacity group-hover:pointer-events-auto group-hover:opacity-100 group-focus-within:pointer-events-auto group-focus-within:opacity-100 bg-[#f2f6fc]">
				<Tooltip label={t("Archive")}>
					<Button type="button" variant="ghost" size="sm" disabled={pendingAction} onClick={() => void runAction("archive")} aria-label={t("Archive")}>
						<Archive className="h-4 w-4" />
					</Button>
				</Tooltip>
				<Tooltip label={deleteLabel}>
					<Button type="button" variant="ghost" size="sm" disabled={pendingAction} onClick={() => void runAction(permanentDelete ? "delete" : "trash")} aria-label={deleteLabel} className={permanentDelete ? "text-red-600 hover:bg-red-50 hover:text-red-700" : undefined}>
						<Trash2 className="h-4 w-4" />
					</Button>
				</Tooltip>
				<Tooltip label={readAction === "read" ? t("Mark as read") : t("Mark as unread")}>
					<Button type="button" variant="ghost" size="sm" disabled={pendingAction} onClick={() => void runAction(readAction)} aria-label={readAction === "read" ? t("Mark as read") : t("Mark as unread")}>
						{readAction === "read" ? <MailOpen className="h-4 w-4" /> : <Mail className="h-4 w-4" />}
					</Button>
				</Tooltip>
				{!permanentDelete && <Tooltip label={snoozed ? t("Unsnooze") : t("Snooze")}>
					<Button type="button" variant="ghost" size="sm" onClick={() => {
						if (snoozed) {
							void unsnoozeMessage(message.id);
							return;
						}
						setSnoozeOpen(true);
					}} aria-label={snoozed ? t("Unsnooze") : t("Snooze")}>
						<Clock className="h-4 w-4" />
					</Button>
				</Tooltip>}
			</div>

			<Dialog open={snoozeOpen} onOpenChange={setSnoozeOpen}>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>{t("Snooze email")}</DialogTitle>
						<DialogDescription>{t("Hide this email from the inbox until the time you choose.")}</DialogDescription>
					</DialogHeader>
					<div className="space-y-4">
						<div className="grid gap-2 sm:grid-cols-3">
							{snoozePresets.map((preset) => (
								<Button key={preset.label} type="button" variant="outline" size="sm" onClick={() => setSnoozedUntil(preset.value)}>
									{t(preset.label)}
								</Button>
							))}
						</div>
						<div className="space-y-2">
							<label htmlFor={`snooze-until-${message.id}`} className="text-sm font-medium text-neutral-700">{t("Select date and time")}</label>
							<Input id={`snooze-until-${message.id}`} type="datetime-local" value={snoozedUntil} onChange={(event) => setSnoozedUntil(event.target.value)} />
						</div>
						{error && <p className="text-sm text-red-600">{t(error)}</p>}
						<Button type="button" onClick={() => void handleSnooze()} disabled={snoozing}>
							{snoozing ? t("Snoozing...") : t("Snooze")}
						</Button>
					</div>
				</DialogContent>
			</Dialog>
		</>
	);
}
