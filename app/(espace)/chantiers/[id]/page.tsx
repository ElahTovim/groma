import Link from "next/link";
import { notFound } from "next/navigation";
import { BadgeStatut } from "@/components/badge-statut";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { voitLInterne } from "@/lib/acces";
import { lireChantier } from "@/lib/chantiers";
import { lireFil, lireLots, lireParticipants } from "@/lib/fiche";
import { dateCourte, euros } from "@/lib/format";
import { journal } from "@/lib/journal";
import { appelantObligatoire } from "@/lib/session";
import { AnnonceCreation } from "./annonce-creation";
import { EtapeChantier } from "./etape";
import { Fil } from "./fil";
import { Lots } from "./lots";

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
  const termine = chantier.statut === "clos" || chantier.statut === "annule";
  const [participants, lots, elements] = await Promise.all([
    interne ? lireParticipants(chantier.id) : Promise.resolve([]),
    lireLots(qui, chantier.id),
    lireFil(qui, chantier.id),
  ]);

  return (
    // La marge du bas laisse la place au bouton fixé sous le pouce, sur téléphone.
    <div className="flex flex-col gap-6 pb-24 md:pb-0">
      {cree && <AnnonceCreation />}
      <Link href="/chantiers" className="text-sm text-muted-foreground hover:text-foreground">
        ← Tous les chantiers
      </Link>

      <header className="flex flex-col gap-4">
        <div className="flex flex-col gap-2">
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="min-w-0 text-2xl font-semibold text-balance">{chantier.nom}</h1>
            <BadgeStatut statut={chantier.statut} />
          </div>
          <p className="text-muted-foreground">
            {chantier.adresse}, {chantier.codePostal} {chantier.ville}
          </p>
          <p className="font-mono text-xs text-muted-foreground">{chantier.reference}</p>
        </div>
        {interne && !termine && <EtapeChantier chantierId={chantier.id} statut={chantier.statut} debutPrevu={chantier.debutPrevu} />}
      </header>

      <div className="grid gap-4 md:grid-cols-[1fr_1.4fr]">
        <div className="flex min-w-0 flex-col gap-4">
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

          {interne && <Lots chantierId={chantier.id} lots={lots} participants={participants} modifiable={!termine} />}

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
                      <li key={p.compteId} className="flex justify-between gap-3">
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

        <div className="min-w-0">
          <Fil chantierId={chantier.id} interne={interne} elements={elements} participants={participants} lots={lots} />
        </div>
      </div>
    </div>
  );
}
