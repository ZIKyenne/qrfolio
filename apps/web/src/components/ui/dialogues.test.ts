import { describe, it, expect } from "vitest"
import { readFileSync, readdirSync, statSync } from "node:fs"
import { join } from "node:path"

// Quatre fenêtres écrites à la main n'avaient ni rôle, ni piège de focus, ni
// restitution du focus : au clavier ou au lecteur d'écran, on tombait derrière
// elles. Et la coquille mobile de l'éditeur appelait window.confirm — une boîte
// qui bloque le fil d'exécution, ignore la charte et, sur iOS, s'ouvre derrière
// la feuille de réglages.

const SRC = join(__dirname, "../..")
const lire = (p: string) => readFileSync(join(SRC, p), "utf8")

describe("le comportement modale vit à un seul endroit", () => {
  const hook = lire("components/ui/useDialogue.ts")

  it("useDialogue tient les cinq garanties", () => {
    expect(hook).toContain('role: "dialog"')
    expect(hook).toContain('"aria-modal": true')
    expect(hook).toContain('e.key === "Escape"')
    expect(hook).toContain('e.key !== "Tab"')          // piège de focus
    expect(hook).toContain("focusPrecedent.current?.focus?.()")
    expect(hook).toContain('document.body.style.overflow = "hidden"')
  })

  it("la primitive Modal l'utilise plutôt que de le recopier", () => {
    const modal = lire("components/ui/Modal.tsx")
    expect(modal).toContain("useDialogue(open, onClose")
    expect(modal).not.toContain("FOCUSABLE")
  })
})

describe("les fenêtres écrites à la main l'ont adopté", () => {
  const CAS: [string, string][] = [
    ["app/dashboard/templates/TemplatePreviewModal.tsx", "Aperçu du modèle"],
    ["app/dashboard/templates/page.tsx", "Créer une page depuis ce modèle"],
    ["app/dashboard/builder/BuilderV4.tsx", "Actions du bloc"],
  ]
  for (const [f, nom] of CAS) {
    it(`${f} → « ${nom} »`, () => {
      const src = lire(f)
      expect(src).toContain("useDialogue(")
      expect(src).toContain(nom)
      expect(src).toMatch(/\{\.\.\.(dlgProps|menuBlocDlgProps)\}/)
    })
  }

  it("la fenêtre « Publier » passe par la primitive", () => {
    expect(lire("app/dashboard/builder/BuilderV4.tsx")).toContain("<Modal open onClose={() => setShowPublishPopup(false)}")
  })
})

describe("plus de boîte native", () => {
  it("la coquille mobile reçoit la confirmation de l'éditeur", () => {
    const shell = lire("app/dashboard/builder/MobileBuilderShell.tsx")
    expect(shell).not.toContain("window.confirm")
    expect(shell).toContain("confirm: (message: string) => Promise<boolean>")
    expect(shell).toContain("confirm={p.confirm}")
    expect(lire("app/dashboard/builder/BuilderV4.tsx")).toContain('confirm={(m) => confirm({ title: "Confirmer", message: m, confirmLabel: "Confirmer" })}')
  })

  it("aucun écran n'appelle window.confirm, window.alert ni window.prompt", () => {
    const fautifs: string[] = []
    const marcher = (d: string) => {
      for (const n of readdirSync(d).sort()) {
        const p = join(d, n)
        if (statSync(p).isDirectory()) { if (n !== "e2e-harness") marcher(p) }
        else if (/\.tsx?$/.test(n) && !/\.test\./.test(n)) {
          const src = readFileSync(p, "utf8")
          for (const [i, l] of src.split("\n").entries()) {
            if (l.trim().startsWith("//")) continue
            if (/\bwindow\.(confirm|alert|prompt)\s*\(/.test(l)) fautifs.push(`${p.replace(SRC, "")}:${i + 1}`)
          }
        }
      }
    }
    marcher(join(SRC, "app"))
    marcher(join(SRC, "components"))
    expect(fautifs).toEqual([])
  })
})
