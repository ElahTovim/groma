import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Section } from "@/components/section";
import { Badge } from "@/components/ui/badge";
import { derniereAnalyse } from "@/lib/analyse-nuit";
import { TITRE_CONSIGNE, TITRE_REFERENCES_RETIREES } from "@/lib/analyse-nuit-regles";
import { bilanIa, estimer, TARIFS_INDICATIFS } from "@/lib/couts";
import { coutsIaDuMois } from "@/lib/ia";
import { PLAFONDS_IA } from "@/lib/ia-regles";
import { consommationDuMois, dernieresExecutions, derniersRejets } from "@/lib/nuit";
import { aujourdhuiParis } from "@/lib/regles";
import { appelantObligatoire } from "@/lib/session";
import { BoutonsNuit } from "./boutons";

export const metadata: Metadata = { title: "Machine de nuit" };

export const dynamic = "force-dynamic";
// Les boutons lancent l'import depuis cette page : on lui laisse le temps de finir.
export const maxDuration = 60;

const LIBELLE = { en_cours: "En cours", ok: "Réussie", partiel: "Partielle", echec: "Échec" } as const;
const DECLENCHEUR: Record<string, string> = { nuit: "Planifiée", rattrapage: "Rattrapage", manuel: "À la main" };

const euros = (n: number, chiffres = 2) => n.toLocaleString("fr-FR", { style: "currency", currency: "EUR", minimumFractionDigits: chiffres, maximumFractionDigits: chiffres });

function heure(d: Date | null) {
  return d ? new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", timeZone: "Europe/Paris" }).format(d) : "—";
}

// Le tableau de bord de la machine de nuit : une ligne par exécution.
export default async function MachineDeNuit() {
  const qui = await appelantObligatoire();
  if (qui.role !== "gerant") notFound();
  const [executions, rejets, conso] = await Promise.all([dernieresExecutions(40), derniersRejets(20), consommationDuMois()]);
  // L'IA et son analyse : si leur lecture échoue, la section le dit et le reste de la page s'affiche.
  const [lignesIa, analyse] = await Promise.allSettled([coutsIaDuMois(), derniereAnalyse()]);
  const ia = lignesIa.status === "fulfilled" ? bilanIa(lignesIa.value, { budgetEuros: PLAFONDS_IA.budgetMensuelEuros }) : null;
  const estimation = estimer(conso);
  const derniere = executions[0];

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-semibold tracking-tight">Machine de nuit</h1>
        <p className="max-w-2xl text-sm text-muted-foreground">
          Chaque matin, groma importe les événements de la nuit depuis le flux, puis lit les nouveaux courriers, met à jour l&apos;index des documents et fait analyser la nuit par le modèle, avant le récapitulatif de 7 h. Relancer ne double jamais rien : un événement ou un courrier déjà reçu est reconnu, un document inchangé n&apos;est pas revectorisé, et la nuit n&apos;est analysée qu&apos;une fois.
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

      <Section titre="Ce que la nuit dit">
        {analyse.status === "rejected" ? (
          <p className="text-sm">L&apos;analyse de la nuit n&apos;a pas pu être lue. Rechargez la page dans un moment.</p>
        ) : !analyse.value ? (
          <p className="text-sm text-muted-foreground">Aucune analyse pour l&apos;instant. Elle est faite chaque matin après l&apos;import, ou avec « Courriers, documents et analyse ».</p>
        ) : (
          <div className="flex flex-col gap-3 border border-foreground p-4">
            <p className="text-xs text-muted-foreground">Nuit du {analyse.value.nuit}, analysée le {heure(analyse.value.creeLe)}</p>
            <p className="max-w-3xl text-sm">{analyse.value.texte}</p>
            {analyse.value.points.length > 0 && (
              <ul className="flex flex-col divide-y text-sm">
                {analyse.value.points.map((p, i) => (
                  <li key={i} className="flex flex-col gap-1 py-2">
                    <span className="font-medium">
                      {p.titre === TITRE_CONSIGNE || p.titre === TITRE_REFERENCES_RETIREES ? <Badge variant="default" className="mr-2">Signalé</Badge> : null}
                      {p.titre}
                    </span>
                    <span className="text-muted-foreground">{p.detail}</span>
                    {p.references.length > 0 && <span className="font-mono text-xs">{p.references.join(" · ")}</span>}
                  </li>
                ))}
              </ul>
            )}
            <p className="text-xs text-muted-foreground">Une lecture du modèle, à vérifier : elle ne modifie rien et ne déclenche aucune action. Une consigne glissée dans un message du flux n&apos;est jamais suivie : elle est signalée ici.</p>
          </div>
        )}
      </Section>

      <Section titre="Exécutions">
        {executions.length === 0 ? (
          <p className="text-sm text-muted-foreground">Rien encore. Lancez « Importer les nuits manquantes ».</p>
        ) : (
          <div className="overflow-x-auto" tabIndex={0} role="region" aria-label="Tableau des exécutions, défilable">
            <table className="w-full min-w-[46rem] border-collapse text-sm">
              <caption className="sr-only">Exécutions de la machine de nuit, des plus récentes aux plus anciennes</caption>
              <thead>
                <tr className="border-b text-left text-xs text-muted-foreground">
                  <th scope="col" className="py-2 font-medium">Lancée</th>
                  <th scope="col" className="py-2 font-medium">Nuit</th>
                  <th scope="col" className="py-2 font-medium">Par</th>
                  <th scope="col" className="py-2 font-medium">Résultat</th>
                  <th scope="col" className="py-2 text-right font-medium">Reçus</th>
                  <th scope="col" className="py-2 text-right font-medium">Appliqués</th>
                  <th scope="col" className="py-2 text-right font-medium">Doublons</th>
                  <th scope="col" className="py-2 text-right font-medium">Mis de côté</th>
                  <th scope="col" className="py-2 text-right font-medium">Appels</th>
                  <th scope="col" className="py-2 text-right font-medium">Durée</th>
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

      <Section titre="Ce que la nuit a coûté ce mois-ci">
        <dl className="grid grid-cols-2 gap-x-8 gap-y-2 text-sm sm:grid-cols-[auto_auto_auto_auto]">
          <dt className="text-muted-foreground">Exécutions</dt>
          <dd className="tabular-nums">{conso.executions}</dd>
          <dt className="text-muted-foreground">Temps de calcul</dt>
          <dd className="tabular-nums">{(conso.dureeMs / 1000).toFixed(0)} s</dd>
          <dt className="text-muted-foreground">Appels au flux</dt>
          <dd className="tabular-nums">{conso.appelsFlux}</dd>
          <dt className="text-muted-foreground">Adresses géolocalisées</dt>
          <dd className="tabular-nums">{conso.geocodages}</dd>
          <dt className="text-muted-foreground">Récapitulatifs envoyés</dt>
          <dd className="tabular-nums">{conso.courriels}</dd>
        </dl>
        <p className="text-sm">
          <strong>Coût réel : 0 €</strong>, tout tient dans les offres gratuites (Vercel Hobby, Neon, Resend, flux de nuit et API Adresse gratuits).
          Au-delà des offres gratuites, au tarif indicatif, ce mois coûterait environ{" "}
          <strong className="tabular-nums">{estimation.total.toLocaleString("fr-FR", { style: "currency", currency: "EUR", maximumFractionDigits: 4 })}</strong>.
        </p>
        <p className="text-xs text-muted-foreground">
          Tarifs indicatifs (lib/couts.ts) : {TARIFS_INDICATIFS.fonctionEuroParHeure} € l&apos;heure de fonction, {TARIFS_INDICATIFS.courrielEuro} € le courriel. À vérifier sur les pages de prix avant de décider.
        </p>
      </Section>

      <Section titre="Ce que l'IA a coûté ce mois-ci">
        {!ia ? (
          <p className="text-sm">Les appels à l&apos;IA n&apos;ont pas pu être lus. Rechargez la page dans un moment.</p>
        ) : ia.appels === 0 ? (
          <p className="text-sm text-muted-foreground">Aucun appel à l&apos;IA ce mois-ci. Budget du mois : {euros(ia.budget)}.</p>
        ) : (
          <>
            <div className="overflow-x-auto" tabIndex={0} role="region" aria-label="Tableau des coûts de l'IA, défilable">
              <table className="w-full min-w-[36rem] border-collapse text-sm">
                <caption className="sr-only">Coût de l&apos;IA ce mois-ci, par fonction</caption>
                <thead>
                  <tr className="border-b text-left text-xs text-muted-foreground">
                    <th scope="col" className="py-2 font-medium">Fonction</th>
                    <th scope="col" className="py-2 text-right font-medium">Appels</th>
                    <th scope="col" className="py-2 text-right font-medium">Échecs</th>
                    <th scope="col" className="py-2 text-right font-medium">Coût moyen par appel</th>
                    <th scope="col" className="py-2 text-right font-medium">Coût du mois</th>
                  </tr>
                </thead>
                <tbody>
                  {ia.fonctions.map((f) => (
                    <tr key={f.fonction} className="border-b">
                      <td className="py-2">
                        {f.nom}
                        <span className="block font-mono text-xs text-muted-foreground">{f.fonction}</span>
                      </td>
                      <td className="py-2 text-right tabular-nums">{f.appels}</td>
                      <td className="py-2 text-right tabular-nums">{f.echecs}</td>
                      <td className="py-2 text-right tabular-nums">{euros(f.coutMoyen, 4)}</td>
                      <td className="py-2 text-right tabular-nums">{euros(f.cout, 4)}</td>
                    </tr>
                  ))}
                  <tr className="font-medium">
                    <td className="py-2">Total</td>
                    <td className="py-2 text-right tabular-nums">{ia.appels}</td>
                    <td className="py-2 text-right tabular-nums">{ia.echecs}</td>
                    <td className="py-2 text-right tabular-nums">{euros(ia.coutMoyen, 4)}</td>
                    <td className="py-2 text-right tabular-nums">{euros(ia.total, 4)}</td>
                  </tr>
                </tbody>
              </table>
            </div>
            <dl className="grid grid-cols-2 gap-x-8 gap-y-2 text-sm sm:grid-cols-[auto_auto_auto_auto]">
              <dt className="text-muted-foreground">Budget du mois</dt>
              <dd className="tabular-nums">{euros(ia.budget)}</dd>
              <dt className="text-muted-foreground">Reste</dt>
              <dd className="tabular-nums">{euros(ia.reste)}</dd>
              <dt className="text-muted-foreground">Estimation au mois plein</dt>
              <dd className="tabular-nums">{euros(ia.estimationMoisPlein)}</dd>
            </dl>
            {ia.depasse && <p className="text-sm font-medium">Le budget du mois est atteint : l&apos;IA est en pause jusqu&apos;au 1er, le reste de groma fonctionne.</p>}
          </>
        )}
        <p className="text-xs text-muted-foreground">
          Coût calculé à chaque appel, aux tarifs indicatifs de lib/ia-regles.ts (prix par million de jetons, conversion dollar en euro) : à vérifier sur les pages de prix d&apos;Anthropic et de Voyage avant de décider. L&apos;estimation au mois plein prolonge le rythme des jours écoulés.
        </p>
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
