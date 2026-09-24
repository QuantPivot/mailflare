import { createTranslator } from "next-intl";
import en from "./messages/en.json";
import zhCN from "./messages/zh-CN.json";
import type { AppLocale } from "./config";

export const catalogs: Record<AppLocale, Record<string, string>> = {
	en,
	"zh-CN": {
		...en,
		...Object.fromEntries(Object.entries(zhCN).filter(([, value]) => value.trim())),
	},
};
export type MessageValues = Record<string, string | number | Date>;
export type Translate = (source: string, values?: MessageValues) => string;

/** Stable catalog ID; English remains readable at each call site. */
export function messageKey(source: string): string {
	let hash = 2166136261;
	for (let index = 0; index < source.length; index++) {
		hash = Math.imul(hash ^ source.charCodeAt(index), 16777619);
	}
	return `m${(hash >>> 0).toString(16)}`;
}

const translators = {
	en: createTranslator({ locale: "en", messages: catalogs.en }),
	"zh-CN": createTranslator({ locale: "zh-CN", messages: catalogs["zh-CN"] }),
};

// Error responses can contain values already interpolated by the server. Match
// only catalogued application messages, preserving provider details verbatim.
function escapeRegExp(value: string): string {
	return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

const templates = Object.entries(en).flatMap(([key, source]) => {
	const tokens = [...source.matchAll(/\{([a-zA-Z][a-zA-Z0-9_]*)\}/g)];
	const literalLength = source.replace(/\{[^{}]*\}/g, "").trim().length;
	if (!tokens.length || literalLength < 8 || /\{[^{}]*,/.test(source)) return [];
	const names: string[] = [];
	let pattern = "";
	let cursor = 0;
	for (const token of tokens) {
		pattern += escapeRegExp(source.slice(cursor, token.index)) + "([\\s\\S]*?)";
		names.push(token[1]);
		cursor = token.index + token[0].length;
	}
	pattern += escapeRegExp(source.slice(cursor));
	return [{ key, names, pattern: new RegExp(`^${pattern}$`), specificity: literalLength }];
}).sort((a, b) => b.specificity - a.specificity);

export function translate(locale: AppLocale, source: string, values?: MessageValues): string {
	const key = messageKey(source);
	if (Object.hasOwn(catalogs.en, key)) return translators[locale](key, values);
	if (!values && source.length <= 4096) {
		for (const template of templates) {
			const match = template.pattern.exec(source);
			if (match) {
				const parameters = Object.fromEntries(template.names.map((name, index) => [name, match[index + 1]]));
				return translators[locale](template.key, parameters);
			}
		}
	}
	// Unknown provider errors remain intact; user content is never auto-translated.
	return source;
}

const translationFunctions: Record<AppLocale, Translate> = {
	en: (source, values) => translate("en", source, values),
	"zh-CN": (source, values) => translate("zh-CN", source, values),
};

export function getTranslator(locale: AppLocale): Translate {
	return translationFunctions[locale];
}
