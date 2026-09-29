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
  { slug: "setup", title: "setting up", blurb: "install stuff, make the folder, and set up a build script so you never write the one-liner by hand.", group: "making it", Body: Setup },
  { slug: "writing", title: "writing the app", blurb: "picking an idea that fits, how most apps are put together, and the things that don't work in a data URI.", group: "making it", Body: Writing },
  { slug: "shrinking", title: "getting under 3kb", blurb: "over the limit? what actually saves bytes, starting with the big ones.", group: "making it", Body: Shrinking },
  { slug: "shipping", title: "shipping it", blurb: "what gets checked, what goes in your repo, writing the README, and how BITES add up.", group: "making it", Body: Shipping },
  { slug: "canvas", title: "canvas", blurb: "shapes, animation, trails, rainbow colors, and effects where you set every pixel.", group: "badges", badge: "canvas", Body: Canvas },
  { slug: "sound", title: "sound", blurb: "beeps, notes, drums made from static, and keeping a beat steady.", group: "badges", badge: "audio", Body: Sound },
  { slug: "input", title: "input", blurb: "smooth keyboard controls, mouse and touch in one go, and telling people what to press.", group: "badges", badge: "interactive", Body: Input },
  { slug: "3d", title: "3D", blurb: "fake it with math on a 2D canvas, or go all in with a WebGL shader.", group: "badges", badge: "3d", Body: Three },
];

export const GUIDE_BY_SLUG = new Map(GUIDES.map((g) => [g.slug, g]));
