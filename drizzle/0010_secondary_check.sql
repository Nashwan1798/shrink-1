ALTER TABLE "ships" ADD COLUMN "verdict" jsonb;--> statement-breakpoint
ALTER TABLE "ships" ADD COLUMN "secondary_id" text;--> statement-breakpoint
ALTER TABLE "ships" ADD COLUMN "secondary_state" text;--> statement-breakpoint
ALTER TABLE "ships" ADD COLUMN "secondary_score" integer;--> statement-breakpoint
ALTER TABLE "ships" ADD COLUMN "secondary_note" text;--> statement-breakpoint
ALTER TABLE "ships" ADD COLUMN "secondary_seconds" bigint;--> statement-breakpoint
ALTER TABLE "ships" ADD COLUMN "secondary_at" timestamp with time zone;