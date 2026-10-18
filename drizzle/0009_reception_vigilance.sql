CREATE TABLE "attestations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"siren" text NOT NULL,
	"delivree_le" date NOT NULL,
	"code_securite" text,
	"fichier_url" text NOT NULL,
	"fichier_nom" text NOT NULL,
	"fichier_taille" integer NOT NULL,
	"depose_par" uuid,
	"cree_le" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "pv_reception" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"chantier_id" uuid NOT NULL,
	"date_reception" date NOT NULL,
	"reserves" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"observations" text,
	"signataire_id" uuid NOT NULL,
	"prepare_par" uuid,
	"prepare_le" timestamp with time zone DEFAULT now() NOT NULL,
	"signe_le" timestamp with time zone,
	"signe_nom" text,
	"contenu_signe" jsonb,
	"empreinte" text,
	CONSTRAINT "pv_reception_chantier_id_unique" UNIQUE("chantier_id")
);
--> statement-breakpoint
CREATE TABLE "relances_vigilance" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"compte_id" uuid NOT NULL,
	"palier" text NOT NULL,
	"echeance" text NOT NULL,
	"envoyee_le" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "une_relance_par_palier" UNIQUE("compte_id","palier","echeance")
);
--> statement-breakpoint
ALTER TABLE "participants" ADD COLUMN "vigilance" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "attestations" ADD CONSTRAINT "attestations_siren_entreprises_siren_fk" FOREIGN KEY ("siren") REFERENCES "public"."entreprises"("siren") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "attestations" ADD CONSTRAINT "attestations_depose_par_comptes_id_fk" FOREIGN KEY ("depose_par") REFERENCES "public"."comptes"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pv_reception" ADD CONSTRAINT "pv_reception_chantier_id_chantiers_id_fk" FOREIGN KEY ("chantier_id") REFERENCES "public"."chantiers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pv_reception" ADD CONSTRAINT "pv_reception_signataire_id_comptes_id_fk" FOREIGN KEY ("signataire_id") REFERENCES "public"."comptes"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pv_reception" ADD CONSTRAINT "pv_reception_prepare_par_comptes_id_fk" FOREIGN KEY ("prepare_par") REFERENCES "public"."comptes"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "relances_vigilance" ADD CONSTRAINT "relances_vigilance_compte_id_comptes_id_fk" FOREIGN KEY ("compte_id") REFERENCES "public"."comptes"("id") ON DELETE cascade ON UPDATE no action;