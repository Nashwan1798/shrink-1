import "server-only";

import { cookies } from "next/headers";
import { NextResponse, type NextRequest } from "next/server";

const POPUP_COOKIE = "auth_popup";

// Marks an OAuth round trip as running in a popup, so its callback hands off to the opener instead.
export async function rememberPopup(req: NextRequest) {
  if (req.nextUrl.searchParams.get("popup") !== "1") return;
  (await cookies()).set(POPUP_COOKIE, "1", {
    httpOnly: true,
    sameSite: "lax",
    secure: req.nextUrl.protocol === "https:",
    path: "/",
    maxAge: 600,
  });
}

// Redirects to `to`, or inside a popup to /auth/done, which passes `to` back to the opening tab.
export async function finishAuth(req: NextRequest, to: string) {
  const jar = await cookies();
  const popup = req.nextUrl.searchParams.get("popup") === "1" || jar.get(POPUP_COOKIE)?.value === "1";
  if (jar.has(POPUP_COOKIE)) jar.delete(POPUP_COOKIE);
  return NextResponse.redirect(new URL(popup ? `/auth/done?to=${encodeURIComponent(to)}` : to, req.nextUrl.origin));
}
