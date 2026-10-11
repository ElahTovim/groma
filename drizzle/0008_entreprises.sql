CREATE TABLE "entreprises" (
	"siren" text PRIMARY KEY NOT NULL,
	"siret" text,
	"nom" text NOT NULL,
	"adresse" text,
	"activite" text,
	"ferme" boolean DEFAULT false NOT NULL,
	"fermee_le" date,
	"creee_le" date,
	"verifiee_le" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "chantiers" ADD COLUMN "client_siren" text;--> statement-breakpoint
ALTER TABLE "comptes" ADD COLUMN "siren" text;--> statement-breakpoint
ALTER TABLE "chantiers" ADD CONSTRAINT "chantiers_client_siren_entreprises_siren_fk" FOREIGN KEY ("client_siren") REFERENCES "public"."entreprises"("siren") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "comptes" ADD CONSTRAINT "comptes_siren_entreprises_siren_fk" FOREIGN KEY ("siren") REFERENCES "public"."entreprises"("siren") ON DELETE set null ON UPDATE no action;