import { describe, it, expect } from "vitest"
import { readFileSync } from "node:fs"
import { join, dirname } from "node:path"
import { fileURLToPath } from "node:url"

// Le menu « ⋯ » d'un QR posait un état `confirmAction` que rien ne rendait :
// « Mettre en pause », « Archiver » et « Supprimer » ne faisaient strictement
// rien, sans message. Un commerçant ne pouvait ni suspendre ni supprimer un QR.

const src = readFileSync(join(dirname(fileURLToPath(import.meta.url)), "QRStudio.tsx"), "utf8")

describe("les actions du menu d'un QR aboutissent", () => {
  it("l'état confirmAction est rendu par une modale", () => {
    expect(src).toContain("{confirmAction !== null && (() => {")
    expect(src).toContain("onClick={() => destructif ? hardDeleteQR(qrId) : changeQRStatus(qrId, action)}")
  })
  it("les trois entrées du menu passent par requestAction, la modale couvre les trois", () => {
    for (const a of ['"pause"', '"archive"', '"delete"']) expect(src).toContain(`requestAction(qr.id, ${a}`)
    expect(src).toMatch(/action === "pause"[\s\S]*action === "archive"[\s\S]*Supprimer définitivement/)
  })
  it("la suppression lit la réponse du serveur au lieu de faire disparaître l'élément à l'aveugle", () => {
    const i = src.indexOf("async function hardDeleteQR")
    const bloc = src.slice(i, src.indexOf("\n  }\n", i))
    expect(bloc).toContain("if (!res.ok || d?.ok === false)")
    expect(bloc).toContain("Connexion impossible. Réessayez.")
  })
  it("plus de « definitif » sans accent", () => {
    expect(src).not.toContain("Supprimer definitif")
  })
})
