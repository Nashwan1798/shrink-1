"use client";

import NumberFlow, { NumberFlowGroup } from "@number-flow/react";

export function Num({ value, suffix }: { value: number; suffix?: string }) {
  return <NumberFlow value={value} suffix={suffix} willChange />;
}

export function FlowHm({ seconds }: { seconds: number }) {
  const minutes = Math.round(seconds / 60);
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return (
    <NumberFlowGroup>
      <span className="tabular-nums">
        {h > 0 && <NumberFlow value={h} suffix="h" willChange />}
        {h > 0 && m > 0 && " "}
        {(m > 0 || h === 0) && <NumberFlow value={m} suffix="m" willChange />}
      </span>
    </NumberFlowGroup>
  );
}
