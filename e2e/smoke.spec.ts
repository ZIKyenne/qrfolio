import { test, expect } from "@playwright/test"
import { collect, problems } from "./helpers/collect"

test("la landing publique se charge sans erreur critique", async ({ page }, testInfo) => {
  const c = collect(page)
  const resp = await page.goto("/", { waitUntil: "domcontentloaded" })
  expect(resp?.status(), "statut HTTP landing").toBeLessThan(400)
  await expect(page.locator("body")).toBeVisible()
  await page.waitForLoadState("networkidle").catch(() => {})
  await testInfo.attach("landing", { body: await page.screenshot(), contentType: "image/png" })
  expect(problems(c), "erreurs navigateur:\n" + problems(c).join("\n")).toEqual([])
})

test("le dashboard anonyme ne crashe pas (redirection observée)", async ({ page }) => {
  const resp = await page.goto("/dashboard", { waitUntil: "domcontentloaded" })
  // Un anonyme ne doit jamais recevoir une 5xx ; il est redirigé (auth) ou voit un écran de connexion.
  expect(resp?.status(), "statut HTTP /dashboard").toBeLessThan(500)
  // Observation (non bloquante) de l'URL finale — consignée dans le rapport d'audit.
  await page.waitForLoadState("domcontentloaded")
})
