// architecture.ts — CONTRATS PRÉPARATOIRES du renderer partagé (mission B09.1).
// INERTE : aucun renderer ne l'importe, aucun effet runtime, aucun bloc migré.
// Sert de référence typée pour B09.2 (infra + 3 pilotes derrière flag). Voir
// docs/SHARED-RENDERER-ARCHITECTURE.md.

import type { ComponentType, ReactNode } from "react"
import type { PageTheme } from "../types"

// ── Mode & statut de migration ──────────────────────────────────────────────
export type RenderMode = "editor" | "public"
// legacy = 2 renderers actuels ; pilot = migré mais derrière flag ; shared = activé.
export type RendererMigrationStatus = "legacy" | "pilot" | "shared"

// ── Contextes (capacités explicites, PAS 50 callbacks optionnels) ───────────
export type SharedBlockContext = {
  mode: RenderMode
  pageId: string
  blockId: string
  theme: PageTheme
}

// Capacité d'édition inline (fournie uniquement en mode éditeur).
export type InlineEditCapability = {
  editable: boolean
  commit: (key: string, value: string) => void
}

// Capacité de rendu de lien : l'adapter décide navigable (public) vs neutralisé (éditeur).
export type LinkRenderProps = { href: string | null; label: ReactNode; external?: boolean; trackKey?: string }
export type LinkRenderer = ComponentType<LinkRenderProps>

// Capacité de tracking (public uniquement ; jamais dans les models purs).
export type TrackingCapability = {
  onLinkClick?: (target: string) => void
  onImpression?: () => void
}

export type EditorBlockContext = SharedBlockContext & {
  mode: "editor"
  selected: boolean
  locked: boolean
  compact: boolean
  onSelect: () => void
  inlineEdit: InlineEditCapability
  Link: LinkRenderer            // rend un élément NON navigable
}

export type PublicBlockContext = SharedBlockContext & {
  mode: "public"
  ownerEmail?: string
  tracking: TrackingCapability
  Link: LinkRenderer            // rend un <a> réel sécurisé + tracké
}

export type AnyBlockContext = EditorBlockContext | PublicBlockContext

// ── View model : PUR, sans React. `visible` = décision d'état vide sémantique. ──
export type BlockViewModel = { visible: boolean }

// Contexte minimal passé au constructeur de view model (pur : thème + ids, pas de callbacks).
export type ViewModelContext = { theme: PageTheme; pageId: string; blockId: string }

// ── Enregistrement d'un bloc dans le registre partagé ───────────────────────
export type SharedViewProps<TViewModel extends BlockViewModel> = { model: TViewModel; ctx: AnyBlockContext }
export type BlockRendererRegistration<TContent = Record<string, any>, TViewModel extends BlockViewModel = BlockViewModel> = {
  type: string
  status: RendererMigrationStatus
  createViewModel: (content: TContent, ctx: ViewModelContext) => TViewModel
  SharedView?: ComponentType<SharedViewProps<TViewModel>>
  EditorAdapter?: ComponentType<SharedViewProps<TViewModel>>
  PublicAdapter?: ComponentType<SharedViewProps<TViewModel>>
}

// ── Flag de migration — pilotes ACTIVÉS (B09.3) ─────────────────────────────
// Parité prouvée par renderParity.test.tsx (HTML identique au legacy) + models/bundle.
// Rollback = retirer un type de ce set → retour legacy immédiat, aucune donnée touchée.
// Les `case` legacy restent conservés (statut « pilot activé », pas « legacy supprimable »).
export const SHARED_RENDERER_BLOCKS: ReadonlySet<string> = new Set<string>([
  // Pilotes B09.3
  "heading", "values", "pricing",
  // Vague 1 — blocs atomiques simples (B09.4)
  "divider", "spacer", "bio", "skills", "languages", "advantages",
  // Vague 2 — CTA & cartes simples (B09.5)
  "whatsapp_button", "email_button", "download_file", "order_online", "donation", "google_review",
  // Vague 3 — répétiteurs simples (B09.6)
  "process_steps", "on_site_services", "engagements", "trust_badge", "stats_block", "event_program",
  // Vague 4 — répétiteurs & blocs métier intermédiaires (B09.7)
  "testimonials", "business_stats", "brands", "lineup", "reassurance", "timeline",
  // Vague 5 — blocs commerce & événement avancés (B09.8)
  "menu_section", "services_list", "promo_banner", "gift_card", "event_info", "event_ticketing",
  // Vague 6 — blocs média simples (B09.9)
  "image", "portfolio_work", "favorite_links", "concerts", "merch", "app_download",
  // Vague 7 — blocs média interactifs à risque modéré (B09.10)
  "video_local", "audio_player", "pdf_viewer", "spotify_embed", "spotify_player", "before_after",
  // Vague 8 — blocs précédemment bloqués, sécurisés par B09.11 (B09.12)
  "video", "google_maps_embed", "album_block", "discography", "podcast_links", "product_catalog",
  // Nouveau — grande carte à onglets (gros menus)
  "menu_tabs",
  // ── Vague LAYOUT — 35 blocs « Création libre » (composition libre de page) ──
  // Écrits directement pour le renderer partagé : aucun `case` legacy à maintenir,
  // donc aucun risque de dérive entre l'aperçu de l'éditeur et la page publiée.
  "free_section", "image_text", "split_panel", "overlay_card",
  "frame_box", "banner_strip", "full_bleed_image", "stack_cards",
  "free_grid", "columns_text", "image_mosaic", "logo_marquee",
  "avatar_row", "shape_divider", "decor_line", "marquee_text",
  "ribbon_banner", "color_band", "big_statement", "text_columns",
  "numbered_list", "checklist", "definition_list", "card_link",
  "anchor_nav", "anchor_target", "toggle_content", "back_to_top",
  "steps_horizontal", "stat_hero", "badge_row", "icon_row",
  "compare_two", "progress_bars", "highlight_box",
  // ── Vague 9 — logos, certifications et tableaux (6 blocs) ──
  // Ils etaient ecrits deux fois et avaient diverge : coche visible seulement dans
  // l'apercu, cases « Logo » factices, filets figes en blanc (invisibles sur theme
  // clair), valeur coupee d'un cote et repliee de l'autre. Une seule source desormais.
  "logo_wall", "partners", "certifications", "business_certifications",
  "info_table", "legal_info",
  // ── Vague 10 — presentation et encadres (6 blocs) ──
  // founder_message inventait un message dans l'apercu ; quote_block et company
  // n'appliquaient pas la meme regle de vide des deux cotes ; expertise ecrivait
  // « NaN% » dans la largeur de sa barre quand le niveau manquait.
  "quote_block", "info_box", "founder_message", "company", "journey", "expertise",
  // ── Vague 11 — compteurs et offres (6 blocs) ──
  // La famille ou vivaient les faux chiffres : « 14 places restantes » et
  // « 1 234 visiteurs » etaient encore dessines dans l'apercu, sur des blocs que la
  // page ne publiait pas. Un compteur sans chiffre ne s'affiche plus nulle part.
  "scan_counter", "sales_counter", "participants_count",
  "promo_code", "tickets_left", "limited_offer",
])

// Blocs prévus comme pilotes en B09.2 (déclaratif, NON activé). Voir SHARED-RENDERER-PILOT.md.
export const PLANNED_PILOT_BLOCKS = ["heading", "values", "pricing"] as const

// Résout quel moteur utiliser. Par défaut LEGACY tant que le type n'est pas dans le flag.
export function resolveRendererStatus(type: string, active: ReadonlySet<string> = SHARED_RENDERER_BLOCKS): RendererMigrationStatus {
  return active.has(type) ? "shared" : "legacy"
}

// Statut de migration à 3 états : shared si activé, pilot si prêt mais non activé, sinon legacy.
export function migrationStatusOf(type: string, active: ReadonlySet<string> = SHARED_RENDERER_BLOCKS): RendererMigrationStatus {
  if (active.has(type)) return "shared"
  if ((PLANNED_PILOT_BLOCKS as readonly string[]).includes(type)) return "pilot"
  return "legacy"
}

// Un enregistrement `shared`/`pilot` DOIT fournir les 3 briques (view model + vue + adapters).
export function isRegistrationComplete(r: BlockRendererRegistration<any, any>): boolean {
  if (r.status === "legacy") return true
  return typeof r.createViewModel === "function" && !!r.SharedView && !!r.EditorAdapter && !!r.PublicAdapter
}
