"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Ban, Forward, Inbox, Info, Pencil, Plus, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RoutingRuleSelect } from "./routing-rule-select";
import { Switch } from "@/components/ui/switch";
import { Tooltip } from "@/components/ui/tooltip";
import { CardGridSkeleton } from "@/components/page-skeletons";
import { useSelectedMailbox } from "@/components/mailbox-provider";
import type { DomainRoutingProps, DomainRule, DomainRuleInput } from "./types";
import {
	ACTION_LABELS,
	MATCH_FIELD_LABELS,
	MATCH_OPERATOR_LABELS,
	createDomainRule,
	deleteDomainRule,
	describeRule,
	emptyRuleInput,
	fetchDomainRules,
	formatLastMatched,
	ruleToInput,
	updateDomainRule,
} from "./utils";
import { useLocale } from "next-intl";
import { useT } from "@/i18n/use-t";

const ACTION_ICONS = {
	store: Inbox,
	forward: Forward,
	reject: Ban,
} as const;

export function DomainRouting({ domain }: DomainRoutingProps = {}) {
	const t = useT();


	const qc = useQueryClient();
	const { selectedMailbox, isLoading: isMailboxLoading } = useSelectedMailbox();
	const [dialogOpen, setDialogOpen] = useState(false);
	const [editing, setEditing] = useState<DomainRule | null>(null);
	const [form, setForm] = useState<DomainRuleInput>(emptyRuleInput(""));
	const [error, setError] = useState<string | null>(null);

	const domainId = domain?.id ?? selectedMailbox?.domainId ?? "";
	const mailboxId = selectedMailbox?.id ?? "";
	const mailboxAccessId = domain ? undefined : mailboxId;
	const canManage = !!domain || selectedMailbox?.permission === "full_access";
	const rulesQueryKey = ["domain-rules", domainId, mailboxAccessId ?? "admin"] as const;

	const rules = useQuery({
		queryKey: rulesQueryKey,
		enabled: !!domainId && (!!domain || !!mailboxId) && canManage,
		queryFn: () => fetchDomainRules(domainId, mailboxAccessId),
	});

	const hostname = domain?.hostname ?? selectedMailbox?.hostname ?? "";
	const mailboxes = rules.data?.mailboxes ?? [];

	const save = useMutation({
		mutationFn: () => {
			const payload: DomainRuleInput = { ...form, domainId };
			return editing
				? updateDomainRule(editing.id, payload, mailboxAccessId)
				: createDomainRule(payload, mailboxAccessId);
		},
		onSuccess: () => {
			setDialogOpen(false);
			setEditing(null);
			setError(null);
			qc.invalidateQueries({ queryKey: rulesQueryKey });
		},
		onError: (e: Error) => setError(e.message),
	});

	const remove = useMutation({
		mutationFn: (id: string) => deleteDomainRule(id, mailboxAccessId),
		onSuccess: () => qc.invalidateQueries({ queryKey: rulesQueryKey }),
	});

	const toggle = useMutation({
		mutationFn: (rule: DomainRule) =>
			updateDomainRule(rule.id, { ...ruleToInput(rule), enabled: !rule.enabled }, mailboxAccessId),
		onSuccess: () => qc.invalidateQueries({ queryKey: rulesQueryKey }),
	});

	function openCreate() {
		setEditing(null);
		setError(null);
		setForm(emptyRuleInput(domainId));
		setDialogOpen(true);
	}

	function openEdit(rule: DomainRule) {
		setEditing(rule);
		setError(null);
		setForm(ruleToInput(rule));
		setDialogOpen(true);
	}

	const blockRules = (rules.data?.rules ?? []).filter((r) => r.action === "reject");
	const fallbackRules = (rules.data?.rules ?? []).filter((r) => r.action !== "reject");

	return (
		<div className="space-y-6">
			<div className="flex flex-wrap items-end justify-between gap-4">
				<div>
					<div className="flex items-center gap-2">
						<h2 className="text-2xl font-semibold">{t("Domain routing")}</h2>
						<Tooltip label={t("Block, forward, or deliver mail arriving at this domain.")}>
							<button type="button" aria-label={t("About domain routing")} className="text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-300">
								<Info className="h-4 w-4" />
							</button>
						</Tooltip>
					</div>
					<p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">{hostname ? t("Rules for {domain}", { domain: hostname }) : t("Select an inbox")}</p>
				</div>
				<div className="flex items-end gap-2">
					<Button onClick={openCreate} disabled={!domainId || (!domain && !mailboxId) || !canManage}>
						<Plus className="h-4 w-4" /> {" "}{t("Add route")}</Button>
				</div>
			</div>

			{(!domain && isMailboxLoading) || rules.isLoading ? (
				<CardGridSkeleton />
			) : !domain && !mailboxId ? (
				<Card>
					<CardContent className="pt-6 text-sm text-neutral-500 dark:text-neutral-400">
						{t("Select an inbox before creating routing rules.")}</CardContent>
				</Card>
			) : !canManage ? (
				<Card>
					<CardContent className="pt-6 text-sm text-neutral-500 dark:text-neutral-400">
						{t("Full access to the selected inbox is required to manage domain routing.")}</CardContent>
				</Card>
			) : (
				<div className="space-y-1 overflow-hidden rounded-3xl">
					<RuleSection
						className="rounded-b-lg rounded-t-3xl"
						title={t("Block rules")}
						description={t("Evaluated before delivery. Matching mail is rejected at the edge.")}
						rules={blockRules}
						hostname={hostname}
						mailboxes={mailboxes}
						onEdit={openEdit}
						onDelete={(id) => remove.mutate(id)}
						onToggle={(rule) => toggle.mutate(rule)}
					/>
					<RuleSection
						className="rounded-b-3xl rounded-t-lg"
						title={t("Catch-all and forwarding")}
						description={t("Evaluated only when no mailbox on the domain matched the recipient.")}
						rules={fallbackRules}
						hostname={hostname}
						mailboxes={mailboxes}
						onEdit={openEdit}
						onDelete={(id) => remove.mutate(id)}
						onToggle={(rule) => toggle.mutate(rule)}
					/>
				</div>
			)}

			<Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
				{/* The form grows when the action changes, so the dialog must scroll rather than overflow the viewport. */}
				<DialogContent className="max-h-[calc(100vh-4rem)] overflow-y-auto sm:max-w-[560px]">
					<DialogHeader>
						<DialogTitle>{editing ? t("Edit rule") : t("Add routing rule")}</DialogTitle>
						<DialogDescription>{t("Choose what happens to matching mail.")}</DialogDescription>
					</DialogHeader>

					<form
						className="space-y-4"
						onSubmit={(e) => {
							e.preventDefault();
							save.mutate();
						}}
					>
						<div className="grid grid-cols-1 items-end gap-4 sm:grid-cols-2">
						<div className="grid min-w-0 gap-2">
							<Label htmlFor="rule-name">{t("Name")}</Label>
							<Input
								id="rule-name"
								value={form.name ?? ""}
								placeholder={t("Optional label")}
								onChange={(e) => setForm({ ...form, name: e.target.value })}
							/>
						</div>

						<div className="grid min-w-0 gap-2">
							<Label htmlFor="rule-action">{t("Action")}</Label>
							<RoutingRuleSelect
								id="rule-action"
								value={form.action}
								onChange={(e) =>
									setForm({ ...form, action: e.target.value as DomainRuleInput["action"] })
								}
							>
								{Object.entries(ACTION_LABELS).map(([value, label]) => (
									<option key={value} value={value}>
										{t(label)}
									</option>
								))}
							</RoutingRuleSelect>
						</div>
						</div>

						<div className="grid grid-cols-1 items-end gap-4 sm:grid-cols-2">
							<div className="grid min-w-0 gap-2">
								<Label htmlFor="rule-field">{t("Match on")}</Label>
								<RoutingRuleSelect
									id="rule-field"
									value={form.matchField}
									onChange={(e) =>
										setForm({ ...form, matchField: e.target.value as DomainRuleInput["matchField"] })
									}
								>
									{Object.entries(MATCH_FIELD_LABELS).map(([value, label]) => (
										<option key={value} value={value}>
											{t(label)}
										</option>
									))}
								</RoutingRuleSelect>
							</div>
							<div className="grid min-w-0 gap-2">
								<Label htmlFor="rule-operator">{t("Condition")}</Label>
								<RoutingRuleSelect
									id="rule-operator"
									value={form.matchOperator}
									onChange={(e) =>
										setForm({
											...form,
											matchOperator: e.target.value as DomainRuleInput["matchOperator"],
										})
									}
								>
									{Object.entries(MATCH_OPERATOR_LABELS).map(([value, label]) => (
										<option key={value} value={value}>
											{t(label)}
										</option>
									))}
								</RoutingRuleSelect>
							</div>
						</div>

						<div className="grid grid-cols-1 items-end gap-4 sm:grid-cols-2">
							<div className="grid min-w-0 gap-2">
								<div className="flex items-center gap-2">
									<Label htmlFor="rule-value">{t("Match value")}</Label>
									<Tooltip label={t("Use * to match every message.")}>
										<span className="text-neutral-400"><Info className="h-4 w-4" /></span>
									</Tooltip>
								</div>
								<Input
									id="rule-value"
									required
									value={form.matchValue}
									placeholder={t("* to match everything")}
									onChange={(e) => setForm({ ...form, matchValue: e.target.value })}
								/>
							</div>
							<div className="grid min-w-0 gap-2">
								<div className="flex items-center gap-2">
									<Label htmlFor="rule-priority">{t("Priority")}</Label>
									<Tooltip label={t("Higher numbers run first.")}>
										<span className="text-neutral-400"><Info className="h-4 w-4" /></span>
									</Tooltip>
								</div>
								<Input
									id="rule-priority"
									type="number"
									min={0}
									max={1000}
									value={form.priority}
									onChange={(e) => setForm({ ...form, priority: Number(e.target.value) })}
								/>
							</div>
						</div>

						{form.action !== "reject" && (
							<div className={form.action === "forward" ? "grid grid-cols-1 items-end gap-4 sm:grid-cols-2" : "grid min-w-0 gap-2"}>
							<div className="grid min-w-0 gap-2">
								<Label htmlFor="rule-mailbox">
									{form.action === "forward" ? t("Mailbox for the kept copy") : t("Destination mailbox")}
								</Label>
								<RoutingRuleSelect
									id="rule-mailbox"
									value={form.mailboxId ?? ""}
									onChange={(e) => setForm({ ...form, mailboxId: e.target.value || null })}
								>
									<option value="">{t("Select a mailbox")}</option>
									{mailboxes.map((mailbox) => (
										<option key={mailbox.id} value={mailbox.id}>
											{mailbox.localPart}@{hostname}
											{mailbox.disabled ? t(" (disabled)") : ""}
										</option>
									))}
								</RoutingRuleSelect>
							</div>
							{form.action === "forward" && (
								<div className="grid min-w-0 gap-2">
									<Label htmlFor="rule-forward">{t("Forward to")}</Label>
									<Input
										id="rule-forward"
										type="email"
										required
										value={form.forwardTo ?? ""}
										onChange={(e) => setForm({ ...form, forwardTo: e.target.value })}
									/>
								</div>
							)}
							</div>
						)}

						{form.action === "forward" && (
							<div className="flex items-center justify-between rounded-lg border border-neutral-200 dark:border-neutral-700 px-3 py-2">
								<div>
									<div className="flex items-center gap-2">
										<p className="text-sm font-medium">{t("Keep a copy")}</p>
										<Tooltip label={t("Also store the message in the selected inbox.")}>
											<span className="text-neutral-400"><Info className="h-4 w-4" /></span>
										</Tooltip>
									</div>
								</div>
								<Switch
									checked={form.keepCopy}
									onCheckedChange={(keepCopy) => setForm({ ...form, keepCopy })}
								/>
							</div>
						)}

						{form.action === "reject" && (
							<div className="grid min-w-0 gap-2">
								<Label htmlFor="rule-reason">{t("Rejection reason")}</Label>
								<Input
									id="rule-reason"
									value={form.rejectReason ?? ""}
									placeholder={t("Message rejected by routing rule")}
									onChange={(e) => setForm({ ...form, rejectReason: e.target.value })}
								/>
							</div>
						)}

						{error && <p className="text-sm text-red-600 dark:text-red-400">{t(error)}</p>}

						<div className="flex justify-end gap-2 border-t border-neutral-200 dark:border-neutral-700 pt-4">
							<Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
								{t("Cancel")}</Button>
							<Button type="submit" disabled={save.isPending}>
								{editing ? t("Save changes") : t("Create rule")}
							</Button>
						</div>
					</form>
				</DialogContent>
			</Dialog>
		</div>
	);
}

function RuleSection({
	className,
	title,
	description,
	rules,
	hostname,
	mailboxes,
	onEdit,
	onDelete,
	onToggle,
}: {
	className: string;
	title: string;
	description: string;
	rules: DomainRule[];
	hostname: string;
	mailboxes: { id: string; localPart: string; displayName: string | null; disabled: boolean }[];
	onEdit: (rule: DomainRule) => void;
	onDelete: (id: string) => void;
	onToggle: (rule: DomainRule) => void;
}) {
	const t = useT();
	const locale = useLocale();

	return (
		<Card className={`${className} border-0 bg-card px-6`}>
			<CardHeader>
				<div className="flex items-center gap-2">
					<CardTitle className="text-xs uppercase">{title}</CardTitle>
					<Tooltip label={description}>
						<span className="text-neutral-400"><Info className="h-4 w-4" /></span>
					</Tooltip>
				</div>
			</CardHeader>
			<CardContent className="space-y-2 pb-5">
				{rules.length === 0 ? (
					<p className="text-sm text-neutral-500 dark:text-neutral-400">{t("No rules yet.")}</p>
				) : (
					rules.map((rule) => {
						const Icon = ACTION_ICONS[rule.action];
						return (
							<div
								key={rule.id}
								className="flex flex-wrap items-center gap-3 rounded-xl border border-neutral-200 dark:border-neutral-700 px-3 py-2"
							>
								<Icon className="h-4 w-4 shrink-0 text-neutral-500 dark:text-neutral-400" />
								<div className="min-w-0 flex-1">
									<div className="flex items-center gap-2">
										<p className="truncate text-sm font-medium">
											{rule.name || describeRule(rule, mailboxes, hostname, t)}
										</p>
										{!rule.enabled && <Badge variant="secondary">{t("Disabled")}</Badge>}
									</div>
									{rule.name && (
										<p className="truncate text-xs text-neutral-500 dark:text-neutral-400">
											{describeRule(rule, mailboxes, hostname, t)}
										</p>
									)}
									<p className="text-xs text-neutral-400">
										{t("Priority {priority} · matched {count}× · last {date}", { priority: rule.priority, count: rule.matchCount, date: t(formatLastMatched(rule.lastMatchedAt, locale)) })}
									</p>
								</div>
								<Switch checked={rule.enabled} onCheckedChange={() => onToggle(rule)} />
								<Button variant="ghost" size="sm" onClick={() => onEdit(rule)}>
									<Pencil className="h-4 w-4" />
								</Button>
								<Button variant="ghost" size="sm" onClick={() => onDelete(rule.id)}>
									<Trash2 className="h-4 w-4 text-red-600 dark:text-red-400" />
								</Button>
							</div>
						);
					})
				)}
			</CardContent>
		</Card>
	);
}
