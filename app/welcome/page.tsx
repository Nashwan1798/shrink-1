import { PixelLink } from "@/app/components/ui/bits";
import { MAX_URI_BYTES, PROGRAM_END, PROGRAM_START } from "@/lib/program";
import { requireUser } from "@/lib/server/auth/current";

import { stayInSetup } from "./guard";
import Panel from "./Panel";

const day = (d: string) => new Date(d + "T00:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" });

const HOW = [
  { t: "build", d: `a whole web app as one data:text/html line, ${MAX_URI_BYTES.toLocaleString()} bytes at most. games, synths, toys, anything.` },
  { t: "track", d: "Hackatime counts your coding hours from a plugin in your editor." },
  { t: "ship", d: "paste the line in, link the repo, and a reviewer plays it." },
  { t: "spend", d: "approved hours become BITES. spend them on prizes in the shop." },
];

export default async function Welcome({ searchParams }: { searchParams: Promise<{ preview?: string }> }) {
  const user = await requireUser("/welcome");
  const previewing = stayInSetup(user, (await searchParams).preview);
  const qs = previewing ? "?preview" : "";

  return (
    <>
      <h1 className="text-[length:var(--text-display)] font-semibold leading-[1.1] tracking-tight">
        welcome to <span className="wordmark">SHRINK</span>
      </h1>
      <p className="mt-3 max-w-[52ch] text-[length:var(--text-lead)] font-medium leading-snug text-black/70">
        fit a web app into one line under 3kb. every hour you put in earns a BITE. runs {day(PROGRAM_START)} to {day(PROGRAM_END)}.
      </p>

      <div className="mt-8">
        <Panel title="how it works">
          <ol className="flex flex-col gap-4">
            {HOW.map((h, i) => (
              <li key={h.t} className="flex gap-3">
                <span className="grid size-7 shrink-0 place-content-center rounded-[5px] bg-accent font-pixel text-[0.95rem] leading-none">{i + 1}</span>
                <span>
                  <span className="block font-semibold tracking-tight">{h.t}</span>
                  <span className="block text-sm font-medium leading-snug text-black/60">{h.d}</span>
                </span>
              </li>
            ))}
          </ol>
        </Panel>
      </div>

      <div className="mt-8 flex justify-end">
        <PixelLink href={`/welcome/setup${qs}`} variant="dark" className="text-[1.2rem]">
          let&apos;s go →
        </PixelLink>
      </div>
    </>
  );
}
