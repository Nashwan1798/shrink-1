import Link from "next/link";

import type { User } from "@/lib/server/db/schema";

import { pixelButtonClass } from "../PixelButton";
import NavLinks from "./NavLinks";

export default function Shell({
  user,
  bites,
  children,
}: {
  user: User;
  bites: number;
  children: React.ReactNode;
}) {
  const links = [
    { href: "/app", label: "home" },
    { href: "/app/ship", label: "ship" },
    { href: "/app/shop", label: "shop" },
    { href: "/app/orders", label: "orders" },
  ];
  if (user.role === "reviewer" || user.role === "admin") links.push({ href: "/review", label: "review" });
  if (user.role === "admin") links.push({ href: "/admin", label: "admin" });

  return (
    <div className="flex min-h-full flex-1 flex-col bg-background text-foreground">
      <div className="hazard-thin" aria-hidden />
      <header className="flex flex-wrap items-center gap-x-6 gap-y-3 px-[var(--gutter)] py-3">
        <Link href="/" className="wordmark text-[1.6rem] leading-none tracking-tight" aria-label="SHRINK home">
          SHRINK
        </Link>
        <div className="order-last basis-full sm:order-none sm:basis-auto">
          <NavLinks links={links} />
        </div>
        <div className="ml-auto flex items-center gap-3">
          <Link
            href="/app/shop"
            className="font-pixel rounded-[4px] bg-black px-[0.55em] py-[0.3em] text-[1.05rem] leading-none text-white"
            title="Your BITES"
          >
            {bites} BITES
          </Link>
          <span className="hidden text-sm font-medium text-black/60 sm:inline">{user.displayName}</span>
          <form action="/api/auth/signout" method="post">
            <button type="submit" className={`${pixelButtonClass} text-[0.75rem]`}>
              sign out
            </button>
          </form>
        </div>
      </header>
      <hr className="rule" />
      <main className="flex flex-1 flex-col px-[var(--gutter)] py-[clamp(1.5rem,3vw,48px)]">{children}</main>
      <footer className="px-[var(--gutter)] pb-6 text-center text-xs font-medium text-black/40">
        made with &lt;3 by teens in Hack Club
      </footer>
    </div>
  );
}
