import { describe, it, expect, afterEach } from "vitest"
import { readFileSync, readdirSync, existsSync } from "node:fs"
import { join, dirname } from "node:path"
import { fileURLToPath } from "node:url"
import { harnessAutorise } from "./gate"

// Les routes /e2e-harness/* montent de vrais composants produit avec des
// fixtures. Elles ne doivent jamais s'ouvrir toutes seules en production —
// et il ne doit plus jamais falloir commenter une garde pour mesurer le vrai
// build (un fichier modifié qu'on oublie au commit : c'est déjà arrivé).

const ici = dirname(fileURLToPath(import.meta.url))
const env = { ...process.env }
afterEach(() => { process.env = { ...env } })

describe("la porte des harness", () => {
  it("ouverte hors production", () => {
    process.env = { ...env, NODE_ENV: "development", E2E_HARNESS: undefined } as any
    expect(harnessAutorise()).toBe(true)
  })

  it("fermée en production par défaut", () => {
    process.env = { ...env, NODE_ENV: "production", E2E_HARNESS: undefined } as any
    expect(harnessAutorise()).toBe(false)
  })

  it("fermée en production même sur une valeur approchante", () => {
    for (const v of ["", "0", "true", "yes", "oui"]) {
      process.env = { ...env, NODE_ENV: "production", E2E_HARNESS: v } as any
      expect(harnessAutorise(), `E2E_HARNESS=${JSON.stringify(v)}`).toBe(false)
    }
  })

  it("ouverte en production sur demande explicite", () => {
    process.env = { ...env, NODE_ENV: "production", E2E_HARNESS: "1" } as any
    expect(harnessAutorise()).toBe(true)
  })

  it("toutes les routes de harness passent par cette porte", () => {
    const dossiers = readdirSync(ici, { withFileTypes: true }).filter(d => d.isDirectory())
    expect(dossiers.length).toBeGreaterThan(10)
    for (const d of dossiers) {
      const p = join(ici, d.name, "page.tsx")
      if (!existsSync(p)) continue
      const src = readFileSync(p, "utf8")
      expect(src, `${d.name} : garde absente`).toContain("if (!harnessAutorise()) notFound()")
      // Plus aucune garde en ligne : sinon on retombe sur le bricolage du
      // commentaire pour mesurer un build de production.
      expect(src, `${d.name} : garde en ligne restante`).not.toContain('NODE_ENV === "production"')
    }
  })
})

describe("les écrans internes hors /e2e-harness passent par la même porte", () => {
  it("/dashboard/ui-demo (revue des primitives UI) n'est plus public en production", () => {
    const src = readFileSync(join(ici, "../dashboard/ui-demo/page.tsx"), "utf8")
    expect(src).toContain("if (!harnessAutorise()) notFound()")
    expect(src).not.toContain('"use client"')
  })
})

describe("un visiteur sans compte ne déclenche pas d'appel protégé", () => {
  it("QR vers un lien attend une session avant /api/qr-instant", () => {
    const src = readFileSync(join(ici, "../dashboard/qr-link/page.tsx"), "utf8")
    const i = src.indexOf('fetch("/api/qr-instant").then')
    expect(i).toBeGreaterThan(-1)
    expect(src.slice(i - 200, i)).toContain("if (!signedIn) return")
    expect(readFileSync(join(ici, "../dashboard/DashboardShell.tsx"), "utf8")).toContain("<SessionShellContext.Provider value={{ signedIn, confirmee: sessionConfirmee }}>")
  })
})
