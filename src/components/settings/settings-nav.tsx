"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { isActiveSettingsPath, settingsNavSections } from "./settings-nav-utils";
import { useT } from "@/i18n/use-t";

export function SettingsNav() {
	const t = useT();
	const pathname = usePathname();

	return (
		<aside className="min-h-full border-r border-blue-100/70 dark:border-blue-900/70 px-4 py-10 w-64">
			<div className="sticky top-6 space-y-7">
				{settingsNavSections.map((section) => (
					<div key={section.label} className="space-y-3">
						<h2 className="px-4 text-xs font-semibold uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
							{t(section.label)}
						</h2>
						<nav className="space-y-px">
							{section.items.map((item) => {
								const active = isActiveSettingsPath(pathname, item.href);
								return (
									<Link
										key={item.href}
										href={item.href}
										className={cn(
											"block rounded-full px-4 py-1.5 text-sm font-medium transition-colors",
											active
												? "bg-blue-100 dark:bg-blue-900/50 text-blue-900 dark:text-blue-200"
												: "text-neutral-600 dark:text-neutral-300 hover:bg-card/70 hover:text-neutral-900 dark:hover:text-neutral-100",
										)}
									>
										{t(item.label)}
									</Link>
								);
							})}
						</nav>
					</div>
				))}
			</div>
		</aside>
	);
}
