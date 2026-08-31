import { describe, it, expect } from "vitest"
import { readFileSync } from "node:fs"
import { join } from "node:path"

// La page « Créer un QR » faisait 1 055 lignes, 33 useState et un `return` de 622
// lignes, pour onze responsabilités. Elle appelait huit invites natives du
// navigateur — dont une pour saisir un MOT DE PASSE en clair et une pour taper une
// date au format AAAA-MM-JJ — et ne portait pas un seul attribut d'accessibilité.
// Ce fichier interdit le retour en arrière.

const lire = (p: string) => readFileSync(join(__dirname, p), "utf8")
const page = lire("./page.tsx")
// Le code seul : les commentaires racontent ce qui a été corrigé et citent donc
// les tournures qu'on interdit. Les tests portent sur ce qui s'exécute.
const codeSeul = page
  .split("\n")
  .map(l => l.replace(/\s*\/\/.*$/, ""))
  .join("\n")
  .replace(/\{\/\*[\s\S]*?\*\/\}/g, "")
  .replace(/\/\*[\s\S]*?\*\//g, "")
const dialogue = readFileSync(join(__dirname, "../../../components/Dialogue.tsx"), "utf8")

describe("plus aucune invite du navigateur", () => {
  it("ni prompt, ni confirm, ni alert", () => {
    for (const appel of ["window.prompt(", "window.confirm(", "alert(", "prompt("]) {
      expect(codeSeul.includes(appel), `${appel} est revenu`).toBe(false)
    }
  })

  it("la date se choisit dans un calendrier, pas en tapant AAAA-MM-JJ", () => {
    expect(page).toContain('type="date"')
    expect(codeSeul).not.toContain("AAAA-MM-JJ")
  })

  it("le mot de passe passe par un champ masqué", () => {
    expect(page).toContain('type="password"')
  })

  it("supprimer demande confirmation et annonce que c'est définitif", () => {
    expect(page).toContain('demanderSuppression')
    expect(page).toMatch(/destructif=\{demande\?\.type === "supprimer"\}/)
    expect(page).toContain("C'est définitif")
  })
})

describe("la boîte de dialogue est utilisable au clavier", () => {
  it("annonce son rôle et son titre", () => {
    expect(dialogue).toContain('role="dialog"')
    expect(dialogue).toContain('aria-modal="true"')
    expect(dialogue).toContain("aria-labelledby")
  })

  it("se ferme avec Échap", () => {
    expect(dialogue).toContain('e.key === "Escape"')
  })

  it("garde le focus dedans, puis le rend à l'élément d'origine", () => {
    expect(dialogue).toContain('e.key !== "Tab"')
    expect(dialogue).toContain("origine.current?.focus?.()")
  })

  it("gèle le défilement de la page derrière", () => {
    expect(dialogue).toContain('document.body.style.overflow = "hidden"')
  })
})

describe("les trois fenêtres de la page se ferment aussi au clavier", () => {
  it("chacune passe par le même garde-fou", () => {
    const appels = page.match(/useFermetureModale\(/g) || []
    expect(appels.length).toBe(3)   // fiche, statistiques, import
  })
})

describe("ce qui est cliquable est atteignable au clavier", () => {
  it("les cartes de QR enregistrés ne sont plus des div muettes", () => {
    // `<div onClick>` sans rôle ni tabIndex : ouvrir la fiche d'un QR était
    // impossible sans souris, alors que les brouillons juste en dessous étaient
    // de vrais boutons. L'incohérence était interne au même écran.
    expect(page).toContain("carteCliquable(")
    expect(page).not.toMatch(/<div key=\{s\.id\} onClick=/)
  })

  it("les groupes de choix annoncent l'option retenue", () => {
    // Type de QR, chiffrement WiFi, style, correction d'erreur, pastilles de
    // couleur : l'état actif n'était signalé que par la couleur et la graisse.
    expect((page.match(/aria-pressed/g) || []).length).toBeGreaterThanOrEqual(5)
  })

  it("les sélecteurs de couleur libres ont un nom", () => {
    expect(page).toContain('aria-label="Couleur du QR, choix libre"')
    expect(page).toContain('aria-label="Couleur du fond, choix libre"')
  })

  it("les pastilles se nomment par leur couleur, pas par leur code hexadécimal", () => {
    // Un lecteur d'écran annonçait « Couleur dièse C 9 A 8 4 C ».
    // Les noms viennent maintenant de la table partagée (@/lib/stylesQr), avec le
    // générateur public — qui, lui, annonçait encore le code hexadécimal.
    expect(page).toContain("nommerCouleur(c)")
    expect(page).not.toMatch(/aria-label=\{`Couleur \$\{c\}`\}/)
  })
})

describe("la page a maigri", () => {
  it("reste sous mille lignes", () => {
    expect(page.split("\n").length).toBeLessThan(1000)
  })

  it("les deux plus gros blocs vivent dans leur propre fichier", () => {
    expect(() => lire("./StatistiquesQr.tsx")).not.toThrow()
    expect(() => lire("./ImportEnMasse.tsx")).not.toThrow()
    expect(page).toContain("<StatistiquesQr")
    expect(page).toContain("<ImportEnMasse")
  })

  it("ne réimplémente plus la détection d'écran étroit", () => {
    // Trois copies de useIsMobile coexistaient, avec deux seuils incompatibles :
    // un écran de 768 px exactement était « mobile » pour la moitié du produit.
    expect(page).not.toContain("function useIsMobile")
  })
})

describe("ce que la page n'écrit plus dans le navigateur", () => {
  it("le mot de passe WiFi ne part plus dans localStorage", () => {
    const i = page.indexOf("const saveToHistory")
    const bloc = page.slice(i, i + 700)
    expect(bloc).toContain('wifiPass: ""')
  })
})
