import { describe, it, expect } from "vitest"
import { readFileSync } from "node:fs"
import { join } from "node:path"

const read = (p: string) => readFileSync(join(__dirname, p), "utf8")
const editeur = read("BuilderV4.tsx")
const inscription = read("../../auth/signup/page.tsx")
const connexion = read("../../auth/login/page.tsx")

// Le mur du compte est la seule marche où QRowg demande quelque chose. Elle mérite
// d'être tenue : la personne n'a pas cliqué « créer un compte », elle a cliqué
// « publier ». Ce qui suit vérifie que cette intention n'est perdue nulle part.

describe("l'intention de publier traverse le mur du compte", () => {
  it("elle voyage dans l'adresse, avec le brouillon", () => {
    expect(editeur).toContain('"/dashboard/builder/new?claim=1&publier=1"')
  })

  it("elle est relue au retour", () => {
    expect(editeur).toContain('q.get("publier") === "1"')
    expect(editeur).toContain("wantPublishRef.current = true")
  })

  it("les trois chemins d'entrée la transportent", () => {
    // Formulaire d'inscription, formulaire de connexion, bouton Google : tous
    // relisent ?redirect= dans l'adresse et le renvoient à l'action serveur.
    for (const [nom, src] of [
      ["inscription", read("../../auth/signup/SignupForm.tsx")],
      ["connexion", read("../../auth/login/LoginForm.tsx")],
      ["google", read("../../auth/GoogleButton.tsx")],
    ] as const) {
      expect(src, `${nom} perd la destination`).toContain('get("redirect")')
    }
    // Et le passage inscription ↔ connexion la conserve.
    expect(inscription).toContain("`/auth/login?redirect=${encodeURIComponent(sp.redirect)}`")
    expect(connexion).toContain("`/auth/signup?redirect=${encodeURIComponent(sp.redirect)}`")
  })
})

describe("la mise en ligne promise a bien lieu", () => {
  it("elle attend que la page existe VRAIMENT en base", () => {
    expect(editeur).toContain("if (!claimed || !IS_UUID(liveId) || !ready.current) return")
  })

  it("elle enregistre AVANT de publier — sinon la page en ligne serait vide", () => {
    const bloc = editeur.slice(editeur.indexOf("if (!wantPublishRef.current"), editeur.indexOf("// Snapshot IMMUABLE"))
    const iSave = bloc.indexOf("saveNow()")
    const iPub = bloc.indexOf("publishLatest()")
    expect(iSave).toBeGreaterThan(0)
    expect(iPub).toBeGreaterThan(iSave)
  })

  it("elle n'a lieu qu'une fois, même si l'effet est rejoué", () => {
    expect(editeur).toContain("if (!wantPublishRef.current || autoPubRef.current) return")
    expect(editeur).toContain("autoPubRef.current = true")
    expect(editeur).toContain("wantPublishRef.current = false")
  })

  it("elle se voit : le panneau s'ouvre, rien ne se fait en douce", () => {
    const bloc = editeur.slice(editeur.indexOf("if (!wantPublishRef.current"), editeur.indexOf("// Snapshot IMMUABLE"))
    expect(bloc).toContain("setShowPublishPopup(true)")
  })

  it("le bandeau de reprise dit ce qui se passe réellement", () => {
    expect(editeur).toContain("Votre page vous a suivi et part en ligne.")
    expect(editeur).toContain("Votre page vous a suivi — elle est maintenant dans votre compte.")
  })
})

describe("ce que la personne lit avant de donner son email", () => {
  it("l'inscription annonce la mise en ligne, pas un compte surgi de nulle part", () => {
    expect(inscription).toContain("publier=1")
    expect(inscription).toContain("Votre page part en ligne juste après")
  })

  it("la connexion aussi : quelqu'un qui a déjà un compte n'est pas oublié", () => {
    expect(connexion).toContain("publier=1")
    expect(connexion).toContain("votre page part en ligne juste après")
  })
})

describe("le repère de fin de parcours", () => {
  it("est posé quand le serveur a confirmé, jamais avant", () => {
    const i = editeur.indexOf("marque(FUNNEL.pagePubliee")
    expect(i).toBeGreaterThan(0)
    const avant = editeur.slice(Math.max(0, i - 400), i)
    expect(avant).toContain('if (s.phase === "published")')
  })

  it("distingue une mise en ligne automatique d'un clic délibéré", () => {
    expect(editeur).toContain("auto: autoPubRef.current")
  })

  it("n'est posé qu'une seule fois par session", () => {
    expect(editeur).toContain("if (!publieeRef.current) { publieeRef.current = true")
  })
})
