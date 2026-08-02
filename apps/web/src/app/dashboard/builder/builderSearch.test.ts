import { describe, it, expect } from "vitest"
import { scoreBlock, BLOCK_SYNONYMS } from "./builderSearch"

const def = (label: string, description = "", category = "actions") => ({ label, description, category })

describe("scoreBlock", () => {
  it("requête vide -> 0", () => {
    expect(scoreBlock("cta_button", def("Bouton CTA"), "")).toBe(0)
    expect(scoreBlock("cta_button", def("Bouton CTA"), "   ")).toBe(0)
  })

  it("barème par champ, du plus fort au plus faible", () => {
    expect(scoreBlock("x", def("Menu"), "menu")).toBe(100)              // label exact
    expect(scoreBlock("x", def("Menu resto"), "menu")).toBe(90)         // préfixe
    expect(scoreBlock("x", def("Grand Menu"), "menu")).toBe(80)         // inclus
    expect(scoreBlock("x", def("Carte", "un menu du jour"), "menu")).toBe(60) // description
    expect(scoreBlock("menu_block", def("Carte", "rien"), "menu")).toBe(50)   // type
    expect(scoreBlock("x", def("Carte", "rien", "menu"), "menu")).toBe(40)    // catégorie
  })

  it("insensible à la casse et aux espaces", () => {
    expect(scoreBlock("x", def("Menu"), "  MENU ")).toBe(100)
  })

  it("synonymes : la requête trouve un bloc via un alias (label puis description)", () => {
    // "spotify" est un alias de "musique" -> matche un label "Musique" (pas d'inclusion directe).
    expect(scoreBlock("x", def("Musique"), "spotify")).toBe(35)
    // alias -> description : "album" est un alias de "musique", trouvé dans la description.
    expect(scoreBlock("x", def("Écoute", "mon dernier album"), "spotify")).toBe(25)
  })

  it("aucun match -> 0", () => {
    expect(scoreBlock("x", def("Bio", "présentation", "identity"), "zzz")).toBe(0)
  })

  it("le dictionnaire de synonymes est non vide", () => {
    expect(Object.keys(BLOCK_SYNONYMS).length).toBeGreaterThan(10)
  })
})
