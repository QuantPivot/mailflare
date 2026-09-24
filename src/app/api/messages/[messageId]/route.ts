import { NextResponse } from "next/server";
import { requireSessionUser } from "@/lib/api/auth";
import { getEnv } from "@/lib/cloudflare";
import { getMessageWithBodyForUser } from "@/lib/email/inbound";

type MessageRouteParams = {
	params: Promise<{ messageId: string }>;
};

export async function GET(request: Request, { params }: MessageRouteParams) {
	const env = getEnv();
	const session = await requireSessionUser(env, request);
	if (session.error) return session.error;
	const user = session.user;

	const { messageId } = await params;
	const data = await getMessageWithBodyForUser(env, user, messageId);
	if (!data) {
		return NextResponse.json({ error: "Not found" }, { status: 404 });
	}

	return NextResponse.json(data);
}
