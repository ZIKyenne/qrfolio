import { describe, it, expect } from "vitest"
import { readFileSync } from "node:fs"
import { join } from "node:path"

// Le parcours qui doit convertir — composer sans compte, s'inscrire, publier — se
// terminait sans QR code. L'éditeur saute volontairement le rechargement sur ce
// chemin (le contenu est en mémoire, le relire l'effacerait), or le code court du
// QR n'était lu QUE dans ce rechargement. Il restait un bandeau vert : ni adresse,
// ni QR, ni « testez avant d'imprimer ». Il fallait recharger la page à la main.
const lire = (p: string) => readFileSync(join(__dirname, p), "utf8")

describe("le parcours de reprise se termine avec le QR code", () => {
  const creation = lire("../../api/pages/create/route.ts")
  const builder = lire("./BuilderV4.tsx")

  it("l'API de création renvoie le code court du QR qu'elle vient de poser", () => {
    // Elle insère déjà le QR ; ne pas rendre son code était l'oubli.
    expect(creation).toMatch(/short_code: shortCode/)
    expect(creation, "shortCode absent de la réponse").toMatch(/NextResponse\.json\(\{[^}]*shortCode/)
  })

  it("le chemin de reprise pose le code court, puisqu'il saute le rechargement", () => {
    const i = builder.indexOf("skipLoadRef.current = true")
    expect(i, "chemin de reprise introuvable").toBeGreaterThan(0)
    const apres = builder.slice(i, i + 500)
    expect(apres, "le QR n'est pas posé après avoir sauté le rechargement").toContain("setQrShortCode")
  })

  it("le code court a toujours exactement une seconde source", () => {
    // Une seule autre écriture : celle du rechargement normal. Si une troisième
    // apparaît, c'est que la valeur se pose à plusieurs endroits — donc qu'elle
    // peut diverger.
    const ecritures = builder.match(/setQrShortCode\(/g) ?? []
    expect(ecritures.length).toBe(2)
  })

  it("l'écran de fin dépend bien de cette valeur", () => {
    // Si ce lien disparaît, le correctif ne sert plus à rien sans qu'on le voie.
    expect(builder).toMatch(/const qrTarget = qrShortCode \?/)
  })
})

// Deuxième défaut du même parcours : des boutons « Créer une page » qui ouvrent un
// éditeur en mode démo. Sans identifiant de page, la garde du bootstrap sort,
// `ready` reste false, `buildSnapshot()` rend null : rien n'est enregistré. Le seul
// avertissement est un « Mode démo » en 9 px, masqué sur téléphone.
//
// Distinction importante : ce n'est vrai que pour une personne CONNECTÉE. Sans
// compte, un autre chemin sauvegarde le brouillon en local — les liens du menu
// invité ne sont donc pas concernés, et les changer aurait été une erreur.
describe("aucun bouton n'ouvre un éditeur qui n'enregistre rien", () => {
  const racine = join(__dirname, "../..")
  const shell = readFileSync(join(racine, "dashboard/DashboardShell.tsx"), "utf8")
  const accueil = readFileSync(join(racine, "HomeClient.tsx"), "utf8")

  it("aucune action de création n'ouvre l'éditeur sans identifiant", () => {
    // Ce test visait la PRÉSENCE de « /dashboard/builder/new ». Depuis, l'entrée
    // « page vierge » a été retirée du menu (partir d'une page blanche est le
    // pire départ pour qui n'a jamais fait de site) : l'invariant est donc tenu
    // encore plus fort — il n'y a plus aucun lien vers l'éditeur nu. C'est
    // l'invariant qu'on vérifie, pas la façon dont il est tenu.
    const bloc = shell.slice(shell.indexOf("const CREATE_ACTIONS"), shell.indexOf("GUEST_CREATE_ACTIONS"))
    expect(bloc, "un éditeur sans identifiant subsiste").not.toMatch(/href: "\/dashboard\/builder"/)
    // Si l'entrée revient un jour, elle DOIT viser /new.
    const versEditeur = [...bloc.matchAll(/href: "(\/dashboard\/builder[^"]*)"/g)].map(m => m[1])
    for (const h of versEditeur) expect(h).toBe("/dashboard/builder/new")
  })

  it("l'accueil ne renvoie plus vers l'éditeur sans identifiant", () => {
    expect(accueil).not.toMatch(/href="\/dashboard\/builder"/)
  })

  it("les entrées du menu invité sont laissées intactes", () => {
    // Sans compte, /dashboard/builder sauvegarde bien en local : les envoyer vers
    // /new n'apporterait rien et changerait un parcours qui fonctionne.
    const invite = shell.slice(shell.indexOf("const GUEST_NAV"))
    expect(invite).toMatch(/href: "\/dashboard\/builder"/)
  })
})
