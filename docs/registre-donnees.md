# Registre des données personnelles

Le registre des traitements de groma (RGPD, article 30). À tenir à jour à chaque nouvelle donnée.

**Responsable du traitement** : l'entreprise qui utilise groma (son nom : Réglages, « L'entreprise »). **Sous-traitant** : groma, l'éditeur. Chaque personne retrouve sa politique, exporte ses données et gère ses autorisations dans « Mes données ».

| Traitement | Personnes concernées | Données | Pourquoi | Combien de temps | Où, et qui y accède |
| --- | --- | --- | --- | --- | --- |
| Comptes et connexion | gérant, équipe, externes | nom, adresse électronique, rôle, empreinte du mot de passe, numéro de session | se connecter, vérifier les droits | tant que le compte existe | Neon (base, États-Unis) ; le gérant |
| Suivi des chantiers | externes et équipe invités | qualité sur le chantier, messages, demandes, disponibilités, documents et photos déposés | coordonner le chantier | 10 ans après la réception (garantie décennale) | Neon, Vercel Blob (fichiers privés) ; l'équipe, et chacun pour ce qu'on lui partage |
| Pièces des intervenants | sous-traitants, architectes, syndics… | attestations (vigilance, décennale, Kbis…), dates, SIREN | obligations du donneur d'ordre (Code du travail L8222-1) | durée de validité, puis 5 ans | Neon, Vercel Blob ; l'équipe et l'intervenant |
| Entreprises vérifiées | clients et intervenants professionnels | raison sociale, SIREN, adresse, activité | éviter de travailler avec une entreprise fermée | tant qu'elle est rattachée | Neon ; l'équipe. Source : registre public Sirene |
| PV de réception | maître d'ouvrage | nom tapé, date et heure de signature, empreinte du contenu | preuve de la réception, départ des garanties | 10 ans après la réception | Neon ; l'équipe et le signataire |
| Courriers | expéditeurs | texte du courrier, champs lus (expéditeur, montant…) | répondre, rattacher au chantier | 3 ans | Neon ; l'équipe. Lu par Anthropic (modèle d'IA), sans conservation pour l'entraînement |
| Assistant et serveur MCP | gérant, équipe | demandes faites, actions et propositions, jetons (empreinte) | exécuter et tracer les actions | 1 an | Neon ; le gérant (journal). Modèle : Anthropic, dans un bac à sable Vercel |
| Courriels | tous | adresse, contenu des relances et récapitulatifs | prévenir, relancer | journal d'envoi chez Resend | Resend |
| Journaux techniques et erreurs | tous | identifiant de compte, action, heure | sécurité, diagnostic | 1 heure (Vercel), 30 à 90 jours (Sentry) | Vercel, Sentry |
| Autorisations | tous | décision, destinataire (groma ou l'entreprise), date, version de la politique | prouver le choix de la personne | tant que le compte existe | Neon |

**Droits** : accès et portabilité (« Exporter mes données »), retrait des autorisations (« Mes données »), rectification et effacement (sur demande au gérant).

**Sécurité** : `docs/revue-securite.md`.
