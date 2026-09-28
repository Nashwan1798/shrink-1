"use client";

import { useActionState, useState } from "react";

import PixelButton from "@/app/components/PixelButton";
import { when } from "@/app/components/ui/bits";

import { orderHandleAction, revealAddressAction, type AdminState } from "../actions";

type Row = {
  id: string;
  number: number;
  reward: string;
  digital: boolean;
  cost: number;
  state: "placed" | "fulfilled" | "rejected";
  note: string | null;
  internalNote: string | null;
  createdAt: string;
  user: { id: string; displayName: string; email: string; slackId: string | null };
};

export default function OrdersTable({ rows }: { rows: Row[] }) {
  const [filter, setFilter] = useState<"placed" | "all">("placed");
  const shown = filter === "placed" ? rows.filter((r) => r.state === "placed") : rows;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex gap-1 text-[0.95rem] font-medium">
        {(["placed", "all"] as const).map((f) => (
          <button key={f} type="button" onClick={() => setFilter(f)} className={`rounded-[4px] px-2 py-1 ${filter === f ? "bg-black text-white" : "text-black/60 hover:bg-black/5"}`}>
            {f === "placed" ? "to fulfil" : "everything"}
          </button>
        ))}
      </div>
      {shown.length === 0 ? (
        <p className="font-medium text-black/50">Nothing here.</p>
      ) : (
        <ul className="flex flex-col gap-3">
          {shown.map((r) => (
            <OrderRow key={r.id} row={r} />
          ))}
        </ul>
      )}
    </div>
  );
}

function OrderRow({ row }: { row: Row }) {
  const [handle, handleAction, handlePending] = useActionState<AdminState, FormData>(orderHandleAction, { error: null });
  const [reveal, revealAction, revealPending] = useActionState<AdminState, FormData>(revealAddressAction, { error: null });
  const a = reveal.address;
  const pill = { placed: "pill-pending", fulfilled: "pill-approved", rejected: "pill-rejected" }[row.state];

  return (
    <li className="card flex flex-col gap-3 bg-white px-4 py-3">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="font-semibold tracking-tight">
            {row.reward} <span className="font-mono text-xs text-black/50">#{row.number} · {row.cost} BITES · {when(new Date(row.createdAt))}</span>
          </p>
          <p className="font-mono text-xs text-black/60">
            {row.user.displayName} · {row.user.email}
            {row.user.slackId && (
              <>
                {" "}
                ·{" "}
                <a href={`https://hackclub.slack.com/team/${row.user.slackId}`} target="_blank" rel="noreferrer" className="underline">
                  slack
                </a>
              </>
            )}
          </p>
          {row.note && <p className="mt-1 text-sm font-medium">&ldquo;{row.note}&rdquo;</p>}
          {row.internalNote && <p className="mt-1 font-mono text-xs text-black/50">internal: {row.internalNote}</p>}
        </div>
        <span className={`pill ${pill}`}>{row.state}</span>
      </div>

      {!row.digital && (
        <div className="flex flex-wrap items-center gap-3">
          {a ? (
            <address className="rounded-[6px] border-2 border-black bg-card px-3 py-2 font-mono text-xs not-italic leading-relaxed">
              {a.recipient}
              <br />
              {a.line1}
              {a.line2 && (
                <>
                  <br />
                  {a.line2}
                </>
              )}
              <br />
              {a.city}
              {a.region && `, ${a.region}`} {a.postcode}
              <br />
              {a.country}
              {a.phone && (
                <>
                  <br />
                  {a.phone}
                </>
              )}
            </address>
          ) : (
            <form action={revealAction}>
              <input type="hidden" name="order_id" value={row.id} />
              <button type="submit" disabled={revealPending} className="text-sm font-medium underline decoration-1 underline-offset-[0.2em] hover:decoration-2">
                {revealPending ? "…" : "reveal address (logged)"}
              </button>
            </form>
          )}
          {reveal.error && <span className="font-mono text-xs text-[#c1121f]">{reveal.error}</span>}
        </div>
      )}

      {row.state === "placed" && (
        <form action={handleAction} className="flex flex-wrap items-end gap-2 border-t-2 border-panel-border pt-3">
          <input type="hidden" name="order_id" value={row.id} />
          <div className="min-w-[200px] flex-1">
            <label className="label" htmlFor={`note-${row.id}`}>
              note · shown to them if cancelled
            </label>
            <input id={`note-${row.id}`} name="internal_note" className="input py-1 text-sm" placeholder="out of stock, sorry" />
          </div>
          <PixelButton type="submit" name="action" value="fulfil" disabled={handlePending} className="text-[0.85rem]">
            shipped ✓
          </PixelButton>
          <PixelButton type="submit" name="action" value="reject" variant="dark" disabled={handlePending} className="text-[0.85rem]">
            cancel &amp; refund
          </PixelButton>
          {handle.error && <span className="font-mono text-xs text-[#c1121f]">{handle.error}</span>}
          {handle.ok && <span className="font-mono text-xs">{handle.ok}</span>}
        </form>
      )}
    </li>
  );
}
