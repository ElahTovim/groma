ALTER TABLE "courriers" ADD COLUMN "origine" text DEFAULT 'flux' NOT NULL;--> statement-breakpoint
ALTER TABLE "courriers" ADD COLUMN "depose_par" uuid;--> statement-breakpoint
ALTER TABLE "courriers" ADD COLUMN "fichier_url" text;--> statement-breakpoint
ALTER TABLE "courriers" ADD COLUMN "fichier_nom" text;--> statement-breakpoint
ALTER TABLE "courriers" ADD COLUMN "motif_rejet" text;--> statement-breakpoint
ALTER TABLE "courriers" ADD COLUMN "erreur_lecture" text;--> statement-breakpoint
ALTER TABLE "courriers" ADD CONSTRAINT "courriers_depose_par_comptes_id_fk" FOREIGN KEY ("depose_par") REFERENCES "public"."comptes"("id") ON DELETE set null ON UPDATE no action;