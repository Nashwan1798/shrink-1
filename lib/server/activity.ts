import "server-only";

import { and, gte, isNotNull, lte, sql } from "drizzle-orm";

import { PROGRAM_START } from "@/lib/program";

import { decrypt } from "./crypto";
import { db } from "./db/client";
import { hackatimeDays, users } from "./db/schema";
import { env, staging } from "./env";
import { hackatimeTokenBinding } from "./hackatime";

// Hackatime activity, one row per person per UTC day. The SHRINK signal is
// time logged in HTML: a SHRINK app is a single HTML file, so someone with
// HTML heartbeats that day is working on their entry.

const STATS_PATH = "/api/v1/users/my/stats";
const HTML = /html/i;
const CONCURRENCY = 4;
// How old the newest row may be before a page view kicks off a refresh.
export const STALE_MS = 30 * 60_000;

type Slice = { name: string; seconds: number };

export const utcDay = (d: Date) => d.toISOString().slice(0, 10);

export function programDays(until = new Date()): string[] {
  const out: string[] = [];
  const start = new Date(`${PROGRAM_START}T00:00:00Z`);
  const end = new Date(`${utcDay(until)}T00:00:00Z`);
  for (let d = start; d <= end; d = new Date(d.getTime() + 86_400_000)) out.push(utcDay(d));
  return out;
}

// The last `n` UTC days ending today, oldest first.
export function recentDays(n: number, until = new Date()): string[] {
  const end = new Date(`${utcDay(until)}T00:00:00Z`);
  return Array.from({ length: n }, (_, i) => utcDay(new Date(end.getTime() - (n - 1 - i) * 86_400_000)));
}

function slices(list: unknown): Slice[] {
  if (!Array.isArray(list)) return [];
  return (list as { name?: unknown; total_seconds?: unknown }[])
    .filter((p) => typeof p.name === "string" && p.name.length > 0)
    .map((p) => ({ name: p.name as string, seconds: Math.max(0, Math.round(Number(p.total_seconds) || 0)) }))
    .filter((p) => p.seconds > 0)
    .sort((a, b) => b.seconds - a.seconds);
}

type DayStats = { totalSeconds: number; htmlSeconds: number; languages: Slice[]; projects: Slice[] };

// WakatimeService filters `time >= start AND time < end`, so [day, day+1).
async function fetchDay(token: string, day: string): Promise<DayStats | null> {
  const next = utcDay(new Date(new Date(`${day}T00:00:00Z`).getTime() + 86_400_000));
  const url = new URL(`${env.HACKATIME_HOST}${STATS_PATH}`);
  url.searchParams.set("features", "languages,projects");
  url.searchParams.set("start_date", `${day}T00:00:00Z`);
  url.searchParams.set("end_date", `${next}T00:00:00Z`);
  const res = await fetch(url, {
    headers: { authorization: `Bearer ${token}`, accept: "application/json" },
    cache: "no-store",
    signal: AbortSignal.timeout(15_000),
  });
  if (res.status === 401 || res.status === 403 || res.status === 404) return null;
  if (!res.ok) throw new Error(`Hackatime ${res.status}`);
  const body = (await res.json()) as { data?: { total_seconds?: unknown; languages?: unknown; projects?: unknown } };
  const languages = slices(body.data?.languages);
  const projects = slices(body.data?.projects);
  return {
    totalSeconds: Math.max(0, Math.round(Number(body.data?.total_seconds) || 0)),
    htmlSeconds: languages.filter((l) => HTML.test(l.name)).reduce((s, l) => s + l.seconds, 0),
    languages,
    projects,
  };
}

// Deterministic pretend activity so the page has something to show locally.
function fakeDay(userId: string, day: string): DayStats {
  let h = 0;
  for (const c of `${userId}:${day}`) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  const on = h % 3 !== 0;
  const total = on ? 1200 + (h % 9000) : 0;
  const html = on && h % 4 !== 0 ? Math.round(total * 0.6) : 0;
  const rest = total - html;
  return {
    totalSeconds: total,
    htmlSeconds: html,
    languages: [
      { name: "HTML", seconds: html },
      { name: "JavaScript", seconds: Math.round(rest * 0.7) },
      { name: "CSS", seconds: rest - Math.round(rest * 0.7) },
    ].filter((l) => l.seconds > 0),
    projects: total ? [{ name: "shrink-synth", seconds: total }] : [],
  };
}

export type RefreshResult = { users: number; days: number; rows: number; failed: number };

// Re-reads `days` for everyone with a Hackatime token. Only one refresh runs
// at a time; a second caller returns null right away. The lock is held by a
// transaction of its own, because the pool hands out different connections and
// a session-level advisory lock would be released on the wrong one.
export async function refreshActivity(days: string[]): Promise<RefreshResult | null> {
  if (days.length === 0) return { users: 0, days: 0, rows: 0, failed: 0 };
  return db.transaction(async (tx) => {
    const [lock] = (await tx.execute(sql`select pg_try_advisory_xact_lock(hashtext('hackatime-refresh')) as ok`)) as { ok: boolean }[];
    if (!lock?.ok) return null;
    return doRefresh(days);
  });
}

async function doRefresh(days: string[]): Promise<RefreshResult> {
  const people = await db
    .select({ id: users.id, token: users.hackatimeTokenEncrypted, accountId: users.hackatimeAccountId })
    .from(users)
    .where(isNotNull(users.hackatimeAccountId));
  let rows = 0;
  let failed = 0;
  const queue = [...people];
  const worker = async () => {
    for (let p = queue.shift(); p; p = queue.shift()) {
      let token: string | null = null;
      if (!staging()) {
        try {
          token = p.token ? decrypt(p.token, hackatimeTokenBinding(p.id)) : null;
        } catch {
          token = null;
        }
        if (!token) continue;
      }
      for (const day of days) {
        try {
          const stats = staging() ? fakeDay(p.id, day) : await fetchDay(token!, day);
          if (!stats) break; // token revoked: nothing more to read for this person
          await db
            .insert(hackatimeDays)
            .values({ userId: p.id, day, ...stats, fetchedAt: new Date() })
            .onConflictDoUpdate({ target: [hackatimeDays.userId, hackatimeDays.day], set: { ...stats, fetchedAt: new Date() } });
          rows++;
        } catch (e) {
          failed++;
          console.error(`[activity] ${p.id} ${day}`, e);
        }
      }
    }
  };
  await Promise.all(Array.from({ length: CONCURRENCY }, worker));
  return { users: people.length, days: days.length, rows, failed };
}

export async function lastRefreshedAt(): Promise<Date | null> {
  const [row] = await db.select({ at: sql<string | null>`max(${hackatimeDays.fetchedAt})` }).from(hackatimeDays);
  return row?.at ? new Date(row.at) : null;
}

// Which days a page view should re-read, given the newest snapshot: the whole
// program when there is none, the last two days once it's stale, else nothing.
export function daysToRefresh(last: Date | null, now = new Date()): string[] {
  if (!last) return programDays(now);
  if (now.getTime() - last.getTime() > STALE_MS) return recentDays(2, now);
  return [];
}

export type DayActivity = {
  day: string;
  coding: number; // people with any Hackatime time
  shrink: number; // people with HTML time
  codingSeconds: number;
  htmlSeconds: number;
};

export async function dailyActivity(days: string[]): Promise<DayActivity[]> {
  if (days.length === 0) return [];
  const rows = await db
    .select({
      day: hackatimeDays.day,
      coding: sql<number>`(count(*) filter (where ${hackatimeDays.totalSeconds} > 0))::int`,
      shrink: sql<number>`(count(*) filter (where ${hackatimeDays.htmlSeconds} > 0))::int`,
      codingSeconds: sql<number>`coalesce(sum(${hackatimeDays.totalSeconds}), 0)::bigint`,
      htmlSeconds: sql<number>`coalesce(sum(${hackatimeDays.htmlSeconds}), 0)::bigint`,
    })
    .from(hackatimeDays)
    .where(and(gte(hackatimeDays.day, days[0]), lte(hackatimeDays.day, days[days.length - 1])))
    .groupBy(hackatimeDays.day);
  const by = new Map(rows.map((r) => [r.day, r]));
  return days.map((day) => {
    const r = by.get(day);
    return {
      day,
      coding: r?.coding ?? 0,
      shrink: r?.shrink ?? 0,
      codingSeconds: Number(r?.codingSeconds ?? 0),
      htmlSeconds: Number(r?.htmlSeconds ?? 0),
    };
  });
}

export type ActivityTotals = {
  activeCoders: number; // distinct people with any time in the window
  activeShrinkers: number; // distinct people with HTML time in the window
  codingSeconds: number;
  htmlSeconds: number;
  languages: Slice[]; // top languages across everyone
};

export async function activityTotals(days: string[]): Promise<ActivityTotals> {
  const empty = { activeCoders: 0, activeShrinkers: 0, codingSeconds: 0, htmlSeconds: 0, languages: [] };
  if (days.length === 0) return empty;
  const inWindow = and(gte(hackatimeDays.day, days[0]), lte(hackatimeDays.day, days[days.length - 1]));
  const [[t], langs] = await Promise.all([
    db
      .select({
        activeCoders: sql<number>`(count(distinct ${hackatimeDays.userId}) filter (where ${hackatimeDays.totalSeconds} > 0))::int`,
        activeShrinkers: sql<number>`(count(distinct ${hackatimeDays.userId}) filter (where ${hackatimeDays.htmlSeconds} > 0))::int`,
        codingSeconds: sql<number>`coalesce(sum(${hackatimeDays.totalSeconds}), 0)::bigint`,
        htmlSeconds: sql<number>`coalesce(sum(${hackatimeDays.htmlSeconds}), 0)::bigint`,
      })
      .from(hackatimeDays)
      .where(inWindow),
    db
      .select({
        name: sql<string>`l->>'name'`,
        seconds: sql<number>`sum((l->>'seconds')::bigint)::bigint`,
      })
      .from(hackatimeDays)
      .innerJoin(sql`jsonb_array_elements(${hackatimeDays.languages}) as l`, sql`true`)
      .where(inWindow)
      .groupBy(sql`l->>'name'`)
      .orderBy(sql`sum((l->>'seconds')::bigint) desc`)
      .limit(8),
  ]);
  return {
    activeCoders: t?.activeCoders ?? 0,
    activeShrinkers: t?.activeShrinkers ?? 0,
    codingSeconds: Number(t?.codingSeconds ?? 0),
    htmlSeconds: Number(t?.htmlSeconds ?? 0),
    languages: langs.map((l) => ({ name: l.name, seconds: Number(l.seconds) })),
  };
}

// Admin only: this names people.
export type PersonActivity = {
  userId: string;
  displayName: string;
  slackId: string | null;
  activeDays: number;
  shrinkDays: number;
  codingSeconds: number;
  htmlSeconds: number;
};

export async function perPersonActivity(days: string[]): Promise<PersonActivity[]> {
  if (days.length === 0) return [];
  const rows = await db
    .select({
      userId: hackatimeDays.userId,
      displayName: users.displayName,
      slackId: users.slackId,
      activeDays: sql<number>`(count(*) filter (where ${hackatimeDays.totalSeconds} > 0))::int`,
      shrinkDays: sql<number>`(count(*) filter (where ${hackatimeDays.htmlSeconds} > 0))::int`,
      codingSeconds: sql<number>`coalesce(sum(${hackatimeDays.totalSeconds}), 0)::bigint`,
      htmlSeconds: sql<number>`coalesce(sum(${hackatimeDays.htmlSeconds}), 0)::bigint`,
    })
    .from(hackatimeDays)
    .innerJoin(users, sql`${users.id} = ${hackatimeDays.userId}`)
    .where(and(gte(hackatimeDays.day, days[0]), lte(hackatimeDays.day, days[days.length - 1])))
    .groupBy(hackatimeDays.userId, users.displayName, users.slackId)
    .orderBy(sql`sum(${hackatimeDays.htmlSeconds}) desc`, sql`sum(${hackatimeDays.totalSeconds}) desc`);
  return rows.map((r) => ({ ...r, codingSeconds: Number(r.codingSeconds), htmlSeconds: Number(r.htmlSeconds) }));
}
