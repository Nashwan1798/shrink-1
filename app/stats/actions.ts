"use server";

import { revalidatePath } from "next/cache";

import { programDays, recentDays, refreshActivity } from "@/lib/server/activity";
import { actionRole } from "@/lib/server/auth/current";
import { db } from "@/lib/server/db/client";
import { auditEvents } from "@/lib/server/db/schema";

export type RefreshState = { error: string | null; ok?: string | null };

// Admin only. `scope` is "recent" (today + yesterday) or "program" (every day since the start).
export async function refreshStatsAction(_prev: RefreshState, form: FormData): Promise<RefreshState> {
  const admin = await actionRole("admin");
  const scope = form.get("scope") === "program" ? "program" : "recent";
  const days = scope === "program" ? programDays() : recentDays(2);
  try {
    const r = await refreshActivity(days);
    if (!r) return { error: "A refresh is already running. Give it a minute." };
    await db.insert(auditEvents).values({ actorId: admin.id, action: "activity.refresh", detail: { scope, ...r } });
    revalidatePath("/stats");
    return {
      error: null,
      ok: `Read ${r.rows} person-days from Hackatime for ${r.users} people${r.failed ? `, ${r.failed} failed (see logs)` : ""}.`,
    };
  } catch (e) {
    console.error("[activity] manual refresh failed", e);
    return { error: "Hackatime didn't cooperate. Nothing changed." };
  }
}
