import { NextResponse } from "next/server";
import { getEnv } from "@/lib/cloudflare";
import { requireSessionUser } from "@/lib/api/auth";
import { updateMessageStatusForUser } from "@/lib/user";
import type { MessageStatusPayload } from "./types";
import { isAllowedMessageStatus } from "./utils";

export async function POST(
	request: Request,
	{ params }: { params: Promise<{ messageId: string }> },
) {
	const { messageId } = await params;
	const env = getEnv();
	const session = await requireSessionUser(env, request);
	if (session.error) return session.error;
	const user = session.user;

	const payload = (await request.json()) as MessageStatusPayload;
	if (!isAllowedMessageStatus(payload.status)) {
		return NextResponse.json({ error: "Invalid message status" }, { status: 400 });
	}

	const success = await updateMessageStatusForUser(env, user, messageId, payload.status);
	if (!success) {
		return NextResponse.json({ error: "Message not found" }, { status: 404 });
	}

	return NextResponse.json({ success: true });
}
