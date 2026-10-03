CREATE TYPE "public"."role" AS ENUM('gerant', 'equipe', 'externe');--> statement-breakpoint
CREATE TABLE "comptes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" text NOT NULL,
	"nom" text NOT NULL,
	"mot_de_passe_hash" text NOT NULL,
	"role" "role" NOT NULL,
	"cree_le" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "comptes_email_unique" UNIQUE("email")
);
