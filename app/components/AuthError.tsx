"use client";

import { useSearchParams } from "next/navigation";

const MESSAGES: Record<string, string> = {
  denied: "Sign-in was cancelled. No worries, try again whenever.",
  bad_state: "That sign-in link went stale. Start again from the sign in button.",
  expired: "That sign-in took too long and expired. Try again.",
  provider_error: "Hack Club Auth had a moment. Try again in a minute.",
  no_email: "Your Hack Club account has no email on it, so we can't sign you in.",
  unconfigured: "Sign-in isn't set up on this deployment yet.",
};

export default function AuthError() {
  const params = useSearchParams();
  const code = params.get("auth_error");
  const text = code ? MESSAGES[code] : null;
  if (!text) return null;
  return (
    <p role="alert" className="notice notice-error absolute left-1/2 top-[calc(clamp(40px,3.6vw,72px)+clamp(12px,1.4vw,28px))] z-20 w-[min(90vw,420px)] -translate-x-1/2 text-sm">
      {text}
    </p>
  );
}
