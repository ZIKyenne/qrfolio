import { describe, it, expect } from "vitest"
import { resolveEditorBlock } from "./editorRegistry"
import { resolvePublicBlock } from "./publicRegistry"
import { BLOCS_ACTIFS_ATTENDUS } from "./blocsActifs.recensement"
import { SHARED_RENDERER_BLOCKS, PLANNED_PILOT_BLOCKS, migrationStatusOf } from "./architecture"
import { BLOCK_DEFS } from "../blockDefs"

const ACTIVE = new Set(BLOCS_ACTIFS_ATTENDUS)


// Un adapter public est désormais chargé à la demande (`next/dynamic`) : ce n'est
// plus une fonction mais un objet composant React. « Rendu possible » se vérifie
// donc ainsi, sans rien supposer de la mécanique de chargement.
function estComposant(v: unknown): boolean {
  return typeof v === "function" || (typeof v === "object" && v !== null)
}

describe("flag & statut de migration (recensement declare)", () => {
  it("exactement les blocs sont dans le flag actif", () => {
    expect([...SHARED_RENDERER_BLOCKS].sort()).toEqual([...ACTIVE].sort())
  })
  it("statut : shared pour les blocs recenses, legacy pour tous les autres", () => {
    for (const t of Object.keys(BLOCK_DEFS)) {
      expect(migrationStatusOf(t)).toBe(ACTIVE.has(t) ? "shared" : "legacy")
    }
  })
  it("3 pilotes initiaux toujours déclarés", () => {
    expect([...PLANNED_PILOT_BLOCKS].sort()).toEqual(["heading", "pricing", "values"])
  })
})

describe("résolution éditeur/public (flag actif = recensement blocs)", () => {
  it("les blocs sont résolus vers un adapter (éditeur ET public), les autres non", () => {
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
