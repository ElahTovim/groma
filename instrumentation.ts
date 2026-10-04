import * as Sentry from "@sentry/nextjs";
import { dsnSentry } from "@/lib/sentry-dsn";

// Le suivi des erreurs côté serveur. Sans DSN valable, Sentry reste éteint et le
// produit fonctionne normalement ; /api/sante dit s'il est branché.
export async function register() {
  const dsn = dsnSentry();
  if (!dsn) return;
  Sentry.init({
    dsn,
    environment: process.env.VERCEL_ENV ?? "development",
    tracesSampleRate: 0,
  });
}

export const onRequestError = Sentry.captureRequestError;
