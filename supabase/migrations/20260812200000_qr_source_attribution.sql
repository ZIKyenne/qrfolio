-- Attribution par support physique — relier chaque événement de page au QR qui l'a amené.
--
-- Aujourd'hui la chaîne scan → vue → clic → conversion est CASSÉE : le redirect /q/[code]
-- envoie vers la page SANS identifiant du QR, donc page_views / block_clicks / leads sont
-- anonymes vis-à-vis du QR d'origine (impossible de savoir quel support a converti).
--
-- On ajoute :
--  · qr_codes.label   : nom du support donné par l'utilisateur (« Vitrine », « Table 4 », « Flyer »…).
--  · qr_source (= short_code du QR scanné) sur page_views / block_clicks / leads : propagé par
--    le redirect (?s=<code>) puis persisté à chaque événement -> funnel + ROI PAR support.
--
-- Additif, idempotent, colonnes NULLABLES : aucune régression. Non rétroactif (ne pistera
-- que les scans à partir de la mise en ligne — les événements passés restent qr_source NULL).

alter table public.qr_codes
  add column if not exists label text;

alter table public.page_views
  add column if not exists qr_source text;

alter table public.block_clicks
  add column if not exists qr_source text;

alter table public.leads
  add column if not exists qr_source text;

-- Index partiels légers pour l'agrégation « par support » (requête filtrée par page + période,
-- puis groupée par qr_source côté serveur/app).
create index if not exists page_views_qr_source_idx  on public.page_views  (qr_source) where qr_source is not null;
create index if not exists block_clicks_qr_source_idx on public.block_clicks (qr_source) where qr_source is not null;
create index if not exists leads_qr_source_idx        on public.leads        (qr_source) where qr_source is not null;
