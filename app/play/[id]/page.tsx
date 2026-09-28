import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { AppFrame } from "@/app/components/ui/bits";
import { shipById } from "@/lib/server/ships";

// Public, so YSWS reviewers can play an approved ship without an account. The app still runs in
// AppFrame's opaque-origin sandbox, so it can't reach this site's cookies.
async function approved(id: string) {
  const ship = await shipById(id);
  return ship?.state === "approved" ? ship : null;
}

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const ship = await approved((await params).id);
  return { title: ship ? `${ship.title} · SHRINK` : "SHRINK", robots: { index: false } };
}

export default async function PlayPage({ params }: { params: Promise<{ id: string }> }) {
  const ship = await approved((await params).id);
  if (!ship) notFound();
  return <AppFrame uri={ship.dataUri} title={ship.title} className="fixed inset-0 h-full w-full border-0 bg-white" />;
}
