import { describe, it, expect } from "vitest"
import { renderToStaticMarkup } from "react-dom/server"
import { listePacks, listePrestations, lienPack } from "./models/packsEtTarifs"
import { ficheEntreprise } from "./models/presentationEtEncadres"
import { EditorPacks, PublicPacks } from "./blocks/packs"
import { EditorServicesPricing, PublicServicesPricing } from "./blocks/services_pricing"
import { PublicCompany } from "./blocks/company"
import { SHARED_RENDERER_BLOCKS } from "./architecture"
import type { EditorRenderCtx, PublicRenderCtx } from "./renderTypes"

// Vague 12 — formules et tarifs. `packs` declarait un champ « Lien » par formule
// (pack1_url…) que les DEUX renderers extrayaient puis jetaient : le commercant
// collait l'adresse de sa page de reservation, et la carte n'etait cliquable
// nulle part. C'est le genre d'oubli qu'aucun test de parite ne peut voir —
// les deux cotes etaient d'accord pour ne rien faire.

const sombre: any = { bg: "#080808", fontDisplay: "Fraunces", fontBody: "DM Sans", accent: "#39FF8F", primary: "#C9A84C", text: "#F5F0E8", muted: "#A8A190" }
const clair: any = { ...sombre, bg: "#FFFFFF", text: "#1A1A1A", muted: "#6B7280" }

const eCtx = (theme: any = sombre): EditorRenderCtx =>
  ({ theme, primary: theme.primary, text: theme.text, muted: theme.muted, accent: theme.accent, surfaceStyle: {}, canEdit: false, edit: () => () => {} })
const pCtx = (theme: any = sombre): PublicRenderCtx =>
  ({ theme, G: theme.primary, TEXT: theme.text, MUTED: theme.muted, FONT_D: "Fraunces, serif", FONT_B: "DM Sans, sans-serif", pageId: "p1", blockId: "b1", trackClick: () => {} })

const H = (el: any) => renderToStaticMarkup(el)

describe("vague 12 - modeles purs", () => {
  it("listePacks : le nom porte la formule, le contenu se decoupe en lignes", () => {
    const p = listePacks({ pack1_name: "Essentiel", pack1_price: "49 €", pack1_content: "Une chose\n\nDeux choses\n " })[0]
    expect(p.lignes).toEqual(["Une chose", "Deux choses"])
    expect(p.icone).toBe("🚀")
    expect(listePacks({ pack1_price: "49 €" })).toEqual([])
    expect(listePacks({ pack1_name: "A", pack3_name: "C" }).map(x => x.nom)).toEqual(["A", "C"])
  })
  it("lienPack : http(s) accepte, schema inconnu refuse, domaine nu complete", () => {
    expect(lienPack("https://resa.co/x")!.href).toBe("https://resa.co/x")
    expect(lienPack("resa.co/x")!.href).toBe("https://resa.co/x")
    expect(lienPack("mailto:a@b.co")!.href).toBe("mailto:a@b.co")
    expect(lienPack("mailto:a@b.co")!.external).toBe(false)
    for (const mauvais of ["javascript:alert(1)", "data:text/html,x", "vbscript:x", "file:///etc"]) {
      expect(lienPack(mauvais), mauvais).toBeNull()
    }
    expect(lienPack("")).toBeNull()
  })
  it("listePrestations : le nom decide, le reste est facultatif", () => {
    expect(listePrestations({ s1_price: "20 €" })).toEqual([])
    const s = listePrestations({ s1_name: "Coupe", s1_price: "25 €" })[0]
    expect([s.duree, s.description]).toEqual(["", ""])
  })
  it("ficheEntreprise : l'effectif rejoint la ligne de sous-titre", () => {
    // « Effectif » etait un reglage propose et lu par personne.
    const f = ficheEntreprise({ company_name: "Atelier", sector: "Menuiserie", founded_year: "2014", team_size: "12 personnes" })!
    expect(f.sousTitre).toBe("Menuiserie · Depuis 2014 · 12 personnes")
    expect(ficheEntreprise({ company_name: "A", team_size: "3" })!.sousTitre).toBe("3")
    expect(ficheEntreprise({ company_name: "A" })!.sousTitre).toBe("")
  })
})

describe("vague 12 - le lien d'une formule mene enfin quelque part", () => {
  const c = { pack1_name: "Essentiel", pack1_price: "49 €", pack1_url: "https://resa.co/essentiel" }

  it("la page publiee rend un vrai lien tracke", () => {
    const h = H(<PublicPacks content={c} ctx={pCtx()} />)
    expect(h).toContain('href="https://resa.co/essentiel"')
    expect(h).toContain('rel="noopener noreferrer"')
    expect(h).toContain("min-height:44px")            // cible tactile
  })
  it("l'apercu montre le meme bouton, sans naviguer", () => {
    const h = H(<EditorPacks content={c} ctx={eCtx()} />)
    expect(h).toContain("Choisir cette formule")
    expect(h).not.toContain("href=")
    expect(h).toContain('aria-disabled="true"')
  })
  it("sans lien saisi, aucun bouton — on n'invente pas de destination", () => {
    for (const h of [
      H(<PublicPacks content={{ pack1_name: "Essentiel" }} ctx={pCtx()} />),
      H(<EditorPacks content={{ pack1_name: "Essentiel" }} ctx={eCtx()} />),
    ]) {
      expect(h).not.toContain("Choisir cette formule")
    }
  })
  it("une adresse a schema inconnu ne cree pas de bouton", () => {
    expect(H(<PublicPacks content={{ pack1_name: "A", pack1_url: "javascript:alert(1)" }} ctx={pCtx()} />)).not.toContain("javascript:")
  })
})

describe("vague 12 - l'apercu montre ce qui sera publie", () => {
  const textes = (h: string) => h.replace(/<[^>]*>/g, " ").split(/\s+/).filter(Boolean)
  const paires = [
    ["packs", EditorPacks, PublicPacks, { title: "Formules", pack1_name: "Essentiel", pack1_price: "49 €", pack1_content: "A\nB", pack2_name: "Confort", pack2_price: "89 €" }],
    ["services_pricing", EditorServicesPricing, PublicServicesPricing, { title: "Tarifs", s1_name: "Coupe", s1_price: "25 €", s1_duration: "30 min", s2_name: "Couleur", s2_price: "60 €" }],
  ] as const
  for (const [type, Ed, Pub, contenu] of paires) {
    it(type + " : memes textes des deux cotes", () => {
      expect(textes(H(<Ed content={contenu} ctx={eCtx()} />))).toEqual(textes(H(<Pub content={contenu} ctx={pCtx()} /> as any)))
    })
    it(type + " : vide -> public null, apercu invitant", () => {
      expect(Pub({ content: {}, ctx: pCtx() } as any)).toBeNull()
      expect(H(<Ed content={{}} ctx={eCtx()} />)).toContain("Invisible en ligne")
    })
  }
})

describe("vague 12 - les surfaces suivent le theme", () => {
  it("services_pricing : le filet reste visible sur un theme clair", () => {
    const c = { s1_name: "Coupe", s1_price: "25 €", s2_name: "Couleur", s2_price: "60 €" }
    expect(H(<PublicServicesPricing content={c} ctx={pCtx(clair)} />)).not.toMatch(/rgba\(255,255,255/)
    expect(H(<PublicServicesPricing content={c} ctx={pCtx()} />)).toMatch(/rgba\(255,255,255/)
  })
  it("packs : la carte non mise en avant aussi", () => {
    const c = { pack1_name: "Essentiel" }
    expect(H(<PublicPacks content={c} ctx={pCtx(clair)} />)).not.toMatch(/rgba\(255,255,255/)
  })
  it("company : l'effectif saisi arrive bien au visiteur", () => {
    expect(H(<PublicCompany content={{ company_name: "Atelier", team_size: "12 personnes" }} ctx={pCtx()} />)).toContain("12 personnes")
  })
})

describe("vague 12 - activation", () => {
  it("les deux blocs sont dans le drapeau de migration", () => {
    for (const t of ["packs", "services_pricing"]) expect(SHARED_RENDERER_BLOCKS.has(t)).toBe(true)
  })
})
