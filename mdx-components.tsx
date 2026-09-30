import type { MDXComponents } from "mdx/types";

// Required by @next/mdx. Guide styling lives in app/(guides)/app/guides/prose.tsx and is passed per page.
export function useMDXComponents(): MDXComponents {
  return {};
}
