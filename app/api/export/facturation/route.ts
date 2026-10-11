import { desc, eq } from "drizzle-orm";
import { compterATraiter } from "@/lib/chantiers";
import { db } from "@/lib/db";
import { chantiers, entreprises, pvReception } from "@/lib/db/schema";
import { prochainJalon, versCsv } from "@/lib/facturation-regles";
import { journal } from "@/lib/journal";
import { garanties } from "@/lib/reception-regles";
import { aujourdhuiParis } from "@/lib/regles";
import { appelant } from "@/lib/session";

export const dynamic = "force-dynamic";

// L'export pour l'outil de facturation : une ligne par chantier, avec le client tel
// que le registre le connaît et le prochain jalon à facturer. Gérant seulement :
// il contient les montants. Colonnes décrites dans docs/branchement-facturation.md.
export async function GET() {
  const qui = await appelant();
  if (!qui) return new Response("Connectez-vous.", { status: 401 });
  if (qui.role !== "gerant") {
    journal("export_refuse", { compte: qui.id, role: qui.role });
    return new Response("Réservé au gérant.", { status: 403 });
  }

  const lignes = await db
    .select({ c: chantiers, e: entreprises, pvSigneLe: pvReception.signeLe, pvDate: pvReception.dateReception })
    .from(chantiers)
    .leftJoin(entreprises, eq(chantiers.clientSiren, entreprises.siren))
    .leftJoin(pvReception, eq(pvReception.chantierId, chantiers.id))
    .orderBy(desc(chantiers.creeLe));
  const aTraiter = await compterATraiter(lignes.map((l) => l.c.id));
  const jour = aujourdhuiParis();

  const entetes = [
    "reference",
    "chantier",
    "statut",
    "client",
    "client_raison_sociale",
    "client_siren",
    "client_siret",
    "client_adresse",
    "chantier_adresse",
    "chantier_code_postal",
    "chantier_ville",
    "montant_ht",
    "debut_prevu",
    "fin_prevue",
    "reception_le",
    "pv_signe",
    "reserves_ouvertes",
    "retenue_liberable_le",
    "prochain_jalon",
    "prochain_jalon_date",
  ];
  const corps = lignes.map(({ c, e, pvSigneLe, pvDate }) => {
    const signe = pvSigneLe && pvDate ? pvDate : null;
    const reserves = aTraiter.get(c.id)?.reservesOuvertes ?? 0;
    const jalon = prochainJalon({ statut: c.statut, pvSigneLe: signe, reservesOuvertes: reserves }, jour);
    return [
      c.reference,
      c.nom,
      c.statut,
      c.client,
      e?.nom ?? null,
      e?.siren ?? null,
      e?.siret ?? null,
      e?.adresse ?? null,
      c.adresse,
      c.codePostal,
      c.ville,
      c.montantHt,
      c.debutPrevu,
      c.finPrevue,
      pvDate,
      signe ? "oui" : "non",
      reserves,
      signe ? garanties(signe).retenueLiberable : null,
      jalon?.libelle ?? null,
      jalon?.date ?? null,
    ];
  });

  journal("export_facturation", { compte: qui.id, lignes: corps.length });
  return new Response(versCsv(entetes, corps), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="groma-facturation-${jour}.csv"`,
      "Cache-Control": "private, no-store",
    },
  });
}
