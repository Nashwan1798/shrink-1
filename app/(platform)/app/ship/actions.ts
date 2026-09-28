"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { after } from "next/server";

import { queueSync } from "@/lib/server/airtable";
import { actionUser } from "@/lib/server/auth/current";
import { loadShipAndAuthor, shipShipped } from "@/lib/server/effects";
import { requestOrigin } from "@/lib/server/origin";
import type { Check } from "@/lib/scan";
import { deepScan, forgetSource, quickScan, type ScanInput } from "@/lib/server/scan";
import { take } from "@/lib/server/ratelimit";
import { ShipError, createShip } from "@/lib/server/ships";

export type ShipFormState = { error: string | null };

export async function shipAction(_prev: ShipFormState, form: FormData): Promise<ShipFormState> {
  const user = await actionUser();
  const limit = await take(user.id, "ship", SCANS_PER_WINDOW, SCAN_WINDOW_MS);
  if (!limit.ok) return { error: `Too many attempts. Try again in ${limit.retryInMinutes} min.` };
  const str = (k: string) => (typeof form.get(k) === "string" ? (form.get(k) as string) : "");
  let id: string;
  try {
    const ship = await createShip(user, {
      title: str("title"),
      description: str("description"),
      dataUri: str("data_uri"),
      sourceUrl: str("source_url"),
      hackatimeProjects: form.getAll("hackatime").map(String),
      claimedBadges: form.getAll("badge").map(String),
      reshipOf: str("reship_of") || null,
    });
    id = ship.id;
  } catch (e) {
    if (e instanceof ShipError) return { error: e.message };
    console.error("[ship] failed", e);
    return { error: "Something broke on our side. Try again in a minute." };
  }

  const origin = await requestOrigin();
  after(async () => {
    const row = await loadShipAndAuthor(id);
    if (row) await shipShipped(row.ship, row.author, origin);
  });
  queueSync({ ships: [id] });
  revalidatePath("/", "layout");
  redirect(`/app/ships/${id}?shipped=1`);
}

export type ScanResult = { checks: Check[] } | { retryInMinutes: number };

const SCANS_PER_WINDOW = 30;
const SCAN_WINDOW_MS = 30 * 60_000;

export async function quickScanAction(input: ScanInput, fresh = false): Promise<ScanResult> {
  const user = await actionUser();
  const limit = await take(user.id, "scan:quick", SCANS_PER_WINDOW, SCAN_WINDOW_MS);
  if (!limit.ok) return { retryInMinutes: limit.retryInMinutes };
  const i = clean(input);
  if (fresh) forgetSource(i.sourceUrl);
  return { checks: await quickScan(user, i) };
}

export async function deepScanAction(input: ScanInput, fresh = false): Promise<ScanResult> {
  const user = await actionUser();
  const limit = await take(user.id, "scan:deep", SCANS_PER_WINDOW, SCAN_WINDOW_MS);
  if (!limit.ok) return { retryInMinutes: limit.retryInMinutes };
  const i = clean(input);
  if (fresh) forgetSource(i.sourceUrl);
  return { checks: await deepScan(i) };
}

function clean(input: ScanInput): ScanInput {
  return {
    dataUri: String(input.dataUri ?? "").trim().slice(0, 8192),
    sourceUrl: String(input.sourceUrl ?? "").trim().slice(0, 512),
    hackatimeProjects: (Array.isArray(input.hackatimeProjects) ? input.hackatimeProjects : []).map(String).slice(0, 50),
  };
}
