import "server-only";

import { and, eq, ne } from "drizzle-orm";

import { queueSync } from "./airtable";
import { decrypt, encrypt } from "./crypto";
import { db } from "./db/client";
import { ships, users } from "./db/schema";
import { env, staging } from "./env";

export type HackatimeProject = { name: string; seconds: number };

const AUTHORIZE_PATH = "/oauth/authorize";
const TOKEN_PATH = "/oauth/token";
const ME_PATH = "/api/v1/authenticated/me";
const PROJECTS_PATH = "/api/v1/authenticated/projects";

export const HACKATIME_SCOPES = "profile read";

export const HACKATIME_STATE_COOKIE = "shrink_hackatime_oauth";

export const hackatimeTokenBinding = (userId: string) => `users/${userId}/hackatime_token`;

export function hackatimeConfigured(): boolean {
  return Boolean(env.HACKATIME_CLIENT_ID && env.HACKATIME_CLIENT_SECRET);
}

export function hackatimeRedirectUri(origin: string): string {
  return `${origin}/api/auth/hackatime/callback`;
}

export function hackatimeAuthorizeUrl(opts: { origin: string; state: string; codeChallenge: string }): string {
  const url = new URL(`${env.HACKATIME_HOST}${AUTHORIZE_PATH}`);
  url.searchParams.set("client_id", env.HACKATIME_CLIENT_ID);
  url.searchParams.set("redirect_uri", hackatimeRedirectUri(opts.origin));
  url.searchParams.set("response_type", "code");
  url.searchParams.set("scope", HACKATIME_SCOPES);
  url.searchParams.set("state", opts.state);
  url.searchParams.set("code_challenge", opts.codeChallenge);
  url.searchParams.set("code_challenge_method", "S256");
  return url.toString();
}

export async function exchangeHackatimeCode(opts: { origin: string; code: string; codeVerifier: string }): Promise<string> {
  const res = await fetch(`${env.HACKATIME_HOST}${TOKEN_PATH}`, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded", accept: "application/json" },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      code: opts.code,
      redirect_uri: hackatimeRedirectUri(opts.origin),
      client_id: env.HACKATIME_CLIENT_ID,
      client_secret: env.HACKATIME_CLIENT_SECRET,
      code_verifier: opts.codeVerifier,
    }),
    cache: "no-store",
    signal: AbortSignal.timeout(10_000),
  });
  if (!res.ok) throw new Error(`Hackatime token exchange failed: ${res.status}`);
  const json = (await res.json()) as { access_token?: string };
  if (!json.access_token) throw new Error("Hackatime token response had no access_token");
  return json.access_token;
}

export async function fetchHackatimeAccountId(token: string): Promise<string> {
  const res = await fetch(`${env.HACKATIME_HOST}${ME_PATH}`, {
    headers: { authorization: `Bearer ${token}`, accept: "application/json" },
    cache: "no-store",
    signal: AbortSignal.timeout(10_000),
  });
  if (!res.ok) throw new Error(`Hackatime /me failed: ${res.status}`);
  const body = (await res.json()) as Record<string, unknown>;
  const pick = (o: unknown) => {
    const v = (o as Record<string, unknown> | null)?.id ?? (o as Record<string, unknown> | null)?.user_id;
    return typeof v === "string" || typeof v === "number" ? String(v) : null;
  };
  const id = pick(body) ?? pick(body.user) ?? pick(body.data);
  if (!id) throw new Error("Hackatime /me had no account id");
  return id;
}

export type LinkOutcome = { ok: true } | { ok: false; reason: "already_linked" | "locked" };

// Refuse swapping away from an account with hours on a live ship, or whoever links it next could ship those hours again.
export async function linkHackatime(userId: string, accountId: string, token: string): Promise<LinkOutcome> {
  const [taken] = await db
    .select({ id: users.id })
    .from(users)
    .where(and(eq(users.hackatimeAccountId, accountId), ne(users.id, userId)))
    .limit(1);
  if (taken) return { ok: false, reason: "already_linked" };

  const [me] = await db.select({ current: users.hackatimeAccountId }).from(users).where(eq(users.id, userId)).limit(1);
  if (me?.current && me.current !== accountId) {
    const [live] = await db
      .select({ id: ships.id })
      .from(ships)
      .where(and(eq(ships.userId, userId), ne(ships.state, "rejected")))
      .limit(1);
    if (live) return { ok: false, reason: "locked" };
  }

  try {
    await db
      .update(users)
      .set({
        hackatimeAccountId: accountId,
        hackatimeTokenEncrypted: encrypt(token, hackatimeTokenBinding(userId)),
        hackatimeLinkedAt: new Date(),
      })
      .where(eq(users.id, userId));
  } catch (e) {
    // Unique violation: someone linked the same account concurrently.
    if ((e as { code?: string }).code === "23505") return { ok: false, reason: "already_linked" };
    throw e;
  }
  queueSync({ users: [userId] });
  return { ok: true };
}

export async function linkStagingHackatime(userId: string): Promise<void> {
  await db
    .update(users)
    .set({ hackatimeAccountId: `staging:${userId}`, hackatimeLinkedAt: new Date() })
    .where(eq(users.id, userId));
}

export async function fetchProjects(userId: string): Promise<HackatimeProject[] | null> {
  if (staging()) return STAGING_PROJECTS;

  const [row] = await db
    .select({ token: users.hackatimeTokenEncrypted })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);
  if (!row?.token) return null;
  let token: string;
  try {
    token = decrypt(row.token, hackatimeTokenBinding(userId));
  } catch {
    return null;
  }

  const res = await fetch(`${env.HACKATIME_HOST}${PROJECTS_PATH}`, {
    headers: { authorization: `Bearer ${token}`, accept: "application/json" },
    cache: "no-store",
    signal: AbortSignal.timeout(10_000),
  });
  if (res.status === 401) return null;
  if (!res.ok) throw new Error(`Hackatime ${res.status}`);
  const body = (await res.json()) as unknown;
  const list = (Array.isArray(body)
    ? body
    : ((body as { data?: unknown[]; projects?: unknown[] }).data ?? (body as { projects?: unknown[] }).projects ?? [])) as {
    name?: unknown;
    total_seconds?: unknown;
  }[];
  return list
    .filter((p) => typeof p.name === "string" && p.name.length > 0)
    .map((p) => ({ name: p.name as string, seconds: Math.max(0, Math.round(Number(p.total_seconds) || 0)) }))
    .sort((a, b) => b.seconds - a.seconds);
}

export async function fetchSeconds(userId: string, names: string[]): Promise<number | null> {
  const projects = await fetchProjects(userId);
  if (projects === null) return null;
  const wanted = new Set(names);
  return projects.filter((p) => wanted.has(p.name)).reduce((s, p) => s + p.seconds, 0);
}

const STAGING_PROJECTS: HackatimeProject[] = [
  { name: "shrink-synth", seconds: 5 * 3600 + 12 * 60 },
  { name: "tiny-snake", seconds: 2 * 3600 + 40 * 60 },
  { name: "plasma", seconds: 55 * 60 },
  { name: "something-else", seconds: 9 * 3600 },
];
