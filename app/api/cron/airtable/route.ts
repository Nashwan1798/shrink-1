import { syncAll, airtableConfigured } from "@/lib/server/airtable";
import { safeEqual } from "@/lib/server/crypto";
import { env } from "@/lib/server/env";
import { requestOrigin } from "@/lib/server/origin";

export const maxDuration = 300;

// Full resync. Schedule it (hourly is plenty) so anything a live sync dropped gets healed.
export async function GET(request: Request) {
  const auth = request.headers.get("authorization") ?? "";
  if (!env.CRON_SECRET || !safeEqual(auth, `Bearer ${env.CRON_SECRET}`)) {
    return Response.json({ error: "unauthorized" }, { status: 401 });
  }
  if (!airtableConfigured()) return Response.json({ error: "Airtable isn't configured" }, { status: 503 });
  try {
    return Response.json(await syncAll(env.APP_URL || (await requestOrigin())));
  } catch (e) {
    console.error("[airtable] full sync failed", e);
    return Response.json({ error: String(e) }, { status: 500 });
  }
}
