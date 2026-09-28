import "server-only";

import { and, asc, eq, gte, lt, sql } from "drizzle-orm";

import { db } from "./db/client";
import { rateHits } from "./db/schema";

export type Limit = { ok: true } | { ok: false; retryInMinutes: number };

// Sliding window, counted in Postgres so it holds across serverless instances.
// The advisory lock serializes concurrent calls for the same user and bucket.
export async function take(userId: string, bucket: string, max: number, windowMs: number): Promise<Limit> {
  const since = new Date(Date.now() - windowMs);
  return db.transaction(async (tx) => {
    await tx.execute(sql`select pg_advisory_xact_lock(hashtext(${`${userId}:${bucket}`}))`);
    const scope = and(eq(rateHits.userId, userId), eq(rateHits.bucket, bucket));
    await tx.delete(rateHits).where(and(scope, lt(rateHits.createdAt, since)));
    const recent = await tx
      .select({ at: rateHits.createdAt })
      .from(rateHits)
      .where(and(scope, gte(rateHits.createdAt, since)))
      .orderBy(asc(rateHits.createdAt));
    if (recent.length >= max) {
      const freesAt = recent[recent.length - max].at.getTime() + windowMs;
      return { ok: false, retryInMinutes: Math.max(1, Math.ceil((freesAt - Date.now()) / 60_000)) };
    }
    await tx.insert(rateHits).values({ userId, bucket });
    return { ok: true };
  });
}
