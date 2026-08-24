import { describe, it, expect } from "vitest"
import { readFileSync } from "node:fs"
import { join } from "node:path"
import { creerUrl } from "../creer/entry"

const read = (p: string) => readFileSync(join(__dirname, p), "utf8")
const src = read("GeneratorClient.tsx")

// Le générateur gratuit est la seule page du site qui donne quelque chose avant de
// demander quoi que ce soit. Ce lot ne touche pas à cette promesse : le fichier reste
// gratuit, sans compte, sans condition. Il ajoute seulement une suite, une fois le
// fichier obtenu — et fait mener le « QR dynamique » à l'essai plutôt qu'au formulaire
// d'inscription, où huit visiteurs sur huit se sont arrêtés en trente jours.

describe("la promesse du générateur reste intacte", () => {
  it("le téléchargement n'est jamais conditionné à un compte", () => {
    // Aucune redirection vers l'inscription/connexion sur le chemin du fichier,
    // hors 401 (session perdue en cours de route côté connecté).
    const versInscription = [...src.matchAll(/window\.location\.href = "\/auth\/[a-z-]+"/g)].map(m => m[0])
    expect(versInscription).toEqual(['window.location.href = "/auth/login"'])
    expect(src).toContain("Téléchargement direct · aucun compte requis")
  })

  it("rien n'est demandé AVANT d'avoir le fichier", () => {
    // La suite est gardée derrière `justDownloaded` : elle ne peut pas s'afficher
    // tant que le blob n'a pas été produit.
    expect(src).toContain("const justDownloaded = downloaded === sig && !isDyn")
    expect(src).toContain("setDownloaded(sig)")
    const i = src.indexOf("setDownloaded(sig)")
    expect(src.slice(0, i)).toContain("const blob = await getQRBlob(opts, ext)")
  })
})

describe("une suite après le téléchargement", () => {
  it("dit la vérité sur ce qu'est un QR statique", () => {
    expect(src).toContain("Ce QR est figé pour toujours.")
    expect(src).toContain("Fichier téléchargé")
  })

  it("mène à l'essai, pas à un formulaire", () => {
    expect(src).toContain("Composer ma page →")
    expect(src).toContain('href={creerUrl(null, null, qrType === "link" ? data : null)}')
  })

  it("ne s'affiche pas pour un QR dynamique, qui est justement modifiable", () => {
    expect(src).toContain("downloaded === sig && !isDyn")
  })

  it("disparaît dès que le contenu change", () => {
    // `sig` contient le type et le contenu : le moindre changement invalide la suite.
    expect(src).toContain("const sig = `${qrType}|${data}|${isDyn ? \"D\" : \"S\"}`")
  })

  it("ne double pas l'encart d'explication, qui dit la même chose", () => {
    expect(src).toContain("{!justDownloaded && (")
  })
})

describe("le QR dynamique sans compte", () => {
  it("ne renvoie plus vers le formulaire d'inscription", () => {
    expect(src).not.toContain('if (isDyn && !authed) { window.location.href = "/auth/signup" }')
    expect(src).not.toContain('window.location.href = "/auth/signup"')
  })

  it("mène à l'essai, avec le lien déjà saisi", () => {
    expect(src).toContain("if (isDyn && !authed) { window.location.href = creerUrl(null, null, data); return }")
    expect(creerUrl(null, null, "https://monsite.fr")).toBe("/creer?lien=https%3A%2F%2Fmonsite.fr%2F")
  })

  it("l'annonce sur le bouton : personne n'est emmené par surprise", () => {
    expect(src).toContain("const dynGuest = isDyn && !authed")
    expect(src).toContain('dynGuest ? "Composer ma page"')
  })

  it("retire le SVG, qui ne produirait aucun fichier dans ce cas", () => {
    expect(src).toContain("{!dynGuest && (")
  })

  it("explique pourquoi un compte serait nécessaire, sans le réclamer", () => {
    expect(src).toContain("QR dynamique — sans compte, autrement")
    expect(src).not.toContain("Créez un compte gratuit pour l'activer.")
  })
})

describe("le lien saisi arrive bien jusqu'à la page composée", () => {
  const galerie = read("../dashboard/templates/page.tsx")

  it("la galerie lit le lien et l'annonce", () => {
    expect(galerie).toContain('const l = safeEntryLink(q.get("lien"))')
    expect(galerie).toContain("sera ajouté à votre page")
  })

  it("il est appliqué sur les DEUX chemins de création", () => {
    expect((galerie.match(/applyEntryLink\(composedBlocks, entryLink\)/g) || []).length).toBe(2)
  })
})
