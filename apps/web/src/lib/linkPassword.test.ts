import { describe, it, expect } from "vitest"
import { hashLinkPassword, verifyLinkPassword } from "./linkPassword"

describe("linkPassword", () => {
  it("vérifie le bon mot de passe", () => {
    const h = hashLinkPassword("secret42")
    expect(verifyLinkPassword("secret42", h)).toBe(true)
  })

  it("rejette un mauvais mot de passe", () => {
    const h = hashLinkPassword("secret42")
    expect(verifyLinkPassword("secret43", h)).toBe(false)
    expect(verifyLinkPassword("", h)).toBe(false)
  })

  it("sel aléatoire : deux hachages du même mot de passe diffèrent", () => {
    expect(hashLinkPassword("abc")).not.toBe(hashLinkPassword("abc"))
  })

  it("entrées invalides -> false (jamais d'exception)", () => {
    expect(verifyLinkPassword("x", null)).toBe(false)
    expect(verifyLinkPassword("x", "")).toBe(false)
    expect(verifyLinkPassword("x", "pasdeformat")).toBe(false)
    expect(verifyLinkPassword("x", "zz:zz")).toBe(false)
  })
})

import { readFileSync } from "node:fs"
import { join } from "node:path"
import { mdpLienTropLong, LONGUEUR_MAX_MDP_LIEN } from "./linkPassword"

// scryptSync sur un mot de passe non borné bloquait le thread ; et le mot de passe
// du lien protégé voyageait en GET (?pw=…), dans l'historique et les journaux,
// vérifié avant tout rate-limit.
describe("mot de passe de lien : borne et transport", () => {
  it("refuse au-delà de 128 caractères, au hachage comme à la vérification", () => {
    const long = "a".repeat(LONGUEUR_MAX_MDP_LIEN + 1)
    expect(mdpLienTropLong(long)).toBe(true)
    expect(() => hashLinkPassword(long)).toThrow(RangeError)
    expect(verifyLinkPassword(long, hashLinkPassword("ok"))).toBe(false)
    expect(mdpLienTropLong("a".repeat(LONGUEUR_MAX_MDP_LIEN))).toBe(false)
  })

  it("la route d'édition refuse avant de hacher", () => {
    const src = readFileSync(join(__dirname, "../app/api/qr-instant/route.ts"), "utf8")
    expect(src.indexOf("if (mdpLienTropLong(pw))")).toBeLessThan(src.indexOf("hashLinkPassword(pw)"))
  })

  it("le formulaire du lien protégé est en POST et limité avant vérification", () => {
    const src = readFileSync(join(__dirname, "../app/q/[code]/route.ts"), "utf8")
    expect(src).toContain('<form method="post"')
    expect(src).not.toContain('<form method="get"')
    expect(src).not.toContain('searchParams.get("pw")')
    expect(src).toContain("export async function POST(")
    const bloc = src.slice(src.indexOf("if (inst.password_hash) {"), src.indexOf("viaFormulaire = true"))
    expect(bloc.indexOf("rateLimit(`pw:${code}:${ipOf(req)}`")).toBeLessThan(bloc.indexOf("verifyLinkPassword(pw"))
    expect(bloc).toContain("pw.length > 128")
  })
})
