export const LOCALES = ["en", "zh-CN"] as const;
export type AppLocale = (typeof LOCALES)[number];
export type LocalePreference = AppLocale | "auto";
export const LOCALE_COOKIE = "mailflare-language";

export function isLocale(value: unknown): value is AppLocale {
	return value === "en" || value === "zh-CN";
}

export function getLocalePreference(value: unknown): LocalePreference {
	return isLocale(value) ? value : "auto";
}

export function resolveLocale(preference: LocalePreference, languages: string): AppLocale {
	if (preference !== "auto") return preference;
	const choices = languages.split(",").map((entry, index) => {
		const [tag, ...parameters] = entry.trim().split(";");
		const quality = parameters.find((parameter) => parameter.trim().startsWith("q="));
		return { tag: tag.toLowerCase(), quality: quality ? Number(quality.trim().slice(2)) : 1, index };
	}).filter(({ quality }) => Number.isFinite(quality) && quality > 0 && quality <= 1)
		.sort((a, b) => b.quality - a.quality || a.index - b.index);
	for (const { tag } of choices) {
		if (tag === "zh" || tag.startsWith("zh-")) return "zh-CN";
		if (tag === "en" || tag.startsWith("en-")) return "en";
	}
	return "en";
}
