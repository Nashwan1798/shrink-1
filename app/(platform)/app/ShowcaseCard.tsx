import Link from "next/link";

import { AppFrame } from "@/app/components/ui/bits";

export default function ShowcaseCard({
  href,
  title,
  uri,
  meta,
  chip,
}: {
  href: string | null;
  title: string;
  uri: string;
  meta: string;
  chip: string | null;
}) {
  const body = (
    <>
      <div className="relative m-[8px] mb-0 aspect-[268/200] overflow-hidden rounded-[8px] bg-ink">
        <AppFrame uri={uri} title={title} className={href ? "pointer-events-none" : ""} />
        {chip && (
          <span className="absolute right-[6%] top-[6%] rounded-[3px] bg-accent px-[0.45em] py-[0.15em] font-pixel text-[0.9rem] leading-none text-black">
            {chip}
          </span>
        )}
      </div>
      <div className="px-3 pb-3 pt-2">
        <p className="truncate text-[0.95rem] font-semibold leading-tight tracking-tight">{title}</p>
        <p className="mt-0.5 text-xs font-medium text-black/50">{meta}</p>
      </div>
    </>
  );
  return href ? (
    <Link href={href} className="card block overflow-hidden transition-transform hover:-translate-y-0.5">
      {body}
    </Link>
  ) : (
    <div className="card overflow-hidden">{body}</div>
  );
}
