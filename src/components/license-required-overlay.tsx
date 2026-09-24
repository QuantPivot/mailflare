import Link from "next/link";
import { LockKeyhole } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { LicenseRequiredOverlayProps } from "./license-required-overlay-types";
import { useT } from "@/i18n/use-t";

export function LicenseRequiredOverlay({ required, children }: LicenseRequiredOverlayProps) {
	const t = useT();

	return <div className="relative">{children}<div className="absolute inset-0 z-10 flex items-center justify-center rounded-3xl bg-card/50 p-6 backdrop-blur-[1px]"><div className="max-w-sm rounded-2xl border border-neutral-200 dark:border-neutral-700 bg-card p-6 text-center shadow-xl"><LockKeyhole className="mx-auto h-6 w-6 text-blue-600 dark:text-blue-400" /><h2 className="mt-3 font-semibold text-neutral-900 dark:text-neutral-100">{t("{plan} license required", { plan: required })}</h2><p className="mt-2 text-sm text-neutral-600 dark:text-neutral-300">{t("Upgrade your license to use this feature.")}</p><Button asChild className="mt-4"><Link href="/licenses">{t("View licenses")}</Link></Button></div></div></div>;
}
