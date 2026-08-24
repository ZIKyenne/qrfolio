import { defineConfig, devices } from "@playwright/test"

// Configuration dédiée au filet de sécurité (e2e/smoke-public.spec.ts).
//
// Pourquoi une configuration à part : la configuration principale démarre un serveur
// de DÉVELOPPEMENT, qui recompile chaque page à la première visite et garde tout en
// mémoire. Parcourir 52 pages d'affilée dans ce mode a fait sauter Node sur une
// machine de bureau (« JavaScript heap out of memory »).
//
// Ici, aucun serveur n'est démarré : on interroge le site DÉJÀ EN LIGNE. C'est plus
// léger — rien à compiler — et surtout plus juste : on vérifie ce que voient
// réellement les visiteurs, pas une version locale qui pourrait différer.
//
//   npx playwright test --config playwright.smoke.config.ts
//
// Pour viser autre chose que la production (un déploiement de test, ou son poste
// avec un serveur déjà lancé à côté) :
//
//   SMOKE_URL=https://qrowg-xxxx.vercel.app npx playwright test --config playwright.smoke.config.ts

const CIBLE = process.env.SMOKE_URL || "https://qrowg.com"

// Marqueur lu par le fichier de test : sans lui, il refuse de s'exécuter (voir le
// garde-fou dans e2e/smoke-public.spec.ts).
process.env.SMOKE_CONFIG = "1"

export default defineConfig({
  testDir: "./e2e",
  testMatch: /smoke-public\.spec\.ts/,
  outputDir: "./test-results",
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: [["list"]],
  timeout: 20 * 60 * 1000,
  expect: { timeout: 15_000 },
  use: {
    baseURL: CIBLE,
    trace: "off",
    video: "off",
    screenshot: "off",
  },
  // Un seul projet : le fichier gère lui-même ses deux tailles d'écran.
  projects: [{ name: "desktop", use: { ...devices["Desktop Chrome"] } }],
  // Aucun serveur local : le site visé tourne déjà.
  webServer: undefined,
})
