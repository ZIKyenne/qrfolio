-- ============================================================
-- QRfolio — Seed : Templates & données de démo
-- ============================================================

-- ============================================================
-- ⚠️ LEGACY / NON UTILISÉ (acté le 2026-08-05) — cf. docs/TEMPLATE-ENGINE-PLAN.md
-- La table `page_templates` ci-dessous N'EST PLUS LUE : la galerie
-- (dashboard/templates) et le builder consomment désormais la source CODE
-- `app/dashboard/builder/page-templates.ts` (généralisée par `templateEngine.ts`).
-- Conservée pour l'historique local ; ne pas y ajouter de nouveaux templates.
-- ============================================================
-- TEMPLATES DE BASE (stockés comme référence JSON)
-- Ces données sont utilisées par le frontend pour pré-remplir
-- une nouvelle page selon la catégorie choisie.
-- ============================================================

-- Note : en production, ces templates sont dans un bucket Supabase Storage
-- sous storage/templates/*.json — le seed ici est pour la DB locale.

-- Table légère pour référencer les templates
create table if not exists public.page_templates (
  id            text primary key,
  name          text not null,
  category      text not null,
  description   text,
  preview_url   text,
  is_premium    boolean not null default false,
  -- Blocs par défaut du template
  default_blocks jsonb not null default '[]',
  -- Thème par défaut
  default_theme  jsonb not null default '{}',
  created_at    timestamptz not null default now()
);

-- Template : Freelance
insert into public.page_templates (id, name, category, description, is_premium, default_blocks, default_theme) values
('freelance', 'Freelance Pro', 'freelance', 'Idéal pour les consultants, développeurs, designers indépendants', false,
'[
  {"type": "profile", "position": 0, "content": {"name": "Votre Nom", "title": "Votre Métier", "photo_placeholder": true}},
  {"type": "bio", "position": 1, "content": {"text": "Décrivez votre expertise en quelques mots..."}},
  {"type": "social_links", "position": 2, "content": {"links": [{"platform": "linkedin", "url": ""}, {"platform": "github", "url": ""}, {"platform": "twitter", "url": ""}]}},
  {"type": "cta_button", "position": 3, "content": {"label": "Télécharger mon CV", "url": "", "style": "primary"}},
  {"type": "testimonials", "position": 4, "content": {"items": []}},
  {"type": "contact_form", "position": 5, "content": {"fields": ["name", "email", "message"]}}
]',
'{"name": "midnight_gold", "background": "#080808", "primary": "#C9A84C", "secondary": "#39FF8F", "text": "#F5F0E8", "font_display": "Cormorant Garamond", "font_body": "DM Sans"}');

-- Template : Restaurant
insert into public.page_templates (id, name, category, description, is_premium, default_blocks, default_theme) values
('restaurant', 'Restaurant & Bar', 'restaurant', 'Carte, horaires, réservations pour restaurants et bars', false,
'[
  {"type": "profile", "position": 0, "content": {"name": "Nom du Restaurant", "title": "Cuisine · Ville", "photo_placeholder": true}},
  {"type": "bio", "position": 1, "content": {"text": "Notre histoire, notre passion..."}},
  {"type": "cta_button", "position": 2, "content": {"label": "Réserver une table", "url": "", "style": "primary"}},
  {"type": "gallery", "position": 3, "content": {"items": [], "layout": "grid"}},
  {"type": "google_maps", "position": 4, "content": {"address": "", "zoom": 15}},
  {"type": "contact_form", "position": 5, "content": {"fields": ["name", "email", "phone", "message"]}}
]',
'{"name": "warm_gold", "background": "#1A0A00", "primary": "#D4A843", "secondary": "#FF6B35", "text": "#FFF8F0", "font_display": "Playfair Display", "font_body": "Lato"}');

-- Template : Artiste
insert into public.page_templates (id, name, category, description, is_premium, default_blocks, default_theme) values
('artist', 'Artiste & Créatif', 'artist', 'Portfolio visuel pour artistes, photographes, illustrateurs', false,
'[
  {"type": "profile", "position": 0, "content": {"name": "Votre Nom", "title": "Artiste · Discipline", "photo_placeholder": true}},
  {"type": "bio", "position": 1, "content": {"text": "Ma vision créative..."}},
  {"type": "gallery", "position": 2, "content": {"items": [], "layout": "masonry"}},
  {"type": "social_links", "position": 3, "content": {"links": [{"platform": "instagram", "url": ""}, {"platform": "behance", "url": ""}]}},
  {"type": "cta_button", "position": 4, "content": {"label": "Commander une œuvre", "url": "", "style": "primary"}},
  {"type": "contact_form", "position": 5, "content": {"fields": ["name", "email", "message"]}}
]',
'{"name": "dark_neon", "background": "#050508", "primary": "#B347FF", "secondary": "#39FF8F", "text": "#F0F0FF", "font_display": "Space Grotesk", "font_body": "Inter"}');

-- Template : Événement
insert into public.page_templates (id, name, category, description, is_premium, default_blocks, default_theme) values
('event', 'Événement', 'event', 'Conférence, concert, mariage — la page qui donne envie de venir', false,
'[
  {"type": "profile", "position": 0, "content": {"name": "Nom de l''événement", "title": "Date · Lieu", "photo_placeholder": true}},
  {"type": "bio", "position": 1, "content": {"text": "Présentation de l''événement..."}},
  {"type": "cta_button", "position": 2, "content": {"label": "Je m''inscris", "url": "", "style": "primary"}},
  {"type": "google_maps", "position": 3, "content": {"address": "", "zoom": 15}},
  {"type": "visit_counter", "position": 4, "content": {"label": "personnes intéressées"}},
  {"type": "contact_form", "position": 5, "content": {"fields": ["name", "email"]}}
]',
'{"name": "electric_dark", "background": "#080010", "primary": "#6C63FF", "secondary": "#FF6B9D", "text": "#F5F5FF", "font_display": "Bebas Neue", "font_body": "DM Sans"}');

-- Template : CV
insert into public.page_templates (id, name, category, description, is_premium, default_blocks, default_theme) values
('cv', 'CV Numérique', 'cv', 'Un CV interactif et mémorable pour décrocher le bon poste', false,
'[
  {"type": "profile", "position": 0, "content": {"name": "Prénom Nom", "title": "Poste recherché", "photo_placeholder": true}},
  {"type": "bio", "position": 1, "content": {"text": "Mon parcours en quelques mots..."}},
  {"type": "cta_button", "position": 2, "content": {"label": "Télécharger mon CV PDF", "url": "", "style": "primary"}},
  {"type": "social_links", "position": 3, "content": {"links": [{"platform": "linkedin", "url": ""}, {"platform": "github", "url": ""}]}},
  {"type": "contact_form", "position": 4, "content": {"fields": ["name", "email", "message"]}}
]',
'{"name": "professional_blue", "background": "#0A0F1E", "primary": "#2D7DD2", "secondary": "#39FF8F", "text": "#E8EDF5", "font_display": "Raleway", "font_body": "Open Sans"}');

-- Template : Boutique
insert into public.page_templates (id, name, category, description, is_premium, default_blocks, default_theme) values
('boutique', 'Boutique', 'shop', 'Vendre en ligne sans site e-commerce complexe', true,
'[
  {"type": "profile", "position": 0, "content": {"name": "Ma Boutique", "title": "Spécialité · Ville", "photo_placeholder": true}},
  {"type": "bio", "position": 1, "content": {"text": "Notre sélection..."}},
  {"type": "gallery", "position": 2, "content": {"items": [], "layout": "grid"}},
  {"type": "stripe_product", "position": 3, "content": {"products": []}},
  {"type": "cta_button", "position": 4, "content": {"label": "Voir toute la collection", "url": "", "style": "primary"}},
  {"type": "contact_form", "position": 5, "content": {"fields": ["name", "email", "message"]}}
]',
'{"name": "luxury_dark", "background": "#0A0806", "primary": "#C9A84C", "secondary": "#E8C96A", "text": "#F5F0E8", "font_display": "Cormorant Garamond", "font_body": "DM Sans"}');

-- RLS pour templates (lecture publique)
alter table public.page_templates enable row level security;
create policy "Templates lisibles par tous" on public.page_templates
  for select using (true);
