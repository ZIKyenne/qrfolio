import { describe, it, expect } from "vitest"
import { PRESETS, PRESET_CATS, CORNER_STYLES, EC_LEVELS, canUsePreset, presetMinRank, presetUpsellPlan } from "./presetsQr"
import { formatDate, STATUS_CFG, QR_STATUS_CFG, PLAN_BADGE } from "./etatsQr"

// Le catalogue de styles et les libellés d'état vivaient en tête d'un composant de
// 4 268 lignes. La règle de plan y était même écrite DEUX fois — une copie dans
// « QR de pages », une autre dans « QR à partir de zéro », avec le commentaire
// « répliqué de QRStudio ». Deux copies d'une règle payante finissent toujours par
// diverger : c'est le genre de chose qu'un fichier de 4 000 lignes cache.

describe("le catalogue de styles se tient", () => {
  it("aucun identifiant en double", () => {
    const ids = PRESETS.map(p => p.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it("chaque style annonce une catégorie qui existe", () => {
    const cats = new Set(PRESET_CATS.map(c => c.id))
    const orphelins = PRESETS.filter(p => !cats.has(p.cat)).map(p => p.id)
    expect(orphelins).toEqual([])
  })

  it("chaque catégorie a au moins un style à montrer", () => {
    const vides = PRESET_CATS.filter(c => !PRESETS.some(p => p.cat === c.id)).map(c => c.id)
    expect(vides).toEqual([])
  })

  it("chaque style annonce un plan vendu", () => {
    const inconnus = PRESETS.filter(p => !["free", "starter", "pro", "business"].includes(p.plan)).map(p => p.id)
    expect(inconnus).toEqual([])
  })

  it("les couleurs sont de vrais hexadécimaux", () => {
    const faux = PRESETS.filter(p => !/^#[0-9A-Fa-f]{6}$/.test(p.fg) || !/^#[0-9A-Fa-f]{6}$/.test(p.bg)).map(p => p.id)
    expect(faux).toEqual([])
  })

  it("les niveaux de correction et les styles de coins couvrent les quatre valeurs attendues", () => {
    expect(EC_LEVELS.map(e => e.id)).toEqual(["L", "M", "Q", "H"])
    expect(CORNER_STYLES.length).toBeGreaterThan(0)
  })
})

describe("qui a droit à quel style", () => {
  const style = (plan: string) => ({ id: "x", label: "X", cat: "classic", fg: "#000000", bg: "#FFFFFF", plan })

  it("un style gratuit est ouvert à tout le monde", () => {
    for (const p of ["free", "starter", "pro", "business"]) {
      expect(canUsePreset(p, style("free")), p).toBe(true)
    }
  })

  it("un style « pro » demande au moins le plan Établissement", () => {
    expect(canUsePreset("free", style("pro"))).toBe(false)
    expect(canUsePreset("starter", style("pro"))).toBe(true)
  })

  it("un style « business » est réservé au plan Multi-sites", () => {
    // PLAN_RANK réel : free 0, starter 1, pro 1, business 2. Un commentaire du code
    // annonçait « free 0, starter 1, pro 2, business 3 » — faux, et c'est exactement
    // ce que trois copies de la même règle dans deux écrans finissent par produire.
    expect(canUsePreset("starter", style("business"))).toBe(false)
    expect(canUsePreset("pro", style("business"))).toBe(false)
    expect(canUsePreset("business", style("business"))).toBe(true)
  })

  it("le plan proposé à l'achat correspond au style refusé", () => {
    expect(presetUpsellPlan("business")).toBe("pro")
    expect(presetUpsellPlan("pro")).toBe("starter")
    expect(presetMinRank("free")).toBe(0)
  })

  it("un plan inconnu ne donne accès à rien de payant", () => {
    expect(canUsePreset("plan-inexistant", style("pro"))).toBe(false)
  })
})

describe("les libellés d'état", () => {
  it("chaque état de page et de QR a un libellé et une couleur", () => {
    for (const [k, v] of Object.entries(STATUS_CFG)) {
      expect(v.label, k).toBeTruthy(); expect(v.dot, k).toBeTruthy()
    }
    for (const [k, v] of Object.entries(QR_STATUS_CFG)) {
      expect(v.label, k).toBeTruthy(); expect(v.desc, k).toBeTruthy()
    }
  })
  it("le plan gratuit ne porte pas de badge", () => {
    expect(PLAN_BADGE.free).toBeNull()
    expect(PLAN_BADGE.pro?.label).toBe("PRO")
  })
})

describe("la date relative affichée sur chaque ligne de la liste", () => {
  const ilYA = (minutes: number) => new Date(Date.now() - minutes * 60_000).toISOString()

  it("sans date, deux tirets — jamais « Invalid Date »", () => {
    expect(formatDate(null)).toBe("--")
    expect(formatDate("")).toBe("--")
  })
  it("moins d'une heure : en minutes", () => { expect(formatDate(ilYA(5))).toBe("il y a 5min") })
  it("moins d'un jour : en heures", () => { expect(formatDate(ilYA(3 * 60))).toBe("il y a 3h") })
  it("moins d'une semaine : en jours", () => { expect(formatDate(ilYA(3 * 1440))).toBe("il y a 3j") })
  it("au-delà : la date en toutes lettres, en français", () => {
    expect(formatDate("2026-03-14T12:00:00.000Z")).toMatch(/14 mars/)
  })
})
