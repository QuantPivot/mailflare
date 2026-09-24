import assert from "node:assert/strict";
import { mkdir, mkdtemp, rm } from "node:fs/promises";
import { join, resolve } from "node:path";
import { eq } from "drizzle-orm";
import { openSqliteDatabase, type SqliteDatabase } from "../server/runtime/sqlite-database";
import { openFileBucket } from "../server/runtime/file-bucket";
import { applyMigrations } from "../server/runtime/migrate";
import { getDb } from "../src/db";
import { users, domains, licenseSettings, apiKeys, passwordResetTokens } from "../src/db/schema";
import { createSession, getUserFromSession, hashSessionToken } from "../src/lib/auth/session";
import { hashPassword, verifyPassword } from "../src/lib/auth/password";
import { generateApiKey } from "../src/lib/api-keys";
import { authenticateApiRequest } from "../src/lib/api/key-auth";
import { completePasswordReset } from "../src/lib/auth/password-reset";
import { createLoginChallenge, getLoginChallengeUserId } from "../src/lib/auth/login-challenge";
import { totp, generateTotpSecret } from "../src/lib/auth/totp";
import { notifyUsersOfNewMessage } from "../src/lib/realtime/utils";
import { POST as createAccount } from "../src/app/api/accounts/route";
import { PATCH as editAccount } from "../src/app/api/accounts/[id]/route";
import { POST as login } from "../src/app/api/auth/login/route";
import { POST as verifyMfa } from "../src/app/api/auth/mfa/verify/route";
import { GET as me } from "../src/app/api/auth/me/route";
import { PATCH as changePassword } from "../src/app/api/settings/password/route";
import { GET as messages } from "../src/app/api/messages/route";
import { POST as bulkMessages } from "../src/app/api/messages/bulk/route";
import { POST as send } from "../src/app/api/send/route";
import { GET as backups } from "../src/app/api/backups/route";
import { GET as keys } from "../src/app/api/api-keys/route";
import { GET as avatar } from "../src/app/api/profile/avatar/route";

/** Actual route handlers, migrated SQLite/D1 and password hashes; no production users or email. */
async function main(): Promise<void> {
	await mkdir("work", { recursive: true });
	const directory = await mkdtemp(resolve("work/password-check-"));
	const database = openSqliteDatabase(join(directory, "mailflare.sqlite")) as unknown as SqliteDatabase;
	const notified: string[] = [];
	const env = {
		DB: database, BUCKET: openFileBucket(join(directory, "blobs")), MAILFLARE_RUNTIME: "node",
		REALTIME: { getByName: (id: string) => ({ fetch: async () => { notified.push(id); return new Response("ok"); } }) },
	} as unknown as CloudflareEnv;
	globalThis.__mailflareNodeEnv = env;
	let checks = 0;
	function passed(label: string): void { checks++; console.log(`PASS ${label}`); }
	function request(path: string, token?: string, body?: unknown, method = "POST"): Request {
		return new Request(`http://localhost${path}`, {
			method: body === undefined ? "GET" : method,
			headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}), "Content-Type": "application/json" },
			...(body === undefined ? {} : { body: JSON.stringify(body) }),
		});
	}
	try {
		await applyMigrations(database, resolve("drizzle/migrations"));
		const db = getDb(env);
		await db.insert(users).values({ id: "admin", email: "admin@example.test", name: "Admin", role: "admin", passwordHash: hashPassword("admin-fixture-password") });
		await db.insert(domains).values({ id: "domain", userId: "admin", hostname: "example.test", zoneId: "manual", status: "active" });
		await db.insert(licenseSettings).values({ id: "default", instanceId: "local-password-check", plan: "team", state: "active" });
		const adminToken = await createSession(env, "admin");
		assert.equal((await getUserFromSession(env, adminToken))?.passwordChangeRequired, false);
		passed("existing accounts default to unrestricted");

		async function create(username: string, passwordChangeRequired?: boolean): Promise<string> {
			const response = await createAccount(request("/api/accounts", adminToken, { username, domainId: "domain", password: "temporary-password", passwordChangeRequired }));
			assert.equal(response.status, 201, await response.clone().text());
			const { account } = await response.json() as { account: { id: string; passwordChangeRequired: boolean } };
			assert.equal(account.passwordChangeRequired, passwordChangeRequired ?? false);
			return account.id;
		}
		const userId = await create("new-user", true);
		const normalId = await create("normal", false);
		await create("legacy-client");
		passed("administrator creation persists explicit choice and supports legacy clients");
		async function signIn(email = "new-user@example.test", password = "temporary-password") {
			const response = await login(request("/api/auth/login", undefined, { email, password }));
			assert.equal(response.status, 200, await response.clone().text());
			return response.json() as Promise<{ token: string; redirect: string; challengeToken: string; mfaRequired?: boolean }>;
		}
		const first = await signIn();
		assert.equal(first.redirect, "/change-password");
		assert.equal((await signIn("normal@example.test")).redirect, "/inbox");
		const token: string = first.token;
		const otherToken = await createSession(env, userId);
		const identity = await (await me(request("/api/auth/me", token))).json() as { user: { passwordChangeRequired: boolean }; hasMailboxes?: boolean };
		assert.equal(identity.user.passwordChangeRequired, true);
		assert.equal(identity.hasMailboxes, undefined);
		passed("restricted login and session identity direct the user to password change");

		for (const [name, handler] of Object.entries({ messages, bulkMessages, send, backups, keys, avatar })) {
			const response = await handler(request(`/api/${name}`, token, {}));
			assert.equal(response.status, 403, name);
			assert.equal((await response.json() as { code: string }).code, "PASSWORD_CHANGE_REQUIRED", name);
		}
		passed("read, write, send, admin, credentials and media APIs refuse restricted sessions");
		const apiKey = generateApiKey();
		await db.insert(apiKeys).values({ id: "key", userId, name: "test", prefix: apiKey.prefix, keyHash: apiKey.hash, scopes: '["*"]' });
		for (const authorization of [`Bearer ${apiKey.fullKey}`, `Basic ${btoa(`user:${apiKey.fullKey}`)}`]) {
			assert.equal(await authenticateApiRequest(env, new Request("http://localhost/jmap", { headers: { Authorization: authorization } })), null);
		}
		passed("API keys and JMAP Basic authentication cannot bypass password change");
		await notifyUsersOfNewMessage(env, [userId, normalId], { type: "new_message", from: "sender@example.test", fromName: null, messageId: "m", mailboxId: "mb", subject: "private" });
		assert.deepEqual(notified, [normalId]);
		passed("previously open realtime connections receive no new mail notifications while restricted");

		for (const [currentPassword, newPassword] of [["wrong-password", "new-password-123"], ["temporary-password", "temporary-password"], ["temporary-password", "short"]]) {
			const response = await changePassword(request("/api/settings/password", token, { currentPassword, newPassword }, "PATCH"));
			assert.equal(response.status, 400);
			assert.equal((await getUserFromSession(env, token))?.passwordChangeRequired, true);
		}
		passed("wrong current password, reused password and short password leave restrictions intact");
		const oldChallenge = await createLoginChallenge(env, userId);
		assert.equal((await changePassword(request("/api/settings/password", token, { currentPassword: "temporary-password", newPassword: "my-own-password" }, "PATCH"))).status, 200);
		assert.equal((await getUserFromSession(env, token))?.passwordChangeRequired, false);
		assert.equal(await getUserFromSession(env, otherToken), null);
		assert.equal(await getLoginChallengeUserId(env, oldChallenge), null);
		assert.equal((await messages(request("/api/messages", token))).status, 200);
		assert.ok(await authenticateApiRequest(env, request("/jmap", apiKey.fullKey)));
		assert.equal((await signIn("new-user@example.test", "my-own-password")).redirect, "/inbox");
		assert.equal((await login(request("/api/auth/login", undefined, { email: "new-user@example.test", password: "temporary-password" }))).status, 401);
		passed("successful change unlocks access, preserves this session and revokes old sessions/challenges/password");

		async function manage(targetId: string, changes: Record<string, unknown>, actorToken = adminToken): Promise<Response> {
			return editAccount(request(`/api/accounts/${targetId}`, actorToken, { name: "New user", role: "user", disabled: false, canManageMailboxes: false, ...changes }, "PATCH"), { params: Promise.resolve({ id: targetId }) });
		}
		assert.equal((await manage(userId, { password: "reset-password", passwordChangeRequired: true })).status, 200);
		assert.equal(await getUserFromSession(env, token), null);
		const reset = await signIn("new-user@example.test", "reset-password");
		assert.equal(reset.redirect, "/change-password");
		assert.equal((await manage(userId, { name: "Renamed" })).status, 200);
		assert.equal((await getUserFromSession(env, reset.token))?.passwordChangeRequired, true);
		assert.equal((await manage(userId, { passwordChangeRequired: false })).status, 200);
		assert.equal((await getUserFromSession(env, reset.token))?.passwordChangeRequired, false);
		assert.equal((await manage(userId, { passwordChangeRequired: true })).status, 200);
		assert.equal((await messages(request("/api/messages", reset.token))).status, 403);
		assert.equal((await manage("admin", { passwordChangeRequired: false }, reset.token)).status, 403);
		passed("admin reset and flag-only changes apply immediately; omitted flags persist; users cannot clear their own flag");

		const secret = generateTotpSecret();
		await db.update(users).set({ totpSecret: secret, totpEnabled: true }).where(eq(users.id, userId));
		const challenge = await signIn("new-user@example.test", "reset-password");
		assert.equal(challenge.mfaRequired, true);
		assert.equal(challenge.token, undefined);
		const secondFactor = await verifyMfa(request("/api/auth/mfa/verify", undefined, { challengeToken: challenge.challengeToken, code: await totp(secret) }));
		assert.equal(secondFactor.status, 200);
		assert.equal((await secondFactor.json() as { redirect: string }).redirect, "/change-password");
		passed("MFA is still required and successful second-factor login keeps the password restriction");

		const recoveryToken = "local-password-recovery-token";
		await db.insert(passwordResetTokens).values({ id: "reset", userId, tokenHash: await hashSessionToken(recoveryToken), expiresAt: new Date(Date.now() + 60_000) });
		assert.equal((await completePasswordReset(env, recoveryToken, "reset-password", request("/reset"))).ok, false);
		assert.equal((await completePasswordReset(env, recoveryToken, "recovered-password", request("/reset"))).ok, true);
		const [recovered] = await db.select().from(users).where(eq(users.id, userId));
		assert.equal(recovered.passwordChangeRequired, false);
		assert.ok(verifyPassword("recovered-password", recovered.passwordHash));
		assert.equal(await getUserFromSession(env, reset.token), null);
		assert.equal((await completePasswordReset(env, recoveryToken, "another-password", request("/reset"))).ok, false);
		passed("password recovery requires a different password, clears the flag and consumes reset links");
		console.log(`${checks} password-change integration checks passed`);
	} finally {
		database.db.close();
		await rm(directory, { recursive: true, force: true });
		delete globalThis.__mailflareNodeEnv;
	}
}
void main().catch((error) => { console.error(error); process.exitCode = 1; });
