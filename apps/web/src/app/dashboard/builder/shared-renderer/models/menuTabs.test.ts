import { describe, it, expect } from "vitest"
import { menuTabsViewModel } from "./menuTabs"

describe("menuTabsViewModel — grande carte à onglets", () => {
  it("vide → non visible", () => {
    expect(menuTabsViewModel({}).visible).toBe(false)
    expect(menuTabsViewModel({}).sections).toEqual([])
  })
  it("sections parsées depuis le texte collé (index conservé)", () => {
    const vm = menuTabsViewModel({
      sec1_title: "Cocktails",
      sec1_items: "Mojito;10€;Menthe, citron\nPina Colada;10€;Ananas, coco",
      sec2_title: "Soft",
      sec2_items: "Coca;4€\nPerrier;3€",
    })
    expect(vm.visible).toBe(true)
    expect(vm.sections.map(s => s.title)).toEqual(["Cocktails", "Soft"])
    expect(vm.sections[0].items).toHaveLength(2)
    expect(vm.sections[0].items[0]).toEqual({ name: "Mojito", price: "10€", desc: "Menthe, citron", category: "" })
    expect(vm.sections[1].items.map(i => i.name)).toEqual(["Coca", "Perrier"])
  })
  it("section avec titre mais sans produits reste visible ; trous ignorés", () => {
    const vm = menuTabsViewModel({ sec1_title: "Bientôt", sec3_title: "Bière", sec3_items: "Blonde;5€" })
    expect(vm.sections.map(s => s.i)).toEqual([1, 3])
    expect(vm.sections[0].items).toEqual([])
  })
  it("réglages taille de texte + densité", () => {
    expect(menuTabsViewModel({ sec1_title: "x", text_size: "Compact" }).textScale).toBeCloseTo(0.86)
    expect(menuTabsViewModel({ sec1_title: "x", text_size: "Grand" }).textScale).toBeCloseTo(1.16)
    expect(menuTabsViewModel({ sec1_title: "x" }).textScale).toBe(1) // défaut
    expect(menuTabsViewModel({ sec1_title: "x", row_density: "Serré" }).rowPad).toBe(6)
    expect(menuTabsViewModel({ sec1_title: "x", row_density: "Aéré" }).rowPad).toBe(16)
  })
  it("colonnes internes (1 par défaut, 2 si demandé)", () => {
    expect(menuTabsViewModel({ sec1_title: "x" }).columns).toBe(1)
    expect(menuTabsViewModel({ sec1_title: "x", item_columns: "2 colonnes" }).columns).toBe(2)
  })
  it("repliable + total de produits", () => {
    const vm = menuTabsViewModel({ sec1_title: "A", sec1_items: "x;1€\ny;2€", sec2_title: "B", sec2_items: "z;3€", menu_collapsible: "Oui" })
    expect(vm.collapsible).toBe(true)
    expect(vm.totalItems).toBe(3)
    expect(menuTabsViewModel({ sec1_title: "A" }).collapsible).toBe(false) // défaut non
  })
})
