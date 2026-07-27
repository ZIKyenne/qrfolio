-- Feature Équipe — Phase 2 : RLS. 100% ADDITIF (nouvelles policies « equipe » qui
-- s'ajoutent aux policies propriétaire existantes ; RLS = OR). Toutes gardées par
-- can_read_owner / can_write_owner (Phase 1) -> un non-membre n'obtient RIEN de plus.
-- Lecture = tous les membres ; écriture = editor/admin/owner.

-- ── teams : owner + membres lisent leur équipe ───────────────────────────────
do $$ begin
  if not exists (select 1 from pg_policies where tablename='teams' and policyname='Lecture equipe membres') then
    execute $p$ create policy "Lecture equipe membres" on public.teams for select using (public.can_read_owner(owner_id)); $p$;
  end if;
  -- Le propriétaire gère son équipe (nom, logo, couleur).
  if not exists (select 1 from pg_policies where tablename='teams' and policyname='Gestion equipe owner') then
    execute $p$ create policy "Gestion equipe owner" on public.teams for all using (owner_id = auth.uid()) with check (owner_id = auth.uid()); $p$;
  end if;
end $$;

-- ── team_members : tous les membres de l'équipe voient la liste ──────────────
do $$ begin
  if not exists (select 1 from pg_policies where tablename='team_members' and policyname='Lecture membres equipe') then
    execute $p$
      create policy "Lecture membres equipe" on public.team_members for select
      using (
        user_id = auth.uid()
        or public.can_read_owner((select t.owner_id from public.teams t where t.id = team_members.team_id))
      );
    $p$;
  end if;
  -- Gestion des membres (ajout/retrait/rôle) : owner + admin. Les écritures réelles
  -- passent surtout par le service role côté serveur ; cette policy est une défense.
  if not exists (select 1 from pg_policies where tablename='team_members' and policyname='Gestion membres equipe') then
    execute $p$
      create policy "Gestion membres equipe" on public.team_members for all
      using (
        (select t.owner_id from public.teams t where t.id = team_members.team_id) = auth.uid()
        or public.team_role_rank(
             coalesce((select tm.role from public.team_members tm where tm.team_id = team_members.team_id and tm.user_id = auth.uid()), 'viewer')
           ) >= 2
      );
    $p$;
  end if;
end $$;

-- ── pages : lecture membres + écriture editor/admin ──────────────────────────
do $$ begin
  if not exists (select 1 from pg_policies where tablename='pages' and policyname='Lecture pages equipe') then
    execute $p$ create policy "Lecture pages equipe" on public.pages for select using (public.can_read_owner(user_id)); $p$;
  end if;
  if not exists (select 1 from pg_policies where tablename='pages' and policyname='Maj pages equipe') then
    execute $p$ create policy "Maj pages equipe" on public.pages for update using (public.can_write_owner(user_id)) with check (public.can_write_owner(user_id)); $p$;
  end if;
  if not exists (select 1 from pg_policies where tablename='pages' and policyname='Creation pages equipe') then
    execute $p$ create policy "Creation pages equipe" on public.pages for insert with check (public.can_write_owner(user_id)); $p$;
  end if;
  if not exists (select 1 from pg_policies where tablename='pages' and policyname='Suppression pages equipe') then
    execute $p$ create policy "Suppression pages equipe" on public.pages for delete using (public.can_write_owner(user_id)); $p$;
  end if;
end $$;

-- ── qr_codes : lecture membres + écriture editor/admin ───────────────────────
do $$ begin
  if not exists (select 1 from pg_policies where tablename='qr_codes' and policyname='Lecture qr equipe') then
    execute $p$ create policy "Lecture qr equipe" on public.qr_codes for select using (public.can_read_owner(user_id)); $p$;
  end if;
  if not exists (select 1 from pg_policies where tablename='qr_codes' and policyname='Maj qr equipe') then
    execute $p$ create policy "Maj qr equipe" on public.qr_codes for update using (public.can_write_owner(user_id)) with check (public.can_write_owner(user_id)); $p$;
  end if;
  if not exists (select 1 from pg_policies where tablename='qr_codes' and policyname='Creation qr equipe') then
    execute $p$ create policy "Creation qr equipe" on public.qr_codes for insert with check (public.can_write_owner(user_id)); $p$;
  end if;
  if not exists (select 1 from pg_policies where tablename='qr_codes' and policyname='Suppression qr equipe') then
    execute $p$ create policy "Suppression qr equipe" on public.qr_codes for delete using (public.can_write_owner(user_id)); $p$;
  end if;
end $$;

-- ── blocks : via la page (blocks.page_id -> pages.user_id) ───────────────────
do $$ begin
  if not exists (select 1 from pg_policies where tablename='blocks' and policyname='Lecture blocs equipe') then
    execute $p$ create policy "Lecture blocs equipe" on public.blocks for select using (exists (select 1 from public.pages p where p.id = blocks.page_id and public.can_read_owner(p.user_id))); $p$;
  end if;
  if not exists (select 1 from pg_policies where tablename='blocks' and policyname='Ecriture blocs equipe') then
    execute $p$ create policy "Ecriture blocs equipe" on public.blocks for all using (exists (select 1 from public.pages p where p.id = blocks.page_id and public.can_write_owner(p.user_id))) with check (exists (select 1 from public.pages p where p.id = blocks.page_id and public.can_write_owner(p.user_id))); $p$;
  end if;
end $$;

-- ── leads : lecture membres + maj/suppr editor/admin (leads.user_id = proprio) ─
do $$ begin
  if not exists (select 1 from pg_policies where tablename='leads' and policyname='Lecture leads equipe') then
    execute $p$ create policy "Lecture leads equipe" on public.leads for select using (public.can_read_owner(user_id)); $p$;
  end if;
  if not exists (select 1 from pg_policies where tablename='leads' and policyname='Maj leads equipe') then
    execute $p$ create policy "Maj leads equipe" on public.leads for update using (public.can_write_owner(user_id)); $p$;
  end if;
  if not exists (select 1 from pg_policies where tablename='leads' and policyname='Suppr leads equipe') then
    execute $p$ create policy "Suppr leads equipe" on public.leads for delete using (public.can_write_owner(user_id)); $p$;
  end if;
end $$;

-- ── analytics (lecture seule pour les membres) : via la page ─────────────────
do $$ begin
  if not exists (select 1 from pg_policies where tablename='scans' and policyname='Lecture scans equipe') then
    execute $p$ create policy "Lecture scans equipe" on public.scans for select using (exists (select 1 from public.pages p where p.id = scans.page_id and public.can_read_owner(p.user_id))); $p$;
  end if;
  if not exists (select 1 from pg_policies where tablename='page_views' and policyname='Lecture vues equipe') then
    execute $p$ create policy "Lecture vues equipe" on public.page_views for select using (exists (select 1 from public.pages p where p.id = page_views.page_id and public.can_read_owner(p.user_id))); $p$;
  end if;
  if not exists (select 1 from pg_policies where tablename='block_clicks' and policyname='Lecture clics equipe') then
    execute $p$ create policy "Lecture clics equipe" on public.block_clicks for select using (exists (select 1 from public.pages p where p.id = block_clicks.page_id and public.can_read_owner(p.user_id))); $p$;
  end if;
  if not exists (select 1 from pg_policies where tablename='page_events' and policyname='Lecture events equipe') then
    execute $p$ create policy "Lecture events equipe" on public.page_events for select using (exists (select 1 from public.pages p where p.id = page_events.page_id and public.can_read_owner(p.user_id))); $p$;
  end if;
end $$;
