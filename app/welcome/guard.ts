import "server-only";

import { redirect } from "next/navigation";

import { hasRole } from "@/lib/server/auth/current";
import type { User } from "@/lib/server/db/schema";

// Staff skip onboarding, so for them the flow is always a preview. In dev, ?preview lets anyone replay it.
export function stayInSetup(user: User, preview: string | undefined): boolean {
  const previewing = hasRole(user, "reviewer") || (process.env.NODE_ENV !== "production" && preview !== undefined);
  if (user.onboardedAt && !previewing) redirect("/app");
  return previewing;
}
