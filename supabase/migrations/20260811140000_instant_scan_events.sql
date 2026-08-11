-- Événements de scan des QR DYNAMIQUES — un enregistrement par scan, pour les statistiques
-- détaillées (palier Pro+ de l'offre « QR Dynamique » : par jour / appareil / pays).
--
-- Écriture : par le redirect /q/[code] via le client ADMIN (service role, hors RLS).
-- Lecture : le propriétaire uniquement (dashboard). Données réelles, aucun chiffre inventé.

create table if not exists public.instant_scan_events (
  id            bigint generated always as identity primary key,
  instant_qr_id uuid not null references public.instant_qrs(id) on delete cascade,
  user_id       uuid not null,                 -- dénormalisé (propriétaire du QR) pour RLS + agrégation rapide
  scanned_at    timestamptz not null default now(),
  device        text,                          -- mobile | tablet | desktop | bot | unknown
  country       text,                          -- code ISO-2 (x-vercel-ip-country), ou NULL si inconnu
  referrer      text
);

create index if not exists instant_scan_events_qr_idx   on public.instant_scan_events(instant_qr_id, scanned_at desc);
create index if not exists instant_scan_events_user_idx on public.instant_scan_events(user_id, scanned_at desc);

alter table public.instant_scan_events enable row level security;

-- Le propriétaire lit ses propres événements. (Les INSERT passent par le service role
-- du redirect, qui contourne la RLS : aucune policy d'insertion n'est nécessaire.)
drop policy if exists "own scan events read" on public.instant_scan_events;
create policy "own scan events read" on public.instant_scan_events
  for select using (auth.uid() = user_id);
