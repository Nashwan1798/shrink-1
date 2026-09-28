import { redirect } from "next/navigation";

import Shell from "@/app/components/ui/Shell";
import { requireUser } from "@/lib/server/auth/current";
import { balance } from "@/lib/server/ledger";
import { hasOrders } from "@/lib/server/orders";

export const dynamic = "force-dynamic";

export default async function PlatformLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();
  if (user.role === "participant" && !user.onboardedAt) redirect("/welcome");
  const [bites, ordered] = await Promise.all([balance(user.id), hasOrders(user.id)]);
  return (
    <Shell user={user} bites={bites} hasOrders={ordered}>
      {children}
    </Shell>
  );
}
