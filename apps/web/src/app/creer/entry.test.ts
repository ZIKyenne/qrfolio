import { describe, it, expect } from "vitest"
import { readFileSync } from "node:fs"
import { join } from "node:path"
import { METIER_BY_USAGE, SECTEURS, SECTEUR_LABEL, safeMetier, creerUrl } from "./entry"
import { VERTICAL_ORDER } from "../qr-code/verticals"

const read = (p: string) => readFileSync(join(__dirname, p), "utf8")

describe("correspondance usage SEO → secteur", () => {
  it("chaque usage cartographié existe vraiment côté SEO", () => {
    const inconnus = Object.keys(METIER_BY_USAGE).filter(u => !VERTICAL_ORDER.includes(u as any))
    expect(inconnus, "usages qui ne correspondent à aucune page").toEqual([])
  })

  it("chaque secteur visé existe vraiment dans la galerie", () => {
    const galerie = read("../dashboard/templates/page.tsx")
    for (const m of Object.values(METIER_BY_USAGE)) {
      expect(SECTEURS, `${m} n'est pas un secteur connu`).toContain(m)
      expect(galerie, `${m} absent de la galerie`).toContain(`id: "${m}"`)
    }
  })

  it("la liste des secteurs est celle de la galerie, à l'identique", () => {
    const galerie = read("../dashboard/templates/page.tsx")
    const bloc = galerie.slice(galerie.indexOf("const BUSINESS_CATEGORIES"))
    const ids = [...bloc.slice(0, bloc.indexOf("\n]")).matchAll(/id: "([^"]+)"/g)].map(m => m[1])
    expect(ids).toEqual([...SECTEURS])
  })

  it("chaque secteur a un libellé lisible pour le bandeau", () => {
    const sans = SECTEURS.filter(s => s !== "Tous" && !SECTEUR_LABEL[s])
    expect(sans).toEqual([])
  })

  it("les usages transversaux ne sont volontairement PAS filtrés", () => {
    // Wi-Fi, PDF, SMS, paiement : rien n'y indique le métier de la personne.
    // Filtrer au hasard masquerait 40 modèles sur 48.
    for (const u of ["wifi", "pdf", "sms", "paiement", "avis-google", "whatsapp"]) {
      expect(METIER_BY_USAGE[u], `${u} ne devrait pas être filtré`).toBeUndefined()
      expect(creerUrl(u)).toBe("/creer")
    }
  })
})

describe("adresse de l'essai", () => {
  it("porte le secteur quand on le connaît", () => {
    expect(creerUrl("restaurant")).toBe("/creer?metier=Restaurant")
    expect(creerUrl("salon")).toBe("/creer?metier=Beaute")
  })
  it("sans usage : la galerie complète", () => {
    expect(creerUrl()).toBe("/creer")
    expect(creerUrl(null)).toBe("/creer")
    expect(creerUrl("usage-inexistant")).toBe("/creer")
  })
  it("conserve le parrainage", () => {
    expect(creerUrl("restaurant", "abc123")).toBe("/creer?metier=Restaurant&ref=abc123")
    expect(creerUrl(null, "AbC123")).toBe("/creer?ref=abc123")
  })
  it("refuse un parrainage mal formé plutôt que de le recopier", () => {
    for (const r of ["ab", "N".repeat(41), "<script>", "a b"]) expect(creerUrl(null, r)).toBe("/creer")
  })
})

describe("secteur reçu par la galerie", () => {
  it("accepte les secteurs connus", () => {
    expect(safeMetier("Restaurant")).toBe("Restaurant")
  })
  it("« Tous » ne filtre rien : on le traite comme absent", () => {
    expect(safeMetier("Tous")).toBe("")
  })
  it("refuse tout le reste — jamais une galerie vide", () => {
    for (const v of ["", null, undefined, "Inexistant", "restaurant", "<script>"]) {
      expect(safeMetier(v as any)).toBe("")
    }
  })
})

describe("les pages d'entrée mènent bien à l'essai", () => {
  it("les 20 pages par usage", () => {
    const src = read("../qr-code/[usage]/page.tsx")
    expect(src).toContain("const essaiHref = creerUrl(v.slug)")
    expect(src).not.toContain('"/auth/signup"')
  })

  it("les guides", () => {
    expect(read("../guides/[slug]/page.tsx")).toContain("creerUrl()")
  })

  it("un guide peut declarer sa destination, sans la faire deviner", () => {
    // Elle etait deduite par expression reguliere sur le LIBELLE du bouton :
    // « Creer mes supports imprimables » atterrissait sur le generateur de QR.
    const route = read("../guides/[slug]/page.tsx")
    expect(route).toContain("g.ctaHref || (")
    const src = read("../guides/guides.ts")
    expect(src).toContain("ctaHref?: string")
    expect(src).toContain('ctaHref: "/creer"')
  })

  it("les deux hubs et le générateur", () => {
    for (const f of ["../qr-code/page.tsx", "../generateur-qr-code/page.tsx"]) {
      expect(read(f), f).toContain("href={creerUrl()}")
    }
  })

  it("la galerie remonte le secteur reçu, sans rien masquer", () => {
    // Filtrer serait pire que ne rien faire : « Restaurant » ne compte qu'un
    // modèle sur 48, et n'en montrer qu'un ferait passer le catalogue pour vide.
    const g = read("../dashboard/templates/page.tsx")
    expect(g).toContain('safeMetier(new URLSearchParams(window.location.search).get("metier"))')
    expect(g).toContain("if (m) setFromEntry(m)")
    expect(g, "le secteur ne doit PAS devenir un filtre").not.toContain("setActiveMetier(m)")
    expect(g).toContain("return [...dedans, ...dehors]")
  })

  it("la grille affiche la liste ordonnée, pas la liste brute", () => {
    expect(read("../dashboard/templates/page.tsx")).toContain("{ordonnes.map((template: any, idx: number) => {")
  })

  it("et laisse revenir à l'ordre habituel", () => {
    const g = read("../dashboard/templates/page.tsx")
    expect(g).toContain('onClick={() => setFromEntry("")}')
    expect(g).toContain("Ordre habituel")
  })
})
