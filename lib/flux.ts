import { journal } from "@/lib/journal";

// Le flux de nuit de la formation : https://flux-de-nuit.vercel.app (docs/consignes/2-…).
// La clé (FLUX_DE_NUIT_API_KEY) ne quitte jamais le serveur.
export const FLUX = { base: "https://flux-de-nuit.vercel.app", sujet: "chantiers" };

export type ReponseFlux =
  | { ok: true; statut: number; corps: unknown; dureeMs: number }
  | { ok: false; statut: number | null; erreur: string; dureeMs: number };

// Un seul appel, avec un délai d'attente. Les nouvelles tentatives viennent à la tranche 2.
export async function appelerFlux(chemin: "evenements" | "documents" | "courriers", params: Record<string, string> = {}): Promise<ReponseFlux> {
  const cle = process.env.FLUX_DE_NUIT_API_KEY;
  const debut = Date.now();
  if (!cle) return { ok: false, statut: null, erreur: "Clé du flux absente (FLUX_DE_NUIT_API_KEY).", dureeMs: 0 };
  const url = new URL(`/api/${chemin}`, FLUX.base);
  url.searchParams.set("sujet", FLUX.sujet);
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  try {
    const r = await fetch(url, { headers: { Authorization: `Bearer ${cle}` }, signal: AbortSignal.timeout(15000), cache: "no-store" });
    const dureeMs = Date.now() - debut;
    const texte = await r.text();
    if (!r.ok) {
      journal("flux_erreur", { chemin, statut: r.status, dureeMs });
      return { ok: false, statut: r.status, erreur: texte.slice(0, 300) || `Réponse ${r.status}`, dureeMs };
    }
    try {
      return { ok: true, statut: r.status, corps: JSON.parse(texte), dureeMs };
    } catch {
      return { ok: false, statut: r.status, erreur: "Réponse illisible (pas du JSON).", dureeMs };
    }
  } catch (e) {
    const dureeMs = Date.now() - debut;
    journal("flux_erreur", { chemin, erreur: String(e), dureeMs });
    return { ok: false, statut: null, erreur: e instanceof Error && e.name === "TimeoutError" ? "Le flux n'a pas répondu à temps." : "Le flux est injoignable.", dureeMs };
  }
}
