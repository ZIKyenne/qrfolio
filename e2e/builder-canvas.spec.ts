import { test, expect } from "@playwright/test"
import { collect, problems } from "./helpers/collect"

// Canvas responsive (C04) — testé via le harness PUBLIC /e2e-harness/builder-canvas (sans Supabase).
// Couvre : devices, orientation, zoom, ajuster, centrer, aperçu, plein écran/focus, sélection,
// toolbar flottante, insertion entre blocs, page longue (10/50/100) ; mobile : no-overflow portrait & paysage.

const URL = "/e2e-harness/builder-canvas"

test.describe("canvas responsive (harness)", () => {
  test("rendu stable sans erreur", async ({ page }, testInfo) => {
    await page.goto(URL, { waitUntil: "networkidle" })
    await expect(page.getByTestId("responsive-canvas")).toBeVisible({ timeout: 30_000 })
    const c = collect(page)
    await page.reload({ waitUntil: "networkidle" })
    await expect(page.getByTestId("responsive-canvas")).toBeVisible()
    await testInfo.attach(`canvas-${testInfo.project.name}`, { body: await page.screenshot(), contentType: "image/png" })
    expect(problems(c), "erreurs:\n" + problems(c).join("\n")).toEqual([])
  })

  test("changement d'appareil + largeur affichée + orientation", async ({ page }, testInfo) => {
    await page.goto(URL, { waitUntil: "domcontentloaded" })
    await expect(page.getByTestId("responsive-canvas")).toBeVisible()
    await page.locator('[data-device="mobile"]').click()
    await expect(page.getByTestId("responsive-canvas")).toHaveAttribute("data-device", "mobile")
    await expect(page.getByTestId("device-label")).toHaveText(/Mobile · 390 px/)
    await expect(page.getByTestId("canvas-frame")).toHaveAttribute("data-framed", "1")
    await testInfo.attach("mobile-frame", { body: await page.screenshot(), contentType: "image/png" })
    // orientation (mobile) → paysage 844
    await page.getByTestId("orientation").click()
    await expect(page.getByTestId("responsive-canvas")).toHaveAttribute("data-orientation", "landscape")
    await expect(page.getByTestId("device-label")).toHaveText(/844 px/)
    // tablette
    await page.locator('[data-device="tablet"]').click()
    await expect(page.getByTestId("device-label")).toHaveText(/Tablette · 768 px/)
    await testInfo.attach("tablet-frame", { body: await page.screenshot(), contentType: "image/png" })
    // fluid : pas de cadre matériel
    await page.locator('[data-device="fluid"]').click()
    await expect(page.getByTestId("canvas-frame")).toHaveAttribute("data-framed", "0")
    await testInfo.attach("full-width", { body: await page.screenshot(), contentType: "image/png" })
  })

  test("zoom +/− borné, 100 %, ajuster", async ({ page }) => {
    await page.goto(URL, { waitUntil: "domcontentloaded" })
    await expect(page.getByTestId("responsive-canvas")).toBeVisible()
    await page.locator('[data-device="desktop"]').click()
    await expect(page.getByTestId("zoom-value")).toHaveText("100 %")
    await page.getByTestId("zoom-in").click()
    await expect(page.getByTestId("zoom-value")).toHaveText("110 %")
    await page.getByTestId("zoom-out").click()
    await page.getByTestId("zoom-out").click()
    await expect(page.getByTestId("zoom-value")).toHaveText("90 %")
    await page.getByTestId("zoom-reset").click()
    await expect(page.getByTestId("zoom-value")).toHaveText("100 %")
    await page.getByTestId("zoom-fit").click()
    // desktop 1280 dans un canvas plus étroit → < 100 %
    await expect(page.getByTestId("zoom-value")).not.toHaveText("100 %")
  })

  test("mode aperçu masque la toolbar, retour édition", async ({ page }, testInfo) => {
    await page.goto(URL, { waitUntil: "domcontentloaded" })
    await expect(page.getByTestId("responsive-canvas")).toBeVisible()
    await page.getByTestId("preview-toggle").click()
    await expect(page.getByTestId("responsive-canvas")).toHaveAttribute("data-mode", "preview")
    await expect(page.getByTestId("preview-banner")).toBeVisible()
    await expect(page.getByTestId("canvas-toolbar")).toHaveCount(0)
    await testInfo.attach("preview", { body: await page.screenshot(), contentType: "image/png" })
    await page.getByTestId("exit-preview").click()
    await expect(page.getByTestId("responsive-canvas")).toHaveAttribute("data-mode", "edit")
  })

  test("sélection + toolbar flottante + actions", async ({ page }, testInfo) => {
    await page.goto(URL, { waitUntil: "domcontentloaded" })
    await expect(page.getByTestId("responsive-canvas")).toBeVisible()
    await page.locator('[data-block-id="blk-3"]').click()
    await expect(page.getByTestId("sel")).toHaveText("3")
    const tb = page.getByTestId("floating-toolbar")
    await expect(tb).toBeVisible()
    await expect(tb).toHaveAttribute("data-placement", "top")
    await testInfo.attach("floating-toolbar", { body: await page.screenshot(), contentType: "image/png" })
    await tb.locator('[data-action="duplicate"]').click()
    await expect(page.getByTestId("act")).toHaveText("1")
    // suppression déselectionne
    await tb.locator('[data-action="delete"]').click()
    await expect(page.getByTestId("sel")).toHaveText("—")
  })

  test("insertion entre blocs (index correct, anti pas de décalage)", async ({ page }, testInfo) => {
    await page.goto(URL, { waitUntil: "domcontentloaded" })
    await expect(page.getByTestId("responsive-canvas")).toBeVisible()
    await page.locator('[data-insert="0"]').click()
    await page.locator('[data-insert="2"]').click()
    await expect(page.getByTestId("ins")).toHaveText("2")
    await expect(page.getByTestId("harness-bar")).toHaveAttribute("data-inserted", "0,2")
    await testInfo.attach("insertion", { body: await page.screenshot(), contentType: "image/png" })
  })

  test("page longue : 100 blocs + retour en haut + position", async ({ page }, testInfo) => {
    await page.goto(URL, { waitUntil: "domcontentloaded" })
    await expect(page.getByTestId("responsive-canvas")).toBeVisible()
    await page.locator('[data-count-btn="100"]').click()
    await expect(page.locator("[data-block-id]")).toHaveCount(100)
    await page.locator('[data-block-id="blk-40"]').click()
    await expect(page.getByTestId("page-position")).toHaveText("Bloc 41 / 100")
    await page.getByTestId("back-to-top").click()
    await testInfo.attach("long-page", { body: await page.screenshot(), contentType: "image/png" })
  })

  test("plein écran / focus mode bascule", async ({ page }) => {
    await page.goto(URL, { waitUntil: "domcontentloaded" })
    await expect(page.getByTestId("responsive-canvas")).toBeVisible()
    await page.getByTestId("fullscreen").click()
    await expect(page.getByTestId("harness-bar")).toHaveAttribute("data-focus", "1")
  })

  test("mobile : aucun overflow horizontal (portrait + paysage)", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "mobile", "mobile uniquement")
    await page.goto(URL, { waitUntil: "domcontentloaded" })
    await expect(page.getByTestId("responsive-canvas")).toBeVisible()
    const overflow = () => page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)
    expect(await overflow(), "overflow portrait").toBeLessThanOrEqual(1)
    await testInfo.attach("mobile-portrait", { body: await page.screenshot(), contentType: "image/png" })
    await page.setViewportSize({ width: 844, height: 390 })
    await expect(page.getByTestId("responsive-canvas")).toBeVisible()
    expect(await overflow(), "overflow paysage").toBeLessThanOrEqual(1)
    await testInfo.attach("mobile-landscape", { body: await page.screenshot(), contentType: "image/png" })
  })
})
