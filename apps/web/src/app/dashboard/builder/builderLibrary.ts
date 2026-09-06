// builderLibrary.ts — Modèle de présentation PUR de la bibliothèque de blocs (mission C02, Vague 2).
// Aucune dépendance React/Supabase/Builder : dérive un modèle testable à partir de BLOCK_DEFS,
// BLOCK_CATEGORIES, BLOCK_HINTS et BLOCK_SYNONYMS (déjà existants — on NE les modifie pas). Fournit
// recherche normalisée, catégories, favoris/récents (ops pures réutilisant les clés localStorage
// existantes), recommandations déterministes, classification premium (affichage), insertion et
// garde anti-double-ajout. Consommé par BlockLibrary.tsx, derrière le flag BUILDER_REDESIGN.

import { BLOCK_CATEGORIES, type BlockDef } from "./types"
import { BLOCK_HINTS } from "./editorPresets"
import { BLOCK_DEFS, BLOCS_MASQUES, blocsProposables } from "./blockDefs"
import { BLOCK_SYNONYMS } from "./builderSearch"

// Clés localStorage EXISTANTES (BuilderV4) — réutilisées, jamais dupliquées.
export const FAV_STORAGE_KEY = "qrfolio_fav_blocks"
export const RECENT_STORAGE_KEY = "qrfolio_recent_blocks"
export const RECENT_MAX = 8

// ── Libellés utilisateur plus clairs (§6) — n'affecte QUE l'affichage, pas les types ──
// Surcharge ciblée : quand le label de BLOCK_DEFS contient un terme technique.
export const LIBRARY_LABEL_OVERRIDES: Record<string, string> = {
  cta_button: "Bouton d'action",
  multi_cta: "Boutons d'action",
  embed_block: "Contenu intégré",
  rich_text: "Texte enrichi",
  spacer: "Espace",
  divider: "Séparateur",
  hero_banner: "Grande bannière",
  grid_section: "Grille de cartes",
  two_columns: "Deux colonnes",
  tabs_block: "Onglets",
  accordion_block: "Sections repliables",
  pricing: "Tarifs",
  section_banner: "Titre de section",
}

// ── Classification PREMIUM (affichage uniquement, §16) ───────────────────────
// AUCUNE application de quota ici : c'est une sélection produit statique servant au badge et à
// l'explication « débloqué avec … ». L'ajout n'est pas bloqué (aucun gating par bloc n'existe
// aujourd'hui). Voir docs/BUILDER-BLOCK-LIBRARY-REDESIGN.md §Premium.
export const PREMIUM_BLOCK_TYPES = new Set<string>([
  "instagram_feed", "tiktok_feed", "youtube_channel", "twitch_live",
  "product_catalog", "offer_comparison", "packs", "featured_product", "services_pricing",
  "event_ticketing", "booking_request", "video_testimonials", "before_after", "media_before_after",
  "business_certifications", "service_area", "logo_wall",
])

export interface PremiumInfo {
  isPremium: boolean
  /** Plan qui met en avant ce bloc (informatif). */
  plan?: string
  benefit?: string
}

export function premiumInfo(type: string): PremiumInfo {
  if (!PREMIUM_BLOCK_TYPES.has(type)) return { isPremium: false }
  return { isPremium: true, plan: "Pro", benefit: "Bloc avancé, inclus dans les offres supérieures" }
}

// ── Modèle d'un item de bibliothèque ─────────────────────────────────────────
export interface BlockLibraryItem {
  type: string
  title: string        // libellé clair (override éventuel)
  rawLabel: string     // libellé BLOCK_DEFS d'origine (recherche par ancien nom)
  description: string
  category: string     // id de catégorie (ex. "actions")
  categoryLabel: string
  icon: string
  color: string
  keywords: string[]   // mots-clés dérivés (label, catégorie, synonymes, overlay métier)
  useCases: string[]   // cas d'usage (BLOCK_HINTS.hint) — pour recherche + fiche détail
  isPremium: boolean
  isFavorite: boolean
  isRecent: boolean
  isRecommended: boolean
}

// Mots-clés/métier ciblés pour garantir les recherches documentées (§8). Additif aux dérivés.
export const LIBRARY_KEYWORDS: Record<string, string[]> = {
  table_booking: ["réserver", "réservation", "booking", "table", "restaurant", "rendez-vous"],
  reservation_form: ["réserver", "réservation", "booking", "table", "demande"],
  booking_button: ["réserver", "réservation", "booking", "rendez-vous"],
  booking_request: ["réserver", "réservation", "booking", "demande", "concert", "prestation"],
  calendly: ["réserver", "rendez-vous", "agenda", "booking", "calendly"],
  add_to_calendar: ["agenda", "calendrier", "date", "réserver"],
  pricing: ["prix", "tarifs", "tarif", "pricing", "abonnement", "offre", "forfait"],
  services_pricing: ["prix", "tarifs", "prestations", "devis"],
  offer_comparison: ["prix", "tarifs", "comparatif", "offre", "pricing"],
  packs: ["prix", "tarifs", "pack", "formule", "offre"],
  journey: ["cv", "parcours", "expérience", "carrière", "timeline"],
  expertise: ["cv", "compétences", "expertise", "savoir-faire"],
  skills: ["cv", "compétences", "tags", "savoir-faire"],
  certifications: ["cv", "diplômes", "certifications", "formation"],
  documents: ["cv", "documents", "fichiers", "pdf", "téléchargement"],
  about: ["cv", "à propos", "présentation", "parcours"],
  menu_section: ["restaurant", "menu", "carte", "plats", "cuisine"],
  opening_hours: ["restaurant", "horaires", "ouverture", "planning"],
  instagram_feed: ["instagram", "réseaux", "feed", "photos", "social"],
  social_links: ["instagram", "réseaux", "tiktok", "linkedin", "liens", "social"],
  social_feature: ["instagram", "réseaux", "social", "mis en avant"],
  album_block: ["musique", "album", "discographie", "sortie"],
  discography: ["musique", "album", "discographie", "sorties"],
  concerts: ["musique", "concerts", "tournée", "dates", "live"],
  spotify_embed: ["musique", "spotify", "lecteur", "écoute"],
  spotify_player: ["musique", "spotify", "lecteur", "playlist"],
  audio_player: ["musique", "audio", "son", "lecteur"],
  music_links: ["musique", "spotify", "deezer", "apple music", "liens"],
  google_reviews_block: ["avis", "google", "note", "témoignage"],
  testimonials: ["avis", "témoignage", "clients", "recommandation"],
}

// Normalisation : minuscule + suppression des accents. Base de toute la recherche.
export function normalizeSearch(s: string): string {
  return s.toLowerCase().normalize("NFD").replace(new RegExp("[\\u0300-\\u036f]", "g"), "").trim()
}

// Dérive les mots-clés d'un bloc : label, catégorie, type, groupes de synonymes pertinents,
// et overlay métier ciblé. Déterministe.
function deriveKeywords(type: string, def: BlockDef, categoryLabel: string): string[] {
  const base = [def.label, def.description, categoryLabel, type.replace(/_/g, " ")]
  const synHits: string[] = []
  const hay = normalizeSearch(def.label + " " + def.description)
  for (const [syn, aliases] of Object.entries(BLOCK_SYNONYMS)) {
    const terms = [syn, ...aliases]
    if (terms.some(t => hay.includes(normalizeSearch(t)))) synHits.push(...terms)
  }
  const overlay = LIBRARY_KEYWORDS[type] ?? []
  return Array.from(new Set([...base, ...synHits, ...overlay].map(k => k.trim()).filter(Boolean)))
}

export interface BuildLibraryOptions {
  favorites?: string[]
  recents?: string[]
  recommended?: string[]
}

// Construit la liste complète des items depuis BLOCK_DEFS. Pur, sans effet de bord.
export function buildLibraryItems(opts: BuildLibraryOptions = {}): BlockLibraryItem[] {
  const fav = new Set(opts.favorites ?? [])
  const rec = new Set(opts.recents ?? [])
  const reco = new Set(opts.recommended ?? [])
  const catLabel = (id: string) => BLOCK_CATEGORIES.find(c => c.id === id)?.label ?? id
  return blocsProposables().map(([type, def]) => {
    const categoryLabel = catLabel(def.category)
    const hint = BLOCK_HINTS[type]?.hint
    return {
      type,
      title: LIBRARY_LABEL_OVERRIDES[type] ?? def.label,
      rawLabel: def.label,
      description: def.description,
      category: def.category,
      categoryLabel,
      icon: def.icon,
      color: def.color,
      keywords: deriveKeywords(type, def, categoryLabel),
      useCases: hint ? [hint] : [],
      isPremium: PREMIUM_BLOCK_TYPES.has(type),
      isFavorite: fav.has(type),
      isRecent: rec.has(type),
      isRecommended: reco.has(type),
    }
  })
}

// ── Catégories de la bibliothèque (avec compte réel) ─────────────────────────
export interface LibraryCategory { id: string; label: string; icon: string; color: string; desc: string; count: number }

export function libraryCategories(items: BlockLibraryItem[]): LibraryCategory[] {
  return BLOCK_CATEGORIES.map(c => ({
    id: c.id, label: c.label, icon: c.icon, color: c.color, desc: c.desc,
    count: items.filter(i => i.category === c.id).length,
  }))
}

// Vérifie que chaque bloc appartient à une catégorie visible (aucun orphelin). Testé.
export function orphanBlockTypes(items: BlockLibraryItem[]): string[] {
  const known = new Set(BLOCK_CATEGORIES.map(c => c.id))
  return items.filter(i => !known.has(i.category)).map(i => i.type)
}

// ── Recherche ────────────────────────────────────────────────────────────────
// Score pondéré, accents-insensible, multi-mots (ET : chaque terme doit matcher quelque chose).
// Barème : titre exact 120 · titre préfixe 90 · titre inclus 80 · ancien label 70 · description 55 ·
// cas d'usage 50 · mot-clé/synonyme/métier 45 · catégorie 30.
export function scoreLibraryItem(item: BlockLibraryItem, query: string): number {
  const nq = normalizeSearch(query)
  if (!nq) return 0
  const terms = nq.split(/\s+/).filter(Boolean)
  const title = normalizeSearch(item.title)
  const rawLabel = normalizeSearch(item.rawLabel)
  const desc = normalizeSearch(item.description)
  const cat = normalizeSearch(item.categoryLabel)
  const kws = item.keywords.map(normalizeSearch)
  const uses = item.useCases.map(normalizeSearch)

  const scoreTerm = (t: string): number => {
    if (title === t) return 120
    if (title.startsWith(t)) return 90
    if (title.includes(t)) return 80
    if (rawLabel.includes(t)) return 70
    if (desc.includes(t)) return 55
    if (uses.some(u => u.includes(t))) return 50
    if (kws.some(k => k.includes(t) || t.includes(k))) return 45
    if (cat.includes(t)) return 30
    return 0
  }
  let total = 0
  for (const t of terms) {
    const s = scoreTerm(t)
    if (s === 0) return 0 // ET : un terme sans match → l'item ne correspond pas
    total += s
  }
  return total
}

// Résultats triés (score décroissant, puis titre pour un ordre déterministe).
export function searchLibrary(items: BlockLibraryItem[], query: string): BlockLibraryItem[] {
  if (!normalizeSearch(query)) return items
  return items
    .map(i => ({ i, s: scoreLibraryItem(i, query) }))
    .filter(r => r.s > 0)
    .sort((a, b) => b.s - a.s || a.i.title.localeCompare(b.i.title))
    .map(r => r.i)
}

// ── Favoris (ops PURES — la coquille garde l'état, mêmes clés localStorage) ───
export function toggleFavorite(favorites: string[], type: string): string[] {
  return favorites.includes(type) ? favorites.filter(t => t !== type) : [...favorites, type]
}

// ── Récents (ops PURES, borne RECENT_MAX, dernier en premier, sans doublon) ───
export function pushRecentType(recents: string[], type: string, max: number = RECENT_MAX): string[] {
  return [type, ...recents.filter(t => t !== type)].slice(0, max)
}

// Nettoie une liste de récents des types disparus du catalogue (§12).
export function sanitizeRecents(recents: string[], knownTypes: string[] = blocsProposables().map(([t]) => t)): string[] {
  const known = new Set(knownTypes)
  return recents.filter(t => known.has(t))
}

// ── Recommandations déterministes (§13) — aucune IA, aucun réseau ────────────
export type RecoContext = "default" | "pro" | "creator" | "restaurant" | "event" | "commerce" | "music"

const RECO_MAP: Record<RecoContext, string[]> = {
  default:    ["profile", "cta_button", "social_links", "bio", "contact_form", "testimonials"],
  pro:        ["profile", "services_list", "pricing", "contact_form", "testimonials", "opening_hours"],
  creator:    ["social_links", "portfolio_work", "video", "spotify_embed", "cta_button", "gallery"],
  restaurant: ["menu_section", "table_booking", "opening_hours", "google_maps", "testimonials", "gallery"],
  event:      ["event_info", "event_program", "event_ticketing", "google_maps", "rsvp", "countdown"],
  commerce:   ["product", "pricing", "product_catalog", "promo_banner", "contact_form", "testimonials"],
  music:      ["spotify_embed", "album_block", "concerts", "music_links", "merch", "cta_button"],
}

// Types recommandés pour un contexte, filtrés aux blocs réellement existants. Déterministe.
export function recommendedForContext(context: RecoContext = "default"): string[] {
  const known = new Set(blocsProposables().map(([t]) => t))
  return (RECO_MAP[context] ?? RECO_MAP.default).filter(t => known.has(t))
}

// ── Essentiels : vue PAR DEFAUT de la bibliotheque (QWG-0017) ────────────────
// ~20 blocs presentes au debutant pour ne pas le noyer sous les 143 : les
// recommandations contextuelles EN PREMIER, completees par les blocs universels
// les plus utiles (dedupliques, plafonnes a 20). Les 143 blocs restent TOUS
// accessibles via l'onglet "Tout", les categories et la recherche.
const UNIVERSAL_CORE: string[] = [
  "profile", "bio", "cta_button", "heading", "social_links", "gallery",
  "image", "video", "services_list", "pricing", "testimonials", "contact_form",
  "opening_hours", "google_maps", "faq", "product", "promo_banner", "menu_section",
  "portfolio_work", "countdown",
]

export function essentialsForContext(context: RecoContext = "default"): string[] {
  const known = new Set(blocsProposables().map(([t]) => t))
  const seen = new Set<string>()
  const out: string[] = []
  for (const t of [...(RECO_MAP[context] ?? RECO_MAP.default), ...UNIVERSAL_CORE]) {
    if (known.has(t) && !seen.has(t)) { seen.add(t); out.push(t) }
    if (out.length >= 20) break
  }
  return out
}

// ── Insertion + garde anti-double-ajout (§17) ────────────────────────────────
// Résout l'index d'insertion (undefined = fin). Borne à [0, total].
export function resolveInsertIndex(total: number, at?: number): number {
  if (at == null || !Number.isFinite(at)) return total
  return Math.max(0, Math.min(total, Math.floor(at)))
}

// Vrai si un ajout doit être IGNORÉ (double-clic / double déclenchement rapide du même bloc).
export function isDuplicateAdd(lastType: string | null, lastTime: number, type: string, now: number, windowMs = 350): boolean {
  return lastType === type && now - lastTime < windowMs
}

// ── État sans résultat (§9) — catégories proches à proposer ──────────────────
export function nearbyCategories(items: BlockLibraryItem[], query: string, max = 3): LibraryCategory[] {
  const nq = normalizeSearch(query)
  if (!nq) return []
  const cats = libraryCategories(items)
  // Catégories dont le label/desc contient un terme, sinon les plus fournies.
  const terms = nq.split(/\s+/).filter(Boolean)
  const hit = cats.filter(c => terms.some(t => normalizeSearch(c.label + " " + c.desc).includes(t)))
  const rest = cats.filter(c => !hit.includes(c)).sort((a, b) => b.count - a.count)
  return [...hit, ...rest].slice(0, max)
}
