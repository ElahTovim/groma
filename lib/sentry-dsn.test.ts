import { expect, it } from "vitest";
import { estUnDsn } from "./sentry-dsn";

it("reconnaît un DSN Sentry, et refuse une clé d'API ou un texte quelconque", () => {
  expect(estUnDsn("https://abc123@o4501234.ingest.de.sentry.io/4509876")).toBe(true);
  expect(estUnDsn("sntrys_eyJpYXQiOjE3")).toBe(false);
  expect(estUnDsn("")).toBe(false);
});
