-- « QR Dynamique » — liens instantanés DYNAMIQUES (redirigés par /q/[code]) avec essai 7 jours par lien.
--
-- Les QR de type « lien » peuvent devenir DYNAMIQUES : le QR encode qrowg.com/q/<short_code> et le
-- serveur résout la destination (modifiable) + applique l'expiration. Un lien créé en essai gratuit
-- expire 7 jours après sa création ; un abonnement « QR Dynamique » (étape ultérieure) lèvera l'expiration.
--
-- Les autres types (WiFi/texte/contact/appel/email) restent STATIQUES (colonnes ci-dessous à NULL).
-- Additif et idempotent : aucune donnée existante touchée.

alter table public.instant_qrs
  add column if not exists short_code  text,                        -- code de redirection (liens dynamiques)
  add column if not exists dest_url    text,                        -- destination résolue par /q/[code] (modifiable)
  add column if not exists dynamic     boolean not null default false, -- true = lien dynamique (redirigé + expirable)
  add column if not exists status      text not null default 'active', -- active | expired | paused
  add column if not exists expires_at  timestamptz,                 -- essai : création + 7 j (NULL = permanent)
  add column if not exists total_scans integer not null default 0,
  add column if not exists last_scan_at timestamptz;

-- short_code unique (uniquement quand présent). Le redirect /q/[code] cherche ici après qr_codes.
create unique index if not exists instant_qrs_short_code_key
  on public.instant_qrs(short_code) where short_code is not null;
