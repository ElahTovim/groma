// L'adresse de suivi Sentry (le « DSN ») : https://<clé>@<hôte>/<numéro de projet>.
// Lue dans SENTRY_DSN, ou dans SENTRY_API_KEY, le nom choisi dans Vercel.
export function dsnSentry(): string | undefined {
  const v = (process.env.SENTRY_DSN ?? process.env.SENTRY_API_KEY ?? "").trim();
  return estUnDsn(v) ? v : undefined;
}

export function estUnDsn(v: string): boolean {
  return /^https:\/\/[^@\s]+@[^/\s]+\/\d+$/.test(v);
}
