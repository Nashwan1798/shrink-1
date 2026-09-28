"use client";

import { useActionState } from "react";

import { airtableSyncAction, type AdminState } from "./actions";

export default function AirtableSync() {
  const [state, action, pending] = useActionState<AdminState, FormData>(airtableSyncAction, { error: null });
  return (
    <form action={action} className="flex items-center gap-2">
      {(state.error || state.ok) && (
        <span className={`text-xs ${state.error ? "text-[#c1121f]" : "text-black/50"}`}>{state.error ?? state.ok}</span>
      )}
      <button type="submit" disabled={pending} className="rounded-[4px] px-2 py-1 text-black/60 hover:bg-black/5 disabled:opacity-50">
        {pending ? "syncing…" : "sync airtable"}
      </button>
    </form>
  );
}
