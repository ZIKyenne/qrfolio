import { describe, it, expect } from "vitest"
import { readFileSync, existsSync, readdirSync, statSync } from "node:fs"
import { join } from "node:path"
import { PLANS, PLAN_LIST, PLAN_COMPARISON } from "@/lib/plans"

// Deux abonnements coexistaient, chacun avec un palier « Pro » et un palier
// « Business », à des prix différents, tous deux comptés en « QR ». Deux entrées
// de menu fabriquaient des QR codes et se décrivaient toutes deux comme « créez
// un QR code ». Et la jauge de la barre latérale annonçait « QR utilisés N / 25 »
// en divisant un nombre de QR par la limite de PAGES.
//
// Trois choses différentes s'appelaient « QR » sur le même écran. Ce fichier
// empêche qu'une quatrième arrive.

const RACINE = join(__dirname, "../../..")
const lire = (p: string) => readFileSync(join(__dirname, p), "utf8")
const shell = lire("./DashboardShell.tsx")

describe("un seul abonnement", () => {
  it("aucun palier ne porte le nom d'un autre", () => {
    const noms = PLAN_LIST.map(p => p.label)
    expect(new Set(noms).size).toBe(noms.length)
  })

  it("le second jeu de plans a disparu du dépôt", () => {
    for (const f of ["lib/dynamicPlans.ts", "lib/dynStripe.ts", "app/dashboard/qr-dynamique/page.tsx"]) {
      expect(existsSync(join(RACINE, "src", f)), `${f} existe encore`).toBe(false)
    }
  })

  it("plus rien ne pointe vers la page de tarification supprimée", () => {
    const morts: string[] = []
    const parcourir = (d: string) => {
      for (const e of readdirSync(d)) {
        const p = join(d, e)
        if (statSync(p).isDirectory()) { parcourir(p); continue }
        if (!/\.tsx?$/.test(e) || /\.test\.tsx?$/.test(e)) continue // ce fichier cite le chemin
        const src = readFileSync(p, "utf8")
        if (src.includes('"/dashboard/qr-dynamique"') || src.includes("'/dashboard/qr-dynamique'")) {
          morts.push(p.slice(p.indexOf("/src/") + 5))
        }
      }
    }
    parcourir(join(RACINE, "src"))
    expect(morts, "liens vers une page qui n'existe plus").toEqual([])
  })

  it("aucune colonne dyn_ n'est plus lue nulle part", () => {
    const restes: string[] = []
    const parcourir = (d: string) => {
      for (const e of readdirSync(d)) {
        const p = join(d, e)
        if (statSync(p).isDirectory()) { parcourir(p); continue }
        if (!/\.tsx?$/.test(e) || /\.test\.tsx?$/.test(e)) continue
        const src = readFileSync(p, "utf8")
        if (/\bdyn_(plan|status|stripe_subscription_id|current_period_end|cancel_at_end)\b/.test(src)) {
          restes.push(p.slice(p.indexOf("/src/") + 5))
        }
      }
    }
    parcourir(join(RACINE, "src"))
    expect(restes, "le second abonnement laisse des traces").toEqual([])
  })
})

describe("les quotas de QR sont trois choses distinctes, et le disent", () => {
  it("chaque plan borne les pages, les QR autonomes et les QR modifiables", () => {
    for (const p of PLAN_LIST) {
      expect(p.limits, `${p.label}`).toHaveProperty("pages")
      expect(p.limits, `${p.label}`).toHaveProperty("qr")
      expect(p.limits, `${p.label}`).toHaveProperty("dyn")
    }
  })

  it("les modifiables sont un SOUS-ensemble des QR autonomes, jamais l'inverse", () => {
    for (const p of PLAN_LIST) {
      if (p.limits.qr === null) continue          // illimité : rien à comparer
      expect(p.limits.dyn, `${p.label} promet plus de modifiables que de QR`).not.toBeNull()
      expect(p.limits.dyn as number).toBeLessThanOrEqual(p.limits.qr)
    }
  })

  it("chaque plan payant donne plus que le précédent", () => {
    for (let i = 1; i < PLAN_LIST.length; i++) {
      const av = PLAN_LIST[i - 1], ap = PLAN_LIST[i]
      for (const cle of ["pages", "qr", "dyn"] as const) {
        if (ap.limits[cle] === null) continue     // illimité : toujours au-dessus
        expect(av.limits[cle], `${ap.label} régresse sur ${cle}`).not.toBeNull()
        expect(ap.limits[cle] as number).toBeGreaterThan(av.limits[cle] as number)
      }
    }
  })

  it("le tableau comparatif dit les mêmes nombres que la source de vérité", () => {
    const ligne = (nom: string) => PLAN_COMPARISON.find(l => l.feature.includes(nom))
    const autonomes = ligne("QR autonomes")
    const modifiables = ligne("modifiables après impression")
    expect(autonomes?.free).toBe(String(PLANS.free.limits.qr))
    expect(autonomes?.pro).toBe(String(PLANS.pro.limits.qr))
    expect(modifiables?.free).toBe(String(PLANS.free.limits.dyn))
    expect(modifiables?.pro).toBe(String(PLANS.pro.limits.dyn))
  })
})

describe("la jauge de la barre latérale", () => {
  it("compte des pages, et annonce des pages", () => {
    // Elle disait « QR utilisés » en divisant par pageLimit : sur Pro, 12 QR sur
    // une limite de 25 PAGES, alors que la vraie limite de QR est 35.
    expect(shell).toContain("const planLimit = pageLimit(plan)")
    const i = shell.indexOf("const planLimit = pageLimit(plan)")
    const bloc = shell.slice(i, i + 3000)
    expect(bloc).toContain("Pages publiées")
    expect(bloc).not.toContain("QR utilisés")
  })
})

describe("chaque page a un nom, et un seul", () => {
  const nomsDe = (href: string) =>
    [...shell.matchAll(new RegExp(`href: "${href}"[^\\n]*label: "([^"]+)"`, "g"))].map(m => m[1])

  it("« Créer un QR » s'appelle pareil partout dans la barre latérale", () => {
    expect(new Set(nomsDe("/dashboard/qr-link")).size).toBe(1)
  })

  it("« QR de mes pages » aussi", () => {
    expect(new Set(nomsDe("/dashboard/qr-codes")).size).toBe(1)
  })

  it("deux entrées de menu ne peuvent pas porter le même nom", () => {
    const tous = [...shell.matchAll(/href: "(\/dashboard[^"]*)", glyph: "[^"]*", label: "([^"]+)"/g)]
    const parNom = new Map<string, Set<string>>()
    for (const [, href, label] of tous) {
      if (!parNom.has(label)) parNom.set(label, new Set())
      parNom.get(label)!.add(href)
    }
    const collisions = [...parNom.entries()].filter(([, hrefs]) => hrefs.size > 1).map(([l]) => l)
    expect(collisions, "un même libellé mène à deux pages différentes").toEqual([])
  })

  it("la page ne se présente plus sous le nom de l'abonnement qu'elle vendait", () => {
    const page = lire("./qr-link/page.tsx")
    expect(page).toContain(">Créer un QR code</h1>")
    expect(page).not.toMatch(/>QR Dynamique<\/h1>/)
  })

  it("la nav mobile emploie les mêmes mots que la barre latérale", () => {
    const mobile = readFileSync(join(RACINE, "src/components/MobileNav.tsx"), "utf8")
    expect(mobile).toContain("'Créer un QR'")
  })
})

describe("plus aucune promesse d'expiration automatique", () => {
  it("la création d'un QR modifiable ne pose jamais de date d'expiration", () => {
    const route = readFileSync(join(RACINE, "src/app/api/qr-instant/route.ts"), "utf8")
    expect(route).toContain("expires_at: null")
    expect(route).not.toContain("TRIAL_MS")
    expect(route).not.toMatch(/DYN_TRIAL_DAYS|DYN_FREE_TRIALS_PER_MONTH/)
  })
})
