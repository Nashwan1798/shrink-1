// Invites everyone who finished onboarding to the program channel. The live
// invite only fires on a first finish, so this covers people who onboarded
// before it shipped or while the bot lacked channels:write.invites.
//   npm run slack:backfill -- --dry-run
import postgres from "postgres";

import { connection } from "./db/url";

const dryRun = process.argv.includes("--dry-run");
const token = process.env.SLACK_BOT_TOKEN;
const channel = process.env.SLACK_PROGRAM_CHANNEL_ID || "C0AQTQMV2SJ";
const raw = process.env.DATABASE_URL;
if (!raw || (!token && !dryRun)) {
  console.error("DATABASE_URL and SLACK_BOT_TOKEN must be set");
  process.exit(1);
}

const { url, ...tls } = connection(raw);
const sql = postgres(url, { ...tls, max: 1, prepare: false, onnotice: () => {} });
let rows: { slack_id: string }[];
try {
  rows = await sql`select distinct slack_id from users where onboarded_at is not null and slack_id is not null`;
} finally {
  await sql.end();
}
const ids = rows.map((r) => r.slack_id);
console.log(`${ids.length} onboarded users with a Slack ID`);
if (dryRun) process.exit(0);

// `force` keeps a batch going past people already in the channel or deactivated.
for (let i = 0; i < ids.length; i += 100) {
  const batch = ids.slice(i, i + 100);
  const res = await fetch("https://slack.com/api/conversations.invite", {
    method: "POST",
    headers: { authorization: `Bearer ${token}`, "content-type": "application/json; charset=utf-8" },
    body: JSON.stringify({ channel, users: batch.join(","), force: true }),
  });
  const json = (await res.json()) as { ok?: boolean; error?: string; errors?: { user: string; error: string }[] };
  const skipped = (json.errors ?? []).filter((e) => e.error !== "already_in_channel");
  const already = (json.errors ?? []).length - skipped.length;
  if (!json.ok && !json.errors?.length) {
    console.error(`batch ${i / 100 + 1} failed: ${json.error ?? res.status}`);
    process.exit(1);
  }
  console.log(`batch ${i / 100 + 1}: ${batch.length - (json.errors ?? []).length} invited, ${already} already in`);
  for (const e of skipped) console.log(`  ${e.user}: ${e.error}`);
}
