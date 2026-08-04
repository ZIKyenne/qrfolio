import { defineConfig } from "@playwright/test"
import { readFileSync } from "node:fs"
import { resolve } from "node:path"

// Charge .env.e2e (ignoré par Git) SANS dépendance : uniquement pour les parcours authentifiés
// (E2E_TEST_EMAIL / E2E_TEST_PASSWORD). N'écrase pas une variable déjà définie. Aucune valeur loggée.
try {
  const raw = readFileSync(resolve(__dirname, ".env.e2e"), "utf8")
  for (const line of raw.split(/\r?\n/)) {
    const m = line.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/)
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].trim()
  }
} catch { /* .env.e2e absent : seuls les tests publics s'exécutent */ }

// QA navigateur QRowg (B11). Chromium bundled (headless shell). Serveur Next dev auto-démarré
// (réutilisé s'il tourne déjà). Artefacts (rapport/traces/captures) hors Git (voir .gitignore).
const PORT = Number(process.env.E2E_PORT || 3100)

export default defineConfig({
  testDir: "./e2e",
  outputDir: "./test-results",
  fullyParallel: false,
  workers: 1,                       // données partagées (une seule session/serveur) → pas de parallélisme
  retries: process.env.CI ? 1 : 0,
  reporter: [["html", { open: "never" }], ["list"]],
  timeout: 60_000,
  expect: { timeout: 10_000 },
  use: {
    baseURL: `http://localhost:${PORT}`,
    trace: "on-first-retry",
    screenshot: "only-on-failure",
    video: "off",
    browserName: "chromium",
  },
  projects: [
    { name: "desktop", use: { viewport: { width: 1280, height: 900 } } },
    { name: "mobile", use: { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 } },
  ],
  webServer: {
    command: "npx next dev --port " + PORT,
    cwd: "apps/web",
    url: `http://localhost:${PORT}`,
    reuseExistingServer: true,
    timeout: 180_000,
    stdout: "ignore",
    stderr: "pipe",
  },
})
