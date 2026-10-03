import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";
import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { z } from "zod";
import { db } from "@/lib/db";
import { comptes } from "@/lib/db/schema";
import { journal } from "@/lib/journal";

const identifiants = z.object({
  email: z.string().trim().toLowerCase(),
  motDePasse: z.string().min(1),
});

export const { handlers, auth, signIn, signOut } = NextAuth({
  session: { strategy: "jwt" },
  pages: { signIn: "/connexion" },
  trustHost: true,
  providers: [
    Credentials({
      credentials: { email: {}, motDePasse: {} },
      async authorize(brut) {
        const lu = identifiants.safeParse(brut);
        if (!lu.success) return null;
        const { email, motDePasse } = lu.data;

        const [compte] = await db.select().from(comptes).where(eq(comptes.email, email)).limit(1);
        // Même réponse pour une adresse inconnue et un mauvais mot de passe.
        if (!compte || !(await bcrypt.compare(motDePasse, compte.motDePasseHash))) {
          journal("connexion_refusee", { email });
          return null;
        }
        journal("connexion", { compte: compte.id, role: compte.role });
        return { id: compte.id, email: compte.email, name: compte.nom, role: compte.role };
      },
    }),
  ],
  callbacks: {
    jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = user.role;
      }
      return token;
    },
    session({ session, token }) {
      session.user.id = token.id as string;
      session.user.role = token.role as "gerant" | "equipe" | "externe";
      return session;
    },
  },
});
