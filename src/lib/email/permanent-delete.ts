import { inArray } from "drizzle-orm";
import { getDb } from "@/db";
import { messages, type users } from "@/db/schema";
import { getMailboxAccessLevel } from "@/lib/mailboxes/access";
import { createAuditLog } from "@/lib/mailboxes/audit";
import { deleteMessageWithObjects } from "./message-cleanup";
import type { PermanentDeleteResult } from "./permanent-delete-types";

/** Validate the entire selection before removing any message or external object. */
export async function permanentlyDeleteMessages(
	env: CloudflareEnv,
	user: typeof users.$inferSelect,
	messageIds: string[],
): Promise<PermanentDeleteResult> {
	const db = getDb(env);
	const ids = [...new Set(messageIds)];
	const selectedMessages: (typeof messages.$inferSelect)[] = [];
	// Leave room below D1's bind-parameter limit, including large conversations.
	for (let index = 0; index < ids.length; index += 90) {
		selectedMessages.push(...await db.select().from(messages).where(inArray(messages.id, ids.slice(index, index + 90))));
	}
	const mailboxIds = new Set(selectedMessages.map((message) => message.mailboxId));
	for (const mailboxId of mailboxIds) {
		const access = mailboxId ? await getMailboxAccessLevel(db, user, mailboxId) : null;
		if (!access?.canManage) {
			return { status: 404, ok: false, deletedIds: [], error: "No accessible messages" };
		}
	}
	if (selectedMessages.some((message) => message.status !== "trash")) {
		return { status: 409, ok: false, deletedIds: [], error: "Only messages in Trash can be permanently deleted. Refresh the list and try again." };
	}

	const deletedIds: string[] = [];
	const failedIds: string[] = [];
	for (const message of selectedMessages) {
		try {
			await deleteMessageWithObjects(env, db, message.id, message.rawR2Key);
		} catch (error) {
			console.error("Permanent message deletion failed", message.id, error);
			failedIds.push(message.id);
			continue;
		}
		deletedIds.push(message.id);
		// The message no longer exists; keep its ID in metadata, not the foreign key.
		try {
			await createAuditLog(env, {
				actorUserId: user.id,
				mailboxId: message.mailboxId,
				action: "email.delete",
				metadata: { messageId: message.id, bulkAction: "delete", permanent: true },
			});
		} catch (error) {
			console.error("Permanent deletion audit failed", message.id, error);
		}
	}
	if (failedIds.length) {
		return { status: 502, ok: false, deletedIds, failedIds, error: "Some messages could not be permanently deleted. Please try again." };
	}
	// Already absent IDs are a successful no-op, allowing safe retries after partial failures.
	return { status: 200, ok: true, deletedIds };
}
