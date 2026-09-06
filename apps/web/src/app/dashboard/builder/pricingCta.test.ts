import { describe, it, expect } from "vitest"
import { readFileSync } from "node:fs"
import { fileURLToPath } from "node:url"
import { pricingCtaModel } from "./pricingCta"

// Parité par CONSTRUCTION : éditeur ET public doivent décider le CTA via le même modèle.
describe("parité pricing CTA — même source de décision dans les deux renderers", () => {
  const read = (rel: string) => readFileSync(fileURLToPath(new URL(rel, import.meta.url)), "utf8")
  it("l'aperçu éditeur consomme pricingCtaModel", () => {
    expect(read("./builderPreview.tsx").includes("pricingCtaModel(")).toBe(true)
  })
  it("le rendu public consomme pricingCtaModel", () => {
    expect(read("../../[slug]/renduLegacy.tsx").includes("pricingCtaModel(")).toBe(true)
  })
})

describe("pricingCtaModel — règle de présence (parité éditeur/public)", () => {
  it("1. libellé + URL valide → visible", () => {
    const m = pricingCtaModel({ cta_label: "Choisir", cta_url: "https://ex.com/pay" })
    expect(m).toEqual({ visible: true, label: "Choisir", href: "https://ex.com/pay", external: true })
  })
  it("2. libellé sans URL → visible, href null (bouton non navigable, comme le public → '#')", () => {
    expect(pricingCtaModel({ cta_label: "Choisir" })).toEqual({ visible: true, label: "Choisir", href: null, external: false })
  })
  it("3. URL sans libellé → invisible (le public gate sur cta_label)", () => {
    expect(pricingCtaModel({ cta_url: "https://ex.com" })).toEqual({ visible: false })
  })
  it("4. aucun CTA → invisible", () => {
    expect(pricingCtaModel({})).toEqual({ visible: false })
    expect(pricingCtaModel(undefined)).toEqual({ visible: false })
  })
  it("5. libellé fidèle (non tronqué, non modifié)", () => {
    const long = "Réserver ma place dès maintenant pour l'offre de lancement limitée"
    expect((pricingCtaModel({ cta_label: long }) as any).label).toBe(long)
  })
})

describe("pricingCtaModel — sécurité de l'URL (extHref réutilisé)", () => {
  it("6. URL vide → href null", () => {
    expect((pricingCtaModel({ cta_label: "X", cta_url: "" }) as any).href).toBeNull()
    expect((pricingCtaModel({ cta_label: "X", cta_url: "   " }) as any).href).toBeNull()
  })
  it("7. URL externe sans protocole → préfixée https, external true", () => {
    const m = pricingCtaModel({ cta_label: "X", cta_url: "ex.com/pay" }) as any
    expect(m.href).toBe("https://ex.com/pay"); expect(m.external).toBe(true)
  })
  it("8. URL interne (/tarifs) → conservée, external false", () => {
    const m = pricingCtaModel({ cta_label: "X", cta_url: "/tarifs" }) as any
    expect(m.href).toBe("/tarifs"); expect(m.external).toBe(false)
  })
  it("9. mailto: conservé, external false", () => {
    const m = pricingCtaModel({ cta_label: "X", cta_url: "mailto:a@b.com" }) as any
    expect(m.href).toBe("mailto:a@b.com"); expect(m.external).toBe(false)
  })
  it("10. tel: conservé, external false", () => {
    const m = pricingCtaModel({ cta_label: "X", cta_url: "tel:+33600000000" }) as any
    expect(m.href).toBe("tel:+33600000000"); expect(m.external).toBe(false)
  })
  it("11. javascript: neutralisé (jamais de schéma exécutable dans href)", () => {
    const m = pricingCtaModel({ cta_label: "X", cta_url: "javascript:alert(1)" }) as any
    expect(m.href.startsWith("javascript:")).toBe(false)
    expect(m.href).toBe("https://javascript:alert(1)")
  })
  it("12. href '#' seul → traité comme absence (href null → '#' au rendu)", () => {
    expect((pricingCtaModel({ cta_label: "X", cta_url: "#" }) as any).href).toBeNull()
  })
})
