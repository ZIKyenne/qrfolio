import { describe, it, expect } from "vitest"
import { normalizeDomain, isValidDomain } from "./domain"

describe("normalizeDomain", () => {
  it("retire protocole, www, chemin et met en minuscule", () => {
    expect(normalizeDomain("https://www.Example.com/")).toBe("example.com")
    expect(normalizeDomain("  HTTP://Example.COM/path/to  ")).toBe("example.com")
    expect(normalizeDomain("http://sous.example.fr/page?x=1")).toBe("sous.example.fr")
  })
  it("laisse un domaine deja propre", () => {
    expect(normalizeDomain("example.com")).toBe("example.com")
    expect(normalizeDomain("sous.example.co.uk")).toBe("sous.example.co.uk")
  })
  it("retire uniquement le www de tete (pas 'www' au milieu)", () => {
    expect(normalizeDomain("www.example.com")).toBe("example.com")
    expect(normalizeDomain("wwwexemple.com")).toBe("wwwexemple.com")
  })
  it("entree vide / nulle -> chaine vide", () => {
    expect(normalizeDomain("")).toBe("")
    expect(normalizeDomain(null as unknown as string)).toBe("")
  })
})

describe("isValidDomain", () => {
  it("accepte les domaines valides", () => {
    expect(isValidDomain("example.com")).toBe(true)
    expect(isValidDomain("sous.example.co.uk")).toBe(true)
    expect(isValidDomain("mon-site-2024.fr")).toBe(true)
  })
  it("rejette les formats invalides", () => {
    expect(isValidDomain("example")).toBe(false)        // pas de TLD
    expect(isValidDomain("-example.com")).toBe(false)   // tiret de tete
    expect(isValidDomain("example-.com")).toBe(false)   // tiret de fin de label
    expect(isValidDomain("exa mple.com")).toBe(false)   // espace
    expect(isValidDomain("example.com/foo")).toBe(false) // chemin
    expect(isValidDomain("")).toBe(false)
  })
  it("un domaine normalise puis valide est coherent", () => {
    expect(isValidDomain(normalizeDomain("https://www.Mon-Site.FR/contact"))).toBe(true)
  })
  it("rejette les litteraux IPv4 (defense anti-SSRF)", () => {
    expect(isValidDomain("127.0.0.1")).toBe(false)
    expect(isValidDomain("169.254.169.254")).toBe(false) // metadonnees cloud
    expect(isValidDomain("10.0.0.1")).toBe(false)
    expect(isValidDomain("192.168.1.1")).toBe(false)
  })
})
