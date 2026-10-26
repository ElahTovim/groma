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

**Voir `docs/passation.md`** : avec vos propres comptes (Vercel, Neon) et votre propre base, deux variables suffisent pour démarrer, et l'inventaire complet des clés y est. Ne récupérez jamais les variables de production d'un autre projet : elles pointent vers sa vraie base.

## Les commandes

| Commande | Ce qu'elle fait |
| --- | --- |
| `npm run dev` | lance le site en local |
| `npm test` | joue les tests (règles métier, accès, formulaires, jeu de données, météo, fichiers) |
| `npm run lint` | relit le code |
| `npm run db:generate` | écrit une migration après un changement de `lib/db/schema.ts` |

GitHub rejoue lecture, types, tests, cohérence des migrations et construction à chaque envoi (`.github/workflows/verifications.yml`).

## Les variables d'environnement

L'inventaire complet (service, obligatoire ou non, où l'obtenir, ce qui se passe si elle manque) est dans `docs/passation.md`, section 3. `/api/sante` dit, sans rien révéler, si la base répond et quels services sont branchés.

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
