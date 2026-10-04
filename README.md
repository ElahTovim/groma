# groma

Suivi de chantiers de rénovation pour une entreprise du BTP : de la signature du devis à la levée des réserves, avec la coordination entre l'équipe et les externes (client, architecte, ingénieur, syndic, fournisseur).

En ligne : https://gromaa.vercel.app

## Ce que fait le produit

- **Trois rôles.** Le gérant voit tout. L'équipe fait tourner les chantiers. Un externe ne voit que les chantiers où on l'a invité, et dans le fil seulement ce qu'on lui a partagé.
- **Un chantier** suit les étapes devis, signé, planifié, en cours, réception, clos (ou annulé). Chaque étape a ses conditions ; un refus dit pourquoi.
- **Des lots** (carrelage, électricité…), avec leurs retards calculés.
- **Un fil** par chantier : messages, demandes, disponibilités, documents avec pièce jointe, signalements. Tout est interne par défaut ; « Qui voit ça ? » partage au cas par cas.
- **La règle phare** : pas de clôture tant qu'un signalement est à qualifier ou qu'une réserve est ouverte.
- **La météo** des trois prochains jours sur chaque chantier.
- **Des invitations** par lien à usage unique, et le mot de passe oublié.

Le modèle complet : `docs/cycle-de-vie.md`. L'architecture : `docs/schema-produit.md`. Les conventions de travail : `AGENTS.md`.

## Lancer le projet en dix minutes

Il faut Node.js 24, un compte Vercel et la CLI Vercel (`npm i -g vercel`).

1. `git clone https://github.com/ElahTovim/groma && cd groma && npm install`
2. Relier le projet à Vercel : `vercel link` (équipe `elah-s-projects`, projet `groma`).
3. Récupérer les variables : `vercel env pull .env.local`. **Attention** : ce fichier pointe vers la base de production. Pour travailler sans risque, créez une branche Neon depuis le tableau de bord et mettez son adresse dans `DATABASE_URL` et `DATABASE_URL_UNPOOLED`.
4. `npm run dev`, puis ouvrir http://localhost:3000.
5. Base vide : la page « Première installation » crée le compte du gérant (adresse `ADMIN_EMAIL`). Ensuite, Réglages, « Rejouer le jeu de données » : 50 chantiers et 10 personnes fictives.

Les migrations se jouent toutes seules à chaque construction sur Vercel. En local, `npx drizzle-kit migrate` les joue sur la base de `.env.local` : à ne jamais lancer sur la production.

## Les commandes

| Commande | Ce qu'elle fait |
| --- | --- |
| `npm run dev` | lance le site en local |
| `npm test` | joue les tests (règles métier, accès, formulaires, jeu de données, météo, fichiers) |
| `npm run lint` | relit le code |
| `npm run db:generate` | écrit une migration après un changement de `lib/db/schema.ts` |

GitHub rejoue lecture, types et tests à chaque envoi (`.github/workflows/verifications.yml`).

## Les variables d'environnement

Toutes vivent dans Vercel (Settings, Environment Variables). Aucune dans le dépôt. Les noms sont dans `.env.example`.

| Variable | Service | Si elle manque |
| --- | --- | --- |
| `DATABASE_URL`, `DATABASE_URL_UNPOOLED` | Neon, posées par l'intégration | rien ne marche |
| `AUTH_SECRET` | signe les sessions | personne ne se connecte |
| `ADMIN_EMAIL` | l'adresse du premier gérant | l'installation est refusée |
| `RESEND_GROMAA` | Resend, courriels | les courriels ne partent pas, les liens d'invitation s'affichent quand même |
| `OPENWEATHER_GROMAA` | OpenWeatherMap, météo | « météo indisponible », le reste fonctionne |
| `BLOB_READ_WRITE_TOKEN` | Vercel Blob, pièces jointes | dépôt de document impossible |
| `SENTRY_API_KEY` (ou `SENTRY_DSN`) | Sentry, suivi des erreurs ; doit contenir le DSN du projet | Sentry reste éteint |
| `EQUIPE_VOIT_TOUT` | `false` pour que l'équipe ne voie que ses chantiers | l'équipe voit tout |

`/api/sante` dit, sans rien révéler, si la base répond et quels services sont branchés.

**Remplacer une clé** (par exemple après une fuite) : la révoquer chez le service, en créer une nouvelle, la coller dans Vercel à la place de l'ancienne, puis redéployer (`vercel --prod` ou un envoi sur `main`).

## Où modifier quoi

| Pour changer | Aller dans |
| --- | --- |
| une étape du chantier ou sa condition | `lib/regles.ts` et ses tests `lib/regles.test.ts` |
| qui voit quoi | `lib/acces.ts` et `voitElement()` dans `lib/regles.ts` |
| une table | `lib/db/schema.ts`, puis `npm run db:generate` |
| les seuils d'alerte météo | `SEUILS` dans `lib/meteo.ts` |
| le jeu de données fictif | `lib/jeu-de-donnees.ts` |
| un libellé | `lib/chantier-forme.ts`, `lib/libelles.ts` |

## Sécurité

Voir `docs/revue-securite.md` : ce qui protège, où, et ce qui reste ouvert.
