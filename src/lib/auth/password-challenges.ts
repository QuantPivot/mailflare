import { eq } from "drizzle-orm";
import { getDb } from "@/db";
import { loginChallenges, passwordResetTokens } from "@/db/schema";

/** A challenge issued for the old password must not grant access after a change. */
export async function invalidatePasswordChallenges(env: CloudflareEnv, userId: string): Promise<void> {
	const db = getDb(env);
	await db.batch([
		db.delete(loginChallenges).where(eq(loginChallenges.userId, userId)),
		db.delete(passwordResetTokens).where(eq(passwordResetTokens.userId, userId)),
	]);
}
