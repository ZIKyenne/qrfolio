import { describe, it, expect } from "vitest"
import { readFileSync, readdirSync, statSync } from "node:fs"
import { join, dirname } from "node:path"
import { fileURLToPath } from "node:url"
import { avecCibleTactile, CIBLE_TACTILE_MIN } from "./primitives/BlockCtaLink"

// Une page QRowg n'est presque jamais ouverte sur un ordinateur : on la découvre
// en scannant un QR, donc au téléphone. Mesuré au navigateur sur les 87 blocs,
// quinze commandes tombaient sous 36 px de haut — « ↓ Télécharger » 15 px,
// « Voir plus » 16 px, « J'en profite » 25 px, « Billets → » 29 px. Ce sont les
// gestes qui rapportent au commerçant : réserver, commander, prendre un billet.

describe("avecCibleTactile", () => {
  it("impose une hauteur tapable sans toucher au dessin", () => {
    const r = avecCibleTactile({ background: "#9146FF", borderRadius: 8, padding: "7px 13px", fontSize: 12 })
    expect(r.minHeight).toBe(CIBLE_TACTILE_MIN)
    expect(CIBLE_TACTILE_MIN).toBeGreaterThanOrEqual(44)
    // Le style de l'appelant survit intégralement.
    expect(r.background).toBe("#9146FF")
    expect(r.borderRadius).toBe(8)
    expect(r.padding).toBe("7px 13px")
    expect(r.fontSize).toBe(12)
  })

  it("un bouton pleine largeur le reste ; les autres restent dans le flux", () => {
    expect(avecCibleTactile({ display: "block" }).display).toBe("flex")
    expect(avecCibleTactile({ width: "100%" }).display).toBe("flex")
    expect(avecCibleTactile({ display: "inline-block" }).display).toBe("inline-flex")
    expect(avecCibleTactile({}).display).toBe("inline-flex")
  })

  it("l'alignement demandé est respecté, pas écrasé par un centrage d'office", () => {
    expect(avecCibleTactile({ textAlign: "left" }).justifyContent).toBe("flex-start")
    expect(avecCibleTactile({ textAlign: "right" }).justifyContent).toBe("flex-end")
    expect(avecCibleTactile({ textAlign: "center" }).justifyContent).toBe("center")
    expect(avecCibleTactile({}).justifyContent).toBe("center")
    // Un alignement explicite de l'appelant prime sur la déduction.
    expect(avecCibleTactile({ textAlign: "left", justifyContent: "space-between" }).justifyContent).toBe("space-between")
  })

  it("la boîte inclut bordures et marges intérieures", () => {
    // Sans `border-box`, une bordure de 1 px ferait 46 px au lieu de 44.
    expect(avecCibleTactile({}).boxSizing).toBe("border-box")
  })
})

const ici = dirname(fileURLToPath(import.meta.url))

function tousLesFichiers(d: string): string[] {
  const out: string[] = []
  for (const e of readdirSync(d).sort()) {
    const c = join(d, e)
    if (statSync(c).isDirectory()) { out.push(...tousLesFichiers(c)); continue }
    if ((e.endsWith(".tsx") || e.endsWith(".ts")) && !e.includes(".test.")) out.push(c)
  }
  return out
}

describe("aucun appel à l'action ne repasse sous la barre", () => {
  it("les deux primitives partagées appliquent le plancher", () => {
    const cta = readFileSync(join(ici, "primitives/BlockCtaLink.tsx"), "utf-8")
    const surf = readFileSync(join(ici, "primitives/LayoutSurface.tsx"), "utf-8")
    // PublicCtaLink et EditorCtaShell : même géométrie, sinon l'éditeur ment.
    expect((cta.match(/avecCibleTactile\(style\)/g) || []).length).toBeGreaterThanOrEqual(2)
    expect(surf).toContain("avecCibleTactile(style)")
  })

  it("les blocs qui posaient un CTA à la main passent par le plancher", () => {
    // Ceux-là n'utilisent ni PublicCtaLink ni SmartCta : mesurés à 15, 16, 17,
    // 29, 30 et 35 px avant correction.
    for (const f of ["blocks/audio_player/PublicAudioPlayer.tsx", "blocks/timeline/PublicTimeline.tsx",
                     "blocks/concerts/PublicConcerts.tsx", "blocks/pricing/PublicPricing.tsx",
                     "blocks/album_block/PublicAlbumBlock.tsx", "blocks/toggle_content/index.tsx"]) {
      const t = readFileSync(join(ici, f), "utf-8")
      expect(`${f}: ${t.includes("avecCibleTactile(")}`).toBe(`${f}: true`)
    }
  })

  it("le plancher est disponible partout où un bloc en aurait besoin", () => {
    // Garde-fou de refactor : si le module change de nom ou de chemin, les huit
    // blocs qui l'importent cassent à la compilation — mais on le dit ici aussi.
    const importeurs = tousLesFichiers(join(ici, "blocks"))
      .filter(f => readFileSync(f, "utf-8").includes("avecCibleTactile"))
    expect(importeurs.length).toBeGreaterThanOrEqual(6)
  })
})
