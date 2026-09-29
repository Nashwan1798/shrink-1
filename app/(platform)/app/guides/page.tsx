import Link from "next/link";

import { H1 } from "@/app/components/ui/bits";
import { BADGE_BY_SLUG } from "@/lib/program";

import { GUIDES } from "./guides";

export default function GuidesPage() {
  return (
    <>
      <H1>guides</H1>

      {(["making it", "badges"] as const).map((group, gi) => (
        <section key={group} className={`${gi ? "mt-[clamp(1.5rem,3vw,48px)] " : ""}border-t-4 border-rule pt-4`}>
          <h2 className="text-[1.25rem] font-semibold tracking-tight">{group}</h2>
          <ol className="mt-2">
            {GUIDES.filter((g) => g.group === group).map((g) => {
              const n = GUIDES.indexOf(g) + 1;
              const badge = g.badge ? BADGE_BY_SLUG.get(g.badge) : undefined;
              return (
                <li key={g.slug} className="border-b-2 border-panel-border last:border-0">
                  <Link
                    href={`/app/guides/${g.slug}`}
                    className="group -mx-3 flex items-start gap-4 rounded-[8px] px-3 py-4 transition-colors hover:bg-black/[0.04]"
                  >
                    <span className="grid size-8 shrink-0 place-content-center rounded-[5px] bg-accent font-pixel text-[1rem] leading-none">
                      {n}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="flex flex-wrap items-center gap-x-3 gap-y-1">
                        <span className="text-[1.15rem] font-semibold tracking-tight">{g.title}</span>
                        {badge && (
                          <span className="rounded-[4px] bg-black px-[0.45em] py-[0.3em] font-pixel text-[0.75rem] leading-none text-white">
                            +{badge.bites} cap
                          </span>
                        )}
                        {g.soon && <span className="text-sm font-medium text-black/40">coming soon!</span>}
                      </span>
                      <span className="mt-0.5 block max-w-[62ch] text-[0.95rem] font-medium leading-snug text-black/60">
                        {g.blurb}
                      </span>
                    </span>
                    <span aria-hidden className="mt-1 font-semibold text-black/30 transition-transform group-hover:translate-x-0.5 group-hover:text-black">
                      →
                    </span>
                  </Link>
                </li>
              );
            })}
          </ol>
        </section>
      ))}
    </>
  );
}
