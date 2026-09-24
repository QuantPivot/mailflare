"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { DomainRouting } from "@/components/settings/domain-routing/domain-routing";
import { RoutingRuleSelect } from "@/components/settings/domain-routing/routing-rule-select";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { fetchAdminRoutingDomains } from "./utils";
import { useT } from "@/i18n/use-t";

export default function RoutingPage() {
	const t = useT();

	const [domainId, setDomainId] = useState("");
	const domains = useQuery({
		queryKey: ["admin-routing-domains"],
		queryFn: fetchAdminRoutingDomains,
	});
	const availableDomains = domains.data?.domains ?? [];
	const selectedDomain = availableDomains.find((domain) => domain.id === domainId) ?? availableDomains[0];

	return (
		<div className="space-y-8">
			<div>
				<h1 className="text-3xl font-medium text-neutral-900">{t("Routing")}</h1>
				<p className="mt-1 text-sm text-neutral-500">
					{t("Configure domain-wide delivery, forwarding, and blocking rules.")}</p>
			</div>

			<section className="space-y-4">
				<div>
					<h2 className="text-xl font-semibold text-neutral-900">{t("Domain")}</h2>
					<p className="mt-1 text-sm text-neutral-500">{t("Choose which domain these global rules apply to.")}</p>
				</div>
				<div className="rounded-3xl bg-white p-6">
					{domains.isLoading ? (
						<Skeleton className="h-10 w-full" />
					) : domains.isError ? (
						<p className="text-sm text-red-600">{t(domains.error.message)}</p>
					) : availableDomains.length === 0 ? (
						<p className="text-sm text-neutral-500">{t("Add a domain before configuring routing rules.")}</p>
					) : (
						<div className="grid gap-2">
							<Label htmlFor="routing-domain">{t("Managed domain")}</Label>
							<RoutingRuleSelect
								id="routing-domain"
								value={selectedDomain?.id ?? ""}
								onChange={(event) => setDomainId(event.target.value)}
							>
								{availableDomains.map((domain) => (
									<option key={domain.id} value={domain.id}>
										{domain.hostname}
									</option>
								))}
							</RoutingRuleSelect>
						</div>
					)}
				</div>
			</section>

			{selectedDomain && <DomainRouting key={selectedDomain.id} domain={selectedDomain} />}
		</div>
	);
}
