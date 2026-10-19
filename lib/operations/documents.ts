import { revalidatePath } from "next/cache";
import { journal } from "@/lib/journal";
import { indexerDocuments } from "@/lib/recherche";
import type { Appelant } from "@/lib/session";

// Les opérations sur les documents du flux : la porte unique de AGENTS.md.
// qui appelle → a-t-il le droit → écrire → journaliser.

export type ResultatIndexation = { ok: true; message: string; misDeCote: { id: string; raison: string }[] } | { ok: false; erreur: string };

// Indexer les documents du flux : seul le gérant, car cela dépense le budget de l'IA.
// Un document déjà indexé et inchangé n'est pas revectorisé (empreinte).
export async function indexer(qui: Appelant | null): Promise<ResultatIndexation> {
  if (!qui) return { ok: false, erreur: "Votre session a expiré. Reconnectez-vous." };
  if (qui.role !== "gerant") {
    journal("indexation_refusee", { compte: qui.id, role: qui.role });
    return { ok: false, erreur: "Seul le gérant peut indexer les documents." };
  }
  const bilan = await indexerDocuments({ compteId: qui.id, fonction: "indexation" });
  journal("documents_indexes", { compte: qui.id, ok: bilan.ok, ...(bilan.ok ? { indexes: bilan.indexes.length, inchanges: bilan.inchanges, mis_de_cote: bilan.misDeCote.length } : { erreur: bilan.erreur }) });
  if (!bilan.ok) return bilan;
  revalidatePath("/questions");
  const parties = [
    `${bilan.lus} document${bilan.lus > 1 ? "s" : ""} lu${bilan.lus > 1 ? "s" : ""}`,
    `${bilan.indexes.length} indexé${bilan.indexes.length > 1 ? "s" : ""} (${bilan.morceaux} passages)`,
    `${bilan.inchanges} inchangé${bilan.inchanges > 1 ? "s" : ""}, sans nouveau calcul`,
  ];
  if (bilan.misDeCote.length) parties.push(`${bilan.misDeCote.length} mis de côté`);
  return { ok: true, message: `${parties.join(", ")}.`, misDeCote: bilan.misDeCote };
}
