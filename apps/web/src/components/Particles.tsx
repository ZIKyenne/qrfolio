"use client"

import { useEffect, useRef } from "react"

/**
 * Fond animé de particules dorées (3 couches de parallaxe, halo diffus, atténuation
 * dans la colonne de contenu). Identique à celui de la landing — à poser comme premier
 * enfant d'un conteneur `position:relative`, le contenu au-dessus en `zIndex:1`.
 */
export default function Particles({ behind = false, mobileVivid = false }: { behind?: boolean; mobileVivid?: boolean }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return
    const canvas = canvasRef.current!
    if (!canvas) return
    const ctx = canvas.getContext("2d", { alpha: true })!

    // ── Couleur d'accent dynamique ──────────────────────────────────────────
    // Les particules suivent la couleur d'accent de l'utilisateur (--accent).
    // On lit la variable CSS et on se met à jour quand elle change (event qrfolio-accent).
    const hexToRgb = (hex: string) => {
      const m = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec((hex || "").trim())
      return m ? { r: parseInt(m[1], 16), g: parseInt(m[2], 16), b: parseInt(m[3], 16) } : { r: 201, g: 168, b: 76 }
    }
    const lighten = (c: { r: number; g: number; b: number }) => ({
      r: Math.round(c.r + (255 - c.r) * 0.42),
      g: Math.round(c.g + (255 - c.g) * 0.42),
      b: Math.round(c.b + (255 - c.b) * 0.42),
    })
    let acc = hexToRgb(getComputedStyle(document.documentElement).getPropertyValue("--accent"))
    let accLight = lighten(acc)
    const onAccent = (e: Event) => {
      const detail = (e as CustomEvent).detail
      const hex = (typeof detail === "string" && detail)
        || getComputedStyle(document.documentElement).getPropertyValue("--accent")
      acc = hexToRgb(hex)
      accLight = lighten(acc)
    }
    window.addEventListener("qrfolio-accent", onAccent)

    let W = canvas.width  = window.innerWidth
    let H = canvas.height = window.innerHeight

    const getContentZone = () => {
      const contentW = Math.min(1140, W - 96)
      const cx = W / 2
      return { x1: cx - contentW / 2, x2: cx + contentW / 2 }
    }

    const isMobile = W < 768
    const COUNT    = isMobile ? 22 : 38
    // Sur mobile le contenu occupe toute la largeur : l'atténuation au centre (pensée
    // pour les larges marges du desktop) rendrait les particules quasi invisibles.
    // `mobileVivid` la désactive sur petit écran → particules bien visibles sur mobile.
    const skipDim  = mobileVivid && isMobile

    const pts = Array.from({ length: COUNT }, (_, idx) => {
      const layer = idx < COUNT * 0.4 ? 0 : idx < COUNT * 0.75 ? 1 : 2
      return {
        x:     Math.random() * W,
        y:     Math.random() * H,
        layer,
        r:     layer === 0 ? Math.random() * 0.8 + 0.3
             : layer === 1 ? Math.random() * 1.2 + 0.6
             :                Math.random() * 1.6 + 0.9,
        dx:    (Math.random() - 0.5) * (layer === 0 ? 0.12 : layer === 1 ? 0.22 : 0.32),
        dy:    (Math.random() - 0.5) * (layer === 0 ? 0.12 : layer === 1 ? 0.22 : 0.32),
        oMax:  layer === 0 ? 0.20 : layer === 1 ? 0.38 : 0.55,
        phase: Math.random() * Math.PI * 2,
        speed: Math.random() * 0.012 + 0.005,
        glowR: layer === 0 ? Math.random() * 6 + 3
             : layer === 1 ? Math.random() * 10 + 5
             :                Math.random() * 14 + 7,
      }
    })

    let raf = 0
    let paused = false
    let t = 0

    const onVisibility = () => { paused = document.hidden }
    document.addEventListener("visibilitychange", onVisibility)

    function draw() {
      t += 0.016
      if (paused) { raf = requestAnimationFrame(draw); return }

      ctx.clearRect(0, 0, W, H)
      const zone = getContentZone()

      for (let layer = 0; layer <= 2; layer++) {
        for (const p of pts) {
          if (p.layer !== layer) continue

          const pulse      = (Math.sin(t * p.speed * 60 + p.phase) + 1) / 2
          const glowRadius = p.glowR * (0.45 + pulse * 0.55)
          let   alpha      = p.oMax * (0.5 + pulse * 0.5)

          // Atténuation CONTINUE (smoothstep) du centre vers les bords :
          // pas de frontière nette -> évite la "barre" verticale de particules
          // là où la zone de contenu se termine.
          const cx2   = (zone.x1 + zone.x2) / 2
          const halfW = (zone.x2 - zone.x1) / 2
          const d     = Math.min(1, Math.abs(p.x - cx2) / halfW) // 0 centre .. 1 bord (clamp au-delà)
          const s     = d * d * (3 - 2 * d)                      // smoothstep
          if (!skipDim) alpha = alpha * (0.14 + 0.86 * s)        // 0.14 au centre -> 1 au bord (sauté si mobileVivid)

          if (alpha < 0.005) {
            p.x += p.dx; p.y += p.dy
            if (p.x < -glowRadius)    p.x = W + glowRadius
            if (p.x > W + glowRadius) p.x = -glowRadius
            if (p.y < -glowRadius)    p.y = H + glowRadius
            if (p.y > H + glowRadius) p.y = -glowRadius
            continue
          }

          const grad = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, glowRadius)
          grad.addColorStop(0,    `rgba(${acc.r},${acc.g},${acc.b},${(alpha * 0.6).toFixed(3)})`)
          grad.addColorStop(0.4,  `rgba(${acc.r},${acc.g},${acc.b},${(alpha * 0.18).toFixed(3)})`)
          grad.addColorStop(0.75, `rgba(${acc.r},${acc.g},${acc.b},${(alpha * 0.04).toFixed(3)})`)
          grad.addColorStop(1,    `rgba(${acc.r},${acc.g},${acc.b},0)`)
          ctx.beginPath()
          ctx.arc(p.x, p.y, glowRadius, 0, Math.PI * 2)
          ctx.fillStyle = grad
          ctx.fill()

          const coreR = p.r * (0.75 + pulse * 0.25)
          ctx.beginPath()
          ctx.arc(p.x, p.y, coreR, 0, Math.PI * 2)
          ctx.fillStyle = `rgba(${accLight.r},${accLight.g},${accLight.b},${(alpha * 0.9).toFixed(3)})`
          ctx.fill()

          p.x += p.dx; p.y += p.dy
          if (p.x < -glowRadius)    p.x = W + glowRadius
          if (p.x > W + glowRadius) p.x = -glowRadius
          if (p.y < -glowRadius)    p.y = H + glowRadius
          if (p.y > H + glowRadius) p.y = -glowRadius
        }
      }
      raf = requestAnimationFrame(draw)
    }
    draw()

    let resizeTimer = 0
    const onResize = () => {
      clearTimeout(resizeTimer)
      resizeTimer = window.setTimeout(() => {
        W = canvas.width  = window.innerWidth
        H = canvas.height = window.innerHeight
      }, 200) as unknown as number
    }
    window.addEventListener("resize", onResize, { passive: true })

    return () => {
      cancelAnimationFrame(raf)
      clearTimeout(resizeTimer)
      window.removeEventListener("resize", onResize)
      window.removeEventListener("qrfolio-accent", onAccent)
      document.removeEventListener("visibilitychange", onVisibility)
    }
  }, [])

  return <canvas ref={canvasRef} style={{
    position: "fixed", inset: 0, pointerEvents: "none",
    zIndex: behind ? -1 : 0, opacity: 1,
    transform: "translateZ(0)",
    willChange: "transform",
  }} />
}
