import "server-only";

import { redirect } from "next/navigation";

import type { User } from "@/lib/server/db/schema";

export function stayInSetup(user: User, preview: string | undefined): boolean {
  const previewing = process.env.NODE_ENV !== "production" && preview !== undefined;
  if (user.onboardedAt && !previewing) redirect("/app");
  return previewing;
}
