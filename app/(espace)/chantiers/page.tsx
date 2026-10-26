import type { Metadata } from "next";
import Link from "next/link";
import { PageGlissante } from "@/components/transitions";
import { texteATraiter } from "@/components/a-traiter";
import { buttonVariants } from "@/components/ui/button";
import { peutCreerChantier, voitLInterne } from "@/lib/acces";
import { LIBELLE_STATUT } from "@/lib/chantier-forme";
import { avancementDes, compterParStatut, listerChantiers } from "@/lib/chantiers";
import { donneesCote } from "@/lib/cote";
import { aujourdhuiParis, poidsATraiter } from "@/lib/regles";
import { appelantObligatoire } from "@/lib/session";
import { Terrain } from "../terrain";
import { FiltresChantiers } from "./filtres";

export const metadata: Metadata = { title: "Chantiers" };

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
  const avancement = await avancementDes(qui, liste.map((c) => c.id));
  const aujourdhui = aujourdhuiParis();
  const terrain = liste.map((c) => ({
    id: c.id,
    nom: c.nom,
    ville: c.ville,
    client: c.client,
    etape: LIBELLE_STATUT[c.statut],
    enChantier: c.statut === "en_cours" || c.statut === "reception",
    aPhoto: c.aPhoto,
    aViser: texteATraiter(c.aTraiter),
    cote: donneesCote(c.debutPrevu, c.finPrevue, aujourdhui, avancement.get(c.id)),
  }));
  const total = Object.values(compteurs).reduce((s, n) => s + (n ?? 0), 0);
  const nbATraiter = tous ? tous.filter((c) => poidsATraiter(c.aTraiter) > 0).length : null;
  const filtre = Boolean(statut || q);

  return (
    <PageGlissante>
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-display font-extrabold text-[2.5rem] leading-[0.95] tracking-tight md:text-6xl">
          Chantiers
          <span className="block text-muted-foreground">{total} au total</span>
        </h1>
        {peutCreerChantier(qui.role) && (
          <Link href="/chantiers/nouveau" className={buttonVariants({ size: "lg" })}>
            Nouveau chantier
          </Link>
        )}
      </div>

      <FiltresChantiers compteurs={compteurs as Record<string, number>} total={total} aTraiter={nbATraiter} />
      <p role="status" className="sr-only">
        {liste.length} chantier{liste.length > 1 ? "s" : ""} affiché{liste.length > 1 ? "s" : ""}
      </p>

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
        // En cartes (par défaut, avec la photo) ou en liste, au choix ; le choix est retenu sur l'appareil.
        <Terrain chantiers={terrain} carrousel={false} cle="groma-vue-chantiers" />
      )}
    </div>
    </PageGlissante>
  );
}
