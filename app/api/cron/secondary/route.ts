import { queueSync } from "@/lib/server/airtable";
import { safeEqual } from "@/lib/server/crypto";
import { env } from "@/lib/server/env";
import { requestOrigin } from "@/lib/server/origin";
import { sync } from "@/lib/server/secondary";

export const maxDuration = 300;

// Sends unsent ships to the secondary check and pulls back its results.
export async function GET(request: Request) {
  const auth = request.headers.get("authorization") ?? "";
  if (!env.CRON_SECRET || !safeEqual(auth, `Bearer ${env.CRON_SECRET}`)) {
    return Response.json({ error: "unauthorized" }, { status: 401 });
  }
  try {
    const result = await sync(env.APP_URL || (await requestOrigin()));
    if ("decided" in result && result.decided?.length) queueSync({ ships: result.decided });
    return Response.json(result);
  } catch (e) {
    console.error("[secondary] cron sync failed", e);
    return Response.json({ error: String(e) }, { status: 500 });
  }
}
