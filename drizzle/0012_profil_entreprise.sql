CREATE TABLE "profil_entreprise" (
	"id" integer PRIMARY KEY DEFAULT 1 NOT NULL,
	"nom" text NOT NULL,
	"depot_adresse" text,
	"depot_code_postal" text,
	"depot_ville" text,
	"depot_latitude" double precision,
	"depot_longitude" double precision,
	"modifie_par" uuid,
	"modifie_le" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "profil_entreprise" ADD CONSTRAINT "profil_entreprise_modifie_par_comptes_id_fk" FOREIGN KEY ("modifie_par") REFERENCES "public"."comptes"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "profil_entreprise" ADD CONSTRAINT "une_seule_entreprise" CHECK ("id" = 1);
