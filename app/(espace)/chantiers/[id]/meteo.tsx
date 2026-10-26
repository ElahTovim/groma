import { eq } from "drizzle-orm";
import { CielAnime } from "@/components/ciel-anime";
import { PauseCiel } from "@/components/pause-ciel";
import { Section } from "@/components/section";
import type { ChantierVu } from "@/lib/chantiers";
import { db } from "@/lib/db";
import { chantiers } from "@/lib/db/schema";
import { ambiance } from "@/lib/ambiance";
import { journal } from "@/lib/journal";
import { geolocaliser, previsions } from "@/lib/meteo";
import { aujourdhuiParis } from "@/lib/regles";
import { cn } from "@/lib/utils";

function jourCourt(iso: string) {
  return new Intl.DateTimeFormat("fr-FR", { weekday: "short", day: "numeric", timeZone: "UTC" }).format(new Date(iso));
}

// La météo des trois prochains jours. Composant serveur : la clé ne quitte jamais le serveur.
export async function Meteo({ chantier }: { chantier: ChantierVu }) {
  let coords = chantier.latitude !== null && chantier.longitude !== null ? { latitude: chantier.latitude, longitude: chantier.longitude } : null;
  if (!coords) {
    // Chantier sans coordonnées (créé avant la météo, ou issu du jeu de données) : on les cherche une fois.
    coords = await geolocaliser(chantier.adresse, chantier.codePostal, chantier.ville);
    if (coords) {
      await db.update(chantiers).set(coords).where(eq(chantiers.id, chantier.id));
      journal("chantier_geolocalise", { chantier: chantier.id });
    }
  }

  const resultat = coords ? await previsions(coords.latitude, coords.longitude, aujourdhuiParis()) : null;

  if (!coords || !resultat || !resultat.ok || resultat.jours.length === 0) {
    return (
      <Section titre="Météo sur place" carte>
        <p className="text-sm text-muted-foreground">
          {!coords
            ? "Adresse introuvable : météo impossible. Vérifiez l'adresse du chantier."
            : `${resultat && !resultat.ok ? resultat.raison : "Météo indisponible pour le moment."} Le reste de la fiche fonctionne.`}
        </p>
      </Section>
    );
  }

  // Le ciel du jour donne le fond et l'animation de la carte (voir lib/ambiance.ts).
  const heure = Number(new Intl.DateTimeFormat("fr-FR", { hour: "numeric", hourCycle: "h23", timeZone: "Europe/Paris" }).format(new Date()));
  const a = ambiance({ description: resultat.jours[0].ciel, heure, alertes: resultat.jours[0].alertes });

  return (
    <section
      className={cn("relative isolate flex flex-col gap-4 overflow-hidden rounded-3xl p-5 md:p-6", a.texteSombre ? "text-black" : "text-white")}
      style={{ background: a.fond }}
      aria-label="Météo sur place"
    >
      <CielAnime particules={a.particules} sombre={a.texteSombre} />
      <div className="relative flex items-center justify-between gap-3">
        <h2 className="text-lg font-bold tracking-tight">Météo sur place</h2>
        <PauseCiel sombre={a.texteSombre} />
      </div>
      <ul className="relative grid grid-cols-3 gap-2">
        {resultat.jours.map((j) => {
          const alerte = j.alertes.length > 0;
          return (
            <li
              key={j.date}
              className={cn("flex min-w-0 flex-col gap-1 rounded-2xl p-3 backdrop-blur-md", alerte ? "bg-black/75 text-white" : a.texteSombre ? "bg-white/35" : "bg-black/20")}
            >
              <span className="text-sm font-semibold capitalize">{jourCourt(j.date)}</span>
              <span className="text-2xl font-bold tracking-tight tabular-nums">
                <span className="sr-only">max </span>
                {j.max}°
              </span>
              <span className="truncate text-sm font-medium first-letter:uppercase">{j.ciel}</span>
              <span className="text-[0.8125rem] font-medium tabular-nums">
                <span className="sr-only">min </span>
                {j.min}° · {j.pluieMm} mm · {j.ventKmh} km/h
              </span>
              {alerte && <span className="text-sm font-bold">{j.alertes.join(", ")}</span>}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
