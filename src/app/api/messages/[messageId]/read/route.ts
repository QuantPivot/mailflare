import { NextResponse } from "next/server";
import { getEnv } from "@/lib/cloudflare";
import { requireSessionUser } from "@/lib/api/auth";
import { markMessageAsReadForUser } from "@/lib/user";

export async function POST(
	request: Request,
	{ params }: { params: Promise<{ messageId: string }> },
) {
	const { messageId } = await params;
	const env = getEnv();
	const session = await requireSessionUser(env, request);
	if (session.error) return session.error;
	const user = session.user;

	const success = await markMessageAsReadForUser(env, user, messageId);
	if (!success) {
		return NextResponse.json({ error: "Message not found" }, { status: 404 });
	}

	return NextResponse.json({ success: true });
}
