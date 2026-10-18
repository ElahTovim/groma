import { asc, cosineDistance, eq, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { documents, morceaux } from "@/lib/db/schema";
import { appelerFlux } from "@/lib/flux";
import { vectoriser, type Demandeur } from "@/lib/ia";
import { journal } from "@/lib/journal";
import {
  aRevectoriser,
  decouper,
  empreinteDocument,
  enLots,
  lireDocument,
  lireListe,
  REGLAGES_RECHERCHE,
  retenirSources,
  texteAVectoriser,
  type DocumentLu,
  type Morceau,
  type Source,
} from "@/lib/recherche-regles";

// L'index des documents du flux et la recherche des passages proches d'une question.
// Les règles (découpage, empreinte, seuil) sont dans recherche-regles.ts.
// Les droits ne sont pas vérifiés ici : la porte est lib/operations/documents.ts pour
// l'indexation, et la route app/api/questions pour la question. La nuit (piste C)
// pourra appeler indexerDocuments({ compteId: null, fonction: "indexation_nuit" }).

export type BilanIndexation =
  | {
      ok: true;
      lus: number;
      indexes: string[];
      inchanges: number;
      morceaux: number;
      misDeCote: { id: string; raison: string }[];
    }
  | { ok: false; erreur: string };

const LECTURES_EN_PARALLELE = 4;

async function lireUnDocument(id: string): Promise<{ ok: true; doc: DocumentLu } | { ok: false; id: string; raison: string }> {
  const r = await appelerFlux("documents", { id });
  if (!r.ok) return { ok: false, id, raison: `le flux a répondu ${r.statut ?? "rien"} : ${r.erreur.slice(0, 120)}` };
  const lu = lireDocument(r.corps, id);
  return lu.ok ? { ok: true, doc: lu.valeur } : { ok: false, id, raison: lu.raison };
}

export async function indexerDocuments(demandeur: Demandeur): Promise<BilanIndexation> {
  const liste = await appelerFlux("documents");
  if (!liste.ok) return { ok: false, erreur: `Le flux ne donne pas la liste des documents (${liste.statut ?? "pas de réponse"} : ${liste.erreur.slice(0, 120)}). Rien n'a changé.` };
  const lue = lireListe(liste.corps);
  if (!lue.ok) {
    journal("indexation_liste_illisible", { raison: lue.raison });
    return { ok: false, erreur: `La liste des documents est illisible (${lue.raison}). Rien n'a changé.` };
  }
  const misDeCote = lue.valeur.illisibles.map((raison) => ({ id: "?", raison }));

  // Chaque document, quelques-uns à la fois. Un document illisible est mis de côté, le reste continue.
  const lus: DocumentLu[] = [];
  for (const lot of enLots(lue.valeur.ids, LECTURES_EN_PARALLELE)) {
    for (const r of await Promise.all(lot.map(lireUnDocument))) {
      if (r.ok) lus.push(r.doc);
      else {
        journal("document_illisible", { document: r.id, raison: r.raison });
        misDeCote.push({ id: r.id, raison: r.raison });
      }
    }
  }

  // Seuls les documents nouveaux ou modifiés partent au service de vecteurs.
  const connus = new Map((await db.select({ id: documents.id, empreinte: documents.empreinte }).from(documents)).map((d) => [d.id, d.empreinte]));
  const aFaire = lus
    .map((doc) => ({ doc, empreinte: empreinteDocument(doc), morceaux: decouper(doc.pages) }))
    .filter((x) => aRevectoriser(connus.get(x.doc.id), x.empreinte));
  const inchanges = lus.length - aFaire.length;

  // Les vecteurs par lots, tous documents confondus : moins d'appels.
  const aVectoriser = aFaire.flatMap((x) => x.morceaux.map((m) => ({ docId: x.doc.id, m, texte: texteAVectoriser(x.doc.titre, m) })));
  const vecteurs = new Map<string, number[][]>();
  let echecVecteurs: string | null = null;
  for (const lot of enLots(aVectoriser, REGLAGES_RECHERCHE.morceauxParLot)) {
    const v = await vectoriser(demandeur, lot.map((x) => x.texte), "document");
    if (!v.ok || v.vecteurs.length !== lot.length) {
      echecVecteurs = v.ok ? "le service de vecteurs n'a pas tout renvoyé" : v.erreur;
      break;
    }
    lot.forEach((x, i) => vecteurs.set(x.docId, [...(vecteurs.get(x.docId) ?? []), v.vecteurs[i]]));
  }

  // Un document n'est écrit que si tous ses morceaux ont leur vecteur, et d'un seul coup :
  // l'ancienne version est remplacée par la nouvelle, jamais un mélange des deux.
  const indexes: string[] = [];
  let nbMorceaux = 0;
  for (const { doc, empreinte, morceaux: ms } of aFaire) {
    const vs = vecteurs.get(doc.id) ?? [];
    if (vs.length !== ms.length) {
      misDeCote.push({ id: doc.id, raison: `pas de vecteurs (${echecVecteurs ?? "inconnu"}) : l'ancienne version reste en place` });
      continue;
    }
    await remplacer(doc, empreinte, ms, vs);
    indexes.push(doc.id);
    nbMorceaux += ms.length;
  }

  journal("indexation", { compte: demandeur.compteId, lus: lus.length, indexes: indexes.length, inchanges, morceaux: nbMorceaux, mis_de_cote: misDeCote.length });
  return { ok: true, lus: lus.length, indexes, inchanges, morceaux: nbMorceaux, misDeCote };
}

async function remplacer(doc: DocumentLu, empreinte: string, ms: Morceau[], vs: number[][]) {
  const fiche = { titre: doc.titre, type: doc.type, nbPages: doc.pages.length, empreinte, indexeLe: new Date() };
  await db.batch([
    db.insert(documents).values({ id: doc.id, ...fiche }).onConflictDoUpdate({ target: documents.id, set: fiche }),
    db.delete(morceaux).where(eq(morceaux.documentId, doc.id)),
    db.insert(morceaux).values(ms.map((m, i) => ({ documentId: doc.id, page: m.page, rang: m.rang, texte: m.texte, vecteur: vs[i] }))),
  ]);
}

// ——— Lire l'index ———

export async function nombreDeDocuments(): Promise<number> {
  const [r] = await db.select({ n: sql<number>`count(*)::int` }).from(documents);
  return r.n;
}

export async function documentsIndexes() {
  return db
    .select({
      id: documents.id,
      titre: documents.titre,
      type: documents.type,
      nbPages: documents.nbPages,
      indexeLe: documents.indexeLe,
      // Une jointure plutôt qu'une sous-requête : dans une sous-requête, Drizzle écrit « id »
      // sans le nom de la table, et la base comprenait l'identifiant du passage.
      morceaux: sql<number>`count(${morceaux.id})::int`,
    })
    .from(documents)
    .leftJoin(morceaux, eq(morceaux.documentId, documents.id))
    .groupBy(documents.id)
    .orderBy(asc(documents.titre));
}

// ——— Chercher ———

export type Recherche = { ok: true; sources: Source[]; plusProche: number | null } | { ok: false; erreur: string };

// La question devient un vecteur, puis les passages les plus proches (distance cosinus, <=>).
// On en lit un peu plus que nécessaire : le seuil et le regroupement par page trient ensuite.
export async function chercherPassages(demandeur: Demandeur, question: string): Promise<Recherche> {
  const v = await vectoriser(demandeur, [question], "query");
  if (!v.ok) return { ok: false, erreur: v.erreur };
  const distance = cosineDistance(morceaux.vecteur, v.vecteurs[0]);
  const lignes = await db
    .select({ documentId: morceaux.documentId, titre: documents.titre, page: morceaux.page, rang: morceaux.rang, texte: morceaux.texte, distance: sql<number>`${distance}` })
    .from(morceaux)
    .innerJoin(documents, eq(documents.id, morceaux.documentId))
    .orderBy(distance)
    .limit(REGLAGES_RECHERCHE.passagesMax * 2);
  const passages = lignes.map((l) => ({ ...l, distance: Number(l.distance) }));
  return { ok: true, sources: retenirSources(passages), plusProche: passages[0]?.distance ?? null };
}
