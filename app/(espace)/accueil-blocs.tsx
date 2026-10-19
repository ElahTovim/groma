import { ChevronRight, Cloud, CloudFog, CloudLightning, CloudRain, CloudSun, Snowflake, Sun } from "lucide-react";
import Link from "next/link";
import { texteATraiter } from "@/components/a-traiter";
import { CielAnime } from "@/components/ciel-anime";
import { Reticule } from "@/components/cote";
import { ambiance } from "@/lib/ambiance";
import { LIBELLE_TYPE } from "@/lib/libelles";
import { REGLAGES_TABLEAU, type TableauDeBord } from "@/lib/tableau-de-bord";
import { cn } from "@/lib/utils";

// Les blocs de l'accueil : « À viser », le ciel, la semaine, les derniers messages.

const PARIS = "Europe/Paris";

function jourCourt(iso: string) {
  return new Intl.DateTimeFormat("fr-FR", { weekday: "short", day: "numeric", timeZone: "UTC" }).format(new Date(`${iso}T00:00:00Z`));
}

function quand(iso: string) {
  return new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", timeZone: PARIS }).format(new Date(iso));
}

export function Titre({ children, lien }: { children: React.ReactNode; lien?: { href: string; texte: string } }) {
  return (
    <div className="flex items-baseline justify-between gap-3 border-b border-foreground pb-2.5">
      <h2 className="annotation font-semibold">{children}</h2>
      {lien && (
        <Link href={lien.href} className="annotation underline underline-offset-4">
          {lien.texte}
        </Link>
      )}
    </div>
  );
}

// « À viser » : chaque chantier qui attend un geste, marqué du réticule de la groma.
// Une ligne calme quand tout est à jour.
export function AViser({ t }: { t: TableauDeBord }) {
  const total = t.aTraiter.length;
  if (total === 0) {
    return (
      <p className="apparait flex min-h-14 items-center gap-3 border-y border-foreground/15 font-semibold">
        <Reticule className="size-6 shrink-0" plein={false} />
        Rien à viser aujourd&apos;hui
        <span className="hidden font-normal text-muted-foreground md:inline">· aucun retard, aucun signalement, aucune réserve</span>
      </p>
    );
  }
  return (
    <section className="apparait flex flex-col" aria-label="À viser">
      <Titre lien={total > 5 ? { href: "/chantiers?statut=a_traiter", texte: `Les ${total}` } : undefined}>À viser · {total}</Titre>
      <ul>
        {t.aTraiter.slice(0, 5).map((c) => (
          <li key={c.id} className="border-b border-foreground/10">
            <Link href={`/chantiers/${c.id}`} className="flex min-h-[4.25rem] items-center gap-3.5 transition-colors hover:bg-foreground/[0.03] active:scale-[0.99] md:px-2">
              <Reticule className="size-7 shrink-0" />
              <span className="flex min-w-0 flex-1 flex-col gap-0.5 md:flex-row md:items-baseline md:gap-6">
                <span className="truncate font-semibold md:w-64 md:shrink-0">{c.nom}</span>
                <span className="truncate text-sm text-muted-foreground md:text-base">{texteATraiter(c.aTraiter)}</span>
              </span>
              <ChevronRight className="size-4 shrink-0" aria-hidden />
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}

// L'icône d'un ciel décrit par OpenWeatherMap (en français), en simple trait.
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
export function Meteo({ t, className }: { t: TableauDeBord; className?: string }) {
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
        <p className="font-display text-7xl leading-none font-extrabold tracking-tight tabular-nums">{auj.max}°</p>
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
              <li key={j.date} className={cn("flex flex-col gap-2 rounded-2xl p-3 backdrop-blur-md", alerte ? "bg-black/75 text-white" : a.texteSombre ? "bg-black/5" : "bg-white/15")}>
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

// La semaine en ligne de temps : un point par jour, plein pour aujourd'hui.
export function Semaine({ t }: { t: TableauDeBord }) {
  const parJour = new Map<string, typeof t.echeances>();
  for (const e of t.echeances) parJour.set(e.date, [...(parJour.get(e.date) ?? []), e]);
  return (
    <section className="apparait flex flex-col gap-4 [--rang:4]">
      <Titre>La semaine</Titre>
      {parJour.size === 0 ? (
        <p className="text-muted-foreground">Aucune livraison ni fin de lot prévue dans les {REGLAGES_TABLEAU.horizonJours} prochains jours.</p>
      ) : (
        <ol className="relative flex flex-col gap-4 before:absolute before:top-2 before:bottom-2 before:left-[4px] before:w-px before:bg-foreground/25">
          {[...parJour.entries()].map(([date, es]) => {
            const auj = date === t.aujourdhui;
            return (
              <li key={date} className="relative grid grid-cols-[9px_4rem_minmax(0,1fr)] items-baseline gap-3">
                <span aria-hidden className={cn("size-[9px] translate-y-px rounded-full ring-[1.5px] ring-foreground ring-inset", auj ? "bg-foreground" : "bg-background")} />
                <span className={cn("annotation", auj ? "font-semibold" : "text-muted-foreground")}>{auj ? "Auj." : jourCourt(date)}</span>
                <ul className="flex flex-col gap-2">
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
            );
          })}
        </ol>
      )}
    </section>
  );
}

export function Messages({ t }: { t: TableauDeBord }) {
  return (
    <section className="apparait flex flex-col [--rang:5]">
      <Titre>Derniers messages</Titre>
      {t.messages.length === 0 ? (
        <p className="pt-4 text-muted-foreground">Aucun message dans les fils pour l&apos;instant.</p>
      ) : (
        <ul>
          {t.messages.map((m) => (
            <li key={m.id} className="border-b border-foreground/10">
              <Link href={`/chantiers/${m.chantierId}#fil-${m.id}`} className="flex flex-col gap-1 py-3.5 transition-colors hover:bg-foreground/[0.03]">
                <span className="annotation truncate text-muted-foreground">
                  {LIBELLE_TYPE[m.type]} · {m.auteur} · {quand(m.creeLe)}
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
