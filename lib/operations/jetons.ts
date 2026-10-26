import { revalidatePath } from "next/cache";
import { z } from "zod";
import { creerJeton, jetonsPersonnels, revoquerJeton } from "@/lib/agent/jetons";
import { journal } from "@/lib/journal";
import type { Appelant } from "@/lib/session";

// Les jetons personnels du serveur MCP (Claude Code) : la porte unique de AGENTS.md.
// Gérant seulement en semaine 4. Un jeton porte les droits de la personne qui l'a créé ;
// il n'est montré qu'une fois, seule son empreinte est gardée.

export type ResultatJeton = { ok: true; message: string; jeton?: string } | { ok: false; erreur: string };

export type JetonVue = { id: string; nom: string; creeLe: string; derniereUtilisation: string | null; revoqueLe: string | null };

const peutAvoirUnJeton = (qui: Appelant) => qui.role === "gerant";

const nomDuJeton = z.string().trim().min(2, "Donnez un nom au jeton (par exemple : « portable de Kerguelenn »).").max(80, "Nom trop long : 80 caractères au plus.");

export async function mesJetons(qui: Appelant | null): Promise<JetonVue[]> {
  if (!qui || !peutAvoirUnJeton(qui)) return [];
  const lignes = await jetonsPersonnels(qui.id);
  return lignes
    .map((l) => ({ id: l.id, nom: l.nom, creeLe: l.creeLe.toISOString(), derniereUtilisation: l.derniereUtilisation?.toISOString() ?? null, revoqueLe: l.revoqueLe?.toISOString() ?? null }))
    .reverse();
}

export async function nouveauJeton(qui: Appelant | null, nom: unknown): Promise<ResultatJeton> {
  if (!qui) return { ok: false, erreur: "Votre session a expiré. Reconnectez-vous." };
  if (!peutAvoirUnJeton(qui)) {
    journal("action_refusee", { compte: qui.id, role: qui.role, action: "jeton_mcp" });
    return { ok: false, erreur: "Seul le gérant peut créer un jeton pour Claude Code." };
  }
  const lu = nomDuJeton.safeParse(nom);
  if (!lu.success) return { ok: false, erreur: lu.error.issues[0].message };
  const { jeton, id } = await creerJeton({ compteId: qui.id, nom: lu.data });
  journal("jeton_mcp_cree", { compte: qui.id, jeton: id });
  revalidatePath("/reglages");
  return { ok: true, message: `Jeton « ${lu.data} » créé.`, jeton };
}

export async function retirerJeton(qui: Appelant | null, id: unknown): Promise<ResultatJeton> {
  if (!qui) return { ok: false, erreur: "Votre session a expiré. Reconnectez-vous." };
  if (!peutAvoirUnJeton(qui)) {
    journal("action_refusee", { compte: qui.id, role: qui.role, action: "jeton_mcp_revoque" });
    return { ok: false, erreur: "Seul le gérant peut révoquer un jeton." };
  }
  const lu = z.uuid().safeParse(id);
  if (!lu.success) return { ok: false, erreur: "Jeton introuvable." };
  // Le compte est dans la condition : on ne révoque que ses propres jetons personnels.
  const mien = (await jetonsPersonnels(qui.id)).some((j) => j.id === lu.data);
  if (!mien || !(await revoquerJeton(lu.data, qui.id))) return { ok: false, erreur: "Jeton introuvable ou déjà révoqué." };
  journal("jeton_mcp_revoque", { compte: qui.id, jeton: lu.data });
  revalidatePath("/reglages");
  return { ok: true, message: "Jeton révoqué : Claude Code ne peut plus s'en servir." };
}
