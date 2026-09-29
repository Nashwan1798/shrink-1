import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { BADGE_BY_SLUG } from "@/lib/program";

import { GUIDES, GUIDE_BY_SLUG } from "../guides";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const guide = GUIDE_BY_SLUG.get((await params).slug);
  return { title: guide ? `${guide.title} · SHRINK guides` : "SHRINK guides" };
}

export default async function GuidePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const guide = GUIDE_BY_SLUG.get(slug);
  if (!guide) notFound();

  const i = GUIDES.indexOf(guide);
  const prev = GUIDES[i - 1];
  const next = GUIDES[i + 1];
  const badge = guide.badge ? BADGE_BY_SLUG.get(guide.badge) : undefined;
  const { Body } = guide;

  return (
    <div className="grid grid-cols-1 gap-x-[clamp(2rem,4vw,72px)] lg:grid-cols-[200px_minmax(0,1fr)]">
      <nav aria-label="Guides" className="hidden lg:block">
        <div className="sticky top-6">
          <Link href="/app/guides" className="text-sm font-semibold text-black/50 hover:text-black">
            all guides
          </Link>
          {(["making it", "badges"] as const).map((group) => (
            <div key={group} className="mt-5">
              <p className="font-pixel text-[0.8rem] leading-none text-black/40">{group}</p>
              <ul className="mt-2 flex flex-col gap-0.5">
                {GUIDES.filter((g) => g.group === group).map((g) => (
                  <li key={g.slug}>
                    <Link
                      href={`/app/guides/${g.slug}`}
                      aria-current={g === guide ? "page" : undefined}
                      className={`-mx-2 block rounded-[4px] px-2 py-1 text-[0.95rem] font-medium transition-colors ${
                        g === guide ? "bg-accent text-black" : "text-black/60 hover:bg-black/5 hover:text-black"
                      }`}
                    >
                      {g.title}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </nav>

      <article className="min-w-0 max-w-[70ch] text-[1.0625rem] font-medium">
        <Link href="/app/guides" className="text-sm font-semibold text-black/50 hover:text-black lg:hidden">
          ← all guides
        </Link>
        <header className="mt-2 border-b-4 border-rule pb-4 lg:mt-0">
          <p className="font-mono text-xs text-black/40">
            {String(i + 1).padStart(2, "0")} / {String(GUIDES.length).padStart(2, "0")}
          </p>
          <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-2">
            <h1 className="text-[length:var(--text-display)] font-semibold leading-[1.1] tracking-tight">{guide.title}</h1>
            {badge && (
              <span className="rounded-[4px] bg-black px-[0.5em] py-[0.35em] font-pixel text-[0.9rem] leading-none text-white">
                {badge.title} badge · +{badge.bites} cap
              </span>
            )}
          </div>
        </header>

        <div className="pt-6">
          {guide.soon ? <p className="text-[length:var(--text-lead)] text-black/60">coming soon!</p> : <Body />}
        </div>

        <footer className="mt-12 grid grid-cols-2 gap-3 border-t-4 border-rule pt-4">
          {prev ? (
            <Link href={`/app/guides/${prev.slug}`} className="card block bg-white px-4 py-3 transition-transform hover:-translate-y-0.5">
              <span className="block text-xs text-black/50">← previous</span>
              <span className="block font-semibold tracking-tight">{prev.title}</span>
            </Link>
          ) : (
            <span />
          )}
          {next && (
            <Link href={`/app/guides/${next.slug}`} className="card block bg-white px-4 py-3 text-right transition-transform hover:-translate-y-0.5">
              <span className="block text-xs text-black/50">next →</span>
              <span className="block font-semibold tracking-tight">{next.title}</span>
            </Link>
          )}
        </footer>
      </article>
    </div>
  );
}
