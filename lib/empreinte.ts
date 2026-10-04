import { createHash } from "node:crypto";

// L'empreinte d'un jeton : on ne garde qu'elle en base, jamais le jeton.
export function empreinte(jeton: string): string {
  return createHash("sha256").update(jeton).digest("hex");
}
