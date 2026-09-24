"use client";

import packageJson from "../../package.json";
import { useSidebar } from "./sidebar-state";
import { useShortcuts } from "./shortcuts";
import { Keyboard } from "lucide-react";
import { AppearanceControls } from "./appearance-controls";
import { useT } from "@/i18n/use-t";

export function SidebarFooter() {
	const t = useT();

	const { minimal } = useSidebar();
	const { openHelpModal, shortcutsEnabled, shortcutsPreferenceLoading } = useShortcuts();
	if (minimal) return null;

  return (
    <div className="px-3 pt-3 flex flex-col gap-2">
      <AppearanceControls />
      {shortcutsEnabled && !shortcutsPreferenceLoading && (
        <button
          type="button"
          onClick={openHelpModal}
          className="flex items-center justify-between w-full px-2.5 py-1.5 text-xs text-neutral-500 dark:text-neutral-400 hover:text-neutral-800 dark:hover:text-neutral-200 hover:bg-neutral-200/60 dark:hover:bg-neutral-700/60 rounded-lg transition-colors"
        >
          <span className="flex items-center gap-1.5">
            <Keyboard className="w-3.5 h-3.5 text-neutral-400" />
            {t("Shortcuts")}</span>
          <kbd className="px-1.5 py-0.5 font-mono text-[10px] bg-card border border-neutral-200 dark:border-neutral-700 rounded text-neutral-500 dark:text-neutral-400 shadow-2xs">
            ?
          </kbd>
        </button>
      )}
      <p className="px-1 text-[11px] text-neutral-400">
        {t("Powered by")}{" "}
        <a
          href={`https://mailflare.co/?ref=${typeof window !== "undefined" ? location.hostname : ""}&v=${packageJson.version}`}
          target="_blank"
          className="hover:underline text-neutral-500 dark:text-neutral-400"
          rel="noreferrer"
        >
          Mailflare v{packageJson.version}
        </a>
      </p>
    </div>
  );
}
