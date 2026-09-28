import { lt } from "drizzle-orm";
import { cookies } from "next/headers";
import { NextResponse, type NextRequest } from "next/server";

import { pkceChallenge } from "@/lib/server/auth/hca";
import { currentUser } from "@/lib/server/auth/session";
import { randomToken } from "@/lib/server/crypto";
import { db } from "@/lib/server/db/client";
import { oauthStates } from "@/lib/server/db/schema";
import { staging } from "@/lib/server/env";
import { safePath } from "@/lib/server/origin";
import { HACKATIME_STATE_COOKIE, hackatimeAuthorizeUrl, hackatimeConfigured, linkStagingHackatime } from "@/lib/server/hackatime";

// The user's id goes on the state row so the callback can refuse a link finished in another user's browser.
export async function GET(req: NextRequest) {
  const origin = req.nextUrl.origin;
  const next = safePath(req.nextUrl.searchParams.get("next"), "/welcome/setup");

  const user = await currentUser();
  if (!user) return NextResponse.redirect(new URL(`/login?next=${encodeURIComponent(next)}`, origin));

  if (staging()) {
    await linkStagingHackatime(user.id);
    return NextResponse.redirect(new URL(next, origin));
  }
  if (!hackatimeConfigured()) {
    console.error("[hackatime] HACKATIME_CLIENT_ID / HACKATIME_CLIENT_SECRET are not set");
    return NextResponse.redirect(new URL(`${next}${next.includes("?") ? "&" : "?"}hackatime_error=unconfigured`, origin));
  }

  const state = randomToken(32);
  const codeVerifier = randomToken(32);
  await db.delete(oauthStates).where(lt(oauthStates.expiresAt, new Date()));
  await db.insert(oauthStates).values({
    state,
    purpose: "hackatime",
    userId: user.id,
    codeVerifier,
    redirectTo: next,
    expiresAt: new Date(Date.now() + 10 * 60_000),
  });

  (await cookies()).set(HACKATIME_STATE_COOKIE, state, {
    httpOnly: true,
    sameSite: "lax",
    secure: req.nextUrl.protocol === "https:",
    path: "/",
    maxAge: 600,
  });

  return NextResponse.redirect(hackatimeAuthorizeUrl({ origin, state, codeChallenge: pkceChallenge(codeVerifier) }));
}
