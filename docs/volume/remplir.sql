-- Badge « test à volume réaliste » : porte une COPIE de la base à 10 000 chantiers.
-- Jamais la production : le script s'arrête si la base ne s'appelle pas groma_volume.
--
--   psql "$URL_DE_LA_COPIE" -v ON_ERROR_STOP=1 -f docs/volume/remplir.sql
--
-- Rejouable : il efface d'abord ce qu'il a créé (références CH-V-…), puis recrée.
-- Les chantiers ajoutés sont fictifs (fictif = true) et suivent la répartition du
-- jeu de données : beaucoup en cours, quelques devis, peu d'annulés. Chacun a ses
-- lots, son fil et ses participants, pris parmi les dix personnes fictives.

do $$
begin
  if current_database() <> 'groma_volume' then
    raise exception 'Base « % » : ce script ne tourne que sur la copie groma_volume.', current_database();
  end if;
end $$;

begin;

delete from chantiers where reference like 'CH-V-%';

-- Les dix personnes fictives, numérotées 0 à 9 dans l'ordre du jeu de données
-- (0-2 chefs d'équipe, 3-5 clients, 6 architecte, 7 syndic, 8 ingénieur, 9 fournisseur).
create temp table personnes on commit drop as
select o.n, c.id
from comptes c
join (values
  (0, 'karim.benali'), (1, 'sophie.laurent'), (2, 'thomas.girard'), (3, 'claire.morel'), (4, 'paul.lefevre'),
  (5, 'nadia.haddad'), (6, 'julien.roux'), (7, 'cabinet.vauban'), (8, 'bet.structure'), (9, 'carrelages.du.marais')
) o(n, nom) on c.email = o.nom || '@exemple.groma.fr'
where c.fictif;

do $$
begin
  if (select count(*) from personnes) <> 10 then
    raise exception 'Le jeu de données fictif doit être présent (10 personnes) : rejouez-le d''abord dans Réglages.';
  end if;
end $$;

-- Combien en ajouter pour arriver à 10 000.
create temp table nouveaux on commit drop as
select
  g::int as i,
  gen_random_uuid() as id,
  (array['devis','devis','devis','devis','devis','devis','devis','signe','signe','signe','signe','signe',
         'planifie','planifie','planifie','planifie','planifie','planifie',
         'en_cours','en_cours','en_cours','en_cours','en_cours','en_cours','en_cours','en_cours','en_cours','en_cours','en_cours','en_cours',
         'reception','reception','reception','reception','reception',
         'clos','clos','clos','clos','clos','clos','clos','clos','annule','annule','annule'])[1 + g % 46]::statut_chantier as statut,
  g % 3 as chef,
  3 + (g / 7) % 3 as client
from generate_series(1, greatest(0, 10000 - (select count(*) from chantiers))) g;

insert into chantiers (id, reference, nom, client, adresse, code_postal, ville, montant_ht, statut, debut_prevu, fin_prevue, motif_annulation, photo_url, fictif, cree_le)
select
  n.id,
  'CH-V-' || lpad(n.i::text, 5, '0'),
  (array['Rénovation salle de bain','Cuisine ouverte','Ravalement de façade','Rénovation complète T3','Isolation des combles','Remplacement des fenêtres',
         'Mise aux normes électriques','Création d''une mezzanine','Réfection de toiture','Parquet et peintures','Ouverture de mur porteur','Rénovation de cage d''escalier'])[1 + n.i % 12],
  (array['Famille Morel','M. et Mme Lefèvre','Nadia Haddad','SCI Les Lilas','Copropriété du 14 rue de Paris','M. Chen','Mme Dubois','Indivision Garnier'])[1 + n.i % 8],
  (1 + n.i % 120) || ' ' || (array['rue Oberkampf','rue des Pyrénées','boulevard Voltaire','rue de la Roquette','avenue Jean-Jaurès','rue Mouffetard','rue Caulaincourt','rue du Faubourg-Saint-Denis','rue de Paris','avenue de la République'])[1 + n.i % 10],
  (array['75011','75020','75005','75018','93100','94300','92130','93200'])[1 + n.i % 8],
  (array['Paris','Paris','Paris','Paris','Montreuil','Vincennes','Issy-les-Moulineaux','Saint-Denis'])[1 + n.i % 8],
  4000 + (n.i * 7919) % 90000,
  n.statut,
  case when n.statut = 'devis' then null else current_date - 90 + (n.i * 31) % 120 end,
  case when n.statut = 'devis' then null else current_date - 90 + (n.i * 31) % 120 + 20 + n.i % 80 end,
  case when n.statut = 'annule' then 'Le client a renoncé après le devis.' end,
  null,
  true,
  -- Étalés sur trois ans, pour que « les plus récents » veuille dire quelque chose.
  now() - make_interval(mins => n.i * 157)
from nouveaux n;

-- Participants : le chef, le client, et parfois l'architecte, le syndic, l'ingénieur ou le fournisseur.
insert into participants (chantier_id, compte_id, qualite)
select n.id, p.id, q.qualite
from nouveaux n
cross join lateral (values
  (n.chef, 'chef d''équipe', true),
  (n.client, 'client', true),
  (6, 'architecte', n.i % 4 = 0),
  (7, 'syndic', n.i % 5 = 0),
  (8, 'ingénieur', n.i % 6 = 0),
  (9, 'fournisseur', n.i % 3 = 0)
) q(personne, qualite, garde)
join personnes p on p.n = q.personne
where q.garde;

-- Lots : trois pour un chantier en cours, en réception ou clos ; deux pour un planifié.
insert into lots (chantier_id, nom, statut, livraison_prevue, fin_prevue)
select n.id,
  (array['Démolition','Plomberie','Électricité','Carrelage','Peinture','Menuiseries'])[1 + (n.i + k * 2) % 6],
  case
    when n.statut in ('reception','clos') then 'fini'
    when n.statut = 'planifie' then (array['commande','a_commander'])[k + 1]
    else (array['fini','pose','commande'])[k + 1]
  end::statut_lot,
  current_date + case when (n.i + k) % 2 = 0 then -6 else 9 end,
  current_date + case when (n.i + k) % 2 = 0 then 6 else 21 end
from nouveaux n
cross join generate_series(0, 2) k
where n.statut in ('en_cours','reception','clos') or (n.statut = 'planifie' and k < 2);

-- Le fil : un devis signé, puis messages, demandes, disponibilités et, en réception, des signalements.
insert into fil (chantier_id, auteur_id, type, texte, destinataire_id, date_cible, statut_signalement, visible_par, cree_le)
select n.id, auteur.id, e.type::type_fil, e.texte, dest.id, e.date_cible, e.statut::statut_signalement,
  case when e.partage then array[cl.id] else '{}'::uuid[] end,
  now() - make_interval(mins => n.i * 157) + make_interval(hours => e.ordre)
from nouveaux n
join personnes ch on ch.n = n.chef
join personnes cl on cl.n = n.client
cross join lateral (values
  (1, 'chef', 'document', 'Devis signé (version 2)', false, null::date, null, true, n.statut not in ('devis','annule')),
  (2, 'chef', 'message', 'Accès au chantier par la cour, code du portail transmis par le client.', false, null, null, false, n.statut in ('en_cours','planifie')),
  (3, 'chef', 'demande', 'Pouvez-vous confirmer le choix de la faïence ?', true, current_date + 3, null, true, n.statut in ('en_cours','planifie')),
  (4, 'client', 'disponibilite', 'Présente de 8 h à 12 h.', false, current_date + 2, null, false, n.statut in ('en_cours','planifie')),
  (5, 'client', 'signalement', 'Joint de la douche mal fini dans l''angle.', false, null, case when n.i % 2 = 1 then 'a_qualifier' else 'levee' end, false, n.statut = 'reception'),
  (6, 'chef', 'signalement', 'Plinthe abîmée dans le couloir.', false, null, 'reserve_ouverte', false, n.statut = 'reception' and n.i % 3 = 0)
) e(ordre, qui, type, texte, adresse_client, date_cible, statut, partage, garde)
join personnes auteur on auteur.id = case when e.qui = 'chef' then ch.id else cl.id end
left join personnes dest on e.adresse_client and dest.id = cl.id
where e.garde;

commit;

analyze chantiers;
analyze participants;
analyze lots;
analyze fil;

select 'chantiers' as table, count(*) from chantiers
union all select 'participants', count(*) from participants
union all select 'lots', count(*) from lots
union all select 'fil', count(*) from fil;
