import type { Metadata } from "next";
import Link from "next/link";
import { after } from "next/server";

import { BADGE_BY_SLUG, MAX_URI_BYTES, PROGRAM_END, PROGRAM_START, hm } from "@/lib/program";
import { activityTotals, dailyActivity, daysToRefresh, lastRefreshedAt, programDays, refreshActivity } from "@/lib/server/activity";
import { currentUser } from "@/lib/server/auth/session";
import { byteHistogram, dailyCounts, funnel, overview } from "@/lib/server/stats";

import { DauChart, FlowChart, Funnel, Glow, HoursChart, SizeChart } from "./Charts";
import Refresh from "./Refresh";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "SHRINK — stats",
  description: "Live numbers from SHRINK: the funnel, who's building, what got shipped.",
};

const n = (v: number) => v.toLocaleString("en-US");
const pct = (a: number, b: number) => (b > 0 ? `${Math.round((a / b) * 100)}%` : "—");
const dayLabel = (day: string) =>
  new Date(`${day}T00:00:00Z`).toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" });
const fmtDate = (s: string) =>
  new Date(`${s}T00:00:00Z`).toLocaleDateString("en-US", { month: "long", day: "numeric", timeZone: "UTC" });

export default async function StatsPage() {
  const user = await currentUser();
  const admin = user?.role === "admin";
  const days = programDays();

  const last = await lastRefreshedAt();
  // Keep Hackatime fresh without waiting on the cron: first load backfills the
  // program, later loads re-read the last two days once the snapshot is stale.
  const stale = daysToRefresh(last);
  if (stale.length) after(() => refreshActivity(stale).catch((e) => console.error("[activity] refresh failed", e)));

  const [f, o, act, dau, flow, sizes] = await Promise.all([
    funnel(),
    overview(),
    activityTotals(days),
    dailyActivity(days),
    dailyCounts(days),
    byteHistogram(),
  ]);

  const steps = [
    { label: "saw the post", value: f.postViews, color: "grey" as const },
    { label: "visited", value: f.visitors, color: "grey" as const },
    { label: "signed up", value: f.signedUp, color: "blue" as const },
    { label: "building", value: f.active, color: "orange" as const },
    { label: "shipped", value: f.shipped, color: "orange" as const },
    { label: "approved", value: f.approved, color: "green" as const },
  ];

  const dauData = dau.map((d) => ({ day: d.day, label: dayLabel(d.day), coding: d.coding, shrink: d.shrink }));
  const hoursData = dau.map((d) => ({
    day: d.day,
    label: dayLabel(d.day),
    html: d.shrinkSeconds,
    other: Math.max(0, d.codingSeconds - d.shrinkSeconds),
  }));
  const flowData = flow.map((d) => ({ day: d.day, label: dayLabel(d.day), signups: d.signups, ships: d.ships, approved: d.approved }));
  const today = dau.at(-1);
  const hero = [
    { k: "signed up", v: n(f.signedUp), sub: `${n(o.onboarded)} finished setup` },
    { k: "building today", v: n(today?.shrink ?? 0), sub: `${n(today?.coding ?? 0)} on Hackatime at all` },
    { k: "hours on SHRINK", v: (act.shrinkSeconds / 3600).toFixed(1), sub: `of ${(act.codingSeconds / 3600).toFixed(1)}h on Hackatime` },
    { k: "ships", v: n(o.ships.total), sub: `${n(o.ships.approved)} approved · ${n(o.ships.pending)} waiting` },
    { k: "BITES minted", v: n(o.bites.minted), sub: `${n(o.bites.spent)} spent in the shop` },
    { k: "median size", v: o.bytes.median ? `${n(o.bytes.median)}B` : "—", sub: `cap is ${n(MAX_URI_BYTES)} bytes` },
  ];

  return (
    <div
      className="stats-dark flex min-h-full flex-1 flex-col bg-black text-white"
      style={
        {
          "--background": "#000",
          "--foreground": "#fff",
          "--popover": "#141414",
          "--popover-foreground": "#fff",
          "--muted-foreground": "rgba(255,255,255,0.5)",
          "--border": "rgba(255,255,255,0.16)",
          "--card": "#0b0b0b",
          "--panel-border": "rgba(255,255,255,0.16)",
        } as React.CSSProperties
      }
    >
      <div className="hazard-thin" aria-hidden />
      <header className="flex flex-wrap items-center gap-x-6 gap-y-3 px-[var(--gutter)] py-3">
        <Link href="/" className="wordmark text-[1.6rem] leading-none tracking-tight" aria-label="SHRINK home">
          SHRINK
        </Link>
        <span className="font-pixel text-[1.05rem] text-accent">stats</span>
        <span className="hidden font-mono text-xs text-white/45 sm:inline">
          {fmtDate(PROGRAM_START)} → {fmtDate(PROGRAM_END)} · UTC days
        </span>
        <nav className="ml-auto flex items-center gap-4 text-[0.95rem] font-medium text-white/60">
          <Link href="/app" className="hover:text-white">
            {user ? "back to the app" : "sign in"}
          </Link>
          {admin && (
            <Link href="/admin" className="hover:text-white">
              admin
            </Link>
          )}
        </nav>
      </header>
      <hr className="rule bg-white/15" />

      <main className="flex flex-1 flex-col gap-[clamp(2.5rem,5vw,80px)] px-[var(--gutter)] py-[clamp(1.5rem,3vw,48px)]">
        {!admin && (
          <p
            role="note"
            className="flex flex-wrap items-baseline gap-x-3 gap-y-1 border border-accent/40 bg-accent/10 px-4 py-3 text-sm font-medium text-white/85"
          >
            <span className="font-pixel text-accent">this page is intentionally public.</span>
          </p>
        )}

        {/* hero */}
        <section className="relative">
          <Glow color="orange" className="-inset-x-[var(--gutter)] -top-12 bottom-auto h-40" />
          <div className="relative grid grid-cols-2 gap-x-6 gap-y-8 sm:grid-cols-3 lg:grid-cols-6">
            {hero.map((h) => (
              <div key={h.k} className="flex flex-col gap-1">
                <span className="font-mono text-[0.7rem] uppercase tracking-[0.18em] text-white/45">{h.k}</span>
                <span className="font-pixel text-[clamp(2.2rem,4vw,3.6rem)] leading-none tabular-nums text-white">{h.v}</span>
                <span className="text-xs font-medium text-white/50">{h.sub}</span>
              </div>
            ))}
          </div>
        </section>

        {/* funnel */}
        <Section title="funnel" sub="Post → visit → sign up → building → shipped → approved.">
          <Funnel steps={steps} />
        </Section>

        {/* daily actives */}
        <div className="grid gap-[clamp(2rem,4vw,64px)] lg:grid-cols-2">
          <Section title="daily active on Hackatime" sub="People coding that day, and how many of them we detected on a SHRINK project.">
            <DauChart data={dauData} />
            <Facts
              items={[
                ["distinct people coding", n(act.activeCoders)],
                ["distinct people on SHRINK", n(act.activeShrinkers)],
                ["peak SHRINK day", dau.length ? `${Math.max(...dau.map((d) => d.shrink))} people` : "—"],
              ]}
            />
          </Section>
          <Section title="hours logged per day" sub="All Hackatime time, detected SHRINK work vs. the rest.">
            <HoursChart data={hoursData} />
            <Facts
              items={[
                ["SHRINK share of all time", pct(act.shrinkSeconds, act.codingSeconds)],
                ["avg per active SHRINK builder", act.activeShrinkers ? hm(act.shrinkSeconds / act.activeShrinkers) : "—"],
                ["avg per day", dau.length ? hm(act.codingSeconds / dau.length) : "—"],
              ]}
            />
          </Section>
        </div>

        <div className="grid gap-[clamp(2rem,4vw,64px)]">
          <Section title="sign-ups and ships per day" sub="By day.">
            <FlowChart data={flowData} />
            <Facts
              items={[
                ["hours claimed on ships", hm(o.seconds.claimed)],
                ["hours awarded", hm(o.seconds.awarded)],
                ["median time to review", o.reviewMedianMinutes == null ? "—" : hm(o.reviewMedianMinutes * 60)],
                ["re-ships", n(o.ships.reships)],
              ]}
            />
          </Section>
        </div>

        <div className="grid gap-[clamp(2rem,4vw,64px)] lg:grid-cols-3">
          <Section title="ship sizes" sub={`Bytes per ship, up to the ${n(MAX_URI_BYTES)} cap.`}>
            <SizeChart data={sizes} />
            <Facts
              items={[
                ["smallest", o.bytes.min ? `${n(o.bytes.min)}B` : "—"],
                ["largest", o.bytes.max ? `${n(o.bytes.max)}B` : "—"],
                ["mean", o.bytes.mean ? `${n(o.bytes.mean)}B` : "—"],
              ]}
            />
          </Section>
          <Section title="badges" sub="Claimed vs. awarded.">
            <Table
              head={["badge", "claimed", "awarded"]}
              rows={o.badges.map((b) => [BADGE_BY_SLUG.get(b.slug)?.title ?? b.slug, n(b.claimed), n(b.awarded)])}
              empty="No badges claimed yet."
            />
          </Section>
          <Section title="shop" sub="Where BITES go.">
            <Table
              head={["reward", "orders"]}
              rows={o.rewards.map((r) => [r.name, n(r.count)])}
              empty="Nothing ordered yet."
            />
            <Facts
              items={[
                ["orders open", n(o.orders.placed)],
                ["fulfilled", n(o.orders.fulfilled)],
                ["BITES refunded", n(o.bites.refunded)],
              ]}
            />
          </Section>
        </div>

        {admin && (
          <Section title="refresh · admin only" sub="Re-read Hackatime. Only admins see this.">
            <Refresh lastRefreshed={last ? last.toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }) : null} />
          </Section>
        )}
      </main>
      <footer className="flex flex-wrap items-center justify-between gap-2 px-[var(--gutter)] pb-6 font-mono text-xs text-white/35">
        <span>made with &lt;3 by teens in Hack Club</span>
        <span>{last ? `hackatime snapshot ${last.toISOString().slice(0, 16).replace("T", " ")} UTC` : "hackatime snapshot pending"}</span>
      </footer>
    </div>
  );
}

function Section({ title, sub, children }: { title: string; sub?: string; children: React.ReactNode }) {
  return (
    <section className="flex flex-col">
      <div className="mb-4 flex flex-col gap-1 border-t border-white/15 pt-3">
        <h2 className="font-pixel text-[1.35rem] leading-none text-accent">{title}</h2>
        {sub && <p className="max-w-[60ch] text-sm font-medium text-white/50">{sub}</p>}
      </div>
      {children}
    </section>
  );
}

function Facts({ items }: { items: [string, string][] }) {
  return (
    <dl className="mt-4 grid grid-cols-2 gap-x-6 gap-y-3 sm:grid-cols-3">
      {items.map(([k, v]) => (
        <div key={k} className="flex flex-col gap-0.5">
          <dt className="font-mono text-[0.65rem] uppercase tracking-[0.16em] text-white/40">{k}</dt>
          <dd className="font-mono text-sm tabular-nums text-white/85">{v}</dd>
        </div>
      ))}
    </dl>
  );
}

function Table({ head, rows, empty }: { head: string[]; rows: React.ReactNode[][]; empty: string }) {
  if (rows.length === 0) return <p className="text-sm text-white/45">{empty}</p>;
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-white/15 text-left font-mono text-[0.65rem] uppercase tracking-[0.16em] text-white/40">
            {head.map((h, i) => (
              <th key={h} className={`py-2 pr-3 font-normal ${i > 0 ? "text-right" : ""}`}>
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i} className="border-b border-white/8 last:border-0">
              {r.map((c, j) => (
                <td key={j} className={`py-2 pr-3 ${j > 0 ? "text-right font-mono tabular-nums text-white/80" : "font-semibold tracking-tight"}`}>
                  {c}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
