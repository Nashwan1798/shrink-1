"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { after } from "next/server";

import { actionUser } from "@/lib/server/auth/current";
import { loadOrderAndUser, orderPlaced } from "@/lib/server/effects";
import { OrderError, placeOrder } from "@/lib/server/orders";
import { requestOrigin } from "@/lib/server/origin";

export type OrderFormState = { error: string | null };

export async function orderAction(_prev: OrderFormState, form: FormData): Promise<OrderFormState> {
  const user = await actionUser();
  const str = (k: string) => (typeof form.get(k) === "string" ? (form.get(k) as string) : "");
  let id: string;
  try {
    const order = await placeOrder(user, { rewardSlug: str("reward"), addressId: str("address"), note: str("note") });
    id = order.id;
  } catch (e) {
    if (e instanceof OrderError) return { error: e.message };
    console.error("[order] failed", e);
    return { error: "Something broke on our side. Your BITES are untouched. Try again in a minute." };
  }
  const origin = await requestOrigin();
  after(async () => {
    const row = await loadOrderAndUser(id);
    if (row) await orderPlaced(row.order, row.user, origin);
  });
  revalidatePath("/", "layout");
  redirect(`/app/orders/${id}?placed=1`);
}
