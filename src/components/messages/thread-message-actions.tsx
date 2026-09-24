"use client";

import { createElement, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Ban, Forward, Mail, MailOpen, MoreVertical, Reply, ReplyAll, Star, Trash2 } from "lucide-react";
import { useCompose } from "@/components/compose/compose-context";
import { getOwnAddressForMessage } from "@/app/(dashboard)/inbox/[messageId]/utils";
import { Button } from "@/components/ui/button";
import { Tooltip } from "@/components/ui/tooltip";
import {
	blockMessageContact,
	createForwardDraft,
	createReplyDraft,
	getMoveMessageActions,
	getReplyRecipients,
	getReplyThreading,
	hasAdditionalRecipients,
	runSingleMessageAction,
} from "@/components/message-actions/utils";
import { toggleMessageStar } from "./message-list-row-actions-utils";
import type { ThreadMessageActionsProps } from "./thread-message-actions-types";
import type { ReplyMode } from "@/components/message-actions/types";
import { useT } from "@/i18n/use-t";
import { confirmPermanentDelete } from "./permanent-delete";

export function ThreadMessageActions({
	message,
	mailboxId,
	ownAddress,
	ownAddresses = [],
}: ThreadMessageActionsProps) {
	const t = useT();
	const router = useRouter();

	const { openDraftComposer } = useCompose();
	const [starred, setStarred] = useState(message.starred);
	const [moreOpen, setMoreOpen] = useState(false);
	const [pending, setPending] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const canReplyAll = hasAdditionalRecipients(message, ownAddresses);
	const moveActions = getMoveMessageActions(message.status, message.direction);
	const replyFromAddress = ownAddresses.length > 0
		? getOwnAddressForMessage(message, ownAddresses)
		: ownAddress;

	useEffect(() => setStarred(message.starred), [message.starred]);

	async function onToggleStar() {
		setPending(true);
		setError(null);
		try {
			setStarred(await toggleMessageStar(message.id));
		} catch (nextError) {
			setError(nextError instanceof Error ? nextError.message : "Unable to update star");
		} finally {
			setPending(false);
		}
	}

	async function onReply(mode: ReplyMode) {
		setMoreOpen(false);
		setPending(true);
		setError(null);
		try {
			const draftId = await createReplyDraft({
				mailboxId,
				senderAddress: message.fromAddr,
				ownAddress: replyFromAddress,
				subject: message.subject,
				bodyText: message.textBody,
				bodyHtml: message.htmlBody,
				sentAt: message.createdAt,
				recipients: getReplyRecipients(message, ownAddresses, mode),
				threading: getReplyThreading(message),
			});
			openDraftComposer(draftId);
		} catch (nextError) {
			setError(nextError instanceof Error ? nextError.message : "Could not start reply");
		} finally {
			setPending(false);
		}
	}

	async function onForward() {
		setMoreOpen(false);
		setPending(true);
		setError(null);
		try {
			const draftId = await createForwardDraft({
				mailboxId,
				ownAddress: replyFromAddress,
				message,
				bodyText: message.textBody,
				bodyHtml: message.htmlBody,
			});
			openDraftComposer(draftId);
		} catch (nextError) {
			setError(nextError instanceof Error ? nextError.message : "Could not start forward");
		} finally {
			setPending(false);
		}
	}

	async function onMessageAction(action: Parameters<typeof runSingleMessageAction>[1]) {
		if (pending) return;
		if (action === "delete" && !confirmPermanentDelete(1, t)) return;
		setMoreOpen(false);
		setPending(true);
		setError(null);
		try {
			await runSingleMessageAction(message.id, action);
			if (action === "delete") router.replace("/trash");
		} catch (nextError) {
			setError(nextError instanceof Error ? nextError.message : "Could not update message");
		} finally {
			setPending(false);
		}
	}

	async function onBlock() {
		if (!mailboxId) return;
		setMoreOpen(false);
		setPending(true);
		setError(null);
		try {
			await blockMessageContact({ mailboxId, senderAddress: message.fromAddr });
			await runSingleMessageAction(message.id, "trash");
		} catch (nextError) {
			setError(nextError instanceof Error ? nextError.message : "Could not block contact");
		} finally {
			setPending(false);
		}
	}

	return (
		<div className="flex items-center gap-0.5">
			{error && <span className="mr-1 max-w-32 truncate text-xs text-red-600 dark:text-red-400" title={t(error)}>{t(error)}</span>}
			<Tooltip label={starred ? t("Remove star") : t("Star")}>
				<Button
					type="button"
					variant="ghost"
					size="sm"
					className="h-8 w-8 px-0"
					aria-label={starred ? t("Remove star") : t("Star")}
					aria-pressed={starred}
					disabled={pending}
					onClick={() => void onToggleStar()}
				>
					<Star className={starred ? "h-4 w-4 fill-amber-400 text-amber-400" : "h-4 w-4"} />
				</Button>
			</Tooltip>
			<Tooltip label={t("Reply")}>
				<Button
					type="button"
					variant="ghost"
					size="sm"
					className="h-8 w-8 px-0"
					aria-label={t("Reply")}
					disabled={pending}
					onClick={() => void onReply("reply")}
				>
					<Reply className="h-4 w-4" />
				</Button>
			</Tooltip>
			<div className="relative">
				<Tooltip label={t("More actions")}>
					<Button
						type="button"
						variant="ghost"
						size="sm"
						className="h-8 w-8 px-0"
						aria-label={t("More actions")}
						aria-expanded={moreOpen}
						disabled={pending}
						onClick={() => setMoreOpen((open) => !open)}
					>
						<MoreVertical className="h-4 w-4" />
					</Button>
				</Tooltip>
				{moreOpen && (
					<div className="absolute right-0 z-30 mt-1 w-56 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-card p-2 text-neutral-700 dark:text-neutral-300 shadow-lg">
						<button type="button" className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm hover:bg-neutral-100 dark:hover:bg-neutral-800" onClick={() => void onReply("reply")}>
							<Reply className="h-4 w-4" /> {" "}{t("Reply")}</button>
						{canReplyAll && (
							<button type="button" className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm hover:bg-neutral-100 dark:hover:bg-neutral-800" onClick={() => void onReply("replyAll")}>
								<ReplyAll className="h-4 w-4" /> {" "}{t("Reply all")}</button>
						)}
						<button type="button" className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm hover:bg-neutral-100 dark:hover:bg-neutral-800" onClick={() => void onForward()}>
							<Forward className="h-4 w-4" /> {" "}{t("Forward")}</button>
						<hr className="my-1 border-neutral-100 dark:border-neutral-800" />
						<button type="button" className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm hover:bg-neutral-100 dark:hover:bg-neutral-800" onClick={() => void onMessageAction(message.read ? "unread" : "read")}>
							{message.read ? <Mail className="h-4 w-4" /> : <MailOpen className="h-4 w-4" />}
							{message.read ? t("Mark as unread") : t("Mark as read")}
						</button>
						{moveActions.map((item) => (
							<button key={item.action} type="button" className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm hover:bg-neutral-100 dark:hover:bg-neutral-800" onClick={() => void onMessageAction(item.action)}>
								{createElement(item.icon, { size: 16 })} {t(item.label)}
							</button>
						))}
						{message.status === "trash" && (
							<button type="button" className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/50 hover:text-red-700 dark:hover:text-red-300" onClick={() => void onMessageAction("delete")}>
								<Trash2 className="h-4 w-4" /> {t("Delete permanently")}
							</button>
						)}
						{message.direction === "inbound" && mailboxId && (
							<>
								<hr className="my-1 border-neutral-100 dark:border-neutral-800" />
								<button type="button" className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm hover:bg-neutral-100 dark:hover:bg-neutral-800" onClick={() => void onBlock()}>
									<Ban className="h-4 w-4" /> {" "}{t("Block contact")}</button>
							</>
						)}
					</div>
				)}
			</div>
		</div>
	);
}
