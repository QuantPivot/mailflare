import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import ts from "typescript";
import { parse } from "@formatjs/icu-messageformat-parser";

const root = process.cwd();
const directory = path.join(root, "src/i18n/messages");
const source = JSON.parse(fs.readFileSync(path.join(directory, "en.json"), "utf8"));
const failures = [];

function messageKey(text) {
	let hash = 2166136261;
	for (let index = 0; index < text.length; index++) hash = Math.imul(hash ^ text.charCodeAt(index), 16777619);
	return `m${(hash >>> 0).toString(16)}`;
}

function argumentsIn(message) {
	const names = new Set();
	function walk(elements) {
		for (const element of elements) {
			if (element.type !== 0 && element.type !== 7) names.add(element.value);
			if (element.options) for (const option of Object.values(element.options)) walk(option.value);
			if (element.children) walk(element.children);
		}
	}
	walk(parse(message));
	return [...names].sort();
}

for (const file of fs.readdirSync(directory).filter((name) => name.endsWith(".json"))) {
	const catalog = JSON.parse(fs.readFileSync(path.join(directory, file), "utf8"));
	try { assert.deepEqual(Object.keys(catalog).sort(), Object.keys(source).sort()); }
	catch { failures.push(`${file}: keys differ from en.json`); }
	for (const [key, message] of Object.entries(source)) {
		try {
			assert.equal(typeof catalog[key], "string");
			assert.ok(catalog[key].trim(), "empty translation");
			assert.deepEqual(argumentsIn(catalog[key]), argumentsIn(message), "ICU placeholders differ");
			if (/^m[0-9a-f]+$/.test(key)) assert.equal(key, messageKey(message), "source ID mismatch");
		} catch (error) { failures.push(`${file}:${key}: ${error.message}`); }
	}
}

function* sourceFiles(directory) {
	for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
		const file = path.join(directory, entry.name);
		if (entry.isDirectory()) yield* sourceFiles(file);
		else if (/\.tsx?$/.test(file) && !file.endsWith(".d.ts")) yield file;
	}
}

let calls = 0;
for (const file of sourceFiles(path.join(root, "src"))) {
	if (file.includes(`${path.sep}i18n${path.sep}`) || file.endsWith("language-switcher.tsx")) continue;
	const ast = ts.createSourceFile(file, fs.readFileSync(file, "utf8"), ts.ScriptTarget.Latest, true);
	function visit(node) {
		if (ts.isCallExpression(node) && ts.isIdentifier(node.expression) && node.expression.text === "t") {
			const argument = node.arguments[0];
			if (argument && (ts.isStringLiteral(argument) || ts.isNoSubstitutionTemplateLiteral(argument))) {
				calls++;
				const key = messageKey(argument.text);
				if (source[key] !== argument.text) {
					const { line } = ast.getLineAndCharacterOfPosition(node.getStart());
					failures.push(`${path.relative(root, file)}:${line + 1}: missing ${JSON.stringify(argument.text)}`);
				}
			}
		}
		ts.forEachChild(node, visit);
	}
	visit(ast);
}

if (failures.length) {
	console.error(failures.join("\n"));
	process.exitCode = 1;
} else {
	console.log(`i18n catalog checks passed: ${Object.keys(source).length} messages, ${calls} literal translation calls; locale key parity and ICU placeholders match.`);
}
