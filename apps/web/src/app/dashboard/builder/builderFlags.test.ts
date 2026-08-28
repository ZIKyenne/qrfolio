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
  // Le param valait uniquement hors production : essayer le nouveau Builder sur
  // son téléphone imposait donc d'ouvrir une console de navigateur pour écrire
  // dans localStorage — infaisable sur iPhone. Un lien doit suffire.
  it("le lien allume et éteint, y compris en production", () => {
    expect(resolveBuilderRedesignEnabled({ envEnabled: false, queryOverride: "1", isProduction: true })).toBe(true)
    expect(resolveBuilderRedesignEnabled({ envEnabled: false, queryOverride: "true", isProduction: true })).toBe(true)
    expect(resolveBuilderRedesignEnabled({ envEnabled: true, queryOverride: "0", isProduction: true })).toBe(false)
    expect(resolveBuilderRedesignEnabled({ envEnabled: true, queryOverride: "false", isProduction: true })).toBe(false)
  })
  it("le lien l'emporte sur un choix mémorisé plus ancien", () => {
    // Sans cela, un « 0 » resté en mémoire rendrait le lien d'allumage inopérant,
    // et il n'y aurait aucun moyen de s'en sortir depuis un téléphone.
    expect(resolveBuilderRedesignEnabled({ envEnabled: false, localOverride: "0", queryOverride: "1", isProduction: true })).toBe(true)
    expect(resolveBuilderRedesignEnabled({ envEnabled: false, localOverride: "1", queryOverride: "0", isProduction: true })).toBe(false)
  })
  it("sans lien, le choix mémorisé continue de commander", () => {
    expect(resolveBuilderRedesignEnabled({ envEnabled: false, localOverride: "1", isProduction: true })).toBe(true)
    expect(resolveBuilderRedesignEnabled({ envEnabled: true, localOverride: "0", isProduction: true })).toBe(false)
  })
  it("une valeur non reconnue ne décide de rien", () => {
    expect(resolveBuilderRedesignEnabled({ envEnabled: false, queryOverride: "yes", isProduction: false })).toBe(false)
    // …et laisse le choix mémorisé s'appliquer, au lieu de tout éteindre.
    expect(resolveBuilderRedesignEnabled({ envEnabled: false, queryOverride: "oui", localOverride: "1", isProduction: true })).toBe(true)
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
