"use client";

import { usePathname } from "next/navigation";

const STEPS = ["/welcome", "/welcome/setup", "/welcome/rules"];

export default function Steps() {
  const current = STEPS.indexOf(usePathname().replace(/\/$/, ""));
  return (
    <ol aria-label="setup progress" className="mb-8 flex gap-1.5">
      {STEPS.map((s, i) => (
        <li
          key={s}
          aria-current={i === current ? "step" : undefined}
          className={`h-1.5 flex-1 rounded-full ${i < current ? "bg-black" : i === current ? "size-bar" : "bg-black/10"}`}
        />
      ))}
    </ol>
  );
}
