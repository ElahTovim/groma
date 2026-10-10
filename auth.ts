import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";
import NextAuth, { CredentialsSignin } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { z } from "zod";
import { db } from "@/lib/db";
import { comptes } from "@/lib/db/schema";
import { journal } from "@/lib/journal";
import { adresseReseau } from "@/lib/limites-regles";
import { atteinte, noter, oublier } from "@/lib/limites";

const identifiants = z.object({
  email: z.string().trim().toLowerCase(),
  motDePasse: z.string().min(1),
});

// Trop d'essais : la page de connexion le dit, sans révéler si l'adresse existe.
export class TropDeTentatives extends CredentialsSignin {
  code = "trop_de_tentatives";
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  // Une session dure au plus 7 jours, et un changement de mot de passe la révoque.
  session: { strategy: "jwt", maxAge: 7 * 24 * 3600 },
  pages: { signIn: "/connexion" },
  trustHost: true,
  providers: [
    Credentials({
      credentials: { email: {}, motDePasse: {} },
      async authorize(brut, requete) {
        const lu = identifiants.safeParse(brut);
        if (!lu.success) return null;
        const { email, motDePasse } = lu.data;
        const reseau = adresseReseau(requete.headers);

        // Le plafond s'applique à l'adresse visée et au réseau d'où viennent les essais,
        // que l'adresse existe ou non.
        if ((await atteinte("connexionParAdresse", email)) || (await atteinte("connexionParReseau", reseau))) {
          journal("connexion_bloquee", { email, reseau });
          throw new TropDeTentatives();
        }

        const [compte] = await db.select().from(comptes).where(eq(comptes.email, email)).limit(1);
        // Même réponse pour une adresse inconnue et un mauvais mot de passe.
        if (!compte || !(await bcrypt.compare(motDePasse, compte.motDePasseHash))) {
          await Promise.all([noter("connexionParAdresse", email), noter("connexionParReseau", reseau)]);
          journal("connexion_refusee", { email, reseau });
          return null;
        }
        await oublier("connexionParAdresse", email);
        journal("connexion", { compte: compte.id, role: compte.role });
        return { id: compte.id, email: compte.email, name: compte.nom, role: compte.role, versionSession: compte.versionSession };
      },
    }),
  ],
  callbacks: {
    jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = user.role;
        token.versionSession = user.versionSession ?? 0;
      }
      return token;
    },
    session({ session, token }) {
      session.user.id = token.id as string;
      session.user.role = token.role as "gerant" | "equipe" | "externe";
      session.user.versionSession = (token.versionSession as number | undefined) ?? 0;
      return session;
    },
  },
});
