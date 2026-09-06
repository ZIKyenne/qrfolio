import { describe, it, expect } from "vitest"
import { readFileSync } from "node:fs"
import { join, dirname } from "node:path"
import { fileURLToPath } from "node:url"

// Profil › Sécurité proposait « Supprimer mon compte » avec un bouton final sans
// onClick : on tapait SUPPRIMER, le bouton s'activait, rien ne se passait. La
// vraie suppression vit dans Paramètres. Une seule maison.

const ici = dirname(fileURLToPath(import.meta.url))
const profil = readFileSync(join(ici, "page.tsx"), "utf8")
const parametres = readFileSync(join(ici, "..", "settings", "page.tsx"), "utf8")

describe("suppression de compte : une seule maison", () => {
  it("le Profil ne porte plus de faux formulaire de suppression", () => {
    expect(profil).not.toContain("dangerConfirm")
    expect(profil).not.toContain("Confirmer la suppression")
    expect(profil).toContain('href="/dashboard/settings#danger"')
  })
  it("Paramètres porte l'ancre et la vraie suppression", () => {
    expect(parametres).toContain('id="danger"')
    expect(parametres).toContain('fetch("/api/account/delete"')
  })
})
