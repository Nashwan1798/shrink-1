import "server-only";

import { sql } from "drizzle-orm";

import { TZ, dayEnd, dayStart } from "@/lib/tz";

import { db } from "./db/client";
import { hackatimeDays, ships, users } from "./db/schema";
import { siteVisitors } from "./vercel-analytics";

// Everything here is aggregate: the stats page is public, so nothing in this
// module may return a name, email, Slack ID or anything else about one person.

// Top of the funnel comes from Vercel Web Analytics; STATS_VISITORS is the
// number shown until that's configured (or when Vercel can't be reached).
const VISITORS_FALLBACK = Number(process.env.STATS_VISITORS) || 540;

export type Funnel = {
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
  seconds: { claimed: number; awarded: number; avgApproved: number | null };
  badges: { slug: string; claimed: number; awarded: number }[];
  reviewMedianMinutes: number | null;
};

export type Referrals = {
  links: number; // people who took the pledge and got a link
  signedUp: number; // signed in through someone's link
  shipped: number;
  approved: number;
};

export async function funnel(): Promise<Funnel> {
  const [visitors, [u], [a], [s]] = await Promise.all([
    siteVisitors(),
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
    visitors: visitors ?? VISITORS_FALLBACK,
    signedUp: u?.signedUp ?? 0,
    linked: u?.linked ?? 0,
    onboarded: u?.onboarded ?? 0,
    active: a?.active ?? 0,
    shipped: s?.shipped ?? 0,
    approved: s?.approved ?? 0,
  };
}

export async function overview(): Promise<Overview> {
  const [[u], [s], badges] = await Promise.all([
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
        avgApproved: sql<number | null>`avg(${ships.awardedSeconds}) filter (where ${ships.state} = 'approved')`,
        reviewMedian: sql<number | null>`percentile_cont(0.5) within group (order by extract(epoch from (${ships.reviewedAt} - ${ships.createdAt})) / 60) filter (where ${ships.reviewedAt} is not null)`,
      })
      .from(ships),
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
    seconds: {
      claimed: Number(s?.claimed ?? 0),
      awarded: Number(s?.awarded ?? 0),
      avgApproved: s?.avgApproved == null ? null : Number(s.avgApproved),
    },
    badges: badges.map((b) => ({ slug: b.slug, claimed: Number(b.claimed), awarded: Number(b.awarded) })),
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

export async function referrals(): Promise<Referrals> {
  const [row] = (await db.execute(sql`
    select
      (select count(*) from ${users} where ${users.referralCode} is not null)::int as links,
      (select count(*) from ${users} where ${users.referredById} is not null and ${users.hcaSubject} is not null)::int as signed_up,
      (select count(distinct s.user_id) from ${ships} s join ${users} r on r.id = s.user_id where r.referred_by_id is not null)::int as shipped,
      (select count(distinct s.user_id) from ${ships} s join ${users} r on r.id = s.user_id where r.referred_by_id is not null and s.state = 'approved')::int as approved
  `)) as { links: number; signed_up: number; shipped: number; approved: number }[];
  return {
    links: Number(row?.links ?? 0),
    signedUp: Number(row?.signed_up ?? 0),
    shipped: Number(row?.shipped ?? 0),
    approved: Number(row?.approved ?? 0),
  };
}
