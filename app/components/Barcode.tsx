"use client";

import { useMemo } from "react";

import { MAX_URI_BYTES } from "@/lib/program";

export default function Barcode({ value }: { value: string }) {
  const bars = useMemo(() => {
    const src = value || "data:text/html,";
    const count = Math.round(40 + (Math.min(src.length, MAX_URI_BYTES) / MAX_URI_BYTES) * 110);
    const out: { x: number; w: number }[] = [];
    let x = 0;
    for (let i = 0; i < count; i++) {
      const chunk = src.slice(Math.floor((i * src.length) / count), Math.floor(((i + 1) * src.length) / count)) || src[i % src.length];
      let h = 2166136261;
      for (let j = 0; j < chunk.length; j++) h = Math.imul(h ^ chunk.charCodeAt(j), 16777619);
      h ^= i * 2654435761;
      const w = (h >>> 3) % 3 + 1;
      out.push({ x, w });
      x += w + ((h >>> 7) % 3) + 1;
    }
    return { out, width: Math.max(x, 1) };
  }, [value]);

  return (
    <div className="border-t-2 border-dashed border-panel-border px-5 pb-4 pt-3">
      <svg
        aria-hidden
        viewBox={`0 0 ${bars.width} 40`}
        preserveAspectRatio="none"
        className={`h-10 w-full ${value ? "text-black" : "text-black/15"}`}
      >
        {bars.out.map((b, i) => (
          <rect key={i} x={b.x} y={0} width={b.w} height={40} fill="currentColor" />
        ))}
      </svg>
    </div>
  );
}
