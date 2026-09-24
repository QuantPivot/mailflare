"use client";

import Link from "next/link";
import { AppearanceControls } from "@/components/appearance-controls";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { authFetch, getClientSessionToken } from "@/lib/auth/client";
import { getHomeActions, heroMessages, sidebarItems } from "./utils";
import { ArrowRight, Inbox, Mail, Search, ShieldCheck } from "lucide-react";
import { useBranding } from "@/components/branding-provider";
import { useT } from "@/i18n/use-t";

export default function HomePage() {
	const t = useT();

  const branding = useBranding();
  const [hasUser, setHasUser] = useState(false);

  useEffect(() => {
    let cancelled = false;
    if (!getClientSessionToken()) return;

    authFetch("/api/auth/me", { redirectOnUnauthorized: false })
      .then((response) => {
        if (!cancelled) setHasUser(response.ok);
      })
      .catch(() => {
        if (!cancelled) setHasUser(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const actions = getHomeActions(hasUser);

  return (
    <div className="min-h-dvh bg-background text-neutral-900 dark:text-neutral-100">
      <header className="mx-auto flex min-h-16 w-full max-w-7xl flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-6 lg:px-8">
        <Link
          href="/"
          className="flex items-center gap-3"
          aria-label={t("Email Platform home")}
        >
          <img src={branding.iconUrl} height={32} width={32} alt="" />
          <span className="text-base font-semibold tracking-tight">
            {branding.appName}
          </span>
        </Link>

        {/* <nav className="hidden items-center gap-6 text-sm font-medium text-neutral-600 dark:text-neutral-300 md:flex">
					{landingNavItems.map((item) => (
						<a key={item.href} href={item.href} className="transition-colors hover:text-neutral-950 dark:hover:text-neutral-50">
							{t(item.label)}
						</a>
					))}
				</nav> */}

        <div className="flex items-center gap-2">
          <AppearanceControls />
          {actions.map((action) => (
            <Button key={action.href} variant={action.variant} asChild>
              <Link href={action.href}>{t(action.label)}</Link>
            </Button>
          ))}
        </div>
      </header>

      <main>
        <section className="mx-auto grid max-w-7xl grid-cols-1 gap-10 px-4 pb-12 pt-8 sm:px-6 md:pt-16 lg:grid-cols-[0.86fr_1.14fr] lg:px-8">
          <div className="flex max-w-2xl flex-col justify-center">
            <div className="mb-6 flex w-fit items-center gap-2 text-sm font-medium text-blue-800 dark:text-blue-300">
              <ShieldCheck className="h-4 w-4" />
              {t("Cloudflare-native email operations")}</div>
            <h1 className="max-w-[12ch] text-5xl font-semibold leading-[0.96] tracking-tight text-neutral-950 dark:text-neutral-50 sm:text-6xl lg:text-7xl">
              {t("Mailboxes that feel like your inbox.")}</h1>
            <p className="mt-6 max-w-xl text-lg leading-8 text-neutral-600 dark:text-neutral-300">
              {t("Add domains, route inbound mail, send through API keys, and manage your mailboxes from one quiet workspace built around the message list.")}</p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Button size="lg" asChild className="rounded-full px-6">
                <Link href={actions.at(-1)?.href ?? "/setup"}>
                  {hasUser ? t("Open dashboard") : t("Create account")}
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
              <Button
                size="lg"
                variant="outline"
                asChild
                className="rounded-full border-neutral-200 dark:border-neutral-700 bg-card px-6"
              >
                <Link href={hasUser ? "/inbox" : "/login"}>
                  {hasUser ? t("View inbox") : t("Log in")}
                </Link>
              </Button>
            </div>
          </div>

          <div className="relative min-h-[520px] overflow-hidden rounded-[2rem] border border-white bg-card shadow-[0_24px_70px_-45px_rgba(30,64,175,0.55)]">
            <div className="grid h-full min-h-[520px] grid-cols-[176px_1fr] bg-card">
              <aside className="hidden flex-col gap-2 bg-background px-3 py-5 sm:flex">
                <div className="mb-4 flex items-center gap-3 px-3 text-neutral-700 dark:text-neutral-300">
                  <Inbox className="h-5 w-5" />
                  <span className="font-semibold">{t("Mail")}</span>
                </div>
                <div className="mb-3 flex h-12 w-fit items-center gap-2 rounded-2xl bg-blue-100 dark:bg-blue-900/50 px-5 text-sm font-semibold text-blue-950 dark:text-blue-100 shadow-sm">
                  <Mail className="h-4 w-4" />
                  {t("Compose")}</div>
                {sidebarItems.map((item) => {
                  const Icon = item.icon;
                  return (
                    <div
                      key={item.label}
                      className={`flex h-9 items-center justify-between rounded-r-full px-3 text-sm font-medium ${
                        item.active
                          ? "bg-blue-100 dark:bg-blue-900/50 text-blue-950 dark:text-blue-100"
                          : "text-neutral-600 dark:text-neutral-300"
                      }`}
                    >
                      <span className="flex items-center gap-3">
                        <Icon className="h-4 w-4" />
                        {t(item.label)}
                      </span>
                      {item.count && (
                        <span className="text-xs text-blue-800 dark:text-blue-300">
                          {item.count}
                        </span>
                      )}
                    </div>
                  );
                })}
              </aside>

              <div className="col-span-2 flex min-w-0 flex-col sm:col-span-1">
                <div className="flex h-16 items-center gap-3 bg-background px-4">
                  <div className="flex h-12 flex-1 items-center gap-3 rounded-full bg-search px-4 text-neutral-600 dark:text-neutral-300">
                    <Search className="h-5 w-5" />
                    <span className="text-[15px]">{t("Search mail")}</span>
                  </div>
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-blue-600 text-white">
                    <Mail className="h-4 w-4" />
                  </div>
                </div>

                <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-tl-3xl bg-card">
                  <div className="flex h-14 items-center justify-between border-b border-neutral-200 dark:border-neutral-700 px-6">
                    <div className="flex items-center gap-3">
                      <h2 className="text-xl font-medium text-neutral-800 dark:text-neutral-200">
                        {t("Priority inbox")}</h2>
                      <span className="rounded-full bg-neutral-100 dark:bg-neutral-800 px-2.5 py-1 text-xs font-medium text-neutral-600 dark:text-neutral-300">
                        18
                      </span>
                    </div>
                    <span className="hidden text-sm font-medium text-neutral-500 dark:text-neutral-400 md:inline">
                      {t("Updated 2 min ago")}</span>
                  </div>
                  <div className="divide-y divide-neutral-100 dark:divide-neutral-800">
                    {heroMessages.map((message) => (
                      <div
                        key={message.sender}
                        className="grid min-h-14 grid-cols-[28px_minmax(112px,180px)_1fr_auto] items-center gap-3 px-5 text-sm hover:bg-row-hover"
                      >
                        <message.icon className="h-4 w-4 text-neutral-300 dark:text-neutral-500" />
                        <span className="truncate font-semibold text-neutral-900 dark:text-neutral-100">
                          {message.sender}
                        </span>
                        <span className="truncate text-neutral-600 dark:text-neutral-300">
                          <span className="font-medium text-neutral-900 dark:text-neutral-100">
                            {t(message.subject)}
                          </span>
                          <span className="hidden text-neutral-500 dark:text-neutral-400 md:inline">
                            {" "}
                            - {t(message.preview)}
                          </span>
                        </span>
                        <span className="rounded-full bg-blue-50 dark:bg-blue-950/50 px-2.5 py-1 text-xs font-semibold text-blue-700 dark:text-blue-300">
                          {t(message.badge)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* <section id="workflow" className="mx-auto grid max-w-7xl grid-cols-1 gap-6 px-4 pb-16 sm:px-6 lg:grid-cols-[1.1fr_0.9fr] lg:px-8">
					<div id="api" className="rounded-[1.75rem] bg-card p-6 shadow-sm shadow-neutral-200/50 dark:shadow-black/50">
						<div className="mb-6 flex items-center justify-between gap-4">
							<div>
								<p className="text-sm font-semibold text-blue-700 dark:text-blue-300">Operational view</p>
								<h2 className="mt-1 text-2xl font-semibold tracking-tight">From DNS to delivery in one place.</h2>
							</div>
							<Clock3 className="hidden h-6 w-6 text-neutral-400 sm:block" />
						</div>
						<div className="grid gap-4 sm:grid-cols-3">
							{inboxStats.map((stat) => (
								<div key={stat.label} className="border-t border-neutral-200 dark:border-neutral-700 pt-4">
									<p className="no-font-mono text-2xl font-semibold text-neutral-950 dark:text-neutral-50">{stat.value}</p>
									<p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">{stat.label}</p>
								</div>
							))}
						</div>
					</div>

					<div id="domains" className="rounded-[1.75rem] bg-card p-6 shadow-sm shadow-neutral-200/50 dark:shadow-black/50">
						<p className="text-sm font-semibold text-blue-700 dark:text-blue-300">Delivery signals</p>
						<div className="mt-5 space-y-4">
							{deliverySignals.map((signal) => (
								<div key={signal} className="flex items-center gap-3 text-sm font-medium text-neutral-700 dark:text-neutral-300">
									<CheckCircle2 className="h-5 w-5 text-blue-600 dark:text-blue-400" />
									<span>{signal}</span>
								</div>
							))}
						</div>
					</div>
				</section> */}
      </main>
    </div>
  );
}
