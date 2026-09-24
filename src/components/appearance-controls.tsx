import { LanguageSwitcher } from "./language-switcher";
import { ThemeSwitcher } from "./theme-switcher";

export function AppearanceControls() {
	return (
		<div className="flex min-w-0 items-center gap-1">
			<div className="min-w-0 flex-1">
				<LanguageSwitcher />
			</div>
			<ThemeSwitcher />
		</div>
	);
}
