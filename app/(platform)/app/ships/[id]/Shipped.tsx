"use client";

import { useEffect } from "react";

import { celebrate } from "@/app/components/celebrate";

import { clearDraft, draftKey } from "../../ship/draft";

export default function Shipped({ reshipOf }: { reshipOf: string | null }) {
  useEffect(() => {
    clearDraft(draftKey(null));
    if (reshipOf) clearDraft(draftKey(reshipOf));
    return celebrate();
  }, [reshipOf]);
  return null;
}
