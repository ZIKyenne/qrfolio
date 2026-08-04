import { describe, it, expect } from "vitest"
import {
  resolveSaveStatus, resolvePublishStatus, resolveMode, resolveBuilderLayout,
  settingsSectionsForMode, isAdvancedOnly, SETTINGS_SECTIONS, BUILDER_NAV, MOBILE_TABS,
  isSelected, toggleMulti, selectionCount, plainTerm, BUILDER_GLOSSARY, blockContextActions,
  BUILDER_BREAKPOINT,
} from "./builderUx"
import type { Block } from "./types"

// Couche UX pure du Builder (mission C01). Tout est déterministe et testable sans navigateur.

const block = (over: Partial<Block> = {}): Block => ({
  id: "b1", type: "heading", content: {}, visible: true, ...over,
})

describe("resolveSaveStatus — taxonomie unique + priorité", () => {
  it("idle quand rien", () => {
    expect(resolveSaveStatus({ saving: false, saved: false, saveError: false, hasUnsaved: false }).kind).toBe("idle")
  })
  it("unsaved → warning + actionnable + libellés desktop/mobile distincts", () => {
    const s = resolveSaveStatus({ saving: false, saved: false, saveError: false, hasUnsaved: true })
    expect(s.kind).toBe("unsaved")
    expect(s.tone).toBe("warning")
    expect(s.actionable).toBe(true)
    expect(s.label).toContain("non enregistrées")
    expect(s.shortLabel).toBe("Enregistrer")
  })
  it("saving prime sur unsaved", () => {
    expect(resolveSaveStatus({ saving: true, saved: false, saveError: false, hasUnsaved: true }).kind).toBe("saving")
  })
  it("saved → success, non actionnable", () => {
    const s = resolveSaveStatus({ saving: false, saved: true, saveError: false, hasUnsaved: false })
    expect(s.kind).toBe("saved"); expect(s.tone).toBe("success"); expect(s.actionable).toBe(false)
  })
  it("error prime sur tout + message injecté", () => {
    const s = resolveSaveStatus({ saving: true, saved: true, saveError: true, hasUnsaved: true, errorMessage: "Réseau" })
    expect(s.kind).toBe("error"); expect(s.tone).toBe("danger"); expect(s.actionable).toBe(true)
    expect(s.label).toContain("Réseau")
  })
  it("error sans message → libellé par défaut", () => {
    expect(resolveSaveStatus({ saving: false, saved: false, saveError: true, hasUnsaved: false }).label).toContain("Échec")
  })
  it("creating entre saved et unsaved", () => {
    const s = resolveSaveStatus({ saving: false, saved: false, saveError: false, hasUnsaved: true, creating: true })
    expect(s.kind).toBe("creating")
  })
})

describe("resolvePublishStatus", () => {
  it("draft → Publier / accent", () => {
    const s = resolvePublishStatus({ pageStatus: "draft" })
    expect(s.kind).toBe("draft"); expect(s.label).toBe("Publier"); expect(s.tone).toBe("accent")
  })
  it("publishing prime", () => {
    expect(resolvePublishStatus({ pageStatus: "published", publishing: true }).kind).toBe("publishing")
  })
  it("published sans modif → à jour / success", () => {
    const s = resolvePublishStatus({ pageStatus: "published" })
    expect(s.kind).toBe("upToDate"); expect(s.tone).toBe("success")
  })
  it("published avec modifs non publiées → mise à jour", () => {
    expect(resolvePublishStatus({ pageStatus: "published", hasUnpublishedChanges: true }).kind).toBe("unpublished")
  })
})

describe("mode simple/expert + sections", () => {
  it("resolveMode", () => {
    expect(resolveMode(true)).toBe("expert")
    expect(resolveMode(false)).toBe("simple")
  })
  it("simple masque les sections avancées, expert montre tout", () => {
    const simple = settingsSectionsForMode("simple")
    const expert = settingsSectionsForMode("expert")
    expect(expert.length).toBe(SETTINGS_SECTIONS.length)
    expect(simple.length).toBeLessThan(expert.length)
    expect(simple.every(s => !s.advancedOnly)).toBe(true)
    // non destructif : rien n'est retiré du catalogue global
    expect(SETTINGS_SECTIONS.length).toBeGreaterThan(simple.length)
  })
  it("les 3 essentiels sont toujours visibles en simple", () => {
    const ids = settingsSectionsForMode("simple").map(s => s.id)
    expect(ids).toEqual(expect.arrayContaining(["content", "design", "layout"]))
  })
  it("isAdvancedOnly", () => {
    expect(isAdvancedOnly("advanced")).toBe(true)
    expect(isAdvancedOnly("content")).toBe(false)
    expect(isAdvancedOnly("inconnu")).toBe(false)
  })
})

describe("responsive layout", () => {
  it("mobile sous le point de rupture", () => {
    const l = resolveBuilderLayout(390)
    expect(l.mode).toBe("mobile"); expect(l.showBottomBar).toBe(true); expect(l.showLeftRail).toBe(false); expect(l.singleColumn).toBe(true)
  })
  it("desktop au-dessus", () => {
    const l = resolveBuilderLayout(1280)
    expect(l.mode).toBe("desktop"); expect(l.showLeftRail).toBe(true); expect(l.showRightPanel).toBe(true); expect(l.showBottomBar).toBe(false)
  })
  it("juste au point de rupture = desktop (>= breakpoint)", () => {
    expect(resolveBuilderLayout(BUILDER_BREAKPOINT).mode).toBe("desktop")
    expect(resolveBuilderLayout(BUILDER_BREAKPOINT - 1).mode).toBe("mobile")
  })
  it("largeur 0 (SSR) → desktop par défaut, pas mobile", () => {
    expect(resolveBuilderLayout(0).mode).toBe("desktop")
  })
})

describe("sélection", () => {
  it("isSelected simple + multi", () => {
    expect(isSelected("a", "a")).toBe(true)
    expect(isSelected("a", "b", ["a"])).toBe(true)
    expect(isSelected("a", "b", [])).toBe(false)
  })
  it("toggleMulti ajoute/retire sans muter", () => {
    const arr = ["a"]
    const added = toggleMulti(arr, "b")
    expect(added).toEqual(["a", "b"]); expect(arr).toEqual(["a"])
    expect(toggleMulti(added, "a")).toEqual(["b"])
  })
  it("selectionCount dédoublonne selectedId et multi", () => {
    expect(selectionCount("a", ["a", "b"])).toBe(2)
    expect(selectionCount(null, [])).toBe(0)
    expect(selectionCount("c", ["a", "b"])).toBe(3)
  })
})

describe("glossaire anti-jargon", () => {
  it("traduit les termes techniques", () => {
    expect(plainTerm("CTA")).toBe("bouton d'action")
    expect(plainTerm("slug")).toBe("adresse de la page")
    expect(plainTerm(" Embed ")).toBe("intégration")
  })
  it("laisse passer les termes inconnus", () => {
    expect(plainTerm("Titre")).toBe("Titre")
  })
  it("les termes cités par la mission §19 sont couverts", () => {
    for (const t of ["cta", "embed", "slug", "breakpoint", "padding", "gap", "drag and drop"]) {
      expect(BUILDER_GLOSSARY[t], `terme ${t} manquant du glossaire`).toBeTruthy()
    }
  })
})

describe("actions contextuelles de bloc", () => {
  it("bloc normal au milieu : toutes actives, delete/reset à confirmer", () => {
    const acts = blockContextActions(block(), { index: 1, total: 3 })
    const del = acts.find(a => a.id === "delete")!
    expect(del.danger).toBe(true); expect(del.confirm).toBe(true); expect(del.disabled).toBe(false)
    expect(acts.find(a => a.id === "reset")!.confirm).toBe(true)
    expect(acts.find(a => a.id === "moveUp")!.disabled).toBe(false)
  })
  it("premier bloc : Monter désactivé ; dernier : Descendre désactivé", () => {
    expect(blockContextActions(block(), { index: 0, total: 3 }).find(a => a.id === "moveUp")!.disabled).toBe(true)
    expect(blockContextActions(block(), { index: 2, total: 3 }).find(a => a.id === "moveDown")!.disabled).toBe(true)
  })
  it("bloc verrouillé : actions modifiantes désactivées, déverrouiller reste actif", () => {
    const acts = blockContextActions(block({ locked: true }), { index: 1, total: 3 })
    expect(acts.find(a => a.id === "delete")!.disabled).toBe(true)
    expect(acts.find(a => a.id === "duplicate")!.disabled).toBe(false) // dupliquer autorisé même verrouillé
    expect(acts.find(a => a.id === "toggleLock")!.disabled).toBe(false)
    expect(acts.find(a => a.id === "toggleLock")!.label).toBe("Déverrouiller")
  })
  it("libellés dépendent de l'état visible/brouillon", () => {
    expect(blockContextActions(block({ visible: false }), { index: 0, total: 1 }).find(a => a.id === "toggleVisible")!.label).toBe("Afficher")
    expect(blockContextActions(block({ draft: true }), { index: 0, total: 1 }).find(a => a.id === "toggleDraft")!.label).toBe("Retirer du brouillon")
  })
  it("delete est toujours en dernier (le plus loin des actions sûres)", () => {
    const acts = blockContextActions(block(), { index: 0, total: 2 })
    expect(acts[acts.length - 1].id).toBe("delete")
  })
})

describe("modèles de navigation", () => {
  it("BUILDER_NAV a des ids uniques et des hints non techniques", () => {
    const ids = BUILDER_NAV.map(n => n.id)
    expect(new Set(ids).size).toBe(ids.length)
    expect(BUILDER_NAV.every(n => n.hint.length > 0)).toBe(true)
  })
  it("MOBILE_TABS reflète la bottom-bar existante (blocks/canvas/panel)", () => {
    expect(MOBILE_TABS.map(t => t.id)).toEqual(["blocks", "canvas", "panel"])
  })
})
