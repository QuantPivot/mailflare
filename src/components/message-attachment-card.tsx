"use client";
import { useT } from "@/i18n/use-t";

import { ArrowDownToLine, Play } from "lucide-react";
import { formatAttachmentSize } from "@/app/(dashboard)/inbox/[messageId]/utils";
import type { MessageAttachmentCardProps } from "./message-attachment-card-types";
import { getAttachmentFileUrl } from "./message-attachment-viewer-utils";
import { getAttachmentVisual } from "./message-attachment-card-utils";

export function MessageAttachmentCard({
	attachment,
	messageId,
	onPreview,
}: MessageAttachmentCardProps) {
 const t = useT();
	const visual = getAttachmentVisual(attachment);
	const Icon = visual.icon;
	const previewUrl = getAttachmentFileUrl(messageId, attachment.id, "preview");

	return (
		<button
			type="button"
			onClick={() => onPreview(attachment)}
			className="group flex w-full items-center gap-3 rounded-lg border border-neutral-200 dark:border-neutral-700 p-2.5 text-left transition-colors hover:border-blue-200 dark:hover:border-blue-800 hover:bg-blue-50/40 dark:hover:bg-blue-950/40"
		>
			{visual.thumbnail === "image" && (
				<img
					src={previewUrl}
					alt=""
					loading="lazy"
					className="h-14 w-14 shrink-0 rounded-md bg-neutral-100 dark:bg-neutral-800 object-cover"
				/>
			)}
			{visual.thumbnail === "video" && (
				<span className="relative h-14 w-14 shrink-0 overflow-hidden rounded-md bg-neutral-900">
					<video
						src={previewUrl}
						muted
						preload="metadata"
						playsInline
						className="h-full w-full object-cover"
					/>
					<span className="absolute inset-0 flex items-center justify-center bg-neutral-950/20">
						<Play className="h-5 w-5 fill-white text-white" />
					</span>
				</span>
			)}
			{visual.thumbnail === null && (
				<span className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-md ${visual.iconClassName}`}>
					<Icon className="h-6 w-6" />
				</span>
			)}
			<span className="min-w-0 flex-1 text-left">
				<span className="block truncate text-sm font-medium text-neutral-900 dark:text-neutral-100">
					{attachment.filename}
				</span>
				<span className="mt-0.5 block truncate text-xs text-neutral-500 dark:text-neutral-400">
					{t(visual.label)} · {formatAttachmentSize(attachment.size)}
				</span>
			</span>
			<ArrowDownToLine className="h-4 w-4 shrink-0 text-neutral-400 transition-colors group-hover:text-blue-600 dark:group-hover:text-blue-400" />
		</button>
	);
}
