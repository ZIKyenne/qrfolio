import { describe, it, expect } from "vitest"
import { SHARED_RENDERER_BLOCKS, PLANNED_PILOT_BLOCKS, resolveRendererStatus, isRegistrationComplete, type BlockRendererRegistration } from "./architecture"
import { BLOCK_DEFS } from "../types"

// Cohérence des contrats PRÉPARATOIRES (mission B09.1). Garantit qu'aucun bloc n'est
// activé et que les invariants d'architecture tiennent avant B09.2.

describe("flag de migration — 3 pilotes activés (B09.3)", () => {
  const PILOTS = ["heading", "values", "pricing"]
  it("exactement les 3 pilotes sont activés", () => {
    expect([...SHARED_RENDERER_BLOCKS].sort()).toEqual([...PILOTS].sort())
  })
  it("resolveRendererStatus : shared pour les pilotes, legacy pour les autres", () => {
    for (const t of Object.keys(BLOCK_DEFS)) expect(resolveRendererStatus(t)).toBe(PILOTS.includes(t) ? "shared" : "legacy")
  })
  it("rollback : un set vide ramène tout en legacy (mécanisme de bascule)", () => {
    for (const t of PILOTS) expect(resolveRendererStatus(t, new Set())).toBe("legacy")
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
