import { NextResponse } from "next/server";
import { requireSessionUser } from "@/lib/api/auth";
import { getEnv } from "@/lib/cloudflare";
import { getMessageMetadataForUser } from "@/lib/email/inbound";
import type { MessageMetadataRouteParams } from "./types";

export async function GET(request: Request, { params }: MessageMetadataRouteParams) {
	const env = getEnv();
	const session = await requireSessionUser(env, request);
	if (session.error) return session.error;
	const user = session.user;

	const { messageId } = await params;
	const metadata = await getMessageMetadataForUser(env, user, messageId);
	if (!metadata) return NextResponse.json({ error: "Not found" }, { status: 404 });
	return NextResponse.json(metadata);
}
