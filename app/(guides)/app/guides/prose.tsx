import Link from "next/link";

import CopyCode from "./CopyCode";

// Small building blocks so the guide files read like writing, not markup.

export function H2({ id, children }: { id?: string; children: React.ReactNode }) {
  return (
    <h2 id={id} className="mt-10 scroll-mt-6 text-[1.4rem] font-semibold leading-tight tracking-tight first:mt-0">
      {children}
    </h2>
  );
}

export function H3({ children }: { children: React.ReactNode }) {
  return <h3 className="mt-6 text-[1.1rem] font-semibold tracking-tight">{children}</h3>;
}

export function P({ children }: { children: React.ReactNode }) {
  return <p className="mt-3 leading-[1.65] text-black/80">{children}</p>;
}

export function UL({ children }: { children: React.ReactNode }) {
  return <ul className="mt-3 list-disc space-y-1.5 ps-[1.25em] leading-[1.6] text-black/80 marker:text-black/40">{children}</ul>;
}

export function OL({ children }: { children: React.ReactNode }) {
  return <ol className="mt-3 list-decimal space-y-1.5 ps-[1.4em] leading-[1.6] text-black/80 marker:font-mono marker:text-black/40">{children}</ol>;
}

export function C({ children }: { children: React.ReactNode }) {
  return (
    <code className="rounded-[4px] bg-black/[0.07] px-[0.3em] py-[0.05em] font-mono text-[0.88em] text-black [overflow-wrap:anywhere]">
      {children}
    </code>
  );
}

const linkClass = "font-medium text-black underline decoration-1 underline-offset-[0.2em] hover:decoration-2";

export function A({ href, children }: { href: string; children: React.ReactNode }) {
  if (!href.startsWith("http")) {
    return (
      <Link href={href} className={linkClass}>
        {children}
      </Link>
    );
  }
  return (
    <a href={href} target="_blank" rel="noreferrer" className={linkClass}>
      {children}
    </a>
  );
}

export function Code({ children, name }: { children: string; name?: string }) {
  const text = children.replace(/^\n/, "").replace(/\s+$/, "");
  return (
    <figure className="mt-4 overflow-hidden rounded-[10px] border-2 border-black bg-ink">
      <figcaption className="flex items-center justify-between gap-3 border-b border-white/10 py-1 pr-1.5 pl-3">
        <span className="font-mono text-xs text-white/50">{name ?? ""}</span>
        <CopyCode text={text} />
      </figcaption>
      <pre className="overflow-x-auto px-3 py-3 font-mono text-[0.8rem] leading-[1.6] text-white/90">
        <code>{text}</code>
      </pre>
    </figure>
  );
}

export function Note({ children }: { children: React.ReactNode }) {
  return (
    <aside className="mt-4 border-l-4 border-accent bg-accent/10 py-2.5 pr-3 pl-4 leading-[1.6] text-black/80">
      {children}
    </aside>
  );
}
