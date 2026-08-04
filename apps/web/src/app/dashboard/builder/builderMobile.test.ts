import { describe, it, expect } from "vitest"
import {
  MOBILE_BOTTOM_NAV, opensSheet, defaultSnap, openSheet, CLOSED_SHEET, setSnap, snapHeight,
  SNAP_FRACTION, editTabIntent, afterSelect, afterAdd, sheetForKeyboard, bottomNavVisible,
  usableHeight, safeAreaTargets, resolveBackAction, mobileChrome, TABLET_MIN_WIDTH,
  mobileSaveError, publishTabBadge, publishSummary, mobileContextActions, restoreSheet,
  MOBILE_PRIMARY_ACTIONS,
} from "./builderMobile"
import type { Block } from "./types"

const blk = (over: Partial<Block> = {}): Block => ({ id: "b", type: "heading", content: {}, visible: true, ...over })

describe("navigation & sheet", () => {
  it("5 onglets max, ids uniques", () => {
    expect(MOBILE_BOTTOM_NAV.length).toBe(5)
    const ids = MOBILE_BOTTOM_NAV.map(n => n.id)
    expect(new Set(ids).size).toBe(5)
  })
  it("preview n'ouvre pas de sheet", () => {
    expect(opensSheet("preview")).toBe(false)
    expect(opensSheet("add")).toBe(true)
  })
  it("snap par défaut : add=expanded, edit/structure/publish=medium", () => {
    expect(defaultSnap("add")).toBe("expanded")
    expect(defaultSnap("edit")).toBe("medium")
    expect(defaultSnap("structure")).toBe("medium")
    expect(defaultSnap("publish")).toBe("medium")
  })
  it("openSheet/close/setSnap", () => {
    const s = openSheet("add")
    expect(s).toEqual({ open: true, tab: "add", snap: "expanded" })
    expect(CLOSED_SHEET.open).toBe(false)
    expect(setSnap(s, "compact")).toEqual({ open: true, tab: "add", snap: "compact" })
    expect(setSnap(CLOSED_SHEET, "medium")).toEqual(CLOSED_SHEET)
  })
})

describe("snap heights", () => {
  it("croissant, borné à la hauteur dispo", () => {
    expect(snapHeight("compact", 800)).toBeLessThan(snapHeight("medium", 800))
    expect(snapHeight("medium", 800)).toBeLessThan(snapHeight("expanded", 800))
    expect(snapHeight("expanded", 800)).toBeLessThanOrEqual(800)
  })
  it("plancher 160", () => {
    expect(snapHeight("compact", 100)).toBe(160)
  })
  it("fractions cohérentes", () => {
    expect(SNAP_FRACTION.compact).toBeLessThan(SNAP_FRACTION.expanded)
  })
})

describe("priorité contextuelle", () => {
  it("Modifier : settings si sélection, sinon empty", () => {
    expect(editTabIntent(true)).toBe("settings")
    expect(editTabIntent(false)).toBe("empty")
  })
  it("après sélection → sheet edit medium", () => {
    expect(afterSelect()).toEqual({ open: true, tab: "edit", snap: "medium" })
  })
  it("après ajout → sélectionne + ouvre edit + scroll", () => {
    const a = afterAdd()
    expect(a.select).toBe(true)
    expect(a.scrollToNew).toBe(true)
    expect(a.sheet).toEqual({ open: true, tab: "edit", snap: "medium" })
  })
})

describe("clavier virtuel", () => {
  it("sheet passe en expanded quand le clavier s'ouvre", () => {
    expect(sheetForKeyboard(openSheet("edit"), true)).toEqual({ open: true, tab: "edit", snap: "expanded" })
    expect(sheetForKeyboard(openSheet("edit"), false)).toEqual(openSheet("edit"))
    expect(sheetForKeyboard(CLOSED_SHEET, true)).toEqual(CLOSED_SHEET)
  })
  it("bottom nav masquée si clavier ouvert", () => {
    expect(bottomNavVisible(true)).toBe(false)
    expect(bottomNavVisible(false)).toBe(true)
  })
  it("usableHeight retire la hauteur du clavier, borné", () => {
    expect(usableHeight(844, 300)).toBe(544)
    expect(usableHeight(844, 9999)).toBe(0)
    expect(usableHeight(844, -5)).toBe(844)
  })
})

describe("safe areas (une seule fois)", () => {
  it("nav visible → safe area sur la nav, pas la sheet", () => {
    const t = safeAreaTargets(openSheet("edit"), false)
    expect(t.bottomNav).toBe(true)
    expect(t.sheet).toBe(false)
  })
  it("clavier ouvert (nav masquée) → safe area sur la sheet", () => {
    const t = safeAreaTargets(openSheet("edit"), true)
    expect(t.bottomNav).toBe(false)
    expect(t.sheet).toBe(true)
  })
})

describe("retour arrière (hiérarchie §20)", () => {
  it("ordre : menu > sous-vue > sheet > preview > quitter", () => {
    expect(resolveBackAction({ menuOpen: true, sheetOpen: true, previewMode: true })).toBe("closeMenu")
    expect(resolveBackAction({ subViewOpen: true, sheetOpen: true })).toBe("closeSubView")
    expect(resolveBackAction({ sheetOpen: true, previewMode: true })).toBe("closeSheet")
    expect(resolveBackAction({ previewMode: true })).toBe("exitPreview")
    expect(resolveBackAction({})).toBe("leave")
  })
})

describe("paysage / tablette", () => {
  it("portrait téléphone : nav pleine, pas de rail", () => {
    const c = mobileChrome(390, 844)
    expect(c.compactNav).toBe(false)
    expect(c.useTabletRail).toBe(false)
  })
  it("paysage téléphone : nav compacte + sheet latérale", () => {
    const c = mobileChrome(844, 390)
    expect(c.compactNav).toBe(true)
    expect(c.sheetSide).toBe(true)
    expect(c.useTabletRail).toBe(false)
  })
  it("tablette : rail latéral, pas l'UI téléphone", () => {
    const c = mobileChrome(768, 1024)
    expect(c.useTabletRail).toBe(true)
    expect(c.compactNav).toBe(false)
  })
  it("seuil tablette", () => {
    expect(mobileChrome(TABLET_MIN_WIDTH, 1000).useTabletRail).toBe(true)
    expect(mobileChrome(TABLET_MIN_WIDTH - 1, 800).useTabletRail).toBe(false)
  })
})

describe("sauvegarde / publication", () => {
  it("badge d'erreur sur Publier", () => {
    expect(mobileSaveError(true)).toBe(true)
    expect(publishTabBadge(true)).toBe("error")
    expect(publishTabBadge(false)).toBeNull()
  })
  it("publishSummary : blocs, vides masqués, avertissements", () => {
    const isEmpty = (b: Block) => !b.content.text
    const s = publishSummary([blk({ content: { text: "ok" } }), blk({ content: {} }), blk({ content: {}, visible: false })], isEmpty)
    expect(s.blocks).toBe(3)
    expect(s.hiddenEmpty).toBe(1) // seul le bloc visible+vide compte
    expect(s.warnings.length).toBeGreaterThan(0)
  })
  it("page vide → avertissement", () => {
    expect(publishSummary([], () => true).warnings[0]).toMatch(/aucun bloc/i)
  })
})

describe("actions contextuelles mobile", () => {
  it("primaires attendues + désactivation par verrouillage", () => {
    const acts = mobileContextActions(blk({ locked: true }), 1, 3)
    const ids = acts.map(a => a.id)
    expect(ids).toEqual(expect.arrayContaining(MOBILE_PRIMARY_ACTIONS))
    expect(acts.find(a => a.id === "delete")!.disabled).toBe(true)
    expect(acts.find(a => a.id === "duplicate")!.disabled).toBe(false)
  })
  it("bornes de déplacement", () => {
    expect(mobileContextActions(blk(), 0, 3).find(a => a.id === "moveUp")!.disabled).toBe(true)
    expect(mobileContextActions(blk(), 2, 3).find(a => a.id === "moveDown")!.disabled).toBe(true)
  })
})

describe("restauration d'état", () => {
  it("rouvre la sheet d'un onglet, ignore preview/null", () => {
    expect(restoreSheet("add")).toEqual(openSheet("add"))
    expect(restoreSheet("preview")).toEqual(CLOSED_SHEET)
    expect(restoreSheet(null)).toEqual(CLOSED_SHEET)
  })
})
