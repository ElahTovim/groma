import Link from "next/link";
import { ResumeATraiter } from "@/components/a-traiter";
import { BadgeStatut } from "@/components/badge-statut";
import { buttonVariants } from "@/components/ui/button";
import { Vignette } from "@/components/vignette";
import { peutCreerChantier, voitLInterne } from "@/lib/acces";
import { compterParStatut, listerChantiers } from "@/lib/chantiers";
import { dateCourte, euros } from "@/lib/format";
import { poidsATraiter } from "@/lib/regles";
import { appelantObligatoire } from "@/lib/session";
import { FiltresChantiers } from "./filtres";

export const dynamic = "force-dynamic";

export default async function ListeChantiers({ searchParams }: PageProps<"/chantiers">) {
  const qui = await appelantObligatoire();
  const params = await searchParams;
  const statut = typeof params.statut === "string" ? params.statut : "";
  const q = typeof params.q === "string" ? params.q.trim() : "";
  const interne = voitLInterne(qui.role);

  const [liste, compteurs, tous] = await Promise.all([
    listerChantiers(qui, { statut, q }),
    compterParStatut(qui),
    interne ? listerChantiers(qui, {}) : Promise.resolve(null),
  ]);
  const total = Object.values(compteurs).reduce((s, n) => s + (n ?? 0), 0);
  const nbATraiter = tous ? tous.filter((c) => poidsATraiter(c.aTraiter) > 0).length : null;
  const filtre = Boolean(statut || q);

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold tracking-tight">Chantiers</h1>
        {peutCreerChantier(qui.role) && (
          <Link href="/chantiers/nouveau" className={buttonVariants({ size: "lg" })}>
            Nouveau chantier
          </Link>
        )}
      </div>

      <FiltresChantiers compteurs={compteurs as Record<string, number>} total={total} aTraiter={nbATraiter} />

      {liste.length === 0 ? (
        <div className="border border-dashed p-10 text-center">
          {filtre ? (
            <p className="text-muted-foreground">{statut === "a_traiter" ? "Rien à traiter : aucun retard, aucun signalement en attente." : "Aucun chantier ne correspond à ces filtres."}</p>
          ) : (
            <div className="flex flex-col items-center gap-3">
              <p className="font-medium">Aucun chantier pour l&apos;instant.</p>
              <p className="text-sm text-muted-foreground">
                {peutCreerChantier(qui.role)
                  ? "Créez le premier, ou rejouez le jeu de données depuis les réglages."
                  : "Vous verrez ici les chantiers sur lesquels on vous a invité."}
              </p>
            </div>
          )}
        </div>
      ) : (
        <>
          {/* Téléphone : une ligne par chantier, facile à toucher, ce qui est à traiter en premier. */}
          <ul className="-mx-4 flex flex-col divide-y border-y md:hidden">
            {liste.map((c) => (
              <li key={c.id}>
                <Link href={`/chantiers/${c.id}`} className="flex gap-3 px-4 py-3 active:bg-muted">
                  <Vignette chantierId={c.id} aPhoto={c.aPhoto} alt="" className="size-14" />
                  <div className="flex min-w-0 flex-1 flex-col gap-1">
                    <div className="flex items-start justify-between gap-2">
                      <span className="line-clamp-2 min-w-0 font-medium">{c.nom}</span>
                      <BadgeStatut statut={c.statut} />
                    </div>
                    <span className="truncate text-sm text-muted-foreground">
                      {c.client} · {c.ville}
                    </span>
                    <ResumeATraiter a={c.aTraiter} compact />
                  </div>
                </Link>
              </li>
            ))}
          </ul>

          {/* Ordinateur : un tableau, chaque colonne bornée pour que rien ne déborde. */}
          <div className="hidden md:block">
            <table className="w-full table-fixed border-collapse text-sm">
              <colgroup>
                <col className="w-14" />
                <col />
                <col className="w-44" />
                <col className="w-36" />
                <col className="w-28" />
                {interne && <col className="w-28" />}
                {interne && <col className="w-44" />}
                <col className="w-28" />
              </colgroup>
              <thead>
                <tr className="border-b text-left text-xs text-muted-foreground">
                  <th className="py-2 font-medium">
                    <span className="sr-only">Photo</span>
                  </th>
                  <th className="py-2 font-medium">Chantier</th>
                  <th className="py-2 font-medium">Client</th>
                  <th className="py-2 font-medium">Ville</th>
                  <th className="py-2 font-medium">Début prévu</th>
                  {interne && <th className="py-2 text-right font-medium">Montant HT</th>}
                  {interne && <th className="py-2 pl-6 font-medium">À traiter</th>}
                  <th className="py-2 font-medium">Statut</th>
                </tr>
              </thead>
              <tbody>
                {liste.map((c) => (
                  <tr key={c.id} className="border-b align-top hover:bg-muted/60">
                    <td className="py-2.5">
                      <Vignette chantierId={c.id} aPhoto={c.aPhoto} alt="" className="size-10" />
                    </td>
                    <td className="py-2.5 pr-4">
                      <Link href={`/chantiers/${c.id}`} className="line-clamp-2 font-medium hover:underline" title={c.nom}>
                        {c.nom}
                      </Link>
                      <span className="font-mono text-xs text-muted-foreground">{c.reference}</span>
                    </td>
                    <td className="truncate py-2.5 pr-4" title={c.client}>
                      {c.client}
                    </td>
                    <td className="truncate py-2.5 pr-4">{c.ville}</td>
                    <td className="py-2.5 tabular-nums">{dateCourte(c.debutPrevu)}</td>
                    {interne && <td className="py-2.5 text-right tabular-nums">{euros(c.montantHt)}</td>}
                    {interne && (
                      <td className="py-2.5 pl-6">
                        <ResumeATraiter a={c.aTraiter} />
                      </td>
                    )}
                    <td className="py-2.5">
                      <BadgeStatut statut={c.statut} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
