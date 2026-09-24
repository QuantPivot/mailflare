import { AlertTriangle, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { dnsAuthDescriptions, dnsAuthRecords, getDnsAuthItemClass, getDnsAuthStatusLabel } from "./utils";
import type { DomainDnsDetailsProps } from "./types";
import { useT } from "@/i18n/use-t";

export default function DomainDnsDetails({
	domain,
	dns,
	onSetup,
	setupRecord,
	setupMessage,
}: DomainDnsDetailsProps) {
	const t = useT();

	const audit = dns.audit;
	const manual = domain.zoneId === "manual";
	const subdomain = dns.sendingSubdomain;
	const sendingOk = subdomain ? dns.sendingEnabled : manual && domain.sendingEnabled;
	const sendingLabel = subdomain
		? dns.sendingEnabled ? t("Sending for {domain} is enabled", { domain: subdomain.name }) : t("Sending for {domain} is disabled", { domain: subdomain.name })
		: manual
			? domain.sendingEnabled
				? "Email sending is configured"
				: "Email sending is not configured"
			: "Sending has not configured for this domain";
	const routingOk = dns.routing.missing.length === 0 && (dns.routing.records.length > 0 || domain.routingEnabled);
	const routingLabel = routingOk
		? "Email routing is configured"
		: dns.routing.missing.length > 0
			? t("{count, plural, one {# DNS record missing} other {# DNS records missing}}", { count: dns.routing.missing.length })
			: "No routing DNS records found";
	return (
		<div className="px-4 pb-4 pt-4 sm:px-5 sm:pb-5">
			{audit && (
				<section>
					<h2 className="text-base font-semibold text-neutral-900 dark:text-neutral-100">{t("Domain setup")}</h2>
					<p className="mt-0.5 text-sm text-neutral-500 dark:text-neutral-400">
						{t("Review routing, sending, and DNS authentication for reliable email delivery.")}</p>
					<ul className="mt-3 space-y-2">
						<li
							className={`grid gap-3 rounded-xl px-4 py-3 text-sm sm:grid-cols-[auto_minmax(8rem,14rem)_minmax(0,1fr)_auto] sm:items-start ${routingOk ? "bg-green-50 dark:bg-green-950/50 text-green-800 dark:text-green-300" : "bg-red-50 dark:bg-red-950/50 text-red-800 dark:text-red-300"}`}
						>
							{routingOk ? (
								<span className="flex h-7 w-7 items-center justify-center rounded-full bg-green-600 text-white">
									<Check className="h-4 w-4" />
								</span>
							) : (
								<span className="flex h-7 w-7 items-center justify-center rounded-full bg-card/70">
									<AlertTriangle className="h-4 w-4 text-red-600 dark:text-red-400" />
								</span>
							)}
							<span className="min-w-0">
								<span className="block font-medium text-neutral-900 dark:text-neutral-100">{t("Email Routing")}</span>
								<span className="block text-xs text-neutral-500 dark:text-neutral-400">{t("Routes incoming email to Mailflare")}</span>
							</span>
							<span className="min-w-0 break-all text-neutral-500 dark:text-neutral-400">{t(routingLabel)}</span>
						</li>

						<li
							className={`grid gap-3 rounded-xl px-4 py-3 text-sm sm:grid-cols-[auto_minmax(8rem,14rem)_minmax(0,1fr)_auto] sm:items-start ${sendingOk ? "bg-green-50 dark:bg-green-950/50 text-green-800 dark:text-green-300" : "bg-red-50 dark:bg-red-950/50 text-red-800 dark:text-red-300"}`}
						>
							{sendingOk ? (
								<span className="flex h-7 w-7 items-center justify-center rounded-full bg-green-600 text-white">
									<Check className="h-4 w-4" />
								</span>
							) : (
								<span className="flex h-7 w-7 items-center justify-center rounded-full bg-card/70">
									<AlertTriangle className="h-4 w-4 text-red-600 dark:text-red-400" />
								</span>
							)}
							<span className="min-w-0">
								<span className="block font-medium text-neutral-900 dark:text-neutral-100">{t("Email Sending")}</span>
								<span className="block text-xs text-neutral-500 dark:text-neutral-400">{t("Sends outgoing email from this domain")}</span>
							</span>
							<span className="min-w-0 break-all text-neutral-500 dark:text-neutral-400">{t(sendingLabel)}</span>
						</li>

						{dnsAuthRecords.map((record) => {
							const item = audit[record];
							const ok = item.status === "ok";

							return (
								<li
									key={record}
									className={`grid gap-3 rounded-xl px-4 py-3 text-sm sm:grid-cols-[auto_minmax(8rem,14rem)_minmax(0,1fr)_auto] sm:items-start ${getDnsAuthItemClass(item.status)}`}
								>
									{ok ? (
										<span className="flex h-7 w-7 items-center justify-center rounded-full bg-green-600 text-white">
											<Check className="h-4 w-4" />
										</span>
									) : (
										<span className="flex h-7 w-7 items-center justify-center rounded-full bg-card/70">
											<AlertTriangle className={`h-4 w-4 ${item.status === "missing" ? "text-red-600 dark:text-red-400" : "text-neutral-400"}`} />
										</span>
									)}
									<span className="min-w-0">
										<span className="block font-medium text-neutral-900 dark:text-neutral-100">{t("{record} record", { record: item.label })}</span>
										<span className="block text-xs text-neutral-500 dark:text-neutral-400">{t(dnsAuthDescriptions[record])}</span>
									</span>

									{ok ? <span className="min-w-0 break-all text-neutral-500 dark:text-neutral-400">
										{item.found.length > 0 ? item.found.join(", ") : item.name}
									</span> : (
										<Button
											variant="outline"
											size="sm"
											className="shrink-0 bg-card"
											disabled={manual || setupRecord === record}
											title={
												manual
													? t("DNS for this domain is managed manually")
													: t("Create the {value0} record", { value0: String(item.label) })
											}
											onClick={() => onSetup?.(record)}
										>
											{setupRecord === record ? t("Setting up...") : t("Setup")}
										</Button>
									)}
								</li>
							);
						})}
					</ul>
					{manual && (
						<p className="text-xs text-neutral-500 dark:text-neutral-400">
							{t("DNS is managed manually for this domain, so records must be created where the domain's nameservers are hosted.")}</p>
					)}
					{setupMessage && <p className="text-xs text-red-600 dark:text-red-400">{t(setupMessage)}</p>}
				</section>
			)}
		</div>
	);
}
