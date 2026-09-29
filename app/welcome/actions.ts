"use server";

import { and, eq, isNull } from "drizzle-orm";
import { redirect } from "next/navigation";
import { after } from "next/server";

import { queueSync } from "@/lib/server/airtable";
import { actionUser } from "@/lib/server/auth/current";
import { db } from "@/lib/server/db/client";
import { joinedProgram } from "@/lib/server/effects";
import { users } from "@/lib/server/db/schema";

// Hackatime is re-checked here: an action is a public POST endpoint, so the page's word isn't trusted.
export async function finishOnboarding(): Promise<void> {
  const user = await actionUser();
  if (!user.hackatimeAccountId) redirect("/welcome/setup");
  const [done] = await db
    .update(users)
    .set({ onboardedAt: new Date() })
    .where(and(eq(users.id, user.id), isNull(users.onboardedAt)))
    .returning({ slackId: users.slackId });
  // Only on the first finish, so re-submitting the form doesn't re-invite.
  if (done) after(() => joinedProgram(done));
  queueSync({ users: [user.id] });
  redirect("/app");
}
