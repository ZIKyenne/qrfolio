import { describe, it, expect } from "vitest"
import { readFileSync, readdirSync, statSync } from "node:fs"
import { join } from "node:path"
import { creerUrl, creerUrlSecteur } from "./creer/entry"

// Ce que ce fichier garde, et pourquoi.
//
// Mesure réelle, sur les quatre jours qui ont suivi les six lots précédents :
// l'accueil a reçu 19 visiteurs, /auth/signup en a reçu 10, et /creer un seul.
// On avait rebranché trente pages SEO et le générateur en oubliant la barre du
// haut de l'accueil — présente à chaque défilement, sur la page qui reçoit le
// plus de monde. Le formulaire d'inscription totalise 18 arrivées et 0 compte.
//
// Règle : une page publique ne pousse plus un visiteur anonyme vers le formulaire.
// Les seules exceptions sont les endroits où un compte est RÉELLEMENT nécessaire,
// listées nommément ci-dessous. Toute nouvelle occurrence casse ce test.

const SRC = join(__dirname, "..")
const read = (p: string) => readFileSync(join(SRC, p), "utf8")

/** Les seuls endroits où mener au formulaire d'inscription se justifie. */
const EXCEPTIONS: Record<string, { n: number; raison: string }> = {
  "app/homeSections/Pricing.tsx": { n: 2, raison: "les deux offres PAYANTES : choisir un plan suppose un compte" },
  "app/creer/entry.ts": { n: 1, raison: "un commentaire qui explique justement pourquoi on n'y mène plus" },
  "app/dashboard/DashboardShell.tsx": { n: 1, raison: "la carte « Créer mon compte » du visiteur : elle promet un compte, elle en donne un" },
  "app/dashboard/builder/BuilderV4.tsx": { n: 1, raison: "le mur de la publication : publier exige une page en base, donc un compte" },
  "app/dashboard/profile/page.tsx": { n: 1, raison: "le lien de parrainage, qui doit bien mener à une inscription" },
  "components/MobileNav.tsx": { n: 1, raison: "l'onglet « Compte » du visiteur : le libellé annonce ce qu'il fait" },
}

function sources(dir: string, out: string[] = []): string[] {
  for (const nom of readdirSync(join(SRC, dir)).sort()) {
    const rel = `${dir}/${nom}`
    if (statSync(join(SRC, rel)).isDirectory()) { sources(rel, out); continue }
    if (!/\.tsx?$/.test(nom) || /\.(test|spec)\.tsx?$/.test(nom)) continue
    out.push(rel)
  }
  return out
}

describe("aucune page publique ne pousse vers le formulaire d'inscription", () => {
  // Les pages d'authentification elles-mêmes ont évidemment le droit d'en parler.
  const fichiers = sources("app").concat(sources("components")).filter(f => !f.startsWith("app/auth/"))

  it("l'inventaire est complet : aucun lien oublié, aucune exception périmée", () => {
    const trouves: Record<string, number> = {}
    for (const f of fichiers) {
      const n = (read(f).match(/\/auth\/signup/g) || []).length
      if (n) trouves[f] = n
    }
    const attendus = Object.fromEntries(Object.entries(EXCEPTIONS).map(([k, v]) => [k, v.n]))
    expect(trouves, "un lien vers l'inscription est apparu ailleurs, ou une exception n'a plus lieu d'être").toEqual(attendus)
  })

  it("chaque exception dit pourquoi elle existe", () => {
    for (const [f, e] of Object.entries(EXCEPTIONS)) {
      expect(e.raison.length, `${f} sans justification`).toBeGreaterThan(20)
    }
  })
})

describe("les portes d'entrée mènent à l'essai", () => {
  it("la barre du haut de l'accueil, et son menu mobile", () => {
    const h = read("app/HomeClient.tsx")
    expect(h).toContain('<Link href="/creer" className="nct"')
    expect(h).toContain("Composer ma page\n            </Link>")
    expect(h).toContain('<Link href="/creer" onClick={()=>setMenuOpen(false)}')
    expect(h).toContain("Composer ma page →</Link>")
  })

  it("l'offre gratuite : rien à payer, donc rien à ouvrir avant d'essayer", () => {
    const h = read("app/homeSections/Pricing.tsx")
    const ligne = h.split("\n").find(l => l.includes("free:") && l.includes("cta:")) || ""
    expect(ligne).toContain('href: "/creer"')
    // Les offres payantes, elles, gardent l'inscription.
    for (const plan of ["pro", "business"]) {
      const l = h.split("\n").find(x => x.includes(`${plan}:`) && x.includes("cta:")) || ""
      expect(l, `l'offre ${plan}`).toContain("/auth/signup")
    }
  })

  it("les en-têtes des pages publiques, avec une porte pour ceux qui ont un compte", () => {
    for (const f of [
      "app/qr-code/page.tsx",
      "app/qr-code/[usage]/page.tsx",
      "app/security/page.tsx",
      "app/generateur-qr-code/page.tsx",
      "app/generateur-qr-code-wifi/page.tsx",
    ]) {
      const s = read(f)
      expect(s, `${f} : pas de bouton vers l'essai`).toContain("Composer ma page")
      expect(s, `${f} : personne ne peut se reconnecter`).toContain('href="/auth/login"')
    }
  })

  it("les pages de contenu, chacune vers les modèles de son secteur", () => {
    expect(read("app/examples/page.tsx")).toContain("creerUrlSecteur(example.category)")
    expect(read("app/features/page.tsx")).toContain("creerUrlSecteur(t.secteur)")
    expect(read("app/not-found.tsx")).toContain("Composer ma page — sans compte")
    expect(read("app/contact/page.tsx")).toContain("creerUrl()")
  })

  it("le vrai 404 du site n'est pas un cul-de-sac", () => {
    // Le segment [slug] attrape toutes les adresses d'un seul niveau : c'est SON
    // 404 que voit un visiteur, pas celui de la racine (réservé à /a/b/c).
    // Il n'y avait qu'un « Retour à l'accueil ». Quelqu'un qui vient de scanner
    // un QR mort mérite au moins de savoir pourquoi.
    const s = read("app/[slug]/not-found.tsx")
    expect(s).toContain("vous venez de scanner un QR code")
    expect(s).toContain('href="/auth/login"')
    expect(s).toContain('href="/creer"')
  })

  it("« Nous contacter » mène au contact, pas à l'inscription", () => {
    // Le bouton disait « Nous contacter » et ouvrait le formulaire d'inscription.
    const h = read("app/homeSections/Faq.tsx")
    const i = h.indexOf("Nous contacter")
    expect(i).toBeGreaterThan(0)
    expect(h.slice(Math.max(0, i - 900), i)).toContain('href="/contact"')
  })
})

describe("l'adresse de l'essai depuis un secteur déjà connu", () => {
  it("garde les secteurs de la galerie", () => {
    expect(creerUrlSecteur("Restaurant")).toBe("/creer?metier=Restaurant")
    expect(creerUrlSecteur("Immobilier")).toBe("/creer?metier=Immobilier")
  })

  it("traduit ceux qui portent un autre nom ailleurs", () => {
    expect(creerUrlSecteur("Artiste")).toBe("/creer?metier=Musicien")
    expect(creerUrlSecteur("Commerce")).toBe("/creer?metier=Ecommerce")
  })

  it("préfère la galerie entière à un filtre inventé", () => {
    expect(creerUrlSecteur("Plombier")).toBe("/creer")
    expect(creerUrlSecteur("Tous")).toBe("/creer")
    expect(creerUrlSecteur("")).toBe("/creer")
    expect(creerUrlSecteur(null)).toBe("/creer")
    expect(creerUrl()).toBe("/creer")
  })

  it("les six exemples publiés mènent tous quelque part de sensé", () => {
    const s = read("app/examples/page.tsx")
    const cats = [...s.matchAll(/category: "([^"]+)"/g)].map(m => m[1])
    expect(cats.length).toBe(6)
    const sans = cats.filter(c => creerUrlSecteur(c) === "/creer")
    expect(sans, "catégories qui ne trouvent aucun secteur").toEqual([])
  })
})
