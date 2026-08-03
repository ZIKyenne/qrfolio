import { describe, it, expect } from "vitest"
import { impositionLayout } from "./impositionLayout"

// A4 = 210×297 mm.
const A4 = { pageW: 210, pageH: 297 }

describe("impositionLayout", () => {
  it("calcule colonnes/lignes/perPage sur A4 (cell 40, marge 10, gouttière 5)", () => {
    const l = impositionLayout({ count: 100, ...A4, cell: 40, margin: 10, gutter: 5 })
    // usableW=190 -> floor((190+5)/45)=4 ; usableH=277 -> floor((277+5)/45)=6
    expect(l.cols).toBe(4)
    expect(l.rows).toBe(6)
    expect(l.perPage).toBe(24)
    expect(l.pages).toBe(Math.ceil(100 / 24)) // 5
  })

  it("place les cellules en grille, ligne par ligne, dans les bornes de la page", () => {
    const l = impositionLayout({ count: 5, ...A4, cell: 40, margin: 10, gutter: 5 })
    expect(l.cells).toHaveLength(5)
    // 1re cellule en haut-gauche, 5e sur la 2e ligne (cols=4).
    expect(l.cells[0]).toMatchObject({ page: 0, col: 0, row: 0 })
    expect(l.cells[4]).toMatchObject({ page: 0, col: 0, row: 1 })
    for (const c of l.cells) {
      expect(c.x).toBeGreaterThanOrEqual(10)
      expect(c.y).toBeGreaterThanOrEqual(10)
      expect(c.x + l.cellSize).toBeLessThanOrEqual(200) // pageW - margin
      expect(c.y + l.cellSize).toBeLessThanOrEqual(287) // pageH - margin
    }
  })

  it("répartit sur plusieurs pages", () => {
    const l = impositionLayout({ count: 30, ...A4, cell: 40, margin: 10, gutter: 5 })
    expect(l.pages).toBe(2)
    expect(l.cells[23].page).toBe(0)
    expect(l.cells[24].page).toBe(1)
    expect(l.cells[24]).toMatchObject({ col: 0, row: 0 }) // 1re cellule de la page 2
  })

  it("grille centrée : décalage horizontal symétrique", () => {
    const l = impositionLayout({ count: 1, ...A4, cell: 40, margin: 10, gutter: 5 })
    const gridW = l.cols * 40 + (l.cols - 1) * 5 // 4*40+3*5=175
    const expectedOffX = 10 + (190 - gridW) / 2  // 10 + 7.5 = 17.5
    expect(l.cells[0].x).toBeCloseTo(expectedOffX, 5)
  })

  it("count 0 -> aucune cellule, une page potentielle nulle", () => {
    const l = impositionLayout({ count: 0, ...A4, cell: 40, margin: 10, gutter: 5 })
    expect(l.cells).toHaveLength(0)
    expect(l.pages).toBe(0)
    expect(l.perPage).toBe(24)
  })
})
