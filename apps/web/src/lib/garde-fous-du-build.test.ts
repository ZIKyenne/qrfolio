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
  // 30 s, et non les 5 s par défaut : ce test lance un vrai sous-processus qui
  // balaye tout le dépôt, pendant que 200 autres fichiers de tests tournent en
  // parallèle. Il a mis 0,9 s seul et dépassé 5 s sous charge — précisément le
  // genre de test qui échoue « au hasard » sur une machine chargée.
  it("passe sur le dépôt tel qu'il est", () => {
    // Il sort en code 1 et écrit sur stderr quand il trouve quelque chose :
    // execFileSync lève alors, et le message d'erreur porte la liste.
    const sortie = execFileSync("node", ["scripts/check-jsx-imports.mjs"], { cwd: WEB, encoding: "utf8" })
    expect(sortie).toContain("✅")
  }, 30_000)

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

// ─────────────────────────────────────────────────────────────────────────────
// Le releve du 6 septembre a trouve un DEUXIEME faux positif dans ce meme
// script : la liste des identifiants declares mangeait la virgule de fin, donc
// un identifiant sur deux echappait au recensement. Dans « [a, Ed, Pub, x] »,
// Ed etait vu, Pub non — et le controle annoncait « <Pub/> jamais importe ».
// Ces deux tests figent les formes de declaration que le script doit reconnaitre.
describe("le recensement des identifiants ne saute pas un element sur deux", () => {
  const collecte = (src: string) => {
    const bound = new Set<string>()
    const destr = /[{,[]\s*([A-Z][\w$]*)\s*(?=[,}\]=])/g
    let m: RegExpExecArray | null
    while ((m = destr.exec(src))) bound.add(m[1])
    return bound
  }

  it("une destructuration de tableau lie TOUS ses elements", () => {
    const b = collecte("for (const [type, Ed, Pub, contenu] of paires) {")
    expect([...b].sort()).toEqual(["Ed", "Pub"])
  })
  it("une destructuration d'objet aussi, y compris le dernier", () => {
    const b = collecte("const { Alpha, Beta, Gamma } = mod")
    expect([...b].sort()).toEqual(["Alpha", "Beta", "Gamma"])
  })
  it("un seul element entre crochets est lie", () => {
    expect([...collecte("const [Seul] = useChose()")]).toEqual(["Seul"])
  })
  it("le script reel reconnait la meme chose", () => {
    const script = readFileSync(join(WEB, "scripts/check-jsx-imports.mjs"), "utf8")
    expect(script, "le delimiteur de fin doit rester en anticipation").toContain("(?=[,}\\]=])")
  })
})
