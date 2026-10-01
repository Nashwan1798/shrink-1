import { REFERRAL_RULES } from "./rules";

export default function Rules({ compact = false }: { compact?: boolean }) {
  return (
    <ol className={`flex flex-col ${compact ? "gap-3" : "gap-4"}`}>
      {REFERRAL_RULES.map((r, i) => (
        <li key={r.t} className="flex gap-3">
          <span
            className={`grid size-7 shrink-0 place-content-center rounded-[5px] font-pixel text-[0.95rem] leading-none ${
              i === 3 ? "bg-ink text-accent" : "bg-accent"
            }`}
          >
            {i + 1}
          </span>
          <span>
            <span className="block font-semibold tracking-tight">{r.t}</span>
            <span className="block text-sm font-medium leading-snug text-black/60">{r.d}</span>
          </span>
        </li>
      ))}
    </ol>
  );
}
