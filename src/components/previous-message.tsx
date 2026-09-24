import { ChevronRight } from "lucide-react";
import type { PreviousMessageProps } from "./previous-message-types";
import { useT } from "@/i18n/use-t";

export function PreviousMessage({ message }: PreviousMessageProps) {
	const t = useT();

	return (
		<details className="group mt-4 border-l-2 border-neutral-200 dark:border-neutral-700 pl-4">
			<summary className="flex cursor-pointer list-none items-center gap-2 rounded-md py-2 text-xs font-medium text-neutral-500 dark:text-neutral-400 hover:text-neutral-800 dark:hover:text-neutral-200">
				<ChevronRight className="h-3.5 w-3.5 shrink-0 transition-transform group-open:rotate-90" />
				<span>
					{t("Previous message {direction, select, sent {sent} other {received}} at {date}", {
						direction: message.direction,
						date: message.dateLine,
					})}
				</span>
			</summary>
			<div className="pb-2 pl-5 text-neutral-600 dark:text-neutral-300">
				{message.content && (
					<pre className="whitespace-pre-wrap text-sm font-sans">
						{message.content}
					</pre>
				)}
				{message.quotedContent.map((nestedMessage, index) => (
					<PreviousMessage
						key={`${nestedMessage.dateLine}-${nestedMessage.content.slice(0, 24)}-${index}`}
						message={nestedMessage}
					/>
				))}
			</div>
		</details>
	);
}
