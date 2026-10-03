// Une ligne JSON par événement, lisible dans les journaux Vercel.
// Chercher par exemple "connexion_refusee" pour retrouver une tentative.
export function journal(evenement: string, donnees: Record<string, unknown> = {}) {
  console.info(JSON.stringify({ evenement, ...donnees, a: new Date().toISOString() }));
}
