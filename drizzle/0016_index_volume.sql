CREATE INDEX "fil_chantier" ON "fil" USING btree ("chantier_id","cree_le");--> statement-breakpoint
CREATE INDEX "lots_chantier" ON "lots" USING btree ("chantier_id");--> statement-breakpoint
CREATE INDEX "participants_compte" ON "participants" USING btree ("compte_id");