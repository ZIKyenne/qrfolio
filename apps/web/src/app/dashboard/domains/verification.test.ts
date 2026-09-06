import { describe, it, expect } from "vitest"
import { readFileSync } from "node:fs"
import { join, dirname } from "node:path"
import { fileURLToPath } from "node:url"

// Deux défauts mesurés le 4 septembre sur la page Domaines :
//  · la vérification DNS réussie marquait « actif » côté client sans jamais
//    rattacher le domaine à Vercel (verifyDomain n'était appelée nulle part) ;
//  · « Vérifier DNS » rendait le vérificateur DANS l'accordéon fermé : sur une
//    ligne repliée, le bouton ne faisait visiblement rien.

const src = readFileSync(join(dirname(fileURLToPath(import.meta.url)), "DomainsPage.tsx"), "utf8")

describe("vérification d'un domaine", () => {
  it("un DNS validé déclenche le rattachement à Vercel", () => {
    expect(src).toContain("void verifyDomain(rec)")
    expect(src).not.toMatch(/onVerified=\{\(\) => \{\s*setDomains\(prev => prev\.map\(r =>\s*r\.id === rec\.id \? \{ \.\.\.r, verified: true, vercel_status: "active" \}/)
  })
  it("« Vérifier DNS » ouvre la ligne", () => {
    expect(src).toContain("if (ouvre) setExpanded(rec.id)")
  })
  it("verifyDomain rapporte l'état réel et ne reste jamais bloqué", () => {
    const i = src.indexOf("async function verifyDomain")
    const bloc = src.slice(i, src.indexOf("\n  }\n", i))
    expect(bloc).toContain("finally {")
    expect(bloc).toContain("le rattachement a échoué")
    expect(bloc).toContain("Connexion impossible. Réessayez.")
  })
})
