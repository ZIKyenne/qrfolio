import { describe, it, expect } from "vitest"
import { readFileSync } from "node:fs"
import { join, dirname } from "node:path"
import { fileURLToPath } from "node:url"
import { candidats, proprietaire } from "./proprietaireDomaine"

// La résolution publique d'un domaine personnalisé cherchait redirections et
// routes sans regarder qui possède le domaine : détournement possible du trafic
// d'un autre client, et redirection ouverte sur qrowg.com. Désormais tout est
// filtré par le propriétaire vérifié — et rien n'est résolu sans propriétaire.

const ici = dirname(fileURLToPath(import.meta.url))

describe("candidats", () => {
  it("l'hôte puis chacun de ses parents jusqu'au domaine enregistrable", () => {
    expect(candidats("a.b.exemple.fr")).toEqual(["a.b.exemple.fr", "b.exemple.fr", "exemple.fr"])
    expect(candidats("exemple.fr")).toEqual(["exemple.fr"])
    expect(candidats("www.Exemple.FR.")).toEqual(["exemple.fr"])
    expect(candidats("fr")).toEqual([])
  })
})

describe("proprietaire", () => {
  const V = [
    { user_id: "u1", domain: "victim.com", verified: true },
    { user_id: "u2", domain: "booking.victim.com", verified: true },
    { user_id: "u3", domain: "attente.com", verified: false },
  ]
  it("le domaine exact", () => { expect(proprietaire("victim.com", V)?.user_id).toBe("u1") })
  it("un sous-domaine remonte au parent vérifié", () => { expect(proprietaire("shop.victim.com", V)?.user_id).toBe("u1") })
  it("le plus précis l'emporte", () => { expect(proprietaire("booking.victim.com", V)?.user_id).toBe("u2") })
  it("un domaine non vérifié n'a pas de propriétaire", () => { expect(proprietaire("attente.com", V)).toBeNull() })
  it("un domaine inconnu n'a pas de propriétaire", () => { expect(proprietaire("evil.example", V)).toBeNull() })
})

describe("la route de résolution", () => {
  const src = readFileSync(join(ici, "..", "app", "api", "domains", "resolve", "route.ts"), "utf8")
  it("cherche d'abord le propriétaire et s'arrête s'il n'y en a pas", () => {
    expect(src).toContain("const owner = proprietaire(domain, verifs ?? [])")
    expect(src).toMatch(/if \(!owner\) \{\s*return new NextResponse\(notFoundHtml/)
  })
  it("chaque lecture est filtrée par ce propriétaire", () => {
    const n = (src.match(/\.eq\("user_id", owner\.user_id\)/g) || []).length
    expect(n, "redirection exacte, redirection racine, routes, vérification").toBeGreaterThanOrEqual(4)
  })
})

describe("la migration", () => {
  const sql = readFileSync(join(ici, "..", "..", "..", "..", "supabase", "migrations", "20260904120000_domaines_proprietaire.sql"), "utf8")
  it("teste session_user, jamais current_user (piège du SECURITY DEFINER)", () => {
    // Seuls les commentaires ont le droit de citer current_user (pour expliquer le piège).
    const code = sql.split("\n").filter(l => !l.trim().startsWith("--")).join("\n")
    expect(code).not.toMatch(/current_user/)
    expect((sql.match(/session_user/g) || []).length).toBeGreaterThanOrEqual(2)
  })
  it("verrouille l'état des vérifications et la source des redirections et routes", () => {
    expect(sql).toContain("guard_domain_verification_trg")
    expect(sql).toContain("guard_domain_source_trg")
    expect(sql).toContain("guard_domain_route_trg")
    expect(sql).toContain("domaine_verifie_par(new.user_id, v_hote)")
  })
})

// P1-32 · set_primary n'était pas transactionnel (et l'index unique partiel sur
// is_primary faisait échouer « poser le nouveau avant d'effacer l'ancien ») ;
// pages.custom_domain était mis à jour avec l'identifiant de la VÉRIFICATION.
describe("domaine principal et page rattachée", () => {
  const route = readFileSync(join(__dirname, "../app/api/domains/route.ts"), "utf8")
  const sql = readFileSync(join(__dirname, "../../../../supabase/migrations/20260905130000_domaine_principal.sql"), "utf8")

  it("le changement de principal passe par une fonction transactionnelle réservée au service", () => {
    expect(route).toContain('admin.rpc("definir_domaine_principal", { p_user: user.id, p_domain: domain })')
    expect(route).not.toContain('.update({ is_primary: true })')
    expect(sql).toContain("security definer")
    expect(sql).toContain("revoke all on function public.definir_domaine_principal(uuid, text) from public, anon, authenticated")
    // l'ancien principal est retiré AVANT que le nouveau soit posé, dans la même transaction
    expect(sql.indexOf("set is_primary = false")).toBeLessThan(sql.indexOf("set is_primary = true"))
  })

  it("custom_domain cible la page de la vérification, pas la vérification elle-même", () => {
    expect(route).toContain('.select("txt_record, id, page_id")')
    expect(route).toContain("const pageCible = page_id || existing.page_id")
    expect(route).not.toContain('.eq("id", page_id || existing.id)')
  })

  it("le domaine est normalisé et validé une fois, en tête de route", () => {
    const post = route.slice(route.indexOf("export async function POST"))
    expect(post).toContain('const domain = typeof body.domain === "string" ? normalizeDomain(body.domain) : ""')
    expect(post.indexOf("isValidDomain(domain)")).toBeLessThan(post.indexOf('if (action === "verify")'))
  })
})
