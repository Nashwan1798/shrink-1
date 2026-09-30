import { recentDays, refreshActivity } from "@/lib/server/activity";
import { safeEqual } from "@/lib/server/crypto";
import { env } from "@/lib/server/env";

export const maxDuration = 300;

// Re-reads today and yesterday (UTC) from Hackatime for everyone. Pass
// ?days=N to backfill further, e.g. once after deploying.
export async function GET(request: Request) {
  const auth = request.headers.get("authorization") ?? "";
  if (!env.CRON_SECRET || !safeEqual(auth, `Bearer ${env.CRON_SECRET}`)) {
    return Response.json({ error: "unauthorized" }, { status: 401 });
  }
  const n = Math.min(60, Math.max(1, Number(new URL(request.url).searchParams.get("days")) || 2));
  try {
    const result = await refreshActivity(recentDays(n));
    if (!result) return Response.json({ skipped: "a refresh is already running" }, { status: 202 });
    return Response.json(result);
  } catch (e) {
    console.error("[activity] cron refresh failed", e);
    return Response.json({ error: String(e) }, { status: 500 });
  }
}
