"use client";

import Image from "next/image";

import type { Badge } from "@/lib/program";

const SLABS = 14;

function Face({ className, tint = false, children }: { className: string; tint?: boolean; children: React.ReactNode }) {
  return (
    <span className={`badge-face block ${className}`}>
      <Image src="/design/skill-badge.svg" alt="" fill sizes="(min-width: 640px) 12vw, 45vw" className="pointer-events-none select-none" />
      {tint && <span aria-hidden className="badge-tint" />}
      <span aria-hidden className="badge-fade" />
      {children}
    </span>
  );
}

export default function BadgePicker({
  badges,
  selected,
  onToggle,
}: {
  badges: Badge[];
  selected: Set<string>;
  onToggle: (slug: string) => void;
}) {
  return (
    <ul className="grid grid-cols-2 gap-x-3 gap-y-5 sm:grid-cols-4">
      {badges.map((b) => {
        const on = selected.has(b.slug);
        return (
          <li key={b.slug}>
            <label data-on={on || undefined} className="badge-claim block cursor-pointer">
              <input type="checkbox" name="badge" value={b.slug} checked={on} onChange={() => onToggle(b.slug)} className="sr-only" />
              <span className="badge-lift relative z-0 block aspect-[91/88] w-full [perspective:900px] @container">
                <span className="badge-card relative block size-full">
                  <Face className="badge-face-front">
                    <span className="absolute inset-x-0 top-[34%] flex flex-col items-center gap-[0.45em] px-[6%] text-center font-mono text-[15.4cqw] font-medium leading-none tracking-[-0.1em] text-black">
                      <span className="w-full truncate">{b.title}</span>
                      <span className="rounded-[0.2em] bg-black px-[0.35em] py-[0.15em] text-[0.71em] leading-none text-white">+{b.bites} BITES</span>
                    </span>
                  </Face>

                  {Array.from({ length: SLABS }, (_, i) => (
                    <span key={i} aria-hidden className="badge-slab block" style={{ "--i": i, "--n": SLABS } as React.CSSProperties} />
                  ))}

                  <Face className="badge-face-back" tint>
                    <span
                      aria-hidden
                      className="absolute inset-x-0 top-[34%] flex flex-col items-center gap-[0.45em] px-[6%] text-center font-mono text-[15.4cqw] font-medium leading-none tracking-[-0.1em] text-black"
                    >
                      <span className="w-full truncate">{b.title}</span>
                      <span className="rounded-[0.2em] bg-black px-[0.35em] py-[0.15em] font-pixel text-[0.71em] leading-none tracking-normal text-accent">
                        claimed
                      </span>
                    </span>
                  </Face>
                </span>
              </span>
              <span className="relative z-10 mt-1 block px-1 text-center text-xs font-medium leading-snug text-black/55">{b.desc}</span>
            </label>
          </li>
        );
      })}
    </ul>
  );
}
