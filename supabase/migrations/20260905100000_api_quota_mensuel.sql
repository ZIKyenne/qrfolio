-- Quota mensuel de l'API publique.
-- plans.ts promettait « 1 000 / 10 000 appels par mois » ; le seul contrôle était
-- 120 requêtes/minute, identique pour les deux plans. Ce compteur rend la promesse
-- vraie : une ligne par (utilisateur, mois), incrémentée atomiquement par une
-- fonction SECURITY DEFINER que seule la clé de service peut appeler.

create table if not exists public.api_usage (
  user_id uuid    not null references public.profiles(id) on delete cascade,
  mois    date    not null,                  -- premier jour du mois (UTC)
  appels  integer not null default 0,
  primary key (user_id, mois)
);

alter table public.api_usage enable row level security;

-- L'utilisateur peut LIRE sa consommation (affichage dans Profil › Clés API) ;
-- personne n'écrit sans passer par api_consommer().
drop policy if exists "Lecture usage API propre" on public.api_usage;
create policy "Lecture usage API propre" on public.api_usage
  for select using ((select auth.uid()) = user_id);

-- Incrémente et répond : autorisé tant que le compteur du mois reste ≤ plafond.
-- On compte aussi les appels refusés (mesure la demande réelle), le plafond
-- n'est donc jamais « rattrapé » par un refus.
create or replace function public.api_consommer(p_user uuid, p_plafond integer)
returns table (autorise boolean, appels integer)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_appels integer;
begin
  insert into public.api_usage (user_id, mois, appels)
  values (p_user, (date_trunc('month', now() at time zone 'utc'))::date, 1)
  on conflict (user_id, mois) do update set appels = api_usage.appels + 1
  returning api_usage.appels into v_appels;

  return query select v_appels <= p_plafond, v_appels;
end;
$$;

revoke all on function public.api_consommer(uuid, integer) from public, anon, authenticated;
grant execute on function public.api_consommer(uuid, integer) to service_role;
