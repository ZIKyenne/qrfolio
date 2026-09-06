import { describe, it, expect } from "vitest"
import { readFileSync } from "node:fs"
import { join, dirname } from "node:path"
import { fileURLToPath } from "node:url"

// Un abonné qui relançait un checkout obtenait un DEUXIÈME abonnement Stripe ;
// l'upsert du webhook (une ligne par compte) écrasait le premier, qui restait
// facturé et invisible.

const ici = dirname(fileURLToPath(import.meta.url))
const route = readFileSync(join(ici, "checkout", "route.ts"), "utf8")
const page = readFileSync(join(ici, "..", "..", "upgrade", "page.tsx"), "utf8")

describe("pas de double abonnement", () => {
  it("le serveur refuse une seconde caisse à qui a déjà un abonnement en cours", () => {
    expect(route).toContain('stripe.subscriptions.list({ customer: customerId, status: "all"')
    expect(route).toContain("portal: true")
    expect(route).toContain("{ status: 409 }")
  })
  it("la caisse est rattachée au client Stripe existant, sinon à son e-mail", () => {
    expect(route).toContain("...(customerId ? { customer: customerId } : { customer_email: user.email ?? undefined })")
  })
  it("le plan est validé comme clé propre (plus de « constructor »)", () => {
    expect(route).toContain('typeof plan === "string" && Object.hasOwn(PRICE_IDS, plan)')
    expect(route).not.toContain("Object.prototype.hasOwnProperty.call(PRICE_IDS, plan)")
  })
  it("la page Tarifs envoie l'abonné vers le portail au lieu d'un bouton mort", () => {
    expect((page.match(/if \(data\.portal\) \{ await ouvrirPortail\(\); return \}/g) || []).length).toBe(2)
    expect(page).toContain('fetch("/api/stripe/portal", { method: "POST" })')
  })
})
