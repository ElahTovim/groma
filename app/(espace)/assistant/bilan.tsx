import Link from "next/link";
import { TexteReponse } from "@/components/texte-reponse";
import { Badge } from "@/components/ui/badge";
import type { EtapeJournal, ExecutionDetail } from "@/lib/assistant";
import { decrireEntrees, estIdentifiant, LIBELLE_STATUT_AGENT, libelleOutil, raisonsARegarder, trierEtapes } from "@/lib/assistant-regles";

export const eurosFins = (n: number) => n.toLocaleString("fr-FR", { style: "currency", currency: "EUR", minimumFractionDigits: 2, maximumFractionDigits: 4 });

export const heureCourte = (d: Date) =>
  new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", timeZone: "Europe/Paris" }).format(d);

export const SUSPECT = "Consigne suspecte repérée dans les données, non suivie.";

// Le statut, en noir quand il faut regarder, au trait sinon.
export function BadgeStatutAgent({ x }: { x: { statut: ExecutionDetail["statut"]; refus: number; suspects: number } }) {
  const alerte = x.statut === "erreur" || x.statut === "budget" || x.statut === "interrompue";
  return <Badge variant={alerte ? "default" : "outline"}>{LIBELLE_STATUT_AGENT[x.statut]}</Badge>;
}

// Le chantier visé par une étape, en lien quand on a son identifiant.
export function ChantierDeLEtape({ e }: { e: EtapeJournal }) {
  const c = e.entrees?.chantier;
  if (!c) return null;
  if (estIdentifiant(c)) {
    return (
      <Link href={`/chantiers/${c}`} className="underline underline-offset-2">
        Ouvrir le chantier
      </Link>
    );
  }
  return (
    <Link href={`/chantiers?q=${encodeURIComponent(String(c))}`} className="font-mono text-xs underline underline-offset-2">
      {String(c)}
    </Link>
  );
}

function ListeEtapes({ etapes, vide }: { etapes: EtapeJournal[]; vide: string }) {
  if (etapes.length === 0) return <p className="text-sm text-muted-foreground">{vide}</p>;
  return (
    <ul className="flex flex-col divide-y text-sm">
      {etapes.map((e) => (
        <li key={e.id} className="flex flex-col gap-1 py-2">
          <span className="flex flex-wrap items-center gap-x-3 gap-y-1">
            <span className="font-medium">{libelleOutil(e.outil)}</span>
            <ChantierDeLEtape e={e} />
          </span>
          {e.resultat && <span className="text-muted-foreground">{e.resultat}</span>}
          {decrireEntrees(e.entrees) && <span className="text-xs break-words text-muted-foreground">{decrireEntrees(e.entrees)}</span>}
        </li>
      ))}
    </ul>
  );
}

// Le résultat d'une demande : la réponse, puis ce qui a été fait et proposé, tiré du journal.
export function BilanExecution({ x, lienJournal = true }: { x: ExecutionDetail; lienJournal?: boolean }) {
  const t = trierEtapes(x.etapes);
  const raisons = raisonsARegarder(x);
  return (
    <section id="resultat" aria-labelledby="titre-resultat" className="flex flex-col gap-5 rounded-3xl bg-card p-5 md:p-6">
      <div className="flex flex-col gap-2">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 id="titre-resultat" className="font-display text-lg font-bold">
            Réponse de l&apos;assistant
          </h2>
          <span className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground tabular-nums">
            <BadgeStatutAgent x={x} />
            <span>{eurosFins(x.coutEur)}</span>
            <span>{heureCourte(x.debut)}</span>
          </span>
        </div>
        <p className="text-sm text-muted-foreground">« {x.demande} »</p>
      </div>

      {t.suspects.length > 0 && (
        <p role="alert" className="rounded-2xl border border-foreground p-3 text-sm font-medium">
          {SUSPECT}
        </p>
      )}

      {x.statut === "en_cours" ? (
        <p className="text-sm">L&apos;assistant n&apos;a pas encore fini. Rechargez la page dans un moment.</p>
      ) : x.statut === "erreur" || x.statut === "interrompue" ? (
        <p className="text-sm">L&apos;assistant n&apos;a pas pu aller au bout. Ce qui a été fait avant l&apos;arrêt est listé ci-dessous.</p>
      ) : (
        <TexteReponse texte={x.reponse ?? ""} />
      )}

      <div className="grid gap-5 md:grid-cols-2">
        <div className="flex flex-col gap-2 rounded-2xl bg-background p-4">
          <h3 className="font-semibold">Ce qu&apos;il a fait</h3>
          <ListeEtapes etapes={t.faits} vide="Rien : aucune note, demande ni pièce ajoutée." />
        </div>
        <div className="flex flex-col gap-2 rounded-2xl bg-background p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="font-semibold">Ce qu&apos;il propose</h3>
            {t.propositions.length > 0 && (
              <Link href="/a-valider" className="text-sm font-medium underline underline-offset-2">
                Voir dans « À valider »
              </Link>
            )}
          </div>
          <ListeEtapes etapes={t.propositions} vide="Aucune proposition. Rien n'attend de validation." />
          {t.propositions.length > 0 && <p className="text-xs text-muted-foreground">Rien n&apos;est parti : chaque proposition attend un clic dans « À valider ».</p>}
        </div>
      </div>

      {t.refus.length > 0 && (
        <div className="flex flex-col gap-2">
          <h3 className="font-semibold">Ce qui a été refusé</h3>
          <ListeEtapes etapes={t.refus} vide="" />
        </div>
      )}

      <p className="text-xs text-muted-foreground">
        {x.outils} appel{x.outils > 1 ? "s" : ""} d&apos;outil{x.outils > 1 ? "s" : ""}
        {raisons.length > 0 && <> · à regarder : {raisons.join(", ")}</>}
        {lienJournal && (
          <>
            {" · "}
            <Link href={`/assistant/journal/${x.id}`} className="underline underline-offset-2">
              Le détail dans le journal
            </Link>
          </>
        )}
      </p>
    </section>
  );
}
