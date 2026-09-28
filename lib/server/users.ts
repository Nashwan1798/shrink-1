import "server-only";

import { and, eq, isNull, or, sql } from "drizzle-orm";

import { queueSync } from "./airtable";
import { encrypt } from "./crypto";
import { db } from "./db/client";
import { users, type User } from "./db/schema";
import { env } from "./env";
import { checkIdentity, deriveEligibility, type Identity, type Tokens } from "./auth/hca";

export const tokenBinding = (userId: string) => `users/${userId}/hca_token`;

export async function upsertFromSignIn(identity: Identity, tokens: Tokens): Promise<User> {
  const check = await checkIdentity(identity.sub);
  const eligibility = deriveEligibility(identity.verificationStatus, check);
  const bootstrapAdmin =
    env.ADMIN_HCA_SUBJECTS.includes(identity.sub) || env.ADMIN_EMAILS.includes(identity.email.toLowerCase());
  const expiresAt = tokens.expires_in ? new Date(Date.now() + tokens.expires_in * 1000) : null;

  // Someone who joined from Slack already has a row with no HCA subject; claim
  // it so their Airtable record and Slack sign-up time carry over.
  const [existing] = await db
    .select()
    .from(users)
    .where(
      identity.slackId
        ? or(eq(users.hcaSubject, identity.sub), and(eq(users.slackId, identity.slackId), isNull(users.hcaSubject)))
        : eq(users.hcaSubject, identity.sub),
    )
    // Prefer the row that's already theirs over an unclaimed Slack one.
    .orderBy(sql`${users.hcaSubject} is null`)
    .limit(1);
  const base = {
    email: identity.email,
    displayName: identity.name,
    slackId: identity.slackId ?? existing?.slackId ?? null,
    verificationStatus: identity.verificationStatus,
    eligibility,
    eligibilityAt: new Date(),
    birthdate: identity.birthdate ?? existing?.birthdate ?? null,
    hcaTokenExpiresAt: expiresAt,
    lastSeenAt: new Date(),
  };

  if (existing) {
    const [row] = await db
      .update(users)
      .set({
        ...base,
        hcaSubject: identity.sub,
        role: bootstrapAdmin && existing.role !== "admin" ? "admin" : existing.role,
        hcaTokenEncrypted: encrypt(tokens.access_token, tokenBinding(existing.id)),
      })
      .where(eq(users.id, existing.id))
      .returning();
    queueSync({ users: [row.id] });
    return row;
  }

  const [created] = await db
    .insert(users)
    .values({ ...base, hcaSubject: identity.sub, role: bootstrapAdmin ? "admin" : "participant" })
    .returning();
  const [row] = await db
    .update(users)
    .set({ hcaTokenEncrypted: encrypt(tokens.access_token, tokenBinding(created.id)) })
    .where(eq(users.id, created.id))
    .returning();
  queueSync({ users: [row.id] });
  return row;
}

const ELIGIBILITY_MAX_AGE_MS = 6 * 3600_000;

export async function currentEligibility(user: User): Promise<User["eligibility"]> {
  const fresh = user.eligibilityAt && Date.now() - user.eligibilityAt.getTime() < ELIGIBILITY_MAX_AGE_MS;
  if (fresh && user.eligibility === "eligible") return user.eligibility;
  if (!user.hcaSubject) return user.eligibility;
  const check = await checkIdentity(user.hcaSubject);
  if (check === "unavailable") return user.eligibility;
  const eligibility = deriveEligibility(user.verificationStatus, check);
  await db.update(users).set({ eligibility, eligibilityAt: new Date() }).where(eq(users.id, user.id));
  if (eligibility !== user.eligibility) queueSync({ users: [user.id] });
  return eligibility;
}

export const SLACK_ID = /^[UW][A-Z0-9]{6,20}$/;

type SlackProfile = { name: string | null; email: string | null; avatar: string | null };

async function slackProfile(slackId: string): Promise<SlackProfile> {
  const none = { name: null, email: null, avatar: null };
  if (!env.SLACK_BOT_TOKEN) return none;
  try {
    const res = await fetch(`https://slack.com/api/users.info?user=${encodeURIComponent(slackId)}`, {
      headers: { authorization: `Bearer ${env.SLACK_BOT_TOKEN}` },
      cache: "no-store",
      signal: AbortSignal.timeout(8_000),
    });
    const json = (await res.json()) as {
      ok?: boolean;
      error?: string;
      user?: { real_name?: string; profile?: { display_name?: string; real_name?: string; email?: string; image_192?: string } };
    };
    if (!json.ok || !json.user) {
      console.error(`[slack] users.info ${slackId} failed: ${json.error ?? res.status}`);
      return none;
    }
    const p = json.user.profile ?? {};
    return {
      name: p.display_name || p.real_name || json.user.real_name || null,
      email: p.email || null,
      avatar: p.image_192 || null,
    };
  } catch (e) {
    console.error(`[slack] users.info ${slackId} threw`, e);
    return none;
  }
}

// Called by the Slack "join" button. Creates a placeholder user (no HCA subject,
// not onboarded) so they show up in Airtable right away; signing in later claims
// the row in upsertFromSignIn and still walks them through /welcome.
export async function joinFromSlack(slackId: string): Promise<{ user: User; created: boolean }> {
  const [known] = await db.select().from(users).where(eq(users.slackId, slackId)).limit(1);
  if (known) return { user: known, created: false };

  const profile = await slackProfile(slackId);
  const result = await db.transaction(async (tx) => {
    // Slack retries and double clicks: only one row per Slack ID.
    await tx.execute(sql`select pg_advisory_xact_lock(hashtext(${`slack-join:${slackId}`}))`);
    const [again] = await tx.select().from(users).where(eq(users.slackId, slackId)).limit(1);
    if (again) return { user: again, created: false };
    const [user] = await tx
      .insert(users)
      .values({
        slackId,
        email: profile.email ?? "",
        displayName: profile.name ?? slackId,
        avatarUrl: profile.avatar,
      })
      .returning();
    return { user, created: true };
  });
  if (result.created) queueSync({ users: [result.user.id] });
  return result;
}
