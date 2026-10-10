import { sql } from "drizzle-orm";
import { boolean, date, doublePrecision, index, integer, jsonb, numeric, pgEnum, pgTable, text, timestamp, unique, uniqueIndex, uuid } from "drizzle-orm/pg-core";

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
  // Augmente à chaque changement de mot de passe : les sessions ouvertes avant
  // portent l'ancien numéro et ne sont plus acceptées.
  versionSession: integer("version_session").notNull().default(0),
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
  // Coordonnées trouvées par l'API Adresse, pour la météo. Vides si l'adresse est introuvable.
  latitude: doublePrecision("latitude"),
  longitude: doublePrecision("longitude"),
  // La photo du chantier, rangée en privé sur Vercel Blob, servie par /api/photos/[id].
  photoUrl: text("photo_url"),
  // D'où vient le chantier : saisi dans groma, ou importé par le flux de nuit.
  origine: text("origine").notNull().default("saisie"),
  // Ce que le flux de nuit envoie en plus : le nom du chef (sans compte), la catégorie, l'avancement.
  chefIndique: text("chef_indique"),
  categorie: text("categorie"),
  avancementPct: integer("avancement_pct"),
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

export const statutLot = pgEnum("statut_lot", ["a_commander", "commande", "livre", "pose", "fini"]);

export const typeFil = pgEnum("type_fil", ["message", "demande", "reponse", "disponibilite", "document", "signalement"]);

export const statutSignalement = pgEnum("statut_signalement", ["a_qualifier", "reserve_ouverte", "levee", "ecarte"]);

// Un chantier se découpe en lots (carrelage, électricité…). Interne : un externe
// ne voit jamais les lots ni leurs retards.
export const lots = pgTable("lots", {
  id: uuid("id").primaryKey().defaultRandom(),
  chantierId: uuid("chantier_id")
    .notNull()
    .references(() => chantiers.id, { onDelete: "cascade" }),
  nom: text("nom").notNull(),
  statut: statutLot("statut").notNull().default("a_commander"),
  fournisseurId: uuid("fournisseur_id").references(() => comptes.id, { onDelete: "set null" }),
  livraisonPrevue: date("livraison_prevue"),
  finPrevue: date("fin_prevue"),
  creeLe: timestamp("cree_le", { withTimezone: true }).notNull().defaultNow(),
});

// Le fil du chantier. Tout élément est interne par défaut ; « visible_par » liste
// les comptes externes qui ont été cochés dans « Qui voit ça ? ».
export const fil = pgTable("fil", {
  id: uuid("id").primaryKey().defaultRandom(),
  chantierId: uuid("chantier_id")
    .notNull()
    .references(() => chantiers.id, { onDelete: "cascade" }),
  lotId: uuid("lot_id").references(() => lots.id, { onDelete: "set null" }),
  // L'auteur a un compte, ou bien (événements du flux de nuit) seulement un nom.
  auteurId: uuid("auteur_id").references(() => comptes.id, { onDelete: "cascade" }),
  auteurNom: text("auteur_nom"),
  type: typeFil("type").notNull(),
  texte: text("texte").notNull(),
  // Demande : à qui, et pour quand. Disponibilité : quel jour.
  destinataireId: uuid("destinataire_id").references(() => comptes.id, { onDelete: "set null" }),
  dateCible: date("date_cible"),
  // Signalement : son statut, et le motif quand il est écarté.
  statutSignalement: statutSignalement("statut_signalement"),
  motif: text("motif"),
  visiblePar: uuid("visible_par").array().notNull().default([]),
  // Pièce jointe, rangée sur Vercel Blob ; servie seulement par /api/fichiers/[id], après vérification des droits.
  fichierUrl: text("fichier_url"),
  fichierNom: text("fichier_nom"),
  fichierType: text("fichier_type"),
  fichierTaille: integer("fichier_taille"),
  creeLe: timestamp("cree_le", { withTimezone: true }).notNull().defaultNow(),
});

export const typeJeton = pgEnum("type_jeton", ["invitation", "reinitialisation"]);

// Les liens à usage unique envoyés par courriel. On ne garde que l'empreinte du
// jeton : même avec la base, on ne peut pas reconstituer un lien.
export const jetons = pgTable("jetons", {
  id: uuid("id").primaryKey().defaultRandom(),
  type: typeJeton("type").notNull(),
  empreinte: text("empreinte").notNull().unique(),
  email: text("email").notNull(),
  // Invitation : sur quel chantier, avec quel rôle et quelle qualité.
  chantierId: uuid("chantier_id").references(() => chantiers.id, { onDelete: "cascade" }),
  role: role("role"),
  qualite: text("qualite"),
  creePar: uuid("cree_par").references(() => comptes.id, { onDelete: "set null" }),
  expireLe: timestamp("expire_le", { withTimezone: true }).notNull(),
  utiliseLe: timestamp("utilise_le", { withTimezone: true }),
  creeLe: timestamp("cree_le", { withTimezone: true }).notNull().defaultNow(),
});

// Les compteurs des limites (tentatives de connexion, invitations, fichiers) :
// une ligne par tentative, comptée sur une fenêtre de temps glissante.
export const limites = pgTable(
  "limites",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    sujet: text("sujet").notNull(),
    cle: text("cle").notNull(),
    creeLe: timestamp("cree_le", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("limites_sujet_cle_date").on(t.sujet, t.cle, t.creeLe)],
);

// ——— La machine de nuit (semaine 2) ———

export const statutExecution = pgEnum("statut_execution", ["en_cours", "ok", "partiel", "echec"]);

// Une ligne par exécution de l'import : c'est le journal et le tableau de bord de la nuit.
export const executions = pgTable(
  "executions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    nuit: date("nuit").notNull(),
    declencheur: text("declencheur").notNull(), // nuit, rattrapage, manuel
    statut: statutExecution("statut").notNull().default("en_cours"),
    debut: timestamp("debut", { withTimezone: true }).notNull().defaultNow(),
    fin: timestamp("fin", { withTimezone: true }),
    dureeMs: integer("duree_ms"),
    recus: integer("recus").notNull().default(0),
    doublons: integer("doublons").notNull().default(0),
    appliques: integer("appliques").notNull().default(0),
    rejetes: integer("rejetes").notNull().default(0),
    appelsFlux: integer("appels_flux").notNull().default(0),
    erreur: text("erreur"),
  },
  // Une seule exécution en cours à la fois pour une même nuit : deux déclenchements
  // simultanés ne peuvent pas importer deux fois.
  (t) => [uniqueIndex("une_execution_en_cours_par_nuit").on(t.nuit).where(sql`statut = 'en_cours'`)],
);

// Chaque événement reçu du flux, une seule fois : son identifiant est la clé.
// C'est ce qui rend l'import idempotent (rejouer une nuit ne double rien).
export const evenementsFlux = pgTable("evenements_flux", {
  id: text("id").primaryKey(),
  nuit: date("nuit").notNull(),
  type: text("type").notNull(),
  reference: text("reference"),
  resultat: text("resultat").notNull(), // applique, rejete
  raison: text("raison"),
  donnees: jsonb("donnees"),
  executionId: uuid("execution_id").references(() => executions.id, { onDelete: "set null" }),
  recuLe: timestamp("recu_le", { withTimezone: true }).notNull().defaultNow(),
});

export type Compte = typeof comptes.$inferSelect;
export type Chantier = typeof chantiers.$inferSelect;
export type Role = (typeof role.enumValues)[number];
export type StatutChantier = (typeof statutChantier.enumValues)[number];
export type StatutLot = (typeof statutLot.enumValues)[number];
export type TypeFil = (typeof typeFil.enumValues)[number];
export type StatutSignalement = (typeof statutSignalement.enumValues)[number];
