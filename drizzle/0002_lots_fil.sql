CREATE TYPE "public"."statut_lot" AS ENUM('a_commander', 'commande', 'livre', 'pose', 'fini');--> statement-breakpoint
CREATE TYPE "public"."statut_signalement" AS ENUM('a_qualifier', 'reserve_ouverte', 'levee', 'ecarte');--> statement-breakpoint
CREATE TYPE "public"."type_fil" AS ENUM('message', 'demande', 'reponse', 'disponibilite', 'document', 'signalement');--> statement-breakpoint
CREATE TABLE "fil" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"chantier_id" uuid NOT NULL,
	"lot_id" uuid,
	"auteur_id" uuid NOT NULL,
	"type" "type_fil" NOT NULL,
	"texte" text NOT NULL,
	"destinataire_id" uuid,
	"date_cible" date,
	"statut_signalement" "statut_signalement",
	"motif" text,
	"visible_par" uuid[] DEFAULT '{}' NOT NULL,
	"cree_le" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "lots" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"chantier_id" uuid NOT NULL,
	"nom" text NOT NULL,
	"statut" "statut_lot" DEFAULT 'a_commander' NOT NULL,
	"fournisseur_id" uuid,
	"livraison_prevue" date,
	"fin_prevue" date,
	"cree_le" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "fil" ADD CONSTRAINT "fil_chantier_id_chantiers_id_fk" FOREIGN KEY ("chantier_id") REFERENCES "public"."chantiers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fil" ADD CONSTRAINT "fil_lot_id_lots_id_fk" FOREIGN KEY ("lot_id") REFERENCES "public"."lots"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fil" ADD CONSTRAINT "fil_auteur_id_comptes_id_fk" FOREIGN KEY ("auteur_id") REFERENCES "public"."comptes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fil" ADD CONSTRAINT "fil_destinataire_id_comptes_id_fk" FOREIGN KEY ("destinataire_id") REFERENCES "public"."comptes"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lots" ADD CONSTRAINT "lots_chantier_id_chantiers_id_fk" FOREIGN KEY ("chantier_id") REFERENCES "public"."chantiers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lots" ADD CONSTRAINT "lots_fournisseur_id_comptes_id_fk" FOREIGN KEY ("fournisseur_id") REFERENCES "public"."comptes"("id") ON DELETE set null ON UPDATE no action;