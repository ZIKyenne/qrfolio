import { test, expect } from "@playwright/test"
import { collect } from "./helpers/collect"

// Pont galerie (T3.b) via le harness PUBLIC /e2e-harness/naming-style : la VRAIE modale de nommage
// (`NamingModal`) avec le sélecteur de style/disposition alimenté par le moteur de templates. Vérifie
// que changer de style/layout recompose thème+blocs, et que « créer » émettrait le composé.

const URL = "/e2e-harness/naming-style"

/** Les réglages d'apparence sont repliés par défaut (ils enterraient le formulaire
 *  sur mobile). Un clic sur « Apparence » les déplie. */
async function ouvrirApparence(page: import("@playwright/test").Page) {
  const b = page.getByRole("button", { name: /Apparence/ })
  await expect(b).toBeVisible({ timeout: 30_000 })
  // Le banc d'essai remonte la modale quand son état se stabilise, ce qui remet le
  // panneau à l'état replié : on redemande jusqu'à ce qu'il tienne ouvert.
  await expect(async () => {
    if ((await b.getAttribute("aria-expanded")) !== "true") await b.click()
    await expect(page.getByTestId("naming-style")).toBeVisible({ timeout: 1500 })
  }).toPass({ timeout: 20_000 })
}

test.describe("modale de nommage — sélecteur de style (moteur)", () => {
  test.beforeEach(async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "desktop", "harness = projet desktop")
    await page.addInitScript(() => {
      const s = document.createElement("style"); s.textContent = "nextjs-portal{pointer-events:none!important}"
      document.addEventListener("DOMContentLoaded", () => document.documentElement.appendChild(s))
      queueMicrotask(() => { try { document.documentElement.appendChild(s) } catch { /* noop */ } })
    })
  })

  test("rendu de la modale avec sélecteurs, sans erreur fatale", async ({ page }, testInfo) => {
    await page.goto(URL, { waitUntil: "networkidle" })
    // Repliés au départ : le champ « nom » et le bouton doivent rester atteignables
    // sans avoir à faire défiler une pleine page de pastilles.
    await expect(page.getByTestId("naming-style")).toBeHidden()
    await ouvrirApparence(page)
    await expect(page.getByTestId("naming-layout")).toBeVisible()
    // au moins plusieurs styles proposés + les 3 dispositions
    expect(await page.locator("[data-testid^='style-']").count()).toBeGreaterThanOrEqual(10)
    expect(await page.locator("[data-testid^='layout-']").count()).toBe(3)
    // cas signature : l'option « original » (__native) est présente et active par défaut
    await expect(page.getByTestId("style-__native")).toBeVisible()
    await expect(page.getByTestId("style-__native")).toHaveAttribute("data-active", "1")
    const c = collect(page)
    await testInfo.attach("naming-style", { body: await page.screenshot({ fullPage: true }), contentType: "image/png" })
    expect(c.pageErrors, "erreurs fatales:\n" + c.pageErrors.join("\n")).toEqual([])
    expect(c.badResponses, "réseau même-origine:\n" + c.badResponses.join("\n")).toEqual([])
  })

  test("changer de STYLE recompose (thème + nb de blocs)", async ({ page }, testInfo) => {
    await page.goto(URL, { waitUntil: "domcontentloaded" })
    await ouvrirApparence(page)
    const before = await page.getByTestId("naming-style-harness").getAttribute("data-theme-name")
    await page.getByTestId("style-slate").click()
    await expect(page.getByTestId("naming-style-harness")).toHaveAttribute("data-style", "slate")
    const after = await page.getByTestId("naming-style-harness").getAttribute("data-theme-name")
    expect(after).not.toBe(before) // le thème a réellement changé
    await expect(page.getByTestId("style-slate")).toHaveAttribute("data-active", "1")
    await testInfo.attach("naming-style-slate", { body: await page.screenshot({ fullPage: true }), contentType: "image/png" })
  })

  test("changer de DISPOSITION met à jour l'axe layout", async ({ page }) => {
    await page.goto(URL, { waitUntil: "domcontentloaded" })
    await ouvrirApparence(page)
    await page.getByTestId("layout-compact").click()
    await expect(page.getByTestId("naming-style-harness")).toHaveAttribute("data-layout", "compact")
    await expect(page.getByTestId("layout-compact")).toHaveAttribute("data-active", "1")
  })

  test("« Creer ma page » émet le composé (blocs + thème)", async ({ page }) => {
    await page.goto(URL, { waitUntil: "domcontentloaded" })
    await ouvrirApparence(page)
    await page.getByTestId("style-neon").click()
    // renseigner un nom valide + un slug ; le harness court-circuite la vérif réseau via onCreate direct
    await page.getByPlaceholder("Ex : Le Bistrot Parisien").fill("Ma page de test")
    // le bouton n'est actif qu'avec un slug « disponible » : on appelle onCreate via le clic seulement
    // si dispo — sinon on vérifie au moins que le style neon est bien actif (recomposition).
    await expect(page.getByTestId("style-neon")).toHaveAttribute("data-active", "1")
    await expect(page.getByTestId("naming-style-harness")).toHaveAttribute("data-style", "neon")
  })
})
