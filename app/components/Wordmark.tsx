"use client";

import { useEffect, useRef, useState } from "react";
import { LETTERS, LOGO_H, LOGO_W } from "./shrink-letters";

const HOVER_MAX = 1.55;
const HOVER_MIN = 0.82;
const PRESS_NEAR = 0.5;
const PRESS_FAR = 1.06;
const WAVE_SIGMA = 0.15; // falloff, as a fraction of the word width
const LOAD_SPREAD = 1.7;
const STAGGER_MS = 45;

const STIFFNESS = 210;
const DAMPING = 22;
const LOAD_DAMPING = 11;

const BASE_W = LETTERS.map((l) => l.w / LOGO_W);
const BASE_X = LETTERS.map((l) => l.x / LOGO_W);
const CENTERS = LETTERS.map((l) => (l.x + l.w / 2) / LOGO_W);

function Plate({
  side,
  visible,
  refEl,
}: {
  side: "left" | "right";
  visible: boolean;
  refEl: React.Ref<HTMLDivElement>;
}) {
  const flip = side === "left";
  const fade = flip ? "to left" : "to right";
  return (
    <div
      ref={refEl}
      aria-hidden
      className={`pointer-events-none absolute top-1/2 hidden h-[109.5%] -translate-y-1/2 will-change-transform sm:block ${
        flip ? "right-[100.5%]" : "left-[100.5%]"
      }`}
      style={{
        width: "max(calc(50vw - 50cqw + 8px), 30cqw)",
        maskImage: `linear-gradient(${fade}, black 0%, black 30%, transparent 100%)`,
        WebkitMaskImage: `linear-gradient(${fade}, black 0%, black 30%, transparent 100%)`,
        opacity: visible ? 1 : 0,
        transition: "opacity 0.5s ease-out",
      }}
    >
      <div
        className={`absolute top-1/2 h-[32.5%] -translate-y-1/2 border-4 border-panel-border bg-panel ${
          flip ? "left-0 right-[calc(17.9cqw-4px)]" : "right-0 left-[calc(17.9cqw-4px)]"
        }`}
      />
      <div
        className={`absolute top-0 h-full w-[17.9cqw] border-4 border-panel-border bg-panel ${
          flip ? "right-0" : "left-0"
        }`}
      />
      <div
        className={`absolute top-1/2 h-[32.5%] -translate-y-1/2 bg-panel ${
          flip ? "left-0 right-[calc(17.9cqw-4px)]" : "right-0 left-[calc(17.9cqw-4px)]"
        }`}
        style={{
          [flip ? "borderLeft" : "borderRight"]:
            "4px solid var(--panel-border)",
          borderTop: "4px solid var(--panel-border)",
          borderBottom: "4px solid var(--panel-border)",
        }}
      />
    </div>
  );
}

export default function Wordmark({ className = "" }: { className?: string }) {
  const wordRef = useRef<HTMLHeadingElement>(null);
  const letterRefs = useRef<(SVGSVGElement | null)[]>([]);
  const leftPlate = useRef<HTMLDivElement>(null);
  const rightPlate = useRef<HTMLDivElement>(null);
  const cursor = useRef<number | null>(null); // 0..1 across the word
  const pressed = useRef(false);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const word = wordRef.current;
    if (!word) return;

    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const n = LETTERS.length;
    // Separate springs so a moving pointer never cuts the load bounce short.
    const entry = new Array(n).fill(reduce ? 1 : LOAD_SPREAD);
    const entryV = new Array(n).fill(0);
    const wave = new Array(n).fill(1);
    const waveV = new Array(n).fill(0);
    const start = performance.now();
    let last = start;
    let raf = 0;

    const waveTarget = (i: number) => {
      const c = cursor.current;
      if (c === null) return 1;
      const d = (CENTERS[i] - c) / WAVE_SIGMA;
      const g = Math.exp(-0.5 * d * d);
      return pressed.current
        ? PRESS_FAR + (PRESS_NEAR - PRESS_FAR) * g
        : HOVER_MIN + (HOVER_MAX - HOVER_MIN) * g;
    };

    const step = (cur: number[], vel: number[], i: number, t: number, damping: number, dt: number) => {
      const a = STIFFNESS * (t - cur[i]) - damping * vel[i];
      vel[i] += a * dt;
      cur[i] += vel[i] * dt;
      return Math.abs(t - cur[i]) > 1e-4 || Math.abs(vel[i]) > 1e-3;
    };

    const tick = (now: number) => {
      const dt = Math.min((now - last) / 1000, 1 / 30);
      last = now;

      let settled = true;
      for (let i = 0; i < n; i++) {
        const et = !reduce && now - start < i * STAGGER_MS ? LOAD_SPREAD : 1;
        const wt = waveTarget(i);
        if (reduce) {
          entry[i] = et;
          wave[i] = wt;
          continue;
        }
        if (step(entry, entryV, i, et, LOAD_DAMPING, dt)) settled = false;
        if (step(wave, waveV, i, wt, DAMPING, dt)) settled = false;
      }

      const W = word.offsetWidth; // base width, unaffected by transforms
      const f = entry.map((e, i) => e * wave[i]);
      let total = 0;
      for (let i = 0; i < n; i++) total += BASE_W[i] * (f[i] - 1);
      let shift = -total / 2;
      for (let i = 0; i < n; i++) {
        const el = letterRefs.current[i];
        if (el) {
          el.style.transform = `translate3d(${shift * W}px,-50%,0) scaleX(${f[i]})`;
        }
        shift += BASE_W[i] * (f[i] - 1);
      }
      const edge = (total / 2) * W;
      if (leftPlate.current) leftPlate.current.style.transform = `translate3d(${-edge}px,0,0)`;
      if (rightPlate.current) rightPlate.current.style.transform = `translate3d(${edge}px,0,0)`;

      if (!settled || cursor.current !== null || now - start < n * STAGGER_MS + 50) {
        raf = requestAnimationFrame(tick);
      } else {
        raf = 0;
      }
    };

    const kick = () => {
      if (!raf) {
        last = performance.now();
        raf = requestAnimationFrame(tick);
      }
    };

    const track = (e: PointerEvent) => {
      const r = word.getBoundingClientRect();
      if (r.width === 0) return;
      cursor.current = Math.min(1, Math.max(0, (e.clientX - r.left) / r.width));
      kick();
    };
    // Mouse hovers the wave; touch and pen only squeeze while a finger is down,
    // since they never send a leave to reset it.
    const onMove = (e: PointerEvent) => {
      if (e.pointerType === "mouse" || pressed.current) track(e);
    };
    const onLeave = (e: PointerEvent) => {
      if (e.pointerType !== "mouse") return;
      cursor.current = null;
      kick();
    };
    const onDown = (e: PointerEvent) => {
      if (e.button !== 0) return;
      pressed.current = true;
      track(e);
    };
    const onUp = (e: PointerEvent) => {
      if (!pressed.current) return;
      pressed.current = false;
      if (e.pointerType !== "mouse" || e.type === "pointercancel") cursor.current = null;
      kick();
    };

    word.addEventListener("pointermove", onMove, { passive: true });
    word.addEventListener("pointerleave", onLeave);
    word.addEventListener("pointerdown", onDown);
    window.addEventListener("pointerup", onUp);
    window.addEventListener("pointercancel", onUp);
    raf = requestAnimationFrame((t) => {
      setLoaded(true);
      tick(t);
    });

    return () => {
      word.removeEventListener("pointermove", onMove);
      word.removeEventListener("pointerleave", onLeave);
      word.removeEventListener("pointerdown", onDown);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onUp);
      if (raf) cancelAnimationFrame(raf);
    };
  }, []);

  return (
    <div
      className={`relative flex w-full justify-center @container ${className}`}
      style={{ aspectRatio: `${LOGO_W} / ${LOGO_H}` }}
    >
      <h1
        ref={wordRef}
        className="relative h-full w-full cursor-default touch-pan-y select-none"
        style={{ opacity: loaded ? 1 : 0, transition: "opacity 0.5s ease-out" }}
      >
        <Plate side="left" visible={loaded} refEl={leftPlate} />
        <Plate side="right" visible={loaded} refEl={rightPlate} />
        <span className="sr-only">SHRINK</span>
        {LETTERS.map((l, i) => (
          <svg
            key={l.char}
            ref={(el) => {
              letterRefs.current[i] = el;
            }}
            aria-hidden
            viewBox={`${l.x} ${l.y} ${l.w} ${l.h}`}
            preserveAspectRatio="none"
            className="absolute top-1/2 block origin-left fill-black will-change-transform"
            style={{
              left: `${BASE_X[i] * 100}%`,
              width: `${BASE_W[i] * 100}%`,
              height: `${(l.h / LOGO_H) * 100}%`,
              transform: `translate3d(0,-50%,0) scaleX(${LOAD_SPREAD})`,
            }}
          >
            <path d={l.d} />
          </svg>
        ))}
      </h1>
    </div>
  );
}
