"use client"

import { useEffect, useState, Component } from "react"
import dynamic from "next/dynamic"
import SmartImage from "@/components/SmartImage"
// Les images de la page publiée : celles qui SONT le contenu (galerie, carrousel,
// bannière sans texte incrusté) reçoivent un texte alternatif ; les vignettes
// posées à côté d'un titre déjà lisible gardent `alt=""` — un lecteur d'écran
// qui annonce deux fois le même nom est plus pénible qu'utile (WCAG H67).
import { AnimatedBlock, BlockBoundary, SIZES_DEMI } from "./blocsPublics"
import PageIntro from "@/components/pageIntro/PageIntro"
import { trackPageView } from "@/lib/trackPageView"
import { queueEngagement, trackDwell, queueTap } from "@/lib/trackEngagement"
import { trackLinkClick } from "@/lib/trackLinkClick"
import { normalizePageTheme } from "../dashboard/builder/types"
import { resolvePublicBlock } from "../dashboard/builder/shared-renderer/publicRegistry"
import { themeBackgroundStyle, blockDecoration } from "../dashboard/builder/types"

type Block = { id: string; type: string; content: Record<string, any>; position: number }
type Page = { id: string; title: string; slug: string; theme: any; total_views: number; profiles: any }

// ── Intersection Observer Hook ──────────────────────────────────────────────
// Renderer d'un bloc de la page publiée.
//
// Deux chemins : le renderer PARTAGÉ (une seule source pour l'aperçu de
// l'éditeur et la page publiée) et, pour les blocs qui n'y sont pas encore, le
// rendu legacy — chargé à la demande depuis `renduLegacy.tsx` au lieu de
// voyager dans le morceau que tout visiteur télécharge après un scan.
// Rollback inchangé : retirer un type de SHARED_RENDERER_BLOCKS le renvoie vers
// le legacy, qui se charge alors tout seul.
const RenduLegacy = dynamic(() => import("./renduLegacy").then(m => m.RenduLegacy))

function RenderBlock({ block, theme, pageId, ownerEmail, totalViews, h1Owner }: { block: Block; theme: any; pageId: string; ownerEmail?: string; totalViews?: number; h1Owner?: string }) {
  const SharedPublic = resolvePublicBlock(block.type)
  if (!SharedPublic) return <RenduLegacy block={block} theme={theme} pageId={pageId} ownerEmail={ownerEmail} totalViews={totalViews} h1Owner={h1Owner} />
  // Mêmes valeurs, au caractère près, que dans l'ancien corps de RenderBlock.
  return <SharedPublic content={block.content} ctx={{
    theme,
    G: theme.primary || "#C9A84C",
    TEXT: theme.text || "#F5F0E8",
    MUTED: theme.muted || "#8A8478",
    FONT_D: theme.fontDisplay || "Fraunces, serif",
    FONT_B: theme.fontBody || "DM Sans, sans-serif",
    pageId, blockId: block.id,
    trackClick: (cible: string) => trackLinkClick(pageId, block.id, cible),
  }} />
}

// ── Main Component ────────────────────────────────────────────────────────────
export default function PublicPageClient({ page, blocks, showBranding = true, introEligible = false }: { page: Page; blocks: Block[]; showBranding?: boolean; introEligible?: boolean }) {
  // Thème NORMALISÉ à la frontière : même source de vérité que le Builder → parité
  // garantie, anciens formats pris en charge, aucun JSON invalide ne peut planter le rendu.
  const theme = normalizePageTheme(page.theme)

  // Un seul <h1> par page : le premier bloc « profil » qui porte un nom le remporte.
  // Les profils suivants (une page peut en contenir plusieurs) rendent un simple
  // paragraphe de même apparence — le rendu ne bouge pas, la structure devient valide.
  const h1Owner = blocks.find(b => b.type === "profile" && (b.content?.name || "").trim())?.id

  // Charge les polices Google du thème — uniquement les polices CUSTOM (Fraunces
  // et DM Sans sont déjà chargées par le layout -> évite une requête redondante + le FOUT).
  // Chaque famille reçoit son propre axe de poids (sinon seule la dernière chargeait 600/700,
  // laissant le nom du profil en faux-gras).
  useEffect(() => {
    const DEFAULTS = new Set(["Fraunces", "DM Sans"])
    const custom = [...new Set(
      [theme.fontDisplay, theme.fontBody]
        .filter(Boolean)
        .map((f: string) => f.replace(/,.*/, "").trim())
        .filter((f: string) => f && !DEFAULTS.has(f))
    )]
    if (!custom.length) return
    const families = custom.map(f => `family=${f.replace(/ /g, "+")}:wght@400;600;700`).join("&")
    const href = `https://fonts.googleapis.com/css2?${families}&display=swap`
    if (document.querySelector(`link[data-qf-font][href="${href}"]`)) return
    const link = document.createElement("link")
    link.rel = "stylesheet"
    link.href = href
    link.setAttribute("data-qf-font", "1")
    document.head.appendChild(link)
  }, [theme.fontDisplay, theme.fontBody])

  // Vue de page (analytics) : comptee une fois par page, cote client.
  // dedup StrictMode + navigation client-side gere dans trackPageView().
  useEffect(() => { trackPageView(page.id) }, [page.id])

  // Engagement (RGPD, sans PII) : impressions + profondeur de scroll + temps d'attention par bloc.
  useEffect(() => {
    if (typeof window === "undefined" || typeof IntersectionObserver === "undefined") return
    const pageId = page.id
    const seen = new Set<string>()                                   // impressions déjà envoyées
    const dwell = new Map<string, { start: number | null; total: number }>()  // ms visibles par bloc
    let dwellSent = false

    // 1) Un bloc visible à ~50 % : impression (une fois) + démarrage du chrono de visibilité.
    const io = new IntersectionObserver((entries) => {
      const now = performance.now()
      for (const e of entries) {
        const id = (e.target as HTMLElement).getAttribute("data-qf-block")
        if (!id) continue
        if (e.isIntersecting) {
          if (!seen.has(id)) { seen.add(id); queueEngagement(pageId, "impression", id) }
          const d = dwell.get(id) || { start: null, total: 0 }
          if (d.start == null) d.start = now
          dwell.set(id, d)
        } else {
          const d = dwell.get(id)
          if (d && d.start != null) { d.total += now - d.start; d.start = null }
        }
      }
    }, { threshold: 0.5 })
    document.querySelectorAll("[data-qf-block]").forEach(el => io.observe(el))

    // 2) Profondeur de scroll : jalons 25/50/75/100 %, une fois chacun.
    let ticking = false
    const onScroll = () => {
      if (ticking) return
      ticking = true
      requestAnimationFrame(() => {
        ticking = false
        const doc = document.documentElement
        const scrollable = doc.scrollHeight - window.innerHeight
        const pct = scrollable <= 0 ? 100 : Math.round(((window.scrollY || doc.scrollTop) / scrollable) * 100)
        for (const m of [25, 50, 75, 100]) if (pct >= m) queueEngagement(pageId, "scroll", String(m))
      })
    }
    onScroll()
    window.addEventListener("scroll", onScroll, { passive: true })

    // 3) Temps d'attention : à la première mise en arrière-plan / fermeture, on envoie les totaux (>= 2 s).
    const sendDwell = () => {
      if (dwellSent) return
      const now = performance.now()
      const entries: { ref: string; value: number }[] = []
      dwell.forEach((d, id) => {
        let ms = d.total
        if (d.start != null) { ms += now - d.start; d.start = now }
        const sec = Math.round(ms / 1000)
        if (sec >= 2) entries.push({ ref: id, value: sec })
      })
      if (entries.length) { dwellSent = true; trackDwell(pageId, entries) }
    }
    const onHidden = () => { if (document.visibilityState === "hidden") sendDwell() }
    document.addEventListener("visibilitychange", onHidden)
    window.addEventListener("pagehide", sendDwell)

    // 3bis) Carte de chaleur : position normalisée de chaque clic/tap (x = largeur, y = hauteur totale).
    // On remonte au bloc touché (data-qf-block) pour le classement par bloc. RGPD : que des fractions d'écran.
    const onTap = (ev: MouseEvent) => {
      const fullH = Math.max(document.documentElement.scrollHeight, 1)
      const x = ev.clientX / Math.max(window.innerWidth, 1)
      const y = (window.scrollY + ev.clientY) / fullH
      let el = ev.target as HTMLElement | null
      let ref = "-"
      while (el && el !== document.body) {
        const id = el.getAttribute?.("data-qf-block")
        if (id) { ref = id; break }
        el = el.parentElement
      }
      queueTap(pageId, ref, x, y)
    }
    document.addEventListener("click", onTap, { capture: true })

    // 4) Moteur d'animations : révélation au scroll. On active le mode animé (gate CSS) puis, après
    // une frame (pour peindre l'état masqué), on observe les blocs .qf-reveal pour ajouter .qf-in.
    document.documentElement.classList.add("qf-anim-ready")
    let revealIo: IntersectionObserver | null = null
    const rafId = requestAnimationFrame(() => {
      revealIo = new IntersectionObserver((entries) => {
        for (const e of entries) {
          if (e.isIntersecting) { (e.target as HTMLElement).classList.add("qf-in"); revealIo!.unobserve(e.target) }
        }
      }, { threshold: 0.12, rootMargin: "0px 0px -8% 0px" })
      document.querySelectorAll(".qf-reveal").forEach(el => revealIo!.observe(el))
    })

    return () => {
      io.disconnect()
      window.removeEventListener("scroll", onScroll)
      document.removeEventListener("visibilitychange", onHidden)
      window.removeEventListener("pagehide", sendDwell)
      document.removeEventListener("click", onTap, { capture: true })
      cancelAnimationFrame(rafId)
      revealIo?.disconnect()
      document.documentElement.classList.remove("qf-anim-ready")
    }
  }, [page.id])

  // Animation d'entrée (Pro+). `introEligible` est résolu CÔTÉ SERVEUR (plan du
  // propriétaire) ; le flag `intro_enabled` vient du thème éditable dans le builder.
  const introProfile = (blocks.find(b => b.type === "profile")?.content ?? {}) as any
  const introHex = (c: string) => /^#[0-9a-fA-F]{3,8}$/.test(c || "") ? c : "#C9A84C"
  const showIntro = introEligible && !!(theme as any).intro_enabled
  const introTitle = introProfile.name || (page as any).title || "Ma page"
  const introAccent = introHex(theme.primary)
  // Cache SSR : présent dès le 1er paint (fond de la page + tuile), retiré par
  // l'intro client une fois son overlay en place → aucun flash blanc/de contenu.
  const [coverGone, setCoverGone] = useState(false)
  const introOn = (() => {
    const h = introAccent.replace("#", ""); const hh = h.length === 3 ? h.split("").map(c => c + c).join("") : h
    const n = parseInt(hh || "0", 16); const r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255
    return (0.2126 * r + 0.7152 * g + 0.0722 * b) > 150 ? "#111111" : "#FFFFFF"
  })()

  return (
    <div className="qf-public" style={{ minHeight: "100vh", background: theme.bgGradient || theme.bg, fontFamily: theme.fontBody, overflowX: "clip", maxWidth: "100vw" }}>
      {showIntro && !coverGone && (
        <div aria-hidden style={{ position: "fixed", inset: 0, zIndex: 2147482999, background: theme.bgGradient || theme.bg, display: "grid", placeItems: "center" }}>
          <div style={{ width: 108, height: 108, borderRadius: 30, overflow: "hidden", background: introAccent, display: "grid", placeItems: "center", color: introOn, fontSize: 40, fontWeight: 600 }}>
            {introProfile.avatar
              ? <SmartImage width={800} height={800} sizes={SIZES_DEMI} src={introProfile.avatar} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
              : (String(introTitle).trim().charAt(0) || "?").toUpperCase()}
          </div>
        </div>
      )}
      {showIntro && (
        <PageIntro
          style={((theme as any).intro_style || "reveal") as any}
          accent={introAccent}
          bg={theme.bg}
          text={theme.text}
          title={introTitle}
          subtitle={introProfile.tagline || ""}
          avatar={introProfile.avatar || ""}
          duration={(theme as any).intro_duration || 2400}
          onReady={() => setCoverGone(true)}
        />
      )}
      <style>{`
        @keyframes fadeInDown { from { opacity:0; transform:translateY(-20px); } to { opacity:1; transform:translateY(0); } }
        @keyframes profilePulse { 0%,100% { box-shadow: 0 0 0 0 ${theme.primary}30; } 50% { box-shadow: 0 0 0 12px ${theme.primary}00; } }
        * { -webkit-tap-highlight-color: transparent; }
        /* iOS zoome (et « bloque » le scroll) au focus d'un champ dont la police < 16px.
           On garantit 16px min sur mobile pour tous les champs de la page publique. */
        @media (max-width: 640px) {
          .qf-public input, .qf-public textarea, .qf-public select { font-size: 16px !important; }
        }
        a:active { opacity: 0.75; }
        a:focus-visible, button:focus-visible, input:focus-visible, textarea:focus-visible, [role="slider"]:focus-visible { outline: 2px solid ${theme.primary}; outline-offset: 2px; border-radius: 4px; }
        @media (max-width: 640px) {
          .qf-hide-mobile { display: none !important; }
          .qf-gm-1 { grid-template-columns: 1fr !important; }
          .qf-gm-2 { grid-template-columns: 1fr 1fr !important; }
          .qf-gm-3 { grid-template-columns: 1fr 1fr 1fr !important; }
          .qf-cm-1 { column-count: 1 !important; }
          .qf-cm-2 { column-count: 2 !important; }
          .qf-cm-3 { column-count: 3 !important; }
        }
        @media (min-width: 641px) { .qf-hide-desktop { display: none !important; } }
        /* Moteur d'animations — révélation au scroll. Gaté par .qf-anim-ready (ajouté par JS)
           pour que SANS JavaScript les blocs restent visibles (pas d'écran blanc). */
        .qf-anim-ready .qf-reveal { opacity: 0; transition: opacity .6s ease, transform .6s cubic-bezier(.22,1,.36,1), filter .6s ease; will-change: opacity, transform; }
        .qf-anim-ready .qf-reveal.qf-in { opacity: 1; transform: none; filter: none; }
        .qf-anim-ready .qf-a-up { transform: translateY(30px); }
        .qf-anim-ready .qf-a-down { transform: translateY(-30px); }
        .qf-anim-ready .qf-a-left { transform: translateX(34px); }
        .qf-anim-ready .qf-a-right { transform: translateX(-34px); }
        .qf-anim-ready .qf-a-zoom { transform: scale(.9); }
        /* Blocs animés : masqués UNIQUEMENT quand JS a posé .qf-anim-ready. Sans JS
           (ou avant hydratation) aucune règle d'opacité ne s'applique -> contenu visible
           immédiatement dans le HTML serveur. */
        .qf-ab { transition: opacity .5s ease, transform .5s ease; }
        .qf-anim-ready .qf-ab { opacity: 0; transform: translateY(20px); }
        .qf-anim-ready .qf-ab.qf-ab-in { opacity: 1; transform: none; }
        .qf-anim-ready .qf-a-zoomout { transform: scale(1.07); }
        .qf-anim-ready .qf-a-rotate { transform: rotate(-4deg) scale(.95); }
        .qf-anim-ready .qf-a-blur { filter: blur(9px); }
        .qf-anim-ready .qf-a-flip { transform: perspective(800px) rotateX(14deg); transform-origin: center bottom; }
        /* Vitesse d'apparition */
        .qf-anim-ready .qf-reveal.qf-sp-slow { transition-duration: .95s; }
        .qf-anim-ready .qf-reveal.qf-sp-fast { transition-duration: .32s; }
        /* Animations en boucle (emphase continue — ex. un CTA) */
        @keyframes qfFloat { 0%,100% { transform: translateY(0); } 50% { transform: translateY(-7px); } }
        @keyframes qfPulse { 0%,100% { transform: scale(1); } 50% { transform: scale(1.03); } }
        @keyframes qfBeat { 0%,100% { box-shadow: 0 0 0 0 ${theme.primary}00; } 50% { box-shadow: 0 0 22px 0 ${theme.primary}55; } }
        .qf-loop-float { animation: qfFloat 3.6s ease-in-out infinite; }
        .qf-loop-pulse { animation: qfPulse 2.8s ease-in-out infinite; }
        .qf-loop-beat { animation: qfBeat 2.2s ease-in-out infinite; }
        @media (prefers-reduced-motion: reduce) { .qf-loop-float,.qf-loop-pulse,.qf-loop-beat { animation: none; } }
        /* Effets au survol (blocs interactifs) */
        .qf-hv-lift { transition: transform .22s ease, box-shadow .22s ease; }
        .qf-hv-lift:hover { transform: translateY(-5px); }
        .qf-hv-zoom { transition: transform .22s ease; }
        .qf-hv-zoom:hover { transform: scale(1.025); }
        .qf-hv-glow { transition: box-shadow .25s ease; }
        .qf-hv-glow:hover { box-shadow: 0 0 26px ${theme.primary}55; }
        @media (prefers-reduced-motion: reduce) {
          .qf-anim-ready .qf-reveal { opacity: 1 !important; transform: none !important; filter: none !important; }
          .qf-hv-lift:hover, .qf-hv-zoom:hover { transform: none; }
        }
      `}</style>

      {/* Container — fond complet selon bgMode (mesh/radial/pattern/image/gradient/solid) pour matcher l'éditeur */}
      <div style={{ maxWidth: "min(480px, 100%)", margin: "0 auto", minHeight: "100vh", ...themeBackgroundStyle(theme as any), boxShadow: "0 0 80px rgba(0,0,0,0.6)", position: "relative", overflowX: "clip", boxSizing: "border-box", overflowWrap: "anywhere", wordBreak: "break-word" }}>

        {/* Exactement un <h1> par page. Sans profil nommé, le titre de la page prend
            le relais (hors écran, mais lu par les moteurs et les lecteurs d'écran). */}
        {!h1Owner && (page.title || "").trim() && (
          <h1 style={{ position: "absolute", width: 1, height: 1, padding: 0, margin: -1, overflow: "hidden", clip: "rect(0 0 0 0)", whiteSpace: "nowrap", border: 0 }}>{page.title}</h1>
        )}

        {/* Blocks with staggered animation */}
        {blocks.map((block, idx) => {
          const deco = blockDecoration(block.content, theme)
          const cls = [
            block.content?.hide_mobile === "yes" ? "qf-hide-mobile" : "",
            block.content?.hide_desktop === "yes" ? "qf-hide-desktop" : "",
            deco.animClass,
          ].filter(Boolean).join(" ")
          return (
            <AnimatedBlock key={block.id} delay={idx < 3 ? idx * 80 : 0}>
              <div className={cls || undefined} style={deco.style} data-qf-block={block.id}>
                <BlockBoundary>
                  <RenderBlock block={block} theme={theme} pageId={page.id} ownerEmail={page.profiles?.contact_email || page.profiles?.email} totalViews={page.total_views} h1Owner={h1Owner} />
                </BlockBoundary>
              </div>
            </AnimatedBlock>
          )
        })}

        {blocks.length === 0 && (
          <div style={{ padding: "84px 28px", textAlign: "center", fontFamily: theme.fontBody }}>
            <p style={{ fontSize: 30, margin: "0 0 12px", color: theme.primary, opacity: 0.6 }}>✦</p>
            <p style={{ fontSize: 15.5, fontWeight: 700, margin: "0 0 6px", color: theme.primary }}>Cette page est en préparation</p>
            <p style={{ fontSize: 13, margin: 0, color: theme.muted }}>Revenez bientôt, le contenu arrive.</p>
          </div>
        )}

        {/* Footer branding — boucle virale. Un vrai CTA (pas juste un backlink discret)
            qui invite le visiteur à créer sa propre page. Retiré sur les plans payants. */}
        {showBranding && (
          <div style={{ padding: "22px 24px 34px", textAlign: "center", borderTop: `1px solid ${theme.primary}10`, marginTop: 8 }}>
            <a href="https://qrowg.com/?utm_source=badge&utm_medium=public_page&utm_campaign=made_with_qrowg" target="_blank" rel="noopener noreferrer"
              style={{ display: "inline-flex", alignItems: "center", gap: 7, padding: "9px 15px", borderRadius: 999, background: `${theme.primary}14`, border: `1px solid ${theme.primary}33`, color: theme.primary, fontSize: 12.5, fontWeight: 800, textDecoration: "none", fontFamily: theme.fontBody }}>
              <span aria-hidden style={{ fontSize: 13 }}>⚡</span> Créez votre page + QR code gratuitement
            </a>
            <div style={{ marginTop: 8, fontSize: 10.5, letterSpacing: 0.8, color: theme.muted, opacity: 0.75, fontFamily: theme.fontBody }}>Créé avec QRowg</div>
          </div>
        )}
      </div>
    </div>
  )
}
