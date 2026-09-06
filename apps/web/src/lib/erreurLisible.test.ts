import { describe, it, expect } from "vitest"
import { readFileSync, readdirSync, statSync } from "node:fs"
import { join } from "node:path"
import { erreurLisible, MessageUtilisateur } from "./erreurLisible"

// Le commerçant lisait « Failed to fetch », « new row violates row-level security
// policy for table "pages" » ou « JWT expired » tels quels. Un seul traducteur.

describe("erreurLisible", () => {
  it("garde nos propres messages tels quels", () => {
    expect(erreurLisible(new MessageUtilisateur("Cette adresse est déjà dans l'équipe."))).toBe("Cette adresse est déjà dans l'équipe.")
  })

  it("traduit le réseau qui tombe", () => {
    expect(erreurLisible(new TypeError("Failed to fetch"))).toBe("Vérifiez votre connexion puis réessayez.")
  })

  it("ne laisse jamais passer un détail Supabase", () => {
    const brut = { code: "42501", message: 'new row violates row-level security policy for table "pages"' }
    const r = erreurLisible(brut)
    expect(r).not.toMatch(/row-level|policy|table|pages/)
    expect(erreurLisible({ message: "JWT expired", status: 401 })).toBe("Votre session a expiré. Reconnectez-vous puis réessayez.")
  })

  it("traduit les erreurs connues de Supabase Auth", () => {
    expect(erreurLisible({ message: "New password should be different from the old password." })).toBe("Le nouveau mot de passe doit être différent de l'ancien.")
    expect(erreurLisible({ message: "Password should be at least 6 characters." })).toBe("Le mot de passe est trop court.")
  })

  it("utilise le repli quand rien n'est reconnu", () => {
    expect(erreurLisible({ message: "something odd" }, "Le rôle n'a pas pu être changé.")).toBe("Le rôle n'a pas pu être changé.")
    expect(erreurLisible(null)).toBe("Une erreur inattendue est survenue. Vos modifications restent dans cet onglet.")
  })
})

describe("plus aucun message brut affiché au commerçant", () => {
  const racine = join(__dirname, "../app")
  const fichiers: string[] = []
  const marcher = (d: string) => {
    for (const n of readdirSync(d).sort()) {
      const p = join(d, n)
      if (statSync(p).isDirectory()) { if (n !== "api" && n !== "e2e-harness") marcher(p) }
      else if (/\.tsx?$/.test(n) && !/\.test\.tsx?$/.test(n)) fichiers.push(p)
    }
  }
  marcher(racine)

  it("aucun toast/setError/showToast ne reçoit un .message brut", () => {
    const suspects: string[] = []
    for (const f of fichiers) {
      const src = readFileSync(f, "utf8")
      for (const [i, ligne] of src.split("\n").entries()) {
        // Un .message qui n'est que TESTÉ (regex) pour choisir une phrase française reste permis.
        if (/(toast\.(error|info|success)|showToast|setError|setPwdError|setMsg)\(/.test(ligne) && /(error|err|e)(\s+as\s+Error\))?\.message/.test(ligne) && !/erreurLisible|safeErrorMessage|\.test\(/.test(ligne)) {
          suspects.push(`${f.replace(racine, "")}:${i + 1}`)
        }
      }
    }
    expect(suspects).toEqual([])
  })
})
