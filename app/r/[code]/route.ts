import { cookies } from "next/headers";
import { NextResponse, type NextRequest } from "next/server";

import { currentUser } from "@/lib/server/auth/session";
import { REF_COOKIE, REF_COOKIE_DAYS, referrerFor } from "@/lib/server/referrals";

// Remembers the link on this browser until they sign in for the first time;
// the auth callback decides whether it counts.
export async function GET(req: NextRequest, { params }: { params: Promise<{ code: string }> }) {
  const code = (await params).code.toLowerCase();
  const home = NextResponse.redirect(new URL("/", req.nextUrl.origin));
  if ((await currentUser()) || !(await referrerFor(code))) return home;

  const jar = await cookies();
  // First link wins, so a second friend's link can't swap itself in.
  if (!jar.get(REF_COOKIE)) {
    jar.set(REF_COOKIE, code, {
      httpOnly: true,
      sameSite: "lax",
      secure: req.nextUrl.protocol === "https:",
      path: "/",
      maxAge: REF_COOKIE_DAYS * 86_400,
    });
  }
  return home;
}
