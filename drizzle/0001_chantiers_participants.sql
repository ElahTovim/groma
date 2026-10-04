CREATE TYPE "public"."statut_chantier" AS ENUM('devis', 'signe', 'planifie', 'en_cours', 'reception', 'clos', 'annule');--> statement-breakpoint
CREATE TABLE "chantiers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"reference" text NOT NULL,
	"nom" text NOT NULL,
	"client" text NOT NULL,
	"adresse" text NOT NULL,
	"code_postal" text NOT NULL,
	"ville" text NOT NULL,
	"montant_ht" numeric(12, 2),
	"statut" "statut_chantier" DEFAULT 'devis' NOT NULL,
	"debut_prevu" date,
	"fin_prevue" date,
	"motif_annulation" text,
	"cree_par" uuid,
	"fictif" boolean DEFAULT false NOT NULL,
	"cree_le" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "chantiers_reference_unique" UNIQUE("reference")
);
--> statement-breakpoint
CREATE TABLE "participants" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"chantier_id" uuid NOT NULL,
	"compte_id" uuid NOT NULL,
	"qualite" text NOT NULL,
	"invite_le" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "participant_unique" UNIQUE("chantier_id","compte_id")
);
--> statement-breakpoint
ALTER TABLE "comptes" ADD COLUMN "fictif" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "chantiers" ADD CONSTRAINT "chantiers_cree_par_comptes_id_fk" FOREIGN KEY ("cree_par") REFERENCES "public"."comptes"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "participants" ADD CONSTRAINT "participants_chantier_id_chantiers_id_fk" FOREIGN KEY ("chantier_id") REFERENCES "public"."chantiers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "participants" ADD CONSTRAINT "participants_compte_id_comptes_id_fk" FOREIGN KEY ("compte_id") REFERENCES "public"."comptes"("id") ON DELETE cascade ON UPDATE no action;