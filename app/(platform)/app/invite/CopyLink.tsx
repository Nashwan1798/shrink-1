"use client";

import { useEffect, useState } from "react";

import PixelButton from "@/app/components/PixelButton";

export default function CopyLink({ url, className = "" }: { url: string; className?: string }) {
  const [copied, setCopied] = useState(false);
  useEffect(() => {
    if (!copied) return;
    const t = setTimeout(() => setCopied(false), 1800);
    return () => clearTimeout(t);
  }, [copied]);

  return (
    <div className={`flex items-stretch gap-2 ${className}`}>
      <input
        readOnly
        value={url.replace(/^https?:\/\//, "")}
        onFocus={(e) => e.currentTarget.select()}
        aria-label="your invite link"
        className="input min-w-0 flex-1 font-mono text-sm"
      />
      <PixelButton
        variant="dark"
        className="shrink-0 text-[0.8rem]"
        onClick={async () => {
          try {
            await navigator.clipboard.writeText(url);
            setCopied(true);
          } catch {
            /* the input selects itself on focus as a fallback */
          }
        }}
      >
        {copied ? "copied!" : "copy"}
      </PixelButton>
    </div>
  );
}
