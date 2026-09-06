import { describe, it, expect } from "vitest"
import { readFileSync } from "node:fs"
import { join } from "node:path"

// Le 6 septembre : la page publiée écrivait « 1 240 » quand personne n'avait saisi
// de compteur, et « Mon Serveur », « Ma Chaîne », « monpseudo », « Mon Entreprise »
// quand le commerçant avait rempli le lien sans le nom. Un client qui scannait le QR
// d'un restaurant pouvait lire « Mon Entreprise » sur sa carte de visite.
//
// La règle existe déjà dans le code, écrite en tête du bloc « profil » :
// « Anti-fake : aucun contenu inventé. Un champ vide est MASQUÉ. »
// Ce test l'étend à toute la page publiée.

const ICI = __dirname
const publique = ["PublicPageClient.tsx", "blocsPublics.tsx"]
  .map(f => readFileSync(join(ICI, f), "utf8")).join("\n")

/**
 * Les replis « champ vide → texte en dur » du rendu public.
 * On ne garde que ceux qui sont RENDUS : `{c.x || "…"}`. Les valeurs de réglage
 * (`c.columns || "3"`), les clés de suivi de clic et les libellés de boutons
 * passés en argument ne sont pas concernés.
 */
function replisAffiches(): { champ: string; texte: string }[] {
  const out: { champ: string; texte: string }[] = []
  for (const m of publique.matchAll(/\{(c\.[a-z_0-9]+)\s*\|\|\s*"([^"]{1,60})"\}/g)) {
    out.push({ champ: m[1], texte: m[2] })
  }
  return out
}

// Un texte qui décrit l'identité du commerçant : son nom, celui de son entreprise,
// de sa chaîne, de son événement, de son œuvre. Jamais un libellé de bouton.
const IDENTITE = /^(mon|ma|mes|nouveau|nouvelle)\b|^monpseudo$/i

describe("la page publiée n'écrit rien que le commerçant n'ait saisi", () => {
  it("le balayage voit bien les deux fichiers du rendu public", () => {
    expect(publique.length).toBeGreaterThan(100_000)
  })

  it("aucune identité inventée : « Mon Serveur », « Ma Chaîne », « monpseudo »…", () => {
    const fautifs = replisAffiches()
      .filter(r => IDENTITE.test(r.texte.trim()))
      .map(r => `${r.champ} → « ${r.texte} »`)
    expect(fautifs).toEqual([])
  })

  it("aucun compteur ne se replie sur un nombre inventé", () => {
    // « 1 240 scans ce mois » s'affichait sur des pages où personne n'avait compté.
    const chiffres = replisAffiches()
      .filter(r => /^[\d\s.,]+$/.test(r.texte.trim()) && r.texte.trim() !== "0")
      .map(r => `${r.champ} → « ${r.texte} »`)
    expect(chiffres).toEqual([])
  })

  it("les libellés de boutons, eux, gardent bien un défaut", () => {
    // La règle vise l'identité et les données, pas les mots d'interface : un bouton
    // sans libellé serait un bouton muet.
    const labels = replisAffiches().filter(r => /^c\.(cta_)?label$|button_label/.test(r.champ))
    expect(labels.length).toBeGreaterThan(3)
  })
})

describe("le bloc profil reste la référence", () => {
  it("sa règle anti-invention est toujours écrite dans le code", () => {
    expect(publique).toContain("Anti-fake : aucun contenu inventé")
  })
  it("et appliquée : ni nom ni accroche inventés", () => {
    expect(publique).toContain('const pName = (c.name || "").trim()')
    expect(publique).toContain("{pName && (h1Owner === block.id")
  })
})
