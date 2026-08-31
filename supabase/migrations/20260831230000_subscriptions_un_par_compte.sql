-- =============================================================================
-- Un abonnement par compte — la contrainte qui manquait
-- -----------------------------------------------------------------------------
-- Le webhook Stripe écrit la ligne d'abonnement avec un UPSERT dont la cible de
-- conflit est `user_id` (un compte = un abonnement). Or `idx_subscriptions_user_id`
-- était un index ORDINAIRE, pas unique. Postgres refuse alors l'ordre :
--
--   42P10 : there is no unique or exclusion constraint matching the
--           ON CONFLICT specification
--
-- supabase-js ne lève pas d'exception : l'erreur revenait dans un objet `{ error }`
-- que la route ne lisait pas, et le webhook répondait « received: true » à Stripe
-- sans avoir rien écrit. Le plan du client était bien accordé (cette écriture-là
-- passait), mais la table `subscriptions` restait vide POUR TOUJOURS : pas de date
-- d'échéance, pas de statut, pas d'impayé enregistré, et les branches
-- « abonnement modifié » et « paiement échoué » du webhook ne touchaient jamais
-- aucune ligne.
--
-- Vérifié sur la base de production le 31/08/2026 : l'upsert est bien refusé en
-- 42P10, et aucun abonnement n'a jamais été enregistré — il n'y a donc personne
-- à réparer, seulement la contrainte à poser avant le premier vrai client.
-- =============================================================================

-- Filet : s'il existait des doublons (il n'y en a pas aujourd'hui), on ne garde
-- que la ligne la plus récente par compte, sinon l'index unique échouerait.
delete from public.subscriptions s
using public.subscriptions plus_recent
where s.user_id = plus_recent.user_id
  and (s.created_at, s.id) < (plus_recent.created_at, plus_recent.id);

-- L'index ordinaire devient inutile : l'index unique sert aussi à la recherche.
drop index if exists public.idx_subscriptions_user_id;

create unique index if not exists subscriptions_user_id_key
  on public.subscriptions (user_id);
