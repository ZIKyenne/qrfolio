import { describe, it, expect } from "vitest"
import { readFileSync } from "node:fs"
import { join } from "node:path"
import { estFichierStatique } from "./middleware"

// `pathname.includes(".")` court-circuitait la résolution des domaines
// personnalisés : client.com/foo.bar servait le contenu de qrowg.com sous l'hôte
// du client.
describe("le middleware ne saute que les vrais fichiers", () => {
  it("extension en fin de chemin = fichier", () => {
    for (const p of ["/robots.txt", "/logo.png", "/fonts/inter.woff2", "/sitemap.xml", "/site.json"]) expect(estFichierStatique(p), p).toBe(true)
  })
  it("un point ailleurs n'est pas un fichier (un slug de page ne contient jamais de point)", () => {
    for (const p of ["/foo.bar/baz", "/v1.2/page", "/carte.x", "/a.toolongext"]) expect(estFichierStatique(p), p).toBe(false)
  })
  it("le middleware l'utilise à la place de includes('.')", () => {
    const src = readFileSync(join(__dirname, "middleware.ts"), "utf8")
    expect(src).not.toContain('pathname.includes(".")')
    expect(src).toContain("estFichierStatique(pathname)")
  })
  it("les deux index manquants sont créés", () => {
    const sql = readFileSync(join(__dirname, "../../../supabase/migrations/20260905140000_index_utilisateur.sql"), "utf8")
    expect(sql).toContain("idx_qr_codes_user_id on public.qr_codes(user_id)")
    expect(sql).toContain("idx_team_members_user_id on public.team_members(user_id)")
    expect(sql).toContain("to_regclass('public.team_members') is not null")
  })
})
