import "server-only";

import { and, gte, isNotNull, lte, sql } from "drizzle-orm";

import { PROGRAM_START } from "@/lib/program";

import { decrypt } from "./crypto";
import { db } from "./db/client";
import { hackatimeDays, hackatimeProjects, users } from "./db/schema";
import { env, staging } from "./env";
import { hackatimeTokenBinding } from "./hackatime";

// Hackatime activity, one row per person per UTC day, built from raw heartbeats.
//
// SHRINK detection is per project, not per file: a SHRINK app is a single HTML
// file plus at most a README and a build script, so a Hackatime project counts
// only if, over every day we've seen it, someone touched HTML in it and never
// touched anything a SHRINK project has no business having (images, JSX, TS,
// Python, ...). One PNG on day two invalidates the project on day one as well.

const HEARTBEATS_PATH = "/api/v1/my/heartbeats";
// Hackatime attributes the gap to the next heartbeat to the earlier one, capped here.
const GAP_CAP = 120;
const CONCURRENCY = 4;
// How old the newest row may be before a page view kicks off a refresh.
export const STALE_MS = 30 * 60_000;

// Files a SHRINK project may contain, by extension (lowercase, no dot).
const OK_EXT = new Set([
  "html", "htm", "css", "js", "mjs", "cjs",
  "md", "markdown", "txt", "json",
  "gitignore", "gitattributes", "editorconfig", "license", "lock",
]);
// For entities with no extension (README, LICENSE, Makefile-ish names).
const OK_LANG = new Set(["HTML", "CSS", "JavaScript", "Markdown", "Text", "Plain Text", "JSON", "Git Config", "Ignore List", "Ignore"]);
const HTML = /^html?$/;

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

// ---- heartbeats → one day ---------------------------------------------------------------------

type Heartbeat = { time: number; project: string | null; language: string | null; entity: string | null; type: string | null };

type ProjectDay = { project: string; seconds: number; hasHtml: boolean; offenders: string[] };
type DayStats = { totalSeconds: number; languages: Slice[]; projects: Slice[]; perProject: ProjectDay[] };

function extOf(entity: string): string | null {
  const base = entity.split(/[\\/]/).pop() ?? "";
  const dot = base.lastIndexOf(".");
  return dot < 0 ? null : base.slice(dot + 1).toLowerCase();
}

const isFile = (h: Heartbeat) => Boolean(h.entity) && (!h.type || h.type === "file");

// What, if anything, disqualifies this heartbeat's file from a SHRINK project.
function offender(h: Heartbeat): string | null {
  if (!isFile(h)) return null; // browser domains, apps: not files
  const ext = extOf(h.entity!);
  if (ext) return OK_EXT.has(ext) ? null : `.${ext}`;
  if (!h.language || OK_LANG.has(h.language)) return null;
  return h.language;
}

export function summarise(list: Heartbeat[]): DayStats {
  const beats = list.filter((h) => Number.isFinite(h.time)).sort((a, b) => a.time - b.time);
  const byProject = new Map<string, ProjectDay & { offenderSet: Set<string> }>();
  const byLang = new Map<string, number>();
  let total = 0;
  for (let i = 0; i < beats.length; i++) {
    const h = beats[i];
    const next = beats[i + 1];
    const dur = next ? Math.min(GAP_CAP, Math.max(0, next.time - h.time)) : 0;
    total += dur;
    const name = h.project?.trim() || "Other";
    const p = byProject.get(name) ?? { project: name, seconds: 0, hasHtml: false, offenders: [], offenderSet: new Set<string>() };
    p.seconds += dur;
    const ext = isFile(h) ? extOf(h.entity!) : null;
    if ((ext && HTML.test(ext)) || h.language === "HTML") p.hasHtml = true;
    const bad = offender(h);
    if (bad) p.offenderSet.add(bad);
    byProject.set(name, p);
    const lang = h.language?.trim() || "Other";
    byLang.set(lang, (byLang.get(lang) ?? 0) + dur);
  }
  const perProject = [...byProject.values()].map(({ offenderSet, ...p }) => ({
    ...p,
    seconds: Math.round(p.seconds),
    offenders: [...offenderSet].sort().slice(0, 20),
  }));
  const slices = (m: Iterable<[string, number]>) =>
    [...m]
      .map(([name, seconds]) => ({ name, seconds: Math.round(seconds) }))
      .filter((s) => s.seconds > 0)
      .sort((a, b) => b.seconds - a.seconds);
  return {
    totalSeconds: Math.round(total),
    languages: slices(byLang),
    projects: slices(perProject.map((p) => [p.project, p.seconds] as [string, number])),
    perProject,
  };
}

// The endpoint is inclusive on both ends, so stop a second before midnight.
async function fetchDay(token: string, day: string): Promise<DayStats | null> {
  const url = new URL(`${env.HACKATIME_HOST}${HEARTBEATS_PATH}`);
  url.searchParams.set("start_time", `${day}T00:00:00Z`);
  url.searchParams.set("end_time", `${day}T23:59:59Z`);
  const res = await fetch(url, {
    headers: { authorization: `Bearer ${token}`, accept: "application/json" },
    cache: "no-store",
    signal: AbortSignal.timeout(20_000),
  });
  if (res.status === 401 || res.status === 403 || res.status === 404) return null;
  if (!res.ok) throw new Error(`Hackatime ${res.status}`);
  const body = (await res.json()) as { heartbeats?: unknown };
  const raw = Array.isArray(body.heartbeats) ? (body.heartbeats as Record<string, unknown>[]) : [];
  const str = (v: unknown) => (typeof v === "string" ? v : null);
  return summarise(
    raw.map((h) => ({ time: Number(h.time), project: str(h.project), language: str(h.language), entity: str(h.entity), type: str(h.type) })),
  );
}

// Deterministic pretend heartbeats so the page has something to show locally:
// a clean SHRINK project, one poisoned by a PNG, and a Python project.
function fakeDay(userId: string, day: string): DayStats {
  let h = 0;
  for (const c of `${userId}:${day}`) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  const base = new Date(`${day}T15:00:00Z`).getTime() / 1000;
  const beats: Heartbeat[] = [];
  const add = (n: number, project: string, entity: string, language: string) => {
    for (let i = 0; i < n; i++) beats.push({ time: base + beats.length * 45, project, entity, language, type: "file" });
  };
  if (h % 3 !== 0) add(40 + (h % 80), "shrink-synth", "/p/synth/index.html", "HTML");
  if (h % 4 === 0) add(30, "tiny-snake", "/p/snake/sprites.png", "Image (png)");
  add(20, "tiny-snake", "/p/snake/index.html", "HTML");
  if (h % 5 !== 0) add(25 + (h % 40), "something-else", "/p/else/main.py", "Python");
  return summarise(beats);
}

// ---- refresh ----------------------------------------------------------------------------------

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
    .select({ id: users.id, token: users.hackatimeTokenEncrypted })
    .from(users)
    .where(isNotNull(users.hackatimeAccountId));
  let rows = 0;
  let failed = 0;
  const touched = new Set<string>();
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
          await storeDay(p.id, day, stats);
          touched.add(p.id);
          rows++;
        } catch (e) {
          failed++;
          console.error(`[activity] ${p.id} ${day}`, e);
        }
      }
    }
  };
  await Promise.all(Array.from({ length: CONCURRENCY }, worker));
  if (touched.size) await recomputeShrink([...touched]);
  return { users: people.length, days: days.length, rows, failed };
}

async function storeDay(userId: string, day: string, s: DayStats): Promise<void> {
  await db.transaction(async (tx) => {
    const row = { totalSeconds: s.totalSeconds, languages: s.languages, projects: s.projects, fetchedAt: new Date() };
    await tx
      .insert(hackatimeDays)
      .values({ userId, day, ...row })
      .onConflictDoUpdate({ target: [hackatimeDays.userId, hackatimeDays.day], set: row });
    await tx.delete(hackatimeProjects).where(and(sql`${hackatimeProjects.userId} = ${userId}`, sql`${hackatimeProjects.day} = ${day}`));
    if (s.perProject.length) {
      await tx.insert(hackatimeProjects).values(s.perProject.map((p) => ({ userId, day, ...p })));
    }
  });
}

// A project passes if any day had HTML and no day had an offender. Then each
// day's SHRINK time is the sum of its passing projects.
async function recomputeShrink(userIds: string[]): Promise<void> {
  await db.execute(sql`
    with verdict as (
      select user_id, project
      from ${hackatimeProjects}
      where user_id in ${userIds}
      group by user_id, project
      having bool_or(has_html) and not bool_or(cardinality(offenders) > 0)
    )
    update ${hackatimeDays} d
    set html_seconds = coalesce((
      select sum(hp.seconds)::int
      from ${hackatimeProjects} hp
      join verdict v on v.user_id = hp.user_id and v.project = hp.project
      where hp.user_id = d.user_id and hp.day = d.day
    ), 0)
    where d.user_id in ${userIds}
  `);
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

// ---- queries ----------------------------------------------------------------------------------

export type DayActivity = {
  day: string;
  coding: number; // people with any Hackatime time
  shrink: number; // people with time on a SHRINK project
  codingSeconds: number;
  shrinkSeconds: number;
};

export async function dailyActivity(days: string[]): Promise<DayActivity[]> {
  if (days.length === 0) return [];
  const rows = await db
    .select({
      day: hackatimeDays.day,
      coding: sql<number>`(count(*) filter (where ${hackatimeDays.totalSeconds} > 0))::int`,
      shrink: sql<number>`(count(*) filter (where ${hackatimeDays.shrinkSeconds} > 0))::int`,
      codingSeconds: sql<number>`coalesce(sum(${hackatimeDays.totalSeconds}), 0)::bigint`,
      shrinkSeconds: sql<number>`coalesce(sum(${hackatimeDays.shrinkSeconds}), 0)::bigint`,
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
      shrinkSeconds: Number(r?.shrinkSeconds ?? 0),
    };
  });
}

export type ActivityTotals = {
  activeCoders: number; // distinct people with any time in the window
  activeShrinkers: number; // distinct people with SHRINK time in the window
  codingSeconds: number;
  shrinkSeconds: number;
};

export async function activityTotals(days: string[]): Promise<ActivityTotals> {
  const empty = { activeCoders: 0, activeShrinkers: 0, codingSeconds: 0, shrinkSeconds: 0 };
  if (days.length === 0) return empty;
  const [t] = await db
    .select({
      activeCoders: sql<number>`(count(distinct ${hackatimeDays.userId}) filter (where ${hackatimeDays.totalSeconds} > 0))::int`,
      activeShrinkers: sql<number>`(count(distinct ${hackatimeDays.userId}) filter (where ${hackatimeDays.shrinkSeconds} > 0))::int`,
      codingSeconds: sql<number>`coalesce(sum(${hackatimeDays.totalSeconds}), 0)::bigint`,
      shrinkSeconds: sql<number>`coalesce(sum(${hackatimeDays.shrinkSeconds}), 0)::bigint`,
    })
    .from(hackatimeDays)
    .where(and(gte(hackatimeDays.day, days[0]), lte(hackatimeDays.day, days[days.length - 1])));
  return {
    activeCoders: t?.activeCoders ?? 0,
    activeShrinkers: t?.activeShrinkers ?? 0,
    codingSeconds: Number(t?.codingSeconds ?? 0),
    shrinkSeconds: Number(t?.shrinkSeconds ?? 0),
  };
}

// Admin only: this names people.
export type ProjectVerdict = { project: string; seconds: number; shrink: boolean; offenders: string[] };
export type PersonActivity = {
  userId: string;
  displayName: string;
  slackId: string | null;
  activeDays: number;
  shrinkDays: number;
  codingSeconds: number;
  shrinkSeconds: number;
  projects: ProjectVerdict[];
};

export async function perPersonActivity(days: string[]): Promise<PersonActivity[]> {
  if (days.length === 0) return [];
  const [rows, projects] = await Promise.all([
    db
      .select({
        userId: hackatimeDays.userId,
        displayName: users.displayName,
        slackId: users.slackId,
        activeDays: sql<number>`(count(*) filter (where ${hackatimeDays.totalSeconds} > 0))::int`,
        shrinkDays: sql<number>`(count(*) filter (where ${hackatimeDays.shrinkSeconds} > 0))::int`,
        codingSeconds: sql<number>`coalesce(sum(${hackatimeDays.totalSeconds}), 0)::bigint`,
        shrinkSeconds: sql<number>`coalesce(sum(${hackatimeDays.shrinkSeconds}), 0)::bigint`,
      })
      .from(hackatimeDays)
      .innerJoin(users, sql`${users.id} = ${hackatimeDays.userId}`)
      .where(and(gte(hackatimeDays.day, days[0]), lte(hackatimeDays.day, days[days.length - 1])))
      .groupBy(hackatimeDays.userId, users.displayName, users.slackId)
      .orderBy(sql`sum(${hackatimeDays.shrinkSeconds}) desc`, sql`sum(${hackatimeDays.totalSeconds}) desc`),
    // The verdict looks at every day we have, not just the window: an offender
    // outside it still poisons the project.
    db.execute(sql`
      select p.user_id as "userId", p.project,
             sum(p.seconds) filter (where p.day between ${days[0]} and ${days[days.length - 1]})::int as seconds,
             bool_or(p.has_html) as "hasHtml",
             (select array(select distinct o from ${hackatimeProjects} x, unnest(x.offenders) o
                           where x.user_id = p.user_id and x.project = p.project order by o limit 8)) as offenders
      from ${hackatimeProjects} p
      group by p.user_id, p.project
      order by 3 desc nulls last
    `) as Promise<{ userId: string; project: string; seconds: number | null; hasHtml: boolean; offenders: string[] }[]>,
  ]);
  const byUser = new Map<string, ProjectVerdict[]>();
  for (const p of projects) {
    if (!p.seconds) continue;
    const list = byUser.get(p.userId) ?? [];
    list.push({
      project: p.project,
      seconds: Number(p.seconds),
      shrink: p.hasHtml && p.offenders.length === 0,
      offenders: p.hasHtml ? p.offenders : ["no HTML", ...p.offenders],
    });
    byUser.set(p.userId, list);
  }
  return rows.map((r) => ({
    ...r,
    codingSeconds: Number(r.codingSeconds),
    shrinkSeconds: Number(r.shrinkSeconds),
    projects: byUser.get(r.userId) ?? [],
  }));
}
