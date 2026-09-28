"use client";

import { useEffect } from "react";

import { celebrate } from "@/app/components/celebrate";

export default function Placed() {
  useEffect(() => celebrate(), []);
  return null;
}
