import type { ReactNode } from "react";

export type ThemePreference = "auto" | "light" | "dark";

export type ThemeSettings = {
	preference: ThemePreference;
	setPreference: (preference: ThemePreference) => void;
};

export type ThemeProviderProps = {
	children: ReactNode;
	initialPreference: ThemePreference;
};
