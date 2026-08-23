import { describe, it, expect } from "vitest"
import { detectMetier, detectObjectif, printHandoff, printStudioUrl } from "./handoff"
import { METIERS, OBJECTIFS, ITEM_BY_ID } from "./catalog"

const b = (type: string, content: Record<string, any> = {}) => ({ type, content })

describe("handoff — détection du métier", () => {
  it("reconnaît un restaurant depuis un bloc menu", () => {
    expect(detectMetier([b("menu_section", { title: "Nos plats" })])).toBe("Restaurant")
  })
  it("affine restaurant → bar sur le vocabulaire", () => {
    expect(detectMetier([b("menu_section", { title: "Nos cocktails signature" })])).toBe("Bar")
  })
  it("affine restaurant → boulangerie", () => {
    expect(detectMetier([b("menu_tabs", { t1: "Viennoiserie au levain" })])).toBe("Boulangerie")
  })
  it("reconnaît un coiffeur sans bloc dédié", () => {
    expect(detectMetier([b("bio", { text: "Salon de coiffure, balayage et barbier" })])).toBe("Coiffeur")
  })
  it("reconnaît un artisan depuis service_area", () => {
    expect(detectMetier([b("service_area", { city: "Reims" })])).toBe("Artisan")
  })
  it("reconnaît une boutique depuis un catalogue produit", () => {
    expect(detectMetier([b("product_catalog", {})])).toBe("Boutique")
  })
  it("retombe sur « Tout » quand rien n'est probant", () => {
    expect(detectMetier([b("bio", { text: "Bienvenue" })])).toBe("Tout")
  })
  it("ignore les URLs et data: dans le corpus", () => {
    expect(detectMetier([b("image", { url: "data:image/png;base64,coiffeur" })])).toBe("Tout")
  })
  it("ne renvoie que des valeurs connues du catalogue", () => {
    const cases = [[b("menu_section")], [b("event_info")], [b("opening_hours")], [b("product")], [b("service_area")]]
    for (const c of cases) expect(METIERS).toContain(detectMetier(c))
  })
})

describe("handoff — détection de l'usage", () => {
  it("menu avant tout le reste", () => {
    expect(detectObjectif([b("opening_hours"), b("menu_section")])).toBe("Menu")
  })
  it("réservation", () => { expect(detectObjectif([b("table_booking")])).toBe("Réservation") })
  it("avis", () => { expect(detectObjectif([b("google_review")])).toBe("Avis") })
  it("ne renvoie que des valeurs connues du catalogue", () => {
    const cases = [[b("menu_section")], [b("calendly")], [b("order_online")], [b("social_links")], [b("contact_form")], [b("bio")]]
    for (const c of cases) expect(OBJECTIFS).toContain(detectObjectif(c))
  })
})

describe("handoff — passage au studio", () => {
  it("remplit nom, message et appel à l'action", () => {
    const h = printHandoff({ title: "Café Lune", blocks: [b("menu_section")] })
    expect(h.metier).toBe("Restaurant")
    expect(h.objectif).toBe("Menu")
    expect(h.brand).toBe("Café Lune")
    expect(h.message).toBe("Notre carte")
    expect(h.cta).toContain("Scannez")
  })
  it("prend le nom du profil si la page n'a pas de titre", () => {
    const h = printHandoff({ title: "", blocks: [b("profile", { name: "Maison Petit" })] })
    expect(h.brand).toBe("Maison Petit")
  })
  it("propose toujours 3 supports", () => {
    for (const m of METIERS) {
      const h = printHandoff({ title: m, blocks: [] })
      expect(h.suggested.length).toBe(3)
    }
  })
  it("tous les supports conseillés existent au catalogue, avec le bon libellé", () => {
    const seen = new Set<string>()
    const collect = (h: ReturnType<typeof printHandoff>) => h.suggested.forEach(s => seen.add(`${s.id}|${s.label}`))
    collect(printHandoff({ title: "", blocks: [] }))
    for (const t of ["menu_section", "before_after", "service_area", "product", "event_info", "opening_hours"]) {
      collect(printHandoff({ title: "", blocks: [b(t)] }))
    }
    collect(printHandoff({ title: "", blocks: [b("bio", { text: "cocktail happy hour" }), b("menu_section")] }))
    collect(printHandoff({ title: "", blocks: [b("bio", { text: "bouquet fleuriste" })] }))
    collect(printHandoff({ title: "", blocks: [b("bio", { text: "hôtel séjour nuitée" })] }))
    collect(printHandoff({ title: "", blocks: [b("bio", { text: "tatouage tatoueur" })] }))
    expect(seen.size).toBeGreaterThan(4)
    for (const k of seen) {
      const [id, label] = k.split("|")
      expect(ITEM_BY_ID[id], `objet ${id} absent du catalogue`).toBeTruthy()
      expect(ITEM_BY_ID[id].name).toBe(label)
    }
  })
  it("l'adresse du studio porte tous les paramètres", () => {
    const h = printHandoff({ title: "Café Lune", blocks: [b("menu_section")] })
    const u = new URLSearchParams(printStudioUrl("abc123", h, "i2").split("?")[1])
    expect(u.get("qr")).toBe("abc123")
    expect(u.get("metier")).toBe("Restaurant")
    expect(u.get("objectif")).toBe("Menu")
    expect(u.get("brand")).toBe("Café Lune")
    expect(u.get("item")).toBe("i2")
  })
  it("n'écrit pas les filtres neutres", () => {
    const h = printHandoff({ title: "", blocks: [] })
    const u = new URLSearchParams(printStudioUrl("x", h).split("?")[1])
    expect(u.get("metier")).toBeNull()
    expect(u.get("objectif")).toBeNull()
    expect(u.get("item")).toBeNull()
  })
})
