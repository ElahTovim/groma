import { notFound } from "next/navigation";
import { voitLInterne } from "@/lib/acces";
import { executionsOuvrables } from "@/lib/assistant";
import { LIBELLE_PROPOSITION } from "@/lib/assistant-regles";
import { propositionsEnAttente } from "@/lib/operations/propositions";
import { appelantObligatoire } from "@/lib/session";
import { Carte, type CarteProposition } from "./carte";

export const dynamic = "force-dynamic";
// Valider un courriel l'envoie depuis cette page : on laisse au service d'envoi le temps de répondre.
export const maxDuration = 60;

const chaine = (v: unknown) => (typeof v === "string" && v.trim() ? v : null);

// La file « À valider » : ce que l'assistant propose sans le faire. Une carte par proposition.
export default async function AValider() {
  const qui = await appelantObligatoire();
  if (!voitLInterne(qui.role)) notFound();
  const propositions = await propositionsEnAttente(qui);
  const ouvrables = await executionsOuvrables(qui, propositions.map((p) => p.executionId));
  const cartes: CarteProposition[] = propositions.map((p) => ({
    id: p.id,
    type: p.type,
    libelleType: LIBELLE_PROPOSITION[p.type] ?? p.type,
    chantier: p.chantier,
    chantierId: p.chantierId,
    destinataire: chaine(p.contenu.destinataire) ?? "destinataire inconnu",
    sujet: chaine(p.contenu.sujet),
    texte: chaine(p.contenu.texte),
    echeance: chaine(p.contenu.echeance),
    extrait: chaine(p.contenu.extrait),
    propose: p.propose,
    creeLe: p.creeLe,
    executionId: p.executionId && ouvrables.has(p.executionId) ? p.executionId : null,
  }));

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-2">
        <h1 className="font-display text-[2.5rem] leading-[0.95] font-extrabold tracking-tight md:text-6xl">
          À valider
          <span className="block text-muted-foreground/70">{cartes.length === 0 ? "rien en attente" : `${cartes.length} en attente`}</span>
        </h1>
        <p className="max-w-2xl text-sm text-muted-foreground">
          Ce que l&apos;assistant propose et qui part vers quelqu&apos;un : un courriel, une demande à un externe, un partage. Rien n&apos;est parti. Valider l&apos;exécute à votre nom, avec vos droits, une seule fois. Refuser demande un motif, gardé au journal.
        </p>
      </div>

      {cartes.length === 0 ? (
        <div className="flex flex-col items-center gap-2 rounded-3xl bg-card p-10 text-center">
          <p className="font-medium">Rien à valider.</p>
          <p className="text-sm text-muted-foreground">Les propositions de l&apos;assistant arriveront ici.</p>
        </div>
      ) : (
        <ul className="flex flex-col gap-4">
          {cartes.map((p) => (
            <li key={p.id}>
              <Carte p={p} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
