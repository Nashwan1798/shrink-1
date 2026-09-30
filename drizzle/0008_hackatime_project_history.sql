CREATE TABLE "hackatime_project_history" (
	"user_id" text NOT NULL,
	"project" text NOT NULL,
	"before_seconds" integer DEFAULT 0 NOT NULL,
	"checked_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "hackatime_project_history_user_id_project_pk" PRIMARY KEY("user_id","project")
);
--> statement-breakpoint
ALTER TABLE "hackatime_project_history" ADD CONSTRAINT "hackatime_project_history_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;