"use client"

import { useEffect, useRef, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import Link from "next/link"
import dynamic from "next/dynamic"
import { PLAN_LIST, PLAN_COMPARISON, PLANS as PLANS_DEF, fmtPrice } from "@/lib/plans"
import { useIsMobile } from "@/lib/useIsMobile"
import QrowgLogo from "@/components/QrowgLogo"
import IntroOverlay from "@/components/IntroOverlay"
import { serializeJsonLd } from "@/lib/jsonLd"
import { landingJsonLd } from "@/lib/landingJsonLd"

// ── Helpers ──────────────────────────────────────────────────────────────────
function useInView(threshold = 0.15) {
  const ref = useRef<HTMLDivElement>(null)
  const [visible, setVisible] = useState(false)
  useEffect(() => {
    const obs = new IntersectionObserver(([e]) => { if (e.isIntersecting) setVisible(true) }, { threshold })
    if (ref.current) obs.observe(ref.current)
    return () => obs.disconnect()
  }, [threshold])
  return { ref, visible }
}

// ── Particle background ───────────────────────────────────────────────────────
function Particles() {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return
    const canvas = canvasRef.current!
    if (!canvas) return
    const ctx = canvas.getContext("2d", { alpha: true })!

    // ── Zones de contenu (colonnes centrales) ───────────────────────────────
    // Le contenu est centré dans max-width:1140px avec padding:0 48px
    // On recalcule dynamiquement les zones où les particules doivent s'atténuer
    let W = canvas.width  = window.innerWidth
    let H = canvas.height = window.innerHeight

    const getContentZone = () => {
      const contentW = Math.min(1140, W - 96)
      const cx = W / 2
      return {
        x1: cx - contentW / 2,
        x2: cx + contentW / 2,
      }
    }

    const isMobile = W < 768
    const COUNT    = isMobile ? 22 : 38

    // ── 3 couches de profondeur ───────────────────────────────────────────────
    // Layer = 0 (lointain), 1 (intermédiaire), 2 (proche)
    const pts = Array.from({ length: COUNT }, (_, idx) => {
      const layer = idx < COUNT * 0.4 ? 0 : idx < COUNT * 0.75 ? 1 : 2
      return {
        x:     Math.random() * W,
        y:     Math.random() * H,
        layer,
        // Rayon selon profondeur : lointain petit, proche plus grand
        r:     layer === 0 ? Math.random() * 0.8 + 0.3
             : layer === 1 ? Math.random() * 1.2 + 0.6
             :                Math.random() * 1.6 + 0.9,
        // Vitesse selon profondeur (parallaxe)
        dx:    (Math.random() - 0.5) * (layer === 0 ? 0.12 : layer === 1 ? 0.22 : 0.32),
        dy:    (Math.random() - 0.5) * (layer === 0 ? 0.12 : layer === 1 ? 0.22 : 0.32),
        // Opacité max selon profondeur : lointain très discret
        oMax:  layer === 0 ? 0.20 : layer === 1 ? 0.38 : 0.55,
        phase: Math.random() * Math.PI * 2,
        speed: Math.random() * 0.012 + 0.005,
        // Rayon glow selon profondeur
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

      // Dessiner les couches de l'arrière vers l'avant
      for (let layer = 0; layer <= 2; layer++) {
        for (const p of pts) {
          if (p.layer !== layer) continue

          const pulse      = (Math.sin(t * p.speed * 60 + p.phase) + 1) / 2 // 0..1
          const glowRadius = p.glowR * (0.45 + pulse * 0.55)
          let   alpha      = p.oMax * (0.5 + pulse * 0.5)

          // ── Protection de lisibilité : atténuer dans la zone contenu ──────
          // La zone contenu est entre zone.x1 et zone.x2
          // Plus la particule est proche du centre, plus elle s'atténue
          const inContentH = p.x > zone.x1 && p.x < zone.x2
          if (inContentH) {
            // Atténuation progressive : pleine au bord, max -80% au centre
            const relX   = (p.x - zone.x1) / (zone.x2 - zone.x1) // 0..1
            const dist   = Math.abs(relX - 0.5) * 2               // 0..1 (0=centre, 1=bord)
            const fade   = 0.12 + dist * 0.28                     // 0.12 bord centre, 0.40 bords
            alpha        = alpha * fade
          }

          if (alpha < 0.005) {
            p.x += p.dx; p.y += p.dy
            if (p.x < -glowRadius)    p.x = W + glowRadius
            if (p.x > W + glowRadius) p.x = -glowRadius
            if (p.y < -glowRadius)    p.y = H + glowRadius
            if (p.y > H + glowRadius) p.y = -glowRadius
            continue
          }

          // ── Halo diffus (très subtil dans la zone contenu) ─────────────────
          const grad = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, glowRadius)
          grad.addColorStop(0,    `rgba(201,168,76,${(alpha * 0.6).toFixed(3)})`)
          grad.addColorStop(0.4,  `rgba(201,168,76,${(alpha * 0.18).toFixed(3)})`)
          grad.addColorStop(0.75, `rgba(201,168,76,${(alpha * 0.04).toFixed(3)})`)
          grad.addColorStop(1,    "rgba(201,168,76,0)")
          ctx.beginPath()
          ctx.arc(p.x, p.y, glowRadius, 0, Math.PI * 2)
          ctx.fillStyle = grad
          ctx.fill()

          // ── Point central ──────────────────────────────────────────────────
          const coreR = p.r * (0.75 + pulse * 0.25)
          ctx.beginPath()
          ctx.arc(p.x, p.y, coreR, 0, Math.PI * 2)
          ctx.fillStyle = `rgba(245,210,110,${(alpha * 0.9).toFixed(3)})`
          ctx.fill()

          // Mouvement
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
      document.removeEventListener("visibilitychange", onVisibility)
    }
  }, [])

  return <canvas ref={canvasRef} style={{
    position: "fixed", inset: 0, pointerEvents: "none",
    zIndex: 0, opacity: 1,
    transform: "translateZ(0)",
    willChange: "transform",
  }} />
}

// ── Animated QR mockup ────────────────────────────────────────────────────────
function QRMockup() {
  const [pulse, setPulse] = useState(false)
  const [hovered, setHovered] = useState(false)
  const qrRef = useRef<HTMLDivElement>(null)
  const [inView, setInView] = useState(false)
  useEffect(() => {
    const obs = new IntersectionObserver(([e]) => setInView(e.isIntersecting), { threshold: 0.1 })
    if (qrRef.current) obs.observe(qrRef.current)
    return () => obs.disconnect()
  }, [])
  useEffect(() => {
    if (!inView) return
    const t = setInterval(() => setPulse(p => !p), 2400)
    return () => clearInterval(t)
  }, [])
  const corners = [0,1,2,7,8,9,14,15,16,6,13,20,3,4,5,10,11,12,17,18,19,
    28,29,30,35,36,37,42,43,44,49,32,33,34,39,40,41,46,47,48]
  const goldCells = [24, 25, 26, 31, 32, 33, 38]
  return (
    <div ref={qrRef}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{ position: "relative", width: "min(380px, 88vw)", aspectRatio: "1 / 1", margin: "0 auto",
        cursor: "default" }}
    >
      {/* Ecosysteme — cartes de metiers flottantes derriere le QR (donne l'impression
          d'une plateforme, pas d'un simple generateur). Purement decoratif. */}
      {[
        { label: "Restaurant", emoji: "🍽", pos: { top: "-6%",  left: "-33%"  }, rot: -9, dur: 6.5, delay: 0   },
        { label: "Portfolio",  emoji: "🎨", pos: { top: "8%",   right: "-35%" }, rot: 8,  dur: 7.5, delay: 0.9 },
        { label: "Immobilier", emoji: "🏠", pos: { bottom: "14%", left: "-38%" }, rot: -6, dur: 8,   delay: 1.6 },
        { label: "Bar",        emoji: "🍸", pos: { bottom: "-2%",  right: "-30%" }, rot: 10, dur: 6.8, delay: 0.5 },
      ].map((c) => (
        <div key={c.label} className="eco-card" aria-hidden="true" style={{
          position: "absolute", ...c.pos, zIndex: 0, pointerEvents: "none",
          transform: `rotate(${c.rot}deg)`, filter: "blur(0.4px)",
          animation: inView ? "revealUp 0.8s ease 0.4s both" : "none",
        }}>
          <div style={{ animation: `floatCard ${c.dur}s ease-in-out ${c.delay}s infinite`, willChange: "transform" }}>
            <div style={{
              display: "flex", alignItems: "center", gap: 9,
              padding: "10px 14px", borderRadius: 14,
              background: "linear-gradient(145deg, rgba(28,25,19,0.92), rgba(16,15,11,0.92))",
              border: "1px solid rgba(201,168,76,0.22)",
              boxShadow: "0 18px 40px rgba(0,0,0,0.5), inset 0 1px 0 rgba(201,168,76,0.1)",
              backdropFilter: "blur(4px)", WebkitBackdropFilter: "blur(4px)",
            }}>
              <span style={{
                width: 28, height: 28, borderRadius: 9, flexShrink: 0,
                display: "flex", alignItems: "center", justifyContent: "center", fontSize: 15,
                background: "rgba(201,168,76,0.12)", border: "1px solid rgba(201,168,76,0.2)",
              }}>{c.emoji}</span>
              <span style={{ color: "#E8E2D4", fontSize: 12.5, fontWeight: 600, whiteSpace: "nowrap" }}>{c.label}</span>
            </div>
          </div>
        </div>
      ))}
      {/* Ambient glow outer */}
      <div style={{
        position: "absolute", inset: -40, borderRadius: "50%",
        background: "radial-gradient(circle, rgba(201,168,76,0.18) 0%, transparent 65%)",
        transform: pulse ? "scale(1.15)" : "scale(1)",
        transition: "transform 2.4s ease-in-out",
        pointerEvents: "none"
      }} />
      {/* Reflet / halo au sol — ancre l'objet exposé */}
      <div aria-hidden="true" style={{
        position: "absolute", left: "50%", bottom: "-13%", transform: "translateX(-50%)",
        width: "74%", height: "14%", borderRadius: "50%",
        background: "radial-gradient(ellipse, rgba(201,168,76,0.22), transparent 70%)",
        filter: "blur(13px)", pointerEvents: "none"
      }} />
      {/* Glow ring inner */}
      <div style={{
        position: "absolute", inset: -12, borderRadius: 28,
        background: hovered
          ? "radial-gradient(circle at 50% 50%, rgba(201,168,76,0.18) 0%, transparent 70%)"
          : "radial-gradient(circle at 50% 50%, rgba(201,168,76,0.08) 0%, transparent 70%)",
        transition: "background 0.4s ease",
        pointerEvents: "none"
      }} />
      {/* Card */}
      <div style={{
        width: "100%", height: "100%",
        background: "linear-gradient(145deg, #151210, #111009)",
        border: `1px solid ${hovered ? "rgba(201,168,76,0.6)" : pulse ? "rgba(201,168,76,0.45)" : "rgba(201,168,76,0.3)"}`,
        borderRadius: 22,
        display: "flex", flexDirection: "column", alignItems: "center",
        justifyContent: "center", gap: 18,
        position: "relative", overflow: "hidden",
        boxShadow: hovered
          ? "0 30px 80px rgba(0,0,0,0.55), 0 0 80px rgba(201,168,76,0.35), 0 0 160px rgba(201,168,76,0.1), inset 0 1px 0 rgba(201,168,76,0.15)"
          : pulse
          ? "0 26px 60px rgba(0,0,0,0.5), 0 0 50px rgba(201,168,76,0.2), 0 0 100px rgba(201,168,76,0.06)"
          : "0 24px 56px rgba(0,0,0,0.5), 0 0 30px rgba(201,168,76,0.1)",
        transform: hovered
          ? "perspective(1300px) rotateX(0deg) rotateY(0deg) translateY(-6px) scale(1.03)"
          : "perspective(1300px) rotateX(4deg) rotateY(-7deg) scale(1)",
        transition: "all 0.5s var(--mo-ease-spring)"
      }}>
        {/* Shimmer */}
        <div style={{
          position: "absolute", inset: 0,
          background: "linear-gradient(135deg, transparent 30%, rgba(201,168,76,0.04) 50%, transparent 70%)",
          animation: "heroShimmer 3s infinite"
        }} />
        {/* Corner accent top-left */}
        <div style={{
          position: "absolute", top: 0, left: 0, width: 40, height: 40,
          borderTop: "2px solid rgba(201,168,76,0.4)", borderLeft: "2px solid rgba(201,168,76,0.4)",
          borderRadius: "22px 0 0 0", pointerEvents: "none"
        }} />
        {/* Corner accent bottom-right */}
        <div style={{
          position: "absolute", bottom: 0, right: 0, width: 40, height: 40,
          borderBottom: "2px solid rgba(201,168,76,0.4)", borderRight: "2px solid rgba(201,168,76,0.4)",
          borderRadius: "0 0 22px 0", pointerEvents: "none"
        }} />
        {/* Faisceau de scan — signature visuelle QRowg */}
        <div aria-hidden="true" style={{
          position: "absolute", left: "10%", right: "10%", top: "12%", height: 2, borderRadius: 2,
          background: "linear-gradient(90deg, transparent, rgba(201,168,76,0.95), transparent)",
          boxShadow: "0 0 18px 3px rgba(201,168,76,0.55)",
          animation: "scanLine 3.4s ease-in-out infinite", pointerEvents: "none", zIndex: 3,
        }} />
        {/* Balayage lumineux — une lumiere traverse doucement le QR (boucle infinie discrete) */}
        <div aria-hidden="true" style={{
          position: "absolute", top: "18%", bottom: "18%", left: "18%", right: "18%",
          overflow: "hidden", borderRadius: 8, zIndex: 2, pointerEvents: "none",
        }}>
          <div style={{
            position: "absolute", top: 0, bottom: 0, width: "45%",
            background: "linear-gradient(90deg, transparent, rgba(201,168,76,0.32), transparent)",
            animation: "sweepLight 5.2s ease-in-out 1.6s infinite", willChange: "transform, opacity",
          }} />
        </div>
        {/* QR grid (échelle relative -> grandit avec la carte). Construction progressive
            module par module a l'apparition (stagger sequentiel = effet "assemblage"). */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(7,1fr)", gap: "4.5%", width: "60%", aspectRatio: "1 / 1", position: "relative", zIndex: 1 }}>
          {Array.from({ length: 49 }, (_, i) => {
            const o = goldCells.includes(i) ? 1 : corners.includes(i) ? 0.92 : 0.5
            return (
              <div key={i} style={{
                aspectRatio: "1 / 1", borderRadius: "22%",
                background: goldCells.includes(i)
                  ? "#C9A84C"
                  : corners.includes(i)
                  ? "#F5F0E8"
                  : "rgba(245,240,232,0.15)",
                opacity: o,
                ["--o" as string]: o,
                boxShadow: goldCells.includes(i) ? "0 0 6px rgba(201,168,76,0.6)" : "none",
                animation: inView ? `qrReveal 0.5s var(--mo-ease-spring) ${i * 12}ms both` : "none",
                willChange: "transform, opacity",
              } as React.CSSProperties} />
            )
          })}
        </div>
        <p style={{ color: "#C9A84C", fontSize: 11, letterSpacing: 4, textTransform: "uppercase", position: "relative", zIndex: 1, fontWeight: 600 }}>QROWG.COM</p>
      </div>
    </div>
  )
}

// ── Section wrapper avec fade-in ──────────────────────────────────────────────
// ── Features section ──────────────────────────────────────────────────────────
import { creerUrl } from "./creer/entry"

const FEATURES = [
  {
    icon: "⚡",
    tag: "Éditeur simple",
    title: "Créez votre page sans rien coder",
    desc: "Un éditeur en glisser-déposer, des blocs prêts à l'emploi : votre page est en ligne en 5 minutes.",
    accent: "#C9A84C",
    detail: {
      role: "Un éditeur visuel où vous assemblez votre page en glissant des blocs (titre, photo, liens, boutons) — aucune ligne de code.",
      example: "Un coach ajoute sa photo, ses tarifs et un bouton « Réserver » en quelques clics, depuis son téléphone.",
      benefit: "Vous êtes autonome : plus besoin d'un développeur ni d'attendre des semaines pour publier.",
    },
  },
  {
    icon: "🔄",
    tag: "QR dynamique",
    title: "Un QR code que vous modifiez à volonté",
    desc: "Changez la destination, le contenu et les liens quand vous voulez — sans jamais réimprimer votre QR code.",
    accent: "var(--action)",
    detail: {
      role: "Le QR code pointe vers votre page QRowg. Vous modifiez la page, le QR code imprimé reste valable.",
      example: "Un restaurant imprime le QR sur ses tables une seule fois, puis change son menu chaque semaine.",
      benefit: "Vous économisez les réimpressions et vous corrigez une erreur en 30 secondes.",
    },
  },
  {
    icon: "📊",
    tag: "Statistiques",
    title: "Sachez exactement qui scanne",
    desc: "Vues, scans, appareils et sources de trafic, en temps réel. Vous pilotez vos résultats.",
    accent: "var(--success)",
    detail: {
      role: "Un tableau de bord qui mesure les scans, les vues, les appareils utilisés et d'où viennent vos visiteurs.",
      example: "Un commerce voit que 70 % des scans viennent de sa vitrine le week-end, et adapte ses promos.",
      benefit: "Vous prenez des décisions sur des chiffres réels, pas au feeling.",
    },
  },
  {
    icon: "🎯",
    tag: "Conversion",
    title: "Transformez vos visiteurs en clients",
    desc: "Boutons WhatsApp, réservation, paiement, formulaire de contact… toutes vos actions au même endroit.",
    accent: "#F97316",
    detail: {
      role: "Des boutons d'action prêts à l'emploi : appel, WhatsApp, réservation, paiement, formulaire de contact.",
      example: "Un artisan place un bouton « Demander un devis » qui ouvre directement WhatsApp.",
      benefit: "Chaque visite a une chance de devenir un contact ou une vente.",
    },
  },
  {
    icon: "🎨",
    tag: "Modèles",
    title: "Démarrez avec un modèle fait pour votre métier",
    desc: "Restaurant, indépendant, coach, artiste, immobilier, commerce : un modèle adapté à votre activité.",
    accent: "#A78BFA",
    detail: {
      role: "Des modèles déjà conçus par métier, qu'il suffit de personnaliser avec vos informations.",
      example: "Une agence immobilière part du modèle « fiche de bien » et publie une annonce en 5 minutes.",
      benefit: "Vous ne partez jamais d'une page blanche et le résultat est pro dès le départ.",
    },
  },
  {
    icon: "🏢",
    tag: "Marque professionnelle",
    title: "Affichez votre propre marque",
    desc: "Votre domaine personnalisé, sans mention QRowg, avec un design premium. Une image irréprochable.",
    accent: "#C9A84C",
    detail: {
      role: "Votre page sur votre propre nom de domaine, sans aucune mention QRowg.",
      example: "Un cabinet utilise carte.soncabinet.fr : ses clients ne voient que sa marque.",
      benefit: "Une image 100 % professionnelle qui inspire confiance et crédibilité.",
    },
  },
] as const

function FeaturesSection() {
  const { ref, visible } = useInView(0.06)
  const [hovered, setHovered] = useState<number | null>(null)
  const [info, setInfo] = useState<number | null>(null)
  const fInfo = info !== null ? FEATURES[info] : null
  return (
    <section
      id="features"
      ref={ref}
      aria-labelledby="features-title"
      style={{ padding: "100px 48px", position: "relative", zIndex: 1 }}
    >
      {/* Header */}
      <div style={{
        maxWidth: 1140, margin: "0 auto 64px", textAlign: "center",
        opacity: visible ? 1 : 0,
        transform: visible ? "translateY(0)" : "translateY(24px)",
        transition: "opacity 0.6s ease, transform 0.6s ease",
      }}>
        <Eyebrow>Fonctionnalités</Eyebrow>
        <h2 id="features-title" style={{
          fontFamily: "Fraunces, serif",
          fontSize: "clamp(28px, 4vw, 52px)",
          color: "#F5F0E8", fontWeight: 700, margin: "0 auto",
          lineHeight: 1.1, maxWidth: 560, letterSpacing: "-0.02em",
        }}>
          Tout ce qu'il faut pour{" "}
          <span style={{ color: "#C9A84C" }}>convertir</span>
        </h2>
      </div>

      {/* Grid */}
      <div
        className="feat-grid"
        style={{
          maxWidth: 1140, margin: "0 auto",
          display: "grid",
          gridTemplateColumns: "repeat(3, 1fr)",
          gap: 20,
        }}
      >
        {FEATURES.map((f, i) => {
          const isHovered = hovered === i
          const big = i === 0   // carte vedette pleine largeur
          const wide = i === 5  // carte large secondaire
          return (
            <div
              key={f.tag}
              className={big ? "feat-big" : wide ? "feat-wide" : undefined}
              onMouseEnter={() => setHovered(i)}
              onMouseLeave={() => setHovered(null)}
              style={{
                gridColumn: big ? "1 / -1" : wide ? "span 2" : "auto",
                background: big
                  ? `linear-gradient(135deg, ${f.accent}16, rgba(255,255,255,0.02))`
                  : isHovered ? "rgba(255,255,255,0.04)" : "rgba(255,255,255,0.018)",
                border: `1px solid ${isHovered ? f.accent + "45" : big ? f.accent + "33" : "rgba(201,168,76,0.1)"}`,
                borderRadius: big ? 22 : 18,
                padding: big ? "38px 36px" : "28px 26px",
                display: "flex",
                flexDirection: big ? "row" : "column",
                alignItems: big ? "center" : "stretch",
                gap: big ? 30 : 14,
                position: "relative", overflow: "hidden",
                cursor: "default",
                transform: visible
                  ? isHovered ? "translateY(-4px)" : "translateY(0)"
                  : "translateY(28px)",
                opacity: visible ? 1 : 0,
                transition: `opacity 0.5s ease ${i * 80}ms, transform 0.35s var(--mo-ease-spring) ${visible ? "0ms" : i * 80 + "ms"}, border-color 0.25s ease, background 0.25s ease`,
                boxShadow: big
                  ? `0 14px 50px rgba(0,0,0,0.38), 0 0 70px ${f.accent}12`
                  : isHovered ? `0 8px 32px rgba(0,0,0,0.3), 0 0 0 1px ${f.accent}18` : "none",
              }}
            >
              {/* Top accent */}
              <div style={{
                position: "absolute", top: 0, left: 0, right: 0, height: 1,
                background: isHovered
                  ? `linear-gradient(90deg, transparent, ${f.accent}55, transparent)`
                  : "linear-gradient(90deg, transparent, rgba(201,168,76,0.15), transparent)",
                transition: "background 0.3s ease",
              }} />

              {/* Bouton info -> fenêtre explicative */}
              {/* La pastille fait 22 px — joli, mais intapable au doigt. Le bouton
                  qui la porte fait 40 px et reste transparent : même dessin,
                  cible tactile conforme. */}
              <button type="button" onClick={() => setInfo(i)} aria-label={"En savoir plus : " + f.title}
                style={{ position: "absolute", top: 7, right: 7, width: 40, height: 40, borderRadius: "50%", background: "none", border: "none", padding: 0, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 2 }}>
                <span aria-hidden style={{ width: 22, height: 22, borderRadius: "50%", background: isHovered ? `${f.accent}22` : "rgba(255,255,255,0.05)", border: `1px solid ${isHovered ? f.accent + "55" : "rgba(255,255,255,0.12)"}`, color: isHovered ? f.accent : "rgba(188,182,166,0.8)", fontSize: 11, fontWeight: 800, display: "flex", alignItems: "center", justifyContent: "center", transition: "all 0.2s" }}>?</span>
              </button>

              {big ? (
                <>
                  {/* Icône vedette */}
                  <div style={{
                    width: 64, height: 64, borderRadius: 18,
                    background: `${f.accent}1c`, border: `1px solid ${f.accent}45`,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: 32, flexShrink: 0,
                    boxShadow: `0 0 30px ${f.accent}25`,
                  }}>{f.icon}</div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 9, flex: 1, minWidth: 0 }}>
                    <span style={{ color: f.accent, fontSize: 10.5, fontWeight: 700, letterSpacing: 2.5, textTransform: "uppercase", opacity: 0.85 }}>{f.tag}</span>
                    <h3 style={{ color: "#F8F4EC", fontSize: "clamp(20px,2.4vw,27px)", fontWeight: 700, margin: 0, lineHeight: 1.2, fontFamily: "Fraunces, serif", letterSpacing: "-0.01em" }}>{f.title}</h3>
                    <p style={{ color: "rgba(200,194,182,0.82)", fontSize: 14.5, margin: 0, lineHeight: 1.6, maxWidth: 640 }}>{f.desc}</p>
                  </div>
                </>
              ) : (
                <>
                  {/* Icon + tag row */}
                  <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    <div style={{
                      width: 44, height: 44, borderRadius: 13,
                      background: `linear-gradient(135deg, ${f.accent}30, ${f.accent}0d)`,
                      border: `1px solid ${f.accent}${isHovered ? "55" : "30"}`,
                      display: "flex", alignItems: "center", justifyContent: "center",
                      fontSize: 21, flexShrink: 0,
                      boxShadow: isHovered ? `0 0 22px ${f.accent}38` : `0 0 12px ${f.accent}14`,
                      transform: isHovered ? "scale(1.08) rotate(-3deg)" : "scale(1)",
                      transition: "all 0.28s var(--mo-ease-spring)",
                    }}>{f.icon}</div>
                    <span style={{
                      color: f.accent,
                      fontSize: 10, fontWeight: 700,
                      letterSpacing: 2, textTransform: "uppercase",
                      opacity: 0.8,
                    }}>{f.tag}</span>
                  </div>

                  {/* Title */}
                  <h3 style={{
                    color: "#F5F0E8", fontSize: 16, fontWeight: 700,
                    margin: 0, lineHeight: 1.3,
                  }}>{f.title}</h3>

                  {/* Desc */}
                  <p style={{
                    color: "rgba(188,182,166,0.85)", fontSize: 13,
                    margin: 0, lineHeight: 1.65,
                  }}>{f.desc}</p>
                </>
              )}
            </div>
          )
        })}
      </div>

      <style>{`
        @media (max-width: 900px) { .feat-grid { grid-template-columns: repeat(2,1fr) !important; } }
        @media (max-width: 580px) {
          .feat-grid { grid-template-columns: 1fr !important; }
          /* En mono-colonne, on annule les spans inline (sinon span 2 crée une 2e colonne implicite -> grille cassée) */
          .feat-grid > * { grid-column: auto !important; }
          .feat-big { flex-direction: column !important; align-items: flex-start !important; gap: 16px !important; padding: 26px 22px !important; }
        }
        @media (max-width: 640px) { #features { padding: 72px 24px !important; } }
      `}</style>

      {/* Fenetre explicative d'une fonctionnalite (Pb 6) */}
      {fInfo && (
        <div onClick={() => setInfo(null)} style={{ position: "fixed", inset: 0, zIndex: 3000, background: "rgba(0,0,0,0.78)", backdropFilter: "blur(4px)", display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
          <div onClick={e => e.stopPropagation()} style={{ width: "100%", maxWidth: 460, background: "linear-gradient(180deg,#16140E,#0C0B08)", border: `1px solid ${fInfo.accent}40`, borderRadius: 20, padding: "30px 28px", position: "relative", boxShadow: `0 30px 90px rgba(0,0,0,0.7), 0 0 50px ${fInfo.accent}12`, fontFamily: "DM Sans, sans-serif" }}>
            <button type="button" onClick={() => setInfo(null)} aria-label="Fermer" style={{ position: "absolute", top: 16, right: 16, width: 30, height: 30, borderRadius: 9, background: "rgba(255,255,255,0.06)", border: "none", color: "#BCB6A6", fontSize: 16, cursor: "pointer" }}>✕</button>
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 18 }}>
              <div style={{ width: 46, height: 46, borderRadius: 13, background: `${fInfo.accent}18`, border: `1px solid ${fInfo.accent}40`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22 }}>{fInfo.icon}</div>
              <div>
                <p style={{ color: fInfo.accent, fontSize: 9.5, fontWeight: 700, letterSpacing: 2, textTransform: "uppercase", margin: 0 }}>{fInfo.tag}</p>
                <p style={{ color: "#F5F0E8", fontSize: 17, fontWeight: 800, margin: "2px 0 0", fontFamily: "Fraunces, serif" }}>{fInfo.title}</p>
              </div>
            </div>
            {([["À quoi ça sert", fInfo.detail.role], ["Exemple concret", fInfo.detail.example], ["Ce que ça vous apporte", fInfo.detail.benefit]] as const).map(([h, txt]) => (
              <div key={h} style={{ marginBottom: 14 }}>
                <p style={{ color: "rgba(188,182,166,0.7)", fontSize: 9.5, fontWeight: 700, letterSpacing: 1, textTransform: "uppercase", margin: "0 0 4px" }}>{h}</p>
                <p style={{ color: "#EDEBE4", fontSize: 15, lineHeight: 1.65, margin: 0 }}>{txt}</p>
              </div>
            ))}
            <Link href="/creer" style={{ display: "block", textAlign: "center", marginTop: 20, padding: "12px", borderRadius: 11, background: `linear-gradient(90deg, ${fInfo.accent}, ${fInfo.accent}cc)`, color: "#080808", textDecoration: "none", fontSize: 13.5, fontWeight: 800 }}>
              Essayer gratuitement
            </Link>
          </div>
        </div>
      )}
    </section>
  )
}


// ── Marque professionnelle (Pb 5) ──────────────────────────────────────────────
function BrandProSection() {
  const { ref, visible } = useInView(0.08)
  const [open, setOpen] = useState(false)
  const G = "#C9A84C"
  const MiniPage = ({ pro }: { pro: boolean }) => (
    <div style={{ flex: 1, minWidth: 0, background: "#0E0D0B", border: `1px solid ${pro ? G : "rgba(255,255,255,0.08)"}`, borderRadius: 16, overflow: "hidden", boxShadow: pro ? `0 12px 40px rgba(201,168,76,0.18)` : "none", position: "relative" }}>
      {pro && <div style={{ position: "absolute", top: 12, right: 12, zIndex: 2, background: G, color: "#080808", fontSize: 9, fontWeight: 800, padding: "3px 9px", borderRadius: 20, letterSpacing: 0.5 }}>PRO</div>}
      {/* barre d'URL */}
      <div style={{ display: "flex", alignItems: "center", gap: 6, padding: "9px 12px", background: "rgba(255,255,255,0.04)", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
        <span style={{ width: 7, height: 7, borderRadius: "50%", background: pro ? "var(--success)" : "rgba(188,182,166,0.5)" }} />
        <span style={{ color: pro ? "#F5F0E8" : "rgba(188,182,166,0.7)", fontSize: 10.5, fontFamily: "monospace", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{pro ? "carte.votremarque.fr" : "qrowg.com/p/votre-page"}</span>
      </div>
      {/* contenu mock */}
      <div style={{ padding: "22px 18px", display: "flex", flexDirection: "column", alignItems: "center", gap: 9 }}>
        <div style={{ width: 46, height: 46, borderRadius: "50%", background: pro ? `${G}22` : "rgba(255,255,255,0.06)", border: `1px solid ${pro ? G + "55" : "rgba(255,255,255,0.1)"}` }} />
        <div style={{ height: 7, width: "55%", borderRadius: 4, background: "rgba(245,240,232,0.85)" }} />
        <div style={{ height: 5, width: "38%", borderRadius: 3, background: "rgba(188,182,166,0.5)" }} />
        <div style={{ height: 30, width: "70%", borderRadius: 8, background: pro ? `linear-gradient(90deg,${G},#b8953f)` : "rgba(255,255,255,0.08)", marginTop: 4 }} />
      </div>
      {/* pied de page : mention QRowg sur le gratuit, rien sur le Pro */}
      <div style={{ padding: "9px 12px", borderTop: "1px solid rgba(255,255,255,0.06)", textAlign: "center", minHeight: 30 }}>
        {pro
          ? <span style={{ color: G, fontSize: 9.5, fontWeight: 700, letterSpacing: 0.5 }}>✓ 100 % votre marque</span>
          : <span style={{ color: "rgba(188,182,166,0.65)", fontSize: 9.5 }}>✦ Propulsé par QRowg</span>}
      </div>
    </div>
  )
  return (
    <section ref={ref} aria-labelledby="brandpro-title" style={{ padding: "90px 48px", position: "relative", zIndex: 1 }}>
      <div className="brandpro-wrap" style={{ maxWidth: 1000, margin: "0 auto", display: "grid", gridTemplateColumns: "1fr 1fr", gap: 48, alignItems: "center", opacity: visible ? 1 : 0, transform: visible ? "translateY(0)" : "translateY(24px)", transition: "opacity 0.6s ease, transform 0.6s ease" }}>
        {/* Texte */}
        <div>
          <p style={{ color: G, fontSize: 11, letterSpacing: 3, textTransform: "uppercase", fontWeight: 600, marginBottom: 16 }}>Marque professionnelle</p>
          <h2 id="brandpro-title" style={{ fontFamily: "Fraunces, serif", fontSize: "clamp(30px,3.6vw,46px)", color: "#F5F0E8", fontWeight: 700, lineHeight: 1.08, margin: "0 0 18px", letterSpacing: "-0.02em" }}>
            Votre marque.<br /><span style={{ color: G }}>Pas la nôtre.</span>
          </h2>
          <p style={{ color: "rgba(188,182,166,0.9)", fontSize: 16, lineHeight: 1.7, margin: "0 0 24px", maxWidth: 420 }}>
            Dès un <strong style={{ color: "#E8E6E0" }}>plan payant</strong>, la mention QRowg disparaît ; à partir du plan <strong style={{ color: "#E8E6E0" }}>{PLANS_DEF.pro.label}</strong>, votre page s'affiche sur votre propre nom de domaine. Vos clients ne voient que vous.
          </p>
          <button type="button" onClick={() => setOpen(true)}
            style={{ display: "inline-flex", alignItems: "center", gap: 8, background: "rgba(201,168,76,0.1)", border: `1px solid ${G}55`, color: G, fontSize: 14, fontWeight: 700, padding: "12px 22px", borderRadius: 12, cursor: "pointer" }}>
            Découvrir la marque professionnelle →
          </button>
        </div>
        {/* Avant / Après */}
        <div>
          <div style={{ display: "flex", gap: 14, alignItems: "stretch" }}>
            <MiniPage pro={false} />
            <MiniPage pro={true} />
          </div>
          <div style={{ display: "flex", gap: 14, marginTop: 8 }}>
            <span style={{ flex: 1, textAlign: "center", color: "rgba(188,182,166,0.7)", fontSize: 10.5, fontWeight: 600, textTransform: "uppercase", letterSpacing: 1 }}>Plan gratuit</span>
            <span style={{ flex: 1, textAlign: "center", color: G, fontSize: 10.5, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1 }}>Plan {PLANS_DEF.pro.label}</span>
          </div>
        </div>
      </div>
      <style>{`@media(max-width:820px){ .brandpro-wrap{ grid-template-columns:1fr!important; gap:32px!important; } } @media(max-width:640px){ section[aria-labelledby="brandpro-title"]{ padding:64px 22px!important; } }`}</style>

      {/* Modale explicative */}
      {open && (
        <div onClick={() => setOpen(false)} style={{ position: "fixed", inset: 0, zIndex: 3000, background: "rgba(0,0,0,0.8)", backdropFilter: "blur(4px)", display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
          <div onClick={e => e.stopPropagation()} style={{ width: "100%", maxWidth: 480, background: "linear-gradient(180deg,#16140E,#0C0B08)", border: `1px solid ${G}40`, borderRadius: 20, padding: "30px 28px", position: "relative", boxShadow: `0 30px 90px rgba(0,0,0,0.7), 0 0 50px ${G}12`, fontFamily: "DM Sans, sans-serif" }}>
            <button type="button" onClick={() => setOpen(false)} aria-label="Fermer" style={{ position: "absolute", top: 16, right: 16, width: 30, height: 30, borderRadius: 9, background: "rgba(255,255,255,0.06)", border: "none", color: "#BCB6A6", fontSize: 16, cursor: "pointer" }}>✕</button>
            <p style={{ color: G, fontSize: 9.5, fontWeight: 700, letterSpacing: 2, textTransform: "uppercase", margin: 0 }}>Marque professionnelle</p>
            <p style={{ color: "#F5F0E8", fontSize: 22, fontWeight: 800, margin: "4px 0 18px", fontFamily: "Fraunces, serif" }}>Une image 100 % à vous</p>
            {([
              ["🌐", "Votre nom de domaine", "Au lieu de qrowg.com/p/…, votre page vit sur carte.votremarque.fr. Plus crédible, plus mémorisable."],
              ["🚫", "Zéro mention QRowg", "La mention « Propulsé par QRowg » disparaît : vos visiteurs ne voient que votre marque."],
              ["✨", "Design premium", "Polices, couleurs et finitions soignées pour une page qui inspire confiance dès le premier coup d'œil."],
            ] as const).map(([emo, h, txt]) => (
              <div key={h} style={{ display: "flex", gap: 12, marginBottom: 14 }}>
                <span style={{ fontSize: 20, flexShrink: 0 }}>{emo}</span>
                <div>
                  <p style={{ color: "#F5F0E8", fontSize: 13.5, fontWeight: 700, margin: "0 0 2px" }}>{h}</p>
                  <p style={{ color: "rgba(188,182,166,0.9)", fontSize: 12.5, lineHeight: 1.55, margin: 0 }}>{txt}</p>
                </div>
              </div>
            ))}
            <Link href="/upgrade" style={{ display: "block", textAlign: "center", marginTop: 18, padding: "12px", borderRadius: 11, background: `linear-gradient(90deg,${G},#b8953f)`, color: "#080808", textDecoration: "none", fontSize: 13.5, fontWeight: 800 }}>
              Activer ma marque (dès le plan {PLANS_DEF.pro.label})
            </Link>
          </div>
        </div>
      )}
    </section>
  )
}


// ── Pricing card ──────────────────────────────────────────────────────────────
// Pricing landing : derive de la source unique (lib/plans) -> 4 plans, Pro en avant
const PLAN_LANDING_UI = {
  free:     { cta: "Commencer gratuitement",     href: "/creer",                       badge: null,                note: "Sans compte pour composer · le compte n'est demandé qu'à la publication" },

  pro:      { cta: `Choisir ${PLANS_DEF.pro.label}`,                 href: "/auth/signup?plan=pro",      badge: "Le plus populaire",   note: "Sans engagement · Annulable en 1 clic" },
  business: { cta: `Choisir ${PLANS_DEF.business.label}`,            href: "/auth/signup?plan=business", badge: null,                note: "Sans engagement · Annulable en 1 clic" },
} as Record<string, { cta: string; href: string; badge: string | null; note: string | null }>

// Bénéfices orientés résultat (Pb 12) — on vend ce que ça apporte, pas une liste de specs.
// ⚠️ Les `ok` DOIVENT refléter lib/plans.ts (source de vérité) : retrait du branding et
// domaine personnalisé dès le premier plan payant (PLANS.pro). Ne pas laisser diverger.
const LANDING_BENEFITS: Record<string, { text: string; ok: boolean }[]> = {
  free: [
    { text: "Votre page en ligne en 5 minutes", ok: true },
    { text: "3 QR codes, dont 1 modifiable après impression", ok: true },
    { text: "Vues illimitées — votre QR ne s'arrête jamais", ok: true },
    { text: "Suivez vos premières visites", ok: true },
    { text: "Sans la mention QRowg", ok: false },
    { text: "Votre nom de domaine", ok: false },
  ],
  pro: [
    { text: "Changez la destination d'un QR déjà imprimé", ok: true },
    { text: "Concevez vos supports : stickers, chevalets, affiches", ok: true },
    { text: "Voyez qui scanne, quand et avec quoi", ok: true },
    { text: "Votre marque, sans mention QRowg", ok: true },
    { text: "Votre propre nom de domaine", ok: true },
    { text: "10 pages · 30 QR dont 20 modifiables", ok: true },
  ],
  business: [
    { text: "Plusieurs établissements, une seule facture", ok: true },
    { text: "Tout le plan Établissement inclus", ok: true },
    { text: "Création en masse par import CSV", ok: true },
    { text: "Travaillez à plusieurs · 5 membres", ok: true },
    { text: "Marque blanche", ok: true },
    { text: "Accès API · 10 000 appels / mois", ok: true },
  ],
}

const PLANS = PLAN_LIST.map(p => ({
  id: p.id,
  name: p.label,
  tagline: p.description,
  isFree: p.priceMonthly === 0,
  priceMonthly: fmtPrice(p.priceMonthly),
  priceAnnual: fmtPrice(p.priceAnnual),
  rawMonthly: p.priceMonthly,
  rawAnnual: p.priceAnnual,
  highlight: p.id === "pro",
  badge: PLAN_LANDING_UI[p.id].badge,
  color: p.color,
  cta: PLAN_LANDING_UI[p.id].cta,
  ctaHref: PLAN_LANDING_UI[p.id].href,
  features: LANDING_BENEFITS[p.id] ?? p.perks.slice(0, 6).map(k => ({ text: k.text, ok: k.included })),
  note: PLAN_LANDING_UI[p.id].note,
}))

function PricingSection() {
  const { ref, visible } = useInView(0.06)
  const [showCmp, setShowCmp] = useState(false)
  const [annual, setAnnual] = useState(false)

  return (
    <section id="pricing" ref={ref} aria-labelledby="pricing-title"
      style={{
        padding: "100px 48px", position: "relative", zIndex: 1,
        background: "linear-gradient(180deg, rgba(255,255,255,0.024), rgba(255,255,255,0.008)), radial-gradient(130% 60% at 50% 0%, rgba(201,168,76,0.06), transparent 60%)",
        borderTop: "1px solid rgba(201,168,76,0.13)",
        borderBottom: "1px solid rgba(201,168,76,0.13)",
      }}>
      <style>{`
        .plans-grid { display:grid; grid-template-columns:repeat(3,1fr); gap:18px; align-items:stretch; }
        .plan-card  { border-radius:20px; padding:28px 22px; position:relative; overflow:hidden;
                      transition:transform 0.3s var(--mo-ease-spring), box-shadow 0.3s, border-color 0.25s; }
        .plan-card:hover { transform:translateY(-6px); }
        .plan-card.highlight { transform:scale(1.05); }
        .plan-card.highlight:hover { transform:scale(1.05) translateY(-6px); }
        @media(max-width:1024px){ .plans-grid{ grid-template-columns:repeat(2,1fr)!important; max-width:680px!important; margin:0 auto!important; } .plan-card.highlight{ transform:none!important; } .plan-card.highlight:hover{ transform:translateY(-4px)!important; } }
        @media(max-width:560px){ .plans-grid{ grid-template-columns:1fr!important; max-width:420px!important; } #pricing{ padding:72px 20px!important; } }
      `}</style>

      {/* Header */}
      <div style={{
        maxWidth: 1000, margin: "0 auto 64px", textAlign: "center",
        opacity: visible ? 1 : 0,
        transform: visible ? "translateY(0)" : "translateY(24px)",
        transition: "opacity 0.6s ease, transform 0.6s ease",
      }}>
        <Eyebrow>Tarifs</Eyebrow>
        <h2 id="pricing-title" style={{
          fontFamily:"Fraunces, serif",
          fontSize:"clamp(28px,4vw,52px)",
          color:"#F5F0E8", fontWeight:700,
          margin:"0 auto 16px", lineHeight:1.1,
          maxWidth:520, letterSpacing:"-0.02em",
        }}>
          Simple, transparent,{" "}
          <span style={{ color:"#C9A84C" }}>sans surprise.</span>
        </h2>
        <p style={{ color:"rgba(188,182,166,0.8)", fontSize:16,
          maxWidth:440, margin:"0 auto", lineHeight:1.65 }}>
          Commencez gratuitement. Passez au plan {PLANS_DEF.pro.label} quand vous êtes prêt.
        </p>

        {/* Toggle mensuel / annuel */}
        <div style={{ display:"flex", alignItems:"center", justifyContent:"center", gap:14, marginTop:28, flexWrap:"wrap" }}>
          <span style={{ color: !annual ? "#F5F0E8" : "rgba(188,182,166,0.6)", fontSize:14, fontWeight: !annual ? 600 : 400, transition:"color 0.2s" }}>Mensuel</span>
          <button type="button" onClick={() => setAnnual(a => !a)} role="switch" aria-checked={annual}
            aria-label="Basculer facturation annuelle"
            style={{ width:48, height:26, borderRadius:13, background: annual ? "linear-gradient(90deg,#C9A84C,#b8953f)" : "rgba(255,255,255,0.12)",
              border:"none", cursor:"pointer", position:"relative", transition:"background 0.25s", flexShrink:0 }}>
            <span style={{ position:"absolute", top:3, left: annual ? 25 : 3, width:20, height:20, borderRadius:"50%",
              background:"#fff", transition:"left 0.25s var(--mo-ease-spring)", boxShadow:"0 1px 4px rgba(0,0,0,0.3)" }}/>
          </button>
          <span style={{ color: annual ? "#F5F0E8" : "rgba(188,182,166,0.6)", fontSize:14, fontWeight: annual ? 600 : 400, transition:"color 0.2s" }}>Annuel</span>
          <span style={{ display:"inline-flex", alignItems:"center", gap:5, background:"rgba(57,255,143,0.12)", border:"1px solid rgba(57,255,143,0.3)",
            color:"var(--success)", fontSize:11.5, fontWeight:700, padding:"3px 10px", borderRadius:20, letterSpacing:0.2 }}>
            Jusqu'à 2 mois offerts
          </span>
        </div>
        <p style={{ color:"rgba(188,182,166,0.5)", fontSize:12, marginTop:12 }}>Prix TTC · Sans engagement · Annulable à tout moment</p>
      </div>

      {/* Cards */}
      <div style={{ maxWidth:1180, margin:"0 auto" }}>
        <div className="plans-grid">
          {PLANS.map((plan, i) => (
            <div
              key={plan.id}
              className={"plan-card" + (plan.highlight ? " highlight" : "")}
              style={{
                background: plan.highlight
                  ? "linear-gradient(145deg, rgba(201,168,76,0.12), rgba(201,168,76,0.04))"
                  : "rgba(255,255,255,0.02)",
                border: "1px solid " + (plan.highlight
                  ? "rgba(201,168,76,0.55)"
                  : "rgba(255,255,255,0.08)"),
                boxShadow: plan.highlight
                  ? "0 0 80px rgba(201,168,76,0.18), 0 0 0 1px rgba(201,168,76,0.12)"
                  : "none",
                opacity: visible ? 1 : 0,
                paddingTop: plan.badge ? 50 : undefined,
                transform: visible
                  ? (plan.highlight ? "scale(1.04)" : "translateY(0)")
                  : "translateY(28px)",
                transition: `opacity 0.5s ease ${i * 0.12}s, transform 0.5s ease ${i * 0.12}s, border-color 0.25s, box-shadow 0.3s`,
              }}
            >
              {/* Accent top */}
              <div style={{
                position:"absolute", top:0, left:0, right:0, height:2,
                background: plan.highlight
                  ? "linear-gradient(90deg,#C9A84C,#d4a843,#C9A84C)"
                  : "transparent",
                borderRadius:"22px 22px 0 0",
              }}/>

              {/* Badge */}
              {plan.badge && (
                <div style={{
                  position:"absolute", top:14, left:"50%", transform:"translateX(-50%)",
                  background:"linear-gradient(90deg,#C9A84C,#b8953f)",
                  borderRadius:20, padding:"4px 14px",
                  fontSize:10, fontWeight:800, color:"#080808",
                  letterSpacing:0.5, whiteSpace:"nowrap", zIndex:3,
                  boxShadow:"0 4px 14px rgba(201,168,76,0.45)",
                }}>{plan.badge}</div>
              )}

              {/* Plan name */}
              <p style={{
                color: plan.color, fontSize:10, fontWeight:700,
                letterSpacing:2.5, textTransform:"uppercase",
                margin:"0 0 4px",
              }}>{plan.name}</p>
              <p style={{ color:"rgba(188,182,166,0.7)", fontSize:12,
                margin:"0 0 20px", lineHeight:1.4 }}>{plan.tagline}</p>

              {/* Prix */}
              <div style={{ marginBottom:24 }}>
                <div style={{ display:"flex", alignItems:"baseline", gap:4 }}>
                  <span style={{
                    fontFamily:"Fraunces, serif",
                    color:"#F5F0E8", fontSize:48, fontWeight:700, lineHeight:1,
                  }}>{annual ? plan.priceAnnual : plan.priceMonthly}</span>
                  <span style={{ color:"rgba(201,168,76,0.7)", fontSize:15, fontWeight:600 }}>€</span>
                  {!plan.isFree && (
                    <span style={{ color:"rgba(188,182,166,0.6)", fontSize:13, marginLeft:2 }}>/ mois</span>
                  )}
                </div>
                {/* Sous-ligne : facturation annuelle / prix barre */}
                <div style={{ minHeight:18, marginTop:6 }}>
                  {!plan.isFree && annual && (
                    <span style={{ color:"rgba(188,182,166,0.6)", fontSize:12 }}>
                      soit {(plan.rawAnnual * 12).toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} € / an
                    </span>
                  )}
                  {!plan.isFree && !annual && (
                    <span style={{ color:"rgba(188,182,166,0.45)", fontSize:12 }}>ou {plan.priceAnnual} € / mois en annuel</span>
                  )}
                </div>
              </div>

              {/* Séparateur */}
              <div style={{
                height:1, marginBottom:24,
                background: plan.highlight
                  ? "linear-gradient(90deg,transparent,rgba(201,168,76,0.3),transparent)"
                  : "rgba(255,255,255,0.06)",
              }}/>

              {/* Features */}
              <div style={{ display:"flex", flexDirection:"column", gap:11, marginBottom:28 }}>
                {plan.features.map((f, j) => (
                  <div key={j} style={{ display:"flex", alignItems:"center", gap:10 }}>
                    <span style={{
                      width:16, height:16, borderRadius:"50%", flexShrink:0,
                      display:"flex", alignItems:"center", justifyContent:"center",
                      fontSize:9,
                      background: f.ok
                        ? "rgba(57,255,143,0.15)"
                        : "rgba(188,182,166,0.08)",
                      color: f.ok ? "var(--success)" : "rgba(188,182,166,0.4)",
                    }}>{f.ok ? "✓" : "✕"}</span>
                    <span style={{
                      color: f.ok ? "rgba(245,240,232,0.85)" : "rgba(188,182,166,0.45)",
                      fontSize:13.5,
                      textDecoration: f.ok ? "none" : "none",
                    }}>{f.text}</span>
                  </div>
                ))}
              </div>

              {/* CTA */}
              <Link href={plan.ctaHref} style={{
                display:"block", textAlign:"center", textDecoration:"none",
                padding:"13px 24px", borderRadius:11,
                fontWeight:700, fontSize:14, letterSpacing:0.1,
                background: plan.highlight
                  ? "linear-gradient(90deg,#C9A84C,#b8953f)"
                  : "transparent",
                color: plan.highlight ? "#080808" : plan.color,
                border: plan.highlight ? "none" : "1px solid " + plan.color + "40",
                transition:"all 0.2s ease",
                boxShadow: plan.highlight ? "0 4px 20px rgba(201,168,76,0.35)" : "none",
              }}
                onMouseEnter={e => {
                  const el = e.currentTarget as HTMLElement
                  if (plan.highlight) {
                    el.style.boxShadow = "0 6px 28px rgba(201,168,76,0.5)"
                    el.style.transform = "translateY(-1px)"
                  } else {
                    el.style.background = plan.color + "12"
                    el.style.borderColor = plan.color + "70"
                  }
                }}
                onMouseLeave={e => {
                  const el = e.currentTarget as HTMLElement
                  if (plan.highlight) {
                    el.style.boxShadow = "0 4px 20px rgba(201,168,76,0.35)"
                    el.style.transform = "none"
                  } else {
                    el.style.background = "transparent"
                    el.style.borderColor = plan.color + "40"
                  }
                }}>
                {plan.cta}
              </Link>

              {/* Note sous le CTA */}
              {plan.note && (
                <p style={{
                  color:"rgba(188,182,166,0.6)", fontSize:11,
                  textAlign:"center", margin:"12px 0 0", lineHeight:1.5,
                }}>{plan.note}</p>
              )}
            </div>
          ))}
        </div>

        {/* Comparaison détaillée des plans (Pb 13) */}
        <div style={{ marginTop: 56, opacity: visible ? 1 : 0, transition: "opacity 0.6s ease 0.4s" }}>
          <div style={{ textAlign: "center" }}>
            <button type="button" onClick={() => setShowCmp(v => !v)} aria-expanded={showCmp} style={{ display: "inline-flex", alignItems: "center", gap: 9, padding: "13px 26px", borderRadius: 12, background: showCmp ? "rgba(201,168,76,0.06)" : "transparent", border: "1px solid rgba(201,168,76,0.3)", color: "#C9A84C", fontSize: 14, fontWeight: 700, cursor: "pointer", fontFamily: "DM Sans, sans-serif" }}>
              {showCmp ? "Masquer le comparatif" : "Comparer les plans en détail"}
              <span style={{ fontSize: 12, transform: showCmp ? "rotate(180deg)" : "none", transition: "transform 0.25s" }}>▾</span>
            </button>
          </div>
          {showCmp && (
          <>
          <p style={{ color: "rgba(200,194,178,0.88)", fontSize: 14.5, textAlign: "center", margin: "22px 0 26px", lineHeight: 1.6 }}>
            Survolez le <span style={{ color: "#C9A84C" }}>?</span> de chaque ligne pour plus d'explications.
          </p>
          {(() => {
            const INFO: Record<string, string> = {
              "Pages": "Nombre de pages publiables en même temps.",
              "Vues / mois": "Nombre de visites comptabilisées chaque mois sur vos pages.",
              "QR codes": "Nombre de QR codes que vous pouvez générer.",
              "QR Studio": "Personnalisation avancée du QR : couleurs, formes des modules et des coins.",
              "QR Print Studio": "Éditeur d'imprimables (affiches, flyers, cartes, stickers) façon Canva.",
              "IA": "Génération de design et recommandations automatiques.",
              "Export HD": "Formats de téléchargement haute définition pour l'impression.",
              "Templates": "Bibliothèque de modèles prêts à l'emploi.",
              "Branding QRowg": "Mention QRowg en bas de page (retirée dès le plan Établissement).",
              "Domaine perso": "Utiliser votre propre nom de domaine.",
              "Analytics": "Niveau de détail des statistiques.",
              "Equipe": "Nombre de membres pouvant collaborer sur le compte.",
              "API": "Accès programmatique pour automatiser vos QR codes.",
              "Marque blanche": "Aucune trace de QRowg : votre marque uniquement.",
              "Support": "Niveau et rapidité de l'assistance.",
            }
            const cell = (v: string, hl: boolean) => {
              const ok = v === "✓" || v === "Oui"
              const no = v === "❌" || v === "—" || v === "Non"
              return (
                <td style={{ padding: "12px 14px", textAlign: "center", fontSize: 12.5, fontWeight: hl ? 700 : 500, color: ok ? "var(--success)" : no ? "rgba(188,182,166,0.45)" : hl ? "#C9A84C" : "#E8E6E0", borderBottom: "1px solid rgba(255,255,255,0.05)", background: hl ? "rgba(201,168,76,0.05)" : "transparent" }}>
                  {ok ? "✓" : no ? "—" : v}
                </td>
              )
            }
            return (
              <div style={{ overflowX: "auto", maxWidth: 960, margin: "0 auto", border: "1px solid rgba(201,168,76,0.14)", borderRadius: 16, background: "rgba(255,255,255,0.02)" }}>
                <table style={{ width: "100%", minWidth: 620, borderCollapse: "collapse" }}>
                  <thead>
                    <tr>
                      <th style={{ padding: "16px 14px", textAlign: "left", fontSize: 11, color: "rgba(188,182,166,0.8)", fontWeight: 600, textTransform: "uppercase", letterSpacing: 1 }}>Fonctionnalité</th>
                      {PLAN_LIST.map(p => (
                        <th key={p.id} style={{ padding: "16px 14px", textAlign: "center", fontSize: 13, fontWeight: 800, color: p.id === "pro" ? "#C9A84C" : "#F5F0E8", background: p.id === "pro" ? "rgba(201,168,76,0.06)" : "transparent" }}>
                          {p.label}{p.id === "pro" && <div style={{ fontSize: 8.5, color: "#C9A84C", fontWeight: 700, letterSpacing: 0.5 }}>POPULAIRE</div>}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {PLAN_COMPARISON.map(row => (
                      <tr key={row.feature}>
                        <td style={{ padding: "12px 14px", textAlign: "left", fontSize: 12.5, color: "#E8E6E0", borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
                          {row.feature}
                          {INFO[row.feature] && <span title={INFO[row.feature]} style={{ marginLeft: 6, display: "inline-flex", alignItems: "center", justifyContent: "center", width: 14, height: 14, borderRadius: "50%", background: "rgba(201,168,76,0.15)", color: "#C9A84C", fontSize: 9, fontWeight: 800, cursor: "help" }}>?</span>}
                        </td>
                        {cell(row.free, false)}
                        {cell(row.pro, true)}
                        {cell(row.business, false)}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )
          })()}
          </>
          )}
        </div>
      </div>
    </section>
  )
}


// ── Proof strip ───────────────────────────────────────────────────────────────
const ROADMAP_STEPS = [
  { icon: "🎨", title: "Choisissez un modèle", sub: "Un modèle adapté à votre métier, prêt à l'emploi." },
  { icon: "✏️", title: "Personnalisez", sub: "Vos textes, photos, liens et boutons d'action." },
  { icon: "📱", title: "Obtenez votre QR", sub: "Un QR code dynamique généré automatiquement." },
  { icon: "📊", title: "Partagez & suivez", sub: "Diffusez partout et suivez chaque scan." },
] as const

function ProofStrip() {
  const { ref, visible } = useInView(0.1)
  return (
    <section
      ref={ref}
      aria-label="Comment ça marche, en 4 étapes"
      style={{ padding: "0 48px 80px", position: "relative", zIndex: 1 }}
    >
      <div style={{ maxWidth: 1140, margin: "0 auto" }}>
        <p style={{ textAlign: "center", color: "rgba(200,194,178,0.88)", fontSize: 14.5, margin: "0 0 30px", letterSpacing: 0.2, lineHeight: 1.6 }}>
          De l'idée au QR code partagé — <span style={{ color: "#C9A84C", fontWeight: 600 }}>4 étapes, 5 minutes</span>.
        </p>
        <div className="rm-grid" style={{ position: "relative", display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16 }}>
          {/* ligne de liaison derrière les badges */}
          <div aria-hidden className="rm-line" style={{ position: "absolute", top: 23, left: "12.5%", right: "12.5%", height: 2, background: "linear-gradient(90deg, rgba(201,168,76,0.35), rgba(201,168,76,0.18))", opacity: visible ? 1 : 0, transition: "opacity 0.7s ease 0.3s" }} />
          {ROADMAP_STEPS.map((s, i) => (
            <div key={s.title} style={{
              position: "relative", display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center", gap: 10,
              opacity: visible ? 1 : 0, transform: visible ? "translateY(0)" : "translateY(20px)",
              transition: `opacity 0.5s ease ${i * 110}ms, transform 0.5s ease ${i * 110}ms`,
            }}>
              {/* badge numéro */}
              <div style={{ width: 48, height: 48, borderRadius: "50%", background: "linear-gradient(135deg, #14120C, #0C0B08)", border: "1px solid rgba(201,168,76,0.4)", boxShadow: "0 6px 20px rgba(0,0,0,0.4)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20, position: "relative", zIndex: 1 }}>
                {s.icon}
                <span style={{ position: "absolute", top: -6, right: -6, width: 20, height: 20, borderRadius: "50%", background: "linear-gradient(135deg,#C9A84C,#b8953f)", color: "#080808", fontSize: 11, fontWeight: 800, display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 2px 6px rgba(201,168,76,0.4)" }}>{i + 1}</span>
              </div>
              <p style={{ color: "#F5F0E8", fontSize: 15, fontWeight: 700, margin: 0, lineHeight: 1.3 }}>{s.title}</p>
              <p style={{ color: "rgba(188,182,166,0.8)", fontSize: 12.5, margin: 0, lineHeight: 1.5, maxWidth: 200 }}>{s.sub}</p>
            </div>
          ))}
        </div>
      </div>
      <style>{`
        @media (max-width: 760px) {
          .rm-grid { grid-template-columns: 1fr !important; gap: 0 !important; }
          .rm-line { display: none !important; }
          .rm-grid > div { flex-direction: row !important; text-align: left !important; align-items: flex-start !important; gap: 16px !important; padding: 18px 0 !important; border-bottom: 1px solid rgba(201,168,76,0.08) !important; max-width: 460px; margin: 0 auto; }
          .rm-grid > div:last-child { border-bottom: none !important; }
          .rm-grid > div p { max-width: none !important; }
        }
        @media (max-width: 640px) { section[aria-label="Comment ça marche, en 4 étapes"] { padding: 0 22px 64px !important; } }
      `}</style>
    </section>
  )
}
// ── Templates section ─────────────────────────────────────────────────────────
const TEMPLATE_DATA = [
  {
    id: "restaurant",
    name: "Restaurant & Bar",
    category: "Food & Beverage",
    includes: ["Menu", "Réservation", "Avis Google"],
    blocks: 7,
    isPro: false,
    accent: "#F97316",
    icon: "🍽️",
    preview: [
      { type: "avatar", label: "Logo & Nom" },
      { type: "bar",    color: "rgba(249,115,22,0.5)", w: "85%" },
      { type: "bar",    color: "rgba(249,115,22,0.25)", w: "65%" },
      { type: "grid2",  color: "rgba(249,115,22,0.15)" },
      { type: "btn",    color: "rgba(249,115,22,0.35)", label: "Voir le menu" },
    ],
  },
  {
    id: "freelance",
    name: "Freelance Pro",
    category: "Services",
    includes: ["Portfolio", "Contact", "Réseaux"],
    blocks: 6,
    isPro: false,
    accent: "var(--action)",
    icon: "💼",
    preview: [
      { type: "avatar", label: "Photo & Titre" },
      { type: "bar",    color: "rgba(56,189,248,0.5)", w: "70%" },
      { type: "tags",   color: "rgba(56,189,248,0.2)" },
      { type: "bar",    color: "rgba(56,189,248,0.2)", w: "90%" },
      { type: "btn",    color: "rgba(56,189,248,0.35)", label: "Me contacter" },
    ],
  },
  {
    id: "coach",
    name: "Coach & Thérapeute",
    category: "Bien-être",
    includes: ["Prestations", "Prise de RDV", "Avis"],
    blocks: 8,
    isPro: false,
    accent: "var(--success)",
    icon: "🧘",
    preview: [
      { type: "avatar", label: "Portrait" },
      { type: "bar",    color: "rgba(57,255,143,0.45)", w: "80%" },
      { type: "bar",    color: "rgba(57,255,143,0.2)",  w: "60%" },
      { type: "bar",    color: "rgba(57,255,143,0.15)", w: "75%" },
      { type: "btn",    color: "rgba(57,255,143,0.3)", label: "Prendre RDV" },
    ],
  },
  {
    id: "artist",
    name: "Artiste & Musicien",
    category: "Créatif",
    includes: ["Musique", "Galerie", "Dates"],
    blocks: 7,
    isPro: true,
    accent: "#A78BFA",
    icon: "🎵",
    preview: [
      { type: "avatar", label: "Photo artistique" },
      { type: "bar",    color: "rgba(167,139,250,0.5)", w: "90%" },
      { type: "grid3",  color: "rgba(167,139,250,0.2)" },
      { type: "bar",    color: "rgba(167,139,250,0.2)", w: "60%" },
      { type: "btn",    color: "rgba(167,139,250,0.35)", label: "Ecouter" },
    ],
  },
  {
    id: "immo",
    name: "Agent Immobilier",
    category: "Immobilier",
    includes: ["Biens", "Estimation", "Contact"],
    blocks: 6,
    isPro: true,
    accent: "#C9A84C",
    icon: "🏠",
    preview: [
      { type: "avatar", label: "Agent" },
      { type: "bar",    color: "rgba(201,168,76,0.5)", w: "75%" },
      { type: "grid2",  color: "rgba(201,168,76,0.15)" },
      { type: "bar",    color: "rgba(201,168,76,0.2)", w: "55%" },
      { type: "btn",    color: "rgba(201,168,76,0.35)", label: "Estimer" },
    ],
  },
  {
    id: "boutique",
    name: "Boutique E-commerce",
    category: "Commerce",
    includes: ["Catalogue", "Paiement", "Promos"],
    blocks: 9,
    isPro: true,
    accent: "#F43F5E",
    icon: "🛍️",
    preview: [
      { type: "avatar", label: "Marque" },
      { type: "bar",    color: "rgba(244,63,94,0.45)", w: "80%" },
      { type: "grid3",  color: "rgba(244,63,94,0.2)" },
      { type: "bar",    color: "rgba(244,63,94,0.15)", w: "65%" },
      { type: "btn",    color: "rgba(244,63,94,0.35)", label: "Commander" },
    ],
  },
] as const

function TemplateMiniPreview({ preview, accent, hovered = false }: { preview: readonly {type:string;color?:string;w?:string;label?:string}[]; accent: string; hovered?: boolean }) {
  return (
    <div style={{
      background: "#0c0a08",
      border: `1px solid ${hovered ? accent + "33" : "rgba(255,255,255,0.06)"}`,
      borderRadius: 10, padding: "10px 10px",
      display: "flex", flexDirection: "column", gap: 6,
      height: 120, position: "relative", overflow: "hidden",
      transform: hovered ? "scale(1.02)" : "scale(1)",
      transformOrigin: "center",
      transition: "transform 0.3s var(--mo-ease-spring), border-color 0.25s",
    }}>
      {/* Balayage lumineux au survol : donne vie à l'aperçu (façon page réelle) */}
      {hovered && (
        <div aria-hidden="true" style={{ position: "absolute", inset: 0, pointerEvents: "none", zIndex: 2 }}>
          <div className="tpl-sweep" style={{
            position: "absolute", top: 0, bottom: 0, width: "55%", left: "-60%",
            background: "linear-gradient(105deg, transparent, rgba(255,255,255,0.10), transparent)",
          }} />
        </div>
      )}
      {preview.map((p, i) => {
        if (p.type === "avatar") return (
          <div key={i} style={{ display: "flex", alignItems: "center", gap: 7 }}>
            <div style={{ width: 24, height: 24, borderRadius: "50%",
              background: `linear-gradient(135deg, ${accent}, ${accent}80)`, flexShrink: 0 }} />
            <div style={{ height: 5, width: "50%", borderRadius: 3,
              background: "rgba(245,240,232,0.18)" }} />
          </div>
        )
        if (p.type === "bar") return (
          <div key={i} style={{ height: 6, width: p.w ?? "100%", borderRadius: 3,
            background: p.color }} />
        )
        if (p.type === "btn") return (
          <div key={i} style={{ height: 20, borderRadius: 5,
            background: p.color, display: "flex", alignItems: "center",
            justifyContent: "center", marginTop: "auto" }}>
            <div style={{ height: 4, width: "45%", borderRadius: 2,
              background: "rgba(255,255,255,0.4)" }} />
          </div>
        )
        if (p.type === "grid2") return (
          <div key={i} style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 4 }}>
            {[0,1].map(j => (
              <div key={j} style={{ height: 16, borderRadius: 4, background: p.color }} />
            ))}
          </div>
        )
        if (p.type === "grid3") return (
          <div key={i} style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 3 }}>
            {[0,1,2].map(j => (
              <div key={j} style={{ height: 14, borderRadius: 3, background: p.color }} />
            ))}
          </div>
        )
        if (p.type === "tags") return (
          <div key={i} style={{ display: "flex", gap: 4 }}>
            {[0,1,2].map(j => (
              <div key={j} style={{ height: 12, width: 28 + j * 8, borderRadius: 6,
                background: p.color }} />
            ))}
          </div>
        )
        return null
      })}
    </div>
  )
}

function TemplateCard({ tpl, i, visible }: { tpl: typeof TEMPLATE_DATA[number]; i: number; visible: boolean }) {
  const [hovered, setHovered] = useState(false)
  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        background: hovered ? "rgba(255,255,255,0.035)" : "rgba(255,255,255,0.018)",
        border: `1px solid ${hovered ? tpl.accent + "40" : "rgba(201,168,76,0.1)"}`,
        borderRadius: 18, padding: "20px",
        display: "flex", flexDirection: "column", gap: 14,
        position: "relative", overflow: "hidden",
        transform: visible ? (hovered ? "translateY(-4px)" : "translateY(0)") : "translateY(28px)",
        opacity: visible ? 1 : 0,
        transition: `opacity 0.5s ease ${i * 80}ms, transform ${hovered ? "0.3s var(--mo-ease-spring)" : "0.5s ease " + i * 80 + "ms"}, border-color 0.25s, background 0.25s`,
        boxShadow: hovered ? `0 8px 28px rgba(0,0,0,0.35), 0 0 0 1px ${tpl.accent}18` : "none",
        cursor: "default",
      }}
    >
      {/* Top accent line */}
      <div style={{
        position: "absolute", top: 0, left: 0, right: 0, height: 1,
        background: hovered
          ? `linear-gradient(90deg, transparent, ${tpl.accent}60, transparent)`
          : "linear-gradient(90deg, transparent, rgba(201,168,76,0.12), transparent)",
        transition: "background 0.3s",
      }} />

      {/* Badge Pro/Free */}
      <div style={{ position: "absolute", top: 14, right: 14 }}>
        <span style={{
          fontSize: 9, fontWeight: 800, letterSpacing: 1.5,
          padding: "3px 8px", borderRadius: 20,
          background: tpl.isPro ? "rgba(167,139,250,0.15)" : "rgba(57,255,143,0.12)",
          border: `1px solid ${tpl.isPro ? "rgba(167,139,250,0.35)" : "rgba(57,255,143,0.3)"}`,
          color: tpl.isPro ? "#A78BFA" : "var(--success)",
        }}>{tpl.isPro ? PLANS_DEF.pro.label.toUpperCase() : PLANS_DEF.free.label.toUpperCase()}</span>
      </div>

      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <div style={{
          width: 38, height: 38, borderRadius: 10,
          background: `${tpl.accent}14`, border: `1px solid ${tpl.accent}28`,
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 18, flexShrink: 0,
          transition: "background 0.2s, border-color 0.2s",
          ...(hovered && { background: `${tpl.accent}22`, borderColor: `${tpl.accent}50` }),
        }}>{tpl.icon}</div>
        <div>
          <h3 style={{ color: "#F5F0E8", fontSize: 14, fontWeight: 700, margin: "0 0 2px" }}>
            {tpl.name}
          </h3>
          <span style={{ color: tpl.accent, fontSize: 10, fontWeight: 600,
            letterSpacing: 1.5, textTransform: "uppercase", opacity: 0.75 }}>
            {tpl.category}
          </span>
        </div>
      </div>

      {/* Mini preview */}
      <TemplateMiniPreview preview={tpl.preview} accent={tpl.accent} hovered={hovered} />

      {/* Footer */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <span style={{ color: "rgba(188,182,166,0.8)", fontSize: 12.5, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: "68%" }}>
          {tpl.includes.join(" · ")}
        </span>
        <a href="/creer" style={{
          display: "inline-flex", alignItems: "center", gap: 5,
          color: hovered ? tpl.accent : "#C9A84C",
          textDecoration: "none", fontSize: 12, fontWeight: 600,
          // 16 px de haut pour le lien qui mène à la création : on l'épaissit
          // sans décaler la carte (marge négative compensatoire).
          minHeight: 40, padding: "0 4px", margin: "-12px -4px",
          transition: "color 0.2s",
        }}>
          Utiliser <span style={{ fontSize: 13 }}>→</span>
        </a>
      </div>
    </div>
  )
}

// QRCanvas (qr-code-styling) chargé à la demande (chunk séparé) : garde la landing légère.
const QRCanvasLive = dynamic(() => import("./dashboard/qr-codes/QRCanvas"), {
  ssr: false,
  loading: () => <div style={{ width: 232, height: 232, borderRadius: 12, background: "rgba(0,0,0,0.05)" }} />,
})

const QRL_COLORS = [
  { name: "Or",       v: "#C9A84C" },
  { name: "Noir",     v: "#0A0A0A" },
  { name: "Océan",    v: "#2563EB" },
  { name: "Émeraude", v: "#059669" },
  { name: "Violet",   v: "#7C3AED" },
  { name: "Corail",   v: "#E11D48" },
] as const

const QRL_DOTS = [
  { name: "Arrondi", v: "rounded" },
  { name: "Carré",   v: "square" },
  { name: "Points",  v: "dot" },
  { name: "Élégant", v: "softSquare" },
] as const

type QrlDot = typeof QRL_DOTS[number]["v"]

const QRL_LABEL: React.CSSProperties = {
  color: "#8A8478", fontSize: 12, fontWeight: 700, letterSpacing: 1,
  textTransform: "uppercase", margin: "0 0 12px",
}

function QRStudioLive() {
  const { ref, visible } = useInView(0.1)
  const [fg, setFg] = useState<string>("#C9A84C")
  const [dot, setDot] = useState<QrlDot>("rounded")

  return (
    <section id="qr-studio" ref={ref} aria-labelledby="qrlive-title"
      style={{ padding: "100px 48px", position: "relative", zIndex: 1 }}>
      <style>{`
        .qrl-grid { display:grid; grid-template-columns:1fr 1fr; gap:48px; align-items:center; max-width:1000px; margin:0 auto; }
        @media(max-width:820px){ .qrl-grid { grid-template-columns:1fr !important; gap:36px !important; } }
        @media(max-width:640px){ #qr-studio { padding:72px 24px !important; } }
        .qrl-sw { width:34px; height:34px; border-radius:9px; cursor:pointer; padding:0; transition:transform .18s ease, border-color .2s; }
        .qrl-sw:hover { transform:scale(1.1); }
        .qrl-sw:focus-visible { outline:2px solid rgba(201,168,76,0.6); outline-offset:2px; }
        .qrl-chip { padding:9px 16px; border-radius:10px; font-size:13px; font-weight:600; cursor:pointer; font-family:'DM Sans',system-ui,sans-serif; transition:all .2s; border:1px solid rgba(255,255,255,0.12); background:rgba(255,255,255,0.03); color:rgba(188,182,166,0.85); }
        .qrl-chip:hover { border-color:rgba(201,168,76,0.4); color:#F5F0E8; }
        .qrl-chip[aria-pressed="true"] { background:rgba(201,168,76,0.14); border-color:rgba(201,168,76,0.5); color:#C9A84C; }
        .qrl-chip:focus-visible { outline:2px solid rgba(201,168,76,0.6); outline-offset:2px; }
      `}</style>

      {/* Header */}
      <div style={{
        maxWidth: 1000, margin: "0 auto 56px", textAlign: "center",
        opacity: visible ? 1 : 0, transform: visible ? "translateY(0)" : "translateY(24px)",
        transition: "opacity 0.6s ease, transform 0.6s ease",
      }}>
        <Eyebrow>QR Studio</Eyebrow>
        <h2 id="qrlive-title" style={{
          fontFamily: "Fraunces, serif", fontSize: "clamp(28px, 4vw, 52px)",
          color: "#F5F0E8", fontWeight: 700, margin: "0 auto 20px",
          lineHeight: 1.1, maxWidth: 620, letterSpacing: "-0.02em",
        }}>
          Un QR code{" "}<span style={{ color: "#C9A84C" }}>à votre image.</span>
        </h2>
        <p style={{ color: "rgba(188,182,166,0.85)", fontSize: 16, maxWidth: 520, margin: "0 auto", lineHeight: 1.7 }}>
          Couleur, forme des modules : personnalisez, l'aperçu se met à jour en direct. Et c'est un vrai QR — scannez-le.
        </p>
      </div>

      {/* Grid : contrôles + aperçu live */}
      <div className="qrl-grid" style={{
        opacity: visible ? 1 : 0, transform: visible ? "translateY(0)" : "translateY(24px)",
        transition: "opacity 0.6s ease 0.15s, transform 0.6s ease 0.15s",
      }}>
        {/* Contrôles */}
        <div style={{ display: "flex", flexDirection: "column", gap: 28 }}>
          <div>
            <p style={QRL_LABEL}>Couleur</p>
            <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
              {QRL_COLORS.map(c => (
                <button key={c.v} type="button" className="qrl-sw" onClick={() => setFg(c.v)}
                  aria-label={`Couleur ${c.name}`} aria-pressed={fg === c.v}
                  style={{ background: c.v, border: `2px solid ${fg === c.v ? "#F5F0E8" : "transparent"}` }} />
              ))}
            </div>
          </div>
          <div>
            <p style={QRL_LABEL}>Forme des modules</p>
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
              {QRL_DOTS.map(d => (
                <button key={d.v} type="button" className="qrl-chip" aria-pressed={dot === d.v}
                  onClick={() => setDot(d.v)}>{d.name}</button>
              ))}
            </div>
          </div>
          <a href="/generateur-qr-code" style={{
            display: "inline-flex", alignItems: "center", gap: 8, alignSelf: "flex-start", marginTop: 4,
            background: "linear-gradient(135deg, #EBCE72, #C9A84C)", color: "#0A0A0A",
            fontWeight: 700, fontSize: 15, padding: "13px 24px", borderRadius: 12,
            textDecoration: "none", boxShadow: "0 8px 24px rgba(201,168,76,0.25)",
            fontFamily: "'DM Sans', system-ui, sans-serif",
          }}>Créer mon QR code gratuit <span aria-hidden="true">→</span></a>
        </div>

        {/* Aperçu live */}
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 16 }}>
          <div style={{
            padding: 20, borderRadius: 20, background: "#FFFFFF",
            boxShadow: "0 20px 60px rgba(0,0,0,0.4), 0 0 0 1px rgba(201,168,76,0.15)",
          }}>
            {visible
              ? <QRCanvasLive value="https://qrowg.com" size={232} fg={fg} bg="#FFFFFF" ecc="M" style={{ dotStyle: dot, cornerStyle: "rounded" }} />
              : <div style={{ width: 232, height: 232 }} />}
          </div>
          <p style={{ color: "rgba(188,182,166,0.6)", fontSize: 12.5, display: "flex", alignItems: "center", gap: 7, margin: 0 }}>
            <span aria-hidden="true" style={{ width: 7, height: 7, borderRadius: "50%", background: "var(--success)", boxShadow: "0 0 8px var(--success)" }} />
            Aperçu en direct · vrai QR scannable
          </p>
        </div>
      </div>
    </section>
  )
}

function TemplatesSection() {
  const { ref, visible } = useInView(0.06)
  return (
    <section id="templates" ref={ref} aria-labelledby="templates-title"
      style={{ padding: "100px 48px", position: "relative", zIndex: 1 }}>
      <style>{`
        .tpl-grid { display:grid; grid-template-columns:repeat(3,1fr); gap:20px; }
        @media(max-width:900px){ .tpl-grid { grid-template-columns:repeat(2,1fr) !important; } }
        @media(max-width:580px){
          .tpl-grid { display:flex !important; gap:14px !important;
            overflow-x:auto !important; scroll-snap-type:x mandatory !important;
            padding-bottom:16px !important; -webkit-overflow-scrolling:touch !important; }
          .tpl-grid > * { min-width:280px !important; scroll-snap-align:start !important; }
        }
        .tpl-grid::-webkit-scrollbar { height:4px; }
        .tpl-grid::-webkit-scrollbar-track { background:rgba(255,255,255,0.04); border-radius:2px; }
        .tpl-grid::-webkit-scrollbar-thumb { background:rgba(201,168,76,0.3); border-radius:2px; }
        @media(max-width:640px){ #templates { padding:72px 24px !important; } }
        .tpl-sweep { animation: tpl-sweep 0.9s ease forwards; }
        @keyframes tpl-sweep { to { left: 120%; } }
        @media(prefers-reduced-motion:reduce){ .tpl-sweep { animation: none !important; display:none !important; } }
      `}</style>

      {/* Header */}
      <div style={{
        maxWidth: 1140, margin: "0 auto 64px", textAlign: "center",
        opacity: visible ? 1 : 0, transform: visible ? "translateY(0)" : "translateY(24px)",
        transition: "opacity 0.6s ease, transform 0.6s ease",
      }}>
        <Eyebrow>Templates</Eyebrow>
        <h2 id="templates-title" style={{
          fontFamily: "Fraunces, serif",
          fontSize: "clamp(28px, 4vw, 52px)",
          color: "#F5F0E8", fontWeight: 700, margin: "0 auto 20px",
          lineHeight: 1.1, maxWidth: 620, letterSpacing: "-0.02em",
        }}>
          Des modèles prêts{" "}
          <span style={{ color: "#C9A84C" }}>pour votre métier.</span>
        </h2>
        <p style={{
          color: "rgba(188,182,166,0.85)", fontSize: 16,
          maxWidth: 540, margin: "0 auto", lineHeight: 1.7,
        }}>
          Restaurant, indépendant, coach, artiste, immobilier, commerce :{" "}
          partez d'une page déjà structurée.
        </p>
      </div>

      {/* Grid */}
      <div style={{ maxWidth: 1140, margin: "0 auto" }}>
        <div className="tpl-grid">
          {TEMPLATE_DATA.map((tpl, i) => (
            <TemplateCard key={tpl.id} tpl={tpl} i={i} visible={visible} />
          ))}
        </div>
      </div>

      {/* CTA */}
      <div style={{
        textAlign: "center", marginTop: 52,
        opacity: visible ? 1 : 0, transition: "opacity 0.6s ease 0.65s",
      }}>
        <a href="/creer" style={{
          display: "inline-flex", alignItems: "center", gap: 10,
          background: "transparent",
          border: "1px solid rgba(201,168,76,0.25)",
          color: "#C9A84C", textDecoration: "none",
          fontSize: 14, fontWeight: 600,
          padding: "12px 28px", borderRadius: 10,
          transition: "all 0.2s ease",
        }}
          onMouseEnter={e => {
            const el = e.currentTarget as HTMLElement
            el.style.background = "rgba(201,168,76,0.08)"
            el.style.borderColor = "rgba(201,168,76,0.5)"
          }}
          onMouseLeave={e => {
            const el = e.currentTarget as HTMLElement
            el.style.background = "transparent"
            el.style.borderColor = "rgba(201,168,76,0.25)"
          }}>
          Voir tous les modèles
          <span style={{ fontSize: 16 }}>→</span>
        </a>
      </div>
    </section>
  )
}

// ── Navbar ────────────────────────────────────────────────────────────────────
const NAV_LINKS = [
  { label: "Fonctionnalités", href: "#features"  },
  { label: "Modèles",         href: "#templates" },
  { label: "Exemples",        href: "#examples"  },
  { label: "Tarifs",          href: "#pricing"   },
  { label: "FAQ",             href: "#faq"       },
]
function Navbar() {
  const [scrolled, setScrolled] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const [active,   setActive]   = useState("")
  const [authed,   setAuthed]   = useState(false)
  useEffect(() => {
    // Header conscient de la connexion : un utilisateur connecté voit « Mon espace »
    // au lieu de « Connexion / Commencer » (sinon il croit être anonyme).
    createClient().auth.getUser().then(({ data }) => setAuthed(!!data.user)).catch(() => {})
  }, [])
  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 20)
    window.addEventListener("scroll", fn, { passive: true })
    return () => window.removeEventListener("scroll", fn)
  }, [])
  useEffect(() => {
    const ids = NAV_LINKS.map(l => l.href.replace("#",""))
    const obs = new IntersectionObserver(
      entries => entries.forEach(e => { if (e.isIntersecting) setActive(e.target.id) }),
      { rootMargin: "-40% 0px -55% 0px" }
    )
    ids.forEach(id => { const el = document.getElementById(id); if (el) obs.observe(el) })
    return () => obs.disconnect()
  }, [])
  useEffect(() => {
    document.body.style.overflow = menuOpen ? "hidden" : ""
    return () => { document.body.style.overflow = "" }
  }, [menuOpen])
  return (
    <>
      <style>{`
        .nl::after{content:"";position:absolute;bottom:-2px;left:0;right:0;height:1.5px;
          background:linear-gradient(90deg,#C9A84C,#d4a843);transform:scaleX(0);
          transform-origin:left;transition:transform 0.25s ease;border-radius:2px;}
        .nl:hover::after,.nl.act::after{transform:scaleX(1);}
        .nl:hover{color:#F5F0E8 !important;}
        .nl:focus-visible,.nct:focus-visible{outline:2px solid rgba(201,168,76,0.6);outline-offset:4px;border-radius:4px;}
        .ml{display:block;color:#BCB6A6;text-decoration:none;font-size:18px;padding:16px 0;
          border-bottom:1px solid rgba(201,168,76,0.08);transition:color 0.2s;}
        .ml:hover,.ml.act{color:#F5F0E8;}
        @keyframes slideMenu{from{opacity:0;transform:translateY(-8px)}to{opacity:1;transform:translateY(0)}}
        @media(max-width:900px){.dNav{display:none !important;}.brg{display:flex !important;}}
        @media(min-width:901px){.brg{display:none !important;}#mobileMenu{display:none !important;}}
        @media(max-width:640px){.navWrap{padding:env(safe-area-inset-top) 20px 0 !important;}}
        @media(prefers-reduced-motion:reduce){.nl::after{transition:none;}}
      `}</style>
      <nav aria-label="Navigation principale" className="navWrap" style={{
        position:"fixed",top:0,left:0,right:0,zIndex:200,
        display:"flex",alignItems:"center",justifyContent:"space-between",
        padding:"env(safe-area-inset-top) 48px 0",height:"calc(68px + env(safe-area-inset-top))",
        background:scrolled?"rgba(8,8,8,0.97)":"rgba(8,8,8,0.9)",
        backdropFilter:"blur(28px)",WebkitBackdropFilter:"blur(28px)",
        borderBottom:scrolled?"1px solid rgba(201,168,76,0.2)":"1px solid rgba(201,168,76,0.07)",
        boxShadow:scrolled?"0 4px 32px rgba(0,0,0,0.5)":"none",
        transition:"background 0.3s,border-color 0.3s,box-shadow 0.3s",
      }}>
        <Link href="/" aria-label="QRowg — accueil" style={{textDecoration:"none",display:"inline-flex",transition:"transform 0.2s var(--mo-ease-spring)"}}
          onMouseEnter={e=>{(e.currentTarget as HTMLElement).style.transform="scale(1.04)"}}
          onMouseLeave={e=>{(e.currentTarget as HTMLElement).style.transform="none"}}>
          <QrowgLogo size={22} />
        </Link>
        <div className="dNav" role="menubar" style={{display:"flex",alignItems:"center",gap:32}}>
          {NAV_LINKS.map(({label,href})=>{
            const id=href.replace("#",""); const isAct=active===id
            return(<Link key={href} href={href} role="menuitem" aria-current={isAct?"page":undefined}
              className={"nl"+(isAct?" act":"")}
              style={{color:isAct?"#F5F0E8":"#BCB6A6",textDecoration:"none",fontSize:14,
                fontWeight:isAct?600:400,position:"relative",paddingBottom:2,transition:"color 0.2s"}}>{label}</Link>)
          })}
        </div>
        <div className="dNav" style={{display:"flex",alignItems:"center",gap:16}}>
          {authed ? (
            <Link href="/dashboard" className="nct" style={{
              background:"linear-gradient(90deg,#C9A84C,#b8953f)",color:"#080808",
              textDecoration:"none",fontSize:14,fontWeight:700,padding:"9px 22px",borderRadius:10,
              display:"inline-block",boxShadow:"0 2px 16px rgba(201,168,76,0.3)",
              transition:"transform 0.2s var(--mo-ease-spring),box-shadow 0.2s",
            }}
              onMouseEnter={e=>{const el=e.currentTarget as HTMLElement;el.style.transform="translateY(-2px) scale(1.03)";el.style.boxShadow="0 6px 24px rgba(201,168,76,0.5)"}}
              onMouseLeave={e=>{const el=e.currentTarget as HTMLElement;el.style.transform="none";el.style.boxShadow="0 2px 16px rgba(201,168,76,0.3)"}}>
              Mon espace →
            </Link>
          ) : (<>
            <Link href="/auth/login" className="nl"
              style={{color:"#BCB6A6",textDecoration:"none",fontSize:14,position:"relative",paddingBottom:2,transition:"color 0.2s"}}>Connexion</Link>
            <Link href="/creer" className="nct" style={{
              background:"linear-gradient(90deg,#C9A84C,#b8953f)",color:"#080808",
              textDecoration:"none",fontSize:14,fontWeight:700,padding:"9px 22px",borderRadius:10,
              display:"inline-block",boxShadow:"0 2px 16px rgba(201,168,76,0.3)",
              transition:"transform 0.2s var(--mo-ease-spring),box-shadow 0.2s",
            }}
              onMouseEnter={e=>{const el=e.currentTarget as HTMLElement;el.style.transform="translateY(-2px) scale(1.03)";el.style.boxShadow="0 6px 24px rgba(201,168,76,0.5)"}}
              onMouseLeave={e=>{const el=e.currentTarget as HTMLElement;el.style.transform="none";el.style.boxShadow="0 2px 16px rgba(201,168,76,0.3)"}}>
              Composer ma page
            </Link>
          </>)}
        </div>
        {/* Burger — sibling direct de <nav> (hors .dNav, sinon masqué par display:none parent en mobile) */}
        <button onClick={()=>setMenuOpen(o=>!o)} aria-label={menuOpen?"Fermer le menu":"Ouvrir le menu"}
          aria-expanded={menuOpen} aria-controls="mobileMenu" className="brg"
          style={{display:"none",background:menuOpen?"rgba(201,168,76,0.14)":"rgba(255,255,255,0.05)",
            border:"1px solid rgba(201,168,76,0.28)",borderRadius:11,cursor:"pointer",
            width:44,height:44,flexDirection:"column",gap:5,alignItems:"center",justifyContent:"center",
            transition:"background 0.2s,border-color 0.2s"}}>
          {[
            {tf:menuOpen?"rotate(45deg) translate(5px,5px)":"none",op:1},
            {tf:"none",op:menuOpen?0:1},
            {tf:menuOpen?"rotate(-45deg) translate(5px,-5px)":"none",op:1},
          ].map((s,i)=>(
            <span key={i} style={{display:"block",width:22,height:2,background:"#C9A84C",
              borderRadius:2,transform:s.tf,opacity:s.op,transition:"transform 0.25s,opacity 0.2s"}}/>
          ))}
        </button>
      </nav>
      {menuOpen&&(
        <div id="mobileMenu" role="dialog" aria-label="Menu mobile" style={{
          position:"fixed",top:"calc(68px + env(safe-area-inset-top))",left:0,right:0,bottom:0,zIndex:199,
          background:"rgba(8,8,8,0.97)",backdropFilter:"blur(20px)",
          padding:"32px",display:"flex",flexDirection:"column",
          animation:"slideMenu 0.25s ease",overflowY:"auto",
        }}>
          {NAV_LINKS.map(({label,href})=>(
            <Link key={href} href={href}
              className={"ml"+(active===href.replace("#","")?" act":"")}
              onClick={()=>setMenuOpen(false)}>{label}</Link>
          ))}
          <div style={{marginTop:32,display:"flex",flexDirection:"column",gap:12}}>
            {authed ? (
              <Link href="/dashboard" onClick={()=>setMenuOpen(false)} style={{
                display:"block",textAlign:"center",
                background:"linear-gradient(90deg,#C9A84C,#b8953f)",
                color:"#080808",textDecoration:"none",fontSize:16,fontWeight:700,
                padding:"16px",borderRadius:12,boxShadow:"0 4px 24px rgba(201,168,76,0.4)"}}>
                Mon espace →</Link>
            ) : (<>
              <Link href="/auth/login" onClick={()=>setMenuOpen(false)} style={{
                display:"block",textAlign:"center",color:"#BCB6A6",textDecoration:"none",
                fontSize:16,padding:"14px",border:"1px solid rgba(201,168,76,0.15)",borderRadius:12}}>Connexion</Link>
              <Link href="/creer" onClick={()=>setMenuOpen(false)} style={{
                display:"block",textAlign:"center",
                background:"linear-gradient(90deg,#C9A84C,#b8953f)",
                color:"#080808",textDecoration:"none",fontSize:16,fontWeight:700,
                padding:"16px",borderRadius:12,boxShadow:"0 4px 24px rgba(201,168,76,0.4)"}}>
                Composer ma page →</Link>
            </>)}
          </div>
        </div>
      )}
    </>
  )
}

// ── How it works ──────────────────────────────────────────────────────────────
// La boucle QRowg : le système, du support physique à la mesure, en 6 temps.
const HOW_STEPS = [
  {icon:"✏️", title:"Créer",       desc:"Composez votre page : menu, portfolio, promo, contact…"},
  {icon:"🔗", title:"Connecter",   desc:"Générez le QR code dynamique relié à cette page."},
  {icon:"🎨", title:"Personnaliser",desc:"Couleurs, logo, style — le QR et la page à votre image."},
  {icon:"🖨️", title:"Imprimer",    desc:"Affiche, sticker, carte, chevalet, flyer — prêt à imprimer."},
  {icon:"🎯", title:"Convertir",   desc:"Réservation, WhatsApp, appel, achat, avis Google."},
  {icon:"📊", title:"Mesurer",     desc:"Suivez chaque scan et optimisez ce qui marche."},
] as const
function HowItWorks() {
  const {ref,visible}=useInView(0.08)
  return(
    <section id="how" ref={ref} aria-labelledby="how-title"
      style={{padding:"100px 48px",position:"relative",zIndex:1}}>
      <style>{`
        .hsteps{display:grid;grid-template-columns:repeat(3,1fr);gap:28px;position:relative;}
        .hstep{display:flex;flex-direction:column;align-items:center;text-align:center;gap:16px;}
        .hbadge{transition:transform 0.3s var(--mo-ease-spring),box-shadow 0.3s ease,border-color 0.3s ease;}
        .hstep:hover .hbadge{transform:translateY(-6px) scale(1.05);border-color:rgba(201,168,76,0.6)!important;box-shadow:0 16px 38px rgba(201,168,76,0.3),0 0 0 7px rgba(8,8,8,0.92)!important;}
        .hline{display:none;position:absolute;top:31px;left:calc(16.66% + 36px);right:calc(16.66% + 36px);height:2px;
          background:linear-gradient(90deg,transparent,rgba(201,168,76,0.55) 6%,rgba(201,168,76,0.55) 94%,transparent);
          box-shadow:0 0 14px rgba(201,168,76,0.3);pointer-events:none;}
        .hline-v{display:none;}
        @media(max-width:900px){.hsteps{grid-template-columns:1fr!important;gap:0!important;}
          .hline{display:none!important;}
          .hline-v{display:block;position:absolute;top:40px;bottom:40px;left:31px;width:2px;z-index:0;
            background:linear-gradient(180deg,transparent,rgba(201,168,76,0.5) 5%,rgba(201,168,76,0.5) 95%,transparent);
            box-shadow:0 0 12px rgba(201,168,76,0.25);pointer-events:none;}
          .hstep{flex-direction:row!important;text-align:left!important;align-items:flex-start!important;
            gap:20px!important;padding:24px 0!important;border-bottom:1px solid rgba(201,168,76,0.07)!important;
            position:relative!important;z-index:1!important;}
          .hstep:last-child{border-bottom:none!important;}}
        @media(max-width:640px){#how{padding:72px 24px!important;}}
      `}</style>
      <div style={{maxWidth:1140,margin:"0 auto 72px",textAlign:"center",
        opacity:visible?1:0,transform:visible?"translateY(0)":"translateY(24px)",
        transition:"opacity 0.6s ease,transform 0.6s ease"}}>
        <Eyebrow>Le système QRowg</Eyebrow>
        <h2 id="how-title" style={{fontFamily:"Fraunces, serif",fontSize:"clamp(28px,4vw,52px)",
          color:"#F5F0E8",fontWeight:700,margin:"0 auto",lineHeight:1.12,maxWidth:640,letterSpacing:"-0.02em"}}>
          Du support physique{" "}<span style={{color:"#C9A84C"}}>à la mesure</span>
        </h2>
      </div>
      <div style={{maxWidth:1140,margin:"0 auto",position:"relative"}}>
        <div aria-hidden="true" className="hline" style={{opacity:visible?1:0,transition:"opacity 0.8s ease 0.3s"}}/>
        <div aria-hidden="true" className="hline-v" style={{opacity:visible?1:0,transition:"opacity 0.8s ease 0.3s"}}/>
        <div className="hsteps">
          {HOW_STEPS.map((step,i)=>(
            <div key={step.title} className="hstep"
              style={{opacity:visible?1:0,transform:visible?"translateY(0)":"translateY(28px)",
                transition:`opacity 0.55s ease ${i*110}ms,transform 0.55s ease ${i*110}ms`}}>
              <div style={{position:"relative",flexShrink:0}}>
                <span style={{position:"absolute",top:-7,right:-9,width:23,height:23,borderRadius:"50%",
                  background:"linear-gradient(135deg,#d4a843,#C9A84C,#b8953f)",display:"flex",alignItems:"center",
                  justifyContent:"center",fontSize:11,fontWeight:800,color:"#080808",zIndex:2,
                  boxShadow:"0 0 0 3px #080808, 0 3px 10px rgba(201,168,76,0.5)"}}>{i+1}</span>
                <div className="hbadge" style={{width:64,height:64,borderRadius:18,
                  background:"linear-gradient(135deg,rgba(201,168,76,0.16),rgba(201,168,76,0.05))",
                  border:"1px solid rgba(201,168,76,0.35)",display:"flex",alignItems:"center",
                  justifyContent:"center",fontSize:27,boxShadow:"0 8px 22px rgba(0,0,0,0.4), 0 0 0 6px rgba(8,8,8,0.92)"}}>{step.icon}</div>
              </div>
              <div style={{display:"flex",flexDirection:"column",gap:8}}>
                <h3 style={{color:"#F5F0E8",fontSize:16.5,fontWeight:700,margin:0,lineHeight:1.3,letterSpacing:"-0.01em"}}>{step.title}</h3>
                <p style={{color:"rgba(200,194,178,0.9)",fontSize:14.5,margin:0,lineHeight:1.6}}>{step.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
      <div style={{textAlign:"center",marginTop:64,opacity:visible?1:0,transition:"opacity 0.6s ease 0.7s"}}>
        <a href="/creer" style={{display:"inline-flex",alignItems:"center",gap:10,
          background:"transparent",border:"1px solid rgba(201,168,76,0.3)",
          color:"#C9A84C",textDecoration:"none",fontSize:14,fontWeight:600,
          padding:"12px 28px",borderRadius:10,transition:"all 0.2s ease"}}
          onMouseEnter={e=>{const el=e.currentTarget as HTMLElement;el.style.background="rgba(201,168,76,0.08)";el.style.borderColor="rgba(201,168,76,0.55)"}}
          onMouseLeave={e=>{const el=e.currentTarget as HTMLElement;el.style.background="transparent";el.style.borderColor="rgba(201,168,76,0.3)"}}>
          Composer ma page — sans compte <span style={{fontSize:16}}>→</span>
        </a>
      </div>
    </section>
  )
}

// ── Builder section ───────────────────────────────────────────────────────────
// Mini-builder JOUABLE : cliquer un bloc l'ajoute/retire dans le canvas ET dans
// l'aperçu téléphone, en direct. Un sélecteur d'accent recolore tout instantanément.
const BM_BLOCKS = [
  { key: "profil", icon: "👤", label: "Profil" },
  { key: "liens", icon: "🔗", label: "Liens" },
  { key: "galerie", icon: "📸", label: "Galerie" },
  { key: "whatsapp", icon: "💬", label: "WhatsApp" },
  { key: "reservation", icon: "📅", label: "Réservation" },
  { key: "paiement", icon: "💳", label: "Paiement" },
] as const
const BM_ACCENTS = ["#C9A84C", "#38BDF8", "#39FF8F", "#F97316", "#A78BFA"]
const BM_COL: Record<string, string> = { profil: "", liens: "#38BDF8", galerie: "#A78BFA", whatsapp: "#39FF8F", reservation: "#F97316", paiement: "#F43F5E" }

function BuilderMockup() {
  const [added, setAdded] = useState<string[]>(["profil", "liens", "galerie"])
  const [accent, setAccent] = useState("#C9A84C")
  const toggle = (k: string) => setAdded(a => a.includes(k) ? a.filter(x => x !== k) : [...a, k])
  const col = (k: string) => (k === "profil" ? accent : BM_COL[k])

  const canvasBlock = (k: string) => {
    const c = col(k)
    if (k === "profil") return (
      <div key={k} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8, padding: "16px 12px", background: `${accent}0d`, border: `1px dashed ${accent}55`, borderRadius: 10 }}>
        <div style={{ width: 44, height: 44, borderRadius: "50%", background: `linear-gradient(135deg,${accent},${accent}bb)`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18 }}>👤</div>
        <div style={{ height: 7, width: "60%", borderRadius: 4, background: "rgba(245,240,232,0.22)" }} />
        <div style={{ height: 5, width: "40%", borderRadius: 4, background: "rgba(245,240,232,0.12)" }} />
      </div>
    )
    if (k === "galerie") return (
      <div key={k} style={{ padding: "10px 12px", borderRadius: 9, background: `${c}10`, border: `1px solid ${c}22`, display: "flex", gap: 6 }}>
        {[0, 1, 2].map(i => <div key={i} style={{ flex: 1, height: 28, borderRadius: 6, background: `${c}33` }} />)}
      </div>
    )
    const labels: Record<string, string> = { liens: "Mes liens", whatsapp: "Discuter sur WhatsApp", reservation: "Réserver", paiement: "Payer" }
    const icon = BM_BLOCKS.find(b => b.key === k)?.icon
    return (
      <div key={k} style={{ padding: "11px 12px", borderRadius: 9, background: `${c}12`, border: `1px solid ${c}30`, display: "flex", alignItems: "center", gap: 9 }}>
        <span style={{ fontSize: 14 }}>{icon}</span>
        <div style={{ height: 6, flex: 1, borderRadius: 3, background: `${c}55` }} />
      </div>
    )
  }

  return (
    <div className="bm" style={{ display: "grid", gridTemplateColumns: "1fr 2.2fr 1fr", gap: 12, alignItems: "start", maxWidth: 820, margin: "0 auto" }}>
      {/* Palette de blocs (cliquables) */}
      <div style={{ background: "rgba(255,255,255,0.025)", border: "1px solid rgba(201,168,76,0.12)", borderRadius: 14, padding: "14px 10px", display: "flex", flexDirection: "column", gap: 6 }}>
        <p style={{ color: "rgba(201,168,76,0.7)", fontSize: 9, letterSpacing: 1.5, textTransform: "uppercase", fontWeight: 700, marginBottom: 4, paddingLeft: 4 }}>Blocs · cliquez</p>
        {BM_BLOCKS.map(b => { const on = added.includes(b.key); return (
          <button key={b.key} type="button" onClick={() => toggle(b.key)} aria-pressed={on}
            style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 10px", borderRadius: 9, cursor: "pointer", textAlign: "left",
              background: on ? "rgba(201,168,76,0.14)" : "rgba(255,255,255,0.03)", border: `1px solid ${on ? "rgba(201,168,76,0.4)" : "rgba(255,255,255,0.06)"}`, transition: "all .15s" }}>
            <span style={{ fontSize: 14 }}>{b.icon}</span>
            <span style={{ color: on ? "#F5F0E8" : "rgba(245,240,232,0.7)", fontSize: 11, fontWeight: on ? 700 : 500 }}>{b.label}</span>
            <span style={{ marginLeft: "auto", width: 16, height: 16, borderRadius: "50%", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, fontWeight: 800, background: on ? "#C9A84C" : "rgba(255,255,255,0.08)", color: on ? "#080808" : "rgba(245,240,232,0.5)" }}>{on ? "✓" : "+"}</span>
          </button>
        ) })}
      </div>

      {/* Canvas — se construit en direct */}
      <div style={{ background: "rgba(255,255,255,0.018)", border: "1px solid rgba(201,168,76,0.15)", borderRadius: 16, padding: 16, display: "flex", flexDirection: "column", gap: 10, minHeight: 220 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, paddingBottom: 10, borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
          {["var(--danger)", "#F97316", "var(--success)"].map((c, i) => <div key={i} style={{ width: 8, height: 8, borderRadius: "50%", background: c, opacity: 0.6 }} />)}
          <span style={{ flex: 1, textAlign: "center", color: "rgba(201,168,76,0.5)", fontSize: 10, letterSpacing: 1 }}>Canvas</span>
          <div style={{ padding: "3px 10px", borderRadius: 5, background: `${accent}20`, border: `1px solid ${accent}40`, fontSize: 9, color: accent, fontWeight: 700 }}>PUBLIER</div>
        </div>
        {added.length === 0
          ? <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", color: "rgba(188,182,166,0.5)", fontSize: 12, textAlign: "center", padding: "24px 12px" }}>Cliquez un bloc à gauche pour construire votre page ✨</div>
          : <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>{added.map(canvasBlock)}</div>}
      </div>

      {/* Aperçu téléphone + accent */}
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 10 }}>
        <p style={{ color: "rgba(201,168,76,0.5)", fontSize: 9, letterSpacing: 2, textTransform: "uppercase", fontWeight: 700 }}>Aperçu</p>
        <div style={{ width: 92, border: "2px solid rgba(201,168,76,0.25)", borderRadius: 18, padding: "10px 7px", background: "rgba(8,8,8,0.85)", boxShadow: "0 0 24px rgba(201,168,76,0.08)", display: "flex", flexDirection: "column", minHeight: 150 }}>
          <div style={{ width: 24, height: 4, borderRadius: 2, background: "rgba(255,255,255,0.1)", margin: "0 auto 8px" }} />
          <div style={{ display: "flex", flexDirection: "column", gap: 5, alignItems: "center" }}>
            {added.includes("profil") && <div style={{ width: 26, height: 26, borderRadius: "50%", background: `linear-gradient(135deg,${accent},${accent}bb)`, marginBottom: 2, transition: "background .2s" }} />}
            {added.filter(k => k !== "profil").map((k, i) => (
              <div key={i} style={{ height: k === "galerie" ? 22 : 14, width: "88%", borderRadius: 5, background: `${col(k)}55`, transition: "background .2s" }} />
            ))}
            {added.length === 0 && <div style={{ color: "rgba(188,182,166,0.35)", fontSize: 8, textAlign: "center", marginTop: 20 }}>vide</div>}
          </div>
        </div>
        {/* Accent live */}
        <div style={{ display: "flex", gap: 6 }}>
          {BM_ACCENTS.map(c => (
            <button key={c} type="button" onClick={() => setAccent(c)} aria-label={`Accent ${c}`}
              style={{ width: 18, height: 18, borderRadius: "50%", background: c, cursor: "pointer", border: accent === c ? "2px solid #F5F0E8" : "2px solid transparent", boxShadow: accent === c ? `0 0 0 2px ${c}` : "none", padding: 0 }} />
          ))}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 5, padding: "4px 10px", borderRadius: 20, background: "rgba(57,255,143,0.08)", border: "1px solid rgba(57,255,143,0.2)" }}>
          <div style={{ width: 5, height: 5, borderRadius: "50%", background: "var(--success)", animation: "livePulse 1.5s ease-in-out infinite" }} />
          <span style={{ color: "var(--success)", fontSize: 9, fontWeight: 700, letterSpacing: 1 }}>LIVE</span>
        </div>
      </div>
    </div>
  )
}
function BuilderSection(){
  const {ref,visible}=useInView(0.07)
  const BEN=[
    {icon:"🧱",title:"Blocs prêts à l'emploi",desc:"Profil, liens, galerie, WhatsApp, paiement — tout y est."},
    {icon:"🎨",title:"Modèles par métier",desc:"Restaurant, indépendant, artiste, coach — adaptés dès le départ."},
    {icon:"📱",title:"Aperçu mobile instantané",desc:"Voyez le rendu en temps réel pendant que vous modifiez votre page."},
  ]
  return(
    <section id="builder" ref={ref} aria-labelledby="builder-title"
      style={{
        padding:"100px 48px",position:"relative",zIndex:1,
        background:"radial-gradient(120% 70% at 50% 50%, rgba(201,168,76,0.05), transparent 60%), linear-gradient(180deg, rgba(0,0,0,0.45), rgba(0,0,0,0.25))",
        borderTop:"1px solid rgba(255,255,255,0.04)",
        borderBottom:"1px solid rgba(255,255,255,0.04)",
        boxShadow:"inset 0 30px 60px -40px rgba(0,0,0,0.8), inset 0 -30px 60px -40px rgba(0,0,0,0.8)",
      }}>
      <style>{`
        @keyframes livePulse{0%,100%{opacity:1;transform:scale(1)}50%{opacity:0.5;transform:scale(1.3)}}
        @media(max-width:900px){.bm{grid-template-columns:1fr 1fr!important;}}
        @media(max-width:640px){#builder{padding:72px 20px!important;}.bm{grid-template-columns:1fr!important;}}
        @media(max-width:900px){.bben{grid-template-columns:1fr!important;}}
      `}</style>
      <div style={{maxWidth:1140,margin:"0 auto"}}>
        <div style={{textAlign:"center",marginBottom:64,opacity:visible?1:0,
          transform:visible?"translateY(0)":"translateY(24px)",transition:"opacity 0.6s,transform 0.6s"}}>
          <p style={{color:"#C9A84C",fontSize:11,letterSpacing:3.5,textTransform:"uppercase",fontWeight:600,marginBottom:16}}>Éditeur</p>
          <h2 id="builder-title" style={{fontFamily:"Fraunces, serif",fontSize:"clamp(28px,4vw,52px)",
            color:"#F5F0E8",fontWeight:700,margin:"0 auto 20px",lineHeight:1.1,maxWidth:680,letterSpacing:"-0.02em"}}>
            Créez une page professionnelle{" "}<span style={{color:"#C9A84C"}}>en quelques minutes.</span>
          </h2>
          <p style={{color:"rgba(188,182,166,0.85)",fontSize:16,maxWidth:540,margin:"0 auto",lineHeight:1.7}}>
            <strong style={{color:"#F5F0E8",fontWeight:600}}>Essayez maintenant</strong> : cliquez un bloc à gauche, il apparaît dans votre page. Changez la couleur — tout se met à jour en direct.
          </p>
        </div>
        <div style={{opacity:visible?1:0,transform:visible?"translateY(0)":"translateY(32px)",
          transition:"opacity 0.7s ease 0.15s,transform 0.7s ease 0.15s",marginBottom:56}}>
          <BuilderMockup/>
        </div>
        <div className="bben" style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:16,maxWidth:860,margin:"0 auto"}}>
          {BEN.map((b,i)=>(
            <div key={b.title} style={{display:"flex",flexDirection:"column",gap:10,padding:"20px",
              background:"rgba(255,255,255,0.02)",border:"1px solid rgba(201,168,76,0.1)",borderRadius:14,
              opacity:visible?1:0,transform:visible?"translateY(0)":"translateY(20px)",
              transition:`opacity 0.5s ease ${0.35+i*0.1}s,transform 0.5s ease ${0.35+i*0.1}s`}}>
              <span style={{fontSize:22}}>{b.icon}</span>
              <h3 style={{color:"#F5F0E8",fontSize:14,fontWeight:700,margin:0}}>{b.title}</h3>
              <p style={{color:"rgba(200,194,178,0.9)",fontSize:14,margin:0,lineHeight:1.6}}>{b.desc}</p>
            </div>
          ))}
        </div>
        <div style={{textAlign:"center",marginTop:48,opacity:visible?1:0,transition:"opacity 0.6s ease 0.7s"}}>
          <a href="/dashboard/builder/new" style={{display:"inline-flex",alignItems:"center",gap:10,
            background:"linear-gradient(90deg,#C9A84C,#b8953f)",color:"#080808",textDecoration:"none",
            fontSize:14,fontWeight:700,padding:"13px 30px",borderRadius:11,
            boxShadow:"0 4px 24px rgba(201,168,76,0.35)",transition:"transform 0.2s var(--mo-ease-spring),box-shadow 0.2s"}}
            onMouseEnter={e=>{const el=e.currentTarget as HTMLElement;el.style.transform="translateY(-3px) scale(1.03)";el.style.boxShadow="0 8px 32px rgba(201,168,76,0.5)"}}
            onMouseLeave={e=>{const el=e.currentTarget as HTMLElement;el.style.transform="none";el.style.boxShadow="0 4px 24px rgba(201,168,76,0.35)"}}>
            Ouvrir le builder <span style={{fontSize:16}}>→</span>
          </a>
        </div>
      </div>
    </section>
  )
}

// ── QR Dynamique section ──────────────────────────────────────────────────────

// Mini QR code SVG généré en pur SVG (performance max, 0 dépendance)
function QRMiniSvg({ fg, bg, accent, size = 80 }: { fg: string; bg: string; accent: string; size?: number }) {
  // Matrice QR simplifiée 7x7 (pattern visuel, pas un vrai QR scannable)
  const matrix = [
    [1,1,1,1,1,1,1,0,1,0,0,1,0,1,1,1,1,1,1,1,1],
    [1,0,0,0,0,0,1,0,0,1,1,0,0,0,1,0,0,0,0,0,1],
    [1,0,1,1,1,0,1,0,1,0,1,1,0,0,1,0,1,1,1,0,1],
    [1,0,1,1,1,0,1,0,0,1,0,1,1,0,1,0,1,1,1,0,1],
    [1,0,1,1,1,0,1,0,1,1,0,0,1,0,1,0,1,1,1,0,1],
    [1,0,0,0,0,0,1,0,1,0,1,1,0,0,1,0,0,0,0,0,1],
    [1,1,1,1,1,1,1,0,1,0,1,0,1,0,1,1,1,1,1,1,1],
    [0,0,0,0,0,0,0,0,1,1,0,1,0,0,0,0,0,0,0,0,0],
    [1,0,1,1,0,0,1,1,0,1,1,0,1,1,1,0,1,0,1,1,0],
    [0,1,0,0,1,1,0,1,1,0,0,1,0,1,0,1,0,1,0,0,1],
    [1,1,0,1,0,1,1,0,1,1,0,0,1,0,1,1,0,0,1,1,0],
    [0,0,1,0,1,0,0,0,0,1,1,0,0,1,0,0,1,1,0,1,1],
    [1,0,1,0,0,1,1,1,0,1,0,1,1,0,1,0,1,0,0,1,0],
    [0,0,0,0,0,0,0,0,1,0,1,1,0,0,0,0,0,1,0,1,0],
    [1,1,1,1,1,1,1,0,0,1,0,0,1,0,1,0,0,0,1,0,1],
    [1,0,0,0,0,0,1,0,1,0,1,1,0,1,1,1,1,0,0,1,0],
    [1,0,1,1,1,0,1,0,0,1,0,0,1,0,0,0,0,1,1,0,1],
    [1,0,1,1,1,0,1,0,1,0,1,0,0,1,1,0,1,0,1,0,0],
    [1,0,1,1,1,0,1,0,0,1,1,0,1,0,0,1,0,1,0,1,1],
    [1,0,0,0,0,0,1,0,1,1,0,1,0,1,1,0,1,0,1,0,0],
    [1,1,1,1,1,1,1,0,0,0,1,0,1,0,0,1,0,0,0,1,0],
  ]
  const cols = matrix[0].length
  const rows = matrix.length
  const cell = size / Math.max(cols, rows)
  // Cellules dorées (centre)
  const goldCells = new Set(['10-10','10-11','11-10','9-10','10-9'])

  return (
    <svg width={size} height={size} viewBox={"0 0 " + size + " " + size}
      xmlns="http://www.w3.org/2000/svg" style={{ display:"block" }}>
      <rect width={size} height={size} fill={bg} rx={4}/>
      {matrix.map((row, r) =>
        row.map((cell_val, c) => {
          if (!cell_val) return null
          const isGold = goldCells.has(r + "-" + c)
          return (
            <rect key={r + "-" + c}
              x={c * cell + 1} y={r * cell + 1}
              width={cell - 1.5} height={cell - 1.5}
              rx={1}
              fill={isGold ? accent : fg}
            />
          )
        })
      )}
    </svg>
  )
}

const QR_STYLES = [
  {
    id: "classic",
    name: "Classic",
    desc: "Intemporel",
    fg: "#1a1a1a", bg: "#ffffff", accent: "#C9A84C",
    cardBg: "rgba(255,255,255,0.04)",
    border: "rgba(255,255,255,0.1)",
    tag: "#BCB6A6",
  },
  {
    id: "gold",
    name: "Gold",
    desc: "Premium",
    fg: "#C9A84C", bg: "#111009", accent: "#F5F0E8",
    cardBg: "rgba(201,168,76,0.06)",
    border: "rgba(201,168,76,0.3)",
    tag: "#C9A84C",
  },
  {
    id: "neon",
    name: "Neon",
    desc: "Impact",
    fg: "var(--success)", bg: "#050505", accent: "#A78BFA",
    cardBg: "rgba(57,255,143,0.05)",
    border: "rgba(57,255,143,0.25)",
    tag: "var(--success)",
  },
  {
    id: "sunset",
    name: "Sunset",
    desc: "Chaleureux",
    fg: "#F97316", bg: "#0d0805", accent: "#F43F5E",
    cardBg: "rgba(249,115,22,0.06)",
    border: "rgba(249,115,22,0.25)",
    tag: "#F97316",
  },
  {
    id: "business",
    name: "Business",
    desc: "Institutionnel",
    fg: "var(--action)", bg: "#030d14", accent: "#7C3AED",
    cardBg: "rgba(56,189,248,0.05)",
    border: "rgba(56,189,248,0.2)",
    tag: "var(--action)",
  },
] as const

const QR_BENEFITS = [
  { icon: "🔄", text: "Destination modifiable à tout moment" },
  { icon: "🎨", text: "Couleurs et styles personnalisés" },
  { icon: "⬇️", text: "Téléchargement PNG · SVG · PDF" },
  { icon: "📊", text: "Analytics par scan en temps réel" },
  { icon: "🖨️", text: "Résolution print HD incluse" },
] as const

function QRDynamicSection() {
  const { ref, visible } = useInView(0.07)
  const [active, setActive] = useState(0)

  return (
    <section id="qr-dynamique" ref={ref} aria-labelledby="qr-dyn-title"
      style={{ padding: "100px 48px", position: "relative", zIndex: 1, overflow: "hidden" }}>
      <style>{`
        .qr-grid { display:grid; grid-template-columns:repeat(5,1fr); gap:16px; }
        .qr-card { display:flex; flex-direction:column; align-items:center; gap:14px;
          padding:20px 16px; border-radius:18px; cursor:pointer;
          transition:transform 0.3s var(--mo-ease-spring), border-color 0.25s, background 0.25s; }
        .qr-card:hover { transform:translateY(-6px) scale(1.03); }
        .qr-card:focus-visible { outline:2px solid rgba(201,168,76,0.6); outline-offset:4px; border-radius:18px; }
        .qr-ben { display:flex; flex-direction:column; gap:14px; }
        @media(max-width:900px){ .qr-grid{ grid-template-columns:repeat(3,1fr)!important; } }
        @media(max-width:580px){
          .qr-grid{ grid-template-columns:repeat(2,1fr)!important; gap:10px!important; }
          #qr-dynamique{ padding:72px 20px!important; }
        }
        @keyframes qrFloat { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-8px)} }
        @keyframes qrGlow  { 0%,100%{opacity:0.4} 50%{opacity:1} }
      `}</style>

      {/* Ambiance dorée (impression / QR) — variation de fond par section */}
      <div aria-hidden="true" style={{ position: "absolute", inset: 0, zIndex: 0, pointerEvents: "none" }}>
        <div style={{ position: "absolute", top: "0%", right: "-6%", width: "min(640px,72vw)", height: 560, borderRadius: "50%", background: "radial-gradient(circle, rgba(201,168,76,0.09), transparent 64%)", filter: "blur(54px)" }} />
      </div>

      <div style={{ maxWidth: 1140, margin: "0 auto", position: "relative", zIndex: 1 }}>

        {/* Header */}
        <div style={{
          display: "grid", gridTemplateColumns: "1fr 1fr", gap: 64,
          alignItems: "center", marginBottom: 72,
        }} className="qr-header">
          <div style={{
            opacity: visible ? 1 : 0,
            transform: visible ? "translateY(0)" : "translateY(24px)",
            transition: "opacity 0.6s ease, transform 0.6s ease",
          }}>
            <p style={{ color: "#C9A84C", fontSize: 11, letterSpacing: 3.5,
              textTransform: "uppercase", fontWeight: 600, marginBottom: 16 }}>
              QR Codes dynamiques
            </p>
            <h2 id="qr-dyn-title" style={{
              fontFamily: "Fraunces, serif",
              fontSize: "clamp(28px, 3.5vw, 48px)",
              color: "#F5F0E8", fontWeight: 700,
              margin: "0 0 20px", lineHeight: 1.1,
              letterSpacing: "-0.02em",
            }}>
              Un QR code dynamique,{" "}
              <span style={{ color: "#C9A84C" }}>pas une image figée.</span>
            </h2>
            <p style={{ color: "rgba(188,182,166,0.85)", fontSize: 16,
              lineHeight: 1.7, marginBottom: 36, maxWidth: 440 }}>
              Modifiez votre page ou votre destination sans jamais réimprimer votre QR code.
            </p>

            {/* Bénéfices */}
            <div className="qr-ben">
              {QR_BENEFITS.map((b, i) => (
                <div key={i} style={{
                  display: "flex", alignItems: "center", gap: 12,
                  opacity: visible ? 1 : 0,
                  transform: visible ? "translateX(0)" : "translateX(-16px)",
                  transition: `opacity 0.5s ease ${0.2 + i * 0.08}s, transform 0.5s ease ${0.2 + i * 0.08}s`,
                }}>
                  <span style={{
                    width: 28, height: 28, borderRadius: 8, flexShrink: 0,
                    background: "rgba(201,168,76,0.1)",
                    border: "1px solid rgba(201,168,76,0.2)",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: 13,
                  }}>{b.icon}</span>
                  <span style={{ color: "rgba(245,240,232,0.8)", fontSize: 13.5 }}>{b.text}</span>
                </div>
              ))}
            </div>

            {/* CTA */}
            <div style={{
              marginTop: 36,
              opacity: visible ? 1 : 0,
              transition: "opacity 0.6s ease 0.7s",
            }}>
              <a href="/creer" style={{
                display: "inline-flex", alignItems: "center", gap: 10,
                background: "linear-gradient(90deg,#C9A84C,#b8953f)",
                color: "#080808", textDecoration: "none",
                fontSize: 14, fontWeight: 700,
                padding: "12px 26px", borderRadius: 11,
                boxShadow: "0 4px 20px rgba(201,168,76,0.35)",
                transition: "transform 0.2s var(--mo-ease-spring), box-shadow 0.2s",
              }}
                onMouseEnter={e => {
                  const el = e.currentTarget as HTMLElement
                  el.style.transform = "translateY(-2px) scale(1.03)"
                  el.style.boxShadow = "0 8px 28px rgba(201,168,76,0.5)"
                }}
                onMouseLeave={e => {
                  const el = e.currentTarget as HTMLElement
                  el.style.transform = "none"
                  el.style.boxShadow = "0 4px 20px rgba(201,168,76,0.35)"
                }}>
                Personnaliser mon QR code <span style={{ fontSize: 16 }}>→</span>
              </a>
            </div>
          </div>

          {/* QR actif en grand */}
          <div style={{
            display: "flex", justifyContent: "center", alignItems: "center",
            opacity: visible ? 1 : 0,
            transition: "opacity 0.7s ease 0.2s",
          }}>
            <div style={{
              position: "relative",
              animation: "qrFloat 4s ease-in-out infinite", willChange: "transform",
            }}>
              {/* Glow */}
              <div style={{
                position: "absolute", inset: -24,
                background: "radial-gradient(circle, " + QR_STYLES[active].tag + "25 0%, transparent 65%)",
                borderRadius: "50%",
                animation: "qrGlow 3s ease-in-out infinite", willChange: "opacity",
                pointerEvents: "none",
              }} />
              {/* Card principale */}
              <div style={{
                width: 180, height: 180,
                background: QR_STYLES[active].cardBg,
                border: "1px solid " + QR_STYLES[active].border,
                borderRadius: 22,
                display: "flex", flexDirection: "column",
                alignItems: "center", justifyContent: "center",
                gap: 12,
                boxShadow: "0 0 60px " + QR_STYLES[active].tag + "30, 0 0 0 1px " + QR_STYLES[active].border,
                transition: "all 0.4s ease",
              }}>
                <QRMiniSvg
                  fg={QR_STYLES[active].fg}
                  bg={QR_STYLES[active].bg}
                  accent={QR_STYLES[active].accent}
                  size={130}
                />
                <span style={{
                  color: QR_STYLES[active].tag,
                  fontSize: 10, letterSpacing: 2.5,
                  textTransform: "uppercase", fontWeight: 700,
                }}>QROWG.COM</span>
              </div>
              {/* Badge style */}
              <div style={{
                position: "absolute", top: -10, right: -10,
                background: "linear-gradient(135deg, #C9A84C, #b8953f)",
                borderRadius: 20, padding: "4px 10px",
                fontSize: 10, fontWeight: 800, color: "#080808",
                boxShadow: "0 2px 12px rgba(201,168,76,0.5)",
              }}>{QR_STYLES[active].name}</div>
            </div>
          </div>
        </div>

        {/* Grille de styles */}
        <div style={{
          opacity: visible ? 1 : 0,
          transform: visible ? "translateY(0)" : "translateY(24px)",
          transition: "opacity 0.6s ease 0.35s, transform 0.6s ease 0.35s",
        }}>
          <p style={{ color: "rgba(188,182,166,0.6)", fontSize: 11,
            letterSpacing: 2, textTransform: "uppercase", textAlign: "center",
            marginBottom: 20 }}>Choisir un style</p>

          <div className="qr-grid">
            {QR_STYLES.map((style, i) => (
              <button
                key={style.id}
                onClick={() => setActive(i)}
                aria-pressed={active === i}
                aria-label={"Style " + style.name}
                className="qr-card"
                style={{
                  background: active === i ? style.cardBg : "rgba(255,255,255,0.015)",
                  border: "1px solid " + (active === i ? style.border : "rgba(255,255,255,0.07)"),
                  boxShadow: active === i ? "0 0 32px " + style.tag + "20" : "none",
                }}
              >
                <QRMiniSvg fg={style.fg} bg={style.bg} accent={style.accent} size={64} />
                <div style={{ textAlign: "center" }}>
                  <p style={{
                    color: active === i ? style.tag : "#F5F0E8",
                    fontSize: 13, fontWeight: 700, margin: "0 0 2px",
                    transition: "color 0.25s",
                  }}>{style.name}</p>
                  <p style={{ color: "rgba(188,182,166,0.7)", fontSize: 10, margin: 0 }}>
                    {style.desc}
                  </p>
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>

      <style>{`
        @media(max-width:900px){
          .qr-header { grid-template-columns:1fr!important; }
        }
      `}</style>
    </section>
  )
}

// ── Analytics section ─────────────────────────────────────────────────────────

// Données démo cohérentes (pas de chiffres marketing abusifs)
const ANALYTICS_DEMO = {
  stats: [
    { label: "Scans ce mois", value: "847",  delta: "+12%", color: "var(--success)",  icon: "📱" },
    { label: "Vues de page",  value: "2 341", delta: "+8%",  color: "var(--action)",  icon: "👁️" },
    { label: "Taux de clic",  value: "36%",   delta: "+4pt", color: "#C9A84C",  icon: "🎯" },
    { label: "QR actifs",     value: "5",     delta: "",      color: "#A78BFA",  icon: "✅" },
  ],
  chart: [
    { day: "L",  scans: 38,  views: 102 },
    { day: "M",  scans: 52,  views: 141 },
    { day: "M",  scans: 41,  views: 118 },
    { day: "J",  scans: 67,  views: 184 },
    { day: "V",  scans: 84,  views: 231 },
    { day: "S",  scans: 121, views: 312 },
    { day: "D",  scans: 93,  views: 248 },
  ],
  pages: [
    { name: "Ma carte pro",   scans: 312, bar: 100, color: "#C9A84C"  },
    { name: "Menu restaurant",scans: 198, bar: 63,  color: "var(--action)"  },
    { name: "Portfolio",      scans: 142, bar: 45,  color: "#A78BFA"  },
    { name: "Promo flash",    scans: 89,  bar: 28,  color: "var(--success)"  },
  ],
  devices: [
    { label: "Mobile", pct: 72, color: "#C9A84C"  },
    { label: "Tablette",pct: 18, color: "var(--action)" },
    { label: "Desktop", pct: 10, color: "#A78BFA" },
  ],
  sources: [
    { label: "Direct QR",    pct: 58, color: "#C9A84C" },
    { label: "Réseaux soc.", pct: 24, color: "#F97316" },
    { label: "Email",        pct: 11, color: "var(--action)" },
    { label: "Autre",        pct: 7,  color: "#BCB6A6" },
  ],
}

const ANALYTICS_BENEFITS = [
  { icon: "📍", text: "Savoir quels QR codes fonctionnent vraiment" },
  { icon: "📱", text: "Comprendre les appareils de vos visiteurs" },
  { icon: "🎯", text: "Optimiser vos boutons d'action et vos pages" },
  { icon: "📈", text: "Suivre votre croissance semaine après semaine" },
]

function AnalyticsMockup() {
  const maxScans = Math.max(...ANALYTICS_DEMO.chart.map(d => d.scans))
  const maxViews = Math.max(...ANALYTICS_DEMO.chart.map(d => d.views))
  const chartH = 80

  return (
    <div style={{
      background: "linear-gradient(145deg, #0e0c08, #111009)",
      border: "1px solid rgba(201,168,76,0.18)",
      borderRadius: 20, overflow: "hidden",
      boxShadow: "0 24px 80px rgba(0,0,0,0.5), 0 0 0 1px rgba(201,168,76,0.08)",
    }}>
      {/* Top bar */}
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "14px 20px",
        borderBottom: "1px solid rgba(255,255,255,0.05)",
        background: "rgba(255,255,255,0.02)",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          {["var(--danger)","#F97316","var(--success)"].map((c,i) => (
            <div key={i} style={{ width:8, height:8, borderRadius:"50%", background:c, opacity:0.6 }}/>
          ))}
          <span style={{ color:"rgba(201,168,76,0.5)", fontSize:10, letterSpacing:1.5, marginLeft:4 }}>ANALYTICS</span>
        </div>
        <div style={{
          background: "rgba(201,168,76,0.1)", border: "1px solid rgba(201,168,76,0.28)",
          borderRadius: 6, padding: "3px 10px",
          display: "flex", alignItems: "center", gap: 5,
        }} title="Données de démonstration — pas vos chiffres réels">
          <span style={{ color:"#C9A84C", fontSize:9, fontWeight:700, letterSpacing:1 }}>EXEMPLE</span>
        </div>
      </div>

      <div style={{ padding: "16px 20px", display: "flex", flexDirection: "column", gap: 16 }}>

        {/* 4 KPI */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 8 }}>
          {ANALYTICS_DEMO.stats.map((s) => (
            <div key={s.label} style={{
              background: "rgba(255,255,255,0.025)",
              border: "1px solid rgba(255,255,255,0.06)",
              borderRadius: 10, padding: "10px 10px",
              display: "flex", flexDirection: "column", gap: 4,
            }}>
              <span style={{ fontSize: 14 }}>{s.icon}</span>
              <p style={{ color: s.color, fontSize: 16, fontWeight: 800, margin: 0, lineHeight: 1 }}>{s.value}</p>
              <p style={{ color: "rgba(188,182,166,0.7)", fontSize: 9, margin: 0, lineHeight: 1.3 }}>{s.label}</p>
              {s.delta && (
                <span style={{ color: "var(--success)", fontSize: 8, fontWeight: 700 }}>{s.delta}</span>
              )}
            </div>
          ))}
        </div>

        {/* Graphique barres — scans 7 jours */}
        <div style={{
          background: "rgba(255,255,255,0.015)",
          border: "1px solid rgba(255,255,255,0.05)",
          borderRadius: 12, padding: "12px 14px",
        }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
            <p style={{ color: "#F5F0E8", fontSize: 11, fontWeight: 600, margin: 0 }}>Scans · 7 jours</p>
            <div style={{ display: "flex", gap: 10 }}>
              {[["#C9A84C","Scans"],["var(--action)","Vues"]].map(([c,l]) => (
                <div key={l as string} style={{ display:"flex", alignItems:"center", gap:4 }}>
                  <div style={{ width:6, height:6, borderRadius:2, background:c as string }}/>
                  <span style={{ color:"rgba(188,182,166,0.7)", fontSize:9 }}>{l}</span>
                </div>
              ))}
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "flex-end", gap: 8, height: chartH + 20 }}>
            {ANALYTICS_DEMO.chart.map((d, i) => (
              <div key={i} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 5, height: "100%" }}>
                {/* deux barres groupées : Vues (bleu) + Scans (or), contenues */}
                <div style={{ flex: 1, width: "100%", display: "flex", alignItems: "flex-end", justifyContent: "center", gap: 3 }}>
                  <div title={d.views + " vues"} style={{
                    width: "40%", maxWidth: 14, borderRadius: "3px 3px 0 0",
                    background: "rgba(56,189,248,0.45)",
                    height: Math.max(3, Math.round((d.views / maxViews) * chartH)) + "px",
                    transition: "height 0.4s ease",
                  }}/>
                  <div title={d.scans + " scans"} style={{
                    width: "40%", maxWidth: 14, borderRadius: "3px 3px 0 0",
                    background: "linear-gradient(to top, #C9A84C, #d4a843)",
                    height: Math.max(3, Math.round((d.scans / maxScans) * chartH)) + "px",
                    transition: "height 0.4s ease",
                  }}/>
                </div>
                <span style={{ color: "rgba(188,182,166,0.5)", fontSize: 8 }}>{d.day}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Ligne du bas: top pages + appareils + sources */}
        <div style={{ display: "grid", gridTemplateColumns: "1.4fr 1fr 1fr", gap: 10 }}>

          {/* Top pages */}
          <div style={{
            background: "rgba(255,255,255,0.015)",
            border: "1px solid rgba(255,255,255,0.05)",
            borderRadius: 12, padding: "12px",
          }}>
            <p style={{ color: "#F5F0E8", fontSize: 10, fontWeight: 600, margin: "0 0 10px" }}>Top pages</p>
            <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
              {ANALYTICS_DEMO.pages.map((p) => (
                <div key={p.name}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 3 }}>
                    <span style={{ color: "rgba(245,240,232,0.7)", fontSize: 9, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: "70%" }}>{p.name}</span>
                    <span style={{ color: p.color, fontSize: 9, fontWeight: 700, flexShrink: 0 }}>{p.scans}</span>
                  </div>
                  <div style={{ height: 3, background: "rgba(255,255,255,0.06)", borderRadius: 2 }}>
                    <div style={{ height: "100%", width: p.bar + "%", background: p.color, borderRadius: 2, opacity: 0.7 }}/>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Appareils */}
          <div style={{
            background: "rgba(255,255,255,0.015)",
            border: "1px solid rgba(255,255,255,0.05)",
            borderRadius: 12, padding: "12px",
          }}>
            <p style={{ color: "#F5F0E8", fontSize: 10, fontWeight: 600, margin: "0 0 10px" }}>Appareils</p>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {ANALYTICS_DEMO.devices.map((d) => (
                <div key={d.label}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 3 }}>
                    <span style={{ color: "rgba(245,240,232,0.7)", fontSize: 9 }}>{d.label}</span>
                    <span style={{ color: d.color, fontSize: 9, fontWeight: 700 }}>{d.pct}%</span>
                  </div>
                  <div style={{ height: 4, background: "rgba(255,255,255,0.06)", borderRadius: 2 }}>
                    <div style={{ height: "100%", width: d.pct + "%", background: d.color, borderRadius: 2, opacity: 0.8 }}/>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Sources */}
          <div style={{
            background: "rgba(255,255,255,0.015)",
            border: "1px solid rgba(255,255,255,0.05)",
            borderRadius: 12, padding: "12px",
          }}>
            <p style={{ color: "#F5F0E8", fontSize: 10, fontWeight: 600, margin: "0 0 10px" }}>Sources</p>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {ANALYTICS_DEMO.sources.map((s) => (
                <div key={s.label} style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <div style={{ width: 6, height: 6, borderRadius: "50%", background: s.color, flexShrink: 0 }}/>
                  <span style={{ color: "rgba(245,240,232,0.65)", fontSize: 9, flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{s.label}</span>
                  <span style={{ color: s.color, fontSize: 9, fontWeight: 700 }}>{s.pct}%</span>
                </div>
              ))}
            </div>
          </div>
        </div>

      </div>
    </div>
  )
}

function AnalyticsSection() {
  const { ref, visible } = useInView(0.06)
  return (
    <section id="analytics" ref={ref} aria-labelledby="analytics-title"
      style={{ padding: "100px 48px", position: "relative", zIndex: 1, overflow: "hidden" }}>
      <style>{`
        .analytics-layout { display:grid; grid-template-columns:1fr 1.5fr; gap:72px; align-items:center; }
        @media(max-width:1024px){ .analytics-layout{ grid-template-columns:1fr!important; gap:48px!important; } }
        @media(max-width:640px){ #analytics{ padding:72px 20px!important; } }
      `}</style>

      {/* Ambiance bleutée (donnée / data) — variation de fond par section */}
      <div aria-hidden="true" style={{ position: "absolute", inset: 0, zIndex: 0, pointerEvents: "none" }}>
        <div style={{ position: "absolute", top: "10%", left: "-6%", width: "min(620px,70vw)", height: 520, borderRadius: "50%", background: "radial-gradient(circle, rgba(56,189,248,0.08), transparent 64%)", filter: "blur(50px)" }} />
      </div>

      <div style={{ maxWidth: 1140, margin: "0 auto", position: "relative", zIndex: 1 }}>
        <div className="analytics-layout">

          {/* Left: texte + bénéfices */}
          <div style={{
            opacity: visible ? 1 : 0,
            transform: visible ? "translateY(0)" : "translateY(24px)",
            transition: "opacity 0.6s ease, transform 0.6s ease",
          }}>
            <p style={{ color: "#C9A84C", fontSize: 11, letterSpacing: 3.5,
              textTransform: "uppercase", fontWeight: 600, marginBottom: 16 }}>Statistiques</p>
            <h2 id="analytics-title" style={{
              fontFamily: "Fraunces, serif",
              fontSize: "clamp(26px, 3.5vw, 46px)",
              color: "#F5F0E8", fontWeight: 700,
              margin: "0 0 20px", lineHeight: 1.12,
              letterSpacing: "-0.02em",
            }}>
              Comprenez ce qui se passe{" "}
              <span style={{ color: "#C9A84C" }}>après chaque scan.</span>
            </h2>
            <p style={{ color: "rgba(188,182,166,0.85)", fontSize: 15,
              lineHeight: 1.75, marginBottom: 36, maxWidth: 400 }}>
              Suivi des vues, scans, appareils, sources et pages les plus performantes.
            </p>

            <div style={{ display: "flex", flexDirection: "column", gap: 14, marginBottom: 40 }}>
              {ANALYTICS_BENEFITS.map((b, i) => (
                <div key={i} style={{
                  display: "flex", alignItems: "center", gap: 12,
                  opacity: visible ? 1 : 0,
                  transform: visible ? "translateX(0)" : "translateX(-16px)",
                  transition: `opacity 0.5s ease ${0.15 + i * 0.1}s, transform 0.5s ease ${0.15 + i * 0.1}s`,
                }}>
                  <div style={{
                    width: 32, height: 32, borderRadius: 9, flexShrink: 0,
                    background: "rgba(201,168,76,0.08)",
                    border: "1px solid rgba(201,168,76,0.18)",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: 15,
                  }}>{b.icon}</div>
                  <span style={{ color: "rgba(245,240,232,0.8)", fontSize: 13.5, lineHeight: 1.4 }}>{b.text}</span>
                </div>
              ))}
            </div>

            {/* Carte insight — l'analytics devient un conseiller */}
            <div style={{
              display: "flex", gap: 12, alignItems: "flex-start",
              padding: "14px 16px", borderRadius: 14, marginBottom: 32,
              background: "linear-gradient(135deg, rgba(201,168,76,0.1), rgba(255,255,255,0.02))",
              border: "1px solid rgba(201,168,76,0.28)",
              opacity: visible ? 1 : 0, transform: visible ? "translateY(0)" : "translateY(16px)",
              transition: "opacity 0.55s ease 0.5s, transform 0.55s ease 0.5s",
            }}>
              <span style={{ fontSize: 18, flexShrink: 0, lineHeight: 1.2 }}>💡</span>
              <div>
                <p style={{ color: "#C9A84C", fontSize: 9.5, fontWeight: 800, letterSpacing: 1.5, textTransform: "uppercase", margin: "0 0 4px" }}>Recommandation</p>
                <p style={{ color: "#E8E6E0", fontSize: 13.5, lineHeight: 1.6, margin: 0 }}>
                  Votre QR <strong style={{ color: "#F5F0E8" }}>Restaurant</strong> performe mieux entre <strong style={{ color: "#F5F0E8" }}>18h et 21h</strong>. Partagez-le juste avant le service.
                </p>
              </div>
            </div>

            <a href="/creer" style={{
              display: "inline-flex", alignItems: "center", gap: 10,
              background: "transparent",
              border: "1px solid rgba(201,168,76,0.3)",
              color: "#C9A84C", textDecoration: "none",
              fontSize: 14, fontWeight: 600,
              padding: "12px 26px", borderRadius: 10,
              transition: "all 0.2s ease",
            }}
              onMouseEnter={e => {
                const el = e.currentTarget as HTMLElement
                el.style.background = "rgba(201,168,76,0.08)"
                el.style.borderColor = "rgba(201,168,76,0.55)"
              }}
              onMouseLeave={e => {
                const el = e.currentTarget as HTMLElement
                el.style.background = "transparent"
                el.style.borderColor = "rgba(201,168,76,0.3)"
              }}>
              Voir mes analytics <span style={{ fontSize: 16 }}>→</span>
            </a>
          </div>

          {/* Right: mockup */}
          <div style={{
            opacity: visible ? 1 : 0,
            transform: visible ? "translateY(0)" : "translateY(32px)",
            transition: "opacity 0.7s ease 0.2s, transform 0.7s ease 0.2s",
          }}>
            <AnalyticsMockup />
          </div>

        </div>
      </div>
    </section>
  )
}

// ── Use cases section ─────────────────────────────────────────────────────────
const USE_CASES = [
  {
    id: "restaurant",
    icon: "🍽️",
    label: "Restaurant",
    title: "Transformez votre table en expérience connectée.",
    desc: "Vos clients scannent, consultent votre menu à jour, réservent et laissent un avis en 2 gestes.",
    color: "#F97316",
    blocks: [
      { icon:"📋", label:"Menu interactif",   note:"Mis à jour sans réimprimer" },
      { icon:"📅", label:"Réservations",      note:"Lien direct vers votre système" },
      { icon:"⭐", label:"Avis Google",        note:"Redirection automatique" },
      { icon:"🕐", label:"Horaires",          note:"Modifiables à tout moment" },
      { icon:"📍", label:"Itinéraire",         note:"Google Maps intégré" },
      { icon:"🎉", label:"Événements spéciaux",note:"Soirées, menus du jour" },
    ],
    cta: "Créer ma page restaurant",
  },
  {
    id: "freelance",
    icon: "💼",
    label: "Freelance",
    title: "Votre carte de visite devient une vitrine interactive.",
    desc: "Un seul QR sur vos cartes pro. Le client arrive sur votre portfolio, vos services et votre contact.",
    color: "var(--action)",
    blocks: [
      { icon:"🖼️",  label:"Portfolio",       note:"Galerie de projets" },
      { icon:"🛠️",  label:"Services & tarifs",note:"Vos prestations" },
      { icon:"💬", label:"WhatsApp direct",   note:"Bouton de prise de contact" },
      { icon:"📄", label:"CV téléchargeable", note:"PDF en un clic" },
      { icon:"🔗", label:"Liens sociaux",     note:"LinkedIn, Behance…" },
      { icon:"📅", label:"Calendly",          note:"Prise de RDV intégrée" },
    ],
    cta: "Créer ma page indépendant",
  },
  {
    id: "creator",
    icon: "🎵",
    label: "Créateur",
    title: "Un lien unique pour tous vos contenus.",
    desc: "Centralisez vos réseaux, musiques, vidéos et collaborations sur une page élégante.",
    color: "#A78BFA",
    blocks: [
      { icon:"📸", label:"Instagram / TikTok", note:"Vos dernières publications" },
      { icon:"🎬", label:"YouTube / Twitch",   note:"Lien vers votre chaîne" },
      { icon:"🎵", label:"Streaming",          note:"Spotify, Apple Music…" },
      { icon:"🤝", label:"Partenariats",       note:"Vos codes promo" },
      { icon:"💌", label:"Newsletter",         note:"Formulaire d'inscription" },
      { icon:"🛍️",  label:"Boutique",          note:"Vos produits / merch" },
    ],
    cta: "Créer ma page créateur",
  },
  {
    id: "immo",
    icon: "🏠",
    label: "Immobilier",
    title: "Chaque panneau devient un outil de vente.",
    desc: "Collez votre QR sur vos panneaux et brochures. L'acheteur accède à tous les détails en 1 scan.",
    color: "#C9A84C",
    blocks: [
      { icon:"🏡", label:"Fiche du bien",      note:"Photos, surface, prix" },
      { icon:"📞", label:"Contact direct",     note:"Appel ou message" },
      { icon:"📅", label:"Visites",            note:"Demande de visite en ligne" },
      { icon:"📄", label:"Brochure PDF",       note:"Téléchargement instantané" },
      { icon:"🗺️",  label:"Localisation",      note:"Plan interactif" },
      { icon:"💶", label:"Financement",        note:"Simulateur de crédit" },
    ],
    cta: "Créer ma page immobilier",
  },
  {
    id: "event",
    icon: "🎪",
    label: "Événement",
    title: "Tenez vos participants informés en temps réel.",
    desc: "Programme, billets, accès et mises à jour — tout sur une page modifiable même la veille.",
    color: "var(--success)",
    blocks: [
      { icon:"📋", label:"Programme",          note:"Mis à jour en direct" },
      { icon:"🎫", label:"Billetterie",        note:"Lien d'achat direct" },
      { icon:"⏳", label:"Compte à rebours",   note:"Décompte automatique" },
      { icon:"📍", label:"Lieu & accès",       note:"Plan et transport" },
      { icon:"📸", label:"Galerie",            note:"Photos de l'édition passée" },
      { icon:"📣", label:"Intervenants",       note:"Biographies et horaires" },
    ],
    cta: "Créer ma page événement",
  },
  {
    id: "commerce",
    icon: "🛍️",
    label: "Commerce local",
    title: "Attirez plus de clients avec un QR sur votre vitrine.",
    desc: "Vos promotions, vos produits et vos horaires toujours à jour. Un scan depuis la rue suffit.",
    color: "#F43F5E",
    blocks: [
      { icon:"🏷️",  label:"Promotions",        note:"Offres du moment" },
      { icon:"📦", label:"Catalogue produits", note:"Mis à jour facilement" },
      { icon:"🕐", label:"Horaires",           note:"Jours fériés inclus" },
      { icon:"⭐", label:"Avis clients",        note:"Lien Google / Tripadvisor" },
      { icon:"📍", label:"Itinéraire",          note:"Depuis n'importe où" },
      { icon:"💬", label:"Contact rapide",      note:"WhatsApp ou appel" },
    ],
    cta: "Créer ma page commerce",
  },
] as const

function UseCasesSection() {
  const { ref, visible } = useInView(0.06)
  const [active, setActive] = useState(0)
  const uc = USE_CASES[active]

  return (
    <section id="examples" ref={ref} aria-labelledby="uc-title"
      style={{ padding: "100px 48px", position: "relative", zIndex: 1 }}>
      <style>{`
        .uc-tabs  { display:flex; gap:8px; flex-wrap:wrap; justify-content:center; }
        .uc-tab   { display:flex; align-items:center; gap:7px; padding:9px 18px; border-radius:100px;
                    cursor:pointer; border:1px solid; transition:all 0.2s ease; font-size:13px; font-weight:500;
                    background:transparent; white-space:nowrap; }
        .uc-tab:focus-visible{ outline:2px solid rgba(201,168,76,0.6); outline-offset:3px; border-radius:100px; }
        .uc-blocks{ display:grid; grid-template-columns:repeat(3,1fr); gap:10px; }
        @media(max-width:640px){
          .uc-blocks{ grid-template-columns:repeat(2,1fr)!important; }
          .uc-tabs { gap:6px!important; }
          .uc-tab  { padding:7px 12px!important; font-size:12px!important; }
          #examples{ padding:72px 20px!important; }
        }
        @media(max-width:400px){
          .uc-blocks{ grid-template-columns:1fr!important; }
        }
        @keyframes ucFade{ from{opacity:0;transform:translateY(10px)} to{opacity:1;transform:translateY(0)} }
      `}</style>

      {/* Header */}
      <div style={{
        maxWidth: 1140, margin: "0 auto 56px", textAlign: "center",
        opacity: visible ? 1 : 0,
        transform: visible ? "translateY(0)" : "translateY(24px)",
        transition: "opacity 0.6s ease, transform 0.6s ease",
      }}>
        <p style={{ color: "#C9A84C", fontSize: 11, letterSpacing: 3.5,
          textTransform: "uppercase", fontWeight: 600, marginBottom: 16 }}>Cas d'usage</p>
        <h2 id="uc-title" style={{
          fontFamily: "Fraunces, serif",
          fontSize: "clamp(28px, 4vw, 52px)",
          color: "#F5F0E8", fontWeight: 700,
          margin: "0 auto 16px", lineHeight: 1.1,
          maxWidth: 600, letterSpacing: "-0.02em",
        }}>
          Fait pour <span style={{ color: "#C9A84C" }}>votre métier.</span>
        </h2>
        <p style={{ color: "rgba(188,182,166,0.8)", fontSize: 16,
          maxWidth: 480, margin: "0 auto", lineHeight: 1.65 }}>
          Sélectionnez votre activité et voyez exactement ce que QRowg peut faire pour vous.
        </p>
      </div>

      <div style={{ maxWidth: 1140, margin: "0 auto" }}>

        {/* Tabs */}
        <div className="uc-tabs" style={{
          marginBottom: 40,
          opacity: visible ? 1 : 0,
          transition: "opacity 0.6s ease 0.15s",
        }}>
          {USE_CASES.map((uc_item, i) => (
            <button
              key={uc_item.id}
              onClick={() => setActive(i)}
              aria-pressed={active === i}
              aria-label={uc_item.label}
              className="uc-tab"
              style={{
                color: active === i ? "#080808" : "rgba(245,240,232,0.65)",
                borderColor: active === i ? uc_item.color : "rgba(255,255,255,0.1)",
                background: active === i
                  ? uc_item.color
                  : "rgba(255,255,255,0.02)",
                fontFamily: "inherit",
              }}
            >
              <span style={{ fontSize: 15 }}>{uc_item.icon}</span>
              {uc_item.label}
            </button>
          ))}
        </div>

        {/* Contenu actif */}
        <div key={uc.id} style={{
          display: "grid", gridTemplateColumns: "1fr 1.8fr", gap: 40,
          alignItems: "start",
          animation: "ucFade 0.35s ease",
        }} className="uc-content">
          <style>{`@media(max-width:800px){.uc-content{grid-template-columns:1fr!important;}}`}</style>

          {/* Info gauche */}
          <div style={{
            background: "rgba(255,255,255,0.018)",
            border: "1px solid " + uc.color + "25",
            borderRadius: 18, padding: "28px 24px",
            position: "sticky", top: 88,
          }}>
            {/* Header card */}
            <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 20 }}>
              <div style={{
                width: 52, height: 52, borderRadius: 14,
                background: uc.color + "14",
                border: "1px solid " + uc.color + "30",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 24,
              }}>{uc.icon}</div>
              <div>
                <p style={{ color: uc.color, fontSize: 10, fontWeight: 700,
                  letterSpacing: 2, textTransform: "uppercase", margin: "0 0 4px" }}>{uc.label}</p>
                <h3 style={{ color: "#F5F0E8", fontSize: 16, fontWeight: 700,
                  margin: 0, lineHeight: 1.3 }}>{uc.title}</h3>
              </div>
            </div>

            <p style={{ color: "rgba(188,182,166,0.85)", fontSize: 13.5,
              lineHeight: 1.65, marginBottom: 22 }}>{uc.desc}</p>

            {/* Aperçu du rendu : mini-téléphone (Pb 9) */}
            <div style={{ display: "flex", justifyContent: "center", marginBottom: 22 }}>
              <div style={{ width: 168, borderRadius: 22, padding: 7, background: "#080705", border: "1px solid rgba(255,255,255,0.12)", boxShadow: `0 18px 50px rgba(0,0,0,0.5), 0 0 0 1px ${uc.color}14` }}>
                <div style={{ borderRadius: 16, overflow: "hidden", background: "#0E0D0B" }}>
                  {/* en-tête coloré + encoche */}
                  <div style={{ position: "relative", height: 58, background: `linear-gradient(135deg, ${uc.color}, ${uc.color}99)`, display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <div style={{ position: "absolute", top: 6, left: "50%", transform: "translateX(-50%)", width: 36, height: 4, borderRadius: 3, background: "rgba(0,0,0,0.35)" }} />
                    <div style={{ width: 34, height: 34, borderRadius: "50%", background: "rgba(255,255,255,0.92)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 17, marginTop: 6 }}>{uc.icon}</div>
                  </div>
                  {/* corps */}
                  <div style={{ padding: "12px 13px 14px", display: "flex", flexDirection: "column", alignItems: "center", gap: 7 }}>
                    <div style={{ height: 6, width: "62%", borderRadius: 4, background: "rgba(245,240,232,0.9)" }} />
                    <div style={{ height: 4, width: "44%", borderRadius: 3, background: "rgba(188,182,166,0.55)" }} />
                    {/* mini QR */}
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(5,1fr)", gap: 1.5, width: 40, height: 40, marginTop: 4, padding: 4, background: "#fff", borderRadius: 5 }}>
                      {Array.from({ length: 25 }).map((_, k) => <div key={k} style={{ background: (k * 7 + 3) % 3 === 0 ? "#0E0D0B" : "transparent", borderRadius: 1 }} />)}
                    </div>
                    {/* CTA */}
                    <div style={{ marginTop: 6, height: 22, width: "82%", borderRadius: 7, background: uc.color, display: "flex", alignItems: "center", justifyContent: "center", color: "#080808", fontSize: 8.5, fontWeight: 800, padding: "0 4px", textAlign: "center", lineHeight: 1 }}>{uc.cta.replace(/^Créer ma page /i, "").replace(/^./, c => c.toUpperCase())}</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Ligne d'accent */}
            <div style={{
              height: 1, marginBottom: 24,
              background: "linear-gradient(90deg, " + uc.color + "40, transparent)",
            }} />

            <a href="/creer" style={{
              display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
              background: uc.color,
              color: "#080808", textDecoration: "none",
              fontSize: 13, fontWeight: 700,
              padding: "12px 20px", borderRadius: 10,
              transition: "opacity 0.2s, transform 0.2s var(--mo-ease-spring)",
            }}
              onMouseEnter={e => {
                const el = e.currentTarget as HTMLElement
                el.style.opacity = "0.85"
                el.style.transform = "translateY(-2px)"
              }}
              onMouseLeave={e => {
                const el = e.currentTarget as HTMLElement
                el.style.opacity = "1"
                el.style.transform = "none"
              }}>
              {uc.cta} →
            </a>
          </div>

          {/* Grille de blocs droite */}
          <div>
            <p style={{ color: "rgba(188,182,166,0.55)", fontSize: 10,
              letterSpacing: 2, textTransform: "uppercase", marginBottom: 16 }}>
              Blocs inclus dans ce template
            </p>
            <div className="uc-blocks">
              {uc.blocks.map((block, i) => (
                <div key={block.label} style={{
                  background: "rgba(255,255,255,0.025)",
                  border: "1px solid rgba(255,255,255,0.07)",
                  borderRadius: 12, padding: "14px 14px",
                  display: "flex", flexDirection: "column", gap: 6,
                  transition: "border-color 0.2s, background 0.2s",
                  animationDelay: i * 0.04 + "s",
                  animation: "ucFade 0.35s ease both",
                }}
                  onMouseEnter={e => {
                    const el = e.currentTarget as HTMLElement
                    el.style.borderColor = uc.color + "40"
                    el.style.background = uc.color + "06"
                  }}
                  onMouseLeave={e => {
                    const el = e.currentTarget as HTMLElement
                    el.style.borderColor = "rgba(255,255,255,0.07)"
                    el.style.background = "rgba(255,255,255,0.025)"
                  }}>
                  <span style={{ fontSize: 18 }}>{block.icon}</span>
                  <p style={{ color: "#F5F0E8", fontSize: 12, fontWeight: 700, margin: 0 }}>{block.label}</p>
                  <p style={{ color: "rgba(188,182,166,0.7)", fontSize: 11, margin: 0, lineHeight: 1.4 }}>{block.note}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

      </div>
    </section>
  )
}

// ── FAQ section ───────────────────────────────────────────────────────────────
const FAQ_ITEMS = [
  { q:"Le QR code reste-t-il le même si je modifie ma page ?",            a:"Oui, c'est tout l'intérêt d'un QR code dynamique : vous modifiez votre page autant de fois que vous voulez, et le QR code déjà imprimé reste identique et continue de fonctionner." },
  { q:"Qu'est-ce qu'une carte de visite numérique QRowg ?",             a:"Une page mobile professionnelle qui regroupe vos informations, vos liens et vos boutons d'action (appel, WhatsApp, réservation…). On y accède en scannant votre QR code ou via un simple lien." },
  { q:"Puis-je utiliser QRowg gratuitement ?",                          a:`Oui. Le plan ${PLANS_DEF.free.label} donne accès à ${PLANS_DEF.free.limits.pages} page, des vues illimitées et ${PLANS_DEF.free.limits.qr} QR codes — dont ${PLANS_DEF.free.limits.dyn} modifiable après impression, sans expiration. Aucune carte bancaire n'est demandée.` },
  { q:"Puis-je connecter mon propre nom de domaine ?",                    a:`Oui, dès le plan ${PLANS_DEF.pro.label} : votre domaine ou sous-domaine (ex. : carte.votresite.fr) mène directement à votre page QRowg.` },
  { q:"Est-ce que je vois les statistiques de scans ?",                   a:`Oui. Vues, scans, appareils, sources de trafic et pages les plus consultées. Statistiques de base sur le plan gratuit, statistiques détaillées dès ${PLANS_DEF.pro.label}.` },
  { q:"Puis-je retirer la mention QRowg de ma page ?",                  a:"Oui, dès le plan Établissement : votre page affiche uniquement votre marque. Sur le plan gratuit, une mention discrète apparaît en bas de page." },
  { q:"Est-ce adapté aux restaurants et commerces locaux ?",             a:"Tout à fait. Des modèles prêts à l'emploi existent pour le menu numérique, les horaires, la réservation, les avis Google et les promotions — utilisables en 5 minutes." },
  { q:"Puis-je télécharger mon QR code pour l'imprimer ?",               a:"Oui. Le téléchargement est disponible en PNG haute résolution, SVG et PDF — prêts à imprimer sur cartes de visite, flyers, menus ou affiches." },
  { q:"Puis-je annuler mon abonnement à tout moment ?",                  a:"Oui, à tout moment depuis votre espace compte. Aucun engagement, aucun frais d'annulation : votre accès reste actif jusqu'à la fin de la période déjà payée." },
  { q:"Si j'arrête de payer, mon QR code imprimé cesse-t-il de fonctionner ?", a:"Jamais brutalement. Un QR code statique encode son contenu directement : il fonctionne pour toujours, même sans compte. Pour un lien dynamique, si vous arrêtez l'abonnement le lien est mis en pause — mais sa destination est conservée et il se réactive dès que vous reprenez. Nous ne faisons jamais disparaître un QR code du jour au lendemain." },
  { q:"Puis-je changer la destination de mon QR code après l'avoir imprimé ?", a:"Oui, à tout moment et sans réimprimer. C'est le principe du QR code dynamique : le QR reste identique, vous modifiez sa page ou sa destination quand vous voulez." },
  { q:"QRowg fonctionne-t-il bien sur mobile ?",                       a:"Oui. Toutes les pages sont conçues pour le mobile en priorité. Comme la majorité des scans se font sur smartphone, l'affichage est optimisé pour les petits écrans." },
  { q:"Faut-il savoir coder pour créer sa page ?",                       a:"Non, aucune compétence technique n'est requise. Vous ajoutez des blocs, vous personnalisez, vous publiez — c'est tout." },
] as const

function FAQSection() {
  const { ref, visible } = useInView(0.06)
  const [openIdx, setOpenIdx] = useState<number | null>(null)
  return (
    <section id="faq" ref={ref} aria-labelledby="faq-title"
      style={{ padding:"100px 48px", position:"relative", zIndex:1 }}>
      <style>{`
        .faq-item{ border-bottom:1px solid rgba(255,255,255,0.06); }
        .faq-item:first-child{ border-top:1px solid rgba(255,255,255,0.06); }
        .faq-btn{ width:100%; display:flex; align-items:center; justify-content:space-between;
          gap:20px; padding:20px 0; background:none; border:none; cursor:pointer;
          text-align:left; font-family:inherit; }
        .faq-btn:focus-visible{ outline:2px solid rgba(201,168,76,0.5); outline-offset:4px; border-radius:4px; }
        .faq-btn:hover .fq{ color:#F5F0E8 !important; }
        .faq-icon{ width:20px; height:20px; border-radius:50%;
          border:1px solid rgba(201,168,76,0.25); display:flex; align-items:center;
          justify-content:center; flex-shrink:0;
          transition:transform 0.3s ease, background 0.2s, border-color 0.2s; }
        .faq-ans{ overflow:hidden; transition:max-height 0.35s var(--mo-ease-emphasized), opacity 0.3s; }
        @media(max-width:640px){ #faq{ padding:72px 20px !important; } }
        @media(prefers-reduced-motion:reduce){ .faq-ans,.faq-icon{ transition:none !important; } }
      `}</style>
      <div style={{ maxWidth:720, margin:"0 auto 56px", textAlign:"center",
        opacity:visible?1:0, transform:visible?"translateY(0)":"translateY(24px)",
        transition:"opacity 0.6s ease,transform 0.6s ease" }}>
        <Eyebrow>FAQ</Eyebrow>
        <h2 id="faq-title" style={{ fontFamily:"Fraunces, serif",
          fontSize:"clamp(28px,4vw,52px)", color:"#F5F0E8", fontWeight:700,
          margin:"0 auto 16px", lineHeight:1.1, letterSpacing:"-0.02em" }}>
          Les questions{" "}<span style={{ color:"#C9A84C" }}>les plus fréquentes.</span>
        </h2>
        <p style={{ color:"rgba(188,182,166,0.8)", fontSize:16, lineHeight:1.65, margin:0 }}>
          Une question sans réponse ? Écrivez-nous, on est là.
        </p>
      </div>
      <div style={{ maxWidth:720, margin:"0 auto",
        opacity:visible?1:0, transition:"opacity 0.6s ease 0.15s" }}>
        {FAQ_ITEMS.map((item, i) => {
          const isOpen = openIdx === i
          return (
            <div key={i} className="faq-item">
              <button className="faq-btn" onClick={() => setOpenIdx(isOpen ? null : i)}
                aria-expanded={isOpen} aria-controls={"fa-" + i} id={"fb-" + i}>
                <span className="fq" style={{
                  color:isOpen?"#F5F0E8":"rgba(245,240,232,0.8)",
                  fontSize:15, fontWeight:isOpen?600:500, lineHeight:1.45,
                  transition:"color 0.2s" }}>{item.q}</span>
                <span className="faq-icon" aria-hidden="true" style={{
                  transform:isOpen?"rotate(45deg)":"rotate(0deg)",
                  background:isOpen?"rgba(201,168,76,0.12)":"transparent",
                  borderColor:isOpen?"rgba(201,168,76,0.5)":"rgba(201,168,76,0.25)" }}>
                  <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                    <line x1="5" y1="1" x2="5" y2="9" stroke="#C9A84C" strokeWidth="1.5" strokeLinecap="round"/>
                    <line x1="1" y1="5" x2="9" y2="5" stroke="#C9A84C" strokeWidth="1.5" strokeLinecap="round"/>
                  </svg>
                </span>
              </button>
              <div id={"fa-" + i} role="region" aria-labelledby={"fb-" + i}
                className="faq-ans"
                style={{ maxHeight:isOpen?"500px":"0px", opacity:isOpen?1:0 }}>
                <p style={{ color:"rgba(188,182,166,0.85)", fontSize:14.5,
                  lineHeight:1.75, margin:"0 0 20px", paddingRight:40 }}>{item.a}</p>
              </div>
            </div>
          )
        })}
        <div style={{ marginTop:48, textAlign:"center",
          borderTop:"1px solid rgba(255,255,255,0.06)", paddingTop:40 }}>
          <p style={{ color:"rgba(188,182,166,0.7)", fontSize:14, marginBottom:16 }}>
            Vous avez une autre question ?
          </p>
          <a href="/contact" style={{ display:"inline-flex", alignItems:"center", gap:8,
            color:"#C9A84C", textDecoration:"none", fontSize:14, fontWeight:600,
            padding:"11px 24px", borderRadius:10,
            border:"1px solid rgba(201,168,76,0.3)", transition:"all 0.2s ease" }}
            onMouseEnter={e=>{const el=e.currentTarget as HTMLElement;el.style.background="rgba(201,168,76,0.08)";el.style.borderColor="rgba(201,168,76,0.55)"}}
            onMouseLeave={e=>{const el=e.currentTarget as HTMLElement;el.style.background="transparent";el.style.borderColor="rgba(201,168,76,0.3)"}}>
            Nous contacter <span style={{fontSize:15}}>→</span>
          </a>
        </div>
      </div>
    </section>
  )
}

// ── Transition entre sections : signature QRowg (glyphe QR doré + lignes) ───
function SectionSeam({ delay = 0 }: { delay?: number }) {
  // Séparateur signature : le « finder pattern » d'un QR au centre, balayé par un
  // faisceau de scan (la transition signature de QRowg).
  return (
    <div aria-hidden="true" style={{
      position: "relative", overflow: "hidden", maxWidth: 1140, margin: "0 auto", zIndex: 1,
      display: "flex", alignItems: "center", justifyContent: "center", gap: 16, padding: "2px 24px",
    }}>
      <span className="seam-beam" style={{ animationDelay: `${delay}s` }} />
      <div style={{ flex: 1, maxWidth: 360, height: 1, background: "linear-gradient(90deg, transparent, rgba(201,168,76,0.22))" }} />
      <div style={{ position: "relative", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ position: "absolute", inset: -12, background: "radial-gradient(circle, rgba(201,168,76,0.14), transparent 70%)", pointerEvents: "none" }} />
        <QRFinder size={16} color="rgba(201,168,76,0.6)" style={{ position: "relative" }} />
      </div>
      <div style={{ flex: 1, maxWidth: 360, height: 1, background: "linear-gradient(90deg, rgba(201,168,76,0.22), transparent)" }} />
    </div>
  )
}

// ── Mockup narratif : le parcours animé Création → Scan → Analytics ───────────
const STORY = [
  { key: "Création",        icon: "🧱", desc: "Glissez vos blocs : profil, liens, galerie, boutons d'action." },
  { key: "Personnalisation", icon: "🎨", desc: "Couleurs, thème, logo — votre page, votre identité." },
  { key: "QR code",         icon: "⬛", desc: "Votre QR code est généré automatiquement, prêt à partager." },
  { key: "Scan",            icon: "📲", desc: "Vos clients scannent et accèdent à tout, en un geste." },
  { key: "Analytics",       icon: "📊", desc: "Chaque scan devient une donnée, mesurée en temps réel." },
] as const

function StoryPhone({ step }: { step: number }) {
  // Contenu de l'écran selon l'étape (re-monté via key -> ré-animé)
  const G = "#C9A84C"
  if (step === 0 || step === 1) {
    const colored = step === 1
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 11, padding: 16 }}>
        {[42, 14, 34, 14, 30].map((h, i) => (
          <div key={i} style={{
            height: h, width: i === 1 || i === 3 ? "62%" : "100%", borderRadius: 9,
            background: colored
              ? (i === 0 ? `linear-gradient(90deg, ${G}, #b8953f)` : i === 2 ? "rgba(56,189,248,0.4)" : i === 4 ? "rgba(57,255,143,0.35)" : "rgba(255,255,255,0.14)")
              : "rgba(255,255,255,0.07)",
            border: colored ? "none" : "1px dashed rgba(201,168,76,0.28)",
            animation: `mo-fade-up 0.45s ease ${i * 0.09}s both`,
          }} />
        ))}
        {colored && (
          <div style={{ display: "flex", gap: 7, marginTop: 4, animation: "mo-fade-up 0.4s ease 0.4s both" }}>
            {[G, "var(--action)", "#A78BFA", "var(--success)"].map(c => (
              <span key={c} style={{ width: 20, height: 20, borderRadius: "50%", background: c, boxShadow: `0 0 10px ${c}88` }} />
            ))}
          </div>
        )}
      </div>
    )
  }
  if (step === 2 || step === 3) {
    return (
      <div style={{ position: "relative", flex: 1, display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
        <div style={{ position: "relative", animation: "mo-fade-up 0.5s ease both" }}>
          <QRMiniSvg fg="#F5F0E8" bg="transparent" accent={G} size={140} />
          {step === 3 && (
            <div aria-hidden style={{ position: "absolute", left: "4%", right: "4%", top: "10%", height: 2, borderRadius: 2, background: `linear-gradient(90deg, transparent, ${G}, transparent)`, boxShadow: `0 0 16px 3px ${G}88`, animation: "scanLine 1.8s ease-in-out infinite" }} />
          )}
        </div>
        {step === 3 && (
          <div style={{ position: "absolute", bottom: 22, left: "50%", transform: "translateX(-50%)", display: "flex", alignItems: "center", gap: 6, padding: "6px 14px", borderRadius: 100, background: "rgba(57,255,143,0.14)", border: "1px solid rgba(57,255,143,0.4)", color: "var(--success)", fontSize: 12, fontWeight: 700, animation: "mo-fade-up 0.4s ease 0.3s both" }}>✓ Scanné</div>
        )}
      </div>
    )
  }
  // step 4 : analytics
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12, padding: 16, height: "100%" }}>
      <div style={{ display: "flex", gap: 8 }}>
        {[["1 248", "Scans"], ["86%", "Mobile"]].map(([v, l], i) => (
          <div key={l} style={{ flex: 1, padding: "10px 12px", borderRadius: 10, background: "rgba(255,255,255,0.04)", border: "1px solid rgba(201,168,76,0.18)", animation: `mo-fade-up 0.4s ease ${i * 0.1}s both` }}>
            <p style={{ margin: 0, color: G, fontSize: 17, fontWeight: 800 }}>{v}</p>
            <p style={{ margin: 0, color: "#BCB6A6", fontSize: 9.5 }}>{l}</p>
          </div>
        ))}
      </div>
      <div style={{ flex: 1, display: "flex", alignItems: "flex-end", gap: 7, padding: "8px 4px 0" }}>
        {[40, 65, 50, 80, 58, 92, 70].map((h, i) => (
          <div key={i} style={{ flex: 1, height: `${h}%`, borderRadius: "5px 5px 0 0", background: `linear-gradient(180deg, ${G}, ${G}33)`, transformOrigin: "bottom", animation: `barGrow 0.5s var(--mo-ease-spring) ${i * 0.07}s both` }} />
        ))}
      </div>
    </div>
  )
}

function StoryFlow() {
  const { ref, visible } = useInView(0.2)
  const [step, setStep] = useState(0)
  useEffect(() => {
    if (!visible) return
    const t = setInterval(() => setStep(s => (s + 1) % STORY.length), 2600)
    return () => clearInterval(t)
  }, [visible])
  return (
    <section ref={ref} aria-labelledby="story-title" style={{ padding: "100px 48px", position: "relative", zIndex: 1 }}>
      <style>{`
        @keyframes barGrow { from{transform:scaleY(0)} to{transform:scaleY(1)} }
        .story-grid { display:grid; grid-template-columns:1fr 0.9fr; gap:64px; align-items:center; max-width:1040px; margin:0 auto; }
        @media(max-width:880px){ .story-grid{ grid-template-columns:1fr!important; gap:40px!important; } }
        @media(max-width:640px){ #story{ padding:76px 22px!important; } }
      `}</style>
      <div id="story" style={{ maxWidth: 1140, margin: "0 auto" }}>
        <div style={{ textAlign: "center", marginBottom: 56, opacity: visible ? 1 : 0, transform: visible ? "translateY(0)" : "translateY(24px)", transition: "opacity 0.6s ease, transform 0.6s ease" }}>
          <Eyebrow>Voyez-le en action</Eyebrow>
          <h2 id="story-title" style={{ fontFamily: "Fraunces, serif", fontSize: "clamp(28px,4vw,52px)", color: "#F5F0E8", fontWeight: 700, margin: "0 auto", lineHeight: 1.1, maxWidth: 580, letterSpacing: "-0.02em" }}>
            De l'idée au{" "}<span style={{ color: "#C9A84C" }}>premier client.</span>
          </h2>
        </div>
        <div className="story-grid">
          {/* Étapes */}
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {STORY.map((s, i) => {
              const active = step === i
              return (
                <button key={s.key} type="button" onClick={() => setStep(i)} style={{
                  display: "flex", alignItems: "center", gap: 16, textAlign: "left", cursor: "pointer",
                  padding: "16px 18px", borderRadius: 14,
                  background: active ? "linear-gradient(135deg, rgba(201,168,76,0.12), rgba(255,255,255,0.02))" : "transparent",
                  border: `1px solid ${active ? "rgba(201,168,76,0.35)" : "rgba(255,255,255,0.06)"}`,
                  transition: "all 0.3s ease",
                }}>
                  <div style={{ position: "relative", width: 42, height: 42, flexShrink: 0, borderRadius: 12, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20, background: active ? "rgba(201,168,76,0.18)" : "rgba(255,255,255,0.04)", border: `1px solid ${active ? "rgba(201,168,76,0.5)" : "rgba(255,255,255,0.08)"}`, boxShadow: active ? "0 0 22px rgba(201,168,76,0.3)" : "none", transition: "all 0.3s ease" }}>
                    {s.icon}
                    <span style={{ position: "absolute", top: -6, right: -6, width: 18, height: 18, borderRadius: "50%", background: active ? "linear-gradient(135deg,#d4a843,#C9A84C)" : "rgba(255,255,255,0.1)", color: active ? "#080808" : "#BCB6A6", fontSize: 9.5, fontWeight: 800, display: "flex", alignItems: "center", justifyContent: "center" }}>{i + 1}</span>
                  </div>
                  <div style={{ minWidth: 0 }}>
                    <p style={{ margin: 0, color: active ? "#F5F0E8" : "#A8A29A", fontSize: 14.5, fontWeight: 700 }}>{s.key}</p>
                    <p style={{ margin: "3px 0 0", color: "rgba(188,182,166,0.85)", fontSize: 12.5, lineHeight: 1.5, maxHeight: active ? 60 : 0, opacity: active ? 1 : 0, overflow: "hidden", transition: "all 0.35s ease" }}>{s.desc}</p>
                  </div>
                </button>
              )
            })}
          </div>
          {/* Téléphone */}
          <div style={{ display: "flex", justifyContent: "center" }}>
            <div style={{
              position: "relative", width: "min(250px, 74vw)", aspectRatio: "9 / 18",
              borderRadius: 32, padding: 10,
              background: "linear-gradient(160deg, #1a1712, #0c0b08)",
              border: "1px solid rgba(201,168,76,0.3)",
              boxShadow: "0 30px 70px rgba(0,0,0,0.6), 0 0 60px rgba(201,168,76,0.12)",
              animation: "float 6s ease-in-out infinite",
            }}>
              <div style={{ position: "relative", width: "100%", height: "100%", borderRadius: 24, overflow: "hidden", background: "#0A0907", display: "flex", flexDirection: "column" }}>
                <div key={step} style={{ flex: 1, display: "flex", flexDirection: "column", minHeight: 0 }}>
                  <StoryPhone step={step} />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

// ── Motif signature : « finder pattern » d'un QR code (carré niché) ───────────
function QRFinder({ size = 46, color = "rgba(201,168,76,0.5)", style }: { size?: number; color?: string; style?: React.CSSProperties }) {
  return (
    <div aria-hidden="true" style={{
      width: size, height: size, border: `${Math.max(2, size * 0.07)}px solid ${color}`,
      borderRadius: size * 0.22, display: "flex", alignItems: "center", justifyContent: "center",
      padding: size * 0.17, ...style,
    }}>
      <div style={{ width: "100%", height: "100%", background: color, borderRadius: size * 0.14 }} />
    </div>
  )
}

// ── Colonne de footer : accordéon repliable sur mobile, normale sur desktop ───
function FooterCol({ title, children }: { title: string; children: React.ReactNode }) {
  const isMobile = useIsMobile(700)
  const [open, setOpen] = useState(false)
  if (!isMobile) {
    return (
      <nav aria-label={"Navigation " + title}>
        <p className="fc-title">{title}</p>
        {children}
      </nav>
    )
  }
  return (
    <nav aria-label={"Navigation " + title} style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
      <button type="button" onClick={() => setOpen(o => !o)} aria-expanded={open}
        style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between", background: "none", border: "none", padding: "9px 0", cursor: "pointer", fontFamily: "inherit", lineHeight: 1 }}>
        <span className="fc-title" style={{ marginBottom: 0 }}>{title}</span>
        <span style={{ color: "#C9A84C", fontSize: 13, transform: open ? "rotate(180deg)" : "none", transition: "transform 0.25s" }}>▾</span>
      </button>
      <div style={{ overflow: "hidden", maxHeight: open ? 400 : 0, opacity: open ? 1 : 0, transition: "max-height 0.32s ease, opacity 0.25s ease", paddingBottom: open ? 8 : 0 }}>
        {children}
      </div>
    </nav>
  )
}

// ── Eyebrow de section : motif finder QR + label (signature récurrente) ───────
function Eyebrow({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 10, marginBottom: 16 }}>
      <QRFinder size={12} color="rgba(201,168,76,0.62)" />
      <span style={{ color: "#C9A84C", fontSize: 11, letterSpacing: 3.5, textTransform: "uppercase", fontWeight: 600 }}>{children}</span>
    </div>
  )
}

// ── Comparaison Qrowg vs Linktree vs carte papier ────────────────────────────
// Contenu factuel et defendable : Linktree recoit du credit la ou il le merite
// (editable, analytics/domaine en payant = "partiel"). On ne surclaime pas.
type CmpCell = readonly [status: "yes" | "partial" | "no", note?: string]
const COMPARE_ROWS: { label: string; q: CmpCell; l: CmpCell; p: CmpCell }[] = [
  { label: "Page pro sur-mesure (blocs, menu, portfolio)", q: ["yes"], l: ["partial", "Liste de liens"], p: ["no"] },
  { label: "QR code dynamique repointable",                 q: ["yes"], l: ["partial", "Vers la page"],  p: ["no"] },
  { label: "Studio QR — design du code (couleurs, logo)",   q: ["yes"], l: ["no"],                        p: ["no"] },
  { label: "Modifiable sans réimprimer",                    q: ["yes"], l: ["yes"],                       p: ["no"] },
  { label: "Statistiques de scans & visites",               q: ["yes", "Détaillées"], l: ["partial", "Payant"], p: ["no"] },
  { label: "Modèles par métier (resto, immo, créateur…)",   q: ["yes"], l: ["no"],                        p: ["no"] },
  { label: "Supports imprimables générés (sticker, PDF)",   q: ["yes"], l: ["no"],                        p: ["no"] },
  { label: "Domaine personnalisé",                          q: ["yes"], l: ["partial", "Payant"],         p: ["no"] },
]

function CmpMark({ cell, strong = false }: { cell: CmpCell; strong?: boolean }) {
  const [status, note] = cell
  const cfg = status === "yes"
    ? { ic: "✓", fg: strong ? "#0A0A0A" : "#C9A84C", bg: strong ? "linear-gradient(135deg,#EBCE72,#C9A84C)" : "rgba(201,168,76,0.14)", bd: strong ? "transparent" : "rgba(201,168,76,0.4)" }
    : status === "partial"
    ? { ic: "–", fg: "#B9B2A0", bg: "rgba(255,255,255,0.05)", bd: "rgba(255,255,255,0.14)" }
    : { ic: "✕", fg: "#7C766B", bg: "rgba(255,255,255,0.03)", bd: "rgba(255,255,255,0.08)" }
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 5 }}>
      <span aria-label={status === "yes" ? "oui" : status === "partial" ? "partiel" : "non"} style={{
        width: 26, height: 26, borderRadius: "50%", display: "inline-flex", alignItems: "center", justifyContent: "center",
        fontSize: 14, fontWeight: 800, color: cfg.fg, background: cfg.bg, border: `1px solid ${cfg.bd}`,
        boxShadow: strong && status === "yes" ? "0 2px 10px rgba(201,168,76,0.35)" : "none",
      }}>{cfg.ic}</span>
      {note && <span style={{ fontSize: 10.5, color: "#8A8478", lineHeight: 1.1, textAlign: "center" }}>{note}</span>}
    </div>
  )
}

function ComparisonSection() {
  const { ref, visible } = useInView()
  return (
    <section id="comparaison" ref={ref} aria-labelledby="cmp-title" style={{ padding: "96px 48px", position: "relative", zIndex: 1 }}>
      <style>{`
        .cmp-grid{display:grid;grid-template-columns:1.6fr 1fr 1fr 1fr;align-items:stretch;}
        .cmp-cell{padding:16px 14px;display:flex;align-items:center;justify-content:center;border-top:1px solid rgba(255,255,255,0.05);}
        .cmp-lab{justify-content:flex-start;text-align:left;color:#D8D2C4;font-size:14px;font-weight:500;line-height:1.3;}
        .cmp-hl{background:linear-gradient(180deg,rgba(201,168,76,0.09),rgba(201,168,76,0.04));}
        @media(max-width:760px){
          .cmp-scroll{overflow-x:auto;-webkit-overflow-scrolling:touch;margin:0 -20px;padding:0 20px;}
          .cmp-grid{min-width:640px;}
          section[aria-labelledby="cmp-title"]{padding:70px 20px!important;}
        }
      `}</style>
      <div style={{ maxWidth: 980, margin: "0 auto", textAlign: "center" }}>
        <Eyebrow>Pourquoi QRowg</Eyebrow>
        <h2 id="cmp-title" style={{ fontFamily: "Fraunces, serif", fontSize: "clamp(28px,4vw,48px)", color: "#F5F0E8", fontWeight: 700, margin: "0 auto 14px", lineHeight: 1.1, maxWidth: 640, letterSpacing: "-0.02em" }}>
          Une carte de visite, mais vivante.
        </h2>
        <p style={{ color: "rgba(226,220,206,0.8)", fontSize: 17, lineHeight: 1.6, margin: "0 auto 40px", maxWidth: 520 }}>
          Ce que QRowg fait — et que les autres solutions laissent de côté.
        </p>

        <div className="cmp-scroll" style={{
          opacity: visible ? 1 : 0, transform: visible ? "translateY(0)" : "translateY(26px)",
          transition: "opacity 0.7s ease, transform 0.7s ease",
        }}>
          <div style={{
            border: "1px solid rgba(201,168,76,0.16)", borderRadius: 20, overflow: "hidden",
            background: "linear-gradient(180deg, rgba(20,18,14,0.7), rgba(12,11,8,0.7))",
            boxShadow: "0 30px 80px rgba(0,0,0,0.45)",
          }}>
            {/* En-tetes */}
            <div className="cmp-grid">
              <div className="cmp-cell cmp-lab" style={{ borderTop: "none" }} />
              <div className="cmp-cell cmp-hl" style={{ borderTop: "none", flexDirection: "column", gap: 8, position: "relative" }}>
                <span style={{
                  position: "absolute", top: 8, left: "50%", transform: "translateX(-50%)",
                  fontSize: 8.5, letterSpacing: 1.5, textTransform: "uppercase", fontWeight: 700, color: "#C9A84C",
                  background: "rgba(201,168,76,0.14)", border: "1px solid rgba(201,168,76,0.3)", borderRadius: 20, padding: "2px 9px", whiteSpace: "nowrap",
                }}>Recommandé</span>
                <span style={{ marginTop: 18 }}><QrowgLogo size={18} /></span>
              </div>
              <div className="cmp-cell" style={{ borderTop: "none", color: "#B9B2A0", fontSize: 15, fontWeight: 600 }}>Linktree</div>
              <div className="cmp-cell" style={{ borderTop: "none", color: "#B9B2A0", fontSize: 15, fontWeight: 600 }}>Carte papier</div>
            </div>
            {/* Lignes */}
            {COMPARE_ROWS.map((row) => (
              <div className="cmp-grid" key={row.label}>
                <div className="cmp-cell cmp-lab">{row.label}</div>
                <div className="cmp-cell cmp-hl"><CmpMark cell={row.q} strong /></div>
                <div className="cmp-cell"><CmpMark cell={row.l} /></div>
                <div className="cmp-cell"><CmpMark cell={row.p} /></div>
              </div>
            ))}
          </div>
        </div>

        <div style={{ marginTop: 34, display: "flex", justifyContent: "center" }}>
          <Link href="/creer" style={{
            background: "linear-gradient(90deg, #C9A84C, #b8953f)", color: "#080808", textDecoration: "none",
            fontSize: 15, fontWeight: 700, padding: "14px 30px", borderRadius: 12, display: "inline-flex", alignItems: "center", gap: 9,
            boxShadow: "0 4px 24px rgba(201,168,76,0.4)", transition: "transform 0.2s var(--mo-ease-spring), box-shadow 0.2s",
          }}
            onMouseEnter={e => { const el = e.currentTarget as HTMLElement; el.style.transform = "translateY(-2px) scale(1.02)"; el.style.boxShadow = "0 8px 34px rgba(201,168,76,0.5)" }}
            onMouseLeave={e => { const el = e.currentTarget as HTMLElement; el.style.transform = "none"; el.style.boxShadow = "0 4px 24px rgba(201,168,76,0.4)" }}>
            Composer ma page — sans compte <span aria-hidden="true">→</span>
          </Link>
        </div>
      </div>
    </section>
  )
}

// ── Print Studio : supports imprimables (carrousel mobile) ────────────────────
const SUPPORTS = [
  { name: "Affiche",          emoji: "🖼️", accent: "#C9A84C", benefit: "Vitrine, événement, salle d'attente — visible de loin." },
  { name: "Sticker vitrine",  emoji: "🪟", accent: "var(--action)", benefit: "Instagram, avis Google ou Wi-Fi : collez, c'est prêt." },
  { name: "Carte de visite",  emoji: "💳", accent: "#A78BFA", benefit: "Partagez tout votre profil en un seul scan." },
  { name: "Chevalet de table", emoji: "🍽️", accent: "var(--success)", benefit: "Menu, avis ou réservation, directement à table." },
  { name: "Flyer",            emoji: "📄", accent: "#F97316", benefit: "Promo ou ouverture : distribuez, scannez, convertissez." },
  { name: "Avis Google",      emoji: "⭐", accent: "#F5D24E", benefit: "Un scan, un avis en 10 secondes. Boostez votre note." },
] as const

function PrintStudioSection() {
  const { ref, visible } = useInView(0.06)
  return (
    <section ref={ref} aria-labelledby="print-title" style={{ padding: "100px 48px", position: "relative", zIndex: 1 }}>
      <style>{`
        .print-grid { display:grid; grid-template-columns:repeat(3,1fr); gap:18px; max-width:1040px; margin:0 auto; }
        @media(max-width:900px){ .print-grid{ grid-template-columns:repeat(2,1fr)!important; } }
        @media(max-width:560px){
          .print-grid{ display:flex!important; gap:14px!important; overflow-x:auto!important; scroll-snap-type:x mandatory!important; padding-bottom:14px!important; -webkit-overflow-scrolling:touch!important; }
          .print-grid > *{ min-width:240px!important; scroll-snap-align:start!important; }
          #print{ padding:76px 22px!important; }
        }
        .print-grid::-webkit-scrollbar{ height:4px; }
        .print-grid::-webkit-scrollbar-track{ background:rgba(255,255,255,0.04); border-radius:2px; }
        .print-grid::-webkit-scrollbar-thumb{ background:rgba(201,168,76,0.3); border-radius:2px; }
        .print-card{ transition:transform 0.3s var(--mo-ease-spring), border-color 0.25s, box-shadow 0.25s; }
        .print-card:hover{ transform:translateY(-6px); }
      `}</style>
      <div id="print" style={{ maxWidth: 1140, margin: "0 auto" }}>
        <div style={{ textAlign: "center", marginBottom: 52, opacity: visible ? 1 : 0, transform: visible ? "translateY(0)" : "translateY(24px)", transition: "opacity 0.6s ease, transform 0.6s ease" }}>
          <Eyebrow>Supports imprimables</Eyebrow>
          <h2 id="print-title" style={{ fontFamily: "Fraunces, serif", fontSize: "clamp(28px,4vw,52px)", color: "#F5F0E8", fontWeight: 700, margin: "0 auto 16px", lineHeight: 1.1, maxWidth: 620, letterSpacing: "-0.02em" }}>
            Vos QR codes en{" "}<span style={{ color: "#C9A84C" }}>supports prêts à imprimer.</span>
          </h2>
          <p style={{ color: "rgba(188,182,166,0.85)", fontSize: 16, maxWidth: 520, margin: "0 auto", lineHeight: 1.7 }}>
            Affiche, sticker, carte, chevalet, flyer… exportés en haute définition, prêts pour l'imprimeur.
          </p>
        </div>

        <div className="print-grid">
          {SUPPORTS.map((s, i) => (
            <div key={s.name} className="print-card" style={{
              background: "rgba(255,255,255,0.02)", border: "1px solid rgba(201,168,76,0.1)", borderRadius: 18, overflow: "hidden",
              opacity: visible ? 1 : 0, transform: visible ? "translateY(0)" : "translateY(26px)",
              transition: `opacity 0.5s ease ${i * 80}ms, transform 0.45s var(--mo-ease-spring) ${i * 80}ms`,
            }}>
              {/* Aperçu du support */}
              <div style={{ position: "relative", aspectRatio: "4 / 3", display: "flex", alignItems: "center", justifyContent: "center", background: `radial-gradient(120% 100% at 50% 0%, ${s.accent}14, transparent 65%), #0C0B08`, borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
                <div style={{ width: 92, aspectRatio: "1 / 1.3", borderRadius: 8, background: "linear-gradient(160deg,#17140d,#0c0b08)", border: `1px solid ${s.accent}40`, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 7, boxShadow: `0 12px 30px rgba(0,0,0,0.5), 0 0 26px ${s.accent}18` }}>
                  <QRMiniSvg fg="#F5F0E8" bg="transparent" accent={s.accent} size={40} />
                  <span style={{ width: "62%", height: 3, borderRadius: 2, background: `${s.accent}66` }} />
                </div>
                <span style={{ position: "absolute", top: 12, right: 12, fontSize: 18 }}>{s.emoji}</span>
              </div>
              {/* Texte */}
              <div style={{ padding: "16px 18px 20px" }}>
                <h3 style={{ color: "#F5F0E8", fontSize: 15.5, fontWeight: 700, margin: "0 0 6px" }}>{s.name}</h3>
                <p style={{ color: "rgba(200,194,178,0.9)", fontSize: 14, lineHeight: 1.6, margin: 0 }}>{s.benefit}</p>
              </div>
            </div>
          ))}
        </div>

        <div style={{ textAlign: "center", marginTop: 44, opacity: visible ? 1 : 0, transition: "opacity 0.6s ease 0.5s" }}>
          <Link href="/creer" style={{ display: "inline-flex", alignItems: "center", gap: 9, background: "linear-gradient(90deg,#C9A84C,#b8953f)", color: "#080808", textDecoration: "none", fontSize: 14, fontWeight: 800, padding: "13px 28px", borderRadius: 11, boxShadow: "0 6px 22px rgba(201,168,76,0.3)" }}>
            Composer ma page — sans compte <span style={{ fontSize: 16 }}>→</span>
          </Link>
        </div>
      </div>
    </section>
  )
}

// ── MAIN ──────────────────────────────────────────────────────────────────────
export default function HomeClient() {
  // Barre CTA mobile : apparaît une fois le hero dépassé, MAIS se masque pres du
  // bas de page pour ne pas doublonner le CTA final (#01).
  const [showSticky, setShowSticky] = useState(false)
  useEffect(() => {
    const onScroll = () => {
      const y = window.scrollY
      const nearBottom = y + window.innerHeight >= document.documentElement.scrollHeight - 260
      setShowSticky(y > 620 && !nearBottom)
    }
    onScroll()
    window.addEventListener("scroll", onScroll, { passive: true })
    window.addEventListener("resize", onScroll, { passive: true })
    return () => { window.removeEventListener("scroll", onScroll); window.removeEventListener("resize", onScroll) }
  }, [])



  return (
    <div style={{ background: "transparent", minHeight: "100vh", fontFamily: "DM Sans, sans-serif" }}>
      <IntroOverlay />
      {/* Données structurées (SEO) — Organization/WebSite/SoftwareApplication+offres/
          HowTo/FAQPage/BreadcrumbList, construites depuis le vrai contenu. */}
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: serializeJsonLd(landingJsonLd(FAQ_ITEMS)) }} />
      <style>{`
        html { scroll-padding-top: 80px; }
        @keyframes heroShimmer { 0%{transform:translateX(-100%)} 100%{transform:translateX(100%)} }
        @media(prefers-reduced-motion:reduce){*,*::before,*::after{animation-duration:0.01ms!important;animation-iteration-count:1!important;transition-duration:0.01ms!important;}}
        @keyframes float { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-14px)} }
        @keyframes floatCard { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-12px)} }
        @keyframes qrReveal { from{opacity:0;transform:scale(0.25)} to{opacity:var(--o,1);transform:scale(1)} }
        @keyframes revealUp { from{opacity:0;transform:translateY(14px)} to{opacity:1;transform:translateY(0)} }
        @keyframes sweepLight { 0%{transform:translateX(-140%) skewX(-18deg);opacity:0} 12%{opacity:0.9} 30%{opacity:0} 100%{transform:translateX(140%) skewX(-18deg);opacity:0} }
        @keyframes gradientShift { 0%,100%{background-position:0% 50%} 50%{background-position:100% 50%} }
        @keyframes glowPulse { 0%,100%{opacity:0.6} 50%{opacity:1} }
        @keyframes heroAura { 0%,100%{opacity:0.82;transform:translateX(-50%) scale(1)} 50%{opacity:1;transform:translateX(-50%) scale(1.06)} }
        @keyframes ctaPulse { 0%,100%{box-shadow:0 4px 28px rgba(201,168,76,0.42)} 50%{box-shadow:0 6px 40px rgba(201,168,76,0.62),0 0 0 6px rgba(201,168,76,0.07)} }
        @keyframes scanLine { 0%{top:12%;opacity:0} 12%{opacity:1} 50%{top:84%} 60%{opacity:1} 70%{opacity:0} 100%{top:84%;opacity:0} }
        @media (prefers-reduced-motion: reduce) {
          *, *::before, *::after { animation-duration: 0.01ms !important; transition-duration: 0.01ms !important; }
        }
        @media (max-width: 768px) {
          .hero-grid { grid-template-columns: 1fr !important; text-align: center; }
          .hero-ctas { justify-content: center !important; }
          .hero-badge { margin: 0 auto 24px !important; }
          .hero-reassurance { text-align: center !important; }
          .hero-qr { margin-top: 48px !important; }
          .hero-qr > div { margin: 0 auto !important; }
          nav { padding: 16px 24px !important; }
          .nav-links { gap: 20px !important; }
        }
        @media (max-width: 760px) { .hero-finder { display: none !important; } }
        @media (max-width: 900px) { .eco-card { display: none !important; } }
        * { box-sizing: border-box; }
      `}</style>

      <Particles />

      {/* NAV */}
      <Navbar />

      {/* HERO */}
      <section style={{
        minHeight: "100vh", display: "flex", alignItems: "center",
        padding: "104px 48px 72px", position: "relative", zIndex: 1, overflow: "hidden"
      }}>
        {/* Ambiance cinématographique — halo doré lumineux + profondeur + vignette */}
        <div aria-hidden="true" style={{ position: "absolute", inset: 0, zIndex: 0, pointerEvents: "none", overflow: "hidden" }}>
          <div style={{
            position: "absolute", top: "-16%", left: "50%", transform: "translateX(-50%)",
            width: "min(920px, 132vw)", height: "min(680px, 88vh)",
            background: "radial-gradient(ellipse at center, rgba(201,168,76,0.17), rgba(201,168,76,0.05) 38%, transparent 68%)",
            filter: "blur(16px)", animation: "heroAura 15s ease-in-out infinite", willChange: "transform, opacity",
          }} />
          <div style={{
            position: "absolute", bottom: "-12%", right: "-10%",
            width: "min(540px, 82vw)", height: 520, borderRadius: "50%",
            background: "radial-gradient(circle, rgba(120,150,255,0.06), transparent 62%)", filter: "blur(48px)",
          }} />
          <div style={{ position: "absolute", inset: 0, background: "radial-gradient(125% 80% at 50% 2%, transparent 52%, rgba(0,0,0,0.55) 100%)" }} />
          {/* Halo carré (signature : finder pattern QR, pas un cercle) */}
          <div className="hero-finder" style={{ position: "absolute", top: "14%", right: "8%", width: 180, height: 180, borderRadius: 36, background: "radial-gradient(rgba(201,168,76,0.10), transparent 70%)", filter: "blur(26px)" }} />
        </div>
        <div className="hero-grid" style={{
          maxWidth: 1140, width: "100%", margin: "0 auto", position: "relative", zIndex: 1,
          display: "grid", gridTemplateColumns: "1.1fr 0.9fr",
          gap: 52, alignItems: "center"
        }}>
          {/* Left: texte */}
          <div>
            {/* Badge */}
            <div className="hero-badge" style={{
              display: "inline-flex", alignItems: "center", gap: 9,
              background: "rgba(201,168,76,0.08)",
              border: "1px solid rgba(201,168,76,0.28)",
              borderRadius: 11, padding: "8px 15px", marginBottom: 20,
              fontSize: 11, color: "#D8BE72", letterSpacing: 2,
              textTransform: "uppercase", fontWeight: 700,
              animation: "mo-fade-up 0.6s ease 0.1s both"
            }}>
              <span aria-hidden="true" style={{ width: 7, height: 7, borderRadius: 2, background: "#C9A84C", animation: "glowPulse 2s ease-in-out infinite", willChange: "opacity" }} />
              Reliez le monde physique au digital
            </div>

            {/* Titre — hierarchie forte, reveal ligne par ligne (aucun effet flashy).
                Les 2 premieres lignes posent le produit, la 3e (or) porte le differenciateur. */}
            <h1 style={{
              fontFamily: "Fraunces, serif",
              fontSize: "clamp(30px, 3.4vw, 52px)",
              color: "#F5F0E8", fontWeight: 800, lineHeight: 1.06,
              margin: "0 0 18px", letterSpacing: "-0.02em",
            }}>
              <span style={{ display: "block", animation: "mo-fade-up 0.7s cubic-bezier(0.22,1,0.36,1) 0.15s both" }}>
                Votre page pro et son
              </span>
              <span style={{
                display: "block", animation: "mo-fade-up 0.7s cubic-bezier(0.22,1,0.36,1) 0.30s both",
                color: "#C9A84C",
              }}>
                QR code dynamique,
              </span>
              <span style={{ display: "block", animation: "mo-fade-up 0.7s cubic-bezier(0.22,1,0.36,1) 0.45s both" }}>
                prêts en 5 minutes.
              </span>
            </h1>

            {/* Sous-titre — benefice d'abord, phrases courtes, tres lisible */}
            <p style={{
              color: "rgba(226,220,206,0.92)", fontSize: 16.5, lineHeight: 1.58,
              margin: "0 0 26px", maxWidth: 452, fontWeight: 400,
              animation: "mo-fade-up 0.7s ease 0.6s both"
            }}>
              Pour les <strong style={{ color: "#F5F0E8", fontWeight: 600 }}>commerçants, indépendants et créateurs</strong> : créez votre page (menu, portfolio, liens…), générez son <strong style={{ color: "#F5F0E8", fontWeight: 600 }}>QR&nbsp;code dynamique</strong>, imprimez-le — puis <strong style={{ color: "#F5F0E8", fontWeight: 600 }}>suivez chaque scan</strong>. Modifiable à tout moment, sans jamais réimprimer.
            </p>

            {/* CTAs */}
            <div className="hero-ctas" style={{
              display: "flex", gap: 14, flexWrap: "wrap", alignItems: "center",
              animation: "mo-fade-up 0.7s ease 0.75s both"
            }}>
              <Link href="/creer" style={{
                background: "linear-gradient(90deg, #C9A84C, #d4a843, #b8953f)",
                backgroundSize: "200% 200%", animation: "gradientShift 3s ease infinite",
                color: "#080808", textDecoration: "none", fontSize: 15, fontWeight: 700,
                padding: "15px 32px", borderRadius: 12, display: "inline-block",
                boxShadow: "0 4px 28px rgba(201,168,76,0.45), 0 0 0 0 rgba(201,168,76,0)",
                transition: "transform 0.25s var(--mo-ease-spring), box-shadow 0.25s ease",
                letterSpacing: 0.2
              }}
                onMouseEnter={e => {
                  const el = e.currentTarget as HTMLElement
                  el.style.transform = "translateY(-3px) scale(1.02)"
                  el.style.boxShadow = "0 8px 40px rgba(201,168,76,0.55), 0 0 0 4px rgba(201,168,76,0.12)"
                }}
                onMouseLeave={e => {
                  const el = e.currentTarget as HTMLElement
                  el.style.transform = "translateY(0) scale(1)"
                  el.style.boxShadow = "0 4px 28px rgba(201,168,76,0.45)"
                }}>
                Composer ma page — sans compte <span aria-hidden="true">→</span>
              </Link>
              <Link href="#qr-studio" style={{
                background: "transparent",
                border: "1px solid rgba(201,168,76,0.2)",
                color: "rgba(245,240,232,0.7)", textDecoration: "none", fontSize: 15,
                padding: "15px 28px", borderRadius: 12, display: "inline-flex",
                alignItems: "center", gap: 8,
                transition: "all 0.2s ease"
              }}
                onMouseEnter={e => {
                  const el = e.currentTarget as HTMLElement
                  el.style.borderColor = "rgba(201,168,76,0.45)"
                  el.style.color = "#F5F0E8"
                  el.style.background = "rgba(201,168,76,0.05)"
                }}
                onMouseLeave={e => {
                  const el = e.currentTarget as HTMLElement
                  el.style.borderColor = "rgba(201,168,76,0.2)"
                  el.style.color = "rgba(245,240,232,0.7)"
                  el.style.background = "transparent"
                }}>
                Voir la démo
              </Link>
            </div>

            {/* Micro-réassurance */}
            <div className="hero-reassurance" style={{
              display: "flex", gap: 20, marginTop: 26, flexWrap: "wrap",
              animation: "mo-fade-up 0.7s ease 0.9s both"
            }}>
              {[
                { t: "Chiffré", href: "/security" },
                { t: "Hébergé en Europe", href: "/security" },
                { t: "QR dynamique", href: undefined as string | undefined },
                { t: "Sans engagement", href: undefined as string | undefined },
              ].map(({ t, href }) => {
                // Mesure au navigateur : 15 px de haut pour deux liens vers la page
                // Securite. `minHeight` sur les deux, marge negative pour que la ligne
                // garde exactement la meme allure ; les deux mentions non cliquables
                // gardent leur hauteur naturelle.
                const st: React.CSSProperties = { display: "inline-flex", alignItems: "center", gap: 8, color: "#BCB6A6", fontSize: 12.5, textDecoration: "none" }
                const stLien: React.CSSProperties = { ...st, minHeight: 44, margin: "-14px 0" }
                const inner = <><span aria-hidden="true" style={{ width: 6, height: 6, borderRadius: 2, background: "rgba(201,168,76,0.85)" }} />{t}</>
                return href
                  ? <Link key={t} href={href} style={stLien} title="En savoir plus sur la sécurité">{inner}</Link>
                  : <span key={t} style={st}>{inner}</span>
              })}
            </div>
          </div>

          {/* Right: QR */}
          <div className="hero-qr" style={{
            animation: "float 5s ease-in-out infinite", willChange: "transform",
            zIndex: 1, display: "flex", justifyContent: "center"
          }}>
            <QRMockup />
          </div>
        </div>
      </section>

      {/* (Bande de réassurance retirée : redondante avec les puces du hero.) */}

      {/* HOW IT WORKS */}
      <HowItWorks />
      <SectionSeam delay={0} />

      {/* FEATURES */}
      <FeaturesSection />
      <SectionSeam delay={0.7} />

      {/* TEMPLATES — les RÉSULTATS montrés AVANT le builder (« voici ce que vous pouvez créer »). */}
      <TemplatesSection />
      <SectionSeam delay={1.05} />

      {/* BuilderSection retiree (declutter accueil) — composant conserve, non rendu. */}

      {/* StoryFlow retiree (declutter accueil) — composant conserve, non rendu. */}

      {/* QR STUDIO LIVE — démo interactive (vrai QR généré en local, aperçu en direct) */}
      <QRStudioLive />
      <SectionSeam delay={3} />

      {/* QR DYNAMIQUE — fusionné : concept déjà couvert (hero, key-points, fonctionnalités, FAQ).
          Section retirée pour réduire la redondance (Pb 10). Réactivable : <QRDynamicSection /> */}

      {/* ANALYTICS */}
      <AnalyticsSection />
      <SectionSeam delay={3.5} />

      {/* PrintStudioSection retiree (declutter accueil) — composant conserve, non rendu. */}

      {/* USE CASES */}
      <UseCasesSection />
      <SectionSeam delay={1.0} />

      {/* BrandProSection retiree (declutter accueil) — le "Sans branding" reste dans les tarifs. */}

      {/* ComparisonSection retiree (declutter accueil) — composant conserve, non rendu. */}

      {/* PRICING */}
      <PricingSection />
      <SectionSeam delay={2.5} />

      {/* FAQ */}
      <FAQSection />

      {/* CTA FINAL */}
      <section className="cta-final-section" style={{ padding:"110px 48px 90px", position:"relative", zIndex:1, overflow:"hidden" }}>
        <style>{`
          @keyframes ctaGlow{0%,100%{opacity:0.5}50%{opacity:1}}
          @media(max-width:640px){ .cta-final-section{padding:80px 20px 70px!important;} }
        `}</style>
        {/* Halo cinématographique du CTA final */}
        <div aria-hidden="true" style={{
          position:"absolute", top:"50%", left:"50%", transform:"translate(-50%,-50%)",
          width:"min(900px,120vw)", height:560,
          background:"radial-gradient(ellipse at center, rgba(201,168,76,0.14), transparent 66%)",
          animation:"ctaGlow 5s ease-in-out infinite", pointerEvents:"none", zIndex:0,
        }}/>
        <div style={{
          maxWidth:720, margin:"0 auto", textAlign:"center",
          position:"relative", zIndex:1,
        }}>

          {/* Card */}
          <div style={{
            background:"linear-gradient(145deg, rgba(201,168,76,0.08), rgba(201,168,76,0.03))",
            border:"1px solid rgba(201,168,76,0.28)",
            borderRadius:24, padding:"60px 48px",
            position:"relative", overflow:"hidden",
          }}>
            {/* Corner accents */}
            {[{top:0,left:0,bt:"2px solid rgba(201,168,76,0.5)",bl:"2px solid rgba(201,168,76,0.5)",br:0,bb:0,btr:"24px 0 0 0"},
              {bottom:0,right:0,bb:"2px solid rgba(201,168,76,0.5)",br2:"2px solid rgba(201,168,76,0.5)",bt:0,bl:0,btr:"0 0 24px 0"}
            ].map((_, idx) => idx === 0 ? (
              <div key={0} aria-hidden="true" style={{
                position:"absolute",top:0,left:0,width:40,height:40,
                borderTop:"2px solid rgba(201,168,76,0.45)",
                borderLeft:"2px solid rgba(201,168,76,0.45)",
                borderRadius:"24px 0 0 0",pointerEvents:"none",
              }}/>
            ) : (
              <div key={1} aria-hidden="true" style={{
                position:"absolute",bottom:0,right:0,width:40,height:40,
                borderBottom:"2px solid rgba(201,168,76,0.45)",
                borderRight:"2px solid rgba(201,168,76,0.45)",
                borderRadius:"0 0 24px 0",pointerEvents:"none",
              }}/>
            ))}

            {/* QR flottant — l'objet de désir, en tête du CTA */}
            <div style={{ display:"flex", justifyContent:"center", marginBottom:26 }}>
              <div style={{
                width:90, height:90, borderRadius:22,
                background:"linear-gradient(145deg,#151210,#0d0c09)",
                border:"1px solid rgba(201,168,76,0.42)",
                display:"flex", alignItems:"center", justifyContent:"center",
                boxShadow:"0 16px 44px rgba(0,0,0,0.55), 0 0 54px rgba(201,168,76,0.2)",
                animation:"float 5s ease-in-out infinite",
              }}>
                <QRMiniSvg fg="#F5F0E8" bg="transparent" accent="#C9A84C" size={58} />
              </div>
            </div>

            <h2 style={{
              fontFamily:"Fraunces, serif",
              fontSize:"clamp(28px,4vw,48px)",
              color:"#F5F0E8", fontWeight:700,
              margin:"0 0 20px", lineHeight:1.12,
              letterSpacing:"-0.02em",
            }}>
              Prêt à transformer votre QR code en{" "}
              <span style={{ color:"#C9A84C" }}>vraie page professionnelle ?</span>
            </h2>

            <p style={{
              color:"rgba(188,182,166,0.85)", fontSize:17,
              lineHeight:1.7, margin:"0 0 44px", maxWidth:520,
              marginLeft:"auto", marginRight:"auto",
            }}>
              Créez votre QRowg gratuitement, personnalisez votre page et commencez à suivre vos scans en quelques minutes.
            </p>

            <Link href="/creer" style={{
              display:"inline-flex", alignItems:"center", gap:10,
              background:"linear-gradient(90deg,#C9A84C,#b8953f)",
              color:"#080808", textDecoration:"none",
              fontSize:16, fontWeight:800,
              padding:"16px 40px", borderRadius:13,
              letterSpacing:0.2,
              transition:"transform 0.25s var(--mo-ease-spring), box-shadow 0.25s",
            }}
              onMouseEnter={e=>{const el=e.currentTarget as HTMLElement;el.style.transform="translateY(-3px) scale(1.03)";el.style.animation="none";el.style.boxShadow="0 8px 40px rgba(201,168,76,0.55)"}}
              onMouseLeave={e=>{const el=e.currentTarget as HTMLElement;el.style.transform="none"}}>
              Composer ma page — sans compte
              <span style={{ fontSize:18 }}>→</span>
            </Link>

            <p style={{
              color:"rgba(188,182,166,0.5)", fontSize:12.5,
              margin:"20px 0 0", letterSpacing:0.3,
            }}>
              Gratuit · Sans carte bancaire · Annulation à tout moment
            </p>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer style={{ borderTop:"1px solid rgba(201,168,76,0.1)", position:"relative", zIndex:2 }} aria-label="Pied de page">
        <style>{`
          .fg { display:grid; grid-template-columns:1.6fr 1fr 1fr 1fr 1fr 1fr; gap:36px; padding:56px 48px 48px; }
          .fc-title { color:#C9A84C; font-size:10px; letter-spacing:2.5px; text-transform:uppercase; font-weight:700; margin-bottom:18px; }
          .fl { display:block; color:rgba(188,182,166,0.72); text-decoration:none; font-size:13.5px; margin-bottom:11px; line-height:1.4; transition:color 0.2s; }
          .fl:hover { color:#F5F0E8; }
          .fl:focus-visible { outline:2px solid rgba(201,168,76,0.5); outline-offset:3px; border-radius:3px; }
          .fl-soon { color:rgba(188,182,166,0.35) !important; cursor:default; pointer-events:none; }
          .fl-soon::after { content:" (bientôt)"; font-size:10px; }
          .fb { padding:16px 48px 24px; border-top:1px solid rgba(255,255,255,0.05); display:flex; align-items:center; justify-content:space-between; flex-wrap:wrap; gap:12px; }
          .fsoc { display:flex; align-items:center; gap:8px; margin-top:20px; }
          .fsoc a { display:flex; align-items:center; justify-content:center; width:32px; height:32px; border-radius:8px; border:1px solid rgba(255,255,255,0.1); color:rgba(188,182,166,0.65); text-decoration:none; font-size:14px; transition:all 0.2s; }
          .fsoc a:hover { border-color:rgba(201,168,76,0.4); color:#C9A84C; background:rgba(201,168,76,0.07); }
          .fsoc a:focus-visible { outline:2px solid rgba(201,168,76,0.5); outline-offset:3px; }
          .fstatus { display:inline-flex; align-items:center; gap:6px; padding:4px 10px; border-radius:20px; background:rgba(57,255,143,0.07); border:1px solid rgba(57,255,143,0.18); color:rgba(57,255,143,0.8); font-size:11px; font-weight:600; text-decoration:none; transition:all 0.2s; }
          .fstatus:hover { background:rgba(57,255,143,0.12); border-color:rgba(57,255,143,0.35); }
          .fstatus-dot { width:6px; height:6px; border-radius:50%; background:var(--success); animation:fpulse 2s ease-in-out infinite; }
          @keyframes fpulse { 0%,100%{opacity:1} 50%{opacity:0.4} }
          @media(max-width:1100px){ .fg{ grid-template-columns:1fr 1fr 1fr!important; gap:32px!important; } }
          @media(max-width:700px){
            /* Footer ultra compact sur mobile : 1 colonne, accordéons repliés, méta masquée */
            .fg{ grid-template-columns:1fr!important; gap:0!important; padding:16px 22px 8px!important; }
            .f-brand-desc{ display:none!important; }
            .f-brand-link{ margin-bottom:6px!important; }
            .f-brand-link span{ font-size:19px!important; }
            .fl{ margin-bottom:6px!important; font-size:13px!important; }
            .fsoc{ margin-top:8px!important; margin-bottom:4px!important; gap:6px!important; }
            .fsoc a{ width:26px!important; height:26px!important; }
            .fb{ padding:10px 22px 14px!important; flex-direction:column!important; align-items:flex-start!important; gap:6px!important; }
            .fstatus{ display:none!important; }
            .f-meta{ display:none!important; }
          }
          @media(prefers-reduced-motion:reduce){ .fstatus-dot{ animation:none!important; } }
        `}</style>

        {/* Grille 6 colonnes (brand + 5 colonnes de liens) */}
        <div className="fg">

          {/* Col 1: Brand */}
          <div>
            <Link href="/" aria-label="QRowg — Accueil" className="f-brand-link" style={{ textDecoration:"none", display:"inline-block", marginBottom:12 }}>
              <QrowgLogo size={24} />
            </Link>
            <p className="f-brand-desc" style={{ color:"rgba(188,182,166,0.65)", fontSize:13, lineHeight:1.7, maxWidth:220, margin:0 }}>
              QRowg transforme les QR codes en expériences interactives.
            </p>
            {/* Réseaux sociaux — retirés jusqu'à l'ouverture des comptes officiels
                (règle anti-faux : pas de liens vers des comptes inexistants). */}
          </div>

          {/* Col 2: Produit */}
          <FooterCol title="Produit">
            <Link href="/features"          className="fl">Fonctionnalités</Link>
            <Link href="/#templates"        className="fl">Templates</Link>
            <Link href="/dashboard/builder/new" className="fl">Builder</Link>
            <Link href="/#analytics"        className="fl">Analytics</Link>
            <Link href="/#features"         className="fl">QR Codes</Link>
            <Link href="/#pricing"          className="fl">Tarifs</Link>
          </FooterCol>

          {/* Col 3: Ressources */}
          <FooterCol title="Ressources">
            <Link href="/guides"   className="fl">Guides</Link>
            <Link href="/#faq"     className="fl">FAQ</Link>
            <Link href="/examples" className="fl">Exemples</Link>
            <Link href="/contact"  className="fl">Contact</Link>
            <span className="fl fl-soon" aria-label="Blog — bientôt disponible">Blog</span>
          </FooterCol>

          {/* Col: QR codes par usage (maillage interne SEO) */}
          <FooterCol title="QR codes">
            <Link href="/generateur-qr-code"   className="fl">Générateur gratuit</Link>
            <Link href="/qr-code"              className="fl">Tous les usages</Link>
            <Link href="/qr-code/restaurant"   className="fl">QR code restaurant</Link>
            <Link href="/qr-code/menu"         className="fl">QR code menu</Link>
            <Link href="/qr-code/avis-google"  className="fl">QR code avis Google</Link>
            <Link href="/qr-code/wifi"         className="fl">QR code WiFi</Link>
          </FooterCol>

          {/* Col 4: Légal */}
          <FooterCol title="Légal">
            <Link href="/security" className="fl">Sécurité</Link>
            <Link href="/privacy" className="fl">Confidentialité</Link>
            <Link href="/terms"   className="fl">Conditions</Link>
            <Link href="/legal"   className="fl">Mentions légales</Link>
          </FooterCol>

          {/* Col 5: Entreprise */}
          <FooterCol title="Entreprise">
            <span className="fl fl-soon" aria-label="À propos — bientôt disponible">À propos</span>
            <span className="fl fl-soon" aria-label="Roadmap — bientôt disponible">Roadmap</span>
            <span className="fl fl-soon" aria-label="Changelog — bientôt disponible">Changelog</span>
          </FooterCol>

        </div>

        {/* Barre bas */}
        <div className="fb" role="contentinfo">
          <div style={{ display:"flex",alignItems:"center",gap:20,flexWrap:"wrap" }}>
            <p style={{ color:"rgba(188,182,166,0.45)",fontSize:12,margin:0 }}>
              © {new Date().getFullYear()} QRowg. Tous droits réservés.
            </p>
            <span className="f-meta" style={{ color:"rgba(188,182,166,0.2)",fontSize:12 }} aria-hidden="true">·</span>
            <span className="f-meta" style={{ color:"rgba(188,182,166,0.35)",fontSize:11,fontFamily:"monospace" }}>
              v1.0.0
            </span>
          </div>
          <div style={{ display:"flex",alignItems:"center",gap:16,flexWrap:"wrap" }}>
            <span className="fstatus" role="status" aria-label="Tous les systèmes opérationnels">
              <span className="fstatus-dot" aria-hidden="true"/>
              Tous les systèmes opérationnels
            </span>
            <div style={{ display:"flex",gap:14 }}>
              {([["Confidentialité","/privacy"],["Conditions","/terms"]] as const).map(([lbl,href])=>(
                <Link key={href} href={href} style={{ color:"rgba(188,182,166,0.4)",fontSize:12,textDecoration:"none",transition:"color 0.2s" }}
                  onMouseEnter={e=>{(e.currentTarget as HTMLElement).style.color="#C9A84C"}}
                  onMouseLeave={e=>{(e.currentTarget as HTMLElement).style.color="rgba(188,182,166,0.4)"}}>
                  {lbl}
                </Link>
              ))}
            </div>
          </div>
        </div>
      </footer>

      {/* Reserve d'espace en bas quand la barre CTA collante est visible (mobile) -> ne masque plus le contenu */}
      <div aria-hidden className={`m-sticky-cta-spacer${showSticky ? " show" : ""}`} />
      {/* CTA mobile collant — apparaît après le hero, masqué sur desktop (CSS .m-sticky-cta) */}
      <div className={`m-sticky-cta${showSticky ? " show" : ""}`} aria-hidden={!showSticky}>
        <Link href="/creer" style={{
          display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
          width: "100%", padding: "14px", borderRadius: 12,
          background: "linear-gradient(90deg, #C9A84C, #b8953f)",
          color: "#080808", fontWeight: 800, fontSize: 15, textDecoration: "none",
          boxShadow: "0 6px 22px rgba(201,168,76,0.4)",
        }}>
          Composer ma page — sans compte <span style={{ fontSize: 16 }}>→</span>
        </Link>
      </div>
    </div>
  )
}
