"use client";

import { createContext, useContext, useEffect, useState, useSyncExternalStore, useTransition } from "react";
import { NextIntlClientProvider } from "next-intl";
import { useRouter } from "next/navigation";
import { catalogs } from "./catalog";
import { LOCALE_COOKIE, resolveLocale, type AppLocale, type LocalePreference } from "./config";

type LocaleSettings = {
	preference: LocalePreference;
	setPreference: (preference: LocalePreference) => void;
	pending: boolean;
};
const LocaleSettingsContext = createContext<LocaleSettings | null>(null);

function subscribeToTimeZone(): () => void {
	return () => {};
}

function browserTimeZone(): string {
	return Intl.DateTimeFormat().resolvedOptions().timeZone;
}

function serverTimeZone(): string {
	return "UTC";
}

export function LocaleProvider({ children, initialLocale, initialPreference }: {
	children: React.ReactNode;
	initialLocale: AppLocale;
	initialPreference: LocalePreference;
}) {
	const router = useRouter();
	const [locale, setLocale] = useState(initialLocale);
	const [preference, setPreferenceState] = useState(initialPreference);
	const timeZone = useSyncExternalStore(subscribeToTimeZone, browserTimeZone, serverTimeZone);
	const [pending, startTransition] = useTransition();

	function setPreference(nextPreference: LocalePreference): void {
		document.cookie = `${LOCALE_COOKIE}=${nextPreference}; Path=/; Max-Age=31536000; SameSite=Lax${location.protocol === "https:" ? "; Secure" : ""}`;
		setPreferenceState(nextPreference);
		setLocale(resolveLocale(nextPreference, navigator.languages.join(",")));
		startTransition(() => router.refresh());
	}

	useEffect(() => {
		document.documentElement.lang = locale;
	}, [locale]);

	useEffect(() => {
		if (preference !== "auto") return;
		function updateBrowserLanguage(): void {
			setLocale(resolveLocale("auto", navigator.languages.join(",")));
			router.refresh();
		}
		window.addEventListener("languagechange", updateBrowserLanguage);
		return () => window.removeEventListener("languagechange", updateBrowserLanguage);
	}, [preference, router]);

	return (
		<LocaleSettingsContext.Provider value={{ preference, setPreference, pending }}>
			<NextIntlClientProvider locale={locale} messages={catalogs[locale]} timeZone={timeZone}>
				{children}
			</NextIntlClientProvider>
		</LocaleSettingsContext.Provider>
	);
}

export function useLocaleSettings(): LocaleSettings {
	const settings = useContext(LocaleSettingsContext);
	if (!settings) throw new Error("LocaleProvider is required");
	return settings;
}
