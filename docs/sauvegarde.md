# Sauvegarde et restauration de la base

Badge de la semaine 5 : « une sauvegarde de la base restaurée sur une copie ».

## Ce qui a été fait, le 26 octobre 2026

1. **Sauvegarde** de la base de production, en lecture seule : `pg_dump --format=custom --no-owner --no-privileges`, par la connexion directe (non mutualisée) de Neon. 512 Ko, 16 secondes. Rien n'est écrit dans la production.
2. **Restauration** dans une base séparée, hors du projet de production : un projet Neon personnel, branche `restauration-groma`, base `groma_copie` (région Londres). `pg_restore --no-owner --no-privileges`, 14 secondes.
3. **Vérification** : les 29 tables comptées une à une, dans la production et dans la copie. **Résultat : identiques.**

| Table | Lignes |
| --- | --- |
| chantiers | 564 |
| participants | 173 |
| lots | 87 |
| fil | 282 |
| comptes | 14 |
| evenements_flux | 928 |
| executions (nuits) | 94 |
| courriers | 10 |
| documents / morceaux (vecteurs) | 20 / 52 |
| appels_ia | 21 |
| analyses_nuit | 8 |
| recapitulatifs | 29 |

   Et dans la copie, la recherche par vecteurs répond (pgvector), et les 15 migrations sont enregistrées.
4. Le fichier de sauvegarde a été **supprimé** après la vérification : il contient des données personnelles (adresses, mots de passe hachés).

## La refaire

```bash
# Outils : brew install libpq   (pg_dump et psql, version ≥ celle de la base)
pg_dump "$URL_DIRECTE_PRODUCTION" --format=custom --no-owner --no-privileges --file=groma.dump
pg_restore --no-owner --no-privileges --dbname="$URL_DE_LA_COPIE" groma.dump
```

- `URL_DIRECTE_PRODUCTION` : l'adresse **non mutualisée** de la base (variable `DATABASE_URL_UNPOOLED` dans Vercel).
- `URL_DE_LA_COPIE` : une base vide, **jamais la production**. Une branche Neon fait très bien l'affaire.
- Puis comparer le nombre de lignes de chaque table des deux côtés.

## Et au quotidien

Neon garde aussi un historique de la base, qui permet de revenir à un instant passé (« restauration à un instant donné ») : sa durée dépend de l'offre (quelques heures sur l'offre gratuite). La sauvegarde ci-dessus est l'assurance indépendante : un fichier qu'on peut restaurer ailleurs, même si le projet Neon disparaissait.
