CREATE TYPE "public"."entry_type" AS ENUM('award', 'order', 'refund', 'adjustment');--> statement-breakpoint
CREATE TYPE "public"."order_state" AS ENUM('placed', 'fulfilled', 'rejected');--> statement-breakpoint
CREATE TYPE "public"."role" AS ENUM('participant', 'reviewer', 'admin');--> statement-breakpoint
CREATE TYPE "public"."ship_state" AS ENUM('pending', 'approved', 'rejected');--> statement-breakpoint
CREATE TABLE "audit_events" (
	"id" text PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"actor_id" text,
	"action" text NOT NULL,
	"subject" text,
	"detail" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ledger_entries" (
	"id" text PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"amount" integer NOT NULL,
	"type" "entry_type" NOT NULL,
	"reason" text NOT NULL,
	"idempotency_key" text NOT NULL,
	"actor_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "oauth_states" (
	"state" text PRIMARY KEY NOT NULL,
	"code_verifier" text NOT NULL,
	"redirect_to" text,
	"expires_at" timestamp with time zone NOT NULL,
	"consumed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "orders" (
	"id" text PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"number" integer GENERATED ALWAYS AS IDENTITY (sequence name "orders_number_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"user_id" text NOT NULL,
	"reward_slug" text NOT NULL,
	"reward_name" text NOT NULL,
	"cost" integer NOT NULL,
	"state" "order_state" DEFAULT 'placed' NOT NULL,
	"shipping_encrypted" text,
	"note" text,
	"handled_by" text,
	"handled_at" timestamp with time zone,
	"internal_note" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sessions" (
	"id" text PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"token_hash" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"revoked_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ships" (
	"id" text PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"number" integer GENERATED ALWAYS AS IDENTITY (sequence name "ships_number_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"user_id" text NOT NULL,
	"title" text NOT NULL,
	"description" text NOT NULL,
	"data_uri" text NOT NULL,
	"bytes" integer NOT NULL,
	"source_url" text,
	"hackatime_projects" text[] NOT NULL,
	"claimed_seconds" bigint NOT NULL,
	"claimed_badges" text[] DEFAULT '{}' NOT NULL,
	"reship_of" text,
	"state" "ship_state" DEFAULT 'pending' NOT NULL,
	"reviewer_id" text,
	"reviewed_at" timestamp with time zone,
	"awarded_seconds" bigint,
	"awarded_badges" text[],
	"awarded_bites" integer,
	"public_message" text,
	"internal_note" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" text PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"hca_subject" text NOT NULL,
	"email" text NOT NULL,
	"display_name" text NOT NULL,
	"avatar_url" text,
	"slack_id" text,
	"verification_status" text,
	"eligibility" text DEFAULT 'undetermined' NOT NULL,
	"eligibility_at" timestamp with time zone,
	"birthdate" text,
	"role" "role" DEFAULT 'participant' NOT NULL,
	"hca_token_encrypted" text,
	"hca_token_expires_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"last_seen_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "ledger_entries" ADD CONSTRAINT "ledger_entries_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_handled_by_users_id_fk" FOREIGN KEY ("handled_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ships" ADD CONSTRAINT "ships_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ships" ADD CONSTRAINT "ships_reviewer_id_users_id_fk" FOREIGN KEY ("reviewer_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "ledger_key_idx" ON "ledger_entries" USING btree ("idempotency_key");--> statement-breakpoint
CREATE INDEX "ledger_user_idx" ON "ledger_entries" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "orders_user_idx" ON "orders" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "orders_state_idx" ON "orders" USING btree ("state","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "sessions_token_hash_idx" ON "sessions" USING btree ("token_hash");--> statement-breakpoint
CREATE INDEX "sessions_user_idx" ON "sessions" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "ships_user_idx" ON "ships" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "ships_state_idx" ON "ships" USING btree ("state","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "ships_number_idx" ON "ships" USING btree ("number");--> statement-breakpoint
CREATE UNIQUE INDEX "users_hca_subject_idx" ON "users" USING btree ("hca_subject");--> statement-breakpoint
CREATE INDEX "users_email_idx" ON "users" USING btree ("email");