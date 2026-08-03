import { describe, it, expect } from "vitest"
import { printPreflight, scanDistanceM, hexContrastRatio, sideClearance, quietZonePx, edgeMarginPx, type PreflightMetrics, type Rect } from "./printPreflight"

const r = (left: number, top: number, width: number, height: number): Rect => ({ left, top, width, height })

const perfect: PreflightMetrics = {
  qrSizeMm: 40, contrastRatio: 12, quietZoneMm: 6, logoPct: 0, dpi: 300, edgeMarginMm: 5,
}
const get = (m: PreflightMetrics, id: string) => printPreflight(m).checks.find(c => c.id === id)!

describe("scanDistanceM", () => {
  it("≈ 10× la taille (règle 10:1), en mètres", () => {
    expect(scanDistanceM(30)).toBe(0.3)    // QR 3 cm -> ~0,3 m (règle conservatrice d'impression)
    expect(scanDistanceM(40)).toBe(0.4)
    expect(scanDistanceM(300)).toBe(3)     // QR 30 cm (affiche) -> ~3 m
  })
  it("null si taille absente ou nulle", () => {
    expect(scanDistanceM(null)).toBeNull()
    expect(scanDistanceM(0)).toBeNull()
    expect(scanDistanceM(undefined)).toBeNull()
  })
})

describe("hexContrastRatio", () => {
  it("noir sur blanc = 21 (max)", () => {
    expect(hexContrastRatio("#000000", "#FFFFFF")).toBe(21)
  })
  it("même couleur = 1 (min)", () => {
    expect(hexContrastRatio("#777777", "#777777")).toBe(1)
  })
  it("symétrique (ordre indifférent)", () => {
    expect(hexContrastRatio("#0A0A0A", "#FFFFFF")).toBe(hexContrastRatio("#FFFFFF", "#0A0A0A"))
  })
  it("gère le hex court #abc et rejette l'invalide", () => {
    expect(hexContrastRatio("#000", "#fff")).toBe(21)
    expect(hexContrastRatio("bleu", "#fff")).toBeNull()
    expect(hexContrastRatio("#12", "#fff")).toBeNull()
  })
  it("QR foncé sur fond clair = fort contraste (>7)", () => {
    expect(hexContrastRatio("#0A0A0A", "#FFFFFF")!).toBeGreaterThan(7)
    expect(hexContrastRatio("#1D4ED8", "#FFF8F0")!).toBeGreaterThan(3)
  })
})

describe("géométrie — sideClearance", () => {
  const qr = r(100, 100, 100, 100) // QR de 100×100 en (100,100)
  it("élément au-dessus (chevauche en X) -> dégagement vertical", () => {
    expect(sideClearance(qr, r(120, 40, 40, 30))).toBe(30) // bas de b à y=70, haut de qr à 100 -> 30
  })
  it("élément à droite (chevauche en Y) -> dégagement horizontal", () => {
    expect(sideClearance(qr, r(230, 120, 20, 20))).toBe(30) // gauche de b à 230, droite de qr à 200 -> 30
  })
  it("élément qui se superpose au QR -> 0", () => {
    expect(sideClearance(qr, r(150, 150, 40, 40))).toBe(0)
  })
  it("élément en diagonale (aucun chevauchement d'axe) -> null (n'encombre aucun côté)", () => {
    expect(sideClearance(qr, r(230, 20, 20, 20))).toBeNull()
  })
})

describe("géométrie — quietZonePx", () => {
  const qr = r(100, 100, 100, 100)
  it("rien autour -> borné par la distance aux bords", () => {
    expect(quietZonePx(qr, [], 400, 400)).toBe(100) // min(100,100, 400-200, 400-200)
  })
  it("un texte collé au-dessus réduit la zone silencieuse", () => {
    expect(quietZonePx(qr, [r(110, 88, 60, 6)], 400, 400)).toBe(6) // 100 - 94
  })
  it("ignore un fond plein cadre (n'encombre pas le QR)", () => {
    expect(quietZonePx(qr, [r(0, 0, 400, 400)], 400, 400)).toBe(100)
  })
})

describe("géométrie — edgeMarginPx", () => {
  it("plus petite distance d'un élément au bord", () => {
    expect(edgeMarginPx([r(20, 50, 30, 30), r(200, 200, 20, 20)], 400, 400)).toBe(20)
  })
  it("élément qui déborde -> marge négative (rognage)", () => {
    expect(edgeMarginPx([r(-5, 100, 40, 40)], 400, 400)).toBe(-5)
  })
  it("ignore un fond plein cadre ; aucun contenu -> pas de risque", () => {
    expect(edgeMarginPx([r(0, 0, 400, 400)], 400, 400)).toBe(400)
  })
})

describe("printPreflight — score global", () => {
  it("design parfait -> 100 %, 5 étoiles, prêt imprimeur", () => {
    const r = printPreflight(perfect)
    expect(r.score).toBe(100)
    expect(r.stars).toBe(5)
    expect(r.grade).toBe("Prêt pour l'imprimeur")
    expect(r.scanDistanceM).toBe(0.4)
    expect(r.checks.filter(c => c.weight > 0).every(c => c.status === "ok")).toBe(true) // contrôles scorés (le CMYK est un avis hors-score)
  })
  it("warn = demi-poids ; le score baisse sans tomber à 0", () => {
    const r = printPreflight({ ...perfect, contrastRatio: 3 }) // 3 -> warn (>=2.5, <4)
    expect(r.score).toBeLessThan(100)
    expect(r.score).toBeGreaterThan(80)
    expect(get({ ...perfect, contrastRatio: 3 }, "contrast").status).toBe("warn")
  })
  it("un fail sur le contraste pénalise fortement", () => {
    const r = printPreflight({ ...perfect, contrastRatio: 1.5 })
    expect(get({ ...perfect, contrastRatio: 1.5 }, "contrast").status).toBe("fail")
    expect(r.score).toBeLessThan(80)
  })
})

describe("printPreflight — seuils par contrôle", () => {
  it("contraste : >=4 ok, 2.5–4 warn, <2.5 fail", () => {
    expect(get({ ...perfect, contrastRatio: 4 }, "contrast").status).toBe("ok")
    expect(get({ ...perfect, contrastRatio: 3.9 }, "contrast").status).toBe("warn")
    expect(get({ ...perfect, contrastRatio: 2.5 }, "contrast").status).toBe("warn")
    expect(get({ ...perfect, contrastRatio: 2.4 }, "contrast").status).toBe("fail")
  })
  it("taille QR : >=25mm ok, 15–25 warn, <15 fail (+ distance dans le détail ok)", () => {
    expect(get({ ...perfect, qrSizeMm: 25 }, "qrsize").status).toBe("ok")
    expect(get({ ...perfect, qrSizeMm: 20 }, "qrsize").status).toBe("warn")
    expect(get({ ...perfect, qrSizeMm: 14 }, "qrsize").status).toBe("fail")
    expect(get({ ...perfect, qrSizeMm: 300 }, "qrsize").detail).toContain("~3 m")   // 30 cm -> 3 m
    expect(get({ ...perfect, qrSizeMm: 40 }, "qrsize").detail).toContain("4.0 cm")
  })
  it("zone silencieuse : >=4mm ok, 2–4 warn, <2 fail", () => {
    expect(get({ ...perfect, quietZoneMm: 4 }, "quiet").status).toBe("ok")
    expect(get({ ...perfect, quietZoneMm: 3 }, "quiet").status).toBe("warn")
    expect(get({ ...perfect, quietZoneMm: 1 }, "quiet").status).toBe("fail")
  })
  it("logo : 0/≤20 ok, 20–28 warn, >28 fail", () => {
    expect(get({ ...perfect, logoPct: 0 }, "logo").status).toBe("ok")
    expect(get({ ...perfect, logoPct: 18 }, "logo").status).toBe("ok")
    expect(get({ ...perfect, logoPct: 25 }, "logo").status).toBe("warn")
    expect(get({ ...perfect, logoPct: 30 }, "logo").status).toBe("fail")
  })
  it("DPI : >=300 ok, 150–300 warn, <150 fail", () => {
    expect(get({ ...perfect, dpi: 300 }, "dpi").status).toBe("ok")
    expect(get({ ...perfect, dpi: 200 }, "dpi").status).toBe("warn")
    expect(get({ ...perfect, dpi: 100 }, "dpi").status).toBe("fail")
  })
  it("marges : >=3mm ok, 1–3 warn, <1 fail", () => {
    expect(get({ ...perfect, edgeMarginMm: 3 }, "margin").status).toBe("ok")
    expect(get({ ...perfect, edgeMarginMm: 2 }, "margin").status).toBe("warn")
    expect(get({ ...perfect, edgeMarginMm: 0.5 }, "margin").status).toBe("fail")
  })
})

describe("printPreflight — na & format écran", () => {
  it("métriques absentes -> na (exclues du score, pas de fausse pénalité)", () => {
    const r = printPreflight({ contrastRatio: 12 }) // seul le contraste est mesuré
    expect(get({ contrastRatio: 12 }, "qrsize").status).toBe("na")
    expect(r.score).toBe(100)          // 1 seul contrôle applicable, ok -> 100
    expect(r.applicable).toBe(1)
  })
  it("format écran (Story) : taille/DPI/marges -> na, pas de distance de scan", () => {
    const r = printPreflight({ ...perfect, isScreen: true })
    expect(get({ ...perfect, isScreen: true }, "qrsize").status).toBe("na")
    expect(get({ ...perfect, isScreen: true }, "dpi").status).toBe("na")
    expect(get({ ...perfect, isScreen: true }, "margin").status).toBe("na")
    expect(get({ ...perfect, isScreen: true }, "contrast").status).toBe("ok") // reste applicable
    expect(r.scanDistanceM).toBeNull()
  })
  it("aucune métrique -> score 0, 3 étoiles, libellé attente", () => {
    const r = printPreflight({})
    expect(r.score).toBe(0)
    expect(r.stars).toBe(3)
    expect(r.grade).toBe("En attente de mesure")
    expect(r.applicable).toBe(0)
  })
  it("couleurs CMYK à risque : avertissement informatif, hors score", () => {
    expect(get({ ...perfect, cmykRiskyColors: 2 }, "cmyk").status).toBe("warn")
    expect(get({ ...perfect, cmykRiskyColors: 0 }, "cmyk").status).toBe("ok")
    expect(get({ ...perfect }, "cmyk").status).toBe("na")
    // Poids 0 -> n'affecte pas le score.
    expect(printPreflight({ ...perfect, cmykRiskyColors: 2 }).score).toBe(printPreflight({ ...perfect, cmykRiskyColors: 0 }).score)
  })
})
