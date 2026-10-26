import { existsSync } from "node:fs";
import path from "node:path";
import type { Metadata } from "next";
import Link from "next/link";

// La page publique de présentation de groma (semaine 5). Sans compte. Les captures se déposent
// dans public/presentation/ (voir LISEZ-MOI.md là-bas) : tant qu'un fichier manque, sa place
// reste en noir avec sa légende, et la mise en page ne bouge pas.
export const dynamic = "force-static";

export const metadata: Metadata = {
  title: "groma · le suivi de chantier de rénovation",
  description: "Du devis signé à la levée des réserves : l'équipe, le client, l'architecte et les sous-traitants sur un même fil, les pièces obligatoires suivies, une machine de nuit et un assistant qui propose sans jamais envoyer seul.",
};

function capture(nom: string): string | null {
  return existsSync(path.join(process.cwd(), "public", "presentation", nom)) ? `/presentation/${nom}` : null;
}

function Capture({ nom, legende }: { nom: string; legende: string }) {
  const src = capture(nom);
  return (
    <figure className="flex flex-col gap-2">
      <div className="overflow-hidden rounded-3xl bg-foreground ring-1 ring-foreground/10">
        {src ? (
          // eslint-disable-next-line @next/next/no-img-element -- capture statique, déjà au bon format
          <img src={src} alt={legende} loading="lazy" className="block h-auto w-full" />
        ) : (
          <div className="flex aspect-[16/10] items-end p-5 text-sm text-background/70">Capture à venir : {nom}</div>
        )}
      </div>
      <figcaption className="text-sm text-muted-foreground">{legende}</figcaption>
    </figure>
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

export default function Presentation() {
  return (
    <main className="mx-auto flex w-full max-w-6xl flex-col gap-24 px-4 pt-10 pb-24 md:px-8 md:pt-16">
      <header className="flex items-center justify-between gap-4">
        <span className="font-display text-2xl font-extrabold tracking-tight">groma</span>
        <Link href="/connexion" className="rounded-full bg-foreground px-5 py-2.5 text-sm font-semibold text-background">
          Se connecter
        </Link>
      </header>

      <section className="grid items-end gap-10 md:grid-cols-[1.2fr_1fr]">
        <div className="flex flex-col gap-6">
          <h1 className="font-display text-[2.75rem] leading-[0.95] font-extrabold tracking-tight text-balance md:text-7xl">
            Vos chantiers sans WhatsApp, vos réceptions sans litige.
          </h1>
          <p className="max-w-xl text-lg text-pretty text-muted-foreground">
            groma suit les chantiers de rénovation du devis signé à la levée des réserves. L&apos;équipe, le client, l&apos;architecte, le syndic et les sous-traitants travaillent sur le même fil, et chacun ne voit que ce qu&apos;on lui partage.
          </p>
          <ul className="flex flex-wrap gap-2 text-sm">
            {["Gérant, équipe, externes", "Pièces obligatoires suivies", "PV de réception signé", "IA qui propose, jamais seule"].map((t) => (
              <li key={t} className="rounded-full bg-card px-3 py-1.5 font-medium">
                {t}
              </li>
            ))}
          </ul>
        </div>
        <Capture nom="01-liste.png" legende="La liste des chantiers : ce qui demande votre attention remonte en tête." />
      </section>

      <section className="grid gap-6 md:grid-cols-3">
        {[
          ["Le problème", "Sur un chantier de rénovation, tout passe par WhatsApp, le téléphone et des courriels. Le client voit tout ou rien, les preuves se perdent, les réserves traînent et le solde avec."],
          ["Ce qui coûte cher", "Un PV de réception mal fait, une attestation de vigilance oubliée, une décennale expirée : l'absence d'un papier obligatoire se paie en litige ou en dettes sociales."],
          ["Ce que fait groma", "Un fil par chantier avec des partages au cas par cas, les pièces obligatoires suivies et relancées, une réception signée, et une IA qui prépare le travail sans jamais rien envoyer seule."],
        ].map(([t, x]) => (
          <div key={t} className="flex flex-col gap-2 rounded-3xl bg-card p-6">
            <h2 className="font-display text-lg font-bold">{t}</h2>
            <p className="text-sm text-pretty text-muted-foreground">{x}</p>
          </div>
        ))}
      </section>

      <section className="flex flex-col gap-20">
        {FONCTIONS.map((f, i) => (
          <article key={f.titre} className="grid items-center gap-8 md:grid-cols-2 md:gap-14">
            <div className={`flex flex-col gap-3 ${i % 2 ? "md:order-2" : ""}`}>
              <span className="text-xs font-semibold tracking-[0.08em] text-muted-foreground uppercase tabular-nums">{String(i + 1).padStart(2, "0")}</span>
              <h2 className="font-display text-3xl leading-tight font-extrabold tracking-tight text-balance md:text-4xl">{f.titre}</h2>
              <p className="max-w-lg text-pretty text-muted-foreground">{f.texte}</p>
            </div>
            <Capture nom={f.capture} legende={f.legende} />
          </article>
        ))}
      </section>

      <section className="grid gap-6 rounded-3xl bg-foreground p-8 text-background md:grid-cols-2 md:p-12">
        <div className="flex flex-col gap-3">
          <h2 className="font-display text-3xl font-extrabold tracking-tight">La confiance, dans le code</h2>
          <p className="text-pretty text-background/70">Les droits se vérifient sur le serveur, jamais à l&apos;écran. Un externe qui colle l&apos;adresse d&apos;un autre chantier reçoit « introuvable », et la tentative est notée.</p>
        </div>
        <ul className="flex flex-col gap-3 text-sm">
          {[
            "Fichiers privés, servis après vérification des droits.",
            "Rien ne part vers un client ou un sous-traitant sans un clic humain.",
            "Un message reçu est une donnée, jamais un ordre : les consignes cachées sont repérées et ignorées.",
            "Dépense de l'IA plafonnée : environ 3 € par mois pour une petite entreprise.",
            "Plus de 300 tests rejoués à chaque modification.",
          ].map((t) => (
            <li key={t} className="flex gap-3">
              <span aria-hidden className="mt-2 size-1.5 shrink-0 rounded-full bg-background" />
              {t}
            </li>
          ))}
        </ul>
      </section>

      <section className="flex flex-col items-start gap-5">
        <h2 className="font-display text-4xl font-extrabold tracking-tight text-balance md:text-5xl">Pour les entreprises de rénovation de 5 à 50 personnes.</h2>
        <p className="max-w-xl text-pretty text-muted-foreground">Celles qui coordonnent des sous-traitants, des clients particuliers et des syndics, et pour qui la fin de chantier compte autant que le début.</p>
        <Link href="/connexion" className="rounded-full bg-foreground px-6 py-3 font-semibold text-background">
          Se connecter à groma
        </Link>
      </section>

      <footer className="flex flex-wrap justify-between gap-3 border-t border-foreground/15 pt-6 text-xs text-muted-foreground">
        <span>groma · construit pendant le séminaire « Usage de l&apos;IA », octobre 2026</span>
        <span>Données de démonstration fictives</span>
      </footer>
    </main>
  );
}
