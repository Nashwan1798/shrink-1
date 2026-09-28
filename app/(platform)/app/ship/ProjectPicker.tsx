"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";

import PixelButton from "@/app/components/PixelButton";
import { hm } from "@/lib/program";

import { FlowHm, Num } from "./Flow";

type Project = { name: string; seconds: number; used: boolean };

export default function ProjectPicker({
  projects,
  selected,
  onToggle,
}: {
  projects: Project[];
  selected: Set<string>;
  onToggle: (name: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const root = useRef<HTMLDivElement>(null);
  const search = useRef<HTMLInputElement>(null);
  const list = useRef<HTMLUListElement>(null);
  const listId = useId();

  const sorted = useMemo(() => [...projects].sort((a, b) => b.seconds - a.seconds), [projects]);
  const q = query.trim().toLowerCase();
  const shown = q ? sorted.filter((p) => p.name.toLowerCase().includes(q)) : sorted;
  const picked = sorted.filter((p) => selected.has(p.name));
  const total = picked.reduce((s, p) => s + p.seconds, 0);

  useEffect(() => {
    if (!open) return;
    search.current?.focus();
    const away = (e: MouseEvent) => {
      if (!root.current?.contains(e.target as Node)) setOpen(false);
    };
    const esc = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false);
        setQuery("");
      }
    };
    document.addEventListener("mousedown", away);
    document.addEventListener("keydown", esc);
    return () => {
      document.removeEventListener("mousedown", away);
      document.removeEventListener("keydown", esc);
    };
  }, [open]);

  useEffect(() => {
    list.current?.querySelector(`[data-index="${active}"]`)?.scrollIntoView({ block: "nearest" });
  }, [active]);

  const close = () => {
    setOpen(false);
    setQuery("");
  };

  const pick = (p: Project | undefined) => {
    if (p && !(p.used && !selected.has(p.name))) onToggle(p.name);
  };

  return (
    <div ref={root} className="relative">
      {picked.map((p) => (
        <input key={p.name} type="hidden" name="hackatime" value={p.name} />
      ))}

      <div
        className={`flex min-h-[3.25rem] flex-wrap items-center gap-1.5 rounded-[8px] border-2 bg-white p-1.5 transition-colors ${
          open ? "border-black" : "border-panel-border hover:border-[#8f8d97]"
        }`}
      >
        {picked.map((p) => (
          <span key={p.name} className="flex items-center gap-2 rounded-[5px] bg-ink py-1 pl-2.5 pr-1 text-white">
            <span className="max-w-[16ch] truncate font-mono text-sm">{p.name}</span>
            <span className="font-mono text-xs text-white/50 tabular-nums">{hm(p.seconds)}</span>
            <button
              type="button"
              onClick={() => onToggle(p.name)}
              aria-label={`Remove ${p.name}`}
              className="grid size-6 place-content-center rounded-[3px] text-white/60 hover:bg-accent hover:text-black"
            >
              <svg aria-hidden viewBox="0 0 12 12" className="size-3 fill-current">
                <path d="M2 1h2v1h1v1h2V2h1V1h2v2H9v1H8v1H7v2h1v1h1v1h1v2H8v-1H7v-1H5v1H4v1H2V9h1V8h1V7h1V5H4V4H3V3H2z" />
              </svg>
            </button>
          </span>
        ))}
        <button
          type="button"
          onClick={() => (open ? close() : setOpen(true))}
          aria-expanded={open}
          aria-haspopup="listbox"
          aria-controls={listId}
          className={`flex min-h-9 min-w-[10rem] flex-1 items-center justify-between gap-3 whitespace-nowrap rounded-[5px] px-2 text-left font-medium ${
            picked.length ? "text-black/50 hover:text-black" : "text-black/40"
          }`}
        >
          <span className="flex items-center gap-2">
            <SearchIcon />
            {picked.length ? "add another" : "search your Hackatime projects"}
          </span>
          <span className="font-mono text-xs text-black/40">{projects.length}</span>
        </button>
      </div>

      {open && (
        <div className="picker-pop absolute inset-x-0 top-[calc(100%+8px)] z-30 overflow-hidden rounded-[12px] border-2 border-black bg-white">
          <div className="flex items-center gap-2 border-b-2 border-panel-border px-3">
            <SearchIcon />
            <input
              ref={search}
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setActive(0);
              }}
              onKeyDown={(e) => {
                if (e.key === "ArrowDown") {
                  e.preventDefault();
                  setActive((a) => Math.min(shown.length - 1, a + 1));
                } else if (e.key === "ArrowUp") {
                  e.preventDefault();
                  setActive((a) => Math.max(0, a - 1));
                } else if (e.key === "Enter") {
                  e.preventDefault();
                  e.stopPropagation();
                  pick(shown[active]);
                } else if (e.key === "Escape") {
                  e.preventDefault();
                  close();
                }
              }}
              role="combobox"
              aria-expanded
              aria-controls={listId}
              aria-activedescendant={shown[active] ? `${listId}-${active}` : undefined}
              aria-label="Search Hackatime projects"
              placeholder="type to filter"
              className="min-w-0 flex-1 bg-transparent py-3 font-mono text-sm outline-none placeholder:text-black/35"
            />
            {query && (
              <button type="button" onClick={() => setQuery("")} className="text-xs font-semibold text-black/50 hover:text-black">
                clear
              </button>
            )}
          </div>

          <ul ref={list} id={listId} role="listbox" aria-multiselectable className="picker-list max-h-[min(340px,50vh)] overflow-y-auto p-1.5">
            {shown.length === 0 && <li className="px-3 py-6 text-center font-medium text-black/50">no project matches &ldquo;{query}&rdquo;</li>}
            {shown.map((p, i) => {
              const on = selected.has(p.name);
              const locked = p.used && !on;
              return (
                <li
                  key={p.name}
                  id={`${listId}-${i}`}
                  data-index={i}
                  role="option"
                  aria-selected={on}
                  aria-disabled={locked || undefined}
                  onMouseEnter={() => setActive(i)}
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => pick(p)}
                  className={`flex cursor-pointer items-center gap-3 rounded-[7px] px-2.5 py-2 ${i === active ? "bg-black/[0.06]" : ""} ${
                    locked ? "cursor-not-allowed opacity-40" : ""
                  }`}
                >
                  <span
                    aria-hidden
                    className={`grid size-[1.1rem] shrink-0 place-content-center rounded-[3px] border-2 border-black ${on ? "bg-accent" : "bg-white"}`}
                  >
                    {on && <span className="size-[0.45rem] bg-black" />}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-mono text-sm">
                      <Highlight text={p.name} q={q} />
                    </span>
                    {locked ? (
                      <span className="block text-xs font-medium text-black/60">on another ship</span>
                    ) : (
                      p.seconds === 0 && <span className="block text-xs font-medium text-black/50">no time since the program started</span>
                    )}
                  </span>
                  <span className="w-[4.5rem] shrink-0 text-right font-mono text-sm tabular-nums">{hm(p.seconds)}</span>
                </li>
              );
            })}
          </ul>

          <div className="flex items-center justify-between gap-3 border-t-2 border-panel-border bg-background px-3 py-2.5">
            <span className="text-sm font-medium text-black/60">
              {picked.length ? (
                <>
                  <Num value={picked.length} /> picked · <span className="font-mono text-black tabular-nums"><FlowHm seconds={total} /></span>
                </>
              ) : (
                "↑↓ to move, enter to pick"
              )}
            </span>
            <PixelButton variant="dark" onClick={close} className="text-[0.95rem]">
              done
            </PixelButton>
          </div>
        </div>
      )}
    </div>
  );
}

function Highlight({ text, q }: { text: string; q: string }) {
  const i = q ? text.toLowerCase().indexOf(q) : -1;
  if (i < 0) return <>{text}</>;
  return (
    <>
      {text.slice(0, i)}
      <mark className="rounded-[2px] bg-accent text-black">{text.slice(i, i + q.length)}</mark>
      {text.slice(i + q.length)}
    </>
  );
}

function SearchIcon() {
  return (
    <svg aria-hidden viewBox="0 0 16 16" className="size-4 shrink-0 fill-current text-black/50">
      <path fillRule="evenodd" d="M4 1h5v1h1v1h1v5h-1v1H9v1H4V9H3V8H2V3h1V2h1zm0 2v5h5V3zm6 7h2v1h1v1h1v1h1v2h-2v-1h-1v-1h-1v-1h-1z" />
    </svg>
  );
}
