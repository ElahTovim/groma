import { pgEnum, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";

// Les trois rôles de docs/cycle-de-vie.md. La qualité d'un externe (client,
// syndic…) n'est pas un rôle : elle vivra sur l'invitation à un chantier.
export const role = pgEnum("role", ["gerant", "equipe", "externe"]);

export const comptes = pgTable("comptes", {
  id: uuid("id").primaryKey().defaultRandom(),
  email: text("email").notNull().unique(),
  nom: text("nom").notNull(),
  motDePasseHash: text("mot_de_passe_hash").notNull(),
  role: role("role").notNull(),
  creeLe: timestamp("cree_le", { withTimezone: true }).notNull().defaultNow(),
});

export type Compte = typeof comptes.$inferSelect;
