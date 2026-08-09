import { test, expect } from "@playwright/test"

// Éditeur du bloc Menu via le harness PUBLIC /e2e-harness/menu-editor (sans Supabase) :
// import tableur + bouton d'aide « prompt IA ».

const URL = "/e2e-harness/menu-editor"

test.describe("éditeur menu — import + prompt IA", () => {
  test.beforeEach(async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "desktop", "harness = projet desktop")
    await page.addInitScript(() => {
      const s = document.createElement("style"); s.textContent = "nextjs-portal{pointer-events:none!important}"
      queueMicrotask(() => { try { document.documentElement.appendChild(s) } catch { /* noop */ } })
    })
  })

  test("le bouton d'aide ouvre le prompt IA prêt à copier", async ({ page }) => {
    await page.goto(URL, { waitUntil: "networkidle" })
    await expect(page.getByTestId("menu-editor-harness")).toBeVisible({ timeout: 30_000 })
    await page.getByText("Importer depuis un tableur").click()
    await page.getByText(/Photographiez votre carte/).click()
    await expect(page.getByText("Remplir le menu avec une photo (IA)")).toBeVisible()
    // le prompt contient le format attendu par le parseur
    await expect(page.locator("pre")).toContainText("Nom;Prix;Description")
    await expect(page.getByText("Copier le prompt")).toBeVisible()
    await expect(page.getByRole("link", { name: /Ouvrir ChatGPT/ })).toHaveAttribute("href", /chatgpt\.com/)
  })
})
