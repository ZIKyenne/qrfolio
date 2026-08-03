import { describe, it, expect } from "vitest"
import { blockToRow, type SaveBlock } from "./savePage"

// Round-trip de persistance : état Builder → blockToRow → (JSON stocké) → rechargement
// simulé → même état sémantique. Fige les garanties d'IDs/ordre/visibilité avant refactor.

// Reconstruction d'un bloc éditeur à partir d'une ligne DB — MIROIR de la logique de
// chargement de BuilderV4 (setBlocksRaw dans load()).
function rowToBlock(row: any): SaveBlock {
  const c = row.content || {}
  return {
    id: row.id,
    type: row.type,
    content: c,
    visible: c.__visible !== undefined ? c.__visible !== false : (row.is_visible !== false),
    draft: c.__draft || false,
    locked: c.__locked || false,
  }
}

const A = "11111111-1111-4111-8111-111111111111"
const B = "22222222-2222-4222-8222-222222222222"
const C = "33333333-3333-4333-8333-333333333333"

const editorBlocks: SaveBlock[] = [
  { id: A, type: "profile", content: { name: "Moi", tagline: "Pro" }, visible: true },
  { id: B, type: "cta_button", content: { label: "Contact", url: "https://ex.com" }, visible: true, draft: true },
  { id: C, type: "gallery", content: { img1: "https://ex.com/1.jpg" }, visible: false, locked: true },
]

describe("round-trip Builder → stockage → rechargement", () => {
  const rows = editorBlocks.map((b, i) => blockToRow(b, i, "page-1"))
  const stored = JSON.parse(JSON.stringify(rows)) // ce qui part/revient de Supabase
  const reloaded = stored.map(rowToBlock)

  it("21. IDs (UUID) préservés", () => {
    expect(reloaded.map((b: SaveBlock) => b.id)).toEqual([A, B, C])
  })
  it("22. ordre / positions préservés", () => {
    expect(rows.map(r => r.position)).toEqual([0, 1, 2])
    expect(reloaded.map((b: SaveBlock) => b.type)).toEqual(["profile", "cta_button", "gallery"])
  })
  it("23. visible / draft / locked sérialisés et relus fidèlement", () => {
    expect(reloaded.map((b: SaveBlock) => b.visible)).toEqual([true, true, false])
    expect(reloaded.map((b: SaveBlock) => !!b.draft)).toEqual([false, true, false])
    expect(reloaded.map((b: SaveBlock) => !!b.locked)).toEqual([false, false, true])
  })
  it("is_visible dérivé = visible && !draft (colonne réelle)", () => {
    expect(rows.map(r => r.is_visible)).toEqual([true, false, false])
  })
  it("contenu utilisateur préservé (clés non réservées)", () => {
    expect(reloaded[0].content.name).toBe("Moi")
    expect(reloaded[1].content.url).toBe("https://ex.com")
    expect(reloaded[2].content.img1).toBe("https://ex.com/1.jpg")
  })
  it("24. blockToRow NE MUTE PAS le bloc d'entrée", () => {
    const before = JSON.parse(JSON.stringify(editorBlocks))
    editorBlocks.forEach((b, i) => blockToRow(b, i, "page-1"))
    expect(editorBlocks).toEqual(before)
  })
  it("round-trip idempotent (2e passage identique)", () => {
    const rows2 = reloaded.map((b: SaveBlock, i: number) => blockToRow(b, i, "page-1"))
    const reloaded2 = JSON.parse(JSON.stringify(rows2)).map(rowToBlock)
    expect(reloaded2.map((b: SaveBlock) => ({ id: b.id, visible: b.visible, draft: !!b.draft, locked: !!b.locked })))
      .toEqual(reloaded.map((b: SaveBlock) => ({ id: b.id, visible: b.visible, draft: !!b.draft, locked: !!b.locked })))
  })
})
