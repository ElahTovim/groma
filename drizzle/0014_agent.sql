CREATE TYPE "public"."statut_proposition" AS ENUM('en_attente', 'acceptee', 'refusee');--> statement-breakpoint
CREATE TABLE "agent_etapes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"execution_id" uuid,
	"compte_id" uuid NOT NULL,
	"origine" text NOT NULL,
	"outil" text NOT NULL,
	"entrees" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"resultat" text,
	"ok" boolean DEFAULT true NOT NULL,
	"suspect" text,
	"cree_le" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "agent_executions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"compte_id" uuid NOT NULL,
	"demande" text NOT NULL,
	"statut" text DEFAULT 'en_cours' NOT NULL,
	"reponse" text,
	"cout_eur" numeric(12, 6) DEFAULT '0' NOT NULL,
	"tours" integer DEFAULT 0 NOT NULL,
	"erreur" text,
	"debut" timestamp with time zone DEFAULT now() NOT NULL,
	"fin" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "jetons_mcp" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"compte_id" uuid NOT NULL,
	"empreinte" text NOT NULL,
	"nom" text NOT NULL,
	"execution_id" uuid,
	"expire_le" timestamp with time zone,
	"revoque_le" timestamp with time zone,
	"derniere_utilisation" timestamp with time zone,
	"cree_le" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "jetons_mcp_empreinte_unique" UNIQUE("empreinte")
);
--> statement-breakpoint
CREATE TABLE "propositions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"execution_id" uuid,
	"propose_par" uuid NOT NULL,
	"chantier_id" uuid NOT NULL,
	"type" text NOT NULL,
	"contenu" jsonb NOT NULL,
	"statut" "statut_proposition" DEFAULT 'en_attente' NOT NULL,
	"motif" text,
	"decide_par" uuid,
	"decide_le" timestamp with time zone,
	"cree_le" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "agent_etapes" ADD CONSTRAINT "agent_etapes_execution_id_agent_executions_id_fk" FOREIGN KEY ("execution_id") REFERENCES "public"."agent_executions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "agent_etapes" ADD CONSTRAINT "agent_etapes_compte_id_comptes_id_fk" FOREIGN KEY ("compte_id") REFERENCES "public"."comptes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "agent_executions" ADD CONSTRAINT "agent_executions_compte_id_comptes_id_fk" FOREIGN KEY ("compte_id") REFERENCES "public"."comptes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "jetons_mcp" ADD CONSTRAINT "jetons_mcp_compte_id_comptes_id_fk" FOREIGN KEY ("compte_id") REFERENCES "public"."comptes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "jetons_mcp" ADD CONSTRAINT "jetons_mcp_execution_id_agent_executions_id_fk" FOREIGN KEY ("execution_id") REFERENCES "public"."agent_executions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "propositions" ADD CONSTRAINT "propositions_execution_id_agent_executions_id_fk" FOREIGN KEY ("execution_id") REFERENCES "public"."agent_executions"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "propositions" ADD CONSTRAINT "propositions_propose_par_comptes_id_fk" FOREIGN KEY ("propose_par") REFERENCES "public"."comptes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "propositions" ADD CONSTRAINT "propositions_chantier_id_chantiers_id_fk" FOREIGN KEY ("chantier_id") REFERENCES "public"."chantiers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "propositions" ADD CONSTRAINT "propositions_decide_par_comptes_id_fk" FOREIGN KEY ("decide_par") REFERENCES "public"."comptes"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "agent_etapes_execution" ON "agent_etapes" USING btree ("execution_id","cree_le");--> statement-breakpoint
CREATE INDEX "agent_executions_compte" ON "agent_executions" USING btree ("compte_id","debut");--> statement-breakpoint
CREATE INDEX "propositions_statut" ON "propositions" USING btree ("statut","cree_le");