"use client";

import { useEffect, useState } from "react";

import PixelButton from "@/app/components/PixelButton";

export default function CopyUri({ uri }: { uri: string }) {
  const [copied, setCopied] = useState(false);
  useEffect(() => {
    if (!copied) return;
    const t = setTimeout(() => setCopied(false), 1800);
    return () => clearTimeout(t);
  }, [copied]);

  return (
    <div className="card overflow-hidden bg-white">
      <div className="flex items-center justify-between gap-3 border-b-2 border-panel-border px-3 py-2">
        <span className="font-mono text-xs text-black/60">paste into a new tab&rsquo;s address bar to run it full size</span>
        <PixelButton
          variant="dark"
          className="text-[0.75rem]"
          onClick={async () => {
            try {
              await navigator.clipboard.writeText(uri);
              setCopied(true);
            } catch {
              /* select-all on the pre below is the fallback */
            }
          }}
        >
          {copied ? "copied!" : "copy"}
        </PixelButton>
      </div>
      <pre className="max-h-40 overflow-auto p-3 font-mono text-xs leading-relaxed break-all whitespace-pre-wrap select-all">{uri}</pre>
    </div>
  );
}
