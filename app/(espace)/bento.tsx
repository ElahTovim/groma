import { ArrowRight, CheckCheck, Plus } from "lucide-react";
import Link from "next/link";
import { Reticule } from "@/components/cote";
import { PhotoPartagee, VERS_FICHE } from "@/components/transitions";
import { LIBELLE_TYPE } from "@/lib/libelles";
import type { TableauDeBord } from "@/lib/tableau-de-bord";
import { cn } from "@/lib/utils";
import { TuileMeteo } from "./accueil-blocs";
import { nomCarte } from "@/lib/nom-carte";
import { Carte, type ChantierTerrain } from "./terrain";

// L'accueil du téléphone en « bento » : des tuiles de tailles variées sur deux colonnes,
// qui tiennent l'essentiel sur un écran et demi. Le ciel sur une ligne, ce qui attend (à viser, à
// valider), le chantier le plus urgent en grand, deux autres en petit, les raccourcis,
// le dernier message. La pile complète reste sur la page Chantiers.
export function BentoTelephone(props: { t: TableauDeBord; terrain: ChantierTerrain[]; aValider: number; equipe: boolean; creer: boolean }) {
  const { t, terrain } = props;
  const [vedette, ...autres] = terrain;
  const message = t.messages[0];
  return (
    <section aria-label="Tableau de bord" className="grid grid-cols-2 gap-3 md:hidden">
      <TuileMeteo t={t} className="apparait col-span-2 [--rang:1]" />
      {t.chiffres ? (
        <TuileNombre href="/chantiers?statut=a_traiter" n={t.aTraiter.length} libelle="à viser" icone={<Reticule className="size-5" />} rang={2} />
      ) : (
        <TuileNombre href="/chantiers" n={terrain.length} libelle={terrain.length > 1 ? "chantiers" : "chantier"} rang={2} />
      )}
      {props.equipe ? (
        <TuileNombre href="/a-valider" n={props.aValider} libelle="à valider" icone={<CheckCheck className="size-5" aria-hidden />} rang={3} />
      ) : (
        <TuileLien href="/chantiers" libelle="Mes chantiers" rang={3} />
      )}

      {vedette && <Carte c={vedette} rang={4} className="apparait col-span-2 h-[15rem]" />}
      {autres.slice(0, 2).map((c, i) => (
        <TuileChantier key={c.id} c={c} rang={5 + i} />
      ))}

      <TuileLien href="/chantiers" libelle={`Tous les chantiers (${terrain.length})`} rang={7} className={cn(!props.creer && "col-span-2")} />
      {props.creer && <TuileLien href="/chantiers/nouveau" libelle="Nouveau chantier" icone={<Plus className="size-5" aria-hidden />} rang={8} />}

      {message && (
        <Link
          href={`/chantiers/${message.chantierId}#fil-${message.id}`}
          transitionTypes={VERS_FICHE}
          className="apparait col-span-2 flex flex-col gap-1.5 rounded-3xl bg-card p-4 [--rang:9] active:scale-[0.99]"
        >
          <span className="annotation truncate text-muted-foreground">
            Dernier message · {LIBELLE_TYPE[message.type]} · {message.auteur}
          </span>
          <span className="line-clamp-2 font-medium">{message.texte}</span>
          <span className="truncate text-sm text-muted-foreground">{message.chantier}</span>
        </Link>
      )}
    </section>
  );
}

// Un nombre qui compte : en noir plein quand quelque chose attend, comme les pastilles.
function TuileNombre(props: { href: string; n: number; libelle: string; icone?: React.ReactNode; rang: number }) {
  const attend = props.n > 0 && Boolean(props.icone);
  return (
    <Link
      href={props.href}
      className={cn("apparait flex min-h-[6.5rem] flex-col justify-between rounded-3xl p-4 active:scale-[0.98]", attend ? "bg-foreground text-background" : "bg-card")}
      style={{ "--rang": props.rang } as React.CSSProperties}
    >
      <span className="flex items-center justify-between">
        {props.icone}
        <ArrowRight className="size-4 opacity-70" aria-hidden />
      </span>
      <span className="flex items-baseline gap-1.5">
        <span className="font-display text-4xl leading-none font-extrabold tabular-nums">{props.n}</span>
        <span className="text-sm font-semibold">{props.libelle}</span>
      </span>
    </Link>
  );
}

function TuileLien(props: { href: string; libelle: string; icone?: React.ReactNode; rang: number; className?: string }) {
  return (
    <Link
      href={props.href}
      className={cn("apparait flex min-h-[4.5rem] items-center justify-between gap-2 self-stretch rounded-3xl border border-input p-4 text-sm font-semibold active:scale-[0.98]", props.className)}
      style={{ "--rang": props.rang } as React.CSSProperties}
    >
      <span className="flex items-center gap-2">
        {props.icone}
        {props.libelle}
      </span>
      <ArrowRight className="size-4 shrink-0" aria-hidden />
    </Link>
  );
}

// Un chantier en petite tuile : la photo, le nom en entier (trois lignes au plus), la ville.
function TuileChantier({ c, rang }: { c: ChantierTerrain; rang: number }) {
  return (
    <Link
      href={c.lien ?? `/chantiers/${c.id}`}
      transitionTypes={VERS_FICHE}
      aria-label={nomCarte(c)}
      className="carte-photo apparait relative isolate flex h-[13.5rem] flex-col justify-between overflow-hidden rounded-3xl border-[0.5px] border-white bg-foreground p-3.5 text-white active:scale-[0.98]"
      style={{ "--rang": rang } as React.CSSProperties}
    >
      {c.aPhoto ? (
        <PhotoPartagee chantierId={c.id}>
          {/* eslint-disable-next-line @next/next/no-img-element -- image privée, servie après vérification des droits */}
          <img src={`/api/photos/${c.id}`} alt="" loading="lazy" className="absolute inset-0 -z-20 size-full object-cover" />
        </PhotoPartagee>
      ) : (
        <Reticule className="absolute top-1/2 left-1/2 -z-20 size-24 -translate-1/2 text-white/10" plein={false} />
      )}
      <span aria-hidden className="absolute inset-0 -z-10 bg-gradient-to-b from-black/40 via-black/30 to-black/90" />
      <span className="flex justify-between">
        <span className="annotation rounded-full bg-white px-2 py-1 text-[10px] font-semibold text-black">{c.etape}</span>
        {c.aViser && (
          <span className="flex size-7 items-center justify-center rounded-full bg-white text-black" title="À viser">
            <Reticule className="size-4" />
          </span>
        )}
      </span>
      <span className="flex flex-col gap-1">
        <span className="line-clamp-3 font-display text-[1.05rem] leading-[1.08] font-extrabold tracking-tight">{c.nom}</span>
        <span className="annotation truncate text-white">{c.ville}</span>
      </span>
    </Link>
  );
}
