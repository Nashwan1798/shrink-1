export default function Panel({
  title,
  badge,
  done = false,
  children,
}: {
  title: string;
  badge?: string;
  done?: boolean;
  children: React.ReactNode;
}) {
  return (
    <section className="overflow-hidden rounded-[12px] border-2 border-black bg-white">
      <header className="flex items-center justify-between gap-3 bg-ink px-4 py-2.5 text-white">
        <h2 className="font-pixel text-[1.1rem] leading-none">{title}</h2>
        {badge && (
          <span className={`rounded-[4px] px-2 py-1 font-pixel text-[0.8rem] leading-none ${done ? "bg-accent text-black" : "bg-white/15 text-white"}`}>
            {badge}
          </span>
        )}
      </header>
      <div className="px-4 py-4">{children}</div>
    </section>
  );
}
