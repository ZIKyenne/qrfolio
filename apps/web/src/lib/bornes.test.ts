import { describe, it, expect } from "vitest"
import { readFileSync } from "node:fs"
import { join } from "node:path"
import { texte, entier, entierOuNull, couleurHex, parmi, objetBorne, tableauBorne, champs, uuidOuNull } from "./bornes"

describe("bornes", () => {
  it("texte : chaîne bornée, sinon null", () => {
    expect(texte("  bonjour ", 3)).toBe("bon")
    expect(texte("", 10)).toBeNull()
    expect(texte(42, 10)).toBeNull()
    expect(texte({ toString: () => "x" }, 10)).toBeNull()
  })
  it("entier : borné et avec défaut", () => {
    expect(entier("400", 1, 365, 30)).toBe(365)
    expect(entier(undefined, 1, 365, 30)).toBe(30)
    expect(entier(2.9, 1, 365, 30)).toBe(2)
    expect(entierOuNull("", 1, 10)).toBeNull()
    expect(entierOuNull(-5, 1, 10)).toBe(1)
  })
  it("couleur et énumération", () => {
    expect(couleurHex("#c9a84c", "#000000")).toBe("#C9A84C")
    expect(couleurHex("red", "#000000")).toBe("#000000")
    expect(parmi("phone", ["phone", "email"] as const, "email")).toBe("phone")
    expect(parmi("ftp", ["phone", "email"] as const, "email")).toBe("email")
  })
  it("objet et tableau bornés en octets et en éléments", () => {
    expect(objetBorne({ a: 1 }, 100)).toEqual({ a: 1 })
    expect(objetBorne({ a: "x".repeat(200) }, 100)).toBeNull()
    expect(objetBorne([1], 100)).toBeNull()
    expect(objetBorne(null, 100)).toBeNull()
    expect(tableauBorne([1, 2, 3], 2, 1000)).toBeNull()
    expect(tableauBorne([1, 2], 2, 1000)).toEqual([1, 2])
    expect(tableauBorne(["x".repeat(2000)], 5, 100)).toBeNull()
  })
  it("champs : liste blanche, jamais __proto__", () => {
    const entree = JSON.parse('{"a":1,"b":2,"__proto__":{"x":1},"constructor":"y"}')
    expect(champs(entree, ["a", "__proto__"] as const)).toEqual({ a: 1 })
    expect(champs(null, ["a"] as const)).toEqual({})
  })
  it("uuid", () => {
    expect(uuidOuNull("11111111-1111-4111-8111-111111111111")).toBe("11111111-1111-4111-8111-111111111111")
    expect(uuidOuNull("1 or 1=1")).toBeNull()
  })
})

// Relevé du 4 septembre : charges persistées sans borne.
describe("les routes bornent avant d'écrire", () => {
  const lire = (p: string) => readFileSync(join(__dirname, "../app/api", p), "utf8")
  it("templates/use : 200 blocs, 600 Ko, thème 40 Ko", () => {
    const s = lire("templates/use/route.ts")
    expect(s).toContain("tableauBorne(body.blocks, 200, 600_000)")
    expect(s).toContain("objetBorne(body.theme, 40_000)")
    expect(s).toContain("status: 413")
  })
  it("qr-instant : inputs et style 16 Ko", () => {
    expect(lire("qr-instant/route.ts")).toContain("objetBorne(body?.inputs, 16_000)")
  })
  it("print-design : design 64 Ko", () => {
    expect(lire("print-design/route.ts")).toContain("objetBorne(design, 64_000)")
  })
  it("qr-status : pause_message typé et borné, qr_id un uuid", () => {
    const s = lire("qr-status/route.ts")
    expect(s).toContain("texte(body?.pause_message, 300)")
    expect(s).toContain("uuidOuNull(body?.qr_id)")
  })
  it("goals : chaque champ borné, page_id vérifié comme appartenant au compte", () => {
    const s = lire("goals/route.ts")
    expect(s).toContain('.eq("id", page_id).eq("user_id", userId)')
    expect(s).toContain("entier(body?.period_days, 1, 365, 30)")
    expect(s).toContain('couleurHex(body?.color, "#C9A84C")')
    expect(s).not.toContain("page_id:      page_id || null")
  })
  it("leads : data 8 Ko", () => {
    expect(lire("leads/route.ts")).toContain("objetBorne(body.data, 8_000)")
  })
})
