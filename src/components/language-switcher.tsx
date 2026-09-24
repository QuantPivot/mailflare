"use client";

import * as Select from "@radix-ui/react-select";
import { Check, ChevronDown, Languages } from "lucide-react";
import { useTranslations } from "next-intl";
import { getLocalePreference } from "@/i18n/config";
import { useLocaleSettings } from "@/i18n/provider";

export function LanguageSwitcher() {
	const t = useTranslations();
	const { preference, setPreference, pending } = useLocaleSettings();
	const options = [
		{ value: "auto", label: t("Automatic") },
		{ value: "en", label: "English", lang: "en" },
		{ value: "zh-CN", label: "简体中文", lang: "zh-CN" },
	];
	return (
		<Select.Root
			value={preference}
			disabled={pending}
			onValueChange={(value) => setPreference(getLocalePreference(value))}
		>
			<Select.Trigger
				aria-label={t("Language")}
				className="flex h-10 w-full min-w-28 items-center gap-2 rounded-lg px-2.5 text-sm text-neutral-700 dark:text-neutral-300 outline-none transition-colors hover:bg-neutral-200/60 dark:hover:bg-neutral-700/60 focus-visible:ring-2 focus-visible:ring-blue-500 data-[state=open]:bg-neutral-200/60 dark:data-[state=open]:bg-neutral-700/60 disabled:opacity-50"
			>
				<Languages className="h-4 w-4 shrink-0 text-neutral-500 dark:text-neutral-400" aria-hidden="true" />
				<span className="flex-1 truncate text-left"><Select.Value /></span>
				<Select.Icon><ChevronDown className="h-3.5 w-3.5 text-neutral-500 dark:text-neutral-400" /></Select.Icon>
			</Select.Trigger>
			<Select.Portal>
				<Select.Content
					position="popper"
					align="start"
					sideOffset={6}
					collisionPadding={12}
					className="z-[200] max-h-[var(--radix-select-content-available-height)] min-w-[var(--radix-select-trigger-width)] overflow-hidden rounded-xl bg-card p-1.5 text-sm shadow-lg"
				>
					<Select.Viewport>
						{options.map((option) => (
							<Select.Item
								key={option.value}
								value={option.value}
								lang={option.lang}
								className="relative flex min-h-9 cursor-pointer select-none items-center rounded-md py-2 pl-3 pr-9 text-neutral-700 dark:text-neutral-300 outline-none data-[highlighted]:bg-neutral-100 dark:data-[highlighted]:bg-neutral-800 data-[state=checked]:bg-blue-50 dark:data-[state=checked]:bg-blue-950/50 data-[state=checked]:text-blue-700 dark:data-[state=checked]:text-blue-300"
							>
								<Select.ItemText>{option.label}</Select.ItemText>
								<Select.ItemIndicator className="absolute right-3"><Check className="h-4 w-4" /></Select.ItemIndicator>
							</Select.Item>
						))}
					</Select.Viewport>
				</Select.Content>
			</Select.Portal>
		</Select.Root>
	);
}
