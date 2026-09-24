import type { ThemePreference } from "./theme-types";

export const THEME_COOKIE = "mailflare-theme";

export function getThemePreference(value: string | undefined): ThemePreference {
	return value === "light" || value === "dark" ? value : "auto";
}
