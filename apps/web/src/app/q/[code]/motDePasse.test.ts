import { describe, it, expect } from "vitest"
import { readFileSync } from "node:fs"
import { join } from "node:path"

const ROUTE = readFileSync(join(__dirname, "route.ts"), "utf8")
const ENTETES = readFileSync(join(__dirname, "../../../../next.config.mjs"), "utf8")

// LE DÉFAUT : le formulaire du mot de passe répondait par une redirection 302 vers
// la destination du QR. Le site envoie `form-action 'self'`, et WebKit comme Blink
// appliquent cette règle à TOUTE la chaîne de redirections qui suit l'envoi d'un
// formulaire. Le navigateur annulait donc la navigation, sans rien afficher : le
// bon mot de passe donnait exactement le même écran qu'un mauvais.
// Neuf redirections 302 dans les journaux de production, aucune suivie.

describe("le déverrouillage par mot de passe aboutit vraiment", () => {
  it("la règle qui bloquait est bien celle qu'on croit", () => {
    expect(ENTETES, "form-action a disparu des en-têtes : ce test n'a plus de sens")
      .toMatch(/form-action 'self'/)
  })

  it("le chemin du formulaire ne renvoie plus une redirection", () => {
    // `sortir()` remplace `redirectNoStore` sur toutes les issues du lien instantané.
    const bloc = ROUTE.slice(ROUTE.indexOf("const sortir ="), ROUTE.indexOf("QR Code introuvable"))
    expect(bloc).toContain("viaFormulaire ? htmlNoStore(relaisHtml(")
    expect(bloc, "une issue renvoie encore une redirection directe").not.toContain("return redirectNoStore(")
  })

  it("la page-relais part d'elle-même ET laisse un bouton", () => {
    // Une navigation lancée par la page n'est pas soumise à form-action ; le bouton
    // couvre les destinations que le renvoi automatique n'honore pas (tel:, mailto:).
    const relais = ROUTE.slice(ROUTE.indexOf("function relaisHtml"), ROUTE.indexOf("// Page de contenu"))
    expect(relais).toContain('http-equiv="refresh"')
    expect(relais).toContain('class="btn" href="${url}"')
    expect(relais, "la destination doit être échappée").toContain("escapeHtml(dest)")
  })

  it("un scan ordinaire garde sa redirection immédiate", () => {
    // Sans mot de passe, il n'y a pas de formulaire : la redirection 302 reste la
    // bonne réponse, et la plus rapide.
    expect(ROUTE).toContain("let viaFormulaire = false")
    expect(ROUTE).toMatch(/viaFormulaire = true/)
  })

  it("le mot de passe reste vérifié avant toute résolution", () => {
    const i = ROUTE.indexOf("verifyLinkPassword")
    const j = ROUTE.indexOf("const sortir =")
    expect(i, "la vérification doit précéder la sortie").toBeLessThan(j)
  })
})
