# Test à volume réaliste

Badge de la semaine 5 : « un test à volume réaliste (dix mille lignes) ». Fait le 26 octobre 2026.

## Le montage

- Sur la **copie restaurée** de la base (`docs/sauvegarde.md`), jamais sur la production : projet Neon personnel, branche `restauration-groma`, base `groma_copie` (Londres).
- Chargées en 2 secondes, par SQL : **10 000 chantiers** fictifs de plus (références `VOL-00001` à `VOL-10000`, toutes étapes, six villes), **30 000 lots**, **50 000 éléments de fil** (messages, demandes, disponibilités, documents, signalements), 10 000 participations.
- Total : 10 564 chantiers, 30 087 lots, 50 282 éléments de fil.
- Mesures avec **le vrai code de groma** (les fonctions qu'appellent les pages), médiane de cinq passages après échauffement.

## Les mesures

Temps vus par l'application, réseau compris (depuis Paris jusqu'à la copie à Londres ; un aller-retour avec connexion y coûte à lui seul plusieurs dizaines de millisecondes) :

| Ce que fait la page | Sans index | Avec index |
| --- | --- | --- |
| Liste des chantiers (les 200 plus récents, avec « à traiter ») | 167 ms | 165 ms |
| Onglet « À traiter » | 185 ms | 197 ms |
| Recherche « Dumas » | 191 ms | 188 ms |
| Compteurs par étape, sur 10 564 chantiers | 46 ms | 40 ms |
| « À traiter » sur 200 chantiers | 105 ms | 107 ms |
| Le fil d'un chantier (parmi 50 282 éléments) | 232 ms | 200 ms |
| Les lots d'un chantier (parmi 30 087) | 63 ms | 78 ms |
| Ce qui bloque l'étape suivante | 137 ms | 124 ms |

Côté base seule (`EXPLAIN ANALYZE`), le fil d'un chantier : **2,8 ms sans index** (lecture des 50 282 éléments), **0,18 ms avec** (16 fois plus vite).

## Ce qu'on en conclut

- **groma tient la charge à 10 000 chantiers** : aucune page ne dépasse un quart de seconde, réseau compris ; en production, le serveur et la base sont dans la même région, donc plus rapides encore.
- Le temps est dominé par le réseau, pas par la base. La base n'avait **aucun index** sur le rattachement du fil et des lots à leur chantier : invisible à 500 chantiers, il aurait fini par coûter. **Ajoutés** (migration 0016) : `fil (chantier_id, cree_le)`, `lots (chantier_id)`, `participants (compte_id)`.
- La liste ne montre jamais plus de 200 chantiers à la fois (`listerChantiers`) : à grand volume, on filtre (étape, recherche). L'agent le sait (garde-fou de la liste coupée, `docs/scenarios-agent.md`).

## Le refaire

Sur une copie (jamais la production) : le script SQL de chargement par `generate_series`, puis les fonctions de `lib/chantiers.ts` et `lib/fiche.ts` chronométrées avec `DATABASE_URL` pointant vers la copie.
