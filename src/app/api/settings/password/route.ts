import { and, eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { invalidatePasswordChallenges } from "@/lib/auth/password-challenges";
import { getDb } from "@/db";
import { users } from "@/db/schema";
import { requireSessionUser } from "@/lib/api/auth";
import { deleteUserSessions, getSessionTokenFromRequestHeaders } from "@/lib/auth/session";
import { hashPassword, verifyPassword } from "@/lib/auth/password";
import { getEnv } from "@/lib/cloudflare";
import type { ChangePasswordInput } from "./types";
import { parseChangePasswordRequest } from "./utils";

export async function PATCH(request: Request) {
	const env = getEnv();
	const session = await requireSessionUser(env, request, { allowPasswordChange: true });
	if (session.error) return session.error;
	const user = session.user;
	let parsed: ChangePasswordInput;

	try {
		parsed = await parseChangePasswordRequest(request);
	} catch (err) {
		if (err instanceof ZodError) {
			return NextResponse.json({ error: err.flatten() }, { status: 400 });
		}
		return NextResponse.json({ error: "Invalid request" }, { status: 400 });
	}

	if (!verifyPassword(parsed.currentPassword, user.passwordHash)) {
		return NextResponse.json({ error: "Current password is incorrect" }, { status: 400 });
	}

	if (verifyPassword(parsed.newPassword, user.passwordHash)) {
		return NextResponse.json({ error: "New password must be different from the current password" }, { status: 400 });
	}

	const db = getDb(env);
	const [updated] = await db
		.update(users)
		.set({ passwordHash: hashPassword(parsed.newPassword), passwordChangeRequired: false })
		.where(and(eq(users.id, user.id), eq(users.passwordHash, user.passwordHash)))
		.returning({ id: users.id });
	if (!updated) return NextResponse.json({ error: "Your password changed. Sign in again." }, { status: 409 });
	await invalidatePasswordChallenges(env, user.id);
	// Anyone else holding a session for this account is signed out; this one stays.
	await deleteUserSessions(env, user.id, getSessionTokenFromRequestHeaders(request));

	return NextResponse.json({ ok: true });
}
