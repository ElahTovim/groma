CREATE TABLE "consentements" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"compte_id" uuid NOT NULL,
	"destinataire" text NOT NULL,
	"accepte" boolean NOT NULL,
	"version_politique" text,
	"cree_le" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "profil_entreprise" ADD COLUMN "politique_donnees" text;--> statement-breakpoint
ALTER TABLE "profil_entreprise" ADD COLUMN "politique_modifiee_le" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "consentements" ADD CONSTRAINT "consentements_compte_id_comptes_id_fk" FOREIGN KEY ("compte_id") REFERENCES "public"."comptes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "consentements_compte" ON "consentements" USING btree ("compte_id","destinataire","cree_le");