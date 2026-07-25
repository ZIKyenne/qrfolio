-- Corrige un bug latent : l'ancienne migration 003_referrals créait
-- referrals.ref_code en UNIQUE. Or handle_new_user insère une ligne referrals
-- par filleul avec le ref_code DU PARRAIN → un parrain qui parraine 2+ filleuls
-- violait la contrainte, faisant échouer le trigger et donc l'inscription du
-- filleul. La contrainte n'a pas lieu d'être (ref_code se répète légitimement).
-- Idempotent : sans effet si la contrainte n'existe pas (prod n'ayant appliqué
-- que la version consolidée affiliation_and_fixes).

alter table public.referrals drop constraint if exists referrals_ref_code_key;
drop index if exists public.referrals_ref_code_key;
