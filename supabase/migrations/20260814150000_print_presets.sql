-- Modèles de design Print Studio enregistrés au niveau du COMPTE
-- (synchronisés multi-appareils, au lieu du localStorage par navigateur).
-- Le client retombe gracieusement sur localStorage si cette table est absente.

create table if not exists print_presets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  name text not null,
  cfg jsonb not null default '{}'::jsonb,   -- réglages de DESIGN uniquement (ni QR ni textes ni images)
  created_at timestamptz not null default now()
);

alter table print_presets enable row level security;

-- L'utilisateur ne voit et ne gère que ses propres modèles.
drop policy if exists "print_presets_select_own" on print_presets;
create policy "print_presets_select_own" on print_presets for select using (auth.uid() = user_id);
drop policy if exists "print_presets_insert_own" on print_presets;
create policy "print_presets_insert_own" on print_presets for insert with check (auth.uid() = user_id);
drop policy if exists "print_presets_delete_own" on print_presets;
create policy "print_presets_delete_own" on print_presets for delete using (auth.uid() = user_id);

create index if not exists print_presets_user_idx on print_presets (user_id, created_at desc);
