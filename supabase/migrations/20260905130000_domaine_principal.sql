-- Changer de domaine principal en UNE transaction.
-- L'index unique partiel idx_domain_verif_primary_unique (user_id where is_primary)
-- interdit deux principaux : poser le nouveau avant d'effacer l'ancien échoue
-- (23505), et effacer d'abord laissait une fenêtre sans principal si l'étape
-- suivante échouait. Ici les deux écritures tiennent ou tombent ensemble.
-- SECURITY DEFINER : appelée par la clé de service depuis /api/domains ; le
-- trigger guard_domain_verification laisse passer le rôle service.
create or replace function public.definir_domaine_principal(p_user uuid, p_domain text)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
begin
  perform 1 from public.domain_verifications
    where user_id = p_user and domain = p_domain and verified = true;
  if not found then
    return false;
  end if;

  update public.domain_verifications
     set is_primary = false
   where user_id = p_user and is_primary = true and domain <> p_domain;

  update public.domain_verifications
     set is_primary = true
   where user_id = p_user and domain = p_domain and verified = true;

  return true;
end;
$$;

revoke all on function public.definir_domaine_principal(uuid, text) from public, anon, authenticated;
grant execute on function public.definir_domaine_principal(uuid, text) to service_role;
