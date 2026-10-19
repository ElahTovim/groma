import { and, asc, eq, isNull } from "drizzle-orm";
import { voitLInterne } from "@/lib/acces";
import { db } from "@/lib/db";
import { comptes, entreprises, lots, trajets, type StatutLot } from "@/lib/db/schema";
import { arrondir, cleDuPoint, lireItineraire, type Point } from "@/lib/distances-regles";
import { journal } from "@/lib/journal";
import { lireProfil } from "@/lib/profil";
import { chercherAdresse } from "@/lib/meteo";
import type { Appelant } from "@/lib/session";

// Les temps de route : le calcul d'itinéraire en voiture de l'IGN (Géoplateforme, sans clé),
// mis en cache dans la table `trajets` pour ne jamais redemander un même trajet.
// Une panne du service ne bloque rien : la carte dit « temps de route indisponible ».
// Documentation : https://geoservices.ign.fr/documentation/services/services-geoplateforme/itineraire
const ITINERAIRE = "https://data.geopf.fr/navigation/itineraire";
// Le graphe routier de la BD TOPO, calculé par OSRM : le plus rapide des trois proposés.
const RESSOURCE = "bdtopo-osrm";
const ATTENTE_MS = 4000;

export const INDISPONIBLE = "Temps de route indisponible pour le moment.";

export type ResultatTrajet = { ok: true; km: number; minutes: number } | { ok: false; raison: string };

export async function tempsDeRoute(depart: Point, arrivee: Point): Promise<ResultatTrajet> {
  const origine = cleDuPoint(depart);
  const destination = cleDuPoint(arrivee);
  try {
    const [connu] = await db
      .select({ km: trajets.km, minutes: trajets.minutes })
      .from(trajets)
      .where(and(eq(trajets.origine, origine), eq(trajets.destination, destination)))
      .limit(1);
    if (connu) return { ok: true, ...connu };
  } catch (e) {
    journal("trajet_cache_echec", { erreur: String(e) });
  }

  // On calcule depuis les points arrondis : ce qui est rangé correspond exactement à la clé.
  const a = arrondir(depart);
  const b = arrondir(arrivee);
  const q = new URLSearchParams({
    resource: RESSOURCE,
    profile: "car",
    optimization: "fastest",
    start: `${a.longitude},${a.latitude}`,
    end: `${b.longitude},${b.latitude}`,
    distanceUnit: "kilometer",
    timeUnit: "minute",
    geometryFormat: "polyline",
    getSteps: "false",
    getBbox: "false",
  });
  let lu: { km: number; minutes: number } | null;
  try {
    const r = await fetch(`${ITINERAIRE}?${q}`, { signal: AbortSignal.timeout(ATTENTE_MS), cache: "no-store" });
    if (!r.ok) {
      journal("itineraire_echec", { statut: r.status });
      return { ok: false, raison: INDISPONIBLE };
    }
    lu = lireItineraire(await r.json());
  } catch (e) {
    journal("itineraire_echec", { erreur: String(e) });
    return { ok: false, raison: INDISPONIBLE };
  }
  if (!lu) {
    journal("itineraire_echec", { erreur: "réponse illisible" });
    return { ok: false, raison: INDISPONIBLE };
  }
  try {
    await db.insert(trajets).values({ origine, destination, ...lu }).onConflictDoNothing();
  } catch (e) {
    // Le cache est un confort : le temps calculé s'affiche quand même.
    journal("trajet_cache_echec", { erreur: String(e) });
  }
  return { ok: true, ...lu };
}

// ——— Le dépôt de l'entreprise ———

export type Depot = { etat: "absent" } | { etat: "introuvable"; adresse: string } | { etat: "ok"; adresse: string; point: Point };

// Le dépôt se règle dans groma (Réglages, « L'entreprise ») et y est géolocalisé une fois.
// Pendant la transition, l'ancienne variable DEPOT_ADRESSE sert de valeur de départ.
const depotsConnus = new Map<string, Point>();

export async function lireDepot(): Promise<Depot> {
  const { depot } = await lireProfil();
  if (!depot) return { etat: "absent" };
  const adresse = [depot.adresse, `${depot.codePostal} ${depot.ville}`.trim()].filter(Boolean).join(", ");
  if (depot.latitude != null && depot.longitude != null) return { etat: "ok", adresse, point: { latitude: depot.latitude, longitude: depot.longitude } };
  const connu = depotsConnus.get(adresse);
  if (connu) return { etat: "ok", adresse, point: connu };
  const trouve = await chercherAdresse(adresse);
  if (!trouve) return { etat: "introuvable", adresse };
  const point = { latitude: trouve.latitude, longitude: trouve.longitude };
  depotsConnus.set(adresse, point);
  return { etat: "ok", adresse, point };
}

// ——— Les fournisseurs ———

// Une entreprise vérifiée sans coordonnées est géolocalisée depuis son adresse Sirene,
// une fois : ses coordonnées sont gardées. Introuvable : on réessaiera à la prochaine lecture.
async function coordonneesEntreprise(e: { siren: string; adresse: string | null; latitude: number | null; longitude: number | null }): Promise<Point | null> {
  if (e.latitude !== null && e.longitude !== null) return { latitude: e.latitude, longitude: e.longitude };
  if (!e.adresse) return null;
  const trouve = await chercherAdresse(e.adresse);
  if (!trouve) return null;
  const point = { latitude: trouve.latitude, longitude: trouve.longitude };
  try {
    // « where latitude is null » : on n'écrase jamais des coordonnées posées entre-temps.
    await db.update(entreprises).set(point).where(and(eq(entreprises.siren, e.siren), isNull(entreprises.latitude)));
    journal("entreprise_geolocalisee", { siren: e.siren });
  } catch (err) {
    journal("entreprise_geolocalisation_echec", { siren: e.siren, erreur: String(err) });
  }
  return point;
}

export type LotLivre = {
  id: string;
  nom: string;
  statut: StatutLot;
  livraisonPrevue: string | null;
  delaiFournisseurJours: number | null;
  fournisseur: string;
  entreprise: string;
  adresse: string | null;
  point: Point | null;
};

// Les lots dont le fournisseur a une entreprise vérifiée, avec ses coordonnées.
// Interne : un externe ne voit jamais les lots.
export async function lireLotsLivres(qui: Appelant, chantierId: string): Promise<LotLivre[]> {
  if (!voitLInterne(qui.role)) return [];
  const lignes = await db
    .select({ lot: lots, fournisseur: comptes.nom, entreprise: entreprises })
    .from(lots)
    .innerJoin(comptes, eq(lots.fournisseurId, comptes.id))
    .innerJoin(entreprises, eq(comptes.siren, entreprises.siren))
    .where(eq(lots.chantierId, chantierId))
    .orderBy(asc(lots.creeLe));
  return Promise.all(
    lignes.map(async ({ lot, fournisseur, entreprise }) => ({
      id: lot.id,
      nom: lot.nom,
      statut: lot.statut,
      livraisonPrevue: lot.livraisonPrevue,
      delaiFournisseurJours: lot.delaiFournisseurJours,
      fournisseur,
      entreprise: entreprise.nom,
      adresse: entreprise.adresse,
      point: await coordonneesEntreprise(entreprise),
    })),
  );
}
