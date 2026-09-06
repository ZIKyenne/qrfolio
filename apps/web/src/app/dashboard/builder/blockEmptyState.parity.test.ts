import { describe, it, expect } from "vitest"
import { readFileSync } from "node:fs"
import { fileURLToPath } from "node:url"
import { EMPTY_STATE_BLOCK_TYPES } from "./blockEmptyState"
import { SHARED_RENDERER_BLOCKS } from "./shared-renderer/architecture"
import { resolveEditorBlock } from "./shared-renderer/editorRegistry"
import { renderToStaticMarkup } from "react-dom/server"
import { createElement } from "react"

// Garde anti-régression de l'ÉTAT VIDE (mission B05).
// L'aperçu éditeur ne doit plus afficher de fausses données comme si elles seraient
// publiées. On lit le source de builderPreview.tsx et on vérifie que :
//   1) chaque bloc « masqué si vide » possède une garde d'état vide explicite ;
//   2) les tableaux de démonstration retirés n'y réapparaissent pas.

const src = readFileSync(fileURLToPath(new URL("./builderPreview.tsx", import.meta.url)), "utf8")

describe("état vide éditeur — chaque bloc concerné a une garde explicite", () => {
  // Deux chemins valides, un seul résultat exigé : l'aperçu d'un bloc vide doit
  // montrer une invite, jamais du faux contenu.
  //  • bloc legacy → la garde `hasPublishableContent("type"` dans builderPreview.tsx ;
  //  • bloc migré vers le renderer partagé → son adapter éditeur rend l'invite.
  //    Ici on ne se contente pas de lire le source : on rend le bloc à vide.
  const theme: any = { bg: "#080808", primary: "#C9A84C", text: "#F5F0E8", muted: "#A8A190", fontBody: "DM Sans" }
  const ctx: any = { theme, primary: theme.primary, text: theme.text, muted: theme.muted, accent: "#39FF8F", surfaceStyle: {}, canEdit: false, edit: () => () => {} }

  for (const type of EMPTY_STATE_BLOCK_TYPES) {
    it(`${type} : l'aperçu d'un bloc vide affiche une invite`, () => {
      if (SHARED_RENDERER_BLOCKS.has(type)) {
        const Adapter = resolveEditorBlock(type)
        expect(Adapter, `${type} est activé dans le renderer partagé mais n'a pas d'adapter éditeur`).toBeTruthy()
        const html = renderToStaticMarkup(createElement(Adapter as any, { content: {}, ctx }))
        expect(html.includes('role="note"'), `${type} : l'adapter partagé ne rend pas d'état vide`).toBe(true)
        return
      }
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
    // Relevé du 6 septembre : dix blocs affichaient encore des chiffres et des noms
    // inventés dans l'aperçu, pendant que la page publiée ne rendait rien. Le pire
    // était « 1 240 » : ce nombre-là était même écrit sur la PAGE PUBLIÉE quand le
    // commerçant n'avait renseigné qu'un libellé.
    "PROMO10",                                // promo_code
    "127",                                    // sales_counter
    "1 240",                                  // scan_counter — était aussi côté public
    "287",                                    // participants_count
    "Mon produit phare",                      // featured_product
    "Jean Dupont", "Fondateur & CEO",         // founder_message
    "La qualité n est jamais un accident",    // quote_block
    "Information importante à retenir",       // info_box
    // Relevé du 6 septembre (vague 10) : l'aperçu de founder_message affichait ce
    // message d'accueil inventé tant que le commerçant n'avait rien écrit.
    "Notre mission est de vous offrir",       // founder_message
    // Relevé du 6 septembre (vague 11) : deux faux chiffres vivaient encore dans
    // l'aperçu, sur des blocs que la page publiée n'affichait même pas.
    "1 234",                                  // visit_counter
    'c.count||"14"',                          // tickets_left
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

describe("la page publiée n'invente aucun chiffre", () => {
  const publique = readFileSync(fileURLToPath(new URL("../../[slug]/renduLegacy.tsx", import.meta.url)), "utf8")

  it("le compteur de scans n'affiche que le chiffre du commerçant", () => {
    // `{c.count || "1 240"}` : un visiteur lisait « 1 240 scans » sur une page où
    // personne n'avait saisi de chiffre.
    expect(publique).not.toContain('"1 240"')
    expect(publique).toContain('case "scan_counter": return c.count ? (')
  })

  it("aucun compteur ne se replie sur un nombre en dur", () => {
    const fauxNombres = [...publique.matchAll(/c\.count\s*\|\|\s*"([^"]+)"/g)].map(m => m[1])
    expect(fauxNombres.filter(n => n !== "0")).toEqual([])
  })
})
