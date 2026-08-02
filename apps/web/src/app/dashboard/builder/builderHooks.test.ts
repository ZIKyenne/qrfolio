import { describe, it, expect } from "vitest"
import { shouldCoalesce, COALESCE_MS } from "./builderHooks"

// Décision de coalescing de l'historique undo/redo (Builder). Regroupe les frappes
// consécutives sur un même champ en une seule entrée ; garde les opérations
// structurelles distinctes. Voir docs/BUILDER-REBUILD-PLAN.md §2.3.
describe("shouldCoalesce", () => {
  const KEY = "field:b1:title"

  it("fusionne deux push rapides portant la MÊME clé, au sommet", () => {
    expect(shouldCoalesce(KEY, 1000, KEY, 1100, true)).toBe(true)
  })

  it("ne fusionne PAS sans clé (opération structurelle : ajout/suppression/déplacement)", () => {
    expect(shouldCoalesce(KEY, 1000, undefined, 1100, true)).toBe(false)
    expect(shouldCoalesce(KEY, 1000, null, 1100, true)).toBe(false)
  })

  it("ne fusionne PAS si la clé change (champ ou bloc différent)", () => {
    expect(shouldCoalesce(KEY, 1000, "field:b1:subtitle", 1100, true)).toBe(false)
    expect(shouldCoalesce(KEY, 1000, "field:b2:title", 1100, true)).toBe(false)
  })

  it("ne fusionne PAS après la fenêtre temporelle (nouvelle rafale)", () => {
    expect(shouldCoalesce(KEY, 1000, KEY, 1000 + COALESCE_MS, true)).toBe(false)     // borne exclue
    expect(shouldCoalesce(KEY, 1000, KEY, 1000 + COALESCE_MS + 1, true)).toBe(false)
    expect(shouldCoalesce(KEY, 1000, KEY, 1000 + COALESCE_MS - 1, true)).toBe(true)  // juste dedans
  })

  it("ne fusionne PAS hors du sommet (après un undo)", () => {
    expect(shouldCoalesce(KEY, 1000, KEY, 1100, false)).toBe(false)
  })

  it("ne fusionne PAS quand il n'y a pas de clé précédente (premier push d'une rafale)", () => {
    expect(shouldCoalesce(null, 0, KEY, 1000, true)).toBe(false)
  })

  it("respecte une fenêtre personnalisée", () => {
    expect(shouldCoalesce(KEY, 1000, KEY, 1200, true, 100)).toBe(false)
    expect(shouldCoalesce(KEY, 1000, KEY, 1050, true, 100)).toBe(true)
  })
})
