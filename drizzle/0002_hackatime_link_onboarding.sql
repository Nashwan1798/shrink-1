ALTER TABLE "oauth_states" ADD COLUMN "purpose" text DEFAULT 'hca' NOT NULL;--> statement-breakpoint
ALTER TABLE "oauth_states" ADD COLUMN "user_id" text;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "hackatime_account_id" text;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "hackatime_token_encrypted" text;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "hackatime_linked_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "onboarded_at" timestamp with time zone;--> statement-breakpoint
CREATE UNIQUE INDEX "users_hackatime_account_idx" ON "users" USING btree ("hackatime_account_id");