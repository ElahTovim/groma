CREATE EXTENSION IF NOT EXISTS vector;--> statement-breakpoint
CREATE TYPE "public"."statut_courrier" AS ENUM('a_relire', 'valide', 'rejete');--> statement-breakpoint
CREATE TABLE "analyses_nuit" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"nuit" date NOT NULL,
	"texte" text NOT NULL,
	"points" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"cree_le" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "analyses_nuit_nuit_unique" UNIQUE("nuit")
);
--> statement-breakpoint
CREATE TABLE "appels_ia" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"compte_id" uuid,
	"fonction" text NOT NULL,
	"modele" text NOT NULL,
	"jetons_entree" integer DEFAULT 0 NOT NULL,
	"jetons_sortie" integer DEFAULT 0 NOT NULL,
	"jetons_cache" integer DEFAULT 0 NOT NULL,
	"cout_eur" numeric(12, 6) DEFAULT '0' NOT NULL,
	"duree_ms" integer,
	"ok" boolean DEFAULT true NOT NULL,
	"erreur" text,
	"cree_le" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "courriers" (
	"id" text PRIMARY KEY NOT NULL,
	"texte" text NOT NULL,
	"champs" jsonb,
	"incertitudes" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"categorie" text,
	"resume" text,
	"brouillon" text,
	"chantier_id" uuid,
	"statut" "statut_courrier" DEFAULT 'a_relire' NOT NULL,
	"valide_par" uuid,
	"valide_le" timestamp with time zone,
	"lu_le" timestamp with time zone,
	"recu_le" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "documents" (
	"id" text PRIMARY KEY NOT NULL,
	"titre" text NOT NULL,
	"type" text,
	"nb_pages" integer NOT NULL,
	"empreinte" text NOT NULL,
	"indexe_le" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "morceaux" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"document_id" text NOT NULL,
	"page" integer NOT NULL,
	"rang" integer DEFAULT 0 NOT NULL,
	"texte" text NOT NULL,
	"vecteur" vector(1024) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "trajets" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"origine" text NOT NULL,
	"destination" text NOT NULL,
	"km" double precision NOT NULL,
	"minutes" integer NOT NULL,
	"calcule_le" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "un_trajet" UNIQUE("origine","destination")
);
--> statement-breakpoint
ALTER TABLE "entreprises" ADD COLUMN "latitude" double precision;--> statement-breakpoint
ALTER TABLE "entreprises" ADD COLUMN "longitude" double precision;--> statement-breakpoint
ALTER TABLE "lots" ADD COLUMN "delai_fournisseur_jours" integer;--> statement-breakpoint
ALTER TABLE "appels_ia" ADD CONSTRAINT "appels_ia_compte_id_comptes_id_fk" FOREIGN KEY ("compte_id") REFERENCES "public"."comptes"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "courriers" ADD CONSTRAINT "courriers_chantier_id_chantiers_id_fk" FOREIGN KEY ("chantier_id") REFERENCES "public"."chantiers"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "courriers" ADD CONSTRAINT "courriers_valide_par_comptes_id_fk" FOREIGN KEY ("valide_par") REFERENCES "public"."comptes"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "morceaux" ADD CONSTRAINT "morceaux_document_id_documents_id_fk" FOREIGN KEY ("document_id") REFERENCES "public"."documents"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "appels_ia_compte_date" ON "appels_ia" USING btree ("compte_id","cree_le");--> statement-breakpoint
CREATE INDEX "appels_ia_date" ON "appels_ia" USING btree ("cree_le");--> statement-breakpoint
CREATE INDEX "morceaux_vecteur" ON "morceaux" USING hnsw ("vecteur" vector_cosine_ops);--> statement-breakpoint
CREATE INDEX "morceaux_document" ON "morceaux" USING btree ("document_id","page");