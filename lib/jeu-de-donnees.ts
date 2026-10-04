import type { StatutChantier, StatutLot, StatutSignalement, TypeFil } from "@/lib/db/schema";

// Le jeu de données fictif : dix personnes, cinquante chantiers, des cas normaux
// et des cas tordus. Tiré au sort avec une graine fixe : rejouer donne
// exactement les mêmes données. Aucune vraie personne.

export const DOMAINE_FICTIF = "exemple.groma.fr";

export type PersonneFictive = { email: string; nom: string; role: "equipe" | "externe"; qualite: string };

export const PERSONNES: PersonneFictive[] = [
  { email: `karim.benali@${DOMAINE_FICTIF}`, nom: "Karim Benali", role: "equipe", qualite: "chef d'équipe" },
  { email: `sophie.laurent@${DOMAINE_FICTIF}`, nom: "Sophie Laurent", role: "equipe", qualite: "chef d'équipe" },
  { email: `thomas.girard@${DOMAINE_FICTIF}`, nom: "Thomas Girard", role: "equipe", qualite: "chef d'équipe" },
  { email: `claire.morel@${DOMAINE_FICTIF}`, nom: "Claire Morel", role: "externe", qualite: "client" },
  { email: `paul.lefevre@${DOMAINE_FICTIF}`, nom: "Paul Lefèvre", role: "externe", qualite: "client" },
  { email: `nadia.haddad@${DOMAINE_FICTIF}`, nom: "Nadia Haddad", role: "externe", qualite: "client" },
  { email: `julien.roux@${DOMAINE_FICTIF}`, nom: "Julien Roux", role: "externe", qualite: "architecte" },
  { email: `cabinet.vauban@${DOMAINE_FICTIF}`, nom: "Syndic Cabinet Vauban", role: "externe", qualite: "syndic" },
  { email: `bet.structure@${DOMAINE_FICTIF}`, nom: "Inès Fabre (BET Structure)", role: "externe", qualite: "ingénieur" },
  { email: `carrelages.du.marais@${DOMAINE_FICTIF}`, nom: "Carrelages du Marais", role: "externe", qualite: "fournisseur" },
];

const TRAVAUX = [
  "Rénovation salle de bain",
  "Cuisine ouverte",
  "Ravalement de façade",
  "Rénovation complète T3",
  "Isolation des combles",
  "Remplacement des fenêtres",
  "Mise aux normes électriques",
  "Création d'une mezzanine",
  "Réfection de toiture",
  "Parquet et peintures",
  "Ouverture de mur porteur",
  "Rénovation de cage d'escalier",
];

const RUES = [
  "rue Oberkampf",
  "rue des Pyrénées",
  "boulevard Voltaire",
  "rue de la Roquette",
  "avenue Jean-Jaurès",
  "rue Mouffetard",
  "rue Caulaincourt",
  "rue du Faubourg-Saint-Denis",
  "rue de Paris",
  "avenue de la République",
];

const VILLES: { cp: string; ville: string }[] = [
  { cp: "75011", ville: "Paris" },
  { cp: "75020", ville: "Paris" },
  { cp: "75005", ville: "Paris" },
  { cp: "75018", ville: "Paris" },
  { cp: "93100", ville: "Montreuil" },
  { cp: "94300", ville: "Vincennes" },
  { cp: "92130", ville: "Issy-les-Moulineaux" },
  { cp: "93200", ville: "Saint-Denis" },
];

const CLIENTS = ["Famille Morel", "M. et Mme Lefèvre", "Nadia Haddad", "SCI Les Lilas", "Copropriété du 14 rue de Paris", "M. Chen", "Mme Dubois", "Indivision Garnier"];

// Répartition réaliste : beaucoup de chantiers en cours, quelques devis, peu d'annulés.
const STATUTS_TIRES: StatutChantier[] = [
  "devis", "devis", "devis", "devis", "devis", "devis", "devis",
  "signe", "signe", "signe", "signe", "signe",
  "planifie", "planifie", "planifie", "planifie", "planifie", "planifie",
  "en_cours", "en_cours", "en_cours", "en_cours", "en_cours", "en_cours", "en_cours", "en_cours", "en_cours", "en_cours", "en_cours", "en_cours",
  "reception", "reception", "reception", "reception", "reception",
  "clos", "clos", "clos", "clos", "clos", "clos", "clos", "clos",
  "annule", "annule", "annule",
];

// Générateur pseudo-aléatoire à graine fixe (mulberry32) : le même tirage à chaque fois.
function generateur(graine: number) {
  let a = graine;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export type ChantierFictif = {
  reference: string;
  nom: string;
  client: string;
  adresse: string;
  codePostal: string;
  ville: string;
  montantHt: string | null;
  statut: StatutChantier;
  debutPrevu: string | null;
  finPrevue: string | null;
  motifAnnulation: string | null;
  // Index dans PERSONNES des participants, avec leur qualité sur ce chantier.
  participants: number[];
  lots: LotFictif[];
  fil: ElementFictif[];
};

export type LotFictif = { nom: string; statut: StatutLot; livraisonPrevue: string | null; finPrevue: string | null; fournisseur: number | null };

export type ElementFictif = {
  auteur: number; // index dans PERSONNES ; -1 = le gérant (premier compte gérant trouvé)
  type: TypeFil;
  texte: string;
  destinataire?: number;
  dateCible?: string;
  lot?: number; // index dans lots
  statutSignalement?: StatutSignalement;
  visiblePar: number[];
};

const NOMS_LOTS = ["Démolition", "Plomberie", "Électricité", "Carrelage", "Peinture", "Menuiseries"];
const FOURNISSEUR = 9; // Carrelages du Marais

function jour(depart: Date, decalage: number): string {
  const d = new Date(depart);
  d.setDate(d.getDate() + decalage);
  return d.toISOString().slice(0, 10);
}

export function genererChantiers(aujourdhui = new Date("2026-10-05")): ChantierFictif[] {
  const tirer = generateur(20261005);
  const parmi = <T,>(liste: T[]) => liste[Math.floor(tirer() * liste.length)];
  const resultat: ChantierFictif[] = [];

  for (let i = 0; i < 50; i++) {
    const statut = STATUTS_TIRES[i % STATUTS_TIRES.length];
    const lieu = parmi(VILLES);
    const debut = statut === "devis" ? null : jour(aujourdhui, Math.round(tirer() * 120) - 90);
    const chef = Math.floor(tirer() * 3); // un des trois chefs d'équipe
    const client = 3 + Math.floor(tirer() * 3); // un des trois clients
    const autres = [6, 7, 8, 9].filter(() => tirer() < 0.3);
    const enPlace: StatutLot[] =
      statut === "reception" || statut === "clos"
        ? ["fini", "fini", "fini"]
        : statut === "en_cours"
          ? ["fini", parmi<StatutLot>(["livre", "pose", "commande"]), parmi<StatutLot>(["commande", "a_commander"])]
          : statut === "planifie"
            ? ["commande", "a_commander"]
            : [];
    const lotsDuChantier: LotFictif[] = enPlace.map((s, k) => {
      const nom = NOMS_LOTS[(i + k * 2) % NOMS_LOTS.length];
      // Une livraison prévue dans le passé pour un lot pas encore livré = un retard visible.
      const decalage = s === "commande" || s === "a_commander" ? (tirer() < 0.5 ? -6 : 9) : -20;
      return {
        nom,
        statut: s,
        livraisonPrevue: jour(aujourdhui, decalage),
        finPrevue: jour(aujourdhui, decalage + 12),
        fournisseur: nom === "Carrelage" && autres.includes(FOURNISSEUR) ? FOURNISSEUR : null,
      };
    });
    const filDuChantier: ElementFictif[] = [];
    if (statut !== "devis" && statut !== "annule") {
      filDuChantier.push({ auteur: chef, type: "document", texte: "Devis signé (version 2)", visiblePar: [client] });
    }
    if (statut === "en_cours" || statut === "planifie") {
      filDuChantier.push({ auteur: chef, type: "message", texte: "Accès au chantier par la cour, code du portail transmis par le client.", visiblePar: [] });
      filDuChantier.push({ auteur: chef, type: "demande", texte: "Pouvez-vous confirmer le choix de la faïence ?", destinataire: client, dateCible: jour(aujourdhui, 3), visiblePar: [client] });
      filDuChantier.push({ auteur: client, type: "disponibilite", texte: "Présente de 8 h à 12 h.", dateCible: jour(aujourdhui, 2), visiblePar: [] });
    }
    if (statut === "reception") {
      filDuChantier.push({ auteur: client, type: "signalement", texte: "Joint de la douche mal fini dans l'angle.", statutSignalement: i % 2 ? "a_qualifier" : "levee", visiblePar: [] });
      if (i % 3 === 0) filDuChantier.push({ auteur: chef, type: "signalement", texte: "Plinthe abîmée dans le couloir.", statutSignalement: "reserve_ouverte", visiblePar: [] });
    }

    resultat.push({
      reference: `CH-2026-F${String(i + 1).padStart(3, "0")}`,
      nom: parmi(TRAVAUX),
      client: parmi(CLIENTS),
      adresse: `${1 + Math.floor(tirer() * 120)} ${parmi(RUES)}`,
      codePostal: lieu.cp,
      ville: lieu.ville,
      montantHt: String(Math.round((4000 + tirer() * 90000) / 50) * 50),
      statut,
      debutPrevu: debut,
      finPrevue: debut ? jour(new Date(debut), 20 + Math.round(tirer() * 80)) : null,
      motifAnnulation: statut === "annule" ? "Le client a renoncé après le devis." : null,
      participants: [chef, client, ...autres],
      lots: lotsDuChantier,
      fil: filDuChantier,
    });
  }

  // Les cas tordus, à la main.
  resultat[0] = { ...resultat[0], nom: "Chantier sans aucun participant externe", participants: [0], fil: resultat[0].fil.filter((e) => e.auteur === 0).map((e) => ({ ...e, visiblePar: [] })) };
  resultat[1] = { ...resultat[1], nom: "Devis sans montant", montantHt: null, statut: "devis", debutPrevu: null, finPrevue: null, lots: [], fil: [] };
  resultat[2] = { ...resultat[2], nom: "Rénovation d'un appartement au nom très long, avec cave, parking et deux chambres de bonne au sixième étage sans ascenseur", participants: [1, 3, 6, 7, 8, 9] };
  resultat[3] = { ...resultat[3], client: "Mme Élise d'Aubigné-Saint-Éxupéry", adresse: "3 bis impasse de l'Œuvre", nom: "Salle d'eau" };
  resultat[4] = { ...resultat[4], nom: "Chantier en cours sans date de fin", statut: "en_cours", finPrevue: null };
  resultat[5] = { ...resultat[5], nom: "Chantier annulé avant signature", statut: "annule", motifAnnulation: "Permis refusé par la copropriété." };
  resultat[6] = { ...resultat[6], nom: "Gros chantier", montantHt: "248000" };
  return resultat;
}
