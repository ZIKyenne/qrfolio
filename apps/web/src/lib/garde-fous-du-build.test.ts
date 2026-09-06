import { describe, it, expect } from "vitest"
import { execFileSync } from "node:child_process"
import { readFileSync } from "node:fs"
import { join } from "node:path"

// Le 6 septembre, deux déploiements de production ont échoué d'affilée sur un
// contrôle qui tourne AVANT Next (`pnpm run build` = check-jsx-imports.mjs && next
// build). En local, `npx next build` passait : je ne lançais pas la même commande
// que Vercel. Ce test ferme l'écart — le garde-fou du build fait maintenant partie
// de la suite, et ne peut plus être vert ici et rouge en production.

const WEB = join(__dirname, "../..")

describe("le garde-fou anti-crash du build", () => {
  it("passe sur le dépôt tel qu'il est", () => {
    // Il sort en code 1 et écrit sur stderr quand il trouve quelque chose :
    // execFileSync lève alors, et le message d'erreur porte la liste.
    const sortie = execFileSync("node", ["scripts/check-jsx-imports.mjs"], { cwd: WEB, encoding: "utf8" })
    expect(sortie).toContain("✅")
  })

  it("ne compte pas une balise écrite dans un commentaire", () => {
    // `{/* Réactivable : <QRDynamicSection /> */}` ne rend rien et ne peut rien
    // casser. Le contrôle le lisait comme un usage réel, et bloquait le déploiement.
    const src = readFileSync(join(WEB, "scripts/check-jsx-imports.mjs"), "utf8")
    expect(src).toContain("function sansCommentaires(src)")
    expect(src).toContain("jsxRe.exec(sansCommentaires(src))")
  })

  it("mais il ignore seulement les vrais commentaires, pas une adresse dans une chaîne", () => {
    const src = readFileSync(join(WEB, "scripts/check-jsx-imports.mjs"), "utf8")
    // Le // de « https:// » est en milieu de ligne : la règle exige un début de ligne.
    expect(src).toContain("/^[ \\t]*\\/\\/.*$/gm")
  })
})
