import assert from "node:assert/strict";
import { mkdir, mkdtemp, rm } from "node:fs/promises";
import { join, resolve } from "node:path";
import { eq } from "drizzle-orm";
import { openSqliteDatabase, type SqliteDatabase } from "../server/runtime/sqlite-database";
import { openFileBucket } from "../server/runtime/file-bucket";
import { applyMigrations } from "../server/runtime/migrate";
import { getDb } from "../src/db";
import { users, domains, mailboxes, messages, messageAttachments, mailboxAccess, licenseSettings } from "../src/db/schema";
import { createSession } from "../src/lib/auth/session";
import { POST } from "../src/app/api/messages/bulk/route";

/** Real local database, migrations, sessions and object storage; no external account or mail. */
async function main(): Promise<void> {
	await mkdir("work", { recursive: true });
	const directory = await mkdtemp(resolve("work/permanent-delete-check-"));
	const database = openSqliteDatabase(join(directory, "mailflare.sqlite")) as unknown as SqliteDatabase;
	const bucket = openFileBucket(join(directory, "blobs"));
	const env = { DB: database, BUCKET: bucket, MAILFLARE_RUNTIME: "node" } as unknown as CloudflareEnv;
	globalThis.__mailflareNodeEnv = env;
	let checks = 0;
	try {
		await applyMigrations(database, resolve("drizzle/migrations"));
		const db = getDb(env);
		for (const id of ["owner", "other", "reader"]) {
			await db.insert(users).values({ id, email: `${id}@example.test`, name: id, passwordHash: "unused" });
		}
		await db.insert(domains).values({ id: "domain", userId: "owner", hostname: "example.test", zoneId: "manual" });
		await db.insert(mailboxes).values([
			{ id: "own-box", userId: "owner", domainId: "domain", localPart: "owner" },
			{ id: "other-box", userId: "other", domainId: "domain", localPart: "other" },
			{ id: "shared-box", userId: "owner", domainId: "domain", localPart: "shared", type: "shared" },
		]);
		await db.insert(licenseSettings).values({ id: "default", instanceId: "local-deletion-check", plan: "team", state: "active" });
		await db.insert(mailboxAccess).values({ id: "reader-access", userId: "reader", mailboxId: "shared-box", permission: "read_only" });
		const ownerToken = await createSession(env, "owner");
		const readerToken = await createSession(env, "reader");

		async function request(payload: unknown, token = ownerToken): Promise<Response> {
			return POST(new Request("http://localhost/api/messages/bulk", {
				method: "POST", headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" }, body: JSON.stringify(payload),
			}));
		}
		async function fixture(id: string, status = "trash", mailboxId = "own-box"): Promise<void> {
			await db.insert(messages).values({
				id, userId: mailboxId === "other-box" ? "other" : "owner", mailboxId, status, direction: "inbound",
				fromAddr: "sender@example.test", toAddr: "owner@example.test", subject: `deletionfixture ${id}`,
				rawR2Key: `raw/${id}.eml`, textBody: "Local permanent deletion verification",
			});
			await db.insert(messageAttachments).values({ id: `att-${id}`, messageId: id, filename: "note.txt", contentType: "text/plain", size: 4, r2Key: `attachments/${id}` });
			await bucket.put(`raw/${id}.eml`, "raw mime");
			await bucket.put(`attachments/${id}`, "note");
		}
		async function assertPresent(id: string): Promise<void> {
			assert.ok(database.db.prepare("SELECT id FROM messages WHERE id = ?").get(id));
			assert.ok(await bucket.head(`raw/${id}.eml`));
			assert.ok(await bucket.head(`attachments/${id}`));
		}
		function passed(label: string): void { checks++; console.log(`PASS ${label}`); }

		await fixture("single");
		assert.equal((await request({ action: "delete", messageIds: ["single"] }, "invalid-session")).status, 401);
		await assertPresent("single");
		passed("unauthenticated requests cannot remove data");

		for (const payload of [null, { action: "delete", messageIds: "single" }, { action: "delete", messageIds: [null] }, { action: "delete", messageIds: [] }]) {
			assert.equal((await request(payload)).status, 400);
		}
		passed("malformed selections are rejected");

		await fixture("inbox", "received");
		assert.equal((await request({ action: "delete", messageIds: ["single", "inbox"] })).status, 409);
		await assertPresent("single");
		await assertPresent("inbox");
		passed("a non-Trash item prevents deletion of the entire selection");

		await fixture("foreign", "trash", "other-box");
		assert.equal((await request({ action: "delete", messageIds: ["single", "foreign"] })).status, 404);
		await assertPresent("single");
		await assertPresent("foreign");
		passed("mixed-owner selections do not partially delete authorized messages");

		await fixture("shared", "trash", "shared-box");
		assert.equal((await request({ action: "delete", messageIds: ["shared"] }, readerToken)).status, 404);
		await assertPresent("shared");
		passed("read-only shared-mailbox access cannot permanently delete");

		assert.equal((await request({ action: "trash", messageIds: ["inbox"] })).status, 200);
		await assertPresent("inbox");
		assert.equal((database.db.prepare("SELECT status FROM messages WHERE id = 'inbox'").get() as { status: string }).status, "trash");
		passed("ordinary delete still moves to Trash and retains all objects");

		const deleted = await request({ action: "delete", messageIds: ["single", "single", "inbox"] });
		assert.equal(deleted.status, 200);
		assert.deepEqual(new Set(((await deleted.json()) as { deletedIds: string[] }).deletedIds), new Set(["single", "inbox"]));
		for (const id of ["single", "inbox"]) {
			assert.equal(database.db.prepare("SELECT id FROM messages WHERE id = ?").get(id), undefined);
			assert.equal(database.db.prepare("SELECT id FROM message_attachments WHERE message_id = ?").get(id), undefined);
			assert.equal(await bucket.head(`raw/${id}.eml`), null);
			assert.equal(await bucket.head(`attachments/${id}`), null);
		}
		assert.equal(database.db.prepare("SELECT rowid FROM messages_fts WHERE messages_fts MATCH 'single'").get(), undefined);
		assert.ok(database.db.prepare("SELECT id FROM audit_logs WHERE json_extract(metadata, '$.messageId') = 'single' AND json_extract(metadata, '$.permanent') = 1").get());
		passed("permanent deletion removes rows, attachments, raw MIME and search index, retaining an audit record");

		assert.equal((await request({ action: "delete", messageIds: ["single", "inbox"] })).status, 200);
		passed("duplicate requests are idempotent");

		await fixture("failure");
		await fixture("success");
		const originalDelete = bucket.delete.bind(bucket);
		bucket.delete = async (keys) => {
			if (keys === "raw/failure.eml") throw new Error("Injected local object-store failure");
			return originalDelete(keys);
		};
		const partial = await request({ action: "delete", messageIds: ["failure", "success"] });
		assert.equal(partial.status, 502);
		assert.deepEqual(((await partial.json()) as { deletedIds: string[] }).deletedIds, ["success"]);
		assert.ok(database.db.prepare("SELECT id FROM messages WHERE id = 'failure'").get());
		assert.ok(await bucket.head("raw/failure.eml"));
		bucket.delete = originalDelete;
		assert.equal((await request({ action: "delete", messageIds: ["failure", "success"] })).status, 200);
		assert.equal(database.db.prepare("SELECT id FROM messages WHERE id = 'failure'").get(), undefined);
		assert.equal(await bucket.head("raw/failure.eml"), null);
		passed("partial object-store failure is reported and can be retried without orphaned objects");

		const manyIds = Array.from({ length: 105 }, (_, index) => `many-${index}`);
		for (const id of manyIds) await fixture(id);
		assert.equal((await request({ action: "delete", messageIds: manyIds })).status, 200);
		assert.equal(database.db.prepare("SELECT id FROM messages WHERE id LIKE 'many-%'").get(), undefined);
		passed("large conversations are deleted in bounded database queries");

		await db.update(mailboxAccess).set({ permission: "full_access" }).where(eq(mailboxAccess.id, "reader-access"));
		assert.equal((await request({ action: "delete", messageIds: ["shared"] }, readerToken)).status, 200);
		await assertPresent("foreign");
		passed("full-access delegates can delete, while unrelated mail remains intact");
		console.log(`${checks} permanent deletion integration checks passed.`);
	} finally {
		globalThis.__mailflareNodeEnv = undefined;
		database.db.close();
		await rm(directory, { recursive: true, force: true });
	}
}

main().catch((error) => { console.error(error); process.exitCode = 1; });
