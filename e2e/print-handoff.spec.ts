import { test, expect } from "@playwright/test"
import { collect, problems } from "./helpers/collect"

// Le pont « page publiée → support imprimable ». Ce qui compte : arriver dans le studio
// avec ses propres textes, sans rien resaisir.
// Le banc d'essai n'a pas de session : /api/print-design (restauration d'un design enregistré)
// répond 401. Ce n'est pas ce qu'on teste ici.
const noise = (c: any) => problems(c).filter((x: string) => !x.includes("/api/print-design"))

const P = (o: Record<string, string>) => "/e2e-harness/print-studio?" + new URLSearchParams(o).toString()

test("un objet précis ouvre le studio déjà rempli", async ({ page }) => {
  const c = collect(page)
  await page.goto(P({ qr: "abc123", metier: "Restaurant", objectif: "Menu", brand: "Café Lune", message: "Notre carte", cta: "Scannez pour voir la carte", item: "i2" }), { waitUntil: "domcontentloaded" })
  // On est entré dans le studio (retour « Bibliothèque »), sur le support demandé, textes déjà posés.
  await expect(page.getByText("Bibliothèque", { exact: false }).first()).toBeVisible({ timeout: 20_000 })
  await expect(page.getByText("Notre carte", { exact: false }).first()).toBeVisible()
  await expect(page.getByText("Scannez pour voir la carte", { exact: false }).first()).toBeVisible()
  // Nom du support et récapitulatif « Contenu » : barre latérale desktop uniquement.
  if ((page.viewportSize()?.width ?? 0) >= 1024) {
    await expect(page.getByText("Chevalet de table", { exact: false }).first()).toBeVisible()
    await expect(page.getByText("Café Lune", { exact: false }).first()).toBeVisible()
  }
  expect(noise(c), "erreurs console/hydratation").toEqual([])
})

test("sans objet, la bibliothèque arrive pré-filtrée et garde les textes", async ({ page }) => {
  const c = collect(page)
  await page.goto(P({ qr: "abc123", metier: "Coiffeur", objectif: "Avis", brand: "Studio Nord", message: "Votre avis compte", cta: "Scannez pour laisser un avis" }), { waitUntil: "domcontentloaded" })
  await expect(page.getByText("Choisissez un support", { exact: false }).first()).toBeVisible({ timeout: 20_000 })
  await expect(page.getByText("Coiffeur").first()).toBeVisible()

  // Ouvrir n'importe quel support conserve les textes hérités de la page.
  await page.getByText("Sticker vitrine", { exact: false }).first().click()
  await expect(page.getByText("Votre avis compte", { exact: false }).first()).toBeVisible({ timeout: 15_000 })
  await expect(page.getByText("Scannez pour laisser un avis", { exact: false }).first()).toBeVisible()
  expect(noise(c), "erreurs console/hydratation").toEqual([])
})

test("sans paramètre, le studio est inchangé", async ({ page }) => {
  const c = collect(page)
  await page.goto("/e2e-harness/print-studio", { waitUntil: "domcontentloaded" })
  await expect(page.getByText("Choisissez un support", { exact: false }).first()).toBeVisible({ timeout: 20_000 })
  await expect(page.getByText("MÉTIER", { exact: false }).first()).toBeVisible()
  expect(noise(c), "erreurs console/hydratation").toEqual([])
})
