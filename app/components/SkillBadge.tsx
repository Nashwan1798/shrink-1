"use client";

import Image from "next/image";
import { useState } from "react";

type Props = { title: string; bites: number; desc: string };

// ~one per 2px of --depth (globals.css), or gaps show edge-on.
const SLABS = 14;

function Face({ className, children }: { className: string; children: React.ReactNode }) {
  return (
    <div className={`badge-face ${className}`}>
      <Image
        src="/design/skill-badge.svg"
        alt=""
        fill
        sizes="(min-width: 640px) 25vw, 50vw"
        className="pointer-events-none select-none"
      />
      <div className="badge-fade" aria-hidden />
      {children}
    </div>
  );
}

export default function SkillBadge({ title, bites, desc }: Props) {
  const [open, setOpen] = useState(false);

  return (
    <button
      type="button"
      aria-pressed={open}
      aria-label={`${title}: +${bites} BITES. ${desc}`}
      onClick={() => setOpen((v) => !v)}
      onBlur={() => setOpen(false)}
      data-open={open || undefined}
      className="group relative aspect-[91/88] w-full cursor-pointer text-left [perspective:900px] @container focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-black"
    >
      <div className="badge-card relative size-full">
        <Face className="badge-face-front">
          <div className="absolute inset-x-0 top-[38%] flex flex-col items-center gap-[0.45em] px-[6%] text-center font-mono text-[15.4cqw] font-medium leading-none tracking-[-0.1em] text-black">
            <p className="w-full truncate">{title}</p>
            <p className="rounded-[0.2em] bg-black px-[0.35em] py-[0.15em] text-[0.71em] leading-none text-white">
              +{bites} BITES
            </p>
          </div>
        </Face>

        {Array.from({ length: SLABS }, (_, i) => (
          <div
            key={i}
            aria-hidden
            className="badge-slab"
            style={{ "--i": i, "--n": SLABS } as React.CSSProperties}
          />
        ))}

        <Face className="badge-face-back">
          <div
            aria-hidden
            className="absolute inset-x-0 top-[32%] flex flex-col items-center gap-[0.6em] px-[9%] text-center font-mono text-[8cqw] font-medium leading-[1.2] tracking-[-0.04em] text-black/80"
          >
            <p>{desc}</p>
            <p className="rounded-[0.2em] bg-black px-[0.35em] py-[0.15em] text-[1.35em] leading-none tracking-[-0.1em] text-white">
              +{bites} BITES
            </p>
          </div>
        </Face>
      </div>
    </button>
  );
}
