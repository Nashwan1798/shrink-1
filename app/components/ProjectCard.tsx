"use client";

import Image from "next/image";
import { useState } from "react";
import UriDialog from "./UriDialog";
import { GAME_DATA_URI } from "./game-data-uri";

const CAP_KB = 3;

type Props = {
  title: string;
  size: string;
  uri?: string;
  thumb?: string;
  tabIndex?: number;
};

export default function ProjectCard({
  title,
  size,
  uri = GAME_DATA_URI,
  thumb = "/design/project-thumb.png",
  tabIndex,
}: Props) {
  const [open, setOpen] = useState(false);
  const kb = parseFloat(size);
  const pct = Math.min(100, Math.round((kb / CAP_KB) * 100));

  return (
    <>
      <button
        type="button"
        tabIndex={tabIndex}
        onClick={() => setOpen(true)}
        className="block w-full cursor-pointer overflow-hidden rounded-[14px] border-2 border-panel-border bg-card text-left focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-black"
      >
        <div className="relative m-[clamp(8px,0.7vw,12px)] mb-0 aspect-[268/200] overflow-hidden rounded-[8px] bg-ink">
          <Image
            src={thumb}
            alt=""
            fill
            sizes="(min-width: 1024px) 268px, 45vw"
            className="object-cover"
          />
          <span className="absolute right-[6%] top-[6%] rounded-[3px] bg-accent px-[0.45em] py-[0.15em] font-pixel text-[clamp(0.85rem,1.05vw,1.25rem)] leading-none text-black">
            {size}
          </span>
        </div>

        <div className="px-[clamp(12px,1.1vw,20px)] pt-[clamp(10px,1vw,18px)] pb-[clamp(12px,1.2vw,22px)]">
          <p className="text-[clamp(1rem,1.2vw,1.375rem)] font-semibold leading-tight tracking-tight text-black">
            {title}
          </p>

          <div
            className="mt-[clamp(8px,0.8vw,14px)]"
            role="img"
            aria-label={`${size} of ${CAP_KB}kb budget`}
          >
            <div className="h-[6px] w-full overflow-hidden rounded-full bg-black/10">
              <div
                className="size-bar h-full rounded-full"
                style={{ width: `${pct}%` }}
              />
            </div>
            <p className="mt-[0.4em] font-mono text-[clamp(0.7rem,0.8vw,0.9rem)] leading-none text-black/50">
              {pct}% of {CAP_KB}kb
            </p>
          </div>
        </div>
      </button>

      <UriDialog
        open={open}
        onClose={() => setOpen(false)}
        uri={uri}
        title={title}
      />
    </>
  );
}
