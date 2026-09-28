import "server-only";

import { redirect } from "next/navigation";

import type { User } from "../db/schema";
import { currentUser } from "./session";

export type Role = User["role"];

const RANK: Record<Role, number> = { participant: 0, reviewer: 1, admin: 2 };

export function hasRole(user: User, role: Role): boolean {
  return RANK[user.role] >= RANK[role];
}

export async function requireUser(next?: string): Promise<User> {
  const user = await currentUser();
  if (!user) redirect(`/login${next ? `?next=${encodeURIComponent(next)}` : ""}`);
  return user;
}

export async function requireRole(role: Role, next?: string): Promise<User> {
  const user = await requireUser(next);
  if (!hasRole(user, role)) redirect("/app");
  return user;
}

export async function actionUser(): Promise<User> {
  const user = await currentUser();
  if (!user) throw new Error("Sign in first.");
  return user;
}

export async function actionRole(role: Role): Promise<User> {
  const user = await actionUser();
  if (!hasRole(user, role)) throw new Error("You can't do that.");
  return user;
}
