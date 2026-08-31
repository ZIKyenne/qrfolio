import { describe, it, expect } from "vitest"
import {
  ajusterAuSupport, hauteurDemandee, lignesDeTitre,
  REDUCTION_TEXTE_MIN, REDUCTION_QR_MIN, type BesoinContenu,
} from "./ajustement"

// Le cas réel : modèle « La carte » sur un sticker rond de 50 mm. Le contenu
// demande 0,94 fois le diamètre, le carré inscrit en offre 0,70. Le rendu centrait
// le bloc et coupait le surplus moitié en haut, moitié en bas : le titre était
// tranché par le bord, le bouton mangé par le bas, sans aucun avertissement.
const STICKER_ROND: BesoinContenu = {
  marque: 0, ligneTitre: 0.112, lignesTitre: 1, sousTitre: 0.063,
  qr: 0.540, bouton: 0.130, ecart: 0.032,
}
const DISPO_ROND = 0.70

describe("le contenu tient dans le support", () => {
  it("le cas qui coupait le titre est chiffré, puis résolu", () => {
    expect(hauteurDemandee(STICKER_ROND)).toBeCloseTo(0.941, 3)
    const a = ajusterAuSupport(STICKER_ROND, DISPO_ROND)
    expect(a.k).toBeLessThan(1)
    const apres = (hauteurDemandee(STICKER_ROND) - STICKER_ROND.qr) * a.k + a.qr
    expect(apres).toBeLessThanOrEqual(DISPO_ROND + 1e-9)
  })

  it("ne touche à rien quand ça rentre déjà", () => {
    const large = ajusterAuSupport({ ...STICKER_ROND, qr: 0.2, bouton: 0.05 }, 1)
    expect(large).toEqual({ k: 1, qr: 0.2, deborde: false })
  })

  it("sacrifie les TEXTES avant le QR — c'est lui qui doit se scanner", () => {
    // Débordement modéré : les textes suffisent à l'absorber, le QR ne bouge pas.
    const a = ajusterAuSupport(STICKER_ROND, 0.85)
    expect(a.qr).toBe(0.540)
    expect(a.k).toBeLessThan(1)
  })

  it("sur le sticker rond, les textes seuls ne suffisent pas — le QR recule aussi", () => {
    // 0,94 demandé pour 0,70 : même textes au plancher (0,401 × 0,62 = 0,249),
    // il reste 0,451 pour un QR qui en demandait 0,540. Il faut bien qu'il cède.
    const a = ajusterAuSupport(STICKER_ROND, DISPO_ROND)
    expect(a.k).toBe(REDUCTION_TEXTE_MIN)
    expect(a.qr).toBeCloseTo(0.451, 3)
    // 0,451 × 50 mm ≈ 22,5 mm : toujours scannable — c'est le contrôle avant
    // impression qui tranche, pas ce module.
    expect(a.qr).toBeGreaterThan(STICKER_ROND.qr * REDUCTION_QR_MIN)
    expect(a.deborde).toBe(false)
  })

  it("le QR ne cède qu'ensuite, et jamais sous son minimum lisible", () => {
    // Support minuscule : même textes au plancher, le QR doit reculer.
    const a = ajusterAuSupport(STICKER_ROND, 0.5)
    expect(a.k).toBe(REDUCTION_TEXTE_MIN)
    expect(a.qr).toBeLessThan(STICKER_ROND.qr)
    expect(a.qr).toBeGreaterThanOrEqual(STICKER_ROND.qr * REDUCTION_QR_MIN)
  })

  it("dit quand ça ne rentre pas, au lieu de couper en silence", () => {
    const a = ajusterAuSupport(STICKER_ROND, 0.25)
    expect(a.deborde).toBe(true)
    // Et il reste lisible : on n'a pas réduit à l'infini pour faire semblant.
    expect(a.k).toBe(REDUCTION_TEXTE_MIN)
    expect(a.qr).toBe(STICKER_ROND.qr * REDUCTION_QR_MIN)
  })

  it("un texte réduit reste au-dessus du seuil de lisibilité", () => {
    for (const dispo of [0.1, 0.3, 0.5, 0.7, 0.9]) {
      const a = ajusterAuSupport(STICKER_ROND, dispo)
      expect(a.k, `dispo ${dispo}`).toBeGreaterThanOrEqual(REDUCTION_TEXTE_MIN)
      expect(a.k).toBeLessThanOrEqual(1)
    }
  })

  it("un support sans place ne fait pas planter le calcul", () => {
    expect(ajusterAuSupport(STICKER_ROND, 0)).toEqual({ k: 1, qr: 0.540, deborde: true })
  })
})

describe("les écarts ne comptent que les blocs présents", () => {
  it("trois blocs, deux écarts", () => {
    const b: BesoinContenu = { marque: 0, ligneTitre: 0.1, lignesTitre: 1, sousTitre: 0, qr: 0.3, bouton: 0.1, ecart: 0.05 }
    expect(hauteurDemandee(b)).toBeCloseTo(0.1 + 0.3 + 0.1 + 0.1, 6)
  })
  it("un seul bloc, aucun écart", () => {
    const b: BesoinContenu = { marque: 0, ligneTitre: 0, lignesTitre: 0, sousTitre: 0, qr: 0.4, bouton: 0, ecart: 0.05 }
    expect(hauteurDemandee(b)).toBe(0.4)
  })
})

describe("le nombre de lignes du titre", () => {
  it("un titre court tient sur une ligne", () => {
    expect(lignesDeTitre("La carte", 0.11, 0.7)).toBe(1)
  })
  it("un titre long en prend plusieurs", () => {
    expect(lignesDeTitre("Marché des créateurs du dimanche matin", 0.11, 0.7)).toBeGreaterThan(1)
  })
  it("un mot plus long que la ligne ne boucle pas à l'infini", () => {
    expect(lignesDeTitre("anticonstitutionnellement", 0.2, 0.3)).toBeGreaterThan(1)
    expect(lignesDeTitre("anticonstitutionnellement", 0.2, 0.3)).toBeLessThan(20)
  })
  it("un titre vide n'occupe aucune ligne", () => {
    expect(lignesDeTitre("", 0.11, 0.7)).toBe(0)
    expect(lignesDeTitre("   ", 0.11, 0.7)).toBe(0)
  })
  it("une largeur ou une taille absurde rend une ligne plutôt qu'une division par zéro", () => {
    expect(lignesDeTitre("Menu", 0, 0.7)).toBe(1)
    expect(lignesDeTitre("Menu", 0.11, 0)).toBe(1)
  })
  it("plus le support est étroit, plus il y a de lignes", () => {
    const large = lignesDeTitre("Menu du jour", 0.11, 1)
    const etroit = lignesDeTitre("Menu du jour", 0.11, 0.4)
    expect(etroit).toBeGreaterThanOrEqual(large)
  })
})
