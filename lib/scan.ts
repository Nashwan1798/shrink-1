export type CheckStatus = "pass" | "warn" | "fail" | "skip";

export type CheckId = "idv" | "address" | "hours" | "offline" | "repo" | "readme" | "readme_quality" | "code";

export type Check = {
  id: CheckId;
  label: string;
  status: CheckStatus;
  detail?: string;
  fixUrl?: string;
};

export const QUICK_CHECKS: CheckId[] = ["idv", "address", "hours", "offline", "repo", "readme"];
export const DEEP_CHECKS: CheckId[] = ["readme_quality", "code"];

export const CHECK_LABELS: Record<CheckId, string> = {
  idv: "identity verified",
  address: "address on your Hack Club account",
  hours: "30 minutes on Hackatime",
  offline: "loads nothing from the internet",
  repo: "public source repo",
  readme: "README in the repo",
  readme_quality: "README explains the project",
  code: "the app's code is in the repo",
};

export function blocking(checks: Check[]): Check[] {
  return checks.filter((c) => c.status === "fail");
}
