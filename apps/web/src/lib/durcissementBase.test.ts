import { describe, it, expect } from "vitest"
import { readFileSync, readdirSync, statSync } from "node:fs"
import { join } from "node:path"

// Migration 20260905120000 : log_activity / increment_redirect_hit réservés à la
// clé de service, team_members sans insertion hors service, triggers de quota en
// SECURITY DEFINER. Le comportement a été exercé sur un Postgres 16 local
// (insertion d'un admin refusée, promotion owner refusée, retrait de soi permis).

const sql = readFileSync(join(__dirname, "../../../../supabase/migrations/20260905120000_durcissement_base.sql"), "utf8")

describe("durcissement de la base", () => {
  it("les deux fonctions SECURITY DEFINER ne sont plus exécutables par anon/authenticated", () => {
    expect(sql).toContain("revoke all on function public.log_activity(uuid, activity_event_type, text, text, uuid, text, text, jsonb) from public, anon, authenticated")
    expect(sql).toContain("revoke all on function public.increment_redirect_hit(uuid) from public, anon, authenticated")
    expect(sql).toContain("grant execute on function public.increment_redirect_hit(uuid) to service_role")
  })

  it("team_members : plus de FOR ALL ; update borné (jamais owner) ; delete = soi, owner ou admin", () => {
    expect(sql).toContain('drop policy if exists "Gestion membres equipe"')
    expect(sql).toMatch(/create policy "Maj membres equipe" on public\.team_members for update/)
    expect(sql).toContain("public.team_role_rank(role) < public.team_role_rank('owner')")
    expect(sql).toMatch(/create policy "Retrait membres equipe" on public\.team_members for delete/)
    expect(sql).not.toMatch(/for insert/)
  })

  it("les triggers de quota lisent profiles hors RLS", () => {
    expect(sql).toContain("alter function public.quota_instant_qrs() security definer")
    expect(sql).toContain("alter function public.quota_qr_codes() security definer")
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
