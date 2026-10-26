"use server";

import { revalidatePath } from "next/cache";
import { lancerAgent } from "@/lib/agent/executer";
import { adresseDuSite } from "@/lib/courriel";
import { appelant } from "@/lib/session";

export type RetourAssistant = { ok: true; executionId: string } | { ok: false; erreur: string; executionId?: string };

// L'enveloppe de l'écran : elle passe la session à l'agent, qui fait lui-même ses vérifications
// (session, rôle, plafonds). Le résultat est relu en base par la page, pas renvoyé tel quel.
export async function demanderALAssistant(demande: string): Promise<RetourAssistant> {
  const r = await lancerAgent(await appelant(), demande, await adresseDuSite());
  // La pastille « À valider » de l'en-tête et l'historique changent après une exécution.
  revalidatePath("/", "layout");
  if (r.ok) return { ok: true, executionId: r.executionId };
  return { ok: false, erreur: r.erreur, executionId: r.executionId };
}
