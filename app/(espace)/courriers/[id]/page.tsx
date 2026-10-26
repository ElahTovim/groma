import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { voitLInterne } from "@/lib/acces";
import { chantiersRattachables, lireCourrier, type ChampsRanges } from "@/lib/courriers";
import {
  bilanChamps,
  CATEGORIES_COURRIER,
  erreurDeLecture,
  estDepot,
  incertitudesAffichees,
  libelleCategorie,
  motifDuRejet,
  NOMS_CHAMPS,
  proposerRattachement,
} from "@/lib/courriers-regles";
import { appelantObligatoire } from "@/lib/session";
import { FicheCourrier } from "./fiche";

export const metadata: Metadata = { title: "Courrier" };

export const dynamic = "force-dynamic";
// « Relire » relance la lecture par l'IA depuis cette page.
export const maxDuration = 60;

function decoder(id: string) {
  try {
    return decodeURIComponent(id);
  } catch {
    return id;
  }
}

function jour(d: Date | null) {
  return d ? new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit", timeZone: "Europe/Paris" }).format(d) : "";
}

// La fiche d'un courrier : le texte d'origine à côté de ce que l'IA en a tiré.
export default async function PageCourrier({ params }: PageProps<"/courriers/[id]">) {
  const qui = await appelantObligatoire();
  // Interne seulement : un externe reçoit « introuvable », comme pour un courrier qui n'existe pas.
  if (!voitLInterne(qui.role)) notFound();
  const { id } = await params;
  const lu = await lireCourrier(decoder(id));
  if (!lu) notFound();
  const c = lu.courrier;
  const champs = (c.champs ?? null) as ChampsRanges | null;
  const rattachables = await chantiersRattachables(qui);
  // Le rattachement proposé est recalculé : un chantier créé depuis la lecture est trouvé.
  const propose = c.statut === "a_relire" ? (proposerRattachement(champs?.reference ?? null, rattachables) ?? null) : null;
  const echec = erreurDeLecture(c);
  const depose = estDepot(c);
  // Le bilan d'un courrier validé : ce que l'IA proposait (champs.ia) face à ce qui a été retenu.
  const bilan = c.statut === "valide" && champs?.ia ? bilanChamps(champs.ia, champs) : null;

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-2">
        <Link href={c.statut === "a_relire" ? "/courriers" : `/courriers?onglet=${c.statut}`} className="text-sm text-muted-foreground hover:underline">
          ← Courriers
        </Link>
        <h1 className="font-display text-3xl font-extrabold tracking-tight md:text-4xl">{champs?.expediteur ?? champs?.societe ?? "Courrier"}</h1>
        <p className="text-sm text-muted-foreground">
          {depose ? `Déposé le ${jour(c.recuLe)}${lu.deposant ? ` par ${lu.deposant}` : ""}${c.fichierNom ? " · PDF" : " · texte collé"}` : `Reçu le ${jour(c.recuLe)} · identifiant du flux ${c.id}`}
          {c.luLe && ` · lu par l'IA le ${jour(c.luLe)}`}
        </p>
      </div>

      <FicheCourrier
        id={c.id}
        texte={c.texte}
        fichier={c.fichierUrl ? { href: `/api/courriers/${encodeURIComponent(c.id)}/fichier`, nom: c.fichierNom ?? "courrier.pdf" } : null}
        bilan={bilan}
        valideSansLecture={c.statut === "valide" && !champs?.ia}
        statut={c.statut}
        lu={Boolean(c.luLe)}
        echec={echec}
        champs={Object.fromEntries(NOMS_CHAMPS.map((k) => [k, champs?.[k] ?? null])) as Record<(typeof NOMS_CHAMPS)[number], string | number | null>}
        proposeParIa={Object.fromEntries(NOMS_CHAMPS.map((k) => [k, (champs?.ia ?? champs)?.[k] ?? null])) as Record<(typeof NOMS_CHAMPS)[number], string | number | null>}
        corriges={champs?.corriges ?? []}
        incertitudes={incertitudesAffichees(c.incertitudes)}
        resume={c.resume}
        brouillon={c.brouillon}
        categories={CATEGORIES_COURRIER.map((x) => ({ code: x.code, libelle: x.libelle }))}
        libelleCategorie={libelleCategorie(c.categorie)}
        chantiers={rattachables}
        chantierPropose={propose}
        chantierRattache={lu.chantierReference ? { id: c.chantierId!, reference: lu.chantierReference, nom: lu.chantierNom ?? "" } : null}
        traitement={c.statut === "a_relire" ? null : { par: lu.validateur ?? "un compte supprimé", le: jour(c.valideLe), motif: motifDuRejet(c) }}
      />
    </div>
  );
}
