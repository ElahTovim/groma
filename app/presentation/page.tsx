import { existsSync } from "node:fs";
import path from "node:path";
import type { Metadata } from "next";
import Link from "next/link";
import { Reticule } from "@/components/cote";

// La page publique de présentation de groma (semaine 5), sans compte. Elle se lit comme un plan
// d'architecte : papier millimétré, planches numérotées, cotes, cartouche, et les badges posés
// comme des tampons de contrôle. Les captures se déposent dans public/presentation/ (LISEZ-MOI.md) :
// tant qu'un fichier manque, sa place reste en noir avec sa légende.
export const dynamic = "force-static";

export const metadata: Metadata = {
  title: "groma · le suivi de chantier de rénovation",
  description: "Du devis signé à la levée des réserves : l'équipe, le client, l'architecte et les sous-traitants sur un même fil, les pièces obligatoires suivies, une machine de nuit et un assistant qui propose sans jamais envoyer seul.",
};

function capture(nom: string): string | null {
  return existsSync(path.join(process.cwd(), "public", "presentation", nom)) ? `/presentation/${nom}` : null;
}

// Une capture encadrée comme une vue sur un plan : repères de coupe aux quatre coins.
function Ecran({ src, alt, attente, telephone }: { src: string | null; alt: string; attente: string; telephone?: boolean }) {
  const cadre = telephone ? "aspect-[9/19.5] rounded-[1.25rem] border-[5px] border-foreground ring-4 ring-background" : "ring-1 ring-foreground";
  return (
    <div className={`overflow-hidden bg-foreground ${cadre}`}>
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element -- capture statique, déjà au bon format
        <img src={src} alt={alt} loading="lazy" className={`block w-full ${telephone ? "h-full object-cover object-top" : "h-auto"}`} />
      ) : (
        <div className={`flex flex-col justify-between text-background/60 ${telephone ? "h-full p-3" : "aspect-[16/10] p-5"}`}>
          <Reticule className={telephone ? "size-5" : "size-8"} plein={false} />
          <span className={`annotation ${telephone ? "text-[9px] leading-tight" : ""}`}>{attente}</span>
        </div>
      )}
    </div>
  );
}

// Chaque planche montre la même fonction à deux échelles : l'ordinateur au bureau, le téléphone
// sur le chantier, posé en détail sur le coin de la vue principale.
function Vue({ nom, legende, numero }: { nom: string; legende: string; numero: string }) {
  const mobile = nom.replace(".png", "-mobile.png");
  return (
    <figure className="flex flex-col gap-3">
      <div className="relative pr-[16%] pb-[14%]">
        <div className="coupe">
          <Ecran src={capture(nom)} alt={`${legende} Sur ordinateur.`} attente={`Vue à venir · ${nom}`} />
          <span className="coupe-bas" aria-hidden />
        </div>
        <div className="absolute right-0 bottom-0 w-[27%] drop-shadow-[0_10px_18px_rgb(0_0_0/0.28)]">
          <Ecran src={capture(mobile)} alt={`${legende} Sur téléphone.`} attente="Téléphone à venir" telephone />
        </div>
      </div>
      <figcaption className="annotation flex gap-3 text-muted-foreground">
        <span className="shrink-0 text-foreground">Vue {numero}</span>
        <span className="normal-case tracking-normal font-sans text-[13px]">
          {legende} <span className="text-foreground/70">Ordinateur et téléphone.</span>
        </span>
      </figcaption>
    </figure>
  );
}

// Une cote horizontale : deux bornes, un trait, et ce qu'elle mesure au milieu.
function Cote({ gauche, milieu, droite }: { gauche: string; milieu: string; droite: string }) {
  return (
    <div className="flex items-center gap-3" aria-hidden>
      <span className="annotation shrink-0">{gauche}</span>
      <span className="relative h-3 flex-1">
        <span className="absolute inset-x-0 top-1/2 h-px bg-foreground" />
        <span className="absolute top-0 left-0 h-3 w-px bg-foreground" />
        <span className="absolute top-0 right-0 h-3 w-px bg-foreground" />
        <span className="annotation absolute left-1/2 -top-1 -translate-x-1/2 bg-background px-2">{milieu}</span>
      </span>
      <span className="annotation shrink-0">{droite}</span>
    </div>
  );
}

const FONCTIONS = [
  {
    titre: "Chaque chantier dit ce qui le bloque",
    texte: "Devis, signé, planifié, en cours, réception, clos. Avant tout clic, la fiche dit pourquoi l'étape suivante est impossible : un devis non joint, un lot pas fini, une décennale manquante, une réserve encore ouverte. On ne clôt pas un chantier qui n'est pas fini.",
    capture: "02-fiche.png",
    legende: "La fiche d'un chantier : les étapes, ce qui bloque, les lots et leurs retards.",
  },
  {
    titre: "Un seul fil, et chacun voit ce qu'on lui partage",
    texte: "Messages, demandes avec échéance, disponibilités, documents, signalements : tout le chantier sur un fil. Tout est interne par défaut ; « Qui voit ça ? » partage un élément avec le client, l'architecte ou le syndic, un par un.",
    capture: "03-fil.png",
    legende: "Le fil en onglets : Fil, Documents, Demandes et dispos, Signalements.",
  },
  {
    titre: "Les pièces obligatoires, suivies et relancées",
    texte: "groma propose les pièces habituelles selon l'intervenant : plans pour l'architecte, décennale, vigilance URSSAF et Kbis pour le sous-traitant, autorisation de l'assemblée générale pour le syndic. Leur validité est comptée, la nuit relance, et une décennale manquante bloque le démarrage.",
    capture: "04-documents.png",
    legende: "L'onglet Documents : les pièces attendues de chacun, le dossier du chantier, le PV.",
  },
  {
    titre: "La réception, signée et opposable",
    texte: "Le PV de réception reprend les réserves ouvertes, le client le signe depuis son compte, et il est figé avec son empreinte. Les garanties partent de cette date : parfait achèvement, biennale, décennale.",
    capture: "05-pv.png",
    legende: "Le PV de réception, signé par le maître d'ouvrage.",
  },
  {
    titre: "Les courriers lus, rien n'est inventé",
    texte: "Un courrier arrive, groma en remplit les champs : expéditeur, chantier, date, montant. Un champ absent reste vide ; une valeur inventée est rattrapée. Résumé et brouillon de réponse sont prêts, mais rien ne part sans vous. Le bilan compte ce que l'IA a eu juste.",
    capture: "06-courrier.png",
    legende: "Un courrier lu par l'IA, relu par une personne, avec le bilan juste, corrigé, inventé.",
  },
  {
    titre: "Une question, une réponse qui cite la page",
    texte: "« Quel délai pour lever les réserves ? » La réponse s'écrit en direct et cite le document et la page. Une source inventée est signalée ; si rien n'est pertinent, groma le dit.",
    capture: "07-questions.png",
    legende: "Une réponse sur les documents, chaque affirmation sourcée.",
  },
  {
    titre: "Un assistant qui propose, vous qui validez",
    texte: "« Relance les sous-traitants dont la vigilance expire. » L'assistant lit les chantiers avec vos droits, fait ce qui reste interne, et range dans « À valider » tout ce qui partirait vers quelqu'un. Il n'a aucun outil pour clore, supprimer, signer ou payer.",
    capture: "08-assistant.png",
    legende: "L'assistant et la file « À valider ».",
  },
  {
    titre: "La nuit travaille, le matin vous dit l'essentiel",
    texte: "Chaque nuit, groma importe les nouvelles, lit les courriers, relance les pièces, analyse ce qui s'est passé, et envoie à 7 h un récapitulatif à chacun : tout pour le gérant, ses chantiers pour le chef d'équipe. Rien n'est jamais importé deux fois ; si le flux tombe, une alerte part.",
    capture: "09-nuit.png",
    legende: "La machine de nuit : chaque exécution, ce qu'elle a coûté, ce que la nuit dit.",
  },
];

// Les badges, en tampons encreurs. Seulement ce qui est fait et vérifié.
const TAMPONS = [
  { titre: "Sauvegarde restaurée", court: "SAUVEGARDE", centre: "29/29", sous: "tables identiques", detail: "La base de production sauvegardée, restaurée ailleurs, comptée table par table.", penche: "-7deg" },
  { titre: "Test de volume", court: "VOLUME", centre: "10 000", sous: "chantiers", detail: "30 000 lots, 50 000 éléments de fil : aucune page au-delà d'un quart de seconde.", penche: "5deg" },
  { titre: "Données personnelles", court: "DONNÉES", centre: "RGPD", sous: "registre · export", detail: "Un registre des traitements, « Exporter mes données », des autorisations datées.", penche: "-3deg" },
  { titre: "Accessibilité", court: "ACCESSIBILITÉ", centre: "AA", sous: "WCAG 2.2", detail: "Contrastes calculés, clavier, libellés, annonces pour les lecteurs d'écran.", penche: "8deg" },
  { titre: "Claude Desktop", court: "CLAUDE DESKTOP", centre: "MCP", sous: "branché", detail: "groma piloté depuis Claude Desktop et Claude Code, avec un jeton révocable.", penche: "-5deg" },
];

// Un tampon : double cercle, texte qui tourne autour, la preuve au centre. L'encre est un peu
// irrégulière (un léger bruit SVG) pour faire vrai.
function Tampon({ t, i }: { t: (typeof TAMPONS)[number]; i: number }) {
  const id = `tampon-${i}`;
  return (
    <figure className="flex flex-col items-center gap-4 text-center">
      <svg viewBox="0 0 200 200" role="img" aria-label={`${t.titre} : ${t.centre} ${t.sous}`} className="tampon tampon-anime size-44 text-foreground md:size-48" style={{ "--penche": t.penche } as React.CSSProperties}>
        <defs>
          <path id={`${id}-cercle`} d="M100,100 m-74,0 a74,74 0 1,1 148,0 a74,74 0 1,1 -148,0" />
          <filter id={`${id}-encre`}>
            <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" seed={i + 3} />
            <feDisplacementMap in="SourceGraphic" scale="2.2" />
          </filter>
        </defs>
        <g filter={`url(#${id}-encre)`} fill="none" stroke="currentColor">
          <circle cx="100" cy="100" r="92" strokeWidth="3.5" />
          <circle cx="100" cy="100" r="84" strokeWidth="1.2" />
          <circle cx="100" cy="100" r="56" strokeWidth="1.2" />
          {/* Le texte fait exactement un tour (2π × 74 ≈ 465) : il ne se chevauche jamais. */}
          <text fill="currentColor" stroke="none" fontSize="12.5" fontFamily="var(--font-geist-mono)" fontWeight="600">
            <textPath href={`#${id}-cercle`} startOffset="0" textLength="458" lengthAdjust="spacing">
              {`GROMA · ${t.court} · CONTRÔLÉ 2026 ·`}
            </textPath>
          </text>
          <text x="100" y="104" textAnchor="middle" fill="currentColor" stroke="none" fontSize={t.centre.length > 4 ? 24 : 34} fontWeight="800" fontFamily="var(--font-bricolage)">
            {t.centre}
          </text>
          <text x="100" y="124" textAnchor="middle" fill="currentColor" stroke="none" fontSize="8.5" letterSpacing="1" fontFamily="var(--font-geist-mono)">
            {t.sous.toUpperCase()}
          </text>
        </g>
      </svg>
      <figcaption className="flex max-w-56 flex-col gap-1">
        <span className="font-display text-lg font-bold">{t.titre}</span>
        <span className="text-sm text-pretty text-muted-foreground">{t.detail}</span>
      </figcaption>
    </figure>
  );
}

// Le grand tampon rectangulaire posé de travers sur le cartouche, comme sur un plan validé.
function BonPourExecution() {
  return (
    <svg viewBox="0 0 260 96" role="img" aria-label="Bon pour exécution" className="tampon tampon-anime pointer-events-none absolute -top-8 -right-2 z-10 w-48 text-foreground md:-top-10 md:-right-8 md:w-60" style={{ "--penche": "-11deg" } as React.CSSProperties}>
      <defs>
        <filter id="tampon-bpe">
          <feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves="2" seed="11" />
          <feDisplacementMap in="SourceGraphic" scale="2.6" />
        </filter>
      </defs>
      <g filter="url(#tampon-bpe)" fill="none" stroke="currentColor">
        <rect x="4" y="4" width="252" height="88" rx="10" strokeWidth="4" />
        <rect x="12" y="12" width="236" height="72" rx="6" strokeWidth="1.2" />
        <text x="130" y="48" textAnchor="middle" fill="currentColor" stroke="none" fontSize="27" fontWeight="800" letterSpacing="1" fontFamily="var(--font-bricolage)">BON POUR</text>
        <text x="130" y="74" textAnchor="middle" fill="currentColor" stroke="none" fontSize="18" fontWeight="700" letterSpacing="5" fontFamily="var(--font-geist-mono)">EXÉCUTION</text>
      </g>
    </svg>
  );
}

const CARTOUCHE = [
  ["Projet", "groma"],
  ["Objet", "Suivi de chantiers de rénovation"],
  ["Pour", "Entreprises de 5 à 50 personnes"],
  ["Dessiné par", "Kerguelenn"],
  ["Indice", "E · semaine 5"],
  ["Date", "Octobre 2026"],
];

export default function Presentation() {
  return (
    <main className="plan min-h-screen">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-24 px-4 pt-8 pb-24 md:px-8 md:pt-12">
        <header className="flex items-center justify-between gap-4">
          <span className="flex items-center gap-2 font-display text-2xl font-extrabold tracking-tight">
            <Reticule className="size-6" /> groma
          </span>
          <Link href="/connexion" className="rounded-full bg-foreground px-5 py-2.5 text-sm font-semibold text-background">
            Se connecter
          </Link>
        </header>

        {/* PL-00 : le titre, et le cartouche du plan. */}
        <section className="flex flex-col gap-10">
          <p className="annotation text-muted-foreground">PL‑00 · Présentation · Échelle 1:1</p>
          <h1 className="font-display text-[3rem] leading-[0.9] font-extrabold tracking-[-0.035em] text-balance md:text-[6rem]">
            Vos chantiers sans WhatsApp.
            <span className="block text-muted-foreground/70">Vos réceptions sans litige.</span>
          </h1>
          <div className="grid items-start gap-8 md:grid-cols-[1.4fr_1fr]">
            <p className="max-w-xl text-lg text-pretty">
              groma suit les chantiers de rénovation du devis signé à la levée des réserves. L&apos;équipe, le client, l&apos;architecte, le syndic et les sous-traitants travaillent sur le même fil, et chacun ne voit que ce qu&apos;on lui partage.
            </p>
            {/* Le cartouche : l'encadré d'identité de tout plan, en bas à droite, déjà tamponné. */}
            <div className="relative">
            <BonPourExecution />
            <dl className="grid grid-cols-[auto_1fr] border border-foreground bg-background text-sm">
              {CARTOUCHE.map(([k, v], i) => (
                <div key={k} className="contents">
                  <dt className={`annotation border-foreground px-3 py-2 text-muted-foreground ${i ? "border-t" : ""} border-r`}>{k}</dt>
                  <dd className={`border-foreground px-3 py-2 font-medium ${i ? "border-t" : ""}`}>{v}</dd>
                </div>
              ))}
            </dl>
            </div>
          </div>
          <Cote gauche="Devis signé" milieu="6 étapes · 1 seul fil" droite="Réserves levées" />
        </section>

        {/* Le relevé de l'existant : ce qui ne va pas aujourd'hui. */}
        <section className="flex flex-col gap-6">
          <p className="annotation text-muted-foreground">Relevé de l&apos;existant</p>
          <ol className="grid gap-px border border-foreground bg-foreground md:grid-cols-3">
            {[
              ["Tout passe par WhatsApp", "Le client voit tout ou rien, les preuves se perdent dans les conversations, les réserves traînent, et le solde avec."],
              ["Les papiers coûtent cher", "Un PV de réception mal fait, une attestation de vigilance oubliée, une décennale expirée : un papier manquant se paie en litige ou en dettes sociales."],
              ["groma remet de l'ordre", "Un fil par chantier, partagé au cas par cas ; les pièces obligatoires suivies et relancées ; une réception signée ; une IA qui prépare sans jamais envoyer seule."],
            ].map(([t, x], i) => (
              <li key={t} className="flex flex-col gap-3 bg-background p-6">
                <span className="annotation flex size-8 items-center justify-center rounded-full border border-foreground">{i + 1}</span>
                <h2 className="font-display text-xl font-bold">{t}</h2>
                <p className="text-sm text-pretty text-muted-foreground">{x}</p>
              </li>
            ))}
          </ol>
        </section>

        {/* Les planches : une fonction chacune, avec sa vue. */}
        <section className="flex flex-col gap-24">
          {FONCTIONS.map((f, i) => {
            const numero = String(i + 1).padStart(2, "0");
            return (
              <article key={f.titre} className="grid items-center gap-10 md:grid-cols-[1fr_1.15fr] md:gap-16">
                <div className={`flex flex-col gap-4 ${i % 2 ? "md:order-2" : ""}`}>
                  <p className="annotation flex items-center gap-3">
                    <span className="bg-foreground px-2 py-0.5 text-background">PL‑{numero}</span>
                    <span className="text-muted-foreground">Planche {numero} sur {String(FONCTIONS.length).padStart(2, "0")}</span>
                  </p>
                  <h2 className="font-display text-3xl leading-[1.02] font-extrabold tracking-tight text-balance md:text-[2.75rem]">{f.titre}</h2>
                  <p className="max-w-lg text-pretty text-muted-foreground">{f.texte}</p>
                </div>
                <Vue nom={f.capture} legende={f.legende} numero={numero} />
              </article>
            );
          })}
        </section>

        {/* Les notes générales, comme sur un plan : ce qui vaut partout. */}
        <section className="grid gap-8 bg-foreground p-8 text-background md:grid-cols-[1fr_1.4fr] md:p-12">
          <div className="flex flex-col gap-3">
            <p className="annotation text-background/60">Notes générales</p>
            <h2 className="font-display text-3xl font-extrabold tracking-tight md:text-4xl">La confiance est dans le code, pas dans l&apos;écran.</h2>
          </div>
          <ol className="flex flex-col gap-4 text-sm">
            {[
              "Les droits se vérifient sur le serveur. Un externe qui colle l'adresse d'un autre chantier reçoit « introuvable », et la tentative est notée.",
              "Rien ne part vers un client ou un sous-traitant sans un clic humain.",
              "Un message reçu est une donnée, jamais un ordre : les consignes cachées sont repérées et ignorées.",
              "Les fichiers sont privés, servis après vérification des droits.",
              "La dépense de l'IA est plafonnée : environ 3 € par mois pour une petite entreprise.",
              "Plus de 300 tests sont rejoués à chaque modification.",
            ].map((t, i) => (
              <li key={t} className="flex gap-4">
                <span className="annotation w-6 shrink-0 text-background/60">{String(i + 1).padStart(2, "0")}</span>
                <span className="text-pretty">{t}</span>
              </li>
            ))}
          </ol>
        </section>

        {/* Les tampons de contrôle : les badges du séminaire. */}
        <section className="flex flex-col gap-10">
          <p className="annotation text-muted-foreground">Contrôles · bon pour exécution</p>
          <ul className="grid grid-cols-2 justify-items-center gap-x-4 gap-y-12 sm:grid-cols-3 lg:grid-cols-5">
            {TAMPONS.map((t, i) => (
              <li key={t.titre}>
                <Tampon t={t} i={i} />
              </li>
            ))}
          </ul>
        </section>

        <section className="flex flex-col items-start gap-6 border-t border-foreground pt-12">
          <h2 className="font-display text-4xl font-extrabold tracking-tight text-balance md:text-6xl">Bon pour exécution.</h2>
          <p className="max-w-xl text-pretty text-muted-foreground">Pour les entreprises de rénovation qui coordonnent des sous-traitants, des clients particuliers et des syndics, et pour qui la fin de chantier compte autant que le début.</p>
          <Link href="/connexion" className="rounded-full bg-foreground px-6 py-3 font-semibold text-background">
            Se connecter à groma
          </Link>
        </section>

        <footer className="flex flex-wrap justify-between gap-3 border-t border-foreground/20 pt-6 text-muted-foreground">
          <span className="annotation">groma · séminaire « Usage de l&apos;IA » · octobre 2026</span>
          <span className="annotation">Données de démonstration fictives</span>
        </footer>
      </div>
    </main>
  );
}
