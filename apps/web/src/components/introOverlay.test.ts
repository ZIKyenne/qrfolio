import { describe, it, expect } from "vitest"
import { readFileSync } from "node:fs"
import { join, dirname } from "node:path"
import { fileURLToPath } from "node:url"

// ─────────────────────────────────────────────────────────────────────────────
// L'ANIMATION D'INTRO NE DOIT PAS TENIR LA PAGE EN OTAGE
//
// Relevé au navigateur (Chromium tactile, 390 px, page d'accueil, première
// visite de la session) : pendant les 3 900 ms de l'intro, `elementFromPoint`
// au centre du logo, du bouton de menu et de « Composer ma page » renvoyait
// `.qw-grain` — le voile de grain, position:fixed, z-index 99999. Le défilement
// était bloqué (`html.style.overflow = "hidden"`) et aucun geste ne terminait
// l'animation. Un visiteur venu d'une publicité ou d'un scan tapait sur le
// bouton principal et il ne se passait rien pendant quatre secondes.
//
// L'animation reste — c'est la marque. Ce qui change : elle se termine au
// premier geste, elle a une sortie visible, et elle ne s'impose pas à qui a
// demandé moins d'animations dans son système.
// ─────────────────────────────────────────────────────────────────────────────

const src = readFileSync(join(dirname(fileURLToPath(import.meta.url)), "IntroOverlay.tsx"), "utf8")

describe("l'intro de la page d'accueil se laisse interrompre", () => {
  it("le premier geste la termine", () => {
    expect(src).toContain('const gestes = ["pointerdown", "keydown", "wheel", "touchstart"] as const')
    expect(src).toContain("window.addEventListener(g, fermer, { once: true, passive: true })")
  })

  it("les écouteurs sont retirés au démontage", () => {
    expect(src).toContain("window.removeEventListener(g, fermer)")
  })

  it("le défilement est toujours rendu, quelle que soit la sortie", () => {
    // Chacune des trois sorties (fin du minuteur, geste, démontage) doit
    // rétablir l'overflow : sinon la page reste bloquée pour de bon.
    expect(src.match(/html\.style\.overflow = prevOverflow/g)?.length ?? 0).toBeGreaterThanOrEqual(2)
    expect(src).toContain('document.documentElement.style.overflow = ""')
  })

  it("une sortie visible, au doigt", () => {
    expect(src).toContain('className="qw-skip"')
    expect(src).toContain("Passer l'animation")
    expect(src).toContain("min-height:44px")
  })

  it("« moins d'animations » est respecté", () => {
    expect(src).toContain('window.matchMedia?.("(prefers-reduced-motion: reduce)").matches')
  })

  it("aucun élément focusable dans un sous-arbre aria-hidden", () => {
    // Le bouton « Passer » vit dans #qw-intro : la racine ne peut donc plus
    // porter aria-hidden. Seul le décor le porte.
    expect(src).toContain('<div id="qw-intro" role="presentation">')
    expect(src).not.toContain('id="qw-intro" role="presentation" aria-hidden')
    expect(src).toContain('<div className="qw-grain" aria-hidden="true" />')
  })

  it("le voile de grain ne capte plus les appuis", () => {
    expect(src).toContain("#qw-intro .qw-grain{position:absolute;inset:0;pointer-events:none;")
  })
})
