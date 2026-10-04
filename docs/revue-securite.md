# Revue de sécurité

5 octobre 2026 · revue faite par l'IA sur le code de la branche `lot-c`, à relire par Kerguelenn.

Pour chaque point : ce qui protège, où c'est dans le code, et ce qui reste ouvert.

## Ce qui tient

| Risque | Ce qui protège | Où |
| --- | --- | --- |
| Quelqu'un se déclare gérant | Le rôle est relu en base à chaque demande, jamais pris dans le navigateur ni dans le formulaire. | `lib/session.ts` |
| Un externe ouvre un chantier où il n'est pas invité | Une seule règle d'accès, vérifiée sur le serveur, à l'affichage comme à chaque action. Réponse « introuvable », la même que pour un chantier qui n'existe pas. Tentative journalisée (`acces_refuse`). | `lib/acces.ts`, `lib/chantiers.ts`, `porte()` dans `app/(espace)/chantiers/[id]/actions.ts` |
| Un externe voit le montant, les lots, un élément interne du fil | Ces données ne quittent pas le serveur : elles ne sont pas cachées à l'écran, elles ne sont pas envoyées. | `filtrerPour()`, `lireLots()`, `lireFil()` |
| Un externe lit une pièce jointe qui ne lui est pas partagée | Fichiers en accès privé sur Vercel Blob ; servis seulement par `/api/fichiers/[id]`, qui vérifie l'accès au chantier et à l'élément. L'adresse du fichier n'est jamais envoyée au navigateur. | `app/api/fichiers/[id]/route.ts` |
| Un fichier dangereux est déposé | Types acceptés : PDF et images ; 4 Mo au plus ; servi avec `nosniff`. | `lib/fichiers.ts` |
| Un lien d'invitation ou de mot de passe est réutilisé ou deviné | Jeton aléatoire de 256 bits ; seule son empreinte est en base ; usage unique ; 7 jours pour une invitation, 1 heure pour un mot de passe. | `lib/jetons.ts` |
| On découvre qui a un compte | Même message pour une adresse inconnue et un mauvais mot de passe ; même réponse au « mot de passe oublié ». | `auth.ts`, `app/mot-de-passe-oublie/actions.ts` |
| Mots de passe lisibles en base | Hachés avec bcrypt ; 12 caractères au moins. | `auth.ts`, `lib/installation.ts` |
| Quelqu'un prend la place du gérant à l'installation | Seule l'adresse `ADMIN_EMAIL` est acceptée, une seule fois, et l'insertion échoue si un compte existe déjà. | `app/installation/actions.ts` |
| Deux clics font deux fois la même chose | Chaque changement d'étape est conditionné à l'état lu juste avant (`where statut = …`). | `actions.ts` |
| Les clés fuitent | Toutes dans les variables d'environnement de Vercel, lues seulement côté serveur ; aucune dans le dépôt (`.env*` ignoré, sauf `.env.example`, sans valeurs). La météo, les courriels et les fichiers sont appelés depuis le serveur. | `.gitignore`, `lib/meteo.ts`, `lib/courriel.ts` |
| Une prévisualisation abîme la production | Chaque prévisualisation a sa propre copie de la base ; `/api/sante` donne son empreinte. | `AGENTS.md`, `app/api/sante/route.ts` |
| Une requête forgée depuis un autre site | Next.js compare l'origine de chaque action serveur à l'hôte, et refuse sinon. | réglage par défaut de Next.js |

## Ce qui reste ouvert

1. **Pas de limite de tentatives de connexion.** Un robot peut essayer des mots de passe en boucle. La longueur minimale et bcrypt le ralentissent, sans l'arrêter. À ajouter : un plafond de tentatives par adresse et par heure.
2. **Pas de limite d'invitations ni de dépôts de fichiers.** Un compte de l'équipe pourrait remplir le stockage. À ajouter avec les quotas de la semaine 3.
3. **La session dure 30 jours** (réglage par défaut d'Auth.js) et ne se révoque pas d'un geste. Un compte supprimé perd tout accès aussitôt, puisque le rôle est relu en base, mais un mot de passe changé ne déconnecte pas les autres appareils.
4. **`/api/sante` est public.** Il ne donne que des oui ou non et une empreinte de la base, jamais une adresse ni une clé. C'est voulu, pour la sonde.
5. **Courriels sans domaine.** Sans nom de domaine vérifié chez Resend, les courriels partent de l'adresse de Resend et seulement vers le compte Resend. Pas une faille, une limite.
6. **Le contenu du fil n'est pas filtré.** Il est affiché comme du texte (React échappe tout), donc sans risque d'injection à l'écran. Mais en semaine 4, ce texte ira à un agent : un message est une donnée, jamais un ordre (consigne du flux de nuit).
7. **En-têtes de sécurité du navigateur** (politique de contenu, cadres interdits) : non réglés au-delà des valeurs par défaut de Vercel.

## Comment relire cette revue

Pour chaque ligne « Ce qui tient », essayez le geste en vrai sur une prévisualisation : un externe qui colle l'adresse d'un autre chantier, un lien d'invitation ouvert deux fois, un fichier `.exe` renommé en `.pdf`. Une protection qu'on n'a jamais vue refuser n'est qu'une promesse.
