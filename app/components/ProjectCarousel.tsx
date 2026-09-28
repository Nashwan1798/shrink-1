"use client";

import { useEffect, useRef } from "react";
import ProjectCard from "./ProjectCard";

type Project = { title: string; size: string; uri?: string; thumb?: string };

const SPEED = 45; // px/s
const RESUME_AFTER = 1500; // ms
const DRAG_THRESHOLD = 5; // px

export default function ProjectCarousel({ projects }: { projects: Project[] }) {
  const ref = useRef<HTMLDivElement>(null);
  const hover = useRef(false);
  const focus = useRef(false);
  const drag = useRef<{ startX: number; lastX: number; moved: boolean } | null>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)");
    // Browsers may round scrollLeft, so the fractional position lives here.
    let pos = el.scrollLeft;
    let userAt = -Infinity;
    let last = performance.now();
    let raf = 0;

    const period = () => {
      const first = el.children[0] as HTMLElement | undefined;
      const twin = el.children[projects.length] as HTMLElement | undefined;
      return first && twin ? twin.offsetLeft - first.offsetLeft : 0;
    };

    const tick = (now: number) => {
      const dt = Math.max(0, Math.min((now - last) / 1000, 1 / 20));
      last = now;

      if (Math.abs(el.scrollLeft - pos) > 2) {
        pos = el.scrollLeft;
        userAt = now;
      }

      const paused =
        reduce.matches ||
        hover.current ||
        focus.current ||
        drag.current ||
        now - userAt < RESUME_AFTER ||
        document.querySelector("dialog[open]");
      if (!paused) pos += SPEED * dt;

      const p = period();
      if (p > 0) {
        if (pos >= p) pos -= p;
        else if (pos < 1) pos += p;
      }
      if (Math.abs(el.scrollLeft - pos) > 0.5) el.scrollLeft = pos;
      raf = requestAnimationFrame(tick);
    };

    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [projects.length]);

  return (
    <div
      ref={ref}
      className="no-scrollbar marquee-fade -mx-[var(--gutter)] mt-[calc(clamp(1.25rem,1.8vw,34px)-8px)] flex cursor-grab gap-[clamp(12px,1.25vw,24px)] overflow-x-auto px-[var(--gutter)] py-2 select-none active:cursor-grabbing"
      onPointerEnter={(e) => {
        if (e.pointerType === "mouse") hover.current = true;
      }}
      onPointerLeave={() => {
        hover.current = false;
      }}
      onFocus={(e) => {
        // Only keyboard focus pauses; a click focuses the card too.
        focus.current = (e.target as HTMLElement).matches(":focus-visible");
      }}
      onBlur={() => {
        focus.current = false;
      }}
      onPointerDown={(e) => {
        if (e.pointerType !== "mouse" || e.button !== 0) return;
        drag.current = { startX: e.clientX, lastX: e.clientX, moved: false };
      }}
      onPointerMove={(e) => {
        const d = drag.current;
        if (!d) return;
        if (!d.moved && Math.abs(e.clientX - d.startX) > DRAG_THRESHOLD) {
          d.moved = true;
          e.currentTarget.setPointerCapture(e.pointerId);
        }
        if (d.moved) e.currentTarget.scrollLeft -= e.clientX - d.lastX;
        d.lastX = e.clientX;
      }}
      onPointerUp={() => {
        // Keep the drag for this tick so the click below can see it.
        const d = drag.current;
        setTimeout(() => {
          if (drag.current === d) drag.current = null;
        });
      }}
      onPointerCancel={() => {
        drag.current = null;
      }}
      onDragStart={(e) => e.preventDefault()}
      onClickCapture={(e) => {
        if (drag.current?.moved) {
          e.preventDefault();
          e.stopPropagation();
        }
      }}
    >
      {[0, 1].flatMap((copy) =>
        projects.map((p) => (
          <div key={`${copy}-${p.title}`} className="w-[clamp(220px,22vw,300px)] shrink-0">
            <ProjectCard {...p} tabIndex={copy === 1 ? -1 : undefined} />
          </div>
        )),
      )}
    </div>
  );
}
