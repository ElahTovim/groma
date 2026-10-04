# Spécification : la fiche chantier

Rendu semaine 1 · 4 octobre 2026 · Kerguelenn

Adresse : `/chantiers/[id]`. Référence du modèle : `docs/cycle-de-vie.md`.

## Ce que fait la page, en dix lignes

1. Elle montre un chantier : son nom, son adresse, son client, son statut, ses dates.
2. Un seul bouton principal propose **l'étape suivante** du cycle, en haut sur ordinateur, en bas sous le pouce sur téléphone (« Passer en planifié », « Déclarer la réception », « Clore le chantier »).
3. Si l'étape est refusée, la page dit **pourquoi** et **ce qui bloque**, avec un lien vers chaque élément en cause.
4. La météo des trois prochains jours s'affiche sous l'en-tête.
5. Les lots s'affichent avec leur statut, et ceux en retard se voient au premier coup d'œil.
6. Le fil du chantier s'affiche dans l'ordre chronologique, comme une messagerie, le plus récent en bas. On peut y ajouter un message, une demande, une disponibilité, un document ou un signalement.
7. Sur chaque élément du fil, « Qui voit ça ? » ouvre la fenêtre où l'on coche les participants qui le verront.
8. Un signalement à qualifier propose deux gestes : « Retenir comme réserve » ou « Écarter », avec un motif.
9. La liste des participants est accessible depuis l'en-tête, avec un bouton « Inviter ».
10. Après chaque action, un message confirme ce qui s'est passé (« Chantier passé en planifié »).

## Ce que chaque rôle y voit

| Élément | Gérant, équipe | Externe |
| --- | --- | --- |
| En-tête : nom, adresse, statut, dates | oui | oui |
| Montant HT | oui | non |
| Bouton de l'étape suivante, annulation | oui | non |
| Météo | oui | oui |
| Lots et retards | oui | non |
| Fil | tout | seulement ce qui a été coché pour lui |
| « Qui voit ça ? », qualifier un signalement | oui | non |
| Ajouter au fil | les six types | message, réponse, disponibilité, document, signalement |
| Participants, « Inviter » | oui (inviter : gérant et équipe) | non |

Ces droits sont vérifiés **sur le serveur**. Un externe qui tape l'adresse d'un chantier où il n'est pas invité reçoit une page « Chantier introuvable », et la tentative est notée dans le journal.

## Les quatre états

| État | Ce qu'on voit |
| --- | --- |
| Chargement | La structure de la page en gris, sans chiffres ni textes inventés. |
| Données | La page complète. |
| Vide | Un chantier neuf : « Aucun lot pour l'instant » avec le bouton « Ajouter un lot » ; « Le fil est vide » avec « Écrire le premier message ». |
| Erreur | « Impossible de charger ce chantier. Réessayez dans un instant. » avec un bouton « Réessayer ». Pour un chantier inexistant ou non autorisé : « Chantier introuvable », sans dire lequel des deux. |

## Les cas limites

- **Météo indisponible** : l'encart affiche « Météo indisponible pour le moment », et le reste de la page fonctionne.
- **Adresse non géolocalisée** : « Adresse introuvable, météo impossible », avec un lien pour corriger l'adresse.
- **Clôture refusée** : « Clôture impossible : 1 signalement à qualifier, 2 réserves ouvertes », chaque élément cliquable. C'est le cas piégé : un signalement arrivé la veille bloque la clôture.
- **Réception refusée** : « 2 lots ne sont pas finis : carrelage, peinture. »
- **Deux personnes cliquent en même temps** : la seconde reçoit « Ce chantier a changé entre-temps », et la page se recharge.
- **Annulation d'un chantier en cours** : le bouton n'existe pas à ce stade du cycle.
- **Sur téléphone** : l'en-tête reste en haut, le bouton de l'étape suivante reste fixé en bas de l'écran, sous le pouce. Les lots puis le fil viennent entre les deux. Les boutons sont assez grands pour un doigt ganté.

## Hors périmètre

Le récapitulatif du matin, les relances automatiques, la lecture des courriers par le modèle, l'échéancier des paiements, l'agent. Les modifications de lots (ajout, dates) se font dans la fiche du lot, spécifiée à part.
