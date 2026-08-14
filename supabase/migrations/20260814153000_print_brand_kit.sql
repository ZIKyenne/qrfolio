-- Charte (brand kit) Print Studio par compte : logo + couleur d'accent + police,
-- appliquée en 1 clic sur n'importe quel support. Repli localStorage si absente.

create table if not exists print_brand_kit (
  user_id uuid primary key default auth.uid() references auth.users(id) on delete cascade,
  logo text,       -- data URL du logo (optionnel)
  accent text,     -- id de couleur d'accent (ACCENTS) ou "auto"
  typo text,       -- id de police (TYPOS) ou "auto"
  updated_at timestamptz not null default now()
);

alter table print_brand_kit enable row level security;

drop policy if exists "print_brand_kit_select_own" on print_brand_kit;
create policy "print_brand_kit_select_own" on print_brand_kit for select using (auth.uid() = user_id);
drop policy if exists "print_brand_kit_insert_own" on print_brand_kit;
create policy "print_brand_kit_insert_own" on print_brand_kit for insert with check (auth.uid() = user_id);
drop policy if exists "print_brand_kit_update_own" on print_brand_kit;
create policy "print_brand_kit_update_own" on print_brand_kit for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
