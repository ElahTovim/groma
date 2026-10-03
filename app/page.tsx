import { redirect } from "next/navigation";
import { auth, signOut } from "@/auth";
import { Button } from "@/components/ui/button";

const LIBELLE_ROLE = { gerant: "gérant", equipe: "équipe", externe: "externe" } as const;

export default async function Accueil() {
  const session = await auth();
  if (!session) redirect("/connexion");

  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-6 p-4 text-center">
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-semibold">Bonjour, {session.user.name}</h1>
        <p className="text-muted-foreground">Connecté en tant que {LIBELLE_ROLE[session.user.role]}.</p>
        <p className="text-sm text-muted-foreground">Les chantiers arrivent dans les prochaines tranches.</p>
      </div>
      <form
        action={async () => {
          "use server";
          await signOut({ redirectTo: "/connexion" });
        }}
      >
        <Button type="submit" variant="outline">
          Se déconnecter
        </Button>
      </form>
    </main>
  );
}
