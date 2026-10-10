import { notFound } from "next/navigation";
import { Section } from "@/components/section";
import { Badge } from "@/components/ui/badge";
import { dernieresExecutions, derniersRejets } from "@/lib/nuit";
import { aujourdhuiParis } from "@/lib/regles";
import { appelantObligatoire } from "@/lib/session";
import { BoutonsNuit } from "./boutons";

export const dynamic = "force-dynamic";
// Les boutons lancent l'import depuis cette page : on lui laisse le temps de finir.
export const maxDuration = 60;

const LIBELLE = { en_cours: "En cours", ok: "Réussie", partiel: "Partielle", echec: "Échec" } as const;
const DECLENCHEUR: Record<string, string> = { nuit: "Planifiée", rattrapage: "Rattrapage", manuel: "À la main" };

function heure(d: Date | null) {
  return d ? new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", timeZone: "Europe/Paris" }).format(d) : "—";
}

// Le tableau de bord de la machine de nuit : une ligne par exécution.
export default async function MachineDeNuit() {
  const qui = await appelantObligatoire();
  if (qui.role !== "gerant") notFound();
  const [executions, rejets] = await Promise.all([dernieresExecutions(40), derniersRejets(20)]);
  const derniere = executions[0];

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-semibold tracking-tight">Machine de nuit</h1>
        <p className="max-w-2xl text-sm text-muted-foreground">
          Chaque matin à 6 h, groma importe les événements de la nuit depuis le flux, puis réessaie à 7 h si le flux était en panne. Relancer une nuit ne double jamais rien : un événement déjà reçu est reconnu et ignoré.
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-3 border border-foreground p-4">
        {derniere ? (
          <p className="text-sm">
            Dernière exécution : <strong>{heure(derniere.debut)}</strong>, nuit du {derniere.nuit},{" "}
            <Badge variant={derniere.statut === "echec" ? "default" : "outline"}>{LIBELLE[derniere.statut]}</Badge>
          </p>
        ) : (
          <p className="text-sm">Aucune exécution pour l&apos;instant.</p>
        )}
      </div>

      <BoutonsNuit derniereNuit={aujourdhuiParis()} />

      <Section titre="Exécutions">
        {executions.length === 0 ? (
          <p className="text-sm text-muted-foreground">Rien encore. Lancez « Importer les nuits manquantes ».</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[46rem] border-collapse text-sm">
              <thead>
                <tr className="border-b text-left text-xs text-muted-foreground">
                  <th className="py-2 font-medium">Lancée</th>
                  <th className="py-2 font-medium">Nuit</th>
                  <th className="py-2 font-medium">Par</th>
                  <th className="py-2 font-medium">Résultat</th>
                  <th className="py-2 text-right font-medium">Reçus</th>
                  <th className="py-2 text-right font-medium">Appliqués</th>
                  <th className="py-2 text-right font-medium">Doublons</th>
                  <th className="py-2 text-right font-medium">Mis de côté</th>
                  <th className="py-2 text-right font-medium">Appels</th>
                  <th className="py-2 text-right font-medium">Durée</th>
                </tr>
              </thead>
              <tbody>
                {executions.map((x) => (
                  <tr key={x.id} className="border-b align-top">
                    <td className="py-2 whitespace-nowrap">{heure(x.debut)}</td>
                    <td className="py-2 tabular-nums">{x.nuit}</td>
                    <td className="py-2">{DECLENCHEUR[x.declencheur] ?? x.declencheur}</td>
                    <td className="py-2">
                      <Badge variant={x.statut === "echec" ? "default" : "outline"}>{LIBELLE[x.statut]}</Badge>
                      {x.erreur && <p className="mt-1 max-w-xs text-xs text-muted-foreground">{x.erreur}</p>}
                    </td>
                    <td className="py-2 text-right tabular-nums">{x.recus}</td>
                    <td className="py-2 text-right tabular-nums">{x.appliques}</td>
                    <td className="py-2 text-right tabular-nums">{x.doublons}</td>
                    <td className="py-2 text-right tabular-nums">{x.rejetes}</td>
                    <td className="py-2 text-right tabular-nums">{x.appelsFlux}</td>
                    <td className="py-2 text-right tabular-nums">{x.dureeMs === null ? "—" : `${(x.dureeMs / 1000).toFixed(1)} s`}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Section>

      <Section titre="Événements mis de côté">
        {rejets.length === 0 ? (
          <p className="text-sm text-muted-foreground">Aucun : tout ce qui est arrivé était lisible.</p>
        ) : (
          <ul className="flex flex-col divide-y text-sm">
            {rejets.map((r) => (
              <li key={r.id} className="flex flex-wrap justify-between gap-2 py-2">
                <span className="font-mono text-xs">
                  {r.id} · {r.type} · {r.reference ?? "sans référence"}
                </span>
                <span>{r.raison}</span>
              </li>
            ))}
          </ul>
        )}
      </Section>
    </div>
  );
}
