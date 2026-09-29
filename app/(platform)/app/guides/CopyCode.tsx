"use client";

import { useEffect, useState } from "react";

export default function CopyCode({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  useEffect(() => {
    if (!copied) return;
    const t = setTimeout(() => setCopied(false), 1500);
    return () => clearTimeout(t);
  }, [copied]);

  return (
    <button
      type="button"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(text);
          setCopied(true);
        } catch {
          /* the block is selectable, so copying by hand still works */
        }
      }}
      className="font-pixel cursor-pointer rounded-[4px] px-2 py-1 text-[0.75rem] leading-none text-white/60 transition-colors hover:bg-white/10 hover:text-white"
    >
      {copied ? "copied" : "copy"}
    </button>
  );
}
