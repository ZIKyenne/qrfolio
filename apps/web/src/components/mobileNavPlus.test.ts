import { describe, it, expect } from "vitest"
import { readFileSync } from "node:fs"
import { join } from "node:path"

// Sur téléphone, la barre du bas avait cinq onglets et rien d'autre : Messages,
// Médias, Équipe, Domaines, Redirections, Paramètres n'avaient aucune entrée, et
// le badge « non lus » calculé par le shell n'avait pas de destination.

const nav = readFileSync(join(__dirname, "MobileNav.tsx"), "utf8")
const shell = readFileSync(join(__dirname, "../app/dashboard/DashboardShell.tsx"), "utf8")

// Toutes les routes de la barre latérale PC (hors invité).
const routesPc = [...shell.slice(shell.indexOf("const NAV_GROUPS"), shell.indexOf("const GUEST_NAV")).matchAll(/href: "([^"]+)"/g)].map(m => m[1])
const routesMobile = [...nav.matchAll(/href: '([^']+)'/g)].map(m => m[1])

describe("la barre mobile", () => {
  it("donne une entrée à CHAQUE section de la barre latérale PC", () => {
    const manquantes = routesPc.filter(r => !routesMobile.includes(r))
    expect(manquantes).toEqual([])
  })

  it("a un onglet « Plus » qui ouvre une feuille, actif sur les routes qu'elle liste", () => {
    expect(nav).toContain("key: 'more', label: 'Plus'")
    expect(nav).toContain("routes: MORE_ITEMS.map(m => m.href)")
    expect(nav).toContain('aria-haspopup="dialog"')
    expect(nav).toContain("aria-label=\"Toutes les sections\"")
  })

  it("le badge des messages non lus a une destination : l'onglet Plus et la ligne Messages", () => {
    expect(nav).toContain("(tab.href === '/dashboard' || tab.more) && unread > 0")
    expect(nav).toContain("it.href === '/dashboard/leads' && unread > 0")
  })

  it("la feuille se ferme à Échap et à la navigation", () => {
    expect(nav).toContain("if (e.key === 'Escape') setMoreOpen(false)")
    expect(nav).toContain("useEffect(() => { setMoreOpen(false) }, [pathname])")
  })

  it("la grille suit le nombre d'onglets (l'invité en a 4, pas 5)", () => {
    expect(nav).toContain("gridTemplateColumns: `repeat(${n}, 1fr)`")
    expect(nav).not.toContain("repeat(5, 1fr)")
  })
})
