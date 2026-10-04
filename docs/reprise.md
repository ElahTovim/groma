# État de reprise

## 4 octobre 2026, soir (branche `interface`)

**Fait**
- Trois décisions de Kerguelenn reportées dans `docs/cycle-de-vie.md` et `docs/brief-maquettes.md` : montant HT interne sur le chantier ; chaque élément du fil est partagé au cas par cas, coché dans une fenêtre « Qui voit ça ? » ; les lots et leurs retards restent internes.
- Rendus semaine 1 : `docs/spec-fiche-chantier.md` (spécification d'une page) et `docs/schema-produit.md` (schéma du produit, trajet du clic à la base).

**Reste**
- Kerguelenn relit les wireframes Figma à la lumière des trois décisions (la fenêtre « Qui voit ça ? » est à ajouter), puis l'étape style.
- Fusionner la branche `interface` dans `main`.
- Puis, sur `main` : base distincte par prévisualisation, tests rejoués à chaque push, chantiers et participants.

**Cassé**
- Rien.

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
