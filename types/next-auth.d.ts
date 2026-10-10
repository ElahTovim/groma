import type { DefaultSession } from "next-auth";

type Role = "gerant" | "equipe" | "externe";

declare module "next-auth" {
  interface User {
    role?: Role;
    versionSession?: number;
  }
  interface Session {
    user: { id: string; role: Role; versionSession: number } & DefaultSession["user"];
  }
}
