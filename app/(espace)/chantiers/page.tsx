import Link from "next/link";
import { BadgeStatut } from "@/components/badge-statut";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { peutCreerChantier, voitLInterne } from "@/lib/acces";
import { LIBELLE_STATUT, STATUTS } from "@/lib/chantier-forme";
import { listerChantiers } from "@/lib/chantiers";
import { dateCourte, euros } from "@/lib/format";
import { appelantObligatoire } from "@/lib/session";

export const dynamic = "force-dynamic";

export default async function ListeChantiers({ searchParams }: PageProps<"/chantiers">) {
  const qui = await appelantObligatoire();
  const params = await searchParams;
  const statut = typeof params.statut === "string" ? params.statut : "";
  const q = typeof params.q === "string" ? params.q.trim() : "";
  const liste = await listerChantiers(qui, { statut, q });
  const filtre = Boolean(statut || q);
  const interne = voitLInterne(qui.role);

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold">Chantiers</h1>
        {peutCreerChantier(qui.role) && (
          <Link href="/chantiers/nouveau" className={buttonVariants({ size: "lg" })}>
            Nouveau chantier
          </Link>
        )}
      </div>

      {/* Un simple formulaire GET : les filtres vivent dans l'adresse, on peut la partager. */}
      <form className="flex flex-wrap gap-2" role="search">
        <Input name="q" defaultValue={q} placeholder="Rechercher : nom, client, ville, référence" className="min-w-0 flex-1 basis-60" aria-label="Rechercher" />
        <select
          name="statut"
          defaultValue={statut}
          aria-label="Filtrer par statut"
          className="h-9 rounded-md border bg-background px-3 text-sm"
        >
          <option value="">Tous les statuts</option>
          {STATUTS.map((s) => (
            <option key={s} value={s}>
              {LIBELLE_STATUT[s]}
            </option>
          ))}
        </select>
        <Button type="submit" variant="secondary">
          Filtrer
        </Button>
        {filtre && (
          <Link href="/chantiers" className={buttonVariants({ variant: "ghost" })}>
            Effacer
          </Link>
        )}
      </form>

      {liste.length === 0 ? (
        <div className="rounded-lg border border-dashed p-10 text-center">
          {filtre ? (
            <p className="text-muted-foreground">Aucun chantier ne correspond à ces filtres.</p>
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
          <p className="text-sm text-muted-foreground">
            {liste.length} chantier{liste.length > 1 ? "s" : ""}
          </p>

          {/* Téléphone : des cartes, faciles à toucher. */}
          <ul className="flex flex-col gap-2 md:hidden">
            {liste.map((c) => (
              <li key={c.id}>
                <Link href={`/chantiers/${c.id}`} className="flex flex-col gap-1 rounded-lg border p-4 active:bg-muted">
                  <div className="flex items-start justify-between gap-3">
                    <span className="min-w-0 font-medium">{c.nom}</span>
                    <BadgeStatut statut={c.statut} />
                  </div>
                  <span className="text-sm text-muted-foreground">
                    {c.client} · {c.ville}
                  </span>
                </Link>
              </li>
            ))}
          </ul>

          {/* Ordinateur : un tableau. */}
          <div className="hidden md:block">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Référence</TableHead>
                  <TableHead>Chantier</TableHead>
                  <TableHead>Client</TableHead>
                  <TableHead>Ville</TableHead>
                  <TableHead>Début prévu</TableHead>
                  {interne && <TableHead className="text-right">Montant HT</TableHead>}
                  <TableHead>Statut</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {liste.map((c) => (
                  <TableRow key={c.id}>
                    <TableCell className="font-mono text-xs">{c.reference}</TableCell>
                    <TableCell className="max-w-72">
                      <Link href={`/chantiers/${c.id}`} className="font-medium hover:underline">
                        {c.nom}
                      </Link>
                    </TableCell>
                    <TableCell>{c.client}</TableCell>
                    <TableCell>{c.ville}</TableCell>
                    <TableCell className="tabular-nums">{dateCourte(c.debutPrevu)}</TableCell>
                    {interne && <TableCell className="text-right tabular-nums">{euros(c.montantHt)}</TableCell>}
                    <TableCell>
                      <BadgeStatut statut={c.statut} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </>
      )}
    </div>
  );
}
