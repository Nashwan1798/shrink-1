import "server-only";

import { env } from "./env";

// Unique visitors to the production site, from Vercel Web Analytics.
// https://vercel.com/docs/analytics/web-analytics-api
// Needs VERCEL_TOKEN and VERCEL_PROJECT_ID (plus VERCEL_TEAM_ID for a team
// project). Returns null when unconfigured or when Vercel is down, so the
// caller can fall back.

const TTL_MS = 10 * 60_000;
let cache: { at: number; visitors: number } | null = null;

export async function siteVisitors(): Promise<number | null> {
  if (!env.VERCEL_TOKEN || !env.VERCEL_PROJECT_ID) return null;
  if (cache && Date.now() - cache.at < TTL_MS) return cache.visitors;
  try {
    const url = new URL("https://api.vercel.com/v1/query/web-analytics/visits/count");
    url.searchParams.set("projectId", env.VERCEL_PROJECT_ID);
    if (env.VERCEL_TEAM_ID) url.searchParams.set("teamId", env.VERCEL_TEAM_ID);
    const res = await fetch(url, {
      headers: { authorization: `Bearer ${env.VERCEL_TOKEN}`, accept: "application/json" },
      cache: "no-store",
      signal: AbortSignal.timeout(8_000),
    });
    if (!res.ok) throw new Error(`Vercel ${res.status}`);
    const body = (await res.json()) as { data?: { visitors?: unknown } };
    const visitors = Number(body.data?.visitors);
    if (!Number.isFinite(visitors)) throw new Error("Vercel: no visitors in response");
    cache = { at: Date.now(), visitors };
    return visitors;
  } catch (e) {
    console.error("[stats] vercel analytics", e);
    return cache?.visitors ?? null;
  }
}
