"use client";

import { useEffect, useRef, useState } from "react";
import PixelButton from "./PixelButton";

const STEPS = [
  "Copy the URL below.",
  "Open a new tab.",
  "Paste it into the address bar and hit Enter.",
];

type Props = {
  open: boolean;
  onClose: () => void;
  uri: string;
  title?: string;
};

export default function UriDialog({
  open,
  onClose,
  uri,
  title = "Try it yourself",
}: Props) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const d = dialogRef.current;
    if (!d) return;
    if (open && !d.open) d.showModal();
    if (!open && d.open) d.close();
  }, [open]);

  useEffect(() => {
    if (!copied) return;
    const t = setTimeout(() => setCopied(false), 1800);
    return () => clearTimeout(t);
  }, [copied]);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(uri);
      setCopied(true);
    } catch {
      const el = dialogRef.current?.querySelector("[data-uri]");
      if (el) {
        const range = document.createRange();
        range.selectNodeContents(el);
        const sel = window.getSelection();
        sel?.removeAllRanges();
        sel?.addRange(range);
      }
    }
  };

  return (
    <dialog
      ref={dialogRef}
      onClose={onClose}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      className="m-auto max-h-[90svh] w-[min(92vw,720px)] overflow-y-auto border-[3px] border-black bg-white p-0 text-black outline outline-[3px] outline-white backdrop:bg-black/70"
    >
      <div className="flex items-center justify-between gap-4 border-b-[3px] border-black px-5 py-3">
        <p className="font-pixel text-lg sm:text-2xl">{title}</p>
        <PixelButton variant="dark" className="text-sm sm:text-base" onClick={onClose}>
          Close
        </PixelButton>
      </div>

      <div className="flex flex-col gap-5 px-5 py-5">
        <ol className="flex flex-col gap-2 font-mono text-sm sm:text-base">
          {STEPS.map((step, i) => (
            <li key={step} className="flex gap-3">
              <span className="font-pixel shrink-0 text-black/50">{i + 1}.</span>
              <span>{step}</span>
            </li>
          ))}
        </ol>

        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between gap-3">
            <span className="font-pixel text-base text-black/60 sm:text-lg">
              the URL
            </span>
            <PixelButton
              variant="dark"
              onClick={copy}
              className="text-sm sm:text-base"
              aria-live="polite"
            >
              {copied ? "Copied!" : "Copy"}
            </PixelButton>
          </div>
          <pre
            data-uri
            onCopy={(e) => {
              e.clipboardData.setData("text/plain", uri);
              e.preventDefault();
            }}
            className="max-h-[9.5rem] overflow-auto border-[3px] border-black bg-card p-3 font-mono text-xs leading-relaxed break-all whitespace-pre-wrap select-all sm:text-sm"
          >
            {uri}
          </pre>
        </div>
      </div>
    </dialog>
  );
}
