import { describe, it, expect } from "vitest"
import { SHARED_RENDERER_BLOCKS, PLANNED_PILOT_BLOCKS, resolveRendererStatus, isRegistrationComplete, type BlockRendererRegistration } from "./architecture"
import { BLOCK_DEFS } from "../types"

// Cohérence des contrats PRÉPARATOIRES (mission B09.1). Garantit qu'aucun bloc n'est
// activé et que les invariants d'architecture tiennent avant B09.2.

describe("flag de migration — 9 blocs activés (pilotes B09.3 + vague 1 B09.4)", () => {
  const ACTIVE = ["heading", "values", "pricing", "divider", "spacer", "bio", "skills", "languages", "advantages"]
  it("exactement les 9 blocs sont activés", () => {
    expect([...SHARED_RENDERER_BLOCKS].sort()).toEqual([...ACTIVE].sort())
  })
  it("resolveRendererStatus : shared pour les 9 actifs, legacy pour les autres", () => {
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
