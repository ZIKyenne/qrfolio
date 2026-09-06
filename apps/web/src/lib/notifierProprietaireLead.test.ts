import { describe, it, expect } from "vitest"
import { readFileSync } from "node:fs"
import { join, dirname } from "node:path"
import { fileURLToPath } from "node:url"
import { bornerLead } from "./notifierProprietaireLead"

// /api/emails/new-lead était un relais d'e-mails ouvert : anonyme, sans lead
// réel, contenu libre, envoi depuis @qrowg.com au propriétaire de n'importe
// quelle page. L'e-mail part désormais depuis /api/leads après l'insertion.

const ici = dirname(fileURLToPath(import.meta.url))

describe("relais d'e-mails fermé", () => {
  it("la route publique répond 410 et n'envoie plus rien", () => {
    const r = readFileSync(join(ici, "..", "app", "api", "emails", "new-lead", "route.ts"), "utf8")
    expect(r).toContain("{ status: 410 }")
    expect(r).not.toContain("resend.emails.send")
  })
  it("le navigateur n'appelle plus cette route", () => {
    expect(readFileSync(join(ici, "submitLead.ts"), "utf8")).not.toContain("/api/emails/new-lead")
  })
  it("/api/leads notifie après l'insertion réussie, jamais avant", () => {
    const r = readFileSync(join(ici, "..", "app", "api", "leads", "route.ts"), "utf8")
    const iErr = r.indexOf('{ error: "Enregistrement impossible" }'), iNotif = r.indexOf("notifierProprietaireLead({")
    expect(iNotif).toBeGreaterThan(iErr)
    expect(r).toContain("after(async () => {")
  })
})

describe("bornerLead", () => {
  it("borne chaque champ et le nombre de lignes de data", () => {
    const b = bornerLead({ pageId: "p", name: "x".repeat(500), message: "m".repeat(5000), data: Object.fromEntries(Array.from({ length: 60 }, (_, i) => ["k" + i, "v".repeat(900)])) })
    expect(b.name!.length).toBe(200); expect(b.message!.length).toBe(3000)
    expect(Object.keys(b.data!).length).toBe(30)
    expect(String(b.data!["k0"]).length).toBe(500)
  })
  it("ignore les clés héritées et les non-chaînes", () => {
    const d = JSON.parse('{"__proto__": {"x": 1}, "ok": 42}')
    const b = bornerLead({ pageId: "p", data: d, name: 12 as any })
    expect(b.data).toEqual({ ok: "42" })
    expect(b.name).toBeNull()
  })
})
