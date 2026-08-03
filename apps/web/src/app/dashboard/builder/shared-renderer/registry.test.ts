import { describe, it, expect } from "vitest"
import { resolveEditorBlock } from "./editorRegistry"
import { resolvePublicBlock } from "./publicRegistry"
import { SHARED_RENDERER_BLOCKS, PLANNED_PILOT_BLOCKS, migrationStatusOf } from "./architecture"
import { BLOCK_DEFS } from "../types"

const PILOTS = new Set(["heading", "values", "pricing"])

describe("flag & statut de migration (3 pilotes activés)", () => {
  it("exactement les 3 pilotes sont dans le flag actif", () => {
    expect([...SHARED_RENDERER_BLOCKS].sort()).toEqual(["heading", "pricing", "values"])
  })
  it("statut : shared pour les 3 pilotes, legacy pour tous les autres", () => {
    for (const t of Object.keys(BLOCK_DEFS)) {
      expect(migrationStatusOf(t)).toBe(PILOTS.has(t) ? "shared" : "legacy")
    }
  })
  it("exactement 3 pilotes déclarés", () => {
    expect([...PLANNED_PILOT_BLOCKS].sort()).toEqual(["heading", "pricing", "values"])
  })
})

describe("résolution éditeur/public (flag actif = 3 pilotes)", () => {
  it("les 3 pilotes sont résolus vers un adapter (éditeur ET public), les autres non", () => {
    for (const t of PILOTS) {
      expect(typeof resolveEditorBlock(t)).toBe("function")
      expect(typeof resolvePublicBlock(t)).toBe("function")
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
    expect(typeof resolvePublicBlock("pricing", on)).toBe("function") // shared
    expect(resolvePublicBlock("pricing", off)).toBeNull()             // legacy
  })
  it("SHARED_RENDERER_BLOCKS est un Set (immuable en pratique — exporté figé)", () => {
    expect(SHARED_RENDERER_BLOCKS instanceof Set).toBe(true)
  })
})
