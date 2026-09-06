import { describe, it, expect } from "vitest"
import { readFileSync, readdirSync, existsSync } from "node:fs"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"

// Ces tests lisent les FICHIERS, pas des valeurs recopiees. Une regle pinee sur une
// constante recopiee ne prouve rien : le bug de production etait justement que le
// code et le test etaient d'accord entre eux, et que seule la base disait non.

// Chemins deduits de l'emplacement DU TEST, pas du repertoire courant : vitest est
// lance tantot depuis apps/web, tantot depuis la racine du depot.
const ici = dirname(fileURLToPath(import.meta.url))
const route = readFileSync(join(ici, "route.ts"), "utf-8")
const logique = readFileSync(join(ici, "../../../../lib/webhookLogic.ts"), "utf-8")

function remonterVers(cible: string): string {
  let d = ici
  for (let i = 0; i < 10; i++) {
    if (existsSync(join(d, cible))) return join(d, cible)
    d = dirname(d)
  }
  throw new Error(`introuvable en remontant : ${cible}`)
}
const migrations = remonterVers(join("supabase", "migrations"))

describe("l'abonnement s'enregistre vraiment", () => {
  it("une contrainte UNIQUE existe sur subscriptions(user_id)", () => {
    // Sans elle, l'UPSERT du webhook est refuse par Postgres en 42P10 :
    // « there is no unique or exclusion constraint matching the ON CONFLICT
    // specification ». Verifie sur la base de production le 31/08/2026.
    const sql = readdirSync(migrations).sort()
      .filter(f => f.endsWith(".sql"))
      .map(f => readFileSync(join(migrations, f), "utf-8"))
      .join("\n")
    const pose = /create\s+unique\s+index[^;]*\bon\b[^;]*\bsubscriptions\b\s*\(\s*user_id\s*\)/i.test(sql)
      || /alter\s+table[^;]*subscriptions[^;]*add\s+constraint[^;]*unique\s*\(\s*user_id\s*\)/i.test(sql)
    expect(pose).toBe(true)
  })

  it("la cible de conflit de l'upsert est bien user_id", () => {
    // Si quelqu'un change la cible sans changer la contrainte, on retombe en 42P10.
    const cibles = [...route.matchAll(/onConflict:\s*"([^"]+)"/g)].map(m => m[1])
    expect(cibles.length).toBeGreaterThan(0)
    for (const c of cibles) expect(c).toBe("user_id")
  })

  it("aucun statut d'abonnement n'est ecrit en dur dans la route", () => {
    // « trialing » etait code en dur : un client qui venait de payer etait
    // enregistre comme etant en essai gratuit. Le statut vient de Stripe.
    expect(/status:\s*"trialing"/.test(route)).toBe(false)
  })

  it("la branche checkout n'ecrit aucun statut", () => {
    // Stripe ne garantit pas l'ordre des evenements : si `subscription.created`
    // arrive en premier, un statut ecrit par le checkout ecraserait la verite.
    const branche = route.slice(route.indexOf('case "checkout_completed"'), route.indexOf('case "subscription_updated"'))
    expect(branche.length).toBeGreaterThan(100)
    expect(/status:/.test(branche)).toBe(false)
  })

  it("chaque ecriture du webhook est verifiee", () => {
    // supabase-js ne leve pas d'exception : une ecriture refusee revient dans un
    // objet { error }. Non lu, le webhook repondait « received: true » a Stripe
    // sans avoir rien ecrit, et l'evenement etait perdu definitivement.
    const lignes = route.split("\n")
    const nonVerifiees = lignes.filter(l =>
      /\bsupabase\s*\n?\s*\.?from\("(profiles|subscriptions)"\)/.test(l) &&
      /\.(update|upsert|insert|delete)\(/.test(l) &&
      !/ecrire\(/.test(l),
    )
    expect(nonVerifiees).toEqual([])
  })

  it("aucune conversion de date sans garde dans la route", () => {
    // `new Date(undefined * 1000).toISOString()` leve « Invalid time value » et
    // fait repondre 500. Constate en production le 01/09/2026 : trois webhooks
    // perdus, l'annulation jamais enregistree.
    const conversions = [...route.matchAll(/^.*new Date\([^)]*\* 1000\).*$/gm)].map(m => m[0])
    expect(conversions.length).toBeGreaterThan(0)
    for (const l of conversions) expect(/\?|\.\.\.\(/.test(l)).toBe(true)
  })

  it("les dates de periode sont lues sur la ligne d'abonnement", () => {
    // Depuis l'API Stripe 2025-03-31, elles ne sont plus sur l'abonnement.
    expect(logique).toContain("items?.data?.[0]")
    expect(logique).toContain("current_period_start")
  })

  it("un echec d'ecriture fait repondre 500, pour que Stripe rejoue", () => {
    expect(/echecs\.length/.test(route)).toBe(true)
    expect(/status:\s*500/.test(route)).toBe(true)
  })

  it("subscription.created est ecoute, pas seulement updated", () => {
    // Sinon les dates de periode d'un abonnement neuf n'arrivent qu'au premier
    // renouvellement, un mois plus tard.
    expect(logique).toContain('case "customer.subscription.created"')
  })
})
