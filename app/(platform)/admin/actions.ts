"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { after } from "next/server";

import { actionRole } from "@/lib/server/auth/current";
import { db } from "@/lib/server/db/client";
import { auditEvents, users } from "@/lib/server/db/schema";
import { loadOrderAndUser, orderHandled, readAddress } from "@/lib/server/effects";
import * as ledger from "@/lib/server/ledger";
import { OrderError, handleOrder } from "@/lib/server/orders";

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
