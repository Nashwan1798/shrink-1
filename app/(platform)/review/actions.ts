"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { after } from "next/server";

import { actionRole } from "@/lib/server/auth/current";
import { loadShipAndAuthor, shipDecided } from "@/lib/server/effects";
import { requestOrigin } from "@/lib/server/origin";
import { ShipError, decide } from "@/lib/server/ships";

export type DecisionState = { error: string | null };

export async function decideAction(_prev: DecisionState, form: FormData): Promise<DecisionState> {
  const reviewer = await actionRole("reviewer");
  const str = (k: string) => (typeof form.get(k) === "string" ? (form.get(k) as string) : "");
  const shipId = str("ship_id");
  const kind = str("kind");
  const nextId = str("next_id");

  try {
    if (kind === "approve") {
      await decide(reviewer, shipId, {
        kind: "approve",
        awardedHours: Number(str("hours")),
        badges: form.getAll("badge").map(String),
        message: str("message"),
        internalNote: str("internal_note"),
      });
    } else if (kind === "reject") {
      await decide(reviewer, shipId, { kind: "reject", message: str("message"), internalNote: str("internal_note") });
    } else {
      return { error: "Pick approve or send back." };
    }
  } catch (e) {
    if (e instanceof ShipError) return { error: e.message };
    console.error("[review] failed", e);
    return { error: "Something broke on our side. Nothing was decided. Try again." };
  }

  const origin = await requestOrigin();
  after(async () => {
    const row = await loadShipAndAuthor(shipId);
    if (row) await shipDecided(row.ship, row.author, origin);
  });
  revalidatePath("/", "layout");
  redirect(nextId ? `/review?s=${nextId}&decided=1` : "/review?decided=1");
}
