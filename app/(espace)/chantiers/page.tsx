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
        <h1 className="text-[2.5rem] leading-[0.95] font-bold tracking-tighter md:text-6xl">
          Chantiers
          <span className="block text-muted-foreground/70">{total} au total</span>
        </h1>
        {peutCreerChantier(qui.role) && (
          <Link href="/chantiers/nouveau" className={buttonVariants({ size: "lg" })}>
            Nouveau chantier
          </Link>
        )}
      </div>

      <FiltresChantiers compteurs={compteurs as Record<string, number>} total={total} aTraiter={nbATraiter} />

      {liste.length === 0 ? (
        <div className="rounded-3xl bg-card p-10 text-center">
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
        // Une carte par chantier : la photo (la couleur viendra des images), le nom en
        // grand, ce qui est à traiter en aplat noir. Une colonne sur téléphone, trois sur ordinateur.
        <ul className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {liste.map((c) => {
            const urgent = poidsATraiter(c.aTraiter) > 0;
            return (
              <li key={c.id}>
                <Link
                  href={`/chantiers/${c.id}`}
                  className="flex h-full flex-col gap-4 rounded-3xl bg-card p-3 pb-5 transition-shadow hover:shadow-lg active:scale-[0.99] md:p-3 md:pb-5"
                >
                  <div className="relative">
                    <Vignette chantierId={c.id} aPhoto={c.aPhoto} alt="" className="aspect-[16/10] w-full rounded-2xl" />
                    <div className="absolute top-3 left-3">
                      <BadgeStatut statut={c.statut} />
                    </div>
                  </div>
                  <div className="flex flex-1 flex-col gap-3 px-2">
                    <div className="flex flex-col gap-1">
                      <span className="line-clamp-2 text-2xl leading-tight font-bold tracking-tight">{c.nom}</span>
                      <span className="truncate text-muted-foreground">
                        {c.ville} · {c.client}
                      </span>
                    </div>
                    {interne && (
                      <div className="mt-auto flex items-end justify-between gap-3">
                        <div className="flex flex-col">
                          <span className="text-xs text-muted-foreground">Montant HT</span>
                          <span className="text-xl font-bold tracking-tight tabular-nums">{euros(c.montantHt)}</span>
                        </div>
                        <span className="text-right text-sm text-muted-foreground tabular-nums">
                          Début
                          <br />
                          {dateCourte(c.debutPrevu)}
                        </span>
                      </div>
                    )}
                    {urgent && (
                      <div className="rounded-2xl bg-foreground px-3 py-2 text-background">
                        <ResumeATraiter a={c.aTraiter} compact />
                      </div>
                    )}
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
