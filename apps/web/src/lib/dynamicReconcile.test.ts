import { describe, it, expect } from "vitest"
import { planDynamicReconcile, type DynLink } from "./dynamicReconcile"

const NOW = 1_000_000_000_000 // horodatage fixe
const future = new Date(NOW + 86400000).toISOString()  // essai encore valide (demain)
const past = new Date(NOW - 86400000).toISOString()    // essai expiré (hier)

// Raccourci de fabrication de lien (ordre = ancienneté, du plus ancien au plus récent).
const perm = (id: string): DynLink => ({ id, status: "active", expires_at: null })
const trial = (id: string): DynLink => ({ id, status: "active", expires_at: future })
const paused = (id: string): DynLink => ({ id, status: "paused", expires_at: null })
const manualPaused = (id: string): DynLink => ({ id, status: "paused", expires_at: null, paused_reason: "manual" })

describe("planDynamicReconcile", () => {
  it("souscription : promeut les essais en permanents dans la limite du quota", () => {
    const ops = planDynamicReconcile([trial("a"), trial("b"), trial("c"), trial("d")], 3, NOW)
    // a, b, c deviennent permanents ; d reste en essai (au-delà du quota)
    expect(ops).toEqual([
      { id: "a", patch: { expires_at: null } },
      { id: "b", patch: { expires_at: null } },
      { id: "c", patch: { expires_at: null } },
    ])
  })

  it("downgrade : met en pause les permanents en trop (les plus récents), motif quota", () => {
    const ops = planDynamicReconcile([perm("a"), perm("b"), perm("c"), perm("d")], 2, NOW)
    // a, b gardés ; c, d (plus récents) en pause quota
    expect(ops).toEqual([
      { id: "c", patch: { status: "paused", paused_reason: "quota" } },
      { id: "d", patch: { status: "paused", paused_reason: "quota" } },
    ])
  })

  it("Business (illimité) : tout devient permanent, rien en pause", () => {
    const ops = planDynamicReconcile([trial("a"), trial("b"), perm("c")], null, NOW)
    expect(ops).toEqual([
      { id: "a", patch: { expires_at: null } },
      { id: "b", patch: { expires_at: null } },
    ])
  })

  it("résiliation (quota 0) : tous les permanents actifs passent en pause quota", () => {
    const ops = planDynamicReconcile([perm("a"), perm("b")], 0, NOW)
    expect(ops).toEqual([
      { id: "a", patch: { status: "paused", paused_reason: "quota" } },
      { id: "b", patch: { status: "paused", paused_reason: "quota" } },
    ])
  })

  it("pause MANUELLE : jamais réactivée ni comptée dans le quota", () => {
    // 2 permanents actifs + 1 pause manuelle, quota 3 : la pause manuelle est ignorée (aucune op),
    // les actifs restent (déjà conformes) -> aucune op du tout.
    expect(planDynamicReconcile([perm("a"), manualPaused("m"), perm("b")], 3, NOW)).toEqual([])
    // Même au ré-upgrade généreux (quota illimité), la pause manuelle n'est PAS réactivée.
    expect(planDynamicReconcile([manualPaused("m"), trial("t")], null, NOW)).toEqual([
      { id: "t", patch: { expires_at: null } },
    ])
    // La pause manuelle ne consomme pas de slot : ici quota 1, 'a' garde le slot, 'm' ignoré.
    expect(planDynamicReconcile([perm("a"), manualPaused("m")], 1, NOW)).toEqual([])
  })

  it("réactive les liens mis en pause dans la limite du quota (ré-upgrade)", () => {
    const ops = planDynamicReconcile([paused("a"), paused("b"), paused("c")], 2, NOW)
    expect(ops).toEqual([
      { id: "a", patch: { status: "active" } },
      { id: "b", patch: { status: "active" } },
    ])
    // c reste en pause (au-delà du quota) -> aucune op
  })

  it("ignore les essais déjà expirés (ne consomment pas de slot, non touchés)", () => {
    const ops = planDynamicReconcile([{ id: "old", status: "active", expires_at: past }, trial("b"), trial("c")], 2, NOW)
    // 'old' est ignoré ; b et c prennent les 2 slots
    expect(ops).toEqual([
      { id: "b", patch: { expires_at: null } },
      { id: "c", patch: { expires_at: null } },
    ])
  })

  it("no-op quand tout est déjà conforme", () => {
    const ops = planDynamicReconcile([perm("a"), perm("b")], 3, NOW)
    expect(ops).toEqual([])
  })

  it("essai valide au-delà du quota : laissé tel quel (pas de pause)", () => {
    const ops = planDynamicReconcile([perm("a"), trial("b")], 1, NOW)
    // a garde le slot ; b est un essai -> on ne le pause pas (il expirera seul)
    expect(ops).toEqual([])
  })
})
