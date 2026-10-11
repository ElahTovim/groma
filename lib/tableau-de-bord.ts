import { desc, inArray } from "drizzle-orm";
import { voitLInterne } from "@/lib/acces";
import { listerChantiers, type ChantierListe } from "@/lib/chantiers";
import { db } from "@/lib/db";
import { comptes, fil, lots, type StatutChantier, type StatutLot, type TypeFil } from "@/lib/db/schema";
import { previsions, type JourMeteo } from "@/lib/meteo";
import { aujourdhuiParis, voitElement } from "@/lib/regles";
import type { Appelant } from "@/lib/session";

// Le tableau de bord ne fait que lire : aucune écriture ici. Chaque lecture part de
// listerChantiers, qui applique déjà les droits d'accès de l'appelant.

// Des réglages, pas des règles en dur.
export const REGLAGES_TABLEAU = {
  horizonJours: 7, // « Cette semaine » : les échéances des 7 prochains jours
  // Un seul appel OpenWeatherMap pour tout le tableau de bord : les chantiers sont à
  // Paris et en proche banlieue, la météo de Paris vaut pour tous.
  meteo: { lieu: "Paris", latitude: 48.8566, longitude: 2.3522 },
  derniersMessages: 5,
};

// Les chantiers où l'on travaille : ceux dont la météo et les échéances comptent.
const ACTIFS: StatutChantier[] = ["planifie", "en_cours", "reception"];

// ——— Calculs purs, testés dans tableau-de-bord.test.ts ———

function plusJours(iso: string, n: number): string {
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

export type Echeance = { date: string; quoi: "livraison" | "fin"; lot: string; chantierId: string; chantier: string };

// Les livraisons et fins de lots attendues d'aujourd'hui à l'horizon, jour par jour.
// Une étape déjà faite (lot livré, lot fini) n'est plus une échéance.
export function echeancesAVenir(
  lesLots: { nom: string; statut: StatutLot; livraisonPrevue: string | null; finPrevue: string | null; chantierId: string; chantier: string }[],
  aujourdhui: string,
  horizonJours: number,
): Echeance[] {
  const limite = plusJours(aujourdhui, horizonJours);
  const dans = (d: string | null): d is string => Boolean(d && d >= aujourdhui && d < limite);
  const res: Echeance[] = [];
  for (const l of lesLots) {
    const pasLivre = l.statut === "a_commander" || l.statut === "commande";
    if (pasLivre && dans(l.livraisonPrevue)) res.push({ date: l.livraisonPrevue, quoi: "livraison", lot: l.nom, chantierId: l.chantierId, chantier: l.chantier });
    if (l.statut !== "fini" && dans(l.finPrevue)) res.push({ date: l.finPrevue, quoi: "fin", lot: l.nom, chantierId: l.chantierId, chantier: l.chantier });
  }
  return res.sort((a, b) => a.date.localeCompare(b.date) || a.chantier.localeCompare(b.chantier));
}

// ——— Lectures ———

export type MessageRecent = { id: string; type: TypeFil; texte: string; auteur: string; chantierId: string; chantier: string; creeLe: string };

export type TableauDeBord = {
  aujourdhui: string;
  chantiers: ChantierListe[];
  actifs: ChantierListe[];
  avancement: Map<string, { finis: number; total: number }>;
  chiffres: { enCours: number; devis: number; montantDevis: number; montantEnCours: number } | null;
  aTraiter: ChantierListe[];
  echeances: Echeance[];
  meteo: { lieu: string; jours: JourMeteo[] | null };
  messages: MessageRecent[];
};

export async function lireTableauDeBord(qui: Appelant): Promise<TableauDeBord> {
  const aujourdhui = aujourdhuiParis();
  const interne = voitLInterne(qui.role);
  const chantiers = await listerChantiers(qui, {});
  const actifs = chantiers.filter((c) => ACTIFS.includes(c.statut));
  const ids = chantiers.map((c) => c.id);
  const nomDe = new Map(chantiers.map((c) => [c.id, c.nom]));

  const [lesLots, elements, meteo] = await Promise.all([
    interne && actifs.length
      ? db
          .select({ nom: lots.nom, statut: lots.statut, livraisonPrevue: lots.livraisonPrevue, finPrevue: lots.finPrevue, chantierId: lots.chantierId })
          .from(lots)
          .where(inArray(lots.chantierId, actifs.map((c) => c.id)))
      : Promise.resolve([]),
    ids.length ? db.select().from(fil).where(inArray(fil.chantierId, ids)).orderBy(desc(fil.creeLe)).limit(200) : Promise.resolve([]),
    previsions(REGLAGES_TABLEAU.meteo.latitude, REGLAGES_TABLEAU.meteo.longitude, aujourdhui),
  ]);

  // Le fil, filtré sur le serveur comme dans la fiche : un externe ne voit que ce qu'on lui partage.
  const visibles = elements.filter((e) => voitElement(qui, e)).slice(0, REGLAGES_TABLEAU.derniersMessages);
  const auteurs = visibles.length
    ? await db.select({ id: comptes.id, nom: comptes.nom }).from(comptes).where(inArray(comptes.id, [...new Set(visibles.map((e) => e.auteurId))]))
    : [];
  const nomAuteur = new Map(auteurs.map((a) => [a.id, a.nom]));

  const somme = (cs: ChantierListe[]) => cs.reduce((s, c) => s + Number(c.montantHt ?? 0), 0);
  const enCours = chantiers.filter((c) => c.statut === "en_cours" || c.statut === "reception");
  const devis = chantiers.filter((c) => c.statut === "devis");

  const avancement = new Map<string, { finis: number; total: number }>();
  for (const l of lesLots) {
    const a = avancement.get(l.chantierId) ?? { finis: 0, total: 0 };
    a.total++;
    if (l.statut === "fini") a.finis++;
    avancement.set(l.chantierId, a);
  }

  return {
    aujourdhui,
    chantiers,
    actifs,
    avancement,
    chiffres: interne ? { enCours: enCours.length, devis: devis.length, montantDevis: somme(devis), montantEnCours: somme(enCours) } : null,
    // listerChantiers trie déjà par urgence.
    aTraiter: interne ? chantiers.filter((c) => c.aTraiter && c.aTraiter.aQualifier + c.aTraiter.reservesOuvertes + c.aTraiter.lotsEnRetard > 0) : [],
    echeances: echeancesAVenir(
      lesLots.map((l) => ({ ...l, chantier: nomDe.get(l.chantierId) ?? "" })),
      aujourdhui,
      REGLAGES_TABLEAU.horizonJours,
    ),
    // Une API qui ne répond pas ne bloque rien : la carte dit « indisponible ».
    meteo: { lieu: REGLAGES_TABLEAU.meteo.lieu, jours: meteo.ok ? meteo.jours : null },
    messages: visibles.map((e) => ({
      id: e.id,
      type: e.type,
      texte: e.texte,
      auteur: nomAuteur.get(e.auteurId) ?? "Compte supprimé",
      chantierId: e.chantierId,
      chantier: nomDe.get(e.chantierId) ?? "",
      creeLe: e.creeLe.toISOString(),
    })),
  };
}
