import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import { alerteActivee, contenuPremierScan, estLaPremiere, estUnScan } from "./premierScan"
import { previenirPremierScan } from "./premierScanEnvoi"

describe("ce qui compte comme un scan", () => {
  it("reconnaît la source posée par la redirection QR", () => {
    expect(estUnScan("qr_scan")).toBe(true)
  })

  it("ignore une visite ordinaire", () => {
    for (const s of ["direct", "google", "interne", "", null, undefined]) {
      expect(estUnScan(s), String(s)).toBe(false)
    }
  })
})

describe("l'interrupteur est allumé par défaut", () => {
  it("un compte qui n'a jamais touché aux réglages reçoit l'alerte", () => {
    expect(alerteActivee(null)).toBe(true)
    expect(alerteActivee({})).toBe(true)
    expect(alerteActivee({ weekly_report: false })).toBe(true)
  })

  it("seul un refus explicite coupe l'envoi", () => {
    expect(alerteActivee({ scan_alert: false })).toBe(false)
    expect(alerteActivee({ scan_alert: true })).toBe(true)
  })
})

describe("deux scans à la même seconde ne font qu'un email", () => {
  it("seule la ligne la plus ancienne se reconnaît", () => {
    expect(estLaPremiere("a", "a")).toBe(true)
    expect(estLaPremiere("b", "a")).toBe(false)
  })

  it("une écriture ratée ne prévient personne", () => {
    expect(estLaPremiere(null, "a")).toBe(false)
    expect(estLaPremiere("a", null)).toBe(false)
  })
})

describe("le message", () => {
  it("nomme la page et dit ce que ça change", () => {
    const html = contenuPremierScan({ nom: "Sophie", titrePage: "Le Comptoir" })
    expect(html).toContain("Bonjour Sophie,")
    expect(html).toContain("Le Comptoir")
    expect(html).toContain("Votre support fonctionne")
  })

  it("reste correct sans nom ni titre", () => {
    const html = contenuPremierScan({})
    expect(html).toContain("Bonjour,")
    expect(html).toContain("votre page")
    expect(html).not.toContain("undefined")
    expect(html).not.toContain("null")
  })

  it("échappe un titre hostile — un client peut nommer sa page comme il veut", () => {
    const html = contenuPremierScan({ titrePage: '<img src=x onerror="alert(1)">' })
    expect(html).not.toContain("<img")
    expect(html).toContain("&lt;img")
  })
})

// Faux client Supabase : toutes les méthodes chaînent, maybeSingle rend la ligne
// prévue pour la table interrogée.
function fausseBase(lignes: Record<string, unknown>) {
  const tables: string[] = []
  return {
    tables,
    from(t: string) {
      tables.push(t)
      const q: Record<string, unknown> = {}
      for (const m of ["select", "eq", "order", "limit"]) q[m] = () => q
      q.maybeSingle = async () => ({ data: lignes[t] ?? null })
      return q
    },
  }
}

const PAGE = { title: "Le Comptoir", user_id: "u1" }

describe("l'envoi de l'alerte", () => {
  beforeEach(() => {
    process.env.RESEND_API_KEY = "cle-de-test"
    vi.stubGlobal("fetch", vi.fn(async () => ({ ok: true })))
  })
  afterEach(() => vi.unstubAllGlobals())

  it("part quand la ligne écrite est la première visite-scan de la page", async () => {
    const base = fausseBase({ page_views: { id: "v1" }, pages: PAGE, profiles: { email: "a@b.fr", full_name: "Sophie", preferences: {} } })
    expect(await previenirPremierScan(base, "p1", "v1")).toBe("envoye")
    expect(fetch).toHaveBeenCalledOnce()
  })

  it("ne part pas au deuxième scan", async () => {
    const base = fausseBase({ page_views: { id: "v1" }, pages: PAGE, profiles: { email: "a@b.fr" } })
    expect(await previenirPremierScan(base, "p1", "v2")).toBe("pas-la-premiere")
    expect(fetch).not.toHaveBeenCalled()
  })

  it("respecte l'interrupteur éteint", async () => {
    const base = fausseBase({ page_views: { id: "v1" }, pages: PAGE, profiles: { email: "a@b.fr", preferences: { scan_alert: false } } })
    expect(await previenirPremierScan(base, "p1", "v1")).toBe("desactive")
    expect(fetch).not.toHaveBeenCalled()
  })

  it("ne jette jamais : le comptage du scan passe avant l'email", async () => {
    const casse = { from() { throw new Error("base injoignable") } }
    await expect(previenirPremierScan(casse as never, "p1", "v1")).resolves.toBe("impossible")
  })

  it("se tait si la page n'a pas de propriétaire lisible", async () => {
    const base = fausseBase({ page_views: { id: "v1" }, pages: null })
    expect(await previenirPremierScan(base, "p1", "v1")).toBe("impossible")
    expect(fetch).not.toHaveBeenCalled()
  })
})
