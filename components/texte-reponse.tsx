import { decouperReponse, morceauxEnLigne } from "@/lib/assistant-regles";

// La réponse de l'assistant, en paragraphes : titres, listes, gras et code, rien d'autre.
// Tout reste du texte (React l'échappe) : aucun HTML venu du modèle n'est interprété.
function EnLigne({ texte }: { texte: string }) {
  return (
    <>
      {morceauxEnLigne(texte).map((m, i) =>
        m.code ? (
          <code key={i} className="rounded bg-muted px-1 font-mono text-[0.9em]">
            {m.texte}
          </code>
        ) : m.gras ? (
          <strong key={i}>{m.texte}</strong>
        ) : (
          <span key={i}>{m.texte}</span>
        ),
      )}
    </>
  );
}

export function TexteReponse({ texte }: { texte: string }) {
  const blocs = decouperReponse(texte);
  if (blocs.length === 0) return <p className="text-sm text-muted-foreground">Pas de réponse écrite.</p>;
  return (
    <div className="flex max-w-3xl flex-col gap-3 text-sm leading-relaxed">
      {blocs.map((b, i) => {
        if (b.type === "titre") {
          return (
            <p key={i} className={b.niveau <= 2 ? "pt-1 font-display text-base font-bold" : "pt-1 font-semibold"}>
              <EnLigne texte={b.texte} />
            </p>
          );
        }
        if (b.type === "liste") {
          const Liste = b.ordonnee ? "ol" : "ul";
          return (
            <Liste key={i} className={`flex flex-col gap-1 pl-5 ${b.ordonnee ? "list-decimal" : "list-disc"}`}>
              {b.elements.map((e, j) => (
                <li key={j}>
                  <EnLigne texte={e} />
                </li>
              ))}
            </Liste>
          );
        }
        return (
          <p key={i}>
            <EnLigne texte={b.texte} />
          </p>
        );
      })}
    </div>
  );
}
