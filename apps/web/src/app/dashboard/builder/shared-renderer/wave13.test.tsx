import { describe, it, expect } from "vitest"
import { renderToStaticMarkup } from "react-dom/server"
import { boutonAppel, boutonItineraire, carteAdresse, contactsRapides, boutonAction } from "./models/contactEtAction"
import { EditorCallButton, PublicCallButton } from "./blocks/call_button"
import { EditorDirectionsButton, PublicDirectionsButton } from "./blocks/directions_button"
import { EditorGoogleMaps, PublicGoogleMaps } from "./blocks/google_maps"
import { EditorQuickContact, PublicQuickContact } from "./blocks/quick_contact"
import { EditorCtaButton, PublicCtaButton } from "./blocks/cta_button"
import { SHARED_RENDERER_BLOCKS } from "./architecture"
import type { EditorRenderCtx, PublicRenderCtx } from "./renderTypes"

// Vague 13 — les blocs les plus courants d'une page scannee : appeler, trouver
// l'adresse, obtenir l'itineraire, cliquer. Ce sont ceux qu'un client utilise
// debout devant une vitrine, et ils avaient tous derive.

const sombre: any = { bg: "#080808", fontDisplay: "Fraunces", fontBody: "DM Sans", accent: "#39FF8F", primary: "#C9A84C", text: "#F5F0E8", muted: "#A8A190" }
const clair: any = { ...sombre, bg: "#FFFFFF", text: "#1A1A1A", muted: "#6B7280" }

const eCtx = (theme: any = sombre): EditorRenderCtx =>
  ({ theme, primary: theme.primary, text: theme.text, muted: theme.muted, accent: theme.accent, surfaceStyle: {}, canEdit: false, edit: () => () => {} })
const pCtx = (theme: any = sombre): PublicRenderCtx =>
  ({ theme, G: theme.primary, TEXT: theme.text, MUTED: theme.muted, FONT_D: "Fraunces, serif", FONT_B: "DM Sans, sans-serif", pageId: "p1", blockId: "b1", trackClick: () => {} })

const H = (el: any) => renderToStaticMarkup(el)
const paires = [
  ["call_button", EditorCallButton, PublicCallButton, { phone: "0326123456", sub: "7j/7 de 9h à 19h" }],
  ["directions_button", EditorDirectionsButton, PublicDirectionsButton, { address: "12 rue des Peupliers, Reims" }],
  ["google_maps", EditorGoogleMaps, PublicGoogleMaps, { address: "12 rue des Peupliers, Reims", transport: "Tram A" }],
  ["quick_contact", EditorQuickContact, PublicQuickContact, { phone: "0326123456", email: "a@b.co", hours: "9h-19h" }],
  ["cta_button", EditorCtaButton, PublicCtaButton, { label: "Réserver", url: "resa.co" }],
] as const

describe("vague 13 - modeles purs", () => {
  it("boutonAppel : sans numero, aucun bloc ; le sous-titre est conserve", () => {
    expect(boutonAppel({ label: "Appeler" })).toBeNull()
    expect(boutonAppel({ phone: "   " })).toBeNull()
    const m = boutonAppel({ phone: "03 26 12 34 56", sub: "7j/7" })!
    expect(m.href.startsWith("tel:")).toBe(true)
    expect(m.href).not.toContain(" ")        // le numero est nettoye
    expect(m.sous).toBe("7j/7")
    expect(boutonAppel({ phone: "0326123456" })!.label).toBe("Appeler maintenant")
  })
  it("boutonItineraire : sans adresse, aucun bloc ; la copie se desactive", () => {
    expect(boutonItineraire({})).toBeNull()
    expect(boutonItineraire({ address: "Reims" })!.copier).toBe(true)
    expect(boutonItineraire({ address: "Reims", show_copy: "no" })!.copier).toBe(false)
    expect(boutonItineraire({ address: "Reims" })!.href).toContain("Reims")
  })
  it("carteAdresse : sans adresse, aucun bloc — plus de lien vers une recherche vide", () => {
    // La page publiait « maps.google.com/?q= » : un lien vers rien.
    expect(carteAdresse({})).toBeNull()
    expect(carteAdresse({ label: "Adresse", transport: "Tram A" })).toBeNull()
    const m = carteAdresse({ address: "12 rue des Peupliers" })!
    expect(m.href).toBe("https://maps.google.com/?q=12%20rue%20des%20Peupliers")
    expect(m.label).toBe("Adresse")
  })
  it("contactsRapides : chaque ligne passe par la fonction qui nettoie son lien", () => {
    const l = contactsRapides({ phone: "03 26 12 34 56", email: "a@b.co", whatsapp: "612345678", whatsapp_cc: "33", address: "Reims", hours: "9h-19h" })
    expect(l.map(x => x.couleur)).toEqual(["success", "action", "whatsapp", "accent", "muted"])
    expect(l[0].lien!.href).not.toContain(" ")            // tel: nettoye
    expect(l[2].lien!.href).toContain("wa.me")            // indicatif applique
    expect(l[2].lien!.href).toContain("33")
    expect(l[3].lien).toBeNull()                          // une adresse ne se clique pas
    expect(l[4].lien).toBeNull()
    expect(contactsRapides({})).toEqual([])
    expect(contactsRapides({ title: "Contact" })).toEqual([])   // un titre seul ne suffit pas
  })
  it("contactsRapides : l'indicatif par defaut vaut 33 quand rien n'est saisi", () => {
    expect(contactsRapides({ whatsapp: "612345678" })[0].lien!.href).toContain("33612345678")
  })
  it("boutonAction : libelle OU adresse ; pleine largeur par defaut", () => {
    expect(boutonAction({})).toBeNull()
    expect(boutonAction({ url: "x.co" })!.label).toBe("Bouton")
    expect(boutonAction({ label: "Voir" })!.pleineLargeur).toBe(true)
    expect(boutonAction({ label: "Voir", full_width: "no" })!.pleineLargeur).toBe(false)
    expect(boutonAction({ label: "Voir", url: "resa.co" })!.lien.href).toBe("https://resa.co")
  })
})

describe("vague 13 - un bloc sans coordonnee ne publie rien", () => {
  for (const [type, Ed, Pub] of paires) {
    it(type + " : public null ; l'editeur invite", () => {
      expect(Pub({ content: {}, ctx: pCtx() } as any)).toBeNull()
      const html = H(<Ed content={{}} ctx={eCtx()} />)
      expect(html).toContain('role="note"')
      expect(html).toContain("Invisible en ligne")
    })
  }

  it("google_maps : une carte sans adresse ne mène plus à une recherche vide", () => {
    expect(PublicGoogleMaps({ content: { label: "Adresse" }, ctx: pCtx() } as any)).toBeNull()
    expect(H(<PublicGoogleMaps content={{ address: "Reims" }} ctx={pCtx()} />)).not.toContain("?q=\"")
  })
})

describe("vague 13 - l'apercu montre ce qui sera publie", () => {
  const textes = (h: string) => h.replace(/<[^>]*>/g, " ").split(/\s+/).filter(Boolean)
  for (const [type, Ed, Pub, contenu] of paires) {
    it(type + " : memes textes des deux cotes", () => {
      expect(textes(H(<Ed content={contenu} ctx={eCtx()} />))).toEqual(textes(H(<Pub content={contenu} ctx={pCtx()} /> as any)))
    })
  }

  it("call_button : le sous-titre apparaît enfin dans l'apercu", () => {
    // Il etait reglable, servi au visiteur, et invisible cote editeur.
    const c = { phone: "0326123456", sub: "7j/7 de 9h à 19h" }
    expect(H(<EditorCallButton content={c} ctx={eCtx()} />)).toContain("7j/7")
    expect(H(<PublicCallButton content={c} ctx={pCtx()} />)).toContain("7j/7")
  })

  it("directions_button : l'apercu montre le bouton de copie, pas l'adresse en texte", () => {
    const c = { address: "12 rue des Peupliers, Reims" }
    const ed = H(<EditorDirectionsButton content={c} ctx={eCtx()} />)
    expect(ed).toContain("Copier l&#x27;adresse")
    expect(ed).toContain('aria-disabled="true"')      // inerte dans le canvas
    expect(H(<PublicDirectionsButton content={c} ctx={pCtx()} />)).toContain("Copier l&#x27;adresse")
  })

  it("directions_button : « ne pas proposer la copie » est respecte des deux cotes", () => {
    const c = { address: "Reims", show_copy: "no" }
    for (const h of [H(<EditorDirectionsButton content={c} ctx={eCtx()} />), H(<PublicDirectionsButton content={c} ctx={pCtx()} />)]) {
      expect(h).not.toContain("Copier")
    }
  })
})

describe("vague 13 - les liens mènent au bon endroit, et seulement en ligne", () => {
  it("call_button : vrai lien tel: en public, coquille inerte dans l'editeur", () => {
    const c = { phone: "03 26 12 34 56" }
    expect(H(<PublicCallButton content={c} ctx={pCtx()} />)).toContain('href="tel:')
    const ed = H(<EditorCallButton content={c} ctx={eCtx()} />)
    expect(ed).not.toContain("href=")
    expect(ed).toContain('aria-disabled="true"')
  })
  it("quick_contact : l'adresse et les horaires ne sont pas des liens", () => {
    const h = H(<PublicQuickContact content={{ address: "Reims", hours: "9h-19h" }} ctx={pCtx()} />)
    expect(h).not.toContain("href=")
    expect(h).toContain("Reims")
  })
  it("cta_button : « pleine largeur » change vraiment la largeur, des deux cotes", () => {
    for (const ctx of [{ e: true }, { e: false }]) {
      const pleine = ctx.e
        ? H(<EditorCtaButton content={{ label: "Voir" }} ctx={eCtx()} />)
        : H(<PublicCtaButton content={{ label: "Voir" }} ctx={pCtx()} />)
      const ajuste = ctx.e
        ? H(<EditorCtaButton content={{ label: "Voir", full_width: "no" }} ctx={eCtx()} />)
        : H(<PublicCtaButton content={{ label: "Voir", full_width: "no" }} ctx={pCtx()} />)
      expect(pleine).toContain("width:100%")
      expect(ajuste).toContain("width:auto")
      expect(ajuste).toContain("text-align:center")
    }
  })
  it("les boutons respectent le plancher de cible tactile", () => {
    expect(H(<PublicCallButton content={{ phone: "0326123456" }} ctx={pCtx()} />)).toContain("min-height:44px")
    expect(H(<PublicCtaButton content={{ label: "Voir", url: "x.co" }} ctx={pCtx()} />)).toContain("min-height:44px")
  })
})

describe("vague 13 - les surfaces suivent le theme", () => {
  it("directions_button : le bouton de copie reste visible sur un theme clair", () => {
    const c = { address: "Reims" }
    expect(H(<PublicDirectionsButton content={c} ctx={pCtx(clair)} />)).not.toMatch(/rgba\(255,255,255/)
    expect(H(<PublicDirectionsButton content={c} ctx={pCtx()} />)).toMatch(/rgba\(255,255,255/)
  })
})

describe("vague 13 - activation", () => {
  it("les cinq blocs sont dans le drapeau de migration", () => {
    for (const [type] of paires) expect(SHARED_RENDERER_BLOCKS.has(type)).toBe(true)
  })
})
