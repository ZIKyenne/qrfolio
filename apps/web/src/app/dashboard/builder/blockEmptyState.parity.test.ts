import { describe, it, expect } from "vitest"
import { readFileSync } from "node:fs"
import { fileURLToPath } from "node:url"
import { EMPTY_STATE_BLOCK_TYPES } from "./blockEmptyState"

// Garde anti-régression de l'ÉTAT VIDE (mission B05).
// L'aperçu éditeur ne doit plus afficher de fausses données comme si elles seraient
// publiées. On lit le source de builderPreview.tsx et on vérifie que :
//   1) chaque bloc « masqué si vide » possède une garde d'état vide explicite ;
//   2) les tableaux de démonstration retirés n'y réapparaissent pas.

const src = readFileSync(fileURLToPath(new URL("./builderPreview.tsx", import.meta.url)), "utf8")

describe("état vide éditeur — chaque bloc concerné a une garde explicite", () => {
  for (const type of EMPTY_STATE_BLOCK_TYPES) {
    it(`${type} : gardé par hasPublishableContent`, () => {
      expect(src.includes(`hasPublishableContent("${type}"`), `${type} n'a pas de garde d'état vide dans builderPreview.tsx`).toBe(true)
    })
  }
})

describe("état vide éditeur — aucune donnée de démonstration trompeuse ne subsiste", () => {
  // Littéraux de démo précédemment rendus comme du vrai contenu (désormais supprimés).
  const FORBIDDEN_DEMO = [
    "Transparence", "Réactivité",           // values
    "Qualiopi", "Ministère du Travail",      // business_certifications
    "Accès PMR", "WiFi gratuit",             // on_site_services
    "Réponse sous 24h", "Satisfaction garantie", // engagements
    "Partenaire officiel",                    // trust_badge
    "Le Transbordeur", "L Olympia",          // concerts
    "DJ Shadow", "Polo & Pan", "The Blaze",  // lineup / event_guests
    "Concert live", "Espace lounge",         // event_program
    "Nos services", "Détail des services",   // accordion_block
    "T-shirt", "Casquette",                  // merch
    "Album 1",                                // discography
  ]
  for (const demo of FORBIDDEN_DEMO) {
    it(`ne contient plus le contenu de démo « ${demo} »`, () => {
      expect(src.includes(demo), `Donnée de démo « ${demo} » toujours présente dans builderPreview.tsx`).toBe(false)
    })
  }

  it("la mention « invisible en ligne » est bien câblée", () => {
    expect(src.includes("HIDDEN_WHEN_EMPTY_NOTE")).toBe(true)
  })
})
