"use client";

import { useState } from "react";
import PixelButton, { OpenIcon } from "./PixelButton";
import UriDialog from "./UriDialog";
import { GAME_DATA_URI } from "./game-data-uri";

export default function TryDialog({ className = "" }: { className?: string }) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <PixelButton className={className} onClick={() => setOpen(true)}>
        Try
        <OpenIcon />
      </PixelButton>
      <UriDialog open={open} onClose={() => setOpen(false)} uri={GAME_DATA_URI} />
    </>
  );
}
