import { describe, it, expect } from "vitest"
import { readFileSync, readdirSync, statSync } from "node:fs"
import { join, dirname } from "node:path"
import { fileURLToPath } from "node:url"
import { PLANS } from "./plans"

// Le site a continué d'annoncer un palier supprimé et quatre prix faux — dont
// dans les CONDITIONS D'UTILISATION, le document qui fait foi :
//   « Free (0€), Starter (4,90€/mois), Pro (12,90€/mois), Business (29,90€/mois) »
// et une section « Essai gratuit — 7 jours » que le paiement n'accorde pas
// (aucun trial_period_days n'est posé). Ces tests lisent les FICHIERS.

const src = join(dirname(fileURLToPath(import.meta.url)), "..")

// Un commentaire qui EXPLIQUE l'ancienne formulation n'est pas une promesse faite
// au visiteur. On ne compare que ce qui peut finir à l'écran.
function sansCommentaires(t: string): string {
  return t
    .replace(/\{\s*\/\*[\s\S]*?\*\/\s*\}/g, " ")   // {/* commentaire JSX */}
    .replace(/\/\*[\s\S]*?\*\//g, " ")                 // /* bloc */
    .replace(/^\s*\/\/.*$/gm, " ")                       // // ligne
}

function fichiersDe(dossier: string, ext = [".tsx", ".ts"]): string[] {
  const out: string[] = []
  const parcourir = (d: string) => {
    for (const e of readdirSync(d)) {
      const chemin = join(d, e)
      if (statSync(chemin).isDirectory()) { if (e !== "node_modules") parcourir(chemin); continue }
      if (ext.some(x => e.endsWith(x)) && !e.includes(".test.")) out.push(chemin)
    }
  }
  parcourir(join(src, dossier))
  return out
}

// Pages vues par un visiteur : marketing, légal, tarifs. Le tableau de bord et
// les routes d'API gardent l'identifiant technique « starter » pour compatibilité.
const PAGES_PUBLIQUES = ["app/terms", "app/privacy", "app/legal", "app/upgrade", "app/features",
  "app/examples", "app/outils", "app/guides", "app/qr-code", "app/contact", "app/creer"]

describe("les prix affichés ne mentent pas", () => {
  it("aucun palier « Starter » dans les pages publiques", () => {
    const coupables: string[] = []
    for (const d of PAGES_PUBLIQUES) {
      for (const f of fichiersDe(d)) {
        const t = sansCommentaires(readFileSync(f, "utf-8"))
        // L'identifiant technique en minuscules reste toléré (compat des anciens
        // abonnements) ; c'est le LIBELLÉ affiché qui ne doit plus exister.
        if (/\bStarter\b/.test(t)) coupables.push(f.replace(src + "/", ""))
      }
    }
    expect(coupables).toEqual([])
  })

  it("aucun ancien prix dans les pages publiques ni sur l'accueil", () => {
    const anciens = ["4,90", "12,90", "29,90", "4.90 €", "12.90 €", "29.90 €"]
    const coupables: string[] = []
    for (const f of [...PAGES_PUBLIQUES.flatMap(d => fichiersDe(d)), join(src, "app/HomeClient.tsx"), ...fichiersDe("app/homeSections")]) {
      const t = sansCommentaires(readFileSync(f, "utf-8"))
      for (const a of anciens) if (t.includes(a)) coupables.push(`${f.replace(src + "/", "")} : ${a}`)
    }
    expect(coupables).toEqual([])
  })

  it("les conditions LISENT les prix, elles ne les recopient pas", () => {
    const cgu = readFileSync(join(src, "app/terms/page.tsx"), "utf-8")
    expect(cgu).toContain('from "@/lib/plans"')
    expect(cgu).toContain("PLANS.pro.priceMonthly")
    expect(cgu).toContain("PLANS.business.priceMonthly")
    // ...et donc pas de montant écrit à la main dans la section des plans.
    expect(cgu).not.toMatch(/\d+[,.]\d0\s*€\/mois/)
  })

  it("plus aucune promesse d'essai gratuit : le paiement n'en ouvre aucun", () => {
    const checkout = readFileSync(join(src, "app/api/stripe/checkout/route.ts"), "utf-8")
    expect(checkout, "un essai a été ajouté au paiement : les CGU doivent le dire").not.toContain("trial_period_days")
    for (const f of PAGES_PUBLIQUES.flatMap(d => fichiersDe(d))) {
      const t = sansCommentaires(readFileSync(f, "utf-8"))
      expect(`${f.replace(src + "/", "")}: ${/[Ee]ssai gratuit/.test(t)}`).toBe(`${f.replace(src + "/", "")}: false`)
    }
  })

  it("les libellés de plan utilisés dans le texte sont ceux de lib/plans", () => {
    expect(PLANS.pro.label).toBe("Établissement")
    expect(PLANS.business.label).toBe("Multi-sites")
    // Les sections de l'accueil vivent dans app/homeSections depuis qu'elles sont
    // chargées à part : on lit la page et ses sections comme un tout.
    const accueil = [readFileSync(join(src, "app/HomeClient.tsx"), "utf-8"),
      ...fichiersDe("app/homeSections").map(f => readFileSync(f, "utf-8"))].join("\n")
    expect(accueil).toContain(`plan ${PLANS.pro.label}`)
  })
})
