import { describe, it, expect } from "vitest"
import { parseBulkCsv, normalizeBulkUrl } from "./bulkCsv"

describe("normalizeBulkUrl", () => {
  it("ajoute https:// aux domaines nus", () => {
    expect(normalizeBulkUrl("monsite.fr")).toBe("https://monsite.fr/")
    expect(normalizeBulkUrl("https://x.com/page")).toBe("https://x.com/page")
  })
  it("rejette ce qui n'est pas une URL", () => {
    expect(normalizeBulkUrl("bonjour")).toBeNull()   // pas de point
    expect(normalizeBulkUrl("")).toBeNull()
    expect(normalizeBulkUrl("ftp://x.com")).toBeNull() // pas http(s)
  })
})

describe("parseBulkCsv", () => {
  it("2 colonnes label,url avec en-tête", () => {
    const p = parseBulkCsv("label,url\nMon site,monsite.fr\nInsta,instagram.com/moi")
    expect(p.validCount).toBe(2)
    expect(p.rows[0]).toMatchObject({ label: "Mon site", dest: "https://monsite.fr/", valid: true })
    expect(p.rows[1]).toMatchObject({ label: "Insta", dest: "https://instagram.com/moi", valid: true })
  })

  it("délimiteur point-virgule (Excel FR)", () => {
    const p = parseBulkCsv("nom;lien\nPromo;exemple.fr/promo")
    expect(p.validCount).toBe(1)
    expect(p.rows[0]).toMatchObject({ label: "Promo", dest: "https://exemple.fr/promo" })
  })

  it("une seule colonne (URL seule) : libellé = hôte", () => {
    const p = parseBulkCsv("monsite.fr\nwww.exemple.com/x")
    expect(p.validCount).toBe(2)
    expect(p.rows[0].label).toBe("monsite.fr")
    expect(p.rows[1].label).toBe("exemple.com") // www. retiré
  })

  it("sans en-tête, détecte la colonne URL quel que soit l'ordre", () => {
    expect(parseBulkCsv("Mon libellé,monsite.fr").rows[0]).toMatchObject({ label: "Mon libellé", dest: "https://monsite.fr/" })
    expect(parseBulkCsv("monsite.fr,Mon libellé").rows[0]).toMatchObject({ label: "Mon libellé", dest: "https://monsite.fr/" })
  })

  it("gère les guillemets (virgule dans le libellé)", () => {
    const p = parseBulkCsv('label,url\n"Boutique, centre-ville",boutique.fr')
    expect(p.rows[0]).toMatchObject({ label: "Boutique, centre-ville", dest: "https://boutique.fr/" })
  })

  it("marque les lignes invalides sans planter", () => {
    const p = parseBulkCsv("url\nmonsite.fr\npas une url\n")
    expect(p.validCount).toBe(1)
    expect(p.rows[1]).toMatchObject({ valid: false, error: "URL invalide" })
  })

  it("borne à `max` et compte le surplus (truncated)", () => {
    const many = "url\n" + Array.from({ length: 5 }, (_, i) => `site${i}.fr`).join("\n")
    const p = parseBulkCsv(many, 3)
    expect(p.rows).toHaveLength(3)
    expect(p.truncated).toBe(2)
  })

  it("entrée vide -> aucun résultat", () => {
    expect(parseBulkCsv("")).toEqual({ rows: [], validCount: 0, truncated: 0 })
  })
})
