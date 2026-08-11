-- « QR Dynamique » — abonnement DÉDIÉ (2e abonnement Stripe, distinct des plans QRowg).
--
-- Gère les QR DYNAMIQUES (liens redirigés /q/<code>). Le quota (dyn_plan) est SÉPARÉ du
-- quota de pages/QR statiques (profiles.plan). Un utilisateur peut avoir les deux abonnements
-- sur le même client Stripe (profiles.stripe_customer_id, déjà existant).
--
-- L'état de l'abonnement QR Dynamique est stocké ICI sur `profiles` (comme profiles.plan pour
-- l'abonnement principal) : on évite de toucher à la table `subscriptions` (contrainte unique
-- sur user_id) qui gère l'abonnement QRowg. Additif et idempotent : aucune donnée touchée.

alter table public.profiles
  add column if not exists dyn_plan                    text not null default 'none',  -- none | basique | pro | business
  add column if not exists dyn_status                  text,                          -- trialing | active | past_due | canceled
  add column if not exists dyn_stripe_subscription_id  text,                          -- id de l'abonnement Stripe « QR Dynamique »
  add column if not exists dyn_current_period_end       timestamptz,                  -- fin de période en cours (pour l'affichage)
  add column if not exists dyn_cancel_at_end            boolean not null default false; -- résiliation programmée en fin de période

-- Retrouver rapidement le profil concerné par un événement webhook (par id d'abonnement Stripe).
create index if not exists profiles_dyn_sub_idx
  on public.profiles(dyn_stripe_subscription_id) where dyn_stripe_subscription_id is not null;
