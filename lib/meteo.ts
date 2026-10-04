import { journal } from "@/lib/journal";

// La météo d'un chantier : l'adresse devient des coordonnées (API Adresse, sans clé),
// puis des prévisions (OpenWeatherMap, avec la clé OPENWEATHER_GROMAA, côté serveur).
// Une panne de l'une ou l'autre ne bloque jamais la fiche : elle affiche « météo indisponible ».

// Les seuils qui déclenchent une alerte pour une pose en extérieur.
export const SEUILS = { gelC: 0, pluieMm: 2, ventKmh: 50 };

export type JourMeteo = {
  date: string; // AAAA-MM-JJ, heure de Paris
  min: number;
  max: number;
  pluieMm: number;
  ventKmh: number;
  ciel: string;
  alertes: string[];
};

type Creneau = {
  dt: number;
  main: { temp_min: number; temp_max: number };
  weather: { description: string }[];
  wind: { speed: number };
  rain?: { "3h"?: number };
};

function jourParis(dt: number): string {
  return new Intl.DateTimeFormat("fr-CA", { timeZone: "Europe/Paris" }).format(new Date(dt * 1000));
}

// Des créneaux de 3 heures → les trois prochains jours, avec leurs alertes.
export function resumerPrevisions(creneaux: Creneau[], aujourdhui: string): JourMeteo[] {
  const parJour = new Map<string, Creneau[]>();
  for (const c of creneaux) {
    const j = jourParis(c.dt);
    if (j < aujourdhui) continue;
    parJour.set(j, [...(parJour.get(j) ?? []), c]);
  }
  return [...parJour.entries()].slice(0, 3).map(([date, cs]) => {
    const min = Math.round(Math.min(...cs.map((c) => c.main.temp_min)));
    const max = Math.round(Math.max(...cs.map((c) => c.main.temp_max)));
    const pluieMm = Math.round(cs.reduce((s, c) => s + (c.rain?.["3h"] ?? 0), 0) * 10) / 10;
    const ventKmh = Math.round(Math.max(...cs.map((c) => c.wind.speed)) * 3.6);
    // Le ciel le plus fréquent de la journée.
    const compte = new Map<string, number>();
    for (const c of cs) {
      const d = c.weather[0]?.description ?? "";
      compte.set(d, (compte.get(d) ?? 0) + 1);
    }
    const ciel = [...compte.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? "";
    const alertes: string[] = [];
    if (min <= SEUILS.gelC) alertes.push("Gel");
    if (pluieMm >= SEUILS.pluieMm) alertes.push("Pluie");
    if (ventKmh >= SEUILS.ventKmh) alertes.push("Vent fort");
    return { date, min, max, pluieMm, ventKmh, ciel, alertes };
  });
}

export async function geolocaliser(adresse: string, codePostal: string, ville: string): Promise<{ latitude: number; longitude: number } | null> {
  try {
    const q = encodeURIComponent(`${adresse} ${codePostal} ${ville}`);
    const r = await fetch(`https://api-adresse.data.gouv.fr/search/?q=${q}&postcode=${codePostal}&limit=1`, {
      signal: AbortSignal.timeout(4000),
    });
    if (!r.ok) {
      journal("adresse_echec", { statut: r.status });
      return null;
    }
    const d = await r.json();
    const f = d.features?.[0];
    // En dessous de ce score, l'API a deviné plutôt que trouvé.
    if (!f || f.properties.score < 0.5) return null;
    const [longitude, latitude] = f.geometry.coordinates;
    return { latitude, longitude };
  } catch (e) {
    journal("adresse_echec", { erreur: String(e) });
    return null;
  }
}

export type ResultatMeteo = { ok: true; jours: JourMeteo[] } | { ok: false; raison: string };

export async function previsions(latitude: number, longitude: number, aujourdhui: string): Promise<ResultatMeteo> {
  const cle = process.env.OPENWEATHER_GROMAA;
  if (!cle) return { ok: false, raison: "Météo non configurée." };
  try {
    const r = await fetch(
      `https://api.openweathermap.org/data/2.5/forecast?lat=${latitude}&lon=${longitude}&units=metric&lang=fr&appid=${cle}`,
      // Les prévisions changent peu : on les garde 30 minutes, ce qui ménage le quota gratuit.
      { signal: AbortSignal.timeout(4000), next: { revalidate: 1800 } },
    );
    if (!r.ok) {
      // 401 : la clé est révoquée ou invalide. C'est ce qu'on voit pendant la démo.
      journal("meteo_echec", { statut: r.status });
      return { ok: false, raison: "Météo indisponible pour le moment." };
    }
    const d = await r.json();
    return { ok: true, jours: resumerPrevisions(d.list ?? [], aujourdhui) };
  } catch (e) {
    journal("meteo_echec", { erreur: String(e) });
    return { ok: false, raison: "Météo indisponible pour le moment." };
  }
}
