CREATE TYPE "public"."statut_piece" AS ENUM('deposee', 'validee', 'refusee');--> statement-breakpoint
CREATE TABLE "exigences_pieces" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"chantier_id" uuid NOT NULL,
	"compte_id" uuid,
	"type" text NOT NULL,
	"bloque" text,
	"cree_par" uuid,
	"cree_le" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "une_exigence" UNIQUE NULLS NOT DISTINCT("chantier_id","compte_id","type")
);
--> statement-breakpoint
CREATE TABLE "pieces" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"type" text NOT NULL,
	"compte_id" uuid,
	"chantier_id" uuid,
	"fichier_url" text NOT NULL,
	"fichier_nom" text NOT NULL,
	"fichier_type" text NOT NULL,
	"fichier_taille" integer NOT NULL,
	"delivree_le" date,
	"expire_le" date,
	"code_securite" text,
	"statut" "statut_piece" DEFAULT 'deposee' NOT NULL,
	"motif" text,
	"depose_par" uuid,
	"validee_par" uuid,
	"validee_le" timestamp with time zone,
	"cree_le" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "relances_pieces" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"compte_id" uuid NOT NULL,
	"type" text NOT NULL,
	"palier" text NOT NULL,
	"echeance" text NOT NULL,
	"envoyee_le" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "une_relance_de_piece" UNIQUE("compte_id","type","palier","echeance")
);
--> statement-breakpoint
ALTER TABLE "exigences_pieces" ADD CONSTRAINT "exigences_pieces_chantier_id_chantiers_id_fk" FOREIGN KEY ("chantier_id") REFERENCES "public"."chantiers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "exigences_pieces" ADD CONSTRAINT "exigences_pieces_compte_id_comptes_id_fk" FOREIGN KEY ("compte_id") REFERENCES "public"."comptes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "exigences_pieces" ADD CONSTRAINT "exigences_pieces_cree_par_comptes_id_fk" FOREIGN KEY ("cree_par") REFERENCES "public"."comptes"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pieces" ADD CONSTRAINT "pieces_compte_id_comptes_id_fk" FOREIGN KEY ("compte_id") REFERENCES "public"."comptes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pieces" ADD CONSTRAINT "pieces_chantier_id_chantiers_id_fk" FOREIGN KEY ("chantier_id") REFERENCES "public"."chantiers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pieces" ADD CONSTRAINT "pieces_depose_par_comptes_id_fk" FOREIGN KEY ("depose_par") REFERENCES "public"."comptes"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pieces" ADD CONSTRAINT "pieces_validee_par_comptes_id_fk" FOREIGN KEY ("validee_par") REFERENCES "public"."comptes"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "relances_pieces" ADD CONSTRAINT "relances_pieces_compte_id_comptes_id_fk" FOREIGN KEY ("compte_id") REFERENCES "public"."comptes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "pieces_compte_type" ON "pieces" USING btree ("compte_id","type","cree_le");--> statement-breakpoint
CREATE INDEX "pieces_chantier_type" ON "pieces" USING btree ("chantier_id","type","cree_le");--> statement-breakpoint
-- Reprise : les attestations de vigilance déjà déposées deviennent des pièces « vigilance »
-- de chaque compte rattaché à l'entreprise ; validées (elles l'étaient de fait), 6 mois.
INSERT INTO "pieces" ("type", "compte_id", "fichier_url", "fichier_nom", "fichier_type", "fichier_taille", "delivree_le", "expire_le", "code_securite", "statut", "depose_par", "cree_le")
SELECT 'vigilance', c."id", a."fichier_url", a."fichier_nom", 'application/pdf', a."fichier_taille", a."delivree_le", (a."delivree_le" + interval '6 months')::date, a."code_securite", 'validee', a."depose_par", a."cree_le"
FROM "attestations" a JOIN "comptes" c ON c."siren" = a."siren";--> statement-breakpoint
-- Reprise : « attestation exigée » cochée sur un participant devient une exigence « vigilance ».
INSERT INTO "exigences_pieces" ("chantier_id", "compte_id", "type")
SELECT "chantier_id", "compte_id", 'vigilance' FROM "participants" WHERE "vigilance" = true
ON CONFLICT DO NOTHING;
