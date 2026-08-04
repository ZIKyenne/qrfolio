import { test, expect, type Page } from "@playwright/test"
import { collect, problems } from "./helpers/collect"

// Bibliothèque de blocs refondue (C02) — testée via le harness PUBLIC /e2e-harness/block-library
// (sans Supabase). Couvre : ouverture, recherche, catégories, favoris, récents, premium, état vide,
// ajout, Escape, détail ; mobile : plein écran, safe-area, pas d'overflow, paysage.

const URL = "/e2e-harness/block-library"
// L'onglet par défaut est « Recommandés » ; « Tout » affiche l'ensemble des cartes.
const showAll = (page: Page) => page.locator('[data-tab="all"]').click()

test.describe("bibliothèque de blocs (harness)", () => {
  test("ouverture + rendu sans erreur + premium visible", async ({ page }, testInfo) => {
    const c = collect(page)
    const resp = await page.goto(URL, { waitUntil: "domcontentloaded" })
    expect(resp?.status(), "statut HTTP harness").toBeLessThan(400)

    await expect(page.getByTestId("block-library")).toBeVisible({ timeout: 30_000 })
    await expect(page.getByRole("heading", { name: /ajouter un bloc/i })).toBeVisible()
    await showAll(page)
    expect(await page.locator('[data-premium="1"]').count(), "cartes premium").toBeGreaterThan(0)
    expect(await page.locator('[data-badge="premium"]').count(), "badges premium").toBeGreaterThan(0)

    await testInfo.attach(`library-${testInfo.project.name}`, { body: await page.screenshot(), contentType: "image/png" })
    expect(problems(c), "erreurs navigateur:\n" + problems(c).join("\n")).toEqual([])
  })

  test("recherche : « prix » réduit la liste et trouve Tarifs", async ({ page }, testInfo) => {
    await page.goto(URL, { waitUntil: "domcontentloaded" })
    await expect(page.getByTestId("block-library")).toBeVisible()
    await showAll(page)
    const before = await page.locator("[data-block-card]").count()
    await page.getByRole("searchbox", { name: /rechercher un bloc/i }).fill("prix")
    await expect(page.locator('[data-block-card="pricing"]')).toBeVisible()
    const after = await page.locator("[data-block-card]").count()
    expect(after, "la recherche réduit la liste").toBeLessThan(before)
    await testInfo.attach(`search-${testInfo.project.name}`, { body: await page.screenshot(), contentType: "image/png" })
  })

  test("état sans résultat", async ({ page }) => {
    await page.goto(URL, { waitUntil: "domcontentloaded" })
    await expect(page.getByTestId("block-library")).toBeVisible()
    await page.getByRole("searchbox", { name: /rechercher un bloc/i }).fill("zzzxxqqq")
    await expect(page.getByTestId("library-empty")).toBeVisible()
    await expect(page.getByText(/aucun bloc trouvé/i)).toBeVisible()
  })

  test("changement de catégorie", async ({ page }) => {
    await page.goto(URL, { waitUntil: "domcontentloaded" })
    await expect(page.getByTestId("block-library")).toBeVisible()
    await page.locator('[data-tab="music"]').click()
    await expect(page.locator('[data-tab="music"]')).toHaveAttribute("aria-selected", "true")
    await expect(page.locator('[data-block-card="spotify_embed"]')).toBeVisible()
  })

  test("favori : bascule et incrémente le compteur", async ({ page }) => {
    await page.goto(URL, { waitUntil: "domcontentloaded" })
    await showAll(page)
    await expect(page.getByTestId("fav-count")).toHaveText("0")
    await page.locator('[data-fav="bio"]').first().click()
    await expect(page.getByTestId("fav-count")).toHaveText("1")
    await expect(page.locator('[data-tab="favorites"]')).toBeVisible()
  })

  test("ajout : incrémente les ajouts, alimente les récents", async ({ page }) => {
    await page.goto(URL, { waitUntil: "domcontentloaded" })
    await showAll(page)
    await expect(page.getByTestId("added-count")).toHaveText("0")
    await page.locator('[data-add="bio"]').first().click()
    await expect(page.getByTestId("added-count")).toHaveText("1")
    await expect(page.getByTestId("last-added")).toHaveText("bio")
    await expect(page.getByTestId("recent-count")).toHaveText("1")
    await expect(page.locator('[data-tab="recent"]')).toBeVisible()
  })

  test("Escape ferme la bibliothèque", async ({ page }) => {
    await page.goto(URL, { waitUntil: "domcontentloaded" })
    await expect(page.getByTestId("block-library")).toBeVisible()
    await page.getByRole("searchbox", { name: /rechercher un bloc/i }).focus()
    await page.keyboard.press("Escape")
    await expect(page.getByTestId("harness-bar")).toHaveAttribute("data-closed", "1")
  })

  test("détail d'un bloc puis ajout depuis le détail (desktop)", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "desktop", "détail via bouton ⓘ = desktop")
    await page.goto(URL, { waitUntil: "domcontentloaded" })
    await showAll(page)
    await page.locator('[data-detail="pricing"]').first().click()
    await expect(page.getByTestId("library-detail")).toBeVisible()
    await testInfo.attach("detail-desktop", { body: await page.screenshot(), contentType: "image/png" })
    await page.locator('[data-detail-add="pricing"]').click()
    await expect(page.getByTestId("last-added")).toHaveText("pricing")
    await expect(page.getByTestId("library-detail")).toHaveCount(0)
  })

  test("mobile : plein écran, aucun overflow horizontal (portrait + paysage)", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "mobile", "mobile uniquement")
    await page.goto(URL, { waitUntil: "domcontentloaded" })
    await expect(page.getByTestId("block-library")).toBeVisible()

    const overflow = () => page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)
    expect(await overflow(), "overflow portrait").toBeLessThanOrEqual(1)
    await testInfo.attach("mobile-portrait", { body: await page.screenshot(), contentType: "image/png" })

    await page.setViewportSize({ width: 844, height: 390 })
    await expect(page.getByTestId("block-library")).toBeVisible()
    expect(await overflow(), "overflow paysage").toBeLessThanOrEqual(1)
    await testInfo.attach("mobile-landscape", { body: await page.screenshot(), contentType: "image/png" })

    await showAll(page)
    await page.locator('[data-add="bio"]').first().click()
    await expect(page.getByTestId("added-count")).toHaveText("1")
  })
})
