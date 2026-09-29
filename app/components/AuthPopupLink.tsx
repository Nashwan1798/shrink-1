"use client";

import { useEffect, useRef } from "react";

// Opens an OAuth start route in a centred popup. /auth/done broadcasts where to go and this tab follows.
// Touch devices, modified clicks, and browsers that block the popup use the plain full-page redirect.
// Mobile "popups" are just new tabs, and privacy browsers there often partition BroadcastChannel so
// the handoff never arrives.
export default function AuthPopupLink({ href, className, children }: { href: string; className?: string; children: React.ReactNode }) {
  const channel = useRef<BroadcastChannel | null>(null);
  useEffect(() => () => channel.current?.close(), []);

  function onClick(e: React.MouseEvent<HTMLAnchorElement>) {
    if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || typeof BroadcastChannel === "undefined") return;
    if (window.matchMedia("(pointer: coarse)").matches) return;
    const w = 500;
    const h = 680;
    const left = Math.max(0, Math.round(window.screenX + ((window.outerWidth || screen.width) - w) / 2));
    const top = Math.max(0, Math.round(window.screenY + ((window.outerHeight || screen.height) - h) / 2));
    const url = `${href}${href.includes("?") ? "&" : "?"}popup=1`;
    const popup = window.open(url, "shrink-auth", `popup,width=${w},height=${h},left=${left},top=${top}`);
    if (!popup) return;
    e.preventDefault();
    popup.focus();

    channel.current?.close();
    const bc = new BroadcastChannel("shrink-auth");
    bc.onmessage = (m: MessageEvent<{ to?: string }>) => {
      const to = m.data?.to;
      if (typeof to !== "string" || !to.startsWith("/") || to.startsWith("//")) return;
      bc.close();
      window.location.assign(to);
    };
    channel.current = bc;
  }

  return (
    <a href={href} onClick={onClick} className={className}>
      {children}
    </a>
  );
}
