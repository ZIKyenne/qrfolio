import { describe, it, expect } from "vitest"
import {
  DRAFT_KEY, DRAFT_VERSION, DRAFT_MAX_BYTES,
  makeDraft, saveDraft, loadDraft, clearDraft, hasDraft, draftIsMeaningful, draftSummary,
  type StorageLike, type LocalDraft,
} from "./draftStore"

function memStorage(): StorageLike & { data: Map<string, string>; failWrites?: boolean } {
  const data = new Map<string, string>()
  return {
    data,
    getItem: (k) => data.get(k) ?? null,
    setItem(k, v) { if ((this as any).failWrites) throw new Error("QuotaExceededError"); data.set(k, v) },
    removeItem: (k) => { data.delete(k) },
  }
}

const NOW = 1_700_000_000_000
const blocks = [
  { id: "a", type: "profile", content: { name: "Café Lune" }, visible: true },
  { id: "b", type: "bio", content: { text: "Bienvenue" }, visible: true },
]

describe("brouillon — écriture et relecture", () => {
  it("fait l'aller-retour sans rien perdre", () => {
    const s = memStorage()
    const d = makeDraft({ pageName: "Café Lune", theme: { bg: "#000" }, blocks, now: NOW })
    expect(saveDraft(s, d)).toEqual({ ok: true, bytes: expect.any(Number) })
    const back = loadDraft(s)
    expect(back?.pageName).toBe("Café Lune")
    expect(back?.theme).toEqual({ bg: "#000" })
    expect(back?.blocks).toHaveLength(2)
    expect(back?.blocks[0].content.name).toBe("Café Lune")
  })

  it("efface", () => {
    const s = memStorage()
    saveDraft(s, makeDraft({ pageName: "x", theme: null, blocks, now: NOW }))
    expect(hasDraft(s)).toBe(true)
    clearDraft(s)
    expect(hasDraft(s)).toBe(false)
    expect(loadDraft(s)).toBeNull()
  })

  it("n'écrit que sous une seule clé", () => {
    const s = memStorage()
    saveDraft(s, makeDraft({ pageName: "x", theme: null, blocks, now: NOW }))
    expect([...s.data.keys()]).toEqual([DRAFT_KEY])
  })
})

describe("brouillon — ce qu'on refuse de restaurer", () => {
  it("stockage indisponible : pas de plantage", () => {
    expect(saveDraft(null, makeDraft({ pageName: "x", theme: null, blocks, now: NOW }))).toEqual({ ok: false, reason: "unavailable" })
    expect(loadDraft(null)).toBeNull()
    expect(hasDraft(null)).toBe(false)
    expect(() => clearDraft(null)).not.toThrow()
  })

  it("écriture refusée par le navigateur : échec propre", () => {
    const s = memStorage(); (s as any).failWrites = true
    expect(saveDraft(s, makeDraft({ pageName: "x", theme: null, blocks, now: NOW }))).toEqual({ ok: false, reason: "unavailable" })
  })

  it("trop gros : on refuse plutôt que de faire sauter le quota", () => {
    const s = memStorage()
    const gros = [{ id: "a", type: "image", content: { url: "d".repeat(DRAFT_MAX_BYTES + 10) }, visible: true }]
    expect(saveDraft(s, makeDraft({ pageName: "x", theme: null, blocks: gros, now: NOW }))).toEqual({ ok: false, reason: "too_big" })
    expect(s.data.size).toBe(0)
  })

  it("JSON illisible", () => {
    const s = memStorage(); s.data.set(DRAFT_KEY, "{pas du json")
    expect(loadDraft(s)).toBeNull()
  })

  it("autre version du format : ignoré, jamais deviné", () => {
    const s = memStorage()
    s.data.set(DRAFT_KEY, JSON.stringify({ v: DRAFT_VERSION + 1, savedAt: NOW, pageName: "x", theme: null, blocks }))
    expect(loadDraft(s)).toBeNull()
  })

  it("brouillon sans bloc : rien à restaurer", () => {
    const s = memStorage()
    s.data.set(DRAFT_KEY, JSON.stringify({ v: DRAFT_VERSION, savedAt: NOW, pageName: "x", theme: null, blocks: [] }))
    expect(loadDraft(s)).toBeNull()
  })

  it("blocs sans type : écartés ; blocs sans id : numérotés", () => {
    const s = memStorage()
    s.data.set(DRAFT_KEY, JSON.stringify({
      v: DRAFT_VERSION, savedAt: NOW, pageName: "x", theme: null,
      blocks: [null, { id: "a" }, "texte", { type: "bio", content: { text: "sans id" } }, { id: "b", type: "bio", content: { text: "ok" } }],
    }))
    const d = loadDraft(s)
    expect(d?.blocks.map(b => b.id)).toEqual(["local-3", "b"])
  })

  it("un modèle entier (blocs sans id) survit — il était jeté en silence", () => {
    const modele = [
      { type: "profile", content: { name: "Le Bistrot" } },
      { type: "menu_section", content: { title: "Nos plats" } },
      { type: "opening_hours", content: {} },
    ]
    const d = makeDraft({ pageName: "Le Bistrot", theme: null, blocks: modele, templateKey: "resto", now: NOW })
    expect(d.blocks).toHaveLength(3)
    expect(new Set(d.blocks.map(b => b.id)).size).toBe(3)   // identifiants uniques
    const s = memStorage(); saveDraft(s, d)
    expect(loadDraft(s)?.blocks).toHaveLength(3)
  })
})

describe("brouillon — nettoyage à l'écriture", () => {
  it("ne garde que des valeurs simples dans le contenu", () => {
    const d = makeDraft({
      pageName: "x", theme: null, now: NOW,
      blocks: [{ id: "a", type: "bio", content: { text: "ok", n: 3, b: true, fn: () => {}, obj: { x: 1 }, arr: [1] }, visible: true }],
    })
    expect(d.blocks[0].content).toEqual({ text: "ok", n: 3, b: true })
  })

  it("respecte le contrat visible/draft/locked de savePage", () => {
    const d = makeDraft({
      pageName: "x", theme: null, now: NOW,
      blocks: [{ id: "a", type: "bio", content: {}, visible: false, draft: true, locked: true }],
    })
    expect(d.blocks[0]).toMatchObject({ visible: false, draft: true, locked: true })
  })

  it("visible par défaut quand le champ manque", () => {
    const d = makeDraft({ pageName: "x", theme: null, now: NOW, blocks: [{ id: "a", type: "bio", content: {} }] })
    expect(d.blocks[0].visible).toBe(true)
  })

  it("borne le nom et le nombre de blocs", () => {
    const d = makeDraft({
      pageName: "N".repeat(400), theme: null, now: NOW,
      blocks: Array.from({ length: 500 }, (_, i) => ({ id: `b${i}`, type: "bio", content: {}, visible: true })),
    })
    expect(d.pageName.length).toBe(120)
    expect(d.blocks.length).toBe(200)
  })

  it("nom vide : un repli lisible plutôt qu'un titre vide", () => {
    expect(makeDraft({ pageName: "", theme: null, blocks, now: NOW }).pageName).toBe("Ma page")
  })

  it("garde le modèle d'origine quand il y en a un", () => {
    const d = makeDraft({ pageName: "x", theme: null, blocks, templateKey: "studio_gastro", now: NOW })
    expect(d.templateKey).toBe("studio_gastro")
    const s = memStorage(); saveDraft(s, d)
    expect(loadDraft(s)?.templateKey).toBe("studio_gastro")
  })
})

describe("brouillon — a-t-il vraiment du contenu ?", () => {
  const squelette = [
    { id: "1", type: "profile", content: { name: "" }, visible: true },
    { id: "2", type: "bio", content: { text: "" }, visible: true },
    { id: "3", type: "cta_button", content: { label: "" }, visible: true },
  ]

  it("un squelette vide ne compte pas", () => {
    expect(draftIsMeaningful(makeDraft({ pageName: "Ma Page", theme: null, blocks: squelette, now: NOW }))).toBe(false)
  })

  it("un seul champ rempli suffit", () => {
    const b = [...squelette]; b[0] = { id: "1", type: "profile", content: { name: "Café Lune" }, visible: true }
    expect(draftIsMeaningful(makeDraft({ pageName: "x", theme: null, blocks: b, now: NOW }))).toBe(true)
  })

  it("plus de trois blocs, c'est du travail", () => {
    const b = [...squelette, { id: "4", type: "bio", content: {}, visible: true }]
    expect(draftIsMeaningful(makeDraft({ pageName: "x", theme: null, blocks: b, now: NOW }))).toBe(true)
  })

  it("venir d'un modèle compte, même sans rien avoir tapé", () => {
    expect(draftIsMeaningful(makeDraft({ pageName: "x", theme: null, blocks: squelette, templateKey: "studio_gastro", now: NOW }))).toBe(true)
  })

  it("null ne compte pas", () => {
    expect(draftIsMeaningful(null)).toBe(false)
  })
})

describe("brouillon — résumé pour l'interface", () => {
  const d = (n: number, savedAt: number): LocalDraft =>
    makeDraft({ pageName: "x", theme: null, now: savedAt, blocks: Array.from({ length: n }, (_, i) => ({ id: `b${i}`, type: "bio", content: {}, visible: true })) })

  it("singulier et pluriel", () => {
    expect(draftSummary(d(1, NOW), NOW)).toBe("1 bloc · à l'instant")
    expect(draftSummary(d(5, NOW), NOW)).toBe("5 blocs · à l'instant")
  })

  it("minutes, heures, jours", () => {
    expect(draftSummary(d(2, NOW), NOW + 3 * 60_000)).toBe("2 blocs · il y a 3 min")
    expect(draftSummary(d(2, NOW), NOW + 5 * 3_600_000)).toBe("2 blocs · il y a 5 h")
    expect(draftSummary(d(2, NOW), NOW + 3 * 86_400_000)).toBe("2 blocs · il y a 3 j")
  })

  it("une horloge qui recule ne produit pas de durée négative", () => {
    expect(draftSummary(d(2, NOW), NOW - 60_000)).toBe("2 blocs · à l'instant")
  })
})
