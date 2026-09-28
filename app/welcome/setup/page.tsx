import Link from "next/link";

import PixelButton, { pixelButtonClass, pixelButtonVariants } from "@/app/components/PixelButton";
import { Notice, PixelLink } from "@/app/components/ui/bits";
import { requireUser } from "@/lib/server/auth/current";
import { HCA_ADDRESSES_URL, HCA_VERIFY_URL } from "@/lib/server/auth/hca";
import { addressesFor } from "@/lib/server/orders";

import { stayInSetup } from "../guard";
import Panel from "../Panel";

const LINK_ERRORS: Record<string, string> = {
  already_linked: "That Hackatime account is already linked to another SHRINK account.",
  locked: "You've shipped with a different Hackatime account, so it can't be swapped. Ask an organiser.",
  denied: "Hackatime didn't get permission. Try again when you're ready.",
  expired: "That took too long. Try linking again.",
  bad_state: "That took too long. Try linking again.",
  unconfigured: "Hackatime linking isn't set up on this server yet.",
  provider_error: "Hackatime didn't answer. Try again in a minute.",
};

const external = "text-sm font-semibold underline decoration-1 underline-offset-[0.25em] hover:decoration-2";

export default async function Setup({ searchParams }: { searchParams: Promise<{ preview?: string; hackatime_error?: string }> }) {
  const user = await requireUser("/welcome/setup");
  const params = await searchParams;
  const previewing = stayInSetup(user, params.preview);
  const qs = previewing ? "?preview" : "";

  const linked = Boolean(user.hackatimeAccountId);
  const addresses = await addressesFor(user).catch(() => null);
  const home = Array.isArray(addresses) ? addresses[0]?.address : undefined;
  const verified = user.eligibility === "eligible";
  const linkError = params.hackatime_error ? (LINK_ERRORS[params.hackatime_error] ?? LINK_ERRORS.provider_error) : null;

  return (
    <>
      <h1 className="text-[length:var(--text-display)] font-semibold leading-[1.1] tracking-tight">let&apos;s get you set up</h1>

      <div className="mt-8 flex flex-col gap-5">
        <Panel title="hackatime" badge={linked ? "linked" : "required"} done={linked}>
          <p className="font-medium leading-snug text-black/70">
            Hackatime tracks your coding time from a plugin in your editor. Link your account so your hours count toward SHRINK.
          </p>
          {linkError && (
            <div className="mt-3">
              <Notice>{linkError}</Notice>
            </div>
          )}
          <div className="mt-4 flex flex-wrap items-center gap-4">
            {linked ? (
              <span className="font-semibold">linked. your hours will show up as you code.</span>
            ) : (
              <a href={`/api/auth/hackatime/start?next=${encodeURIComponent(`/welcome/setup${qs}`)}`} className={`${pixelButtonClass.replace(pixelButtonVariants.light, pixelButtonVariants.dark)} text-[1rem]`}>
                link hackatime
              </a>
            )}
            <a href="https://hackatime.hackclub.com" target="_blank" rel="noreferrer" className={external}>
              {linked ? "open Hackatime ↗" : "new to Hackatime? set it up ↗"}
            </a>
          </div>
        </Panel>

        <Panel title="identity" badge={verified ? "verified" : "needed to ship"} done={verified}>
          <p className="font-medium leading-snug text-black/70">
            {verified
              ? "Hack Club has verified you. Nothing to do."
              : user.verificationStatus === "pending"
                ? "Submitted. Hack Club is checking it; you can start building meanwhile."
                : user.eligibility === "blocked_over_18"
                  ? "Hack Club has you as over 18, so prizes can't ship to you. You can still take part."
                  : "Verify your identity on Hack Club before you ship. It takes a few minutes, and you can start building first."}
          </p>
          {(user.eligibility === "blocked_unverified" || user.eligibility === "undetermined") && user.verificationStatus !== "pending" && (
            <a href={HCA_VERIFY_URL} target="_blank" rel="noreferrer" className={`mt-3 inline-block ${external}`}>
              verify on Hack Club ↗
            </a>
          )}
        </Panel>

        <Panel title="address" badge={home ? "on file" : "needed to ship"} done={Boolean(home)}>
          {home ? (
            <>
              <p className="font-medium leading-snug text-black/70">We use the default address on your Hack Club account:</p>
              <p className="mt-2 font-mono text-sm">
                {[home.city, home.region, home.country].filter(Boolean).join(", ")}
              </p>
              <a href={HCA_ADDRESSES_URL} target="_blank" rel="noreferrer" className={`mt-3 inline-block ${external}`}>
                change it on Hack Club ↗
              </a>
            </>
          ) : (
            <>
              <p className="font-medium leading-snug text-black/70">
                {addresses === null || addresses === "reconnect"
                  ? "We couldn't read your Hack Club addresses right now. We'll check again when you ship."
                  : "Add an address to your Hack Club account before you ship. We use your default one, so there's nothing to fill in here."}
              </p>
              <a href={HCA_ADDRESSES_URL} target="_blank" rel="noreferrer" className={`mt-3 inline-block ${external}`}>
                add one on Hack Club ↗
              </a>
            </>
          )}
        </Panel>
      </div>

      <div className="mt-8 flex flex-wrap items-center justify-between gap-4">
        <Link href={`/welcome${qs}`} className="text-sm font-semibold text-black/60 underline decoration-1 underline-offset-[0.25em] hover:text-black">
          ← back
        </Link>
        <div className="flex items-center gap-4">
          {!linked && <span className="text-sm font-medium text-black/50">link Hackatime to continue</span>}
          {linked || previewing ? (
            <PixelLink href={`/welcome/rules${qs}`} variant="dark" className="text-[1.1rem]">
              next →
            </PixelLink>
          ) : (
            <PixelButton variant="dark" disabled className="text-[1.1rem]">
              next →
            </PixelButton>
          )}
        </div>
      </div>
    </>
  );
}
