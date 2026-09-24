import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { getDb } from "@/db";
import { messages } from "@/db/schema";
import { requireSessionUser } from "@/lib/api/auth";
import { getEnv } from "@/lib/cloudflare";
import { getMailboxAccessLevel } from "@/lib/mailboxes/access";

export async function POST(
	_request: Request,
	{ params }: { params: Promise<{ messageId: string }> },
) {
	const { messageId } = await params;
	const env = getEnv();
	const session = await requireSessionUser(env, _request);
	if (session.error) return session.error;
	const user = session.user;

	const db = getDb(env);
	const [message] = await db
		.select({ id: messages.id, mailboxId: messages.mailboxId, starred: messages.starred })
		.from(messages)
		.where(eq(messages.id, messageId))
		.limit(1);
	if (!message?.mailboxId) return NextResponse.json({ error: "Message not found" }, { status: 404 });

	const access = await getMailboxAccessLevel(db, user, message.mailboxId);
	if (!access?.canRead) return NextResponse.json({ error: "Message not found" }, { status: 404 });

	const starred = !message.starred;
	await db.update(messages).set({ starred }).where(eq(messages.id, message.id));
	return NextResponse.json({ starred });
}
