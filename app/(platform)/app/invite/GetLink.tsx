"use client";

import { useEffect, useRef, useState } from "react";

import PixelButton from "@/app/components/PixelButton";

import Pledge from "./Pledge";
import Rules from "./RuleList";

// Once the pledge goes through, the page re-renders with the link and this unmounts.
export default function GetLink() {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) d.showModal();
    if (!open && d.open) d.close();
  }, [open]);

  return (
    <>
      <PixelButton variant="dark" className="text-[0.95rem]" onClick={() => setOpen(true)}>
        Get my link!
      </PixelButton>
      <dialog
        ref={ref}
        onClose={() => setOpen(false)}
        onClick={(e) => {
          if (e.target === e.currentTarget) setOpen(false);
        }}
        aria-labelledby="get-link-title"
        className="m-auto max-h-[90svh] w-[min(92vw,640px)] overflow-y-auto rounded-[12px] border-2 border-black bg-white p-0 text-black backdrop:bg-black/70"
      >
        <header className="sticky top-0 z-10 flex items-center justify-between gap-4 bg-ink px-4 py-2.5 text-white">
          <h2 id="get-link-title" className="font-pixel text-[1.1rem] leading-none">
            read these first
          </h2>
          <button
            type="button"
            onClick={() => setOpen(false)}
            aria-label="Close"
            className="grid size-7 place-content-center rounded-[4px] font-pixel text-[1.1rem] leading-none text-white/70 hover:bg-white/15 hover:text-white"
          >
            ×
          </button>
        </header>
        <div className="flex flex-col gap-6 px-4 py-5">
          <Rules compact />
          <div className="border-t-2 border-panel-border pt-5">
            {open && <Pledge />}
          </div>
        </div>
      </dialog>
    </>
  );
}
