import { REFERRAL_BITES } from "@/lib/program";

export const BITE_LABEL = `${REFERRAL_BITES} BITE${REFERRAL_BITES === 1 ? "" : "S"}`;

export const REFERRAL_RULES = [
  { t: "only people new to SHRINK count", d: "friends who already have an account don't count." },
  { t: "they sign up with your link", d: "it has to be the first time they sign in." },
  { t: `you get ${BITE_LABEL} once they ship`, d: "you'll get your BITE if they actually ship so we know it's legit!" },
  { t: "no spamming. at all.", d: "only send it to people you know who'd be into it. don't drop it in random channels or DM people who didn't ask." },
  { t: "spam gets your link pulled", d: "we'll turn it off, take back your referral BITES, and might remove you from SHRINK." },
];
