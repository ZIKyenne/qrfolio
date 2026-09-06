-- ─────────────────────────────────────────────────────────────────────────────
-- DOMAINES : ON NE ROUTE ET ON NE REDIRIGE QUE CE QU'ON POSSÈDE
--
-- Lu dans le code le 4 septembre : les policies de domain_redirects et
-- domain_routes ne vérifiaient que auth.uid() = user_id — jamais que le domaine
-- source appartienne au compte. Un compte gratuit pouvait, avec la clé anon et
-- son propre JWT, insérer une redirection depuis « victim.com » (domaine vérifié
-- d'un client Pro) et détourner tout son trafic. Et rien n'empêchait un client
-- d'écrire lui-même verified = true sur sa vérification.
--
-- Deux triggers, même modèle que guard_profile_billing :
--   1. domain_verifications : verified / verified_at / vercel_status / vercel_error
--      / is_primary ne bougent que pour le service role.
--   2. domain_redirects et domain_routes : le domaine source doit être un domaine
--      vérifié du même compte (lui-même ou un de ses parents), et la page ciblée
--      doit appartenir au compte. Le service role passe (l'application vérifie
--      déjà côté serveur ; ceci ferme l'accès direct à l'API REST).
-- ─────────────────────────────────────────────────────────────────────────────

-- Note sur session_user : dans une fonction SECURITY DEFINER, current_user est
-- le PROPRIÉTAIRE de la fonction (postgres) — une garde écrite avec current_user
-- se désactive donc toujours. Vérifié sur une base locale : les triggers ne
-- tiraient pas. session_user est le rôle de connexion réel : « authenticator »
-- via l'API, « postgres » depuis l'éditeur SQL (la porte de secours voulue).

-- 1. Les champs d'état d'une vérification sont réservés au service role.
create or replace function public.guard_domain_verification()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if coalesce(auth.role(), '') <> 'service_role' and session_user not in ('postgres', 'supabase_admin') then
    if tg_op = 'INSERT' then
      new.verified      := false;
      new.verified_at   := null;
      new.vercel_status := 'pending';
      new.vercel_error  := null;
      new.is_primary    := false;
    elsif new.verified      is distinct from old.verified
       or new.verified_at   is distinct from old.verified_at
       or new.vercel_status is distinct from old.vercel_status
       or new.vercel_error  is distinct from old.vercel_error
       or new.is_primary    is distinct from old.is_primary
       or new.domain        is distinct from old.domain
       or new.user_id       is distinct from old.user_id then
      raise exception 'Modification non autorisée : l''état d''une vérification de domaine est géré par le serveur.'
        using errcode = '42501';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists guard_domain_verification_trg on public.domain_verifications;
create trigger guard_domain_verification_trg
  before insert or update on public.domain_verifications
  for each row execute function public.guard_domain_verification();

-- 2. Un domaine (ou un parent) vérifié par CE compte.
create or replace function public.domaine_verifie_par(p_user uuid, p_hote text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.domain_verifications v
    where v.user_id = p_user
      and v.verified = true
      and (lower(p_hote) = lower(v.domain) or lower(p_hote) like '%.' || lower(v.domain))
  );
$$;

revoke execute on function public.domaine_verifie_par(uuid, text) from public, anon;

create or replace function public.guard_domain_source()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_hote text;
begin
  if coalesce(auth.role(), '') = 'service_role' or session_user in ('postgres', 'supabase_admin') then
    return new;
  end if;

  if tg_table_name = 'domain_redirects' then
    v_hote := new.from_domain;
  else
    v_hote := new.root_domain;
    if not exists (select 1 from public.pages p where p.id = new.page_id and p.user_id = new.user_id) then
      raise exception 'La page ciblée n''appartient pas à ce compte.' using errcode = '42501';
    end if;
  end if;

  if not public.domaine_verifie_par(new.user_id, v_hote) then
    raise exception 'Le domaine « % » n''est pas un domaine vérifié de ce compte.', v_hote
      using errcode = '42501';
  end if;
  return new;
end;
$$;

drop trigger if exists guard_domain_source_trg on public.domain_redirects;
create trigger guard_domain_source_trg
  before insert or update on public.domain_redirects
  for each row execute function public.guard_domain_source();

drop trigger if exists guard_domain_route_trg on public.domain_routes;
create trigger guard_domain_route_trg
  before insert or update on public.domain_routes
  for each row execute function public.guard_domain_source();

-- 3. Les index que la résolution publique attend.
create index if not exists idx_domain_verifications_domain_verified
  on public.domain_verifications (lower(domain)) where verified = true;
create index if not exists idx_domain_redirects_user_from
  on public.domain_redirects (user_id, from_domain, from_path) where enabled = true;
create index if not exists idx_domain_routes_user_root
  on public.domain_routes (user_id, root_domain) where enabled = true;
