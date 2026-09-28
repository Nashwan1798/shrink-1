"use client";

import Image from "next/image";
import type { ClipboardEvent } from "react";
import TryDialog from "./TryDialog";
import { GAME_DATA_URI } from "./game-data-uri";

export default function BrowserMock() {
  const copyWhole = (e: ClipboardEvent) => {
    e.clipboardData.setData("text/plain", GAME_DATA_URI);
    e.preventDefault();
  };

  return (
    <div className="diagonal-stripes relative aspect-[960/758] w-full overflow-hidden @container lg:aspect-auto lg:h-full">
      <div className="absolute left-[2.3cqw] top-[4.8cqw] w-[175.6cqw]">
        <Image
          src="/design/game-screenshot.png"
          alt="A tiny space-shooter game running straight from a data URI in the browser"
          width={2074}
          height={1580}
          sizes="(min-width: 1024px) 88vw, 176vw"
          priority
          className="h-auto w-full"
        />
      </div>
      <div
        className="absolute left-[34.2cqw] top-[12.6cqw] flex h-[3.23cqw] w-[74.6cqw] items-center overflow-hidden bg-[#fefeff] pl-[1.25cqw] font-ui font-[510] tracking-[0.03em] text-black text-[2.6cqw] whitespace-nowrap"
      >
        <span
          className="select-all cursor-text"
          title="Click to select the whole URL, then copy it"
          onCopy={copyWhole}
        >
          {GAME_DATA_URI}
        </span>
      </div>

      <TryDialog className="absolute right-[4cqw] bottom-[4cqw] text-[3cqw]" />
    </div>
  );
}
