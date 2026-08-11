import { describe, it, expect } from "vitest"
import { uniqueShortCode } from "./shortCode"

const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789"

// Faux Supabase : maybeSingle renvoie une collision (data non nul) ou rien (null).
function supa(hit: boolean) {
  const qb: any = {
    select() { return qb },
    eq() { return qb },
    maybeSingle() { return Promise.resolve({ data: hit ? { id: "x" } : null }) },
  }
  return { from() { return qb } } as any
}

describe("uniqueShortCode", () => {
  it("génère un code de 7 caractères issus de l'alphabet sûr", async () => {
    const code = await uniqueShortCode(supa(false))
    expect(code).toHaveLength(7)
    for (const ch of code) expect(ALPHABET).toContain(ch)
    // aucun caractère ambigu (O, 0, I, l, 1)
    expect(code).not.toMatch(/[O0Il1]/)
  })

  it("ajoute le code généré au set `seen`", async () => {
    const seen = new Set<string>()
    const code = await uniqueShortCode(supa(false), seen)
    expect(seen.has(code)).toBe(true)
  })

  it("deux appels successifs donnent deux codes distincts (seen évite le doublon)", async () => {
    const seen = new Set<string>()
    const a = await uniqueShortCode(supa(false), seen)
    const b = await uniqueShortCode(supa(false), seen)
    expect(a).not.toBe(b)
    expect(seen.size).toBe(2)
  })

  it("échoue si la base renvoie une collision permanente", async () => {
    await expect(uniqueShortCode(supa(true))).rejects.toThrow()
  })
})
