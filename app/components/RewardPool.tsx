"use client";

import Image from "next/image";
import { useEffect, useRef } from "react";

import type { Reward } from "@/lib/program";
export type { Reward };

const DAMP = 0.04; // per-second velocity retention
const SEP = 2600;
const LEAN = 0.05; // deg per px/s
const SLEEP = 3; // px/s
const BOUNCE = 0.3;
type Body = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  w: number;
  h: number;
  r: number;
  ang: number;
};

export default function RewardPool({ rewards }: { rewards: Reward[] }) {
  const poolRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const pool = poolRef.current;
    if (!pool) return;
    const els = Array.from(pool.children) as HTMLElement[];
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    let W = pool.clientWidth;
    let H = pool.clientHeight;
    let pad = 0;
    const bodies: Body[] = rewards.map((r, i) => ({
      x: 0,
      y: 0,
      vx: 0,
      vy: 0,
      w: 0,
      h: 0,
      r: 0,
      ang: r.tilt,
    }));

    const layout = (first: boolean) => {
      W = pool.clientWidth;
      pad = Math.max(16, W * 0.03);
      const cols = Math.max(3, Math.min(rewards.length, Math.round(W / 160)));
      const rows = Math.ceil(rewards.length / cols);
      const hs: number[] = [];
      rewards.forEach((r, i) => {
        const b = bodies[i];
        const ar = r.w && r.h ? r.w / r.h : 4 / 3;
        const long = Math.max(64, W * r.size * (W < 640 ? 2.2 : 1));
        const w = Math.min(r.w ?? Infinity, ar >= 1 ? long : long * ar);
        b.w = w;
        b.h = w / ar;
        b.h += 48; // the label (up to two lines) and cost chip hang below the image
        b.r = Math.max(b.w, b.h) * 0.5 + 6; // + the white outline
        hs.push(b.h);
        els[i].style.width = `${w}px`;
      });
      hs.sort((p, q) => p - q);
      const rowH = hs[hs.length >> 1] * 1.2 + 12;
      const want = Math.round(rows * rowH + 2 * pad);
      if (Math.abs(pool.clientHeight - want) > 1) pool.style.height = `${want}px`;
      H = pool.clientHeight;
      rewards.forEach((r, i) => {
        const b = bodies[i];
        if (first) {
          const rw = (i / cols) | 0;
          const inRow = Math.min(cols, rewards.length - rw * cols);
          const c = (i % cols) + (cols - inRow) / 2;
          b.x = pad + ((c + 0.5) / cols) * (W - 2 * pad) + Math.sin(i * 3.1) * W * 0.03;
          b.y = pad + ((rw + 0.5) / rows) * (H - 2 * pad) + Math.cos(i * 2.3) * H * 0.06;
        }
        b.x = Math.min(Math.max(b.x, pad + b.r), W - pad - b.r);
        b.y = Math.min(Math.max(b.y, pad + b.r), H - pad - b.r);
      });
    };
    layout(true);

    const draw = () => {
      bodies.forEach((b, i) => {
        els[i].style.transform = `translate3d(${b.x - b.w / 2}px,${b.y - b.h / 2}px,0) rotate(${b.ang}deg)`;
        els[i].style.setProperty("--ang", `${b.ang}deg`);
        const half = 110 + 8;
        const dx = Math.min(0, W - (b.x + half)) + Math.max(0, half - b.x);
        els[i].style.setProperty("--tipdx", `${dx}px`);
      });
    };
    draw();

    const ro = new ResizeObserver(() => {
      layout(false);
      draw();
    });
    ro.observe(pool);

    if (reduce) return () => ro.disconnect();

    let held: { i: number; dx: number; dy: number; px: number; py: number; t: number } | null = null;
    const local = (e: PointerEvent) => {
      const rect = pool.getBoundingClientRect();
      return { x: e.clientX - rect.left, y: e.clientY - rect.top };
    };

    const onMove = (e: PointerEvent) => {
      if (held) {
        const p = local(e);
        const b = bodies[held.i];
        const now = performance.now();
        const dt = Math.max((now - held.t) / 1000, 1 / 240);
        const nx = p.x - held.dx;
        const ny = p.y - held.dy;
        b.vx = (nx - b.x) / dt;
        b.vy = (ny - b.y) / dt;
        b.x = nx;
        b.y = ny;
        held.t = now;
      }
    };
    const onDown = (e: PointerEvent) => {
      const i = els.findIndex((el) => el.contains(e.target as Node));
      if (i < 0 || e.button !== 0) return;
      const p = local(e);
      const b = bodies[i];
      held = { i, dx: p.x - b.x, dy: p.y - b.y, px: p.x, py: p.y, t: performance.now() };
      els[i].setPointerCapture(e.pointerId);
      els[i].style.zIndex = "10";
      els[i].dataset.held = "";
    };
    const onUp = () => {
      if (!held) return;
      const el = els[held.i];
      el.style.zIndex = "";
      delete el.dataset.held;
      const b = bodies[held.i];
      const s = Math.hypot(b.vx, b.vy);
      if (s > 1200) {
        b.vx *= 1200 / s;
        b.vy *= 1200 / s;
      }
      held = null;
    };

    pool.addEventListener("pointermove", onMove);
    pool.addEventListener("pointerdown", onDown);
    pool.addEventListener("pointerup", onUp);
    pool.addEventListener("pointercancel", onUp);

    let last = performance.now();
    let raf = 0;
    const io = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;
        io.disconnect();
        bodies.forEach((b) => {
          const a = Math.random() * Math.PI * 2;
          const v = 60 + Math.random() * 60;
          b.vx += Math.cos(a) * v;
          b.vy += Math.sin(a) * v;
        });
        last = performance.now();
        raf = requestAnimationFrame(tick);
      },
      { threshold: 0.2 },
    );
    const tick = (now: number) => {
      const dt = Math.min((now - last) / 1000, 1 / 30);
      last = now;
      const damp = Math.pow(DAMP, dt);

      bodies.forEach((b, i) => {
        if (held?.i === i) return;

        for (let j = i + 1; j < bodies.length; j++) {
          const o = bodies[j];
          const dx = b.x - o.x;
          const dy = b.y - o.y;
          const d = Math.hypot(dx, dy) || 0.01;
          const min = (b.r + o.r) * 0.85;
          if (d < min) {
            const f = ((min - d) / min) * SEP * dt;
            const ux = dx / d;
            const uy = dy / d;
            b.vx += ux * f;
            b.vy += uy * f;
            if (held?.i !== j) {
              o.vx -= ux * f;
              o.vy -= uy * f;
            }
          }
        }

        b.vx *= damp;
        b.vy *= damp;
        if (Math.hypot(b.vx, b.vy) < SLEEP) b.vx = b.vy = 0;
        b.x += b.vx * dt;
        b.y += b.vy * dt;

        const x0 = pad + b.r;
        const x1 = W - pad - b.r;
        const y0 = pad + b.r;
        const y1 = H - pad - b.r;
        if (b.x < x0) (b.x = x0), (b.vx = Math.abs(b.vx) * BOUNCE);
        if (b.x > x1) (b.x = x1), (b.vx = -Math.abs(b.vx) * BOUNCE);
        if (b.y < y0) (b.y = y0), (b.vy = Math.abs(b.vy) * BOUNCE);
        if (b.y > y1) (b.y = y1), (b.vy = -Math.abs(b.vy) * BOUNCE);

        const target = rewards[i].tilt + b.vx * LEAN;
        b.ang += (target - b.ang) * Math.min(1, dt * 6);
        if (Math.abs(target - b.ang) < 0.05) b.ang = target;
      });

      draw();
      raf = requestAnimationFrame(tick);
    };
    io.observe(pool);

    return () => {
      cancelAnimationFrame(raf);
      io.disconnect();
      ro.disconnect();
      pool.removeEventListener("pointermove", onMove);
      pool.removeEventListener("pointerdown", onDown);
      pool.removeEventListener("pointerup", onUp);
      pool.removeEventListener("pointercancel", onUp);
    };
  }, [rewards]);

  return (
    <div
      ref={poolRef}
      className="reward-pool relative h-[400px] w-full"
      aria-label="Prizes you can trade BITES for"
      role="list"
    >
      {rewards.map((r, i) => (
        <div
          key={r.name}
          role="listitem"
          tabIndex={0}
          aria-describedby={`reward-tip-${i}`}
          className="reward-sticker absolute top-0 left-0 cursor-grab touch-none select-none outline-none will-change-transform data-held:cursor-grabbing"
          style={{ width: r.w }}
        >
          {r.img && r.w && r.h ? (
            <Image
              src={`/design/rewards/${r.img}.png`}
              alt={r.name}
              width={r.w}
              height={r.h}
              sizes="(min-width: 1024px) 15vw, 30vw"
              className="h-auto w-full"
              draggable={false}
            />
          ) : (
            <div
              role="img"
              aria-label={r.name}
              className="reward-placeholder flex aspect-[4/3] w-full items-center justify-center font-pixel text-[clamp(0.6rem,0.9vw,0.9rem)] text-black/40"
            >
              art soon
            </div>
          )}
          <div className="absolute inset-x-[-25%] bottom-0 flex translate-y-[70%] flex-col items-center gap-[0.3em]">
            <p className="reward-label text-center font-pixel text-[clamp(0.7rem,1.3vw,1.5rem)] font-semibold leading-[0.95] text-black">
              {r.label.map((line) => (
                <span key={line} className="block">
                  {line}
                </span>
              ))}
            </p>
            <span className="rounded-[0.2em] bg-black px-[0.45em] py-[0.2em] font-mono text-[clamp(0.6rem,0.9vw,1rem)] font-medium leading-none whitespace-nowrap text-white">
              {r.cost} BITES
            </span>
          </div>
          <span id={`reward-tip-${i}`} role="tooltip" className="reward-tip">
            {r.desc}
          </span>
        </div>
      ))}
    </div>
  );
}
