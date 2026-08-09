import { describe, it, expect } from "vitest"
import { parseMenuPaste } from "./menuImport"

describe("parseMenuPaste — import tableur du menu", () => {
  it("colle depuis un tableur (tabulations) : nom / prix / description", () => {
    const txt = "Margherita\t11€\tTomate, mozzarella\nRegina\t13€\tJambon, champignons"
    expect(parseMenuPaste(txt)).toEqual([
      { name: "Margherita", price: "11€", desc: "Tomate, mozzarella", category: "" },
      { name: "Regina", price: "13€", desc: "Jambon, champignons", category: "" },
    ])
  })
  it("saute une ligne d'en-têtes", () => {
    const txt = "Nom\tPrix\tDescription\nCafé\t2€\tArabica"
    const r = parseMenuPaste(txt)
    expect(r).toHaveLength(1)
    expect(r[0]).toEqual({ name: "Café", price: "2€", desc: "Arabica", category: "" })
  })
  it("CSV point-virgule (Excel FR) + colonne catégorie", () => {
    expect(parseMenuPaste("Tiramisu;6,50€;Maison;Desserts")).toEqual([
      { name: "Tiramisu", price: "6,50€", desc: "Maison", category: "Desserts" },
    ])
  })
  it("CSV virgule", () => {
    expect(parseMenuPaste("Salade,8€")).toEqual([{ name: "Salade", price: "8€", desc: "", category: "" }])
  })
  it("mono-colonne « Nom 12€ » → nom + prix séparés", () => {
    expect(parseMenuPaste("Pizza Reine 14€")).toEqual([{ name: "Pizza Reine", price: "14€", desc: "", category: "" }])
    expect(parseMenuPaste("Pizza Reine — 14 EUR")).toEqual([{ name: "Pizza Reine", price: "14 EUR", desc: "", category: "" }])
  })
  it("mono-colonne sans prix → juste le nom", () => {
    expect(parseMenuPaste("Plat du jour")).toEqual([{ name: "Plat du jour", price: "", desc: "", category: "" }])
  })
  it("ignore les lignes vides et les lignes sans nom", () => {
    expect(parseMenuPaste("\n\nCafé\t2€\n\n")).toEqual([{ name: "Café", price: "2€", desc: "", category: "" }])
    expect(parseMenuPaste("\t5€\tsans nom")).toEqual([]) // pas de nom → ignorée
  })
  it("respecte le plafond max", () => {
    const many = Array.from({ length: 60 }, (_, i) => `Plat ${i}\t${i}€`).join("\n")
    expect(parseMenuPaste(many, 50)).toHaveLength(50)
  })
  it("tableau markdown de ChatGPT (pipes + ligne de séparation + en-tête)", () => {
    const md = [
      "| Nom | Prix | Description |",
      "| --- | --- | --- |",
      "| Margherita | 11€ | Tomate, mozzarella |",
      "| Regina | 13€ | Jambon, champignons |",
    ].join("\n")
    expect(parseMenuPaste(md)).toEqual([
      { name: "Margherita", price: "11€", desc: "Tomate, mozzarella", category: "" },
      { name: "Regina", price: "13€", desc: "Jambon, champignons", category: "" },
    ])
  })
  it("entrée vide / non-string → []", () => {
    expect(parseMenuPaste("")).toEqual([])
    expect(parseMenuPaste(undefined as any)).toEqual([])
  })
  it("ne confond pas une vraie ligne de données avec un en-tête (chiffres présents)", () => {
    // « Prix » présent mais la ligne a un chiffre → pas un en-tête
    const r = parseMenuPaste("Menu Prix Fixe\t25€")
    expect(r).toEqual([{ name: "Menu Prix Fixe", price: "25€", desc: "", category: "" }])
  })
})
