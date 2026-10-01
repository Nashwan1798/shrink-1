import "server-only";

import { sql } from "drizzle-orm";

import { TZ, dayEnd, dayStart } from "@/lib/tz";

import { db } from "./db/client";
import { hackatimeDays, ledgerEntries, orders, ships, users } from "./db/schema";

// Everything here is aggregate: the stats page is public, so nothing in this
// module may return a name, email, Slack ID or anything else about one person.

// Top of the funnel lives outside this database: the YSWS post and site
// analytics. Override with STATS_POST_VIEWS / STATS_VISITORS when they move.
export const FUNNEL_TOP = {
  postViews: Number(process.env.STATS_POST_VIEWS) || 310,
  visitors: Number(process.env.STATS_VISITORS) || 540,
};

export type Funnel = {
  postViews: number;
  visitors: number;
  signedUp: number; // every user row, including Slack "join" placeholders
  linked: number; // linked a Hackatime account
  onboarded: number; // finished /welcome
  active: number; // logged HTML time on Hackatime during the program
  shipped: number; // at least one ship
  approved: number; // at least one approved ship
};

export type Overview = {
  people: number; // every row, including Slack "join" placeholders
  signedUp: number;
  onboarded: number;
  hackatimeLinked: number;
  eligible: number;
  ships: { total: number; pending: number; approved: number; rejected: number; reships: number };
  seconds: { claimed: number; awarded: number };
  bytes: { median: number; min: number; max: number; mean: number };
  bites: { minted: number; spent: number; refunded: number; adjusted: number };
  orders: { placed: number; fulfilled: number; rejected: number };
  badges: { slug: string; claimed: number; awarded: number }[];
  rewards: { name: string; count: number }[];
  reviewMedianMinutes: number | null;
};

export async function funnel(): Promise<Funnel> {
  const [[u], [a], [s]] = await Promise.all([
    db
      .select({
        signedUp: sql<number>`count(*)::int`,
        linked: sql<number>`(count(*) filter (where ${users.hackatimeAccountId} is not null))::int`,
        onboarded: sql<number>`(count(*) filter (where ${users.onboardedAt} is not null))::int`,
      })
      .from(users),
    db
      .select({ active: sql<number>`(count(distinct ${hackatimeDays.userId}) filter (where ${hackatimeDays.shrinkSeconds} > 0))::int` })
      .from(hackatimeDays),
    db
      .select({
        shipped: sql<number>`count(distinct ${ships.userId})::int`,
        approved: sql<number>`(count(distinct ${ships.userId}) filter (where ${ships.state} = 'approved'))::int`,
      })
      .from(ships),
  ]);
  return {
    ...FUNNEL_TOP,
    signedUp: u?.signedUp ?? 0,
    linked: u?.linked ?? 0,
    onboarded: u?.onboarded ?? 0,
    active: a?.active ?? 0,
    shipped: s?.shipped ?? 0,
    approved: s?.approved ?? 0,
  };
}

export async function overview(): Promise<Overview> {
  const [[u], [s], [l], [o], badges, rewards] = await Promise.all([
    db
      .select({
        people: sql<number>`count(*)::int`,
        signedUp: sql<number>`(count(*) filter (where ${users.hcaSubject} is not null))::int`,
        onboarded: sql<number>`(count(*) filter (where ${users.onboardedAt} is not null))::int`,
        hackatimeLinked: sql<number>`(count(*) filter (where ${users.hackatimeAccountId} is not null))::int`,
        eligible: sql<number>`(count(*) filter (where ${users.eligibility} = 'eligible'))::int`,
      })
      .from(users),
    db
      .select({
        total: sql<number>`count(*)::int`,
        pending: sql<number>`(count(*) filter (where ${ships.state} = 'pending'))::int`,
        approved: sql<number>`(count(*) filter (where ${ships.state} = 'approved'))::int`,
        rejected: sql<number>`(count(*) filter (where ${ships.state} = 'rejected'))::int`,
        reships: sql<number>`(count(*) filter (where ${ships.reshipOf} is not null))::int`,
        claimed: sql<number>`coalesce(sum(${ships.claimedSeconds}) filter (where ${ships.state} <> 'rejected'), 0)::bigint`,
        awarded: sql<number>`coalesce(sum(${ships.awardedSeconds}) filter (where ${ships.state} = 'approved'), 0)::bigint`,
        medianBytes: sql<number | null>`percentile_cont(0.5) within group (order by ${ships.bytes})`,
        minBytes: sql<number | null>`min(${ships.bytes})`,
        maxBytes: sql<number | null>`max(${ships.bytes})`,
        meanBytes: sql<number | null>`avg(${ships.bytes})`,
        reviewMedian: sql<number | null>`percentile_cont(0.5) within group (order by extract(epoch from (${ships.reviewedAt} - ${ships.createdAt})) / 60) filter (where ${ships.reviewedAt} is not null)`,
      })
      .from(ships),
    db
      .select({
        minted: sql<number>`coalesce(sum(${ledgerEntries.amount}) filter (where ${ledgerEntries.type} = 'award'), 0)::int`,
        spent: sql<number>`coalesce(-sum(${ledgerEntries.amount}) filter (where ${ledgerEntries.type} = 'order'), 0)::int`,
        refunded: sql<number>`coalesce(sum(${ledgerEntries.amount}) filter (where ${ledgerEntries.type} = 'refund'), 0)::int`,
        adjusted: sql<number>`coalesce(sum(${ledgerEntries.amount}) filter (where ${ledgerEntries.type} = 'adjustment'), 0)::int`,
      })
      .from(ledgerEntries),
    db
      .select({
        placed: sql<number>`(count(*) filter (where ${orders.state} = 'placed'))::int`,
        fulfilled: sql<number>`(count(*) filter (where ${orders.state} = 'fulfilled'))::int`,
        rejected: sql<number>`(count(*) filter (where ${orders.state} = 'rejected'))::int`,
      })
      .from(orders),
    db.execute(sql`
      select slug,
             count(*) filter (where kind = 'claimed')::int as claimed,
             count(*) filter (where kind = 'awarded')::int as awarded
      from (
        select unnest(${ships.claimedBadges}) as slug, 'claimed' as kind from ${ships} where ${ships.state} <> 'rejected'
        union all
        select unnest(${ships.awardedBadges}) as slug, 'awarded' as kind from ${ships} where ${ships.state} = 'approved'
      ) b
      group by slug
      order by awarded desc, claimed desc
    `) as Promise<{ slug: string; claimed: number; awarded: number }[]>,
    db
      .select({ name: orders.rewardName, count: sql<number>`count(*)::int` })
      .from(orders)
      .where(sql`${orders.state} <> 'rejected'`)
      .groupBy(orders.rewardName)
      .orderBy(sql`count(*) desc`)
      .limit(8),
  ]);
  return {
    people: u?.people ?? 0,
    signedUp: u?.signedUp ?? 0,
    onboarded: u?.onboarded ?? 0,
    hackatimeLinked: u?.hackatimeLinked ?? 0,
    eligible: u?.eligible ?? 0,
    ships: {
      total: s?.total ?? 0,
      pending: s?.pending ?? 0,
      approved: s?.approved ?? 0,
      rejected: s?.rejected ?? 0,
      reships: s?.reships ?? 0,
    },
    seconds: { claimed: Number(s?.claimed ?? 0), awarded: Number(s?.awarded ?? 0) },
    bytes: {
      median: Math.round(Number(s?.medianBytes ?? 0)),
      min: Number(s?.minBytes ?? 0),
      max: Number(s?.maxBytes ?? 0),
      mean: Math.round(Number(s?.meanBytes ?? 0)),
    },
    bites: { minted: l?.minted ?? 0, spent: l?.spent ?? 0, refunded: l?.refunded ?? 0, adjusted: l?.adjusted ?? 0 },
    orders: { placed: o?.placed ?? 0, fulfilled: o?.fulfilled ?? 0, rejected: o?.rejected ?? 0 },
    badges: badges.map((b) => ({ slug: b.slug, claimed: Number(b.claimed), awarded: Number(b.awarded) })),
    rewards: rewards.map((r) => ({ name: r.name, count: r.count })),
    reviewMedianMinutes: s?.reviewMedian == null ? null : Math.round(Number(s.reviewMedian)),
  };
}

export type DayCounts = { day: string; signups: number; onboarded: number; ships: number; approved: number };

// Per Vermont day over `days`: new sign-ins, finished onboardings, ships, approvals.
export async function dailyCounts(days: string[]): Promise<DayCounts[]> {
  if (days.length === 0) return [];
  const from = dayStart(days[0]).toISOString();
  const to = dayEnd(days[days.length - 1]).toISOString();
  const dayOf = (col: unknown) => sql<string>`to_char(${col} at time zone ${sql.raw(`'${TZ}'`)}, 'YYYY-MM-DD')`;
  const [signups, onboarded, shipped, approved] = await Promise.all([
    db
      .select({ day: dayOf(users.createdAt), n: sql<number>`count(*)::int` })
      .from(users)
      .where(sql`${users.hcaSubject} is not null and ${users.createdAt} between ${from}::timestamptz and ${to}::timestamptz`)
      .groupBy(dayOf(users.createdAt)),
    db
      .select({ day: dayOf(users.onboardedAt), n: sql<number>`count(*)::int` })
      .from(users)
      .where(sql`${users.onboardedAt} between ${from}::timestamptz and ${to}::timestamptz`)
      .groupBy(dayOf(users.onboardedAt)),
    db
      .select({ day: dayOf(ships.createdAt), n: sql<number>`count(*)::int` })
      .from(ships)
      .where(sql`${ships.createdAt} between ${from}::timestamptz and ${to}::timestamptz`)
      .groupBy(dayOf(ships.createdAt)),
    db
      .select({ day: dayOf(ships.reviewedAt), n: sql<number>`count(*)::int` })
      .from(ships)
      .where(sql`${ships.state} = 'approved' and ${ships.reviewedAt} between ${from}::timestamptz and ${to}::timestamptz`)
      .groupBy(dayOf(ships.reviewedAt)),
  ]);
  const pick = (rows: { day: string; n: number }[]) => new Map(rows.map((r) => [r.day, r.n]));
  const [S, O, H, A] = [pick(signups), pick(onboarded), pick(shipped), pick(approved)];
  return days.map((day) => ({
    day,
    signups: S.get(day) ?? 0,
    onboarded: O.get(day) ?? 0,
    ships: H.get(day) ?? 0,
    approved: A.get(day) ?? 0,
  }));
}

// Ship sizes in 256-byte buckets up to the 3 KB cap.
export async function byteHistogram(): Promise<{ label: string; count: number }[]> {
  const rows = (await db.execute(sql`
    select least(floor(${ships.bytes} / 256), 11)::int as bucket, count(*)::int as n
    from ${ships} where ${ships.state} <> 'rejected'
    group by 1 order by 1
  `)) as { bucket: number; n: number }[];
  const by = new Map(rows.map((r) => [Number(r.bucket), Number(r.n)]));
  return Array.from({ length: 12 }, (_, i) => ({
    label: i === 11 ? "2.75k+" : `${((i * 256) / 1024).toFixed(2).replace(/\.?0+$/, "")}k`,
    count: by.get(i) ?? 0,
  }));
}
