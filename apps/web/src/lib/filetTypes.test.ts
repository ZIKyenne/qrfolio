import { describe, it, expect } from "vitest"
import { readFileSync } from "node:fs"
import { join } from "node:path"

// Le projet annonçait du TypeScript strict ; la configuration le désactivait.
// Le filet était à 17 corrections de distance, et il était débranché. Trois de
// ces 17 étaient de vrais défauts, pas du bruit de typage :
//   · un Blob pouvant être null passé à une fonction qui exige un Blob,
//   · un pourcentage de clics comparé sans vérifier qu'il existe,
//   · une contrainte de type affirmant qu'un contenu de bloc n'est fait que de
//     chaînes, alors qu'il contient des booléens et des objets.
describe("le filet de types reste branché", () => {
  const conf = JSON.parse(readFileSync(join(__dirname, "../../tsconfig.json"), "utf8"))

  it("le mode strict est actif", () => {
    expect(conf.compilerOptions.strict, "strict a été rééteint").toBe(true)
  })

  it("aucune option strict n'est désactivée à part", () => {
    // Rallumer `strict` puis éteindre `strictNullChecks` reviendrait au point de départ.
    for (const k of ["strictNullChecks", "noImplicitAny", "strictFunctionTypes", "strictBindCallApply"]) {
      expect(conf.compilerOptions[k], `${k} désactivé`).not.toBe(false)
    }
  })

  it("le module sans types publiés est déclaré, pas passé en any global", () => {
    const d = readFileSync(join(__dirname, "../../types/react-simple-maps.d.ts"), "utf8")
    expect(d).toContain('declare module "react-simple-maps"')
    // Le piège serait `declare module "x";` sans corps : tout le module passerait
    // en any. Ici les composants réellement utilisés sont décrits un par un.
    expect(d, "module déclaré sans corps = any global").not.toMatch(/declare module "react-simple-maps";/)
    for (const c of ["ComposableMap", "Geographies", "Geography"]) expect(d).toContain(`export const ${c}`)
  })

  it("le garde-fou du Blob est en place", () => {
    const src = readFileSync(join(__dirname, "../app/dashboard/qr-codes/QRStudio.tsx"), "utf8")
    const i = src.indexOf("const blob = await getQRBlob")
    expect(i).toBeGreaterThan(0)
    expect(src.slice(i, i + 400), "blobToDataUrl peut encore recevoir null").toContain("if (!blob) return")
  })
})
