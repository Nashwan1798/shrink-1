import Link from "next/link";

import AuthPopupLink from "@/app/components/AuthPopupLink";
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
      <h1 className="text-[length:var(--text-display)] font-semibold leading-[1.1] tracking-tight">before you start</h1>

      <div className="mt-8 flex flex-col gap-5">
        <Panel title="hackatime" badge={linked ? "linked" : "required"} done={linked}>
          <p className="font-medium leading-snug text-black/70">
            Link your Hackatime account so your hours count.
          </p>
          {linkError && (
            <div className="mt-3">
              <Notice>{linkError}</Notice>
            </div>
          )}
          <div className="mt-4 flex flex-wrap items-center gap-4">
            {!linked && (
              <AuthPopupLink href={`/api/auth/hackatime/start?next=${encodeURIComponent(`/welcome/setup${qs}`)}`} className={`${pixelButtonClass.replace(pixelButtonVariants.light, pixelButtonVariants.dark)} text-[1rem]`}>
                link hackatime
              </AuthPopupLink>
            )}
            <a href="https://hackatime.hackclub.com" target="_blank" rel="noreferrer" className={external}>
              {linked ? "open Hackatime ↗" : "don't have it yet? ↗"}
            </a>
          </div>
        </Panel>

        <Panel title="identity" badge={verified ? "verified" : "needed to ship"} done={verified}>
          <p className="font-medium leading-snug text-black/70">
            {verified
              ? "You're verified."
              : user.verificationStatus === "pending"
                ? "Hack Club is reviewing it. You can build in the meantime."
                : user.eligibility === "blocked_over_18"
                  ? "Your Hack Club account says you're over 18, so you can't get prizes. You can still build and ship."
                  : "Needed before your first ship, not before you start building. Takes a few minutes."}
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
              <p className="font-medium leading-snug text-black/70">Prizes go to the default address on your Hack Club account:</p>
              <p className="mt-2 font-mono text-sm">
                {[home.city, home.region, home.country].filter(Boolean).join(", ")}
              </p>
              <a href={HCA_ADDRESSES_URL} target="_blank" rel="noreferrer" className={`mt-3 inline-block ${external}`}>
                change it ↗
              </a>
            </>
          ) : (
            <>
              <p className="font-medium leading-snug text-black/70">
                {addresses === null || addresses === "reconnect"
                  ? "Couldn't load your Hack Club addresses. We'll try again when you ship."
                  : "Prizes go to the default address on your Hack Club account. Add one there before your first ship."}
              </p>
              <a href={HCA_ADDRESSES_URL} target="_blank" rel="noreferrer" className={`mt-3 inline-block ${external}`}>
                add an address ↗
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
