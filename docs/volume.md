# Test à volume réaliste : 10 000 chantiers

Badge de la semaine 5 : « remplir une copie de la base avec 10 000 chantiers, et mesurer que les pages restent rapides ».

## Ce qui a été fait, le 26 octobre 2026

1. **Une copie de la base**, jamais la production : la production sauvegardée en lecture seule (`pg_dump`), restaurée dans un projet Neon séparé, `groma-volume` (base `groma_volume`, même région que la production, us-east-1). Les 28 tables comptées des deux côtés : identiques, ainsi que les 51 index et les 15 migrations.
2. **Remplie à 10 000 chantiers** par `docs/volume/remplir.sql` (4 secondes). Chaque chantier ajouté est fictif, avec la répartition du jeu de données (beaucoup en cours, quelques devis, peu d'annulés), ses lots, son fil et ses participants pris parmi les dix personnes fictives. La cliente fictive Claire Morel participe ainsi à plus de 3 000 chantiers : le cas le plus lourd pour un compte externe. Le script refuse de tourner sur une base qui ne s'appelle pas `groma_volume`.

   | Table | Avant | Après |
   | --- | --- | --- |
   | chantiers | 564 | 10 000 |
   | participants | 173 | 28 008 |
   | lots | 87 | 17 922 |
   | fil | 282 | 20 099 |

3. **Les pages chronométrées** par `docs/volume/mesurer.mjs` : l'application construite comme en production (`next build`, `next start`), branchée sur la copie, connectée comme un vrai utilisateur (le gérant, puis la cliente externe). Chaque page chargée une fois pour rien, puis sept fois ; on garde la médiane. Même mesure avant et après le remplissage.

## Résultat : les pages restent rapides

Temps médian d'une page complète, depuis Paris (la base est aux États-Unis : chaque lecture paie l'aller-retour, environ 0,1 s ; sur Vercel, le serveur est à côté de la base, tout est plus rapide).

| Page | Gérant, 564 | Gérant, 10 000 | Externe, 564 | Externe, 10 000 |
| --- | --- | --- | --- | --- |
| Accueil | 0,72 s | 1,08 s | 0,60 s | 0,74 s |
| Chantiers | 0,74 s | 0,75 s | 0,28 s | 0,30 s |
| Chantiers, à traiter | 0,64 s | 0,72 s | 0,28 s | 0,30 s |
| Chantiers, en cours | 0,73 s | 0,73 s | 0,27 s | 0,28 s |
| Chantiers, recherche « Montreuil » | 0,67 s | 0,72 s | 0,28 s | 0,32 s |
| Fiche d'un chantier | 1,56 s | 1,81 s | 1,00 s | 1,00 s |

Multiplier les chantiers par 18 ajoute au plus 0,36 s (l'accueil du gérant, qui montre plus de cartes). Aucune page ne s'effondre.

**Pourquoi** : les listes s'arrêtent à 200 chantiers, et chaque lecture en base reste courte. Mesurées directement dans la base à 10 000 chantiers, les plus lourdes prennent moins de 7 millisecondes (la liste d'un externe, qui passe par les participants : 6 ms ; la recherche : 6 ms ; la fiche : 1 ms). Le temps d'une page vient du nombre d'allers-retours avec la base, pas du volume.

**Les index** : ce compte rendu a été fait avant la migration 0016, qui ajoute les index sur le chantier du fil et des lots (voir `docs/test-volume.md`, mené en parallèle le même jour).

## Ce que le volume a révélé : « À traiter » ne regarde que les 200 plus récents

La liste prend les 200 chantiers les plus récents, **puis** cherche parmi eux ceux qui demandent un geste (lot en retard, signalement à qualifier, réserve ouverte). Un chantier plus ancien disparaît de « À traiter » et de « À viser » sur l'accueil, même s'il est en retard.

- Dans la copie à 10 000 : l'onglet affiche « À traiter 31 », alors qu'environ 3 000 chantiers en ont besoin.
- **En production, aujourd'hui** (lecture seule) : 21 chantiers demandent un geste, et **aucun** n'est parmi les 200 plus récents. Les imports de nuit, plus récents, les ont poussés hors de la liste.

Ce n'est pas une question de vitesse, c'est une question de justesse. Correction à décider : chercher d'abord les chantiers qui demandent un geste, dans toute la base, puis les plus récents.

## Le refaire

```bash
# 1. Une copie : voir docs/sauvegarde.md (pg_dump de la production, pg_restore dans une base groma_volume).
# 2. La remplir :
psql "$URL_DE_LA_COPIE" -v ON_ERROR_STOP=1 -f docs/volume/remplir.sql
# 3. L'application sur la copie : .env.local avec DATABASE_URL et DATABASE_URL_UNPOOLED de la copie.
npx next build && npx next start -p 3999
# 4. Mesurer (un compte de la copie) :
node docs/volume/mesurer.mjs http://localhost:3999 <courriel> <mot de passe>
```

Les comptes de mesure (un gérant, et le mot de passe de Claire Morel) n'existent que dans la copie.
