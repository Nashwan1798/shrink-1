import type { ComponentType } from "react";
import type { MDXProps } from "mdx/types";

// Guide text lives in content/*.md (plain markdown) or .mdx (when it needs values from code).
import Canvas from "./content/canvas.md";
import Input from "./content/input.md";
import Setup from "./content/setup.md";
import Shipping from "./content/shipping.mdx";
import Shrinking from "./content/shrinking.md";
import Sound from "./content/sound.md";
import Three from "./content/three.md";
import Writing from "./content/writing.md";

export type Guide = {
  slug: string;
  title: string;
  group: "making it" | "badges";
  badge?: string;
  // Written but not published yet. The page shows "coming soon!" instead of Body.
  soon?: boolean;
  Body: ComponentType<MDXProps>;
};

export const GUIDES: Guide[] = [
  { slug: "setup", title: "setting up", group: "making it", Body: Setup },
  { slug: "writing", title: "writing the app", group: "making it", Body: Writing },
  { slug: "shrinking", title: "getting under 3kb", group: "making it", Body: Shrinking },
  { slug: "shipping", title: "shipping it", group: "making it", soon: true, Body: Shipping },
  { slug: "canvas", title: "canvas", group: "badges", badge: "canvas", soon: true, Body: Canvas },
  { slug: "sound", title: "sound", group: "badges", badge: "audio", soon: true, Body: Sound },
  { slug: "input", title: "input", group: "badges", badge: "interactive", soon: true, Body: Input },
  { slug: "3d", title: "3D", group: "badges", badge: "3d", soon: true, Body: Three },
];

export const GUIDE_BY_SLUG = new Map(GUIDES.map((g) => [g.slug, g]));
