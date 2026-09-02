import { describe, it, expect } from "vitest"
import { readFileSync } from "node:fs"
import { join, dirname } from "node:path"
import { fileURLToPath } from "node:url"

const SRC = readFileSync(join(dirname(fileURLToPath(import.meta.url)), "DashboardShell.tsx"), "utf-8")
const bloc = (nom: string) => {
  const d = SRC.indexOf(`const ${nom} = [`)
  expect(d, `${nom} introuvable`).toBeGreaterThan(0)
  return SRC.slice(d, SRC.indexOf("\n]", d))
}

// Le menu « Créer » répondait à la question que se pose le LOGICIEL (comment il
// range ses fonctions), pas celle que se pose le commerçant qui l'ouvre : « je
// veux faire quoi ? ». Deux entrées disaient « QR » sans qu'on puisse les
// distinguer, et « support imprimable » est du vocabulaire d'imprimeur.

describe("le menu Créer parle la langue du commerçant", () => {
  const actions = bloc("CREATE_ACTIONS")
  const invite = bloc("GUEST_CREATE_ACTIONS")

  it("plus de page vierge : ni pour un compte, ni pour un visiteur", () => {
    // Partir d'une page blanche est le pire départ pour qui n'a jamais fait de
    // site — et les deux premières entrées mènent au même éditeur, pré-rempli.
    expect(actions).not.toContain("/dashboard/builder/new")
    expect(actions).not.toContain('label: "Créer une page"')
    expect(invite).not.toContain('label: "Page vierge"')
    expect(invite).not.toMatch(/href: "\/dashboard\/builder"/)
  })

  it("aucun libellé ne reprend le jargon d'avant", () => {
    for (const jargon of ["Créer par objectif", "support imprimable", "Importer un média", "Utiliser un modèle"]) {
      expect(`${jargon}: ${actions.includes(jargon)}`).toBe(`${jargon}: false`)
    }
  })

  it("les deux entrées « QR » se distinguent par leur DESTINATION", () => {
    // « QR de mes pages » et « Créer un QR » : impossible de choisir. La vraie
    // différence n'est pas le mot QR, c'est où il mène.
    expect(actions).toContain('label: "QR de mes pages"')
    expect(actions).toContain('label: "QR vers un lien"')
    // ...et ces noms sont EXACTEMENT ceux de la barre latérale : une destination
    // ne peut pas s'appeler autrement selon l'endroit où on la croise.
    expect(SRC).toContain('href: "/dashboard/qr-link", glyph: "dynamic", label: "QR vers un lien"')
  })

  it("chaque entrée a un sous-titre qui dit quand s'en servir", () => {
    const sous = [...actions.matchAll(/sub: "([^"]+)"/g)].map(m => m[1])
    const libelles = [...actions.matchAll(/label: "([^"]+)"/g)].map(m => m[1])
    expect(sous.length).toBe(libelles.length)
    for (const s of sous) {
      expect(s.length, `sous-titre trop court : « ${s} »`).toBeGreaterThan(14)
      expect(s.length, `sous-titre trop long pour un téléphone : « ${s} »`).toBeLessThanOrEqual(52)
    }
  })

  it("l'ordre suit le trajet réel : je fais ma page, j'ai son QR, je l'imprime", () => {
    const libelles = [...actions.matchAll(/label: "([^"]+)"/g)].map(m => m[1])
    expect(libelles[0]).toBe("Créer ma page")
    expect(libelles.indexOf("QR de mes pages")).toBeLessThan(libelles.indexOf("Un support à imprimer"))
  })

  it("les deux entrées de création n'ont plus la même icône", () => {
    // « Créer par objectif » et « Utiliser un modèle » portaient toutes deux
    // Sparkles : deux lignes jumelles dans la liste.
    const icones = [...actions.matchAll(/icon: (\w+)/g)].map(m => m[1])
    expect(new Set(icones).size).toBe(icones.length)
  })
})
