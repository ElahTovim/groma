import { ChevronDown } from "lucide-react";
import Link from "next/link";
import { signOut } from "@/auth";
import { voitLInterne } from "@/lib/acces";
import { propositionsEnAttente } from "@/lib/operations/propositions";
import { appelantObligatoire } from "@/lib/session";
import { PremiereVisite } from "@/components/ouverture";
import { LiensAgent, LiensAgentMenu, PastilleMobile } from "./liens-agent";
import { BarreBas, LiensHaut, MargeBarreBas } from "./navigation";

const LIBELLE_ROLE = { gerant: "gérant", equipe: "équipe", externe: "externe" } as const;

// Le cadre commun des pages connectées, sur une seule ligne même sur téléphone :
// le nom, les réglages et la déconnexion vivent dans le menu du compte.
// La vérification de session est faite ici pour l'affichage, et refaite par chaque
// page et chaque action : un cadre n'est pas un garde.
export default async function Espace({ children }: LayoutProps<"/">) {
  const qui = await appelantObligatoire();
  // La pastille « À valider » : si sa lecture échoue, l'en-tête s'affiche sans elle.
  const enAttente = voitLInterne(qui.role) ? await propositionsEnAttente(qui).then((p) => p.length, () => 0) : 0;

  return (
    <div className="flex min-h-full flex-1 flex-col">
      <header className="sticky top-0 z-30 border-b bg-background" style={{ viewTransitionName: "en-tete" }}>
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between gap-3 px-4">
          <nav className="flex items-center gap-5 text-sm">
            <Link href="/" id="logo-groma" className="logo-groma text-2xl">
              groma
            </Link>
            <LiensHaut interne={voitLInterne(qui.role)} />
            {voitLInterne(qui.role) && <LiensAgent enAttente={enAttente} />}
          </nav>
          <details className="group relative">
            <summary className="flex min-h-11 cursor-pointer list-none items-center gap-1.5 text-sm [&::-webkit-details-marker]:hidden">
              <span className="max-w-40 truncate">{qui.nom}</span>
              <PastilleMobile enAttente={enAttente} />
              <ChevronDown className="size-4 transition-transform group-open:rotate-180" aria-hidden />
            </summary>
            <div className="absolute right-0 mt-1 flex w-56 flex-col border bg-background py-1 shadow-sm">
              <p className="px-3 py-2 text-xs text-muted-foreground">Connecté en tant que {LIBELLE_ROLE[qui.role]}</p>
              {voitLInterne(qui.role) && <LiensAgentMenu enAttente={enAttente} />}
              {qui.role === "gerant" && (
                <>
                  <Link href="/nuit" className="flex min-h-11 items-center px-3 text-sm hover:bg-muted">
                    Machine de nuit
                  </Link>
                  <Link href="/reglages" className="flex min-h-11 items-center px-3 text-sm hover:bg-muted">
                    Réglages
                  </Link>
                </>
              )}
              <form
                action={async () => {
                  "use server";
                  await signOut({ redirectTo: "/connexion" });
                }}
              >
                <button type="submit" className="flex min-h-11 w-full items-center px-3 text-left text-sm hover:bg-muted">
                  Se déconnecter
                </button>
              </form>
            </div>
          </details>
        </div>
      </header>
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6">
        {children}
        <MargeBarreBas interne={voitLInterne(qui.role)} />
      </main>
      <BarreBas interne={voitLInterne(qui.role)} />
      <PremiereVisite />
    </div>
  );
}
