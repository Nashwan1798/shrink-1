import "server-only";

import { desc, eq, sql } from "drizzle-orm";

import { db, type Tx } from "./db/client";
import { ledgerEntries, users } from "./db/schema";

export async function balance(userId: string, tx?: Tx): Promise<number> {
  const q = tx ?? db;
  const [row] = await q
    .select({ total: sql<number>`coalesce(sum(${ledgerEntries.amount}), 0)::int` })
    .from(ledgerEntries)
    .where(eq(ledgerEntries.userId, userId));
  return row?.total ?? 0;
}

// Take this row lock before reading a balance to spend it, so two orders can't spend the same BITES.
export async function lockUser(userId: string, tx: Tx): Promise<void> {
  await tx.execute(sql`select 1 from ${users} where ${users.id} = ${userId} for update`);
}

// The idempotency key makes a retry (or two concurrent approvals) a no-op.
export async function post(
  tx: Tx,
  entry: {
    userId: string;
    amount: number;
    type: "award" | "order" | "refund" | "adjustment";
    reason: string;
    idempotencyKey: string;
    actorId?: string | null;
  },
): Promise<boolean> {
  if (!Number.isInteger(entry.amount) || entry.amount === 0) throw new Error("ledger amount must be a non-zero integer");
  const inserted = await tx
    .insert(ledgerEntries)
    .values({ ...entry, actorId: entry.actorId ?? null })
    .onConflictDoNothing({ target: ledgerEntries.idempotencyKey })
    .returning({ id: ledgerEntries.id });
  return inserted.length > 0;
}

export async function history(userId: string) {
  return db.select().from(ledgerEntries).where(eq(ledgerEntries.userId, userId)).orderBy(desc(ledgerEntries.createdAt));
}
