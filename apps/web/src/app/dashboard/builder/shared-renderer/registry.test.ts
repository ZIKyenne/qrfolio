import { describe, it, expect } from "vitest"
import { resolveEditorBlock } from "./editorRegistry"
import { resolvePublicBlock } from "./publicRegistry"
import { SHARED_RENDERER_BLOCKS, PLANNED_PILOT_BLOCKS, migrationStatusOf } from "./architecture"
import { BLOCK_DEFS } from "../types"

const PILOTS = new Set(["heading", "values", "pricing"])

describe("flag & statut de migration", () => {
  it("flag actif VIDE en production (pilotes désactivés par défaut)", () => {
    expect(SHARED_RENDERER_BLOCKS.size).toBe(0)
  })
  it("tous les blocs sont legacy sauf les 3 pilotes (statut pilot)", () => {
    for (const t of Object.keys(BLOCK_DEFS)) {
      expect(migrationStatusOf(t)).toBe(PILOTS.has(t) ? "pilot" : "legacy")
    }
  })
  it("exactement 3 pilotes déclarés", () => {
    expect([...PLANNED_PILOT_BLOCKS].sort()).toEqual(["heading", "pricing", "values"])
  })
})

describe("résolution éditeur/public (flag par défaut = vide → legacy)", () => {
  it("aucun bloc n'est résolu en partagé par défaut (retombe legacy)", () => {
    for (const t of [...PILOTS, "profile", "gallery"]) {
      expect(resolveEditorBlock(t)).toBeNull()
      expect(resolvePublicBlock(t)).toBeNull()
    }
  })
  it("avec flag actif : le pilote est résolu vers un adapter (éditeur ET public)", () => {
    const active = new Set(["heading", "values", "pricing"])
    for (const t of active) {
      expect(typeof resolveEditorBlock(t, active)).toBe("function")
      expect(typeof resolvePublicBlock(t, active)).toBe("function")
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
