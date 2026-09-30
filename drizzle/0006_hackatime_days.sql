CREATE TABLE "hackatime_days" (
	"user_id" text NOT NULL,
	"day" text NOT NULL,
	"total_seconds" integer DEFAULT 0 NOT NULL,
	"html_seconds" integer DEFAULT 0 NOT NULL,
	"languages" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"projects" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"fetched_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "hackatime_days_user_id_day_pk" PRIMARY KEY("user_id","day")
);
--> statement-breakpoint
ALTER TABLE "hackatime_days" ADD CONSTRAINT "hackatime_days_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "hackatime_days_day_idx" ON "hackatime_days" USING btree ("day");