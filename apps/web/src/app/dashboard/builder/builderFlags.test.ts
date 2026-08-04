import { describe, it, expect } from "vitest"
import { resolveBuilderRedesignEnabled, REDESIGN_STORAGE_KEY, REDESIGN_QUERY_PARAM } from "./builderFlags"

// Résolution PURE du flag d'activation progressive (C06 §19/§26).

describe("resolveBuilderRedesignEnabled", () => {
  it("OFF par défaut en production", () => {
    expect(resolveBuilderRedesignEnabled({ envEnabled: false, isProduction: true })).toBe(false)
  })
  it("ENV active (staging/canary serveur), même en production", () => {
    expect(resolveBuilderRedesignEnabled({ envEnabled: true, isProduction: true })).toBe(true)
  })
  it("override local '1' force ON (prioritaire sur ENV OFF)", () => {
    expect(resolveBuilderRedesignEnabled({ envEnabled: false, localOverride: "1", isProduction: true })).toBe(true)
  })
  it("override local '0' force OFF (rollback par navigateur, prioritaire sur ENV ON)", () => {
    expect(resolveBuilderRedesignEnabled({ envEnabled: true, localOverride: "0", isProduction: true })).toBe(false)
  })
  it("query param actif uniquement hors production", () => {
    expect(resolveBuilderRedesignEnabled({ envEnabled: false, queryOverride: "1", isProduction: false })).toBe(true)
    expect(resolveBuilderRedesignEnabled({ envEnabled: false, queryOverride: "1", isProduction: true })).toBe(false)
  })
  it("query param ignoré si valeur non reconnue", () => {
    expect(resolveBuilderRedesignEnabled({ envEnabled: false, queryOverride: "yes", isProduction: false })).toBe(false)
  })
  it("override local neutre → repli sur ENV", () => {
    expect(resolveBuilderRedesignEnabled({ envEnabled: true, localOverride: "", isProduction: true })).toBe(true)
    expect(resolveBuilderRedesignEnabled({ envEnabled: false, localOverride: null, isProduction: true })).toBe(false)
  })
  it("aucun secret / clés stables documentées", () => {
    expect(REDESIGN_STORAGE_KEY).toBe("qrowg_builder_redesign")
    expect(REDESIGN_QUERY_PARAM).toBe("builderRedesign")
  })
})
