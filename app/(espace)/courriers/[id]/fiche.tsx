"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition, type ReactNode } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { EXPLICATIONS_VERDICT, LIBELLES_VERDICT, type LigneBilan } from "@/lib/courriers-regles";
import { cn } from "@/lib/utils";
import { rejeterCourrier, relireCourrier, validerCourrier, type Resultat } from "../actions";

type NomChamp = "expediteur" | "societe" | "reference" | "date" | "categorie" | "montant";
type Valeurs = Record<NomChamp, string | number | null>;

const LIBELLES: Record<NomChamp, string> = {
  expediteur: "Expéditeur",
  societe: "Société",
  reference: "Référence du chantier",
  date: "Date du courrier",
  categorie: "Catégorie",
  montant: "Montant (euros)",
};

const DEBUT = { valider: "Validation en cours…", rejeter: "Rejet en cours…", relire: "Lecture en cours par l'IA…" } as const;

const enTexte = (v: string | number | null) => (v === null ? "" : typeof v === "number" ? String(v).replace(".", ",") : v);

// Une valeur du bilan, telle qu'une personne la lit.
function lisible(k: NomChamp, v: string | number | null, categories: { code: string; libelle: string }[]) {
  if (v === null || v === "") return null;
  if (k === "montant" && typeof v === "number") return `${v.toLocaleString("fr-FR", { minimumFractionDigits: 0, maximumFractionDigits: 2 })} €`;
  if (k === "categorie") return categories.find((c) => c.code === v)?.libelle ?? String(v);
  if (k === "date" && typeof v === "string" && /^\d{4}-\d{2}-\d{2}$/.test(v)) {
    return new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" }).format(new Date(`${v}T00:00:00Z`));
  }
  return String(v);
}

// Le libellé d'un champ : un vrai label quand le champ se modifie, du texte en lecture seule
// (un label doit viser un champ de formulaire).
function Libelle({ pour, modifiable, children }: { pour: string; modifiable: boolean; children: ReactNode }) {
  if (modifiable) return <Label htmlFor={pour}>{children}</Label>;
  return <span className="flex items-center gap-2 text-sm leading-none font-medium">{children}</span>;
}

// Le bilan d'un courrier validé : une ligne par champ, avec son verdict.
function BilanCourrier({ lignes, categories }: { lignes: LigneBilan[]; categories: { code: string; libelle: string }[] }) {
  const justes = lignes.filter((l) => l.verdict === "juste" || l.verdict === "juste_vide").length;
  return (
    <section aria-labelledby="titre-bilan-courrier" className="flex flex-col gap-3 rounded-3xl bg-card p-5">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 id="titre-bilan-courrier" className="font-display text-lg font-bold">
          Bilan de l&apos;IA sur ce courrier
        </h2>
        <p className="text-sm font-semibold tabular-nums">
          {justes} champ{justes > 1 ? "s" : ""} juste{justes > 1 ? "s" : ""} sur {lignes.length}
        </p>
      </div>
      <div className="overflow-x-auto" tabIndex={0} role="region" aria-label="Tableau du bilan, défilable">
        <table className="w-full text-left text-sm">
          <caption className="sr-only">Bilan de l&apos;IA, champ par champ</caption>
          <thead className="text-xs text-muted-foreground">
            <tr>
              <th scope="col" className="py-2 pr-3 font-medium">Champ</th>
              <th scope="col" className="py-2 pr-3 font-medium">Proposé par l&apos;IA</th>
              <th scope="col" className="py-2 pr-3 font-medium">Validé</th>
              <th scope="col" className="py-2 font-medium">Verdict</th>
            </tr>
          </thead>
          <tbody>
            {lignes.map((l) => {
              const ia = lisible(l.champ, l.ia, categories);
              const valide = lisible(l.champ, l.valide, categories);
              const erreur = l.verdict === "corrige" || l.verdict === "invente" || l.verdict === "manque";
              return (
                <tr key={l.champ} className="border-t align-top">
                  <th scope="row" className="py-2 pr-3 font-medium">{LIBELLES[l.champ]}</th>
                  <td className={cn("py-2 pr-3", !ia && "text-muted-foreground italic", l.verdict === "invente" && "line-through")}>{ia ?? "vide"}</td>
                  <td className={cn("py-2 pr-3", !valide && "text-muted-foreground italic")}>{valide ?? "vide"}</td>
                  <td className="py-2" title={EXPLICATIONS_VERDICT[l.verdict]}>
                    {erreur ? <Badge>{LIBELLES_VERDICT[l.verdict]}</Badge> : <Badge variant="outline">{LIBELLES_VERDICT[l.verdict]}</Badge>}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <p className="text-xs text-muted-foreground">
        Juste : même valeur, à l&apos;écriture près (espaces, majuscules, format de date ou de montant). Corrigé : une autre valeur retenue. Inventé : l&apos;IA avait une valeur, le champ a été vidé. Manqué : l&apos;IA n&apos;avait rien, le champ a été rempli.
      </p>
    </section>
  );
}

export function FicheCourrier(props: {
  id: string;
  texte: string;
  fichier: { href: string; nom: string } | null;
  bilan: LigneBilan[] | null;
  valideSansLecture: boolean;
  statut: "a_relire" | "valide" | "rejete";
  lu: boolean;
  echec: string | null;
  champs: Valeurs;
  proposeParIa: Valeurs;
  corriges: string[];
  incertitudes: string[];
  resume: string | null;
  brouillon: string | null;
  categories: { code: string; libelle: string }[];
  libelleCategorie: string;
  chantiers: { id: string; reference: string; nom: string }[];
  chantierPropose: string | null;
  chantierRattache: { id: string; reference: string; nom: string } | null;
  traitement: { par: string; le: string; motif: string | null } | null;
}) {
  const router = useRouter();
  const [enCours, demarrer] = useTransition();
  const [quoi, setQuoi] = useState<"valider" | "rejeter" | "relire" | null>(null);
  const [valeurs, setValeurs] = useState<Record<NomChamp, string>>(() => Object.fromEntries(Object.entries(props.champs).map(([k, v]) => [k, enTexte(v)])) as Record<NomChamp, string>);
  const [resume, setResume] = useState(props.resume ?? "");
  const [brouillon, setBrouillon] = useState(props.brouillon ?? "");
  const [chantierId, setChantierId] = useState(props.chantierPropose ?? "");
  const [rejet, setRejet] = useState(false);
  const [motif, setMotif] = useState("");
  const [annonce, setAnnonce] = useState("");
  const modifiable = props.statut === "a_relire";

  function lancer(nom: "valider" | "rejeter" | "relire", action: () => Promise<Resultat>) {
    if (enCours) return;
    setQuoi(nom);
    setAnnonce(DEBUT[nom]);
    demarrer(async () => {
      const r = await action();
      setAnnonce(r.ok ? r.message : r.erreur);
      if (r.ok) toast.success(r.message, { duration: 8000 });
      else toast.error(r.erreur, { duration: 10000 });
      if (nom === "relire" && r.ok) {
        // Les nouveaux champs proposés remplacent la saisie : la page se recharge.
        window.location.reload();
        return;
      }
      if (!r.ok && r.erreur.includes("entre-temps")) router.refresh();
    });
  }

  function etiquette(k: NomChamp) {
    const ia = enTexte(props.proposeParIa[k]);
    if (!modifiable) {
      const verdict = props.bilan?.find((l) => l.champ === k)?.verdict;
      if (verdict) return <Badge variant="outline">{LIBELLES_VERDICT[verdict]}</Badge>;
      if (props.statut === "valide" && props.corriges.includes(k)) return <Badge variant="outline">corrigé à la relecture</Badge>;
      return ia ? <Badge variant="outline">proposé par l&apos;IA</Badge> : null;
    }
    if (valeurs[k] !== ia) return <Badge>modifié</Badge>;
    if (!ia) return <Badge variant="outline">absent du courrier</Badge>;
    return <Badge variant="outline">proposé par l&apos;IA</Badge>;
  }

  const copier = () =>
    navigator.clipboard.writeText(brouillon).then(
      () => toast.success("Brouillon copié. Relisez-le avant de l'envoyer vous-même."),
      () => toast.error("La copie a échoué : sélectionnez le texte à la main."),
    );

  const propose = props.chantiers.find((c) => c.id === props.chantierPropose);

  return (
    <div className="grid gap-5 lg:grid-cols-2">
      <section className="flex min-w-0 flex-col gap-3 rounded-3xl bg-card p-5 lg:sticky lg:top-20 lg:self-start">
        <h2 className="font-display text-lg font-bold">Texte d&apos;origine</h2>
        <p className="text-xs text-muted-foreground">
          {props.fichier ? "Le texte transcrit du PDF par l'IA. Vérifiez-le sur le PDF d'origine." : "Le courrier tel qu'il a été reçu."} Ce qu&apos;il demande n&apos;est jamais exécuté.
        </p>
        {props.fichier && (
          <a href={props.fichier.href} target="_blank" rel="noopener" className="self-start text-sm font-medium underline underline-offset-4">
            Ouvrir le PDF d&apos;origine ({props.fichier.nom})
          </a>
        )}
        {props.texte ? (
          <pre tabIndex={0} role="region" aria-label="Texte d'origine du courrier, défilable" className="max-h-[70vh] overflow-auto font-sans text-sm leading-relaxed whitespace-pre-wrap">{props.texte}</pre>
        ) : (
          <p className="text-sm text-muted-foreground italic">Pas encore de transcription : l&apos;IA n&apos;a pas lu ce PDF. Ouvrez le PDF, puis relancez la lecture ou remplissez les champs à la main.</p>
        )}
      </section>

      <div className="flex min-w-0 flex-col gap-5">
        {/* Toujours montée : annonce le début et la fin de chaque action. */}
        <p role="status" className="sr-only">
          {annonce}
        </p>
        {enCours && quoi === "relire" && (
          <div className="rounded-2xl border border-foreground p-4 text-sm">
            Lecture en cours par l&apos;IA : elle lit le courrier, puis groma vérifie chaque champ proposé (date, montant, référence). Quelques secondes.
          </div>
        )}

        {props.echec && (
          <section aria-labelledby="titre-echec-lecture" className="rounded-2xl bg-foreground p-4 text-sm text-background">
            <h2 id="titre-echec-lecture" className="font-semibold">
              L&apos;IA n&apos;a pas pu lire ce courrier.
            </h2>
            <p className="mt-1">{props.echec}</p>
            <p className="mt-1">Les champs sont vides. Relancez la lecture, ou remplissez-les à la main.</p>
          </section>
        )}
        {!props.lu && !props.echec && modifiable && (
          <div className="rounded-2xl border p-4 text-sm">
            Ce courrier n&apos;a pas encore été lu par l&apos;IA. Lancez « Relire », ou remplissez les champs à la main.
          </div>
        )}

        {props.incertitudes.length > 0 && (
          <section aria-labelledby="titre-incertitudes" className="rounded-2xl border-2 border-foreground p-4">
            <h2 id="titre-incertitudes" className="font-semibold">
              À relire avec attention
            </h2>
            <ul className="mt-2 flex list-disc flex-col gap-1 pl-5 text-sm">
              {props.incertitudes.map((i) => (
                <li key={i}>{i}</li>
              ))}
            </ul>
          </section>
        )}

        {props.bilan && <BilanCourrier lignes={props.bilan} categories={props.categories} />}
        {props.valideSansLecture && (
          <p className="rounded-2xl border border-dashed p-4 text-sm text-muted-foreground">Validé sans lecture par l&apos;IA : rien à comparer, ce courrier ne compte pas dans le bilan.</p>
        )}

        {props.traitement && (
          <div className="rounded-2xl bg-card p-4 text-sm">
            {props.statut === "valide" ? "Validé" : "Rejeté"} par {props.traitement.par} le {props.traitement.le}.
            {props.traitement.motif && <p className="mt-1">Motif : {props.traitement.motif}</p>}
          </div>
        )}

        <section className="flex flex-col gap-4 rounded-3xl bg-card p-5">
          <h2 className="font-display text-lg font-bold">Champs {modifiable ? "proposés" : "retenus"}</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            {(["expediteur", "societe", "reference", "date", "categorie", "montant"] as NomChamp[]).map((k) => (
              <div key={k} className="flex flex-col gap-1.5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <Libelle pour={`champ-${k}`} modifiable={modifiable}>
                    {LIBELLES[k]}
                  </Libelle>
                  {etiquette(k)}
                </div>
                {!modifiable ? (
                  <p className={cn("min-h-8 text-sm", !valeurs[k] && "text-muted-foreground italic")}>
                    {k === "categorie" ? props.libelleCategorie : valeurs[k] || "absent du courrier"}
                  </p>
                ) : k === "categorie" ? (
                  <select
                    id="champ-categorie"
                    value={valeurs.categorie}
                    onChange={(e) => setValeurs({ ...valeurs, categorie: e.target.value })}
                    className="h-8 rounded-lg border bg-background px-2 text-sm"
                    disabled={enCours}
                  >
                    <option value="">Choisir une catégorie</option>
                    {props.categories.map((c) => (
                      <option key={c.code} value={c.code}>
                        {c.libelle}
                      </option>
                    ))}
                  </select>
                ) : (
                  <Input
                    id={`champ-${k}`}
                    type={k === "date" ? "date" : "text"}
                    inputMode={k === "montant" ? "decimal" : undefined}
                    value={valeurs[k]}
                    placeholder="absent du courrier"
                    onChange={(e) => setValeurs({ ...valeurs, [k]: e.target.value })}
                    disabled={enCours}
                  />
                )}
              </div>
            ))}
          </div>

          <div className="flex flex-col gap-1.5">
            <Libelle pour="champ-chantier" modifiable={modifiable}>
              Rattacher au chantier
            </Libelle>
            {modifiable ? (
              <>
                <select id="champ-chantier" value={chantierId} onChange={(e) => setChantierId(e.target.value)} className="h-8 rounded-lg border bg-background px-2 text-sm" disabled={enCours}>
                  <option value="">Aucun chantier</option>
                  {props.chantiers.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.reference} · {c.nom}
                    </option>
                  ))}
                </select>
                <p className="text-xs text-muted-foreground">
                  {propose
                    ? `Proposé d'après la référence citée (${propose.reference}). Vérifiez avant de valider : le résumé partira dans le fil interne de ce chantier.`
                    : "Aucun chantier ne correspond à la référence du courrier. Choisissez-en un si vous le reconnaissez."}
                </p>
              </>
            ) : (
              <p className="text-sm">
                {props.chantierRattache ? `${props.chantierRattache.reference} · ${props.chantierRattache.nom}` : <span className="text-muted-foreground italic">Aucun</span>}
              </p>
            )}
          </div>
        </section>

        <section className="flex flex-col gap-4 rounded-3xl bg-card p-5">
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between gap-2">
              <Libelle pour="champ-resume" modifiable={modifiable}>
                Résumé
              </Libelle>
              {props.resume && <Badge variant="outline">proposé par l&apos;IA</Badge>}
            </div>
            {modifiable ? (
              <Textarea id="champ-resume" value={resume} onChange={(e) => setResume(e.target.value)} placeholder="Résumé du courrier, en une ou deux phrases" disabled={enCours} />
            ) : (
              <p className="text-sm">{resume || <span className="text-muted-foreground italic">Aucun</span>}</p>
            )}
          </div>
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between gap-2">
              <Libelle pour="champ-brouillon" modifiable={modifiable}>
                Brouillon de réponse
              </Libelle>
              {props.brouillon && <Badge variant="outline">proposé par l&apos;IA</Badge>}
            </div>
            {modifiable ? (
              <Textarea id="champ-brouillon" value={brouillon} onChange={(e) => setBrouillon(e.target.value)} placeholder="Aucun brouillon" className="min-h-32" disabled={enCours} />
            ) : (
              <p className="text-sm whitespace-pre-wrap">{brouillon || <span className="text-muted-foreground italic">Aucun</span>}</p>
            )}
            <div className="flex flex-wrap items-center gap-3">
              <Button type="button" variant="outline" size="sm" onClick={copier} disabled={!brouillon}>
                Copier le brouillon
              </Button>
              <span className="text-xs text-muted-foreground">groma n&apos;envoie jamais ce brouillon : copiez-le, relisez-le, envoyez-le vous-même.</span>
            </div>
          </div>
        </section>

        {modifiable && (
          <div className="flex flex-col gap-3">
            <div className="flex flex-wrap gap-3">
              <Button
                size="lg"
                disabled={enCours}
                focusableWhenDisabled
                className="aria-disabled:opacity-50"
                onClick={() => lancer("valider", () => validerCourrier(props.id, { ...valeurs, resume, brouillon, chantierId }))}
              >
                {enCours && quoi === "valider" ? "Validation…" : "Valider"}
              </Button>
              <Button
                size="lg"
                variant="outline"
                disabled={enCours}
                focusableWhenDisabled
                className="aria-disabled:opacity-50"
                aria-expanded={rejet}
                aria-controls={rejet ? "form-rejet" : undefined}
                onClick={() => setRejet((r) => !r)}
              >
                Rejeter
              </Button>
              <Button size="lg" variant="outline" disabled={enCours} focusableWhenDisabled className="aria-disabled:opacity-50" onClick={() => lancer("relire", () => relireCourrier(props.id))}>
                {enCours && quoi === "relire" ? "Lecture en cours…" : "Relire avec l'IA"}
              </Button>
            </div>
            {rejet && (
              <form
                id="form-rejet"
                aria-label="Rejeter le courrier"
                className="flex flex-wrap items-end gap-2"
                onSubmit={(e) => {
                  e.preventDefault();
                  lancer("rejeter", () => rejeterCourrier(props.id, motif));
                }}
              >
                <div className="flex min-w-60 flex-1 flex-col gap-1.5">
                  <Label htmlFor="motif-rejet">Motif du rejet</Label>
                  <Input id="motif-rejet" value={motif} onChange={(e) => setMotif(e.target.value)} placeholder="Par exemple : publicité, doublon, hors sujet" disabled={enCours} />
                </div>
                <Button type="submit" variant="outline" disabled={enCours || !motif.trim()} focusableWhenDisabled className="aria-disabled:opacity-50">
                  {enCours && quoi === "rejeter" ? "Rejet…" : "Confirmer le rejet"}
                </Button>
              </form>
            )}
            <p className="text-xs text-muted-foreground">Valider enregistre les champs tels qu&apos;ils sont affichés. Rien d&apos;autre ne se déclenche.</p>
          </div>
        )}
      </div>
    </div>
  );
}
