import { AlertTriangle, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getDnsRecordLabel } from "./domain-dns-details-utils";
import { dnsAuthRecords, getDnsAuthItemClass, getDnsAuthStatusLabel } from "./utils";
import type { DomainDnsDetailsProps } from "./types";

export default function DomainDnsDetails({
	domain,
	dns,
	onSetup,
	setupRecord,
	setupMessage,
}: DomainDnsDetailsProps) {
	const audit = dns.audit;
	const manual = domain.zoneId === "manual";
	return (
		<div className="border-t border-neutral-100 pt-5">
			{audit && (
					<section className="space-y-3">
						<h2 className="text-sm font-medium text-neutral-900">Authentication</h2>
						<ul className="space-y-2">
							{dnsAuthRecords.map((record) => {
								const item = audit[record];
								const ok = item.status === "ok";
								const statusStr = getDnsAuthStatusLabel(item.status);

								return (
									<li
										key={record}
										className={`flex items-start gap-2 rounded-xl px-3 py-2 text-sm ${getDnsAuthItemClass(item.status)}`}
									>
										{ok ? (
											<Check className="mt-0.5 h-4 w-4 shrink-0 text-green-600" />
										) : (
											<AlertTriangle
												className={`mt-0.5 h-4 w-4 shrink-0 ${item.status === "missing" ? "text-red-600" : "text-neutral-400"}`}
											/>
										)}
										<span className="min-w-0 flex-1">
											<span className="font-medium">{item.label}</span>{" "}
											<span className="break-all">{item.name}</span>{" "}

											{item.found.length > 0 ? (
												<span className="block break-all text-xs opacity-80">
													{item.found.join(", ")}
												</span>
											) : !ok && <span className="block break-all text-xs opacity-80 capitalize">{statusStr}</span>}
										</span>

										{ok ? <span className="capitalize">{statusStr}</span> : (
											<Button
												variant="outline"
												size="sm"
												className="shrink-0"
												disabled={manual || setupRecord === record}
												title={
													manual
														? "DNS for this domain is managed manually"
														: `Create the ${item.label} record`
												}
												onClick={() => onSetup?.(record)}
											>
												{setupRecord === record ? "Setting up..." : "Setup"}
											</Button>
										)}
									</li>
								);
							})}
						</ul>
						{manual && (
							<p className="text-xs text-neutral-500">
								DNS is managed manually for this domain, so records must be created
								where the domain&apos;s nameservers are hosted.
							</p>
						)}
						{setupMessage && <p className="text-xs text-red-600">{setupMessage}</p>}
					</section>
				)}

				<section className={audit ? "space-y-3 mt-8" : "space-y-3"}>
					<h2 className="text-sm font-medium text-neutral-900">Email Routing</h2>
					<ul className="space-y-2">
						{dns.routing.records.map((record, index) => (
							<li
								key={`routing-${record.type}-${record.name}-${index}`}
								className="flex items-start gap-2 rounded-xl bg-green-50 px-3 py-2 text-sm text-green-800"
							>
								<Check className="mt-0.5 h-4 w-4 shrink-0 text-green-600" />
								<span className="break-all">{getDnsRecordLabel(record)}</span>
							</li>
						))}
						{dns.routing.missing.map((record, index) => (
							<li
								key={`missing-${record.type}-${record.name}-${index}`}
								className="flex items-start gap-2 rounded-xl bg-red-50 px-3 py-2 text-sm text-red-800"
							>
								<AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-red-600" />
								<span className="break-all">{getDnsRecordLabel(record)}</span>
							</li>
						))}
						{dns.routing.records.length === 0 && dns.routing.missing.length === 0 && (
							<li className={`flex items-center gap-2 rounded-xl px-3 py-2 text-sm ${domain.routingEnabled ? "bg-green-50 text-green-800" : "bg-red-50 text-red-800"}`}>
								{domain.routingEnabled ? (
									<Check className="h-4 w-4 shrink-0 text-green-600" />
								) : (
									<AlertTriangle className="h-4 w-4 shrink-0 text-red-600" />
								)}
								{domain.routingEnabled ? "Email routing is configured" : "No routing DNS records found"}
							</li>
						)}
					</ul>
				</section>

				<section className="space-y-3 mt-8">
					<h2 className="text-sm font-medium text-neutral-900">Email Sending</h2>
					<ul className="space-y-2">
						{dns.sending.map((record, index) => (
							<li
								key={`sending-${record.type}-${record.name}-${index}`}
								className="flex items-start gap-2 rounded-xl bg-green-50 px-3 py-2 text-sm text-green-800"
							>
								<Check className="mt-0.5 h-4 w-4 shrink-0 text-green-600" />
								<span className="break-all">{getDnsRecordLabel(record)}</span>
							</li>
						))}
						{dns.sending.length === 0 && (
							<li className={`flex items-center gap-2 rounded-xl px-3 py-2 text-sm ${domain.sendingEnabled ? "bg-green-50 text-green-800" : "bg-red-50 text-red-800"}`}>
								{domain.sendingEnabled ? (
									<Check className="h-4 w-4 shrink-0 text-green-600" />
								) : (
									<AlertTriangle className="h-4 w-4 shrink-0 text-red-600" />
								)}
								{domain.sendingEnabled ? "Email sending is configured" : "No sending DNS records found"}
							</li>
						)}
					</ul>
			</section>
		</div>
	);
}
