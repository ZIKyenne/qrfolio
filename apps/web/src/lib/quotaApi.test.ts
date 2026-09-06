import { describe, it, expect } from "vitest"
import { readFileSync } from "node:fs"
import { join } from "node:path"
import { consommerQuotaApi, interpreter, enTetesQuota } from "./quotaApi"
import { PLANS, apiQuotaMensuel } from "./plans"

// plans.ts promettait « 1 000 / 10 000 appels par mois ». Le seul contrôle était
// 120 requêtes par minute, identique pour les deux plans.

const rpc = (reponse: { data?: unknown; error?: unknown }) => {
  const appels: unknown[] = []
  return { appels, client: { rpc: async (fn: string, args: Record<string, unknown>) => { appels.push([fn, args]); return { data: reponse.data ?? null, error: reponse.error ?? null } } } }
}

describe("consommerQuotaApi", () => {
  it("un plan sans API est refusé sans même toucher la base", async () => {
    const { appels, client } = rpc({ data: [{ autorise: true, appels: 1 }] })
    const q = await consommerQuotaApi("u1", "free", client)
    expect(q.autorise).toBe(false)
    expect(appels).toEqual([])
  })

  it("passe le plafond du plan à la base et lit sa réponse", async () => {
    const { appels, client } = rpc({ data: [{ autorise: true, appels: 42 }] })
    const q = await consommerQuotaApi("u1", "pro", client)
    expect(appels).toEqual([["api_consommer", { p_user: "u1", p_plafond: 1000 }]])
    expect(q).toEqual({ autorise: true, appels: 42, plafond: 1000 })
    expect(enTetesQuota(q)["X-Quota-Remaining"]).toBe("958")
  })

  it("refuse quand la base dit non, et quand la base ne répond pas", async () => {
    expect((await consommerQuotaApi("u1", "business", rpc({ data: [{ autorise: false, appels: 10001 }] }).client)).autorise).toBe(false)
    expect((await consommerQuotaApi("u1", "business", rpc({ error: { message: "boom" } }).client)).autorise).toBe(false)
  })

  it("interprète une ligne unique comme un tableau d'une ligne", () => {
    expect(interpreter({ autorise: true, appels: 3 }, 10)).toEqual({ autorise: true, appels: 3, plafond: 10 })
    expect(interpreter(null, 10)).toEqual({ autorise: false, appels: 0, plafond: 10 })
  })
})

describe("la promesse et le plafond sont le même nombre", () => {
  it("plans.ts", () => {
    expect(apiQuotaMensuel("free")).toBeNull()
    expect(apiQuotaMensuel("pro")).toBe(1000)
    expect(apiQuotaMensuel("business")).toBe(10000)
    const texte = (id: "pro" | "business") => PLANS[id].perks.find(f => f.text.startsWith("Accès API"))!.text
    expect(texte("pro")).toContain("1 000 appels")
    expect(texte("business")).toContain("10 000 appels")
  })

  it("chaque route /api/v1 consomme le quota après l'authentification", () => {
    for (const r of ["pages/route.ts", "qr-codes/route.ts", "qr/[code]/destination/route.ts"]) {
      const src = readFileSync(join(__dirname, "../app/api/v1", r), "utf8")
      expect(src, r).toContain("const quota = await consommerQuotaApi(auth.userId, auth.plan)")
      expect(src, r).toContain("if (!quota.autorise) return reponseQuotaDepasse(quota)")
      expect(src, r).toContain("headers: enTetesQuota(quota)")
      expect(src.indexOf("consommerQuotaApi(auth"), r).toBeGreaterThan(src.indexOf("authApiKey(req)"))
    }
  })

  it("la migration réserve la fonction à la clé de service", () => {
    const sql = readFileSync(join(__dirname, "../../../../supabase/migrations/20260905100000_api_quota_mensuel.sql"), "utf8")
    expect(sql).toContain("security definer")
    expect(sql).toContain("revoke all on function public.api_consommer(uuid, integer) from public, anon, authenticated")
    expect(sql).toContain("grant execute on function public.api_consommer(uuid, integer) to service_role")
    expect(sql).toContain("enable row level security")
  })
})
