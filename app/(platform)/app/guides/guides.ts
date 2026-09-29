import type { ComponentType } from "react";

import Canvas from "./content/canvas";
import Input from "./content/input";
import Setup from "./content/setup";
import Shipping from "./content/shipping";
import Shrinking from "./content/shrinking";
import Sound from "./content/sound";
import Three from "./content/three";
import Writing from "./content/writing";

export type Guide = {
  slug: string;
  title: string;
  blurb: string;
  group: "making it" | "badges";
  badge?: string;
  Body: ComponentType;
};

export const GUIDES: Guide[] = [
  { slug: "setup", title: "setting up", blurb: "a folder, a build script and a repo, so you write normal code and never touch the one-liner.", group: "making it", Body: Setup },
  { slug: "writing", title: "writing the app", blurb: "picking an idea that fits in 3kb, a shape most apps follow, and what doesn't work in a data URI.", group: "making it", Body: Writing },
  { slug: "shrinking", title: "getting under 3kb", blurb: "what actually saves bytes, biggest wins first.", group: "making it", Body: Shrinking },
  { slug: "shipping", title: "shipping it", blurb: "what the checks look for, what goes in the repo, and a README that isn't filler.", group: "making it", Body: Shipping },
  { slug: "canvas", title: "canvas", blurb: "drawing, trails, color from numbers, and per-pixel effects.", group: "badges", badge: "canvas", Body: Canvas },
  { slug: "sound", title: "sound", blurb: "tones, notes, drums from noise, and keeping time with the audio clock.", group: "badges", badge: "audio", Body: Sound },
  { slug: "input", title: "input", blurb: "held keys, pointer events for mouse and touch, and making controls obvious.", group: "badges", badge: "interactive", Body: Input },
  { slug: "3d", title: "3D", blurb: "projecting points on a 2D canvas, or raymarching in a WebGL shader.", group: "badges", badge: "3d", Body: Three },
];

export const GUIDE_BY_SLUG = new Map(GUIDES.map((g) => [g.slug, g]));
