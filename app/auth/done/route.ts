import type { NextRequest } from "next/server";

import { safePath } from "@/lib/server/origin";

// Last hop of a popup sign-in: tell the opening tab where to go, then close. If the window
// wasn't opened by script it can't close, so it navigates there itself.
export function GET(req: NextRequest) {
  const to = JSON.stringify(safePath(req.nextUrl.searchParams.get("to"), "/app")).replace(/</g, "\\u003c");
  const html = `<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>Signed in</title>
<body style="margin:0;display:grid;place-items:center;height:100vh;font:500 15px system-ui,sans-serif;color:#0008">
<p>Signed in, you can close this window.</p>
<script>
const to = ${to};
try { new BroadcastChannel("shrink-auth").postMessage({ to }); } catch {}
window.close();
setTimeout(() => location.replace(to), 300);
</script>`;
  return new Response(html, { headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store" } });
}
