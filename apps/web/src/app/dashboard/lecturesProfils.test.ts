import { describe, it, expect } from "vitest"
import { readFileSync, readdirSync, statSync } from "node:fs"
import { join } from "node:path"

// Une policy `Profils publics` (USING true) laissait n'importe quel compte connecté
// lire TOUTE la table `profiles` : email, nom, plan, préférences, identifiants
// Stripe de tous les autres comptes. Elle existait pour une seule raison — la
// vérification « ce nom d'utilisateur est-il libre ? », faite côté navigateur avec
// la clé publique. Une question légitime, une porte grande ouverte.
//
// Ce test garde la règle qui rend la policy inutile : côté navigateur, on ne lit
// que sa propre ligne. Toute lecture croisée passe par le serveur.

const SRC = join(__dirname, "../..")

function fichiersClient(dir: string, acc: string[] = []): string[] {
  for (const e of readdirSync(dir).sort()) {
    const p = join(dir, e)
    if (statSync(p).isDirectory()) {
      // Le serveur utilise la clé de service et contourne RLS : hors sujet ici.
      if (e === "api") continue
      fichiersClient(p, acc)
      continue
    }
    if (/\.tsx?$/.test(e) && !/\.test\.tsx?$/.test(e)) acc.push(p)
  }
  return acc
}

// Fichiers qui s'exécutent avec la clé PUBLIQUE (client Supabase du navigateur).
const AVEC_CLE_PUBLIQUE = fichiersClient(SRC).filter(f => {
  const src = readFileSync(f, "utf8")
  return src.includes('from("profiles")') && src.includes("@/lib/supabase/client")
})

describe("le navigateur ne lit jamais le profil de quelqu'un d'autre", () => {
  it("il y a bien des lectures à surveiller", () => {
    expect(AVEC_CLE_PUBLIQUE.length).toBeGreaterThan(3)
  })

  for (const f of AVEC_CLE_PUBLIQUE) {
    const nom = f.slice(f.indexOf("/src/") + 5)
    it(`${nom} filtre chaque accès sur son propre identifiant`, () => {
      const src = readFileSync(f, "utf8")
      const fautes: string[] = []
      let i = src.indexOf('from("profiles")')
      while (i !== -1) {
        const suite = src.slice(i, i + 400)
        // `.eq("id", …)` — la seule ligne qu'un compte a le droit de toucher.
        if (!/\.eq\(\s*"id"\s*,/.test(suite)) {
          fautes.push(suite.split("\n").slice(0, 3).join(" ").trim().slice(0, 140))
        }
        i = src.indexOf('from("profiles")', i + 1)
      }
      expect(fautes, "lecture ou écriture non filtrée sur profiles").toEqual([])
    })
  }
})

describe("la vérification d'un nom d'utilisateur passe par le serveur", () => {
  const route = readFileSync(join(SRC, "app/api/account/username-libre/route.ts"), "utf8")

  it("exige une session", () => {
    expect(route).toContain("getUser()")
    expect(route).toContain('status: 401')
  })

  it("limite le débit, pour qu'on ne puisse pas énumérer les noms", () => {
    expect(route).toContain("rateLimit(")
  })

  it("ne renvoie qu'un booléen, jamais la ligne trouvée", () => {
    expect(route).toMatch(/libre: /)
    expect(route).not.toMatch(/NextResponse\.json\(\{[^}]*\bemail\b/)
    expect(route).not.toMatch(/NextResponse\.json\(\{[^}]*\bdata\b\s*[,}]/)
  })

  it("l'écran Profil l'appelle au lieu d'interroger la table", () => {
    const page = readFileSync(join(SRC, "app/dashboard/profile/page.tsx"), "utf8")
    expect(page).toContain("/api/account/username-libre")
    expect(page).not.toMatch(/from\("profiles"\)[\s\S]{0,120}\.eq\("username"/)
  })
})

// /api/subdomain lisait profiles avec le client de session, qui ne voit que SA
// ligne : tout nom pris par un autre compte était annoncé « disponible », puis
// le POST retombait sur 23505 (500).
describe("la disponibilité d'un sous-domaine est testée avec la clé de service", () => {
  const route = readFileSync(join(__dirname, "../api/subdomain/route.ts"), "utf8")
  const get = route.slice(route.indexOf("export async function GET"), route.indexOf("export async function POST"))
  const post = route.slice(route.indexOf("export async function POST"), route.indexOf("export async function DELETE"))

  it("GET : session, débit borné, lecture par createAdminClient, jamais l'identifiant du tiers", () => {
    expect(get).toContain('if (!user) return NextResponse.json({ error: "Non authentifié" }, { status: 401 })')
    expect(get).toContain('rateLimit("subdomain:" + ipOf(req)')
    expect(get).toContain("createAdminClient()")
    expect(get).not.toContain('.select("id, username")')
  })

  it("POST : unicité par la clé de service, écriture par la session, 23505 → 409", () => {
    expect(post).toContain("createAdminClient()")
    expect(post).toContain('error?.code === "23505"')
    expect(post).toContain("status: 409")
    // L'écriture reste sous RLS : jamais l'admin pour l'update de profiles.
    const update = post.slice(post.indexOf('.update({ username: clean })') - 120, post.indexOf('.update({ username: clean })'))
    expect(update).toContain("await supabase")
    expect(update).not.toContain("createAdminClient")
  })
})
