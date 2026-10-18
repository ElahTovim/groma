// Les entreprises (client professionnel, fournisseur, syndic…) vérifiées dans le
// registre public Sirene, via l'API Recherche d'entreprises (data.gouv, sans clé).
// Ce fichier est pur : il lit une réponse de l'API, il ne l'appelle pas.

export type FicheEntreprise = {
  siren: string;
  siret: string | null;
  nom: string;
  adresse: string | null;
  activite: string | null; // code NAF, ex. 43.32A
  ferme: boolean;
  fermeeLe: string | null;
  creeeLe: string | null;
};

// Les activités qu'un chantier de rénovation croise le plus (nomenclature NAF rév. 2).
// Un code absent de la liste s'affiche tel quel : ce n'est qu'un libellé.
export const LIBELLES_NAF: Record<string, string> = {
  "41.20A": "Construction de maisons individuelles",
  "41.20B": "Construction d'autres bâtiments",
  "43.11Z": "Démolition",
  "43.12A": "Terrassement",
  "43.21A": "Électricité",
  "43.22A": "Plomberie, eau, gaz",
  "43.22B": "Chauffage, climatisation",
  "43.29A": "Isolation",
  "43.31Z": "Plâtrerie",
  "43.32A": "Menuiserie bois et PVC",
  "43.32B": "Menuiserie métallique, serrurerie",
  "43.32C": "Agencement de lieux de vente",
  "43.33Z": "Revêtement des sols et des murs",
  "43.34Z": "Peinture et vitrerie",
  "43.39Z": "Autres travaux de finition",
  "43.91A": "Charpente",
  "43.91B": "Couverture",
  "43.99A": "Étanchéité",
  "43.99C": "Maçonnerie générale, gros œuvre",
  "46.73A": "Commerce de gros de bois et matériaux",
  "47.52B": "Commerce de détail de quincaillerie et bricolage",
  "68.32A": "Administration d'immeubles (syndic)",
  "71.11Z": "Architecture",
  "71.12B": "Ingénierie, études techniques",
};

export function libelleActivite(code: string | null): string | null {
  if (!code) return null;
  return LIBELLES_NAF[code] ?? `Activité ${code}`;
}

// Un SIREN (9 chiffres) ou un SIRET (14 chiffres) se vérifie par la clé de Luhn.
// La Poste fait exception : ses établissements suivent une autre règle.
export function luhn(chiffres: string): boolean {
  let somme = 0;
  for (let i = 0; i < chiffres.length; i++) {
    let n = Number(chiffres[chiffres.length - 1 - i]);
    if (i % 2 === 1) {
      n *= 2;
      if (n > 9) n -= 9;
    }
    somme += n;
  }
  return somme % 10 === 0;
}

const SIREN_LA_POSTE = "356000000";

export type Recherche = { ok: true; q: string; numero: boolean } | { ok: false; erreur: string };

// Ce que la personne a tapé : un nom, ou un numéro avec ses espaces.
export function lireRecherche(saisie: string): Recherche {
  const brut = saisie.trim();
  if (brut.length < 3) return { ok: false, erreur: "Tapez au moins 3 caractères : un nom, un SIREN ou un SIRET." };
  if (brut.length > 100) return { ok: false, erreur: "Recherche trop longue." };
  const chiffres = brut.replace(/[\s.]/g, "");
  if (/^\d+$/.test(chiffres)) {
    if (chiffres.length !== 9 && chiffres.length !== 14) return { ok: false, erreur: "Un SIREN a 9 chiffres, un SIRET en a 14." };
    if (!chiffres.startsWith(SIREN_LA_POSTE) && !luhn(chiffres)) return { ok: false, erreur: "Ce numéro contient une faute de frappe : sa clé de contrôle ne correspond pas." };
    return { ok: true, q: chiffres, numero: true };
  }
  return { ok: true, q: brut, numero: false };
}

export function estSiren(v: unknown): v is string {
  return typeof v === "string" && /^\d{9}$/.test(v);
}

type Brut = Record<string, unknown>;
const texte = (v: unknown) => (typeof v === "string" && v.trim() ? v.trim() : null);

// Une ligne de résultat de l'API → la fiche que groma garde. null si illisible.
export function lireResultat(r: unknown): FicheEntreprise | null {
  if (!r || typeof r !== "object") return null;
  const e = r as Brut;
  if (!estSiren(e.siren)) return null;
  const siege = (e.siege && typeof e.siege === "object" ? e.siege : {}) as Brut;
  const nom = texte(e.nom_complet) ?? texte(e.nom_raison_sociale);
  if (!nom) return null;
  return {
    siren: e.siren,
    siret: texte(siege.siret),
    nom,
    adresse: texte(siege.adresse),
    activite: texte(e.activite_principale),
    // « C » pour cessée : l'entreprise n'existe plus, quelle que soit la date.
    ferme: e.etat_administratif === "C",
    fermeeLe: texte(e.date_fermeture),
    creeeLe: texte(e.date_creation),
  };
}

export function lireReponse(corps: unknown): FicheEntreprise[] {
  const resultats = corps && typeof corps === "object" ? (corps as Brut).results : null;
  if (!Array.isArray(resultats)) return [];
  return resultats.map(lireResultat).filter((f): f is FicheEntreprise => f !== null);
}

// Une entreprise vérifiée il y a plus d'une semaine est revérifiée par la machine de nuit.
export const REVERIFIER_APRES_JOURS = 7;

export function aReverifier(verifieeLe: Date, maintenant: Date): boolean {
  return maintenant.getTime() - verifieeLe.getTime() >= REVERIFIER_APRES_JOURS * 24 * 3600 * 1000;
}
