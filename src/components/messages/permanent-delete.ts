import type { Translate } from "@/i18n/catalog";

export function confirmPermanentDelete(count: number, t: Translate): boolean {
	return window.confirm(t("Permanently delete {count, plural, one {# selected email} other {# selected emails}} and their attachments? This cannot be undone.", { count }));
}
