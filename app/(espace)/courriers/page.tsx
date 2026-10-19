import Link from "next/link";
import { notFound } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { voitLInterne } from "@/lib/acces";
import { buttonVariants } from "@/components/ui/button";
import { bilanDesCourriers, compterCourriers, listerCourriers, type ChampsRanges, type StatutCourrier } from "@/lib/courriers";
import { erreurDeLecture, estDepot, incertitudesAffichees, libelleCategorie, motifDuRejet, type BilanGlobal } from "@/lib/courriers-regles";
import { appelantObligatoire } from "@/lib/session";
import { cn } from "@/lib/utils";
import { BoutonImport } from "./bouton-import";

const pourcent = (t: number) => `${Math.round(t * 100)} %`;
const pluriel = (n: number, un: string, plusieurs: string) => `${n.toLocaleString("fr-FR")} ${n > 1 ? plusieurs : un}`;

// Le bilan de l'IA, pour la démonstration : lisible au premier coup d'œil.
function Bilan({ b }: { b: BilanGlobal }) {
  if (b.courriers === 0) {
    return (
      <section aria-labelledby="titre-bilan" className="rounded-3xl border border-dashed p-5">
        <h2 id="titre-bilan" className="font-display text-lg font-bold">Bilan de l&apos;IA</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Le bilan apparaît dès qu&apos;un courrier lu par l&apos;IA est validé : on y compte, champ par champ, ce qu&apos;elle a eu juste, ce qui a été corrigé, inventé ou manqué.
        </p>
      </section>
    );
  }
  const justes = b.juste + b.justeVide;
  const cases: { n: number; libelle: string; aide: string }[] = [
    { n: justes, libelle: justes > 1 ? "justes" : "juste", aide: b.justeVide ? `dont ${b.justeVide} laissé${b.justeVide > 1 ? "s" : ""} vide${b.justeVide > 1 ? "s" : ""} à raison` : "même valeur que la personne" },
    { n: b.corrige, libelle: b.corrige > 1 ? "corrigés" : "corrigé", aide: "une autre valeur retenue" },
    { n: b.invente, libelle: b.invente > 1 ? "inventés" : "inventé", aide: "absent du courrier, vidé" },
    { n: b.manque, libelle: b.manque > 1 ? "manqués" : "manqué", aide: "laissé vide, rempli à la main" },
  ];
  return (
    <section aria-labelledby="titre-bilan" className="flex flex-col gap-4 rounded-3xl bg-card p-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="flex flex-col gap-1">
          <h2 id="titre-bilan" className="font-display text-lg font-bold">Bilan de l&apos;IA</h2>
          <p className="text-sm">
            Sur {pluriel(b.courriers, "courrier validé", "courriers validés")} : {pluriel(justes, "champ juste", "champs justes")}, {pluriel(b.corrige, "corrigé", "corrigés")}, {pluriel(b.invente, "inventé", "inventés")}, {pluriel(b.manque, "manqué", "manqués")}.
          </p>
        </div>
        {b.taux !== null && (
          <p className="text-right">
            <span className="block font-display text-5xl leading-none font-extrabold tabular-nums">{pourcent(b.taux)}</span>
            <span className="text-xs text-muted-foreground">de champs justes ({justes} sur {b.champs})</span>
          </p>
        )}
      </div>
      <ul className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {cases.map((c) => (
          <li key={c.libelle} className="flex flex-col rounded-2xl bg-background p-3">
            <span className="font-display text-3xl font-extrabold tabular-nums">{c.n}</span>
            <span className="text-sm font-semibold">{c.libelle}</span>
            <span className="text-xs text-muted-foreground">{c.aide}</span>
          </li>
        ))}
      </ul>
      {b.sansLecture > 0 && (
        <p className="text-xs text-muted-foreground">
          {pluriel(b.sansLecture, "courrier validé sans lecture par l'IA n'est pas compté", "courriers validés sans lecture par l'IA ne sont pas comptés")}.
        </p>
      )}
    </section>
  );
}

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
  const [compteurs, liste, bilan] = await Promise.all([compterCourriers(), listerCourriers(onglet.statut), bilanDesCourriers()]);
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
            Les courriers arrivent par le flux, ou sont déposés ici. L&apos;IA lit chaque courrier et propose ses champs, un résumé et un brouillon de réponse. Rien n&apos;est appliqué tant qu&apos;une personne n&apos;a pas relu et validé. Le brouillon n&apos;est jamais envoyé.
          </p>
        </div>
        <div className="flex flex-wrap items-start gap-3">
          <Link href="/courriers/deposer" className={buttonVariants({ size: "lg", variant: qui.role === "gerant" ? "outline" : "default" })}>
            Déposer un courrier
          </Link>
          {qui.role === "gerant" && <BoutonImport />}
        </div>
      </div>

      <Bilan b={bilan} />

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
                {qui.role === "gerant"
                  ? "Lancez « Importer les courriers du flux », ou déposez un courrier."
                  : "Le gérant importe les courriers du flux ; ils apparaîtront ici. Vous pouvez aussi déposer un courrier."}
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
            const echec = erreurDeLecture(c);
            const motif = motifDuRejet(c);
            const points = incertitudesAffichees(c.incertitudes).length;
            const depose = estDepot(c);
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
                  <p className="line-clamp-2 text-sm text-muted-foreground">{c.resume ?? (c.texte || c.fichierNom || "PDF pas encore transcrit")}</p>
                  <div className="flex flex-wrap gap-2">
                    {/* D'où vient le courrier : plein pour un dépôt, pour le repérer d'un coup d'œil pendant la démo. */}
                    {depose ? <Badge>{c.fichierNom ? "Déposé · PDF" : "Déposé · texte"}</Badge> : <Badge variant="outline">Flux</Badge>}
                    {!c.luLe && onglet.statut === "a_relire" ? (
                      <Badge variant="outline">{echec ? "Lecture par l'IA impossible" : "Pas encore lu par l'IA"}</Badge>
                    ) : (
                      <Badge variant="outline">{libelleCategorie(c.categorie)}</Badge>
                    )}
                    {c.chantierReference && <Badge variant="outline">{c.chantierReference}</Badge>}
                    {onglet.statut === "a_relire" && c.luLe && points > 0 && (
                      <Badge variant="outline">
                        {points} point{points > 1 ? "s" : ""} à relire
                      </Badge>
                    )}
                    {onglet.statut === "rejete" && motif && <span className="text-xs text-muted-foreground">Motif : {motif}</span>}
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
