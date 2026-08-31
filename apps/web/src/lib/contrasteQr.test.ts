import { describe, it, expect } from "vitest"
import { readFileSync } from "node:fs"
import { join } from "node:path"
import {
  niveauContraste, verdictContraste,
  CONTRASTE_INSUFFISANT, CONTRASTE_FAIBLE, CONTRASTE_JUSTE, CONTRASTE_FRANC,
  luminance, rapportContraste, rapportAffiche, rapportOuPire, estInverse, encreLisible,
} from "./contrasteQr"
import { printPreflight } from "../app/dashboard/qr-codes/printPreflight"

// Trois outils du même site jugeaient le contraste d'un QR sur trois échelles
// incompatibles. À 4,2 pour 1 : le QR Studio disait « juste », le Print Studio
// « conforme », le testeur public « risque ». Un client qui passe son fichier
// dans les deux outils de QRowg recevait deux réponses opposées.

describe("les seuils sont ordonnés et couvrent tout", () => {
  it("les bornes montent bien", () => {
    expect(CONTRASTE_INSUFFISANT).toBeLessThan(CONTRASTE_FAIBLE)
    expect(CONTRASTE_FAIBLE).toBeLessThan(CONTRASTE_JUSTE)
    expect(CONTRASTE_JUSTE).toBeLessThan(CONTRASTE_FRANC)
  })

  it("chaque rapport reçoit exactement un niveau", () => {
    for (const r of [1, 1.9, 2, 2.9, 3, 4.4, 4.5, 6.9, 7, 21]) {
      expect(niveauContraste(r), `${r}:1`).not.toBeNull()
    }
  })

  it("le cas qui posait problème est tranché une fois pour toutes", () => {
    // 4,2 pour 1 : sous le seuil confortable, au-dessus du risque réel.
    expect(niveauContraste(4.2)).toBe("juste")
    expect(verdictContraste(4.2)).toBe("warn")
  })

  it("une mesure impossible n'invente pas de verdict", () => {
    expect(niveauContraste(null)).toBeNull()
    expect(niveauContraste(NaN)).toBeNull()
    expect(verdictContraste(undefined)).toBe("na")
  })

  it("le noir sur blanc est franc, le gris sur gris ne l'est pas", () => {
    expect(niveauContraste(21)).toBe("franc")
    expect(niveauContraste(1.2)).toBe("insuffisant")
  })
})

describe("les trois outils rendent le même verdict", () => {
  const studio = readFileSync(join(__dirname, "../app/dashboard/qr-codes/qrScannability.ts"), "utf8")
  const testeur = readFileSync(join(__dirname, "../app/outils/testeur-qr-code/diagnostic.ts"), "utf8")
  const impression = readFileSync(join(__dirname, "../app/dashboard/qr-codes/printPreflight.ts"), "utf8")

  it("aucun des trois ne réécrit un seuil en dur", () => {
    for (const [nom, src] of [["QR Studio", studio], ["testeur public", testeur]] as const) {
      expect(src, `${nom} importe les seuils partagés`).toContain('from "@/lib/contrasteQr"')
    }
    expect(impression).toContain("verdictContraste")
    expect(impression, "grade3 réintroduirait des bornes locales").not.toMatch(/grade3\(m\.contrastRatio/)
  })

  it("le Print Studio suit exactement le verdict partagé", () => {
    // C'était lui le divergent : il validait dès 4:1 quand le testeur alertait.
    for (const r of [1.5, 2.5, 3.5, 4.2, 5, 9]) {
      const res = printPreflight({ contrastRatio: r } as any)
      const check = res.checks.find(c => c.id === "contrast")
      expect(check?.status, `${r}:1`).toBe(verdictContraste(r))
    }
  })
})

// ── Le calcul, rapatrié depuis les cinq copies ───────────────────────────────

describe("la luminance", () => {
  it("vaut 1 pour le blanc et 0 pour le noir", () => {
    expect(luminance("#FFFFFF")).toBeCloseTo(1, 4)
    expect(luminance("#000000")).toBeCloseTo(0, 4)
  })

  it("accepte la forme courte à trois chiffres", () => {
    expect(luminance("#fff")).toBeCloseTo(luminance("#FFFFFF")!, 10)
  })

  it("refuse une couleur illisible au lieu d'en inventer une", () => {
    // Les trois anciennes versions renvoyaient 1, 0 ou null pour ce même cas :
    // trois verdicts différents sur une couleur abîmée en base.
    for (const mauvais of ["bleu", "#12", "", null, undefined, 42, "#GGGGGG"]) {
      expect(luminance(mauvais as never), String(mauvais)).toBeNull()
    }
  })
})

describe("le rapport de contraste", () => {
  it("va de 1 à 21", () => {
    expect(rapportContraste("#000000", "#FFFFFF")).toBeCloseTo(21, 5)
    expect(rapportContraste("#C9A84C", "#C9A84C")).toBeCloseTo(1, 5)
  })

  it("est symétrique", () => {
    expect(rapportContraste("#080808", "#FEF3C7")).toBeCloseTo(rapportContraste("#FEF3C7", "#080808")!, 10)
  })

  it("n'est PAS arrondi — c'est lui qu'on compare aux seuils", () => {
    // Arrondir avant de comparer faisait passer 4,4951 pour 4,5 sur un écran et
    // pas sur l'autre : deux outils, deux verdicts, mêmes couleurs.
    const brut = rapportContraste("#767676", "#FFFFFF")!
    expect(brut).not.toBe(Math.round(brut * 100) / 100)
    expect(rapportAffiche("#767676", "#FFFFFF")).toBe(Math.round(brut * 100) / 100)
  })

  it("vaut null sur une couleur illisible, et 1 quand on demande le pire", () => {
    expect(rapportContraste("bleu", "#FFF")).toBeNull()
    // Un contrôle avant impression ne doit jamais conclure « conforme » sur une
    // couleur qu'il n'a pas su lire.
    expect(rapportOuPire("bleu", "#FFF")).toBe(1)
    expect(verdictContraste(rapportOuPire("bleu", "#FFF"))).toBe("fail")
  })
})

describe("clair sur fond sombre", () => {
  it("est détecté, même quand le contraste est excellent", () => {
    // Le rapport est symétrique et ne dit pas le sens ; or un QR clair sur fond
    // sombre est refusé par une partie des lecteurs.
    expect(rapportContraste("#FFFFFF", "#000000")).toBeCloseTo(21, 5)
    expect(estInverse("#FFFFFF", "#000000")).toBe(true)
    expect(estInverse("#F5F0E8", "#111111")).toBe(true)
  })

  it("laisse passer le sens normal", () => {
    expect(estInverse("#080808", "#FFFFFF")).toBe(false)
    expect(estInverse("#1D4ED8", "#FEF3C7")).toBe(false)
  })

  it("ne se prononce pas sur une couleur illisible", () => {
    expect(estInverse("bleu", "#FFFFFF")).toBe(false)
  })
})

describe("l'encre lisible sur un fond", () => {
  it("choisit du noir sur l'or QRowg", () => {
    // La méthode remplacée comparait la luminance à 0,48 et choisissait du BLANC
    // sur #C9A84C : 2,4 pour 1, sous le minimum lisible, sur la couleur de marque.
    expect(encreLisible("#C9A84C")).toBe("#111111")
    expect(rapportContraste("#FFFFFF", "#C9A84C")!).toBeLessThan(CONTRASTE_JUSTE)
    expect(rapportContraste("#111111", "#C9A84C")!).toBeGreaterThan(CONTRASTE_FRANC)
  })

  it("choisit toujours celle des deux qui contraste le plus", () => {
    for (const fond of ["#C9A84C", "#38BDF8", "#059669", "#FF6B6B", "#808080", "#080808", "#FFFFFF", "#8A8478"]) {
      const encre = encreLisible(fond)
      const autre = encre === "#111111" ? "#FFFFFF" : "#111111"
      expect(rapportContraste(encre, fond)!, fond).toBeGreaterThanOrEqual(rapportContraste(autre, fond)!)
    }
  })

  it("accepte une autre paire de teintes", () => {
    expect(encreLisible("#FFFFFF", "#0A0A0A", "#FFFFFF")).toBe("#0A0A0A")
  })
})
