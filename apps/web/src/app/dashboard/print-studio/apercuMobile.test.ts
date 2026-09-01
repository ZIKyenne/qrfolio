import { describe, it, expect } from "vitest"
import {
  bandeApercuMobile, boiteApercuMobile, dimensionsApercuMobile, legendeVisible,
  HAUT_BARRE_MOBILE, HAUT_ENTETE_MOBILE, BANDE_MINIMALE, LARGEUR_MINIMALE_SUPPORT, vhFeuilleMax, MARGE_SECURITE,
  estPaysage, largeurTiroirPaysage, largeurApercuMobile, HAUT_BARRE_PAYSAGE,
  VH_FEUILLE_MINIMALE, VH_FEUILLE_MAXIMALE,
} from "./apercuMobile"

// Écran de référence : iPhone 14/15 en portrait.
const ECRAN = 844
const LARGEUR = 390
const VH = { peek: 40, half: 66, full: 90 }

describe("bandeApercuMobile", () => {
  it("feuille fermée : tout l'écran moins l'entête, la barre d'action et la respiration", () => {
    expect(bandeApercuMobile(ECRAN, false, VH.half)).toBe(ECRAN - HAUT_BARRE_MOBILE - HAUT_ENTETE_MOBILE - MARGE_SECURITE)
  })

  it("les hauteurs MESURÉES priment sur les valeurs de repli", () => {
    // Les constantes posées « à peu près » mentaient : 52 px annoncés pour un
    // entête qui en fait 72, et la légende passait sous la barre d'action.
    const mesure = bandeApercuMobile(ECRAN, false, VH.half, false, { entete: 100, barre: 200 })
    expect(mesure).toBe(ECRAN - 200 - 100 - MARGE_SECURITE)
  })

  it("une mesure absurde retombe sur le repli, jamais sur une bande négative", () => {
    for (const m of [{ entete: 0, barre: 0 }, { entete: -10, barre: -10 }, {}]) {
      expect(bandeApercuMobile(ECRAN, false, VH.half, false, m)).toBe(bandeApercuMobile(ECRAN, false, VH.half))
    }
  })

  it("la bande RÉTRÉCIT quand la feuille monte", () => {
    const fermee = bandeApercuMobile(ECRAN, false, VH.peek)
    const peek = bandeApercuMobile(ECRAN, true, VH.peek)
    const half = bandeApercuMobile(ECRAN, true, VH.half)
    const full = bandeApercuMobile(ECRAN, true, VH.full)
    expect(fermee).toBeGreaterThan(peek)
    expect(peek).toBeGreaterThan(half)
    expect(half).toBeGreaterThan(full)
  })

  it("la bande ne dépasse JAMAIS le haut laissé libre par la feuille", () => {
    // C'est tout le défaut corrigé : l'aperçu passait sous la feuille.
    for (const vh of [VH.peek, VH.half, VH.full]) {
      const libre = ECRAN * (1 - vh / 100)
      const bande = bandeApercuMobile(ECRAN, true, vh)
      if (bande > BANDE_MINIMALE) expect(bande).toBeLessThanOrEqual(libre)
    }
  })

  it("ne descend pas sous le plancher, même feuille à fond", () => {
    expect(bandeApercuMobile(ECRAN, true, 100)).toBe(BANDE_MINIMALE)
    expect(bandeApercuMobile(200, true, VH.full)).toBe(BANDE_MINIMALE)
  })

  it("hauteur d'écran absurde -> plancher, jamais NaN ni négatif", () => {
    for (const h of [0, -50, NaN, Infinity]) {
      const b = bandeApercuMobile(h as number, false, VH.half)
      expect(Number.isFinite(b)).toBe(true)
      expect(b).toBeGreaterThanOrEqual(BANDE_MINIMALE)
    }
  })

  it("un vh hors bornes est ramené dans [0,100]", () => {
    expect(bandeApercuMobile(ECRAN, true, -20)).toBe(bandeApercuMobile(ECRAN, true, 0))
    expect(bandeApercuMobile(ECRAN, true, 150)).toBe(bandeApercuMobile(ECRAN, true, 100))
  })
})

describe("boiteApercuMobile", () => {
  it("la largeur suit l'écran, marges comprises", () => {
    expect(boiteApercuMobile(400, LARGEUR).boxW).toBe(LARGEUR - 24)
  })

  it("un support ROND tient en largeur sur un téléphone", () => {
    // Bande généreuse (feuille fermée) : sans clamp en largeur, un rond de
    // 670 px de haut deborderait de l'ecran.
    const { boxW, boxH } = boiteApercuMobile(bandeApercuMobile(ECRAN, false, VH.half), LARGEUR)
    const cote = Math.min(boxW, boxH)   // ratio 1
    expect(cote).toBeLessThanOrEqual(LARGEUR)
  })

  it("feuille à mi-hauteur : la boîte tient dans la bande", () => {
    const bande = bandeApercuMobile(ECRAN, true, VH.half)
    expect(boiteApercuMobile(bande, LARGEUR).boxH).toBeLessThanOrEqual(bande)
  })

  it("jamais de dimension nulle ou négative", () => {
    const { boxW, boxH } = boiteApercuMobile(0, 0)
    expect(boxW).toBeGreaterThan(0); expect(boxH).toBeGreaterThan(0)
  })
})

describe("legendeVisible", () => {
  it("visible quand la bande est confortable, masquée quand elle est courte", () => {
    expect(legendeVisible(bandeApercuMobile(ECRAN, false, VH.half))).toBe(true)
    expect(legendeVisible(bandeApercuMobile(ECRAN, true, VH.full))).toBe(false)
  })
})

// Ratios RÉELS du catalogue (catalog.ts) — pas des valeurs inventées.
const RATIOS: [string, number][] = [
  ["sticker rond", 1], ["chevalet", 100 / 70], ["panneau wifi", 105 / 148],
  ["carte portrait", 55 / 85], ["carte de visite", 85 / 55], ["flyer A5", 148 / 210],
  ["affiche A3", 297 / 420], ["marque-page", 55 / 160], ["porte-menu A4", 210 / 297],
  ["etiquette", 60 / 90], ["roll-up", 850 / 2000], ["affiche A2", 420 / 594],
]

describe("dimensionsApercuMobile", () => {
  it("aucun support du catalogue ne descend sous la largeur qui casse le rendu", () => {
    // Le roll-up (ratio 0,42) tombait à ~87 px de large dans une bande courte :
    // le moteur de QR levait « The canvas is too small » et la page partait en erreur.
    for (const [nom, r] of RATIOS) {
      for (const vh of [40, 66, 90]) {
        const { w } = dimensionsApercuMobile(bandeApercuMobile(ECRAN, true, vh), LARGEUR, r)
        expect(`${nom}@${vh}: ${w}`).toBe(`${nom}@${vh}: ${w}`)
        expect(w).toBeGreaterThanOrEqual(Math.min(LARGEUR - 24, LARGEUR_MINIMALE_SUPPORT))
      }
    }
  })

  it("aucun support ne dépasse jamais la largeur de l'écran", () => {
    for (const [, r] of RATIOS) {
      for (const ouverte of [false, true]) {
        const { w } = dimensionsApercuMobile(bandeApercuMobile(ECRAN, ouverte, 66), LARGEUR, r)
        expect(w).toBeLessThanOrEqual(LARGEUR - 24)
      }
    }
  })

  it("le ratio est respecté", () => {
    for (const [, r] of RATIOS) {
      const { w, h } = dimensionsApercuMobile(bandeApercuMobile(ECRAN, false, 66), LARGEUR, r)
      expect(w / h).toBeCloseTo(r, 1)
    }
  })

  it("signale le débordement quand la bande est trop courte pour le plancher", () => {
    const court = dimensionsApercuMobile(bandeApercuMobile(ECRAN, true, 90), LARGEUR, 850 / 2000)
    expect(court.deborde).toBe(true)
    const large = dimensionsApercuMobile(bandeApercuMobile(ECRAN, false, 66), LARGEUR, 1)
    expect(large.deborde).toBe(false)
  })

  it("un ratio absurde ne produit ni NaN ni zéro", () => {
    for (const r of [0, -1, NaN, Infinity]) {
      const { w, h } = dimensionsApercuMobile(400, LARGEUR, r as number)
      expect(Number.isFinite(w) && w > 0).toBe(true)
      expect(Number.isFinite(h) && h > 0).toBe(true)
    }
  })
})

describe("vhFeuilleMax — la feuille ne mange pas le support", () => {
  it("un support très portrait fait descendre le plafond de la feuille", () => {
    const rollup = vhFeuilleMax(ECRAN, LARGEUR, 850 / 2000)
    const rond = vhFeuilleMax(ECRAN, LARGEUR, 1)
    expect(rollup).toBeLessThan(rond)
    expect(rollup).toBeLessThan(66)   // « half » serait déjà trop haut
  })

  it("un support rond ou paysage laisse une feuille généreuse", () => {
    // Pas 90 % : à 90 % la bande ne ferait plus que ~32 px, le support serait
    // rogné lui aussi. Le plafond, c'est « aussi haut que possible SANS cacher
    // le support » — la règle est la même pour tous, seul le chiffre change.
    expect(vhFeuilleMax(ECRAN, LARGEUR, 1)).toBeGreaterThanOrEqual(60)
    expect(vhFeuilleMax(ECRAN, LARGEUR, 85 / 55)).toBeGreaterThanOrEqual(60)
    expect(vhFeuilleMax(ECRAN, LARGEUR, 1)).toBeLessThanOrEqual(VH_FEUILLE_MAXIMALE)
  })

  it("le plafond laisse toujours de quoi régler (au moins un tiers d'écran)", () => {
    for (const [, r] of RATIOS) expect(vhFeuilleMax(ECRAN, LARGEUR, r)).toBeGreaterThanOrEqual(VH_FEUILLE_MINIMALE)
  })

  it("la feuille reste utilisable, même pour un support extrême", () => {
    for (const r of [0.1, 0.2, 850 / 2000]) {
      expect(vhFeuilleMax(ECRAN, LARGEUR, r)).toBeGreaterThanOrEqual(VH_FEUILLE_MINIMALE)
    }
  })

  it("sous ce plafond, aucun support du catalogue n'est rogné — sauf les plus élancés", () => {
    // La garantie : à la hauteur de feuille réellement appliquée, le support tient
    // en entier. Elle ne peut PAS tenir pour un support plus haut que ~3:1 (le
    // marque-page, 55 × 160) : même feuille au minimum utilisable, un téléphone
    // n'a pas la hauteur. On ne fait pas semblant — on borne le dégât.
    const rognes: string[] = []
    for (const [nom, r] of RATIOS) {
      for (const pos of [40, 66, 90]) {
        const vh = Math.min(pos, vhFeuilleMax(ECRAN, LARGEUR, r))
        const bande = bandeApercuMobile(ECRAN, true, vh)
        const { h, deborde } = dimensionsApercuMobile(bande, LARGEUR, r)
        if (deborde) {
          rognes.push(nom)
          // Rogné, mais légèrement : jamais la moitié du support comme avant.
          expect(h / bande).toBeLessThan(1.2)
        }
      }
    }
    // Un seul support concerné, et c'est le plus élancé du catalogue.
    expect([...new Set(rognes)]).toEqual(["marque-page"])
  })

  it("le roll-up — le cas qui plantait — tient désormais en entier", () => {
    const r = 850 / 2000
    for (const pos of [40, 66, 90]) {
      const vh = Math.min(pos, vhFeuilleMax(ECRAN, LARGEUR, r))
      const { w, deborde } = dimensionsApercuMobile(bandeApercuMobile(ECRAN, true, vh), LARGEUR, r)
      expect(deborde).toBe(false)
      expect(w).toBeGreaterThanOrEqual(LARGEUR_MINIMALE_SUPPORT)
    }
  })

  it("écran ou ratio absurde -> valeur exploitable", () => {
    for (const [h, r] of [[0, 1], [NaN, 1], [ECRAN, 0], [ECRAN, NaN]] as [number, number][]) {
      const v = vhFeuilleMax(h, LARGEUR, r)
      expect(Number.isFinite(v)).toBe(true)
      expect(v).toBeGreaterThanOrEqual(VH_FEUILLE_MINIMALE)
      expect(v).toBeLessThanOrEqual(VH_FEUILLE_MAXIMALE)
    }
  })
})

describe("paysage : les réglages passent sur le côté", () => {
  it("un téléphone couché est détecté", () => {
    expect(estPaysage(844, 390)).toBe(true)
    expect(estPaysage(390, 844)).toBe(false)
    expect(estPaysage(NaN, 390)).toBe(false)
  })

  it("couché, la feuille ne retire AUCUNE hauteur à l'aperçu", () => {
    // Ancrée en bas sur 390 px de haut, elle ne pouvait monter qu'à ~148 px dont
    // la barre d'action en masquait 117 : aucun réglage n'était atteignable.
    const ouverte = bandeApercuMobile(390, true, 66, true)
    const fermee = bandeApercuMobile(390, false, 66, true)
    expect(ouverte).toBe(fermee)
    expect(ouverte).toBe(390 - HAUT_BARRE_PAYSAGE - HAUT_ENTETE_MOBILE - MARGE_SECURITE)
  })

  it("le tiroir rogne la LARGEUR, et seulement quand il est ouvert", () => {
    expect(largeurApercuMobile(844, true, false)).toBe(844)
    expect(largeurApercuMobile(844, true, true)).toBe(844 - largeurTiroirPaysage(844))
    expect(largeurApercuMobile(844, false, true)).toBe(844)
  })

  it("le tiroir laisse toujours de la place à l'aperçu", () => {
    for (const l of [640, 844, 1024, 300]) {
      expect(largeurApercuMobile(l, true, true)).toBeGreaterThanOrEqual(200)
      expect(largeurTiroirPaysage(l)).toBeLessThan(l)
    }
  })

  it("couché, un support rond tient encore en entier à côté du tiroir", () => {
    const bande = bandeApercuMobile(844, true, 66, true)
    const { deborde } = dimensionsApercuMobile(bande, largeurApercuMobile(844, true, true), 1)
    expect(deborde).toBe(false)
  })
})
