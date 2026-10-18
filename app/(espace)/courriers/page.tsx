import Link from "next/link";
import { notFound } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { voitLInterne } from "@/lib/acces";
import { compterCourriers, listerCourriers, PREFIXE_ECHEC, type ChampsRanges, type StatutCourrier } from "@/lib/courriers";
import { libelleCategorie } from "@/lib/courriers-regles";
import { appelantObligatoire } from "@/lib/session";
import { cn } from "@/lib/utils";
import { BoutonImport } from "./bouton-import";

export const dynamic = "force-dynamic";
// L'import lit dix courriers par l'IA depuis cette page : on lui laisse le temps de finir.
export const maxDuration = 60;

const ONGLETS: { statut: StatutCourrier; libelle: string; vide: string }[] = [
  { statut: "a_relire", libelle: "À relire", vide: "Aucun courrier à relire." },
  { statut: "valide", libelle: "Validés", vide: "Aucun courrier validé pour l'instant." },
  { statut: "rejete", libelle: "Rejetés", vide: "Aucun courrier rejeté." },
];

function jour(d: Date | null) {
  return d ? new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", timeZone: "Europe/Paris" }).format(d) : "";
}

// Les courriers reçus par le flux, lus par l'IA. Rien n'est appliqué sans relecture :
// chaque courrier attend qu'une personne de l'équipe le valide ou le rejette.
export default async function Courriers({ searchParams }: PageProps<"/courriers">) {
  const qui = await appelantObligatoire();
  if (!voitLInterne(qui.role)) notFound();
  const params = await searchParams;
  const onglet = ONGLETS.find((o) => o.statut === params.onglet) ?? ONGLETS[0];
  const [compteurs, liste] = await Promise.all([compterCourriers(), listerCourriers(onglet.statut)]);
  const total = compteurs.a_relire + compteurs.valide + compteurs.rejete;

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex flex-col gap-2">
          <h1 className="font-display text-[2.5rem] leading-[0.95] font-extrabold tracking-tight md:text-6xl">
            Courriers
            <span className="block text-muted-foreground/70">{compteurs.a_relire} à relire</span>
          </h1>
          <p className="max-w-2xl text-sm text-muted-foreground">
            L&apos;IA lit chaque courrier et propose ses champs, un résumé et un brouillon de réponse. Rien n&apos;est appliqué tant qu&apos;une personne n&apos;a pas relu et validé. Le brouillon n&apos;est jamais envoyé.
          </p>
        </div>
        {qui.role === "gerant" && <BoutonImport />}
      </div>

      <nav aria-label="Statut des courriers">
        <ul className="flex flex-wrap gap-2">
          {ONGLETS.map((o) => {
            const actif = o.statut === onglet.statut;
            return (
              <li key={o.statut}>
                <Link
                  href={o.statut === "a_relire" ? "/courriers" : `/courriers?onglet=${o.statut}`}
                  aria-current={actif ? "page" : undefined}
                  className={cn("flex min-h-11 items-center gap-2 rounded-full px-4 text-sm font-medium whitespace-nowrap", actif ? "bg-foreground text-background" : "bg-card hover:bg-card/70")}
                >
                  {o.libelle}
                  <span className={cn("text-xs tabular-nums", actif ? "text-background/70" : "text-muted-foreground")}>{compteurs[o.statut]}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      {liste.length === 0 ? (
        <div className="rounded-3xl bg-card p-10 text-center">
          {total === 0 ? (
            <div className="flex flex-col items-center gap-2">
              <p className="font-medium">Aucun courrier pour l&apos;instant.</p>
              <p className="text-sm text-muted-foreground">
                {qui.role === "gerant" ? "Lancez « Importer les courriers du flux » pour recevoir les courriers." : "Le gérant importe les courriers du flux ; ils apparaîtront ici."}
              </p>
            </div>
          ) : (
            <p className="text-muted-foreground">{onglet.vide}</p>
          )}
        </div>
      ) : (
        <ul className="flex flex-col gap-3">
          {liste.map((c) => {
            const champs = (c.champs ?? null) as ChampsRanges | null;
            const echec = c.incertitudes.find((i) => i.startsWith(PREFIXE_ECHEC));
            const titre = champs?.expediteur ?? champs?.societe ?? null;
            return (
              <li key={c.id}>
                <Link href={`/courriers/${encodeURIComponent(c.id)}`} className="flex flex-col gap-2 rounded-3xl bg-card p-4 transition-shadow hover:shadow-lg md:p-5">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="font-semibold">
                      {titre ?? <span className="text-muted-foreground">Expéditeur absent du courrier</span>}
                      {champs?.expediteur && champs.societe && <span className="font-normal text-muted-foreground"> · {champs.societe}</span>}
                    </p>
                    <span className="text-xs text-muted-foreground tabular-nums">
                      {onglet.statut === "a_relire" ? `Reçu le ${jour(c.recuLe)}` : `Traité le ${jour(c.valideLe)}`}
                    </span>
                  </div>
                  <p className="line-clamp-2 text-sm text-muted-foreground">{c.resume ?? c.texte}</p>
                  <div className="flex flex-wrap gap-2">
                    {!c.luLe && onglet.statut === "a_relire" ? (
                      <Badge variant="outline">{echec ? "Lecture par l'IA impossible" : "Pas encore lu par l'IA"}</Badge>
                    ) : (
                      <Badge variant="outline">{libelleCategorie(c.categorie)}</Badge>
                    )}
                    {c.chantierReference && <Badge variant="outline">{c.chantierReference}</Badge>}
                    {onglet.statut === "a_relire" && c.luLe && c.incertitudes.length > 0 && (
                      <Badge>
                        {c.incertitudes.length} point{c.incertitudes.length > 1 ? "s" : ""} à relire
                      </Badge>
                    )}
                    {onglet.statut === "rejete" && champs?.motifRejet && <span className="text-xs text-muted-foreground">Motif : {champs.motifRejet}</span>}
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
