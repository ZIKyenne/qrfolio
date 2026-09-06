import { describe, it, expect } from "vitest"
import { readFileSync } from "node:fs"
import { fileURLToPath } from "node:url"
import { BLOCK_CATEGORIES } from "./types"
import { BLOCK_DEFS } from "./blockDefs"
import { hasPublishableContent, EMPTY_STATE_BLOCK_TYPES } from "./blockEmptyState"
import { pricingCtaModel } from "./pricingCta"
import { contactFormFields } from "@/lib/leadForms"
import { BLOCK_FIXTURES } from "./blockFixtures"
import { KNOWN_PUBLIC_NULL_BLOCKS, CRITICAL_CONTRACTS } from "./blockContracts"
import { SHARED_RENDERER_BLOCKS } from "./shared-renderer/architecture"

// Filet de sécurité AVANT l'unification des renderers. Tests de caractérisation :
// on fige le comportement OBSERVABLE actuel (pas l'implémentation).

const read = (rel: string) => readFileSync(fileURLToPath(new URL(rel, import.meta.url)), "utf8")
const editorSrc = read("./builderPreview.tsx")
const publicSrc = read("../../[slug]/PublicPageClient.tsx")
// Ensemble des `case "<type>"` d'un source.
const casesOf = (src: string) => new Set([...src.matchAll(/case\s+"([a-z0-9_]+)"/g)].map(m => m[1]))
const editorCases = casesOf(editorSrc)
const publicCases = casesOf(publicSrc)
const TYPES = Object.keys(BLOCK_DEFS)
const CATEGORY_IDS = new Set(BLOCK_CATEGORIES.map(c => c.id))

// ── Inventaire des 142 blocs ────────────────────────────────────────────────
describe("inventaire des blocs", () => {
  it("compte attendu (~142)", () => { expect(TYPES.length).toBeGreaterThanOrEqual(140) })
  it("chaque bloc a une catégorie valide", () => {
    const bad = TYPES.filter(t => !CATEGORY_IDS.has(BLOCK_DEFS[t].category))
    expect(bad, `catégorie inconnue: ${bad.join(", ")}`).toEqual([])
  })
  it("chaque bloc a un defaultContent (objet) et des fields (tableau)", () => {
    const badContent = TYPES.filter(t => typeof BLOCK_DEFS[t].defaultContent !== "object" || BLOCK_DEFS[t].defaultContent == null)
    const badFields = TYPES.filter(t => !Array.isArray(BLOCK_DEFS[t].fields))
    expect(badContent, `defaultContent invalide: ${badContent.join(", ")}`).toEqual([])
    expect(badFields, `fields invalide: ${badFields.join(", ")}`).toEqual([])
  })
  it("chaque champ éditable a une clé et un type", () => {
    const bad: string[] = []
    for (const t of TYPES) for (const f of BLOCK_DEFS[t].fields) if (!f.key || !f.type) bad.push(`${t}.${f.key || "?"}`)
    expect(bad).toEqual([])
  })
})

// ── Parité de PRÉSENCE (case présent des deux côtés) ────────────────────────
describe("parité de présence éditeur/public", () => {
  it("chaque bloc a un case public (inline ou shared-renderer)", () => {
    const missing = TYPES.filter(t => !publicCases.has(t) && !SHARED_RENDERER_BLOCKS.has(t))
    expect(missing, `sans rendu public: ${missing.join(", ")}`).toEqual([])
  })
  it("chaque bloc a un case éditeur (inline ou shared-renderer)", () => {
    const missing = TYPES.filter(t => !editorCases.has(t) && !SHARED_RENDERER_BLOCKS.has(t))
    expect(missing, `sans rendu éditeur: ${missing.join(", ")}`).toEqual([])
  })
})

// ── Registre des DIVERGENCES connues (échoue si une NOUVELLE apparaît) ───────
describe("divergences connues (allowlist)", () => {
  it("les blocs à rendu public null inconditionnel == allowlist", () => {
    // `case "X": return null` (inconditionnel) = bloc affiché dans l'éditeur mais absent
    // publiquement. Toute nouvelle occurrence NON déclarée doit faire échouer ce test.
    const found = [...publicSrc.matchAll(/case\s+"([a-z0-9_]+)":\s*return null\b/g)].map(m => m[1]).sort()
    expect(found).toEqual([...KNOWN_PUBLIC_NULL_BLOCKS].sort())
  })
})

// ── Contrats critiques : cohérence avec les autres sources ──────────────────
describe("contrats critiques", () => {
  for (const c of CRITICAL_CONTRACTS) {
    it(`${c.type} : type connu, catégorie valide, maxItems>0`, () => {
      expect(BLOCK_DEFS[c.type], `${c.type} absent de BLOCK_DEFS`).toBeTruthy()
      expect(CATEGORY_IDS.has(BLOCK_DEFS[c.type].category)).toBe(true)
      if (c.maxItems !== undefined) expect(c.maxItems).toBeGreaterThan(0)
    })
    it(`${c.type} : hidesWhenEmpty cohérent avec hasPublishableContent(vide)`, () => {
      // Uniquement pour les blocs couverts par le helper pur d'état vide (les autres, ex.
      // gallery, gèrent leur vide inline dans le renderer et sont caractérisés à part).
      if (c.hidesWhenEmpty && EMPTY_STATE_BLOCK_TYPES.includes(c.type) && BLOCK_FIXTURES[c.type]) {
        expect(hasPublishableContent(c.type, BLOCK_FIXTURES[c.type].empty)).toBe(false)
      }
    })
  }
})

// ── Modèles de vue purs (caractérisation via fixtures) ──────────────────────
describe("view models — hasPublishableContent (états vides)", () => {
  const CASES: [string, "empty" | "minimal" | "complete", boolean][] = [
    ["values", "empty", false], ["values", "minimal", true], ["values", "complete", true],
    ["event_program", "empty", false], ["event_program", "minimal", true],
    ["lineup", "empty", false], ["lineup", "minimal", true],
    ["two_columns", "empty", false], ["two_columns", "minimal", true],
    ["merch", "empty", false], ["merch", "minimal", true],
    ["trust_badge", "empty", false], ["trust_badge", "minimal", true],
  ]
  for (const [type, key, expected] of CASES) {
    it(`${type}/${key} → publishable=${expected}`, () => {
      expect(hasPublishableContent(type, (BLOCK_FIXTURES as any)[type][key])).toBe(expected)
    })
  }
  it("values/whitespace (espaces seuls) → non publiable (pas de carte fantôme)", () => {
    expect(hasPublishableContent("values", BLOCK_FIXTURES.values.whitespace)).toBe(false)
  })
  it("two_columns/partial (seule la colonne 2) → publiable", () => {
    expect(hasPublishableContent("two_columns", BLOCK_FIXTURES.two_columns.partial)).toBe(true)
  })
})

describe("view models — pricing CTA", () => {
  it("empty → invisible", () => expect(pricingCtaModel(BLOCK_FIXTURES.pricing.empty).visible).toBe(false))
  it("complete → visible + href sûr", () => {
    const m = pricingCtaModel(BLOCK_FIXTURES.pricing.complete) as any
    expect(m.visible).toBe(true); expect(m.href).toBe("https://ex.com/pay")
  })
  it("ctaNoUrl → visible, href null", () => {
    expect((pricingCtaModel(BLOCK_FIXTURES.pricing.ctaNoUrl) as any).href).toBeNull()
  })
  it("invalidUrl (javascript:) → neutralisé", () => {
    expect((pricingCtaModel(BLOCK_FIXTURES.pricing.invalidUrl) as any).href.startsWith("javascript:")).toBe(false)
  })
})

describe("view models — contact form", () => {
  it("champs par défaut : name, email, message (téléphone masqué)", () => {
    expect(contactFormFields(BLOCK_FIXTURES.contact_form.minimal).map(f => f.key)).toEqual(["name", "email", "message"])
  })
  it("show_phone=yes → insère phone", () => {
    expect(contactFormFields(BLOCK_FIXTURES.contact_form.complete).map(f => f.key)).toEqual(["name", "email", "phone", "message"])
  })
})

// ── Limites de répéteurs : PARITÉ éditeur/public ────────────────────────────
describe("limites de répéteurs (parité éditeur/public)", () => {
  it("gallery : même plafond (12 des deux côtés, pas de 13e)", () => {
    // Le rendu public liste ses clés par gabarit (`c[`img${n}`]`) depuis que
    // chaque photo porte aussi sa description : on vérifie le plafond, pas la
    // façon dont il est écrit.
    expect(editorSrc).toContain("img12")
    expect(publicSrc).toContain("[1,2,3,4,5,6,7,8,9,10,11,12]")
    expect(publicSrc).not.toContain("[1,2,3,4,5,6,7,8,9,10,11,12,13]")
    expect(editorSrc.includes("c.img13") || publicSrc.includes("c.img13")).toBe(false)
  })
  it("les répéteurs longs utilisent length:50 côté public (limite homogène)", () => {
    const n = [...publicSrc.matchAll(/Array\.from\(\{\s*length:\s*50/g)].length
    expect(n).toBeGreaterThan(20)
  })
  it("gallery : images vides filtrées, plafond 12 (img13+ ignorées)", () => {
    // Caractérise la limite réelle (le renderer lit img1..img12).
    const imgs = (c: Record<string, any>) => Array.from({ length: 20 }, (_, i) => c[`img${i + 1}`]).filter(Boolean).slice(0, 12)
    expect(imgs(BLOCK_FIXTURES.gallery.empty).length).toBe(0)
    expect(imgs(BLOCK_FIXTURES.gallery.minimal).length).toBe(1)
    expect(imgs(BLOCK_FIXTURES.gallery.complete).length).toBe(12)
    expect(imgs(BLOCK_FIXTURES.gallery.overLimit).length).toBe(12)
  })
})

// ── Synthèse de couverture (rapport lisible, assertions honnêtes) ────────────
describe("synthèse de couverture", () => {
  it("rapport", () => {
    const withPublic = TYPES.filter(t => publicCases.has(t) || SHARED_RENDERER_BLOCKS.has(t)).length
    const withEditor = TYPES.filter(t => editorCases.has(t) || SHARED_RENDERER_BLOCKS.has(t)).length
    const divergences = KNOWN_PUBLIC_NULL_BLOCKS.length
    const contracts = CRITICAL_CONTRACTS.length
    // eslint-disable-next-line no-console
    console.log(`\n── Couverture Builder ──\n${TYPES.length} blocs inventoriés\n${withPublic} avec rendu public · ${withEditor} avec rendu éditeur\n${divergences} divergence(s) connue(s) allowlistée(s) : ${KNOWN_PUBLIC_NULL_BLOCKS.join(", ")}\n${contracts} contrats critiques + fixtures\n`)
    expect(withPublic).toBe(TYPES.length)
    expect(withEditor).toBe(TYPES.length)
    expect(divergences).toBeGreaterThanOrEqual(1)
  })
})
