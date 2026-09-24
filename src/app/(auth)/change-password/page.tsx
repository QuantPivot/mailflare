"use client";

import { KeyRound } from "lucide-react";
import { useRouter } from "next/navigation";
import { AuthGuard } from "@/components/auth/auth-guard";
import { AuthShell } from "@/components/auth/auth-shell";
import { ChangePasswordForm } from "@/components/settings/change-password-form";
import { LogoutButton } from "@/components/logout-button";
import { useT } from "@/i18n/use-t";

export default function RequiredPasswordChangePage() {
	const t = useT();
	const router = useRouter();
	return (
		<AuthGuard allowPasswordChange>
			<AuthShell
				icon={KeyRound}
				title={t("Choose your own password")}
				description={t("Your administrator requires you to change your password before continuing. Enter your current password and choose a new one with 8–128 characters.")}
				footer={<LogoutButton />}
			>
				<ChangePasswordForm onSuccess={() => { router.replace("/inbox"); router.refresh(); }} />
			</AuthShell>
		</AuthGuard>
	);
}
