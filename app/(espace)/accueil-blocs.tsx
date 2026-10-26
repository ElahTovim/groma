import { Cloud, CloudFog, CloudLightning, CloudRain, CloudSun, Snowflake, Sun } from "lucide-react";
import Link from "next/link";
import { CielAnime } from "@/components/ciel-anime";
import { PauseCiel } from "@/components/pause-ciel";
import { VERS_FICHE } from "@/components/transitions";
import { ambiance } from "@/lib/ambiance";
import { LIBELLE_TYPE } from "@/lib/libelles";
import type { TableauDeBord } from "@/lib/tableau-de-bord";
import { cn } from "@/lib/utils";

// Les blocs de l'accueil : le ciel et les derniers messages.

const PARIS = "Europe/Paris";

function jourCourt(iso: string) {
  return new Intl.DateTimeFormat("fr-FR", { weekday: "short", day: "numeric", timeZone: "UTC" }).format(new Date(`${iso}T00:00:00Z`));
}

function quand(iso: string) {
  return new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", timeZone: PARIS }).format(new Date(iso));
}

export function Titre({ children, lien, decor = false, id }: { children: React.ReactNode; lien?: { href: string; texte: string; label?: string }; decor?: boolean; id?: string }) {
  // `decor` : simple étiquette visuelle, quand le bloc qui suit porte déjà son propre titre.
  const Balise = decor ? "p" : "h2";
  return (
    <div className="flex items-baseline justify-between gap-3 border-b border-foreground pb-2.5">
      <Balise id={id} className="annotation font-semibold" aria-hidden={decor || undefined}>
        {children}
      </Balise>
      {lien && (
        <Link href={lien.href} aria-label={lien.label} className="annotation underline underline-offset-4">
          {lien.texte}
        </Link>
      )}
    </div>
  );
}

// Une ligne « À viser » mène droit à ce qui attend : un signalement à qualifier ou une
// réserve ouverte ouvre la fiche sur l'onglet Signalements ; sinon la fiche, sur ses lots.
export function lienAViser(id: string, a: { aQualifier: number; reservesOuvertes: number } | null) {
  return a && a.aQualifier + a.reservesOuvertes > 0 ? `/chantiers/${id}?onglet=signalements` : `/chantiers/${id}`;
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
  // Le texte secondaire garde toute sa couleur : la lisibilité est calculée pour elle (lib/ambiance.ts).
  const doux = "font-medium";

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
        <div className="flex items-start gap-2">
          <PauseCiel sombre={a.texteSombre} />
          <IconeCiel ciel={auj.ciel} className="size-14 shrink-0" trait={1.25} />
        </div>
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
              <li key={j.date} className={cn("flex flex-col gap-2 rounded-2xl p-3 backdrop-blur-md", alerte ? "bg-black/75 text-white" : a.texteSombre ? "bg-white/35" : "bg-black/20")}>
                <div className="flex items-center justify-between gap-2">
                  <span className="font-semibold whitespace-nowrap capitalize">{jourCourt(j.date)}</span>
                  <IconeCiel ciel={j.ciel} className="size-6" trait={1.5} />
                </div>
                <span className="text-2xl font-bold tracking-tight tabular-nums">
                  {j.max}° <span className="text-base font-medium">/ {j.min}°</span>
                </span>
                <span className={cn("truncate text-sm", alerte ? "font-semibold" : "first-letter:uppercase")}>{alerte ? j.alertes.join(", ") : j.ciel}</span>
              </li>
            );
          })}
        </ul>
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
          {t.messages.slice(0, 4).map((m) => (
            <li key={m.id} className="border-b border-foreground/10">
              <Link href={`/chantiers/${m.chantierId}#fil-${m.id}`} transitionTypes={VERS_FICHE} className="flex flex-col gap-1 py-3.5 transition-colors hover:bg-foreground/[0.03]">
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

// Le ciel en une ligne (bento du téléphone), de la hauteur de la barre de recherche :
// l'icône, la température, le temps, le minimum, et l'alerte du lendemain s'il y en a une ;
// sur ordinateur, en plus : le vent, la pluie, le temps de demain, les chantiers concernés.
// Le fond garde la couleur du ciel et sa lisibilité calculée ; pas d'animation à cette taille.
export function TuileMeteo({ t, className }: { t: TableauDeBord; className?: string }) {
  const jours = t.meteo.jours;
  if (!jours || jours.length === 0) {
    return (
      <section aria-label={`Météo à ${t.meteo.lieu}`} className={cn("flex h-14 items-center gap-3 rounded-2xl bg-card px-4 text-sm", className)}>
        <Cloud className="size-5 shrink-0 text-muted-foreground" strokeWidth={1.4} aria-hidden />
        Météo indisponible pour le moment.
      </section>
    );
  }
  const [auj, demain] = jours;
  const a = ambiance({ description: auj.ciel, heure: heureParis(), alertes: auj.alertes });
  const alerteDemain = demain?.alertes.length ? `${demain.alertes.join(", ")} demain` : null;
  return (
    <section
      aria-label={`Météo à ${t.meteo.lieu}`}
      className={cn("flex h-14 min-w-0 items-center gap-3 rounded-2xl px-4", a.texteSombre ? "text-black" : "text-white", className)}
      style={{ background: a.fond }}
    >
      <IconeCiel ciel={auj.ciel} className="size-6 shrink-0" trait={1.5} />
      <p className="font-display text-2xl leading-none font-extrabold tabular-nums">{auj.max}°</p>
      <p className="min-w-0 flex-1 truncate text-sm font-medium">
        <span className="first-letter:uppercase">{auj.ciel}</span>
        <span className="tabular-nums"> · mini {auj.min}°</span>
        {/* Sur ordinateur, la ligne a la place de dire le reste. */}
        <span className="hidden tabular-nums md:inline">
          {" "}
          · vent {auj.ventKmh} km/h · pluie {auj.pluieMm} mm
        </span>
      </p>
      {demain && (
        <p className="hidden shrink-0 items-center gap-2 text-sm font-medium md:flex">
          <span className="opacity-90">Demain</span>
          <IconeCiel ciel={demain.ciel} className="size-5" trait={1.5} />
          <span className="tabular-nums">
            {demain.max}° / {demain.min}°
          </span>
        </p>
      )}
      {alerteDemain && (
        <p className="shrink-0 rounded-full bg-black/80 px-2.5 py-1 text-xs font-semibold text-white">
          {alerteDemain}
          {t.actifs.length > 0 && (
            <span className="hidden md:inline">
              {" "}
              · {t.actifs.length} chantier{t.actifs.length > 1 ? "s" : ""} concerné{t.actifs.length > 1 ? "s" : ""}
            </span>
          )}
        </p>
      )}
    </section>
  );
}
