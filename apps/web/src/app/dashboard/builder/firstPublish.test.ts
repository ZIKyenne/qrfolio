import { describe, it, expect } from "vitest"
import { readFileSync } from "node:fs"
import { join } from "node:path"
import { POSE_PAR_METIER, conseilPose, etapes, adresseLisible } from "./firstPublish"
import { METIERS } from "../print-studio/catalog"

const read = (p: string) => readFileSync(join(__dirname, p), "utf8")

describe("où poser son QR", () => {
  it("chaque métier du catalogue a un conseil, sans exception", () => {
    // Si quelqu'un ajoute un métier au Print Studio et oublie ici, la personne
    // tomberait sur un conseil générique au moment le plus important.
    const sans = METIERS.filter(m => m !== "Tout" && !POSE_PAR_METIER[m])
    expect(sans, "métiers sans conseil de pose").toEqual([])
  })

  it("aucun conseil ne traîne pour un métier qui n'existe plus", () => {
    const orphelins = Object.keys(POSE_PAR_METIER).filter(m => !(METIERS as readonly string[]).includes(m))
    expect(orphelins).toEqual([])
  })

  it("les conseils nomment un endroit, pas une généralité", () => {
    for (const [m, texte] of Object.entries(POSE_PAR_METIER)) {
      expect(texte.length, `${m} : conseil trop court`).toBeGreaterThan(15)
      expect(texte.length, `${m} : conseil trop long pour être lu`).toBeLessThan(70)
      expect(texte[0], `${m} : pas de majuscule en début de phrase incise`).toBe(texte[0].toLowerCase())
    }
  })

  it("un métier inconnu ne laisse pas la personne sans réponse", () => {
    expect(conseilPose("Cordonnier")).toContain("comptoir")
    expect(conseilPose(null)).toContain("comptoir")
    expect(conseilPose("")).toContain("comptoir")
  })
})

describe("les trois gestes", () => {
  it("le test passe AVANT l'impression — c'est tout l'intérêt", () => {
    const e = etapes(false, "Restaurant")
    expect(e[0].titre).toContain("Testez")
    expect(e[1].titre).toContain("Imprimez")
    expect(e[2].titre).toContain("Posez")
    expect(e.map(x => x.n)).toEqual([1, 2, 3])
  })

  it("le premier geste dit explicitement d'attendre avant d'imprimer", () => {
    expect(etapes(false)[0].pourquoi.toLowerCase()).toContain("avant d'imprimer")
  })

  it("sur téléphone, on ne demande pas l'impossible", () => {
    // On ne peut pas scanner un QR affiché sur l'écran qu'on tient en main.
    const m = etapes(true)[0]
    expect(m.titre).not.toContain("Testez le QR")
    expect(m.pourquoi).toContain("depuis le téléphone qui l'affiche")
  })

  it("le troisième geste est concret, tiré du métier", () => {
    expect(etapes(false, "Bar")[2].pourquoi).toContain("comptoir")
    expect(etapes(false, "Immobilier")[2].pourquoi).toContain("vitrine")
  })
})

describe("l'adresse affichée", () => {
  it("se lit comme on la dicte", () => {
    expect(adresseLisible("https://qrowg.com/le-bistrot")).toBe("qrowg.com/le-bistrot")
    expect(adresseLisible("http://qrowg.com/x/")).toBe("qrowg.com/x")
    expect(adresseLisible("")).toBe("")
  })
})

describe("l'écran n'apparaît qu'au bon moment", () => {
  const editeur = read("BuilderV4.tsx")

  it("seulement à la PREMIÈRE mise en ligne, pas à chaque mise à jour", () => {
    expect(editeur).toContain("if (!s.alreadyPublished) { setShowPublishPopup(false); setPremiereEnLigne(true) }")
  })

  it("il ne se ferme que sur décision, jamais sur minuterie", () => {
    const i = editeur.indexOf("setPremiereEnLigne(false)")
    expect(i).toBeGreaterThan(0)
    expect(editeur.slice(Math.max(0, i - 200), i)).toContain("onClose")
    // L'ancien « Page publiée ! » du bouton, lui, disparaissait tout seul.
    expect(editeur).not.toContain("setTimeout(() => { if (mountedRef.current) setPremiereEnLigne(false) }")
  })

  it("il attend que le QR et l'adresse existent vraiment", () => {
    expect(editeur).toContain("{premiereEnLigne && qrTarget && pageSlug && (")
  })

  it("il ne se superpose pas au panneau de publication", () => {
    expect(editeur).toContain("setShowPublishPopup(false); setPremiereEnLigne(true)")
  })
})
