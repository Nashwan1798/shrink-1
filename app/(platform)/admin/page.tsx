import Link from "next/link";
import { desc, eq, sql } from "drizzle-orm";

import { H1 } from "@/app/components/ui/bits";
import { requireRole } from "@/lib/server/auth/current";
import { db } from "@/lib/server/db/client";
import { ledgerEntries, orders, ships, users } from "@/lib/server/db/schema";

import AirtableSync from "./AirtableSync";
import People from "./People";

export default async function AdminPage() {
  const admin = await requireRole("admin", "/admin");

  const [people, counts] = await Promise.all([
    db
      .select({
        id: users.id,
        displayName: users.displayName,
        email: users.email,
        slackId: users.slackId,
        role: users.role,
        eligibility: users.eligibility,
        createdAt: users.createdAt,
        bites: sql<number>`coalesce((select sum(${ledgerEntries.amount}) from ${ledgerEntries} where ${ledgerEntries.userId} = ${users.id}), 0)::int`,
        shipCount: sql<number>`(select count(*) from ${ships} where ${ships.userId} = ${users.id})::int`,
      })
      .from(users)
      .orderBy(desc(users.createdAt)),
    db
      .select({
        pending: sql<number>`count(*) filter (where ${ships.state} = 'pending')::int`,
        approved: sql<number>`count(*) filter (where ${ships.state} = 'approved')::int`,
        rejected: sql<number>`count(*) filter (where ${ships.state} = 'rejected')::int`,
        bites: sql<number>`coalesce(sum(${ships.awardedBites}), 0)::int`,
      })
      .from(ships),
  ]);
  const [openOrders] = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(orders)
    .where(eq(orders.state, "placed"));

  return (
    <>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <H1 sub={`${people.length} people · ${counts[0].pending} in queue · ${counts[0].approved} approved · ${counts[0].rejected} sent back · ${counts[0].bites} BITES minted`}>
          admin
        </H1>
        <nav className="mb-[clamp(1.25rem,2vw,32px)] flex gap-1 text-[0.95rem] font-medium">
          <span className="rounded-[4px] bg-accent px-2 py-1">people</span>
          <Link href="/admin/orders" className="rounded-[4px] px-2 py-1 text-black/60 hover:bg-black/5">
            orders {openOrders.n > 0 && <span className="font-pixel">({openOrders.n})</span>}
          </Link>
          <AirtableSync />
        </nav>
      </div>
      <People people={people.map((p) => ({ ...p, createdAt: p.createdAt.toISOString() }))} selfId={admin.id} />
    </>
  );
}
