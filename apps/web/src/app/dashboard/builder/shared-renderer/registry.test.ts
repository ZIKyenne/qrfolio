import { describe, it, expect } from "vitest"
import { resolveEditorBlock } from "./editorRegistry"
import { resolvePublicBlock } from "./publicRegistry"
import { SHARED_RENDERER_BLOCKS, PLANNED_PILOT_BLOCKS, migrationStatusOf } from "./architecture"
import { BLOCK_DEFS } from "../blockDefs"

const ACTIVE = new Set(["heading", "values", "pricing", "divider", "spacer", "bio", "skills", "languages", "advantages", "whatsapp_button", "email_button", "download_file", "order_online", "donation", "google_review", "process_steps", "on_site_services", "engagements", "trust_badge", "stats_block", "event_program", "testimonials", "business_stats", "brands", "lineup", "reassurance", "timeline", "menu_section", "services_list", "promo_banner", "gift_card", "event_info", "event_ticketing", "image", "portfolio_work", "favorite_links", "concerts", "merch", "app_download", "video_local", "audio_player", "pdf_viewer", "spotify_embed", "spotify_player", "before_after", "video", "google_maps_embed", "album_block", "discography", "podcast_links", "product_catalog", "menu_tabs", "free_section", "image_text", "split_panel", "overlay_card", "frame_box", "banner_strip", "full_bleed_image", "stack_cards", "free_grid", "columns_text", "image_mosaic", "logo_marquee", "avatar_row", "shape_divider", "decor_line", "marquee_text", "ribbon_banner", "color_band", "big_statement", "text_columns", "numbered_list", "checklist", "definition_list", "card_link", "anchor_nav", "anchor_target", "toggle_content", "back_to_top", "steps_horizontal", "stat_hero", "badge_row", "icon_row", "compare_two", "progress_bars", "highlight_box", "logo_wall", "partners", "certifications", "business_certifications", "info_table", "legal_info", "quote_block", "info_box", "founder_message", "company", "journey", "expertise"])


// Un adapter public est désormais chargé à la demande (`next/dynamic`) : ce n'est
// plus une fonction mais un objet composant React. « Rendu possible » se vérifie
// donc ainsi, sans rien supposer de la mécanique de chargement.
function estComposant(v: unknown): boolean {
  return typeof v === "function" || (typeof v === "object" && v !== null)
}

describe("flag & statut de migration (99 blocs activés)", () => {
  it("exactement les 99 blocs sont dans le flag actif", () => {
    expect([...SHARED_RENDERER_BLOCKS].sort()).toEqual([...ACTIVE].sort())
  })
  it("statut : shared pour les 99 actifs, legacy pour tous les autres", () => {
    for (const t of Object.keys(BLOCK_DEFS)) {
      expect(migrationStatusOf(t)).toBe(ACTIVE.has(t) ? "shared" : "legacy")
    }
  })
  it("3 pilotes initiaux toujours déclarés", () => {
    expect([...PLANNED_PILOT_BLOCKS].sort()).toEqual(["heading", "pricing", "values"])
  })
})

describe("résolution éditeur/public (flag actif = 99 blocs)", () => {
  it("les 99 blocs sont résolus vers un adapter (éditeur ET public), les autres non", () => {
    for (const t of ACTIVE) {
      expect(typeof resolveEditorBlock(t)).toBe("function")
      expect(estComposant(resolvePublicBlock(t))).toBe(true)
    }
    for (const t of ["profile", "gallery"]) {
      expect(resolveEditorBlock(t)).toBeNull()
      expect(resolvePublicBlock(t)).toBeNull()
    }
  })
  it("type inconnu activé par erreur → null (fallback legacy, jamais de crash)", () => {
    expect(resolveEditorBlock("inconnu", new Set(["inconnu"]))).toBeNull()
    expect(resolvePublicBlock("inconnu", new Set(["inconnu"]))).toBeNull()
  })
  it("bloc hors périmètre activé → null (adapter absent)", () => {
    expect(resolveEditorBlock("profile", new Set(["profile"]))).toBeNull()
    expect(resolvePublicBlock("profile", new Set(["profile"]))).toBeNull()
  })
})

describe("rollback purement configurationnel", () => {
  it("activer puis retirer restaure le legacy sans autre changement", () => {
    const on = new Set(["pricing"])
    const off = new Set<string>()
    expect(estComposant(resolvePublicBlock("pricing", on))).toBe(true) // shared
    expect(resolvePublicBlock("pricing", off)).toBeNull()             // legacy
  })
  it("SHARED_RENDERER_BLOCKS est un Set (immuable en pratique — exporté figé)", () => {
    expect(SHARED_RENDERER_BLOCKS instanceof Set).toBe(true)
  })
})
