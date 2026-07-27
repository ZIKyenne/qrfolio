-- Équipe : un seul « workspace » par propriétaire (le code suppose 1 team/owner).
-- Dédoublonne au cas où (garde la plus ancienne), puis pose l'index unique qui
-- évite toute course (deux GET concurrents qui créeraient 2 équipes).

delete from public.teams t
  using public.teams t2
 where t.owner_id = t2.owner_id
   and (t.created_at > t2.created_at
        or (t.created_at = t2.created_at and t.id > t2.id));

create unique index if not exists teams_owner_unique on public.teams(owner_id);
