import { NextResponse, type NextRequest } from "next/server";

import { destroySession } from "@/lib/server/auth/session";

export async function POST(req: NextRequest) {
  await destroySession();
  return NextResponse.redirect(new URL("/", req.nextUrl.origin), { status: 303 });
}
