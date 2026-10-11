CREATE TABLE "recapitulatifs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"jour" date NOT NULL,
	"compte_id" uuid NOT NULL,
	"envoye_le" timestamp with time zone DEFAULT now() NOT NULL,
	"parti" boolean DEFAULT false NOT NULL,
	CONSTRAINT "un_recap_par_jour" UNIQUE("jour","compte_id")
);
--> statement-breakpoint
ALTER TABLE "recapitulatifs" ADD CONSTRAINT "recapitulatifs_compte_id_comptes_id_fk" FOREIGN KEY ("compte_id") REFERENCES "public"."comptes"("id") ON DELETE cascade ON UPDATE no action;