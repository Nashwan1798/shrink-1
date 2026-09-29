import Shell from "@/app/components/ui/Shell";
import { currentUser } from "@/lib/server/auth/session";
import { balance } from "@/lib/server/ledger";
import { hasOrders } from "@/lib/server/orders";

export const dynamic = "force-dynamic";

// Guides are public: signed-in people get the usual shell, everyone else a sign-in link.
export default async function GuidesLayout({ children }: { children: React.ReactNode }) {
  const user = await currentUser();
  if (!user) return <Shell user={null}>{children}</Shell>;
  const [bites, ordered] = await Promise.all([balance(user.id), hasOrders(user.id)]);
  return (
    <Shell user={user} bites={bites} hasOrders={ordered}>
      {children}
    </Shell>
  );
}
