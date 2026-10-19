import { Section } from "@/components/section";
import type { ChantierVu } from "@/lib/chantiers";
import { lireDepot, lireLotsLivres, tempsDeRoute, type Depot, type LotLivre, type ResultatTrajet } from "@/lib/distances";
import { dateLimiteCommande, duree, libelleZone, volDOiseauKm, zoneDeplacement, type Point } from "@/lib/distances-regles";
import { dateCourte } from "@/lib/format";
import { journal } from "@/lib/journal";
import { geolocaliser } from "@/lib/meteo";
import { aujourdhuiParis } from "@/lib/regles";
import type { Appelant } from "@/lib/session";
import { DelaiFournisseur } from "./livraisons-delai";

// La carte « Livraisons et trajets » : interne seulement (la page ne l'affiche qu'à l'équipe,
// et lireLotsLivres refuse un externe). Composant serveur : les appels aux services
// d'adresses et d'itinéraire partent du serveur, et une panne n'empêche rien d'autre.

function km(n: number) {
  return `${new Intl.NumberFormat("fr-FR", { maximumFractionDigits: n < 10 ? 1 : 0 }).format(n)} km`;
}

function Note({ children }: { children: React.ReactNode }) {
  return <p className="text-sm text-muted-foreground">{children}</p>;
}

function Alerte({ children }: { children: React.ReactNode }) {
  return (
    <span className="flex w-fit items-center gap-2 rounded-full bg-foreground py-1 pr-3 pl-1 text-sm font-semibold text-background">
      <span aria-hidden className="flex size-5 shrink-0 items-center justify-center rounded-full bg-background text-xs font-bold leading-none text-foreground">
        !
      </span>
      {children}
    </span>
  );
}

function Trajet({ t }: { t: ResultatTrajet }) {
  if (!t.ok) return <span className="text-muted-foreground">{t.raison}</span>;
  return (
    <span className="tabular-nums">
      {km(t.km)} · {duree(t.minutes)}
    </span>
  );
}

function DuDepot({ depot, chantier, trajet }: { depot: Depot; chantier: Point | null; trajet: ResultatTrajet | null }) {
  if (depot.etat === "absent") {
    return (
      <Note>
        L&apos;adresse du dépôt n&apos;est pas réglée. Pour voir le trajet de l&apos;équipe et sa zone de déplacement, le gérant la renseigne dans Réglages, carte « L&apos;entreprise ».</Note>
    );
  }
  if (depot.etat === "introuvable") {
    return <Note>Adresse du dépôt introuvable pour le moment (« {depot.adresse} »). Vérifiez-la dans Réglages ; le service d&apos;adresses peut aussi être indisponible.</Note>;
  }
  if (!chantier) return <Note>Adresse du chantier introuvable : trajet impossible. Vérifiez l&apos;adresse du chantier.</Note>;

  const zone = zoneDeplacement(volDOiseauKm(depot.point, chantier));
  return (
    <div className="flex flex-col gap-2">
      <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5">
        <dt className="text-muted-foreground">Aller</dt>
        <dd>{trajet ? <Trajet t={trajet} /> : null}</dd>
        <dt className="text-muted-foreground">Aller-retour</dt>
        <dd>{trajet?.ok ? <span className="tabular-nums">{km(trajet.km * 2)} · {duree(trajet.minutes * 2)}</span> : <span className="text-muted-foreground">indisponible</span>}</dd>
        <dt className="text-muted-foreground">Zone</dt>
        <dd className="font-semibold">
          {libelleZone(zone)} <span className="font-normal text-muted-foreground tabular-nums">({km(volDOiseauKm(depot.point, chantier))} à vol d&apos;oiseau)</span>
        </dd>
      </dl>
      <Note>Zones des petits déplacements du bâtiment, comptées depuis le dépôt. Bornes de la convention nationale, à vérifier pour votre convention.</Note>
    </div>
  );
}

function LigneLivraison({ lot, trajet, chantierId, modifiable, aujourdhui }: { lot: LotLivre; trajet: ResultatTrajet | null; chantierId: string; modifiable: boolean; aujourdhui: string }) {
  const commande = dateLimiteCommande({
    livraisonPrevue: lot.livraisonPrevue,
    delaiFournisseurJours: lot.delaiFournisseurJours,
    minutesTransport: trajet?.ok ? trajet.minutes : null,
    statut: lot.statut,
    aujourdhui,
  });
  return (
    <li className="flex flex-col gap-1.5 border-t py-3 first:border-t-0 first:pt-0">
      <span className="font-semibold">{lot.nom}</span>
      <span className="text-sm">
        {lot.entreprise}
        {lot.adresse && <span className="block text-muted-foreground">{lot.adresse}</span>}
      </span>
      <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm">
        <dt className="text-muted-foreground">Transport</dt>
        <dd>{trajet ? <Trajet t={trajet} /> : <span className="text-muted-foreground">adresse du fournisseur ou du chantier introuvable</span>}</dd>
        <dt className="text-muted-foreground">Délai</dt>
        <dd>
          <DelaiFournisseur chantierId={chantierId} lotId={lot.id} lot={lot.nom} delai={lot.delaiFournisseurJours} modifiable={modifiable} />
        </dd>
        <dt className="text-muted-foreground">Livraison</dt>
        <dd>{dateCourte(lot.livraisonPrevue)}</dd>
        <dt className="text-muted-foreground">Commander avant</dt>
        <dd>
          {commande.etat === "sans_date" ? (
            <span className="text-muted-foreground">{commande.raison}</span>
          ) : (
            <span className="font-semibold">
              {dateCourte(commande.limite)}
              {commande.etat === "commande" && <span className="font-normal text-muted-foreground"> · commandé</span>}
            </span>
          )}
        </dd>
      </dl>
      {commande.etat !== "sans_date" && commande.joursTransport > 0 && <Note>Le transport compte pour {commande.joursTransport} jour{commande.joursTransport > 1 ? "s" : ""}.</Note>}
      {commande.etat !== "sans_date" && trajet && !trajet.ok && <Note>Date calculée sans le temps de transport.</Note>}
      {commande.etat === "en_retard" && <Alerte>Commande en retard</Alerte>}
    </li>
  );
}

export async function Livraisons({ qui, chantier, modifiable }: { qui: Appelant; chantier: ChantierVu; modifiable: boolean }) {
  const aujourdhui = aujourdhuiParis();
  let lots: LotLivre[];
  try {
    lots = await lireLotsLivres(qui, chantier.id);
  } catch (e) {
    journal("livraisons_echec", { chantier: chantier.id, erreur: String(e) });
    return (
      <Section titre="Livraisons et trajets" carte>
        <Note>Les livraisons ne peuvent pas être lues pour le moment. Le reste de la fiche fonctionne.</Note>
      </Section>
    );
  }

  // Le chantier sans coordonnées : on les cherche (la carte météo, elle, les garde).
  const pointChantier: Point | null =
    chantier.latitude !== null && chantier.longitude !== null ? { latitude: chantier.latitude, longitude: chantier.longitude } : await geolocaliser(chantier.adresse, chantier.codePostal, chantier.ville);
  const depot = await lireDepot();

  // Tous les trajets en même temps : chacun a son délai d'attente court, et le cache évite de redemander.
  const [duDepot, ...desFournisseurs] = await Promise.all([
    depot.etat === "ok" && pointChantier ? tempsDeRoute(depot.point, pointChantier) : Promise.resolve(null),
    ...lots.map((l) => (l.point && pointChantier ? tempsDeRoute(l.point, pointChantier) : Promise.resolve(null))),
  ]);

  return (
    <Section titre="Livraisons et trajets" carte>
      <div className="flex flex-col gap-2">
        <h3 className="font-semibold">Du dépôt au chantier</h3>
        <DuDepot depot={depot} chantier={pointChantier} trajet={duDepot} />
      </div>
      <div className="flex flex-col gap-2">
        <h3 className="font-semibold">Livraisons des fournisseurs</h3>
        {lots.length === 0 ? (
          <Note>Aucun lot n&apos;a encore de fournisseur dont l&apos;entreprise est vérifiée. Choisissez le fournisseur d&apos;un lot, puis vérifiez son entreprise dans les participants.</Note>
        ) : (
          <ul className="flex flex-col">
            {lots.map((l, i) => (
              <LigneLivraison key={l.id} lot={l} trajet={desFournisseurs[i]} chantierId={chantier.id} modifiable={modifiable} aujourdhui={aujourdhui} />
            ))}
          </ul>
        )}
      </div>
    </Section>
  );
}
