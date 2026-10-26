import type { Metadata } from "next";
import { CheckCheck } from "lucide-react";
import Link from "next/link";
import { Suspense } from "react";
import { texteATraiter } from "@/components/a-traiter";
import { Reticule } from "@/components/cote";
import { Ouverture } from "@/components/ouverture";
import { PageGlissante } from "@/components/transitions";
import { Skeleton } from "@/components/ui/skeleton";
import { peutCreerChantier, voitLInterne } from "@/lib/acces";
import { LIBELLE_STATUT } from "@/lib/chantier-forme";
import { donneesCote } from "@/lib/cote";
import { appelantObligatoire, type Appelant } from "@/lib/session";
import { lireTableauDeBord } from "@/lib/tableau-de-bord";
import { lienAViser, Messages, Titre, TuileMeteo } from "./accueil-blocs";
import { LIBELLE_PROPOSITION } from "@/lib/assistant-regles";
import { propositionsEnAttente } from "@/lib/operations/propositions";
import { RechercheAccueil } from "./recherche-accueil";
import { TuileAttente } from "./attentes";
import { BentoTelephone } from "./bento";
import { Carte, type ChantierTerrain } from "./terrain";

export const metadata: Metadata = { title: "Accueil" };

export const dynamic = "force-dynamic";

const PUCE = "flex h-10 shrink-0 items-center gap-2 rounded-full border border-input bg-card px-4 text-sm font-medium transition-colors hover:border-foreground active:scale-[0.97]";

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
    // Sur ordinateur, le bonjour et la date tiennent sur une ligne : la bande reste compacte.
    <div className="flex flex-col gap-2 md:flex-row md:items-baseline md:justify-between">
      <h1 className="font-display text-[2.4rem] leading-[0.95] font-extrabold tracking-tight md:order-1 md:text-4xl">Bonjour {qui.nom.split(" ")[0]}</h1>
      <p className="annotation text-muted-foreground first-letter:uppercase md:order-2">{jourLong(aujourdhui)}</p>
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

  // Les chantiers qui attendent un geste d'abord : ce sont eux qu'on veut atteindre vite.
  const terrain: ChantierTerrain[] = (t.actifs.length ? t.actifs : t.chantiers)
    .map((c) => ({
      id: c.id,
      nom: c.nom,
      ville: c.ville,
      client: c.client,
      etape: LIBELLE_STATUT[c.statut],
      enChantier: c.statut === "en_cours" || c.statut === "reception",
      aPhoto: c.aPhoto,
      aViser: texteATraiter(c.aTraiter),
      lien: lienAViser(c.id, c.aTraiter),
      cote: donneesCote(c.debutPrevu, c.finPrevue, t.aujourdhui, t.avancement.get(c.id)),
    }))
    .sort((a, b) => Number(Boolean(b.aViser)) - Number(Boolean(a.aViser)));
  const titreTerrain = t.actifs.length ? "Le terrain" : "Mes chantiers";
  // Les propositions de l'assistant en attente ; si leur lecture échoue, l'accueil s'affiche sans elles.
  const propositions = questions ? await propositionsEnAttente(qui).catch(() => []) : [];
  const aValider = propositions.length;

  // Les accès rapides, sur la ligne du champ (ordinateur) : ce qui attend sur le terrain
  // (« à viser ») et ce que l'assistant a préparé (« à valider »). Le téléphone a son bento.
  const acces = (
    <nav aria-label="Accès rapides" className="hidden shrink-0 gap-2 md:flex">
      {t.chiffres && (
        <Link href="/chantiers?statut=a_traiter" className={PUCE}>
          <Reticule className="size-4" />
          {t.aTraiter.length} à viser
        </Link>
      )}
      {questions && (
        <Link href="/a-valider" className={PUCE}>
          <CheckCheck className="size-4" aria-hidden />
          {aValider} à valider
        </Link>
      )}
    </nav>
  );

  return (
    <RechercheAccueil entete={entete} chantiers={cherchables} questions={questions} acces={acces}>
      <BentoTelephone t={t} terrain={terrain} aValider={aValider} equipe={questions} creer={peutCreerChantier(qui.role)} />

      {/* Ordinateur : le ciel (1/4) et les derniers messages (1/4) à gauche, les chantiers en
          cours (2/4) à droite ; la suite des chantiers sur une deuxième ligne, pleine largeur.
          Tablette : le ciel et les messages côte à côte, puis les chantiers. */}
      {/* Ordinateur. Première ligne, l'accès rapide : le ciel (1/4), les derniers messages (1/4),
          ce qui attend (2/4 : à viser, à valider). Deuxième ligne : les chantiers en cours.
          Tablette : deux colonnes. */}
      {/* Ordinateur : la météo sur une ligne, comme sur téléphone ; puis deux colonnes, ce qui
          attend (à viser, à valider) et les derniers messages ; puis les chantiers en cours. */}
      <div className="hidden gap-x-5 gap-y-8 md:grid md:grid-cols-2">
        <TuileMeteo t={t} className="apparait md:col-span-2" />

        <section aria-labelledby="titre-attente" className="flex min-w-0 flex-col gap-4">
          <Titre id="titre-attente">Ce qui attend</Titre>
          <div className="grid flex-1 grid-cols-2 gap-5">
            <TuileAttente
              titre="À viser"
              n={t.aTraiter.length}
              icone="viser"
              lignes={t.aTraiter.map((c) => ({ id: c.id, href: lienAViser(c.id, c.aTraiter), titre: c.nom, detail: texteATraiter(c.aTraiter) ?? "" }))}
              tout={{ href: "/chantiers?statut=a_traiter", texte: "Tous les chantiers à viser" }}
              vide="Rien à viser : aucun signalement, aucune réserve, aucun retard."
            />
            {questions && (
              <TuileAttente
                titre="À valider"
                n={aValider}
                icone="valider"
                lignes={propositions.map((p) => ({ id: p.id, href: "/a-valider", titre: LIBELLE_PROPOSITION[p.type] ?? p.type, detail: p.chantier }))}
                tout={{ href: "/a-valider", texte: "Toutes les propositions" }}
                vide="L'assistant n'attend aucune validation."
              />
            )}
          </div>
        </section>

        <section className="flex min-w-0 flex-col">
          <Messages t={t} />
        </section>

        <section aria-labelledby="titre-terrain" className="flex min-w-0 flex-col gap-4 md:col-span-2">
          <Titre id="titre-terrain" lien={{ href: "/chantiers", texte: `Tous (${terrain.length})`, label: `Voir les ${terrain.length} chantiers` }}>
            {titreTerrain}
          </Titre>
          <ul className="grid grid-cols-2 gap-5 lg:grid-cols-4">
            {terrain.slice(0, 8).map((c, i) => (
              <li key={c.id} className="flex">
                <Carte c={c} rang={i + 2} className="apparait h-[17rem] flex-1" />
              </li>
            ))}
          </ul>
        </section>
      </div>
    </RechercheAccueil>
  );
}
