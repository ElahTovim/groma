import { eq } from "drizzle-orm";
import { Badge } from "@/components/ui/badge";
import { Section } from "@/components/section";
import type { ChantierVu } from "@/lib/chantiers";
import { db } from "@/lib/db";
import { chantiers } from "@/lib/db/schema";
import { journal } from "@/lib/journal";
import { geolocaliser, previsions } from "@/lib/meteo";
import { aujourdhuiParis } from "@/lib/regles";

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

  return (
    <Section titre="Météo sur place">
        {!coords ? (
          <p className="text-sm text-muted-foreground">Adresse introuvable : météo impossible. Vérifiez l&apos;adresse du chantier.</p>
        ) : !resultat || !resultat.ok ? (
          <p className="text-sm text-muted-foreground">{resultat?.raison ?? "Météo indisponible pour le moment."} Le reste de la fiche fonctionne.</p>
        ) : (
          <ul className="grid grid-cols-3 gap-2">
            {resultat.jours.map((j) => (
              <li key={j.date} className="flex min-w-0 flex-col gap-1 rounded-lg border p-3">
                <span className="text-sm font-semibold capitalize">{jourCourt(j.date)}</span>
                <span className="font-bold first-letter:uppercase">{j.ciel}</span>
                <span className="tabular-nums">
                  {j.min}° / {j.max}°
                </span>
                <span className="text-[0.8125rem] text-muted-foreground tabular-nums">
                  {j.pluieMm} mm · {j.ventKmh} km/h
                </span>
                {j.alertes.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {j.alertes.map((a) => (
                      <Badge key={a}>{a}</Badge>
                    ))}
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
    </Section>
  );
}
