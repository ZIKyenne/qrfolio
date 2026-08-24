"use client"
// Harness E2E (B11) — rend les 51 blocs SHARED via l'adapter public réel + fixtures
// déterministes, dans un thème fixe. Réservé aux tests (route gatée non-prod). Chaque bloc est
// encapsulé dans un conteneur `data-block` pour les assertions/captures Playwright.
import { SHARED_RENDERER_BLOCKS } from "../../dashboard/builder/shared-renderer/architecture"
import { resolvePublicBlock } from "../../dashboard/builder/shared-renderer/publicRegistry"
import { BLOCK_DEFS } from "../../dashboard/builder/blockDefs"
import { FILL } from "./fixtures"

const theme: any = { primary: "#C9A84C", muted: "#8A8478", text: "#F5F0E8", surface: "#111009", fontDisplay: "Fraunces, serif", fontBody: "DM Sans, sans-serif", accent: "#39FF8F" }

export function BlocksHarness() {
  const types = [...SHARED_RENDERER_BLOCKS].sort()
  return (
    <div style={{ maxWidth: 480, margin: "0 auto", background: "#080808", minHeight: "100vh", color: theme.text, fontFamily: theme.fontBody }}>
      <p data-harness-ready="true" style={{ padding: "8px 24px", fontSize: 11, color: theme.muted }}>{types.length} blocs shared</p>
      {types.map(type => {
        const Public = resolvePublicBlock(type)
        const content = { ...(BLOCK_DEFS[type]?.defaultContent || {}), ...(FILL[type] || {}) }
        const ctx: any = {
          theme, G: theme.primary, TEXT: theme.text, MUTED: theme.muted,
          FONT_D: theme.fontDisplay, FONT_B: theme.fontBody,
          pageId: "e2e", blockId: `e2e-${type}`, trackClick: () => {},
        }
        return (
          <section key={type} data-block={type} style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}>
            <span style={{ display: "block", padding: "6px 24px 0", fontSize: 10, color: theme.primary, letterSpacing: 1 }}>{type}</span>
            {Public ? <Public content={content} ctx={ctx} /> : <p style={{ padding: 24, color: "#EF4444" }}>NO ADAPTER</p>}
          </section>
        )
      })}
      <p data-harness-end="true" style={{ padding: 24 }}>— fin —</p>
    </div>
  )
}
