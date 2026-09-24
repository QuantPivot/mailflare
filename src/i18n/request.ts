import { cookies, headers } from "next/headers";
import { getRequestConfig } from "next-intl/server";
import { catalogs } from "./catalog";
import { getLocalePreference, LOCALE_COOKIE, resolveLocale } from "./config";

export default getRequestConfig(async () => {
	const [cookieStore, requestHeaders] = await Promise.all([cookies(), headers()]);
	const preference = getLocalePreference(cookieStore.get(LOCALE_COOKIE)?.value);
	const locale = resolveLocale(preference, requestHeaders.get("accept-language") ?? "");
	return { locale, messages: catalogs[locale], timeZone: "UTC" };
});
