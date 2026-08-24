import { describe, it, expect } from "vitest"
import { readFileSync } from "node:fs"
import { join } from "node:path"
import { watermarkGeometry, hidesFinderCore, RIBBON_RATIO, TEXT_MIN_SIZE } from "./qrWatermark"

const read = (p: string) => readFileSync(join(__dirname, p), "utf8")

// Tailles réellement utilisées dans l'application (générateur, outil QR, vignette).
const TAILLES = [196, 210, 58]
// Nombres de modules d'une version 1 à une version 40 : 21, 25, 29 … 177.
const MODULES = Array.from({ length: 40 }, (_, i) => 21 + i * 4)

describe("géométrie du ruban", () => {
  it("le ruban couvre le cœur des yeux de détection, à toutes les versions", () => {
    // C'est LA garantie du filigrane : sans ces deux yeux, aucun lecteur ne cadre
    // le symbole, et la correction d'erreur n'y peut rien (elle répare des données,
    // pas un repérage). Vérifié empiriquement en plus : 32 combinaisons
    // version × correction × zoom, zbar et OpenCV, aucune lecture.
    const ratés: string[] = []
    for (const s of TAILLES) for (const m of MODULES) {
      if (!hidesFinderCore(s, m)) ratés.push(`${s}px / ${m} modules`)
    }
    expect(ratés, "cas où le ruban laisse un œil lisible").toEqual([])
  })

  it("garde une marge : moitié du ruban suffirait encore", () => {
    // Sous 0,10 le filigrane laisse passer des lectures (mesuré). On est à 0,30.
    expect(RIBBON_RATIO).toBeGreaterThanOrEqual(0.2)
    for (const m of MODULES) {
      expect(hidesFinderCore(196, m) && hidesFinderCore(196 / 2, m)).toBe(true)
    }
  })

  it("la hauteur suit la taille du QR", () => {
    expect(watermarkGeometry(200).band).toBe(Math.round(200 * RIBBON_RATIO))
    expect(watermarkGeometry(100).band).toBe(Math.round(100 * RIBBON_RATIO))
    expect(watermarkGeometry(200).half).toBe(watermarkGeometry(200).band / 2)
    // La proportion est la même à toutes les tailles : le ruban ne devient pas
    // envahissant sur un grand aperçu ni invisible sur une vignette.
    expect(watermarkGeometry(400).band).toBe(watermarkGeometry(200).band * 2)
  })

  it("une vignette minuscule n'affiche pas de texte illisible", () => {
    expect(watermarkGeometry(58).withText).toBe(false)
    expect(watermarkGeometry(58).fontSize).toBe(0)
    expect(watermarkGeometry(TEXT_MIN_SIZE).withText).toBe(true)
  })

  it("le texte reste dans une fourchette lisible", () => {
    for (const s of [110, 196, 210, 400, 1000]) {
      const g = watermarkGeometry(s)
      expect(g.fontSize).toBeGreaterThanOrEqual(9)
      expect(g.fontSize).toBeLessThanOrEqual(14)
    }
  })

  it("une taille absurde ne casse rien", () => {
    for (const s of [0, -50, NaN as unknown as number]) {
      const g = watermarkGeometry(s)
      expect(g.side).toBe(24)
      expect(g.band).toBeGreaterThan(0)
    }
  })
})

describe("ce que le filigrane ne fait PLUS", () => {
  const src = read("QrWatermark.tsx")

  it("ne floute plus le QR", () => {
    // L'ancien filigrane passait un backdrop-filter sur tout le cadre : couleurs,
    // forme des modules et logo devenaient invisibles — c'est-à-dire tout ce que
    // la personne vient de régler.
    expect(src).not.toMatch(/backdropFilter|WebkitBackdropFilter|blur\(/)
  })

  it("ne pose plus de voile blanc sur toute la surface", () => {
    expect(src).not.toMatch(/rgba\(255,\s*255,\s*255,\s*0\.\d+\)/)
  })

  it("ne répète plus le nom en pavage", () => {
    expect(src).not.toMatch(/\.repeat\(|Array\.from\(\{ length: rows/)
  })

  it("pose un seul ruban, sur la diagonale bas-gauche → haut-droite", () => {
    expect(src).toContain("rotate(-45deg)")
    expect((src.match(/rotate\(/g) || []).length).toBe(1)
  })

  it("laisse passer les clics et reste hors du champ des lecteurs d'écran", () => {
    expect(src).toContain("pointerEvents: \"none\"")
    expect(src).toContain("aria-hidden")
  })
})

describe("là où le filigrane est posé", () => {
  it("les trois usages l'enveloppent bien dans un conteneur positionné", () => {
    const sources = [
      read("../app/generateur-qr-code/GeneratorClient.tsx"),
      read("../app/dashboard/qr-link/page.tsx"),
    ]
    for (const s of sources) {
      expect(s).toContain("QrWatermark")
      // Le ruban est en position absolue : sans conteneur relatif il se placerait
      // par rapport à la page entière.
      expect(s).toContain("position: \"relative\", lineHeight: 0")
    }
  })

  it("le fichier téléchargé, lui, n'a jamais de filigrane", () => {
    const render = read("../app/dashboard/qr-codes/qrRender.ts")
    expect(render).not.toContain("QrWatermark")
    expect(render).not.toContain("Watermark")
  })
})
