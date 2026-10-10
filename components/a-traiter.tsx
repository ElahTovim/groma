import { AlertTriangle, Clock, Flag } from "lucide-react";
import type { ATraiter } from "@/lib/regles";

// Ce qui demande de l'attention, en noir et blanc : une icône, un nombre, un mot.
export function ResumeATraiter({ a, compact = false }: { a: ATraiter | null; compact?: boolean }) {
  if (!a) return null;
  const items = [
    a.aQualifier > 0 && { icone: Flag, texte: `${a.aQualifier} à qualifier` },
    a.reservesOuvertes > 0 && { icone: AlertTriangle, texte: `${a.reservesOuvertes} réserve${a.reservesOuvertes > 1 ? "s" : ""}` },
    a.lotsEnRetard > 0 && { icone: Clock, texte: `${a.lotsEnRetard} en retard` },
  ].filter(Boolean) as { icone: typeof Flag; texte: string }[];
  if (items.length === 0) return compact ? null : <span className="text-muted-foreground">—</span>;
  return (
    <ul className="flex flex-wrap gap-x-3 gap-y-1">
      {items.map(({ icone: Icone, texte }) => (
        <li key={texte} className="flex items-center gap-1 text-sm font-semibold whitespace-nowrap">
          <Icone className="size-3.5" aria-hidden />
          {texte}
        </li>
      ))}
    </ul>
  );
}
