import { describe, it, expect } from "vitest"
import { readFileSync } from "node:fs"
import { join } from "node:path"
import { cycleDe, echeance } from "./cycleAbonnement"

// « Mensuel / Annuel −20 % » sur la page Profil était un état local : on croyait
// passer en annuel et on restait facturé au mois. Le cycle vient désormais de la
// ligne d'abonnement, et se change dans le portail Stripe.

describe("cycleDe", () => {
  it("un mois → mensuel, un an → annuel", () => {
    expect(cycleDe({ current_period_start: "2026-09-01T00:00:00Z", current_period_end: "2026-10-01T00:00:00Z" })).toBe("monthly")
    expect(cycleDe({ current_period_start: "2026-09-01T00:00:00Z", current_period_end: "2027-09-01T00:00:00Z" })).toBe("annual")
  })
  it("sans dates, on ne devine pas", () => {
    expect(cycleDe(null)).toBeNull()
    expect(cycleDe({ current_period_start: "x", current_period_end: "y" })).toBeNull()
  })
})

describe("echeance", () => {
  const now = Date.parse("2026-09-05T00:00:00Z")
  it("renouvellement pour un abonnement vivant", () => {
    expect(echeance({ current_period_end: "2026-10-01T00:00:00Z" }, now)).toEqual({ libelle: "Renouvellement le", date: "1 octobre 2026" })
  })
  it("« se termine » quand la résiliation est programmée", () => {
    expect(echeance({ current_period_end: "2026-10-01T00:00:00Z", cancel_at_period_end: true }, now)?.libelle).toBe("Se termine le")
  })
  it("rien pour une période déjà passée", () => {
    expect(echeance({ current_period_end: "2026-08-01T00:00:00Z" }, now)).toBeNull()
  })
})

describe("la page Profil", () => {
  const src = readFileSync(join(__dirname, "../app/dashboard/profile/page.tsx"), "utf8")
  it("n'a plus de faux interrupteur de cycle", () => {
    expect(src).not.toContain("setSubCycle(c)")
    expect(src).not.toContain('"Annuel -20%"')
  })
  it("lit la ligne d'abonnement et envoie au portail pour changer", () => {
    expect(src).toContain('from("subscriptions")')
    expect(src).toContain("cycleDe(")
    expect(src).toContain("echeance(")
  })
  it("le bouton du portail a un état de chargement (double clic = deux portails)", () => {
    expect(src).toContain("portalLoading")
    const i = src.indexOf('fetch("/api/stripe/portal"')
    const bloc = src.slice(i - 400, i + 700)
    expect(bloc).toContain("if (portalLoading) return")
    expect(bloc).toContain("setPortalLoading(false)")
  })
})
