export type DonneesCote = { pct: number; aujourdhui: number | null; debut: string; fin: string; finis: number; total: number };

function jourPoint(iso: string | null) {
  if (!iso) return "—";
  const [, m, j] = iso.split("-");
  return `${j}.${m}`;
}

// Ce qu'il faut pour tracer la ligne de cote d'un chantier : les lots finis, et où
// tombe aujourd'hui entre le début et la fin prévus (rien si une date manque).
export function donneesCote(debut: string | null, fin: string | null, aujourdhui: string, lots: { finis: number; total: number } | undefined): DonneesCote {
  const finis = lots?.finis ?? 0;
  const total = lots?.total ?? 0;
  let position: number | null = null;
  if (debut && fin && fin > debut) {
    const t = (Date.parse(aujourdhui) - Date.parse(debut)) / (Date.parse(fin) - Date.parse(debut));
    position = Math.round(Math.min(1, Math.max(0, t)) * 100);
  }
  return { pct: total ? Math.round((finis / total) * 100) : 0, aujourdhui: position, debut: jourPoint(debut), fin: jourPoint(fin), finis, total };
}
