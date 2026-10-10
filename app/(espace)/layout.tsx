import { ChevronDown } from "lucide-react";
import Link from "next/link";
import { signOut } from "@/auth";
import { appelantObligatoire } from "@/lib/session";

const LIBELLE_ROLE = { gerant: "gérant", equipe: "équipe", externe: "externe" } as const;

// Le cadre commun des pages connectées, sur une seule ligne même sur téléphone :
// le nom, les réglages et la déconnexion vivent dans le menu du compte.
// La vérification de session est faite ici pour l'affichage, et refaite par chaque
// page et chaque action : un cadre n'est pas un garde.
export default async function Espace({ children }: LayoutProps<"/">) {
  const qui = await appelantObligatoire();

  return (
    <div className="flex min-h-full flex-1 flex-col">
      <header className="sticky top-0 z-30 border-b bg-background">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between gap-3 px-4">
          <nav className="flex items-center gap-5 text-sm">
            <Link href="/chantiers" className="text-lg font-bold tracking-tight">
              groma
            </Link>
            <Link href="/chantiers" className="font-medium">
              Chantiers
            </Link>
          </nav>
          <details className="group relative">
            <summary className="flex min-h-11 cursor-pointer list-none items-center gap-1.5 text-sm [&::-webkit-details-marker]:hidden">
              <span className="max-w-40 truncate">{qui.nom}</span>
              <ChevronDown className="size-4 transition-transform group-open:rotate-180" aria-hidden />
            </summary>
            <div className="absolute right-0 mt-1 flex w-56 flex-col border bg-background py-1 shadow-sm">
              <p className="px-3 py-2 text-xs text-muted-foreground">Connecté en tant que {LIBELLE_ROLE[qui.role]}</p>
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
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6">{children}</main>
    </div>
  );
}
