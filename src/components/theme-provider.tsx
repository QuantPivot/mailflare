"use client";

import { createContext, useContext, useState } from "react";
import type { ThemePreference, ThemeProviderProps, ThemeSettings } from "./theme-types";
import { THEME_COOKIE } from "./theme-utils";

const ThemeContext = createContext<ThemeSettings | null>(null);

export function ThemeProvider({ children, initialPreference }: ThemeProviderProps) {
	const [preference, setPreferenceState] = useState(initialPreference);

	function setPreference(next: ThemePreference): void {
		document.documentElement.dataset.theme = next;
		setPreferenceState(next);
		try {
			document.cookie = `${THEME_COOKIE}=${next}; Path=/; Max-Age=31536000; SameSite=Lax${location.protocol === "https:" ? "; Secure" : ""}`;
		} catch {
			// Theme switching still works when the browser blocks preference cookies.
		}
	}

	return (
		<ThemeContext.Provider value={{ preference, setPreference }}>
			{children}
		</ThemeContext.Provider>
	);
}

export function useTheme(): ThemeSettings {
	const settings = useContext(ThemeContext);
	if (!settings) throw new Error("ThemeProvider is required");
	return settings;
}
