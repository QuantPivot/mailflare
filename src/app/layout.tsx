import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Providers } from "@/components/providers";
import { cookies } from "next/headers";
import { getLocale } from "next-intl/server";
import { LocaleProvider } from "@/i18n/provider";
import { getLocalePreference, isLocale, LOCALE_COOKIE } from "@/i18n/config";
import { getT } from "@/i18n/server";
import { ThemeProvider } from "@/components/theme-provider";
import { getThemePreference, THEME_COOKIE } from "@/components/theme-utils";
import "./globals.css";

const geistSans = Geist({
	variable: "--font-geist-sans",
	subsets: ["latin"],
});

const geistMono = Geist_Mono({
	variable: "--font-geist-mono",
	subsets: ["latin"],
});

export async function generateMetadata(): Promise<Metadata> {
	const t = await getT();
	return {
		title: "Mailflare",
		description: t("Multi-tenant email on Cloudflare"),
		icons: { icon: "/api/branding/icon" },
	};
}

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
	const [locale, cookieStore] = await Promise.all([getLocale(), cookies()]);
	const preference = getLocalePreference(cookieStore.get(LOCALE_COOKIE)?.value);
	const themePreference = getThemePreference(cookieStore.get(THEME_COOKIE)?.value);
	return (
		<html lang={locale} data-theme={themePreference}>
			<head>
				<link rel="icon" href="/api/branding/icon"></link>
			</head>
			<body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
				<LocaleProvider initialLocale={isLocale(locale) ? locale : "en"} initialPreference={preference}>
					<ThemeProvider initialPreference={themePreference}>
						<Providers>{children}</Providers>
					</ThemeProvider>
				</LocaleProvider>
			</body>
		</html>
	);
}
