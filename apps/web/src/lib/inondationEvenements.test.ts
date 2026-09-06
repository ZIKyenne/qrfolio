import { describe, it, expect } from "vitest"
import { readFileSync } from "node:fs"
import { join } from "node:path"

// page_events : 300 lignes par appel × 60 appels/min/IP, sans limite par page.
const route = readFileSync(join(__dirname, "../app/api/track/route.ts"), "utf8")
const client = readFileSync(join(__dirname, "trackEngagement.ts"), "utf8")

describe("les événements de page ne peuvent plus inonder la base", () => {
  it("limite dédiée par page et par adresse, avant l'insertion", () => {
    const bloc = route.slice(route.indexOf('type === "events"'), route.indexOf('from("page_events").insert'))
    expect(bloc).toContain("rateLimit(`track:events:${pageId}:${ipOf(req)}`, 10, 60_000)")
  })
  it("au plus 80 lignes par appel, et le client n'en met jamais plus de 60 taps en file", () => {
    expect(route).toContain("const LIGNES_EVENEMENTS_MAX = 80")
    expect(route).toContain("slice(0, LIGNES_EVENEMENTS_MAX)")
    expect(route).not.toContain("slice(0, 300)")
    expect(client).toContain("tapBuffer.length >= 60")
  })
})
