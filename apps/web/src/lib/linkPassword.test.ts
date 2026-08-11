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
