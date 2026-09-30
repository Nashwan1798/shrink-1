"use client";

import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  DitherGradient,
  Grid,
  Legend,
  Tooltip,
  XAxis,
  YAxis,
  type ChartConfig,
  type DitherColor,
} from "@/components/dither-kit";
import { hm } from "@/lib/program";

const int = (v: number) => Math.round(v).toLocaleString();
// Small counts get fractional ticks; only label the whole numbers.
const whole = (v: number) => (Number.isInteger(v) ? int(v) : "");
const TOP = 28; // room for the legend above the plot
const hours = (v: number) => (v >= 3600 ? `${(v / 3600).toFixed(v >= 36_000 ? 0 : 1)}h` : `${Math.round(v / 60)}m`);

function Frame({ children, className = "h-64" }: { children: React.ReactNode; className?: string }) {
  return <div className={`w-full ${className}`}>{children}</div>;
}

// ---- daily active people ----------------------------------------------------------------------

export type DauPoint = { day: string; label: string; coding: number; shrink: number };

const DAU: ChartConfig = {
  coding: { label: "on Hackatime", color: "blue" },
  shrink: { label: "on a SHRINK project", color: "orange" },
};

export function DauChart({ data }: { data: DauPoint[] }) {
  return (
    <Frame>
      <AreaChart data={data} config={DAU} bloom="low" margins={{ left: 28, top: TOP }}>
        <Grid />
        <XAxis dataKey="label" />
        <YAxis tickFormatter={whole} tickCount={4} />
        <Area dataKey="coding" variant="dotted" />
        <Area dataKey="shrink" variant="gradient" />
        <Tooltip labelKey="label" valueFormatter={(v) => `${int(v)} people`} variant="frosted-glass" />
        <Legend align="left" />
      </AreaChart>
    </Frame>
  );
}

// ---- hours logged per day ---------------------------------------------------------------------

export type HoursPoint = { day: string; label: string; html: number; other: number };

const HOURS: ChartConfig = {
  html: { label: "SHRINK", color: "orange" },
  other: { label: "other", color: "grey" },
};

export function HoursChart({ data }: { data: HoursPoint[] }) {
  return (
    <Frame>
      <BarChart data={data} config={HOURS} stackType="stacked" bloom="low" margins={{ left: 36, top: TOP }}>
        <Grid />
        <XAxis dataKey="label" />
        <YAxis tickFormatter={hours} tickCount={4} />
        <Bar dataKey="other" variant="hatched" />
        <Bar dataKey="html" variant="gradient" />
        <Tooltip labelKey="label" valueFormatter={(v) => hm(v)} variant="frosted-glass" />
        <Legend align="left" />
      </BarChart>
    </Frame>
  );
}

// ---- sign-ups and ships per day ---------------------------------------------------------------

export type FlowPoint = { day: string; label: string; signups: number; ships: number; approved: number };

const FLOW: ChartConfig = {
  signups: { label: "signed up", color: "blue" },
  ships: { label: "shipped", color: "orange" },
  approved: { label: "approved", color: "green" },
};

export function FlowChart({ data }: { data: FlowPoint[] }) {
  return (
    <Frame>
      <BarChart data={data} config={FLOW} bloom="low" margins={{ left: 28, top: TOP }}>
        <Grid />
        <XAxis dataKey="label" />
        <YAxis tickFormatter={whole} tickCount={4} />
        <Bar dataKey="signups" variant="dotted" />
        <Bar dataKey="ships" variant="gradient" />
        <Bar dataKey="approved" variant="solid" />
        <Tooltip labelKey="label" valueFormatter={(v) => int(v)} variant="frosted-glass" />
        <Legend align="left" />
      </BarChart>
    </Frame>
  );
}

// ---- ship sizes -------------------------------------------------------------------------------

const SIZES: ChartConfig = { count: { label: "ships", color: "purple" } };

export function SizeChart({ data }: { data: { label: string; count: number }[] }) {
  return (
    <Frame className="h-48">
      <BarChart data={data} config={SIZES} bloom="low" margins={{ left: 24 }}>
        <Grid />
        <XAxis dataKey="label" maxTicks={6} />
        <YAxis tickFormatter={whole} tickCount={3} />
        <Bar dataKey="count" variant="gradient" />
        <Tooltip labelKey="label" valueFormatter={(v) => `${int(v)} ships`} variant="frosted-glass" />
      </BarChart>
    </Frame>
  );
}

// ---- decoration -------------------------------------------------------------------------------

export function Glow({ color = "orange", className = "" }: { color?: DitherColor; className?: string }) {
  return <DitherGradient from={color} direction="down" cell={4} opacity={0.22} className={className} />;
}

// ---- funnel -----------------------------------------------------------------------------------

export type FunnelStep = { label: string; value: number; color: DitherColor };

// A centred funnel: each step is a trapezoid from this step's width down to the
// next one's, so the shape narrows as people drop off. Widths get a floor so
// the small end stays visible next to hundreds at the top.
export function Funnel({ steps }: { steps: FunnelStep[] }) {
  const top = Math.max(1, ...steps.map((s) => s.value));
  const width = (v: number) => Math.max(6, (v / top) * 100);
  return (
    <ol className="flex flex-col">
      {steps.map((s, i) => {
        const prev = steps[i - 1];
        const next = steps[i + 1];
        const w0 = width(s.value);
        const w1 = next ? width(next.value) : Math.max(4, w0 * 0.85);
        const l0 = (100 - w0) / 2;
        const l1 = (100 - w1) / 2;
        const clip = `polygon(${l0}% 0, ${100 - l0}% 0, ${100 - l1}% 100%, ${l1}% 100%)`;
        const drop = prev && prev.value > 0 ? Math.round((s.value / prev.value) * 100) : null;
        return (
          <li key={s.label} className="grid grid-cols-[minmax(0,1fr)_auto] items-stretch gap-x-5 sm:grid-cols-[11rem_minmax(0,1fr)_4.5rem_4rem]">
            <div className="flex flex-col justify-center py-2 sm:py-0">
              <span className="text-[0.95rem] font-semibold tracking-tight">{s.label}</span>
              <span className="font-pixel text-xl leading-none tabular-nums text-white/90 sm:hidden">{s.value.toLocaleString()}</span>
            </div>
            <div className="relative col-span-2 h-14 sm:col-span-1" style={{ clipPath: clip }} aria-hidden>
              <DitherGradient from={s.color} to="transparent" direction="down" cell={3} opacity={0.95} />
              <div className="absolute inset-x-0 top-0 h-[2px]" style={{ background: "rgba(255,255,255,0.22)" }} />
            </div>
            <span className="hidden self-center justify-self-end font-pixel text-2xl leading-none tabular-nums sm:block">
              {s.value.toLocaleString()}
            </span>
            <span className="hidden self-center justify-self-end font-mono text-xs text-white/45 sm:block">{drop == null ? "" : `${drop}%`}</span>
          </li>
        );
      })}
    </ol>
  );
}
