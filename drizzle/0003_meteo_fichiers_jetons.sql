CREATE TYPE "public"."type_jeton" AS ENUM('invitation', 'reinitialisation');--> statement-breakpoint
CREATE TABLE "jetons" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"type" "type_jeton" NOT NULL,
	"empreinte" text NOT NULL,
	"email" text NOT NULL,
	"chantier_id" uuid,
	"role" "role",
	"qualite" text,
	"cree_par" uuid,
	"expire_le" timestamp with time zone NOT NULL,
	"utilise_le" timestamp with time zone,
	"cree_le" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "jetons_empreinte_unique" UNIQUE("empreinte")
);
--> statement-breakpoint
ALTER TABLE "chantiers" ADD COLUMN "latitude" double precision;--> statement-breakpoint
ALTER TABLE "chantiers" ADD COLUMN "longitude" double precision;--> statement-breakpoint
ALTER TABLE "fil" ADD COLUMN "fichier_url" text;--> statement-breakpoint
ALTER TABLE "fil" ADD COLUMN "fichier_nom" text;--> statement-breakpoint
ALTER TABLE "fil" ADD COLUMN "fichier_type" text;--> statement-breakpoint
ALTER TABLE "fil" ADD COLUMN "fichier_taille" integer;--> statement-breakpoint
ALTER TABLE "jetons" ADD CONSTRAINT "jetons_chantier_id_chantiers_id_fk" FOREIGN KEY ("chantier_id") REFERENCES "public"."chantiers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "jetons" ADD CONSTRAINT "jetons_cree_par_comptes_id_fk" FOREIGN KEY ("cree_par") REFERENCES "public"."comptes"("id") ON DELETE set null ON UPDATE no action;