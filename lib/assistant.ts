import { and, asc, desc, eq, inArray, isNull, sql, type SQL } from "drizzle-orm";
import { db } from "@/lib/db";
import { agentEtapes, agentExecutions, comptes } from "@/lib/db/schema";
import { estIdentifiant, statutAffiche, type StatutAffiche } from "@/lib/assistant-regles";
import type { Appelant } from "@/lib/session";

// Les lectures de l'écran de l'assistant : ses exécutions et leur journal. Rien n'écrit ici.
// Les droits sont vérifiés à chaque lecture : le journal entier est au gérant ; chacun relit
// ses propres exécutions ; un externe n'a rien.

export type ExecutionLigne = {
  id: string;
  compteId: string;
  qui: string;
  demande: string;
  statut: StatutAffiche;
  coutEur: number;
  debut: Date;
  fin: Date | null;
  outils: number;
  refus: number;
  suspects: number;
};

const colonnes = {
  id: agentExecutions.id,
  compteId: agentExecutions.compteId,
  qui: comptes.nom,
  demande: agentExecutions.demande,
  statut: agentExecutions.statut,
  coutEur: agentExecutions.coutEur,
  debut: agentExecutions.debut,
  fin: agentExecutions.fin,
  outils: sql<number>`count(${agentEtapes.id})::int`,
  refus: sql<number>`(count(${agentEtapes.id}) filter (where ${agentEtapes.ok} = false))::int`,
  suspects: sql<number>`(count(${agentEtapes.id}) filter (where ${agentEtapes.suspect} is not null))::int`,
};

function enLigne(l: Ligne, maintenant = new Date()): ExecutionLigne {
  return { ...l, statut: statutAffiche(l.statut, l.debut, maintenant), coutEur: Number(l.coutEur), outils: Number(l.outils), refus: Number(l.refus), suspects: Number(l.suspects) };
}

function requete(filtre: SQL | undefined, n: number) {
  return db
    .select(colonnes)
    .from(agentExecutions)
    .innerJoin(comptes, eq(agentExecutions.compteId, comptes.id))
    .leftJoin(agentEtapes, eq(agentEtapes.executionId, agentExecutions.id))
    .where(filtre)
    .groupBy(agentExecutions.id, comptes.nom)
    .orderBy(desc(agentExecutions.debut))
    .limit(n);
}

type Ligne = Awaited<ReturnType<typeof requete>>[number];

// Les dernières demandes de la personne, sous le champ de l'assistant.
export async function dernieresDemandes(qui: Appelant, n = 10): Promise<ExecutionLigne[]> {
  if (qui.role === "externe") return [];
  return (await requete(eq(agentExecutions.compteId, qui.id), n)).map((l) => enLigne(l));
}

// Le journal entier : gérant seulement.
export async function executionsDuJournal(qui: Appelant, n = 300): Promise<ExecutionLigne[]> {
  if (qui.role !== "gerant") return [];
  return (await requete(undefined, n)).map((l) => enLigne(l));
}

export type EtapeJournal = {
  id: string;
  outil: string;
  entrees: Record<string, unknown>;
  resultat: string | null;
  ok: boolean;
  suspect: string | null;
  creeLe: Date;
};

export type ExecutionDetail = ExecutionLigne & { reponse: string | null; erreur: string | null; tours: number; etapes: EtapeJournal[] };

const colonnesEtape = {
  id: agentEtapes.id,
  outil: agentEtapes.outil,
  entrees: agentEtapes.entrees,
  resultat: agentEtapes.resultat,
  ok: agentEtapes.ok,
  suspect: agentEtapes.suspect,
  creeLe: agentEtapes.creeLe,
};

// Une exécution et ses étapes, dans l'ordre. Le gérant voit tout ; chacun voit les siennes ;
// pour les autres, introuvable (null), comme un chantier qu'on n'a pas à voir.
export async function lireExecution(qui: Appelant, id: string): Promise<ExecutionDetail | null> {
  if (qui.role === "externe" || !estIdentifiant(id)) return null;
  const [l] = await requete(eq(agentExecutions.id, id), 1);
  if (!l || (qui.role !== "gerant" && l.compteId !== qui.id)) return null;
  const [plus] = await db.select({ reponse: agentExecutions.reponse, erreur: agentExecutions.erreur, tours: agentExecutions.tours }).from(agentExecutions).where(eq(agentExecutions.id, id)).limit(1);
  const etapes = await db.select(colonnesEtape).from(agentEtapes).where(eq(agentEtapes.executionId, id)).orderBy(asc(agentEtapes.creeLe));
  return { ...enLigne(l), ...plus, etapes };
}

export type AppelClaudeCode = EtapeJournal & { qui: string };

// Les appels venus de Claude Code (jeton personnel) : des étapes sans exécution. Gérant seulement.
export async function appelsClaudeCode(qui: Appelant, n = 100): Promise<AppelClaudeCode[]> {
  if (qui.role !== "gerant") return [];
  return db
    .select({ ...colonnesEtape, qui: comptes.nom })
    .from(agentEtapes)
    .innerJoin(comptes, eq(agentEtapes.compteId, comptes.id))
    .where(and(isNull(agentEtapes.executionId), eq(agentEtapes.origine, "mcp")))
    .orderBy(desc(agentEtapes.creeLe))
    .limit(n);
}

// Les exécutions que cette personne peut ouvrir, parmi celles citées (pour les liens de « À valider »).
export async function executionsOuvrables(qui: Appelant, ids: (string | null)[]): Promise<Set<string>> {
  const valables = [...new Set(ids.filter(estIdentifiant))];
  if (valables.length === 0 || qui.role === "externe") return new Set();
  if (qui.role === "gerant") return new Set(valables);
  const lignes = await db
    .select({ id: agentExecutions.id })
    .from(agentExecutions)
    .where(and(inArray(agentExecutions.id, valables), eq(agentExecutions.compteId, qui.id)));
  return new Set(lignes.map((l) => l.id));
}
