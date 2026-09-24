import { useLocale } from "next-intl";
import { getTranslator, type Translate } from "./catalog";
import { isLocale } from "./config";

export function useT(): Translate {
	const locale = useLocale();
	return getTranslator(isLocale(locale) ? locale : "en");
}
