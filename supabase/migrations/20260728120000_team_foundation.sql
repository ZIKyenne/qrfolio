-- Feature Équipe — Phase 1 : fondations (n'altère PAS la RLS existante → rien ne
-- casse). Ajoute le rôle admin, la table d'invitations, et les helpers d'accès
-- (consommés par la RLS en Phase 2).
--
-- Modèle : le « workspace » est le compte du PROPRIÉTAIRE (teams.owner_id). Les
-- membres (team_members) accèdent au contenu du propriétaire. Hiérarchie des
-- rôles : owner (3) > admin (2) > editor (1) > viewer (0).

-- 1) Rôle « admin » (gère les membres, sans supprimer le compte). Idempotent.
alter type team_role add value if not exists 'admin';

-- 2) Invitations en attente (par e-mail, acceptées via token).
create table if not exists public.team_invitations (
  id          uuid primary key default gen_random_uuid(),
  team_id     uuid not null references public.teams(id) on delete cascade,
  email       text not null,
  role        team_role not null default 'editor',
  token       text not null unique,
  invited_by  uuid references public.profiles(id) on delete set null,
  created_at  timestamptz not null default now(),
  accepted_at timestamptz,
  unique (team_id, email)
);

alter table public.team_invitations enable row level security;
create index if not exists idx_team_invitations_email on public.team_invitations(lower(email)) where accepted_at is null;
create index if not exists idx_team_invitations_team  on public.team_invitations(team_id);

-- 3) Helpers d'accès (SECURITY DEFINER : contournent la RLS pour lire teams/team_members).
--    team_role_rank compare via ::text -> aucun littéral 'admin' (sûr même dans la
--    même transaction que le ADD VALUE ci-dessus).
create or replace function public.team_role_rank(r team_role)
returns int language sql immutable set search_path = public as $$
  select case r::text when 'owner' then 3 when 'admin' then 2 when 'editor' then 1 else 0 end
$$;

-- L'utilisateur courant peut-il LIRE le contenu du propriétaire p_owner ?
create or replace function public.can_read_owner(p_owner uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select p_owner = auth.uid()
    or exists (
      select 1
      from public.team_members tm
      join public.teams t on t.id = tm.team_id
      where t.owner_id = p_owner and tm.user_id = auth.uid()
    )
$$;

-- L'utilisateur courant peut-il MODIFIER (editor/admin/owner) le contenu de p_owner ?
create or replace function public.can_write_owner(p_owner uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select p_owner = auth.uid()
    or exists (
      select 1
      from public.team_members tm
      join public.teams t on t.id = tm.team_id
      where t.owner_id = p_owner and tm.user_id = auth.uid()
        and public.team_role_rank(tm.role) >= public.team_role_rank('editor')
    )
$$;

-- 4) RLS team_invitations : le propriétaire ou un admin de l'équipe gère les invitations.
do $$ begin
  if not exists (select 1 from pg_policies where tablename='team_invitations' and policyname='Gestion invitations equipe') then
    execute $p$
      create policy "Gestion invitations equipe" on public.team_invitations for all
      using (
        exists (
          select 1 from public.teams t
          where t.id = team_invitations.team_id
            and public.can_write_owner(t.owner_id)
            and public.team_role_rank(
              coalesce((select tm.role from public.team_members tm where tm.team_id = t.id and tm.user_id = auth.uid()), 'owner')
            ) >= 2  -- rang « admin » (évite le littéral enum, sûr dans la même txn que ADD VALUE)
        )
      );
    $p$;
  end if;
end $$;
