CREATE TYPE "public"."statut_execution" AS ENUM('en_cours', 'ok', 'partiel', 'echec');--> statement-breakpoint
CREATE TABLE "evenements_flux" (
	"id" text PRIMARY KEY NOT NULL,
	"nuit" date NOT NULL,
	"type" text NOT NULL,
	"reference" text,
	"resultat" text NOT NULL,
	"raison" text,
	"donnees" jsonb,
	"execution_id" uuid,
	"recu_le" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "executions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"nuit" date NOT NULL,
	"declencheur" text NOT NULL,
	"statut" "statut_execution" DEFAULT 'en_cours' NOT NULL,
	"debut" timestamp with time zone DEFAULT now() NOT NULL,
	"fin" timestamp with time zone,
	"duree_ms" integer,
	"recus" integer DEFAULT 0 NOT NULL,
	"doublons" integer DEFAULT 0 NOT NULL,
	"appliques" integer DEFAULT 0 NOT NULL,
	"rejetes" integer DEFAULT 0 NOT NULL,
	"appels_flux" integer DEFAULT 0 NOT NULL,
	"erreur" text
);
--> statement-breakpoint
ALTER TABLE "fil" ALTER COLUMN "auteur_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "chantiers" ADD COLUMN "origine" text DEFAULT 'saisie' NOT NULL;--> statement-breakpoint
ALTER TABLE "chantiers" ADD COLUMN "chef_indique" text;--> statement-breakpoint
ALTER TABLE "chantiers" ADD COLUMN "categorie" text;--> statement-breakpoint
ALTER TABLE "chantiers" ADD COLUMN "avancement_pct" integer;--> statement-breakpoint
ALTER TABLE "fil" ADD COLUMN "auteur_nom" text;--> statement-breakpoint
ALTER TABLE "evenements_flux" ADD CONSTRAINT "evenements_flux_execution_id_executions_id_fk" FOREIGN KEY ("execution_id") REFERENCES "public"."executions"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "une_execution_en_cours_par_nuit" ON "executions" USING btree ("nuit") WHERE statut = 'en_cours';