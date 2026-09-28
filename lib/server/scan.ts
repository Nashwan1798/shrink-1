import "server-only";

import { z } from "zod";

import { MIN_SHIP_SECONDS, REPO_URL, hm } from "@/lib/program";
import { CHECK_LABELS, type Check, type CheckId, type CheckStatus } from "@/lib/scan";

import { HCA_ADDRESSES_URL, HCA_VERIFY_URL } from "./auth/hca";
import { sha256 } from "./crypto";
import type { User } from "./db/schema";
import { env } from "./env";
import { fetchSeconds } from "./hackatime";
import { addressesFor } from "./orders";

export type ScanInput = { dataUri: string; sourceUrl: string; hackatimeProjects: string[] };

const check = (id: CheckId, status: CheckStatus, detail?: string, fixUrl?: string): Check => ({
  id,
  label: CHECK_LABELS[id],
  status,
  ...(detail ? { detail } : {}),
  ...(fixUrl ? { fixUrl } : {}),
});

const TTL = 10 * 60_000;
const cache = new Map<string, { at: number; value: Promise<unknown> }>();

function remember<T>(key: string, make: () => Promise<T>): Promise<T> {
  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < TTL) return hit.value as Promise<T>;
  const value = make();
  cache.set(key, { at: Date.now(), value });
  value.catch(() => cache.delete(key));
  if (cache.size > 500) for (const [k, v] of cache) if (Date.now() - v.at >= TTL) cache.delete(k);
  return value;
}

type Source =
  | { kind: "missing"; why: string }
  | { kind: "elsewhere" }
  | { kind: "github"; url: string; readme: string | null; files: { path: string; size: number }[]; excerpts: { path: string; text: string }[] };

const CODE_EXT = /\.(html?|m?js|jsx|ts|tsx|css|svg|glsl|frag|vert|py|sh)$/i;
const SEGMENT = /^(?!\.{1,2}$)[\w.-]+$/;
const SKIP_DIR = /(^|\/)(node_modules|dist|build|\.git|vendor)\//;

async function gh(path: string, raw = false): Promise<Response> {
  const headers: Record<string, string> = {
    accept: raw ? "application/vnd.github.raw+json" : "application/vnd.github+json",
    "user-agent": "shrink-pre-ship-scan",
    "x-github-api-version": "2022-11-28",
  };
  if (env.GITHUB_TOKEN) headers.authorization = `Bearer ${env.GITHUB_TOKEN}`;
  return fetch(`https://api.github.com${path}`, { headers, cache: "no-store", signal: AbortSignal.timeout(8_000) });
}

function pickExcerpts(files: { path: string; size: number }[]): { path: string; size: number }[] {
  const score = (p: string) => (/(^|\/)(index|main|app|src)\b/i.test(p) ? 0 : 1) + (/\.html?$/i.test(p) ? 0 : 0.5);
  const out: { path: string; size: number }[] = [];
  let budget = 40_000;
  for (const f of files.filter((f) => CODE_EXT.test(f.path) && f.size <= 20_000).sort((a, b) => score(a.path) - score(b.path))) {
    if (out.length >= 4 || f.size > budget) continue;
    out.push(f);
    budget -= f.size;
  }
  return out;
}

async function readRepo(owner: string, repo: string): Promise<Source> {
  const res = await gh(`/repos/${owner}/${repo}`);
  if (res.status === 404) return { kind: "missing", why: "GitHub says that repo doesn't exist, or it's private." };
  if (!res.ok) throw new Error(`GitHub ${res.status}`);
  const meta = (await res.json()) as { html_url: string; default_branch: string; private: boolean };
  if (meta.private) return { kind: "missing", why: "The repo is private. Make it public so a reviewer can read it." };

  const [readmeRes, treeRes] = await Promise.all([
    gh(`/repos/${owner}/${repo}/readme`, true),
    gh(`/repos/${owner}/${repo}/git/trees/${encodeURIComponent(meta.default_branch)}?recursive=1`),
  ]);
  const readme = readmeRes.ok ? await readmeRes.text() : null;
  const tree = treeRes.ok ? ((await treeRes.json()) as { tree?: { path: string; type: string; size?: number }[] }).tree ?? [] : [];
  const files = tree.filter((t) => t.type === "blob" && !SKIP_DIR.test(t.path)).map((t) => ({ path: t.path, size: t.size ?? 0 }));

  const excerpts = await Promise.all(
    pickExcerpts(files).map(async (f) => {
      const r = await gh(`/repos/${owner}/${repo}/contents/${f.path.split("/").map(encodeURIComponent).join("/")}`, true);
      return { path: f.path, text: r.ok ? await r.text() : "" };
    }),
  );
  return { kind: "github", url: meta.html_url, readme, files, excerpts: excerpts.filter((e) => e.text) };
}

function readSource(url: string): Promise<Source> {
  return remember(`src:${url}`, async () => {
    if (!REPO_URL.test(url)) return { kind: "missing", why: "The source link has to be a GitHub, GitLab or Codeberg repo." };
    const u = new URL(url);
    const [owner, repo] = u.pathname.split("/").filter(Boolean);
    if (!owner || !repo || !SEGMENT.test(owner) || !SEGMENT.test(repo)) {
      return { kind: "missing", why: "Link the repo itself, like github.com/you/project." };
    }
    const host = u.hostname.toLowerCase().replace(/^www\./, "");
    if (host === "github.com") return readRepo(owner, repo.replace(/\.git$/, ""));

    const res = await fetch(`https://${host}/${owner}/${repo}`, { redirect: "follow", cache: "no-store", signal: AbortSignal.timeout(8_000) }).catch(
      () => null,
    );
    if (!res || !res.ok) return { kind: "missing", why: `That repo didn't load${res ? ` (${res.status})` : ""}. Is it public?` };
    return { kind: "elsewhere" };
  });
}

export function forgetSource(url: string): void {
  cache.delete(`src:${url.trim()}`);
}

export function decodeDataUri(uri: string): string {
  const comma = uri.indexOf(",");
  const head = uri.slice(0, comma);
  const body = uri.slice(comma + 1);
  try {
    return /;base64$/i.test(head) ? Buffer.from(body, "base64").toString("utf8") : decodeURIComponent(body);
  } catch {
    return body;
  }
}

function outsideHost(html: string): string | null {
  const patterns = [
    /\b(?:src|href|action|poster|data)\s*=\s*["']?(?:https?:|wss?:)?\/\/([^\s"'>/]+)/i,
    /\b(?:fetch|import|WebSocket|EventSource|sendBeacon)\s*\(\s*["'`](?:https?:|wss?:)?\/\/([^"'`/]+)/i,
    /url\(\s*["']?(?:https?:)?\/\/([^)"'/]+)/i,
    /@import\s+["'](?:https?:)?\/\/([^"'/]+)/i,
  ];
  for (const p of patterns) {
    const m = html.match(p);
    if (m) return m[1];
  }
  return null;
}

const Verdict = z.object({
  readme: z.object({ verdict: z.enum(["explains", "thin", "unrelated"]), reason: z.string() }),
  code: z.object({ verdict: z.enum(["matches", "partial", "missing"]), reason: z.string() }),
});
type Verdict = z.infer<typeof Verdict>;

// Must match `Verdict`.
const VERDICT_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["readme", "code"],
  properties: {
    readme: {
      type: "object",
      additionalProperties: false,
      required: ["verdict", "reason"],
      properties: { verdict: { type: "string", enum: ["explains", "thin", "unrelated"] }, reason: { type: "string" } },
    },
    code: {
      type: "object",
      additionalProperties: false,
      required: ["verdict", "reason"],
      properties: { verdict: { type: "string", enum: ["matches", "partial", "missing"] }, reason: { type: "string" } },
    },
  },
};

const SYSTEM = `You check submissions to SHRINK, a Hack Club program where teenagers build a web app that fits in a 3kb data: URI and link a source repo.

You get the app itself (the decoded data URI), the repo's README, its file list, and a few of its files. Judge two things:

readme — does the README describe what this app is? The bar is low: no setup guide or write-up needed, just a real description.
- explains: a few sentences in the author's own words saying what the app is or does.
- thin: it's about this project but too short to tell a stranger anything (a title, one line, a default template).
- unrelated: it's about something else, filler, spam, or generated boilerplate that could describe any project.

code — is the app's readable source in the repo?
- matches: the repo holds code that produces this app (unminified source, or the same HTML).
- partial: some related code, but the app clearly can't be rebuilt from it, or it's a different version.
- missing: no code for this app.

Give each a reason: one plain sentence addressed to the author, under 20 words, saying what to fix if anything. Be fair to beginners; short is fine if it's real.`;

async function judge(app: string, src: Extract<Source, { kind: "github" }>): Promise<Verdict | null> {
  if (!env.OPENROUTER_API_KEY) return null;
  const files = src.files.slice(0, 200).map((f) => `${f.path} (${f.size} B)`).join("\n") || "(no files)";
  const excerpts = src.excerpts.map((e) => `<file path="${e.path}">\n${e.text}\n</file>`).join("\n\n") || "(none)";

  const res = await fetch(`${env.OPENROUTER_BASE_URL}/chat/completions`, {
    method: "POST",
    headers: {
      authorization: `Bearer ${env.OPENROUTER_API_KEY}`,
      "content-type": "application/json",
      "x-title": "SHRINK pre-ship scan",
    },
    body: JSON.stringify({
      model: env.OPENROUTER_MODEL,
      max_tokens: 4000,
      reasoning: { effort: "low" },
      response_format: { type: "json_schema", json_schema: { name: "verdict", strict: true, schema: VERDICT_SCHEMA } },
      messages: [
        { role: "system", content: SYSTEM },
        {
          role: "user",
          content: `<app>\n${app}\n</app>\n\n<readme>\n${src.readme ?? "(none)"}\n</readme>\n\n<files>\n${files}\n</files>\n\n<excerpts>\n${excerpts}\n</excerpts>`,
        },
      ],
    }),
    cache: "no-store",
    signal: AbortSignal.timeout(60_000),
  });
  if (!res.ok) throw new Error(`OpenRouter ${res.status}: ${(await res.text()).slice(0, 300)}`);
  const body = (await res.json()) as { choices?: { message?: { content?: string | null } }[] };
  const content = body.choices?.[0]?.message?.content;
  if (!content) return null;
  const parsed = Verdict.safeParse(JSON.parse(content));
  return parsed.success ? parsed.data : null;
}

function proseWords(md: string): number {
  return md
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/!\[[^\]]*\]\([^)]*\)/g, " ")
    .replace(/\[([^\]]*)\]\([^)]*\)/g, "$1")
    .replace(/<[^>]+>/g, " ")
    .replace(/[#>*_`|-]/g, " ")
    .split(/\s+/)
    .filter((w) => /[a-z]{2,}/i.test(w)).length;
}

export async function quickScan(user: User, input: ScanInput): Promise<Check[]> {
  const out: Check[] = [];

  out.push(
    user.eligibility === "eligible"
      ? check("idv", "pass")
      : user.eligibility === "blocked_over_18"
        ? check("idv", "warn", "Hack Club has you as over 18. It still gets reviewed, but prizes can't ship to you.")
        : user.verificationStatus === "pending"
          ? check("idv", "fail", "Your verification is still being checked. You can ship once it goes through.")
          : user.eligibility === "blocked_rejected"
            ? check("idv", "fail", "Hack Club couldn't verify you. Email us if that's wrong.")
            : check("idv", "fail", "Verify your identity with Hack Club first. It takes a few minutes.", HCA_VERIFY_URL),
  );

  // Required to ship (sanctions screening), not just for prizes.
  const addresses = await addressesFor(user).catch(() => null);
  out.push(
    addresses === null
      ? check("address", "skip", "We couldn't reach Hack Club to check. A reviewer will look.")
      : addresses === "reconnect"
        ? check("address", "fail", "Sign out and back in so we can see the address on your Hack Club account.")
        : addresses.length === 0
          ? check("address", "fail", "Add an address to your Hack Club account. We use your default one.", HCA_ADDRESSES_URL)
          : check("address", "pass", addresses[0].address.country),
  );

  const seconds = await fetchSeconds(user.id, input.hackatimeProjects).catch(() => null);
  out.push(
    seconds === null
      ? check("hours", "fail", "We can't read your Hackatime. Link it again.", "/api/auth/hackatime/start?next=/app/ship")
      : seconds < MIN_SHIP_SECONDS
        ? check("hours", "fail", `Those projects have ${hm(seconds)}. Ships need at least ${hm(MIN_SHIP_SECONDS)}.`)
        : check("hours", "pass", hm(seconds)),
  );

  const host = outsideHost(decodeDataUri(input.dataUri));
  out.push(
    host
      ? check("offline", "warn", `It reaches out to ${host}. SHRINK apps should work with no network.`)
      : check("offline", "pass"),
  );

  const src = await readSource(input.sourceUrl.trim()).catch(() => null);
  if (!src) {
    out.push(check("repo", "skip", "GitHub didn't answer. A reviewer will open it by hand."));
    out.push(check("readme", "skip"));
  } else if (src.kind === "missing") {
    out.push(check("repo", "fail", src.why));
    out.push(check("readme", "skip"));
  } else if (src.kind === "elsewhere") {
    out.push(check("repo", "warn", "It's public, but we can only read GitHub repos. A reviewer will check it by hand."));
    out.push(check("readme", "skip"));
  } else {
    out.push(check("repo", "pass"));
    out.push(
      src.readme === null
        ? check("readme", "fail", "Add a README.md that says what the app is and how you made it.", src.url)
        : check("readme", "pass"),
    );
  }
  return out;
}

export async function deepScan(input: ScanInput): Promise<Check[]> {
  const src = await readSource(input.sourceUrl.trim()).catch(() => null);
  if (!src || src.kind !== "github") {
    return [check("readme_quality", "skip"), check("code", "skip")];
  }

  const words = src.readme ? proseWords(src.readme) : 0;
  const hasCode = src.files.some((f) => CODE_EXT.test(f.path));
  const app = decodeDataUri(input.dataUri);

  const verdict = await remember(`judge:${sha256(`${src.url}\n${src.readme}\n${src.files.map((f) => f.path).join()}\n${app}`)}`, () =>
    judge(app, src),
  ).catch((e) => {
    console.error("[scan] judge failed", e);
    return null;
  });

  const readme: Check =
    src.readme === null
      ? check("readme_quality", "skip")
      : words < 25
        ? check("readme_quality", "fail", "Your README is nearly empty. Say what the app does and how you built it.", src.url)
        : verdict
          ? check(
              "readme_quality",
              verdict.readme.verdict === "explains" ? "pass" : verdict.readme.verdict === "thin" ? "warn" : "fail",
              verdict.readme.verdict === "explains" ? undefined : verdict.readme.reason,
              verdict.readme.verdict === "explains" ? undefined : src.url,
            )
          : words < 60
            ? check("readme_quality", "warn", "Your README is short. A few more sentences help the reviewer.", src.url)
            : check("readme_quality", "pass");

  const code: Check = !hasCode
    ? check("code", "fail", "There are no code files in the repo. Push the app's source.", src.url)
    : verdict
      ? check(
          "code",
          verdict.code.verdict === "matches" ? "pass" : verdict.code.verdict === "partial" ? "warn" : "fail",
          verdict.code.verdict === "matches" ? undefined : verdict.code.reason,
          verdict.code.verdict === "matches" ? undefined : src.url,
        )
      : check("code", "pass");

  return [readme, code];
}

export async function fullScan(user: User, input: ScanInput): Promise<Check[]> {
  const [quick, deep] = await Promise.all([quickScan(user, input), deepScan(input)]);
  return [...quick, ...deep];
}
