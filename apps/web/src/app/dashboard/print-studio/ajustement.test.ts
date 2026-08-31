import { describe, it, expect } from "vitest"
import {
  ajusterAuSupport, hauteurDemandee, lignesDeTitre, partQrMax,
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
  /** Hauteur réellement rendue après ajustement. */
  const hauteurRendue = (b: BesoinContenu, a: ReturnType<typeof ajusterAuSupport>) => {
    const reste: BesoinContenu = { ...b, qr: a.qr }
    for (const bloc of a.masquer) reste[bloc] = 0
    return (hauteurDemandee(reste) - a.qr) * a.k + a.qr
  }

  it("le cas qui coupait le titre est chiffré, puis résolu", () => {
    expect(hauteurDemandee(STICKER_ROND)).toBeCloseTo(0.941, 3)
    const a = ajusterAuSupport(STICKER_ROND, DISPO_ROND)
    expect(hauteurRendue(STICKER_ROND, a)).toBeLessThanOrEqual(DISPO_ROND + 1e-9)
  })

  it("quelle que soit la place, ce qui reste rentre", () => {
    for (const dispo of [0.35, 0.5, 0.62, 0.7, 0.85, 0.94, 1.2]) {
      const a = ajusterAuSupport(STICKER_ROND, dispo)
      if (!a.deborde) expect(hauteurRendue(STICKER_ROND, a), `dispo ${dispo}`).toBeLessThanOrEqual(dispo + 1e-9)
    }
  })

  it("ne touche à rien quand ça rentre déjà", () => {
    const large = ajusterAuSupport({ ...STICKER_ROND, qr: 0.2, bouton: 0.05 }, 1)
    expect(large).toEqual({ k: 1, qr: 0.2, masquer: [], deborde: false })
  })

  it("sacrifie les TEXTES avant le QR — c'est lui qui doit se scanner", () => {
    // Débordement modéré : les textes suffisent à l'absorber, le QR ne bouge pas.
    const a = ajusterAuSupport(STICKER_ROND, 0.85)
    expect(a.qr).toBe(0.540)
    expect(a.k).toBeLessThan(1)
  })

  it("le QR garde la taille demandée : ce sont les blocs décoratifs qui partent", () => {
    // C'ÉTAIT LE DÉFAUT SIGNALÉ : « la taille du QR, j'ai l'impression que ça ne
    // marche pas ». Le QR était rapetissé pour laisser tenir le sous-titre et le
    // bouton — donc Compact, Recommandé et Maximum rendaient la même image.
    const a = ajusterAuSupport(STICKER_ROND, DISPO_ROND)
    expect(a.qr, "le QR demandé doit être respecté").toBe(STICKER_ROND.qr)
    expect(a.masquer).toContain("sousTitre")
    expect(a.deborde).toBe(false)
  })

  it("le curseur de taille se voit : plus grand demandé, plus grand rendu", () => {
    const petit = ajusterAuSupport({ ...STICKER_ROND, qr: 0.34 }, DISPO_ROND)
    const grand = ajusterAuSupport({ ...STICKER_ROND, qr: 0.54 }, DISPO_ROND)
    expect(grand.qr).toBeGreaterThan(petit.qr)
    // Et le petit ne sacrifie rien : il y a la place pour tout.
    expect(petit.masquer).toEqual([])
  })

  it("on retire le décoratif d'abord, le bouton ensuite", () => {
    // Un QR énorme sur un tout petit support : il faut lâcher les deux.
    const a = ajusterAuSupport({ ...STICKER_ROND, qr: 0.62 }, 0.70)
    expect(a.masquer[0]).toBe("sousTitre")
    expect(a.masquer.length).toBeGreaterThanOrEqual(1)
  })

  it("le QR ne cède qu'en tout dernier, et jamais sous son minimum lisible", () => {
    // Support minuscule : sous-titre et bouton retirés, titre au plancher, et il
    // faut encore de la place. Là seulement le QR recule.
    const a = ajusterAuSupport(STICKER_ROND, 0.5)
    expect(a.masquer).toEqual(["sousTitre", "bouton"])
    expect(a.qr).toBeLessThan(STICKER_ROND.qr)
    expect(a.qr).toBeGreaterThanOrEqual(STICKER_ROND.qr * REDUCTION_QR_MIN)
  })

  it("dit quand ça ne rentre pas, au lieu de couper en silence", () => {
    const a = ajusterAuSupport(STICKER_ROND, 0.25)
    expect(a.deborde).toBe(true)
    // Et il reste lisible : on n'a pas réduit à l'infini pour faire semblant.
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
    expect(ajusterAuSupport(STICKER_ROND, 0)).toEqual({ k: 1, qr: 0.540, masquer: [], deborde: true })
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


describe("jusqu'où le QR peut grandir", () => {
  // Le panneau promettait 36 mm sur un sticker de 50, le rendu en dessinait 22 :
  // deux bornes écrites à deux endroits, sans rapport. D'où un curseur « Taille
  // du QR » dont on ne voyait pas l'effet.
  it("sur un rond, un QR sans pastille tient dans le cercle utile", () => {
    expect(partQrMax(true, "aucune", 0.15) * Math.SQRT2).toBeCloseTo(0.70, 6)
  })

  it("sur un rond, la pastille RONDE laisse le QR plus grand que la carrée", () => {
    // Contre-intuitif, mais c'est de la géométrie : une pastille ronde épouse le
    // support et se pose bord à bord, tandis qu'une pastille carrée doit faire
    // entrer sa DIAGONALE dans le même cercle. Sur un sticker rond, choisir la
    // pastille ronde donne donc un QR plus gros, pas plus petit.
    const sans = partQrMax(true, "aucune", 0.15)
    const carre = partQrMax(true, "carre", 0.15)
    const cercle = partQrMax(true, "cercle", 0.15)
    expect(carre).toBeLessThan(sans)
    expect(cercle).toBeLessThan(sans)
    expect(cercle).toBeGreaterThan(carre)
  })

  it("la pastille ronde entoure vraiment le QR", () => {
    const q = partQrMax(true, "cercle", 0.15)
    const diametre = q * (1 + 2 * ((Math.SQRT2 - 1) / 2 + 0.035))
    expect(diametre).toBeLessThanOrEqual(0.70 + 1e-9)
    // Elle circonscrit le carré : sinon les coins du QR débordent sur le fond.
    expect(diametre).toBeGreaterThan(q * Math.SQRT2)
  })

  it("sur un rectangle, on va bien plus loin que sur un rond", () => {
    expect(partQrMax(false, "aucune", 0.09)).toBeGreaterThan(partQrMax(true, "aucune", 0.15))
  })

  it("le « QR géant » garde de la place pour le titre et le bouton", () => {
    expect(partQrMax(false, "aucune", 0.09, true)).toBeLessThan(partQrMax(false, "aucune", 0.09, false))
  })

  it("ne renvoie jamais une part absurde", () => {
    for (const marge of [0, 0.15, 0.4, 0.49, 0.6]) {
      for (const b of ["carre", "cercle", "aucune"] as const) {
        const v = partQrMax(true, b, marge)
        expect(v, `${b} @ ${marge}`).toBeGreaterThan(0)
        expect(v).toBeLessThanOrEqual(1)
      }
    }
  })
})
