import { describe, it, expect } from "vitest"
import { readFileSync, readdirSync, statSync } from "node:fs"
import { join } from "node:path"

// Un <select>, un curseur, un sélecteur de couleur ou un champ de fichier ne peut
// PAS porter de placeholder : sans nom accessible, un lecteur d'écran annonce
// « liste » ou « bouton », et rien d'autre. C'était le cas de 79 champs.
//
// (Les champs texte gardent au minimum leur placeholder ; les associer proprement
//  par htmlFor est un chantier de fond, suivi en P2-21.)

const SRC = join(__dirname, "..")
const SANS_PLACEHOLDER_POSSIBLE = /type="(date|range|color|file|time|month|week)"/

/** Lit une balise JSX en équilibrant les accolades : `onChange={e => …}` contient
 *  un « > » qui coupe une lecture naïve. */
export function balisesJsx(src: string, nom: string): { pos: number; attrs: string }[] {
  const out: { pos: number; attrs: string }[] = []
  for (const m of src.matchAll(new RegExp(`<${nom}\\b`, "g"))) {
    // Une balise citée dans un commentaire n'est pas un champ.
    const debutLigne = src.lastIndexOf("\n", m.index!) + 1
    const avantSurLaLigne = src.slice(debutLigne, m.index!)
    if (avantSurLaLigne.includes("//") || avantSurLaLigne.trimStart().startsWith("*")) continue
    let i = m.index! + m[0].length, prof = 0
    while (i < src.length) {
      const c = src[i]
      if (c === "{") prof++
      else if (c === "}") prof--
      else if (c === ">" && prof === 0) { out.push({ pos: m.index!, attrs: src.slice(m.index! + m[0].length, i) }); break }
      i++
    }
  }
  return out
}

function fichiers(): string[] {
  const out: string[] = []
  const marcher = (d: string) => {
    for (const n of readdirSync(d).sort()) {
      const p = join(d, n)
      if (statSync(p).isDirectory()) { if (n !== "e2e-harness") marcher(p) }
      else if (/\.tsx$/.test(n) && !/\.test\./.test(n) && n !== "Input.tsx") out.push(p)
    }
  }
  marcher(join(SRC, "app"))
  marcher(join(SRC, "components"))
  return out
}

describe("les champs qui ne peuvent pas porter de placeholder ont un nom", () => {
  it("le lecteur de balises survit aux fonctions fléchées", () => {
    const b = balisesJsx('<select value={x} onChange={e => setX(e.target.value)} aria-label="Trier" >', "select")
    expect(b).toHaveLength(1)
    expect(b[0].attrs).toContain('aria-label="Trier"')
  })

  it("aucun n'est muet", () => {
    const muets: string[] = []
    for (const f of fichiers()) {
      const src = readFileSync(f, "utf8")
      for (const nom of ["select", "input"] as const) {
        for (const { pos, attrs } of balisesJsx(src, nom)) {
          if (nom === "input" && !SANS_PLACEHOLDER_POSSIBLE.test(attrs)) continue
          if (/type="hidden"|type="checkbox"|type="radio"/.test(attrs)) continue
          if (/aria-label|aria-labelledby/.test(attrs)) continue
          const id = attrs.match(/\bid="([^"]+)"/)?.[1]
          if (id && src.includes(`htmlFor="${id}"`)) continue
          const avant = src.slice(0, pos)
          // Champ englobé par un <label> encore ouvert : il en tire son nom.
          if ((avant.match(/<label/g) ?? []).length > (avant.match(/<\/label>/g) ?? []).length) continue
          muets.push(`${f.replace(SRC, "")}:${avant.split("\n").length} <${nom}>`)
        }
      }
    }
    expect(muets).toEqual([])
  })
})

describe("« Sessions actives » ne décrit que ce qu'on connaît", () => {
  const src = readFileSync(join(SRC, "app/dashboard/profile/page.tsx"), "utf8")
  it("l'écran ne prétend plus lister les autres appareils", () => {
    // Le mot ne subsiste que dans le commentaire qui explique pourquoi il a disparu.
    const rendu = src.split("\n").filter(l => !l.trim().startsWith("//")).join("\n")
    expect(rendu).not.toContain("Sessions actives")
    expect(src).toMatch(/letterSpacing:1\.2, margin:"0 0 8px" \}\}>Cet appareil<\/p>/)
    expect(src).toContain('location: "Cet appareil"')
  })
})

describe("un objectif qui n'a pas pu être enregistré le dit", () => {
  const src = readFileSync(join(SRC, "app/dashboard/analytics/GoalsDashboard.tsx"), "utf8")
  it("la réponse du serveur est lue", () => {
    const i = src.indexOf("async function saveGoal()")
    const corps = src.slice(i, src.indexOf("\n  }\n", i))
    expect(corps).toContain("!res.ok || d.error || !d.goal")
    expect(corps).toContain("toast.error(")
    expect(corps.indexOf("closeForm()")).toBeGreaterThan(corps.indexOf("!res.ok"))
  })
})
