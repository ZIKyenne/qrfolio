-- P0-1 — Empêcher l'auto-attribution d'un plan payant.
--
-- AVANT : la policy UPDATE "Mise à jour profil propre" était
--   for update using (auth.uid() = id)
-- sans WITH CHECK ni restriction de colonnes. Un client (clé anon publique +
-- JWT de session) pouvait donc exécuter depuis le navigateur :
--   supabase.from('profiles').update({ plan: 'business' }).eq('id', MON_ID)
-- -> tout le gating (plans/quota/domaines/équipe/IA) débloqué sans Stripe.
--
-- APRÈS : (1) WITH CHECK sur l'appartenance de la ligne, (2) un trigger qui
-- interdit à tout rôle ≠ service_role de modifier `plan` / `stripe_customer_id`.
-- Le webhook Stripe (service_role) reste seul habilité à les écrire. Les autres
-- colonnes (full_name, username, bio, website, avatar_*, preferences...) restent
-- librement modifiables par l'utilisateur. Les compteurs total_scans/total_pages
-- ne sont volontairement PAS verrouillés ici (ils sont incrémentés par un
-- trigger existant sur insertion de scan) — impact faible, hors périmètre P0.

-- 1) Recréer la policy UPDATE avec WITH CHECK (idempotent).
do $$
begin
  if exists (
    select 1 from pg_policies
    where tablename = 'profiles' and policyname = 'Mise à jour profil propre'
  ) then
    execute 'drop policy "Mise à jour profil propre" on public.profiles';
  end if;
end $$;

create policy "Mise à jour profil propre" on public.profiles
  for update using (auth.uid() = id) with check (auth.uid() = id);

-- 2) Garde-fou colonnes de facturation (défense en profondeur, indépendante de la RLS).
create or replace function public.guard_profile_billing()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if coalesce(auth.role(), '') <> 'service_role' then
    if new.plan is distinct from old.plan
       or new.stripe_customer_id is distinct from old.stripe_customer_id then
      raise exception 'Modification non autorisée : le plan et l''identifiant client Stripe ne peuvent être changés que par le système de facturation.';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists guard_profile_billing_trg on public.profiles;
create trigger guard_profile_billing_trg
  before update on public.profiles
  for each row execute function public.guard_profile_billing();
