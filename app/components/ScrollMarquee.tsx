"use client";

import { useEffect, useRef } from "react";

type Props = { text: string; className?: string };

const STIFFNESS = 120;
const DAMPING = 18;
const SCROLL_FACTOR = 0.6; // px of travel per px of scroll
const START_OFFSET = -82;

export default function ScrollMarquee({ text, className = "" }: Props) {
  const trackRef = useRef<HTMLDivElement>(null);
  const spanRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const track = trackRef.current;
    const span = spanRef.current;
    if (!track || !span) return;

    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    let x = START_OFFSET;
    let v = 0;
    let target = START_OFFSET;
    let last = performance.now();
    let raf = 0;

    const onScroll = () => {
      target = START_OFFSET - window.scrollY * SCROLL_FACTOR;
    };

    const tick = (now: number) => {
      const dt = Math.min((now - last) / 1000, 1 / 30);
      last = now;

      if (reduce) {
        x = target;
      } else {
        const a = STIFFNESS * (target - x) - DAMPING * v;
        v += a * dt;
        x += v * dt;
      }

      const period = span.offsetWidth || 1;
      const wrapped = ((x % period) + period) % period - period;
      track.style.transform = `translate3d(${wrapped}px,0,0)`;

      raf = requestAnimationFrame(tick);
    };

    onScroll();
    x = target;
    window.addEventListener("scroll", onScroll, { passive: true });
    raf = requestAnimationFrame(tick);

    return () => {
      window.removeEventListener("scroll", onScroll);
      cancelAnimationFrame(raf);
    };
  }, []);

  return (
    <div
      aria-label={text}
      role="img"
      className={`overflow-hidden ${className}`}
    >
      <div
        ref={trackRef}
        className="flex w-max whitespace-nowrap will-change-transform"
      >
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            ref={i === 0 ? spanRef : undefined}
            aria-hidden={i > 0}
            className="text-fade pr-[1ch]"
          >
            {text}
          </span>
        ))}
      </div>
    </div>
  );
}
