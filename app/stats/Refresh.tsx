"use client";

import { useActionState } from "react";

import { refreshStatsAction, type RefreshState } from "./actions";

const btn =
  "font-pixel border border-white/30 px-3 py-1.5 text-[0.95rem] leading-none text-white/80 transition-colors hover:border-accent hover:text-accent disabled:opacity-40";

export default function Refresh({ lastRefreshed }: { lastRefreshed: string | null }) {
  const [state, action, pending] = useActionState<RefreshState, FormData>(refreshStatsAction, { error: null });
  return (
    <form action={action} className="flex flex-wrap items-center gap-3">
      <span className="font-mono text-xs text-white/45">
        {lastRefreshed ? `hackatime read ${lastRefreshed}` : "hackatime not read yet"}
      </span>
      <button type="submit" name="scope" value="recent" disabled={pending} className={btn}>
        {pending ? "reading…" : "refresh today"}
      </button>
      <button type="submit" name="scope" value="program" disabled={pending} className={btn}>
        backfill program
      </button>
      {(state.error || state.ok) && (
        <span className={`font-mono text-xs ${state.error ? "text-[#ff6b6b]" : "text-white/60"}`}>{state.error ?? state.ok}</span>
      )}
    </form>
  );
}
