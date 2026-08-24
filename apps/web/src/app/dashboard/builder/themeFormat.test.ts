import { describe, it, expect } from "vitest"
import { normalizePageTheme, mergePageTheme, DEFAULT_PAGE_THEME, type PageTheme } from "./types"
import { PRESET_THEMES } from "./editorPresets"
import { PAGE_TEMPLATES } from "./page-templates"

const CANON_KEYS = ["name","bg","surface","primary","accent","text","muted","fontDisplay","fontBody","bgMode"] as const
// Clés d'anciens formats qui ne doivent JAMAIS réapparaître dans un thème normalisé.
const FORBIDDEN_KEYS = ["background","font_display","font_body","bg_mode","bg_gradient","bg_pattern","background_color","text_color","accent_color","font_family"]

const isComplete = (t: PageTheme) => CANON_KEYS.every(k => (t as any)[k] != null && (t as any)[k] !== "")
const noForbidden = (t: PageTheme) => FORBIDDEN_KEYS.every(k => !(k in t))

describe("normalizePageTheme — entrées diverses", () => {
  it("1. canonique complet → conservé", () => {
    const src: PageTheme = { ...DEFAULT_PAGE_THEME, bg: "#010203", primary: "#0A0B0C" }
    const t = normalizePageTheme(src)
    expect(t.bg).toBe("#010203"); expect(t.primary).toBe("#0A0B0C"); expect(isComplete(t)).toBe(true)
  })
  it("2. canonique partiel → complété par défauts", () => {
    const t = normalizePageTheme({ bg: "#111111" })
    expect(t.bg).toBe("#111111"); expect(t.primary).toBe(DEFAULT_PAGE_THEME.primary); expect(isComplete(t)).toBe(true)
  })
  it("3. ancien format (background/font_display/bg_mode) → mappé canonique", () => {
    const t = normalizePageTheme({ background: "#0C0C0C", font_display: "Inter", font_body: "Roboto", bg_mode: "gradient", bg_gradient: "linear-gradient(#000,#111)" })
    expect(t.bg).toBe("#0C0C0C"); expect(t.fontDisplay).toBe("Inter"); expect(t.fontBody).toBe("Roboto")
    expect(t.bgMode).toBe("gradient"); expect(t.bgGradient).toBe("linear-gradient(#000,#111)")
    expect(noForbidden(t)).toBe(true)
  })
  it("4. format mixte (camel + snake) → le canonique prime", () => {
    const t = normalizePageTheme({ bg: "#AAAAAA", background: "#BBBBBB", fontBody: "Inter", font_body: "Roboto" })
    expect(t.bg).toBe("#AAAAAA"); expect(t.fontBody).toBe("Inter")
  })
  it("5/6. null / undefined → défaut complet", () => {
    expect(normalizePageTheme(null)).toEqual(DEFAULT_PAGE_THEME)
    expect(normalizePageTheme(undefined)).toEqual(DEFAULT_PAGE_THEME)
  })
  it("7. tableau accidentel → défaut", () => { expect(normalizePageTheme([1,2,3])).toEqual(DEFAULT_PAGE_THEME) })
  it("8. chaîne JSON valide → parsée", () => {
    expect(normalizePageTheme(JSON.stringify({ bg: "#123456" })).bg).toBe("#123456")
  })
  it("9. chaîne invalide → défaut", () => { expect(normalizePageTheme("pas du json {").bg).toBe(DEFAULT_PAGE_THEME.bg) })
  it("10. types incorrects → défaut sûr", () => {
    const t = normalizePageTheme({ bg: 42, primary: {}, fontBody: ["x"], bgMode: "wat" })
    expect(t.bg).toBe(DEFAULT_PAGE_THEME.bg); expect(t.primary).toBe(DEFAULT_PAGE_THEME.primary)
    expect(t.fontBody).toBe(DEFAULT_PAGE_THEME.fontBody); expect(t.bgMode).toBe("solid")
  })
  it("11. couleurs invalides → fallback ; javascript: rejeté", () => {
    expect(normalizePageTheme({ bg: "javascript:alert(1)" }).bg).toBe(DEFAULT_PAGE_THEME.bg)
    expect(normalizePageTheme({ primary: "red; background:url(x)" }).primary).toBe(DEFAULT_PAGE_THEME.primary)
    expect(normalizePageTheme({ accent: "rgb(10,20,30)" }).accent).toBe("rgb(10,20,30)")
    expect(normalizePageTheme({ text: "var(--foo)" }).text).toBe("var(--foo)")
  })
  it("12. police dangereuse → fallback", () => {
    expect(normalizePageTheme({ fontBody: 'Inject";}' }).fontBody).toBe(DEFAULT_PAGE_THEME.fontBody)
  })
  it("13. rayon/nombres en chaîne → convertis (glow_intensity)", () => {
    expect(normalizePageTheme({ effect_glow: true, glow_intensity: "30" }).glow_intensity).toBe(30)
  })
  it("14. nombre hors limite → borné", () => {
    expect(normalizePageTheme({ glow_intensity: 9999 }).glow_intensity).toBe(100)
  })
  it("15. propriétés inconnues → ignorées", () => {
    const t: any = normalizePageTheme({ bg: "#000000", hacker: "x", __proto__polluted: 1 })
    expect(t.hacker).toBeUndefined()
  })
  it("16. objet vide → défaut", () => { expect(normalizePageTheme({})).toEqual(DEFAULT_PAGE_THEME) })
  it("préserve les effets valides (glow/mesh)", () => {
    const t = normalizePageTheme({ ...DEFAULT_PAGE_THEME, effect_glow: true, glow_color: "#C9A84C", glow_size: 350, mesh_c1: "#38BDF8" })
    expect(t.effect_glow).toBe(true); expect(t.glow_color).toBe("#C9A84C"); expect(t.glow_size).toBe(350); expect(t.mesh_c1).toBe("#38BDF8")
  })
})

describe("normalizePageTheme — défauts, idempotence, sécurité de référence", () => {
  it("17. DEFAULT_PAGE_THEME est un thème valide et complet", () => {
    expect(isComplete(DEFAULT_PAGE_THEME)).toBe(true); expect(noForbidden(DEFAULT_PAGE_THEME)).toBe(true)
  })
  it("18. normaliser deux fois est idempotent", () => {
    const once = normalizePageTheme({ background: "#0C0C0C", font_display: "Inter", effect_glow: true, glow_intensity: 20 })
    expect(normalizePageTheme(once)).toEqual(once)
  })
  it("19. aucune référence mutable partagée avec le défaut", () => {
    const a = normalizePageTheme(null); const b = normalizePageTheme(null)
    a.bg = "#FFFFFF"
    expect(b.bg).toBe(DEFAULT_PAGE_THEME.bg); expect(DEFAULT_PAGE_THEME.bg).toBe("#080808")
  })
  it("tags clonés (pas de partage de tableau)", () => {
    const src = { ...DEFAULT_PAGE_THEME, tags: ["a","b"] }
    const t = normalizePageTheme(src)
    expect(t.tags).toEqual(["a","b"]); expect(t.tags).not.toBe(src.tags)
  })
})

describe("mergePageTheme", () => {
  it("30. applique un patch partiel", () => {
    expect(mergePageTheme(DEFAULT_PAGE_THEME, { primary: "#111111" }).primary).toBe("#111111")
  })
  it("31. patch invalide → base normalisée inchangée", () => {
    expect(mergePageTheme(DEFAULT_PAGE_THEME, null)).toEqual(DEFAULT_PAGE_THEME)
  })
  it("32. patch partiel ne perd pas les autres champs", () => {
    const m = mergePageTheme(DEFAULT_PAGE_THEME, { bg: "#010101" })
    expect(m.bg).toBe("#010101"); expect(m.primary).toBe(DEFAULT_PAGE_THEME.primary)
  })
  it("33. preset inchangé si patch vide", () => {
    expect(mergePageTheme(PRESET_THEMES.midnight_gold, {})).toEqual(normalizePageTheme(PRESET_THEMES.midnight_gold))
  })
})

describe("presets & templates produisent un thème canonique valide", () => {
  it("29. tous les presets sont valides et sans clé interdite après normalisation", () => {
    for (const [key, preset] of Object.entries(PRESET_THEMES)) {
      const t = normalizePageTheme(preset)
      expect(isComplete(t), `preset ${key} incomplet`).toBe(true)
      expect(noForbidden(t), `preset ${key} a une clé interdite`).toBe(true)
    }
  })
  it("26/27/28. tous les templates produisent un thème valide sans clé interdite", () => {
    expect(PAGE_TEMPLATES.length).toBeGreaterThan(0)
    for (const tpl of PAGE_TEMPLATES) {
      const t = normalizePageTheme(tpl.theme)
      expect(isComplete(t), `template ${tpl.key} incomplet`).toBe(true)
      expect(noForbidden(t), `template ${tpl.key} clé interdite`).toBe(true)
      // Les valeurs clés du template sont préservées (pas écrasées par le défaut).
      expect(t.bg).toBe((tpl.theme as any).bg)
      expect(t.primary).toBe((tpl.theme as any).primary)
    }
  })
})

describe("round-trip stockage (Stratégie A : canonique en base)", () => {
  it("21-25. ancien → normalisé → (JSON stocké) → relu → identique, sans clé héritée", () => {
    const old = { name: "midnight_gold", background: "#080808", primary: "#C9A84C", secondary: "#39FF8F", text: "#F5F0E8", font_display: "Fraunces", font_body: "DM Sans" }
    const canonical = normalizePageTheme(old)
    const stored = JSON.parse(JSON.stringify(canonical)) // ce qui part/revient de Supabase
    const reloaded = normalizePageTheme(stored)
    expect(reloaded).toEqual(canonical)
    expect(noForbidden(reloaded)).toBe(true)
    expect(reloaded.bg).toBe("#080808"); expect(reloaded.fontDisplay).toBe("Fraunces")
  })
})
