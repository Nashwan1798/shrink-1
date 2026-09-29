"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { after } from "next/server";

import { airtableConfigured, queueSync, syncAll } from "@/lib/server/airtable";
import { actionRole } from "@/lib/server/auth/current";
import { db } from "@/lib/server/db/client";
import { auditEvents, users } from "@/lib/server/db/schema";
import { backfillProgramChannel, loadOrderAndUser, orderHandled, readAddress } from "@/lib/server/effects";
import * as ledger from "@/lib/server/ledger";
import { OrderError, handleOrder } from "@/lib/server/orders";
import { requestOrigin } from "@/lib/server/origin";
import { env } from "@/lib/server/env";

export type AdminState = { error: string | null; ok?: string | null; address?: Record<string, string | null> | null };

const str = (form: FormData, k: string) => (typeof form.get(k) === "string" ? (form.get(k) as string) : "");

export async function setRoleAction(_prev: AdminState, form: FormData): Promise<AdminState> {
  const admin = await actionRole("admin");
  const userId = str(form, "user_id");
  const role = str(form, "role");
  if (role !== "participant" && role !== "reviewer" && role !== "admin") return { error: "Bad role." };
  if (userId === admin.id) return { error: "Get a colleague to change your own role." };
  await db.update(users).set({ role }).where(eq(users.id, userId));
  await db.insert(auditEvents).values({ actorId: admin.id, action: "user.role", subject: userId, detail: { role } });
  queueSync({ users: [userId] });
  revalidatePath("/admin");
  return { error: null, ok: "Role updated." };
}

export async function adjustAction(_prev: AdminState, form: FormData): Promise<AdminState> {
  const admin = await actionRole("admin");
  const userId = str(form, "user_id");
  const amount = Number(str(form, "amount"));
  const reason = str(form, "reason").trim();
  if (!Number.isInteger(amount) || amount === 0) return { error: "Amount has to be a whole non-zero number of BITES." };
  if (!reason) return { error: "Say why." };
  await db.transaction(async (tx) => {
    await ledger.lockUser(userId, tx);
    await ledger.post(tx, {
      userId,
      amount,
      type: "adjustment",
      reason,
      idempotencyKey: `adjust:${userId}:${Date.now()}:${Math.random().toString(36).slice(2, 8)}`,
      actorId: admin.id,
    });
  });
  await db.insert(auditEvents).values({ actorId: admin.id, action: "ledger.adjust", subject: userId, detail: { amount, reason } });
  queueSync({ users: [userId] });
  revalidatePath("/admin");
  return { error: null, ok: `${amount > 0 ? "+" : ""}${amount} BITES posted.` };
}

export async function orderHandleAction(_prev: AdminState, form: FormData): Promise<AdminState> {
  const admin = await actionRole("admin");
  const orderId = str(form, "order_id");
  const action = str(form, "action");
  if (action !== "fulfil" && action !== "reject") return { error: "Bad action." };
  try {
    await handleOrder(admin, orderId, action, str(form, "internal_note"));
  } catch (e) {
    if (e instanceof OrderError) return { error: e.message };
    console.error("[admin] order", e);
    return { error: "Something broke. Nothing changed." };
  }
  after(async () => {
    const row = await loadOrderAndUser(orderId);
    if (row) await orderHandled(row.order, row.user);
  });
  queueSync({ orders: [orderId] });
  revalidatePath("/admin/orders");
  return { error: null, ok: action === "fulfil" ? "Marked shipped." : "Cancelled and refunded." };
}

export async function revealAddressAction(_prev: AdminState, form: FormData): Promise<AdminState> {
  const admin = await actionRole("admin");
  const orderId = str(form, "order_id");
  const row = await loadOrderAndUser(orderId);
  if (!row) return { error: "No such order." };
  const address = readAddress(row.order);
  if (!address) return { error: "This order has no address (digital prize)." };
  await db.insert(auditEvents).values({ actorId: admin.id, action: "order.address_revealed", subject: orderId });
  return { error: null, address: { ...address } };
}

export async function airtableSyncAction(): Promise<AdminState> {
  const admin = await actionRole("admin");
  if (!airtableConfigured()) return { error: "Set AIRTABLE_API_KEY and AIRTABLE_BASE_ID first." };
  const origin = env.APP_URL || (await requestOrigin());
  after(async () => {
    try {
      const n = await syncAll(origin);
      console.log(`[airtable] full sync by ${admin.email}: ${JSON.stringify(n)}`);
    } catch (e) {
      console.error("[airtable] full sync failed", e);
    }
  });
  await db.insert(auditEvents).values({ actorId: admin.id, action: "airtable.sync" });
  return { error: null, ok: "Sync started. Airtable fills in over the next minute or so." };
}

export async function slackBackfillAction(): Promise<AdminState> {
  const admin = await actionRole("admin");
  const r = await backfillProgramChannel();
  if ("error" in r) return { error: r.error };
  await db.insert(auditEvents).values({ actorId: admin.id, action: "slack.backfill", detail: r });
  return { error: null, ok: `${r.invited} invited, ${r.already} already in${r.failed ? `, ${r.failed} failed (see logs)` : ""}.` };
}
