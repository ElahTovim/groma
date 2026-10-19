import { and, count, desc, eq, isNull, sql } from "drizzle-orm";
import { equipeVoitTout } from "@/lib/acces";
import { db } from "@/lib/db";
import { chantiers, comptes, courriers, participants } from "@/lib/db/schema";
import { appelerFlux } from "@/lib/flux";
import { demanderStructure, type Demandeur } from "@/lib/ia";
import { enDocument } from "@/lib/ia-regles";
import { CONSIGNE_LECTURE, decrireForme, lireCourriersDuFlux, schemaLecture, verifierLecture, type ChampsCourrier, type Lecture } from "@/lib/courriers-regles";
import { journal } from "@/lib/journal";
import { aujourdhuiParis } from "@/lib/regles";
import type { Appelant } from "@/lib/session";

// Les courriers du flux : les importer, les faire lire par le modèle, les lister.
// Ce module ne décide rien : il est appelé par la porte unique (lib/operations/courriers.ts),
// qui vérifie d'abord qui appelle. Ce que le modèle propose reste « à relire ».

export type StatutCourrier = (typeof courriers.$inferSelect)["statut"];

// Ce qui est rangé dans la colonne « champs » : les valeurs, et après validation,
// ce que l'IA avait proposé (pour compter ce qu'elle a raté ou inventé) et le motif d'un rejet.
export type ChampsRanges = Partial<ChampsCourrier> & { ia?: Partial<ChampsCourrier> | null; corriges?: string[]; motifRejet?: string; chantierPropose?: string | null };

// Le préfixe d'une incertitude qui dit que la lecture a échoué : l'écran la montre telle quelle.
export const PREFIXE_ECHEC = "Lecture par l'IA impossible :";

// Les chantiers qu'on peut proposer au rattachement, selon les droits de la personne.
export async function chantiersRattachables(qui: Appelant | null): Promise<{ id: string; reference: string; nom: string }[]> {
  const base = db.select({ id: chantiers.id, reference: chantiers.reference, nom: chantiers.nom }).from(chantiers);
  // La machine (qui = null) ne voit que les références, pour proposer ; elle ne rattache rien.
  if (!qui || qui.role === "gerant" || (qui.role === "equipe" && equipeVoitTout())) return base.orderBy(chantiers.reference);
  return base
    .where(sql`exists (select 1 from ${participants} where ${participants.chantierId} = ${chantiers.id} and ${participants.compteId} = ${qui.id})`)
    .orderBy(chantiers.reference);
}

// Faire lire un courrier par le modèle, puis passer sa réponse aux règles.
export async function lireParLIa(demandeur: Demandeur, texte: string): Promise<{ ok: true; lecture: Lecture } | { ok: false; erreur: string }> {
  const r = await demanderStructure(demandeur, {
    gamme: "rapide",
    consigne: CONSIGNE_LECTURE,
    contenu: enDocument(texte),
    schema: schemaLecture,
    maxJetons: 1500,
  });
  if (!r.ok) return r;
  const refs = (await db.select({ id: chantiers.id, reference: chantiers.reference }).from(chantiers)).map((c) => ({ id: c.id, reference: c.reference }));
  return { ok: true, lecture: verifierLecture(r.donnees, texte, { aujourdhui: aujourdhuiParis(), chantiers: refs }) };
}

// Ranger le résultat d'une lecture. Seulement sur un courrier encore « à relire » :
// un courrier validé ou rejeté entre-temps ne bouge plus.
export async function rangerLecture(id: string, r: Awaited<ReturnType<typeof lireParLIa>>): Promise<boolean> {
  const valeurs = r.ok
    ? {
        champs: { ...r.lecture.champs, chantierPropose: r.lecture.chantierPropose } satisfies ChampsRanges,
        incertitudes: r.lecture.incertitudes,
        categorie: r.lecture.champs.categorie,
        resume: r.lecture.resume,
        brouillon: r.lecture.brouillon,
        luLe: new Date(),
      }
    : // Une IA en panne laisse le courrier sans champs, et le dit.
      { champs: null, incertitudes: [`${PREFIXE_ECHEC} ${r.erreur}`], categorie: null, resume: null, brouillon: null, luLe: null };
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

  // Tous les courriers encore à lire, y compris ceux qu'une IA en panne avait laissés.
  const aLire = await db
    .select({ id: courriers.id, texte: courriers.texte })
    .from(courriers)
    .where(and(eq(courriers.statut, "a_relire"), isNull(courriers.luLe)))
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
      texte: courriers.texte,
      champs: courriers.champs,
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
  const [c] = await db
    .select({
      courrier: courriers,
      chantierReference: chantiers.reference,
      chantierNom: chantiers.nom,
      validateur: comptes.nom,
    })
    .from(courriers)
    .leftJoin(chantiers, eq(courriers.chantierId, chantiers.id))
    .leftJoin(comptes, eq(courriers.validePar, comptes.id))
    .where(eq(courriers.id, id))
    .limit(1);
  return c ?? null;
}
