"use client";

import { useEffect, useRef, useState } from "react";

import { CHECK_LABELS, DEEP_CHECKS, QUICK_CHECKS, type Check, type CheckId } from "@/lib/scan";

import { deepScanAction, quickScanAction, type ScanResult } from "./actions";

type Input = { dataUri: string; sourceUrl: string; hackatimeProjects: string[] };

export default function ScanPanel({
  input,
  active,
  onBlocked,
}: {
  input: Input;
  active: boolean;
  onBlocked: (blocked: boolean | null) => void;
}) {
  const [quick, setQuick] = useState<Check[] | null>(null);
  const [deep, setDeep] = useState<Check[] | null>(null);
  const [failed, setFailed] = useState(false);
  const [retryIn, setRetryIn] = useState<number | null>(null);
  const [showPassed, setShowPassed] = useState(false);
  const run = useRef(0);
  const key = JSON.stringify(input);

  const start = (fresh: boolean) => {
    const id = ++run.current;
    setQuick(null);
    setDeep(null);
    setFailed(false);
    setRetryIn(null);
    onBlocked(null);
    const stale = () => id !== run.current;
    const settle = (set: (c: Check[]) => void) => (r: ScanResult) => {
      if (stale()) return;
      if ("checks" in r) set(r.checks);
      else setRetryIn(r.retryInMinutes);
    };
    quickScanAction(input, fresh)
      .then(settle(setQuick))
      .catch(() => !stale() && setFailed(true));
    deepScanAction(input, fresh)
      .then(settle(setDeep))
      .catch(() => !stale() && setFailed(true));
  };

  const scanned = useRef<string | null>(null);
  useEffect(() => {
    if (!active || scanned.current === key) return;
    scanned.current = key;
    start(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active, key]);

  const all = [...(quick ?? []), ...(deep ?? [])];
  const done = quick !== null && deep !== null;
  const fails = all.filter((c) => c.status === "fail");
  const notes = all.filter((c) => c.status === "warn" || c.status === "skip");
  const passes = all.filter((c) => c.status === "pass");

  useEffect(() => {
    if (failed || retryIn !== null) onBlocked(true);
    else if (done) onBlocked(fails.length > 0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [done, failed, retryIn, fails.length]);

  const byId = new Map(all.map((c) => [c.id, c]));
  const order: CheckId[] = [...QUICK_CHECKS, ...DEEP_CHECKS];

  const summary =
    retryIn !== null
      ? "slow down a bit"
      : failed
        ? "the scan broke on our side"
        : !done
          ? "scanning…"
          : fails.length
            ? `${fails.length} thing${fails.length === 1 ? "" : "s"} to fix before you can ship`
            : notes.length
              ? `good to go, with ${notes.length} note${notes.length === 1 ? "" : "s"} for the reviewer`
              : "all clear";

  return (
    <div className="overflow-hidden rounded-[12px] border-2 border-black bg-white">
      <div className="flex items-center justify-between gap-3 border-b-2 border-black bg-ink px-4 py-2.5 text-white">
        <span className="font-pixel text-[1.1rem] leading-none">pre-ship scan</span>
        {(done || failed || retryIn !== null) && (
          <button type="button" onClick={() => start(true)} className="text-xs font-semibold text-white/70 underline underline-offset-2 hover:text-accent">
            scan again
          </button>
        )}
      </div>

      <p aria-live="polite" className={`px-4 pt-3 font-semibold tracking-tight ${done && fails.length ? "text-[#c1121f]" : ""}`}>
        {summary}
      </p>

      <ul className="px-2 pb-2 pt-1">
        {retryIn !== null && (
          <li className="px-2 py-2 text-sm font-medium text-black/60">
            That&apos;s a lot of scans. Try again in {retryIn} min.
          </li>
        )}
        {failed && (
          <li className="px-2 py-2 text-sm font-medium text-black/60">Something went wrong running the checks. Try scanning again in a minute.</li>
        )}

        {retryIn !== null ? null : !done && !failed
          ? order.map((id) => <Row key={id} id={id} check={byId.get(id)} />)
          : done && (
              <>
                {[...fails, ...notes].map((c) => (
                  <Row key={c.id} id={c.id} check={c} />
                ))}
                {passes.length > 0 && (
                  <li>
                    <button
                      type="button"
                      onClick={() => setShowPassed((v) => !v)}
                      aria-expanded={showPassed}
                      className="flex w-full items-center gap-3 rounded-[7px] px-2 py-2 text-left text-sm font-semibold text-black/60 hover:bg-black/[0.04] hover:text-black"
                    >
                      <Mark status="pass" />
                      {passes.length} passed
                      <span aria-hidden className={`ml-auto transition-transform ${showPassed ? "rotate-180" : ""}`}>
                        <Chevron />
                      </span>
                    </button>
                    {showPassed && (
                      <ul className="pl-7">
                        {passes.map((c) => (
                          <Row key={c.id} id={c.id} check={c} />
                        ))}
                      </ul>
                    )}
                  </li>
                )}
              </>
            )}
      </ul>
    </div>
  );
}

function Row({ id, check }: { id: CheckId; check: Check | undefined }) {
  return (
    <li className={`flex items-start gap-3 rounded-[7px] px-2 py-2 ${check ? "fade-in" : ""}`}>
      {check ? <Mark status={check.status} /> : <Spinner />}
      <span className="min-w-0 flex-1">
        <span className={`block text-[0.95rem] font-semibold leading-snug tracking-tight ${check ? "" : "text-black/45"}`}>
          {check?.label ?? CHECK_LABELS[id]}
          {check?.status === "pass" && check.detail && <span className="ml-2 font-mono text-xs font-normal text-black/50">{check.detail}</span>}
        </span>
        {check && check.status !== "pass" && check.detail && (
          <span className={`mt-0.5 block text-sm font-medium leading-snug ${check.status === "fail" ? "text-[#c1121f]" : "text-black/60"}`}>
            {check.detail}
            {check.fixUrl && (
              <>
                {" "}
                <a href={check.fixUrl} target="_blank" rel="noreferrer" className="whitespace-nowrap font-semibold text-black underline underline-offset-2">
                  fix it ↗
                </a>
              </>
            )}
          </span>
        )}
      </span>
    </li>
  );
}

function Mark({ status }: { status: Check["status"] }) {
  const base = "mt-[0.1em] grid size-5 shrink-0 place-content-center rounded-[4px]";
  if (status === "pass")
    return (
      <span aria-label="passed" className={`${base} bg-accent text-black`}>
        <svg aria-hidden viewBox="0 0 10 10" className="size-3 fill-current">
          <path d="M8 2h2v2H9v1H8v1H7v1H6v1H5v1H3V8H2V7H1V6H0V4h2v1h1v1h2V5h1V4h1V3h1z" />
        </svg>
      </span>
    );
  if (status === "fail")
    return (
      <span aria-label="failed" className={`${base} bg-[#c1121f] text-white`}>
        <svg aria-hidden viewBox="0 0 12 12" className="size-3 fill-current">
          <path d="M2 1h2v1h1v1h2V2h1V1h2v2H9v1H8v1H7v2h1v1h1v1h1v2H8v-1H7v-1H5v1H4v1H2V9h1V8h1V7h1V5H4V4H3V3H2z" />
        </svg>
      </span>
    );
  if (status === "warn")
    return (
      <span aria-label="note" className={`${base} border-2 border-black bg-white font-pixel text-[0.8rem] leading-none text-black`}>
        !
      </span>
    );
  return (
    <span aria-label="skipped" className={`${base} border-2 border-dashed border-panel-border text-[0.7rem] text-black/40`}>
      –
    </span>
  );
}

function Spinner() {
  return (
    <span aria-label="checking" className="mt-[0.1em] grid size-5 shrink-0 place-content-center">
      <span className="size-4 animate-spin rounded-full border-2 border-black/15 border-t-black motion-reduce:animate-none" />
    </span>
  );
}

function Chevron() {
  return (
    <svg aria-hidden viewBox="0 0 10 6" className="size-2.5 fill-current">
      <path d="M0 0h2v1h1v1h1v1h2V2h1V1h1V0h2v2H9v1H8v1H7v1H6v1H4V5H3V4H2V3H1V2H0z" />
    </svg>
  );
}
