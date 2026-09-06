-- Deux index manquants (revue du 4 septembre).
-- qr_codes(user_id) : countActiveQrs et le trigger quota_qr_codes comptent par
-- utilisateur à CHAQUE insertion ; sans index, balayage complet de la table.
-- team_members(user_id) : can_read_owner / can_write_owner cherchent l'appelant
-- par user_id, et ces fonctions sont évaluées LIGNE PAR LIGNE dans toutes les
-- policies d'équipe (pages, qr_codes, leads…).
create index if not exists idx_qr_codes_user_id on public.qr_codes(user_id);
do $$
begin
  if to_regclass('public.team_members') is not null then
    execute 'create index if not exists idx_team_members_user_id on public.team_members(user_id)';
  end if;
end $$;
