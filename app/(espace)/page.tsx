import { Cloud, CloudFog, CloudLightning, CloudRain, CloudSun, Snowflake, Sun } from "lucide-react";
import Link from "next/link";
import { Suspense } from "react";
import { BadgeStatut } from "@/components/badge-statut";
import { ResumeATraiter } from "@/components/a-traiter";
import { buttonVariants } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { CielAnime } from "@/components/ciel-anime";
import { Vignette } from "@/components/vignette";
import { peutCreerChantier } from "@/lib/acces";
import { ambiance } from "@/lib/ambiance";
import { euros } from "@/lib/format";
import { LIBELLE_TYPE } from "@/lib/libelles";
import { appelantObligatoire, type Appelant } from "@/lib/session";
import { lireTableauDeBord, REGLAGES_TABLEAU, type TableauDeBord } from "@/lib/tableau-de-bord";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

const PARIS = "Europe/Paris";

function jourLong(iso: string) {
  return new Intl.DateTimeFormat("fr-FR", { weekday: "long", day: "numeric", month: "long", timeZone: "UTC" }).format(new Date(`${iso}T00:00:00Z`));
}

function jourCourt(iso: string) {
  return new Intl.DateTimeFormat("fr-FR", { weekday: "short", day: "numeric", timeZone: "UTC" }).format(new Date(`${iso}T00:00:00Z`));
}

function quand(iso: string) {
  return new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", timeZone: PARIS }).format(new Date(iso));
}

// L'accueil : un tableau de bord plutôt qu'une liste. Le bonjour s'affiche tout de
// suite ; le reste arrive dès que les lectures (et la météo) ont répondu.
export default async function Accueil() {
  const qui = await appelantObligatoire();
  const aujourdhui = new Intl.DateTimeFormat("fr-CA", { timeZone: PARIS }).format(new Date());
  const prenom = qui.nom.split(" ")[0];

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <h1 className="text-[2.5rem] leading-[0.95] font-bold tracking-tighter md:text-6xl">
          Bonjour {prenom}
          <span className="block text-muted-foreground/70 first-letter:uppercase">{jourLong(aujourdhui)}</span>
        </h1>
        {peutCreerChantier(qui.role) && (
          <Link href="/chantiers/nouveau" className={buttonVariants({ size: "lg" })}>
            + Nouveau chantier
          </Link>
        )}
      </div>
      <Suspense fallback={<Chargement />}>
        <Contenu qui={qui} />
      </Suspense>
    </div>
  );
}

function Chargement() {
  return (
    <div className="grid gap-4 md:grid-cols-3" aria-busy="true" aria-label="Chargement du tableau de bord">
      <Skeleton className="h-56 rounded-3xl md:col-span-2" />
      <Skeleton className="h-56 rounded-3xl" />
      <Skeleton className="h-72 rounded-3xl md:col-span-3" />
    </div>
  );
}

async function Contenu({ qui }: { qui: Appelant }) {
  const t = await lireTableauDeBord(qui);

  if (t.chantiers.length === 0) {
    return (
      <div className="flex flex-col items-center gap-3 rounded-3xl bg-card p-10 text-center">
        <p className="text-xl font-bold tracking-tight">Aucun chantier pour l&apos;instant.</p>
        <p className="text-muted-foreground">
          {peutCreerChantier(qui.role)
            ? "Créez le premier, ou rejouez le jeu de données depuis les réglages."
            : "Vous verrez ici les chantiers sur lesquels on vous a invité."}
        </p>
      </div>
    );
  }

  return (
    <>
      <div className="grid gap-4 md:grid-cols-3">
        {t.chiffres && <ATraiter t={t} />}
        <Meteo t={t} className={t.chiffres ? "" : "md:col-span-3"} />
      </div>
      {t.chiffres && <Chiffres c={t.chiffres} />}
      <Carrousel t={t} />
      <div className="grid gap-4 md:grid-cols-2">
        {t.chiffres && <Semaine t={t} />}
        <Messages t={t} className={t.chiffres ? "" : "md:col-span-2"} />
      </div>
    </>
  );
}

function Titre({ children, lien }: { children: React.ReactNode; lien?: { href: string; texte: string } }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <h2 className="text-xl font-bold tracking-tight">{children}</h2>
      {lien && (
        <Link href={lien.href} className="flex min-h-11 items-center text-sm font-semibold underline-offset-4 hover:underline">
          {lien.texte} →
        </Link>
      )}
    </div>
  );
}

// En aplat noir : c'est la première chose à voir le matin.
function ATraiter({ t }: { t: TableauDeBord }) {
  const total = t.aTraiter.length;
  return (
    <section className="flex flex-col gap-5 rounded-3xl bg-foreground p-6 text-background md:col-span-2">
      <div className="flex items-end justify-between gap-4">
        <h2 className="text-xl font-bold tracking-tight">À traiter</h2>
        <span className="text-6xl leading-none font-bold tracking-tighter tabular-nums">{total}</span>
      </div>
      {total === 0 ? (
        <p className="text-background/80">Rien en attente : aucun retard, aucun signalement à qualifier, aucune réserve ouverte.</p>
      ) : (
        <ul className="flex flex-col divide-y divide-background/15">
          {t.aTraiter.slice(0, 5).map((c) => (
            <li key={c.id}>
              <Link href={`/chantiers/${c.id}`} className="flex min-h-14 flex-wrap items-center justify-between gap-x-4 gap-y-1 py-2 hover:opacity-80">
                <span className="min-w-0 truncate text-lg font-semibold">{c.nom}</span>
                <ResumeATraiter a={c.aTraiter} compact />
              </Link>
            </li>
          ))}
        </ul>
      )}
      {total > 5 && (
        <Link href="/chantiers?statut=a_traiter" className="text-sm font-semibold underline underline-offset-4">
          Voir les {total} chantiers à traiter →
        </Link>
      )}
    </section>
  );
}

// L'icône d'un ciel décrit par OpenWeatherMap (en français), en simple trait noir.
function IconeCiel({ ciel, className, trait }: { ciel: string; className: string; trait: number }) {
  const c = ciel.toLowerCase();
  const p = { className, strokeWidth: trait, "aria-hidden": true } as const;
  if (c.includes("orage")) return <CloudLightning {...p} />;
  if (c.includes("neige")) return <Snowflake {...p} />;
  if (c.includes("pluie") || c.includes("averse") || c.includes("bruine")) return <CloudRain {...p} />;
  if (c.includes("brouillard") || c.includes("brume")) return <CloudFog {...p} />;
  if (c.includes("dégagé")) return <Sun {...p} />;
  if (c.includes("peu nuageux") || c.includes("partiellement") || c.includes("éclaircie")) return <CloudSun {...p} />;
  return <Cloud {...p} />;
}

function heureParis() {
  return Number(new Intl.DateTimeFormat("fr-FR", { hour: "numeric", hourCycle: "h23", timeZone: PARIS }).format(new Date()));
}

// Une seule météo, celle de Paris, pour tous les chantiers : une fenêtre sur le ciel.
// Le fond suit l'heure et le temps (lever, journée, soir, nuit ; pluie, neige…),
// des particules l'animent. Le jour en très grand, les deux suivants en petit.
function Meteo({ t, className }: { t: TableauDeBord; className?: string }) {
  const jours = t.meteo.jours;
  if (!jours || jours.length === 0) {
    return (
      <section className={cn("flex flex-col justify-between gap-6 rounded-3xl bg-card p-6", className)}>
        <h2 className="text-sm font-medium text-muted-foreground">Météo · {t.meteo.lieu}</h2>
        <div className="flex flex-col gap-2">
          <Cloud className="size-12 text-muted-foreground" strokeWidth={1.25} aria-hidden />
          <p className="text-lg font-semibold">Météo indisponible pour le moment.</p>
          <p className="text-muted-foreground">Le reste du tableau de bord fonctionne.</p>
        </div>
      </section>
    );
  }
  const [auj, ...suivants] = jours;
  const a = ambiance({ description: auj.ciel, heure: heureParis(), alertes: auj.alertes });
  const concernes = t.actifs.length;
  const doux = a.texteSombre ? "text-black/60" : "text-white/75";

  return (
    <section
      className={cn("relative isolate flex min-h-80 flex-col gap-5 overflow-hidden rounded-3xl p-6", a.texteSombre ? "text-black" : "text-white", className)}
      style={{ background: a.fond }}
      aria-label={`Météo à ${t.meteo.lieu}`}
    >
      <CielAnime particules={a.particules} sombre={a.texteSombre} />
      <div className="relative flex items-start justify-between gap-3">
        <h2 className={cn("text-sm font-medium", doux)}>
          {t.meteo.lieu} · <span className="capitalize">{jourCourt(auj.date)}</span>
        </h2>
        <IconeCiel ciel={auj.ciel} className="size-14 shrink-0" trait={1.25} />
      </div>
      <div className="relative flex flex-col gap-1">
        <p className="text-7xl leading-none font-bold tracking-tighter tabular-nums md:text-8xl">{auj.max}°</p>
        <p className="text-lg font-semibold first-letter:uppercase">{auj.ciel}</p>
        <p className={cn("text-sm tabular-nums", doux)}>
          Mini {auj.min}° · pluie {auj.pluieMm} mm · vent {auj.ventKmh} km/h
        </p>
      </div>
      {auj.alertes.length > 0 && concernes > 0 && (
        <p className="relative flex w-fit items-center gap-2 rounded-full bg-black/80 py-1.5 pr-4 pl-1.5 text-sm font-semibold text-white backdrop-blur">
          <span aria-hidden className="flex size-6 items-center justify-center rounded-full bg-white text-xs font-bold text-black">
            !
          </span>
          {auj.alertes.join(", ")} : {concernes} chantier{concernes > 1 ? "s" : ""} concerné{concernes > 1 ? "s" : ""}
        </p>
      )}
      {suivants.length > 0 && (
        <ul className="relative mt-auto grid grid-cols-2 gap-2">
          {suivants.map((j) => {
            const alerte = j.alertes.length > 0;
            return (
              <li
                key={j.date}
                className={cn(
                  "flex flex-col gap-2 rounded-2xl p-3 backdrop-blur-md",
                  alerte ? "bg-black/75 text-white" : a.texteSombre ? "bg-black/5" : "bg-white/15",
                )}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="font-semibold capitalize">{jourCourt(j.date)}</span>
                  <IconeCiel ciel={j.ciel} className="size-6" trait={1.5} />
                </div>
                <span className="text-2xl font-bold tracking-tight tabular-nums">
                  {j.max}° <span className="text-base font-medium opacity-70">/ {j.min}°</span>
                </span>
                <span className={cn("truncate text-sm", alerte ? "font-semibold" : "opacity-80 first-letter:uppercase")}>{alerte ? j.alertes.join(", ") : j.ciel}</span>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

function Chiffres({ c }: { c: NonNullable<TableauDeBord["chiffres"]> }) {
  const cartes = [
    { titre: "Chantiers en cours", valeur: String(c.enCours) },
    { titre: "Montant HT en cours", valeur: euros(String(c.montantEnCours)) },
    { titre: "Devis en attente", valeur: String(c.devis) },
    { titre: "Montant des devis", valeur: euros(String(c.montantDevis)) },
  ];
  return (
    <ul className="grid grid-cols-2 gap-3 md:grid-cols-4">
      {cartes.map((k) => (
        <li key={k.titre} className="flex min-w-0 flex-col justify-between gap-6 rounded-3xl bg-card p-5">
          <span className="text-sm font-medium text-muted-foreground">{k.titre}</span>
          <span className="truncate text-3xl leading-none font-bold tracking-tighter tabular-nums md:text-5xl">{k.valeur}</span>
        </li>
      ))}
    </ul>
  );
}

// Les chantiers actifs en grandes cartes photo qu'on fait glisser.
function Carrousel({ t }: { t: TableauDeBord }) {
  const cartes = t.actifs.length ? t.actifs : t.chantiers;
  return (
    <section className="flex flex-col gap-4">
      <Titre lien={{ href: "/chantiers", texte: "Tous les chantiers" }}>{t.actifs.length ? "Chantiers en cours" : "Mes chantiers"}</Titre>
      <ul className="-mx-4 flex snap-x snap-mandatory gap-4 overflow-x-auto px-4 pb-2 [scrollbar-width:none]" aria-label="Chantiers">
        {cartes.map((c) => {
          const a = t.avancement.get(c.id);
          return (
            <li key={c.id} className="w-[82%] shrink-0 snap-start sm:w-80">
              <Link href={`/chantiers/${c.id}`} className="flex h-full flex-col gap-4 rounded-3xl bg-card p-3 pb-5 transition-shadow hover:shadow-lg">
                <div className="relative">
                  <Vignette chantierId={c.id} aPhoto={c.aPhoto} alt="" className="aspect-[4/3] w-full rounded-2xl" />
                  <div className="absolute top-3 left-3">
                    <BadgeStatut statut={c.statut} />
                  </div>
                </div>
                <div className="flex flex-1 flex-col gap-3 px-2">
                  <div>
                    <p className="line-clamp-2 text-2xl leading-tight font-bold tracking-tight">{c.nom}</p>
                    <p className="truncate text-muted-foreground">
                      {c.ville} · {c.client}
                    </p>
                  </div>
                  {a && a.total > 0 && (
                    <div className="mt-auto flex flex-col gap-1.5">
                      <div className="h-2 overflow-hidden rounded-full bg-foreground/10" aria-hidden>
                        <div className="h-full rounded-full bg-foreground" style={{ width: `${(a.finis / a.total) * 100}%` }} />
                      </div>
                      <span className="text-sm text-muted-foreground tabular-nums">
                        {a.finis} lot{a.finis > 1 ? "s" : ""} fini{a.finis > 1 ? "s" : ""} sur {a.total}
                      </span>
                    </div>
                  )}
                  {c.aTraiter && c.aTraiter.aQualifier + c.aTraiter.reservesOuvertes + c.aTraiter.lotsEnRetard > 0 && (
                    <div className="rounded-2xl bg-foreground px-3 py-2 text-background">
                      <ResumeATraiter a={c.aTraiter} compact />
                    </div>
                  )}
                </div>
              </Link>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

function Semaine({ t }: { t: TableauDeBord }) {
  const parJour = new Map<string, typeof t.echeances>();
  for (const e of t.echeances) parJour.set(e.date, [...(parJour.get(e.date) ?? []), e]);
  return (
    <section className="flex flex-col gap-4 rounded-3xl bg-card p-6">
      <Titre>Cette semaine</Titre>
      {parJour.size === 0 ? (
        <p className="text-muted-foreground">Aucune livraison ni fin de lot prévue dans les {REGLAGES_TABLEAU.horizonJours} prochains jours.</p>
      ) : (
        <ol className="flex flex-col gap-4">
          {[...parJour.entries()].map(([date, es]) => (
            <li key={date} className="grid grid-cols-[4.5rem_1fr] gap-3">
              <span className={cn("pt-0.5 font-bold capitalize", date === t.aujourdhui && "underline underline-offset-4")}>
                {date === t.aujourdhui ? "Auj." : jourCourt(date)}
              </span>
              <ul className="flex flex-col gap-1.5">
                {es.map((e) => (
                  <li key={`${e.chantierId}-${e.lot}-${e.quoi}`}>
                    <Link href={`/chantiers/${e.chantierId}`} className="flex flex-col hover:underline">
                      <span className="font-semibold">
                        {e.lot} : {e.quoi === "livraison" ? "livraison" : "fin prévue"}
                      </span>
                      <span className="truncate text-sm text-muted-foreground">{e.chantier}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}

function Messages({ t, className }: { t: TableauDeBord; className?: string }) {
  return (
    <section className={cn("flex flex-col gap-4 rounded-3xl bg-card p-6", className)}>
      <Titre>Derniers messages</Titre>
      {t.messages.length === 0 ? (
        <p className="text-muted-foreground">Aucun message dans les fils pour l&apos;instant.</p>
      ) : (
        <ul className="flex flex-col gap-3">
          {t.messages.map((m) => (
            <li key={m.id}>
              <Link href={`/chantiers/${m.chantierId}#fil-${m.id}`} className="flex flex-col gap-1 rounded-2xl bg-muted p-3 hover:bg-muted/70">
                <span className="flex flex-wrap items-center gap-x-2 text-sm text-muted-foreground">
                  <span className="font-semibold text-foreground">{LIBELLE_TYPE[m.type]}</span>
                  {m.auteur} · {quand(m.creeLe)}
                </span>
                <span className="line-clamp-2">{m.texte}</span>
                <span className="truncate text-sm text-muted-foreground">{m.chantier}</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
