"use client";

import { useState } from "react";

import PixelButton from "@/app/components/PixelButton";

import { finishOnboarding } from "../actions";

export default function Finish({ back }: { back: React.ReactNode }) {
  const [ok, setOk] = useState(false);
  return (
    <form action={finishOnboarding} className="mt-6">
      <label className="check">
        <input type="checkbox" checked={ok} onChange={(e) => setOk(e.target.checked)} />
        <span className="font-medium">got it. i&apos;ll build with these in mind.</span>
      </label>
      <div className="mt-8 flex flex-wrap items-center justify-between gap-4">
        {back}
        <PixelButton type="submit" variant="dark" disabled={!ok} className="text-[1.2rem]">
          start building →
        </PixelButton>
      </div>
    </form>
  );
}
