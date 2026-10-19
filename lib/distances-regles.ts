// Les règles des temps de route et des livraisons : pures, sans base ni réseau,
// donc testées une à une (lib/distances-regles.test.ts). Tout ce qui peut changer
// d'une entreprise à l'autre est un paramètre, regroupé ici.

export type Point = { latitude: number; longitude: number };

// ——— Le cache des trajets ———

// Les coordonnées sont arrondies à 3 décimales (environ 100 m) avant d'être mises en
// cache : deux adresses voisines partagent le même trajet, et un même trajet ne se
// redemande jamais au service d'itinéraire.
export const DECIMALES_CACHE = 3;

export function arrondir(p: Point, decimales = DECIMALES_CACHE): Point {
  const f = 10 ** decimales;
  // `+ 0` efface le « -0 » qu'un arrondi peut produire, pour une clé stable.
  return { latitude: Math.round(p.latitude * f) / f + 0, longitude: Math.round(p.longitude * f) / f + 0 };
}

// La clé d'un point dans la table `trajets` : « lat,lon », arrondis.
export function cleDuPoint(p: Point, decimales = DECIMALES_CACHE): string {
  const a = arrondir(p, decimales);
  return `${a.latitude.toFixed(decimales)},${a.longitude.toFixed(decimales)}`;
}

// La réponse du calcul d'itinéraire de l'IGN : distance en km et durée en minutes
// (les unités demandées dans l'appel). Toute autre forme est refusée.
export function lireItineraire(d: unknown): { km: number; minutes: number } | null {
  const r = d as { distance?: unknown; duration?: unknown } | null;
  if (typeof r?.distance !== "number" || typeof r?.duration !== "number" || !Number.isFinite(r.distance) || !Number.isFinite(r.duration)) return null;
  return { km: Math.round(r.distance * 10) / 10, minutes: Math.round(r.duration) };
}

// ——— La distance à vol d'oiseau ———

const RAYON_TERRE_KM = 6371;

// Formule de haversine : la distance sur la sphère, sans tenir compte des routes.
// C'est elle qui fixe la zone de déplacement (la convention parle de « vol d'oiseau »).
export function volDOiseauKm(a: Point, b: Point): number {
  const rad = (d: number) => (d * Math.PI) / 180;
  const dLat = rad(b.latitude - a.latitude);
  const dLon = rad(b.longitude - a.longitude);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.latitude)) * Math.cos(rad(b.latitude)) * Math.sin(dLon / 2) ** 2;
  return 2 * RAYON_TERRE_KM * Math.asin(Math.min(1, Math.sqrt(h)));
}

// ——— Les zones de petits déplacements ———

// Zones concentriques des indemnités de petits déplacements des ouvriers du bâtiment,
// mesurées à vol d'oiseau depuis le point de départ (siège, agence ou dépôt).
// Source : conventions collectives nationales des ouvriers du bâtiment (IDCC 1596 et
// 1597, titre VIII, « petits déplacements ») : cinq zones dont les circonférences sont
// distantes de 10 km ; la plupart des accords régionaux (par exemple la convention des
// ouvriers du bâtiment de la région parisienne du 28 juin 1993, article 3, Légifrance
// KALIARTI000005801103) coupent la première zone en 1A (0 à 5 km) et 1B (5 à 10 km).
// À vérifier pour votre convention : les bornes, et les montants, sont fixés par les
// accords régionaux ou départementaux. Une borne est incluse dans sa zone (un chantier
// à 10 km pile est encore en 1B : « un cercle de 10 km de rayon »).
// Au-delà de la dernière zone : grand déplacement.
export const ZONES_DEPLACEMENT: { zone: string; jusquaKm: number }[] = [
  { zone: "1A", jusquaKm: 5 },
  { zone: "1B", jusquaKm: 10 },
  { zone: "2", jusquaKm: 20 },
  { zone: "3", jusquaKm: 30 },
  { zone: "4", jusquaKm: 40 },
  { zone: "5", jusquaKm: 50 },
];

export type Zone = { grandDeplacement: false; zone: string } | { grandDeplacement: true };

export function zoneDeplacement(km: number, zones = ZONES_DEPLACEMENT): Zone {
  for (const z of zones) if (km <= z.jusquaKm) return { grandDeplacement: false, zone: z.zone };
  return { grandDeplacement: true };
}

export function libelleZone(z: Zone): string {
  return z.grandDeplacement ? "Grand déplacement" : `Zone ${z.zone}`;
}

// ——— La date limite de commande ———

// Un transport plus long que ce seuil compte pour un jour de plus (arrondi au jour
// entier supérieur) ; en dessous, la livraison se fait dans la journée de l'enlèvement.
export const SEUIL_TRANSPORT_MINUTES = 4 * 60;
// Le délai fournisseur saisi sur un lot reste dans ces bornes (opération lib/operations/livraisons.ts).
export const DELAI_FOURNISSEUR_MAX_JOURS = 120;

// Les jours de transport à ajouter : zéro jusqu'au seuil, puis un jour par tranche de 24 h entamée.
export function joursDeTransport(minutes: number | null, seuil = SEUIL_TRANSPORT_MINUTES): number {
  if (minutes === null || minutes <= seuil) return 0;
  return Math.ceil(minutes / (24 * 60));
}

function enDate(iso: string): Date {
  return new Date(`${iso}T00:00:00Z`);
}

function enIso(d: Date): string {
  return d.toISOString().slice(0, 10);
}

// Dimanche de Pâques (algorithme de Meeus pour le calendrier grégorien).
function paques(annee: number): Date {
  const a = annee % 19;
  const b = Math.floor(annee / 100);
  const c = annee % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const mois = Math.floor((h + l - 7 * m + 114) / 31);
  const jour = ((h + l - 7 * m + 114) % 31) + 1;
  return new Date(Date.UTC(annee, mois - 1, jour));
}

// Les onze jours fériés de France métropolitaine (hors Alsace-Moselle, qui ajoute
// le Vendredi saint et le 26 décembre).
export function joursFeries(annee: number): Set<string> {
  const p = paques(annee);
  const decale = (jours: number) => enIso(new Date(p.getTime() + jours * 86400000));
  return new Set([
    `${annee}-01-01`,
    decale(1), // lundi de Pâques
    `${annee}-05-01`,
    `${annee}-05-08`,
    decale(39), // Ascension
    decale(50), // lundi de Pentecôte
    `${annee}-07-14`,
    `${annee}-08-15`,
    `${annee}-11-01`,
    `${annee}-11-11`,
    `${annee}-12-25`,
  ]);
}

export function estOuvre(iso: string): boolean {
  const jour = enDate(iso).getUTCDay();
  if (jour === 0 || jour === 6) return false;
  return !joursFeries(Number(iso.slice(0, 4))).has(iso);
}

// Recule de n jours ouvrés (sans week-end ni jour férié).
export function reculerJoursOuvres(iso: string, n: number): string {
  let d = enDate(iso);
  let restants = n;
  while (restants > 0) {
    d = new Date(d.getTime() - 86400000);
    if (estOuvre(enIso(d))) restants--;
  }
  return enIso(d);
}

export type Commande =
  | { etat: "sans_date"; raison: string }
  | { etat: "en_retard" | "a_commander" | "commande"; limite: string; joursTransport: number };

// La date limite de commande d'un lot : la livraison prévue, moins le délai du
// fournisseur (jours ouvrés), moins le transport s'il dépasse le seuil.
// En retard : la date est passée et le lot n'est toujours pas commandé.
export function dateLimiteCommande(params: {
  livraisonPrevue: string | null;
  delaiFournisseurJours: number | null;
  minutesTransport: number | null;
  statut: string;
  aujourdhui: string;
  seuilTransportMinutes?: number;
}): Commande {
  if (!params.livraisonPrevue) return { etat: "sans_date", raison: "Pas de livraison prévue." };
  if (params.delaiFournisseurJours === null) return { etat: "sans_date", raison: "Délai du fournisseur à indiquer." };
  const joursTransport = joursDeTransport(params.minutesTransport, params.seuilTransportMinutes);
  const limite = reculerJoursOuvres(params.livraisonPrevue, params.delaiFournisseurJours + joursTransport);
  if (params.statut !== "a_commander") return { etat: "commande", limite, joursTransport };
  return { etat: limite < params.aujourdhui ? "en_retard" : "a_commander", limite, joursTransport };
}

// ——— L'affichage d'une durée ———

export function duree(minutes: number): string {
  if (minutes < 60) return `${minutes} min`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m === 0 ? `${h} h` : `${h} h ${String(m).padStart(2, "0")}`;
}
