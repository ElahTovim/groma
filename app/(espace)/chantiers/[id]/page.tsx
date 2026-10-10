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
import { aujourdhuiParis, etapeSuivante, verifierPassage } from "@/lib/regles";
import { appelantObligatoire } from "@/lib/session";
import { AnnonceCreation } from "./annonce-creation";
import { ATraiterFiche } from "./a-traiter";
import { EtapeChantier } from "./etape";
import { Fil } from "./fil";
import { FriseEtapes } from "./frise";
import { Inviter } from "./inviter";
import { Lots } from "./lots";
import { Meteo } from "./meteo";
import { SuiteFiche } from "./onglets";
import { PhotoChantier } from "./photo";

export const dynamic = "force-dynamic";

// L'ordre suit les maquettes (Figma, section 03) : l'en-tête et l'étape suivante,
// la frise des étapes, ce qui est à traiter, puis la météo, les lots et le fil.
// Sur téléphone, lots, fil et infos passent en onglets.
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
  const aujourdhui = aujourdhuiParis();

  const onglets = [
    ...(interne ? [{ cle: "lots", titre: "Lots", nombre: lots.length, contenu: <Lots chantierId={chantier.id} lots={lots} participants={participants} modifiable={!termine} aujourdhui={aujourdhui} /> }] : []),
    { cle: "fil", titre: "Fil", nombre: elements.length, contenu: <Fil chantierId={chantier.id} interne={interne} elements={elements} participants={participants} lots={lots} /> },
  ];

  return (
    // La marge du bas laisse la place au bouton fixé sous le pouce, sur téléphone.
    <div className="flex flex-col gap-6 pb-36 md:pb-0">
      {cree && <AnnonceCreation />}
      <nav aria-label="Fil d'Ariane" className="-mt-2 flex items-center gap-2 text-sm md:mt-0">
        <Link href="/chantiers" className="flex min-h-12 items-center gap-1.5 font-semibold underline-offset-2 hover:underline md:min-h-0 md:font-normal md:underline">
          <span aria-hidden className="md:hidden">←</span> Chantiers
        </Link>
        <span aria-hidden className="hidden text-muted-foreground md:inline">/</span>
        <span className="hidden truncate text-muted-foreground md:inline">{chantier.nom}</span>
      </nav>

      {(chantier.aPhoto || (interne && !termine)) && (
        <PhotoChantier chantierId={chantier.id} aPhoto={chantier.aPhoto} nom={chantier.nom} modifiable={interne && !termine} />
      )}

      <header className="flex flex-col gap-5 md:flex-row md:items-start md:justify-between md:gap-10">
        <div className="flex min-w-0 flex-col gap-2">
          <p className="text-sm text-muted-foreground">
            <span className="whitespace-nowrap">{chantier.reference}</span>
            {interne && chantier.montantHt && <> · {euros(chantier.montantHt)} HT</>}
          </p>
          <h1 className="text-[1.75rem] leading-tight font-bold text-balance md:text-[2.125rem]">{chantier.nom}</h1>
          <p className="text-muted-foreground">
            {chantier.adresse}, {chantier.codePostal} {chantier.ville}
            {" · "}
            Client : {chantier.client}
            <span className="hidden md:inline">
              {chantier.debutPrevu && <> · Début : {dateCourte(chantier.debutPrevu)}</>}
              {chantier.finPrevue && <> · Fin prévue : {dateCourte(chantier.finPrevue)}</>}
            </span>
          </p>
          <div className="md:hidden">
            <BadgeStatut statut={chantier.statut} />
          </div>
        </div>
        {interne && !termine && (
          <div className="md:w-96 md:shrink-0">
            <EtapeChantier chantierId={chantier.id} statut={chantier.statut} debutPrevu={chantier.debutPrevu} blocages={blocages} />
          </div>
        )}
      </header>

      <FriseEtapes statut={chantier.statut} />
      {chantier.statut === "annule" && <BadgeStatut statut={chantier.statut} />}

      {interne && <ATraiterFiche lots={lots} elements={elements} aujourdhui={aujourdhui} />}

      <SuiteFiche
        meteo={
          <Suspense fallback={<Skeleton className="h-40" />}>
            <Meteo chantier={chantier} />
          </Suspense>
        }
        gauche={onglets}
        infos={{
          cle: "infos",
          titre: "Infos",
          contenu: (
            <div className="flex flex-col gap-6">
              <Section titre="Le chantier" className="md:hidden">
                <dl className="grid grid-cols-[auto_1fr] gap-x-6 gap-y-2">
                  <dt className="text-muted-foreground">Début prévu</dt>
                  <dd>{dateCourte(chantier.debutPrevu)}</dd>
                  <dt className="text-muted-foreground">Fin prévue</dt>
                  <dd>{dateCourte(chantier.finPrevue)}</dd>
                  {interne && (
                    <>
                      <dt className="text-muted-foreground">Montant HT</dt>
                      <dd>{euros(chantier.montantHt)}</dd>
                    </>
                  )}
                </dl>
              </Section>
              {interne && (
                <Section titre={`Participants (${participants.length})`}>
                  {participants.length === 0 ? (
                    <p className="text-sm text-muted-foreground">Personne n&apos;est encore invité sur ce chantier.</p>
                  ) : (
                    <ul className="flex flex-col">
                      {participants.map((p) => (
                        <li key={p.compteId} className="flex min-h-9 items-center justify-between gap-3">
                          <span className="min-w-0 truncate font-semibold">{p.nom}</span>
                          <span className="shrink-0 text-sm text-muted-foreground">{p.qualite}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                  {!termine && <Inviter chantierId={chantier.id} />}
                </Section>
              )}
            </div>
          ),
        }}
      />
    </div>
  );
}
