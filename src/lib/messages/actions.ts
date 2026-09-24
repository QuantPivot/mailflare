import type { BulkMessageAction } from "@/app/api/messages/bulk/types";
import { authFetch } from "@/lib/auth/client";
import { clearMessageDetailCache } from "./detail-cache";

export async function applyMessageAction(messageIds: string[], action: BulkMessageAction, notify = true): Promise<void> {
	const response = await authFetch("/api/messages/bulk", {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify({ messageIds, action }),
	});
	const result = await response.json().catch(() => ({})) as { error?: string };
	if (action === "delete") clearMessageDetailCache();
	if (notify && (response.ok || action === "delete")) {
		window.dispatchEvent(new Event("mailflare:messages-changed"));
	}
	if (!response.ok) throw new Error(result.error ?? "Unable to update selected messages");
}
