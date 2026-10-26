import { sql } from "drizzle-orm";
import type { ContenuPv } from "@/lib/reception-regles";
import { boolean, date, doublePrecision, index, integer, jsonb, numeric, pgEnum, pgTable, text, timestamp, unique, uniqueIndex, uuid, vector } from "drizzle-orm/pg-core";

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

// Une entreprise vérifiée dans le registre Sirene (API Recherche d'entreprises, sans clé).
// Une seule ligne par SIREN, partagée par les chantiers et les comptes qui la citent.
// Interne : jamais envoyée à un externe.
export const entreprises = pgTable("entreprises", {
  siren: text("siren").primaryKey(),
  siret: text("siret"),
  nom: text("nom").notNull(),
  adresse: text("adresse"),
  activite: text("activite"),
  ferme: boolean("ferme").notNull().default(false),
  fermeeLe: date("fermee_le"),
  // Les coordonnées de l'adresse, pour les temps de livraison (lib/distances.ts).
  latitude: doublePrecision("latitude"),
  longitude: doublePrecision("longitude"),
  creeeLe: date("creee_le"),
  // La machine de nuit revérifie chaque semaine (lib/entreprises-regles.ts).
  verifieeLe: timestamp("verifiee_le", { withTimezone: true }).notNull().defaultNow(),
});

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
  // L'entreprise d'un externe (fournisseur, syndic…), quand on l'a vérifiée.
  siren: text("siren").references(() => entreprises.siren, { onDelete: "set null" }),
  creeLe: timestamp("cree_le", { withTimezone: true }).notNull().defaultNow(),
});

export const chantiers = pgTable("chantiers", {
  id: uuid("id").primaryKey().defaultRandom(),
  reference: text("reference").notNull().unique(),
  nom: text("nom").notNull(),
  client: text("client").notNull(),
  // Quand le client est une entreprise vérifiée dans Sirene.
  clientSiren: text("client_siren").references(() => entreprises.siren, { onDelete: "set null" }),
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
    // Ancien drapeau « attestation de vigilance exigée », repris dans exigences_pieces
    // (migration 0013). N'est plus lu ni écrit : à supprimer à la prochaine migration de ménage.
    vigilance: boolean("vigilance").notNull().default(false),
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
  // Le délai annoncé par le fournisseur entre la commande et l'enlèvement, en jours ouvrés.
  delaiFournisseurJours: integer("delai_fournisseur_jours"),
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

// Le récapitulatif du matin : une ligne par jour et par destinataire, posée avant
// l'envoi. Une relance de la nuit ne peut donc rien envoyer deux fois.
export const recapitulatifs = pgTable(
  "recapitulatifs",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    jour: date("jour").notNull(),
    compteId: uuid("compte_id")
      .notNull()
      .references(() => comptes.id, { onDelete: "cascade" }),
    envoyeLe: timestamp("envoye_le", { withTimezone: true }).notNull().defaultNow(),
    parti: boolean("parti").notNull().default(false),
  },
  (t) => [unique("un_recap_par_jour").on(t.jour, t.compteId)],
);

export type Compte = typeof comptes.$inferSelect;
export type Chantier = typeof chantiers.$inferSelect;
export type Role = (typeof role.enumValues)[number];
export type StatutChantier = (typeof statutChantier.enumValues)[number];
export type StatutLot = (typeof statutLot.enumValues)[number];
export type TypeFil = (typeof typeFil.enumValues)[number];
export type StatutSignalement = (typeof statutSignalement.enumValues)[number];

// ——— La réception et les sous-traitants ———

// Le procès-verbal de réception : un par chantier. Préparé par l'équipe, signé par
// le maître d'ouvrage (un externe choisi). Une fois signé, il ne change plus :
// son contenu est figé et son empreinte le prouve.
export const pvReception = pgTable("pv_reception", {
  id: uuid("id").primaryKey().defaultRandom(),
  chantierId: uuid("chantier_id")
    .notNull()
    .unique()
    .references(() => chantiers.id, { onDelete: "cascade" }),
  dateReception: date("date_reception").notNull(),
  // Les réserves ouvertes au moment du PV, recopiées : le PV ne bouge plus ensuite.
  reserves: jsonb("reserves").$type<{ id: string; texte: string }[]>().notNull().default([]),
  observations: text("observations"),
  signataireId: uuid("signataire_id")
    .notNull()
    .references(() => comptes.id),
  preparePar: uuid("prepare_par").references(() => comptes.id, { onDelete: "set null" }),
  prepareLe: timestamp("prepare_le", { withTimezone: true }).notNull().defaultNow(),
  signeLe: timestamp("signe_le", { withTimezone: true }),
  signeNom: text("signe_nom"),
  // Le contenu exact signé, figé à la signature, et son empreinte SHA-256.
  contenuSigne: jsonb("contenu_signe").$type<ContenuPv>(),
  empreinte: text("empreinte"),
});

// Anciennes attestations de vigilance, reprises dans `pieces` (migration 0013). Ne sont plus
// écrites ; la route /api/attestations/[id] reste pour les liens déjà envoyés.
export const attestations = pgTable("attestations", {
  id: uuid("id").primaryKey().defaultRandom(),
  siren: text("siren")
    .notNull()
    .references(() => entreprises.siren, { onDelete: "cascade" }),
  delivreeLe: date("delivree_le").notNull(),
  // Le code de sécurité imprimé sur l'attestation, vérifiable sur urssaf.fr.
  codeSecurite: text("code_securite"),
  fichierUrl: text("fichier_url").notNull(),
  fichierNom: text("fichier_nom").notNull(),
  fichierTaille: integer("fichier_taille").notNull(),
  deposePar: uuid("depose_par").references(() => comptes.id, { onDelete: "set null" }),
  creeLe: timestamp("cree_le", { withTimezone: true }).notNull().defaultNow(),
});

// Anciennes relances de vigilance, remplacées par relances_pieces. Ne sont plus écrites.
export const relancesVigilance = pgTable(
  "relances_vigilance",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    compteId: uuid("compte_id")
      .notNull()
      .references(() => comptes.id, { onDelete: "cascade" }),
    palier: text("palier").notNull(), // manquante, bientot, expiree
    echeance: text("echeance").notNull(), // la date d'expiration visée, ou « aucune »
    envoyeeLe: timestamp("envoyee_le", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [unique("une_relance_par_palier").on(t.compteId, t.palier, t.echeance)],
);

// ——— L'intelligence (semaine 3) ———

// Un appel au modèle ou au service de vecteurs : ce qu'il a consommé et coûté.
// C'est le compteur des plafonds et la page des coûts.
export const appelsIa = pgTable(
  "appels_ia",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    // Vide pour la machine de nuit, qui n'est pas un compte.
    compteId: uuid("compte_id").references(() => comptes.id, { onDelete: "set null" }),
    fonction: text("fonction").notNull(), // lecture_courrier, question, analyse_nuit, indexation…
    modele: text("modele").notNull(),
    jetonsEntree: integer("jetons_entree").notNull().default(0),
    jetonsSortie: integer("jetons_sortie").notNull().default(0),
    jetonsCache: integer("jetons_cache").notNull().default(0),
    coutEur: numeric("cout_eur", { precision: 12, scale: 6 }).notNull().default("0"),
    dureeMs: integer("duree_ms"),
    ok: boolean("ok").notNull().default(true),
    erreur: text("erreur"),
    creeLe: timestamp("cree_le", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("appels_ia_compte_date").on(t.compteId, t.creeLe), index("appels_ia_date").on(t.creeLe)],
);

export const statutCourrier = pgEnum("statut_courrier", ["a_relire", "valide", "rejete"]);

// Les courriers du flux, lus par le modèle. Ce qu'il en tire reste une proposition
// tant que quelqu'un ne l'a pas validée.
export const courriers = pgTable("courriers", {
  id: text("id").primaryKey(), // l'identifiant du flux, ou « depot-… » pour un courrier déposé
  // D'où vient le courrier : le flux du séminaire, ou déposé dans groma (collé ou en PDF).
  origine: text("origine").notNull().default("flux"),
  deposePar: uuid("depose_par").references(() => comptes.id, { onDelete: "set null" }),
  // Le PDF déposé, privé sur Vercel Blob.
  fichierUrl: text("fichier_url"),
  fichierNom: text("fichier_nom"),
  texte: text("texte").notNull(),
  // Les champs proposés par le modèle (expéditeur, société, référence, date, catégorie, montant) ; null si absent.
  champs: jsonb("champs").$type<Record<string, unknown>>(),
  // Ce que le modèle signale comme incertain, à relire.
  incertitudes: jsonb("incertitudes").$type<string[]>().notNull().default([]),
  categorie: text("categorie"),
  resume: text("resume"),
  brouillon: text("brouillon"),
  chantierId: uuid("chantier_id").references(() => chantiers.id, { onDelete: "set null" }),
  statut: statutCourrier("statut").notNull().default("a_relire"),
  validePar: uuid("valide_par").references(() => comptes.id, { onDelete: "set null" }),
  valideLe: timestamp("valide_le", { withTimezone: true }),
  motifRejet: text("motif_rejet"),
  // Pourquoi la lecture par l'IA a échoué (panne, plafond, réponse hors format).
  erreurLecture: text("erreur_lecture"),
  luLe: timestamp("lu_le", { withTimezone: true }),
  recuLe: timestamp("recu_le", { withTimezone: true }).notNull().defaultNow(),
});

// Les documents du flux, découpés page par page pour la recherche qui cite ses sources.
export const documents = pgTable("documents", {
  id: text("id").primaryKey(), // l'identifiant du flux
  titre: text("titre").notNull(),
  type: text("type"),
  nbPages: integer("nb_pages").notNull(),
  // L'empreinte du contenu : un document inchangé n'est jamais revectorisé.
  empreinte: text("empreinte").notNull(),
  indexeLe: timestamp("indexe_le", { withTimezone: true }).notNull().defaultNow(),
});

// Dimension des vecteurs : celle du modèle Voyage choisi (lib/ia.ts).
export const DIMENSION_VECTEURS = 1024;

export const morceaux = pgTable(
  "morceaux",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    documentId: text("document_id")
      .notNull()
      .references(() => documents.id, { onDelete: "cascade" }),
    page: integer("page").notNull(), // à partir de 1, comme dans le document
    rang: integer("rang").notNull().default(0), // plusieurs morceaux pour une longue page
    texte: text("texte").notNull(),
    vecteur: vector("vecteur", { dimensions: DIMENSION_VECTEURS }).notNull(),
  },
  (t) => [index("morceaux_vecteur").using("hnsw", t.vecteur.op("vector_cosine_ops")), index("morceaux_document").on(t.documentId, t.page)],
);

// Ce que le modèle a tiré de chaque nuit : une seule analyse par nuit.
export const analysesNuit = pgTable("analyses_nuit", {
  id: uuid("id").primaryKey().defaultRandom(),
  nuit: date("nuit").notNull().unique(),
  texte: text("texte").notNull(),
  points: jsonb("points").$type<{ titre: string; detail: string; references: string[] }[]>().notNull().default([]),
  creeLe: timestamp("cree_le", { withTimezone: true }).notNull().defaultNow(),
});

// Les temps de route déjà calculés : un trajet ne se redemande pas au service d'itinéraire.
export const trajets = pgTable(
  "trajets",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    origine: text("origine").notNull(), // « lat,lon » arrondis
    destination: text("destination").notNull(),
    km: doublePrecision("km").notNull(),
    minutes: integer("minutes").notNull(),
    calculeLe: timestamp("calcule_le", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [unique("un_trajet").on(t.origine, t.destination)],
);

// ——— L'entreprise qui utilise groma ———

// Le profil de l'entreprise : une seule ligne (id = 1), modifiée par le gérant dans Réglages.
// Une donnée que le gérant peut vouloir changer vit en base, jamais dans une variable de Vercel.
export const profilEntreprise = pgTable("profil_entreprise", {
  id: integer("id").primaryKey().default(1),
  nom: text("nom").notNull(),
  // Le dépôt : point de départ des trajets de l'équipe et du calcul des zones de déplacement.
  depotAdresse: text("depot_adresse"),
  depotCodePostal: text("depot_code_postal"),
  depotVille: text("depot_ville"),
  depotLatitude: doublePrecision("depot_latitude"),
  depotLongitude: doublePrecision("depot_longitude"),
  modifiePar: uuid("modifie_par").references(() => comptes.id, { onDelete: "set null" }),
  modifieLe: timestamp("modifie_le", { withTimezone: true }).notNull().defaultNow(),
});

// ——— Les pièces attendues ———

export const statutPiece = pgEnum("statut_piece", ["deposee", "validee", "refusee"]);

// Ce qu'on attend, chantier par chantier : de tel intervenant (compteId), ou du chantier lui-même
// (compteId vide : le DOE, l'autorisation d'urbanisme…). Une exigence peut bloquer une étape.
// Le type renvoie aux paramètres de lib/pieces-regles.ts.
export const exigencesPieces = pgTable(
  "exigences_pieces",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    chantierId: uuid("chantier_id")
      .notNull()
      .references(() => chantiers.id, { onDelete: "cascade" }),
    compteId: uuid("compte_id").references(() => comptes.id, { onDelete: "cascade" }),
    type: text("type").notNull(),
    bloque: text("bloque"), // demarrage, cloture, ou vide
    creePar: uuid("cree_par").references(() => comptes.id, { onDelete: "set null" }),
    creeLe: timestamp("cree_le", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [unique("une_exigence").on(t.chantierId, t.compteId, t.type).nullsNotDistinct()],
);

// Une pièce fournie. Celle d'un intervenant (compteId) sert sur tous ses chantiers ; celle d'un
// chantier (chantierId) lui est propre. La plus récente fait foi. Fichier privé, servi par
// /api/pieces/[id] après vérification des droits.
export const pieces = pgTable(
  "pieces",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    type: text("type").notNull(),
    compteId: uuid("compte_id").references(() => comptes.id, { onDelete: "cascade" }),
    chantierId: uuid("chantier_id").references(() => chantiers.id, { onDelete: "cascade" }),
    fichierUrl: text("fichier_url").notNull(),
    fichierNom: text("fichier_nom").notNull(),
    fichierType: text("fichier_type").notNull(),
    fichierTaille: integer("fichier_taille").notNull(),
    delivreeLe: date("delivree_le"),
    expireLe: date("expire_le"),
    // Le code de sécurité imprimé sur une attestation URSSAF, vérifiable sur urssaf.fr.
    codeSecurite: text("code_securite"),
    statut: statutPiece("statut").notNull().default("deposee"),
    motif: text("motif"),
    deposePar: uuid("depose_par").references(() => comptes.id, { onDelete: "set null" }),
    valideePar: uuid("validee_par").references(() => comptes.id, { onDelete: "set null" }),
    valideLe: timestamp("validee_le", { withTimezone: true }),
    creeLe: timestamp("cree_le", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("pieces_compte_type").on(t.compteId, t.type, t.creeLe), index("pieces_chantier_type").on(t.chantierId, t.type, t.creeLe)],
);

// Une relance par pièce, palier et échéance : la machine de nuit ne relance pas deux fois.
export const relancesPieces = pgTable(
  "relances_pieces",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    compteId: uuid("compte_id")
      .notNull()
      .references(() => comptes.id, { onDelete: "cascade" }),
    type: text("type").notNull(),
    palier: text("palier").notNull(),
    echeance: text("echeance").notNull(),
    envoyeeLe: timestamp("envoyee_le", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [unique("une_relance_de_piece").on(t.compteId, t.type, t.palier, t.echeance)],
);

// ——— L'agent (semaine 4) ———
// La mission : docs/mission-agent.md.

// Une exécution de l'assistant : qui l'a lancé, ce qu'il a demandé, ce qui en est sorti.
export const agentExecutions = pgTable(
  "agent_executions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    compteId: uuid("compte_id")
      .notNull()
      .references(() => comptes.id, { onDelete: "cascade" }),
    demande: text("demande").notNull(),
    statut: text("statut").notNull().default("en_cours"), // en_cours, fini, budget, erreur
    reponse: text("reponse"),
    coutEur: numeric("cout_eur", { precision: 12, scale: 6 }).notNull().default("0"),
    tours: integer("tours").notNull().default(0),
    erreur: text("erreur"),
    debut: timestamp("debut", { withTimezone: true }).notNull().defaultNow(),
    fin: timestamp("fin", { withTimezone: true }),
  },
  (t) => [index("agent_executions_compte").on(t.compteId, t.debut)],
);

// Chaque appel d'outil, par l'assistant ou depuis Claude Code (serveur MCP), dans l'ordre.
export const agentEtapes = pgTable(
  "agent_etapes",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    executionId: uuid("execution_id").references(() => agentExecutions.id, { onDelete: "cascade" }),
    compteId: uuid("compte_id")
      .notNull()
      .references(() => comptes.id, { onDelete: "cascade" }),
    origine: text("origine").notNull(), // assistant, mcp
    outil: text("outil").notNull(),
    entrees: jsonb("entrees").$type<Record<string, unknown>>().notNull().default({}),
    resultat: text("resultat"), // un résumé, pas les données complètes
    ok: boolean("ok").notNull().default(true),
    // Le texte lu contenait une tournure de consigne adressée à un assistant.
    suspect: text("suspect"),
    creeLe: timestamp("cree_le", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("agent_etapes_execution").on(t.executionId, t.creeLe)],
);

// Les jetons du serveur MCP : personnels (créés dans Réglages, révocables), ou propres à une
// exécution de l'assistant (valables quelques minutes). Seule l'empreinte est gardée.
export const jetonsMcp = pgTable("jetons_mcp", {
  id: uuid("id").primaryKey().defaultRandom(),
  compteId: uuid("compte_id")
    .notNull()
    .references(() => comptes.id, { onDelete: "cascade" }),
  empreinte: text("empreinte").notNull().unique(),
  nom: text("nom").notNull(),
  executionId: uuid("execution_id").references(() => agentExecutions.id, { onDelete: "cascade" }),
  expireLe: timestamp("expire_le", { withTimezone: true }),
  revoqueLe: timestamp("revoque_le", { withTimezone: true }),
  derniereUtilisation: timestamp("derniere_utilisation", { withTimezone: true }),
  creeLe: timestamp("cree_le", { withTimezone: true }).notNull().defaultNow(),
});

export const statutProposition = pgEnum("statut_proposition", ["en_attente", "acceptee", "refusee"]);

// Ce que l'agent propose sans le faire : tout ce qui part vers quelqu'un. Un humain valide,
// modifie ou refuse ; la validation exécute l'opération avec les droits de celui qui valide.
export const propositions = pgTable(
  "propositions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    executionId: uuid("execution_id").references(() => agentExecutions.id, { onDelete: "set null" }),
    proposePar: uuid("propose_par")
      .notNull()
      .references(() => comptes.id, { onDelete: "cascade" }),
    chantierId: uuid("chantier_id")
      .notNull()
      .references(() => chantiers.id, { onDelete: "cascade" }),
    type: text("type").notNull(), // courriel, demande_externe, partage
    contenu: jsonb("contenu").$type<Record<string, unknown>>().notNull(),
    statut: statutProposition("statut").notNull().default("en_attente"),
    motif: text("motif"),
    decidePar: uuid("decide_par").references(() => comptes.id, { onDelete: "set null" }),
    decideLe: timestamp("decide_le", { withTimezone: true }),
    creeLe: timestamp("cree_le", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("propositions_statut").on(t.statut, t.creeLe)],
);
