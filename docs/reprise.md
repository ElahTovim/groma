# État de reprise

## 10 octobre 2026 (branche `interface-2`, en prévisualisation)

**Fait**
- Audit de l'interface (`docs/audit-interface.md`, captures dans `docs/audit/`).
- Direction visuelle choisie par Kerguelenn : noir et blanc, sans couleur ; les états se lisent par la forme (plein, contour, pointillé) et le texte. Les images viendront ensuite, de Kerguelenn.
- Les 4 défauts corrigés : police (Geist au lieu de Times), débordement des noms, étape impossible proposée (blocages affichés avant le clic, un seul refus), cibles de 44 px sur téléphone.
- Changements de structure : onglets par statut avec compteurs et onglet « À traiter » ; colonne « À traiter » et tri par urgence ; fiche dans l'ordre du terrain ; en-tête sur une ligne avec menu du compte ; fil à boutons directs ; « Interne » ou « Partagé avec » en clair ; gestes mis en avant pour l'externe ; adresse avec suggestions (API Adresse).
- Place pour les images : photo de chantier privée (bandeau de la fiche, vignette de la liste, `/api/photos/[id]`) ; aperçu des photos jointes dans le fil ; image d'accueil de la connexion (`public/images/accueil.jpg`, voir `public/images/LISEZ-MOI.md`).
- Vérifié par captures sur la prévisualisation, ordinateur et téléphone, gérant et externe, y compris l'envoi d'une photo.

**Reste**
- Kerguelenn essaie, puis fusion.
- Figma : reporter la nouvelle structure dans les wireframes, puis l'import.
- Images : déposer `public/images/accueil.jpg` et les photos des chantiers.

**Cassé**
- Rien de connu.

## 5 octobre 2026, nuit (lot C fusionné : demande n° 5, en production)

**Fait**
- Météo : adresse géolocalisée à la création (API Adresse), ou à la première ouverture de la fiche ; trois jours de prévisions OpenWeatherMap (`OPENWEATHER_GROMAA`), alertes gel, pluie, vent ; panne sans blocage. Vérifié sur la prévisualisation avec la vraie clé.
- Invitations par lien à usage unique (`jetons`, empreinte seulement), courriel Resend quand c'est possible, lien affiché sinon ; page `/invitation/[jeton]`.
- Mot de passe oublié (`/mot-de-passe-oublie`, `/reinitialiser/[jeton]`, une heure).
- Alertes au gérant par courriel : nouveau devis, signé, réception, annulé.
- Pièces jointes privées sur Vercel Blob (`groma-fichiers`, accès privé), servies par `/api/fichiers/[id]` après vérification des droits.
- Sentry côté serveur (`instrumentation.ts`), bouton d'erreur de test dans Réglages, état dans `/api/sante`.
- `docs/revue-securite.md`, README.
- 63 tests.

**Reste**
- Sentry branché en production (DSN corrigé dans `SENTRY_API_KEY`) : faire l'erreur de test depuis Réglages.
- Une prévisualisation relancée à la main depuis le tableau de bord Vercel a utilisé la base de production (empreinte `b2017901`). N'essayer que sur les prévisualisations de branche (`groma-git-<branche>-…`), et vérifier l'empreinte dans `/api/sante`.
- Avant la démo : rejouer le jeu de données en production (Réglages).
- Mis de côté par Kerguelenn : Sirene, UptimeRobot.

**Cassé**
- Rien de connu.

## 5 octobre 2026, nuit (lot B fusionné : demande n° 4, en production)

**Fait**
- Tranche 6 : tables `lots` et `fil` ; étapes du chantier avec refus motivés (`lib/regles.ts`) ; règle de clôture testée sur les trois cas ; pas de pose sans livraison ; retards calculés ; fil chronologique à six types, interne par défaut, partage par « Qui voit ça ? » ; qualification des signalements ; annulation avec motif ; bouton de l'étape suivante fixé sous le pouce sur téléphone.
- Jeu de données enrichi : lots (dont en retard), fil, réceptions bloquées par un signalement.
- Vérifié sur la prévisualisation : rejeu du jeu de données, fiches en réception rendues sans erreur avec lots, fil, signalements et « Qui voit ça ? ». Non vérifié par l'IA : les clics (étapes, partage, qualification), faute de pouvoir appeler les actions depuis le terminal.
- 49 tests.

**Reste**
- Un document du fil n'a pas encore de fichier : il arrive avec la tranche des pièces jointes (Vercel Blob).
- Les alertes au gérant (devis signé, réception, annulation) sont notées dans le journal (`alerte_gerant`) ; le courriel part avec la tranche Resend.
- Clés Resend et OpenWeatherMap : en place en Production et en Preview, sous `RESEND_GROMAA` et `OPENWEATHER_GROMAA`. Prochaines tranches : invitations et alertes (Resend), météo.

**Cassé**
- Rien de connu.

## 4 octobre 2026, nuit (filet et lot A, fusionnés : demande n° 3)

**Fait**
- Tranche 1, le filet : vérifications GitHub à chaque envoi (lecture, types, tests) ; une base Neon distincte par prévisualisation (réglage « Create Database Branch For Deployment : Preview ») ; migrations jouées par Vercel à chaque construction (`vercel.json`) ; page `/api/sante` qui donne l'empreinte de la base utilisée.
- Lot A, en production : tables `chantiers` et `participants` ; règle d'accès unique (`lib/acces.ts`, réglage `EQUIPE_VOIT_TOUT`) ; rôle relu en base à chaque demande ; liste filtrable, fiche, formulaire « Nouveau chantier », états vide, chargement, erreur ; jeu de données fictif rejouable depuis Réglages (50 chantiers, 10 personnes ; le gérant tape le mot de passe des comptes fictifs au moment du rejeu) ; filtres immédiats sur la liste ; `acces_refuse` dans le journal.
- 25 tests.

**Reste**
- En production, la base n'a pas encore de chantiers : rejouer le jeu de données depuis Réglages avant la démo.
- Lot B : invitations (Resend) et mot de passe oublié, lots, fil avec « Qui voit ça ? », étapes du chantier et règle de clôture, pièces jointes.
- Lot C : météo et Sirene, Sentry, UptimeRobot, revue de sécurité, README.
- Figma : type « message », fil chronologique, débordement « Vu par ».

**Cassé**
- Rien.

## 4 octobre 2026, soir (branche `interface`)

**Fait**
- Trois décisions de Kerguelenn reportées dans `docs/cycle-de-vie.md` et `docs/brief-maquettes.md` : montant HT interne sur le chantier ; chaque élément du fil est partagé au cas par cas, coché dans une fenêtre « Qui voit ça ? » ; les lots et leurs retards restent internes.
- Rendus semaine 1 : `docs/spec-fiche-chantier.md` (spécification d'une page) et `docs/schema-produit.md` (schéma du produit, trajet du clic à la base).

- Wireframes Figma mis à jour selon les trois décisions : section 08 « Qui voit ça ? » (7 états), ligne « Vu par : … » et bouton sur chaque élément du fil, vue externe sans lots ni retards ni montant, liste vue par un externe, champ « Montant du devis HT » (interne) au formulaire de création.

- Écarts tranchés par Kerguelenn et reportés dans la spécification, le modèle et le brief : bouton de l'étape suivante en bas sous le pouce sur téléphone, en haut sur ordinateur ; fil chronologique, le plus récent en bas ; nouveau type « message » (texte libre) dans le fil, pour prévenir un externe d'un retard.
- Branche `interface` fusionnée dans `main`.

**Reste**
- Figma (à faire dans une session qui a accès à Figma, ou à la main) : ajouter le type « message » au menu « Ajouter au fil » et à un exemple du fil ; vérifier que le fil est bien chronologique partout ; corriger le débordement des lignes « Vu par » (ci-dessous). Puis l'étape style.
- Libellés « Déclarer la réception » et « Retenir comme réserve » : à confirmer par Kerguelenn selon le vocabulaire du terrain.
- Sur `main` : base distincte par prévisualisation, tests rejoués à chaque push, chantiers et participants.

**Cassé**
- Figma, fiche bureau (section 03) : les deux lignes « Vu par » du fil dépassent à droite de leur carte. Correctif d'une minute à la main : sélectionner les deux calques « Qui voit ça » et régler la largeur sur « Fill container ». La limite d'appels Figma de l'offre Starter a été atteinte avant le correctif.

## 4 octobre 2026, après-midi (branche `interface`)

**Fait**
- Wireframes en niveaux de gris dans Figma, fichier « Groma — Wireframes » : https://www.figma.com/design/pDSXYULaNMPiiM94ldE54c
  Sections 00 (principes UX et accessibilité, parcours, vocabulaire des statuts) puis 01 à 07, un écran du brief par section, chacun avec ses états et des notes « À vérifier ».

## 4 octobre 2026, matin (branche `main`)

**Fait**
- Modèle arrêté : `docs/cycle-de-vie.md`.
- Dépôt public `ElahTovim/groma`, relié à Vercel. Production : https://gromaa.vercel.app.
- Base Neon `groma-db`, créée depuis Vercel ; première migration jouée (table `comptes`).
- Connexion par courriel (Auth.js), page de première installation réservée à `ADMIN_EMAIL`, journalisation des connexions et des refus. Fusionné par la demande n° 1.
- Compte gérant créé par Kerguelenn.
- Huit tests sur la règle d'installation (`npm test`).

**Reste**
- Activer une base distincte par prévisualisation (réglage de l'intégration Neon dans Vercel) : aujourd'hui prévisualisations et production partagent la même base.
- Rejouer les tests à chaque push (GitHub Actions).
- Invitations par courriel (Resend), réinitialisation du mot de passe, rôles équipe et externe.
- Les tables chantiers, lots, participants, fil, et le jeu de données fictif.
- Compte UptimeRobot sur l'adresse de production ; brancher Sentry.

**Cassé**
- Rien.
