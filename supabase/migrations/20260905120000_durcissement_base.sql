-- Trois points de la revue du 4 septembre, côté base.
-- Écrit pour s'appliquer sur une base où certains objets manquent (une
-- migration non jouée ne doit pas faire échouer tout le lot) : chaque bloc
-- vérifie l'existence de ce qu'il touche.

-- ── P1-28 · log_activity / increment_redirect_hit ────────────────────────────
-- SECURITY DEFINER avec EXECUTE accordé à public : n'importe quel client muni de
-- la clé anon pouvait écrire de fausses entrées dans la timeline d'un autre
-- compte (p_user_id libre) ou gonfler le compteur d'une redirection. Aucun
-- appel ne vient du navigateur : seule la clé de service en a besoin.
-- Les fonctions sont retrouvées par leur nom, quelle que soit leur signature.
do $$
declare r record;
begin
  for r in
    select p.oid::regprocedure as signature
      from pg_proc p join pg_namespace n on n.oid = p.pronamespace
     where n.nspname = 'public' and p.proname in ('log_activity', 'increment_redirect_hit')
  loop
    execute format('revoke all on function %s from public, anon, authenticated', r.signature);
    execute format('grant execute on function %s to service_role', r.signature);
  end loop;
end $$;

-- ── P1-29 · team_members : plus d'insertion hors clé de service ──────────────
-- « Gestion membres equipe » était FOR ALL sans WITH CHECK : un admin pouvait
-- insérer n'importe quel user_id avec n'importe quel rôle, sans invitation ni
-- plafond de sièges. Les insertions passent toutes par /api/team/accept (clé de
-- service) : on ne laisse aux membres que la mise à jour et le retrait, bornés.
do $$
begin
  if to_regclass('public.team_members') is null or to_regclass('public.teams') is null then
    raise notice 'team_members absente : bloc équipe ignoré';
    return;
  end if;

  execute 'drop policy if exists "Gestion membres equipe" on public.team_members';
  execute 'drop policy if exists "Maj membres equipe" on public.team_members';
  execute 'drop policy if exists "Retrait membres equipe" on public.team_members';

  execute $p$
    create policy "Maj membres equipe" on public.team_members for update
      using (
        (select t.owner_id from public.teams t where t.id = team_members.team_id) = (select auth.uid())
        or public.team_role_rank(
             coalesce((select tm.role from public.team_members tm where tm.team_id = team_members.team_id and tm.user_id = (select auth.uid())), 'viewer')
           ) >= 2
      )
      with check (
        -- même périmètre, et jamais de promotion au rang de propriétaire
        (
          (select t.owner_id from public.teams t where t.id = team_members.team_id) = (select auth.uid())
          or public.team_role_rank(
               coalesce((select tm.role from public.team_members tm where tm.team_id = team_members.team_id and tm.user_id = (select auth.uid())), 'viewer')
             ) >= 2
        )
        and public.team_role_rank(role) < public.team_role_rank('owner')
      )
  $p$;

  execute $p$
    create policy "Retrait membres equipe" on public.team_members for delete
      using (
        user_id = (select auth.uid())
        or (select t.owner_id from public.teams t where t.id = team_members.team_id) = (select auth.uid())
        or public.team_role_rank(
             coalesce((select tm.role from public.team_members tm where tm.team_id = team_members.team_id and tm.user_id = (select auth.uid())), 'viewer')
           ) >= 2
      )
  $p$;
end $$;

-- ── P1-30 · les triggers de quota lisent profiles hors RLS ───────────────────
-- Un éditeur d'équipe qui active un QR du propriétaire lisait profiles sous SA
-- règle de lecture : plan NULL → limites du gratuit → refus à tort. Les deux
-- fonctions ont déjà `set search_path = public` ; on ajoute SECURITY DEFINER.
do $$
declare r record;
begin
  for r in
    select p.oid::regprocedure as signature
      from pg_proc p join pg_namespace n on n.oid = p.pronamespace
     where n.nspname = 'public' and p.proname in ('quota_instant_qrs', 'quota_qr_codes')
  loop
    execute format('alter function %s security definer', r.signature);
  end loop;
end $$;
