import { boolean, date, numeric, pgEnum, pgTable, text, timestamp, unique, uuid } from "drizzle-orm/pg-core";

// Les trois rôles de docs/cycle-de-vie.md. La qualité d'un externe (client,
// syndic…) n'est pas un rôle : elle vit sur la participation à un chantier.
export const role = pgEnum("role", ["gerant", "equipe", "externe"]);

export const statutChantier = pgEnum("statut_chantier", [
  "devis",
  "signe",
  "planifie",
  "en_cours",
  "reception",
  "clos",
  "annule",
]);

export const comptes = pgTable("comptes", {
  id: uuid("id").primaryKey().defaultRandom(),
  email: text("email").notNull().unique(),
  nom: text("nom").notNull(),
  motDePasseHash: text("mot_de_passe_hash").notNull(),
  role: role("role").notNull(),
  // Vrai pour les comptes créés par le jeu de données fictif.
  fictif: boolean("fictif").notNull().default(false),
  creeLe: timestamp("cree_le", { withTimezone: true }).notNull().defaultNow(),
});

export const chantiers = pgTable("chantiers", {
  id: uuid("id").primaryKey().defaultRandom(),
  reference: text("reference").notNull().unique(),
  nom: text("nom").notNull(),
  client: text("client").notNull(),
  adresse: text("adresse").notNull(),
  codePostal: text("code_postal").notNull(),
  ville: text("ville").notNull(),
  // Interne : jamais envoyé à un externe.
  montantHt: numeric("montant_ht", { precision: 12, scale: 2 }),
  statut: statutChantier("statut").notNull().default("devis"),
  debutPrevu: date("debut_prevu"),
  finPrevue: date("fin_prevue"),
  motifAnnulation: text("motif_annulation"),
  creePar: uuid("cree_par").references(() => comptes.id),
  fictif: boolean("fictif").notNull().default(false),
  creeLe: timestamp("cree_le", { withTimezone: true }).notNull().defaultNow(),
});

// Qui est invité sur quel chantier, et à quel titre. Tout accès à un chantier
// passe par cette table (voir lib/acces.ts).
export const participants = pgTable(
  "participants",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    chantierId: uuid("chantier_id")
      .notNull()
      .references(() => chantiers.id, { onDelete: "cascade" }),
    compteId: uuid("compte_id")
      .notNull()
      .references(() => comptes.id, { onDelete: "cascade" }),
    // Un libellé (« client », « architecte »…), jamais une condition dans le code.
    qualite: text("qualite").notNull(),
    inviteLe: timestamp("invite_le", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [unique("participant_unique").on(t.chantierId, t.compteId)],
);

export type Compte = typeof comptes.$inferSelect;
export type Chantier = typeof chantiers.$inferSelect;
export type Role = (typeof role.enumValues)[number];
export type StatutChantier = (typeof statutChantier.enumValues)[number];
