"use server";

import { indexer, type ResultatIndexation } from "@/lib/operations/documents";
import { appelant } from "@/lib/session";

// L'écran ne fait que passer la session à l'opération, qui vérifie tout.
export async function indexerLesDocuments(): Promise<ResultatIndexation> {
  return indexer(await appelant());
}
