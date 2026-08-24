import { test, expect, type Page } from "@playwright/test"
import { collect, problems } from "./helpers/collect"

// Filet de sécurité sur TOUT ce qu'un visiteur peut atteindre.
//
// Douze lots ont été livrés en une journée, dont plusieurs touchant des fichiers
// partagés (accueil, éditeur, galerie). Une régression silencieuse sur une page
// qu'on ne rouvre jamais ne se verrait qu'au moment où elle coûte un visiteur.
//
// La liste des pages n'est pas écrite à la main : elle vient du sitemap. Une page
// ajoutée demain est donc couverte sans y penser — et si elle est dans le sitemap
// sans être atteignable, c'est justement ce qu'il faut savoir.
//
// SE LANCE CONTRE LE SITE EN LIGNE, avec sa propre configuration :
//
//   npx playwright test --config playwright.smoke.config.ts
//
// Surtout PAS avec la configuration principale : elle démarre un serveur de
// développement qui recompile chaque page à la volée. Cinquante-deux pages d'affilée
// dans ce mode font sauter Node (« JavaScript heap out of memory ») sur une machine
// de bureau ordinaire — constaté, pas supposé.

// La suite tourne sur deux « projets » (desktop et mobile) ; ce fichier gère lui-même
// ses deux tailles, il n'a donc rien à gagner à être joué deux fois.
test.beforeEach(({}, testInfo) => {
  // Garde-fou : lancé par mégarde avec la configuration principale (serveur de
  // développement), ce fichier ferait tomber la machine. On préfère un test ignoré
  // avec une explication à un plantage sans message.
  test.skip(!process.env.SMOKE_CONFIG, "à lancer avec : npx playwright test --config playwright.smoke.config.ts")
  test.skip(testInfo.project.name === "mobile", "les deux tailles sont déjà couvertes dans ce fichier")
})

const TAILLES = [
  { nom: "desktop", viewport: { width: 1280, height: 900 } },
  { nom: "mobile", viewport: { width: 390, height: 844 } },
]

async function routesDuSitemap(page: Page): Promise<string[]> {
  const rep = await page.request.get("/sitemap.xml")
  expect(rep.status(), "le sitemap doit répondre").toBe(200)
  const xml = await rep.text()
  const urls = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map(m => m[1])
  expect(urls.length, "le sitemap ne doit pas être vide").toBeGreaterThan(20)
  return urls.map(u => { try { return new URL(u).pathname } catch { return u } })
}

for (const t of TAILLES) {
  test(`toutes les pages publiques se chargent proprement — ${t.nom}`, async ({ page }) => {
    test.setTimeout(15 * 60 * 1000)
    await page.setViewportSize(t.viewport)
    const routes = await routesDuSitemap(page)
    const soucis: string[] = []

    for (const r of routes) {
      const c = collect(page)
      const rep = await page.goto(r, { waitUntil: "domcontentloaded", timeout: 45_000 }).catch(() => null)
      if (!rep) { soucis.push(`${r} — page injoignable`); continue }
      if (rep.status() !== 200) soucis.push(`${r} — statut ${rep.status()}`)
      await page.waitForLoadState("networkidle").catch(() => {})

      // Un seul <h1> : c'est ce que Google lit, et ce qu'un lecteur d'écran annonce.
      const h1 = await page.locator("h1").count()
      if (h1 !== 1) soucis.push(`${r} — ${h1} <h1> (attendu : 1)`)

      // Titre présent et non tronqué dans les résultats de recherche.
      const titre = await page.title()
      if (!titre) soucis.push(`${r} — aucun titre`)
      else if (titre.length > 60) soucis.push(`${r} — titre de ${titre.length} caractères`)

      // Débordement horizontal : le défaut mobile le plus fréquent, invisible en desktop.
      const deborde = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 2)
      if (deborde) soucis.push(`${r} — la page déborde horizontalement`)

      for (const p of problems(c)) soucis.push(`${r} — ${p}`)
    }

    expect(soucis, `${routes.length} pages parcourues :\n` + soucis.join("\n")).toEqual([])
  })
}

test("aucun lien interne ne mène nulle part", async ({ page }) => {
  test.setTimeout(15 * 60 * 1000)
  const routes = await routesDuSitemap(page)
  const vus = new Map<string, string[]>()

  for (const r of routes) {
    await page.goto(r, { waitUntil: "domcontentloaded", timeout: 45_000 }).catch(() => null)
    const hrefs = await page.$$eval("a[href]", as => as.map(a => a.getAttribute("href") || ""))
    for (const h of hrefs) {
      if (!h.startsWith("/") || h.startsWith("//")) continue      // externe : pas notre affaire
      const cible = h.split("#")[0]
      if (!cible) continue
      if (!vus.has(cible)) vus.set(cible, [])
      const src = vus.get(cible)!
      if (src.length < 3) src.push(r)
    }
  }

  const casses: string[] = []
  for (const [cible, sources] of vus) {
    const rep = await page.request.get(cible, { maxRedirects: 0, failOnStatusCode: false })
    if (rep.status() >= 400) casses.push(`${rep.status()} ${cible}  ← ${sources.join(", ")}`)
  }
  expect(casses, `${vus.size} liens internes vérifiés :\n` + casses.join("\n")).toEqual([])
})
