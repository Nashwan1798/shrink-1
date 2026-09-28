import { and, eq, gt, isNull } from "drizzle-orm";
import { cookies } from "next/headers";
import { NextResponse, type NextRequest } from "next/server";

import { finishAuth } from "@/lib/server/auth/popup";
import { currentUser } from "@/lib/server/auth/session";
import { safeEqual } from "@/lib/server/crypto";
import { db } from "@/lib/server/db/client";
import { oauthStates } from "@/lib/server/db/schema";
import { HACKATIME_STATE_COOKIE, exchangeHackatimeCode, fetchHackatimeAccountId, linkHackatime } from "@/lib/server/hackatime";

// State must match the cookie, an unconsumed row, and the signed-in user; consumed atomically so a replay does nothing.
export async function GET(req: NextRequest) {
  const origin = req.nextUrl.origin;
  const back = (to: string, error?: string) =>
    finishAuth(req, error ? `${to}${to.includes("?") ? "&" : "?"}hackatime_error=${error}` : to);

  const params = req.nextUrl.searchParams;
  const code = params.get("code");
  const state = params.get("state");

  const jar = await cookies();
  const cookieState = jar.get(HACKATIME_STATE_COOKIE)?.value ?? "";
  jar.delete(HACKATIME_STATE_COOKIE);

  const user = await currentUser();
  if (!user) return NextResponse.redirect(new URL("/login", origin));
  if (!state || !cookieState || !safeEqual(cookieState, state)) return back("/welcome/setup", "bad_state");

  const [row] = await db
    .update(oauthStates)
    .set({ consumedAt: new Date() })
    .where(
      and(
        eq(oauthStates.state, state),
        eq(oauthStates.purpose, "hackatime"),
        eq(oauthStates.userId, user.id),
        isNull(oauthStates.consumedAt),
        gt(oauthStates.expiresAt, new Date()),
      ),
    )
    .returning();
  if (!row) return back("/welcome/setup", "expired");
  const to = row.redirectTo ?? "/welcome/setup";

  if (params.get("error") || !code) return back(to, "denied");

  try {
    const token = await exchangeHackatimeCode({ origin, code, codeVerifier: row.codeVerifier });
    const accountId = await fetchHackatimeAccountId(token);
    const outcome = await linkHackatime(user.id, accountId, token);
    return outcome.ok ? back(to) : back(to, outcome.reason);
  } catch (e) {
    console.error("[hackatime] link failed", e);
    return back(to, "provider_error");
  }
}
