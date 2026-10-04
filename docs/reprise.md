# État de reprise

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
