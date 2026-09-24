"use client";

import { Monitor, Moon, Sun } from "lucide-react";
import { useT } from "@/i18n/use-t";
import { useTheme } from "./theme-provider";
import type { ThemePreference } from "./theme-types";

const nextTheme: Record<ThemePreference, ThemePreference> = { auto: "light", light: "dark", dark: "auto" };
const icons = { auto: Monitor, light: Sun, dark: Moon };

export function ThemeSwitcher() {
	const t = useT();
	const { preference, setPreference } = useTheme();
	const Icon = icons[preference];
	const labels = {
		auto: t("Theme: automatic. Switch to light mode"),
		light: t("Theme: light. Switch to dark mode"),
		dark: t("Theme: dark. Follow system appearance"),
	};

	return (
		<button
			type="button"
			onClick={() => setPreference(nextTheme[preference])}
			aria-label={labels[preference]}
			title={labels[preference]}
			className="flex size-10 shrink-0 items-center justify-center rounded-lg text-neutral-600 dark:text-neutral-300 transition-colors hover:bg-neutral-200/60 dark:hover:bg-neutral-700/60 hover:text-neutral-900 dark:hover:text-neutral-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
		>
			<Icon className="size-4" aria-hidden="true" />
		</button>
	);
}
