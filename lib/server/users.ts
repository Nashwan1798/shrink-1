import "server-only";

import { eq } from "drizzle-orm";

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

  const [existing] = await db.select().from(users).where(eq(users.hcaSubject, identity.sub)).limit(1);
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
  const check = await checkIdentity(user.hcaSubject);
  if (check === "unavailable") return user.eligibility;
  const eligibility = deriveEligibility(user.verificationStatus, check);
  await db.update(users).set({ eligibility, eligibilityAt: new Date() }).where(eq(users.id, user.id));
  if (eligibility !== user.eligibility) queueSync({ users: [user.id] });
  return eligibility;
}
