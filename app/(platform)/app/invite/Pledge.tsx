"use client";

import { useActionState, useState } from "react";

import PixelButton from "@/app/components/PixelButton";
import { Notice } from "@/app/components/ui/bits";
import { REFERRAL_PLEDGE, pledgeMatches } from "@/lib/program";

import { pledgeAction, type PledgeState } from "./actions";

export default function Pledge() {
  const [typed, setTyped] = useState("");
  const [state, action, pending] = useActionState<PledgeState, FormData>(pledgeAction, { error: null });
  const ok = pledgeMatches(typed);

  return (
    <form action={action} className="flex flex-col gap-3">
      <label htmlFor="pledge" className="font-semibold tracking-tight">
        type this out to get your link
      </label>
      {/* Not selectable so it has to be typed, not pasted from the page. */}
      <p aria-hidden className="select-none rounded-[8px] border-2 border-dashed border-panel-border bg-white px-3 py-2.5 font-mono text-sm leading-relaxed">
        {REFERRAL_PLEDGE}
      </p>
      <input
        id="pledge"
        name="pledge"
        value={typed}
        onChange={(e) => setTyped(e.target.value)}
        onPaste={(e) => e.preventDefault()}
        onDrop={(e) => e.preventDefault()}
        autoComplete="off"
        spellCheck={false}
        aria-describedby="pledge-hint"
        aria-invalid={typed.length > 0 && !ok && !REFERRAL_PLEDGE.toLowerCase().startsWith(typed.toLowerCase().replace(/\s+/g, " ").trimStart()) ? true : undefined}
        placeholder={REFERRAL_PLEDGE}
        className="input font-mono text-sm"
      />
      <span id="pledge-hint" className="sr-only">
        Type: {REFERRAL_PLEDGE}
      </span>
      {state.error && <Notice>{state.error}</Notice>}
      <div>
        <PixelButton type="submit" variant="dark" disabled={!ok || pending} className="text-[1.05rem]">
          {pending ? "making it…" : "get my link →"}
        </PixelButton>
      </div>
    </form>
  );
}
