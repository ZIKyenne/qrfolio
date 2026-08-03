import { describe, it, expect } from "vitest"
import { hasMeaningfulText, hasPublishableContent, EMPTY_STATE_BLOCK_TYPES } from "./blockEmptyState"

describe("hasMeaningfulText", () => {
  it("vide / espaces / non-texte → faux", () => {
    expect(hasMeaningfulText("")).toBe(false)
    expect(hasMeaningfulText("   ")).toBe(false)
    expect(hasMeaningfulText("\n\t")).toBe(false)
    expect(hasMeaningfulText(undefined)).toBe(false)
    expect(hasMeaningfulText(null)).toBe(false)
    expect(hasMeaningfulText(0 as any)).toBe(false)
  })
  it("texte réel → vrai", () => {
    expect(hasMeaningfulText("Transparence")).toBe(true)
    expect(hasMeaningfulText("  x  ")).toBe(true)
  })
})

// Champ « significatif » par famille (celui qui décide de la publication).
const KEY: Record<string, (v: string) => Record<string, any>> = {
  values: v => ({ [`v1_label`]: v }),
  process_steps: v => ({ [`s1_title`]: v }),
  business_certifications: v => ({ [`c1_name`]: v }),
  on_site_services: v => ({ [`s1_label`]: v }),
  event_program: v => ({ [`s1_title`]: v }),
  event_guests: v => ({ [`g1_name`]: v }),
  lineup: v => ({ [`a1_name`]: v }),
  discography: v => ({ [`a1_title`]: v }),
  concerts: v => ({ [`c1_city`]: v }),
  merch: v => ({ [`name1`]: v }),
  trust_badge: v => ({ [`b1_label`]: v }),
  info_table: v => ({ [`r1_label`]: v }),
  engagements: v => ({ [`e1`]: v }),
  stats_block: v => ({ [`s1_value`]: v }),
  grid_section: v => ({ [`c1_title`]: v }),
  tabs_block: v => ({ [`tab1_label`]: v }),
  accordion_block: v => ({ [`a1_title`]: v }),
  two_columns: v => ({ col1_title: v }),
}

describe("hasPublishableContent — toutes les familles listées sont couvertes", () => {
  it("chaque type détecteur a un cas de test", () => {
    for (const t of EMPTY_STATE_BLOCK_TYPES) expect(KEY[t], `manque un test pour ${t}`).toBeTypeOf("function")
  })

  for (const type of Object.keys(KEY)) {
    it(`${type} : vide → false`, () => {
      expect(hasPublishableContent(type, {})).toBe(false)
      expect(hasPublishableContent(type, undefined)).toBe(false)
    })
    it(`${type} : espaces seuls → false (aucune carte fantôme)`, () => {
      expect(hasPublishableContent(type, KEY[type]("   "))).toBe(false)
    })
    it(`${type} : un item réel → true`, () => {
      expect(hasPublishableContent(type, KEY[type]("Réel"))).toBe(true)
    })
  }
})

describe("hasPublishableContent — listes mixtes / cas particuliers", () => {
  it("values : premier vide, deuxième rempli → true (pas d'exclusion du vrai contenu)", () => {
    expect(hasPublishableContent("values", { v1_label: "", v2_label: "Qualité" })).toBe(true)
  })
  it("merch : seul le 3e produit rempli → true", () => {
    expect(hasPublishableContent("merch", { name1: "", name2: "  ", name3: "Vinyle" })).toBe(true)
  })
  it("lineup : uniquement des espaces sur 4 artistes → false", () => {
    expect(hasPublishableContent("lineup", { a1_name: " ", a2_name: "", a3_name: "  ", a4_name: "" })).toBe(false)
  })
  it("two_columns : seul le texte de la colonne 2 rempli → true", () => {
    expect(hasPublishableContent("two_columns", { col2_text: "Bonjour" })).toBe(true)
  })
  it("type hors périmètre → true (jamais masqué par erreur)", () => {
    expect(hasPublishableContent("profile", {})).toBe(true)
    expect(hasPublishableContent("inconnu", {})).toBe(true)
  })
})
