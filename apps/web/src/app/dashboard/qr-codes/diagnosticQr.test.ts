import { describe, it, expect } from "vitest"
import { diagnostiquer, lireContraste, correctionsAuto, contrasteWcag, type EntreeDiagnostic } from "./diagnosticQr"

// Ces 300 lignes de règles décidaient, depuis l'intérieur d'un composant de
// 4 268 lignes, si un commerçant pouvait imprimer son QR — et aucun test ne
// pouvait les atteindre. Extraites, les voici tenues.

const base = (o: Partial<EntreeDiagnostic> = {}): EntreeDiagnostic => ({
  fg: "#080808", bg: "#FFFFFF", ecc: "M", eccEffectif: "M", style: { margin: 10, dotStyle: "square", gradient: "none" }, ...o,
})

describe("contraste WCAG", () => {
  it("noir sur blanc est le maximum", () => {
    expect(contrasteWcag("#000000", "#FFFFFF")).toBeCloseTo(21, 1)
  })
  it("une couleur sur elle-même est le minimum", () => {
    expect(contrasteWcag("#3366AA", "#3366AA")).toBeCloseTo(1, 5)
  })
  it("l'ordre des deux couleurs ne change rien", () => {
    expect(contrasteWcag("#123456", "#EEEEEE")).toBeCloseTo(contrasteWcag("#EEEEEE", "#123456"), 10)
  })
  it("un hex invalide est lu comme du noir, jamais comme une erreur", () => {
    expect(contrasteWcag("pas une couleur", "#FFFFFF")).toBeCloseTo(21, 1)
  })
})

describe("un QR sain ne déclenche aucune alerte", () => {
  const r = diagnostiquer(base())
  it("score plein", () => { expect(r.score).toBe(100); expect(r.grade).toBe("Excellent") })
  it("aucun problème, donc rien à corriger", () => {
    expect(r.issues).toEqual([])
    expect(r.canAutoFix).toBe(false)
  })
  it("il se lit petit", () => { expect(r.minSize).toBe("15mm") })
})

describe("les fautes qui rendent un QR illisible", () => {
  it("contraste presque nul : critique, 35 points", () => {
    const r = diagnostiquer(base({ fg: "#777777", bg: "#808080" }))
    expect(r.issues.map(i => i.id)).toContain("contrast-critical")
    expect(r.score).toBeLessThanOrEqual(65)
    expect(r.grade).not.toBe("Excellent")
  })

  it("logo de 30 % sans correction H : deux critiques", () => {
    const r = diagnostiquer(base({ style: { margin: 10, logoUrl: "x", logoSize: 30 } }))
    const ids = r.issues.map(i => i.id)
    expect(ids).toContain("logo-big")
    expect(ids).toContain("ecc-logo")
    expect(r.score).toBe(100 - 20 - 15)
  })

  it("un logo avec correction H ne reproche que sa taille", () => {
    const r = diagnostiquer(base({ eccEffectif: "H", style: { margin: 10, logoUrl: "x", logoSize: 30 } }))
    expect(r.issues.map(i => i.id)).not.toContain("ecc-logo")
  })

  it("marge absente : la découverte du QR n'est plus garantie", () => {
    const r = diagnostiquer(base({ style: { margin: 2 } }))
    expect(r.issues.map(i => i.id)).toContain("margin-none")
  })

  it("correction L sans logo : trop léger pour l'impression", () => {
    const r = diagnostiquer(base({ ecc: "L", eccEffectif: "L" }))
    expect(r.issues.map(i => i.id)).toContain("ecc-l")
  })

  it("le score ne descend jamais sous zéro, même en cumulant tout", () => {
    const r = diagnostiquer(base({
      fg: "#777777", bg: "#808080", ecc: "L", eccEffectif: "L",
      style: { margin: 0, logoUrl: "x", logoSize: 30, transparent: true, dotStyle: "neon", gradient: "linear", fg2: "#7A7A7A" },
    }))
    expect(r.score).toBe(0)
    expect(r.grade).toBe("Risque")
  })
})

describe("les remarques qui ne sont pas des fautes", () => {
  it("un style Néon avertit, mais ne se corrige pas tout seul", () => {
    const r = diagnostiquer(base({ style: { margin: 10, dotStyle: "neon" } }))
    const i = r.issues.find(x => x.id === "style-complex")!
    expect(i.severity).toBe("warning")
    expect(i.fixable).toBe(false)
    expect(r.canAutoFix).toBe(false)
  })
})

describe("la correction automatique répare ce qu'elle signale", () => {
  it("un QR catastrophique redevient sain en une passe", () => {
    const e = base({
      fg: "#777777", bg: "#808080", ecc: "L", eccEffectif: "L",
      style: { margin: 2, logoUrl: "x", logoSize: 30, transparent: true, gradient: "linear", fg2: "#7A7A7A" },
    })
    const c = correctionsAuto(diagnostiquer(e), e)
    expect(c.fg).toBe("#080808"); expect(c.bg).toBe("#FFFFFF")
    expect(c.ecc).toBe("H")
    expect(c.style.logoSize).toBe(20)
    expect(c.style.transparent).toBe(false)
    expect(c.style.margin).toBe(12)
    expect(c.style.gradient).toBe("none")

    // Et le résultat corrigé ne se plaint plus de rien de corrigeable.
    const apres = diagnostiquer({ ...e, ...c, eccEffectif: "H" })
    expect(apres.issues.filter(i => i.fixable)).toEqual([])
  })

  it("elle ne touche pas à ce qui va bien", () => {
    const e = base()
    expect(correctionsAuto(diagnostiquer(e), e)).toEqual({ fg: e.fg, bg: e.bg, ecc: e.ecc, style: e.style })
  })

  it("contraste moyen sur fond clair : on assombrit les modules", () => {
    const e = base({ fg: "#8A8A8A", bg: "#FFFFFF" })
    expect(correctionsAuto(diagnostiquer(e), e).fg).toBe("#000000")
  })
})

describe("le résumé de contraste montré dans la fenêtre d'aperçu", () => {
  it("sans couleur, il ne montre rien plutôt qu'un zéro trompeur", () => {
    expect(lireContraste("", "#FFF")).toBeNull()
  })
  it("noir sur blanc : excellent, lisible à 15 mm", () => {
    const d = lireContraste("#000000", "#FFFFFF")!
    expect(d.readability).toBe("Excellente")
    expect(d.minSize).toBe("15mm")
    expect(d.warnContrast).toBe(false)
    expect(d.percent).toBe(100)
  })
  it("gris sur gris : risqué, et les deux alertes sont levées", () => {
    const d = lireContraste("#777777", "#808080")!
    expect(d.readability).toBe("Risquee")
    expect(d.warnContrast).toBe(true)
    expect(d.warnLow).toBe(true)
  })
})
