-- Feature « QR instantané » persistant (P1-19, option 2 : deux limites réelles).
--
-- Les QR instantanés (lien, WiFi, texte, contact, appel, email) encodent leur
-- contenu DIRECTEMENT (statiques) — ils ne passent pas par /q/[code] et n'ont
-- rien à voir avec les pages. On les stocke donc dans une table DÉDIÉE plutôt
-- que de polluer `qr_codes` (couplée aux pages, scans, triggers, résolution).
--
-- Deux limites de plan deviennent réelles :
--   limits.pages -> pages link-in-bio (déjà appliqué via lib/quota)
--   limits.qr    -> QR instantanés enregistrés (appliqué via cette table)

create table if not exists public.instant_qrs (
  id          uuid primary key default uuid_generate_v4(),
  user_id     uuid not null references public.profiles(id) on delete cascade,
  kind        text not null,                 -- link | wifi | text | contact | call | email
  label       text,                          -- nom donné par l'utilisateur (optionnel)
  payload     text not null,                 -- charge encodée dans le QR (URL, WIFI:..., mailto:..., vCard)
  inputs      jsonb not null default '{}',   -- champs saisis (pour ré-affichage/édition)
  style       jsonb not null default '{}',   -- couleurs / style du QR
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

alter table public.instant_qrs enable row level security;

-- RLS : le propriétaire seul (CRUD). Idempotent.
do $$
begin
  if not exists (select 1 from pg_policies where tablename='instant_qrs' and policyname='instant_qrs_owner') then
    create policy "instant_qrs_owner" on public.instant_qrs
      for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
  end if;
end $$;

create index if not exists instant_qrs_user_idx on public.instant_qrs(user_id, created_at desc);

-- updated_at auto (réutilise le trigger set_updated_at existant du schéma initial).
drop trigger if exists set_instant_qrs_updated_at on public.instant_qrs;
create trigger set_instant_qrs_updated_at
  before update on public.instant_qrs
  for each row execute procedure public.set_updated_at();
