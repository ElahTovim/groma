import Link from "next/link";
import { signOut } from "@/auth";
import { Button } from "@/components/ui/button";
import { appelantObligatoire } from "@/lib/session";

const LIBELLE_ROLE = { gerant: "gérant", equipe: "équipe", externe: "externe" } as const;

// Le cadre commun des pages connectées. La vérification de session est faite
// ici pour l'affichage, et refaite par chaque page et chaque action : un cadre
// n'est pas un garde.
export default async function Espace({ children }: LayoutProps<"/">) {
  const qui = await appelantObligatoire();

  return (
    <div className="flex min-h-full flex-1 flex-col">
      <header className="border-b">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-3 px-4 py-3">
          <nav className="flex items-center gap-5 text-sm">
            <Link href="/chantiers" className="text-base font-semibold">
              groma
            </Link>
            <Link href="/chantiers" className="text-muted-foreground hover:text-foreground">
              Chantiers
            </Link>
            {qui.role === "gerant" && (
              <Link href="/reglages" className="text-muted-foreground hover:text-foreground">
                Réglages
              </Link>
            )}
          </nav>
          <div className="flex items-center gap-3 text-sm">
            <span className="text-muted-foreground">
              {qui.nom} · {LIBELLE_ROLE[qui.role]}
            </span>
            <form
              action={async () => {
                "use server";
                await signOut({ redirectTo: "/connexion" });
              }}
            >
              <Button type="submit" variant="ghost" size="sm">
                Se déconnecter
              </Button>
            </form>
          </div>
        </div>
      </header>
      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-6">{children}</main>
    </div>
  );
}
