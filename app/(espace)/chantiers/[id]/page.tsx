import Link from "next/link";
import { notFound } from "next/navigation";
import { BadgeStatut } from "@/components/badge-statut";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { voitLInterne } from "@/lib/acces";
import { lireChantier, listerParticipants } from "@/lib/chantiers";
import { dateCourte, euros } from "@/lib/format";
import { journal } from "@/lib/journal";
import { appelantObligatoire } from "@/lib/session";
import { AnnonceCreation } from "./annonce-creation";

export const dynamic = "force-dynamic";

export default async function FicheChantier({ params, searchParams }: PageProps<"/chantiers/[id]">) {
  const qui = await appelantObligatoire();
  const { id } = await params;
  const { cree } = await searchParams;

  const chantier = await lireChantier(qui, id);
  if (!chantier) {
    // Inexistant ou non autorisé : même réponse, mais la tentative est notée.
    journal("acces_refuse", { compte: qui.id, role: qui.role, chantier: id });
    notFound();
  }

  const interne = voitLInterne(qui.role);
  const participants = interne ? await listerParticipants(chantier.id) : [];

  return (
    <div className="flex flex-col gap-6">
      {cree && <AnnonceCreation />}
      <Link href="/chantiers" className="text-sm text-muted-foreground hover:text-foreground">
        ← Tous les chantiers
      </Link>

      <header className="flex flex-col gap-2">
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="min-w-0 text-2xl font-semibold text-balance">{chantier.nom}</h1>
          <BadgeStatut statut={chantier.statut} />
        </div>
        <p className="text-muted-foreground">
          {chantier.adresse}, {chantier.codePostal} {chantier.ville}
        </p>
        <p className="font-mono text-xs text-muted-foreground">{chantier.reference}</p>
      </header>

      <div className="grid gap-4 sm:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Le chantier</CardTitle>
          </CardHeader>
          <CardContent>
            <dl className="grid grid-cols-[auto_1fr] gap-x-6 gap-y-2 text-sm">
              <dt className="text-muted-foreground">Client</dt>
              <dd>{chantier.client}</dd>
              <dt className="text-muted-foreground">Début prévu</dt>
              <dd className="tabular-nums">{dateCourte(chantier.debutPrevu)}</dd>
              <dt className="text-muted-foreground">Fin prévue</dt>
              <dd className="tabular-nums">{dateCourte(chantier.finPrevue)}</dd>
              {interne && (
                <>
                  <dt className="text-muted-foreground">Montant HT</dt>
                  <dd className="tabular-nums">{euros(chantier.montantHt)}</dd>
                </>
              )}
            </dl>
          </CardContent>
        </Card>

        {interne && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Participants</CardTitle>
            </CardHeader>
            <CardContent>
              {participants.length === 0 ? (
                <p className="text-sm text-muted-foreground">Personne n&apos;est encore invité sur ce chantier.</p>
              ) : (
                <ul className="flex flex-col gap-2 text-sm">
                  {participants.map((p) => (
                    <li key={p.id} className="flex justify-between gap-3">
                      <span>{p.nom}</span>
                      <span className="text-muted-foreground">{p.qualite}</span>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        )}
      </div>

      <p className="text-sm text-muted-foreground">
        Les étapes du chantier, les lots, le fil et la météo arrivent dans les prochaines tranches.
      </p>
    </div>
  );
}
