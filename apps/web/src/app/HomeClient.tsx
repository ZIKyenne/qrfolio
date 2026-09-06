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
import { useInView, QRFinder, Eyebrow, QRMiniSvg } from "./homeUi"

// Sections sous la ligne de flottaison : chargées à part, pas dans le JavaScript de
// premier affichage. L'accueil était un seul composant de 3 976 lignes — tout le
// contenu de la page, jusqu'à la FAQ, était téléchargé et analysé avant que le
// héros ne s'anime. Chacune reste rendue côté serveur : le texte est dans le HTML,
// donc lisible par les moteurs de recherche, seul son JavaScript arrive plus tard.
import { FAQ_ITEMS } from "./homeSections/faqData"
const HowItWorks = dynamic(() => import("./homeSections/HowItWorks").then(m => m.HowItWorks))
const FeaturesSection = dynamic(() => import("./homeSections/Features").then(m => m.FeaturesSection))
const TemplatesSection = dynamic(() => import("./homeSections/Templates").then(m => m.TemplatesSection))
const AnalyticsSection = dynamic(() => import("./homeSections/Analytics").then(m => m.AnalyticsSection))
const UseCasesSection = dynamic(() => import("./homeSections/UseCases").then(m => m.UseCasesSection))
const PricingSection = dynamic(() => import("./homeSections/Pricing").then(m => m.PricingSection))
const FAQSection = dynamic(() => import("./homeSections/Faq").then(m => m.FAQSection))
// La démo interactive dessine un vrai QR dans un canvas : rien à indexer, et rien à
// afficher tant que le visiteur ne l'a pas atteinte.
const QRStudioLive = dynamic(() => import("./homeSections/QRStudioLive").then(m => m.QRStudioLive), {
  ssr: false,
  loading: () => <div style={{ minHeight: 520 }} aria-hidden="true" />,
})

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

// ── Comparaison Qrowg vs Linktree vs carte papier ────────────────────────────
// Contenu factuel et defendable : Linktree recoit du credit la ou il le merite
// (editable, analytics/domaine en payant = "partiel"). On ne surclaime pas.
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
            <Link href="/#templates"        className="fl">Modèles</Link>
            {/* /dashboard/* est bloqué aux robots : un lien de pied de page vers
                l'éditeur envoyait Google dans un cul-de-sac, et un visiteur sans
                compte sur un écran de connexion. /creer est la même porte, ouverte. */}
            <Link href="/creer"             className="fl">Créer une page</Link>
            <Link href="/#analytics"        className="fl">Statistiques</Link>
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
            <Link href="/qr-code/wifi"         className="fl">QR code Wi-Fi</Link>
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
