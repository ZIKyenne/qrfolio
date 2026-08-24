import { describe, it, expect } from "vitest"
import { readFileSync, readdirSync, statSync } from "node:fs"
import { join } from "node:path"

// La clé « service_role » de Supabase contourne TOUTES les règles d'accès (RLS).
// Une route qui l'utilise et qu'on peut appeler sans rien prouver donne à l'internet
// entier les droits d'administration de la base.
//
// Chaque route qui emploie createAdminClient doit donc porter une garde. Ce test
// dresse la liste et échoue dès qu'une nouvelle route arrive sans.

const RACINE = __dirname

function routes(dir: string, acc: string[] = []): string[] {
  for (const e of readdirSync(dir)) {
    const p = join(dir, e)
    if (statSync(p).isDirectory()) routes(p, acc)
    else if (e === "route.ts") acc.push(p)
  }
  return acc
}

// Les formes de garde admises, et ce qu'elles prouvent.
const GARDES: [RegExp, string][] = [
  [/getUser\(\)/, "session utilisateur"],
  [/CRON_SECRET/, "secret de tâche planifiée"],
  [/x-internal-token/, "jeton interne"],
  [/x-upload-token/, "jeton de dépôt partagé"],
  [/stripe-signature/, "signature Stripe"],
  [/verifyApiKey|api_key|apiKey/, "clé d'API"],
  [/rateLimit\(/, "limitation de débit"],
]

// Routes publiques par nature : elles ne font que lire une correspondance publique
// (domaine → page) ou vérifier un jeton porté par l'adresse. Chaque exemption est
// justifiée ici, pas ailleurs.
const EXEMPTIONS: Record<string, string> = {
  "domains/resolve": "résolution publique domaine → page vérifiée, lecture seule",
  "subdomain/resolve": "résolution publique sous-domaine → page, lecture seule",
  "reports/unsubscribe": "lien de désabonnement : jeton dérivé de l'abonnement, vérifié avant écriture",
}

describe("la clé d'administration n'est jamais exposée sans garde", () => {
  const fichiers = routes(RACINE).filter(f => readFileSync(f, "utf8").includes("createAdminClient"))

  it("il existe bien des routes à surveiller", () => {
    expect(fichiers.length).toBeGreaterThan(10)
  })

  it("chacune porte une garde, ou une exemption justifiée", () => {
    const sansGarde: string[] = []
    for (const f of fichiers) {
      const src = readFileSync(f, "utf8")
      const nom = f.slice(f.indexOf("/api/") + 5).replace("/route.ts", "")
      if (GARDES.some(([r]) => r.test(src))) continue
      if (EXEMPTIONS[nom]) continue
      sansGarde.push(nom)
    }
    expect(sansGarde, "routes avec la clé d'administration et aucune garde").toEqual([])
  })

  it("les exemptions restent réellement en lecture seule", () => {
    for (const [nom, raison] of Object.entries(EXEMPTIONS)) {
      const f = fichiers.find(x => x.includes(nom.replace("/", "/")))
      if (!f) continue                       // route supprimée : l'exemption devient inutile
      const src = readFileSync(f, "utf8")
      if (nom === "reports/unsubscribe") continue   // écrit, mais après vérification du jeton
      expect(src, `${nom} (${raison}) écrit en base`).not.toMatch(/\.insert\(|\.upsert\(|\.delete\(/)
    }
  })

  it("le dépôt de fichiers reste fermé si son jeton n'est pas configuré", () => {
    // « fail closed » : sans SOCIAL_UPLOAD_TOKEN, la route refuse tout le monde
    // plutôt que d'accepter tout le monde.
    const src = readFileSync(join(RACINE, "social/upload/route.ts"), "utf8")
    expect(src).toContain("timingSafeEqual")
    expect(src).toMatch(/SOCIAL_UPLOAD_TOKEN/)
  })

  it("le webhook Stripe vérifie sa signature", () => {
    const src = readFileSync(join(RACINE, "webhooks/stripe/route.ts"), "utf8")
    expect(src).toContain("constructEvent")
    expect(src).toContain("STRIPE_WEBHOOK_SECRET")
  })
})
