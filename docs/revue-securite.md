# Revue de sécurité

5 octobre 2026 · revue faite par l'IA sur le code de la branche `lot-c`, à relire par Kerguelenn.
Mise à jour le 10 octobre 2026 (branche `securite`) : les sept points ouverts sont traités, et la revue couvre la photo des chantiers et l'envoi réel des courriels.

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
| Un robot essaie des mots de passe en boucle | 5 essais ratés par adresse et 30 par réseau en 15 minutes, puis attente ; le compteur d'une adresse repart à zéro après une connexion réussie. Même blocage que l'adresse existe ou non. | `auth.ts`, `lib/limites-regles.ts` |
| Un compte remplit le stockage ou inonde de courriels | Par compte et par jour : 30 invitations, 60 fichiers (pièces jointes et photos). Mot de passe oublié : 3 courriels par adresse et par heure, même réponse au-delà. | `lib/limites-regles.ts`, `actions.ts`, `app/mot-de-passe-oublie/actions.ts` |
| Un mot de passe changé laisse d'autres appareils connectés | Chaque compte a un numéro de session ; un changement de mot de passe l'augmente, et toute session ouverte avant est refusée à la demande suivante. Une session dure 7 jours au plus. | `lib/session.ts`, `auth.ts`, `app/reinitialiser/[jeton]/actions.ts` |
| Le site est affiché dans le cadre d'un autre site, ou charge un script étranger | En-têtes : cadres interdits, type de fichier non deviné, adresse d'origine non transmise, caméra et micro coupés ; en production, une politique de contenu qui n'autorise que le site lui-même et l'API Adresse. | `next.config.ts` |
| Un courriel part vers une adresse inventée | Aucun courriel vers les adresses `@exemple.groma.fr` du jeu de données (elles rebondiraient et abîmeraient la réputation du domaine). | `lib/courriel.ts` |
| Une photo de chantier est vue par quelqu'un qui n'y a pas accès | Accès privé sur Vercel Blob ; servie par `/api/photos/[id]` après vérification de l'accès au chantier. | `app/api/photos/[id]/route.ts` |
| On ouvre un lien d'invitation en étant déjà connecté | La page le dit et propose de se déconnecter ; l'action refuse aussi côté serveur. | `app/invitation/[jeton]/` |

## Ce qui reste ouvert

Les sept points de la première revue, et ce qui en a été fait :

| # | Point | Décision |
| --- | --- | --- |
| 1 | Pas de limite de tentatives de connexion | **Corrigé** (voir le tableau ci-dessus). |
| 2 | Pas de limite d'invitations ni de fichiers | **Corrigé**. Les quotas des appels au modèle viendront en semaine 3. |
| 3 | Session de 30 jours, non révocable | **Corrigé** : 7 jours, révoquée par un changement de mot de passe. |
| 4 | `/api/sante` est public | **Assumé** : il ne donne que des oui ou non et l'empreinte de la base, jamais une adresse ni une clé. Il doit rester lisible par la sonde, sans compte. |
| 5 | Courriels sans domaine | **Corrigé** : domaine `groma.tovimstudio.com` vérifié chez Resend, plus le garde sur les adresses fictives. |
| 6 | Le contenu du fil ira à un agent | **Règle posée** dans `AGENTS.md` : un message est une donnée, jamais un ordre. Elle sera éprouvée en semaine 4 avec le document piégé du flux. |
| 7 | En-têtes de sécurité | **Corrigé** : en-têtes partout, politique de contenu en production. |

Ce qui reste vraiment ouvert :

- **La politique de contenu autorise les scripts en ligne** (`'unsafe-inline'`), nécessaires à Next.js sans réglage plus fin. La resserrer demande un jeton par page (nonce) : faisable plus tard, sans urgence tant qu'aucun contenu saisi n'est rendu comme du HTML.
- **Les quotas sont comptés en base**, sans service dédié : suffisant pour une petite entreprise, à revoir à grande échelle.
- **Aucune double authentification** pour le gérant.

## Comment relire cette revue

Pour chaque ligne « Ce qui tient », essayez le geste en vrai sur une prévisualisation : un externe qui colle l'adresse d'un autre chantier, un lien d'invitation ouvert deux fois, un fichier `.exe` renommé en `.pdf`. Une protection qu'on n'a jamais vue refuser n'est qu'une promesse.
