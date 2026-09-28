import Link from "next/link";
import { redirect } from "next/navigation";

import { MAX_URI_BYTES } from "@/lib/program";
import { requireUser } from "@/lib/server/auth/current";

import { stayInSetup } from "../guard";
import Panel from "../Panel";
import Finish from "./Finish";

const RULES = [
  { t: "one line, under 3kb", d: `the whole app is a single data:text/html line, ${MAX_URI_BYTES.toLocaleString()} bytes at most.` },
  { t: "nothing from the internet", d: "no CDNs, images, fonts or APIs. everything lives inside the line; outside requests are blocked when it runs." },
  { t: "a public repo with a README", d: "on GitHub, GitLab or Codeberg. the README says what the app is and how you made it." },
  { t: "the readable source", d: "the repo holds the code you shrank, not just the minified line." },
  { t: "real hours", d: "tracked on Hackatime, at least 30 minutes a ship. each Hackatime project counts toward one ship." },
];

export default async function Rules({ searchParams }: { searchParams: Promise<{ preview?: string }> }) {
  const user = await requireUser("/welcome/rules");
  const previewing = stayInSetup(user, (await searchParams).preview);
  if (!previewing && !user.hackatimeAccountId) redirect("/welcome/setup");
  const qs = previewing ? "?preview" : "";

  return (
    <>
      <h1 className="text-[length:var(--text-display)] font-semibold leading-[1.1] tracking-tight">what every ship needs</h1>
      <p className="mt-3 max-w-[52ch] text-[length:var(--text-lead)] font-medium leading-snug text-black/70">
        each ship is scanned for these before a reviewer sees it. build with them in mind from the start.
      </p>

      <div className="mt-8">
        <Panel title="the rules">
          <ol className="flex flex-col gap-4">
            {RULES.map((r, i) => (
              <li key={r.t} className="flex gap-3">
                <span className="grid size-7 shrink-0 place-content-center rounded-[5px] bg-accent font-pixel text-[0.95rem] leading-none">{i + 1}</span>
                <span>
                  <span className="block font-semibold tracking-tight">{r.t}</span>
                  <span className="block text-sm font-medium leading-snug text-black/60">{r.d}</span>
                </span>
              </li>
            ))}
          </ol>
        </Panel>
      </div>

      <Finish back={
        <Link href={`/welcome/setup${qs}`} className="text-sm font-semibold text-black/60 underline decoration-1 underline-offset-[0.25em] hover:text-black">
          ← back
        </Link>
      } />
    </>
  );
}
