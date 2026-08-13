-- Dédup de l'alerte email « votre QR dynamique gratuit expire bientôt »
-- (cron /api/cron/dynamic-expiry). Stocke le dernier palier notifié par QR : "d3" / "d1".
-- Additif et idempotent ; le cron est tolérant si la colonne est absente.

alter table if exists instant_qrs
  add column if not exists expiry_alert_stage text;
