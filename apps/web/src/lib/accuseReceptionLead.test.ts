import { describe, it, expect } from "vitest"
import { prenomAffichable, accuseActive, estEmail } from "./accuseReceptionLead"

describe("accusé de réception", () => {
  it("le prénom affiché est court, sans balise ni retour à la ligne", () => {
    expect(prenomAffichable("  Marie ")).toBe("Marie")
    expect(prenomAffichable("<b>x</b>\nURGENT cliquez ici")).toBe("b x /b  URGENT cliquez ici")
    expect(prenomAffichable("a".repeat(200))).toHaveLength(60)
    expect(prenomAffichable(null)).toBe("")
  })
  it("le propriétaire peut le désactiver ; activé par défaut", () => {
    expect(accuseActive(null)).toBe(true)
    expect(accuseActive({})).toBe(true)
    expect(accuseActive({ lead_confirmation: false })).toBe(false)
  })
  it("estEmail", () => {
    expect(estEmail("a@b.fr")).toBe(true)
    expect(estEmail("pas un email")).toBe(false)
    expect(estEmail(null)).toBe(false)
  })
})
