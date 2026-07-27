import { defineConfig } from "vitest/config"
import { fileURLToPath } from "node:url"

export default defineConfig({
  resolve: {
    // Résout l'alias `@/…` comme Next (→ apps/web/src). Évite d'avoir à réécrire
    // les imports en relatif dans les modules testés (ex. lib/team → @/lib/slug).
    alias: {
      "@": fileURLToPath(new URL("./apps/web/src", import.meta.url)),
    },
  },
  test: {
    include: ["apps/web/**/*.{test,spec}.ts", "apps/web/**/*.{test,spec}.tsx"],
    environment: "node",
    reporters: "default",
  },
})
