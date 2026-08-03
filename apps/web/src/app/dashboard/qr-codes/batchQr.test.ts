import { describe, it, expect } from "vitest"
import { parseBatchInput, batchFilenames } from "./batchQr"

describe("parseBatchInput", () => {
  it("ligne simple -> étiquette = valeur", () => {
    const { rows } = parseBatchInput("https://a.com\nhttps://b.com")
    expect(rows).toEqual([
      { value: "https://a.com", label: "https://a.com" },
      { value: "https://b.com", label: "https://b.com" },
    ])
  })

  it("séparateur virgule / point-virgule / tab -> valeur + étiquette", () => {
    expect(parseBatchInput("https://a.com,Table 1").rows[0]).toEqual({ value: "https://a.com", label: "Table 1" })
    expect(parseBatchInput("https://a.com;Table 2").rows[0]).toEqual({ value: "https://a.com", label: "Table 2" })
    expect(parseBatchInput("https://a.com\tTable 3").rows[0]).toEqual({ value: "https://a.com", label: "Table 3" })
  })

  it("split sur le PREMIER séparateur seulement", () => {
    expect(parseBatchInput("val,a,b").rows[0]).toEqual({ value: "val", label: "a,b" })
  })

  it("ignore les lignes vides et rogne les espaces", () => {
    const { rows } = parseBatchInput("  \n  https://a.com  \n\n  ,ignore-sans-valeur\n")
    expect(rows).toEqual([{ value: "https://a.com", label: "https://a.com" }])
  })

  it("borne à `max` et signale la troncature", () => {
    const input = Array.from({ length: 5 }, (_, i) => `https://x.com/${i}`).join("\n")
    const r = parseBatchInput(input, 3)
    expect(r.rows).toHaveLength(3)
    expect(r.truncated).toBe(true)
    expect(parseBatchInput(input, 10).truncated).toBe(false)
  })
})

describe("batchFilenames", () => {
  it("slug de l'étiquette + extension", () => {
    const rows = [{ value: "x", label: "Table 1" }, { value: "y", label: "Menu du Jour" }]
    expect(batchFilenames(rows, "png")).toEqual(["table-1.png", "menu-du-jour.png"])
  })

  it("dédoublonne les noms en collision (-2, -3…)", () => {
    const rows = [{ value: "a", label: "Table" }, { value: "b", label: "Table" }, { value: "c", label: "Table" }]
    expect(batchFilenames(rows, "svg")).toEqual(["table.svg", "table-2.svg", "table-3.svg"])
  })

  it("repli qr-N si l'étiquette ne donne aucun slug", () => {
    const rows = [{ value: "a", label: "///" }, { value: "b", label: "" }]
    expect(batchFilenames(rows, "png")).toEqual(["qr-1.png", "qr-2.png"])
  })

  it("noms uniques même si un slug entre en collision avec un dédoublonnage", () => {
    const rows = [{ value: "a", label: "Table" }, { value: "b", label: "Table" }, { value: "c", label: "Table 2" }]
    const names = batchFilenames(rows, "png")
    expect(new Set(names).size).toBe(3)
  })
})
