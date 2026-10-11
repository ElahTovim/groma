export function euros(montant: string | null | undefined): string {
  if (montant === null || montant === undefined) return "—";
  return new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(Number(montant));
}

// Un montant arrondi pour les grands chiffres : « 845 k € », « 1,2 M € ». Le montant
// exact reste dans la fiche et pour les lecteurs d'écran.
export function eurosCourt(montant: number): string {
  return new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR", notation: "compact", maximumFractionDigits: 1 }).format(montant);
}

export function dateCourte(iso: string | null): string {
  if (!iso) return "—";
  return new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "short", year: "numeric" }).format(new Date(iso));
}
