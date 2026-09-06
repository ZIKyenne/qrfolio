import { describe, it, expect } from "vitest"
import { readFileSync, readdirSync, statSync } from "node:fs"
import { join } from "node:path"

// Migration 20260905120000 : log_activity / increment_redirect_hit réservés à la
// clé de service, team_members sans insertion hors service, triggers de quota en
// SECURITY DEFINER. Le comportement a été exercé sur un Postgres 16 local
// (insertion d'un admin refusée, promotion owner refusée, retrait de soi permis).

const sql = readFileSync(join(__dirname, "../../../../supabase/migrations/20260905120000_durcissement_base.sql"), "utf8")

describe("durcissement de la base", () => {
  it("les deux fonctions SECURITY DEFINER ne sont plus exécutables par anon/authenticated — retrouvées par nom", () => {
    // En production, la signature exacte n'existait pas (42883) : on résout par pg_proc,
    // et une fonction absente n'arrête plus le lot.
    expect(sql).toContain("p.proname in ('log_activity', 'increment_redirect_hit')")
    expect(sql).toContain("revoke all on function %s from public, anon, authenticated")
    expect(sql).toContain("grant execute on function %s to service_role")
    expect(sql).not.toMatch(/revoke all on function public\.log_activity\(/)
  })

  it("team_members : plus de FOR ALL ; update borné (jamais owner) ; delete = soi, owner ou admin", () => {
    expect(sql).toContain('drop policy if exists "Gestion membres equipe"')
    expect(sql).toContain("to_regclass('public.team_members') is null")
    expect(sql).toMatch(/create policy "Maj membres equipe" on public\.team_members for update/)
    expect(sql).toContain("public.team_role_rank(role) < public.team_role_rank('owner')")
    expect(sql).toMatch(/create policy "Retrait membres equipe" on public\.team_members for delete/)
    expect(sql).not.toMatch(/for insert/)
  })

  it("les triggers de quota lisent profiles hors RLS", () => {
    expect(sql).toContain("p.proname in ('quota_instant_qrs', 'quota_qr_codes')")
    expect(sql).toContain("alter function %s security definer")
  })

  it("aucun code applicatif n'écrit team_members ou n'appelle ces fonctions avec le client de session", () => {
    const racine = join(__dirname, "..")
    const fichiers: string[] = []
    const marcher = (d: string) => { for (const n of readdirSync(d)) { const p = join(d, n); if (statSync(p).isDirectory()) marcher(p); else if (/\.tsx?$/.test(n) && !/\.test\./.test(n)) fichiers.push(p) } }
    marcher(racine)
    const fautifs: string[] = []
    for (const f of fichiers) {
      const src = readFileSync(f, "utf8")
      for (const [i, l] of src.split("\n").entries()) {
        if (/rpc\("(log_activity|increment_redirect_hit)"/.test(l) && !/admin\b/.test(l) && !/createAdminClient/.test(src)) fautifs.push(`${f}:${i + 1}`)
        if (/from\("team_members"\)\.(insert|upsert)/.test(l) && !/admin\./.test(l)) fautifs.push(`${f}:${i + 1}`)
      }
    }
    expect(fautifs).toEqual([])
  })
})
