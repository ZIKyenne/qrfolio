import { test, expect } from "@playwright/test"
import { collect, problems } from "./helpers/collect"

// Panneau de réglages refondu (C03) — testé via le harness PUBLIC /e2e-harness/block-settings
// (sans Supabase). Couvre : état vide, sélection, mode simple/avancé, sections, modification,
// toolbar/danger, verrouillage, visibilité, suppression confirmée, Escape, fallback legacy ;
// mobile : plein écran, no-overflow portrait & paysage.

const URL = "/e2e-harness/block-settings"

test.describe("réglages de bloc (harness)", () => {
  test("rendu sans erreur + heading sélectionné par défaut", async ({ page }, testInfo) => {
    // 1er passage : compile la route à froid (le dev de Next peut émettre un avertissement
    // d'hydratation transitoire au tout premier rendu). On mesure l'hydratation STABLE : on
    // attache le collecteur puis on recharge la route déjà compilée.
    const resp = await page.goto(URL, { waitUntil: "networkidle" })
    expect(resp?.status()).toBeLessThan(400)
    await expect(page.getByTestId("block-settings")).toBeVisible({ timeout: 30_000 })
    const c = collect(page)
    await page.reload({ waitUntil: "networkidle" })
    await expect(page.getByTestId("block-settings")).toBeVisible()
    await testInfo.attach(`settings-${testInfo.project.name}`, { body: await page.screenshot(), contentType: "image/png" })
    expect(problems(c), "erreurs navigateur:\n" + problems(c).join("\n")).toEqual([])
  })

  test("état vide quand aucun bloc sélectionné", async ({ page }, testInfo) => {
    await page.goto(URL, { waitUntil: "domcontentloaded" })
    await expect(page.getByTestId("block-settings")).toBeVisible()
    await page.getByTestId("select-none").click()
    await expect(page.getByTestId("settings-empty")).toBeVisible()
    await expect(page.getByText(/sélectionnez un bloc/i)).toBeVisible()
    await testInfo.attach("empty", { body: await page.screenshot(), contentType: "image/png" })
  })

  test("mode simple = sous-ensemble, avancé = plus de sections", async ({ page }, testInfo) => {
    await page.goto(URL, { waitUntil: "domcontentloaded" })
    await expect(page.getByTestId("block-settings")).toBeVisible()
    // simple par défaut
    await expect(page.getByTestId("block-settings")).toHaveAttribute("data-mode", "simple")
    const simpleSections = await page.locator("[data-section]").count()
    await testInfo.attach("simple", { body: await page.screenshot(), contentType: "image/png" })
    // passer en avancé
    await page.locator('[data-mode-btn="advanced"]').click()
    await expect(page.getByTestId("block-settings")).toHaveAttribute("data-mode", "advanced")
    const advSections = await page.locator("[data-section]").count()
    expect(advSections, "avancé expose plus de sections").toBeGreaterThan(simpleSections)
    await testInfo.attach("advanced", { body: await page.screenshot(), contentType: "image/png" })
  })

  test("modification d'un champ (heading.text) — pas de perte, badge de changement", async ({ page }) => {
    await page.goto(URL, { waitUntil: "domcontentloaded" })
    await expect(page.getByTestId("block-settings")).toBeVisible()
    const input = page.locator('#f-blk-heading-text')
    await input.fill("Mon titre E2E")
    await expect(page.getByTestId("heading-text")).toHaveText('text=«Mon titre E2E»')
    // badge de changement sur la section Contenu
    await expect(page.locator('[data-section="content"] [data-changed]')).toBeVisible()
  })

  test("changement de section (avancé)", async ({ page }) => {
    await page.goto(URL, { waitUntil: "domcontentloaded" })
    await expect(page.getByTestId("block-settings")).toBeVisible()
    await page.locator('[data-mode-btn="advanced"]').click()
    await page.locator('[data-section="design"]').click()
    await expect(page.locator('[data-section="design"]')).toHaveAttribute("aria-selected", "true")
    await expect(page.getByTestId("legacy-design")).toBeVisible()
  })

  test("fallback legacy pour un bloc non pilote (cta_button)", async ({ page }) => {
    await page.goto(URL, { waitUntil: "domcontentloaded" })
    await expect(page.getByTestId("block-settings")).toBeVisible()
    await page.locator('[data-select="cta_button"]').click()
    await expect(page.getByTestId("legacy-content")).toBeVisible()
  })

  test("verrouillage désactive Supprimer ; visibilité bascule un badge", async ({ page }) => {
    await page.goto(URL, { waitUntil: "domcontentloaded" })
    await expect(page.getByTestId("block-settings")).toBeVisible()
    await page.locator('[data-mode-btn="advanced"]').click()
    // masquer → badge "Masqué"
    await page.locator('[data-action="toggleVisible"]').click()
    await expect(page.getByText(/masqué/i).first()).toBeVisible()
    // verrouiller → bouton Supprimer désactivé
    await page.locator('[data-action="toggleLock"]').click()
    await expect(page.locator('button[data-action="delete"]')).toBeDisabled()
  })

  test("suppression confirmée retire le bloc et vide le panneau", async ({ page }) => {
    await page.goto(URL, { waitUntil: "domcontentloaded" })
    await expect(page.getByTestId("block-settings")).toBeVisible()
    await page.locator('[data-mode-btn="advanced"]').click()
    await page.locator('button[data-action="delete"]').click()
    await expect(page.getByTestId("harness-bar")).toHaveAttribute("data-deleted", /heading/)
    await expect(page.getByTestId("settings-empty")).toBeVisible()
  })

  test("Escape ferme le panneau (vue vide)", async ({ page }) => {
    await page.goto(URL, { waitUntil: "domcontentloaded" })
    await expect(page.getByTestId("block-settings")).toBeVisible()
    await page.locator('[data-section="content"]').first().focus()
    await page.keyboard.press("Escape")
    await expect(page.getByTestId("settings-empty")).toBeVisible()
  })

  test("mobile : plein écran, aucun overflow horizontal (portrait + paysage)", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "mobile", "mobile uniquement")
    await page.goto(URL, { waitUntil: "domcontentloaded" })
    await expect(page.getByTestId("block-settings")).toBeVisible()
    const overflow = () => page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)
    expect(await overflow(), "overflow portrait").toBeLessThanOrEqual(1)
    await testInfo.attach("mobile-portrait", { body: await page.screenshot(), contentType: "image/png" })
    await page.setViewportSize({ width: 844, height: 390 })
    await expect(page.getByTestId("block-settings")).toBeVisible()
    expect(await overflow(), "overflow paysage").toBeLessThanOrEqual(1)
    await testInfo.attach("mobile-landscape", { body: await page.screenshot(), contentType: "image/png" })
  })
})
