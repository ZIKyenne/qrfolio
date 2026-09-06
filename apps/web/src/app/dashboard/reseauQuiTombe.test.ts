import { describe, it, expect } from "vitest"
import { readFileSync } from "node:fs"
import { join } from "node:path"

// Quatre formulaires lançaient un fetch sans try/finally : si le réseau tombait,
// `submitting` n'était jamais remis à false et le bouton tournait pour toujours.
// Et trois suppressions retiraient la ligne de l'écran AVANT la réponse du serveur.

const lire = (p: string) => readFileSync(join(__dirname, p), "utf8")

function corps(src: string, signature: string): string {
  const i = src.indexOf(signature)
  expect(i, signature).toBeGreaterThan(-1)
  // jusqu'à la prochaine fonction de même indentation
  const fin = src.indexOf("\n  }\n", i)
  return src.slice(i, fin)
}

describe("si le réseau tombe", () => {
  it("le bouton « Créer » des modèles se libère", () => {
    const c = corps(lire("./templates/page.tsx"), "async function handleCreate()")
    expect(c).toContain("finally {")
    expect(c).toContain("setSubmitting(false)")
    expect(c).toContain("catch {")
  })

  it("le bouton de l'assistant de modèle se libère", () => {
    const c = corps(lire("./templates/TemplateWizardModal.tsx"), "async function create()")
    expect(c).toContain("finally {")
    expect(c).toContain("setBusy(false)")
  })

  it("l'ajout de domaine se libère et lit res.ok", () => {
    const c = corps(lire("./domains/DomainsPage.tsx"), "async function addDomain()")
    expect(c).toContain("finally {")
    expect(c).toContain("!res.ok")
  })

  it("l'enregistrement, l'interrupteur et la suppression d'une redirection se libèrent", () => {
    const src = lire("./redirects/RedirectsPanel.tsx")
    for (const sig of ["async function save()", "async function toggle(", "async function del("]) {
      const c = corps(src, sig)
      expect(c, sig).toContain("finally {")
      expect(c, sig).toContain("!res.ok")
    }
  })
})

describe("une suppression n'est affichée qu'après confirmation du serveur", () => {
  it("domaines : la ligne reste si le serveur refuse", () => {
    const c = corps(lire("./domains/DomainsPage.tsx"), "async function deleteDomain(")
    const filtre = c.indexOf("setDomains(prev => prev.filter")
    const verif = c.indexOf("!res.ok")
    expect(verif).toBeGreaterThan(-1)
    expect(filtre).toBeGreaterThan(verif)
  })

  it("domaine principal : l'écran suit la réponse, pas le clic", () => {
    const c = corps(lire("./domains/DomainsPage.tsx"), "async function setPrimaryDomain(")
    expect(c.indexOf("setDomains(")).toBeGreaterThan(c.indexOf("!res.ok"))
  })

  it("la route DELETE des domaines ne répond plus ok quand la base a refusé", () => {
    const route = lire("../api/domains/route.ts")
    const i = route.indexOf("export async function DELETE")
    expect(route.slice(i)).toContain("const { error: de } = await supabase")
    expect(route.slice(i)).toContain("if (de) return NextResponse.json({ error:")
  })
})

describe("« Plan pro requis »", () => {
  it("nomme le plan comme partout ailleurs et propose « Voir les offres »", () => {
    const src = lire("./templates/page.tsx")
    expect(src).not.toContain("toast.error(`Plan ${previewTemplate.plan} requis`)")
    expect(src).toContain("getPlan(plan).label")
    expect(src).toContain('label: "Voir les offres", onClick: () => router.push("/upgrade?reason=template")')
  })
})
