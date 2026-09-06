import { describe, it, expect } from "vitest"
import { readFileSync } from "node:fs"
import { join } from "node:path"

// L'essai sans inscription tient sur une poignée de gardes. Chacun de ces tests
// correspond à un bug réellement constaté pendant la mise au point du parcours.

const read = (p: string) => readFileSync(join(__dirname, p), "utf8")
const BUILDER = read("BuilderV4.tsx")
const TEMPLATES = readFileSync(join(__dirname, "../templates/page.tsx"), "utf8")
const ACTIONS = readFileSync(join(__dirname, "../../auth/actions.ts"), "utf8")

describe("visiteur sans compte — aucune écriture prématurée", () => {
  it("la création de page attend de savoir qui est là", () => {
    // Sans ce garde, un visiteur anonyme sur /builder/new déclenchait un POST
    // voué à un 401, et voyait une erreur au lieu de son éditeur.
    expect(BUILDER).toContain('if (authState !== "user") return')
  })

  it("l'état de session distingue « inconnu » de « invité »", () => {
    expect(BUILDER).toContain('useState<"unknown" | "guest" | "user">("unknown")')
  })

  it("publier sans compte mène à l'inscription, pas à un échec", () => {
    expect(BUILDER).toContain("if (guest) { goSignup(); return }")
  })

  it("le brouillon part avec le visiteur vers l'inscription", () => {
    expect(BUILDER).toContain('/auth/signup?redirect=${back}')
    // L'intention de publier voyage avec lui depuis le lot « mur de la publication ».
    expect(BUILDER).toContain('encodeURIComponent("/dashboard/builder/new?claim=1&publier=1")')
  })
})

describe("reprise après inscription", () => {
  it("le brouillon est lu AVANT la création de la page", () => {
    const lectureClaim = BUILDER.indexOf('get("claim") === "1"')
    const creation = BUILDER.indexOf('fetch("/api/pages/create"')
    expect(lectureClaim).toBeGreaterThan(-1)
    expect(lectureClaim, "l'effet de lecture doit précéder le bootstrap").toBeLessThan(creation)
  })

  it("le chargement qui suit n'écrase pas la page reprise", () => {
    // La page est créée VIDE en base ; son contenu n'est qu'en mémoire. Relire
    // immédiatement remettait zéro bloc et effaçait tout le travail du visiteur.
    expect(BUILDER).toContain("skipLoadRef.current = true")
    expect(BUILDER).toContain('if (skipLoadRef.current) { skipLoadRef.current = false; setLoadState("loaded"); return }')
  })

  it("le brouillon n'est effacé qu'une fois la page créée", () => {
    const creation = BUILDER.indexOf("if (claimed) {")
    const effacement = BUILDER.indexOf("clearDraft(browserStorage())\n            claimRef.current = null")
    expect(effacement).toBeGreaterThan(creation)
  })

  it("une erreur d'inscription ne fait pas perdre la destination", () => {
    // Un mot de passe mal tapé renvoyait vers /auth/signup SANS le redirect :
    // le visiteur repartait vers l'onboarding, sa page abandonnée derrière lui.
    expect(ACTIONS).toContain("'/auth/signup?error=' + encodeURIComponent(frAuthError(error)) + (safeTo ? '&redirect=' + encodeURIComponent(safeTo) : '')")
    expect(ACTIONS).toContain("'/auth/login?error=' + encodeURIComponent(frAuthError(error)) + (safeTo ? '&redirect=' + encodeURIComponent(safeTo) : '')")
  })
})

describe("modèles ouverts aux visiteurs", () => {
  it("un modèle devient le brouillon local au lieu d'un 401", () => {
    expect(TEMPLATES).toContain("function applyTemplateAsGuest(")
    expect((TEMPLATES.match(/applyTemplateAsGuest\(/g) || []).length,
      "les deux chemins de création (assistant + direct) doivent être couverts").toBeGreaterThanOrEqual(5)
  })

  it("une session découverte trop tard ne casse pas le parcours", () => {
    expect(TEMPLATES).toContain("if (res.status === 401) return applyTemplateAsGuest(")
  })

  it("le slug n'est pas exigé sans compte", () => {
    // La page n'est pas créée en base : l'adresse se choisit à la publication.
    expect(TEMPLATES).toContain('const canSubmit = nameValid && (guest || slugStatus === "available") && !submitting')
  })

  it("le modèle d'origine survit aux réécritures du brouillon", () => {
    // L'éditeur réécrivait le brouillon toutes les 600 ms sans le templateKey :
    // le lien avec la galerie disparaissait, et le guide de bienvenue revenait.
    expect(BUILDER).toContain("templateKey: templateKeyRef.current")
    expect((BUILDER.match(/templateKey: templateKeyRef\.current/g) || []).length).toBe(2)
  })
})

describe("ce qui demande vraiment un compte le dit", () => {
  it("l'envoi d'images distingue « pas de compte » d'un échec réseau", () => {
    const hook = read("useImageUpload.ts")
    expect(hook).toContain('echec("no_account")')
    expect(hook).toContain('echec("failed")')
    expect(hook).toContain("lastError }")
  })

  it("les deux composants d'envoi affichent le bon message, reçu AVEC le résultat", () => {
    // Et non lu depuis `lastError` après l'await : ce rendu-là avait un coup de retard.
    const v = read("validationEnvoi.ts")
    expect(v).toContain("Créez un compte (gratuit) pour ajouter vos propres photos")
    expect(v).toContain("Créez un compte (gratuit) pour joindre vos fichiers")
    for (const f of ["ImageUpload.tsx", "FileUpload.tsx"]) {
      expect(read(f), f).toContain("messageEnvoi(r.raison")
      expect(read(f), f).not.toContain('lastError === "no_account"')
    }
  })

  it("le guide « on a posé 3 blocs pour toi » ne s'affiche pas sur une page déjà remplie", () => {
    expect(BUILDER).toContain("!draftFound && !fromTemplate && !claimed && <BuilderWelcome")
  })
})

describe("HTML valide dans la bibliothèque de blocs", () => {
  it("aucune étoile favori n'est un <button> dans un <button>", () => {
    // React signalait une erreur d'hydratation à chaque ouverture de l'éditeur —
    // la page sur laquelle atterrit désormais chaque visiteur.
    expect(BUILDER).not.toMatch(/<button onClick=\{e => \{ e\.stopPropagation\(\); toggleFav/)
    expect((BUILDER.match(/role="button" tabIndex=\{0\} onClick=\{e => \{ e\.stopPropagation\(\); toggleFav/g) || []).length).toBe(5)
  })

  it("l'étoile reste utilisable au clavier", () => {
    expect((BUILDER.match(/if \(e\.key === "Enter" \|\| e\.key === " "\)/g) || []).length).toBe(5)
  })
})

describe("« ← QRowg » d'un visiteur sans compte", () => {
  // /dashboard redirige vers la connexion : l'essai sans compte finissait sur un mur.
  it("mène aux modèles, pas à la page de connexion (PC et téléphone)", () => {
    expect(BUILDER).toContain('href={guest ? "/dashboard/templates" : "/dashboard"}')
    expect(BUILDER).toContain('window.location.assign(guest ? "/dashboard/templates" : "/dashboard")')
    expect(BUILDER).not.toMatch(/<a href="\/dashboard" aria-label="Retour au tableau de bord"/)
  })
})
