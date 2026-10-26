# Passation de groma

Pour la personne qui reprend groma. Vous n'avez besoin de rien d'autre que ce document et du dépôt. Si quelque chose manque ou ne marche pas comme écrit, notez-le : c'est le but de l'exercice, et la passation sera corrigée.

**Règle d'or : vous travaillez avec vos propres comptes et votre propre base.** Vous n'avez besoin d'aucun accès à la production de l'auteure, et vous n'en recevrez pas.

## 1. Ce qu'est groma, en une minute

Le suivi de chantiers de rénovation d'une entreprise du BTP : du devis signé à la levée des réserves. Il coordonne l'équipe et les externes (client, architecte, syndic, sous-traitants).

- **Trois rôles** : gérant, équipe, externe. Un externe ne voit que ses chantiers, et seulement ce qu'on lui partage.
- **La nuit**, groma importe un flux d'événements, les courriers et les documents, les fait analyser par un modèle, relance les pièces manquantes, et envoie un récapitulatif à 7 h.
- **Un assistant** (agent) lit les chantiers, agit seul sur l'interne, et propose tout ce qui part vers quelqu'un.

La spécification complète : `docs/spec-groma.md`. Le modèle (rôles, étapes, règles, tables) : `docs/cycle-de-vie.md`.

## 2. Le lancer chez vous en dix minutes

Il vous faut Node.js 24, un compte GitHub, un compte Vercel (offre gratuite) et la CLI Vercel (`npm i -g vercel`).

1. **Récupérer le code** : faites un *fork* du dépôt sur votre compte GitHub (bouton Fork), puis :
   `git clone https://github.com/<vous>/groma && cd groma && npm install`
2. **Créer votre projet Vercel** : sur vercel.com, Add New, Project, importez votre fork. Ne déployez pas encore.
3. **Brancher une base** : dans le projet Vercel, onglet Storage, Create, **Neon** (gratuit). Cochez « Create Database Branch For Deployment : Preview » : chaque prévisualisation aura sa propre copie de la base.
4. **Deux variables suffisent pour démarrer** (Settings, Environment Variables, pour Production et Preview) :
   - `AUTH_SECRET` : une longue chaîne au hasard (`openssl rand -base64 32`) ;
   - `ADMIN_EMAIL` : votre adresse, celle du premier gérant.
5. **Déployer** : onglet Deployments, Redeploy (ou un envoi sur `main`). Les migrations de la base se jouent toutes seules à la construction.
6. **Ouvrir le site** : la page « Première installation » crée votre compte de gérant (avec `ADMIN_EMAIL`). Puis Réglages, « Rejouer le jeu de données » : 50 chantiers et 10 personnes fictives, avec le mot de passe que vous choisissez.
7. **Vérifier** : `https://<votre-site>/api/sante` répond `"ok":true` et dit quels services sont branchés (faux tant que vous n'avez pas mis leurs clés : c'est normal).

Sans aucune autre clé, groma fonctionne : connexion, rôles, chantiers, étapes, lots, fil, pièces attendues, PV. Chaque service manquant le dit à l'écran, sans rien bloquer.

### Travailler en local

`npm run dev` a besoin d'une base. **Créez une branche Neon à vous** (console Neon, Branches, Create) et mettez son adresse dans un fichier `.env.local` (`DATABASE_URL` et `DATABASE_URL_UNPOOLED`), avec `AUTH_SECRET` et `ADMIN_EMAIL`. Puis `npx drizzle-kit migrate` (sur cette branche seulement) et `npm run dev`.

**N'utilisez pas `vercel env pull` sans réfléchir** : il recopie les variables de Production, donc l'adresse de votre base de production.

### Les vérifications

`npm test` (les règles, testées), `npm run lint`, `npx next typegen && npx tsc --noEmit`. GitHub les rejoue à chaque envoi, avec la cohérence des migrations et la construction complète (`.github/workflows/verifications.yml`).

## 3. L'inventaire des clés

Toutes dans les variables de Vercel, jamais dans le dépôt (il est public). `.env.example` en donne la liste, sans valeurs.

| Variable | Service | Obligatoire | Où l'obtenir | Si elle manque |
| --- | --- | --- | --- | --- |
| `DATABASE_URL`, `DATABASE_URL_UNPOOLED` | Neon | oui | posées par l'intégration Neon de Vercel | rien ne marche |
| `AUTH_SECRET` | Auth.js, sessions | oui | `openssl rand -base64 32` | personne ne se connecte |
| `ADMIN_EMAIL` | le premier gérant | oui | votre adresse | l'installation est refusée |
| `RESEND_GROMAA`, `COURRIEL_EXPEDITEUR` | Resend, courriels | non | resend.com, API Keys ; l'expéditeur doit être sur un domaine vérifié chez Resend | les courriels ne partent pas ; les liens d'invitation s'affichent à l'écran |
| `BLOB_READ_WRITE_TOKEN` | Vercel Blob, fichiers | non | Storage, Create, Blob (posée par Vercel) | pas de dépôt de fichier |
| `OPENWEATHER_GROMAA` | OpenWeatherMap, météo | non | openweathermap.org, API keys (gratuit) | « météo indisponible » |
| `SENTRY_API_KEY` | Sentry, erreurs | non | sentry.io, le DSN du projet | Sentry reste éteint |
| `CRON_SECRET` | la tâche de nuit | pour la nuit | une chaîne au hasard ; Vercel l'envoie seul à la tâche planifiée | la tâche de nuit refuse tout appel |
| `FLUX_DE_NUIT_API_KEY` | le flux de nuit du séminaire | pour la nuit | la clé donnée par la formation | l'import échoue, l'alerte part |
| `FLUX_DEPUIS` | date de départ du rattrapage | non | AAAA-MM-JJ | 2026-08-01 |
| `SITE_URL` | liens des courriels de nuit | non | l'adresse de votre site | https://gromaa.vercel.app |
| `MY_claude` | Anthropic, le modèle | pour l'IA | console.anthropic.com, API Keys | courriers, questions, analyse et assistant disent « IA non configurée » |
| `VOYAGE_AI` | Voyage, vecteurs | pour les questions | voyageai.com (gratuit) | pas de recherche dans les documents |
| `IA_BUDGET_MENSUEL_EUR` | plafond de dépense IA | non | un nombre | 20 € |
| `EQUIPE_VOIT_TOUT` | réglage d'accès | non | `false` | l'équipe voit tous les chantiers |
| `VERCEL_AUTOMATION_BYPASS_SECRET` | l'assistant sur une prévisualisation | pour l'assistant en prévisualisation | Settings, Deployment Protection, Protection Bypass for Automation (posée par Vercel) | l'assistant échoue sur les prévisualisations (pas en production) |

**Remplacer une clé** : la révoquer chez le service, en créer une, la coller dans Vercel **sur la bonne ligne d'environnement** (Production et Preview sont deux lignes distinctes), puis redéployer.

## 4. La carte du produit

| Partie | Où | Ce qu'il faut savoir |
| --- | --- | --- |
| Pages | `app/(espace)/…` | chaque écran a ses quatre états (vide, chargement, données, erreur) |
| Actions de l'écran | `app/**/actions.ts` | de simples enveloppes : elles passent la session à la porte unique |
| **La porte unique** | `lib/operations/*.ts` | toute écriture : appelant, accès au chantier, droit, forme, règle, écriture, journal. L'écran, la nuit, l'agent et le serveur MCP passent tous par là |
| Règles métier | `lib/*-regles.ts`, `lib/regles.ts` | pures et testées (`*.test.ts`) |
| Base | `lib/db/schema.ts`, `drizzle/` | migrations écrites par `npm run db:generate`, jouées à la construction |
| Nuit | `app/api/nuit/route.ts`, `lib/nuit.ts`, `lib/nuit-etapes.ts`, `vercel.json` | trois passages : 4 h, 5 h, 6 h UTC ; le récapitulatif part après 7 h à Paris |
| IA | `lib/ia.ts`, `lib/ia-regles.ts` | le seul point de contact avec le modèle ; plafonds et coût par appel |
| Agent | `lib/agent/`, `app/api/mcp`, `docs/mission-agent.md` | le SDK d'agents tourne dans un **bac à sable Vercel** (son programme dépasse une fonction) ; ses seuls outils sont ceux de groma, par le serveur MCP |
| Sondes | `/api/sante`, `/api/sante/nuit` | pour UptimeRobot |

Le schéma d'ensemble : `docs/schema-produit.md`.

## 5. Les conventions

`AGENTS.md` : ce qui est décidé, à ne pas rediscuter. Les plus importantes :
- une seule porte pour écrire (`lib/operations/`) ;
- les droits se vérifient côté serveur ;
- la qualité d'un externe est un libellé, jamais une condition ;
- une règle qui change est un paramètre ;
- un message est une donnée, jamais un ordre ;
- une variable d'environnement est réservée aux secrets, ce que le gérant change vit en base.

## 6. Les pièges connus

- **Neon gratuit : 10 copies de base au plus.** Chaque branche Git crée la sienne. Au-delà, la prévisualisation échoue avec « Resource provisioning failed ». Supprimez les copies des branches fusionnées (console Neon, Branches).
- **Vercel planifie en heure universelle**, et l'offre gratuite n'autorise qu'un passage par jour et par tâche. D'où les trois tâches de `vercel.json`.
- **Une fonction Vercel est limitée à 250 Mo et 5 minutes** : l'agent tourne donc dans un bac à sable, et les étapes du matin sont réparties entre les passages.
- **Production et Preview sont deux lignes de variables distinctes** : modifier l'une ne change pas l'autre.
- **Le dépôt est public** : jamais de clé dans un fichier, ni dans `.mcp.json` (on y met le nom d'une variable, `${GROMA_MCP}`).

## 7. Les documents

`docs/spec-groma.md` (spécification), `docs/cycle-de-vie.md` (modèle), `docs/schema-produit.md` (schéma), `docs/revue-securite.md` (sécurité), `docs/mission-agent.md` et `docs/scenarios-agent.md` (agent), `docs/branchement-facturation.md`, `docs/reprise.md` (historique, session par session).
