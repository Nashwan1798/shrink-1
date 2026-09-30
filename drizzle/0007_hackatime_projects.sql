CREATE TABLE "hackatime_projects" (
	"user_id" text NOT NULL,
	"day" text NOT NULL,
	"project" text NOT NULL,
	"seconds" integer DEFAULT 0 NOT NULL,
	"has_html" boolean DEFAULT false NOT NULL,
	"offenders" text[] DEFAULT '{}' NOT NULL,
	CONSTRAINT "hackatime_projects_user_id_day_project_pk" PRIMARY KEY("user_id","day","project")
);
--> statement-breakpoint
ALTER TABLE "hackatime_projects" ADD CONSTRAINT "hackatime_projects_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "hackatime_projects_user_idx" ON "hackatime_projects" USING btree ("user_id","project");