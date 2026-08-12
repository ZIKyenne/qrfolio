import { describe, it, expect } from "vitest"
import { lum, contrast, normalizeUrl, escapeWifi, buildWifi, escapeVCard, buildVCard, buildTel, buildEmail, buildSms, isInverted } from "./qrLinkUtils"

describe("isInverted", () => {
  it("clair sur fond sombre = inverse (a eviter)", () => {
    expect(isInverted("#FFFFFF", "#000000")).toBe(true)
    expect(isInverted("#F5F0E8", "#111111")).toBe(true)
  })
  it("sombre sur fond clair = normal", () => {
    expect(isInverted("#080808", "#FFFFFF")).toBe(false)
    expect(isInverted("#1D4ED8", "#FEF3C7")).toBe(false)
  })
})

describe("buildSms", () => {
  it("format SMSTO avec numero nettoye et message", () => {
    expect(buildSms("+33 6 12 34 56 78", "Bonjour")).toBe("SMSTO:+33612345678:Bonjour")
  })
  it("sans message = numero seul (pas de : superflu)", () => {
    expect(buildSms("0612345678")).toBe("SMSTO:0612345678")
  })
  it("message vide/espaces ignore", () => {
    expect(buildSms("06", "   ")).toBe("SMSTO:06")
  })
  it("numero vide = chaine vide", () => {
    expect(buildSms("")).toBe("")
    expect(buildSms("   ", "salut")).toBe("")
  })
})

describe("buildTel", () => {
  it("prefixe tel: et ne garde que chiffres et +", () => {
    expect(buildTel("+33 6 00 00 00 00")).toBe("tel:+33600000000")
    expect(buildTel("01.23.45.67.89")).toBe("tel:0123456789")
  })
  it("vide -> chaine vide", () => {
    expect(buildTel("")).toBe("")
    expect(buildTel("   ")).toBe("")
  })
})

describe("buildEmail", () => {
  it("mailto simple", () => {
    expect(buildEmail("contact@resto.fr")).toBe("mailto:contact@resto.fr")
  })
  it("ajoute sujet et corps encodes", () => {
    expect(buildEmail("a@b.fr", "Réservation", "Bonjour, une table ?"))
      .toBe("mailto:a@b.fr?subject=R%C3%A9servation&body=Bonjour%2C%20une%20table%20%3F")
  })
  it("n'ajoute que les params fournis", () => {
    expect(buildEmail("a@b.fr", "", "Salut")).toBe("mailto:a@b.fr?body=Salut")
  })
  it("adresse vide -> chaine vide", () => {
    expect(buildEmail("", "x", "y")).toBe("")
  })
})

describe("buildVCard", () => {
  it("construit une vCard 3.0 complete", () => {
    const out = buildVCard({ firstName: "Marie", lastName: "Durand", phone: "+33600000000", email: "marie@resto.fr", org: "Le Resto", title: "Gerante", url: "resto.fr" })
    expect(out).toContain("BEGIN:VCARD")
    expect(out).toContain("VERSION:3.0")
    expect(out).toContain("N:Durand;Marie;;;")
    expect(out).toContain("FN:Marie Durand")
    expect(out).toContain("ORG:Le Resto")
    expect(out).toContain("TITLE:Gerante")
    expect(out).toContain("TEL;TYPE=CELL:+33600000000")
    expect(out).toContain("EMAIL;TYPE=INTERNET:marie@resto.fr")
    expect(out).toContain("URL:https://resto.fr")
    expect(out.endsWith("END:VCARD")).toBe(true)
  })
  it("omet les champs vides", () => {
    const out = buildVCard({ firstName: "Marie" })
    expect(out).toContain("FN:Marie")
    expect(out).not.toContain("ORG:")
    expect(out).not.toContain("TEL")
    expect(out).not.toContain("EMAIL")
  })
  it("nom requis : sans prenom ni nom -> chaine vide", () => {
    expect(buildVCard({ phone: "+33600000000", email: "x@y.fr" })).toBe("")
    expect(buildVCard({})).toBe("")
  })
  it("echappe les caracteres speciaux", () => {
    expect(escapeVCard("Durand, Marie; SARL")).toBe("Durand\\, Marie\\; SARL")
    expect(buildVCard({ firstName: "Jean", org: "Dupont; Fils" })).toContain("ORG:Dupont\\; Fils")
  })
})

describe("buildWifi", () => {
  it("construit une charge WIFI standard (WPA)", () => {
    expect(buildWifi("MonResto", "secret123", "WPA")).toBe("WIFI:T:WPA;S:MonResto;P:secret123;;")
  })
  it("reseau ouvert : type nopass, mot de passe vide", () => {
    expect(buildWifi("FreeWifi", "ignore", "nopass")).toBe("WIFI:T:nopass;S:FreeWifi;P:;;")
  })
  it("echappe les caracteres speciaux", () => {
    expect(escapeWifi('a;b,c:d"e\\f')).toBe('a\\;b\\,c\\:d\\"e\\\\f')
    expect(buildWifi("Cafe;Bar", "p:w", "WPA")).toBe("WIFI:T:WPA;S:Cafe\\;Bar;P:p\\:w;;")
  })
  it("SSID vide -> chaine vide", () => {
    expect(buildWifi("", "x", "WPA")).toBe("")
    expect(buildWifi("   ", "x", "WPA")).toBe("")
  })
})

describe("normalizeUrl", () => {
  it("ajoute https:// quand aucun schema", () => {
    expect(normalizeUrl("monsite.fr")).toBe("https://monsite.fr")
    expect(normalizeUrl("instagram.com/moncompte")).toBe("https://instagram.com/moncompte")
  })
  it("laisse intacts les schemas reconnus", () => {
    expect(normalizeUrl("https://x.com")).toBe("https://x.com")
    expect(normalizeUrl("http://x.com")).toBe("http://x.com")
    expect(normalizeUrl("mailto:a@b.com")).toBe("mailto:a@b.com")
    expect(normalizeUrl("tel:+33600000000")).toBe("tel:+33600000000")
  })
  it("gere le vide et les espaces", () => {
    expect(normalizeUrl("")).toBe("")
    expect(normalizeUrl("   ")).toBe("")
    expect(normalizeUrl("  x.com  ")).toBe("https://x.com")
  })
})

describe("lum + contrast", () => {
  it("luminance : blanc ~1, noir ~0", () => {
    expect(lum("#FFFFFF")).toBeCloseTo(1, 4)
    expect(lum("#000000")).toBeCloseTo(0, 4)
  })
  it("contraste noir vs blanc = 21", () => {
    expect(contrast("#000000", "#FFFFFF")).toBeCloseTo(21, 5)
  })
  it("contraste couleurs identiques = 1", () => {
    expect(contrast("#C9A84C", "#C9A84C")).toBeCloseTo(1, 5)
  })
  it("contraste est symetrique", () => {
    expect(contrast("#080808", "#FEF3C7")).toBeCloseTo(contrast("#FEF3C7", "#080808"), 6)
  })
  it("gris clair sur blanc = faible contraste (<2.5, avertissement)", () => {
    expect(contrast("#CCCCCC", "#FFFFFF")).toBeLessThan(2.5)
  })
  it("noir sur blanc = bon contraste (>=2.5)", () => {
    expect(contrast("#080808", "#FFFFFF")).toBeGreaterThanOrEqual(2.5)
  })
})
