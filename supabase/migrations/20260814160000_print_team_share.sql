-- Partage ÉQUIPE des modèles et de la charte Print Studio.
-- Politiques ADDITIVES (RLS = OR avec les policies « _own ») réutilisant les helpers
-- can_read_owner / can_write_owner (cf. 20260728120000_team_foundation.sql).
-- Solo : can_read_owner court-circuite sur p_owner = auth.uid() -> aucun impact.

-- Modèles partagés : visibles par toute l'équipe ; création/suppression pour les rôles éditeur+.
drop policy if exists "print_presets_select_team" on print_presets;
create policy "print_presets_select_team" on print_presets for select using (public.can_read_owner(user_id));
drop policy if exists "print_presets_insert_team" on print_presets;
create policy "print_presets_insert_team" on print_presets for insert with check (public.can_write_owner(user_id));
drop policy if exists "print_presets_delete_team" on print_presets;
create policy "print_presets_delete_team" on print_presets for delete using (public.can_write_owner(user_id));

-- Charte partagée : visible par toute l'équipe ; mise à jour pour les rôles éditeur+.
drop policy if exists "print_brand_kit_select_team" on print_brand_kit;
create policy "print_brand_kit_select_team" on print_brand_kit for select using (public.can_read_owner(user_id));
drop policy if exists "print_brand_kit_insert_team" on print_brand_kit;
create policy "print_brand_kit_insert_team" on print_brand_kit for insert with check (public.can_write_owner(user_id));
drop policy if exists "print_brand_kit_update_team" on print_brand_kit;
create policy "print_brand_kit_update_team" on print_brand_kit for update using (public.can_write_owner(user_id)) with check (public.can_write_owner(user_id));
