-- Durcissement Équipe (revue 2026-07-27) : les invitations expirent.
-- Un lien d'invitation fuité (transfert d'e-mail, historique) ne doit pas rester
-- acceptable indéfiniment. 7 jours par défaut ; l'app repose expires_at à chaque
-- (ré)invitation, l'acceptation rejette au-delà.
alter table public.team_invitations
  add column if not exists expires_at timestamptz not null default (now() + interval '7 days');
