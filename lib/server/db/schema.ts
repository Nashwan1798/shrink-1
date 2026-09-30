import { sql } from "drizzle-orm";
import {
  bigint,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";

import type { Check } from "@/lib/scan";

const id = () =>
  text("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`);
const now = (name: string) => timestamp(name, { withTimezone: true }).notNull().defaultNow();

export const roleEnum = pgEnum("role", ["participant", "reviewer", "admin"]);
export const shipStateEnum = pgEnum("ship_state", ["pending", "approved", "rejected"]);
export const orderStateEnum = pgEnum("order_state", ["placed", "fulfilled", "rejected"]);
export const entryTypeEnum = pgEnum("entry_type", ["award", "order", "refund", "adjustment"]);

export const users = pgTable(
  "users",
  {
    id: id(),
    // Null until the person signs in with Hack Club Auth; people who hit "join"
    // in Slack get a row first, keyed by slackId.
    hcaSubject: text("hca_subject"),
    email: text("email").notNull(),
    displayName: text("display_name").notNull(),
    avatarUrl: text("avatar_url"),
    slackId: text("slack_id"),
    verificationStatus: text("verification_status"),
    eligibility: text("eligibility").notNull().default("undetermined"),
    eligibilityAt: timestamp("eligibility_at", { withTimezone: true }),
    birthdate: text("birthdate"),
    role: roleEnum("role").notNull().default("participant"),
    hcaTokenEncrypted: text("hca_token_encrypted"),
    hcaTokenExpiresAt: timestamp("hca_token_expires_at", { withTimezone: true }),
    hackatimeAccountId: text("hackatime_account_id"),
    hackatimeTokenEncrypted: text("hackatime_token_encrypted"),
    hackatimeLinkedAt: timestamp("hackatime_linked_at", { withTimezone: true }),
    onboardedAt: timestamp("onboarded_at", { withTimezone: true }),
    createdAt: now("created_at"),
    lastSeenAt: now("last_seen_at"),
  },
  (t) => [
    uniqueIndex("users_hca_subject_idx").on(t.hcaSubject),
    index("users_email_idx").on(t.email),
    uniqueIndex("users_hackatime_account_idx").on(t.hackatimeAccountId),
  ],
);

export const sessions = pgTable(
  "sessions",
  {
    id: id(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    tokenHash: text("token_hash").notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    revokedAt: timestamp("revoked_at", { withTimezone: true }),
    createdAt: now("created_at"),
  },
  (t) => [uniqueIndex("sessions_token_hash_idx").on(t.tokenHash), index("sessions_user_idx").on(t.userId)],
);

export const oauthStates = pgTable("oauth_states", {
  state: text("state").primaryKey(),
  // Which callback may consume it, so an HCA state can't finish a Hackatime link.
  purpose: text("purpose").notNull().default("hca"),
  userId: text("user_id"),
  codeVerifier: text("code_verifier").notNull(),
  redirectTo: text("redirect_to"),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  consumedAt: timestamp("consumed_at", { withTimezone: true }),
  createdAt: now("created_at"),
});

export const ships = pgTable(
  "ships",
  {
    id: id(),
    number: integer("number").generatedAlwaysAsIdentity(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id),
    title: text("title").notNull(),
    description: text("description").notNull(),
    dataUri: text("data_uri").notNull(),
    bytes: integer("bytes").notNull(),
    sourceUrl: text("source_url"),
    hackatimeProjects: text("hackatime_projects").array().notNull(),
    claimedSeconds: bigint("claimed_seconds", { mode: "number" }).notNull(),
    claimedBadges: text("claimed_badges").array().notNull().default([]),
    reshipOf: text("reship_of"),
    scan: jsonb("scan").$type<Check[]>(),

    state: shipStateEnum("state").notNull().default("pending"),
    reviewerId: text("reviewer_id").references(() => users.id),
    reviewedAt: timestamp("reviewed_at", { withTimezone: true }),
    awardedSeconds: bigint("awarded_seconds", { mode: "number" }),
    awardedBadges: text("awarded_badges").array(),
    awardedBites: integer("awarded_bites"),
    publicMessage: text("public_message"),
    // Never shown to the author.
    internalNote: text("internal_note"),
    createdAt: now("created_at"),
  },
  (t) => [
    index("ships_user_idx").on(t.userId),
    index("ships_state_idx").on(t.state, t.createdAt),
    uniqueIndex("ships_number_idx").on(t.number),
  ],
);

export const ledgerEntries = pgTable(
  "ledger_entries",
  {
    id: id(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id),
    amount: integer("amount").notNull(),
    type: entryTypeEnum("type").notNull(),
    reason: text("reason").notNull(),
    idempotencyKey: text("idempotency_key").notNull(),
    actorId: text("actor_id"),
    createdAt: now("created_at"),
  },
  (t) => [uniqueIndex("ledger_key_idx").on(t.idempotencyKey), index("ledger_user_idx").on(t.userId)],
);

export const orders = pgTable(
  "orders",
  {
    id: id(),
    number: integer("number").generatedAlwaysAsIdentity(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id),
    rewardSlug: text("reward_slug").notNull(),
    rewardName: text("reward_name").notNull(),
    cost: integer("cost").notNull(),
    state: orderStateEnum("state").notNull().default("placed"),
    shippingEncrypted: text("shipping_encrypted"),
    note: text("note"),
    handledBy: text("handled_by").references(() => users.id),
    handledAt: timestamp("handled_at", { withTimezone: true }),
    internalNote: text("internal_note"),
    createdAt: now("created_at"),
  },
  (t) => [index("orders_user_idx").on(t.userId), index("orders_state_idx").on(t.state, t.createdAt)],
);

export const auditEvents = pgTable("audit_events", {
  id: id(),
  actorId: text("actor_id"),
  action: text("action").notNull(),
  subject: text("subject"),
  detail: jsonb("detail"),
  createdAt: now("created_at"),
});

export const rateHits = pgTable(
  "rate_hits",
  {
    id: id(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    bucket: text("bucket").notNull(),
    createdAt: now("created_at"),
  },
  (t) => [index("rate_hits_user_bucket_idx").on(t.userId, t.bucket, t.createdAt)],
);

// Pre-ship scan results keyed by repo commit, so re-scans of an unchanged repo
// skip GitHub and the LLM.
export const scanCache = pgTable("scan_cache", {
  key: text("key").primaryKey(),
  value: jsonb("value").notNull(),
  createdAt: now("created_at"),
});

// One row per person per UTC day of Hackatime activity, refreshed by the cron
// and the stats page. `htmlSeconds` is the SHRINK signal: time in HTML.
export const hackatimeDays = pgTable(
  "hackatime_days",
  {
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    day: text("day").notNull(),
    totalSeconds: integer("total_seconds").notNull().default(0),
    htmlSeconds: integer("html_seconds").notNull().default(0),
    languages: jsonb("languages").$type<{ name: string; seconds: number }[]>().notNull().default([]),
    projects: jsonb("projects").$type<{ name: string; seconds: number }[]>().notNull().default([]),
    fetchedAt: now("fetched_at"),
  },
  (t) => [primaryKey({ columns: [t.userId, t.day] }), index("hackatime_days_day_idx").on(t.day)],
);

export type User = typeof users.$inferSelect;
export type HackatimeDay = typeof hackatimeDays.$inferSelect;
export type Ship = typeof ships.$inferSelect;
export type Order = typeof orders.$inferSelect;
export type LedgerEntry = typeof ledgerEntries.$inferSelect;
