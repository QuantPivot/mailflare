import fs from "node:fs";
import path from "node:path";
import ts from "typescript";
import { parse } from "@formatjs/icu-messageformat-parser";

const root = process.cwd();
const directory = path.join(root, "src/i18n/messages");
const explicit = { Language: "Language", Automatic: "Automatic", English: "English", SimplifiedChinese: "简体中文" };
const messages = new Set();
const labels = /^(label|title|subtitle|description|hint|message|error|reason|category|emptyText|subject|preview|badge)$/;
function* files(dir) {
	for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
		const file = path.join(dir, entry.name);
		if (entry.isDirectory()) yield* files(file);
		else if (/\.tsx?$/.test(file) && !file.endsWith(".d.ts")) yield file;
	}
}
function key(source) {
	let hash = 2166136261;
	for (let i = 0; i < source.length; i++) hash = Math.imul(hash ^ source.charCodeAt(i), 16777619);
	return `m${(hash >>> 0).toString(16)}`;
}
function add(source, required = false) {
	if (!source.trim()) return;
	try { parse(source); } catch (error) {
		if (required) throw new Error(`Invalid ICU message ${JSON.stringify(source)}: ${error.message}`);
		return;
	}
	messages.add(source);
}
for (const file of files(path.join(root, "src"))) {
	if (file.includes(`${path.sep}i18n${path.sep}`)) continue;
	const ast = ts.createSourceFile(file, fs.readFileSync(file, "utf8"), ts.ScriptTarget.Latest, true);
	const frontend = file.includes("/components/") || file.includes("/hooks/") || (file.includes("/app/") && !file.includes("/api/"));
	function visit(node) {
		if (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node) || ts.isTemplateExpression(node)) {
			const parent = node.parent;
			let source = node.text;
			if (ts.isTemplateExpression(node)) source = node.head.text + node.templateSpans.map((span, i) => `{value${i}}${span.literal.text}`).join("");
			const direct = ts.isCallExpression(parent) && parent.expression.getText(ast) === "t" && parent.arguments[0] === node;
			const displayProperty = ts.isPropertyAssignment(parent) && labels.test(parent.name.getText(ast));
			const errorConstructor = ts.isNewExpression(parent) && /Error$/.test(parent.expression.getText(ast));
			const human = /^[A-Z][a-zA-Z0-9 '.:,!?()\-/+&=–—…“”\{\}]*$/.test(source) && /[a-z]{2}/.test(source);
			if (direct) add(source, true);
			else if ((displayProperty || errorConstructor || (frontend && human)) && /[A-Za-z]{2}/.test(source)
				&& !/^(?:https?:|\/|[\w.-]+@|SELECT |INSERT |UPDATE |DELETE |CREATE |PRAGMA )/.test(source)
				&& !/[\n\r]|(?:bg-|text-|border-|rounded-|flex-|grid-|px-|py-)/.test(source)) add(source);
		}
		ts.forEachChild(node, visit);
	}
	visit(ast);
}
// Application enum labels rendered as values. Protocol values stay unchanged in APIs.
for (const source of ["admin", "user", "member", "active", "inactive", "expired", "revoked", "completed", "failed", "running", "pending", "enabled", "disabled", "contains", "is exactly", "starts with", "ends with", "matches regex", "exact match", "Never", "Preparing import", "No content", "No preview", "Unknown sender", "No recipient"]) add(source);
const catalog = { ...explicit };
for (const source of [...messages].sort()) {
	const id = key(source);
	if (catalog[id] && catalog[id] !== source) throw new Error(`Catalog ID collision: ${source}`);
	catalog[id] = source;
}
fs.writeFileSync(path.join(directory, "en.json"), JSON.stringify(catalog, null, 2) + "\n");
console.log(`Extracted ${Object.keys(catalog).length} messages into src/i18n/messages/en.json. Review new entries, then translate zh-CN.json and run mise run i18n:check.`);
