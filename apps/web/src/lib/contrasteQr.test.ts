import { describe, it, expect } from "vitest"
import { readFileSync } from "node:fs"
import { join } from "node:path"
import {
  niveauContraste, verdictContraste,
  CONTRASTE_INSUFFISANT, CONTRASTE_FAIBLE, CONTRASTE_JUSTE, CONTRASTE_FRANC,
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
