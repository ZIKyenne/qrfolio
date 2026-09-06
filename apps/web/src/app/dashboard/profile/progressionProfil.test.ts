import { describe, it, expect } from "vitest"
import { badges, niveau, type StatsJoueur } from "./progressionProfil"
import { construireJournal } from "./journalActivite"

// Ces règles décident de ce que chaque utilisateur voit en ouvrant son profil :
// ses badges, son niveau, et son journal d'activité. Elles vivaient dans un
// composant de 3 294 lignes — c'est là que le journal a pu, pendant des mois,
// INVENTER la date de création de chaque QR au hasard dans les 30 derniers jours,
// et en montrer une différente à chaque affichage.

const joueur = (o: Partial<StatsJoueur> = {}): StatsJoueur => ({
  plan: "free", publishedPages: 0, totalPages: 0, totalQr: 0,
  totalScansQR: 0, validatedRefs: 0, memberMonths: 0, ...o,
})

describe("les badges", () => {
  it("un compte neuf n'en a qu'un : celui d'arrivée", () => {
    const ouverts = badges(joueur()).filter(b => b.unlocked).map(b => b.id)
    expect(ouverts).toEqual(["early_user"])
  })

  it("aucun identifiant en double, et chacun a un libellé et une explication", () => {
    const l = badges(joueur())
    expect(new Set(l.map(b => b.id)).size).toBe(l.length)
    expect(l.filter(b => !b.label || !b.desc)).toEqual([])
  })

  it("les paliers de scans s'ouvrent l'un après l'autre", () => {
    const a = (n: number) => badges(joueur({ totalScansQR: n })).filter(b => b.unlocked).map(b => b.id)
    expect(a(99)).not.toContain("scans_100")
    expect(a(100)).toContain("scans_100")
    expect(a(100)).not.toContain("scans_1k")
    expect(a(10000)).toEqual(expect.arrayContaining(["scans_100", "scans_1k", "scans_10k"]))
  })

  it("le badge « Early User » se referme après six mois", () => {
    expect(badges(joueur({ memberMonths: 6 })).find(b => b.id === "early_user")!.unlocked).toBe(true)
    expect(badges(joueur({ memberMonths: 7 })).find(b => b.id === "early_user")!.unlocked).toBe(false)
  })

  it("le badge Business ne s'ouvre qu'au plan Multi-sites", () => {
    expect(badges(joueur({ plan: "pro" })).find(b => b.id === "business_user")!.unlocked).toBe(false)
    expect(badges(joueur({ plan: "pro" })).find(b => b.id === "pro_user")!.unlocked).toBe(true)
    expect(badges(joueur({ plan: "business" })).find(b => b.id === "business_user")!.unlocked).toBe(true)
  })
})

describe("le niveau QRowg", () => {
  it("un compte neuf démarre Débutant, à zéro", () => {
    const n = niveau(joueur())
    expect(n.score).toBe(0)
    expect(n.current.label).toBe("Debutant")
  })

  it("le score est borné à 100, même en cumulant tout", () => {
    const n = niveau(joueur({ plan: "business", totalScansQR: 999999, publishedPages: 999, validatedRefs: 999, memberMonths: 999 }))
    expect(n.score).toBe(100)
    expect(n.current.label).toBe("Legende")
    expect(n.nextLvl).toBeNull()
    expect(n.progressPct).toBe(100)
  })

  it("chaque source de points est plafonnée séparément", () => {
    // Les scans valent 30 points au maximum : 100 000 scans ne font pas une légende.
    expect(niveau(joueur({ totalScansQR: 100000 })).score).toBe(30)
    expect(niveau(joueur({ publishedPages: 100 })).score).toBe(25)
    expect(niveau(joueur({ validatedRefs: 100 })).score).toBe(20)
    expect(niveau(joueur({ memberMonths: 100 })).score).toBe(10)
  })

  it("la progression se mesure entre le palier atteint et le suivant", () => {
    // 25 points : Explorateur (15) → Createur (30), soit 10/15 du chemin.
    const n = niveau(joueur({ publishedPages: 5 }))
    expect(n.score).toBe(25)
    expect(n.current.label).toBe("Explorateur")
    expect(n.nextLvl?.label).toBe("Createur")
    expect(n.progressPct).toBe(67)
  })

  it("le plan payant compte, mais ne suffit pas", () => {
    expect(niveau(joueur({ plan: "business" })).score).toBe(15)
    expect(niveau(joueur({ plan: "free" })).score).toBe(0)
  })
})

describe("le journal d'activité reconstruit", () => {
  const page = (o: Record<string, string> = {}) => ({
    id: "p1", title: "Ma page", status: "published",
    created_at: "2026-01-01T10:00:00.000Z", updated_at: "2026-01-01T10:00:00.000Z", ...o,
  })

  it("il n'invente aucune date : un QR sans date n'apparaît pas", () => {
    const evts = construireJournal({
      pages: [], parrainages: [],
      qrs: [{ id: "q1", short_code: "abc", created_at: null, pages: null }],
    })
    expect(evts).toEqual([])
  })

  it("un QR daté apparaît à SA date, pas à une date tirée au sort", () => {
    const d = { pages: [], parrainages: [], qrs: [{ id: "q1", short_code: "abc", created_at: "2026-02-03T09:00:00.000Z", pages: { title: "Menu" } }] }
    const a = construireJournal(d), b = construireJournal(d)
    expect(a[0].created_at).toBe("2026-02-03T09:00:00.000Z")
    expect(a[0].description).toBe("Menu")
    // Deux appels donnent exactement le même journal : c'était faux auparavant.
    expect(a).toEqual(b)
  })

  it("une page enregistrée dans la seconde qui suit sa création ne compte pas deux fois", () => {
    const evts = construireJournal({ pages: [page({ updated_at: "2026-01-01T10:00:30.000Z" })], qrs: [], parrainages: [] })
    expect(evts.map(e => e.event_type)).toEqual(["page_created"])
  })

  it("une vraie modification, elle, laisse une trace — publiée ou non", () => {
    const publiee = construireJournal({ pages: [page({ updated_at: "2026-01-05T10:00:00.000Z" })], qrs: [], parrainages: [] })
    expect(publiee.map(e => e.event_type)).toContain("page_published")
    const brouillon = construireJournal({ pages: [page({ status: "draft", updated_at: "2026-01-05T10:00:00.000Z" })], qrs: [], parrainages: [] })
    expect(brouillon.map(e => e.event_type)).toContain("page_updated")
  })

  it("un parrainage en attente n'est pas un parrainage validé", () => {
    const evts = construireJournal({
      pages: [], qrs: [],
      parrainages: [
        { id: "r1", status: "pending", created_at: "2026-01-02T10:00:00.000Z" },
        { id: "r2", status: "validated", reward_months: 2, created_at: "2026-01-03T10:00:00.000Z" },
      ],
    })
    expect(evts).toHaveLength(1)
    expect(evts[0].description).toBe("+2 mois Pro")
  })

  it("le journal se lit du plus récent au plus ancien", () => {
    const evts = construireJournal({
      pages: [page({ id: "p1", created_at: "2026-01-01T10:00:00.000Z", updated_at: "2026-01-01T10:00:00.000Z" }),
              page({ id: "p2", created_at: "2026-03-01T10:00:00.000Z", updated_at: "2026-03-01T10:00:00.000Z" })],
      qrs: [], parrainages: [],
    })
    expect(evts.map(e => e.entity_id)).toEqual(["p2", "p1"])
  })
})
