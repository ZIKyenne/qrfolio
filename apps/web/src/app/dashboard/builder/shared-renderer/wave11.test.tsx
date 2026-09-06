import { describe, it, expect } from "vitest"
import { renderToStaticMarkup } from "react-dom/server"
import { readFileSync } from "node:fs"
import { fileURLToPath } from "node:url"
import { compteurScans, compteurVentes, participants, codePromo, placesRestantes, offreLimitee, ctaOptionnel, STYLES_URGENCE } from "./models/compteursEtOffres"
import { EditorScanCounter, PublicScanCounter } from "./blocks/scan_counter"
import { EditorSalesCounter, PublicSalesCounter } from "./blocks/sales_counter"
import { EditorParticipantsCount, PublicParticipantsCount } from "./blocks/participants_count"
import { EditorPromoCode, PublicPromoCode } from "./blocks/promo_code"
import { EditorTicketsLeft, PublicTicketsLeft } from "./blocks/tickets_left"
import { EditorLimitedOffer, PublicLimitedOffer } from "./blocks/limited_offer"
import { SHARED_RENDERER_BLOCKS } from "./architecture"
import { hasPublishableContent } from "../blockEmptyState"
import type { EditorRenderCtx, PublicRenderCtx } from "./renderTypes"

// Vague 11 — la famille ou vivaient les faux chiffres. Le « 1 240 » du compteur de
// scans avait deja quitte la page publiee ; deux autres nombres inventes vivaient
// encore dans l'apercu de l'editeur, sur des blocs que la page ne publiait meme pas.

const sombre: any = { bg: "#080808", fontDisplay: "Fraunces", fontBody: "DM Sans", accent: "#39FF8F", primary: "#C9A84C", text: "#F5F0E8", muted: "#A8A190" }
const clair: any = { ...sombre, bg: "#FFFFFF", text: "#1A1A1A", muted: "#6B7280" }

const eCtx = (theme: any = sombre): EditorRenderCtx =>
  ({ theme, primary: theme.primary, text: theme.text, muted: theme.muted, accent: theme.accent, surfaceStyle: {}, canEdit: false, edit: () => () => {} })
const pistes: string[] = []
const pCtx = (theme: any = sombre): PublicRenderCtx =>
  ({ theme, G: theme.primary, TEXT: theme.text, MUTED: theme.muted, FONT_D: "Fraunces, serif", FONT_B: "DM Sans, sans-serif", pageId: "p1", blockId: "b1", trackClick: (t: string) => { pistes.push(t) } })

const H = (el: any) => renderToStaticMarkup(el)
const paires = [
  ["scan_counter", EditorScanCounter, PublicScanCounter, { count: "1 240", label: "scans" }],
  ["sales_counter", EditorSalesCounter, PublicSalesCounter, { count: "127", period: "cette semaine" }],
  ["participants_count", EditorParticipantsCount, PublicParticipantsCount, { count: "42", max: "60" }],
  ["promo_code", EditorPromoCode, PublicPromoCode, { code: "PROMO10", description: "10 % sur tout" }],
  ["tickets_left", EditorTicketsLeft, PublicTicketsLeft, { count: "14", cta_label: "Réserver" }],
  ["limited_offer", EditorLimitedOffer, PublicLimitedOffer, { title: "Black Friday", description: "-30 %" }],
] as const

describe("vague 11 - modeles purs", () => {
  it("compteurScans : sans chiffre, aucun bloc — un libelle seul ne compte rien", () => {
    expect(compteurScans({ label: "scans" })).toBeNull()
    expect(compteurScans({ count: "  " })).toBeNull()
    expect(compteurScans({ count: "1 240" })).toEqual({ count: "1 240", emoji: "", label: "" })
    expect(compteurScans({ count: 42 as any })!.count).toBe("42")
  })
  it("compteurVentes : libelle et emoji par defaut, chiffre obligatoire", () => {
    expect(compteurVentes({})).toBeNull()
    const m = compteurVentes({ count: "127" })!
    expect([m.emoji, m.label]).toEqual(["🔥", "ventes"])
    expect(compteurVentes({ count: "1", label: "commandes", emoji: "📦" })!.label).toBe("commandes")
  })
  it("participants : la jauge exige un objectif reel", () => {
    expect(participants({ count: "5" })!.jauge).toBeNull()          // aucun max saisi
    expect(participants({ count: "5", max: "0" })!.jauge).toBeNull()
    expect(participants({ count: "5", max: "abc" })!.jauge).toBeNull()
    expect(participants({ count: "5", max: "10" })!.jauge).toEqual({ total: 5, max: 10, pct: 50 })
    expect(participants({ count: "99", max: "10" })!.jauge!.pct).toBe(100)   // borne haute
    expect(participants({ count: "5", max: "10", show_progress: "no" })!.jauge).toBeNull()
    expect(participants({ max: "10" })).toBeNull()
  })
  it("codePromo : le code porte le bloc", () => {
    expect(codePromo({ description: "10 %" })).toBeNull()
    expect(codePromo({ code: "PROMO10" })!.expires).toBe("")
  })
  it("placesRestantes : chiffre obligatoire, urgence inconnue = la plus forte", () => {
    expect(placesRestantes({ cta_label: "Réserver" })).toBeNull()
    expect(placesRestantes({ count: "3" })!.style).toBe(STYLES_URGENCE.high)
    expect(placesRestantes({ count: "3", urgency: "low" })!.style).toBe(STYLES_URGENCE.low)
    expect(placesRestantes({ count: "3", urgency: "inconnu" })!.style).toBe(STYLES_URGENCE.high)
    // Sur fond ambre ou vert, le libelle du bouton doit etre sombre pour rester lisible.
    expect(STYLES_URGENCE.medium.texteBouton).toBe("#080808")
    expect(STYLES_URGENCE.low.texteBouton).toBe("#080808")
  })
  it("offreLimitee : titre OU description ; le titre par defaut ne cree pas le bloc", () => {
    expect(offreLimitee({})).toBeNull()
    expect(offreLimitee({ cta_label: "J'en profite" })).toBeNull()
    expect(offreLimitee({ description: "-30 %" })!.title).toBe("Offre limitée")
  })
  it("ctaOptionnel : durcit l'adresse et conserve la cle de suivi historique", () => {
    expect(ctaOptionnel({ cta_label: "" }, "tickets")).toBeNull()
    const sansUrl = ctaOptionnel({ cta_label: "Réserver" }, "tickets")!
    expect(sansUrl.link.trackTarget).toBe("tickets")
    expect(sansUrl.link.external).toBe(false)
    const avecUrl = ctaOptionnel({ cta_label: "Réserver", cta_url: "https://billet.co/x" }, "tickets")!
    expect(avecUrl.link.trackTarget).toBe("https://billet.co/x")
    expect(avecUrl.link.external).toBe(true)
    // Un schema inconnu est refuse : le bouton reste, mais il ne mene nulle part
    // plutot que vers une adresse fabriquee (« https://javascript:alert(1) »).
    for (const mauvais of ["javascript:alert(1)", "data:text/html,<script>", "vbscript:x", "file:///etc"]) {
      expect(ctaOptionnel({ cta_label: "X", cta_url: mauvais }, "offer")!.link.href, mauvais).toBeNull()
    }
    expect(ctaOptionnel({ cta_label: "X", cta_url: "mailto:a@b.co" }, "offer")!.link.href).toBe("mailto:a@b.co")
    expect(ctaOptionnel({ cta_label: "X", cta_url: "billet.co/x" }, "offer")!.link.href).toBe("https://billet.co/x")
  })
})

describe("vague 11 - un compteur sans chiffre ne s'affiche nulle part", () => {
  for (const [type, Ed, Pub] of paires) {
    it(type + " : public null ; l'editeur invite au lieu d'inventer", () => {
      expect(Pub({ content: {}, ctx: pCtx() } as any)).toBeNull()
      const html = H(<Ed content={{}} ctx={eCtx()} />)
      expect(html).toContain('role="note"')
      expect(html).toContain("Invisible en ligne")
    })
  }

  it("tickets_left : « 14 » a disparu de l'apercu", () => {
    const h = H(<EditorTicketsLeft content={{ label: "places restantes" }} ctx={eCtx()} />)
    expect(h).not.toContain(">14<")
    expect(h).toContain('role="note"')
  })

  it("limited_offer : plus de bandeau « Offre limitée » sur un bloc vide", () => {
    expect(H(<EditorLimitedOffer content={{}} ctx={eCtx()} />)).not.toContain("Offre limitée")
    // Le titre par defaut existe toujours — mais seulement si le commercant a
    // vraiment quelque chose a dire.
    expect(H(<PublicLimitedOffer content={{ description: "-30 %" }} ctx={pCtx()} />)).toContain("Offre limitée")
  })

  it("visit_counter : l'apercu n'invente plus « 1 234 » visiteurs", () => {
    // Ce bloc lit le total reel de la page ; l'editeur ne l'a pas. Il reste en
    // legacy, donc on verifie directement le source de l'apercu.
    const src = readFileSync(fileURLToPath(new URL("../builderPreview.tsx", import.meta.url)), "utf8")
    expect(src).not.toContain("1 234")
    expect(src).toContain('case "visit_counter"')
  })
})

describe("vague 11 - l'apercu montre ce qui sera publie", () => {
  const textes = (h: string) => h.replace(/<[^>]*>/g, " ").split(/\s+/).filter(Boolean)
  for (const [type, Ed, Pub, contenu] of paires) {
    it(type + " : memes textes des deux cotes", () => {
      expect(textes(H(<Ed content={contenu} ctx={eCtx()} />))).toEqual(textes(H(<Pub content={contenu} ctx={pCtx()} /> as any)))
    })
  }

  it("participants_count : la jauge n'apparait pas sans objectif, des deux cotes", () => {
    const c = { count: "5" }
    for (const h of [H(<EditorParticipantsCount content={c} ctx={eCtx()} />), H(<PublicParticipantsCount content={c} ctx={pCtx()} />)]) {
      expect(h).not.toContain("Inscriptions")
      expect(h).not.toContain("/0")
    }
    expect(H(<PublicParticipantsCount content={{ count: "5", max: "10" }} ctx={pCtx()} />)).toContain("Inscriptions")
  })

  it("promo_code : la puce du code reste ajustee au texte des deux cotes", () => {
    for (const h of [H(<EditorPromoCode content={{ code: "PROMO10" }} ctx={eCtx()} />), H(<PublicPromoCode content={{ code: "PROMO10" }} ctx={pCtx()} />)]) {
      expect(h).toContain("display:inline-block")
    }
  })
})

describe("vague 11 - les boutons mènent quelque part, et seulement en ligne", () => {
  it("tickets_left : vrai lien en public, coquille inerte dans l'editeur", () => {
    const c = { count: "3", cta_label: "Réserver", cta_url: "https://billet.co/x" }
    const pub = H(<PublicTicketsLeft content={c} ctx={pCtx()} />)
    expect(pub).toContain('href="https://billet.co/x"')
    expect(pub).toContain('rel="noopener noreferrer"')
    const ed = H(<EditorTicketsLeft content={c} ctx={eCtx()} />)
    expect(ed).not.toContain("href=")
    expect(ed).toContain('aria-disabled="true"')
  })
  it("le bouton respecte le plancher de cible tactile", () => {
    expect(H(<PublicLimitedOffer content={{ title: "X", cta_label: "J'en profite", cta_url: "https://x.co" }} ctx={pCtx()} />)).toContain("min-height:44px")
  })
  it("une adresse a schema inconnu ne devient jamais un href", () => {
    const h = H(<PublicLimitedOffer content={{ title: "X", cta_label: "Y", cta_url: "javascript:alert(1)" }} ctx={pCtx()} />)
    expect(h).not.toContain("javascript:")
    expect(h).toContain('href="#"')      // bouton inerte, pas d'adresse fabriquee
    expect(h).not.toContain('target="_blank"')
    expect(h).toContain("Y")             // le libelle reste visible
  })
})

describe("vague 11 - les surfaces suivent le theme", () => {
  it("participants_count : le rail de la jauge reste visible sur un theme clair", () => {
    const c = { count: "5", max: "10" }
    expect(H(<PublicParticipantsCount content={c} ctx={pCtx(clair)} />)).not.toMatch(/rgba\(255,255,255/)
    expect(H(<PublicParticipantsCount content={c} ctx={pCtx()} />)).toMatch(/rgba\(255,255,255/)
  })
})

describe("vague 11 - la doctrine de l'etat vide dit la verite", () => {
  const cas: Array<[string, any, Record<string, any>, boolean]> = [
    ["scan_counter", PublicScanCounter, { label: "scans" }, false],
    ["scan_counter", PublicScanCounter, { count: "12" }, true],
    ["sales_counter", PublicSalesCounter, {}, false],
    ["sales_counter", PublicSalesCounter, { count: "1" }, true],
    ["participants_count", PublicParticipantsCount, { max: "10" }, false],
    ["participants_count", PublicParticipantsCount, { count: "1" }, true],
    ["promo_code", PublicPromoCode, { description: "x" }, false],
    ["promo_code", PublicPromoCode, { code: "X" }, true],
    ["tickets_left", PublicTicketsLeft, { cta_label: "Réserver" }, false],
    ["tickets_left", PublicTicketsLeft, { count: "3" }, true],
    ["limited_offer", PublicLimitedOffer, { cta_label: "J'en profite" }, false],
    ["limited_offer", PublicLimitedOffer, { description: "-30 %" }, true],
  ]
  for (const [type, Pub, contenu, publiable] of cas) {
    it(type + " " + JSON.stringify(contenu) + " -> " + (publiable ? "publie" : "invisible"), () => {
      expect(hasPublishableContent(type, contenu)).toBe(publiable)
      expect(Pub({ content: contenu, ctx: pCtx() } as any) !== null).toBe(publiable)
    })
  }
})

describe("vague 11 - activation", () => {
  it("les six blocs sont dans le drapeau de migration", () => {
    for (const [type] of paires) expect(SHARED_RENDERER_BLOCKS.has(type)).toBe(true)
  })
})
