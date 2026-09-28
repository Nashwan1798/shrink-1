import type { NextRequest } from "next/server";

import { safeEqual } from "@/lib/server/crypto";
import { env } from "@/lib/server/env";
import { SLACK_ID, joinFromSlack } from "@/lib/server/users";

// Webhook from the Slack "join" button. Authenticated with SLACK_JOIN_SECRET as
// `Authorization: Bearer <secret>`, an `x-shrink-secret` header, or `?secret=`
// for senders that can't set headers. Takes the Slack ID as `slack_id` (or
// `slackId` / `user_id`) in a JSON or form body, or in the query string.
export async function POST(req: NextRequest) {
  const q = req.nextUrl.searchParams;
  const given =
    req.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ?? req.headers.get("x-shrink-secret") ?? q.get("secret") ?? "";
  if (!env.SLACK_JOIN_SECRET || !safeEqual(given, env.SLACK_JOIN_SECRET)) {
    return Response.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  const body = await readBody(req);
  const pick = (o: Record<string, unknown>) => [o.slack_id, o.slackId, o.user_id, (o.user as { id?: unknown } | undefined)?.id].find((v) => typeof v === "string");
  const slackId = String(pick(body) ?? q.get("slack_id") ?? q.get("slackId") ?? q.get("user_id") ?? "").trim().toUpperCase();
  if (!SLACK_ID.test(slackId)) return Response.json({ ok: false, error: "missing or malformed slack_id" }, { status: 400 });

  try {
    const { user, created } = await joinFromSlack(slackId);
    return Response.json({ ok: true, created, user_id: user.id, signed_in: user.hcaSubject !== null });
  } catch (e) {
    console.error("[slack] join failed", slackId, e);
    return Response.json({ ok: false, error: "server_error" }, { status: 500 });
  }
}

// Webhook senders are sloppy about content-type, so go by what the body looks like.
async function readBody(req: NextRequest): Promise<Record<string, unknown>> {
  const text = await req.text().catch(() => "");
  if (/^\s*\{/.test(text)) {
    try {
      return JSON.parse(text) as Record<string, unknown>;
    } catch {
      return {};
    }
  }
  return Object.fromEntries(new URLSearchParams(text));
}
