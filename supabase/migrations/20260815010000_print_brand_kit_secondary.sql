-- Print Studio — Charte de marque enrichie : couleur SECONDAIRE.
-- Additif et idempotent : n'affecte pas les chartes existantes (colonne NULL par défaut).
-- La couleur secondaire est appliquée au BOUTON (CTA) quand la charte est appliquée à un support.

ALTER TABLE print_brand_kit
  ADD COLUMN IF NOT EXISTS accent2 TEXT DEFAULT NULL;
