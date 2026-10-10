CREATE TABLE "limites" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"sujet" text NOT NULL,
	"cle" text NOT NULL,
	"cree_le" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "comptes" ADD COLUMN "version_session" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
CREATE INDEX "limites_sujet_cle_date" ON "limites" USING btree ("sujet","cle","cree_le");