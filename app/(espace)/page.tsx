import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { texteATraiter } from "@/components/a-traiter";
import { Reticule } from "@/components/cote";
import { Ouverture } from "@/components/ouverture";
import { PageGlissante } from "@/components/transitions";
import { buttonVariants } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { peutCreerChantier, voitLInterne } from "@/lib/acces";
import { LIBELLE_STATUT } from "@/lib/chantier-forme";
import { donneesCote } from "@/lib/cote";
import { appelantObligatoire, type Appelant } from "@/lib/session";
import { lireTableauDeBord } from "@/lib/tableau-de-bord";
import { cn } from "@/lib/utils";
import { AViser, Messages, Meteo, Semaine, Titre } from "./accueil-blocs";
import { RechercheAccueil } from "./recherche-accueil";
import { Terrain } from "./terrain";

export const metadata: Metadata = { title: "Accueil" };

export const dynamic = "force-dynamic";

const PARIS = "Europe/Paris";

function jourLong(iso: string) {
  return new Intl.DateTimeFormat("fr-FR", { weekday: "long", day: "numeric", month: "long", timeZone: "UTC" }).format(new Date(`${iso}T00:00:00Z`));
}

// L'accueil, direction « Arpenteur » : en tête, le bonjour et un seul champ pour
// chercher un chantier ou poser une question ; puis ce qui attend un geste (« À viser »),
// le terrain en cartes ou en liste, et, à côté, le ciel, la semaine et les messages.
export default async function Accueil() {
  const qui = await appelantObligatoire();
  const aujourdhui = new Intl.DateTimeFormat("fr-CA", { timeZone: PARIS }).format(new Date());
  const entete = (
    <div className="flex flex-wrap items-end justify-between gap-4">
      <div className="flex flex-col gap-2">
        <p className="annotation text-muted-foreground first-letter:uppercase">{jourLong(aujourdhui)}</p>
        <h1 className="font-display text-[2.4rem] leading-[0.95] font-extrabold tracking-tight md:text-6xl">Bonjour {qui.nom.split(" ")[0]}</h1>
      </div>
      {peutCreerChantier(qui.role) && (
        <Link href="/chantiers/nouveau" className={cn(buttonVariants({ size: "lg" }), "hidden md:inline-flex")}>
          + Nouveau chantier
        </Link>
      )}
    </div>
  );

  return (
    <PageGlissante>
      <Ouverture />
      <div className="flex flex-col gap-8">
        <Suspense fallback={<Chargement entete={entete} />}>
          <Contenu qui={qui} entete={entete} />
        </Suspense>
      </div>
    </PageGlissante>
  );
}

function Chargement({ entete }: { entete: React.ReactNode }) {
  return (
    <>
      <div className="papier -mx-4 -mt-6 flex flex-col gap-4 border-b border-foreground/10 px-4 pt-7 pb-6 md:mx-0 md:mt-0 md:rounded-3xl md:border md:px-8 md:pt-10 md:pb-8">
        {entete}
        <Skeleton className="h-14 max-w-3xl rounded-2xl md:h-16" />
      </div>
      <p role="status" className="sr-only">
        Chargement du tableau de bord…
      </p>
      <div className="grid gap-8 md:grid-cols-[minmax(0,1fr)_20rem]" aria-hidden>
        <Skeleton className="h-96 rounded-3xl" />
        <Skeleton className="h-80 rounded-3xl" />
      </div>
    </>
  );
}

async function Contenu({ qui, entete }: { qui: Appelant; entete: React.ReactNode }) {
  const t = await lireTableauDeBord(qui);
  const questions = voitLInterne(qui.role);
  const cherchables = t.chantiers.map((c) => ({ id: c.id, nom: c.nom, ville: c.ville, client: c.client, reference: c.reference, etape: LIBELLE_STATUT[c.statut], aPhoto: c.aPhoto }));

  if (t.chantiers.length === 0) {
    return (
      <RechercheAccueil entete={entete} chantiers={cherchables} questions={questions}>
        <div className="flex flex-col items-center gap-3 rounded-3xl bg-card p-10 text-center">
          <Reticule className="size-10" plein={false} />
          <p className="text-xl font-bold tracking-tight">Aucun chantier pour l&apos;instant.</p>
          <p className="text-muted-foreground">
            {peutCreerChantier(qui.role) ? "Créez le premier, ou rejouez le jeu de données depuis les réglages." : "Vous verrez ici les chantiers sur lesquels on vous a invité."}
          </p>
        </div>
      </RechercheAccueil>
    );
  }

  const terrain = (t.actifs.length ? t.actifs : t.chantiers).map((c) => ({
    id: c.id,
    nom: c.nom,
    ville: c.ville,
    client: c.client,
    etape: LIBELLE_STATUT[c.statut],
    enChantier: c.statut === "en_cours" || c.statut === "reception",
    aPhoto: c.aPhoto,
    aViser: texteATraiter(c.aTraiter),
    cote: donneesCote(c.debutPrevu, c.finPrevue, t.aujourdhui, t.avancement.get(c.id)),
  }));

  return (
    <RechercheAccueil entete={entete} chantiers={cherchables} questions={questions}>
      <div className="grid gap-10 md:grid-cols-[minmax(0,1fr)_20rem] md:gap-x-12">
        <div className="flex min-w-0 flex-col gap-10">
          {t.chiffres && <AViser t={t} />}
          {/* Sur téléphone, le ciel vient entre « À viser » et le terrain. */}
          <Meteo t={t} className="apparait [--rang:2] md:hidden" />
          <Terrain titre={t.actifs.length ? "Le terrain" : "Mes chantiers"} chantiers={terrain} />
        </div>
        <aside className="flex min-w-0 flex-col gap-10">
          <section className="hidden flex-col gap-4 md:flex">
            <Titre decor>Le ciel</Titre>
            <Meteo t={t} className="apparait [--rang:2]" />
          </section>
          {t.chiffres && <Semaine t={t} />}
          <Messages t={t} />
        </aside>
      </div>
    </RechercheAccueil>
  );
}
