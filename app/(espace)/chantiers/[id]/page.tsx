import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { BadgeStatut } from "@/components/badge-statut";
import { Section } from "@/components/section";
import { Skeleton } from "@/components/ui/skeleton";
import { voitLInterne } from "@/lib/acces";
import { lireChantier } from "@/lib/chantiers";
import { contexteChantier, lireFil, lireLots, lireParticipants } from "@/lib/fiche";
import { dateCourte, euros } from "@/lib/format";
import { journal } from "@/lib/journal";
import { etapeSuivante, verifierPassage } from "@/lib/regles";
import { appelantObligatoire } from "@/lib/session";
import { AnnonceCreation } from "./annonce-creation";
import { EtapeChantier } from "./etape";
import { Fil } from "./fil";
import { Inviter } from "./inviter";
import { Lots } from "./lots";
import { Meteo } from "./meteo";
import { PhotoChantier } from "./photo";

export const dynamic = "force-dynamic";

// L'ordre suit le terrain : ce qui bloque et l'étape suivante, puis les lots, puis
// le fil. La météo, les informations et les participants viennent ensuite
// (en colonne de droite sur ordinateur, en bas sur téléphone).
export default async function FicheChantier({ params, searchParams }: PageProps<"/chantiers/[id]">) {
  const qui = await appelantObligatoire();
  const { id } = await params;
  const { cree } = await searchParams;

  const chantier = await lireChantier(qui, id);
  if (!chantier) {
    // Inexistant ou non autorisé : même réponse, mais la tentative est notée.
    journal("acces_refuse", { compte: qui.id, role: qui.role, chantier: id });
    notFound();
  }

  const interne = voitLInterne(qui.role);
  const termine = chantier.statut === "clos" || chantier.statut === "annule";
  const suivante = etapeSuivante(chantier.statut);
  const [participants, lots, elements, contexte] = await Promise.all([
    interne ? lireParticipants(chantier.id) : Promise.resolve([]),
    lireLots(qui, chantier.id),
    lireFil(qui, chantier.id),
    interne && suivante ? contexteChantier(chantier.id, chantier.debutPrevu) : Promise.resolve(null),
  ]);
  // Ce qui bloque l'étape suivante, calculé avant tout clic.
  const verdict = suivante && contexte ? verifierPassage(chantier.statut, suivante, contexte) : null;
  const blocages = verdict && !verdict.ok ? verdict.raisons : [];

  return (
    // La marge du bas laisse la place au bouton fixé sous le pouce, sur téléphone.
    <div className="flex flex-col gap-6 pb-28 md:pb-0">
      {cree && <AnnonceCreation />}
      <Link href="/chantiers" className="text-sm text-muted-foreground hover:text-foreground">
        ← Tous les chantiers
      </Link>

      {(chantier.aPhoto || (interne && !termine)) && (
        <PhotoChantier chantierId={chantier.id} aPhoto={chantier.aPhoto} nom={chantier.nom} modifiable={interne && !termine} />
      )}

      <header className="flex flex-col gap-4">
        <div className="flex flex-col gap-1.5">
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="min-w-0 text-2xl font-semibold tracking-tight text-balance md:text-3xl">{chantier.nom}</h1>
            <BadgeStatut statut={chantier.statut} />
          </div>
          <p className="text-muted-foreground">
            {chantier.adresse}, {chantier.codePostal} {chantier.ville} · <span className="font-mono text-xs whitespace-nowrap">{chantier.reference}</span>
          </p>
        </div>
        {interne && !termine && <EtapeChantier chantierId={chantier.id} statut={chantier.statut} debutPrevu={chantier.debutPrevu} blocages={blocages} />}
      </header>

      <div className="grid gap-x-10 gap-y-6 md:grid-cols-[minmax(0,1fr)_20rem]">
        <div className="flex min-w-0 flex-col gap-6">
          {interne && <Lots chantierId={chantier.id} lots={lots} participants={participants} modifiable={!termine} />}
          <Fil chantierId={chantier.id} interne={interne} elements={elements} participants={participants} lots={lots} />
        </div>

        <aside className="flex min-w-0 flex-col gap-6">
          <Suspense fallback={<Skeleton className="h-28" />}>
            <Meteo chantier={chantier} />
          </Suspense>

          <Section titre="Le chantier">
            <dl className="grid grid-cols-[auto_1fr] gap-x-6 gap-y-2 text-sm">
              <dt className="text-muted-foreground">Client</dt>
              <dd>{chantier.client}</dd>
              <dt className="text-muted-foreground">Début prévu</dt>
              <dd className="tabular-nums">{dateCourte(chantier.debutPrevu)}</dd>
              <dt className="text-muted-foreground">Fin prévue</dt>
              <dd className="tabular-nums">{dateCourte(chantier.finPrevue)}</dd>
              {interne && (
                <>
                  <dt className="text-muted-foreground">Montant HT</dt>
                  <dd className="tabular-nums">{euros(chantier.montantHt)}</dd>
                </>
              )}
            </dl>
          </Section>

          {interne && (
            <Section titre="Participants" action={!termine ? <Inviter chantierId={chantier.id} /> : undefined}>
              {participants.length === 0 ? (
                <p className="text-sm text-muted-foreground">Personne n&apos;est encore invité sur ce chantier.</p>
              ) : (
                <ul className="flex flex-col gap-2 text-sm">
                  {participants.map((p) => (
                    <li key={p.compteId} className="flex justify-between gap-3">
                      <span className="min-w-0 truncate">{p.nom}</span>
                      <span className="shrink-0 text-muted-foreground">{p.qualite}</span>
                    </li>
                  ))}
                </ul>
              )}
            </Section>
          )}
        </aside>
      </div>
    </div>
  );
}
