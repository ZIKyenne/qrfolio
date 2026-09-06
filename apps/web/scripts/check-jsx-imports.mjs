#!/usr/bin/env node
/**
 * Garde-fou anti-crash : détecte AVANT le build les bugs masqués par
 * `typescript.ignoreBuildErrors: true` qui crashent seulement au runtime :
 *   1. un composant JSX <Xxx/> utilisé mais jamais importé/déclaré (ex. <Check/> -> "Check is not defined")
 *   2. une icône importée de lucide-react mais inexistante dans la version installée
 *      (lucide 1.17 a supprimé Twitter/Linkedin/Instagram/Facebook…)
 *
 * Pensé pour ZÉRO faux positif (sinon il bloquerait des déploiements légitimes).
 */
import fs from "node:fs"
import path from "node:path"
import * as lucide from "lucide-react"

const ROOT = "src"
const files = []
;(function walk(d) {
  for (const f of fs.readdirSync(d)) {
    const p = path.join(d, f)
    const st = fs.statSync(p)
    if (st.isDirectory()) walk(p)
    else if (f.endsWith(".tsx")) files.push(p)
  }
})(ROOT)

const problems = []

/**
 * Retire les commentaires avant de chercher des balises JSX.
 *  - blocs /* … *\/ (y compris la forme JSX {/* … *\/})
 *  - lignes commençant par // (on n'attrape PAS un // en milieu de ligne : une
 *    adresse « https://… » dans une chaîne n'est pas un commentaire).
 * On remplace par des espaces pour ne pas décaler les lignes.
 */
function sansCommentaires(src) {
  return src
    .replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, " "))
    .replace(/^[ \t]*\/\/.*$/gm, (m) => " ".repeat(m.length))
}

// Construit l'ensemble des identifiants "liés" (importés / déclarés / déstructurés) du fichier.
function collectBound(src) {
  const bound = new Set(["Fragment"])
  let m

  // import { a, b as c } from '...'
  const named = /import\s*(?:type\s*)?\{([^}]*)\}\s*from/g
  while ((m = named.exec(src))) {
    for (const raw of m[1].split(",")) {
      const a = raw.trim().split(/\s+as\s+/)
      const local = (a[1] || a[0] || "").trim()
      if (local) bound.add(local)
    }
  }
  // import Default from '...'  |  import Default, { ... } from '...'
  const def = /import\s+([A-Za-z_$][\w$]*)\s*(?:,|from)/g
  while ((m = def.exec(src))) bound.add(m[1])
  // import * as NS from '...'
  const ns = /import\s*\*\s*as\s+([A-Za-z_$][\w$]*)/g
  while ((m = ns.exec(src))) bound.add(m[1])
  // déclarations
  const decl = /(?:const|let|var|function|class|type|interface|enum)\s+([A-Z][\w$]*)/g
  while ((m = decl.exec(src))) bound.add(m[1])
  // déstructuration / rename : { X }, , X ,  ou  icon: Icon
  const destr = /[{,]\s*([A-Z][\w$]*)\s*[,}=]/g
  while ((m = destr.exec(src))) bound.add(m[1])
  const rename = /:\s*([A-Z][\w$]*)\b/g
  while ((m = rename.exec(src))) bound.add(m[1])
  return bound
}

for (const fp of files) {
  const src = fs.readFileSync(fp, "utf8")

  // 1) icônes lucide importées mais inexistantes
  const lr = /import\s*\{([^}]*)\}\s*from\s*["']lucide-react["']/g
  let lm
  while ((lm = lr.exec(src))) {
    for (const raw of lm[1].split(",")) {
      const real = raw.trim().split(/\s+as\s+/)[0].trim()
      if (real && lucide[real] === undefined) {
        problems.push(`${fp}  ->  lucide-react n'exporte pas « ${real} » (icône supprimée/renommée)`)
      }
    }
  }

  // 2) composants JSX utilisés mais non liés.  <Nom  où le caractère avant '<'
  //    n'est pas alphanum/_/'>' (exclut les génériques useRef<HTMLX>, Record<...>…)
  //
  //    On lit le code SANS ses commentaires : un `{/* Réactivable : <Xxx /> */}`
  //    ne rend rien et ne peut donc rien casser au runtime. Le 6 septembre, ce
  //    faux positif a bloqué deux déploiements de production d'affilée — sur un
  //    contrôle dont le but affiché est justement « ZÉRO faux positif ».
  const usages = new Set()
  const jsxRe = /(^|[^A-Za-z0-9_>])<([A-Z][A-Za-z0-9_]*)[\s/>]/g
  let jm
  while ((jm = jsxRe.exec(sansCommentaires(src)))) usages.add(jm[2])
  if (!usages.size) continue

  const bound = collectBound(src)
  for (const name of usages) {
    if (!bound.has(name)) {
      problems.push(`${fp}  ->  <${name}/> utilisé mais jamais importé/déclaré`)
    }
  }
}

if (problems.length) {
  console.error("\n❌ Imports manquants (crash runtime garanti) :\n")
  for (const p of [...new Set(problems)]) console.error("  " + p)
  console.error(`\n${new Set(problems).size} problème(s). Corrige les imports avant de déployer.\n`)
  process.exit(1)
}
console.log("✅ check-jsx-imports : composants JSX et icônes lucide OK.")
