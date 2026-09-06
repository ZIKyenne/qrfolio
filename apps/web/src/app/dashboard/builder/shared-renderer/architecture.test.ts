import { describe, it, expect } from "vitest"
import { SHARED_RENDERER_BLOCKS, PLANNED_PILOT_BLOCKS, resolveRendererStatus, isRegistrationComplete, type BlockRendererRegistration } from "./architecture"
import { BLOCK_DEFS } from "../blockDefs"

// Cohérence des contrats PRÉPARATOIRES (mission B09.1). Garantit qu'aucun bloc n'est
// activé et que les invariants d'architecture tiennent avant B09.2.

describe("flag de migration — 99 blocs activés (pilotes + vagues 1 à 10)", () => {
  const ACTIVE = ["heading", "values", "pricing", "divider", "spacer", "bio", "skills", "languages", "advantages", "whatsapp_button", "email_button", "download_file", "order_online", "donation", "google_review", "process_steps", "on_site_services", "engagements", "trust_badge", "stats_block", "event_program", "testimonials", "business_stats", "brands", "lineup", "reassurance", "timeline", "menu_section", "services_list", "promo_banner", "gift_card", "event_info", "event_ticketing", "image", "portfolio_work", "favorite_links", "concerts", "merch", "app_download", "video_local", "audio_player", "pdf_viewer", "spotify_embed", "spotify_player", "before_after", "video", "google_maps_embed", "album_block", "discography", "podcast_links", "product_catalog", "menu_tabs", "free_section", "image_text", "split_panel", "overlay_card", "frame_box", "banner_strip", "full_bleed_image", "stack_cards", "free_grid", "columns_text", "image_mosaic", "logo_marquee", "avatar_row", "shape_divider", "decor_line", "marquee_text", "ribbon_banner", "color_band", "big_statement", "text_columns", "numbered_list", "checklist", "definition_list", "card_link", "anchor_nav", "anchor_target", "toggle_content", "back_to_top", "steps_horizontal", "stat_hero", "badge_row", "icon_row", "compare_two", "progress_bars", "highlight_box", "logo_wall", "partners", "certifications", "business_certifications", "info_table", "legal_info", "quote_block", "info_box", "founder_message", "company", "journey", "expertise"]
  it("exactement les 99 blocs sont activés", () => {
    expect([...SHARED_RENDERER_BLOCKS].sort()).toEqual([...ACTIVE].sort())
  })
  it("resolveRendererStatus : shared pour les 99 actifs, legacy pour les autres", () => {
    for (const t of Object.keys(BLOCK_DEFS)) expect(resolveRendererStatus(t)).toBe(ACTIVE.includes(t) ? "shared" : "legacy")
  })
  it("rollback : un set vide ramène tout en legacy (mécanisme de bascule)", () => {
    for (const t of ACTIVE) expect(resolveRendererStatus(t, new Set())).toBe("legacy")
    expect(resolveRendererStatus("pricing", new Set(["heading"]))).toBe("legacy")
  })
})

describe("blocs pilotes déclarés", () => {
  it("exactement 3 pilotes, tous des types de blocs réels et sans divergence public-null", () => {
    expect(PLANNED_PILOT_BLOCKS).toHaveLength(3)
    for (const t of PLANNED_PILOT_BLOCKS) expect(BLOCK_DEFS[t], `${t} inconnu`).toBeTruthy()
  })
})

describe("complétude d'un enregistrement", () => {
  const base = { type: "x", createViewModel: () => ({ visible: true }) }
  it("legacy = complet sans adapters", () => {
    expect(isRegistrationComplete({ ...base, status: "legacy" } as BlockRendererRegistration)).toBe(true)
  })
  it("shared incomplet (sans adapters) = false", () => {
    expect(isRegistrationComplete({ ...base, status: "shared" } as BlockRendererRegistration)).toBe(false)
  })
  it("shared complet (vue + 2 adapters) = true", () => {
    const C: any = () => null
    expect(isRegistrationComplete({ ...base, status: "shared", SharedView: C, EditorAdapter: C, PublicAdapter: C } as BlockRendererRegistration)).toBe(true)
  })
})
