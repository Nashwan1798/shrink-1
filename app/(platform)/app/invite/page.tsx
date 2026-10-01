import { H1, when } from "@/app/components/ui/bits";
import Panel from "@/app/welcome/Panel";
import { requireUser } from "@/lib/server/auth/current";
import { requestOrigin } from "@/lib/server/origin";
import { referralsOf, type Referred } from "@/lib/server/referrals";

import CopyLink from "./CopyLink";
import Pledge from "./Pledge";
import Rules from "./RuleList";
import { BITE_LABEL } from "./rules";

const STATUS: Record<Referred["status"], { label: string; className: string }> = {
  joined: { label: "signed up", className: "pill-pending" },
  shipped: { label: "in review", className: "pill-pending" },
  paid: { label: `+${BITE_LABEL}`, className: "pill-approved" },
  void: { label: "shipped, no payout", className: "pill-rejected" },
};

export default async function Invite() {
  const user = await requireUser("/app/invite");
  const sub = `get ${BITE_LABEL} for every friend who joins SHRINK through your link and gets a ship approved.`;

  if (user.referralRevokedAt) {
    return (
      <>
        <H1 sub={sub}>invite friends</H1>
        <section className="border-t-4 border-rule pt-4">
          <p className="max-w-[56ch] text-[length:var(--text-lead)] font-medium leading-snug text-black/70">
            your invite link was turned off because it was posted somewhere it shouldn&apos;t have been. if you think that&apos;s wrong, ask an
            organizer in the SHRINK channel.
          </p>
        </section>
      </>
    );
  }

  if (!user.referralCode) {
    return (
      <div className="max-w-[720px]">
        <H1 sub={sub}>invite friends</H1>
        <Panel title="read these first">
          <Rules />
        </Panel>
        <div className="mt-6">
          <Pledge />
        </div>
      </div>
    );
  }

  const [origin, { people, earned }] = await Promise.all([requestOrigin(), referralsOf(user)]);
  const url = `${origin}/r/${user.referralCode}`;
  const shipped = people.filter((p) => p.status !== "joined").length;

  return (
    <>
      <H1 sub={sub}>invite friends</H1>
      <div className="grid grid-cols-1 gap-[clamp(1.5rem,3vw,56px)] lg:grid-cols-[minmax(0,1fr)_minmax(0,400px)]">
        <div className="flex flex-col gap-[clamp(1.5rem,3vw,40px)]">
          <section className="border-t-4 border-rule pt-4">
            <h2 className="text-[1.25rem] font-semibold tracking-tight">your link</h2>
            <CopyLink url={url} className="mt-3" />
            <p className="mt-2 text-sm font-medium text-black/50">send it to people you know. never post it in Slack.</p>
          </section>

          <section className="border-t-4 border-rule pt-4">
            <dl className="grid grid-cols-3 gap-4">
              {[
                { k: "signed up", v: people.length },
                { k: "shipped", v: shipped },
                { k: "BITES earned", v: earned },
              ].map((s) => (
                <div key={s.k}>
                  <dt className="text-sm font-medium text-black/50">{s.k}</dt>
                  <dd className="font-pixel text-[clamp(2rem,4vw,3.25rem)] leading-none">{s.v}</dd>
                </div>
              ))}
            </dl>
          </section>

          <section className="border-t-4 border-rule pt-4">
            <h2 className="text-[1.25rem] font-semibold tracking-tight">friends who used it</h2>
            {people.length === 0 ? (
              <p className="mt-2 max-w-[52ch] font-medium leading-snug text-black/60">
                nobody yet. when someone new signs in after opening your link, they&apos;ll show up here.
              </p>
            ) : (
              <ul className="mt-2">
                {people.map((p) => (
                  <li key={p.id} className="flex items-center gap-3 border-b-2 border-panel-border py-3 last:border-0">
                    {p.avatarUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={p.avatarUrl} alt="" className="size-8 shrink-0 rounded-[6px] bg-black/10 object-cover" />
                    ) : (
                      <span aria-hidden className="grid size-8 shrink-0 place-content-center rounded-[6px] bg-ink font-pixel text-accent">
                        {p.name.slice(0, 1).toUpperCase()}
                      </span>
                    )}
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-semibold tracking-tight">{p.name}</span>
                      <span className="block text-sm font-medium text-black/50">joined {when(p.joinedAt)}</span>
                    </span>
                    <span className={`pill ${STATUS[p.status].className}`}>{STATUS[p.status].label}</span>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>

        <aside className="self-start">
          <Panel title="the rules">
            <Rules compact />
          </Panel>
        </aside>
      </div>
    </>
  );
}
