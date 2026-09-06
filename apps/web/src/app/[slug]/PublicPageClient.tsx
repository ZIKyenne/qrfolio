"use client"

import { useEffect, useState, useRef, Component } from "react"
import { ExternalLink } from "lucide-react"
import SmartImage from "@/components/SmartImage"
// Les images de la page publiée : celles qui SONT le contenu (galerie, carrousel,
// bannière sans texte incrusté) reçoivent un texte alternatif ; les vignettes
// posées à côté d'un titre déjà lisible gardent `alt=""` — un lecteur d'écran
// qui annonce deux fois le même nom est plus pénible qu'utile (WCAG H67).
import { altGalerie, altDe } from "@/lib/texteAlternatif"
import { AnimatedBlock, BlockBoundary, FAQPublic, BeforeAfterPublic, CopyButton, ShareButton, HoursPublic, StarRow, CountdownPublic, CarouselPublic, GalleryPublic, TabsPublic, AccordionPublic, RsvpPublic, EventRegisterPublic, LeadFormPublic, AnnouncementPublic, ProfileAvatar, SOCIAL_NETWORKS, SIZES_PLEINE, SIZES_DEMI, sizesGrille } from "./blocsPublics"
import PageIntro from "@/components/pageIntro/PageIntro"
import { trackPageView } from "@/lib/trackPageView"
import { queueEngagement, trackDwell, queueTap } from "@/lib/trackEngagement"
import { trackLinkClick } from "@/lib/trackLinkClick"
import { submitLead } from "@/lib/submitLead"
import { contactFormFields } from "@/lib/leadForms"
import { pricingCtaModel } from "../dashboard/builder/pricingCta"
import { normalizePageTheme } from "../dashboard/builder/types"
import { resolvePublicBlock } from "../dashboard/builder/shared-renderer/publicRegistry"
import { albumBlockCtaModel } from "../dashboard/builder/shared-renderer/models/albumBlockCta"
import { themeBackgroundStyle, avatarShapeStyle, avatarDecoStyle, avatarBgStyle, bannerBackgroundStyle, bannerHeight, bannerImageStyle, bannerTitleStyle, bannerOverlayLayers, bannerFrame, availabilityStatus, profileBadgeStyle, productBadgeStyle, priceDiscount, countdownParts, stockStatus, paymentBrand, paymentLink, starRow, openStatus, DAY_KEYS, buildVCard, mapEmbedUrl, shareLinks, calendarLinks, spotifyEmbedUrl, youtubeId, socialHref, extHref, embedHref, docTypeMeta, docActionLabel, announcementMeta, blockDecoration, waLink, telLink, directionsLink, embedVideoUrl, stickyActionHref, ctaButtonStyle, CTA_ANIM_CSS, SOCIAL_NETWORKS_MAP, BANNER_ANIM_CSS } from "../dashboard/builder/types"

type Block = { id: string; type: string; content: Record<string, any>; position: number }
type Page = { id: string; title: string; slug: string; theme: any; total_views: number; profiles: any }

// ── Intersection Observer Hook ──────────────────────────────────────────────
function RenderBlock({ block, theme, pageId, ownerEmail, totalViews, h1Owner }: { block: Block; theme: any; pageId: string; ownerEmail?: string; totalViews?: number; h1Owner?: string }) {
  const c = block.content
  const G = theme.primary || "#C9A84C"
  const MUTED = theme.muted || "#8A8478"
  const TEXT = theme.text || "#F5F0E8"
  const SURFACE = theme.surface || "#111009"
  const FONT_D = theme.fontDisplay || "Fraunces, serif"
  const FONT_B = theme.fontBody || "DM Sans, sans-serif"

  // Renderer PARTAGÉ (pilotes derrière flag). Flag vide en prod → null → `case` legacy.
  // Rollback = retirer le type de SHARED_RENDERER_BLOCKS ; aucune donnée touchée.
  const SharedPublic = resolvePublicBlock(block.type)
  if (SharedPublic) return <SharedPublic content={c} ctx={{ theme, G, TEXT, MUTED, FONT_D, FONT_B, pageId, blockId: block.id, trackClick: (t: string) => trackLinkClick(pageId, block.id, t) }} />

  switch (block.type) {
    case "profile": {
      // Anti-fake : aucun contenu inventé. Un champ vide est MASQUÉ (jamais de « Mon Nom » ni d'avatar
      // fictif). L'avatar s'affiche s'il y a une photo OU un nom (initiale) et si non explicitement masqué.
      const pName = (c.name || "").trim()
      const pTagline = (c.tagline || "").trim()
      const showAvatar = c.hide_avatar !== "Masquer" && !!(c.avatar || pName)
      if (!showAvatar && !pName && !pTagline && !(c.badge || "").trim()) return null // rien à montrer → pas de bloc vide
      return (
      <div style={{ textAlign: "center", padding: "32px 20px 20px" }}>
        {showAvatar && <ProfileAvatar src={c.avatar} name={pName} fontD={FONT_D} shapeStyle={avatarShapeStyle(c.avatar_shape)} decoStyle={avatarDecoStyle(c.avatar_shape, c.avatar_border, c.avatar_shadow, G)} bgStyle={avatarBgStyle(c.avatar_bg, G, theme.accent || "var(--success)")} />}
        {pName && (h1Owner === block.id
          ? <h1 style={{ color: TEXT, fontSize: 26, fontWeight: 700, margin: "0 0 5px", fontFamily: FONT_D }}>{pName}</h1>
          : <p style={{ color: TEXT, fontSize: 26, fontWeight: 700, margin: "0 0 5px", fontFamily: FONT_D }}>{pName}</p>)}
        {pTagline && <p style={{ color: MUTED, fontSize: 14, margin: c.badge ? "0 0 10px" : "0", fontFamily: FONT_B }}>{pTagline}</p>}
        {c.badge && (
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6, justifyContent: "center" }}>
            {c.badge.split(/[,\n]/).map((b: string) => b.trim()).filter(Boolean).slice(0, 5).map((b: string, i: number) => { const bs = profileBadgeStyle(b, G); return (
              <span key={i} style={{ background: bs.bg, border: `1px solid ${bs.border}`, borderRadius: 20, padding: "4px 14px", fontSize: 12, color: bs.color, fontWeight: 600, fontFamily: FONT_B }}>{bs.icon ? bs.icon + " " : ""}{b}</span>
            ) })}
          </div>
        )}
      </div>
      )
    }

    case "bio":
      if (!c.text) return null            // rien saisi = rien affiché : jamais de texte d'exemple chez un client
      return (
      <div style={{ padding: "6px 24px 16px", textAlign: (c.align as any) || "left" }}>
        <p style={{ color: TEXT, fontSize: 15, lineHeight: 1.75, margin: 0, fontFamily: FONT_B }}>{c.text}</p>
      </div>
    )

    case "skills": {
      const tags = (c.tags || "").split(",").map((t: string) => t.trim()).filter(Boolean)
      if (!tags.length && !c.title) return null
      return (
        <div style={{ padding: "6px 24px 16px" }}>
          {c.title && <p style={{ color: MUTED, fontSize: 11, textTransform: "uppercase", letterSpacing: 2, margin: "0 0 10px", fontFamily: FONT_B }}>{c.title}</p>}
          <div style={{ display: "flex", flexWrap: "wrap", gap: 7 }}>
            {tags.map((tag: string, i: number) => (
              <span key={i} style={{ background: `${G}10`, border: `1px solid ${G}22`, borderRadius: 20, padding: "5px 13px", fontSize: 12, color: G, fontWeight: 600, fontFamily: FONT_B }}>{tag}</span>
            ))}
          </div>
        </div>
      )
    }

    case "cta_button": {
      if (!c.label && !c.url) return null
      const { style: s, className } = ctaButtonStyle(c.style, { G, accent: theme.accent, text: TEXT })
      return (
        <div style={{ padding: "6px 24px 12px" }}>
          {className && <style>{CTA_ANIM_CSS}</style>}
          <a className={className} href={extHref(c.url) || "#"} onClick={() => trackLinkClick(pageId, block.id, c.url || block.type)} style={{ ...s, display: "flex", alignItems: "center", justifyContent: "center", gap: 8, borderRadius: 14, padding: "15px 24px", textDecoration: "none", fontSize: 15, fontWeight: 700, cursor: "pointer", width: "100%", boxSizing: "border-box", fontFamily: FONT_B, transition: "transform 0.15s, box-shadow 0.15s" }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.transform = "translateY(-2px)"; (e.currentTarget as HTMLElement).style.boxShadow = `0 8px 30px ${G}30` }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.transform = "translateY(0)"; (e.currentTarget as HTMLElement).style.boxShadow = s.boxShadow as string || "none" }}>
            {c.icon && <span style={{ fontSize: 16 }}>{c.icon}</span>}{c.label || "Bouton"}
          </a>
        </div>
      )
    }

    case "social_links": {
      const active = Object.entries(SOCIAL_NETWORKS).filter(([key]) => c[key])
      if (active.length === 0) return null
      const disp = c.display || "list"
      const lbl = (key: string, n: any) => c[`${key}__label`] || n.label
      if (disp === "icons") return (
        <div style={{ padding: "6px 24px 16px", display: "flex", flexWrap: "wrap", gap: 10, justifyContent: "center" }}>
          {active.map(([key, n]) => (
            <a key={key} href={socialHref(key, c[key])} onClick={() => trackLinkClick(pageId, block.id, c[key])} target="_blank" rel="noopener noreferrer" aria-label={lbl(key, n)} title={lbl(key, n)}
              style={{ width: 48, height: 48, borderRadius: "50%", background: n.color + "1a", border: `1px solid ${n.color}40`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22, textDecoration: "none" }}>{n.icon}</a>
          ))}
        </div>
      )
      if (disp === "grid") return (
        <div style={{ padding: "6px 24px 16px", display: "grid", gridTemplateColumns: "1fr 1fr", gap: 9 }}>
          {active.map(([key, n]) => (
            <a key={key} href={socialHref(key, c[key])} onClick={() => trackLinkClick(pageId, block.id, c[key])} target="_blank" rel="noopener noreferrer"
              style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4, background: n.color + "10", border: `1px solid ${n.color}25`, borderRadius: 13, padding: "16px 8px", textDecoration: "none", textAlign: "center" }}>
              <span style={{ fontSize: 26 }}>{n.icon}</span>
              <span style={{ color: TEXT, fontSize: 13, fontWeight: 600, fontFamily: FONT_B }}>{lbl(key, n)}</span>
              {c[`${key}__count`] && <span style={{ color: n.color, fontSize: 11, fontWeight: 700, fontFamily: FONT_B }}>{c[`${key}__count`]}</span>}
            </a>
          ))}
        </div>
      )
      return (
        <div style={{ padding: "6px 24px 16px", display: "flex", flexDirection: "column", gap: 9 }}>
          {active.map(([key, n]) => (
            <a key={key} href={socialHref(key, c[key])} onClick={() => trackLinkClick(pageId, block.id, c[key])} target="_blank" rel="noopener noreferrer"
              style={{ display: "flex", alignItems: "center", gap: 13, background: n.color + "10", border: `1px solid ${n.color}22`, borderRadius: 13, padding: "13px 16px", textDecoration: "none", transition: "transform 0.15s, box-shadow 0.15s" }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.transform = "translateY(-2px)"; (e.currentTarget as HTMLElement).style.boxShadow = `0 6px 20px ${n.color}20` }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.transform = "translateY(0)"; (e.currentTarget as HTMLElement).style.boxShadow = "none" }}>
              <div style={{ width: 38, height: 38, borderRadius: 10, background: n.color + "18", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, flexShrink: 0 }}>{n.icon}</div>
              <span style={{ flex: 1, minWidth: 0 }}>
                <span style={{ color: TEXT, fontSize: 14, fontWeight: 600, fontFamily: FONT_B, display: "block" }}>{lbl(key, n)}</span>
                {c[`${key}__count`] && <span style={{ color: MUTED, fontSize: 12, fontFamily: FONT_B }}>{c[`${key}__count`]}</span>}
              </span>
              <ExternalLink size={14} color={n.color} style={{ opacity: 0.7 }} />
            </a>
          ))}
        </div>
      )
    }

    case "social_feature": {
      const n = SOCIAL_NETWORKS_MAP[c.network] || { icon: "🔗", color: G, label: "Réseau" }
      const col = n.color
      return (c.url || c.title) ? (
        <div style={{ padding: "8px 24px 14px" }}>
          <a href={socialHref(c.network, c.url) || "#"} target="_blank" rel="noopener noreferrer" onClick={() => trackLinkClick(pageId, block.id, c.url || "social")} style={{ display: "block", background: `linear-gradient(135deg,${col}22,${col}0a)`, border: `1.5px solid ${col}45`, borderRadius: 18, overflow: "hidden", textDecoration: "none" }}>
            {c.image && <SmartImage width={1200} height={900} sizes={SIZES_DEMI} onError={e => { e.currentTarget.style.display = 'none' }} src={c.image} alt="" style={{ width: "100%", height: 130, objectFit: "cover", display: "block" }} />}
            <div style={{ padding: "16px 18px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
                <span style={{ fontSize: 28 }}>{n.icon}</span>
                <span style={{ color: col, fontSize: 12, fontWeight: 700, fontFamily: FONT_B }}>{n.label}</span>
                <span style={{ marginLeft: "auto", background: col, color: "#080808", borderRadius: 20, padding: "2px 10px", fontSize: 9, fontWeight: 700 }}>PRINCIPAL</span>
              </div>
              <p style={{ color: TEXT, fontSize: 18, fontWeight: 700, margin: "0 0 4px", fontFamily: FONT_D }}>{c.title || "Suivez-moi"}</p>
              {c.description && <p style={{ color: MUTED, fontSize: 13, margin: "0 0 6px", lineHeight: 1.5, fontFamily: FONT_B }}>{c.description}</p>}
              {c.count && <p style={{ color: col, fontSize: 13, fontWeight: 700, margin: "0 0 12px", fontFamily: FONT_B }}>{c.count}</p>}
              <div style={{ background: col, color: "#080808", borderRadius: 11, padding: "12px", textAlign: "center", fontSize: 14, fontWeight: 800, marginTop: c.count ? 0 : 12, fontFamily: FONT_B }}>{c.cta_label || "Suivre"}</div>
            </div>
          </a>
        </div>
      ) : null
    }
    case "heading": {
      if (!c.text) return null
      const sizes: Record<string, number> = { small: 18, medium: 24, large: 32, xl: 42 }
      const hColors: Record<string, string> = { default: TEXT, primary: G, accent: theme.accent || "var(--success)", muted: MUTED }
      return (
        <div style={{ padding: "12px 24px 6px", textAlign: (c.align as any) || "center" }}>
          <h2 style={{ fontFamily: FONT_D, fontSize: sizes[c.size || "medium"], color: hColors[c.color || "default"], fontWeight: 700, margin: "0 0 4px", lineHeight: 1.2 }}>{c.text}</h2>
          {c.subtitle && <p style={{ color: MUTED, fontSize: 13, margin: 0, fontFamily: FONT_B }}>{c.subtitle}</p>}
        </div>
      )
    }

    case "rich_text": return (
      <div style={{ padding: "4px 24px 14px", textAlign: (c.align as any) || "left" }}>
        <p style={{ color: MUTED, fontSize: 14, lineHeight: 1.75, margin: 0, fontFamily: FONT_B }}>{c.text}</p>
      </div>
    )

    case "faq": return <FAQPublic c={c} theme={theme} pageId={pageId} blockId={block.id} />


    case "image": {
      if (!c.src) return null
      const isCircle = c.rounded === "circle"
      const ratioMap: Record<string, string | undefined> = { square: "1", "16:9": "16/9", "9:16": "9/16", "4:3": "4/3" }
      // Cercle -> toujours carré et contenu (évite l'ellipse géante sur une image large)
      const ar = isCircle ? "1" : ratioMap[c.ratio || "original"]
      const radius = isCircle ? "50%" : c.rounded === "rounded" ? 16 : 0
      const imgEl = (
        <SmartImage width={1600} height={1200} sizes={SIZES_PLEINE} src={c.src} alt={c.alt || c.caption || ""} onError={e => (e.currentTarget.style.display = "none")}
          style={{ width: "100%", height: ar ? "100%" : undefined, maxHeight: ar ? undefined : 320, aspectRatio: ar, objectFit: "cover", display: "block", borderRadius: radius, transition: "transform 0.3s" }}
          onMouseEnter={e => (e.currentTarget.style.transform = "scale(1.02)")}
          onMouseLeave={e => (e.currentTarget.style.transform = "scale(1)")} />
      )
      const wrapped = c.link
        ? <a href={extHref(c.link)} target="_blank" rel="noopener noreferrer" onClick={() => trackLinkClick(pageId, block.id, c.link)} style={{ display: "block", textDecoration: "none" }}>{imgEl}</a>
        : imgEl
      return (
        <div style={{ overflow: "hidden", padding: isCircle ? "8px 24px 0" : 0 }}>
          {isCircle ? <div style={{ maxWidth: 240, margin: "0 auto" }}>{wrapped}</div> : wrapped}
          {c.caption && <p style={{ color: MUTED, fontSize: 12, textAlign: "center", margin: "7px 24px", fontFamily: FONT_B }}>{c.caption}</p>}
        </div>
      )
    }

    case "gallery": {
      // Les légendes suivent le MÊME filtre que les photos : sans ça, retirer la
      // photo 2 décalait toutes les descriptions d'un cran.
      const paires = [1,2,3,4,5,6,7,8,9,10,11,12].map(n => [c[`img${n}`], c[`img${n}_alt`]] as const).filter(([u]) => Boolean(u))
      if (paires.length === 0) return null
      const imgs = paires.map(([u]) => u as string)
      const legendes = paires.map(([, a]) => (a as string) || "")
      return <GalleryPublic imgs={imgs} legendes={legendes} layout={c.layout || "grid"} cols={parseInt(c.columns || "3")} colsMobile={parseInt(c.columns_mobile || "2")} title={c.title} MUTED={MUTED} FONT_B={FONT_B} />
    }

    case "video": return c.url ? (
      <div style={{ padding: "6px 24px 16px" }}>
        <div style={{ position: "relative", paddingBottom: "56.25%", height: 0, borderRadius: 14, overflow: "hidden", boxShadow: `0 8px 30px rgba(0,0,0,0.4)` }}>
          <iframe src={embedVideoUrl(c.url)} loading="lazy" title={c.title || "Vidéo"}
            style={{ position: "absolute", top: 0, left: 0, width: "100%", height: "100%", border: "none" }} allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen />
        </div>
        {c.title && <p style={{ color: MUTED, fontSize: 12, textAlign: "center", margin: "8px 0 0", fontFamily: FONT_B }}>{c.title}</p>}
      </div>
    ) : null

    // Réutilise le formulaire de leads partagé (envoi réel via submitLead → /api/leads,
    // owner résolu côté serveur, honeypot, état d'envoi, anti-double-clic, accusé email).
    // Ancienne version : <form> décorative sans handler ⇒ les messages étaient perdus.
    case "contact_form": return <LeadFormPublic block={block} pageId={pageId} ownerEmail={ownerEmail} leadType="contact" title={c.title || "Contact"} fields={contactFormFields(c)} button={c.button_label || "Envoyer"} accent={`linear-gradient(90deg,${G},${G}cc)`} buttonTextColor="#080808" subject="Nouveau message de contact" TEXT={TEXT} MUTED={MUTED} />


    case "testimonials": {
      const reviews = [[c.name1,c.text1,c.stars1],[c.name2,c.text2,c.stars2],[c.name3,c.text3,c.stars3]].filter(([n]) => n)
      return reviews.length > 0 ? (
        <div style={{ padding: "6px 24px 16px", display: "flex", flexDirection: "column", gap: 10 }}>
          {reviews.map(([n,t,s],i) => (
            <div key={i} style={{ background: `${G}05`, border: `1px solid ${G}12`, borderRadius: 14, padding: "15px 16px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 7 }}>
                <p style={{ color: TEXT, fontSize: 13, fontWeight: 700, margin: 0, fontFamily: FONT_B }}>{n}</p>
                <p style={{ color: "#FFD700", fontSize: 13, margin: 0 }}>{"★".repeat(parseInt(s||"5"))}</p>
              </div>
              <p style={{ color: MUTED, fontSize: 13, margin: 0, fontStyle: "italic", lineHeight: 1.65, fontFamily: FONT_B }}>"{t}"</p>
            </div>
          ))}
        </div>
      ) : null
    }

    case "google_maps": return (
      <div style={{ padding: "6px 24px 16px" }}>
        <a href={`https://maps.google.com/?q=${encodeURIComponent(c.address||"")}`} target="_blank" rel="noopener noreferrer"
          style={{ display: "flex", gap: 13, background: "rgba(255,230,109,0.06)", border: "1px solid rgba(255,230,109,0.14)", borderRadius: 14, padding: "15px 16px", textDecoration: "none", transition: "transform 0.15s" }}
          onMouseEnter={e => (e.currentTarget.style.transform = "translateY(-2px)")}
          onMouseLeave={e => (e.currentTarget.style.transform = "translateY(0)")}>
          <span style={{ fontSize: 26, flexShrink: 0 }}>📍</span>
          <div style={{ flex: 1 }}>
            <p style={{ color: TEXT, fontSize: 14, fontWeight: 700, margin: "0 0 2px", fontFamily: FONT_B }}>{c.label || "Adresse"}</p>
            <p style={{ color: MUTED, fontSize: 12, margin: c.transport ? "0 0 3px" : "0", fontFamily: FONT_B }}>{c.address}</p>
            {c.transport && <p style={{ color: MUTED, fontSize: 11, margin: 0, fontFamily: FONT_B }}>🚇 {c.transport}</p>}
          </div>
          <ExternalLink size={15} color="rgba(255,230,109,0.5)" style={{ flexShrink: 0, marginTop: 2 }} />
        </a>
      </div>
    )

    case "opening_hours": return <HoursPublic c={c} theme={theme} />


    case "pricing": {
      const plans = [[c.title1,c.price1,c.desc1,c.old_price1],[c.title2,c.price2,c.desc2,c.old_price2],[c.title3,c.price3,c.desc3,c.old_price3]].filter(([t]) => t)
      const cta = pricingCtaModel(c) // modèle partagé avec l'éditeur (règle de présence identique)
      return plans.length > 0 ? (
        <div style={{ padding: "6px 24px 16px" }}>
          {c.title && <p style={{ color: MUTED, fontSize: 11, textTransform: "uppercase", letterSpacing: 2, margin: "0 0 12px", fontFamily: FONT_B }}>{c.title}</p>}
          <div style={{ display: "flex", gap: 9, flexWrap: "wrap" }}>
            {plans.map(([t,p,d,op]: any[],i: number) => { const disc = priceDiscount(p, op); return (
              <div key={i} style={{ flex: 1, minWidth: 90, position: "relative", background: i===1 ? `${G}10` : "rgba(255,255,255,0.03)", border: `1px solid ${i===1 ? G+"40" : "rgba(255,255,255,0.06)"}`, borderRadius: 13, padding: "16px 12px", textAlign: "center", transition: "transform 0.15s" }}
                onMouseEnter={e => (e.currentTarget.style.transform = "translateY(-3px)")}
                onMouseLeave={e => (e.currentTarget.style.transform = "translateY(0)")}>
                {disc && <span style={{ position: "absolute", top: -9, right: 8, background: "#EF4444", color: "#fff", borderRadius: 6, padding: "2px 7px", fontSize: 10, fontWeight: 800, fontFamily: FONT_B }}>{disc.label}</span>}
                <p style={{ color: MUTED, fontSize: 10, margin: "0 0 5px", textTransform: "uppercase", letterSpacing: 1, fontFamily: FONT_B }}>{t}</p>
                <p style={{ color: G, fontSize: 26, fontWeight: 700, margin: "0 0 4px", fontFamily: FONT_D }}>{p}</p>
                {op && <p style={{ color: MUTED, fontSize: 13, margin: "0 0 4px", textDecoration: "line-through", fontFamily: FONT_B }}>{op}</p>}
                <p style={{ color: MUTED, fontSize: 13.5, margin: 0, fontFamily: FONT_B }}>{d}</p>
                {cta.visible && <a href={cta.href||"#"} onClick={() => trackLinkClick(pageId, block.id, c.cta_url||block.type)} style={{ display: "block", background: `${G}12`, border: `1px solid ${G}25`, color: G, textDecoration: "none", borderRadius: 7, padding: "7px", marginTop: 8, fontSize: 11, fontWeight: 700, fontFamily: FONT_B }}>{cta.label}</a>}
              </div>
            ) })}
          </div>
        </div>
      ) : null
    }

    case "product": return (
      <div style={{ padding: "6px 24px 16px" }}>
        <div style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 15, overflow: "hidden", transition: "transform 0.2s, box-shadow 0.2s" }}
          onMouseEnter={e => { (e.currentTarget as HTMLElement).style.transform = "translateY(-3px)"; (e.currentTarget as HTMLElement).style.boxShadow = `0 12px 40px rgba(0,0,0,0.3)` }}
          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.transform = "translateY(0)"; (e.currentTarget as HTMLElement).style.boxShadow = "none" }}>
          {c.image && <SmartImage width={1600} height={1200} sizes={SIZES_PLEINE} onError={e => { e.currentTarget.style.display = 'none' }} src={c.image} alt={c.name||""} style={{ width: "100%", height: 180, objectFit: "cover", display: "block" }} />}
          <div style={{ padding: "14px 16px" }}>
            <p style={{ color: TEXT, fontSize: 16, fontWeight: 700, margin: "0 0 5px", fontFamily: FONT_D }}>{c.name}</p>
            <div style={{ display: "flex", alignItems: "center", gap: 9, marginBottom: 7 }}>
              <span style={{ color: G, fontSize: 20, fontWeight: 700, fontFamily: FONT_D }}>{c.price}</span>
              {c.old_price && <span style={{ color: MUTED, fontSize: 13, textDecoration: "line-through", fontFamily: FONT_B }}>{c.old_price}</span>}
              {(() => { const d = priceDiscount(c.price, c.old_price); return d ? <span style={{ background: "#EF4444", color: "#fff", borderRadius: 5, padding: "2px 7px", fontSize: 11, fontWeight: 800, fontFamily: FONT_B }}>{d.label}</span> : null })()}
            </div>
            {c.description && <p style={{ color: MUTED, fontSize: 13, margin: "0 0 10px", lineHeight: 1.6, fontFamily: FONT_B }}>{c.description}</p>}
            {(() => { const st = stockStatus(c.stock); return st ? <p style={{ color: st.color, fontSize: 12, fontWeight: 700, margin: "0 0 10px", fontFamily: FONT_B }}>{st.state === "in" ? "✓ " : st.state === "out" ? "⛔ " : "🔥 "}{st.label}</p> : null })()}
            {c.cta_label && (() => { const out = stockStatus(c.stock)?.soldOut; return out
              ? <div style={{ background: "rgba(255,255,255,0.06)", color: MUTED, textAlign: "center", padding: "12px", borderRadius: 9, fontSize: 14, fontWeight: 700, fontFamily: FONT_B, cursor: "not-allowed" }}>Épuisé</div>
              : <a href={extHref(c.cta_url)||"#"} onClick={() => trackLinkClick(pageId, block.id, c.cta_url||block.type)} style={{ display: "block", background: `linear-gradient(90deg,${G},${G}cc)`, color: "#080808", textAlign: "center", padding: "12px", borderRadius: 9, textDecoration: "none", fontSize: 14, fontWeight: 700, fontFamily: FONT_B }}>{c.cta_label}</a> })()}
          </div>
        </div>
      </div>
    )

    case "countdown": return <CountdownPublic c={c} TEXT={TEXT} MUTED={MUTED} FONT_D={FONT_D} FONT_B={FONT_B} pageId={pageId} blockId={block.id} />

    case "promo_banner": return (
      <div style={{ padding: "6px 24px 16px" }}>
        <div style={{ background: "linear-gradient(135deg,rgba(249,115,22,0.12),rgba(249,115,22,0.06))", border: "1px solid rgba(249,115,22,0.25)", borderRadius: 14, padding: "18px 18px", textAlign: "center" }}>
          {c.emoji && <span style={{ fontSize: 30, display: "block", marginBottom: 8 }}>{c.emoji}</span>}
          <p style={{ color: TEXT, fontSize: 17, fontWeight: 700, margin: "0 0 4px", fontFamily: FONT_D }}>{c.text}</p>
          {c.subtext && <p style={{ color: MUTED, fontSize: 13, margin: "0 0 12px", fontFamily: FONT_B }}>{c.subtext}</p>}
          {c.cta_label && <a href={extHref(c.cta_url)||"#"} onClick={() => trackLinkClick(pageId, block.id, c.cta_url||block.type)} style={{ display: "inline-block", background: "#F97316", color: "#fff", padding: "10px 22px", borderRadius: 9, textDecoration: "none", fontSize: 14, fontWeight: 700, fontFamily: FONT_B }}>{c.cta_label}</a>}
        </div>
      </div>
    )

    case "menu_section": return (
      <div style={{ padding: "6px 24px 16px" }}>
        {c.category && <p style={{ color: G, fontSize: 12, fontWeight: 700, margin: "0 0 10px", textTransform: "uppercase", letterSpacing: 1.5, fontFamily: FONT_B }}>{c.category}</p>}
        <div>
          {Array.from({ length: 50 }, (_, k) => [(c as any)[`item${k+1}_name`], (c as any)[`item${k+1}_price`], (c as any)[`item${k+1}_desc`]]).filter(([n]) => n).map(([n,p,d],i,arr) => (
            <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 10, padding: "11px 0", borderBottom: i<arr.length-1 ? "1px solid rgba(255,255,255,0.05)" : "none" }}>
              <div style={{ flex: 1 }}>
                <p style={{ color: TEXT, fontSize: 14, fontWeight: 600, margin: "0 0 2px", fontFamily: FONT_B }}>{n}</p>
                {d && <p style={{ color: MUTED, fontSize: 13.5, margin: 0, fontFamily: FONT_B }}>{d}</p>}
              </div>
              <span style={{ color: G, fontSize: 14, fontWeight: 700, flexShrink: 0, maxWidth: "50%", overflowWrap: "anywhere", fontFamily: FONT_D }}>{p}</span>
            </div>
          ))}
        </div>
      </div>
    )

    case "services_list": {
      const svcs = Array.from({ length: 50 }, (_, k) => { const i = k + 1; return [(c as any)[`s${i}_icon`], (c as any)[`s${i}_name`], (c as any)[`s${i}_desc`]] }).filter(([,n]) => n)
      return svcs.length > 0 ? (
        <div style={{ padding: "6px 24px 16px", display: "flex", flexDirection: "column", gap: 9 }}>
          {c.title && <p style={{ color: MUTED, fontSize: 11, textTransform: "uppercase", letterSpacing: 2, margin: "0 0 4px", fontFamily: FONT_B }}>{c.title}</p>}
          {svcs.map(([icon,name,desc],i) => (
            <div key={i} style={{ display: "flex", gap: 13, background: "rgba(139,92,246,0.06)", border: "1px solid rgba(139,92,246,0.12)", borderRadius: 13, padding: "13px 15px", transition: "transform 0.15s" }}
              onMouseEnter={e => (e.currentTarget.style.transform = "translateX(4px)")}
              onMouseLeave={e => (e.currentTarget.style.transform = "translateX(0)")}>
              <span style={{ fontSize: 24, flexShrink: 0 }}>{icon}</span>
              <div>
                <p style={{ color: TEXT, fontSize: 14, fontWeight: 700, margin: 0, fontFamily: FONT_B }}>{name}</p>
                {desc && <p style={{ color: MUTED, fontSize: 13.5, margin: 0, lineHeight: 1.5, fontFamily: FONT_B }}>{desc}</p>}
              </div>
            </div>
          ))}
        </div>
      ) : null
    }

    case "event_info": return (
      <div style={{ padding: "6px 24px 16px" }}>
        <div style={{ background: "rgba(236,72,153,0.07)", border: "1px solid rgba(236,72,153,0.18)", borderRadius: 15, padding: "18px 18px" }}>
          <p style={{ color: TEXT, fontSize: 19, fontWeight: 700, margin: "0 0 12px", fontFamily: FONT_D }}>{c.name}</p>
          <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: c.cta_label ? "14px" : "0" }}>
            {[["📅",c.date],["🕐",c.time],["📍",c.location],["🎟️",c.price]].filter(([,v]) => v).map(([icon,val]) => (
              <p key={String(icon)} style={{ color: MUTED, fontSize: 13, margin: 0, fontFamily: FONT_B }}>{icon} {val}</p>
            ))}
          </div>
          {c.cta_label && <a href={extHref(c.cta_url)||"#"} onClick={() => trackLinkClick(pageId, block.id, c.cta_url||block.type)} style={{ display: "block", background: "#EC4899", color: "#fff", textAlign: "center", padding: "12px", borderRadius: 9, textDecoration: "none", fontSize: 14, fontWeight: 700, fontFamily: FONT_B }}>{c.cta_label}</a>}
        </div>
      </div>
    )

    case "spotify_player": return (
      <div style={{ padding: "6px 24px 16px" }}>
        <div style={{ background: "rgba(29,185,84,0.07)", border: "1px solid rgba(29,185,84,0.18)", borderRadius: 13, padding: "16px 16px", display: "flex", alignItems: "center", gap: 13 }}>
          <div style={{ width: 48, height: 48, background: "#1DB954", borderRadius: 11, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22, flexShrink: 0 }}>🎧</div>
          <div style={{ flex: 1 }}>
            <p style={{ color: TEXT, fontSize: 14, fontWeight: 700, margin: "0 0 2px", fontFamily: FONT_B }}>{c.title || "Ma musique"}</p>
            <p style={{ color: MUTED, fontSize: 12, margin: 0, fontFamily: FONT_B }}>Ecouter sur Spotify</p>
          </div>
          {c.url && <a href={extHref(c.url)} onClick={() => trackLinkClick(pageId, block.id, c.url||block.type)} target="_blank" rel="noopener noreferrer" style={{ background: "#1DB954", color: "#000", padding: "8px 16px", borderRadius: 20, textDecoration: "none", fontSize: 13, fontWeight: 700, flexShrink: 0 }}>▶ Play</a>}
        </div>
      </div>
    )

    case "music_links": {
      const platforms = [["spotify","🎵","#1DB954","Spotify"],["apple_music","🍎","#FC3C44","Apple Music"],["deezer","🎶","#A238FF","Deezer"],["youtube_music","▶️","#FF0000","YouTube Music"],["soundcloud","☁️","#FF5500","SoundCloud"]].filter(([k]) => c[k as string])
      return platforms.length > 0 ? (
        <div style={{ padding: "6px 24px 16px" }}>
          {c.artist_name && <p style={{ color: TEXT, fontSize: 15, fontWeight: 700, margin: "0 0 12px", textAlign: "center", fontFamily: FONT_D }}>{c.artist_name}</p>}
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {platforms.map(([k,icon,color,label]) => (
              <a key={k} href={extHref((c as any)[k as string])} target="_blank" rel="noopener noreferrer"
                style={{ display: "flex", alignItems: "center", gap: 13, background: (color as string)+"10", border: `1px solid ${color}22`, borderRadius: 12, padding: "12px 15px", textDecoration: "none", transition: "transform 0.15s" }}
                onMouseEnter={e => (e.currentTarget.style.transform = "translateY(-2px)")}
                onMouseLeave={e => (e.currentTarget.style.transform = "translateY(0)")}>
                <span style={{ fontSize: 20 }}>{icon}</span>
                <span style={{ color: TEXT, fontSize: 14, fontWeight: 600, flex: 1, fontFamily: FONT_B }}>{label}</span>
                <ExternalLink size={13} color={color as string} style={{ opacity: 0.7 }} />
              </a>
            ))}
          </div>
        </div>
      ) : null
    }

    case "visit_counter": {
      const views = typeof totalViews === "number" && totalViews > 0 ? totalViews : 0
      if (views <= 0) return null
      const fmt = String(views).replace(/\B(?=(\d{3})+(?!\d))/g, " ")
      return (
        <div style={{ padding: "12px 24px 16px", textAlign: "center" }}>
          <p style={{ fontFamily: FONT_D, fontSize: 44, color: G, fontWeight: 700, margin: "0 0 3px" }}>{fmt}</p>
          <p style={{ color: MUTED, fontSize: 13, margin: 0, fontFamily: FONT_B }}>{c.label || "visiteurs"}</p>
        </div>
      )
    }

    case "divider": {
      const dvStyles: Record<string, React.ReactNode> = {
        gold: <div style={{ height: 1, background: `linear-gradient(90deg,transparent,${G}60,transparent)` }} />,
        line: <div style={{ height: 1, background: "rgba(255,255,255,0.06)" }} />,
        dots: <div style={{ textAlign: "center", color: MUTED, letterSpacing: 10, fontSize: 18 }}>• • •</div>,
        stars: <div style={{ textAlign: "center", color: G, letterSpacing: 10, fontSize: 16 }}>✦ ✦ ✦</div>,
      }
      return <div style={{ padding: "10px 24px" }}>{dvStyles[c.style || "gold"]}</div>
    }

    case "spacer": {
      const spSizes: Record<string, number> = { xs: 8, sm: 16, md: 28, lg: 48, xl: 72 }
      return <div style={{ height: spSizes[c.size || "md"] }} />
    }

    case "calendly": return (
      <div style={{ padding: "6px 24px 16px" }}>
        <div style={{ background: `${G}07`, border: `1px solid ${G}20`, borderRadius: 14, padding: "16px 18px" }}>
          <div style={{ display: "flex", gap: 12, marginBottom: 12 }}>
            <div style={{ width: 42, height: 42, background: `${G}12`, border: `1px solid ${G}25`, borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20 }}>📅</div>
            <div>
              <p style={{ color: TEXT, fontSize: 14, fontWeight: 700, margin: 0, fontFamily: FONT_B }}>{c.label || "Reserver"}</p>
              {c.description && <p style={{ color: MUTED, fontSize: 13.5, margin: 0, fontFamily: FONT_B }}>{c.description}</p>}
            </div>
          </div>
          <a href={extHref(c.url)||"#"} onClick={() => trackLinkClick(pageId, block.id, c.url||"calendly")} target="_blank" rel="noopener noreferrer" style={{ display: "block", background: `linear-gradient(90deg,${G},${G}cc)`, color: "#080808", textAlign: "center", padding: "13px", borderRadius: 9, textDecoration: "none", fontSize: 14, fontWeight: 700, fontFamily: FONT_B }}>{c.label || "Réserver un creneau"}</a>
        </div>
      </div>
    )

    case "instagram_feed": return (
      // Pas d'intégration de feed Instagram -> on ne publie PAS de fausses
      // vignettes 📸 (contenu factice nuisant à la crédibilité). Seul le vrai CTA
      // « Me suivre » est rendu.
      <div style={{ padding: "6px 24px 16px" }}>
        <a href={extHref(c.cta_url) || "#"} onClick={() => trackLinkClick(pageId, block.id, c.cta_url||"instagram")} style={{ display: "block", background: "rgba(225,48,108,0.1)", border: "1px solid rgba(225,48,108,0.25)", color: "#E1306C", textAlign: "center", padding: "12px", borderRadius: 9, textDecoration: "none", fontSize: 13, fontWeight: 700, fontFamily: FONT_B }}>{c.cta_label || "Me suivre sur Instagram"}</a>
      </div>
    )

    case "cover_banner": {
      const h = bannerHeight(c, "public")
      const btype = c.banner_type || (c.src ? "image" : "gradient")
      const pos = c.text_position || "bottom-left"
      const anim = c.animation && c.animation !== "none" ? c.animation : null
      const rad = parseInt(c.block_radius) || 0
      const txtColor = c.text_color || "#fff"
      const bannerBg = bannerBackgroundStyle(c, G)
      const ovLayers = bannerOverlayLayers(c, G)
      const frame = bannerFrame(c, G, rad || 0)
      const alignItems = pos === "center" ? "center" : "flex-end"
      const justifyContent = (pos === "bottom-center" || pos === "center") ? "center" : "flex-start"
      const textAlign: any = (pos === "bottom-center" || pos === "center") ? "center" : "left"
      const inner = (
        <div className={anim ? `qfb qfb-${anim}` : undefined} style={{ position: "relative", overflow: "hidden", borderRadius: rad || undefined, boxShadow: frame.boxShadow }}>
          {anim && <style>{BANNER_ANIM_CSS}</style>}
          {btype === "image"
            ? (c.src
              ? <SmartImage width={1600} height={600} sizes={SIZES_PLEINE} onError={e => { e.currentTarget.style.display = 'none' }} className="qfb-media" src={c.src} alt={c.cover_title ? "" : altDe(c.title, "Bannière")} style={{ width: "100%", height: h, display: "block", ...bannerImageStyle(c) }} />
              : <div className="qfb-media" style={{ width: "100%", height: h, background: `linear-gradient(135deg,${G}33,${theme.accent || "var(--success)"}22)` }} />)
            : <div className="qfb-media" style={{ width: "100%", height: h, ...bannerBg }} />}
          {anim === "shimmer" && <div className="qfb-shine" />}
          {ovLayers.map((l, i) => <div key={i} className={l.className} style={l.style} />)}
          {frame.borderLayer && <div style={frame.borderLayer.style} />}
          {(c.cover_title || c.cover_subtitle || c.badge) && (
            <div className="qfb-content" style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems, justifyContent, padding: "16px 22px", textAlign, gap: 6 }}>
              {c.badge && <span style={{ alignSelf: pos === "bottom-left" ? "flex-start" : "center", background: "rgba(255,255,255,0.18)", backdropFilter: "blur(4px)", border: "1px solid rgba(255,255,255,0.3)", color: "#fff", borderRadius: 20, padding: "3px 12px", fontSize: 11, fontWeight: 700 }}>{c.badge}</span>}
              {c.cover_title && <p style={bannerTitleStyle(c, "public", txtColor, FONT_D)}>{c.cover_title}</p>}
              {c.cover_subtitle && <p style={{ color: txtColor, opacity: 0.9, fontSize: parseInt(c.subtitle_size) || 14, margin: 0, textShadow: "0 1px 8px rgba(0,0,0,0.55)", fontFamily: FONT_B }}>{c.cover_subtitle}</p>}
            </div>
          )}
        </div>
      )
      return c.link_url
        ? <a href={extHref(c.link_url)} target={c.link_blank !== "no" && /^https?:/.test(c.link_url) ? "_blank" : undefined} rel="noopener noreferrer" onClick={() => trackLinkClick(pageId, block.id, c.link_url)} style={{ display: "block", textDecoration: "none", cursor: "pointer" }}>{inner}</a>
        : inner
    }
    case "about": return (c.text || c.title) ? (
      <div style={{ padding: "10px 24px 16px", textAlign: (c.align as any) || "left" }}>
        {c.emoji && <span style={{ fontSize: 22, display: "block", marginBottom: 6 }}>{c.emoji}</span>}
        {c.title && <p style={{ color: G, fontSize: 11, fontWeight: 700, margin: "0 0 6px", textTransform: "uppercase", letterSpacing: 1.5, fontFamily: FONT_B }}>{c.title}</p>}
        <p style={{ color: TEXT, fontSize: 15, lineHeight: 1.75, margin: 0, fontFamily: FONT_B, whiteSpace: "pre-wrap" }}>{c.text}</p>
      </div>
    ) : null
    case "availability": {
      const sc = availabilityStatus(c.status, c.dot_color)
      return (
        <div style={{ padding: "8px 24px 12px" }}>
          <div style={{ background: sc.bg, border: `1px solid ${sc.border}`, borderRadius: 14, padding: "14px 16px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: c.message ? 7 : 0 }}>
              <div style={{ width: 9, height: 9, borderRadius: "50%", background: sc.color, boxShadow: `0 0 8px ${sc.color}80`, flexShrink: 0 }} />
              <p style={{ color: TEXT, fontSize: 15, fontWeight: 700, margin: 0, fontFamily: FONT_B }}>{sc.label}</p>
              {c.available_from && <span style={{ color: MUTED, fontSize: 12, marginLeft: "auto" }}>dès {c.available_from}</span>}
            </div>
            {c.message && <p style={{ color: MUTED, fontSize: 13, margin: "0 0 10px", lineHeight: 1.5, fontFamily: FONT_B }}>{c.message}</p>}
            {c.cta_label && <a href={extHref(c.cta_url) || "#"} onClick={() => trackLinkClick(pageId, block.id, c.cta_url || "availability")} style={{ display: "block", background: `linear-gradient(90deg,${G},${G}cc)`, borderRadius: 10, padding: "11px", textAlign: "center", fontSize: 14, fontWeight: 700, color: "#080808", textDecoration: "none", fontFamily: FONT_B }}>{c.cta_label}</a>}
          </div>
        </div>
      )
    }
    case "journey": {
      const lines = [c.line_1, c.line_2, c.line_3, c.line_4].filter(Boolean)
      return lines.length > 0 ? (
        <div style={{ padding: "8px 24px 14px" }}>
          {c.title && <p style={{ color: MUTED, fontSize: 11, textTransform: "uppercase", letterSpacing: 2, margin: "0 0 9px", fontFamily: FONT_B }}>{c.title}</p>}
          <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
            {lines.map((line: string, i: number) => (
              <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: 11, background: `${G}0a`, border: `1px solid ${G}18`, borderRadius: 11, padding: "11px 12px" }}>
                <span style={{ fontSize: 17, flexShrink: 0 }}>{line.split(" ")[0]}</span>
                <span style={{ color: TEXT, fontSize: 14, lineHeight: 1.5, fontFamily: FONT_B }}>{line.split(" ").slice(1).join(" ")}</span>
              </div>
            ))}
          </div>
        </div>
      ) : null
    }
    case "expertise": {
      const skills = Array.from({ length: 50 }, (_, k) => { const i = k + 1; return [(c as any)[`s${i}_name`], (c as any)[`s${i}_level`], (c as any)[`s${i}_icon`]] }).filter(([n]) => n)
      return skills.length > 0 ? (
        <div style={{ padding: "8px 24px 14px" }}>
          {c.title && <p style={{ color: MUTED, fontSize: 11, textTransform: "uppercase", letterSpacing: 2, margin: "0 0 12px", fontFamily: FONT_B }}>{c.title}</p>}
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {skills.map(([name, level, icon]: any[], i: number) => {
              const pct = Math.round((parseInt(String(level) || "3") / 5) * 100)
              return (
                <div key={i}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 4 }}>
                    <span style={{ color: TEXT, fontSize: 13, display: "flex", alignItems: "center", gap: 6, fontFamily: FONT_B }}>{icon && <span>{icon}</span>}{name}</span>
                    <span style={{ color: G, fontSize: 11, fontWeight: 700 }}>{pct}%</span>
                  </div>
                  <div style={{ height: 5, background: "rgba(255,255,255,0.08)", borderRadius: 3, overflow: "hidden" }}>
                    <div style={{ height: "100%", width: `${pct}%`, background: `linear-gradient(90deg,${G},${theme.accent || "var(--success)"})`, borderRadius: 3 }} />
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      ) : null
    }
    case "languages": {
      const langs = Array.from({ length: 50 }, (_, k) => { const i = k + 1; return [(c as any)[`lang_${i}_flag`], (c as any)[`lang_${i}_name`], (c as any)[`lang_${i}_level`]] }).filter(([, n]) => n)
      return langs.length > 0 ? (
        <div style={{ padding: "8px 24px 14px" }}>
          {c.title && <p style={{ color: MUTED, fontSize: 11, textTransform: "uppercase", letterSpacing: 2, margin: "0 0 9px", fontFamily: FONT_B }}>{c.title}</p>}
          <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
            {langs.map(([flag, name, level]: any[], i: number) => (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: 11, padding: "9px 12px", background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 11 }}>
                <span style={{ fontSize: 20 }}>{flag || "🌐"}</span>
                <span style={{ color: TEXT, fontSize: 14, fontWeight: 600, flex: 1, fontFamily: FONT_B }}>{name}</span>
                <span style={{ background: `${G}18`, border: `1px solid ${G}28`, borderRadius: 20, padding: "3px 10px", color: G, fontSize: 11, fontWeight: 600 }}>{level || "Courant"}</span>
              </div>
            ))}
          </div>
        </div>
      ) : null
    }
    case "certifications": {
      const certs = Array.from({ length: 50 }, (_, k) => { const i = k + 1; return [(c as any)[`cert_${i}_icon`], (c as any)[`cert_${i}_name`], (c as any)[`cert_${i}_org`], (c as any)[`cert_${i}_year`]] }).filter(([, n]) => n)
      return certs.length > 0 ? (
        <div style={{ padding: "8px 24px 14px" }}>
          {c.title && <p style={{ color: MUTED, fontSize: 11, textTransform: "uppercase", letterSpacing: 2, margin: "0 0 9px", fontFamily: FONT_B }}>{c.title}</p>}
          <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
            {certs.map(([icon, name, org, year]: any[], i: number) => (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: 11, padding: "10px 12px", background: `${G}0a`, border: `1px solid ${G}18`, borderRadius: 12 }}>
                <span style={{ fontSize: 20, flexShrink: 0 }}>{icon || "🏆"}</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ color: TEXT, fontSize: 13, fontWeight: 700, margin: 0, fontFamily: FONT_B }}>{name}</p>
                  <p style={{ color: MUTED, fontSize: 11, margin: 0 }}>{org}{year ? ` · ${year}` : ""}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : null
    }

    case "call_button": { const href = telLink(c.phone); return href ? (
      <div style={{ padding: "6px 24px 10px" }}>
        <a href={href} onClick={() => trackLinkClick(pageId, block.id, "call")} style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 9, background: "rgba(57,255,143,0.1)", border: "1.5px solid rgba(57,255,143,0.3)", borderRadius: 13, padding: c.sub ? "12px 18px" : "15px 18px", textDecoration: "none" }}>
          <span style={{ fontSize: 17 }}>{c.icon || "📞"}</span>
          <span style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
            <span style={{ color: "var(--success)", fontSize: 15, fontWeight: 700, fontFamily: FONT_B }}>{c.label || "Appeler maintenant"}</span>
            {c.sub && <span style={{ color: "rgba(57,255,143,0.7)", fontSize: 11, fontFamily: FONT_B }}>{c.sub}</span>}
          </span>
        </a>
      </div>
    ) : null }
    case "whatsapp_button": { const href = waLink(c.phone, c.message, c.country_code); return href ? (
      <div style={{ padding: "6px 24px 10px" }}>
        <a href={href} target="_blank" rel="noopener noreferrer" onClick={() => trackLinkClick(pageId, block.id, "whatsapp")} style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 9, background: "rgba(37,211,102,0.12)", border: "1.5px solid rgba(37,211,102,0.35)", borderRadius: 13, padding: "15px 18px", textDecoration: "none" }}>
          <span style={{ fontSize: 17 }}>💬</span>
          <span style={{ color: "#25D366", fontSize: 15, fontWeight: 700, fontFamily: FONT_B }}>{c.label || "Discuter sur WhatsApp"}</span>
        </a>
      </div>
    ) : null }
    case "sticky_bar": {
      const acts = [1, 2, 3, 4, 5].map(i => ({ ...stickyActionHref(c[`a${i}_type`], c[`a${i}_value`]), t: c[`a${i}_type`] })).filter(a => a.t && a.t !== "none" && (a.href || a.share))
      if (acts.length === 0) return null
      const showL = c.show_labels !== "no"
      const barBg = c.bar_style === "solid" ? "#0A0A0A" : c.bar_style === "gold" ? `linear-gradient(90deg,${G},${G}dd)` : "rgba(12,12,12,0.82)"
      const goldStyle = c.bar_style === "gold"
      const pos = c.position === "top" ? { top: 0 } : { bottom: 0 }
      return (
        <>
          <div style={{ height: 68 }} aria-hidden />
          <div style={{ position: "fixed", ...pos, left: "50%", transform: "translateX(-50%)", width: "100%", maxWidth: 480, zIndex: 60, background: barBg, backdropFilter: c.bar_style === "blur" ? "blur(14px)" : undefined, WebkitBackdropFilter: c.bar_style === "blur" ? "blur(14px)" : undefined, borderTop: c.position === "top" ? "none" : "1px solid rgba(255,255,255,0.1)", borderBottom: c.position === "top" ? "1px solid rgba(255,255,255,0.1)" : "none", boxShadow: c.position === "top" ? "0 8px 24px rgba(0,0,0,0.4)" : "0 -8px 24px rgba(0,0,0,0.4)", display: "flex", justifyContent: "space-around", alignItems: "stretch", padding: `8px 6px calc(8px + env(safe-area-inset-bottom))` }}>
            {acts.slice(0, 5).map((a, i) => {
              const col = goldStyle ? "#080808" : a.color
              const inner = <span style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 3 }}><span style={{ fontSize: 20 }}>{a.icon}</span>{showL && <span style={{ color: col, fontSize: 10, fontWeight: 700 }}>{a.label}</span>}</span>
              const st: any = { flex: 1, display: "flex", alignItems: "center", justifyContent: "center", padding: "6px 4px", textDecoration: "none", background: "transparent", border: "none", cursor: "pointer" }
              return a.share
                ? <ShareButton key={i} pageId={pageId} blockId={block.id} style={st} inner={inner} />
                : <a key={i} href={a.href} target={/^https?:/.test(a.href || "") ? "_blank" : undefined} rel="noopener noreferrer" onClick={() => trackLinkClick(pageId, block.id, `bar:${a.t}`)} style={st}>{inner}</a>
            })}
          </div>
        </>
      )
    }
    case "directions_button": { const href = directionsLink(c.address, c.provider); return href ? (
      <div style={{ padding: "6px 24px 10px" }}>
        <a href={href} target="_blank" rel="noopener noreferrer" onClick={() => trackLinkClick(pageId, block.id, "directions")} style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 9, background: "rgba(66,133,244,0.12)", border: "1.5px solid rgba(66,133,244,0.35)", borderRadius: 13, padding: "15px 18px", textDecoration: "none" }}>
          <span style={{ fontSize: 17 }}>🧭</span>
          <span style={{ color: "#4285F4", fontSize: 15, fontWeight: 700, fontFamily: FONT_B }}>{c.label || "Obtenir l'itinéraire"}</span>
        </a>
        {c.show_copy !== "no" && c.address && (
          <CopyButton value={c.address} copiedLabel="Adresse copiée" track={() => trackLinkClick(pageId, block.id, "copy-address")} label="📋 Copier l'adresse" style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 6, width: "100%", marginTop: 7, background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 11, padding: "10px", color: MUTED, fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: FONT_B }} />
        )}
      </div>
    ) : null }
    case "email_button": return c.email ? (
      <div style={{ padding: "6px 24px 10px" }}>
        <a href={`mailto:${c.email}${c.subject ? `?subject=${encodeURIComponent(c.subject)}` : ""}`} onClick={() => trackLinkClick(pageId, block.id, "email")} style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 9, background: "rgba(56,189,248,0.1)", border: "1.5px solid rgba(56,189,248,0.3)", borderRadius: 13, padding: "15px 18px", textDecoration: "none" }}>
          <span style={{ fontSize: 17 }}>✉️</span>
          <span style={{ color: "var(--action)", fontSize: 15, fontWeight: 700, fontFamily: FONT_B }}>{c.label || "Envoyer un email"}</span>
        </a>
      </div>
    ) : null
    case "payment_button": {
      const href = paymentLink(c)
      if (!href) return null
      const br = paymentBrand(c.platform)
      return (
        <div style={{ padding: "6px 24px 10px" }}>
          <a href={href} target="_blank" rel="noopener noreferrer" onClick={() => trackLinkClick(pageId, block.id, "payment")} style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 9, background: br.color, borderRadius: 13, padding: "15px 18px", textDecoration: "none", color: "#fff", fontSize: 15, fontWeight: 800, fontFamily: FONT_B, boxShadow: `0 4px 16px ${br.color}44` }}>
            <span>{br.icon}</span> {c.label || "Payer maintenant"}{c.amount ? ` — ${c.amount}` : ""}
          </a>
        </div>
      )
    }
    case "booking_button": return c.url ? (
      <div style={{ padding: "6px 24px 10px" }}>
        <a href={extHref(c.url)} target="_blank" rel="noopener noreferrer" onClick={() => trackLinkClick(pageId, block.id, "booking")} style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 9, background: `${G}12`, border: `1.5px solid ${G}35`, borderRadius: 13, padding: "15px 18px", textDecoration: "none", color: G, fontSize: 15, fontWeight: 700, fontFamily: FONT_B }}>
          📅 {c.label || "Prendre rendez-vous"}
        </a>
      </div>
    ) : null
    case "download_file": return c.url ? (
      <div style={{ padding: "6px 24px 10px" }}>
        <a href={extHref(c.url)} target="_blank" rel="noopener noreferrer" onClick={() => trackLinkClick(pageId, block.id, "download")} style={{ display: "flex", alignItems: "center", gap: 12, background: "rgba(167,139,250,0.08)", border: "1.5px solid rgba(167,139,250,0.28)", borderRadius: 13, padding: "13px 16px", textDecoration: "none" }}>
          <div style={{ width: 42, height: 42, background: "rgba(167,139,250,0.15)", borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20, flexShrink: 0 }}>{c.icon || "📄"}</div>
          <div style={{ flex: 1, minWidth: 0 }}><p style={{ color: TEXT, fontSize: 14, fontWeight: 700, margin: 0, fontFamily: FONT_B }}>{c.label || "Télécharger"}</p>{c.type_doc && <p style={{ color: MUTED, fontSize: 11, margin: 0 }}>{c.type_doc}</p>}</div>
          <span style={{ color: "#A78BFA", fontSize: 20, flexShrink: 0 }}>↓</span>
        </a>
      </div>
    ) : null
    case "multi_cta": {
      const btns = Array.from({ length: 50 }, (_, k) => { const i = k + 1; return [(c as any)[`btn${i}_icon`], (c as any)[`btn${i}_label`], (c as any)[`btn${i}_url`]] }).filter(([, l]) => l)
      return btns.length > 0 ? (
        <div style={{ padding: "6px 24px 10px" }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
            {btns.map(([icon, label, url]: any[], i: number) => (
              <a key={i} href={url || "#"} target={/^https?:/.test(url || "") ? "_blank" : undefined} rel="noopener noreferrer" onClick={() => trackLinkClick(pageId, block.id, url || "cta")} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 5, background: `${G}10`, border: `1px solid ${G}22`, borderRadius: 12, padding: "13px 8px", textDecoration: "none" }}>
                <span style={{ fontSize: 22 }}>{icon || "⚡"}</span>
                <span style={{ color: TEXT, fontSize: 12, fontWeight: 600, textAlign: "center", fontFamily: FONT_B }}>{label}</span>
              </a>
            ))}
          </div>
        </div>
      ) : null
    }

    case "product_catalog": {
      const products = Array.from({ length: 50 }, (_, k) => { const i = k + 1; return [(c as any)[`p${i}_img`], (c as any)[`p${i}_name`], (c as any)[`p${i}_price`], (c as any)[`p${i}_desc`], (c as any)[`p${i}_url`]] }).filter(([, n]) => n)
      return products.length > 0 ? (
        <div style={{ padding: "10px 24px 14px" }}>
          {c.title && <p style={{ color: MUTED, fontSize: 11, textTransform: "uppercase", letterSpacing: 2, margin: "0 0 12px", fontFamily: FONT_B }}>{c.title}</p>}
          <div style={{ display: "flex", flexDirection: "column", gap: 11 }}>
            {products.map(([img, name, price, desc, url]: any[], i: number) => (
              <a key={i} href={url || "#"} target={/^https?:/.test(url || "") ? "_blank" : undefined} rel="noopener noreferrer" onClick={() => trackLinkClick(pageId, block.id, url || "product")} style={{ display: "flex", gap: 12, background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 12, overflow: "hidden", textDecoration: "none" }}>
                {img ? <SmartImage onError={e => { e.currentTarget.style.display = 'none' }} src={String(img)} alt="" width={84} height={84} style={{ width: 84, height: 84, objectFit: "cover", flexShrink: 0 }} /> : <div style={{ width: 84, height: 84, background: "rgba(249,115,22,0.08)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 28, flexShrink: 0 }}>🛍️</div>}
                <div style={{ flex: 1, minWidth: 0, padding: "10px 12px 10px 0" }}>
                  <p style={{ color: TEXT, fontSize: 14, fontWeight: 700, margin: "0 0 2px", fontFamily: FONT_B }}>{name}</p>
                  {desc && <p style={{ color: MUTED, fontSize: 13.5, margin: "0 0 5px" }}>{desc}</p>}
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
                    <span style={{ color: G, fontSize: 16, fontWeight: 700 }}>{price}</span>
                    {c.cta_label && <span style={{ background: G, color: "#080808", borderRadius: 7, padding: "4px 11px", fontSize: 11, fontWeight: 700 }}>{c.cta_label}</span>}
                  </div>
                </div>
              </a>
            ))}
          </div>
        </div>
      ) : null
    }
    case "featured_product": return (c.name || c.image) ? (
      <div style={{ padding: "10px 24px 14px" }}>
        <div style={{ background: `linear-gradient(135deg,${G}12,${theme.accent || "var(--success)"}0a)`, border: `1.5px solid ${G}30`, borderRadius: 16, overflow: "hidden" }}>
          {c.badge && (() => { const bs = productBadgeStyle(c.badge, G); return <div style={{ background: bs.color, color: bs.fg, padding: "7px 14px", fontSize: 12, fontWeight: 700, textAlign: "center" }}>{bs.icon ? bs.icon + " " : ""}{c.badge}</div> })()}
          {c.image
            ? <SmartImage width={1600} height={1200} sizes={SIZES_PLEINE} onError={e => { e.currentTarget.style.display = 'none' }} src={c.image} alt="" style={{ width: "100%", height: 200, objectFit: "cover", display: "block" }} />
            : <div style={{ height: 150, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(249,115,22,0.06)", fontSize: 48 }}>⭐</div>}
          <div style={{ padding: "16px" }}>
            {c.name && <p style={{ color: TEXT, fontSize: 18, fontWeight: 700, margin: "0 0 6px", fontFamily: FONT_D }}>{c.name}</p>}
            {c.description && <p style={{ color: MUTED, fontSize: 13, margin: "0 0 12px", lineHeight: 1.5, fontFamily: FONT_B }}>{c.description}</p>}
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: c.cta_label ? 14 : 0 }}>
              {c.price && <span style={{ color: G, fontSize: 24, fontWeight: 700 }}>{c.price}</span>}
              {c.old_price && <span style={{ color: MUTED, fontSize: 15, textDecoration: "line-through" }}>{c.old_price}</span>}
              {(() => { const d = priceDiscount(c.price || "", c.old_price); return c.old_price ? <span style={{ background: "#EF4444", color: "#fff", borderRadius: 6, padding: "2px 8px", fontSize: 11, fontWeight: 800 }}>{d ? d.label : "Promo"}</span> : null })()}
            </div>
            {(() => { const st = stockStatus(c.stock); return st ? <p style={{ color: st.color, fontSize: 12, fontWeight: 700, margin: "0 0 12px", fontFamily: FONT_B }}>{st.state === "in" ? "✓ " : st.state === "out" ? "⛔ " : "🔥 "}{st.label}</p> : null })()}
            {c.cta_label && (() => { const out = stockStatus(c.stock)?.soldOut; return out
              ? <div style={{ background: "rgba(255,255,255,0.06)", color: MUTED, borderRadius: 11, padding: "13px", textAlign: "center", fontSize: 14, fontWeight: 800, fontFamily: FONT_B, cursor: "not-allowed" }}>Épuisé</div>
              : <a href={extHref(c.cta_url || c.url) || "#"} target={/^https?:/.test(c.cta_url || c.url || "") ? "_blank" : undefined} rel="noopener noreferrer" onClick={() => trackLinkClick(pageId, block.id, c.cta_url || c.url || "product")} style={{ display: "block", background: `linear-gradient(90deg,${G},${G}cc)`, borderRadius: 11, padding: "13px", textAlign: "center", fontSize: 14, fontWeight: 800, color: "#080808", textDecoration: "none", fontFamily: FONT_B }}>{c.cta_label}</a> })()}
          </div>
        </div>
      </div>
    ) : null
    case "offer_comparison": {
      const plans = [{ name: c.plan1_name, price: c.plan1_price, old_price: c.plan1_old_price, features: c.plan1_features, hl: false }, { name: c.plan2_name, price: c.plan2_price, old_price: c.plan2_old_price, features: c.plan2_features, hl: c.plan2_highlight === "yes" }, { name: c.plan3_name, price: c.plan3_price, old_price: c.plan3_old_price, features: c.plan3_features, hl: false }].filter(p => p.name)
      return plans.length > 0 ? (
        <div style={{ padding: "16px 24px 14px" }}>
          {c.title && <p style={{ color: MUTED, fontSize: 11, textTransform: "uppercase", letterSpacing: 2, margin: "0 0 14px", textAlign: "center", fontFamily: FONT_B }}>{c.title}</p>}
          <div style={{ display: "flex", gap: 8 }}>
            {plans.map((p, i) => (
              <div key={i} style={{ flex: 1, minWidth: 0, background: p.hl ? `${G}12` : "rgba(255,255,255,0.03)", border: `1.5px solid ${p.hl ? `${G}50` : "rgba(255,255,255,0.08)"}`, borderRadius: 13, padding: "14px 10px", position: "relative" }}>
                {p.hl && <div style={{ position: "absolute", top: -9, left: "50%", transform: "translateX(-50%)", background: G, color: "#080808", borderRadius: 20, padding: "2px 10px", fontSize: 9, fontWeight: 700, whiteSpace: "nowrap" }}>⭐ Populaire</div>}
                <p style={{ color: p.hl ? G : TEXT, fontSize: 12, fontWeight: 700, margin: "0 0 5px", textAlign: "center", fontFamily: FONT_B }}>{p.name}</p>
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", margin: "0 0 9px" }}>
                  <p style={{ color: G, fontSize: 19, fontWeight: 700, margin: 0, textAlign: "center", fontFamily: FONT_D }}>{p.price}</p>
                  {p.old_price && (() => { const disc = priceDiscount(p.price, p.old_price); return <p style={{ margin: "2px 0 0", fontSize: 11, fontFamily: FONT_B }}><span style={{ color: MUTED, textDecoration: "line-through" }}>{p.old_price}</span>{disc && <span style={{ color: "#EF4444", fontWeight: 800, marginLeft: 4 }}>{disc.label}</span>}</p> })()}
                </div>
                {(p.features || "").split("\n").filter(Boolean).map((f: string, j: number) => (
                  <p key={j} style={{ color: MUTED, fontSize: 10.5, margin: "0 0 4px", display: "flex", gap: 5 }}><span style={{ color: "var(--success)" }}>✓</span> {f}</p>
                ))}
              </div>
            ))}
          </div>
        </div>
      ) : null
    }
    case "packs": {
      const packs = Array.from({ length: 50 }, (_, k) => { const i = k + 1; return [(c as any)[`pack${i}_icon`], (c as any)[`pack${i}_name`], (c as any)[`pack${i}_price`], (c as any)[`pack${i}_content`], (c as any)[`pack${i}_url`]] }).filter(([, n]) => n)
      return packs.length > 0 ? (
        <div style={{ padding: "10px 24px 14px" }}>
          {c.title && <p style={{ color: MUTED, fontSize: 11, textTransform: "uppercase", letterSpacing: 2, margin: "0 0 12px", fontFamily: FONT_B }}>{c.title}</p>}
          <div style={{ display: "flex", flexDirection: "column", gap: 11 }}>
            {packs.map(([icon, name, price, content]: any[], i: number) => (
              <div key={i} style={{ background: i === 1 ? `${G}10` : "rgba(255,255,255,0.03)", border: `1.5px solid ${i === 1 ? `${G}35` : "rgba(255,255,255,0.07)"}`, borderRadius: 13, padding: "14px 15px" }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 9 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 9 }}><span style={{ fontSize: 22 }}>{icon || "🚀"}</span><p style={{ color: TEXT, fontSize: 15, fontWeight: 700, margin: 0, fontFamily: FONT_B }}>{name}</p></div>
                  <span style={{ color: G, fontSize: 17, fontWeight: 700 }}>{price}</span>
                </div>
                {(content || "").split("\n").filter(Boolean).map((line: string, j: number) => (
                  <p key={j} style={{ color: MUTED, fontSize: 12, margin: "0 0 4px", display: "flex", gap: 7 }}><span style={{ color: "var(--success)" }}>✓</span> {line}</p>
                ))}
              </div>
            ))}
          </div>
        </div>
      ) : null
    }
    case "promo_code": return c.code ? (
      <div style={{ padding: "6px 24px 12px" }}>
        <div style={{ background: "rgba(249,115,22,0.08)", border: "2px dashed rgba(249,115,22,0.3)", borderRadius: 13, padding: "16px", textAlign: "center" }}>
          {c.description && <p style={{ color: MUTED, fontSize: 13, margin: "0 0 9px", fontFamily: FONT_B }}>{c.description}</p>}
          <div style={{ display: "inline-block", background: "rgba(249,115,22,0.15)", border: "2px solid rgba(249,115,22,0.4)", borderRadius: 9, padding: "10px 18px", fontFamily: "monospace", fontSize: 20, fontWeight: 700, color: "#F97316", letterSpacing: 3 }}>{c.code}</div>
          {c.expires && <p style={{ color: MUTED, fontSize: 11, margin: "7px 0 0" }}>Expire le {c.expires}</p>}
        </div>
      </div>
    ) : null
    case "limited_offer": return (c.title || c.description) ? (
      <div style={{ padding: "6px 24px 12px" }}>
        <div style={{ background: "rgba(239,68,68,0.08)", border: "1.5px solid rgba(239,68,68,0.3)", borderRadius: 13, padding: "14px 16px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 6 }}><span style={{ color: "#EF4444" }}>⚡</span><p style={{ color: TEXT, fontSize: 15, fontWeight: 700, margin: 0, fontFamily: FONT_B }}>{c.title || "Offre limitée"}</p></div>
          {c.description && <p style={{ color: MUTED, fontSize: 13, margin: "0 0 7px" }}>{c.description}</p>}
          {c.expires && <p style={{ color: "#EF4444", fontSize: 12, margin: "0 0 10px", fontWeight: 600 }}>⏰ Expire le {c.expires}</p>}
          {c.cta_label && <a href={extHref(c.cta_url) || "#"} target={/^https?:/.test(c.cta_url || "") ? "_blank" : undefined} rel="noopener noreferrer" onClick={() => trackLinkClick(pageId, block.id, c.cta_url || "offer")} style={{ display: "block", background: "rgba(239,68,68,0.15)", border: "1px solid rgba(239,68,68,0.3)", borderRadius: 9, padding: "12px", textAlign: "center", fontSize: 14, fontWeight: 700, color: "#EF4444", textDecoration: "none" }}>{c.cta_label}</a>}
        </div>
      </div>
    ) : null
    case "order_online": return (
      <div style={{ padding: "6px 24px 10px" }}>
        <a href={extHref(c.url) || "#"} target={/^https?:/.test(c.url || "") ? "_blank" : undefined} rel="noopener noreferrer" onClick={() => trackLinkClick(pageId, block.id, c.url || "order")} style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 9, background: "rgba(249,115,22,0.12)", border: "1.5px solid rgba(249,115,22,0.3)", borderRadius: 13, padding: "15px 18px", textDecoration: "none" }}>
          <span style={{ fontSize: 17 }}>🛒</span>
          <span style={{ color: "#F97316", fontSize: 15, fontWeight: 700, fontFamily: FONT_B }}>{c.label || "Commander maintenant"}</span>
        </a>
      </div>
    )
    case "free_gift": return (
      <div style={{ padding: "6px 24px 12px" }}>
        <div style={{ background: "rgba(236,72,153,0.08)", border: "1.5px solid rgba(236,72,153,0.25)", borderRadius: 13, padding: "16px", textAlign: "center" }}>
          <span style={{ fontSize: 32, display: "block", marginBottom: 8 }}>{c.emoji || "🎁"}</span>
          {c.description && <p style={{ color: MUTED, fontSize: 13, margin: "0 0 11px", fontFamily: FONT_B }}>{c.description}</p>}
          <a href={extHref(c.url) || "#"} target={/^https?:/.test(c.url || "") ? "_blank" : undefined} rel="noopener noreferrer" onClick={() => trackLinkClick(pageId, block.id, c.url || "gift")} style={{ display: "block", background: "linear-gradient(90deg,#EC4899,#F472B6)", borderRadius: 10, padding: "12px", fontSize: 14, fontWeight: 700, color: "#fff", textDecoration: "none", fontFamily: FONT_B }}>{c.label || "Recevoir mon cadeau"}</a>
        </div>
      </div>
    )

    case "business_stats": {
      const stats = Array.from({ length: 50 }, (_, k) => { const i = k + 1; return [(c as any)[`stat${i}_icon`], (c as any)[`stat${i}_value`], (c as any)[`stat${i}_label`]] }).filter(([, v]) => v)
      return stats.length > 0 ? (
        <div style={{ padding: "10px 24px 14px" }}>
          <div style={{ display: "grid", gridTemplateColumns: stats.length <= 2 ? "1fr 1fr" : stats.length === 3 ? "1fr 1fr 1fr" : "1fr 1fr", gap: 9 }}>
            {stats.map(([icon, value, label]: any[], i: number) => (
              <div key={i} style={{ background: `${G}08`, border: `1px solid ${G}15`, borderRadius: 13, padding: "16px 10px", textAlign: "center" }}>
                {icon && <span style={{ fontSize: 22, display: "block", marginBottom: 6 }}>{icon}</span>}
                <p style={{ color: G, fontSize: 24, fontWeight: 700, margin: "0 0 3px", fontFamily: FONT_D, lineHeight: 1 }}>{value}</p>
                <p style={{ color: MUTED, fontSize: 11, margin: 0, fontFamily: FONT_B }}>{label}</p>
              </div>
            ))}
          </div>
        </div>
      ) : null
    }
    case "google_reviews_block": {
      const reviews = Array.from({ length: 50 }, (_, k) => { const i = k + 1; return [(c as any)[`r${i}_name`], (c as any)[`r${i}_text`], (c as any)[`r${i}_stars`]] }).filter(([n]) => n)
      return (reviews.length > 0 || c.avg_rating) ? (
        <div style={{ padding: "10px 24px 14px" }}>
          {(c.avg_rating || c.title) && (
            <div style={{ display: "flex", alignItems: "center", gap: 13, marginBottom: 13, padding: "12px 14px", background: "rgba(251,191,36,0.06)", border: "1px solid rgba(251,191,36,0.2)", borderRadius: 11 }}>
              {c.avg_rating && (<div style={{ textAlign: "center" }}>
                <p style={{ color: "#FBBF24", fontSize: 30, fontWeight: 700, margin: 0, fontFamily: FONT_D }}>{c.avg_rating}</p>
                <StarRow fills={starRow(c.avg_rating)} size={11} />
              </div>)}
              <div>
                <p style={{ color: TEXT, fontSize: 13, fontWeight: 700, margin: "0 0 2px", fontFamily: FONT_B }}>{c.title || "Avis clients"}</p>
                {c.total_reviews && <p style={{ color: MUTED, fontSize: 11, margin: 0 }}>{c.total_reviews} avis</p>}
              </div>
            </div>
          )}
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {reviews.map(([name, txt, stars]: any[], i: number) => (
              <div key={i} style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 10, padding: "11px 13px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                  <p style={{ color: TEXT, fontSize: 12, fontWeight: 700, margin: 0, fontFamily: FONT_B }}>{name}</p>
                  <StarRow fills={starRow(stars || 5)} size={11} />
                </div>
                <p style={{ color: MUTED, fontSize: 12, margin: 0, lineHeight: 1.5, fontStyle: "italic" }}>&quot;{txt}&quot;</p>
              </div>
            ))}
          </div>
          {c.google_url && <a href={extHref(c.google_url)} target="_blank" rel="noopener noreferrer" onClick={() => trackLinkClick(pageId, block.id, c.google_url)} style={{ marginTop: 11, display: "flex", alignItems: "center", justifyContent: "center", gap: 7, color: "#4285F4", fontSize: 12, fontWeight: 600, textDecoration: "none" }}><span>📍</span> Voir sur Google</a>}
        </div>
      ) : null
    }
    case "portfolio_work": {
      const works = Array.from({ length: 50 }, (_, k) => { const i = k + 1; return [(c as any)[`work${i}_img`], (c as any)[`work${i}_title`], (c as any)[`work${i}_desc`]] }).filter(([, t]) => t)
      return works.length > 0 ? (
        <div style={{ padding: "10px 24px 14px" }}>
          {c.title && <p style={{ color: MUTED, fontSize: 11, textTransform: "uppercase", letterSpacing: 2, margin: "0 0 12px", fontFamily: FONT_B }}>{c.title}</p>}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 9 }}>
            {works.map(([img, title, desc]: any[], i: number) => (
              <div key={i} style={{ borderRadius: 11, overflow: "hidden", background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)" }}>
                {img ? <SmartImage width={1200} height={900} sizes={SIZES_DEMI} onError={e => { e.currentTarget.style.display = 'none' }} src={String(img)} alt="" style={{ width: "100%", height: 100, objectFit: "cover", display: "block" }} /> : <div style={{ height: 100, background: `${G}08`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 28 }}>📂</div>}
                <div style={{ padding: "9px 10px" }}>
                  <p style={{ color: TEXT, fontSize: 12, fontWeight: 700, margin: "0 0 2px", fontFamily: FONT_B }}>{title}</p>
                  {desc && <p style={{ color: MUTED, fontSize: 13.5, margin: 0 }}>{desc}</p>}
                </div>
              </div>
            ))}
          </div>
          {c.cta_label && (c.cta_url
            ? <a href={extHref(c.cta_url)} target="_blank" rel="noopener noreferrer" onClick={() => trackLinkClick(pageId, block.id, c.cta_url)} style={{ display: "block", marginTop: 11, background: `${G}10`, border: `1px solid ${G}25`, borderRadius: 10, padding: "12px", textAlign: "center", fontSize: 13, fontWeight: 700, color: G, textDecoration: "none" }}>{c.cta_label}</a>
            : <div style={{ marginTop: 11, background: `${G}10`, border: `1px solid ${G}25`, borderRadius: 10, padding: "12px", textAlign: "center", fontSize: 13, fontWeight: 700, color: G }}>{c.cta_label}</div>)}
        </div>
      ) : null
    }
    case "team": {
      const accent = theme.accent || "var(--success)"
      const members = Array.from({ length: 50 }, (_, k) => k + 1)
        .map(i => ({ photo: c[`m${i}_photo`], name: c[`m${i}_name`], role: c[`m${i}_role`], bio: c[`m${i}_bio`], phone: (c[`m${i}_phone`]||"").trim(), email: (c[`m${i}_email`]||"").trim(), linkedin: (c[`m${i}_linkedin`]||"").trim() }))
        .filter(m => m.name)
      if (members.length === 0) return null
      const grid = c.layout === "Grille"
      const contactBtn = (icon: string, href: string, label: string) => (
        <a href={href} target={href.startsWith("http") ? "_blank" : undefined} rel="noopener noreferrer" aria-label={label} onClick={() => trackLinkClick(pageId, block.id, href)}
          style={{ width: 30, height: 30, borderRadius: 8, background: `${G}12`, border: `1px solid ${G}25`, display: "inline-flex", alignItems: "center", justifyContent: "center", fontSize: 14, textDecoration: "none", flexShrink: 0 }}>{icon}</a>
      )
      const contacts = (m: any, center?: boolean) => {
        const links = [] as any[]
        if (m.phone) links.push(contactBtn("📞", telLink(m.phone), `Appeler ${m.name}`))
        if (m.email) links.push(contactBtn("✉️", `mailto:${m.email}`, `Écrire à ${m.name}`))
        if (m.linkedin) links.push(contactBtn("in", socialHref("linkedin", m.linkedin), `LinkedIn de ${m.name}`))
        return links.length ? <div style={{ display: "flex", gap: 7, marginTop: 8, justifyContent: center ? "center" : "flex-start" }}>{links.map((l, k) => <span key={k}>{l}</span>)}</div> : null
      }
      const avatar = (m: any, size: number) => m.photo
        ? <SmartImage width={800} height={800} sizes={SIZES_DEMI} onError={e => { e.currentTarget.style.display = 'none' }} src={String(m.photo)} alt={String(m.name)} style={{ width: size, height: size, borderRadius: "50%", objectFit: "cover", flexShrink: 0, border: `2px solid ${G}40` }} />
        : <div style={{ width: size, height: size, borderRadius: "50%", background: `linear-gradient(135deg,${G},${accent})`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: size*0.42, fontWeight: 700, color: "#080808", flexShrink: 0 }}>{String(m.name)[0]}</div>
      return (
        <div style={{ padding: "10px 24px 14px" }}>
          {c.title && <p style={{ color: MUTED, fontSize: 11, textTransform: "uppercase", letterSpacing: 2, margin: "0 0 12px", fontFamily: FONT_B }}>{c.title}</p>}
          {grid ? (
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 9 }}>
              {members.map((m, i) => (
                <div key={i} style={{ display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center", gap: 4, background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 13, padding: "15px 12px" }}>
                  {avatar(m, 60)}
                  <p style={{ color: TEXT, fontSize: 13.5, fontWeight: 700, margin: "6px 0 0", fontFamily: FONT_B }}>{m.name}</p>
                  {m.role && <p style={{ color: G, fontSize: 13, margin: 0 }}>{m.role}</p>}
                  {m.bio && <p style={{ color: MUTED, fontSize: 11, margin: "2px 0 0", lineHeight: 1.4 }}>{m.bio}</p>}
                  {contacts(m, true)}
                </div>
              ))}
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {members.map((m, i) => (
                <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: 13, background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 13, padding: "13px 15px" }}>
                  {avatar(m, 48)}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ color: TEXT, fontSize: 14, fontWeight: 700, margin: "0 0 2px", fontFamily: FONT_B }}>{m.name}</p>
                    {m.role && <p style={{ color: G, fontSize: 13, margin: "0 0 1px" }}>{m.role}</p>}
                    {m.bio && <p style={{ color: MUTED, fontSize: 11, margin: 0 }}>{m.bio}</p>}
                    {contacts(m)}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )
    }
    case "partners": {
      const logos = Array.from({ length: 50 }, (_, k) => { const i = k + 1; return [(c as any)[`logo${i}_img`], (c as any)[`logo${i}_name`]] }).filter(([, n]) => n)
      return logos.length > 0 ? (
        <div style={{ padding: "10px 24px 14px" }}>
          {c.title && <p style={{ color: MUTED, fontSize: 11, textTransform: "uppercase", letterSpacing: 2, margin: "0 0 12px", textAlign: "center", fontFamily: FONT_B }}>{c.title}</p>}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 9 }}>
            {logos.map(([img, name]: any[], i: number) => (
              <div key={i} style={{ height: 48, background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 9, display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden" }}>
                {img ? <SmartImage width={800} height={800} sizes={SIZES_DEMI} onError={e => { e.currentTarget.style.display = 'none' }} src={String(img)} alt={String(name)} style={{ maxWidth: "100%", maxHeight: "100%", objectFit: "contain", padding: 5 }} /> : <p style={{ color: MUTED, fontSize: 11, margin: 0, textAlign: "center", padding: "0 5px" }}>{name}</p>}
              </div>
            ))}
          </div>
        </div>
      ) : null
    }
    case "logo_wall": {
      const logos = Array.from({ length: 50 }, (_, k) => { const i = k + 1; return [(c as any)[`logo${i}`], (c as any)[`logo${i}_name`]] }).filter(([, n]) => n)
      return logos.length > 0 ? (
        <div style={{ padding: "10px 24px 14px" }}>
          {c.title && <p style={{ color: MUTED, fontSize: 11, textTransform: "uppercase", letterSpacing: 2, margin: "0 0 12px", textAlign: "center", fontFamily: FONT_B }}>{c.title}</p>}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 9 }}>
            {logos.map(([img, name]: any[], i: number) => (
              <div key={i} style={{ height: 40, background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden" }}>
                {img ? <SmartImage width={800} height={800} sizes={SIZES_DEMI} onError={e => { e.currentTarget.style.display = 'none' }} src={String(img)} alt={String(name)} style={{ maxWidth: "90%", maxHeight: "90%", objectFit: "contain" }} /> : <p style={{ color: MUTED, fontSize: 9, margin: 0, textAlign: "center", padding: "0 4px", lineHeight: 1.2 }}>{name}</p>}
              </div>
            ))}
          </div>
        </div>
      ) : null
    }
    case "process_steps": {
      const accent = theme.accent || "var(--success)"
      const steps = Array.from({ length: 50 }, (_, k) => { const i = k + 1; return [(c as any)[`s${i}_icon`], (c as any)[`s${i}_title`], (c as any)[`s${i}_desc`]] }).filter(([, t]) => t)
      return steps.length > 0 ? (
        <div style={{ padding: "10px 24px 14px" }}>
          {c.title && <p style={{ color: MUTED, fontSize: 11, textTransform: "uppercase", letterSpacing: 2, margin: "0 0 12px", fontFamily: FONT_B }}>{c.title}</p>}
          <div style={{ display: "flex", flexDirection: "column", gap: 9 }}>
            {steps.map(([icon, title, desc]: any[], i: number) => (
              <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: 13 }}>
                <div style={{ width: 34, height: 34, borderRadius: "50%", background: `linear-gradient(135deg,${G},${accent})`, color: "#080808", display: "flex", alignItems: "center", justifyContent: "center", fontSize: icon ? 17 : 14, fontWeight: 700, flexShrink: 0 }}>{icon || i + 1}</div>
                <div style={{ flex: 1 }}>
                  <p style={{ color: TEXT, fontSize: 13, fontWeight: 700, margin: "5px 0 2px", fontFamily: FONT_B }}>{title}</p>
                  {desc && <p style={{ color: MUTED, fontSize: 13.5, margin: 0 }}>{desc}</p>}
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : null
    }
    case "trust_badge": {
      const badges = Array.from({ length: 50 }, (_, k) => { const i = k + 1; return [(c as any)[`b${i}_icon`], (c as any)[`b${i}_label`]] }).filter(([, l]) => l)
      return badges.length > 0 ? (
        <div style={{ padding: "10px 24px 14px" }}>
          {c.title && <p style={{ color: MUTED, fontSize: 11, textTransform: "uppercase", letterSpacing: 2, margin: "0 0 10px", textAlign: "center", fontFamily: FONT_B }}>{c.title}</p>}
          <div style={{ display: "flex", flexWrap: "wrap", gap: 9, justifyContent: "center" }}>
            {badges.map(([icon, label]: any[], i: number) => (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: 8, background: "rgba(57,255,143,0.08)", border: "1px solid rgba(57,255,143,0.2)", borderRadius: 20, padding: "8px 15px" }}>
                <span style={{ color: "var(--success)", fontSize: 15, fontWeight: 700 }}>{icon}</span>
                <span style={{ color: TEXT, fontSize: 13, fontWeight: 600, fontFamily: FONT_B }}>{label}</span>
              </div>
            ))}
          </div>
        </div>
      ) : null
    }

    case "quote_block": return (c.quote || c.author) ? (
      <div style={{ padding: "14px 24px" }}>
        <div style={{ background: `${G}08`, border: `1px solid ${G}20`, borderRadius: 15, padding: "22px 20px", position: "relative" }}>
          <span style={{ position: "absolute", top: 12, left: 16, color: G, fontSize: 44, fontFamily: "Georgia, serif", lineHeight: 1, opacity: 0.35 }}>&ldquo;</span>
          <p style={{ color: TEXT, fontSize: 17, fontStyle: "italic", lineHeight: 1.7, margin: "0 0 12px", paddingTop: 14, fontFamily: FONT_D }}>{c.quote}</p>
          {c.author && (
            <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
              <div style={{ width: 26, height: 2, background: G, borderRadius: 1 }} />
              <p style={{ color: G, fontSize: 13, fontWeight: 700, margin: 0, fontFamily: FONT_B }}>{c.author}{c.source ? <span style={{ color: MUTED, fontWeight: 400 }}> — {c.source}</span> : null}</p>
            </div>
          )}
        </div>
      </div>
    ) : null
    case "timeline": {
      const events = Array.from({ length: 50 }, (_, k) => k + 1)
        .map(i => ({ date: c[`e${i}_date`], title: c[`e${i}_title`], desc: c[`e${i}_desc`], icon: (c[`e${i}_icon`]||"").trim() }))
        .filter(e => e.title || e.date)
      if (events.length === 0) return null
      const horizontal = c.layout === "Horizontale"
      return (
        <div style={{ padding: "10px 24px 14px" }}>
          {c.title && <p style={{ color: MUTED, fontSize: 11, textTransform: "uppercase", letterSpacing: 2, margin: "0 0 16px", fontFamily: FONT_B }}>{c.title}</p>}
          {horizontal ? (
            <div style={{ display: "flex", gap: 11, overflowX: "auto", padding: "2px 0 8px", WebkitOverflowScrolling: "touch", scrollSnapType: "x mandatory" }}>
              {events.map((e, i) => (
                <div key={i} style={{ scrollSnapAlign: "start", flexShrink: 0, width: 168, background: "rgba(255,255,255,0.03)", border: `1px solid ${i === events.length - 1 ? "var(--success)30" : "rgba(255,255,255,0.07)"}`, borderRadius: 13, padding: "14px 14px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                    <div style={{ width: 30, height: 30, borderRadius: 8, background: `${G}12`, border: `1px solid ${G}25`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 15, flexShrink: 0 }}>{e.icon || "•"}</div>
                    <p style={{ color: G, fontSize: 12, fontWeight: 700, margin: 0 }}>{e.date}</p>
                  </div>
                  <p style={{ color: TEXT, fontSize: 13.5, fontWeight: 600, margin: "0 0 3px", fontFamily: FONT_B }}>{e.title}</p>
                  {e.desc && <p style={{ color: MUTED, fontSize: 13.5, margin: 0, lineHeight: 1.5 }}>{e.desc}</p>}
                </div>
              ))}
            </div>
          ) : (
            <div style={{ position: "relative", paddingLeft: 22 }}>
              <div style={{ position: "absolute", left: 6, top: 8, bottom: 8, width: 2, background: `linear-gradient(180deg,${G},${G}40)`, borderRadius: 1 }} />
              {events.map((e, i) => (
                <div key={i} style={{ position: "relative", marginBottom: i < events.length - 1 ? 18 : 0 }}>
                  <div style={{ position: "absolute", left: -19, top: 4, width: 11, height: 11, borderRadius: "50%", background: i === events.length - 1 ? "var(--success)" : G, border: `2px solid ${i === events.length - 1 ? "var(--success)40" : `${G}40`}` }} />
                  <p style={{ color: G, fontSize: 12, fontWeight: 700, margin: "0 0 2px" }}>{e.date}</p>
                  <p style={{ color: TEXT, fontSize: 14, fontWeight: 600, margin: "0 0 2px", fontFamily: FONT_B, display: "flex", alignItems: "center", gap: 6 }}>{e.icon && <span aria-hidden style={{ fontSize: 15 }}>{e.icon}</span>}{e.title}</p>
                  {e.desc && <p style={{ color: MUTED, fontSize: 13.5, margin: 0 }}>{e.desc}</p>}
                </div>
              ))}
            </div>
          )}
        </div>
      )
    }
    case "two_columns": {
      const cols = [[c.col1_icon, c.col1_title, c.col1_text], [c.col2_icon, c.col2_title, c.col2_text]].filter(([, t, txt]) => t || txt)
      return cols.length > 0 ? (
        <div style={{ padding: "10px 24px 14px" }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 13 }}>
            {cols.map(([icon, title, txt]: any[], i: number) => (
              <div key={i} style={{ background: `${G}06`, border: `1px solid ${G}15`, borderRadius: 13, padding: "14px 13px" }}>
                {icon && <span style={{ fontSize: 26, display: "block", marginBottom: 9 }}>{icon}</span>}
                {title && <p style={{ color: TEXT, fontSize: 14, fontWeight: 700, margin: "0 0 5px", fontFamily: FONT_B }}>{title}</p>}
                {txt && <p style={{ color: MUTED, fontSize: 12, margin: 0, lineHeight: 1.6 }}>{txt}</p>}
              </div>
            ))}
          </div>
        </div>
      ) : null
    }
    case "tabs_block": {
      const tabs = Array.from({ length: 50 }, (_, k) => { const i = k + 1; return [(c as any)[`tab${i}_label`], (c as any)[`tab${i}_content`]] }).filter(([l]) => l) as [string, string][]
      return tabs.length > 0 ? <TabsPublic tabs={tabs} G={G} TEXT={TEXT} MUTED={MUTED} FONT_B={FONT_B} /> : null
    }
    case "accordion_block": {
      const items = Array.from({ length: 50 }, (_, k) => { const i = k + 1; return [(c as any)[`a${i}_title`], (c as any)[`a${i}_content`]] }).filter(([t]) => t) as [string, string][]
      return items.length > 0 ? <AccordionPublic items={items} title={c.title} G={G} TEXT={TEXT} MUTED={MUTED} FONT_B={FONT_B} /> : null
    }
    case "info_box": {
      const boxStyles: Record<string, any> = {
        info: { bg: "rgba(56,189,248,0.08)", border: "rgba(56,189,248,0.3)", color: "var(--action)" },
        warning: { bg: "rgba(251,191,36,0.08)", border: "rgba(251,191,36,0.3)", color: "#FBBF24" },
        success: { bg: "rgba(57,255,143,0.08)", border: "rgba(57,255,143,0.3)", color: "var(--success)" },
        tip: { bg: "rgba(201,168,76,0.08)", border: "rgba(201,168,76,0.3)", color: "#C9A84C" },
        important: { bg: "rgba(239,68,68,0.08)", border: "rgba(239,68,68,0.3)", color: "#EF4444" },
      }
      const bs = boxStyles[c.type || "info"]
      return (c.message || c.title) ? (
        <div style={{ padding: "8px 24px" }}>
          <div style={{ background: bs.bg, border: `1.5px solid ${bs.border}`, borderRadius: 13, padding: "15px 17px" }}>
            <div style={{ display: "flex", gap: 11, alignItems: "flex-start" }}>
              <span style={{ fontSize: 22, flexShrink: 0 }}>{c.emoji || "💡"}</span>
              <div>
                {c.title && <p style={{ color: bs.color, fontSize: 13, fontWeight: 700, margin: "0 0 4px", fontFamily: FONT_B }}>{c.title}</p>}
                {c.message && <p style={{ color: TEXT, fontSize: 13, margin: 0, lineHeight: 1.6, whiteSpace: "pre-wrap", fontFamily: FONT_B }}>{c.message}</p>}
              </div>
            </div>
          </div>
        </div>
      ) : null
    }
    case "values": {
      const vals = Array.from({ length: 50 }, (_, k) => { const i = k + 1; return [(c as any)[`v${i}_icon`], (c as any)[`v${i}_label`], (c as any)[`v${i}_desc`]] }).filter(([, l]) => l)
      return vals.length > 0 ? (
        <div style={{ padding: "10px 24px 14px" }}>
          {c.title && <p style={{ color: MUTED, fontSize: 11, textTransform: "uppercase", letterSpacing: 2, margin: "0 0 12px", fontFamily: FONT_B }}>{c.title}</p>}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 9 }}>
            {vals.map(([icon, label, desc]: any[], i: number) => (
              <div key={i} style={{ background: `${G}08`, border: `1px solid ${G}15`, borderRadius: 13, padding: "14px 11px", textAlign: "center" }}>
                {icon && <span style={{ fontSize: 26, display: "block", marginBottom: 7 }}>{icon}</span>}
                <p style={{ color: TEXT, fontSize: 13, fontWeight: 700, margin: desc ? "0 0 3px" : "0", fontFamily: FONT_B }}>{label}</p>
                {desc && <p style={{ color: MUTED, fontSize: 13.5, margin: 0 }}>{desc}</p>}
              </div>
            ))}
          </div>
        </div>
      ) : null
    }
    case "stats_block": {
      const stats = Array.from({ length: 50 }, (_, k) => { const i = k + 1; return [(c as any)[`s${i}_icon`], (c as any)[`s${i}_value`], (c as any)[`s${i}_label`]] }).filter(([, v]) => v)
      return stats.length > 0 ? (
        <div style={{ padding: "10px 24px 14px" }}>
          <div style={{ display: "grid", gridTemplateColumns: stats.length <= 2 ? "1fr 1fr" : stats.length === 3 ? "1fr 1fr 1fr" : "1fr 1fr", gap: 9 }}>
            {stats.map(([icon, value, label]: any[], i: number) => (
              <div key={i} style={{ background: `${G}08`, border: `1px solid ${G}15`, borderRadius: 13, padding: "16px 10px", textAlign: "center" }}>
                {icon && <span style={{ fontSize: 22, display: "block", marginBottom: 5 }}>{icon}</span>}
                <p style={{ color: G, fontSize: 24, fontWeight: 700, margin: "0 0 3px", fontFamily: FONT_D, lineHeight: 1 }}>{value}</p>
                <p style={{ color: MUTED, fontSize: 11, margin: 0, fontFamily: FONT_B }}>{label}</p>
              </div>
            ))}
          </div>
        </div>
      ) : null
    }

    case "discord_server": return (c.server_name || c.cta_url) ? (
      <div style={{ padding: "10px 24px 12px" }}>
        <div style={{ background: "rgba(88,101,242,0.08)", border: "1.5px solid rgba(88,101,242,0.25)", borderRadius: 13, padding: "15px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 11, marginBottom: 11 }}>
            <div style={{ width: 44, height: 44, borderRadius: 12, background: "rgba(88,101,242,0.2)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 23, flexShrink: 0 }}>🎮</div>
            <div style={{ flex: 1 }}>
              <p style={{ color: TEXT, fontSize: 14, fontWeight: 700, margin: "0 0 1px", fontFamily: FONT_B }}>{c.server_name || "Mon Serveur"}</p>
              {c.members && <p style={{ color: MUTED, fontSize: 11, margin: "0 0 1px" }}>👥 {c.members}</p>}
              {c.description && <p style={{ color: MUTED, fontSize: 13.5, margin: 0 }}>{c.description}</p>}
            </div>
          </div>
          <a href={extHref(c.cta_url) || "#"} target="_blank" rel="noopener noreferrer" onClick={() => trackLinkClick(pageId, block.id, c.cta_url || "discord")} style={{ display: "block", background: "#5865F2", color: "#fff", textAlign: "center", padding: "12px", borderRadius: 9, fontSize: 13, fontWeight: 700, textDecoration: "none", fontFamily: FONT_B }}>{c.cta_label || "Rejoindre le Discord"}</a>
        </div>
      </div>
    ) : null
    case "telegram_channel": return (c.channel_name || c.cta_url) ? (
      <div style={{ padding: "10px 24px 12px" }}>
        <div style={{ background: "rgba(38,165,228,0.08)", border: "1.5px solid rgba(38,165,228,0.25)", borderRadius: 13, padding: "15px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 11, marginBottom: 11 }}>
            <div style={{ width: 44, height: 44, borderRadius: "50%", background: "rgba(38,165,228,0.2)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 23, flexShrink: 0 }}>✈️</div>
            <div style={{ flex: 1 }}>
              <p style={{ color: TEXT, fontSize: 14, fontWeight: 700, margin: "0 0 1px", fontFamily: FONT_B }}>{c.channel_name || "Mon Canal"}</p>
              {c.members && <p style={{ color: MUTED, fontSize: 11, margin: "0 0 1px" }}>👥 {c.members}</p>}
              {c.description && <p style={{ color: MUTED, fontSize: 13.5, margin: 0 }}>{c.description}</p>}
            </div>
          </div>
          <a href={extHref(c.cta_url) || "#"} target="_blank" rel="noopener noreferrer" onClick={() => trackLinkClick(pageId, block.id, c.cta_url || "telegram")} style={{ display: "block", background: "#26A5E4", color: "#fff", textAlign: "center", padding: "12px", borderRadius: 9, fontSize: 13, fontWeight: 700, textDecoration: "none", fontFamily: FONT_B }}>{c.cta_label || "Rejoindre le canal"}</a>
        </div>
      </div>
    ) : null
    case "youtube_channel": return (c.channel_name || c.cta_url) ? (
      <div style={{ padding: "10px 24px 12px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 13 }}>
          <div style={{ width: 46, height: 46, borderRadius: "50%", background: "rgba(255,0,0,0.15)", border: "2px solid rgba(255,0,0,0.3)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 21, flexShrink: 0 }}>▶️</div>
          <div style={{ flex: 1 }}>
            <p style={{ color: TEXT, fontSize: 14, fontWeight: 700, margin: "0 0 2px", fontFamily: FONT_B }}>{c.channel_name || "Ma Chaîne"}</p>
            {c.subscribers && <p style={{ color: MUTED, fontSize: 11, margin: 0 }}>{c.subscribers}</p>}
          </div>
        </div>
        <a href={extHref(c.cta_url) || "#"} target="_blank" rel="noopener noreferrer" onClick={() => trackLinkClick(pageId, block.id, c.cta_url || "youtube")} style={{ display: "block", background: "#FF0000", color: "#fff", textAlign: "center", padding: "12px", borderRadius: 9, fontSize: 13, fontWeight: 700, textDecoration: "none", fontFamily: FONT_B }}>{c.cta_label || "S'abonner"}</a>
      </div>
    ) : null
    case "twitch_live": {
      const isLive = c.status === "live"
      return (c.username || c.cta_url) ? (
        <div style={{ padding: "10px 24px 12px" }}>
          <div style={{ background: isLive ? "rgba(145,70,255,0.1)" : "rgba(255,255,255,0.03)", border: `1.5px solid ${isLive ? "rgba(145,70,255,0.4)" : "rgba(255,255,255,0.08)"}`, borderRadius: 13, padding: "15px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 11 }}>
              <div style={{ width: 42, height: 42, borderRadius: 10, background: "rgba(145,70,255,0.2)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 21, flexShrink: 0 }}>🎮</div>
              <div style={{ flex: 1 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
                  <p style={{ color: TEXT, fontSize: 14, fontWeight: 700, margin: 0, fontFamily: FONT_B }}>{c.username || "monpseudo"}</p>
                  {isLive && <span style={{ background: "#EF4444", color: "#fff", borderRadius: 4, padding: "1px 6px", fontSize: 9, fontWeight: 700 }}>● LIVE</span>}
                </div>
                {c.game && <p style={{ color: MUTED, fontSize: 11, margin: 0 }}>🎯 {c.game}</p>}
                {c.viewers && isLive && <p style={{ color: "#9146FF", fontSize: 11, margin: 0 }}>👁 {c.viewers}</p>}
                {!isLive && <p style={{ color: MUTED, fontSize: 11, margin: 0 }}>Hors ligne</p>}
              </div>
            </div>
            <a href={extHref(c.cta_url) || "#"} target="_blank" rel="noopener noreferrer" onClick={() => trackLinkClick(pageId, block.id, c.cta_url || "twitch")} style={{ display: "block", background: "#9146FF", color: "#fff", textAlign: "center", padding: "11px", borderRadius: 9, fontSize: 13, fontWeight: 700, textDecoration: "none", fontFamily: FONT_B }}>{c.cta_label || "Rejoindre le live"}</a>
          </div>
        </div>
      ) : null
    }
    case "tiktok_feed": return (c.username || c.cta_url) ? (
      <div style={{ padding: "10px 24px 12px" }}>
        <div style={{ background: "rgba(0,0,0,0.25)", border: "1px solid rgba(245,240,232,0.12)", borderRadius: 13, padding: "15px", textAlign: "center" }}>
          <span style={{ fontSize: 30, display: "block", marginBottom: 8 }}>🎵</span>
          {c.username && <p style={{ color: TEXT, fontSize: 14, fontWeight: 700, margin: "0 0 10px", fontFamily: FONT_B }}>{c.username}</p>}
          <a href={extHref(c.cta_url) || "#"} target="_blank" rel="noopener noreferrer" onClick={() => trackLinkClick(pageId, block.id, c.cta_url || "tiktok")} style={{ display: "block", background: "linear-gradient(90deg,#ff0050,#00f2ea)", color: "#fff", padding: "11px", borderRadius: 9, fontSize: 13, fontWeight: 700, textDecoration: "none", fontFamily: FONT_B }}>{c.cta_label || "Voir sur TikTok"}</a>
        </div>
      </div>
    ) : null
    case "podcast_links": {
      const platforms = [["spotify_url", "🟢", "#1DB954", "Spotify Podcasts"], ["apple_url", "🍎", "#B150E2", "Apple Podcasts"], ["pocket_url", "📻", "#F43E37", "Pocket Casts"], ["rss_url", "📡", "#F97316", "RSS Feed"]].filter(([k]) => c[k as string])
      return (platforms.length > 0 || c.podcast_name) ? (
        <div style={{ padding: "10px 24px 14px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 13 }}>
            {c.cover_url
              ? <SmartImage onError={e => { e.currentTarget.style.display = 'none' }} src={c.cover_url} alt="" width={54} height={54} style={{ width: 54, height: 54, borderRadius: 11, objectFit: "cover", flexShrink: 0 }} />
              : <div style={{ width: 54, height: 54, borderRadius: 11, background: "rgba(177,80,226,0.15)", border: "1px solid rgba(177,80,226,0.25)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 27, flexShrink: 0 }}>🎙️</div>}
            <div>
              <p style={{ color: TEXT, fontSize: 15, fontWeight: 700, margin: "0 0 2px", fontFamily: FONT_B }}>{c.podcast_name || "Mon Podcast"}</p>
              {c.description && <p style={{ color: MUTED, fontSize: 13.5, margin: 0 }}>{c.description}</p>}
            </div>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
            {platforms.map(([k, icon, color, label]: any[]) => (
              <a key={String(k)} href={c[k as string]} target="_blank" rel="noopener noreferrer" onClick={() => trackLinkClick(pageId, block.id, c[k as string])} style={{ display: "flex", alignItems: "center", gap: 11, background: `${color}12`, border: `1px solid ${color}25`, borderRadius: 10, padding: "11px 13px", textDecoration: "none" }}>
                <span style={{ fontSize: 17 }}>{icon}</span>
                <span style={{ color: TEXT, fontSize: 13, fontWeight: 600, flex: 1, fontFamily: FONT_B }}>{label}</span>
                <ExternalLink size={12} color={color as string} />
              </a>
            ))}
          </div>
        </div>
      ) : null
    }
    case "favorite_links": {
      const links = Array.from({ length: 50 }, (_, k) => { const i = k + 1; return [(c as any)[`link_${i}_icon`], (c as any)[`link_${i}_label`], (c as any)[`link_${i}_url`]] }).filter(([, l]) => l)
      return links.length > 0 ? (
        <div style={{ padding: "10px 24px 14px" }}>
          {c.title && <p style={{ color: MUTED, fontSize: 11, textTransform: "uppercase", letterSpacing: 2, margin: "0 0 10px", fontFamily: FONT_B }}>{c.title}</p>}
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {links.map(([icon, label, url]: any[], i: number) => (
              <a key={i} href={url || "#"} target="_blank" rel="noopener noreferrer" onClick={() => trackLinkClick(pageId, block.id, url || "link")} style={{ display: "flex", alignItems: "center", gap: 13, background: `${G}08`, border: `1px solid ${G}15`, borderRadius: 11, padding: "12px 13px", textDecoration: "none" }}>
                <span style={{ fontSize: 21, flexShrink: 0 }}>{icon || "🔗"}</span>
                <span style={{ color: TEXT, fontSize: 14, fontWeight: 600, flex: 1, fontFamily: FONT_B }}>{label}</span>
                <ExternalLink size={12} color={G} />
              </a>
            ))}
          </div>
        </div>
      ) : null
    }
    case "image_carousel": {
      const paires = [1,2,3,4,5,6,7,8,9,10,11,12].map(n => [c[`img${n}`], c[`img${n}_alt`]] as const).filter(([u]) => Boolean(u))
      const imgs = paires.map(([u]) => u as string)
      return imgs.length > 0 ? <CarouselPublic imgs={imgs} legendes={paires.map(([, a]) => (a as string) || "")} title={c.title} autoplay={c.auto_play === "yes"} MUTED={MUTED} FONT_B={FONT_B} /> : null
    }
    case "media_before_after": return (c.before_img || c.after_img) ? (
      <div style={{ padding: "10px 24px 14px" }}>
        {c.title && <p style={{ color: TEXT, fontSize: 14, fontWeight: 700, margin: "0 0 11px", textAlign: "center", fontFamily: FONT_B }}>{c.title}</p>}
        {c.mode === "slider" && c.before_img && c.after_img
          ? <BeforeAfterPublic before={c.before_img} after={c.after_img} beforeLabel={c.before_label || "Avant"} afterLabel={c.after_label || "Après"} />
          : <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 9 }}>
          <div style={{ borderRadius: 11, overflow: "hidden" }}>
            {c.before_img ? <SmartImage width={1200} height={900} sizes={SIZES_DEMI} onError={e => { e.currentTarget.style.display = 'none' }} src={c.before_img} alt="Avant" style={{ width: "100%", height: 150, objectFit: "cover", display: "block" }} /> : <div style={{ height: 150, background: "rgba(239,68,68,0.06)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 30 }}>📸</div>}
            <div style={{ background: "rgba(239,68,68,0.15)", padding: "7px", textAlign: "center" }}><p style={{ color: "#EF4444", fontSize: 12, fontWeight: 700, margin: 0 }}>{c.before_label || "Avant"}</p></div>
          </div>
          <div style={{ borderRadius: 11, overflow: "hidden" }}>
            {c.after_img ? <SmartImage width={1200} height={900} sizes={SIZES_DEMI} onError={e => { e.currentTarget.style.display = 'none' }} src={c.after_img} alt="Après" style={{ width: "100%", height: 150, objectFit: "cover", display: "block" }} /> : <div style={{ height: 150, background: "rgba(57,255,143,0.06)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 30 }}>✨</div>}
            <div style={{ background: "rgba(57,255,143,0.15)", padding: "7px", textAlign: "center" }}><p style={{ color: "var(--success)", fontSize: 12, fontWeight: 700, margin: 0 }}>{c.after_label || "Après"}</p></div>
          </div>
        </div>}
        {c.description && <p style={{ color: MUTED, fontSize: 13.5, textAlign: "center", margin: "9px 0 0" }}>{c.description}</p>}
      </div>
    ) : null
    case "video_local": {
      if (!c.src) return null
      const arMap: Record<string, string | undefined> = { "16:9": "16/9", "9:16": "9/16", "1:1": "1" }
      const ar = arMap[c.ratio || "16:9"]
      const vertical = c.ratio === "9:16"
      return (
        <div style={{ padding: "10px 24px 14px" }}>
          <div style={{ borderRadius: 13, overflow: "hidden", background: "#000", maxWidth: vertical ? 280 : undefined, margin: vertical ? "0 auto" : undefined }}>
            <video src={c.src} poster={c.poster || undefined} controls
              style={{ width: "100%", aspectRatio: ar, maxHeight: ar ? undefined : 260, objectFit: "cover", display: "block" }}
              autoPlay={c.autoplay === "yes"} loop={c.loop === "yes"} muted={c.muted !== "no"} playsInline />
          </div>
          {c.title && <p style={{ color: TEXT, fontSize: 14, fontWeight: 600, margin: "9px 0 0", textAlign: "center", fontFamily: FONT_B }}>{c.title}</p>}
        </div>
      )
    }
    case "audio_player": return c.src ? (
      <div style={{ padding: "10px 24px 14px" }}>
        <div style={{ background: "rgba(167,139,250,0.06)", border: "1.5px solid rgba(167,139,250,0.22)", borderRadius: 15, padding: "15px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 13, marginBottom: 13 }}>
            {c.cover
              ? <SmartImage onError={e => { e.currentTarget.style.display = 'none' }} src={c.cover} alt="" width={60} height={60} style={{ width: 60, height: 60, borderRadius: 11, objectFit: "cover", flexShrink: 0 }} />
              : <div style={{ width: 60, height: 60, borderRadius: 11, background: "rgba(167,139,250,0.15)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 28, flexShrink: 0 }}>🎧</div>}
            <div style={{ minWidth: 0 }}>
              <p style={{ color: TEXT, fontSize: 15, fontWeight: 700, margin: "0 0 2px", fontFamily: FONT_B, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{c.title || "Écouter"}</p>
              {c.artist && <p style={{ color: MUTED, fontSize: 12, margin: 0 }}>{c.artist}</p>}
            </div>
          </div>
          <audio src={c.src} controls preload="none" style={{ width: "100%", display: "block" }} />
          {c.show_download === "yes" && <a href={extHref(c.src)} download onClick={() => trackLinkClick(pageId, block.id, "audio-download")} style={{ display: "inline-block", marginTop: 9, color: MUTED, fontSize: 12, fontWeight: 600, textDecoration: "none" }}>↓ Télécharger</a>}
        </div>
      </div>
    ) : null
    case "pdf_viewer": return (c.url || c.title) ? (
      <div style={{ padding: "10px 24px 14px" }}>
        <div style={{ background: "rgba(78,205,196,0.06)", border: "1.5px solid rgba(78,205,196,0.2)", borderRadius: 15, padding: "17px" }}>
          {c.cover && <div style={{ borderRadius: 11, overflow: "hidden", marginBottom: 13, boxShadow: "0 6px 20px rgba(0,0,0,0.35)" }}><SmartImage width={1600} height={1200} sizes={SIZES_PLEINE} onError={e => { e.currentTarget.style.display = 'none' }} src={c.cover} alt={c.title || "Couverture du document"} style={{ width: "100%", maxHeight: 260, objectFit: "cover", display: "block" }} /></div>}
          <div style={{ display: "flex", alignItems: "center", gap: 13, marginBottom: c.url ? 13 : 0 }}>
            {!c.cover && <div style={{ width: 46, height: 54, background: "rgba(239,68,68,0.12)", border: "1px solid rgba(239,68,68,0.25)", borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 23, flexShrink: 0 }}>📄</div>}
            <div style={{ flex: 1 }}>
              <p style={{ color: TEXT, fontSize: 14, fontWeight: 700, margin: "0 0 2px", fontFamily: FONT_B }}>{c.title || "Mon document PDF"}</p>
              {c.description && <p style={{ color: MUTED, fontSize: 13.5, margin: "0 0 2px" }}>{c.description}</p>}
              {(c.pages || c.file_size) && <p style={{ color: MUTED, fontSize: 11, margin: 0 }}>📄 PDF{c.pages ? ` · ${c.pages} pages` : ""}{c.file_size ? ` · ${c.file_size}` : ""}</p>}
            </div>
          </div>
          {c.url && (
            <div style={{ display: "flex", gap: 8 }}>
              <a href={extHref(c.url)} target="_blank" rel="noopener noreferrer" onClick={() => trackLinkClick(pageId, block.id, c.url)} style={{ flex: 1, background: `linear-gradient(90deg,${G},${G}cc)`, borderRadius: 9, padding: "11px", textAlign: "center", fontSize: 13, fontWeight: 700, color: "#080808", textDecoration: "none", fontFamily: FONT_B }}>{c.cta_label || "Consulter le PDF"}</a>
              {c.show_download !== "no" && <a href={extHref(c.url)} download onClick={() => trackLinkClick(pageId, block.id, c.url)} style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 9, padding: "11px 16px", fontSize: 13, fontWeight: 600, color: MUTED, textDecoration: "none" }}>↓ PDF</a>}
            </div>
          )}
        </div>
      </div>
    ) : null
    case "youtube_gallery": {
      const videos = Array.from({ length: 50 }, (_, k) => { const i = k + 1; return [(c as any)[`video${i}_url`], (c as any)[`video${i}_title`]] }).filter(([u]) => u)
      return videos.length > 0 ? (
        <div style={{ padding: "10px 24px 14px" }}>
          {c.title && <p style={{ color: MUTED, fontSize: 11, textTransform: "uppercase", letterSpacing: 2, margin: "0 0 12px", fontFamily: FONT_B }}>{c.title}</p>}
          <div style={{ display: "flex", flexDirection: "column", gap: 11 }}>
            {videos.map(([url, title]: any[], i: number) => {
              const videoId = youtubeId(String(url))
              return (
                <a key={i} href={extHref(String(url))} target="_blank" rel="noopener noreferrer" onClick={() => trackLinkClick(pageId, block.id, String(url))} style={{ display: "block", borderRadius: 11, overflow: "hidden", background: "#000", position: "relative", textDecoration: "none" }}>
                  {videoId ? <SmartImage width={1200} height={900} sizes={SIZES_DEMI} onError={e => { e.currentTarget.style.display = 'none' }} src={`https://img.youtube.com/vi/${videoId}/mqdefault.jpg`} alt="" style={{ width: "100%", height: 150, objectFit: "cover", display: "block" }} /> : <div style={{ height: 150, background: "rgba(255,0,0,0.06)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 28 }}>▶️</div>}
                  <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <div style={{ width: 44, height: 44, background: "rgba(255,0,0,0.9)", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center" }}><span style={{ color: "#fff", fontSize: 16, marginLeft: 3 }}>▶</span></div>
                  </div>
                  {title && <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, background: "linear-gradient(transparent,rgba(0,0,0,0.85))", padding: "24px 12px 10px" }}><p style={{ color: "#fff", fontSize: 12, margin: 0, fontFamily: FONT_B }}>{title}</p></div>}
                </a>
              )
            })}
          </div>
          {c.cta_label && c.channel_url && <a href={extHref(c.channel_url)} target="_blank" rel="noopener noreferrer" onClick={() => trackLinkClick(pageId, block.id, c.channel_url)} style={{ display: "block", marginTop: 11, background: "rgba(255,0,0,0.1)", border: "1px solid rgba(255,0,0,0.25)", borderRadius: 10, padding: "12px", textAlign: "center", fontSize: 13, fontWeight: 700, color: "#FF0000", textDecoration: "none" }}>{c.cta_label}</a>}
        </div>
      ) : null
    }
    case "tiktok_gallery": {
      const vids = [c.video1_url, c.video2_url, c.video3_url].filter(Boolean)
      return (vids.length > 0 || c.cta_url) ? (
        <div style={{ padding: "10px 24px 14px" }}>
          {c.title && <p style={{ color: MUTED, fontSize: 11, textTransform: "uppercase", letterSpacing: 2, margin: "0 0 10px", fontFamily: FONT_B }}>{c.title}</p>}
          {c.username && <p style={{ color: MUTED, fontSize: 12, margin: "0 0 10px", textAlign: "center" }}>{c.username}</p>}
          {vids.length > 0 && (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 6 }}>
              {[c.video1_url, c.video2_url, c.video3_url].map((url, i) => url ? (
                <a key={i} href={extHref(String(url))} target="_blank" rel="noopener noreferrer" onClick={() => trackLinkClick(pageId, block.id, String(url))} style={{ aspectRatio: "9/16", background: "linear-gradient(135deg,rgba(255,0,80,0.15),rgba(0,242,234,0.15))", border: "1px solid rgba(245,240,232,0.12)", borderRadius: 9, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22, textDecoration: "none" }}>🎵</a>
              ) : <div key={i} style={{ aspectRatio: "9/16", background: "rgba(245,240,232,0.06)", borderRadius: 9 }} />)}
            </div>
          )}
          {c.cta_label && c.cta_url && <a href={extHref(c.cta_url)} target="_blank" rel="noopener noreferrer" onClick={() => trackLinkClick(pageId, block.id, c.cta_url)} style={{ display: "block", marginTop: 11, background: "linear-gradient(90deg,#ff0050,#00f2ea)", borderRadius: 10, padding: "12px", textAlign: "center", fontSize: 13, fontWeight: 700, color: "#fff", textDecoration: "none", fontFamily: FONT_B }}>{c.cta_label}</a>}
        </div>
      ) : null
    }
    case "video_testimonials": {
      const testi = Array.from({ length: 50 }, (_, k) => { const i = k + 1; return [(c as any)[`t${i}_video_url`], (c as any)[`t${i}_name`], (c as any)[`t${i}_company`], (c as any)[`t${i}_quote`]] }).filter(([, n]) => n)
      return testi.length > 0 ? (
        <div style={{ padding: "10px 24px 14px" }}>
          {c.title && <p style={{ color: MUTED, fontSize: 11, textTransform: "uppercase", letterSpacing: 2, margin: "0 0 12px", fontFamily: FONT_B }}>{c.title}</p>}
          <div style={{ display: "flex", flexDirection: "column", gap: 11 }}>
            {testi.map(([url, name, company, quote]: any[], i: number) => {
              const videoId = youtubeId(String(url || ""))
              const inner = (
                <>
                  {videoId && (
                    <div style={{ position: "relative" }}>
                      <SmartImage width={1200} height={900} sizes={SIZES_DEMI} onError={e => { e.currentTarget.style.display = 'none' }} src={`https://img.youtube.com/vi/${videoId}/mqdefault.jpg`} alt="" style={{ width: "100%", height: 130, objectFit: "cover", display: "block" }} />
                      <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
                        <div style={{ width: 40, height: 40, background: "rgba(0,0,0,0.7)", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center" }}><span style={{ color: "#fff", fontSize: 15, marginLeft: 3 }}>▶</span></div>
                      </div>
                    </div>
                  )}
                  <div style={{ padding: "12px 14px" }}>
                    {quote && <p style={{ color: TEXT, fontSize: 13, fontStyle: "italic", margin: "0 0 7px", lineHeight: 1.5, fontFamily: FONT_B }}>&quot;{quote}&quot;</p>}
                    <p style={{ color: G, fontSize: 13, fontWeight: 700, margin: 0, fontFamily: FONT_B }}>{name}{company ? <span style={{ color: MUTED, fontWeight: 400 }}> — {company}</span> : null}</p>
                  </div>
                </>
              )
              return videoId
                ? <a key={i} href={extHref(String(url))} target="_blank" rel="noopener noreferrer" onClick={() => trackLinkClick(pageId, block.id, String(url))} style={{ display: "block", background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 13, overflow: "hidden", textDecoration: "none" }}>{inner}</a>
                : <div key={i} style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 13, overflow: "hidden" }}>{inner}</div>
            })}
          </div>
        </div>
      ) : null
    }

    case "event_program": {
      const steps = Array.from({ length: 50 }, (_, k) => { const i = k + 1; return [(c as any)[`s${i}_time`], (c as any)[`s${i}_title`], (c as any)[`s${i}_desc`]] }).filter(([, t]) => t)
      return steps.length > 0 ? (
        <div style={{ padding: "10px 24px 14px" }}>
          {c.title && <p style={{ color: MUTED, fontSize: 11, textTransform: "uppercase", letterSpacing: 2, margin: "0 0 12px", fontFamily: FONT_B }}>{c.title}</p>}
          <div style={{ display: "flex", flexDirection: "column" }}>
            {steps.map(([time, title, desc]: any[], i: number, arr: any[]) => (
              <div key={i} style={{ display: "flex", gap: 15, paddingBottom: i < arr.length - 1 ? 15 : 0 }}>
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", flexShrink: 0 }}>
                  <div style={{ width: 40, height: 40, borderRadius: "50%", background: "linear-gradient(135deg,#EC4899,#F472B6)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, fontWeight: 700, color: "#fff", flexShrink: 0 }}>{time}</div>
                  {i < arr.length - 1 && <div style={{ width: 2, flex: 1, background: "rgba(236,72,153,0.2)", marginTop: 4 }} />}
                </div>
                <div style={{ flex: 1, paddingTop: 7 }}>
                  <p style={{ color: TEXT, fontSize: 14, fontWeight: 700, margin: "0 0 2px", fontFamily: FONT_B }}>{title}</p>
                  {desc && <p style={{ color: MUTED, fontSize: 13.5, margin: 0 }}>{desc}</p>}
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : null
    }
    case "event_ticketing": return (c.event_name || c.url) ? (
      <div style={{ padding: "10px 24px 14px" }}>
        <div style={{ background: "rgba(236,72,153,0.08)", border: "1.5px solid rgba(236,72,153,0.3)", borderRadius: 15, padding: "17px" }}>
          <div style={{ display: "flex", gap: 13, alignItems: "flex-start", marginBottom: 15 }}>
            <span style={{ fontSize: 34, flexShrink: 0 }}>🎟️</span>
            <div style={{ flex: 1 }}>
              <p style={{ color: TEXT, fontSize: 15, fontWeight: 700, margin: "0 0 3px", fontFamily: FONT_B }}>{c.event_name || "Mon événement"}</p>
              {c.date && <p style={{ color: MUTED, fontSize: 12, margin: "0 0 2px" }}>📅 {c.date}</p>}
              {c.location && <p style={{ color: MUTED, fontSize: 12, margin: "0 0 2px" }}>📍 {c.location}</p>}
              {c.price && <p style={{ color: "#EC4899", fontSize: 13, fontWeight: 700, margin: 0 }}>💶 {c.price}</p>}
            </div>
          </div>
          <a href={extHref(c.url) || "#"} target={/^https?:/.test(c.url || "") ? "_blank" : undefined} rel="noopener noreferrer" onClick={() => trackLinkClick(pageId, block.id, c.url || "ticket")} style={{ display: "block", background: "linear-gradient(90deg,#EC4899,#F472B6)", borderRadius: 11, padding: "13px", textAlign: "center", fontSize: 14, fontWeight: 700, color: "#fff", textDecoration: "none", fontFamily: FONT_B }}>{c.label || "Réserver ma place"}{c.platform && c.platform !== "URL personnalisée" ? ` — ${c.platform}` : ""}</a>
        </div>
      </div>
    ) : null
    case "event_guests": {
      const guests = Array.from({ length: 50 }, (_, k) => { const i = k + 1; return [(c as any)[`g${i}_photo`], (c as any)[`g${i}_name`], (c as any)[`g${i}_role`], (c as any)[`g${i}_desc`]] }).filter(([, n]) => n)
      return guests.length > 0 ? (
        <div style={{ padding: "10px 24px 14px" }}>
          {c.title && <p style={{ color: MUTED, fontSize: 11, textTransform: "uppercase", letterSpacing: 2, margin: "0 0 12px", fontFamily: FONT_B }}>{c.title}</p>}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 11 }}>
            {guests.map(([photo, name, role, desc]: any[], i: number) => (
              <div key={i} style={{ background: "rgba(236,72,153,0.06)", border: "1px solid rgba(236,72,153,0.15)", borderRadius: 13, padding: "14px 11px", textAlign: "center" }}>
                {photo
                  ? <SmartImage onError={e => { e.currentTarget.style.display = 'none' }} src={String(photo)} alt="" width={58} height={58} style={{ width: 58, height: 58, borderRadius: "50%", objectFit: "cover", margin: "0 auto 9px", display: "block", border: "2px solid rgba(236,72,153,0.4)" }} />
                  : <div style={{ width: 58, height: 58, borderRadius: "50%", background: "linear-gradient(135deg,#EC4899,#F472B6)", margin: "0 auto 9px", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22, fontWeight: 700, color: "#fff" }}>{String(name)[0]}</div>}
                <p style={{ color: TEXT, fontSize: 13, fontWeight: 700, margin: "0 0 3px", fontFamily: FONT_B }}>{name}</p>
                {role && <span style={{ background: "rgba(236,72,153,0.12)", border: "1px solid rgba(236,72,153,0.25)", borderRadius: 20, padding: "2px 9px", color: "#EC4899", fontSize: 13, fontWeight: 700 }}>{role}</span>}
                {desc && <p style={{ color: MUTED, fontSize: 13.5, margin: "5px 0 0" }}>{desc}</p>}
              </div>
            ))}
          </div>
        </div>
      ) : null
    }
    case "lineup": {
      const artists = [[c.a1_name, c.a1_stage, c.a1_time, c.a1_headliner], [c.a2_name, c.a2_stage, c.a2_time, c.a2_headliner], [c.a3_name, c.a3_stage, c.a3_time, c.a3_headliner], [c.a4_name, c.a4_stage, c.a4_time, c.a4_headliner]].filter(([n]) => n)
      return artists.length > 0 ? (
        <div style={{ padding: "10px 24px 14px" }}>
          {c.title && <p style={{ color: MUTED, fontSize: 11, textTransform: "uppercase", letterSpacing: 2, margin: "0 0 12px", fontFamily: FONT_B }}>{c.title}</p>}
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {artists.map(([name, stage, time, headliner]: any[], i: number) => (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: 12, background: headliner === "yes" ? "rgba(236,72,153,0.1)" : "rgba(255,255,255,0.03)", border: `1.5px solid ${headliner === "yes" ? "rgba(236,72,153,0.4)" : "rgba(255,255,255,0.07)"}`, borderRadius: 13, padding: "12px 15px" }}>
                <div style={{ flex: 1 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <p style={{ color: headliner === "yes" ? "#EC4899" : TEXT, fontSize: headliner === "yes" ? 16 : 14, fontWeight: 700, margin: 0, fontFamily: FONT_B }}>{name}</p>
                    {headliner === "yes" && <span style={{ background: "#EC4899", color: "#fff", borderRadius: 10, padding: "1px 8px", fontSize: 9, fontWeight: 700 }}>HEADLINER</span>}
                  </div>
                  {stage && <p style={{ color: MUTED, fontSize: 11, margin: "2px 0 0" }}>🎭 {stage}</p>}
                </div>
                {time && <span style={{ color: headliner === "yes" ? "#EC4899" : MUTED, fontSize: 13, fontWeight: 700, flexShrink: 0 }}>{time}</span>}
              </div>
            ))}
          </div>
        </div>
      ) : null
    }
    case "event_access": {
      const transports = [[c.transport1_icon, c.transport1_label], [c.transport2_icon, c.transport2_label], [c.transport3_icon, c.transport3_label]].filter(([, l]) => l)
      return (c.embed_url || c.address || transports.length > 0) ? (
        <div style={{ padding: "10px 24px 14px" }}>
          {c.title && <p style={{ color: MUTED, fontSize: 11, textTransform: "uppercase", letterSpacing: 2, margin: "0 0 10px", fontFamily: FONT_B }}>{c.title}</p>}
          {(() => { const mapSrc = mapEmbedUrl(c.address, c.embed_url); return mapSrc
            ? <iframe src={mapSrc} title={c.title || "Plan d'accès"} width="100%" height={180} style={{ border: "none", borderRadius: 13, display: "block", marginBottom: 11 }} loading="lazy" referrerPolicy="no-referrer-when-downgrade" />
            : c.address ? <div style={{ background: "rgba(236,72,153,0.06)", border: "1px solid rgba(236,72,153,0.2)", borderRadius: 13, padding: "18px", display: "flex", flexDirection: "column", alignItems: "center", gap: 7, marginBottom: 11 }}><span style={{ fontSize: 30 }}>🗺️</span><p style={{ color: MUTED, fontSize: 12, margin: 0, textAlign: "center" }}>📍 {c.address}</p></div> : null })()}
          {transports.length > 0 && (
            <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
              {transports.map(([icon, label]: any[], i: number) => (
                <div key={i} style={{ display: "flex", alignItems: "center", gap: 11, background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 10, padding: "10px 13px" }}>
                  <span style={{ fontSize: 19 }}>{icon}</span>
                  <span style={{ color: TEXT, fontSize: 13, fontFamily: FONT_B }}>{label}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : null
    }
    case "event_register": return <EventRegisterPublic block={block} pageId={pageId} TEXT={TEXT} MUTED={MUTED} ownerEmail={ownerEmail} />
    case "rsvp": return <RsvpPublic block={block} pageId={pageId} TEXT={TEXT} MUTED={MUTED} />
    case "add_to_calendar": { const cal = calendarLinks({ name: c.event_name, start: c.start_date, end: c.end_date, location: c.location, description: c.description }); const gUrl = c.google_url || cal?.google; return (c.event_name || gUrl) ? (
      <div style={{ padding: "10px 24px 14px" }}>
        <div style={{ background: "rgba(236,72,153,0.06)", border: "1px solid rgba(236,72,153,0.2)", borderRadius: 15, padding: "15px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 11, marginBottom: (gUrl || cal) ? 13 : 0 }}>
            <div style={{ width: 44, height: 44, borderRadius: 11, background: "rgba(236,72,153,0.12)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 23, flexShrink: 0 }}>📅</div>
            <div>
              <p style={{ color: TEXT, fontSize: 14, fontWeight: 700, margin: "0 0 2px", fontFamily: FONT_B }}>{c.event_name || "Mon événement"}</p>
              {c.start_date && <p style={{ color: MUTED, fontSize: 12, margin: 0 }}>🕐 {c.start_date.replace("T", " à ")}</p>}
              {c.location && <p style={{ color: MUTED, fontSize: 12, margin: 0 }}>📍 {c.location}</p>}
            </div>
          </div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {gUrl && <a href={gUrl} target="_blank" rel="noopener noreferrer" onClick={() => trackLinkClick(pageId, block.id, "calendar:google")} style={{ flex: 1, minWidth: 130, display: "flex", alignItems: "center", justifyContent: "center", gap: 7, background: "rgba(66,133,244,0.12)", border: "1px solid rgba(66,133,244,0.3)", borderRadius: 10, padding: "13px", fontSize: 12.5, fontWeight: 700, color: "#4285F4", textDecoration: "none", fontFamily: FONT_B }}>📅 Google Agenda</a>}
            {cal && <a href={cal.ics} download={`${(c.event_name || "evenement").replace(/[^\w-]+/g, "_")}.ics`} onClick={() => trackLinkClick(pageId, block.id, "calendar:ics")} style={{ flex: 1, minWidth: 130, display: "flex", alignItems: "center", justifyContent: "center", gap: 7, background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 10, padding: "13px", fontSize: 12.5, fontWeight: 700, color: TEXT, textDecoration: "none", fontFamily: FONT_B }}>🍎 Apple / Outlook</a>}
          </div>
        </div>
      </div>
    ) : null }
    case "participants_count": {
      const total = parseInt(c.count || "0")
      const max = parseInt(c.max || "0")
      const pct = max > 0 ? Math.min(100, Math.round((total / max) * 100)) : 0
      return c.count ? (
        <div style={{ padding: "14px 24px", textAlign: "center" }}>
          <div style={{ display: "inline-flex", alignItems: "center", gap: 13, background: "rgba(236,72,153,0.08)", border: "1px solid rgba(236,72,153,0.2)", borderRadius: 15, padding: "17px 26px", marginBottom: (c.show_progress !== "no" && max > 0) ? 13 : 0 }}>
            <span style={{ fontSize: 30 }}>{c.emoji || "👥"}</span>
            <div style={{ textAlign: "left" }}>
              <p style={{ color: "#EC4899", fontSize: 34, fontWeight: 700, margin: 0, fontFamily: FONT_D, lineHeight: 1 }}>{c.count}</p>
              <p style={{ color: MUTED, fontSize: 12, margin: "3px 0 0" }}>{c.label || "participants inscrits"}</p>
            </div>
          </div>
          {c.show_progress !== "no" && max > 0 && (
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 5 }}>
                <span style={{ color: MUTED, fontSize: 11 }}>Inscriptions</span>
                <span style={{ color: "#EC4899", fontSize: 11, fontWeight: 700 }}>{pct}% · {total}/{max}</span>
              </div>
              <div style={{ height: 7, background: "rgba(255,255,255,0.07)", borderRadius: 4, overflow: "hidden" }}>
                <div style={{ height: "100%", width: `${pct}%`, background: "linear-gradient(90deg,#EC4899,#F472B6)", borderRadius: 4 }} />
              </div>
            </div>
          )}
        </div>
      ) : null
    }
    case "tickets_left": {
      const urgencyStyles: Record<string, any> = {
        high: { bg: "rgba(239,68,68,0.1)", border: "rgba(239,68,68,0.4)", color: "#EF4444" },
        medium: { bg: "rgba(251,191,36,0.08)", border: "rgba(251,191,36,0.3)", color: "#FBBF24" },
        low: { bg: "rgba(57,255,143,0.08)", border: "rgba(57,255,143,0.25)", color: "var(--success)" },
      }
      const us = urgencyStyles[c.urgency || "high"]
      return c.count ? (
        <div style={{ padding: "10px 24px 14px" }}>
          <div style={{ background: us.bg, border: `1.5px solid ${us.border}`, borderRadius: 15, padding: "17px", textAlign: "center" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 11, marginBottom: c.cta_label ? 13 : 0 }}>
              <span style={{ fontSize: 30 }}>🎟️</span>
              <div style={{ textAlign: "left" }}>
                <p style={{ color: us.color, fontSize: 34, fontWeight: 700, margin: 0, fontFamily: FONT_D, lineHeight: 1 }}>{c.count}</p>
                <p style={{ color: MUTED, fontSize: 12, margin: "3px 0 0" }}>{c.label || "places restantes"}</p>
              </div>
            </div>
            {c.cta_label && <a href={extHref(c.cta_url) || "#"} target={/^https?:/.test(c.cta_url || "") ? "_blank" : undefined} rel="noopener noreferrer" onClick={() => trackLinkClick(pageId, block.id, c.cta_url || "tickets")} style={{ display: "block", background: us.color, borderRadius: 11, padding: "13px", fontSize: 14, fontWeight: 700, color: c.urgency === "medium" || c.urgency === "low" ? "#080808" : "#fff", textDecoration: "none", fontFamily: FONT_B }}>{c.cta_label}</a>}
          </div>
        </div>
      ) : null
    }

    case "vcard": {
      const vcf = buildVCard(c)
      const href = `data:text/vcard;charset=utf-8,${encodeURIComponent(vcf)}`
      return (c.name || c.phone || c.email) ? (
        <div style={{ padding: "6px 24px 12px" }}>
          <div style={{ background: `${G}08`, border: `1.5px solid ${G}25`, borderRadius: 13, padding: "13px 15px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 11, marginBottom: 10 }}>
              <div style={{ width: 40, height: 40, borderRadius: "50%", background: `linear-gradient(135deg,${G},${G}80)`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, flexShrink: 0 }}>👤</div>
              <div>{c.name && <p style={{ color: TEXT, fontSize: 14, fontWeight: 700, margin: 0, fontFamily: FONT_B }}>{c.name}</p>}{c.company && <p style={{ color: MUTED, fontSize: 11, margin: 0 }}>{c.company}</p>}</div>
            </div>
            <a href={href} download={`${(c.name || "contact").replace(/\s+/g, "_")}.vcf`} onClick={() => trackLinkClick(pageId, block.id, "vcard")} style={{ display: "block", background: `linear-gradient(90deg,${G},${G}cc)`, borderRadius: 9, padding: "12px", textAlign: "center", fontSize: 13, fontWeight: 700, color: "#080808", textDecoration: "none", fontFamily: FONT_B }}>{c.label || "Ajouter à mes contacts"}</a>
          </div>
        </div>
      ) : null
    }
    case "google_review": return c.url ? (
      <div style={{ padding: "6px 24px 12px" }}>
        <a href={extHref(c.url)} target="_blank" rel="noopener noreferrer" onClick={() => trackLinkClick(pageId, block.id, c.url)} style={{ display: "flex", alignItems: "center", gap: 11, background: "rgba(251,191,36,0.08)", border: "1.5px solid rgba(251,191,36,0.25)", borderRadius: 13, padding: "13px 15px", textDecoration: "none" }}>
          <div style={{ display: "flex", gap: 1 }}>{Array.from({ length: parseInt(c.stars || "5") }).map((_, i) => <span key={i} style={{ color: "#FBBF24", fontSize: 13 }}>★</span>)}</div>
          <div style={{ flex: 1 }}><p style={{ color: TEXT, fontSize: 13, fontWeight: 700, margin: 0, fontFamily: FONT_B }}>{c.label || "Donner un avis"}</p><p style={{ color: MUTED, fontSize: 10, margin: 0 }}>Google Reviews</p></div>
          <span style={{ fontSize: 19 }}>⭐</span>
        </a>
      </div>
    ) : null
    case "table_booking": return c.url ? (
      <div style={{ padding: "6px 24px 12px" }}>
        <a href={extHref(c.url)} target="_blank" rel="noopener noreferrer" onClick={() => trackLinkClick(pageId, block.id, c.url)} style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 9, background: "rgba(239,68,68,0.1)", border: "1.5px solid rgba(239,68,68,0.3)", borderRadius: 13, padding: "15px 18px", textDecoration: "none" }}>
          <span style={{ fontSize: 17 }}>🍽️</span>
          <span style={{ color: "#EF4444", fontSize: 14, fontWeight: 700, fontFamily: FONT_B }}>{c.label || "Réserver une table"}</span>
        </a>
      </div>
    ) : null
    case "donation": {
      const dc = ({ "Ko-fi": "#FF5E5B", "Buy Me A Coffee": "#FFDD00", "Patreon": "#FF424D", "PayPal": "#009CDE", "Tipeee": "#E55100" } as any)[c.platform || "Ko-fi"] || "#F59E0B"
      return c.url ? (
        <div style={{ padding: "6px 24px 12px" }}>
          <a href={extHref(c.url)} target="_blank" rel="noopener noreferrer" onClick={() => trackLinkClick(pageId, block.id, c.url)} style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 9, background: `${dc}12`, border: `1.5px solid ${dc}30`, borderRadius: 13, padding: "15px 18px", textDecoration: "none" }}>
            <span style={{ fontSize: 19 }}>☕</span>
            <span style={{ color: dc, fontSize: 14, fontWeight: 700, fontFamily: FONT_B }}>{c.label || "Soutenir mon travail"}</span>
          </a>
        </div>
      ) : null
    }
    case "app_download": return (c.ios_url || c.android_url) ? (
      <div style={{ padding: "6px 24px 12px" }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {c.ios_url && <a href={extHref(c.ios_url)} target="_blank" rel="noopener noreferrer" onClick={() => trackLinkClick(pageId, block.id, c.ios_url)} style={{ display: "flex", alignItems: "center", gap: 11, background: "rgba(0,0,0,0.25)", border: "1.5px solid rgba(255,255,255,0.12)", borderRadius: 12, padding: "11px 15px", textDecoration: "none" }}><span style={{ fontSize: 24 }}>🍎</span><div><p style={{ color: MUTED, fontSize: 9, margin: 0, textTransform: "uppercase", letterSpacing: 1 }}>Disponible sur</p><p style={{ color: TEXT, fontSize: 14, fontWeight: 700, margin: 0, fontFamily: FONT_B }}>App Store</p></div></a>}
          {c.android_url && <a href={extHref(c.android_url)} target="_blank" rel="noopener noreferrer" onClick={() => trackLinkClick(pageId, block.id, c.android_url)} style={{ display: "flex", alignItems: "center", gap: 11, background: "rgba(0,0,0,0.25)", border: "1.5px solid rgba(255,255,255,0.12)", borderRadius: 12, padding: "11px 15px", textDecoration: "none" }}><span style={{ fontSize: 24 }}>🤖</span><div><p style={{ color: MUTED, fontSize: 9, margin: 0, textTransform: "uppercase", letterSpacing: 1 }}>Disponible sur</p><p style={{ color: TEXT, fontSize: 14, fontWeight: 700, margin: 0, fontFamily: FONT_B }}>Google Play</p></div></a>}
        </div>
      </div>
    ) : null
    case "quote_request": return (c.label || c.url) ? (
      <div style={{ padding: "6px 24px 12px" }}>
        <a href={extHref(c.url) || "#"} target={/^https?:/.test(c.url || "") ? "_blank" : undefined} rel="noopener noreferrer" onClick={() => trackLinkClick(pageId, block.id, c.url || "quote")} style={{ display: "flex", alignItems: "center", gap: 11, background: `${G}08`, border: `1.5px solid ${G}20`, borderRadius: 13, padding: "12px 15px", textDecoration: "none" }}>
          <div style={{ width: 40, height: 40, background: `${G}12`, borderRadius: 9, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 19, flexShrink: 0 }}>📋</div>
          <div style={{ flex: 1 }}><p style={{ color: TEXT, fontSize: 13, fontWeight: 700, margin: 0, fontFamily: FONT_B }}>{c.label || "Demander un devis"}</p>{c.description && <p style={{ color: MUTED, fontSize: 10, margin: 0 }}>{c.description}</p>}</div>
          <span style={{ color: G, fontSize: 15 }}>→</span>
        </a>
      </div>
    ) : null
    case "reservation_form": return <LeadFormPublic block={block} pageId={pageId} ownerEmail={ownerEmail} leadType="reservation" title={c.title || "Réserver"} fields={[{ key: "name", label: "Nom" }, { key: "phone", label: "Téléphone" }, { key: "date", label: "Date souhaitée" }, { key: "people", label: "Nb personnes" }]} button={c.button_label || "Réserver"} accent="linear-gradient(90deg,#EF4444,#dc2626)" subject={`Réservation: ${c.title || ""}`} TEXT={TEXT} MUTED={MUTED} />
    case "quote_form": return <LeadFormPublic block={block} pageId={pageId} ownerEmail={ownerEmail} leadType="quote" title={c.title || "Demander un devis"} description={c.description} fields={[{ key: "name", label: "Nom complet" }, { key: "email", label: "Email" }, ...(c.show_phone !== "no" ? [{ key: "phone", label: "Téléphone" }] : []), ...(c.show_budget === "yes" ? [{ key: "budget", label: "Budget estimé" }] : []), { key: "project", label: "Description du projet", area: true }]} button={c.button_label || "Envoyer ma demande"} accent={`linear-gradient(90deg,${G},${G}cc)`} buttonTextColor="#080808" subject="Demande de devis" TEXT={TEXT} MUTED={MUTED} />
    case "booking_request": return <LeadFormPublic block={block} pageId={pageId} ownerEmail={ownerEmail} leadType="booking" title={c.title || "Réserver pour un événement"} description={c.description} fields={[{ key: "name", label: "Nom / Organisation" }, { key: "email", label: "Email" }, { key: "type", label: "Type d'événement" }, { key: "date", label: "Date souhaitée" }, { key: "message", label: "Message", area: true }]} button={c.button_label || "Envoyer ma demande"} accent="linear-gradient(90deg,#9146FF,#7B3FCC)" subject="Demande de réservation événement" TEXT={TEXT} MUTED={MUTED} />
    case "quick_contact": {
      const items = [[c.phone, "📞", "var(--success)", telLink(c.phone) || null], [c.email, "✉️", "var(--action)", c.email ? `mailto:${c.email}` : null], [c.whatsapp, "💬", "#25D366", waLink(c.whatsapp, undefined, c.whatsapp_cc || "33") || null], [c.address, "📍", G, null], [c.hours, "🕐", MUTED, null]].filter(([v]) => v)
      return items.length > 0 ? (
        <div style={{ padding: "10px 24px 14px" }}>
          {c.title && <p style={{ color: MUTED, fontSize: 11, textTransform: "uppercase", letterSpacing: 2, margin: "0 0 10px", fontFamily: FONT_B }}>{c.title}</p>}
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {items.map(([value, icon, color, href]: any[], i: number) => {
              const inner = <><span style={{ fontSize: 19, flexShrink: 0 }}>{icon}</span><span style={{ color: TEXT, fontSize: 13, fontWeight: 600, flex: 1, fontFamily: FONT_B }}>{value}</span>{href && <ExternalLink size={12} color={color} style={{ flexShrink: 0 }} />}</>
              const st: any = { display: "flex", alignItems: "center", gap: 12, background: `${color}10`, border: `1px solid ${color}20`, borderRadius: 11, padding: "12px 15px", textDecoration: "none" }
              return href ? <a key={i} href={href} target={href.startsWith("http") ? "_blank" : undefined} rel="noopener noreferrer" onClick={() => trackLinkClick(pageId, block.id, href)} style={st}>{inner}</a> : <div key={i} style={st}>{inner}</div>
            })}
          </div>
        </div>
      ) : null
    }
    case "multi_contact": {
      const contacts = Array.from({ length: 50 }, (_, k) => { const i = k + 1; return [(c as any)[`c${i}_photo`], (c as any)[`c${i}_name`], (c as any)[`c${i}_role`], (c as any)[`c${i}_phone`], (c as any)[`c${i}_email`]] }).filter(([, n]) => n)
      const accent = theme.accent || "var(--success)"
      return contacts.length > 0 ? (
        <div style={{ padding: "10px 24px 14px" }}>
          {c.title && <p style={{ color: MUTED, fontSize: 11, textTransform: "uppercase", letterSpacing: 2, margin: "0 0 12px", fontFamily: FONT_B }}>{c.title}</p>}
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {contacts.map(([photo, name, role, phone, email]: any[], i: number) => (
              <div key={i} style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 13, padding: "13px 15px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 11, marginBottom: (phone || email) ? 11 : 0 }}>
                  {photo ? <SmartImage onError={e => { e.currentTarget.style.display = 'none' }} src={String(photo)} alt="" width={44} height={44} style={{ width: 44, height: 44, borderRadius: "50%", objectFit: "cover", flexShrink: 0, border: `2px solid ${G}40` }} /> : <div style={{ width: 44, height: 44, borderRadius: "50%", background: `linear-gradient(135deg,${G},${accent})`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 17, fontWeight: 700, color: "#080808", flexShrink: 0 }}>{String(name)[0]}</div>}
                  <div><p style={{ color: TEXT, fontSize: 13, fontWeight: 700, margin: "0 0 2px", fontFamily: FONT_B }}>{name}</p>{role && <p style={{ color: G, fontSize: 13, margin: 0 }}>{role}</p>}</div>
                </div>
                {(phone || email) && (
                  <div style={{ display: "flex", gap: 8 }}>
                    {phone && <a href={telLink(String(phone)) || `tel:${phone}`} onClick={() => trackLinkClick(pageId, block.id, "tel")} style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 6, background: "rgba(57,255,143,0.08)", border: "1px solid rgba(57,255,143,0.2)", borderRadius: 9, padding: "9px", color: "var(--success)", textDecoration: "none", fontSize: 12, fontWeight: 600 }}>📞 Appeler</a>}
                    {email && <a href={`mailto:${email}`} onClick={() => trackLinkClick(pageId, block.id, "email")} style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 6, background: "rgba(56,189,248,0.08)", border: "1px solid rgba(56,189,248,0.2)", borderRadius: 9, padding: "9px", color: "var(--action)", textDecoration: "none", fontSize: 12, fontWeight: 600 }}>✉️ Email</a>}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      ) : null
    }
    case "service_area": {
      const cities = [c.city1, c.city2, c.city3, c.city4, c.city5, c.city6].filter(Boolean)
      return (c.area || cities.length > 0) ? (
        <div style={{ padding: "10px 24px 14px" }}>
          {c.title && <p style={{ color: MUTED, fontSize: 11, textTransform: "uppercase", letterSpacing: 2, margin: "0 0 10px", fontFamily: FONT_B }}>{c.title}</p>}
          {c.area && (
            <div style={{ display: "flex", alignItems: "center", gap: 11, background: "rgba(66,133,244,0.08)", border: "1px solid rgba(66,133,244,0.2)", borderRadius: 11, padding: "12px 15px", marginBottom: cities.length > 0 ? 11 : 0 }}>
              <span style={{ fontSize: 21 }}>📍</span>
              <div><p style={{ color: TEXT, fontSize: 14, fontWeight: 700, margin: "0 0 2px", fontFamily: FONT_B }}>{c.area}</p>{c.radius && <p style={{ color: MUTED, fontSize: 12, margin: 0 }}>{c.radius}</p>}</div>
            </div>
          )}
          {cities.length > 0 && <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>{cities.map((city: string, i: number) => <span key={i} style={{ background: "rgba(66,133,244,0.08)", border: "1px solid rgba(66,133,244,0.2)", borderRadius: 20, padding: "6px 13px", color: TEXT, fontSize: 13 }}>📍 {city}</span>)}</div>}
          {c.note && <p style={{ color: MUTED, fontSize: 13.5, margin: "11px 0 0", fontStyle: "italic" }}>{c.note}</p>}
        </div>
      ) : null
    }
    case "legal_info": {
      const rows = [["Société", c.company_name], ["SIRET", c.siret], ["N° TVA", c.tva], ["Siège social", c.address], ["Capital", c.capital], ["RCS", c.rcs], ["Email", c.email]].filter(([, v]) => v)
      return rows.length > 0 ? (
        <div style={{ padding: "10px 24px 14px" }}>
          {c.title && <p style={{ color: MUTED, fontSize: 11, textTransform: "uppercase", letterSpacing: 2, margin: "0 0 10px", fontFamily: FONT_B }}>{c.title}</p>}
          <div style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 13, overflow: "hidden" }}>
            {rows.map(([label, value]: any[], i: number) => (
              <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 15px", borderBottom: i < rows.length - 1 ? "1px solid rgba(255,255,255,0.05)" : "none" }}>
                <span style={{ color: MUTED, fontSize: 12 }}>{label}</span>
                <span style={{ color: TEXT, fontSize: 12, fontWeight: 600, maxWidth: "55%", textAlign: "right" }}>{value}</span>
              </div>
            ))}
          </div>
        </div>
      ) : null
    }
    case "business_certifications": {
      const certs = Array.from({ length: 50 }, (_, k) => { const i = k + 1; return [(c as any)[`c${i}_icon`], (c as any)[`c${i}_name`], (c as any)[`c${i}_org`], (c as any)[`c${i}_year`]] }).filter(([, n]) => n)
      return certs.length > 0 ? (
        <div style={{ padding: "10px 24px 14px" }}>
          {c.title && <p style={{ color: MUTED, fontSize: 11, textTransform: "uppercase", letterSpacing: 2, margin: "0 0 10px", fontFamily: FONT_B }}>{c.title}</p>}
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {certs.map(([icon, name, org, year]: any[], i: number) => (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: 11, background: `${G}06`, border: `1px solid ${G}15`, borderRadius: 12, padding: "11px 13px" }}>
                <span style={{ fontSize: 21 }}>{icon || "🏅"}</span>
                <div style={{ flex: 1 }}><p style={{ color: TEXT, fontSize: 13, fontWeight: 700, margin: 0, fontFamily: FONT_B }}>{name}</p><p style={{ color: MUTED, fontSize: 11, margin: 0 }}>{org}{year ? ` · ${year}` : ""}</p></div>
                <span style={{ color: G, fontSize: 15 }}>✓</span>
              </div>
            ))}
          </div>
        </div>
      ) : null
    }
    case "on_site_services": {
      const svcs = Array.from({ length: 50 }, (_, k) => { const i = k + 1; return [(c as any)[`s${i}_icon`], (c as any)[`s${i}_label`]] }).filter(([, l]) => l)
      return svcs.length > 0 ? (
        <div style={{ padding: "10px 24px 14px" }}>
          {c.title && <p style={{ color: MUTED, fontSize: 11, textTransform: "uppercase", letterSpacing: 2, margin: "0 0 10px", fontFamily: FONT_B }}>{c.title}</p>}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 9 }}>
            {svcs.map(([icon, label]: any[], i: number) => (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, background: "rgba(66,133,244,0.06)", border: "1px solid rgba(66,133,244,0.15)", borderRadius: 11, padding: "11px 13px" }}>
                <span style={{ fontSize: 21, flexShrink: 0 }}>{icon}</span>
                <span style={{ color: TEXT, fontSize: 12, fontWeight: 600, fontFamily: FONT_B }}>{label}</span>
              </div>
            ))}
          </div>
        </div>
      ) : null
    }
    case "google_maps_embed": { const mapSrc = mapEmbedUrl(c.address, c.embed_url, c.zoom); return (c.embed_url || c.address) ? (
      <div style={{ padding: "10px 24px 14px" }}>
        {c.label && <p style={{ color: MUTED, fontSize: 11, textTransform: "uppercase", letterSpacing: 2, margin: "0 0 10px", fontFamily: FONT_B }}>{c.label}</p>}
        {mapSrc
          ? <iframe src={mapSrc} title={c.label || "Carte"} width="100%" height={c.height === "lg" ? 240 : c.height === "sm" ? 140 : 190} style={{ border: "none", borderRadius: 13, display: "block" }} loading="lazy" referrerPolicy="no-referrer-when-downgrade" />
          : <div style={{ height: 190, background: "rgba(66,133,244,0.06)", border: "1px solid rgba(66,133,244,0.2)", borderRadius: 13, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 8 }}><span style={{ fontSize: 34 }}>🗺️</span><p style={{ color: MUTED, fontSize: 12, margin: 0, textAlign: "center" }}>📍 {c.address}</p></div>}
        {c.show_directions !== "no" && c.address && <a href={`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(c.address)}`} target="_blank" rel="noopener noreferrer" onClick={() => trackLinkClick(pageId, block.id, "directions")} style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, marginTop: 11, background: "rgba(66,133,244,0.1)", border: "1px solid rgba(66,133,244,0.25)", borderRadius: 10, padding: "12px", color: "#4285F4", textDecoration: "none", fontSize: 13, fontWeight: 700 }}>🧭 Obtenir l&apos;itinéraire</a>}
      </div>
    ) : null }
    case "company": return (c.company_name || c.logo_url) ? (
      <div style={{ padding: "8px 24px 12px" }}>
        <div style={{ display: "flex", gap: 12, alignItems: "center", background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 13, padding: "12px 13px" }}>
          {c.logo_url ? <SmartImage onError={e => { e.currentTarget.style.display = 'none' }} src={c.logo_url} alt="" width={44} height={44} style={{ width: 44, height: 44, borderRadius: 10, objectFit: "cover", flexShrink: 0 }} /> : <div style={{ width: 44, height: 44, borderRadius: 10, background: `${G}15`, border: `1px solid ${G}25`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 21, flexShrink: 0 }}>🏢</div>}
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{ color: TEXT, fontSize: 15, fontWeight: 700, margin: "0 0 1px", fontFamily: FONT_D }}>{c.company_name || "Mon Entreprise"}</p>
            <p style={{ color: MUTED, fontSize: 11, margin: 0 }}>{c.sector}{c.founded_year ? ` · Depuis ${c.founded_year}` : ""}</p>
          </div>
        </div>
      </div>
    ) : null

    case "before_after": return (c.before_img || c.after_img) ? (
      <div style={{ padding: "10px 24px 14px" }}>
        {c.title && <p style={{ color: TEXT, fontSize: 14, fontWeight: 700, margin: "0 0 11px", textAlign: "center", fontFamily: FONT_B }}>{c.title}</p>}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 9 }}>
          <div style={{ borderRadius: 11, overflow: "hidden" }}>
            {c.before_img ? <SmartImage width={1200} height={900} sizes={SIZES_DEMI} onError={e => { e.currentTarget.style.display = 'none' }} src={c.before_img} alt="Avant" style={{ width: "100%", height: 150, objectFit: "cover", display: "block" }} /> : <div style={{ height: 150, background: "rgba(239,68,68,0.06)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 30 }}>📸</div>}
            <div style={{ background: "rgba(239,68,68,0.15)", padding: "7px", textAlign: "center" }}><p style={{ color: "#EF4444", fontSize: 12, fontWeight: 700, margin: 0 }}>{c.before_label || "Avant"}</p></div>
          </div>
          <div style={{ borderRadius: 11, overflow: "hidden" }}>
            {c.after_img ? <SmartImage width={1200} height={900} sizes={SIZES_DEMI} onError={e => { e.currentTarget.style.display = 'none' }} src={c.after_img} alt="Après" style={{ width: "100%", height: 150, objectFit: "cover", display: "block" }} /> : <div style={{ height: 150, background: "rgba(57,255,143,0.06)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 30 }}>✨</div>}
            <div style={{ background: "rgba(57,255,143,0.15)", padding: "7px", textAlign: "center" }}><p style={{ color: "var(--success)", fontSize: 12, fontWeight: 700, margin: 0 }}>{c.after_label || "Après"}</p></div>
          </div>
        </div>
        {c.description && <p style={{ color: MUTED, fontSize: 13.5, textAlign: "center", margin: "9px 0 0" }}>{c.description}</p>}
      </div>
    ) : null
    case "brands": {
      const brandList = Array.from({ length: 50 }, (_, k) => { const i = k + 1; return [(c as any)[`brand${i}_icon`], (c as any)[`brand${i}_name`]] }).filter(([, n]) => n)
      return brandList.length > 0 ? (
        <div style={{ padding: "10px 24px 14px" }}>
          {c.title && <p style={{ color: MUTED, fontSize: 11, textTransform: "uppercase", letterSpacing: 2, margin: "0 0 10px", fontFamily: FONT_B }}>{c.title}</p>}
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            {brandList.map(([icon, name]: any[], i: number) => (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: 7, background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 20, padding: "6px 13px" }}>
                {icon && <span style={{ fontSize: 16 }}>{icon}</span>}
                <span style={{ color: TEXT, fontSize: 12, fontWeight: 600, fontFamily: FONT_B }}>{name}</span>
              </div>
            ))}
          </div>
        </div>
      ) : null
    }
    case "gift_card": return (c.title || c.amount1) ? (
      <div style={{ padding: "10px 24px 14px" }}>
        <div style={{ background: "linear-gradient(135deg,#EC489915,#F472B610)", border: "1.5px solid rgba(236,72,153,0.3)", borderRadius: 15, padding: "17px" }}>
          <div style={{ textAlign: "center", marginBottom: 13 }}>
            <span style={{ fontSize: 34 }}>🎁</span>
            <p style={{ color: TEXT, fontSize: 16, fontWeight: 700, margin: "6px 0 3px", fontFamily: FONT_B }}>{c.title || "Offrez une expérience"}</p>
            {c.description && <p style={{ color: MUTED, fontSize: 13.5, margin: 0 }}>{c.description}</p>}
          </div>
          <div style={{ display: "flex", gap: 8, justifyContent: "center", marginBottom: c.cta_label ? 13 : 0 }}>
            {[c.amount1, c.amount2, c.amount3].filter(Boolean).map((amount, i) => (
              <div key={i} style={{ background: i === 1 ? "rgba(236,72,153,0.2)" : "rgba(255,255,255,0.06)", border: `1.5px solid ${i === 1 ? "rgba(236,72,153,0.4)" : "rgba(255,255,255,0.1)"}`, borderRadius: 11, padding: "11px 16px", textAlign: "center" }}>
                <p style={{ color: i === 1 ? "#EC4899" : TEXT, fontSize: 17, fontWeight: 700, margin: 0 }}>{amount}</p>
              </div>
            ))}
          </div>
          {c.cta_label && <a href={extHref(c.cta_url) || "#"} target={/^https?:/.test(c.cta_url || "") ? "_blank" : undefined} rel="noopener noreferrer" onClick={() => trackLinkClick(pageId, block.id, c.cta_url || "giftcard")} style={{ display: "block", background: "linear-gradient(90deg,#EC4899,#F472B6)", borderRadius: 11, padding: "12px", textAlign: "center", fontSize: 14, fontWeight: 700, color: "#fff", textDecoration: "none", fontFamily: FONT_B }}>{c.cta_label}</a>}
        </div>
      </div>
    ) : null
    case "services_pricing": {
      const svcs = Array.from({ length: 50 }, (_, k) => { const i = k + 1; return [(c as any)[`s${i}_name`], (c as any)[`s${i}_price`], (c as any)[`s${i}_duration`], (c as any)[`s${i}_desc`]] }).filter(([n]) => n)
      return svcs.length > 0 ? (
        <div style={{ padding: "10px 24px 14px" }}>
          {c.title && <p style={{ color: MUTED, fontSize: 11, textTransform: "uppercase", letterSpacing: 2, margin: "0 0 10px", fontFamily: FONT_B }}>{c.title}</p>}
          <div>
            {svcs.map(([name, price, duration, desc]: any[], i: number) => (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: 11, padding: "11px 0", borderBottom: i < svcs.length - 1 ? "1px solid rgba(255,255,255,0.06)" : "none" }}>
                <div style={{ flex: 1 }}><p style={{ color: TEXT, fontSize: 14, fontWeight: 600, margin: "0 0 1px", fontFamily: FONT_B }}>{name}</p>{desc && <p style={{ color: MUTED, fontSize: 13.5, margin: 0 }}>{desc}</p>}</div>
                <div style={{ textAlign: "right", flexShrink: 0, maxWidth: "50%", overflowWrap: "anywhere" }}><p style={{ color: G, fontSize: 15, fontWeight: 700, margin: 0 }}>{price}</p>{duration && <p style={{ color: MUTED, fontSize: 11, margin: 0 }}>{duration}</p>}</div>
              </div>
            ))}
          </div>
        </div>
      ) : null
    }
    case "external_shop": return (c.label || c.url) ? (
      <div style={{ padding: "6px 24px 14px" }}>
        {c.description && <p style={{ color: MUTED, fontSize: 13, margin: "0 0 11px", textAlign: "center" }}>{c.description}</p>}
        <a href={extHref(c.url) || "#"} target={/^https?:/.test(c.url || "") ? "_blank" : undefined} rel="noopener noreferrer" onClick={() => trackLinkClick(pageId, block.id, c.url || "shop")} style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 10, background: `${G}10`, border: `1.5px solid ${G}30`, borderRadius: 13, padding: "15px 18px", textDecoration: "none" }}>
          <span style={{ fontSize: 21 }}>🛒</span>
          <div><p style={{ color: TEXT, fontSize: 14, fontWeight: 700, margin: 0, fontFamily: FONT_B }}>{c.label || "Voir la boutique"}</p>{c.platform && <p style={{ color: MUTED, fontSize: 10, margin: 0 }}>via {c.platform}</p>}</div>
          <ExternalLink size={14} color={G} style={{ marginLeft: "auto" }} />
        </a>
      </div>
    ) : null
    case "advantages": {
      const advList = Array.from({ length: 50 }, (_, k) => (c as any)[`adv${k + 1}`]).filter(Boolean)
      return advList.length > 0 ? (
        <div style={{ padding: "10px 24px 14px" }}>
          {c.title && <p style={{ color: MUTED, fontSize: 11, textTransform: "uppercase", letterSpacing: 2, margin: "0 0 10px", fontFamily: FONT_B }}>{c.title}</p>}
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {advList.map((adv: string, i: number) => <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 13px", background: "rgba(57,255,143,0.05)", border: "1px solid rgba(57,255,143,0.15)", borderRadius: 10 }}><p style={{ color: TEXT, fontSize: 13, margin: 0, fontFamily: FONT_B }}>{adv}</p></div>)}
          </div>
        </div>
      ) : null
    }
    case "reassurance": {
      const guarantees = Array.from({ length: 50 }, (_, k) => { const i = k + 1; return [(c as any)[`g${i}_icon`], (c as any)[`g${i}_label`], (c as any)[`g${i}_desc`]] }).filter(([, l]) => l)
      return guarantees.length > 0 ? (
        <div style={{ padding: "10px 24px 14px" }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 9 }}>
            {guarantees.map(([icon, label, desc]: any[], i: number) => (
              <div key={i} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6, background: "rgba(57,255,143,0.05)", border: "1px solid rgba(57,255,143,0.12)", borderRadius: 12, padding: "13px 9px", textAlign: "center" }}>
                <span style={{ fontSize: 26 }}>{icon || "✅"}</span>
                <p style={{ color: TEXT, fontSize: 12, fontWeight: 700, margin: 0, fontFamily: FONT_B }}>{label}</p>
                {desc && <p style={{ color: MUTED, fontSize: 13, margin: 0 }}>{desc}</p>}
              </div>
            ))}
          </div>
        </div>
      ) : null
    }
    case "sales_counter": return c.count ? (
      <div style={{ padding: "10px 24px 14px" }}>
        <div style={{ background: "rgba(239,68,68,0.08)", border: "1.5px solid rgba(239,68,68,0.25)", borderRadius: 15, padding: "17px", textAlign: "center" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 11, marginBottom: c.subtext ? 7 : 0 }}>
            <span style={{ fontSize: 30 }}>{c.emoji || "🔥"}</span>
            <div><p style={{ margin: 0, lineHeight: 1, fontFamily: FONT_D }}><span style={{ color: TEXT, fontSize: 30, fontWeight: 700 }}>{c.count}</span> <span style={{ color: "#EF4444", fontSize: 15, fontWeight: 700 }}>{c.label || "ventes"}</span></p>{c.period && <p style={{ color: MUTED, fontSize: 12, margin: "3px 0 0" }}>{c.period}</p>}</div>
          </div>
          {c.subtext && <p style={{ color: "#EF4444", fontSize: 13, fontWeight: 600, margin: 0 }}>{c.subtext}</p>}
        </div>
      </div>
    ) : null
    case "popular_products": {
      const tops = Array.from({ length: 50 }, (_, k) => { const i = k + 1; return [(c as any)[`p${i}_rank`], (c as any)[`p${i}_img`], (c as any)[`p${i}_name`], (c as any)[`p${i}_price`], (c as any)[`p${i}_sales`], (c as any)[`p${i}_url`]] }).filter(([, , n]) => n)
      return tops.length > 0 ? (
        <div style={{ padding: "10px 24px 14px" }}>
          {c.title && <p style={{ color: MUTED, fontSize: 11, textTransform: "uppercase", letterSpacing: 2, margin: "0 0 12px", fontFamily: FONT_B }}>{c.title}</p>}
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {tops.map(([rank, img, name, price, sales, url]: any[], i: number) => {
              const inner = <>
                {rank && <span style={{ fontSize: 19, flexShrink: 0 }}>{String(rank).split(" ")[0]}</span>}
                {img ? <SmartImage onError={e => { e.currentTarget.style.display = 'none' }} src={String(img)} alt="" width={44} height={44} style={{ width: 44, height: 44, objectFit: "cover", borderRadius: 8, flexShrink: 0 }} /> : <div style={{ width: 44, height: 44, background: `${G}10`, borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 21, flexShrink: 0 }}>🏆</div>}
                <div style={{ flex: 1, minWidth: 0 }}><p style={{ color: TEXT, fontSize: 13, fontWeight: 700, margin: "0 0 1px", fontFamily: FONT_B }}>{name}</p>{sales && <p style={{ color: MUTED, fontSize: 11, margin: 0 }}>{sales}</p>}</div>
                {price && <span style={{ color: G, fontSize: 14, fontWeight: 700, flexShrink: 0, maxWidth: "50%", overflowWrap: "anywhere" }}>{price}</span>}
              </>
              const st: any = { display: "flex", alignItems: "center", gap: 11, background: i === 0 ? `${G}08` : "rgba(255,255,255,0.03)", border: `1px solid ${i === 0 ? `${G}20` : "rgba(255,255,255,0.07)"}`, borderRadius: 11, padding: "11px 13px", textDecoration: "none" }
              return url ? <a key={i} href={extHref(String(url))} target="_blank" rel="noopener noreferrer" onClick={() => trackLinkClick(pageId, block.id, String(url))} style={st}>{inner}</a> : <div key={i} style={st}>{inner}</div>
            })}
          </div>
        </div>
      ) : null
    }
    case "scan_counter": return (c.count || c.label) ? (
      <div style={{ padding: "12px 24px 16px", textAlign: "center" }}>
        <div style={{ display: "inline-flex", alignItems: "center", gap: 12, justifyContent: "center" }}>
          {c.emoji && <span style={{ fontSize: 34 }}>{c.emoji}</span>}
          <div style={{ textAlign: "left" }}>
            <p style={{ fontFamily: FONT_D, fontSize: 40, color: G, fontWeight: 700, margin: "0 0 1px", lineHeight: 1 }}>{c.count || "1 240"}</p>
            {c.label && <p style={{ color: MUTED, fontSize: 13, margin: 0, fontFamily: FONT_B }}>{c.label}</p>}
          </div>
        </div>
      </div>
    ) : null
    case "engagements": {
      const engList = [c.e1, c.e2, c.e3, c.e4, c.e5, c.e6].filter(Boolean)
      return engList.length > 0 ? (
        <div style={{ padding: "10px 24px 14px" }}>
          {c.title && <p style={{ color: MUTED, fontSize: 11, textTransform: "uppercase", letterSpacing: 2, margin: "0 0 10px", fontFamily: FONT_B }}>{c.title}</p>}
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {engList.map((eng: string, i: number) => <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, padding: "11px 13px", background: "rgba(57,255,143,0.05)", border: "1px solid rgba(57,255,143,0.15)", borderRadius: 11 }}><p style={{ color: TEXT, fontSize: 13, margin: 0, lineHeight: 1.4, fontFamily: FONT_B }}>{eng}</p></div>)}
          </div>
        </div>
      ) : null
    }
    case "announcement": return <AnnouncementPublic c={c} theme={theme} pageId={pageId} blockId={block.id} />

    case "info_table": {
      const rows = Array.from({ length: 50 }, (_, k) => { const i = k + 1; return [(c as any)[`r${i}_label`], (c as any)[`r${i}_value`]] }).filter(([l]) => l)
      return rows.length > 0 ? (
        <div style={{ padding: "10px 24px 14px" }}>
          {c.title && <p style={{ color: MUTED, fontSize: 11, textTransform: "uppercase", letterSpacing: 2, margin: "0 0 10px", fontFamily: FONT_B }}>{c.title}</p>}
          <div>
            {rows.map(([label, value]: any[], i: number) => (
              <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 0", borderBottom: i < rows.length - 1 ? "1px solid rgba(255,255,255,0.06)" : "none" }}>
                <span style={{ color: MUTED, fontSize: 13 }}>{label}</span>
                <span style={{ color: TEXT, fontSize: 13, fontWeight: 600, fontFamily: FONT_B }}>{value}</span>
              </div>
            ))}
          </div>
        </div>
      ) : null
    }
    case "documents": {
      const docs = Array.from({ length: 50 }, (_, k) => k + 1)
        .map(i => ({ type: c[`d${i}_type`] as string, title: c[`d${i}_title`] as string, desc: (c[`d${i}_desc`] || "") as string, url: (c[`d${i}_url`] || "").trim() as string, meta: (c[`d${i}_meta`] || "") as string }))
        .filter(d => d.title)
      if (docs.length === 0) return null
      return (
        <div style={{ padding: "10px 24px 14px" }}>
          {c.title && <p style={{ color: MUTED, fontSize: 11, textTransform: "uppercase", letterSpacing: 2, margin: "0 0 12px", fontFamily: FONT_B }}>{c.title}</p>}
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {docs.map((d, i) => {
              const dm = docTypeMeta(d.type)
              const inner = <>
                <div style={{ width: 42, height: 42, borderRadius: 10, background: `${dm.color}14`, border: `1px solid ${dm.color}30`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20, flexShrink: 0 }}>{dm.icon}</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ color: TEXT, fontSize: 13.5, fontWeight: 700, margin: "0 0 1px", fontFamily: FONT_B }}>{d.title}</p>
                  {d.desc && <p style={{ color: MUTED, fontSize: 13.5, margin: 0, lineHeight: 1.4, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{d.desc}</p>}
                  {d.meta && <p style={{ color: MUTED, fontSize: 12.5, margin: "3px 0 0", opacity: 0.8 }}>{d.type ? `${d.type} · ` : ""}{d.meta}</p>}
                </div>
                {d.url && <span style={{ flexShrink: 0, display: "inline-flex", alignItems: "center", gap: 5, color: G, fontSize: 12, fontWeight: 700 }}>{docActionLabel(d.type)} <span aria-hidden>↓</span></span>}
              </>
              const st: any = { display: "flex", alignItems: "center", gap: 12, background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 12, padding: "11px 13px", textDecoration: "none" }
              return d.url
                ? <a key={i} href={extHref(d.url)} target="_blank" rel="noopener noreferrer" onClick={() => trackLinkClick(pageId, block.id, extHref(d.url))} style={st}>{inner}</a>
                : <div key={i} style={st}>{inner}</div>
            })}
          </div>
        </div>
      )
    }
    case "founder_message": {
      const accent = theme.accent || "var(--success)"
      return (c.message || c.name) ? (
        <div style={{ padding: "12px 24px 14px" }}>
          <div style={{ background: `${G}06`, border: `1px solid ${G}15`, borderRadius: 15, padding: "17px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 13, marginBottom: 13 }}>
              {c.photo ? <SmartImage onError={e => { e.currentTarget.style.display = 'none' }} src={c.photo} alt="" width={52} height={52} style={{ width: 52, height: 52, borderRadius: "50%", objectFit: "cover", flexShrink: 0, border: `2px solid ${G}40` }} /> : <div style={{ width: 52, height: 52, borderRadius: "50%", background: `linear-gradient(135deg,${G},${accent})`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 23, flexShrink: 0 }}>👤</div>}
              <div>{c.name && <p style={{ color: TEXT, fontSize: 15, fontWeight: 700, margin: "0 0 2px", fontFamily: FONT_D }}>{c.name}</p>}{c.role && <p style={{ color: G, fontSize: 13, margin: 0 }}>{c.role}</p>}</div>
            </div>
            <p style={{ color: MUTED, fontSize: 13, lineHeight: 1.7, margin: c.signature ? "0 0 11px" : "0", fontStyle: "italic" }}>&quot;{c.message}&quot;</p>
            {c.signature && <p style={{ color: G, fontSize: 15, fontFamily: "Georgia, serif", margin: 0, fontStyle: "italic" }}>{c.signature}</p>}
          </div>
        </div>
      ) : null
    }
    case "spotify_embed": {
      const src = spotifyEmbedUrl(c.url)
      const height = c.size === "lg" ? 352 : c.size === "sm" ? 80 : 152
      return src ? (
        <div style={{ padding: "10px 24px 14px" }}>
          <iframe src={src} title="Lecteur Spotify" width="100%" height={height} style={{ borderRadius: 13, border: "none", display: "block" }} allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture" loading="lazy" />
        </div>
      ) : null
    }
    case "latest_release": {
      const platforms = [[c.spotify_url, "🎧 Spotify", "#1DB954", "#000"], [c.apple_url, "🍎 Apple", "#FC3C44", "#fff"], [c.youtube_url, "▶ YT", "#FF0000", "#fff"]].filter(([u]) => u)
      return (c.title || c.cover || platforms.length > 0) ? (
        <div style={{ padding: "10px 24px 14px" }}>
          <div style={{ background: "linear-gradient(135deg,rgba(29,185,84,0.12),rgba(29,185,84,0.06))", border: "1.5px solid rgba(29,185,84,0.3)", borderRadius: 16, overflow: "hidden" }}>
            {c.badge && <div style={{ background: "rgba(29,185,84,0.2)", padding: "7px 14px", fontSize: 12, fontWeight: 700, color: "#1DB954", textAlign: "center" }}>{c.badge}</div>}
            <div style={{ display: "flex", gap: 14, padding: "15px" }}>
              {c.cover ? <SmartImage onError={e => { e.currentTarget.style.display = 'none' }} src={c.cover} alt="" width={84} height={84} style={{ width: 84, height: 84, borderRadius: 11, objectFit: "cover", flexShrink: 0, boxShadow: "0 4px 16px rgba(0,0,0,0.4)" }} /> : <div style={{ width: 84, height: 84, borderRadius: 11, background: "rgba(29,185,84,0.15)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 34, flexShrink: 0 }}>🎵</div>}
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ color: TEXT, fontSize: 17, fontWeight: 700, margin: "0 0 3px", fontFamily: FONT_D }}>{c.title || "Nouveau titre"}</p>
                {c.artist && <p style={{ color: MUTED, fontSize: 13, margin: "0 0 4px" }}>{c.artist}</p>}
                {c.release_date && <p style={{ color: "#1DB954", fontSize: 12, margin: "0 0 10px", fontWeight: 600 }}>📅 {c.release_date}</p>}
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                  {platforms.map(([url, label, bg]: any[], i: number) => <a key={i} href={extHref(String(url))} target="_blank" rel="noopener noreferrer" onClick={() => trackLinkClick(pageId, block.id, String(url))} style={{ background: `${bg}22`, border: `1px solid ${bg}44`, borderRadius: 7, padding: "5px 11px", fontSize: 11, fontWeight: 700, color: bg, textDecoration: "none" }}>{label}</a>)}
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : null
    }
    case "discography": {
      const albums = Array.from({ length: 50 }, (_, k) => { const i = k + 1; return [(c as any)[`a${i}_cover`], (c as any)[`a${i}_title`], (c as any)[`a${i}_year`], (c as any)[`a${i}_type`], (c as any)[`a${i}_url`]] }).filter(([, t]) => t)
      return albums.length > 0 ? (
        <div style={{ padding: "10px 24px 14px" }}>
          {c.title && <p style={{ color: MUTED, fontSize: 11, textTransform: "uppercase", letterSpacing: 2, margin: "0 0 12px", fontFamily: FONT_B }}>{c.title}</p>}
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {albums.map(([cover, title, year, type, url]: any[], i: number) => {
              const inner = <>
                {cover ? <SmartImage onError={e => { e.currentTarget.style.display = 'none' }} src={String(cover)} alt="" width={54} height={54} style={{ width: 54, height: 54, borderRadius: 9, objectFit: "cover", flexShrink: 0 }} /> : <div style={{ width: 54, height: 54, borderRadius: 9, background: "rgba(29,185,84,0.1)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 25, flexShrink: 0 }}>💿</div>}
                <div style={{ flex: 1 }}><p style={{ color: TEXT, fontSize: 14, fontWeight: 700, margin: "0 0 3px", fontFamily: FONT_B }}>{title}</p><div style={{ display: "flex", alignItems: "center", gap: 7 }}>{type && <span style={{ background: "rgba(29,185,84,0.12)", border: "1px solid rgba(29,185,84,0.2)", borderRadius: 10, padding: "1px 8px", color: "#1DB954", fontSize: 10, fontWeight: 700 }}>{type}</span>}{year && <span style={{ color: MUTED, fontSize: 12 }}>{year}</span>}</div></div>
                <span style={{ color: "#1DB954", fontSize: 19 }}>▶</span>
              </>
              const st: any = { display: "flex", alignItems: "center", gap: 12, textDecoration: "none" }
              return url ? <a key={i} href={extHref(String(url))} target="_blank" rel="noopener noreferrer" onClick={() => trackLinkClick(pageId, block.id, String(url))} style={st}>{inner}</a> : <div key={i} style={st}>{inner}</div>
            })}
          </div>
        </div>
      ) : null
    }
    case "album_block": {
      const platforms = [[c.spotify_url, "🎧 Spotify", "#1DB954"], [c.apple_url, "🍎 Apple", "#FC3C44"], [c.deezer_url, "🎶 Deezer", "#A238FF"]].filter(([u]) => u)
      // Parité CTA (B09.11) : album_block n'a pas de champ cta_url → le libellé cta_label est un
      // repli NON navigable, affiché comme dans l'éditeur quand aucune plateforme n'est définie.
      const albumCta = albumBlockCtaModel(c)
      return (c.title || c.cover) ? (
        <div style={{ padding: "10px 24px 14px" }}>
          <div style={{ background: "rgba(29,185,84,0.06)", border: "1px solid rgba(29,185,84,0.2)", borderRadius: 15, overflow: "hidden" }}>
            {c.cover ? <SmartImage width={1600} height={1200} sizes={SIZES_PLEINE} onError={e => { e.currentTarget.style.display = 'none' }} src={c.cover} alt="" style={{ width: "100%", height: 200, objectFit: "cover", display: "block" }} /> : <div style={{ height: 150, background: "rgba(29,185,84,0.08)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 52 }}>💿</div>}
            <div style={{ padding: "15px" }}>
              <p style={{ color: TEXT, fontSize: 19, fontWeight: 700, margin: "0 0 3px", fontFamily: FONT_D }}>{c.title || "Mon Album"}</p>
              {c.artist && <p style={{ color: MUTED, fontSize: 13, margin: "0 0 3px" }}>{c.artist}</p>}
              <div style={{ display: "flex", gap: 10, marginBottom: c.description ? 11 : 13 }}>{c.year && <span style={{ color: "#1DB954", fontSize: 12, fontWeight: 600 }}>{c.year}</span>}{c.tracks && <span style={{ color: MUTED, fontSize: 12 }}>· {c.tracks}</span>}</div>
              {c.description && <p style={{ color: MUTED, fontSize: 13, margin: "0 0 13px", lineHeight: 1.6 }}>{c.description}</p>}
              {platforms.length > 0 && <div style={{ display: "flex", gap: 8 }}>{platforms.map(([url, label, color]: any[], i: number) => <a key={i} href={extHref(String(url))} target="_blank" rel="noopener noreferrer" onClick={() => trackLinkClick(pageId, block.id, String(url))} style={{ flex: 1, background: `${color}18`, border: `1px solid ${color}33`, borderRadius: 9, padding: "9px", textAlign: "center", fontSize: 12, fontWeight: 700, color, textDecoration: "none" }}>{label}</a>)}</div>}
              {albumCta.visible && <div style={{ background: "#1DB954", borderRadius: 9, padding: "11px", textAlign: "center", fontSize: 13, fontWeight: 700, color: "#000" }}>{albumCta.label}</div>}
            </div>
          </div>
        </div>
      ) : null
    }
    case "playlist_block": {
      const platforms = [[c.spotify_url, "🎧 Spotify", "#1DB954"], [c.apple_url, "🍎 Apple", "#FC3C44"], [c.deezer_url, "🎶 Deezer", "#A238FF"]].filter(([u]) => u)
      return (c.title || platforms.length > 0) ? (
        <div style={{ padding: "10px 24px 14px" }}>
          <div style={{ display: "flex", gap: 13, alignItems: "center", marginBottom: 13 }}>
            {c.cover ? <SmartImage onError={e => { e.currentTarget.style.display = 'none' }} src={c.cover} alt="" width={62} height={62} style={{ width: 62, height: 62, borderRadius: 11, objectFit: "cover", flexShrink: 0 }} /> : <div style={{ width: 62, height: 62, borderRadius: 11, background: "rgba(29,185,84,0.12)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 29, flexShrink: 0 }}>📋</div>}
            <div style={{ flex: 1 }}><p style={{ color: TEXT, fontSize: 15, fontWeight: 700, margin: "0 0 3px", fontFamily: FONT_B }}>{c.title || "Ma Playlist"}</p>{c.description && <p style={{ color: MUTED, fontSize: 13.5, margin: "0 0 3px" }}>{c.description}</p>}{c.tracks_count && <p style={{ color: "#1DB954", fontSize: 12, margin: 0, fontWeight: 600 }}>🎵 {c.tracks_count}</p>}</div>
          </div>
          {platforms.length > 0 && <div style={{ display: "flex", gap: 8 }}>{platforms.map(([url, label, color]: any[], i: number) => <a key={i} href={extHref(String(url))} target="_blank" rel="noopener noreferrer" onClick={() => trackLinkClick(pageId, block.id, String(url))} style={{ flex: 1, background: `${color}18`, border: `1px solid ${color}33`, borderRadius: 9, padding: "10px", textAlign: "center", fontSize: 12, fontWeight: 700, color, textDecoration: "none" }}>{label}</a>)}</div>}
        </div>
      ) : null
    }
    case "concerts": {
      const shows = Array.from({ length: 50 }, (_, k) => { const i = k + 1; return [(c as any)[`c${i}_date`], (c as any)[`c${i}_city`], (c as any)[`c${i}_venue`], (c as any)[`c${i}_url`]] }).filter(([, city]) => city)
      return shows.length > 0 ? (
        <div style={{ padding: "10px 24px 14px" }}>
          {c.title && <p style={{ color: MUTED, fontSize: 11, textTransform: "uppercase", letterSpacing: 2, margin: "0 0 12px", fontFamily: FONT_B }}>{c.title}</p>}
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {shows.map(([date, city, venue, url]: any[], i: number) => (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: 12, background: "rgba(145,70,255,0.06)", border: "1px solid rgba(145,70,255,0.2)", borderRadius: 13, padding: "12px 15px" }}>
                <div style={{ textAlign: "center", flexShrink: 0, minWidth: 48 }}><p style={{ color: "#9146FF", fontSize: 13, fontWeight: 700, margin: 0, lineHeight: 1.2 }}>{date}</p></div>
                <div style={{ flex: 1 }}><p style={{ color: TEXT, fontSize: 14, fontWeight: 700, margin: "0 0 2px", fontFamily: FONT_B }}>{city}</p>{venue && <p style={{ color: MUTED, fontSize: 12, margin: 0 }}>🎭 {venue}</p>}</div>
                {url && <a href={extHref(String(url))} target="_blank" rel="noopener noreferrer" onClick={() => trackLinkClick(pageId, block.id, String(url))} style={{ background: "#9146FF", borderRadius: 8, padding: "7px 13px", fontSize: 12, fontWeight: 700, color: "#fff", flexShrink: 0, textDecoration: "none" }}>Billets →</a>}
              </div>
            ))}
          </div>
        </div>
      ) : null
    }
    case "ticketing": return (c.event_name || c.url) ? (
      <div style={{ padding: "10px 24px 14px" }}>
        <div style={{ background: "rgba(145,70,255,0.08)", border: "1.5px solid rgba(145,70,255,0.3)", borderRadius: 15, padding: "17px" }}>
          <div style={{ display: "flex", gap: 13, alignItems: "flex-start", marginBottom: 15 }}>
            <span style={{ fontSize: 34, flexShrink: 0 }}>🎟️</span>
            <div><p style={{ color: TEXT, fontSize: 15, fontWeight: 700, margin: "0 0 3px", fontFamily: FONT_B }}>{c.event_name || "Mon Concert"}</p>{c.date && <p style={{ color: MUTED, fontSize: 12, margin: "0 0 2px" }}>📅 {c.date}</p>}{c.venue && <p style={{ color: MUTED, fontSize: 12, margin: "0 0 2px" }}>📍 {c.venue}</p>}{c.price && <p style={{ color: "#9146FF", fontSize: 13, fontWeight: 700, margin: 0 }}>💶 {c.price}</p>}</div>
          </div>
          <a href={extHref(c.url) || "#"} target={/^https?:/.test(c.url || "") ? "_blank" : undefined} rel="noopener noreferrer" onClick={() => trackLinkClick(pageId, block.id, c.url || "ticket")} style={{ display: "block", background: "#9146FF", borderRadius: 11, padding: "13px", textAlign: "center", fontSize: 14, fontWeight: 700, color: "#fff", textDecoration: "none", fontFamily: FONT_B }}>{c.label || "Acheter mes billets"}{c.platform && c.platform !== "URL personnalisée" ? ` — ${c.platform}` : ""}</a>
        </div>
      </div>
    ) : null
    case "presave": {
      const platforms = [[c.spotify_url, "💾 Pré-save Spotify", "#1DB954", "#000"], [c.apple_url, "🍎 Apple Music", "#FC3C44", "#fff"]].filter(([u]) => u)
      return (c.release_name || platforms.length > 0) ? (
        <div style={{ padding: "10px 24px 14px" }}>
          <div style={{ background: "linear-gradient(135deg,rgba(29,185,84,0.1),rgba(29,185,84,0.05))", border: "1.5px solid rgba(29,185,84,0.3)", borderRadius: 16, padding: "17px", textAlign: "center" }}>
            {c.cover ? <SmartImage onError={e => { e.currentTarget.style.display = 'none' }} src={c.cover} alt="" width={110} height={110} style={{ width: 110, height: 110, borderRadius: 13, objectFit: "cover", margin: "0 auto 13px", display: "block", boxShadow: "0 4px 20px rgba(0,0,0,0.4)" }} /> : <div style={{ width: 110, height: 110, borderRadius: 13, background: "rgba(29,185,84,0.15)", margin: "0 auto 13px", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 44 }}>💾</div>}
            <p style={{ color: TEXT, fontSize: 17, fontWeight: 700, margin: "0 0 3px", fontFamily: FONT_D }}>{c.release_name || "Mon prochain titre"}</p>
            {c.release_date && <p style={{ color: "#1DB954", fontSize: 13, fontWeight: 600, margin: "0 0 15px" }}>📅 Sortie le {c.release_date}</p>}
            {platforms.length > 0 && <div style={{ display: "flex", gap: 8 }}>{platforms.map(([url, label, bg, fg]: any[], i: number) => <a key={i} href={extHref(String(url))} target="_blank" rel="noopener noreferrer" onClick={() => trackLinkClick(pageId, block.id, String(url))} style={{ flex: 1, background: bg, borderRadius: 10, padding: "12px", fontSize: 12, fontWeight: 700, color: fg, textDecoration: "none" }}>{label}</a>)}</div>}
          </div>
        </div>
      ) : null
    }
    case "merch": {
      const products = [[c.img1, c.name1, c.price1], [c.img2, c.name2, c.price2], [c.img3, c.name3, c.price3]].filter(([, n]) => n)
      return products.length > 0 ? (
        <div style={{ padding: "10px 24px 14px" }}>
          {c.title && <p style={{ color: MUTED, fontSize: 11, textTransform: "uppercase", letterSpacing: 2, margin: "0 0 12px", fontFamily: FONT_B }}>{c.title}</p>}
          {c.description && <p style={{ color: MUTED, fontSize: 13.5, margin: "0 0 12px" }}>{c.description}</p>}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 9, marginBottom: c.cta_label ? 13 : 0 }}>
            {products.map(([img, name, price]: any[], i: number) => (
              <div key={i} style={{ background: "rgba(145,70,255,0.06)", border: "1px solid rgba(145,70,255,0.15)", borderRadius: 11, overflow: "hidden" }}>
                {img ? <SmartImage width={1000} height={1000} sizes={SIZES_DEMI} onError={e => { e.currentTarget.style.display = 'none' }} src={String(img)} alt="" style={{ width: "100%", aspectRatio: "1", objectFit: "cover", display: "block" }} /> : <div style={{ aspectRatio: "1", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 26 }}>👕</div>}
                <div style={{ padding: "7px 9px" }}><p style={{ color: TEXT, fontSize: 11, fontWeight: 700, margin: "0 0 1px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", fontFamily: FONT_B }}>{name}</p><p style={{ color: "#9146FF", fontSize: 12, fontWeight: 700, margin: 0 }}>{price}</p></div>
              </div>
            ))}
          </div>
          {c.cta_label && <a href={extHref(c.cta_url) || "#"} target={/^https?:/.test(c.cta_url || "") ? "_blank" : undefined} rel="noopener noreferrer" onClick={() => trackLinkClick(pageId, block.id, c.cta_url || "merch")} style={{ display: "block", background: "linear-gradient(90deg,#9146FF,#7B3FCC)", borderRadius: 10, padding: "12px", textAlign: "center", fontSize: 13, fontWeight: 700, color: "#fff", textDecoration: "none", fontFamily: FONT_B }}>{c.cta_label}</a>}
        </div>
      ) : null
    }
    case "hero_banner": {
      const accent = theme.accent || "var(--success)"
      const h = c.height === "lg" ? 280 : c.height === "sm" ? 170 : 220
      const align = c.align === "left" ? "flex-start" : "center"
      const ta: any = c.align === "left" ? "left" : "center"
      return (c.title || c.bg_image) ? (
        <div style={{ padding: "10px 24px 14px" }}>
          <div style={{ position: "relative", overflow: "hidden", borderRadius: 14 }}>
            {c.bg_image ? <SmartImage width={1600} height={900} sizes={SIZES_PLEINE} onError={e => { e.currentTarget.style.display = 'none' }} src={c.bg_image} alt="" style={{ width: "100%", height: h, objectFit: "cover", display: "block" }} /> : <div style={{ width: "100%", height: h, background: c.bg_color ? c.bg_color : `linear-gradient(135deg,${G}30,${accent}15,#080808)` }} />}
            <div style={{ position: "absolute", inset: 0, background: "linear-gradient(180deg,transparent 20%,rgba(0,0,0,0.7) 100%)" }} />
            <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: align, justifyContent: "flex-end", padding: "22px" }}>
              {c.title && <h2 style={{ color: "#fff", fontSize: c.height === "lg" ? 28 : 22, fontWeight: 700, margin: "0 0 6px", fontFamily: FONT_D, textAlign: ta, textShadow: "0 2px 10px rgba(0,0,0,0.5)", lineHeight: 1.2 }}>{c.title}</h2>}
              {c.subtitle && <p style={{ color: "rgba(255,255,255,0.85)", fontSize: 14, margin: "0 0 15px", textAlign: ta }}>{c.subtitle}</p>}
              <div style={{ display: "flex", gap: 9, flexWrap: "wrap", justifyContent: align === "center" ? "center" : "flex-start" }}>
                {c.cta_label && <a href={extHref(c.cta_url) || "#"} target={/^https?:/.test(c.cta_url || "") ? "_blank" : undefined} rel="noopener noreferrer" onClick={() => trackLinkClick(pageId, block.id, c.cta_url || "hero")} style={{ background: `linear-gradient(90deg,${G},${G}cc)`, borderRadius: 10, padding: "11px 20px", fontSize: 13, fontWeight: 700, color: "#080808", textDecoration: "none" }}>{c.cta_label}</a>}
                {c.cta2_label && <a href={extHref(c.cta2_url) || "#"} target={/^https?:/.test(c.cta2_url || "") ? "_blank" : undefined} rel="noopener noreferrer" onClick={() => trackLinkClick(pageId, block.id, c.cta2_url || "hero2")} style={{ background: "rgba(255,255,255,0.15)", border: "1px solid rgba(255,255,255,0.3)", borderRadius: 10, padding: "11px 20px", fontSize: 13, fontWeight: 600, color: "#fff", textDecoration: "none" }}>{c.cta2_label}</a>}
              </div>
            </div>
          </div>
        </div>
      ) : null
    }
    case "section_banner": {
      const col = c.color || G
      const t = c.title || "SECTION"
      const style = c.style || "lines"
      return (
        <div style={{ padding: "12px 24px" }}>
          {style === "lines" && <div style={{ display: "flex", alignItems: "center", gap: 12 }}><div style={{ flex: 1, height: 1, background: `linear-gradient(90deg,transparent,${col}60)` }} /><span style={{ color: col, fontSize: 13, fontWeight: 700, letterSpacing: 3, textTransform: "uppercase", whiteSpace: "nowrap" }}>{t}</span><div style={{ flex: 1, height: 1, background: `linear-gradient(90deg,${col}60,transparent)` }} /></div>}
          {style === "dots" && <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 9 }}><div style={{ display: "flex", gap: 3 }}>{[0, 1, 2].map(i => <div key={i} style={{ width: 4, height: 4, borderRadius: "50%", background: col }} />)}</div><span style={{ color: col, fontSize: 13, fontWeight: 700, letterSpacing: 3 }}>{t}</span><div style={{ display: "flex", gap: 3 }}>{[0, 1, 2].map(i => <div key={i} style={{ width: 4, height: 4, borderRadius: "50%", background: col }} />)}</div></div>}
          {style === "gradient" && <div style={{ background: `linear-gradient(90deg,${col}15,${col}08)`, borderRadius: 9, padding: "11px 16px", textAlign: "center" }}><span style={{ color: col, fontSize: 14, fontWeight: 700, letterSpacing: 3, textTransform: "uppercase" }}>{t}</span></div>}
          {style === "minimal" && <p style={{ color: col, fontSize: 14, fontWeight: 700, letterSpacing: 4, textTransform: "uppercase", textAlign: "center", margin: 0 }}>{t}</p>}
          {style === "badge" && <div style={{ textAlign: "center" }}><span style={{ background: `${col}18`, border: `1px solid ${col}35`, borderRadius: 20, padding: "7px 19px", color: col, fontSize: 13, fontWeight: 700, letterSpacing: 2, textTransform: "uppercase" }}>{t}</span></div>}
        </div>
      )
    }
    case "grid_section": {
      const cols = parseInt(c.columns || "3")
      const cards = [[c.c1_icon, c.c1_title, c.c1_text], [c.c2_icon, c.c2_title, c.c2_text], [c.c3_icon, c.c3_title, c.c3_text], [c.c4_icon, c.c4_title, c.c4_text], [c.c5_icon, c.c5_title, c.c5_text], [c.c6_icon, c.c6_title, c.c6_text]].filter(([, t]) => t)
      return cards.length > 0 ? (
        <div style={{ padding: "10px 24px 14px" }}>
          {c.title && <p style={{ color: MUTED, fontSize: 11, textTransform: "uppercase", letterSpacing: 2, margin: "0 0 12px", fontFamily: FONT_B }}>{c.title}</p>}
          <div style={{ display: "grid", gridTemplateColumns: `repeat(${cols},1fr)`, gap: 9 }}>
            {cards.map(([icon, title, txt]: any[], i: number) => (
              <div key={i} style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 11, padding: "13px 10px", textAlign: "center" }}>
                {icon && <span style={{ fontSize: 24, display: "block", marginBottom: 7 }}>{icon}</span>}
                <p style={{ color: TEXT, fontSize: 12, fontWeight: 700, margin: "0 0 3px", fontFamily: FONT_B }}>{title}</p>
                {txt && <p style={{ color: MUTED, fontSize: 10, margin: 0 }}>{txt}</p>}
              </div>
            ))}
          </div>
        </div>
      ) : null
    }
    case "section_block": return (c.title || c.subtitle) ? (
      <div style={{ padding: "10px 24px" }}>
        <div style={{ background: c.bg_style === "card" ? "rgba(255,255,255,0.03)" : c.bg_style === "highlight" ? `${G}08` : "transparent", border: c.bg_style === "card" ? "1px solid rgba(255,255,255,0.07)" : c.bg_style === "highlight" ? `1px solid ${G}20` : "none", borderRadius: c.bg_style !== "transparent" ? 13 : 0, padding: c.bg_style && c.bg_style !== "transparent" ? "15px" : "0" }}>
          {c.title && <p style={{ color: G, fontSize: 16, fontWeight: 700, margin: "0 0 3px", fontFamily: FONT_D }}>{c.title}</p>}
          {c.subtitle && <p style={{ color: MUTED, fontSize: 13, margin: c.show_divider !== "no" ? "0 0 11px" : "0" }}>{c.subtitle}</p>}
          {c.show_divider !== "no" && <div style={{ height: 1, background: `linear-gradient(90deg,${G}50,transparent)`, marginTop: c.title && !c.subtitle ? 8 : 0 }} />}
        </div>
      </div>
    ) : null
    case "embed_block": return c.url ? (
      <div style={{ padding: "10px 24px 14px" }}>
        {c.title && <p style={{ color: MUTED, fontSize: 11, margin: "0 0 9px", textTransform: "uppercase", letterSpacing: 1.5, fontFamily: FONT_B }}>{c.title}</p>}
        {/* Hôte contrôlé : une adresse arbitraire ici s'exécutait sur notre origine. */}
        {embedHref(c.url)
          ? <iframe src={embedHref(c.url)} width="100%" height={parseInt(c.height || "400")} style={{ border: "none", borderRadius: 13, display: "block" }} loading="lazy" sandbox="allow-scripts allow-forms allow-popups allow-same-origin" referrerPolicy="no-referrer" />
          : null}
      </div>
    ) : null
    case "qr_code_block": return null

    default: return null
  }
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
