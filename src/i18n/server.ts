import { getLocale } from "next-intl/server";
import { getTranslator, type Translate } from "./catalog";
import { isLocale } from "./config";

export async function getT(): Promise<Translate> {
	const locale = await getLocale();
	return getTranslator(isLocale(locale) ? locale : "en");
}
