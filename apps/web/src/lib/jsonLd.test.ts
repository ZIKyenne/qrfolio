import { describe, it, expect } from "vitest"
import { serializeJsonLd } from "./jsonLd"

describe("serializeJsonLd (anti-XSS JSON-LD)", () => {
  it("neutralise une évasion </script> dans une valeur utilisateur", () => {
    const out = serializeJsonLd({ name: "</script><script>alert(1)</script>" })
    // Plus aucune balise littérale exploitable par l'analyseur HTML
    expect(out).not.toContain("</script>")
    expect(out).not.toContain("<script>")
    expect(out).toContain("\\u003c")
  })

  it("reste du JSON valide qui round-trip vers l'objet d'origine", () => {
    const data = { name: "A < B & C > D", "@type": "Person" }
    expect(JSON.parse(serializeJsonLd(data))).toEqual(data)
  })

  it("échappe <, > et &", () => {
    const out = serializeJsonLd({ v: "<>&" })
    expect(out).toContain("\\u003c")
    expect(out).toContain("\\u003e")
    expect(out).toContain("\\u0026")
    expect(out).not.toMatch(/[<>&]/)
  })

  it("laisse un contenu normal round-tripper", () => {
    const data = { name: "Café de la Gare", url: "https://qrowg.com/cafe" }
    expect(JSON.parse(serializeJsonLd(data))).toEqual(data)
  })
})
