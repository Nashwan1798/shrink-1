import { lt } from "drizzle-orm";
import { cookies } from "next/headers";
import { NextResponse, type NextRequest } from "next/server";

import { STATE_COOKIE, authorizeUrl, hcaConfigured } from "@/lib/server/auth/hca";
import { finishAuth, rememberPopup } from "@/lib/server/auth/popup";
import { createSession, currentUser } from "@/lib/server/auth/session";
import { randomToken } from "@/lib/server/crypto";
import { db } from "@/lib/server/db/client";
import { oauthStates } from "@/lib/server/db/schema";
import { staging } from "@/lib/server/env";
import { safePath } from "@/lib/server/origin";
import { stagingUser } from "@/lib/server/staging";

export async function GET(req: NextRequest) {
  const next = safePath(req.nextUrl.searchParams.get("next"), "/app");

  if (await currentUser()) return finishAuth(req, next);

  if (staging()) {
    const user = await stagingUser();
    await createSession(user.id);
    return finishAuth(req, next);
  }

  if (!hcaConfigured()) {
    return finishAuth(req, "/?auth_error=unconfigured");
  }

  const state = randomToken(32);
  const codeVerifier = randomToken(32);
  await db.delete(oauthStates).where(lt(oauthStates.expiresAt, new Date()));
  await db.insert(oauthStates).values({
    state,
    codeVerifier,
    redirectTo: next,
    expiresAt: new Date(Date.now() + 10 * 60_000),
  });

  const jar = await cookies();
  jar.set(STATE_COOKIE, state, {
    httpOnly: true,
    sameSite: "lax",
    secure: req.nextUrl.protocol === "https:",
    path: "/",
    maxAge: 600,
  });

  await rememberPopup(req);

  const url = await authorizeUrl({ origin: req.nextUrl.origin, state, codeVerifier });
  return NextResponse.redirect(url);
}
