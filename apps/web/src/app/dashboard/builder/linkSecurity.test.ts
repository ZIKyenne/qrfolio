import { describe, it, expect } from "vitest"
import { extHref } from "./types"
import { URL_FIXTURES } from "./blockFixtures"

// Matrice canonique de sécurité des liens. `extHref` est le sanitizer UNIQUE utilisé par
// TOUS les blocs à lien (cta, pricing, product, banner, documents, download…). Ce test fige
// son comportement — filet avant l'unification des renderers.

describe("extHref — matrice de sécurité des liens", () => {
  it("http(s) conservés tels quels", () => {
    expect(extHref(URL_FIXTURES.https)).toBe("https://example.com")
    expect(extHref(URL_FIXTURES.http)).toBe("http://example.com")
  })
  it("lien interne / ancre conservés", () => {
    expect(extHref(URL_FIXTURES.internal)).toBe("/interne")
    expect(extHref(URL_FIXTURES.anchor)).toBe("#section")
  })
  it("mailto / tel / sms conservés", () => {
    expect(extHref(URL_FIXTURES.mailto)).toBe("mailto:test@example.com")
    expect(extHref(URL_FIXTURES.tel)).toBe("tel:+33123456789")
    expect(extHref(URL_FIXTURES.sms)).toBe("sms:+33123456789")
  })
  it("vide / espaces → chaîne vide (pas de href piégé)", () => {
    expect(extHref(URL_FIXTURES.empty)).toBe("")
    expect(extHref(URL_FIXTURES.spaces)).toBe("")
    expect(extHref(undefined)).toBe("")
  })
  it("javascript: NEUTRALISÉ (jamais un schéma exécutable)", () => {
    const out = extHref(URL_FIXTURES.javascript)
    expect(out.startsWith("javascript:")).toBe(false)
    expect(out).toBe("https://javascript:alert(1)")
  })
  it("domaine nu → préfixé https", () => {
    expect(extHref(URL_FIXTURES.bareDomain)).toBe("https://example.com/page")
  })
  it("valeur arbitraire → préfixée https (jamais de schéma dangereux)", () => {
    const out = extHref(URL_FIXTURES.arbitrary)
    expect(out.startsWith("https://")).toBe(true)
    expect(/^(javascript|data|vbscript):/i.test(out)).toBe(false)
  })
  it("URL très longue http(s) conservée sans plantage", () => {
    expect(extHref(URL_FIXTURES.long).startsWith("https://example.com/")).toBe(true)
  })
  it("aucune sortie ne produit un schéma exécutable, quelle que soit l'entrée", () => {
    for (const v of Object.values(URL_FIXTURES)) {
      expect(/^\s*(javascript|data|vbscript):/i.test(extHref(v))).toBe(false)
    }
  })
})
