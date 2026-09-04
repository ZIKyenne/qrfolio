import { describe, it, expect } from "vitest"
import { readFileSync } from "node:fs"
import { join, dirname } from "node:path"
import { fileURLToPath } from "node:url"
import { avecImages, contenuEprouve, estCleTechnique, formatPour, sansImages, valeurEprouvee, EPREUVES } from "./contenuReel"

// ─────────────────────────────────────────────────────────────────────────────
// DU TEXTE COUPÉ QUE PERSONNE NE POUVAIT VOIR
//
// La page publiée ne peut pas défiler latéralement : html, body et .qf-public
// sont en overflow-x hidden|clip. Ce qui dépasse n'est donc pas « à droite,
// accessible en glissant » — c'est COUPÉ, définitivement invisible. Et comme
// `document.scrollWidth` ne bouge jamais, aucun contrôle basé dessus ne peut le
// voir : mon premier détecteur était aveugle, vérifié en lui injectant un bloc
// de 900 px qu'il n'a pas signalé.
//
// Mesuré ensuite sur la géométrie réelle, avec du contenu de vrai commerçant
// sur les 20 modèles : jusqu'à 495 px de texte coupés — presque une largeur
// d'écran entière. La cause, à chaque fois, la même : un prix en
// `flexShrink: 0`, qui refuse de rétrécir et garde sa largeur naturelle.
//
// Un « 18€ » ne doit jamais se couper en deux : `flexShrink: 0` reste. C'est un
// plafond de largeur qui le fait revenir à la ligne au lieu de disparaître.
// Vérifié : 21 px de large avant comme après pour « 18€ », et 17 modèles sur 20
// rigoureusement identiques au pixel près (les 3 autres : compte à rebours et
// badge Ouvert/Fermé, qui dépendent de l'heure).
// ─────────────────────────────────────────────────────────────────────────────

const ici = dirname(fileURLToPath(import.meta.url))
const racine = join(ici, "..", "..")

describe("les prix ne peuvent plus déborder de l'écran", () => {
  const SITES: [string, string][] = [
    ["[slug]/PublicPageClient.tsx", "{p}</span>"],
    ["[slug]/PublicPageClient.tsx", "{price}</span>"],
    ["[slug]/PublicPageClient.tsx", "{price}</p>"],
    ["dashboard/builder/shared-renderer/primitives/MenuItemList.tsx", "{it.price}</span>"],
  ]

  for (const [fichier, marqueur] of SITES) {
    it(`${fichier.split("/").pop()} — ${marqueur} est plafonné`, () => {
      const src = readFileSync(join(racine, fichier), "utf8")
      const lignes = src.split("\n").filter(l => l.includes(marqueur) && l.includes("flexShrink: 0"))
      expect(lignes.length, `aucune ligne ${marqueur} avec flexShrink: 0`).toBeGreaterThan(0)
      for (const l of lignes) {
        expect(l, `sans plafond : ${l.trim().slice(0, 110)}`).toContain('maxWidth: "50%"')
        expect(l, `sans retour à la ligne : ${l.trim().slice(0, 110)}`).toContain('overflowWrap: "anywhere"')
      }
    })
  }
})

describe("le contenu d'épreuve", () => {
  it("remplace les textes, pas les clés techniques", () => {
    const avant = { title: "Menu", cta_url: "https://ex.com", img1: "https://ex.com/a.jpg", mode: "Simple", accent: "#C9A84C" }
    const apres = contenuEprouve(avant, "long")
    expect(apres.title).not.toBe("Menu")
    expect(apres.cta_url).toBe("https://ex.com")
    expect(apres.img1).toBe("https://ex.com/a.jpg")
    expect(apres.mode).toBe("Simple")
    expect(apres.accent).toBe("#C9A84C")
  })

  it("« colle » produit un mot que rien ne peut couper", () => {
    const v = valeurEprouvee("item1_name", "Foie gras", "colle") as string
    expect(v.includes(" ")).toBe(false)
    expect(v.length).toBeGreaterThan(60)
  })

  it("« vide » vide, « majuscules » met en majuscules", () => {
    expect(valeurEprouvee("item1_name", "Foie gras", "vide")).toBe("")
    expect(valeurEprouvee("item1_name", "Foie gras", "majuscules")).toBe("FOIE GRAS")
  })

  it("les valeurs non textuelles passent intactes", () => {
    for (const e of EPREUVES) {
      expect(valeurEprouvee("n", 42, e)).toBe(42)
      expect(valeurEprouvee("n", true, e)).toBe(true)
      expect(valeurEprouvee("n", null, e)).toBe(null)
    }
  })

  it("reconnaît les clés techniques", () => {
    for (const k of ["cta_url", "img1", "d1_image", "accent", "mode", "layout", "m1_photo", "icon"]) {
      expect(estCleTechnique(k), k).toBe(true)
    }
    for (const k of ["title", "item1_name", "item1_desc", "m1_role", "note", "category"]) {
      expect(estCleTechnique(k), k).toBe(false)
    }
  })

  it("les photos injectées viennent de la définition du bloc, pas d'une devinette", () => {
    // Aucun modèle de la galerie ne renseigne d'image : il n'y a rien à
    // remplacer, il faut savoir quels champs EXISTENT.
    const r = avecImages({ title: "T" }, ["img1", "img2", "m1_photo"], 5)
    expect(r.title).toBe("T")
    expect(String(r.img1)).toContain("/e2e-harness/photo/")
    expect(String(r.img1)).toContain("-5.png")
    expect(String(r.img2)).toContain("-6.png")
    expect(String(r.m1_photo)).toContain("-7.png")
  })

  it("le format suit le rôle de l'image", () => {
    expect(formatPour("m1_avatar")).toEqual([800, 800])
    expect(formatPour("banner_img")).toEqual([1600, 600])
    expect(formatPour("img1")).toEqual([1600, 1200])
  })

  it("« vide » retire aussi les images : une page sans le moindre visuel", () => {
    const r = sansImages({ img1: "a.jpg", m1_photo: "b.jpg", banner: "c.jpg", title: "T" })
    expect(r.img1).toBe("")
    expect(r.m1_photo).toBe("")
    expect(r.banner).toBe("")
    expect(r.title).toBe("T")
  })
})
