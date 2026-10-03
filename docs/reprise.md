# État de reprise

## 4 octobre 2026

**Fait**
- Modèle arrêté : `docs/cycle-de-vie.md`.
- Dépôt public `ElahTovim/groma`, relié à Vercel. Production : https://groma-coral.vercel.app.
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
