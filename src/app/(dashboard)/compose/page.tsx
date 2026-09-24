"use client";

import { ComposeForm } from "@/components/compose/compose-form";
import { useT } from "@/i18n/use-t";

export default function ComposePage() {
	const t = useT();

	return (
		<div className="h-full overflow-auto p-8">
			<div className="mb-6">
				<h1 className="text-2xl font-normal text-neutral-900 dark:text-neutral-100">{t("Compose")}</h1>
				<p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">{t("Write a new email. Drafts save automatically.")}</p>
			</div>
			<ComposeForm mode="page" />
		</div>
	);
}
