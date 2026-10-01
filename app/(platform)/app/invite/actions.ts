"use server";

import { revalidatePath } from "next/cache";

import { actionUser } from "@/lib/server/auth/current";
import { ReferralError, createCode } from "@/lib/server/referrals";

export type PledgeState = { error: string | null };

export async function pledgeAction(_prev: PledgeState, form: FormData): Promise<PledgeState> {
  const user = await actionUser();
  const typed = typeof form.get("pledge") === "string" ? (form.get("pledge") as string) : "";
  try {
    await createCode(user, typed.slice(0, 500));
  } catch (e) {
    if (e instanceof ReferralError) return { error: e.message };
    console.error("[invite] pledge failed", e);
    return { error: "Something broke on our side. Try again." };
  }
  revalidatePath("/app", "layout");
  return { error: null };
}
