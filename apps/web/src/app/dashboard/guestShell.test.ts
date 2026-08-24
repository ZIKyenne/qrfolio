import { describe, it, expect } from "vitest"
import { readFileSync } from "node:fs"
import { join } from "node:path"

// Ce que voit un visiteur sans compte pendant sa première minute. Chaque règle
// correspond à un défaut réellement constaté : un menu de 12 entrées dont 9
// menaient à la page de connexion, et un menu qui clignotait à l'hydratation.

const read = (p: string) => readFileSync(join(__dirname, p), "utf8")
const SHELL = read("DashboardShell.tsx")
const LAYOUT = read("layout.tsx")
const MOBILE = readFileSync(join(__dirname, "../../components/MobileNav.tsx"), "utf8")

/** Pages du tableau de bord qui renvoient un visiteur anonyme vers la connexion. */
const MURÉES = [
  "/dashboard", "/dashboard/qr-codes", "/dashboard/print-studio", "/dashboard/analytics",
  "/dashboard/leads", "/dashboard/domains", "/dashboard/redirects", "/dashboard/onboarding",
  "/dashboard/subdomain",
]

function hrefsOf(src: string, constName: string): string[] {
  const start = src.indexOf(`const ${constName}`)
  expect(start, `${constName} introuvable`).toBeGreaterThan(-1)
  const end = src.indexOf("\n]", start)
  return [...src.slice(start, end).matchAll(/href: ['"]([^'"]+)['"]/g)].map(m => m[1])
}

describe("le menu d'un visiteur ne mène jamais à un mur", () => {
  it("aucune entrée de la barre latérale ne demande un compte", () => {
    const bloquées = hrefsOf(SHELL, "GUEST_NAV").filter(h => MURÉES.includes(h))
    expect(bloquées).toEqual([])
  })

  it("aucune action du bouton « Créer » ne demande un compte", () => {
    const bloquées = hrefsOf(SHELL, "GUEST_CREATE_ACTIONS").filter(h => MURÉES.includes(h))
    expect(bloquées).toEqual([])
  })

  it("aucun onglet de la barre mobile ne demande un compte", () => {
    const bloqués = hrefsOf(MOBILE, "GUEST_TABS").filter(h => MURÉES.includes(h))
    expect(bloqués).toEqual([])
  })

  it("le menu complet, lui, reste intact pour un utilisateur connecté", () => {
    const complet = hrefsOf(SHELL, "NAV_GROUPS")
    expect(complet.length).toBeGreaterThanOrEqual(12)
    for (const h of ["/dashboard", "/dashboard/analytics", "/dashboard/team", "/dashboard/settings"]) {
      expect(complet, `${h} a disparu du menu complet`).toContain(h)
    }
  })

  it("le visiteur garde de quoi faire quelque chose", () => {
    const g = hrefsOf(SHELL, "GUEST_NAV")
    expect(g).toContain("/dashboard/templates")
    expect(g).toContain("/dashboard/builder")
    expect(g.length).toBeGreaterThanOrEqual(2)
  })
})

describe("ce qui remplace les éléments de compte", () => {
  it("« Passer au Pro » ne s'affiche pas à qui n'a pas de plan", () => {
    expect(SHELL).toContain("{!guest && (() => {")
  })

  it("il est remplacé par une invitation à créer un compte", () => {
    expect(SHELL).toContain("{guest && (")
    expect(SHELL).toContain("Créer mon compte")
    expect(SHELL).toContain('href="/auth/signup"')
  })

  it("la ligne de compte reste réservée aux connectés", () => {
    expect(SHELL).toContain("{user && (")
  })
})

describe("pas de clignotement du menu", () => {
  it("la session est décidée côté serveur, avant le premier rendu", () => {
    // Sans ça, le HTML servi portait le menu complet et un visiteur le voyait
    // se réduire après l'hydratation — le temps d'un aller-retour réseau.
    expect(LAYOUT).toContain('import { cookies } from "next/headers"')
    expect(LAYOUT).toMatch(/sb-\.\+-auth-token/)
    expect(LAYOUT).toContain("initialSignedIn={signedIn}")
  })

  it("la coquille part de cette valeur, puis getUser() confirme", () => {
    expect(SHELL).toContain("useState<boolean>(initialSignedIn)")
    expect(SHELL).toContain("setSignedIn(!!data.user)")
  })

  it("plus aucune devinette à partir du cookie côté client", () => {
    expect(SHELL).not.toContain("looksSignedIn")
  })
})

describe("la porte d'entrée publique", () => {
  const CREER = readFileSync(join(__dirname, "../creer/page.tsx"), "utf8")
  const CREER_LAYOUT = readFileSync(join(__dirname, "../creer/layout.tsx"), "utf8")
  const HOME = readFileSync(join(__dirname, "../HomeClient.tsx"), "utf8")
  const SITEMAP = readFileSync(join(__dirname, "../sitemap.ts"), "utf8")
  const ROBOTS = readFileSync(join(__dirname, "../robots.ts"), "utf8")

  it("sert la MÊME galerie, sans la dupliquer", () => {
    expect(CREER).toContain('from "../dashboard/templates/page"')
  })

  it("est indexable : canonique, description, et pas dans les zones bloquées", () => {
    expect(CREER).toContain("alternates: { canonical: `${APP}/creer` }")
    expect(CREER).toContain("openGraph:")
    expect(CREER).toContain("twitter:")
    expect(ROBOTS).not.toContain('"/creer')
    expect(SITEMAP).toContain("${baseUrl}/creer")
  })

  it("porte les fournisseurs dont la galerie a besoin", () => {
    // Sans eux la page renvoyait une erreur 500 : useToast hors de son contexte.
    expect(CREER_LAYOUT).toContain("ToastProvider")
    expect(CREER_LAYOUT).toContain("ConfirmProvider")
  })

  it("dit chez qui on est et comment se connecter", () => {
    expect(CREER_LAYOUT).toContain("QrowgLogo")
    expect(CREER_LAYOUT).toContain('href="/auth/login"')
  })

  it("les appels à l'action de la vitrine y mènent, plus vers « dashboard »", () => {
    expect(HOME).toContain('"/creer"')
    expect(HOME).not.toContain('"/dashboard/templates"')
  })
})
