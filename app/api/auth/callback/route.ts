import { and, eq, gt, isNull } from "drizzle-orm";
import { cookies } from "next/headers";
import type { NextRequest } from "next/server";

import { STATE_COOKIE, exchangeCode, fetchIdentity } from "@/lib/server/auth/hca";
import { finishAuth } from "@/lib/server/auth/popup";
import { createSession } from "@/lib/server/auth/session";
import { safeEqual } from "@/lib/server/crypto";
import { db } from "@/lib/server/db/client";
import { oauthStates } from "@/lib/server/db/schema";
import { upsertFromSignIn } from "@/lib/server/users";

// The state row is consumed atomically so a replayed callback does nothing.
export async function GET(req: NextRequest) {
  const origin = req.nextUrl.origin;
  const fail = (code: string) => finishAuth(req, `/?auth_error=${code}`);

  const params = req.nextUrl.searchParams;
  if (params.get("error")) return fail("denied");
  const code = params.get("code");
  const state = params.get("state");
  if (!code || !state) return fail("bad_state");

  const jar = await cookies();
  const cookieState = jar.get(STATE_COOKIE)?.value ?? "";
  jar.delete(STATE_COOKIE);
  if (!cookieState || !safeEqual(cookieState, state)) return fail("bad_state");

  const [row] = await db
    .update(oauthStates)
    .set({ consumedAt: new Date() })
    .where(and(eq(oauthStates.state, state), eq(oauthStates.purpose, "hca"), isNull(oauthStates.consumedAt), gt(oauthStates.expiresAt, new Date())))
    .returning();
  if (!row) return fail("expired");

  try {
    const tokens = await exchangeCode({ origin, code, codeVerifier: row.codeVerifier });
    const identity = await fetchIdentity(tokens.access_token);
    const user = await upsertFromSignIn(identity, tokens);
    await createSession(user.id);
    return finishAuth(req, row.redirectTo ?? "/app");
  } catch (e) {
    console.error("[auth] callback failed", e);
    return fail(e instanceof Error && e.message === "no_email" ? "no_email" : "provider_error");
  }
}
