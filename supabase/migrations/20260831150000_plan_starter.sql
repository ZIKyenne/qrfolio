-- =====================================================================
--  QRowg — le plan « Starter » n'existe pas dans la base
--  À coller dans Supabase → SQL Editor → Run. Indépendant du fichier
--  des quotas : l'ordre n'a pas d'importance.
-- =====================================================================
--
--  CE QUI SE PASSERAIT AUJOURD'HUI SI QUELQU'UN ACHETAIT LE STARTER
--
--  La page /upgrade vend trois plans : Starter, Pro, Business. Le bouton
--  Starter est actif, le paiement passerait, Stripe enverrait son webhook…
--  et l'écriture du plan échouerait.
--
--  La colonne `profiles.plan` n'est pas du texte : c'est l'énumération
--  `subscription_plan`, déclarée à la création du projet avec TROIS valeurs —
--  free, pro, business. Pas de « starter ». Écrire 'starter' dedans donne
--  l'erreur 22P02 « invalid input value for enum ».
--
--  Le client paierait, et resterait sur le plan gratuit.
--
--  Le code, lui, connaît le Starter partout : lib/plans.ts en donne les
--  limites (5 pages, 850 vues, 7 QR dont 5 modifiables), lib/stripePlan.ts
--  associe deux identifiants de prix Stripe à ce plan, et la grille tarifaire
--  lui consacre une colonne. Seule la base ne l'a jamais appris.
--
--  Aucun abonnement n'existe à ce jour : rien à réparer, seulement à ouvrir
--  avant le premier client.
-- =====================================================================

alter type public.subscription_plan add value if not exists 'starter' after 'free';


-- ── VÉRIFICATION ─────────────────────────────────────────────────────
-- Doit afficher : free, starter, pro, business.

select string_agg(e.enumlabel, ', ' order by e.enumsortorder) as plans_acceptes
from pg_type t
join pg_enum e on e.enumtypid = t.oid
join pg_namespace n on n.oid = t.typnamespace
where n.nspname = 'public' and t.typname = 'subscription_plan';
