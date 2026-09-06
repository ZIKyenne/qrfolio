import { describe, it, expect } from "vitest"
import { readFileSync } from "node:fs"
import { join } from "node:path"
import { MOBILE_BOTTOM_NAV, opensSheet, defaultSnap, openSheet, restoreSheet } from "./builderMobile"

// Mesuré au téléphone le 4 septembre, drapeau NEXT_PUBLIC_BUILDER_REDESIGN forcé :
// la coquille mobile remplace tout l'éditeur, et quatre réglages n'avaient alors
// plus aucune porte — le thème de la page, les modèles de page, le QR code, et le
// nom de la page (affiché, jamais modifiable). Le drapeau ne peut pas s'allumer
// tant que ces quatre-là manquent.

const ICI = __dirname
const lire = (f: string) => readFileSync(join(ICI, f), "utf8")

describe("l'onglet « Style » existe et ouvre une feuille", () => {
  it("il est dans la barre du bas, après « Modifier »", () => {
    const ids = MOBILE_BOTTOM_NAV.map(n => n.id)
    expect(ids).toContain("style")
    expect(ids.indexOf("style")).toBe(ids.indexOf("edit") + 1)
    expect(MOBILE_BOTTOM_NAV.find(n => n.id === "style")?.label).toBe("Style")
  })

  it("il se comporte comme les autres onglets à feuille", () => {
    expect(opensSheet("style")).toBe(true)
    expect(defaultSnap("style")).toBe("medium")
    expect(openSheet("style")).toEqual({ open: true, tab: "style", snap: "medium" })
    expect(restoreSheet("style")).toEqual({ open: true, tab: "style", snap: "medium" })
  })
})

describe("la coquille rend ce que l'onglet promet", () => {
  const shell = lire("MobileBuilderShell.tsx")

  it("le thème et les modèles de page vivent dans la feuille « Style »", () => {
    expect(shell).toContain('effectiveSheet.tab === "style"')
    expect(shell).toContain("p.renderTheme()")
    expect(shell).toContain("p.renderTemplates()")
    expect(shell).toContain("Partir d'un modèle")
  })

  it("le QR est dans la feuille « Publier »", () => {
    const i = shell.indexOf('effectiveSheet.tab === "publish"')
    expect(i).toBeGreaterThan(-1)
    expect(shell.slice(i)).toContain("p.renderQr()")
  })

  it("le titre de la feuille « Style » est nommé", () => {
    expect(shell).toContain('style: "Style de la page"')
  })

  it("le nom de la page descend jusqu'à l'en-tête", () => {
    expect(shell).toContain("onRename={p.onRename}")
  })
})

describe("l'en-tête laisse renommer la page", () => {
  const header = lire("MobileBuilderHeader.tsx")

  it("un champ nommé, pas un texte figé", () => {
    expect(header).toContain('aria-label="Nom de la page"')
    expect(header).toContain("p.onRename!(e.target.value)")
  })

  it("sans la fonction, le nom reste en lecture seule — aucun champ mort", () => {
    expect(header).toContain("p.onRename\n")
    expect(header).toContain('{p.pageName || "Ma page"}')
  })
})

describe("l'éditeur branche les quatre", () => {
  const v4 = lire("BuilderV4.tsx")
  const i = v4.indexOf("<MobileBuilderShell")
  // La balise se ferme à son propre niveau d'indentation : les `/>` intérieurs
  // (ThemePanel, QRCanvas) ne doivent pas couper la lecture.
  const appel = v4.slice(i, v4.indexOf("\n          />", i))

  it("les quatre passerelles sont passées à la coquille", () => {
    expect(i).toBeGreaterThan(-1)
    for (const prop of ["onRename={", "renderTheme={", "renderTemplates={", "renderQr={"]) {
      expect(appel).toContain(prop)
    }
  })

  it("renommer passe par l'historique : Annuler rend l'ancien nom", () => {
    expect(appel).toContain('undoRedo.push({ blocks: blocksKbRef.current, theme: themeRef.current, name: v }, "pagename")')
  })

  it("le thème passé est le vrai panneau, avec le même commit que sur PC", () => {
    expect(appel).toContain("<ThemePanel theme={theme} onThemeChange={commitTheme} userPlan={userPlan}")
  })

  it("les modèles ouvrent la fenêtre déjà écrite", () => {
    expect(appel).toContain("setShowTemplates(true)")
  })

  it("le QR n'est proposé que s'il mène quelque part", () => {
    expect(appel).toContain('pageStatus === "published" && qrTarget')
    expect(appel).toContain("Le QR est généré dès que la page est en ligne.")
    expect(appel).toContain("onClick={downloadQrPng}")
  })
})
