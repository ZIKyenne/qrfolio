import { describe, it, expect } from "vitest"
import { readFileSync } from "node:fs"
import { join } from "node:path"
import { validerImage, validerFichier, messageEnvoi, TAILLE_MAX_IMAGE, TAILLE_MAX_FICHIER } from "./validationEnvoi"

// Médias : un import qui échouait ne disait rien. Éditeur : « Erreur upload —
// réessaie » s'affichait pour un visiteur sans compte, et le bon message
// (« Créez un compte ») n'arrivait qu'au 2ᵉ essai — lastError lu après l'await,
// depuis le rendu précédent.

describe("validation avant envoi", () => {
  it("accepte une photo, refuse un PDF déguisé en image et une image trop lourde", () => {
    expect(validerImage({ type: "image/jpeg", size: 3_000_000, name: "a.jpg" })).toBeNull()
    expect(validerImage({ type: "application/pdf", size: 1000, name: "menu.pdf" })).toBe("type")
    expect(validerImage({ type: "image/png", size: TAILLE_MAX_IMAGE + 1, name: "a.png" })).toBe("taille")
  })

  it("accepte les documents par type OU par extension (Windows envoie parfois un type vide)", () => {
    expect(validerFichier({ type: "application/pdf", size: 10, name: "carte.pdf" })).toBeNull()
    expect(validerFichier({ type: "", size: 10, name: "carte.docx" })).toBeNull()
    expect(validerFichier({ type: "application/x-msdownload", size: 10, name: "setup.exe" })).toBe("type")
    expect(validerFichier({ type: "application/pdf", size: TAILLE_MAX_FICHIER + 1, name: "carte.pdf" })).toBe("taille")
  })

  it("chaque raison a une phrase, avec le nom du fichier quand on le connaît", () => {
    expect(messageEnvoi("no_account", "photo")).toContain("Créez un compte")
    expect(messageEnvoi("taille", "fichier", "carte.pdf")).toBe("« carte.pdf » dépasse 20 Mo.")
    expect(messageEnvoi("type", "photo")).toContain("JPG, PNG, WEBP")
    expect(messageEnvoi("failed", "fichier")).toContain("réessayez")
  })
})

describe("la raison voyage avec le résultat", () => {
  const lire = (p: string) => readFileSync(join(__dirname, p), "utf8")

  it("le hook renvoie { url, raison } et n'attend jamais un état périmé", () => {
    const hook = lire("./useImageUpload.ts")
    expect(hook).toContain("async function envoyerImage(file: File, path: string): Promise<ResultatEnvoi>")
    expect(hook).toContain("async function envoyerFichier(file: File, path = \"docs\"): Promise<ResultatEnvoi>")
    expect(hook).toContain("const invalide = validerImage(file)")
    expect(hook).toContain("const invalide = validerFichier(file)")
  })

  for (const f of ["./ImageUpload.tsx", "./FileUpload.tsx", "../assets/page.tsx"]) {
    it(`${f} ne lit plus lastError après un await`, () => {
      const src = lire(f)
      expect(src).not.toContain("lastError ===")
      expect(src).toContain("messageEnvoi(r.raison")
    })
  }

  it("Médias affiche les fichiers refusés, un par un", () => {
    const src = lire("../assets/page.tsx")
    expect(src).toContain("setImportErreurs(erreurs)")
    expect(src).toContain('{importErreurs.length > 0 && (')
    expect(src).toContain('role="alert"')
  })
})
