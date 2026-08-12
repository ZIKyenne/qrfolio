import { describe, it, expect } from "vitest"
import {
  MAX_PAGES, ACTIVE_QR_FILTER,
  countActiveQrs, countPages, countInstantQrs, countPermanentDynamicQrs, countDynamicTrialsThisMonth, initialQrStatus,
} from "./quota"

// Faux client Supabase chaînable : chaque méthode renvoie le builder, qui est « thenable »
// et résout { count }. Enregistre les appels pour vérifier les filtres appliqués.
function fakeSupabase(count: number | null) {
  const calls = { from: [] as any[], select: [] as any[], eq: [] as any[], or: [] as any[], is: [] as any[], not: [] as any[], gte: [] as any[] }
  const b: any = {
    select(...a: any[]) { calls.select.push(a); return b },
    eq(...a: any[]) { calls.eq.push(a); return b },
    or(...a: any[]) { calls.or.push(a); return b },
    is(...a: any[]) { calls.is.push(a); return b },
    not(...a: any[]) { calls.not.push(a); return b },
    gte(...a: any[]) { calls.gte.push(a); return b },
    then(res: (v: any) => void) { res({ count }) },
  }
  return { supa: { from(t: string) { calls.from.push(t); return b } } as any, calls }
}

describe("quota — constantes", () => {
  it("MAX_PAGES = 300 et filtre actif (active OR null)", () => {
    expect(MAX_PAGES).toBe(300)
    expect(ACTIVE_QR_FILTER).toContain("status.eq.active")
    expect(ACTIVE_QR_FILTER).toContain("status.is.null")
  })
})

describe("countActiveQrs / countPages", () => {
  it("renvoie le count, et 0 si null", async () => {
    expect(await countActiveQrs(fakeSupabase(4).supa, "u")).toBe(4)
    expect(await countActiveQrs(fakeSupabase(null).supa, "u")).toBe(0)
    expect(await countPages(fakeSupabase(7).supa, "u")).toBe(7)
  })
  it("countActiveQrs compte sur qr_codes avec le filtre actif", async () => {
    const { supa, calls } = fakeSupabase(1)
    await countActiveQrs(supa, "u")
    expect(calls.from).toContain("qr_codes")
    expect(calls.or.flat()).toContain(ACTIVE_QR_FILTER)
    expect(calls.eq.map(a => a.join("="))).toContain("user_id=u")
  })
})

describe("countInstantQrs — STATIQUES seulement (quota séparé)", () => {
  it("exclut les dynamiques via or(false/null)", async () => {
    const { supa, calls } = fakeSupabase(3)
    expect(await countInstantQrs(supa, "u")).toBe(3)
    expect(calls.from).toContain("instant_qrs")
    expect(calls.or.flat()).toContain("dynamic.eq.false,dynamic.is.null")
  })
})

describe("countPermanentDynamicQrs — permanents actifs seulement", () => {
  it("filtre dynamic=true, status=active, expires_at IS NULL", async () => {
    const { supa, calls } = fakeSupabase(2)
    expect(await countPermanentDynamicQrs(supa, "u")).toBe(2)
    const eqPairs = calls.eq.map(a => `${a[0]}=${a[1]}`)
    expect(eqPairs).toContain("dynamic=true")
    expect(eqPairs).toContain("status=active")
    expect(calls.is.some(a => a[0] === "expires_at" && a[1] === null)).toBe(true)
  })
})

describe("countDynamicTrialsThisMonth — essais dynamiques du mois calendaire courant", () => {
  it("filtre dynamic=true, expires_at NOT NULL, created_at >= 1er du mois (UTC)", async () => {
    const now = new Date(Date.UTC(2026, 7, 15, 10, 30)) // 15 août 2026
    const { supa, calls } = fakeSupabase(2)
    expect(await countDynamicTrialsThisMonth(supa, "u", now)).toBe(2)
    expect(calls.from).toContain("instant_qrs")
    expect(calls.eq.map(a => `${a[0]}=${a[1]}`)).toContain("dynamic=true")
    expect(calls.not.some(a => a[0] === "expires_at" && a[1] === "is" && a[2] === null)).toBe(true)
    expect(calls.gte.some(a => a[0] === "created_at" && a[1] === "2026-08-01T00:00:00.000Z")).toBe(true)
  })
  it("renvoie 0 si count null", async () => {
    expect(await countDynamicTrialsThisMonth(fakeSupabase(null).supa, "u", new Date(Date.UTC(2026, 0, 5)))).toBe(0)
  })
})

describe("initialQrStatus — actif si sous le quota, brouillon sinon", () => {
  it("plan illimité (business) -> toujours actif, sans requête", async () => {
    expect(await initialQrStatus(fakeSupabase(999).supa, "u", "business")).toBe("active")
  })
  it("plan free (limite 3) : 2 -> actif, 3 -> brouillon, 4 -> brouillon", async () => {
    expect(await initialQrStatus(fakeSupabase(2).supa, "u", "free")).toBe("active")
    expect(await initialQrStatus(fakeSupabase(3).supa, "u", "free")).toBe("draft")
    expect(await initialQrStatus(fakeSupabase(4).supa, "u", "free")).toBe("draft")
  })
  it("plan inconnu -> retombe sur free (limite 3)", async () => {
    expect(await initialQrStatus(fakeSupabase(3).supa, "u", undefined)).toBe("draft")
  })
})
