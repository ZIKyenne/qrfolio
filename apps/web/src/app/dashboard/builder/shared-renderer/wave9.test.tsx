import { describe, it, expect } from "vitest"
import { renderToStaticMarkup } from "react-dom/server"
import { murLogos, listeCertifications, lignesInfo, lignesLegales, CHAMPS_LEGAUX } from "./models/logosEtTableaux"
import { EditorLogoWall, PublicLogoWall } from "./blocks/logo_wall"
import { EditorPartners, PublicPartners } from "./blocks/partners"
import { EditorCertifications, PublicCertifications } from "./blocks/certifications"
import { EditorBusinessCertifications, PublicBusinessCertifications } from "./blocks/business_certifications"
import { EditorInfoTable, PublicInfoTable } from "./blocks/info_table"
import { EditorLegalInfo, PublicLegalInfo } from "./blocks/legal_info"
import { SHARED_RENDERER_BLOCKS } from "./architecture"
import { hasPublishableContent } from "../blockEmptyState"
import type { EditorRenderCtx, PublicRenderCtx } from "./renderTypes"

// Vague 9 — six blocs qui etaient ecrits deux fois (apercu de l'editeur + page
// publiee) et dont les deux copies avaient diverge. Ce fichier fixe les ecarts
// constates le 6 septembre pour qu'ils ne puissent pas revenir.

const sombre: any = { bg: "#080808", fontDisplay: "Fraunces", fontBody: "DM Sans", primary: "#C9A84C", text: "#F5F0E8", muted: "#A8A190" }
const clair: any = { ...sombre, bg: "#FFFFFF", text: "#1A1A1A", muted: "#6B7280" }

const eCtx = (theme: any = sombre): EditorRenderCtx =>
  ({ theme, primary: theme.primary, text: theme.text, muted: theme.muted, accent: "#39FF8F", surfaceStyle: {}, canEdit: false, edit: () => () => {} })
const pCtx = (theme: any = sombre): PublicRenderCtx =>
  ({ theme, G: theme.primary, TEXT: theme.text, MUTED: theme.muted, FONT_D: "Fraunces, serif", FONT_B: "DM Sans, sans-serif", pageId: "p1", blockId: "b1", trackClick: () => {} })

const H = (el: any) => renderToStaticMarkup(el)
const paires = [
  ["logo_wall", EditorLogoWall, PublicLogoWall, { logo1_name: "Acme" }],
  ["partners", EditorPartners, PublicPartners, { logo1_name: "Acme" }],
  ["certifications", EditorCertifications, PublicCertifications, { cert_1_name: "ISO 9001" }],
  ["business_certifications", EditorBusinessCertifications, PublicBusinessCertifications, { c1_name: "Qualibat" }],
  ["info_table", EditorInfoTable, PublicInfoTable, { r1_label: "Places", r1_value: "40" }],
  ["legal_info", EditorLegalInfo, PublicLegalInfo, { siret: "123 456 789 00012" }],
] as const

describe("vague 9 - modeles purs", () => {
  it("murLogos : le nom porte la ligne ; l'image est facultative ; deux conventions de cles", () => {
    expect(murLogos({ logo1_name: "Acme", logo1: "https://x.co/a.png" }, "logo")).toEqual([{ name: "Acme", img: "https://x.co/a.png" }])
    expect(murLogos({ logo1: "https://x.co/a.png" }, "logo")).toEqual([])
    expect(murLogos({ logo1_name: "Acme" }, "logo")).toEqual([{ name: "Acme", img: "" }])
    expect(murLogos({ logo1_name: "A", logo1_img: "u" }, "logo_img")[0].img).toBe("u")
    expect(murLogos({ logo1_name: "A", logo1: "u" }, "logo_img")[0].img).toBe("")
  })
  it("murLogos : les trous ne coupent pas la liste, l'ordre est conserve, rien n'est mute", () => {
    const c = { logo1_name: "A", logo3_name: "C", logo2_name: "" }
    const avant = JSON.stringify(c)
    expect(murLogos(c, "logo").map(l => l.name)).toEqual(["A", "C"])
    expect(JSON.stringify(c)).toBe(avant)
  })
  it("listeCertifications : prefixes distincts, champs facultatifs, vides ignores", () => {
    expect(listeCertifications({ cert_1_name: "ISO", cert_1_org: "AFNOR", cert_1_year: "2024" }, "cert_"))
      .toEqual([{ icon: "", name: "ISO", org: "AFNOR", year: "2024" }])
    expect(listeCertifications({ c1_name: "Qualibat" }, "c")[0].org).toBe("")
    expect(listeCertifications({ cert_1_org: "AFNOR" }, "cert_")).toEqual([])
    expect(listeCertifications({ c1_name: "  " }, "c")).toEqual([])
  })
  it("lignesInfo : le libelle decide, la valeur peut etre vide (parite legacy)", () => {
    expect(lignesInfo({ r1_label: "Places", r1_value: "40" })).toEqual([{ label: "Places", value: "40" }])
    expect(lignesInfo({ r1_label: "Places" })).toEqual([{ label: "Places", value: "" }])
    expect(lignesInfo({ r1_value: "40" })).toEqual([])
  })
  it("lignesLegales : ordre fixe des sept champs, vides sautes", () => {
    expect(CHAMPS_LEGAUX.map(([l]) => l)).toEqual(["Société", "SIRET", "N° TVA", "Siège social", "Capital", "RCS", "Email"])
    expect(CHAMPS_LEGAUX.map(([, k]) => k)).toEqual(["company_name", "siret", "tva", "address", "capital", "rcs", "email"])
    const l = lignesLegales({ email: "a@b.co", company_name: "Acme" })
    expect(l.map(x => x.value)).toEqual(["Acme", "a@b.co"])
    expect(lignesLegales({})).toEqual([])
    expect(lignesLegales(null)).toEqual([])
  })
})

describe("vague 9 - un bloc vide ne publie rien", () => {
  for (const [type, Ed, Pub] of paires) {
    it(type + " : public null ; l'editeur invite au lieu d'inventer", () => {
      expect(Pub({ content: {}, ctx: pCtx() } as any)).toBeNull()
      const html = H(<Ed content={{}} ctx={eCtx()} />)
      expect(html).toContain('role="note"')
      expect(html).toContain("Invisible en ligne")
      expect(html).not.toContain(">Logo<")
    })
  }
})

describe("vague 9 - l'apercu montre ce qui sera publie", () => {
  const textes = (h: string) => h.replace(/<[^>]*>/g, " ").split(/\s+/).filter(Boolean)
  for (const [type, Ed, Pub, contenu] of paires) {
    it(type + " : memes textes des deux cotes", () => {
      expect(textes(H(<Ed content={contenu} ctx={eCtx()} />))).toEqual(textes(H(<Pub content={contenu} ctx={pCtx()} /> as any)))
    })
  }

  it("certifications : la coche de l'apercu est reellement publiee", () => {
    const c = { cert_1_name: "ISO 9001" }
    expect(H(<PublicCertifications content={c} ctx={pCtx()} />)).toContain("\u2713")
    expect(H(<EditorCertifications content={c} ctx={eCtx()} />)).toContain("\u2713")
  })

  it("legal_info : une valeur longue n'est plus coupee dans l'apercu", () => {
    const h = H(<EditorLegalInfo content={{ address: "12 rue de la Tres Longue Avenue des Peupliers, 51100 Reims" }} ctx={eCtx()} />)
    expect(h).not.toContain("nowrap")
    expect(h).toContain("Peupliers")
  })
})

describe("vague 9 - les surfaces suivent le theme", () => {
  const clairs = [
    ["logo_wall", PublicLogoWall, { logo1_name: "Acme" }],
    ["info_table", PublicInfoTable, { r1_label: "Places", r1_value: "40", r2_label: "Terrasse", r2_value: "Oui" }],
    ["legal_info", PublicLegalInfo, { siret: "123" }],
  ] as const
  for (const [type, Pub, contenu] of clairs) {
    it(type + " : aucun blanc en dur sur un theme clair", () => {
      const h = H(<Pub content={contenu} ctx={pCtx(clair)} />)
      expect(h).not.toMatch(/rgba\(255,255,255/)
      expect(h).toMatch(/rgba\(0,0,0/)
    })
  }
  it("et sur un theme sombre, on garde le voile blanc", () => {
    expect(H(<PublicInfoTable content={{ r1_label: "A", r1_value: "B", r2_label: "C", r2_value: "D" }} ctx={pCtx()} />)).toMatch(/rgba\(255,255,255/)
  })
})

describe("vague 9 - images optimisees et dimensionnees", () => {
  it("une image uploadee est servie redimensionnee, avec sa largeur d'affichage", () => {
    // Sans `sizes`, le navigateur suppose la pleine largeur et telecharge la plus
    // grosse variante : un logo de 1600 px pour une case de 90 px. La page publiee
    // annoncait `50vw` pour une grille a 4 colonnes — quatre fois trop.
    const c = { logo1_name: "Acme", logo1: "/uploads/acme.png" }
    for (const h of [H(<PublicLogoWall content={c} ctx={pCtx()} />), H(<EditorLogoWall content={c} ctx={eCtx()} />)]) {
      expect(h).toContain("25vw")
      expect(h).toContain('alt="Acme"')
    }
    expect(H(<PublicPartners content={{ logo1_name: "A", logo1_img: "/uploads/a.png" }} ctx={pCtx()} />)).toContain("33vw")
  })
  it("une image externe garde le repli natif, sans regression", () => {
    const h = H(<PublicLogoWall content={{ logo1_name: "Acme", logo1: "https://x.co/a.png" }} ctx={pCtx()} />)
    expect(h).toContain('src="https://x.co/a.png"')
    expect(h).toContain('loading="lazy"')
  })
  it("une source dangereuse ne devient jamais un src", () => {
    const h = H(<PublicLogoWall content={{ logo1_name: "Acme", logo1: "javascript:alert(1)" }} ctx={pCtx()} />)
    expect(h).not.toContain("javascript:")
    expect(h).toContain("Acme")
  })
})

describe("vague 9 - activation", () => {
  it("les six blocs sont dans le drapeau de migration", () => {
    for (const [type] of paires) expect(SHARED_RENDERER_BLOCKS.has(type)).toBe(true)
  })
})

describe("vague 9 - la doctrine de l'etat vide dit la verite", () => {
  // hasPublishableContent est le registre declare de « ce bloc publiera-t-il quelque
  // chose ». Quatre de ces six blocs n'y figuraient pas : l'editeur ne savait donc pas
  // qu'ils disparaissaient en ligne. Ce test verifie que le registre et le rendu public
  // repondent la meme chose, cas par cas.
  const cas: Array<[string, any, Record<string, any>, boolean]> = [
    ["logo_wall", PublicLogoWall, {}, false],
    ["logo_wall", PublicLogoWall, { logo1: "https://x.co/a.png" }, false],
    ["logo_wall", PublicLogoWall, { logo1_name: "Acme" }, true],
    ["logo_wall", PublicLogoWall, { logo1_name: "   " }, false],
    ["partners", PublicPartners, {}, false],
    ["partners", PublicPartners, { logo1_name: "Acme" }, true],
    ["certifications", PublicCertifications, {}, false],
    ["certifications", PublicCertifications, { cert_1_org: "AFNOR" }, false],
    ["certifications", PublicCertifications, { cert_3_name: "ISO" }, true],
    ["business_certifications", PublicBusinessCertifications, {}, false],
    ["business_certifications", PublicBusinessCertifications, { c2_name: "Qualibat" }, true],
    ["info_table", PublicInfoTable, {}, false],
    ["info_table", PublicInfoTable, { r1_value: "40" }, false],
    ["info_table", PublicInfoTable, { r1_label: "Places" }, true],
    ["legal_info", PublicLegalInfo, {}, false],
    ["legal_info", PublicLegalInfo, { title: "Mentions" }, false],
    ["legal_info", PublicLegalInfo, { rcs: "Reims B 123" }, true],
  ]
  for (const [type, Pub, contenu, publiable] of cas) {
    it(type + " " + JSON.stringify(contenu) + " -> " + (publiable ? "publie" : "invisible"), () => {
      expect(hasPublishableContent(type, contenu)).toBe(publiable)
      expect(Pub({ content: contenu, ctx: pCtx() } as any) !== null).toBe(publiable)
    })
  }
})
