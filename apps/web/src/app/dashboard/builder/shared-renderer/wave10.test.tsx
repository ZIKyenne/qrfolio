import { describe, it, expect } from "vitest"
import { renderToStaticMarkup } from "react-dom/server"
import { citation, encadre, messageFondateur, ficheEntreprise, lignesParcours, niveauxExpertise, pourcentageNiveau, STYLES_ENCADRE } from "./models/presentationEtEncadres"
import { EditorQuoteBlock, PublicQuoteBlock } from "./blocks/quote_block"
import { EditorInfoBox, PublicInfoBox } from "./blocks/info_box"
import { EditorFounderMessage, PublicFounderMessage } from "./blocks/founder_message"
import { EditorCompany, PublicCompany } from "./blocks/company"
import { EditorJourney, PublicJourney } from "./blocks/journey"
import { EditorExpertise, PublicExpertise } from "./blocks/expertise"
import { SHARED_RENDERER_BLOCKS } from "./architecture"
import { hasPublishableContent } from "../blockEmptyState"
import type { EditorRenderCtx, PublicRenderCtx } from "./renderTypes"

// Vague 10 — six blocs de presentation ecrits deux fois, dont les deux copies
// avaient derive. Chaque ecart constate le 6 septembre a son test ici.

const sombre: any = { bg: "#080808", fontDisplay: "Fraunces", fontBody: "DM Sans", accent: "#39FF8F", primary: "#C9A84C", text: "#F5F0E8", muted: "#A8A190" }
const clair: any = { ...sombre, bg: "#FFFFFF", text: "#1A1A1A", muted: "#6B7280" }

const eCtx = (theme: any = sombre): EditorRenderCtx =>
  ({ theme, primary: theme.primary, text: theme.text, muted: theme.muted, accent: theme.accent, surfaceStyle: {}, canEdit: false, edit: () => () => {} })
const pCtx = (theme: any = sombre): PublicRenderCtx =>
  ({ theme, G: theme.primary, TEXT: theme.text, MUTED: theme.muted, FONT_D: "Fraunces, serif", FONT_B: "DM Sans, sans-serif", pageId: "p1", blockId: "b1", trackClick: () => {} })

const H = (el: any) => renderToStaticMarkup(el)
const paires = [
  ["quote_block", EditorQuoteBlock, PublicQuoteBlock, { quote: "La qualité se voit à l'usage.", author: "Camille" }],
  ["info_box", EditorInfoBox, PublicInfoBox, { title: "Livraison", message: "Sous 48 h" }],
  ["founder_message", EditorFounderMessage, PublicFounderMessage, { message: "Merci de votre visite.", name: "Camille", role: "Fondatrice" }],
  ["company", EditorCompany, PublicCompany, { company_name: "Atelier Nord", sector: "Menuiserie", founded_year: "2014" }],
  ["journey", EditorJourney, PublicJourney, { line_1: "🏆 Meilleur ouvrier 2019" }],
  ["expertise", EditorExpertise, PublicExpertise, { s1_name: "Ébénisterie", s1_level: "4" }],
] as const

describe("vague 10 - modeles purs", () => {
  it("citation : sans texte, pas de bloc — un auteur seul ne publie rien", () => {
    expect(citation({ quote: "Bon", author: "A", source: "Le Monde" })).toEqual({ quote: "Bon", author: "A", source: "Le Monde" })
    expect(citation({ author: "A" })).toBeNull()
    expect(citation({ quote: "   " })).toBeNull()
    expect(citation({})).toBeNull()
    expect(citation({ quote: "Bon" })).toEqual({ quote: "Bon", author: "", source: "" })
  })
  it("encadre : titre OU message suffit ; un type inconnu retombe sur info", () => {
    expect(encadre({})).toBeNull()
    expect(encadre({ title: "Attention" })!.style).toBe(STYLES_ENCADRE.info)
    expect(encadre({ message: "x", type: "warning" })!.style).toBe(STYLES_ENCADRE.warning)
    expect(encadre({ message: "x", type: "inconnu" })!.style).toBe(STYLES_ENCADRE.info)
    expect(encadre({ message: "x" })!.emoji).toBe("💡")
    expect(encadre({ message: "x", emoji: "🚚" })!.emoji).toBe("🚚")
  })
  it("messageFondateur : le message porte le bloc, rien n'est invente", () => {
    expect(messageFondateur({ name: "Camille" })).toBeNull()
    expect(messageFondateur({ message: "Bonjour" })!.name).toBe("")
    expect(messageFondateur({})).toBeNull()
  })
  it("ficheEntreprise : nom ou logo suffit ; sinon aucun bloc", () => {
    expect(ficheEntreprise({})).toBeNull()
    expect(ficheEntreprise({ sector: "Menuiserie" })).toBeNull()
    expect(ficheEntreprise({ logo_url: "/l.png" })!.name).toBe("")
    expect(ficheEntreprise({ company_name: "Acme" })!.logo).toBe("")
  })
  it("lignesParcours : le premier mot sert d'icone, les vides sont sautes", () => {
    expect(lignesParcours({ line_1: "🏆 Prix 2019", line_3: "📍 Reims" })).toEqual([
      { icone: "🏆", texte: "Prix 2019" }, { icone: "📍", texte: "Reims" },
    ])
    expect(lignesParcours({ line_1: "  " })).toEqual([])
    expect(lignesParcours({})).toEqual([])
  })
  it("pourcentageNiveau : un niveau absent vaut 3 sur 5, plus jamais NaN", () => {
    // `parseInt(String(level) || "3")` ne retombait jamais sur 3 : String(undefined)
    // vaut « undefined », qui est vrai. La barre etait large de « NaN% ».
    for (const v of [undefined, null, "", "  ", "abc", {}, []]) {
      expect(Number.isFinite(pourcentageNiveau(v as any)), String(v)).toBe(true)
      expect(pourcentageNiveau(v as any)).toBe(60)
    }
    expect(pourcentageNiveau("1")).toBe(20)
    expect(pourcentageNiveau("5")).toBe(100)
    expect(pourcentageNiveau("9")).toBe(100)   // borne haute
    expect(pourcentageNiveau(4)).toBe(80)
  })
  it("niveauxExpertise : le nom decide, l'ordre tient, rien n'est mute", () => {
    const c = { s1_name: "A", s1_level: "2", s3_name: "C", s2_level: "5" }
    const avant = JSON.stringify(c)
    expect(niveauxExpertise(c).map(s => [s.nom, s.pct])).toEqual([["A", 40], ["C", 60]])
    expect(JSON.stringify(c)).toBe(avant)
  })
})

describe("vague 10 - un bloc vide ne publie rien et n'invente rien", () => {
  for (const [type, Ed, Pub] of paires) {
    it(type + " : public null ; l'editeur invite", () => {
      expect(Pub({ content: {}, ctx: pCtx() } as any)).toBeNull()
      const html = H(<Ed content={{}} ctx={eCtx()} />)
      expect(html).toContain('role="note"')
      expect(html).toContain("Invisible en ligne")
    })
  }

  it("founder_message : le message d'exemple invente a disparu de l'apercu", () => {
    // « Bienvenue ! Notre mission est de vous offrir le meilleur service possible. »
    // s'affichait comme du vrai contenu tant que le champ etait vide.
    const h = H(<EditorFounderMessage content={{ name: "Camille" }} ctx={eCtx()} />)
    expect(h).not.toContain("Notre mission")
    expect(h).toContain('role="note"')
  })

  it("quote_block : un auteur sans citation ne publie plus de guillemets vides", () => {
    expect(PublicQuoteBlock({ content: { author: "Camille" }, ctx: pCtx() } as any)).toBeNull()
  })

  it("company : une carte vide n'est plus dessinee dans l'apercu", () => {
    const h = H(<EditorCompany content={{ sector: "Menuiserie" }} ctx={eCtx()} />)
    expect(h).toContain('role="note"')
    expect(h).not.toContain("Menuiserie")
  })
})

describe("vague 10 - l'apercu montre ce qui sera publie", () => {
  const textes = (h: string) => h.replace(/<[^>]*>/g, " ").split(/\s+/).filter(Boolean)
  for (const [type, Ed, Pub, contenu] of paires) {
    it(type + " : memes textes des deux cotes", () => {
      expect(textes(H(<Ed content={contenu} ctx={eCtx()} />))).toEqual(textes(H(<Pub content={contenu} ctx={pCtx()} /> as any)))
    })
  }

  it("info_box : les retours a la ligne du commercant sont conserves des deux cotes", () => {
    const c = { message: "Lundi : ferme\nMardi : 9h-19h" }
    for (const h of [H(<EditorInfoBox content={c} ctx={eCtx()} />), H(<PublicInfoBox content={c} ctx={pCtx()} />)]) {
      expect(h).toContain("pre-wrap")
    }
  })

  it("company : une ligne vide n'est plus publiee sous le nom", () => {
    const h = H(<PublicCompany content={{ company_name: "Acme" }} ctx={pCtx()} />)
    expect(h).not.toContain("<p style=\"color:#A8A190;font-size:11px;margin:0\"></p>")
  })
})

describe("vague 10 - les surfaces suivent le theme", () => {
  it("company : le cadre reste visible sur un theme clair", () => {
    const h = H(<PublicCompany content={{ company_name: "Acme" }} ctx={pCtx(clair)} />)
    expect(h).not.toMatch(/rgba\(255,255,255/)
    expect(h).toMatch(/rgba\(0,0,0/)
  })
  it("expertise : le rail de la barre aussi", () => {
    const c = { s1_name: "A", s1_level: "4" }
    expect(H(<PublicExpertise content={c} ctx={pCtx(clair)} />)).not.toMatch(/rgba\(255,255,255/)
    expect(H(<PublicExpertise content={c} ctx={pCtx()} />)).toMatch(/rgba\(255,255,255/)
  })
})

describe("vague 10 - expertise : plus aucune barre illisible", () => {
  it("un niveau manquant donne une largeur valide, jamais NaN", () => {
    for (const h of [
      H(<PublicExpertise content={{ s1_name: "Soudure" }} ctx={pCtx()} />),
      H(<EditorExpertise content={{ s1_name: "Soudure" }} ctx={eCtx()} />),
    ]) {
      expect(h).not.toContain("NaN")
      expect(h).toContain("width:60%")
    }
  })
  it("la barre est annoncee aux lecteurs d'ecran", () => {
    expect(H(<PublicExpertise content={{ s1_name: "Soudure", s1_level: "5" }} ctx={pCtx()} />)).toContain('aria-label="Soudure : 100%"')
  })
})

describe("vague 10 - la doctrine de l'etat vide dit la verite", () => {
  const cas: Array<[string, any, Record<string, any>, boolean]> = [
    ["quote_block", PublicQuoteBlock, {}, false],
    ["quote_block", PublicQuoteBlock, { author: "Camille" }, false],
    ["quote_block", PublicQuoteBlock, { quote: "Bon" }, true],
    ["info_box", PublicInfoBox, {}, false],
    ["info_box", PublicInfoBox, { title: "Note" }, true],
    ["founder_message", PublicFounderMessage, { name: "Camille" }, false],
    ["founder_message", PublicFounderMessage, { message: "Bonjour" }, true],
    ["company", PublicCompany, { sector: "Menuiserie" }, false],
    ["company", PublicCompany, { logo_url: "/l.png" }, true],
    ["journey", PublicJourney, {}, false],
    ["journey", PublicJourney, { line_3: "📍 Reims" }, true],
    ["expertise", PublicExpertise, { s1_level: "4" }, false],
    ["expertise", PublicExpertise, { s2_name: "Soudure" }, true],
  ]
  for (const [type, Pub, contenu, publiable] of cas) {
    it(type + " " + JSON.stringify(contenu) + " -> " + (publiable ? "publie" : "invisible"), () => {
      expect(hasPublishableContent(type, contenu)).toBe(publiable)
      expect(Pub({ content: contenu, ctx: pCtx() } as any) !== null).toBe(publiable)
    })
  }
})

describe("vague 10 - activation", () => {
  it("les six blocs sont dans le drapeau de migration", () => {
    for (const [type] of paires) expect(SHARED_RENDERER_BLOCKS.has(type)).toBe(true)
  })
})
