import { test, expect, type Page } from "@playwright/test"

// Connexion via l'UI réelle (server action signIn). Identifiants d'un compte de TEST dédié
// (E2E_TEST_EMAIL / E2E_TEST_PASSWORD depuis .env.e2e). Ne logge jamais les valeurs.
export const HAS_ACCOUNT = !!process.env.E2E_TEST_EMAIL && !!process.env.E2E_TEST_PASSWORD

// Marqueur : backend Supabase injoignable (DNS/réseau) — l'app renvoie ?error=fetch%20failed.
export const BACKEND_UNREACHABLE = "E2E_BACKEND_UNREACHABLE"

export async function login(page: Page): Promise<void> {
  const email = process.env.E2E_TEST_EMAIL as string
  const password = process.env.E2E_TEST_PASSWORD as string
  await page.goto("/auth/login", { waitUntil: "domcontentloaded" })
  await page.locator("#email").fill(email)
  await page.locator("#password").fill(password)
  await page.getByRole("button", { name: /se connecter/i }).click()
  // Le server action redirige vers /dashboard (succès) ou /auth/login?error=... (échec).
  await page.waitForURL(/\/dashboard|[?&]error=/, { timeout: 30_000 })
  const url = page.url()
  if (/\/dashboard/.test(url)) { await expect(page).toHaveURL(/\/dashboard/); return }
  if (/error=fetch/i.test(url)) throw new Error(BACKEND_UNREACHABLE)
  throw new Error("Connexion échouée (URL: " + url.replace(/\?.*/, "") + ")")
}

// Connexion tolérante : ignore proprement le test si le backend Supabase est injoignable
// (cas des environnements réseau restreints / sans accès au projet Supabase).
export async function loginOrSkip(page: Page): Promise<void> {
  try {
    await login(page)
  } catch (e: any) {
    if (String(e?.message).includes(BACKEND_UNREACHABLE)) {
      test.skip(true, "Backend Supabase injoignable dans cet environnement (DNS/réseau). Exécuter sur une machine où le projet Supabase est accessible.")
    }
    throw e
  }
}
