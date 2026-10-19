import { get } from "@vercel/blob";
import { and, count, desc, eq, isNull, sql } from "drizzle-orm";
import { equipeVoitTout } from "@/lib/acces";
import { alias } from "drizzle-orm/pg-core";
import { db } from "@/lib/db";
import { chantiers, comptes, courriers, participants } from "@/lib/db/schema";
import { appelerFlux } from "@/lib/flux";
import { demanderStructure, type Demandeur } from "@/lib/ia";
import { enDocument } from "@/lib/ia-regles";
import {
  bilanGlobal,
  CONSIGNE_LECTURE,
  CONSIGNE_LECTURE_PDF,
  decrireForme,
  lireCourriersDuFlux,
  messagePdfTropLourd,
  pdfTropLourdPourLIa,
  REGLES_DEPOT,
  schemaLecture,
  schemaLecturePdf,
  transcriptionValide,
  verifierLecture,
  type ChampsCourrier,
  type Lecture,
} from "@/lib/courriers-regles";
import { journal } from "@/lib/journal";
import { aujourdhuiParis } from "@/lib/regles";
import type { Appelant } from "@/lib/session";

// Les courriers du flux et les courriers déposés : les importer, les faire lire par le modèle, les lister.
// Ce module ne décide rien : il est appelé par la porte unique (lib/operations/courriers.ts),
// qui vérifie d'abord qui appelle. Ce que le modèle propose reste « à relire ».

export type StatutCourrier = (typeof courriers.$inferSelect)["statut"];

// Ce qui est rangé dans la colonne « champs » : les valeurs, et après validation,
// ce que l'IA avait proposé (pour le bilan : ce qu'elle a eu juste, raté ou inventé).
// motifRejet n'y est plus écrit (il a sa colonne) : il n'y reste que sur les anciens courriers.
export type ChampsRanges = Partial<ChampsCourrier> & { ia?: Partial<ChampsCourrier> | null; corriges?: string[]; motifRejet?: string; chantierPropose?: string | null };

// Les chantiers qu'on peut proposer au rattachement, selon les droits de la personne.
export async function chantiersRattachables(qui: Appelant | null): Promise<{ id: string; reference: string; nom: string }[]> {
  const base = db.select({ id: chantiers.id, reference: chantiers.reference, nom: chantiers.nom }).from(chantiers);
  // La machine (qui = null) ne voit que les références, pour proposer ; elle ne rattache rien.
  if (!qui || qui.role === "gerant" || (qui.role === "equipe" && equipeVoitTout())) return base.orderBy(chantiers.reference);
  return base
    .where(sql`exists (select 1 from ${participants} where ${participants.chantierId} = ${chantiers.id} and ${participants.compteId} = ${qui.id})`)
    .orderBy(chantiers.reference);
}

export type ResultatLecture = { ok: true; lecture: Lecture; transcription?: string | null } | { ok: false; erreur: string };

// Faire lire un courrier par le modèle, puis passer sa réponse aux règles.
// Avec un PDF (en base64), le modèle lit le fichier et en rend aussi la transcription :
// les vérifications (référence citée, montant écrit) portent alors sur ce texte.
export async function lireParLIa(demandeur: Demandeur, texte: string, pdf?: string): Promise<ResultatLecture> {
  const refs = async () => (await db.select({ id: chantiers.id, reference: chantiers.reference }).from(chantiers)).map((c) => ({ id: c.id, reference: c.reference }));
  if (pdf) {
    if (pdfTropLourdPourLIa(Math.floor((pdf.length * 3) / 4))) return { ok: false, erreur: messagePdfTropLourd() };
    const r = await demanderStructure(demandeur, {
      gamme: "rapide",
      consigne: CONSIGNE_LECTURE_PDF,
      contenu: enDocument("Le courrier à lire est le PDF joint."),
      schema: schemaLecturePdf,
      maxJetons: REGLES_DEPOT.jetonsLecturePdf,
      pdf,
    });
    if (!r.ok) return r;
    const transcription = transcriptionValide(r.donnees.transcription);
    return { ok: true, transcription, lecture: verifierLecture(r.donnees, transcription ?? "", { aujourdhui: aujourdhuiParis(), chantiers: await refs() }) };
  }
  const r = await demanderStructure(demandeur, {
    gamme: "rapide",
    consigne: CONSIGNE_LECTURE,
    contenu: enDocument(texte),
    schema: schemaLecture,
    maxJetons: REGLES_DEPOT.jetonsLectureTexte,
  });
  if (!r.ok) return r;
  return { ok: true, lecture: verifierLecture(r.donnees, texte, { aujourdhui: aujourdhuiParis(), chantiers: await refs() }) };
}

// Le PDF d'un courrier déposé, relu depuis Vercel Blob (accès privé) pour une nouvelle lecture.
export async function pdfDuCourrier(fichierUrl: string): Promise<string | null> {
  try {
    const b = await get(fichierUrl, { access: "private" });
    if (!b?.stream) return null;
    return Buffer.from(await new Response(b.stream).arrayBuffer()).toString("base64");
  } catch {
    return null;
  }
}

// Ranger le résultat d'une lecture. Seulement sur un courrier encore « à relire » :
// un courrier validé ou rejeté entre-temps ne bouge plus.
export async function rangerLecture(id: string, r: ResultatLecture): Promise<boolean> {
  const valeurs = r.ok
    ? {
        champs: { ...r.lecture.champs, chantierPropose: r.lecture.chantierPropose } satisfies ChampsRanges,
        incertitudes: r.lecture.incertitudes,
        categorie: r.lecture.champs.categorie,
        resume: r.lecture.resume,
        brouillon: r.lecture.brouillon,
        erreurLecture: null,
        luLe: new Date(),
        // La transcription d'un PDF devient le texte du courrier.
        ...(r.transcription ? { texte: r.transcription } : {}),
      }
    : // Une IA en panne laisse le courrier sans champs, et le dit dans sa colonne.
      { champs: null, incertitudes: [], erreurLecture: r.erreur.slice(0, 500), categorie: null, resume: null, brouillon: null, luLe: null };
  const fait = await db
    .update(courriers)
    .set(valeurs)
    .where(and(eq(courriers.id, id), eq(courriers.statut, "a_relire")))
    .returning({ id: courriers.id });
  return fait.length > 0;
}

export type BilanImport = {
  ok: boolean;
  erreur?: string;
  recus: number;
  nouveaux: number;
  dejaConnus: number;
  doublons: number;
  misDeCote: number;
  lus: number;
  echecsLecture: number;
  premiereErreurIa?: string;
};

// Combien de lectures en même temps : assez pour finir dans la minute, pas assez pour saturer l'IA.
const LECTURES_EN_PARALLELE = 4;

// Lire les courriers du flux, ranger les nouveaux, puis faire lire ceux qui ne l'ont pas encore été.
// Rejouable : l'identifiant du flux est la clé, un courrier déjà reçu n'est ni recréé ni relu.
export async function importerCourriers(demandeur: Demandeur): Promise<BilanImport> {
  const vide = { recus: 0, nouveaux: 0, dejaConnus: 0, doublons: 0, misDeCote: 0, lus: 0, echecsLecture: 0 };
  const reponse = await appelerFlux("courriers");
  if (!reponse.ok) {
    journal("courriers_flux_erreur", { statut: reponse.statut, erreur: reponse.erreur, dureeMs: reponse.dureeMs });
    return { ok: false, erreur: reponse.statut === 503 ? "Le flux est en panne pour l'instant. Réessayez dans un moment." : reponse.erreur, ...vide };
  }
  const lu = lireCourriersDuFlux(reponse.corps);
  // On journalise la forme reçue (sans le contenu) : c'est elle qui dira si l'analyse doit changer.
  journal("courriers_flux_recu", { forme: decrireForme(reponse.corps), courriers: lu.courriers.length, doublons: lu.doublons, mis_de_cote: lu.misDeCote });

  let nouveaux = 0;
  if (lu.courriers.length) {
    const inseres = await db
      .insert(courriers)
      .values(lu.courriers.map((c) => ({ id: c.id, texte: c.texte })))
      .onConflictDoNothing({ target: courriers.id })
      .returning({ id: courriers.id });
    nouveaux = inseres.length;
  }

  // Tous les courriers du flux encore à lire, y compris ceux qu'une IA en panne avait laissés.
  // Un courrier déposé se relit depuis sa fiche (« Relire avec l'IA »), avec son PDF.
  const aLire = await db
    .select({ id: courriers.id, texte: courriers.texte })
    .from(courriers)
    .where(and(eq(courriers.statut, "a_relire"), isNull(courriers.luLe), eq(courriers.origine, "flux")))
    .orderBy(courriers.recuLe)
    .limit(20);

  let lus = 0;
  let echecsLecture = 0;
  let premiereErreurIa: string | undefined;
  for (let i = 0; i < aLire.length; i += LECTURES_EN_PARALLELE) {
    const lot = aLire.slice(i, i + LECTURES_EN_PARALLELE);
    const resultats = await Promise.all(lot.map((c) => lireParLIa(demandeur, c.texte)));
    for (const [j, r] of resultats.entries()) {
      await rangerLecture(lot[j].id, r);
      if (r.ok) lus++;
      else {
        echecsLecture++;
        premiereErreurIa ??= r.erreur;
      }
    }
    // L'IA est en pause (budget, clé absente) : inutile d'insister sur les suivants.
    if (resultats.every((r) => !r.ok)) break;
  }

  const bilan: BilanImport = {
    ok: true,
    recus: lu.courriers.length,
    nouveaux,
    dejaConnus: lu.courriers.length - nouveaux,
    doublons: lu.doublons,
    misDeCote: lu.misDeCote.length,
    lus,
    echecsLecture,
    premiereErreurIa,
  };
  journal("courriers_importes", { ...bilan, compte: demandeur.compteId });
  return bilan;
}

// ——— Pour l'écran ———

export async function compterCourriers(): Promise<Record<StatutCourrier, number>> {
  const lignes = await db.select({ statut: courriers.statut, n: count() }).from(courriers).groupBy(courriers.statut);
  const r: Record<StatutCourrier, number> = { a_relire: 0, valide: 0, rejete: 0 };
  for (const l of lignes) r[l.statut] = l.n;
  return r;
}

export async function listerCourriers(statut: StatutCourrier) {
  return db
    .select({
      id: courriers.id,
      origine: courriers.origine,
      fichierNom: courriers.fichierNom,
      texte: courriers.texte,
      champs: courriers.champs,
      motifRejet: courriers.motifRejet,
      erreurLecture: courriers.erreurLecture,
      categorie: courriers.categorie,
      resume: courriers.resume,
      incertitudes: courriers.incertitudes,
      luLe: courriers.luLe,
      recuLe: courriers.recuLe,
      valideLe: courriers.valideLe,
      chantierReference: chantiers.reference,
    })
    .from(courriers)
    .leftJoin(chantiers, eq(courriers.chantierId, chantiers.id))
    .where(eq(courriers.statut, statut))
    .orderBy(statut === "a_relire" ? courriers.recuLe : desc(courriers.valideLe))
    .limit(200);
}

export async function lireCourrier(id: string) {
  const deposant = alias(comptes, "deposant");
  const [c] = await db
    .select({
      courrier: courriers,
      chantierReference: chantiers.reference,
      chantierNom: chantiers.nom,
      validateur: comptes.nom,
      deposant: deposant.nom,
    })
    .from(courriers)
    .leftJoin(chantiers, eq(courriers.chantierId, chantiers.id))
    .leftJoin(comptes, eq(courriers.validePar, comptes.id))
    .leftJoin(deposant, eq(courriers.deposePar, deposant.id))
    .where(eq(courriers.id, id))
    .limit(1);
  return c ?? null;
}

// Le bilan de l'IA sur tous les courriers validés (lib/courriers-regles.ts : bilanGlobal).
export async function bilanDesCourriers() {
  const valides = await db.select({ champs: courriers.champs }).from(courriers).where(eq(courriers.statut, "valide"));
  return bilanGlobal(valides);
}
