import Link from "next/link";
import { notFound } from "next/navigation";
import { Section } from "@/components/section";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { appelerFlux } from "@/lib/flux";
import { aujourdhuiParis } from "@/lib/regles";
import { appelantObligatoire } from "@/lib/session";

export const dynamic = "force-dynamic";

type Evenement = { id?: string; type?: string; horodatage?: string; objet?: string; donnees?: Record<string, unknown> };

// Tranche 0 de la semaine 2 : lire une nuit du flux telle quelle, sans rien importer,
// pour voir les vrais champs avant de décider comment les ranger.
export default async function LireLeFlux({ searchParams }: PageProps<"/reglages/flux">) {
  const qui = await appelantObligatoire();
  if (qui.role !== "gerant") notFound();
  const { date } = await searchParams;
  const nuit = typeof date === "string" && /^\d{4}-\d{2}-\d{2}$/.test(date) ? date : "";
  const r = await appelerFlux("evenements", nuit ? { date: nuit } : {});

  const corps = r.ok ? (r.corps as { nuit_du?: string; nombre?: number; evenements?: Evenement[] }) : null;
  const evenements = corps?.evenements ?? [];
  const parType = evenements.reduce<Record<string, number>>((acc, e) => ({ ...acc, [String(e.type)]: (acc[String(e.type)] ?? 0) + 1 }), {});
  const ids = evenements.map((e) => e.id);
  const doublons = ids.length - new Set(ids).size;
  const champs = [...new Set(evenements.flatMap((e) => Object.keys(e.donnees ?? {})))].sort();

  return (
    <div className="flex flex-col gap-6">
      <Link href="/reglages" className="text-sm text-muted-foreground hover:text-foreground">
        ← Réglages
      </Link>
      <h1 className="text-2xl font-semibold tracking-tight">Lire le flux de nuit</h1>
      <p className="max-w-2xl text-sm text-muted-foreground">
        Lecture seule : rien n&apos;est importé. Sans date, c&apos;est la nuit qui vient de se terminer ({aujourdhuiParis()}).
      </p>
      <form className="flex items-end gap-2">
        <Input name="date" type="date" defaultValue={nuit} aria-label="Nuit" className="w-44" />
        <Button type="submit" variant="outline">
          Lire cette nuit
        </Button>
      </form>

      {!r.ok ? (
        <p className="border border-foreground p-3 text-sm">
          Le flux a répondu {r.statut ?? "rien"} en {r.dureeMs} ms : {r.erreur}
        </p>
      ) : (
        <>
          <Section titre={`Nuit du ${corps?.nuit_du ?? "?"} · ${evenements.length} événements`}>
            <ul className="flex flex-wrap gap-x-6 gap-y-1 text-sm">
              {Object.entries(parType).map(([t, n]) => (
                <li key={t}>
                  {t} : <strong>{n}</strong>
                </li>
              ))}
              <li>
                doublons : <strong>{doublons}</strong>
              </li>
              <li>réponse en {r.dureeMs} ms</li>
            </ul>
            <p className="text-sm">
              Champs rencontrés dans « donnees » : <span className="font-mono text-xs">{champs.join(", ")}</span>
            </p>
          </Section>
          <Section titre="Réponse brute">
            <pre className="max-h-[70vh] overflow-auto border p-3 font-mono text-xs whitespace-pre-wrap">{JSON.stringify(r.corps, null, 2)}</pre>
          </Section>
        </>
      )}
    </div>
  );
}
