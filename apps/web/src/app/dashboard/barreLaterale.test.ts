import { describe, it, expect } from "vitest"
import { readFileSync } from "node:fs"
import { join } from "node:path"

// Mesuré sur téléphone : la barre latérale PC (239×686 px) apparaissait à 391 ms
// puis disparaissait à 661 ms, à CHAQUE chargement. Le serveur rendait la version
// PC, et seul un effet client, une fois le JavaScript arrivé, la retirait.
// Ce qui est visible avant le JavaScript doit être décidé par le CSS.

const lire = (p: string) => readFileSync(join(__dirname, p), "utf8")
const shell = lire("./DashboardShell.tsx")
const layout = lire("./layout.tsx")
const css = lire("../globals.css")
const hook = lire("../../lib/useIsMobile.ts")

describe("la barre latérale sur téléphone", () => {
  it("est cachée par une media query dans la feuille de <head>, pas par un état client", () => {
    expect(shell).toContain('className="qf-sidebar"')
    const regle = css.slice(css.indexOf("@media (max-width: 859px)"))
    expect(regle).toMatch(/\.qf-sidebar\s*\{\s*display:\s*none\s*!important/)
  })

  it("la barre du bas est dans le HTML dès le serveur, cachée sur PC par le CSS", () => {
    expect(shell).not.toMatch(/isMobile && !hideMobileNav && \(\s*<MobileNav/)
    expect(shell).toContain('className="qf-mobile-nav"')
    expect(css).toMatch(/@media \(min-width: 860px\)\s*\{\s*\.qf-mobile-nav\s*\{\s*display:\s*none/)
  })

  it("le retrait de la barre (PC) vient d'un cookie lu côté serveur, pas de localStorage à l'hydratation", () => {
    expect(layout).toContain('jar.get("qrfolio_sidebar")')
    expect(layout).toContain("initialCollapsed={collapsed}")
    expect(shell).toContain("useState(initialCollapsed)")
    expect(shell).not.toMatch(/useState\(\(\) => \{[^}]*localStorage/)
    expect(shell).toContain("document.cookie = `qrfolio_sidebar=")
  })

  it("les règles ne vivent pas dans le <style> de fin de composant, qui peut arriver après la première peinture", () => {
    expect(shell).not.toContain(".qf-sidebar {")
  })
})

describe("useIsMobile", () => {
  it("corrige le rendu pendant l'hydratation (useSyncExternalStore) au lieu d'un effet après peinture", () => {
    expect(hook).toContain("useSyncExternalStore(")
    expect(hook).not.toContain("useEffect")
  })

  it("n'est plus dupliqué dans le Print Studio", () => {
    const ps = lire("./print-studio/PrintStudioClient.tsx")
    expect(ps).not.toContain("function useIsMobile")
    expect(ps).toContain('from "@/lib/useIsMobile"')
  })
})
