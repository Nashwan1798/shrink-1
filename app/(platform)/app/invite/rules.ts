import { REFERRAL_BITES } from "@/lib/program";

export const BITE_LABEL = `${REFERRAL_BITES} BITE${REFERRAL_BITES === 1 ? "" : "S"}`;

export const REFERRAL_RULES = [
  {
    t: "only people new to SHRINK count",
    d: "if your friend has already signed in, or hit join in Slack, they're already here and don't count.",
  },
  {
    t: "they have to sign up through your link",
    d: "the link is saved when they open it and locked in the first time they sign in. it can't be added afterwards.",
  },
  {
    t: `you get ${BITE_LABEL} once they ship`,
    d: "not when they sign up. their first ship has to be approved by a reviewer. one payout per friend.",
  },
  {
    t: "no spamming. at all.",
    d: "send it to people you actually know: DMs to friends, your club, your own socials. never post it in a Hack Club Slack channel or thread, and never DM people you don't know.",
  },
  {
    t: "spam gets your link pulled",
    d: "we'll turn your link off, take back any referral BITES, and might remove you from SHRINK.",
  },
];
