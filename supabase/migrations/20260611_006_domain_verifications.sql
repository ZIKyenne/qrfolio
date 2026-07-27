-- ============================================================
-- QRfolio — Migration 006 : Domaines personnalisés
-- ============================================================

-- Table de vérification des domaines
create table if not exists public.domain_verifications (
  id              uuid primary key default uuid_generate_v4(),
  user_id         uuid not null references public.profiles(id) on delete cascade,
  page_id         uuid not null references public.pages(id) on delete cascade,
  domain          text not null,
  -- Vérification TXT DNS
  txt_record      text not null,        -- valeur du TXT à créer: qrfolio-verify=<token>
  verified        boolean not null default false,
  verified_at     timestamptz,
  -- Statut Vercel
  vercel_status   text default 'pending', -- pending | active | error
  vercel_error    text,
  -- Timestamps
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  -- Un utilisateur ne peut ajouter un domaine qu'une seule fois (mais plusieurs
  -- comptes peuvent le revendiquer en attente : anti-squatting, cf index unique
  -- partiel ci-dessous qui n'autorise qu'UN seul propriétaire VÉRIFIÉ).
  unique(user_id, domain)
);

alter table public.domain_verifications enable row level security;

create policy "Lecture propre" on public.domain_verifications
  for select using (auth.uid() = user_id);

create policy "Insert propre" on public.domain_verifications
  for insert with check (auth.uid() = user_id);

create policy "Update propre" on public.domain_verifications
  for update using (auth.uid() = user_id);

create policy "Delete propre" on public.domain_verifications
  for delete using (auth.uid() = user_id);

create index if not exists idx_domain_verif_user
  on public.domain_verifications(user_id);

-- UNIQUE partiel : un domaine ne peut être VÉRIFIÉ que par un seul compte.
-- Le premier à prouver la propriété (TXT) le verrouille ; les revendications en
-- attente d'autres comptes restent possibles mais ne pourront pas être vérifiées.
create unique index if not exists idx_domain_verif_domain
  on public.domain_verifications(domain)
  where verified = true;

-- Trigger updated_at
create or replace function public.handle_domain_updated()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end; $$;

create trigger domain_updated
  before update on public.domain_verifications
  for each row execute function public.handle_domain_updated();
