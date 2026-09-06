import { describe, it, expect } from "vitest"
import { readFileSync } from "node:fs"
import { join } from "node:path"
import { secretsEgaux } from "./gardeCron"
import { estAdministrateur, administrateurs } from "./admin"

// P1-36 · sept points de robustesse serveur relevés le 4 septembre.
const api = (p: string) => readFileSync(join(__dirname, "../app/api", p), "utf8")

describe("secret des tâches planifiées", () => {
  it("comparaison à temps constant, même longueur exigée", () => {
    expect(secretsEgaux("abc", "abc")).toBe(true)
    expect(secretsEgaux("abc", "abd")).toBe(false)
    expect(secretsEgaux("ab", "abc")).toBe(false)
    expect(secretsEgaux("", "")).toBe(true)
  })
  it("n'est plus lu ni en query string ni dans le corps", () => {
    const g = readFileSync(join(__dirname, "gardeCron.ts"), "utf8")
    expect(g).not.toContain('searchParams.get("secret")')
    expect(g).not.toContain("body?.secret")
    expect(g).toContain("timingSafeEqual")
  })
})

describe("administrateurs", () => {
  it("liste vide = personne ; comparaison insensible à la casse et aux espaces", () => {
    expect(estAdministrateur("a@b.fr", "")).toBe(false)
    expect(estAdministrateur("a@b.fr", undefined)).toBe(false)
    expect(administrateurs(" A@b.fr , c@d.fr")).toEqual(["a@b.fr", "c@d.fr"])
    expect(estAdministrateur("A@B.FR", "a@b.fr")).toBe(true)
    expect(estAdministrateur(null, "a@b.fr")).toBe(false)
  })
  it("/api/cron/etat est réservé aux administrateurs", () => {
    const s = api("cron/etat/route.ts")
    expect(s).toContain("if (!estAdministrateur(user.email))")
    expect(s).toContain("status: 403")
  })
})

describe("le reste", () => {
  it("contact : limiteur partagé, plus de Map locale", () => {
    const s = api("contact/route.ts")
    expect(s).not.toContain("new Map<")
    expect(s).toContain('rateLimit("contact:" + ip, 3, 3600_000)')
  })
  it("qr-duplicate : short_code unique par crypto, domaine personnalisé non copié", () => {
    const s = api("qr-duplicate/route.ts")
    expect(s).toContain("await uniqueShortCode(supabase)")
    expect(s).not.toContain("Math.random")
    expect(s).toContain('setIfPresent(p, "custom_domain", null)')
  })
  it("les écritures sont vérifiées : qr-label, qr-destination, pages/create", () => {
    const label = api("qr-label/route.ts")
    expect(label).toContain('.select("id")')
    expect(label).toContain("if (!data?.length) return NextResponse.json({ error: \"QR introuvable\" }, { status: 404 })")
    const dest = api("qr-destination/route.ts")
    expect(dest).toContain("if (restoreErr || !touche?.length)")
    const create = api("pages/create/route.ts")
    expect(create).toContain("const { error: qrErr } = await supabaseAdmin.from(\"qr_codes\").insert(")
    expect(create).toContain('await supabaseAdmin.from("pages").delete().eq("id", newPage.id)')
  })
  it("v1 destination : typeof avant trim", () => {
    const s = api("v1/qr/[code]/destination/route.ts")
    expect(s).toContain('const value = typeof corps?.value === "string" ? corps.value : ""')
    expect(s).not.toContain("const { type, value, label } = await req.json()")
  })
  it("plus de clé « constructor » lisible sur un objet littéral", () => {
    expect(api("stripe/checkout/route.ts")).toContain("Object.hasOwn(PRICE_IDS, plan)")
    expect(api("emails/new-lead/route.ts")).toContain("status: 410")
  })
})
