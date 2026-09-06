-- Trois points de la revue du 4 septembre, côté base.

-- ── P1-28 · log_activity / increment_redirect_hit ────────────────────────────
-- SECURITY DEFINER avec EXECUTE accordé à public : n'importe quel client muni de
-- la clé anon pouvait écrire de fausses entrées dans la timeline d'un autre
-- compte (p_user_id libre) ou gonfler le compteur d'une redirection. Aucun
-- appel ne vient du navigateur : seule la clé de service en a besoin.
revoke all on function public.log_activity(uuid, activity_event_type, text, text, uuid, text, text, jsonb) from public, anon, authenticated;
grant execute on function public.log_activity(uuid, activity_event_type, text, text, uuid, text, text, jsonb) to service_role;

revoke all on function public.increment_redirect_hit(uuid) from public, anon, authenticated;
grant execute on function public.increment_redirect_hit(uuid) to service_role;

-- ── P1-29 · team_members : plus d'insertion hors clé de service ──────────────
-- « Gestion membres equipe » était FOR ALL sans WITH CHECK : un admin pouvait
-- insérer n'importe quel user_id avec n'importe quel rôle, sans invitation ni
-- plafond de sièges. Les insertions passent toutes par /api/team/accept (clé de
-- service) : on ne laisse aux membres que la mise à jour et le retrait, bornés.
drop policy if exists "Gestion membres equipe" on public.team_members;

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
  );

create policy "Retrait membres equipe" on public.team_members for delete
  using (
    user_id = (select auth.uid())
    or (select t.owner_id from public.teams t where t.id = team_members.team_id) = (select auth.uid())
    or public.team_role_rank(
         coalesce((select tm.role from public.team_members tm where tm.team_id = team_members.team_id and tm.user_id = (select auth.uid())), 'viewer')
       ) >= 2
  );

-- ── P1-30 · les triggers de quota lisent profiles hors RLS ───────────────────
-- Un éditeur d'équipe qui active un QR du propriétaire lisait profiles sous SA
-- règle de lecture : plan NULL → limites du gratuit → refus à tort. Les deux
-- fonctions ont déjà `set search_path = public` ; on ajoute SECURITY DEFINER.
alter function public.quota_instant_qrs() security definer;
alter function public.quota_qr_codes() security definer;
