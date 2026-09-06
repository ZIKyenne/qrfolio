import { describe, it, expect } from "vitest"
import { readFileSync, readdirSync, statSync } from "node:fs"
import { join } from "node:path"
import { VERTICALS, VERTICAL_ORDER } from "../app/qr-code/verticals"

// Le pied de page menait à /dashboard/builder/new — une route bloquée aux robots
// (robots.ts) et fermée à un visiteur sans compte. Et la page « QR code Wi-Fi »
// envoyait vers l'éditeur de page alors que le générateur Wi-Fi existe, gratuit.

const APP = join(__dirname, "../app")
const ZONES_BLOQUEES = ["/dashboard/", "/auth/", "/api/", "/e2e-harness/"]

function pagesPubliques(): string[] {
  const out: string[] = []
  const marcher = (d: string, dansPrive: boolean) => {
    for (const n of readdirSync(d).sort()) {
      const p = join(d, n)
      if (statSync(p).isDirectory()) marcher(p, dansPrive || ["dashboard", "auth", "api", "e2e-harness"].includes(n))
      else if (/\.tsx$/.test(n) && !/\.test\./.test(n) && !dansPrive) out.push(p)
    }
  }
  marcher(APP, false)
  return out
}

describe("aucune page publique n'envoie vers une zone bloquée aux robots", () => {
  it("robots.ts bloque bien ces quatre zones", () => {
    const robots = readFileSync(join(APP, "robots.ts"), "utf8")
    for (const z of ZONES_BLOQUEES) expect(robots, z).toContain(`"${z}"`)
  })

  // /auth/login et /auth/signup sont des portes assumées : le lien dit « Connexion »
  // et mène à une connexion. Le défaut relevé était autre — un lien « Builder » qui
  // promettait une fonctionnalité et livrait un mur.
  const PORTES_ASSUMEES = /^\/auth\/(login|signup)/

  it("les liens des pages publiques ne promettent pas une zone fermée", () => {
    const fautifs: string[] = []
    for (const f of pagesPubliques()) {
      const src = readFileSync(f, "utf8")
      for (const [i, ligne] of src.split("\n").entries()) {
        const m = ligne.match(/href=["'](\/(?:dashboard|auth|api|e2e-harness)\/[^"']*)["']/)
        if (!m || PORTES_ASSUMEES.test(m[1])) continue
        // Un lien réservé aux personnes déjà connectées est légitime.
        const contexte = src.split("\n").slice(Math.max(0, i - 3), i + 1).join(" ")
        if (/authed|signedIn|user \?|guest \?/.test(contexte)) continue
        fautifs.push(`${f.replace(APP, "")}:${i + 1} → ${m[1]}`)
      }
    }
    expect(fautifs).toEqual([])
  })
})

describe("chaque usage envoie là où l'on peut faire la chose", () => {
  it("l'usage Wi-Fi mène au générateur Wi-Fi, pas à l'éditeur de page", () => {
    expect(VERTICALS.wifi.outilHref).toBe("/generateur-qr-code-wifi")
    const page = readFileSync(join(APP, "qr-code/[usage]/page.tsx"), "utf8")
    expect(page).toContain("const actionHref = v.outilHref ?? essaiHref")
  })

  it("un outil annoncé existe vraiment", () => {
    for (const slug of VERTICAL_ORDER) {
      const h = VERTICALS[slug].outilHref
      if (!h) continue
      expect(statSync(join(APP, h.slice(1), "page.tsx")).isFile(), `${slug} → ${h}`).toBe(true)
    }
  })
})

describe("deux usages voisins ne posent pas la même question", () => {
  it("aucune question de FAQ n'est reprise mot pour mot d'un usage à l'autre", () => {
    const vues = new Map<string, string>()
    const doublons: string[] = []
    for (const slug of VERTICAL_ORDER) {
      for (const { q } of VERTICALS[slug].faq) {
        const deja = vues.get(q)
        if (deja) doublons.push(`« ${q} » : ${deja} et ${slug}`)
        else vues.set(q, slug)
      }
    }
    expect(doublons).toEqual([])
  })

  it("« restaurant » parle de l'établissement, « menu » parle de la carte", () => {
    const resto = VERTICALS.restaurant.faq.map(f => f.q).join(" ")
    expect(resto).toContain("réservation")
    expect(VERTICALS.menu.faq.map(f => f.q).join(" ")).toMatch(/allergènes|carte|menu/i)
  })
})
