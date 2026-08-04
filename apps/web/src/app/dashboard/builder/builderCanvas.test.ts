import { describe, it, expect } from "vitest"
import {
  DEVICE_DIMS, deviceFrameWidth, deviceLabel, orientationApplies, toggleOrientation,
  clampZoom, stepZoom, zoomPercent, fitZoom, isOverflowing, resolveFloatingToolbarPosition,
  gapInsertIndex, pagePositionLabel, resolveCanvasShortcut, canvasChrome,
  ZOOM_MIN, ZOOM_MAX, ZOOM_DEFAULT, type Rect,
} from "./builderCanvas"

describe("appareils & orientation", () => {
  it("dimensions de référence", () => {
    expect(DEVICE_DIMS.mobile.w).toBe(390)
    expect(DEVICE_DIMS.tablet.w).toBe(768)
    expect(DEVICE_DIMS.desktop.w).toBe(1280)
  })
  it("orientation applicable seulement mobile/tablette", () => {
    expect(orientationApplies("mobile")).toBe(true)
    expect(orientationApplies("tablet")).toBe(true)
    expect(orientationApplies("desktop")).toBe(false)
    expect(orientationApplies("fluid")).toBe(false)
  })
  it("paysage échange largeur/hauteur (mobile)", () => {
    expect(deviceFrameWidth("mobile", "portrait", 1000)).toBe(390)
    expect(deviceFrameWidth("mobile", "landscape", 1000)).toBe(844)
  })
  it("desktop ignore l'orientation", () => {
    expect(deviceFrameWidth("desktop", "landscape", 2000)).toBe(1280)
  })
  it("fluid suit la largeur disponible, bornée", () => {
    expect(deviceFrameWidth("fluid", "portrait", 500)).toBe(500)
    expect(deviceFrameWidth("fluid", "portrait", 5000)).toBe(900)
    expect(deviceFrameWidth("fluid", "portrait", 100)).toBe(280)
  })
  it("libellé avec largeur", () => {
    expect(deviceLabel("mobile", "portrait", 1000)).toBe("Mobile · 390 px")
  })
  it("toggleOrientation", () => {
    expect(toggleOrientation("portrait")).toBe("landscape")
    expect(toggleOrientation("landscape")).toBe("portrait")
  })
})

describe("zoom", () => {
  it("clamp borne + gère NaN", () => {
    expect(clampZoom(0.1)).toBe(ZOOM_MIN)
    expect(clampZoom(9)).toBe(ZOOM_MAX)
    expect(clampZoom(NaN)).toBe(ZOOM_DEFAULT)
    expect(clampZoom(1)).toBe(1)
  })
  it("step avance/recule et reste borné", () => {
    expect(stepZoom(1, 1)).toBe(1.1)
    expect(stepZoom(1, -1)).toBeCloseTo(0.9, 5)
    expect(stepZoom(ZOOM_MAX, 1)).toBe(ZOOM_MAX)
    expect(stepZoom(ZOOM_MIN, -1)).toBe(ZOOM_MIN)
  })
  it("pas de dérive flottante", () => {
    let z = 1
    for (let i = 0; i < 3; i++) z = stepZoom(z, 1)
    expect(z).toBe(1.3)
  })
  it("zoomPercent", () => {
    expect(zoomPercent(1)).toBe(100)
    expect(zoomPercent(0.5)).toBe(50)
  })
})

describe("ajuster à la largeur", () => {
  it("fluid → 100 %", () => {
    expect(fitZoom("fluid", "portrait", 800)).toBe(ZOOM_DEFAULT)
  })
  it("cadre plus large que dispo → zoom < 1 borné", () => {
    // desktop 1280 dans 700px dispo → ~0.5
    const z = fitZoom("desktop", "portrait", 700, 24)
    expect(z).toBeLessThan(1)
    expect(z).toBeGreaterThanOrEqual(ZOOM_MIN)
  })
  it("cadre plus petit que dispo → borné à ZOOM_MAX", () => {
    expect(fitZoom("mobile", "portrait", 5000)).toBeLessThanOrEqual(ZOOM_MAX)
  })
})

describe("débordement", () => {
  it("détecte le dépassement selon le zoom", () => {
    expect(isOverflowing(1280, 1, 800)).toBe(true)
    expect(isOverflowing(1280, 0.5, 800)).toBe(false)
    expect(isOverflowing(390, 1, 800)).toBe(false)
  })
})

describe("toolbar flottante", () => {
  const canvas: Rect = { top: 0, bottom: 600, left: 0, right: 400, width: 400, height: 600 }
  it("au-dessus si la place existe", () => {
    const block: Rect = { top: 200, bottom: 300, left: 20, right: 380, width: 360, height: 100 }
    const p = resolveFloatingToolbarPosition(block, canvas, 34, 8)
    expect(p.placement).toBe("top")
    expect(p.top).toBe(200 - 34 - 8)
  })
  it("en dessous si pas de place au-dessus", () => {
    const block: Rect = { top: 5, bottom: 120, left: 20, right: 380, width: 360, height: 115 }
    expect(resolveFloatingToolbarPosition(block, canvas, 34, 8).placement).toBe("bottom")
  })
  it("à l'intérieur si ni au-dessus ni en dessous", () => {
    const block: Rect = { top: 5, bottom: 595, left: 20, right: 380, width: 360, height: 590 }
    expect(resolveFloatingToolbarPosition(block, canvas, 34, 8).placement).toBe("inside-top")
  })
})

describe("insertion & page longue", () => {
  it("gapInsertIndex borne comme resolveInsertIndex", () => {
    expect(gapInsertIndex(5, 2)).toBe(2)
    expect(gapInsertIndex(5, 99)).toBe(5)
    expect(gapInsertIndex(5, -1)).toBe(0)
  })
  it("pagePositionLabel", () => {
    expect(pagePositionLabel(null, 0)).toBe("0 bloc")
    expect(pagePositionLabel(null, 5)).toBe("5 blocs")
    expect(pagePositionLabel(17, 52)).toBe("Bloc 18 / 52")
  })
})

describe("raccourcis", () => {
  it("Escape toujours actif, même en édition", () => {
    expect(resolveCanvasShortcut({ key: "Escape", mod: false, editing: true })).toBe("escape")
  })
  it("aucun raccourci pendant l'édition (hors Escape)", () => {
    expect(resolveCanvasShortcut({ key: "f", mod: false, editing: true })).toBeNull()
    expect(resolveCanvasShortcut({ key: "+", mod: true, editing: true })).toBeNull()
  })
  it("zoom & reset avec modificateur", () => {
    expect(resolveCanvasShortcut({ key: "+", mod: true, editing: false })).toBe("zoomIn")
    expect(resolveCanvasShortcut({ key: "=", mod: true, editing: false })).toBe("zoomIn")
    expect(resolveCanvasShortcut({ key: "-", mod: true, editing: false })).toBe("zoomOut")
    expect(resolveCanvasShortcut({ key: "0", mod: true, editing: false })).toBe("reset")
  })
  it("F = focus (sans modificateur, hors édition)", () => {
    expect(resolveCanvasShortcut({ key: "f", mod: false, editing: false })).toBe("focus")
  })
})

describe("chrome responsive", () => {
  it("desktop : cadre + zoom + orientation selon device", () => {
    const c = canvasChrome("mobile", false, "edit")
    expect(c.showDeviceFrame).toBe(true)
    expect(c.showOrientation).toBe(true)
    expect(c.showZoom).toBe(true)
  })
  it("fluid : pas de cadre ni orientation", () => {
    const c = canvasChrome("fluid", false, "edit")
    expect(c.showDeviceFrame).toBe(false)
    expect(c.showOrientation).toBe(false)
  })
  it("viewport mobile : simplifié (pas de cadre ni zoom)", () => {
    const c = canvasChrome("mobile", true, "edit")
    expect(c.showDeviceFrame).toBe(false)
    expect(c.showZoom).toBe(false)
  })
  it("preview : pas d'orientation ni zoom", () => {
    const c = canvasChrome("mobile", false, "preview")
    expect(c.showOrientation).toBe(false)
    expect(c.showZoom).toBe(false)
  })
})
