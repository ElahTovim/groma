import { buttonVariants } from "@/components/ui/button";
import { consentementsActuels, DESTINATAIRES } from "@/lib/donnees-personnelles";
import { lireProfil, NOM_PAR_DEFAUT } from "@/lib/profil";
import { appelantObligatoire } from "@/lib/session";
import { Autorisation, EditeurPolitique } from "./autorisations";

export const dynamic = "force-dynamic";
export const metadata = { title: "Mes données · groma" };

function date(iso: string | null) {
  return iso ? new Intl.DateTimeFormat("fr-FR", { dateStyle: "long", timeZone: "Europe/Paris" }).format(new Date(iso)) : null;
}

// Mes données (RGPD) : ce que groma garde sur moi, l'export en un clic, mes autorisations,
// et la politique de l'entreprise. Pour tout compte ; le gérant y rédige la politique.
export default async function MesDonnees() {
  const qui = await appelantObligatoire();
  const [profil, actuels] = await Promise.all([lireProfil(), consentementsActuels(qui.id)]);
  const entreprise = profil.nom === NOM_PAR_DEFAUT ? "l'entreprise qui utilise groma" : profil.nom;

  return (
    <div className="flex max-w-3xl flex-col gap-8">
      <div className="flex flex-col gap-2">
        <h1 className="font-display text-[2.5rem] leading-[0.95] font-extrabold tracking-tight md:text-6xl">Mes données</h1>
        <p className="text-sm text-muted-foreground">
          Ce que groma garde sur vous : votre compte, les chantiers où vous êtes invité, ce que vous avez écrit ou déposé, les PV que vous avez signés, vos demandes à l&apos;assistant. Jamais votre mot de passe : groma n&apos;en garde qu&apos;une empreinte, illisible.
        </p>
      </div>

      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold">Exporter mes données</h2>
        <p className="text-sm text-muted-foreground">Un fichier avec tout ce qui vous concerne, lisible et réutilisable ailleurs (droit d&apos;accès et de portabilité).</p>
        <div>
          <a href="/api/mes-donnees" className={buttonVariants({ variant: "default" })}>
            Exporter mes données
          </a>
        </div>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold">Mes autorisations</h2>
        <p className="text-sm text-muted-foreground">Vous pouvez les donner ou les retirer à tout moment ; chaque décision est gardée, avec sa date.</p>
        <Autorisation
          destinataire="groma"
          libelle={`J'autorise ${DESTINATAIRES.groma} à traiter mes données`}
          detail="Pour faire fonctionner le service : héberger vos données, envoyer les courriels, faire lire les documents par l'IA. groma ne vend ni ne partage vos données."
          accepte={actuels.groma?.accepte ?? false}
          depuis={date(actuels.groma?.le ?? null)}
        />
        <Autorisation
          destinataire="entreprise"
          libelle={`J'autorise ${entreprise} à utiliser mes données`}
          detail="Pour suivre les chantiers où vous intervenez, selon sa politique ci-dessous."
          accepte={actuels.entreprise?.accepte ?? false}
          depuis={date(actuels.entreprise?.le ?? null)}
        />
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold">La politique de {entreprise}</h2>
        {qui.role === "gerant" ? (
          <EditeurPolitique texte={profil.politique ?? ""} />
        ) : profil.politique ? (
          <div className="rounded-2xl bg-card p-4 text-sm whitespace-pre-wrap">{profil.politique}</div>
        ) : (
          <p className="text-sm text-muted-foreground">L&apos;entreprise n&apos;a pas encore rédigé sa politique. Pour toute question sur vos données, écrivez-lui.</p>
        )}
        {profil.politiqueModifieeLe && <p className="text-xs text-muted-foreground">Mise à jour le {date(profil.politiqueModifieeLe)}.</p>}
      </section>
    </div>
  );
}
