import "server-only";

import { createHash } from "node:crypto";

import { env } from "../env";

type Discovery = {
  issuer: string;
  authorization_endpoint: string;
  token_endpoint: string;
  userinfo_endpoint: string;
  code_challenge_methods_supported?: string[];
};

let cached: { at: number; doc: Discovery } | null = null;

export async function discovery(): Promise<Discovery> {
  if (cached && Date.now() - cached.at < 10 * 60_000) return cached.doc;
  const res = await fetch(`${env.HCA_HOST}/.well-known/openid-configuration`, {
    cache: "no-store",
    signal: AbortSignal.timeout(10_000),
  });
  if (!res.ok) throw new Error(`HCA discovery failed: ${res.status}`);
  const doc = (await res.json()) as Discovery;
  const origin = new URL(env.HCA_HOST).origin;
  for (const u of [doc.authorization_endpoint, doc.token_endpoint, doc.userinfo_endpoint]) {
    if (new URL(u).origin !== origin) throw new Error("HCA discovery points off-host");
  }
  cached = { at: Date.now(), doc };
  return doc;
}

export const STATE_COOKIE = "shrink_oauth";

export function hcaConfigured(): boolean {
  return Boolean(env.HCA_CLIENT_ID && env.HCA_CLIENT_SECRET);
}

export function redirectUri(origin: string): string {
  return `${origin}/api/auth/callback`;
}

export function pkceChallenge(verifier: string): string {
  return createHash("sha256").update(verifier).digest("base64url");
}

export async function authorizeUrl(opts: {
  origin: string;
  state: string;
  codeVerifier: string;
}): Promise<string> {
  const doc = await discovery();
  const url = new URL(doc.authorization_endpoint);
  url.searchParams.set("client_id", env.HCA_CLIENT_ID);
  url.searchParams.set("redirect_uri", redirectUri(opts.origin));
  url.searchParams.set("response_type", "code");
  url.searchParams.set("scope", env.HCA_SCOPES);
  url.searchParams.set("state", opts.state);
  if (doc.code_challenge_methods_supported?.includes("S256")) {
    url.searchParams.set("code_challenge", pkceChallenge(opts.codeVerifier));
    url.searchParams.set("code_challenge_method", "S256");
  }
  return url.toString();
}

export type Tokens = {
  access_token: string;
  refresh_token?: string;
  expires_in?: number;
  scope?: string;
};

export async function exchangeCode(opts: {
  origin: string;
  code: string;
  codeVerifier: string;
}): Promise<Tokens> {
  const doc = await discovery();
  const body = new URLSearchParams({
    grant_type: "authorization_code",
    code: opts.code,
    redirect_uri: redirectUri(opts.origin),
    client_id: env.HCA_CLIENT_ID,
    client_secret: env.HCA_CLIENT_SECRET,
  });
  if (doc.code_challenge_methods_supported?.includes("S256")) body.set("code_verifier", opts.codeVerifier);
  const res = await fetch(doc.token_endpoint, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded", accept: "application/json" },
    body,
    cache: "no-store",
    signal: AbortSignal.timeout(10_000),
  });
  if (!res.ok) throw new Error(`HCA token exchange failed: ${res.status}`);
  const json = (await res.json()) as Tokens;
  if (!json.access_token) throw new Error("HCA token response had no access_token");
  return json;
}

export type Identity = {
  sub: string;
  email: string;
  name: string;
  slackId: string | null;
  verificationStatus: string | null;
  birthdate: string | null;
};

export async function fetchIdentity(accessToken: string): Promise<Identity> {
  const doc = await discovery();
  const res = await fetch(doc.userinfo_endpoint, {
    headers: { authorization: `Bearer ${accessToken}`, accept: "application/json" },
    cache: "no-store",
    signal: AbortSignal.timeout(10_000),
  });
  if (!res.ok) throw new Error(`HCA userinfo failed: ${res.status}`);
  const c = (await res.json()) as Record<string, unknown>;
  const str = (k: string) => (typeof c[k] === "string" && (c[k] as string).length > 0 ? (c[k] as string) : null);
  const sub = str("sub");
  const email = str("email");
  if (!sub) throw new Error("HCA userinfo had no sub");
  if (!email) throw new Error("no_email");
  const birthdate = str("birthdate");
  return {
    sub,
    email,
    name: str("name") ?? str("preferred_username") ?? str("nickname") ?? email.split("@")[0],
    slackId: str("slack_id"),
    verificationStatus: str("verification_status"),
    birthdate: birthdate && /^\d{4}-\d{2}-\d{2}$/.test(birthdate) ? birthdate : null,
  };
}

export type CheckResult =
  | "needs_submission"
  | "pending"
  | "verified_eligible"
  | "verified_but_over_18"
  | "rejected"
  | "not_found"
  | "unavailable";

export async function checkIdentity(sub: string): Promise<CheckResult> {
  try {
    const res = await fetch(`${env.HCA_HOST}/api/external/check?idv_id=${encodeURIComponent(sub)}`, {
      headers: { accept: "application/json" },
      cache: "no-store",
      signal: AbortSignal.timeout(10_000),
    });
    if (res.status === 404) return "not_found";
    if (!res.ok) return "unavailable";
    const body = (await res.json()) as { result?: string; status?: string };
    const v = body.result ?? body.status;
    const known: CheckResult[] = [
      "needs_submission",
      "pending",
      "verified_eligible",
      "verified_but_over_18",
      "rejected",
      "not_found",
    ];
    return known.includes(v as CheckResult) ? (v as CheckResult) : "unavailable";
  } catch {
    return "unavailable";
  }
}

export type Eligibility =
  | "eligible"
  | "blocked_unverified"
  | "blocked_over_18"
  | "blocked_rejected"
  | "undetermined";

export function deriveEligibility(verificationStatus: string | null, check: CheckResult): Eligibility {
  if (verificationStatus === "ineligible") return "blocked_rejected";
  switch (check) {
    case "verified_eligible":
      return "eligible";
    case "verified_but_over_18":
      return "blocked_over_18";
    case "rejected":
      return "blocked_rejected";
    case "needs_submission":
    case "pending":
    case "not_found":
      return "blocked_unverified";
    default:
      return "undetermined";
  }
}

export type HcaAddress = {
  id: string;
  primary?: boolean;
  [k: string]: unknown;
};

export async function fetchAddresses(accessToken: string): Promise<HcaAddress[] | "reconnect"> {
  const res = await fetch(`${env.HCA_HOST}/api/v1/me`, {
    headers: { authorization: `Bearer ${accessToken}`, accept: "application/json" },
    cache: "no-store",
    signal: AbortSignal.timeout(10_000),
  });
  if (res.status === 401 || res.status === 403) return "reconnect";
  if (!res.ok) throw new Error(`HCA /api/v1/me failed: ${res.status}`);
  const body = (await res.json()) as { identity?: { addresses?: unknown }; addresses?: unknown };
  const list = (body.identity?.addresses ?? body.addresses ?? []) as unknown[];
  return list.filter((a): a is HcaAddress => typeof a === "object" && a !== null && typeof (a as HcaAddress).id === "string");
}

export type Address = {
  recipient: string;
  line1: string;
  line2: string | null;
  city: string;
  region: string | null;
  postcode: string;
  country: string;
  phone: string | null;
};

export function normalizeAddress(raw: HcaAddress, fallbackName: string): Address | null {
  const pick = (...keys: string[]) => {
    for (const k of keys) {
      const v = raw[k];
      if (typeof v === "string" && v.trim()) return v.trim();
    }
    return null;
  };
  const first = pick("first_name");
  const last = pick("last_name");
  const a: Address = {
    recipient: pick("full_name", "name", "recipient") ?? [first, last].filter(Boolean).join(" ") ?? fallbackName,
    line1: pick("line_1", "line1", "street_address", "address_line_1") ?? "",
    line2: pick("line_2", "line2", "address_line_2"),
    city: pick("city", "locality") ?? "",
    region: pick("state", "region", "province"),
    postcode: pick("postal_code", "zip", "zip_code", "postcode") ?? "",
    country: pick("country", "country_code") ?? "",
    phone: pick("phone_number", "phone"),
  };
  if (!a.recipient) a.recipient = fallbackName;
  if (!a.line1 || !a.city || !a.postcode || !a.country) return null;
  return a;
}

export const HCA_ADDRESSES_URL = `${env.HCA_HOST}/addresses`;
export const HCA_VERIFY_URL = `${env.HCA_HOST}/verifications/new`;
