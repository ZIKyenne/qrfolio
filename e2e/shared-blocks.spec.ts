import { test, expect } from "@playwright/test"
import { collect, problems } from "./helpers/collect"

// Blocs shared les plus risqués (média/embeds/répéteurs riches) → captures ciblées (preuves).
const RISKY = ["timeline", "pricing", "video_local", "audio_player", "spotify_embed", "video", "google_maps_embed", "album_block", "discography", "product_catalog", "image", "before_after"]

test("les 51 blocs shared rendent sans erreur console/hydratation (harness)", async ({ page }, testInfo) => {
  const c = collect(page)
  const resp = await page.goto("/e2e-harness/blocks", { waitUntil: "domcontentloaded" })
  expect(resp?.status(), "statut HTTP harness").toBeLessThan(400)
  await expect(page.locator("[data-harness-end]")).toBeVisible({ timeout: 45_000 })

  const count = await page.locator("[data-block]").count()
  expect(count, "nombre de blocs rendus").toBe(51)
  expect(await page.getByText("NO ADAPTER").count(), "adapters manquants").toBe(0)

  await page.waitForLoadState("networkidle").catch(() => {})

  // Captures ciblées desktop+mobile (selon le projet) — preuves, PAS un gate pixel (fonts/iframes
  // tierces non déterministes ⇒ pas de toHaveScreenshot ici).
  for (const t of RISKY) {
    const el = page.locator(`[data-block="${t}"]`)
    if (await el.count()) {
      await el.scrollIntoViewIfNeeded()
      await testInfo.attach(`block-${t}`, { body: await el.screenshot(), contentType: "image/png" })
    }
  }

  expect(problems(c), "erreurs navigateur (même origine):\n" + problems(c).join("\n")).toEqual([])
})
