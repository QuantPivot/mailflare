import { NextResponse } from "next/server";
import { requireSessionUser } from "@/lib/api/auth";
import { getEnv } from "@/lib/cloudflare";
import { getMessageThreadForUser } from "@/lib/email/thread-view";

type MessageRouteParams = {
	params: Promise<{ messageId: string }>;
};

/** Every message in the same conversation as `messageId`, oldest first, with bodies. */
export async function GET(request: Request, { params }: MessageRouteParams) {
	const env = getEnv();
	const session = await requireSessionUser(env, request);
	if (session.error) return session.error;
	const user = session.user;

	const { messageId } = await params;
	const data = await getMessageThreadForUser(env, user, messageId);
	if (!data) {
		return NextResponse.json({ error: "Not found" }, { status: 404 });
	}

	return NextResponse.json(data);
}
