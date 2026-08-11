-- « QR Dynamique » — Sécurité du lien (palier Pro+) : mot de passe, expiration programmée,
-- pause/activation manuelle. Additif et idempotent.
--
-- · password_hash : gate le scan derrière un mot de passe (format "salt:hash" scrypt, cf
--   lib/linkPassword). NULL = pas de mot de passe.
-- · paused_reason : distingue une pause MANUELLE (choisie par l'utilisateur, jamais réactivée
--   automatiquement) d'une pause QUOTA (posée par la réconciliation d'abonnement, réactivable).
--   Valeurs : NULL | 'quota' | 'manual'.
-- L'expiration programmée réutilise la colonne existante `expires_at`.

alter table public.instant_qrs
  add column if not exists password_hash text,
  add column if not exists paused_reason text;
