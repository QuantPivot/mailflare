import { NextResponse } from "next/server";
import { assertAdmin } from "@/lib/auth/admin";
import { requireSessionUser } from "@/lib/api/auth";
import { restoreDatabaseRecords } from "@/lib/backups/export";
import { getEnv } from "@/lib/cloudflare";

export async function POST(request: Request) {
	const env = getEnv();
	try {
		const session = await requireSessionUser(env, request);
		if (session.error) return session.error;
		const user = session.user;
		assertAdmin(user);
		const form = await request.formData();
		const file = form.get("backup");
		if (!(file instanceof File)) return NextResponse.json({ error: "Choose a backup file" }, { status: 400 });
		await restoreDatabaseRecords(env.DB, await file.arrayBuffer());
		return NextResponse.json({ ok: true });
	} catch (error) {
		const message = error instanceof Error ? error.message : "Failed to restore backup";
		return NextResponse.json({ error: message }, { status: 400 });
	}
}
