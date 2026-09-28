# SHRINK!

Build a web app that fits in a 3 KB `data:` URI, get cool prizes!

## Running locally

Requires Node 20+ and PostgreSQL.

```sh
npm install
cp .env.example .env.local   # set DATABASE_URL and ENCRYPTION_KEY
createdb shrink
npm run db:migrate
npm run dev
```

With `HCA_CLIENT_ID` unset, `next dev` runs in staging mode: `/login` signs
you in as a local account (role from `STAGING_ROLE`, default `admin`),
Hackatime returns fixed projects, and orders use a fake address. Production
builds never enable staging.

## Scripts

| Script                | |
| --------------------- | --- |
| `npm run dev`         | dev server |
| `npm run build`       | apply migrations, then `next build` |
| `npm run db:generate` | generate a migration from `lib/server/db/schema.ts` |
| `npm run db:migrate`  | apply migrations in `./drizzle` |
| `npm run typecheck`   | `tsc --noEmit` |

## Deploying

1. Create a Postgres database and set `DATABASE_URL` to its pooled
   connection string.
2. Set `ENCRYPTION_KEY` (`openssl rand -hex 32`) and `ADMIN_EMAILS`.
3. Register an app with [Hack Club Auth](https://auth.hackclub.com) using
   redirect URI `https://<host>/api/auth/callback` and set
   `HCA_CLIENT_ID` / `HCA_CLIENT_SECRET`.
4. Register an OAuth app with Hackatime using redirect URI
   `https://<host>/api/auth/hackatime/callback` and set
   `HACKATIME_CLIENT_ID` / `HACKATIME_CLIENT_SECRET`.
5. Optionally set Slack, Airtable, `GITHUB_TOKEN` and `OPENROUTER_API_KEY`
   (see `.env.example`).
6. For Airtable, set `AIRTABLE_API_KEY`, `AIRTABLE_BASE_ID`, `APP_URL` and
   `CRON_SECRET`. `vercel.json` runs `GET /api/cron/airtable` hourly; Vercel
   sends `Authorization: Bearer $CRON_SECRET` itself. Users, Ships and Orders are
   mirrored on every change and on each run; approved ships are filed once to
   YSWS Project Submission. Admins can also resync from `/admin`.

7. For the Slack "join" button, set `SLACK_JOIN_SECRET` and point the webhook at
   `POST https://<host>/api/slack/join` with `Authorization: Bearer <secret>`
   (or `?secret=`) and the Slack ID as `slack_id`, in a JSON or form body or the
   query string. It creates the user and mirrors them to Airtable; signing in
   later claims that row, and they still go through `/welcome`. Give the bot
   `users:read` and `users:read.email` so the row gets their Slack name and email.

The build runs migrations against `DATABASE_URL` before `next build`.
