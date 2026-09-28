import "server-only";

import { headers } from "next/headers";

export async function requestOrigin(): Promise<string> {
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000";
  const proto = h.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  return `${proto}://${host}`;
}

// URL parsing strips tabs and newlines, so "/\t/evil.com" would become "//evil.com".
export function safePath(v: string | null, fallback: string): string {
  if (!v || v.length > 512 || !v.startsWith("/") || /[\\\x00-\x1f\x7f]/.test(v)) return fallback;
  const base = "http://local.invalid";
  const u = new URL(v, base);
  if (u.origin !== base) return fallback;
  return u.pathname + u.search + u.hash;
}
