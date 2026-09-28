import "server-only";

import { eq } from "drizzle-orm";

import { db } from "./db/client";
import { users, type User } from "./db/schema";
import { stagingRole } from "./env";
import type { Address } from "./auth/hca";

export async function stagingUser(): Promise<User> {
  const sub = "ident!staging-developer";
  const role = stagingRole();
  const [existing] = await db.select().from(users).where(eq(users.hcaSubject, sub)).limit(1);
  if (existing) {
    const [row] = await db.update(users).set({ role, lastSeenAt: new Date() }).where(eq(users.id, existing.id)).returning();
    return row;
  }
  const [row] = await db
    .insert(users)
    .values({
      hcaSubject: sub,
      email: "dev@shrink.local",
      displayName: "Local Developer",
      slackId: "U0STAGING",
      verificationStatus: "verified",
      eligibility: "eligible",
      eligibilityAt: new Date(),
      role,
    })
    .returning();
  return row;
}

export const STAGING_ADDRESS: Address = {
  recipient: "Local Developer",
  line1: "123 Example Street",
  line2: null,
  city: "Springfield",
  region: "VT",
  postcode: "00000",
  country: "US",
  phone: null,
};
