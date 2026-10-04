<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# Conventions du projet

À lire au début de chaque session. Ce qui est écrit ici est décidé : ne pas le redemander.

## Le produit

Suivi de chantiers de rénovation pour une entreprise du BTP : de la signature du devis à la levée des réserves, avec la coordination entre l'équipe et les externes (client, architecte, ingénieur, syndic, fournisseur).

Le modèle complet (rôles, statuts, transitions, règles, tables) est dans `docs/cycle-de-vie.md`. C'est la référence : un écart entre le code et ce document est un bogue, ou une décision à faire valider puis à reporter dans le document.

Production : https://gromaa.vercel.app (aussi groma-coral.vercel.app ; `groma.vercel.app`, avec un seul a, appartient à un autre projet).

Construit dans le cadre d'un séminaire en cinq semaines : consignes dans `docs/consignes/`. Sujet du flux de nuit : `chantiers`.

## Qui fait quoi

- Kerguelenn pilote et ne lit pas le code. Tout s'explique en français, avec des mots, sans jargon non défini.
- L'IA code, teste, déploie, corrige.
- Kerguelenn décide de chaque fusion dans `main` après avoir essayé la prévisualisation.

## La stack (imposée, ne pas proposer d'alternative)

Next.js sur Vercel (équipe `elah-s-projects`, offre Hobby), dépôt GitHub (compte `ElahTovim`), Postgres sur Neon, Auth.js pour les comptes et les rôles, Resend pour les courriels, Vercel Blob pour les fichiers, shadcn/ui pour l'interface, UptimeRobot pour la sonde, Sentry pour les erreurs. API externes : OpenWeatherMap et Sirene (INSEE), avec clé ; API Adresse sans clé. À partir de la semaine 3, API Anthropic ; semaine 4, SDK d'agents.

## Les règles d'architecture

- **Une seule porte.** Toute écriture en base passe par une action serveur qui, dans cet ordre : identifie l'appelant et son rôle, vérifie qu'il participe au chantier, valide la forme, applique la règle métier, écrit, journalise. L'écran, la tâche de nuit, l'agent, le serveur MCP et l'API passeront tous par là. Jamais d'écriture ailleurs.
- **Les droits se vérifient côté serveur.** Masquer un bouton n'est pas un droit.
- **Tout accès à un chantier passe par la table des participants**, pour l'équipe comme pour les externes.
- **La qualité d'un externe (client, syndic…) est un libellé, jamais une condition dans le code.** Pas de `si qualité = client alors…`.
- **Une règle qui peut changer est un paramètre**, pas une valeur en dur.
- **Chaque écran a ses quatre états** : vide, chargement, données, erreur. Chaque action donne un retour visible.
- **Une API externe qui ne répond pas ne bloque rien** : l'écran le dit et reste utilisable.
- Ne jamais écrire l'authentification à la main : Auth.js.

## Secrets et données

- Aucun secret dans le dépôt, le navigateur ni le chat. Les clés vivent dans les variables d'environnement de Vercel, et en local dans `.env.local`, jamais commité. `.env.example` liste les noms des variables, sans valeurs.
- Aucune donnée de vraie personne, nulle part. Le jeu de données est fictif, généré par un script rejouable.

## La boucle, pour chaque fonctionnalité

1. Ce qu'on veut en dix lignes, avec les cas limites et ce qui est hors périmètre.
2. L'écran et ses états.
3. Un plan en tranches vérifiables, corrigé par Kerguelenn.
4. Une tranche à la fois, sur sa branche. Une version enregistrée (commit) avant chaque génération, avec un message qui dit pourquoi.
5. Chaque tranche apporte sa preuve : un test qui passe, et une prévisualisation où Kerguelenn fait le geste.
6. Raconter en français ce qui a changé et pourquoi. Ne rien ajouter au-delà de la demande.
7. Fusion par Kerguelenn, vérification en production.
8. État de reprise.

On ne teste jamais sur la production. Trois correctifs sans progrès : on s'arrête, on revient à la dernière version qui marchait, on redécoupe.

## Les tests

Écrits par l'IA, rejoués à chaque push. Pour chaque test, savoir dire en une phrase ce qu'il vérifie. La règle de clôture se teste sur trois cas : normal, vide, piégé.

## État de reprise

Chaque session se termine par une mise à jour de `docs/reprise.md`, en trois rubriques : fait, reste, cassé.
