"use client"

import { useState, useEffect } from "react"
import { Check, ExternalLink } from "lucide-react"
import { BLOCK_CATEGORIES, PRESET_CATEGORIES, SOCIAL_NETWORKS, SOCIAL_PRESETS, SOCIAL_URL_TEMPLATES, AVAILABILITY_STATUSES, availabilityStatus, profileBadgeStyle, productBadgeStyle, priceDiscount, countdownParts, stockStatus, paymentBrand, paymentLink, starRow, openStatus, DAY_KEYS, mapEmbedUrl, calendarLinks, spotifyEmbedUrl, youtubeId, docTypeMeta, docActionLabel, announcementMeta, optionLabel, blockDecoration, BLOCK_GRADIENTS, BLOCK_RADIUS_OPTIONS, BLOCK_SHADOW_OPTIONS, BLOCK_SPACE_OPTIONS, BLOCK_WIDTH_OPTIONS, BLOCK_ANIM_OPTIONS, BLOCK_ANIM_SPEED_OPTIONS, BLOCK_HOVER_OPTIONS, BLOCK_LOOP_OPTIONS, BLOCK_INTENSITY_OPTIONS, ctaButtonStyle, CTA_ANIM_CSS, stickyActionHref, GOOGLE_FONTS, hexToRgb, rgbToHsl, contrastRatio, wcagLevel, avatarShapeStyle, avatarDecoStyle, avatarBgStyle, bannerBackgroundStyle, bannerHeight, bannerImageStyle, bannerTitleStyle, bannerOverlayLayers, bannerFrame, BANNER_ANIM_CSS, type Block, type BlockContent, type PageTheme, embedHref } from "./types"
import { BLOCK_HINTS, PRESET_THEMES, IDENTITY_PRESETS, ACTION_PRESETS, COMMERCE_PRESETS, MEDIA_PRESETS, INFO_PRESETS, BLOCK_STYLE_PRESETS } from "./editorPresets"
import { BLOCK_DEFS } from "./blockDefs"
import { G, MUTED } from "./builderConstants"
import { InlineEditable } from "./InlineEditable"
import { hasPublishableContent, HIDDEN_WHEN_EMPTY_NOTE } from "./blockEmptyState"
import { pricingCtaModel } from "./pricingCta"
import { resolveEditorBlock } from "./shared-renderer/editorRegistry"

  function FAQItem({ q, a, theme, link, linkLabel, compact }: { q: string; a: string; theme: PageTheme; link?: string; linkLabel?: string; compact?: boolean }) {
    const [open, setOpen] = useState(false)
    return (
      <div style={{ border: `1px solid ${theme.muted}20`, borderRadius: compact ? 8 : 8, overflow: "hidden", marginBottom: compact ? 4 : 5 }}>
        <button onClick={() => setOpen(o => !o)} style={{ width: "100%", display: "flex", justifyContent: "space-between", alignItems: "center", padding: compact ? "8px 11px" : "10px 12px", background: open ? theme.primary + "08" : "transparent", border: "none", color: theme.text, fontSize: compact ? 12 : 13, cursor: "pointer", textAlign: "left" }}>
          {q} <span style={{ color: theme.primary }}>{open ? "−" : "+"}</span>
        </button>
        {open && <div style={{ padding: "8px 12px 12px" }}>
          {a && <p style={{ color: theme.muted, fontSize: 12, lineHeight: 1.6, margin: 0, whiteSpace: "pre-wrap" }}>{a}</p>}
          {link && <span style={{ display: "inline-flex", alignItems: "center", gap: 4, marginTop: a ? 8 : 0, color: theme.primary, fontSize: 11.5, fontWeight: 700 }}>{linkLabel || "En savoir plus"} →</span>}
        </div>}
      </div>
    )
  }


  // Rangee d'etoiles a remplissage partiel precis (gere les demi/decimales).
  function StarRow({ fills, size = 12, color = "#FBBF24", empty = "rgba(255,255,255,0.18)", gap = 2 }: { fills: number[]; size?: number; color?: string; empty?: string; gap?: number }) {
    return (
      <div style={{ display: "inline-flex", gap }}>
        {fills.map((f, i) => (
          <span key={i} style={{ position: "relative", display: "inline-block", color: empty, fontSize: size, lineHeight: 1 }}>★
            <span style={{ position: "absolute", left: 0, top: 0, overflow: "hidden", width: `${Math.round(f * 100)}%`, color }}>★</span>
          </span>
        ))}
      </div>
    )
  }

  // Badge "Ouvert / Ferme" calcule en direct (tick 60s). Rien affiche si pas d'info du jour.
  // Calcul au montage (pas au SSR) -> aucun mismatch d'hydratation.
  function OpenBadge({ c }: { c: any }) {
    const [st, setSt] = useState<ReturnType<typeof openStatus>>(null)
    useEffect(() => {
      const upd = () => setSt(openStatus(c, new Date()))
      upd(); const t = setInterval(upd, 60000); return () => clearInterval(t)
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [c.mon_fri, c.saturday, c.sunday, c.mon, c.tue, c.wed, c.thu, c.fri, c.sat, c.sun, c.mode])
    if (!st) return null
    return <span style={{ display: "inline-flex", alignItems: "center", gap: 5, background: `${st.color}18`, border: `1px solid ${st.color}55`, color: st.color, borderRadius: 20, padding: "2px 9px", fontSize: 10, fontWeight: 700 }}><span style={{ width: 6, height: 6, borderRadius: "50%", background: st.color }} />{st.label}</span>
  }

  // Compte a rebours vivant (tick 1s). Partage la logique pure countdownParts.
  function CountdownBox({ c, text, muted }: { c: any; text: string; muted: string }) {
    const accent = c.accent || "#EF4444"
    const rawTarget = c.target || c.date  // retrocompat : ancien bloc event utilisait `date`
    const targetMs = rawTarget ? new Date(rawTarget).getTime() : NaN
    const [now, setNow] = useState<number>(() => (typeof Date !== "undefined" ? Date.now() : 0))
    useEffect(() => {
      if (!isFinite(targetMs)) return
      const id = setInterval(() => setNow(Date.now()), 1000)
      return () => clearInterval(id)
    }, [targetMs])
    const p = countdownParts(targetMs, now)
    const units: [string, number][] = [["Jours", p.days], ["Heures", p.hours], ["Min", p.mins], ["Sec", p.secs]]
    return (
      <div style={{ background: `linear-gradient(135deg,${accent}22,${accent}0d)`, border: `1px solid ${accent}55`, borderRadius: 12, padding: "14px", textAlign: "center" }}>
        {c.title && <p style={{ color: text, fontSize: 15, fontWeight: 800, margin: "0 0 3px" }}>{c.title}</p>}
        {c.subtitle && <p style={{ color: muted, fontSize: 11, margin: "0 0 10px" }}>{c.subtitle}</p>}
        {!rawTarget
          ? <p style={{ color: muted, fontSize: 11, margin: "6px 0 0" }}>Choisissez une date de fin ⏳</p>
          : p.expired
          ? <p style={{ color: accent, fontSize: 14, fontWeight: 800, margin: "6px 0 0" }}>{c.expired_text || "Offre terminee"}</p>
          : <div style={{ display: "flex", justifyContent: "center", gap: 8 }}>
              {units.map(([lbl, val]) => (
                <div key={lbl} style={{ minWidth: 52, background: "rgba(0,0,0,0.25)", border: `1px solid ${accent}33`, borderRadius: 9, padding: "8px 4px" }}>
                  <div style={{ color: accent, fontSize: 20, fontWeight: 800, fontVariantNumeric: "tabular-nums", lineHeight: 1 }}>{String(val).padStart(2, "0")}</div>
                  <div style={{ color: muted, fontSize: 9, marginTop: 3, textTransform: "uppercase", letterSpacing: 0.5 }}>{lbl}</div>
                </div>
              ))}
            </div>}
        {!p.expired && rawTarget && c.cta_label && <div style={{ display: "inline-block", marginTop: 12, background: accent, color: "#fff", padding: "8px 18px", borderRadius: 8, fontSize: 13, fontWeight: 700 }}>{c.cta_label}</div>}
      </div>
    )
  }

  export function BlockPreview({ block, theme, dayMode, editable = false, onEditField }: { block: Block; theme: PageTheme; dayMode: boolean; editable?: boolean; onEditField?: (blockId: string, key: string, value: string) => void }) {
    const c = block.content
    // Édition inline : n'est active que dans le canvas (editable), jamais si verrouillé.
    const canEdit = editable && !block.locked
    const edit = (key: string) => (v: string) => onEditField?.(block.id, key, v)
    const bg = "transparent"
    const text = dayMode ? "#1A1A1A" : theme.text
    const muted = dayMode ? "#6B7280" : theme.muted
    const primary = theme.primary
    const accent = theme.accent
    const s = { background: bg, fontFamily: theme.fontBody || "DM Sans, sans-serif" }
    // État vide harmonisé (aperçu builder) : invite claire quand un bloc n'a pas encore de
    // contenu. `sub` (optionnel) = mention du comportement en ligne (ex. « invisible tant
    // qu'il est vide ») pour les blocs qui rendent `null` en public quand ils sont vides.
    const emptyHint = (icon: string, label: string, sub?: string) => (
      <div role="note" style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6, padding: "18px 12px", border: `1.5px dashed ${muted}40`, borderRadius: 12, color: muted, textAlign: "center" }}>
        <span style={{ fontSize: 22, opacity: 0.7 }} aria-hidden>{icon}</span>
        <span style={{ fontSize: 12, fontWeight: 600 }}>{label}</span>
        {sub && <span style={{ fontSize: 10, fontWeight: 400, opacity: 0.75 }}>{sub}</span>}
      </div>
    )

    // Renderer PARTAGÉ (pilotes derrière flag). Flag vide en prod → null → `case` legacy.
    // Rollback = retirer le type de SHARED_RENDERER_BLOCKS ; aucune donnée touchée.
    const SharedEditor = resolveEditorBlock(block.type)
    if (SharedEditor) return <SharedEditor content={c} ctx={{ theme, primary, text, muted, accent, surfaceStyle: s, canEdit, edit }} />

    switch (block.type) {
      case "profile": {
        const pName = (c.name || "").trim()
        const showAvatar = c.hide_avatar !== "Masquer" && !!(c.avatar || pName)
        return (
        <div style={{ textAlign: "center", padding: "20px 16px", ...s }}>
          {showAvatar && (c.avatar
            ? <img src={c.avatar} alt="" style={{ width: 72, height: 72, ...avatarShapeStyle(c.avatar_shape), ...avatarDecoStyle(c.avatar_shape, c.avatar_border, c.avatar_shadow, primary), objectFit: "cover", margin: "0 auto 10px", display: "block" }} />
            : <div style={{ width: 72, height: 72, ...avatarShapeStyle(c.avatar_shape), ...avatarDecoStyle(c.avatar_shape, c.avatar_border, c.avatar_shadow, primary), ...avatarBgStyle(c.avatar_bg, primary, accent), margin: "0 auto 10px", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 28, fontWeight: 700, color: "#080808" }}>{(pName || "?")[0].toUpperCase()}</div>)}
          <InlineEditable as="p" editable={canEdit} value={c.name} placeholder="Votre nom (masqué si vide)" onCommit={edit("name")} style={{ color: text, fontSize: 18, fontWeight: 700, margin: "0 0 3px", fontFamily: theme.fontDisplay }} />
          <InlineEditable as="p" editable={canEdit} value={c.tagline} placeholder="Votre accroche" onCommit={edit("tagline")} style={{ color: muted, fontSize: 13, margin: c.badge ? "0 0 7px" : "0" }} />
          {c.badge && <span style={{ display: "inline-flex", flexWrap: "wrap", gap: 5, justifyContent: "center" }}>{c.badge.split(/[,\n]/).map((b: string) => b.trim()).filter(Boolean).slice(0, 5).map((b: string, i: number) => { const bs = profileBadgeStyle(b, primary); return (<span key={i} style={{ background: bs.bg, border: `1px solid ${bs.border}`, borderRadius: 20, padding: "3px 10px", fontSize: 11, color: bs.color, fontWeight: 600 }}>{bs.icon ? bs.icon + " " : ""}{b}</span>) })}</span>}
        </div>
      )
      }
      case "bio": return (
        <div style={{ padding: "12px 16px", textAlign: (c.align as any)||"left", ...s }}>
          <InlineEditable as="p" editable={canEdit} value={c.text} placeholder="Votre texte de présentation…" multiline onCommit={edit("text")} style={{ color: text, fontSize: 13, lineHeight: 1.7, margin: 0 }} />
        </div>
      )
      case "skills": {
        const tags = (c.tags||"").split(",").map((t:string)=>t.trim()).filter(Boolean)
        return (
          <div style={{ padding: "12px 16px", ...s }}>
            {c.title && <p style={{ color: muted, fontSize: 10, textTransform: "uppercase", letterSpacing: 2, margin: "0 0 8px" }}>{c.title}</p>}
            <div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>
              {tags.map((tag:string, i:number) => <span key={i} style={{ background: primary+"12", border: `1px solid ${primary}30`, borderRadius: 20, padding: "3px 10px", fontSize: 11, color: primary, fontWeight: 600 }}>{tag}</span>)}
            </div>
          </div>
        )
      }
      case "cta_button": {
        const { style: bs, className: ctaCls } = ctaButtonStyle(c.style, { G: primary, accent, text })
        return (
          <div style={{ padding: "10px 16px", ...s }}>
            {ctaCls && <style>{CTA_ANIM_CSS}</style>}
            <div className={ctaCls} style={{ ...bs, display: "flex", alignItems: "center", justifyContent: "center", gap: 7, borderRadius: 12, padding: "13px 18px", fontSize: 14, fontWeight: 700 }}>
              {c.icon && <span>{c.icon}</span>}<InlineEditable as="span" editable={canEdit} value={c.label} placeholder="Bouton" onCommit={edit("label")} />
            </div>
          </div>
        )
      }
      case "heading": {
        const sizes: Record<string,number> = { small: 15, medium: 20, large: 27, xl: 34 }
        const hColors: Record<string,string> = { default: text, primary, accent, muted }
        return (
          <div style={{ padding: "14px 16px", textAlign: (c.align as any)||"center", ...s }}>
            <InlineEditable as="h2" editable={canEdit} value={c.text} placeholder="Titre" onCommit={edit("text")} style={{ fontFamily: theme.fontDisplay, fontSize: sizes[c.size||"medium"], color: hColors[c.color||"default"], fontWeight: 700, margin: "0 0 3px" }} />
            {c.subtitle && <InlineEditable as="p" editable={canEdit} value={c.subtitle} onCommit={edit("subtitle")} style={{ color: muted, fontSize: 12, margin: 0 }} />}
          </div>
        )
      }
      case "rich_text": {
        const tSizes: Record<string,number> = { small: 11, normal: 13, large: 15 }
        return <div style={{ padding: "8px 16px", textAlign: (c.align as any)||"left", ...s }}><InlineEditable as="p" editable={canEdit} value={c.text} placeholder="Votre texte…" multiline onCommit={edit("text")} style={{ color: muted, fontSize: tSizes[c.size||"normal"], lineHeight: 1.7, margin: 0 }} /></div>
      }
      case "faq": {
        const items = [1,2,3,4,5,6,7,8].map(i => ({ q: c[`q${i}`], a: c[`a${i}`]||"", cat: (c[`q${i}_cat`]||"").trim(), link: (c[`q${i}_link`]||"").trim(), linkLabel: (c[`q${i}_link_label`]||"").trim() })).filter(it => it.q)
        const compact = c.style === "Compact" || c.style === "Cartes"
        const cats = Array.from(new Set(items.map(it => it.cat).filter(Boolean)))
        return (
          <div style={{ padding: "10px 16px", ...s }}>
            {c.title && <p style={{ color: muted, fontSize: 10, textTransform: "uppercase", letterSpacing: 2, margin: "0 0 4px" }}>{c.title}</p>}
            {c.subtitle && <p style={{ color: theme.text, fontSize: 13, fontWeight: 600, margin: "0 0 10px" }}>{c.subtitle}</p>}
            {c.search === "Oui" && <div style={{ padding: "8px 12px", marginBottom: cats.length ? 8 : 10, borderRadius: 9, border: `1px solid ${theme.muted}25`, color: muted, fontSize: 12 }}>🔎 Rechercher une question…</div>}
            {cats.length > 0 && <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 10 }}>
              <span style={{ padding: "4px 10px", borderRadius: 999, fontSize: 11, fontWeight: 600, border: `1px solid ${theme.primary}55`, background: `${theme.primary}14`, color: theme.primary }}>Tout</span>
              {cats.map(cn => <span key={cn} style={{ padding: "4px 10px", borderRadius: 999, fontSize: 11, fontWeight: 600, border: `1px solid ${theme.muted}25`, color: muted }}>{cn}</span>)}
            </div>}
            {items.length > 0
              ? items.map((it,i) => <FAQItem key={i} q={it.q} a={it.a} theme={theme} link={it.link||undefined} linkLabel={it.linkLabel||undefined} compact={compact} />)
              : emptyHint("❓", "Ajoutez une question")}
          </div>
        )
      }
      case "social_links": {
        const active = SOCIAL_NETWORKS.filter(n => c[n.key])
        const disp = c.display || "list"
        return (
          <div style={{ padding: "10px 16px", ...s }}>
            {active.length === 0
              ? <p style={{ color: muted, fontSize: 11, textAlign: "center", margin: 0 }}>Aucun réseau configuré</p>
              : disp === "icons"
              ? <div style={{ display: "flex", flexWrap: "wrap", gap: 8, justifyContent: "center" }}>
                  {active.map(n => (
                    <div key={n.key} title={n.label} style={{ width: 40, height: 40, borderRadius: "50%", background: n.color+"18", border: `1px solid ${n.color}40`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18 }}>{n.icon}</div>
                  ))}
                </div>
              : disp === "grid"
              ? <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 7 }}>
                  {active.map(n => (
                    <div key={n.key} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 3, background: n.color+"10", border: `1px solid ${n.color}25`, borderRadius: 10, padding: "11px 6px", textAlign: "center" }}>
                      <span style={{ fontSize: 20 }}>{n.icon}</span>
                      <span style={{ color: text, fontSize: 11, fontWeight: 600 }}>{c[n.key+"__label"] || n.label}</span>
                      {c[n.key+"__count"] && <span style={{ color: n.color, fontSize: 10, fontWeight: 700 }}>{c[n.key+"__count"]}</span>}
                    </div>
                  ))}
                </div>
              : <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  {active.map(n => (
                    <div key={n.key} style={{ display: "flex", alignItems: "center", gap: 10, background: n.color+"10", border: `1px solid ${n.color}25`, borderRadius: 10, padding: "9px 12px" }}>
                      <span style={{ fontSize: 15 }}>{n.icon}</span>
                      <span style={{ flex: 1, minWidth: 0 }}>
                        <span style={{ color: text, fontSize: 12, fontWeight: 600, display: "block" }}>{c[n.key+"__label"] || n.label}</span>
                        {c[n.key+"__count"] && <span style={{ color: muted, fontSize: 10 }}>{c[n.key+"__count"]}</span>}
                      </span>
                      <ExternalLink size={11} color={n.color} />
                    </div>
                  ))}
                </div>}
          </div>
        )
      }
      case "social_feature": {
        const n = SOCIAL_NETWORKS.find(x => x.key === c.network) || { icon: "🔗", color: primary, label: "Réseau" }
        const col = n.color
        return (
          <div style={{ padding: "8px 16px", ...s }}>
            <div style={{ background: `linear-gradient(135deg,${col}22,${col}0a)`, border: `1.5px solid ${col}45`, borderRadius: 16, overflow: "hidden" }}>
              {c.image && <img src={c.image} alt="" style={{ width: "100%", height: 90, objectFit: "cover", display: "block" }} />}
              <div style={{ padding: "13px 15px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 9, marginBottom: 6 }}>
                  <span style={{ fontSize: 24 }}>{n.icon}</span>
                  <span style={{ color: col, fontSize: 11, fontWeight: 700 }}>{n.label}</span>
                  <span style={{ marginLeft: "auto", background: col, color: "#080808", borderRadius: 20, padding: "1px 8px", fontSize: 8, fontWeight: 700 }}>PRINCIPAL</span>
                </div>
                <p style={{ color: text, fontSize: 15, fontWeight: 700, margin: "0 0 3px", fontFamily: theme.fontDisplay }}>{c.title||"Suivez-moi"}</p>
                {c.description && <p style={{ color: muted, fontSize: 11, margin: "0 0 4px" }}>{c.description}</p>}
                {c.count && <p style={{ color: col, fontSize: 11, fontWeight: 700, margin: "0 0 9px" }}>{c.count}</p>}
                <div style={{ background: col, color: "#080808", borderRadius: 9, padding: "9px", textAlign: "center", fontSize: 12, fontWeight: 700, marginTop: c.count ? 0 : 8 }}>{c.cta_label||"Suivre"}</div>
              </div>
            </div>
          </div>
        )
      }
      case "testimonials": {
        // On garde le numéro de slot (i) pour l'édition inline malgré le filtre.
        const reviews = [1,2,3].map(i => ({ i, name: c[`name${i}`], text: c[`text${i}`], stars: c[`stars${i}`] })).filter(r => r.name)
        return (
          <div style={{ padding: "10px 16px", display: "flex", flexDirection: "column", gap: 7, ...s }}>
            {reviews.map((r) => (
              <div key={r.i} style={{ background: primary+"06", border: `1px solid ${primary}12`, borderRadius: 9, padding: "10px 12px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                  <InlineEditable as="p" editable={canEdit} value={r.name} onCommit={edit(`name${r.i}`)} style={{ color: text, fontSize: 12, fontWeight: 700, margin: 0 }} />
                  <p style={{ color: "#FFD700", fontSize: 11, margin: 0 }}>{"★".repeat(parseInt(r.stars||"5"))}</p>
                </div>
                <p style={{ color: muted, fontSize: 11, margin: 0, fontStyle: "italic" }}>"<InlineEditable as="span" editable={canEdit} value={r.text} multiline onCommit={edit(`text${r.i}`)} />"</p>
              </div>
            ))}
          </div>
        )
      }
      case "image": return (
        <div style={{ ...s }}>
          {c.src
            ? (() => { const isCircle = c.rounded==="circle"; const arMap: Record<string,string|undefined> = { square:"1","16:9":"16/9","9:16":"9/16","4:3":"4/3" }; const ar = isCircle ? "1" : arMap[c.ratio||"original"]; const img = <img src={c.src} alt={c.alt||c.caption||""} style={{ width: "100%", height: ar?"auto":undefined, maxHeight: ar?undefined:220, aspectRatio: ar, objectFit: "cover", display: "block", borderRadius: isCircle ? "50%" : c.rounded==="rounded" ? 10 : 0 }} />; return <div>{isCircle ? <div style={{ maxWidth: 170, margin: "0 auto" }}>{img}</div> : img}{c.caption && <p style={{ color: muted, fontSize: 10, textAlign: "center", margin: "6px 14px" }}>{c.caption}</p>}</div> })()
            : <div style={{ background: "rgba(255,255,255,0.03)", border: "1px dashed rgba(255,255,255,0.1)", borderRadius: 8, padding: "28px", textAlign: "center", margin: "10px 16px" }}><span style={{ fontSize: 28 }}>🖼️</span><p style={{ color: muted, fontSize: 11, margin: "6px 0 0" }}>Aucune image</p></div>}
        </div>
      )
      case "gallery": {
        const imgs = [c.img1,c.img2,c.img3,c.img4,c.img5,c.img6,c.img7,c.img8,c.img9,c.img10,c.img11,c.img12].filter(Boolean)
        const layout = c.layout || "grid"
        const cols = parseInt(c.columns||"3")
        const title = c.title && <p style={{ color: muted, fontSize: 10, textTransform: "uppercase", letterSpacing: 2, margin: "0 0 8px" }}>{c.title}</p>
        if (imgs.length>0 && layout==="masonry") return (
          <div style={{ padding: "10px 14px", ...s }}>
            {title}
            <div style={{ columnCount: cols, columnGap: 4 }}>
              {imgs.map((img,i) => <img key={i} src={img} alt="" style={{ width: "100%", borderRadius: 6, marginBottom: 4, display: "block", breakInside: "avoid" }} />)}
            </div>
          </div>
        )
        const effCols = layout==="compact" ? Math.max(cols,3) : cols
        return (
          <div style={{ padding: "10px 14px", ...s }}>
            {title}
            <div style={{ display: "grid", gridTemplateColumns: `repeat(${effCols},1fr)`, gap: 4 }}>
              {imgs.length>0 ? imgs.map((img,i) => <img key={i} src={img} alt="" style={{ width: "100%", aspectRatio: "1", objectFit: "cover", borderRadius: 6 }} />)
                : [0,1,2,3,4,5].map(i => <div key={i} style={{ background: "rgba(255,255,255,0.04)", borderRadius: 6, aspectRatio: "1", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, color: muted }}>🖼️</div>)}
            </div>
          </div>
        )
      }
      case "video": return (
        <div style={{ padding: "10px 16px", ...s }}>
          <div style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 10, padding: "24px", textAlign: "center" }}>
            <span style={{ fontSize: 28 }}>▶️</span>
            <p style={{ color: text, fontSize: 13, margin: "8px 0 0", fontWeight: 600 }}>{c.title||"Vidéo"}</p>
          </div>
        </div>
      )
      case "visit_counter": return (
        <div style={{ padding: "14px 16px", textAlign: "center", ...s }}>
          <p style={{ fontFamily: theme.fontDisplay, fontSize: 34, color: primary, fontWeight: 700, margin: "0 0 3px" }}>1 234</p>
          <p style={{ color: muted, fontSize: 11, margin: 0 }}>{c.label||"visiteurs"}</p>
        </div>
      )
      case "google_maps": return (
        <div style={{ padding: "10px 16px", ...s }}>
          <div style={{ background: "rgba(255,230,109,0.06)", border: "1px solid rgba(255,230,109,0.15)", borderRadius: 10, padding: "12px" }}>
            <div style={{ display: "flex", alignItems: "flex-start", gap: 8 }}>
              <span style={{ fontSize: 20, flexShrink: 0 }}>📍</span>
              <div><p style={{ color: text, fontSize: 12, fontWeight: 700, margin: "0 0 2px" }}>{c.label||"Adresse"}</p><p style={{ color: muted, fontSize: 11, margin: 0 }}>{c.address}</p>{c.transport && <p style={{ color: muted, fontSize: 10, margin: "3px 0 0" }}>🚇 {c.transport}</p>}</div>
            </div>
          </div>
        </div>
      )
      case "opening_hours": {
        const perDayMode = c.mode === "Jour par jour" || DAY_KEYS.some(k => c[k] && String(c[k]).trim())
        const DAY_FULL = ["Dimanche","Lundi","Mardi","Mercredi","Jeudi","Vendredi","Samedi"]
        const hrows: [string,string][] = perDayMode
          ? ([1,2,3,4,5,6,0] as number[]).map(d => [DAY_FULL[d], (c[DAY_KEYS[d]]||"").trim() || "Fermé"] as [string,string])
          : ([["Lun — Ven",c.mon_fri],["Samedi",c.saturday],["Dimanche",c.sunday]] as [string,string][]).filter(([,h])=>h)
        return (
          <div style={{ padding: "10px 16px", ...s }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, margin: "0 0 8px", flexWrap: "wrap" }}>
              {c.title ? <p style={{ color: muted, fontSize: 10, textTransform: "uppercase", letterSpacing: 2, margin: 0 }}>{c.title}</p> : <span />}
              <OpenBadge c={c} />
            </div>
            {c.exception && <div style={{ display: "flex", alignItems: "center", gap: 7, background: "rgba(251,191,36,0.08)", border: "1px solid rgba(251,191,36,0.3)", borderRadius: 9, padding: "8px 11px", marginBottom: 8 }}><span style={{ fontSize: 14 }}>📅</span><span style={{ color: "#FBBF24", fontSize: 11.5, fontWeight: 600 }}>{c.exception}</span></div>}
            <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
              {hrows.map(([d,h],i) => {
                const closed = /^(fermé|ferme|closed|repos)/i.test(String(h).trim())
                return (
                  <div key={i} style={{ display: "flex", justifyContent: "space-between", padding: "4px 0", borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
                    <span style={{ color: muted, fontSize: 12 }}>{d}</span>
                    <span style={{ color: text, fontSize: 12, fontWeight: 600, opacity: closed ? 0.6 : 1 }}>{h}</span>
                  </div>
                )
              })}
            </div>
            {c.note && <p style={{ color: muted, fontSize: 10, margin: "8px 0 0", fontStyle: "italic" }}>{c.note}</p>}
          </div>
        )
      }
      case "pricing": {
        const plans = [[c.title1,c.price1,c.desc1,c.old_price1],[c.title2,c.price2,c.desc2,c.old_price2],[c.title3,c.price3,c.desc3,c.old_price3]].filter(([t])=>t)
        // CTA : même modèle que le rendu public (parité). Rendu ici en élément NON
        // navigable (le clic dans le canvas ne doit jamais quitter le Builder).
        const cta = pricingCtaModel(c)
        return (
          <div style={{ padding: "10px 16px", ...s }}>
            {c.title && <p style={{ color: muted, fontSize: 10, textTransform: "uppercase", letterSpacing: 2, margin: "0 0 10px" }}>{c.title}</p>}
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              {plans.map(([t,p,d,op],i) => { const disc = priceDiscount(p, op); return (
                <div key={i} style={{ flex: 1, minWidth: 70, position: "relative", background: i===1 ? primary+"12" : "rgba(255,255,255,0.04)", border: `1px solid ${i===1 ? primary+"40" : "rgba(255,255,255,0.08)"}`, borderRadius: 9, padding: "12px 8px", textAlign: "center" }}>
                  {disc && <span style={{ position: "absolute", top: -7, right: 6, background: "#EF4444", color: "#fff", borderRadius: 5, padding: "1px 5px", fontSize: 9, fontWeight: 800 }}>{disc.label}</span>}
                  <p style={{ color: muted, fontSize: 9, margin: "0 0 3px", textTransform: "uppercase", letterSpacing: 1 }}>{t}</p>
                  <p style={{ color: primary, fontSize: 20, fontWeight: 700, margin: "0 0 3px", fontFamily: theme.fontDisplay }}>{p}</p>
                  {op && <p style={{ color: muted, fontSize: 11, margin: "0 0 3px", textDecoration: "line-through" }}>{op}</p>}
                  <p style={{ color: muted, fontSize: 9, margin: cta.visible ? "0 0 8px" : 0 }}>{d}</p>
                  {cta.visible && <div aria-disabled="true" title="Lien actif uniquement sur la page publiée" style={{ background: primary+"12", border: `1px solid ${primary}25`, color: primary, borderRadius: 7, padding: "6px", fontSize: 10, fontWeight: 700, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{cta.label}</div>}
                </div>
              ) })}
            </div>
          </div>
        )
      }
      case "product": return (
        <div style={{ padding: "10px 16px", ...s }}>
          <div style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 12, overflow: "hidden" }}>
            {c.image ? <img src={c.image} alt={c.name} style={{ width: "100%", height: 140, objectFit: "cover", display: "block" }} />
              : <div style={{ height: 80, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(249,115,22,0.06)", fontSize: 28 }}>🛍️</div>}
            <div style={{ padding: "10px 12px" }}>
              <p style={{ color: text, fontSize: 14, fontWeight: 700, margin: "0 0 3px" }}>{c.name||"Produit"}</p>
              <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 5 }}>
                <span style={{ color: primary, fontSize: 16, fontWeight: 700 }}>{c.price}</span>
                {c.old_price && <span style={{ color: muted, fontSize: 12, textDecoration: "line-through" }}>{c.old_price}</span>}
                {(() => { const d = priceDiscount(c.price, c.old_price); return d ? <span style={{ background: "#EF4444", color: "#fff", borderRadius: 5, padding: "1px 6px", fontSize: 10, fontWeight: 800 }}>{d.label}</span> : null })()}
              </div>
              {(() => { const st = stockStatus(c.stock); return st ? <p style={{ color: st.color, fontSize: 10, fontWeight: 700, margin: "0 0 6px" }}>{st.state === "in" ? "✓ " : st.state === "out" ? "⛔ " : "🔥 "}{st.label}</p> : null })()}
              {c.cta_label && (() => { const out = stockStatus(c.stock)?.soldOut; return <div style={{ background: out ? "rgba(255,255,255,0.08)" : `linear-gradient(90deg,${primary},${primary}cc)`, borderRadius: 7, padding: "8px", textAlign: "center", fontSize: 12, fontWeight: 700, color: out ? muted : "#080808" }}>{out ? "Epuise" : c.cta_label}</div> })()}
            </div>
          </div>
        </div>
      )
      case "promo_banner": return (
        <div style={{ padding: "10px 16px", ...s }}>
          <div style={{ background: "linear-gradient(135deg,rgba(249,115,22,0.15),rgba(249,115,22,0.08))", border: "1px solid rgba(249,115,22,0.3)", borderRadius: 10, padding: "12px 14px", textAlign: "center" }}>
            {c.emoji && <span style={{ fontSize: 24 }}>{c.emoji}</span>}
            <p style={{ color: text, fontSize: 14, fontWeight: 700, margin: "5px 0 2px" }}>{c.text}</p>
            {c.subtext && <p style={{ color: muted, fontSize: 11, margin: "0 0 8px" }}>{c.subtext}</p>}
            {c.cta_label && <div style={{ display: "inline-block", background: "#F97316", color: "#fff", padding: "6px 16px", borderRadius: 7, fontSize: 12, fontWeight: 700 }}>{c.cta_label}</div>}
          </div>
        </div>
      )
      case "countdown": return (
        <div style={{ padding: "10px 16px", ...s }}>
          <CountdownBox c={c} text={text} muted={muted} />
        </div>
      )
      case "menu_section": return (
        <div style={{ padding: "10px 16px", ...s }}>
          {c.category && <p style={{ color: primary, fontSize: 12, fontWeight: 700, margin: "0 0 8px", textTransform: "uppercase", letterSpacing: 1 }}>{c.category}</p>}
          <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
            {Array.from({length:50},(_,k)=>{const i=k+1;return [c[`item${i}_name`],c[`item${i}_price`],c[`item${i}_desc`]]}).filter(([n])=>n).map(([n,p,d],i) => (
              <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 7, padding: "6px 0", borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
                <div style={{ flex: 1 }}><p style={{ color: text, fontSize: 13, fontWeight: 600, margin: "0 0 1px" }}>{n}</p>{d && <p style={{ color: muted, fontSize: 10, margin: 0 }}>{d}</p>}</div>
                <span style={{ color: primary, fontSize: 13, fontWeight: 700, flexShrink: 0 }}>{p}</span>
              </div>
            ))}
          </div>
        </div>
      )
      case "reservation_form": return (
        <div style={{ padding: "10px 16px", ...s }}>
          <p style={{ color: text, fontSize: 14, fontWeight: 700, margin: "0 0 10px" }}>{c.title||"Réserver"}</p>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {["Nom","Date souhaitée","Nb personnes"].map(f => <div key={f} style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 7, padding: "7px 10px", color: muted, fontSize: 11 }}>{f}</div>)}
            <div style={{ background: "linear-gradient(90deg,#EF4444,#dc2626)", borderRadius: 7, padding: "9px", textAlign: "center", color: "#fff", fontSize: 12, fontWeight: 700 }}>{c.button_label||"Réserver"}</div>
          </div>
        </div>
      )
      case "services_list": {
        const services = Array.from({length:50},(_,k)=>{const i=k+1;return [c[`s${i}_icon`],c[`s${i}_name`],c[`s${i}_desc`]]}).filter(([,n])=>n)
        return (
          <div style={{ padding: "10px 16px", ...s }}>
            {c.title && <p style={{ color: muted, fontSize: 10, textTransform: "uppercase", letterSpacing: 2, margin: "0 0 10px" }}>{c.title}</p>}
            <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
              {services.map(([icon,name,desc],i) => (
                <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, padding: "9px 10px", background: "rgba(139,92,246,0.06)", border: "1px solid rgba(139,92,246,0.12)", borderRadius: 9 }}>
                  <span style={{ fontSize: 20 }}>{icon}</span>
                  <div><p style={{ color: text, fontSize: 12, fontWeight: 700, margin: 0 }}>{name}</p>{desc && <p style={{ color: muted, fontSize: 10, margin: 0 }}>{desc}</p>}</div>
                </div>
              ))}
            </div>
          </div>
        )
      }
      case "event_info": return (
        <div style={{ padding: "10px 16px", ...s }}>
          <div style={{ background: "rgba(236,72,153,0.08)", border: "1px solid rgba(236,72,153,0.2)", borderRadius: 12, padding: "14px" }}>
            <p style={{ color: text, fontSize: 16, fontWeight: 700, margin: "0 0 10px", fontFamily: theme.fontDisplay }}>{c.name}</p>
            {[["📅",c.date],["🕐",c.time],["📍",c.location],["🎟️",c.price]].filter(([,v])=>v).map(([icon,val]) => (
              <p key={String(icon)} style={{ color: muted, fontSize: 12, margin: "0 0 4px" }}>{icon} {val}</p>
            ))}
            {c.cta_label && <div style={{ background: "#EC4899", color: "#fff", textAlign: "center", padding: "9px", borderRadius: 7, fontSize: 12, fontWeight: 700, marginTop: 10 }}>{c.cta_label}</div>}
          </div>
        </div>
      )
      case "spotify_player": return (
        <div style={{ padding: "10px 16px", ...s }}>
          <div style={{ background: "rgba(29,185,84,0.08)", border: "1px solid rgba(29,185,84,0.2)", borderRadius: 12, padding: "14px", display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ width: 42, height: 42, background: "#1DB954", borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20, flexShrink: 0 }}>🎧</div>
            <div style={{ flex: 1 }}><p style={{ color: text, fontSize: 12, fontWeight: 700, margin: "0 0 2px" }}>{c.title||"Ma musique"}</p><p style={{ color: muted, fontSize: 10, margin: 0 }}>Écouter sur Spotify</p></div>
            <div style={{ background: "#1DB954", color: "#000", padding: "5px 12px", borderRadius: 20, fontSize: 11, fontWeight: 700 }}>▶ Play</div>
          </div>
        </div>
      )
      case "music_links": {
        const platforms = [["spotify","🎵","#1DB954","Spotify"],["apple_music","🍎","#FC3C44","Apple Music"],["deezer","🎶","#A238FF","Deezer"],["youtube_music","▶️","#FF0000","YouTube Music"],["soundcloud","☁️","#FF5500","SoundCloud"]].filter(([k])=>c[k as string])
        return (
          <div style={{ padding: "10px 16px", ...s }}>
            {c.artist_name && <p style={{ color: text, fontSize: 14, fontWeight: 700, margin: "0 0 10px", textAlign: "center" }}>{c.artist_name}</p>}
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {platforms.length===0 ? <p style={{ color: muted, fontSize: 11, textAlign: "center", margin: 0 }}>Aucune plateforme configurée</p>
                : platforms.map(([k,icon,color,label]) => (
                  <div key={String(k)} style={{ display: "flex", alignItems: "center", gap: 10, background: (color as string)+"12", border: `1px solid ${color}25`, borderRadius: 9, padding: "9px 12px" }}>
                    <span style={{ fontSize: 16 }}>{icon}</span>
                    <span style={{ color: text, fontSize: 12, fontWeight: 600, flex: 1 }}>{label}</span>
                    <ExternalLink size={11} color={color as string} />
                  </div>
                ))}
            </div>
          </div>
        )
      }
      case "instagram_feed": return (
        // Parité avec le rendu public : pas de fausses vignettes (aucun feed réel),
        // seulement le CTA. On indique dans l'éditeur que le feed n'est pas affiché.
        <div style={{ padding: "10px 16px", ...s }}>
          {c.username && <p style={{ color: muted, fontSize: 11, textAlign: "center", margin: "0 0 8px" }}>{c.username}</p>}
          {c.cta_label
            ? <div style={{ background: "rgba(225,48,108,0.15)", border: "1px solid rgba(225,48,108,0.3)", color: "#E1306C", textAlign: "center", padding: "9px", borderRadius: 7, fontSize: 12, fontWeight: 700 }}>{c.cta_label}</div>
            : emptyHint("📸", "Ajoutez un lien Instagram (bouton « Me suivre »)")}
        </div>
      )
      case "contact_form": return (
        <div style={{ padding: "10px 16px", ...s }}>
          <p style={{ color: text, fontSize: 14, fontWeight: 700, margin: "0 0 10px" }}>{c.title||"Contact"}</p>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {["Nom","Email","Message"].map(f => <div key={f} style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 7, padding: f==="Message" ? "7px 10px 32px" : "7px 10px", color: muted, fontSize: 11 }}>{f}</div>)}
            <div style={{ background: `linear-gradient(90deg,${primary},${primary}cc)`, borderRadius: 7, padding: "9px", textAlign: "center", color: "#080808", fontSize: 12, fontWeight: 700 }}>{c.button_label||"Envoyer"}</div>
          </div>
        </div>
      )
      case "divider": {
        const dStyles: Record<string,any> = {
          gold: <div style={{ height: 1, background: `linear-gradient(90deg,transparent,${primary}60,transparent)` }} />,
          line: <div style={{ height: 1, background: "rgba(255,255,255,0.08)" }} />,
          dots: <div style={{ textAlign: "center", color: muted, letterSpacing: 8, fontSize: 14 }}>• • •</div>,
          stars: <div style={{ textAlign: "center", color: primary, letterSpacing: 8 }}>✦ ✦ ✦</div>,
        }
        return <div style={{ padding: "6px 16px", ...s }}>{dStyles[c.style||"gold"]}</div>
      }
      case "spacer": {
        const sSizes: Record<string,number> = { xs: 6, sm: 12, md: 24, lg: 40, xl: 60 }
        return <div style={{ height: sSizes[c.size||"md"] }} />
      }
      case "call_button": return (
        <div style={{ padding: "4px 16px 10px", ...s }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, background: "rgba(57,255,143,0.1)", border: "1.5px solid rgba(57,255,143,0.3)", borderRadius: 12, padding: "13px 18px" }}>
            <span style={{ fontSize: 16 }}>{c.icon||"📞"}</span>
            <span style={{ color: "var(--success)", fontSize: 13, fontWeight: 700 }}>{c.label||"Appeler maintenant"}</span>
          </div>
        </div>
      )
      case "whatsapp_button": return (
        <div style={{ padding: "4px 16px 10px", ...s }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, background: "rgba(37,211,102,0.1)", border: "1.5px solid rgba(37,211,102,0.3)", borderRadius: 12, padding: "13px 18px" }}>
            <span style={{ fontSize: 16 }}>💬</span>
            <span style={{ color: "#25D366", fontSize: 13, fontWeight: 700 }}>{c.label||"Discuter sur WhatsApp"}</span>
          </div>
        </div>
      )
      case "email_button": return (
        <div style={{ padding: "4px 16px 10px", ...s }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, background: "rgba(56,189,248,0.1)", border: "1.5px solid rgba(56,189,248,0.3)", borderRadius: 12, padding: "13px 18px" }}>
            <span style={{ fontSize: 16 }}>✉️</span>
            <span style={{ color: "var(--action)", fontSize: 13, fontWeight: 700 }}>{c.label||"Envoyer un email"}</span>
          </div>
        </div>
      )
      case "download_file": return (
        <div style={{ padding: "4px 16px 10px", ...s }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, background: "rgba(167,139,250,0.08)", border: "1.5px solid rgba(167,139,250,0.25)", borderRadius: 12, padding: "11px 14px" }}>
            <div style={{ width: 36, height: 36, background: "rgba(167,139,250,0.15)", borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, flexShrink: 0 }}>{c.icon||"📄"}</div>
            <div style={{ flex: 1 }}><p style={{ color: text, fontSize: 12, fontWeight: 700, margin: 0 }}>{c.label||"Télécharger"}</p>{c.type_doc && <p style={{ color: muted, fontSize: 9, margin: 0 }}>{c.type_doc}</p>}</div>
            <span style={{ color: "#A78BFA", fontSize: 16 }}>↓</span>
          </div>
        </div>
      )
      case "vcard": return (
        <div style={{ padding: "4px 16px 10px", ...s }}>
          <div style={{ background: primary+"08", border: `1.5px solid ${primary}25`, borderRadius: 12, padding: "12px 14px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
              <div style={{ width: 36, height: 36, borderRadius: "50%", background: `linear-gradient(135deg,${primary},${primary}80)`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, flexShrink: 0 }}>👤</div>
              <div>{c.name && <p style={{ color: text, fontSize: 13, fontWeight: 700, margin: 0 }}>{c.name}</p>}{c.company && <p style={{ color: muted, fontSize: 10, margin: 0 }}>{c.company}</p>}</div>
            </div>
            <div style={{ background: `linear-gradient(90deg,${primary},${primary}cc)`, borderRadius: 8, padding: "9px", textAlign: "center", fontSize: 12, fontWeight: 700, color: "#080808" }}>{c.label||"Ajouter à mes contacts"}</div>
          </div>
        </div>
      )
      case "google_review": return (
        <div style={{ padding: "4px 16px 10px", ...s }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, background: "rgba(251,191,36,0.08)", border: "1.5px solid rgba(251,191,36,0.25)", borderRadius: 12, padding: "11px 14px" }}>
            <div style={{ display: "flex", gap: 1 }}>{Array.from({length: parseInt(c.stars||"5")}).map((_,i) => <span key={i} style={{ color: "#FBBF24", fontSize: 12 }}>★</span>)}</div>
            <div style={{ flex: 1 }}><p style={{ color: text, fontSize: 12, fontWeight: 700, margin: 0 }}>{c.label||"Donner un avis"}</p><p style={{ color: muted, fontSize: 9, margin: 0 }}>Google Reviews</p></div>
            <span style={{ fontSize: 18 }}>⭐</span>
          </div>
        </div>
      )
      case "sticky_bar": {
        const acts = [1,2,3,4,5].map(i => stickyActionHref(c[`a${i}_type`], c[`a${i}_value`])).filter(a => a.href !== undefined || a.share)
        const showL = c.show_labels !== "no"
        return (
          <div style={{ padding: "8px 16px", ...s }}>
            <div style={{ border: "1px dashed rgba(201,168,76,0.3)", borderRadius: 12, padding: "8px 10px", background: "rgba(201,168,76,0.04)" }}>
              <p style={{ color: muted, fontSize: 9, margin: "0 0 7px", textTransform: "uppercase", letterSpacing: 1 }}>📌 Barre fixe · bas de l'écran (mobile)</p>
              <div style={{ display: "flex", gap: 6, justifyContent: "space-around", background: c.bar_style==="gold" ? `linear-gradient(90deg,${primary},${primary}cc)` : "rgba(10,10,10,0.9)", borderRadius: 12, padding: "8px 6px" }}>
                {(acts.length ? acts : [stickyActionHref("call"), stickyActionHref("whatsapp"), stickyActionHref("directions")]).slice(0,5).map((a, i) => (
                  <div key={i} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 2 }}>
                    <span style={{ fontSize: 16 }}>{a.icon}</span>
                    {showL && <span style={{ color: c.bar_style==="gold" ? "#080808" : a.color, fontSize: 8, fontWeight: 600 }}>{a.label}</span>}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )
      }
      case "directions_button": return (
        <div style={{ padding: "4px 16px 10px", ...s }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, background: "rgba(66,133,244,0.1)", border: "1.5px solid rgba(66,133,244,0.25)", borderRadius: 12, padding: "13px 18px" }}>
            <span style={{ fontSize: 16 }}>🧭</span>
            <p style={{ color: "#4285F4", fontSize: 13, fontWeight: 700, margin: 0 }}>{c.label||"Obtenir l'itinéraire"}</p>
          </div>
          {c.address && <p style={{ color: muted, fontSize: 10, margin: "6px 0 0", textAlign: "center" }}>📍 {c.address}</p>}
        </div>
      )
      case "table_booking": return (
        <div style={{ padding: "4px 16px 10px", ...s }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, background: "rgba(239,68,68,0.1)", border: "1.5px solid rgba(239,68,68,0.25)", borderRadius: 12, padding: "13px 18px" }}>
            <span style={{ fontSize: 16 }}>🍽️</span>
            <p style={{ color: "#EF4444", fontSize: 13, fontWeight: 700, margin: 0 }}>{c.label||"Réserver une table"}</p>
          </div>
        </div>
      )
      case "order_online": return (
        <div style={{ padding: "4px 16px 10px", ...s }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, background: "rgba(249,115,22,0.1)", border: "1.5px solid rgba(249,115,22,0.25)", borderRadius: 12, padding: "13px 18px" }}>
            <span style={{ fontSize: 16 }}>🛒</span>
            <p style={{ color: "#F97316", fontSize: 13, fontWeight: 700, margin: 0 }}>{c.label||"Commander maintenant"}</p>
          </div>
        </div>
      )
      case "free_gift": return (
        <div style={{ padding: "4px 16px 10px", ...s }}>
          <div style={{ background: "rgba(236,72,153,0.08)", border: "1.5px solid rgba(236,72,153,0.25)", borderRadius: 12, padding: "12px 14px", textAlign: "center" }}>
            <span style={{ fontSize: 28, display: "block", marginBottom: 6 }}>{c.emoji||"🎁"}</span>
            {c.description && <p style={{ color: muted, fontSize: 10, margin: "0 0 8px" }}>{c.description}</p>}
            <div style={{ background: "linear-gradient(90deg,#EC4899,#F472B6)", borderRadius: 8, padding: "9px", fontSize: 12, fontWeight: 700, color: "#fff" }}>{c.label||"Recevoir mon guide gratuit"}</div>
          </div>
        </div>
      )
      case "donation": {
        const dc = ({"Ko-fi":"#FF5E5B","Buy Me A Coffee":"#FFDD00","Patreon":"#FF424D","PayPal":"#009CDE","Tipeee":"#E55100"} as any)[c.platform||"Ko-fi"]||"#F59E0B"
        return (
          <div style={{ padding: "4px 16px 10px", ...s }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, background: dc+"12", border: `1.5px solid ${dc}30`, borderRadius: 12, padding: "13px 18px" }}>
              <span style={{ fontSize: 18 }}>☕</span>
              <p style={{ color: dc, fontSize: 13, fontWeight: 700, margin: 0 }}>{c.label||"Soutenir mon travail"}</p>
            </div>
          </div>
        )
      }
      case "multi_cta": {
        const btns = Array.from({length:50},(_,k)=>{const i=k+1;return [c[`btn${i}_icon`],c[`btn${i}_label`]]}).filter(([,l])=>l)
        return (
          <div style={{ padding: "4px 16px 10px", ...s }}>
            <div style={{ display: "grid", gridTemplateColumns: btns.length<=2 ? "1fr 1fr" : "1fr 1fr", gap: 6 }}>
              {btns.map(([icon,label],i) => (
                <div key={i} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4, background: primary+"10", border: `1px solid ${primary}20`, borderRadius: 10, padding: "10px 6px" }}>
                  <span style={{ fontSize: 20 }}>{icon||"⚡"}</span>
                  <span style={{ color: text, fontSize: 10, fontWeight: 600, textAlign: "center" }}>{label}</span>
                </div>
              ))}
            </div>
          </div>
        )
      }
      case "app_download": return (
        <div style={{ padding: "4px 16px 10px", ...s }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
            {c.ios_url && <div style={{ display: "flex", alignItems: "center", gap: 10, background: "rgba(0,0,0,0.25)", border: "1.5px solid rgba(255,255,255,0.12)", borderRadius: 11, padding: "10px 14px" }}><span style={{ fontSize: 22 }}>🍎</span><div><p style={{ color: muted, fontSize: 8, margin: 0, textTransform: "uppercase", letterSpacing: 1 }}>Disponible sur</p><p style={{ color: text, fontSize: 13, fontWeight: 700, margin: 0 }}>App Store</p></div></div>}
            {c.android_url && <div style={{ display: "flex", alignItems: "center", gap: 10, background: "rgba(0,0,0,0.25)", border: "1.5px solid rgba(255,255,255,0.12)", borderRadius: 11, padding: "10px 14px" }}><span style={{ fontSize: 22 }}>🤖</span><div><p style={{ color: muted, fontSize: 8, margin: 0, textTransform: "uppercase", letterSpacing: 1 }}>Disponible sur</p><p style={{ color: text, fontSize: 13, fontWeight: 700, margin: 0 }}>Google Play</p></div></div>}
            {!c.ios_url && !c.android_url && <div style={{ textAlign: "center", padding: "14px", color: muted, fontSize: 11 }}>Ajoutez vos liens App Store / Play Store</div>}
          </div>
        </div>
      )
      case "promo_code": return !hasPublishableContent("promo_code", c)
        ? <div style={{ padding: "4px 16px 10px", ...s }}>{emptyHint("🏷️", "Ajoutez un code promo", HIDDEN_WHEN_EMPTY_NOTE)}</div>
        : (
        <div style={{ padding: "4px 16px 10px", ...s }}>
          <div style={{ background: "rgba(249,115,22,0.08)", border: "2px dashed rgba(249,115,22,0.3)", borderRadius: 12, padding: "14px", textAlign: "center" }}>
            {c.description && <p style={{ color: muted, fontSize: 11, margin: "0 0 8px" }}>{c.description}</p>}
            <div style={{ background: "rgba(249,115,22,0.15)", border: "2px solid rgba(249,115,22,0.4)", borderRadius: 8, padding: "9px 16px", fontFamily: "monospace", fontSize: 18, fontWeight: 700, color: "#F97316", letterSpacing: 3 }}>{c.code}</div>
            {c.expires && <p style={{ color: muted, fontSize: 9, margin: "5px 0 0" }}>Expire le {c.expires}</p>}
          </div>
        </div>
      )
      case "limited_offer": return (
        <div style={{ padding: "4px 16px 10px", ...s }}>
          <div style={{ background: "rgba(239,68,68,0.08)", border: "1.5px solid rgba(239,68,68,0.3)", borderRadius: 12, padding: "12px 14px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 5 }}><span style={{ color: "#EF4444" }}>⚡</span><p style={{ color: text, fontSize: 13, fontWeight: 700, margin: 0 }}>{c.title||"Offre limitée"}</p></div>
            {c.description && <p style={{ color: muted, fontSize: 11, margin: "0 0 6px" }}>{c.description}</p>}
            {c.expires && <p style={{ color: "#EF4444", fontSize: 10, margin: "0 0 8px", fontWeight: 600 }}>⏰ Expire le {c.expires}</p>}
            {c.cta_label && <div style={{ background: "rgba(239,68,68,0.15)", border: "1px solid rgba(239,68,68,0.3)", borderRadius: 7, padding: "9px", textAlign: "center", fontSize: 12, fontWeight: 700, color: "#EF4444" }}>{c.cta_label}</div>}
          </div>
        </div>
      )
      case "booking_button": return (
        <div style={{ padding: "4px 16px 10px", ...s }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, background: "rgba(56,189,248,0.08)", border: "1.5px solid rgba(56,189,248,0.25)", borderRadius: 12, padding: "11px 14px" }}>
            <div style={{ width: 38, height: 38, background: "rgba(56,189,248,0.12)", borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, flexShrink: 0 }}>📅</div>
            <div style={{ flex: 1 }}><p style={{ color: text, fontSize: 12, fontWeight: 700, margin: 0 }}>{c.label||"Prendre rendez-vous"}</p>{c.description && <p style={{ color: muted, fontSize: 9, margin: 0 }}>{c.description}</p>}</div>
          </div>
        </div>
      )
      case "payment_button": return (() => {
        const br = paymentBrand(c.platform)
        const href = paymentLink(c)
        return (
          <div style={{ padding: "4px 16px 10px", ...s }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, background: `${br.color}18`, border: `1.5px solid ${br.color}55`, borderRadius: 12, padding: "13px 18px" }}>
              <span style={{ fontSize: 16 }}>{br.icon}</span>
              <p style={{ color: br.color, fontSize: 13, fontWeight: 700, margin: 0 }}>{c.label||"Payer maintenant"}{c.amount ? ` — ${c.amount}` : ""}</p>
            </div>
            {!href && <p style={{ color: "#F59E0B", fontSize: 9, margin: "4px 0 0", textAlign: "center" }}>⚠ {br.handleBased ? "Ajoutez votre pseudo" : "Ajoutez le lien de paiement"} pour activer le bouton</p>}
          </div>
        )
      })()
      case "quote_request": return (
        <div style={{ padding: "4px 16px 10px", ...s }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, background: primary+"08", border: `1.5px solid ${primary}20`, borderRadius: 12, padding: "11px 14px" }}>
            <div style={{ width: 38, height: 38, background: primary+"12", borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, flexShrink: 0 }}>📋</div>
            <div style={{ flex: 1 }}><p style={{ color: text, fontSize: 12, fontWeight: 700, margin: 0 }}>{c.label||"Demander un devis"}</p>{c.description && <p style={{ color: muted, fontSize: 9, margin: 0 }}>{c.description}</p>}</div>
            <span style={{ color: primary, fontSize: 14 }}>→</span>
          </div>
        </div>
      )
      case "cover_banner": {
        const bh = bannerHeight(c, "editor")
        const btype = c.banner_type || (c.src ? "image" : "gradient")
        const pos = c.text_position || "bottom-left"
        const anim = c.animation && c.animation !== "none" ? c.animation : null
        const rad = parseInt(c.block_radius) || 0
        const txtColor = c.text_color || "#fff"
        const bannerBg = bannerBackgroundStyle(c, accent)
        const ovLayers = bannerOverlayLayers(c, accent)
        const bRadius = rad || 0
        const frame = bannerFrame(c, accent, bRadius)
        const alignItems = pos==="center" ? "center" : "flex-end"
        const justifyContent = (pos==="bottom-center"||pos==="center") ? "center" : "flex-start"
        const textAlign = (pos==="bottom-center"||pos==="center") ? "center" : "left"
        return (
          <div className={anim ? `qfb qfb-${anim}` : undefined} style={{ position: "relative", overflow: "hidden", borderRadius: bRadius, boxShadow: frame.boxShadow }}>
            {anim && <style>{BANNER_ANIM_CSS}</style>}
            {btype==="image"
              ? (c.src
                ? <img className="qfb-media" src={c.src} alt="" style={{ width: "100%", height: bh, display: "block", ...bannerImageStyle(c) }} />
                : <div className="qfb-media" style={{ width: "100%", height: bh, background: `linear-gradient(135deg,${primary}30,${accent}20)`, display: "flex", alignItems: "center", justifyContent: "center" }}><span style={{ color: muted, fontSize: 11 }}>Bannière / Cover</span></div>)
              : <div className="qfb-media" style={{ width: "100%", height: bh, ...bannerBg }} />}
            {anim==="shimmer" && <div className="qfb-shine" />}
            {ovLayers.map((l, i) => <div key={i} className={l.className} style={l.style} />)}
            {frame.borderLayer && <div style={frame.borderLayer.style} />}
            {(c.cover_title || c.cover_subtitle || c.badge) && (
              <div className="qfb-content" style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems, justifyContent, padding: "10px 14px", textAlign, gap: 4 }}>
                {c.badge && <span style={{ alignSelf: pos==="bottom-left" ? "flex-start" : "center", background: "rgba(255,255,255,0.18)", backdropFilter: "blur(4px)", border: "1px solid rgba(255,255,255,0.3)", color: "#fff", borderRadius: 20, padding: "2px 9px", fontSize: 9, fontWeight: 700 }}>{c.badge}</span>}
                {c.cover_title && <p style={bannerTitleStyle(c, "editor", txtColor, theme.fontDisplay)}>{c.cover_title}</p>}
                {c.cover_subtitle && <p style={{ color: txtColor, opacity: 0.9, fontSize: parseInt(c.subtitle_size) || 11, margin: 0, textShadow: "0 1px 6px rgba(0,0,0,0.5)" }}>{c.cover_subtitle}</p>}
              </div>
            )}
          </div>
        )
      }
      case "about": return (
        <div style={{ padding: "10px 16px", ...s }}>
          {c.emoji && <span style={{ fontSize: 18, display: "block", marginBottom: 5 }}>{c.emoji}</span>}
          {c.title && <p style={{ color: primary, fontSize: 10, fontWeight: 700, margin: "0 0 5px", textTransform: "uppercase", letterSpacing: 1.5 }}>{c.title}</p>}
          <p style={{ color: text, fontSize: 12, lineHeight: 1.75, margin: 0 }}>{c.text||"Votre histoire ici..."}</p>
          {c.collapsible==="yes" && <button style={{ color: primary, fontSize: 10, background: "none", border: "none", cursor: "pointer", padding: "5px 0 0", fontWeight: 600 }}>Lire la suite →</button>}
        </div>
      )
      case "availability": {
        const sc = availabilityStatus(c.status, c.dot_color)
        return (
          <div style={{ padding: "8px 16px", ...s }}>
            <div style={{ background: sc.bg, border: `1px solid ${sc.border}`, borderRadius: 12, padding: "12px 14px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: c.message ? 5 : 0 }}>
                <div style={{ width: 8, height: 8, borderRadius: "50%", background: sc.color, boxShadow: `0 0 6px ${sc.color}80`, flexShrink: 0 }} />
                <p style={{ color: text, fontSize: 13, fontWeight: 700, margin: 0 }}>{sc.label}</p>
                {c.available_from && <span style={{ color: muted, fontSize: 10, marginLeft: "auto" }}>dès {c.available_from}</span>}
              </div>
              {c.message && <p style={{ color: muted, fontSize: 11, margin: "0 0 8px", lineHeight: 1.5 }}>{c.message}</p>}
              {c.cta_label && <div style={{ background: `linear-gradient(90deg,${primary},${primary}cc)`, borderRadius: 8, padding: "9px", textAlign: "center", fontSize: 12, fontWeight: 700, color: "#080808" }}>{c.cta_label}</div>}
            </div>
          </div>
        )
      }
      case "journey": {
        const lines = [c.line_1,c.line_2,c.line_3,c.line_4].filter(Boolean)
        return lines.length>0 ? (
          <div style={{ padding: "8px 16px 12px", ...s }}>
            {c.title && <p style={{ color: muted, fontSize: 10, textTransform: "uppercase", letterSpacing: 2, margin: "0 0 8px" }}>{c.title}</p>}
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {lines.map((line:string,i:number) => (
                <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: 9, background: primary+"06", border: `1px solid ${primary}12`, borderRadius: 9, padding: "9px 10px" }}>
                  <span style={{ fontSize: 14, flexShrink: 0 }}>{line.split(" ")[0]}</span>
                  <span style={{ color: text, fontSize: 12, lineHeight: 1.5 }}>{line.split(" ").slice(1).join(" ")}</span>
                </div>
              ))}
            </div>
          </div>
        ) : <div style={{ padding: "14px", textAlign: "center", color: muted, fontSize: 11, ...s }}>Ajoutez vos chiffres clés</div>
      }
      case "expertise": {
        const skills = Array.from({length:50},(_,k)=>{const i=k+1;return [c[`s${i}_name`],c[`s${i}_level`],c[`s${i}_icon`]]}).filter(([n])=>n)
        return skills.length>0 ? (
          <div style={{ padding: "8px 16px 12px", ...s }}>
            {c.title && <p style={{ color: muted, fontSize: 10, textTransform: "uppercase", letterSpacing: 2, margin: "0 0 10px" }}>{c.title}</p>}
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {skills.map(([name,level,icon],i:number) => {
                const pct = Math.round((parseInt(String(level)||"3")/5)*100)
                return (
                  <div key={i}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 3 }}>
                      <span style={{ color: text, fontSize: 11, display: "flex", alignItems: "center", gap: 5 }}>{icon && <span>{icon}</span>}{name}</span>
                      <span style={{ color: primary, fontSize: 9, fontWeight: 700 }}>{pct}%</span>
                    </div>
                    <div style={{ height: 4, background: "rgba(255,255,255,0.07)", borderRadius: 2, overflow: "hidden" }}>
                      <div style={{ height: "100%", width: `${pct}%`, background: `linear-gradient(90deg,${primary},${accent})`, borderRadius: 2 }} />
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        ) : <div style={{ padding: "14px", textAlign: "center", color: muted, fontSize: 11, ...s }}>Ajoutez vos expertises</div>
      }
      case "languages": {
        const langs = Array.from({length:50},(_,k)=>{const i=k+1;return [c[`lang_${i}_flag`],c[`lang_${i}_name`],c[`lang_${i}_level`]]}).filter(([,n])=>n)
        return langs.length>0 ? (
          <div style={{ padding: "8px 16px 12px", ...s }}>
            {c.title && <p style={{ color: muted, fontSize: 10, textTransform: "uppercase", letterSpacing: 2, margin: "0 0 8px" }}>{c.title}</p>}
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {langs.map(([flag,name,level],i:number) => (
                <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, padding: "7px 10px", background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 9 }}>
                  <span style={{ fontSize: 18 }}>{flag||"🌐"}</span>
                  <span style={{ color: text, fontSize: 12, fontWeight: 600, flex: 1 }}>{name}</span>
                  <span style={{ background: primary+"15", border: `1px solid ${primary}25`, borderRadius: 20, padding: "2px 8px", color: primary, fontSize: 9, fontWeight: 600 }}>{level||"Courant"}</span>
                </div>
              ))}
            </div>
          </div>
        ) : <div style={{ padding: "14px", textAlign: "center", color: muted, fontSize: 11, ...s }}>Ajoutez vos langues</div>
      }
      case "certifications": {
        const certs = Array.from({length:50},(_,k)=>{const i=k+1;return [c[`cert_${i}_icon`],c[`cert_${i}_name`],c[`cert_${i}_org`],c[`cert_${i}_year`]]}).filter(([,n])=>n)
        return certs.length>0 ? (
          <div style={{ padding: "8px 16px 12px", ...s }}>
            {c.title && <p style={{ color: muted, fontSize: 10, textTransform: "uppercase", letterSpacing: 2, margin: "0 0 8px" }}>{c.title}</p>}
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {certs.map(([icon,name,org,year],i:number) => (
                <div key={i} style={{ display: "flex", alignItems: "center", gap: 9, padding: "8px 10px", background: primary+"06", border: `1px solid ${primary}12`, borderRadius: 10 }}>
                  <span style={{ fontSize: 18, flexShrink: 0 }}>{icon||"🏆"}</span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ color: text, fontSize: 11, fontWeight: 700, margin: 0 }}>{name}</p>
                    <p style={{ color: muted, fontSize: 9, margin: 0 }}>{org}{year ? ` · ${year}` : ""}</p>
                  </div>
                  <Check size={11} color={primary} style={{ flexShrink: 0 }} />
                </div>
              ))}
            </div>
          </div>
        ) : <div style={{ padding: "14px", textAlign: "center", color: muted, fontSize: 11, ...s }}>Ajoutez vos certifications</div>
      }
      case "company": return (
        <div style={{ padding: "8px 16px 12px", ...s }}>
          <div style={{ display: "flex", gap: 11, alignItems: "center", background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 12, padding: "11px 12px" }}>
            {c.logo_url
              ? <img src={c.logo_url} alt="" style={{ width: 40, height: 40, borderRadius: 9, objectFit: "cover", flexShrink: 0 }} />
              : <div style={{ width: 40, height: 40, borderRadius: 9, background: primary+"15", border: `1px solid ${primary}25`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20, flexShrink: 0 }}>🏢</div>}
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ color: text, fontSize: 14, fontWeight: 700, margin: "0 0 1px", fontFamily: theme.fontDisplay }}>{c.company_name||"Mon Entreprise"}</p>
              <p style={{ color: muted, fontSize: 10, margin: 0 }}>{c.sector}{c.founded_year ? ` · Depuis ${c.founded_year}` : ""}</p>
            </div>
          </div>
        </div>
      )

      case "tiktok_feed": return (
        <div style={{ padding: "10px 16px", ...s }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 3, marginBottom: 10 }}>
            {[0,1,2,3,4,5].map(i => <div key={i} style={{ background: "rgba(245,240,232,0.06)", border: "1px solid rgba(245,240,232,0.1)", borderRadius: 5, aspectRatio: "9/16", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16 }}>🎵</div>)}
          </div>
          {c.username && <p style={{ color: muted, fontSize: 11, textAlign: "center", margin: "0 0 8px" }}>{c.username}</p>}
          {c.cta_label && <div style={{ background: "rgba(245,240,232,0.08)", border: "1px solid rgba(245,240,232,0.2)", color: text, textAlign: "center", padding: "9px", borderRadius: 7, fontSize: 12, fontWeight: 700 }}>{c.cta_label}</div>}
        </div>
      )

      case "youtube_channel": return (
        <div style={{ padding: "10px 16px", ...s }}>
          <div style={{ display: "flex", alignItems: "center", gap: 11, marginBottom: 12 }}>
            <div style={{ width: 44, height: 44, borderRadius: "50%", background: "rgba(255,0,0,0.15)", border: "2px solid rgba(255,0,0,0.3)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20, flexShrink: 0 }}>▶️</div>
            <div style={{ flex: 1 }}>
              <p style={{ color: text, fontSize: 13, fontWeight: 700, margin: "0 0 2px" }}>{c.channel_name||"Ma Chaîne"}</p>
              {c.subscribers && <p style={{ color: muted, fontSize: 10, margin: 0 }}>{c.subscribers}</p>}
            </div>
          </div>
          {c.cta_label && <div style={{ background: "#FF0000", color: "#fff", textAlign: "center", padding: "10px", borderRadius: 8, fontSize: 12, fontWeight: 700 }}>{c.cta_label}</div>}
        </div>
      )

      case "twitch_live": {
        const isLive = c.status === "live"
        return (
          <div style={{ padding: "10px 16px", ...s }}>
            <div style={{ background: isLive ? "rgba(145,70,255,0.1)" : "rgba(255,255,255,0.03)", border: `1.5px solid ${isLive ? "rgba(145,70,255,0.4)" : "rgba(255,255,255,0.08)"}`, borderRadius: 12, padding: "14px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 9, marginBottom: 10 }}>
                <div style={{ width: 40, height: 40, borderRadius: 9, background: "rgba(145,70,255,0.2)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20, flexShrink: 0 }}>🎮</div>
                <div style={{ flex: 1 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <p style={{ color: text, fontSize: 13, fontWeight: 700, margin: 0 }}>{c.username||"monpseudo"}</p>
                    {isLive && <span style={{ background: "#EF4444", color: "#fff", borderRadius: 4, padding: "1px 6px", fontSize: 9, fontWeight: 700 }}>● LIVE</span>}
                  </div>
                  {c.game && <p style={{ color: muted, fontSize: 10, margin: 0 }}>🎯 {c.game}</p>}
                  {c.viewers && isLive && <p style={{ color: "#9146FF", fontSize: 10, margin: 0 }}>👁 {c.viewers}</p>}
                  {!isLive && <p style={{ color: muted, fontSize: 10, margin: 0 }}>Hors ligne</p>}
                </div>
              </div>
              <div style={{ background: "#9146FF", color: "#fff", textAlign: "center", padding: "9px", borderRadius: 8, fontSize: 12, fontWeight: 700 }}>{c.cta_label||"Rejoindre le live"}</div>
            </div>
          </div>
        )
      }

      case "discord_server": return (
        <div style={{ padding: "10px 16px", ...s }}>
          <div style={{ background: "rgba(88,101,242,0.08)", border: "1.5px solid rgba(88,101,242,0.25)", borderRadius: 12, padding: "14px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
              <div style={{ width: 42, height: 42, borderRadius: 12, background: "rgba(88,101,242,0.2)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22, flexShrink: 0 }}>🎮</div>
              <div style={{ flex: 1 }}>
                <p style={{ color: text, fontSize: 13, fontWeight: 700, margin: "0 0 1px" }}>{c.server_name||"Mon Serveur"}</p>
                {c.members && <p style={{ color: muted, fontSize: 10, margin: "0 0 1px" }}>👥 {c.members}</p>}
                {c.description && <p style={{ color: muted, fontSize: 10, margin: 0 }}>{c.description}</p>}
              </div>
            </div>
            <div style={{ background: "#5865F2", color: "#fff", textAlign: "center", padding: "10px", borderRadius: 8, fontSize: 12, fontWeight: 700 }}>{c.cta_label||"Rejoindre le Discord"}</div>
          </div>
        </div>
      )

      case "telegram_channel": return (
        <div style={{ padding: "10px 16px", ...s }}>
          <div style={{ background: "rgba(38,165,228,0.08)", border: "1.5px solid rgba(38,165,228,0.25)", borderRadius: 12, padding: "14px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
              <div style={{ width: 42, height: 42, borderRadius: "50%", background: "rgba(38,165,228,0.2)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22, flexShrink: 0 }}>✈️</div>
              <div style={{ flex: 1 }}>
                <p style={{ color: text, fontSize: 13, fontWeight: 700, margin: "0 0 1px" }}>{c.channel_name||"Mon Canal"}</p>
                {c.members && <p style={{ color: muted, fontSize: 10, margin: "0 0 1px" }}>👥 {c.members}</p>}
                {c.description && <p style={{ color: muted, fontSize: 10, margin: 0 }}>{c.description}</p>}
              </div>
            </div>
            <div style={{ background: "#26A5E4", color: "#fff", textAlign: "center", padding: "10px", borderRadius: 8, fontSize: 12, fontWeight: 700 }}>{c.cta_label||"Rejoindre le canal"}</div>
          </div>
        </div>
      )

      case "podcast_links": {
        const platforms = [["spotify_url","🟢","#1DB954","Spotify Podcasts"],["apple_url","🍎","#B150E2","Apple Podcasts"],["pocket_url","📻","#F43E37","Pocket Casts"],["rss_url","📡","#F97316","RSS Feed"]].filter(([k])=>c[k as string])
        return (
          <div style={{ padding: "10px 16px", ...s }}>
            <div style={{ display: "flex", alignItems: "center", gap: 11, marginBottom: 12 }}>
              {c.cover_url
                ? <img src={c.cover_url} alt="" style={{ width: 52, height: 52, borderRadius: 10, objectFit: "cover", flexShrink: 0 }} />
                : <div style={{ width: 52, height: 52, borderRadius: 10, background: "rgba(177,80,226,0.15)", border: "1px solid rgba(177,80,226,0.25)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 26, flexShrink: 0 }}>🎙️</div>}
              <div>
                <p style={{ color: text, fontSize: 14, fontWeight: 700, margin: "0 0 2px" }}>{c.podcast_name||"Mon Podcast"}</p>
                {c.description && <p style={{ color: muted, fontSize: 11, margin: 0 }}>{c.description}</p>}
              </div>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {platforms.length===0
                ? <p style={{ color: muted, fontSize: 11, textAlign: "center", margin: 0 }}>Ajoutez vos plateformes d écoute</p>
                : platforms.map(([k,icon,color,label]) => (
                  <div key={String(k)} style={{ display: "flex", alignItems: "center", gap: 10, background: (color as string)+"12", border: `1px solid ${color}25`, borderRadius: 9, padding: "9px 12px" }}>
                    <span style={{ fontSize: 16 }}>{icon}</span>
                    <span style={{ color: text, fontSize: 12, fontWeight: 600, flex: 1 }}>{label}</span>
                    <ExternalLink size={11} color={color as string} />
                  </div>
                ))}
            </div>
          </div>
        )
      }

      case "favorite_links": {
        const links = Array.from({length:50},(_,k)=>{const i=k+1;return [c[`link_${i}_icon`],c[`link_${i}_label`],c[`link_${i}_url`]]}).filter(([,l])=>l)
        return (
          <div style={{ padding: "10px 16px", ...s }}>
            {c.title && <p style={{ color: muted, fontSize: 10, textTransform: "uppercase", letterSpacing: 2, margin: "0 0 10px" }}>{c.title}</p>}
            {links.length===0
              ? <p style={{ color: muted, fontSize: 11, textAlign: "center", margin: 0 }}>Ajoutez vos liens favoris</p>
              : <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
                  {links.map(([icon,label,url],i) => (
                    <div key={i} style={{ display: "flex", alignItems: "center", gap: 12, background: primary+"08", border: `1px solid ${primary}15`, borderRadius: 10, padding: "10px 12px" }}>
                      <span style={{ fontSize: 20, flexShrink: 0 }}>{icon||"🔗"}</span>
                      <span style={{ color: text, fontSize: 13, fontWeight: 600, flex: 1 }}>{label}</span>
                      <ExternalLink size={11} color={primary} />
                    </div>
                  ))}
                </div>}
          </div>
        )
      }


      case "product_catalog": {
        const products = Array.from({length:50},(_,k)=>{const i=k+1;return [c[`p${i}_img`],c[`p${i}_name`],c[`p${i}_price`],c[`p${i}_desc`],c[`p${i}_url`]]}).filter(([,n])=>n)
        return (
          <div style={{ padding: "10px 16px", ...s }}>
            {c.title && <p style={{ color: muted, fontSize: 10, textTransform: "uppercase", letterSpacing: 2, margin: "0 0 12px" }}>{c.title}</p>}
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {products.length===0
                ? <div style={{ textAlign: "center", padding: "20px", color: muted, fontSize: 11 }}>Ajoutez vos produits</div>
                : products.map(([img,name,price,desc,url],i) => (
                  <div key={i} style={{ display: "flex", gap: 10, background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 12, overflow: "hidden" }}>
                    {img
                      ? <img src={String(img)} alt="" style={{ width: 70, height: 70, objectFit: "cover", flexShrink: 0 }} />
                      : <div style={{ width: 70, height: 70, background: "rgba(249,115,22,0.08)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 24, flexShrink: 0 }}>🛍️</div>}
                    <div style={{ flex: 1, padding: "8px 10px 8px 0" }}>
                      <p style={{ color: text, fontSize: 12, fontWeight: 700, margin: "0 0 2px" }}>{name}</p>
                      {desc && <p style={{ color: muted, fontSize: 10, margin: "0 0 4px" }}>{desc}</p>}
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                        <span style={{ color: primary, fontSize: 14, fontWeight: 700 }}>{price}</span>
                        {c.cta_label && <span style={{ background: primary, color: "#080808", borderRadius: 6, padding: "3px 9px", fontSize: 10, fontWeight: 700 }}>{c.cta_label}</span>}
                      </div>
                    </div>
                  </div>
                ))}
            </div>
          </div>
        )
      }

      case "featured_product": return !hasPublishableContent("featured_product", c)
        ? <div style={{ padding: "10px 16px", ...s }}>{emptyHint("⭐", "Ajoutez un produit", HIDDEN_WHEN_EMPTY_NOTE)}</div>
        : (
        <div style={{ padding: "10px 16px", ...s }}>
          <div style={{ background: `linear-gradient(135deg,${primary}10,${accent}08)`, border: `1.5px solid ${primary}30`, borderRadius: 14, overflow: "hidden" }}>
            {c.badge && (() => { const bs = productBadgeStyle(c.badge, primary); return <div style={{ background: bs.color, color: bs.fg, padding: "6px 14px", fontSize: 11, fontWeight: 700, textAlign: "center" }}>{bs.icon ? bs.icon+" " : ""}{c.badge}</div> })()}
            {c.image
              ? <img src={c.image} alt="" style={{ width: "100%", height: 160, objectFit: "cover", display: "block" }} />
              : <div style={{ height: 120, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(249,115,22,0.06)", fontSize: 40 }}>⭐</div>}
            <div style={{ padding: "14px" }}>
              <p style={{ color: text, fontSize: 16, fontWeight: 700, margin: "0 0 6px", fontFamily: theme.fontDisplay }}>{c.name}</p>
              {c.description && <p style={{ color: muted, fontSize: 12, margin: "0 0 10px", lineHeight: 1.5 }}>{c.description}</p>}
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
                <span style={{ color: primary, fontSize: 22, fontWeight: 700 }}>{c.price||"99€"}</span>
                {c.old_price && <span style={{ color: muted, fontSize: 14, textDecoration: "line-through" }}>{c.old_price}</span>}
                {(() => { const d = priceDiscount(c.price||"99€", c.old_price); return c.old_price ? <span style={{ background: "#EF4444", color: "#fff", borderRadius: 6, padding: "2px 7px", fontSize: 10, fontWeight: 800 }}>{d ? d.label : "Promo"}</span> : null })()}
              </div>
              {(() => { const st = stockStatus(c.stock); return st ? <p style={{ color: st.color, fontSize: 11, fontWeight: 700, margin: "0 0 10px" }}>{st.state === "in" ? "✓ " : st.state === "out" ? "⛔ " : "🔥 "}{st.label}</p> : null })()}
              {c.cta_label && (() => { const out = stockStatus(c.stock)?.soldOut; return <div style={{ background: out ? "rgba(255,255,255,0.08)" : `linear-gradient(90deg,${primary},${primary}cc)`, borderRadius: 10, padding: "12px", textAlign: "center", fontSize: 13, fontWeight: 700, color: out ? muted : "#080808" }}>{out ? "Epuise" : c.cta_label}</div> })()}
            </div>
          </div>
        </div>
      )

      case "offer_comparison": {
        const plans = [
          { name: c.plan1_name, price: c.plan1_price, old_price: c.plan1_old_price, features: c.plan1_features, highlight: false },
          { name: c.plan2_name, price: c.plan2_price, old_price: c.plan2_old_price, features: c.plan2_features, highlight: c.plan2_highlight==="yes" },
          { name: c.plan3_name, price: c.plan3_price, old_price: c.plan3_old_price, features: c.plan3_features, highlight: false },
        ].filter(p => p.name)
        return (
          <div style={{ padding: "10px 16px", ...s }}>
            {c.title && <p style={{ color: muted, fontSize: 10, textTransform: "uppercase", letterSpacing: 2, margin: "0 0 12px", textAlign: "center" }}>{c.title}</p>}
            <div style={{ display: "flex", gap: 7 }}>
              {plans.map((plan, i) => (
                <div key={i} style={{ flex: 1, background: plan.highlight ? primary+"12" : "rgba(255,255,255,0.03)", border: `1.5px solid ${plan.highlight ? primary+"50" : "rgba(255,255,255,0.08)"}`, borderRadius: 12, padding: "12px 10px", position: "relative" }}>
                  {plan.highlight && <div style={{ position: "absolute", top: -8, left: "50%", transform: "translateX(-50%)", background: primary, color: "#080808", borderRadius: 20, padding: "2px 10px", fontSize: 9, fontWeight: 700, whiteSpace: "nowrap" }}>⭐ Populaire</div>}
                  <p style={{ color: plan.highlight ? primary : text, fontSize: 11, fontWeight: 700, margin: "0 0 4px", textAlign: "center" }}>{plan.name}</p>
                  <div style={{ display: "flex", flexDirection: "column", alignItems: "center", margin: "0 0 8px" }}>
                    <p style={{ color: primary, fontSize: 18, fontWeight: 700, margin: 0, fontFamily: theme.fontDisplay }}>{plan.price}</p>
                    {plan.old_price && (() => { const disc = priceDiscount(plan.price, plan.old_price); return <p style={{ margin: "1px 0 0", fontSize: 10 }}><span style={{ color: muted, textDecoration: "line-through" }}>{plan.old_price}</span>{disc && <span style={{ color: "#EF4444", fontWeight: 800, marginLeft: 4 }}>{disc.label}</span>}</p> })()}
                  </div>
                  {plan.features && plan.features.split("\n").filter(Boolean).map((f: string, j: number) => (
                    <p key={j} style={{ color: muted, fontSize: 9, margin: "0 0 3px", display: "flex", alignItems: "center", gap: 4 }}>
                      <span style={{ color: "var(--success)" }}>✓</span> {f}
                    </p>
                  ))}
                  {c.cta_label && <div style={{ background: plan.highlight ? `linear-gradient(90deg,${primary},${primary}cc)` : "rgba(255,255,255,0.06)", borderRadius: 7, padding: "8px", textAlign: "center", fontSize: 10, fontWeight: 700, color: plan.highlight ? "#080808" : text, marginTop: 8 }}>{c.cta_label}</div>}
                </div>
              ))}
            </div>
          </div>
        )
      }

      case "packs": {
        const packs = Array.from({length:50},(_,k)=>{const i=k+1;return [c[`pack${i}_icon`],c[`pack${i}_name`],c[`pack${i}_price`],c[`pack${i}_content`],c[`pack${i}_url`]]}).filter(([,n])=>n)
        return (
          <div style={{ padding: "10px 16px", ...s }}>
            {c.title && <p style={{ color: muted, fontSize: 10, textTransform: "uppercase", letterSpacing: 2, margin: "0 0 12px" }}>{c.title}</p>}
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {packs.map(([icon, name, price, content, url], i) => (
                <div key={i} style={{ background: i===1 ? primary+"10" : "rgba(255,255,255,0.03)", border: `1.5px solid ${i===1 ? primary+"35" : "rgba(255,255,255,0.07)"}`, borderRadius: 12, padding: "13px 14px" }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <span style={{ fontSize: 20 }}>{icon||"🚀"}</span>
                      <p style={{ color: text, fontSize: 14, fontWeight: 700, margin: 0 }}>{name}</p>
                    </div>
                    <span style={{ color: primary, fontSize: 16, fontWeight: 700 }}>{price}</span>
                  </div>
                  {content && content.split("\n").filter(Boolean).map((line: string, j: number) => (
                    <p key={j} style={{ color: muted, fontSize: 11, margin: "0 0 3px", display: "flex", alignItems: "center", gap: 6 }}>
                      <span style={{ color: "var(--success)", fontSize: 10 }}>✓</span> {line}
                    </p>
                  ))}
                </div>
              ))}
            </div>
          </div>
        )
      }

      case "before_after": return (
        <div style={{ padding: "10px 16px", ...s }}>
          {c.title && <p style={{ color: text, fontSize: 13, fontWeight: 700, margin: "0 0 10px", textAlign: "center" }}>{c.title}</p>}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
            <div style={{ borderRadius: 10, overflow: "hidden" }}>
              {c.before_img
                ? <img src={c.before_img} alt="Avant" style={{ width: "100%", height: 120, objectFit: "cover", display: "block" }} />
                : <div style={{ height: 120, background: "rgba(255,255,255,0.05)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 24 }}>📸</div>}
              <div style={{ background: "rgba(239,68,68,0.15)", padding: "5px", textAlign: "center" }}>
                <p style={{ color: "#EF4444", fontSize: 11, fontWeight: 700, margin: 0 }}>{c.before_label||"Avant"}</p>
              </div>
            </div>
            <div style={{ borderRadius: 10, overflow: "hidden" }}>
              {c.after_img
                ? <img src={c.after_img} alt="Après" style={{ width: "100%", height: 120, objectFit: "cover", display: "block" }} />
                : <div style={{ height: 120, background: "rgba(57,255,143,0.06)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 24 }}>✨</div>}
              <div style={{ background: "rgba(57,255,143,0.15)", padding: "5px", textAlign: "center" }}>
                <p style={{ color: "var(--success)", fontSize: 11, fontWeight: 700, margin: 0 }}>{c.after_label||"Après"}</p>
              </div>
            </div>
          </div>
          {c.description && <p style={{ color: muted, fontSize: 11, textAlign: "center", margin: "8px 0 0" }}>{c.description}</p>}
        </div>
      )

      case "portfolio_work": {
        const works = Array.from({length:50},(_,k)=>{const i=k+1;return [c[`work${i}_img`],c[`work${i}_title`],c[`work${i}_desc`]]}).filter(([,t])=>t)
        return (
          <div style={{ padding: "10px 16px", ...s }}>
            {c.title && <p style={{ color: muted, fontSize: 10, textTransform: "uppercase", letterSpacing: 2, margin: "0 0 12px" }}>{c.title}</p>}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
              {works.map(([img,title,desc],i) => (
                <div key={i} style={{ borderRadius: 10, overflow: "hidden", background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)" }}>
                  {img
                    ? <img src={String(img)} alt="" style={{ width: "100%", height: 80, objectFit: "cover", display: "block" }} />
                    : <div style={{ height: 80, background: primary+"08", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 24 }}>📂</div>}
                  <div style={{ padding: "8px" }}>
                    <p style={{ color: text, fontSize: 11, fontWeight: 700, margin: "0 0 2px" }}>{title}</p>
                    {desc && <p style={{ color: muted, fontSize: 9, margin: 0 }}>{desc}</p>}
                  </div>
                </div>
              ))}
            </div>
            {c.cta_label && <div style={{ marginTop: 10, background: primary+"10", border: `1px solid ${primary}25`, borderRadius: 9, padding: "10px", textAlign: "center", fontSize: 12, fontWeight: 700, color: primary }}>{c.cta_label}</div>}
          </div>
        )
      }

      case "google_reviews_block": {
        if (!hasPublishableContent("google_reviews_block", c)) return <div style={{ padding: "10px 16px", ...s }}>{emptyHint("⭐", "Ajoutez un avis ou une note", HIDDEN_WHEN_EMPTY_NOTE)}</div>
        const reviews = Array.from({length:50},(_,k)=>{const i=k+1;return [c[`r${i}_name`],c[`r${i}_text`],c[`r${i}_stars`]]}).filter(([n])=>n)
        return (
          <div style={{ padding: "10px 16px", ...s }}>
            {(c.avg_rating || c.title) && (
              <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12, padding: "10px 12px", background: "rgba(251,191,36,0.06)", border: "1px solid rgba(251,191,36,0.2)", borderRadius: 10 }}>
                <div style={{ textAlign: "center" }}>
                  <p style={{ color: "#FBBF24", fontSize: 28, fontWeight: 700, margin: 0, fontFamily: theme.fontDisplay }}>{c.avg_rating||"5.0"}</p>
                  <StarRow fills={starRow(c.avg_rating || 5)} size={10} />
                </div>
                <div>
                  <p style={{ color: text, fontSize: 12, fontWeight: 700, margin: "0 0 2px" }}>{c.title||"Avis clients"}</p>
                  {c.total_reviews && <p style={{ color: muted, fontSize: 10, margin: 0 }}>{c.total_reviews} avis</p>}
                </div>
              </div>
            )}
            <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
              {reviews.map(([name,text_review,stars],i) => (
                <div key={i} style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 9, padding: "10px 12px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                    <p style={{ color: text, fontSize: 11, fontWeight: 700, margin: 0 }}>{name}</p>
                    <StarRow fills={starRow(stars || 5)} size={10} />
                  </div>
                  <p style={{ color: muted, fontSize: 11, margin: 0, lineHeight: 1.5, fontStyle: "italic" }}>"{text_review}"</p>
                </div>
              ))}
            </div>
            {c.google_url && <div style={{ marginTop: 10, display: "flex", alignItems: "center", justifyContent: "center", gap: 6, color: "#4285F4", fontSize: 11, fontWeight: 600 }}>
              <span>📍</span> Voir sur Google
            </div>}
          </div>
        )
      }

      case "business_stats": {
        const stats = Array.from({length:50},(_,k)=>{const i=k+1;return [c[`stat${i}_icon`],c[`stat${i}_value`],c[`stat${i}_label`]]}).filter(([,v])=>v)
        return (
          <div style={{ padding: "10px 16px", ...s }}>
            <div style={{ display: "grid", gridTemplateColumns: stats.length<=2 ? "1fr 1fr" : stats.length===3 ? "1fr 1fr 1fr" : "1fr 1fr", gap: 8 }}>
              {stats.map(([icon,value,label],i) => (
                <div key={i} style={{ background: primary+"08", border: `1px solid ${primary}15`, borderRadius: 12, padding: "14px 10px", textAlign: "center" }}>
                  {icon && <span style={{ fontSize: 20, display: "block", marginBottom: 5 }}>{icon}</span>}
                  <p style={{ color: primary, fontSize: 22, fontWeight: 700, margin: "0 0 3px", fontFamily: theme.fontDisplay, lineHeight: 1 }}>{value}</p>
                  <p style={{ color: muted, fontSize: 10, margin: 0 }}>{label}</p>
                </div>
              ))}
            </div>
          </div>
        )
      }

      case "partners": {
        const logos = Array.from({length:50},(_,k)=>{const i=k+1;return [c[`logo${i}_img`],c[`logo${i}_name`]]}).filter(([,n])=>n)
        return (
          <div style={{ padding: "10px 16px", ...s }}>
            {c.title && <p style={{ color: muted, fontSize: 10, textTransform: "uppercase", letterSpacing: 2, margin: "0 0 12px", textAlign: "center" }}>{c.title}</p>}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 8 }}>
              {logos.length===0
                ? [0,1,2,3,4,5].map(i => <div key={i} style={{ height: 44, background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", color: muted, fontSize: 10 }}>Logo</div>)
                : logos.map(([img,name],i) => (
                  <div key={i} style={{ height: 44, background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden" }}>
                    {img
                      ? <img src={String(img)} alt={String(name)} style={{ maxWidth: "100%", maxHeight: "100%", objectFit: "contain", padding: 4 }} />
                      : <p style={{ color: muted, fontSize: 10, margin: 0, textAlign: "center", padding: "0 4px" }}>{name}</p>}
                  </div>
                ))}
            </div>
          </div>
        )
      }

      case "brands": {
        const brandList = Array.from({length:50},(_,k)=>{const i=k+1;return [c[`brand${i}_icon`],c[`brand${i}_name`]]}).filter(([,n])=>n)
        return (
          <div style={{ padding: "10px 16px", ...s }}>
            {c.title && <p style={{ color: muted, fontSize: 10, textTransform: "uppercase", letterSpacing: 2, margin: "0 0 10px" }}>{c.title}</p>}
            <div style={{ display: "flex", flexWrap: "wrap", gap: 7 }}>
              {brandList.map(([icon,name],i) => (
                <div key={i} style={{ display: "flex", alignItems: "center", gap: 6, background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 20, padding: "5px 12px" }}>
                  {icon && <span style={{ fontSize: 16 }}>{icon}</span>}
                  <span style={{ color: text, fontSize: 11, fontWeight: 600 }}>{name}</span>
                </div>
              ))}
            </div>
          </div>
        )
      }

      case "gift_card": return (
        <div style={{ padding: "10px 16px", ...s }}>
          <div style={{ background: `linear-gradient(135deg,#EC489915,#F472B610)`, border: "1.5px solid rgba(236,72,153,0.3)", borderRadius: 14, padding: "16px" }}>
            <div style={{ textAlign: "center", marginBottom: 12 }}>
              <span style={{ fontSize: 32 }}>🎁</span>
              <p style={{ color: text, fontSize: 15, fontWeight: 700, margin: "6px 0 3px" }}>{c.title||"Offrez une expérience"}</p>
              {c.description && <p style={{ color: muted, fontSize: 11, margin: 0 }}>{c.description}</p>}
            </div>
            <div style={{ display: "flex", gap: 7, justifyContent: "center", marginBottom: 12 }}>
              {[c.amount1, c.amount2, c.amount3].filter(Boolean).map((amount, i) => (
                <div key={i} style={{ background: i===1 ? "rgba(236,72,153,0.2)" : "rgba(255,255,255,0.06)", border: `1.5px solid ${i===1 ? "rgba(236,72,153,0.4)" : "rgba(255,255,255,0.1)"}`, borderRadius: 10, padding: "10px 14px", textAlign: "center" }}>
                  <p style={{ color: i===1 ? "#EC4899" : text, fontSize: 16, fontWeight: 700, margin: 0 }}>{amount}</p>
                </div>
              ))}
            </div>
            {c.cta_label && <div style={{ background: "linear-gradient(90deg,#EC4899,#F472B6)", borderRadius: 10, padding: "11px", textAlign: "center", fontSize: 13, fontWeight: 700, color: "#fff" }}>{c.cta_label}</div>}
          </div>
        </div>
      )

      case "services_pricing": {
        const svcs = Array.from({length:50},(_,k)=>{const i=k+1;return [c[`s${i}_name`],c[`s${i}_price`],c[`s${i}_duration`],c[`s${i}_desc`]]}).filter(([n])=>n)
        return (
          <div style={{ padding: "10px 16px", ...s }}>
            {c.title && <p style={{ color: muted, fontSize: 10, textTransform: "uppercase", letterSpacing: 2, margin: "0 0 10px" }}>{c.title}</p>}
            <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
              {svcs.map(([name, price, duration, desc], i) => (
                <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 0", borderBottom: i<svcs.length-1 ? `1px solid ${dayMode?"rgba(0,0,0,0.06)":"rgba(255,255,255,0.05)"}` : "none" }}>
                  <div style={{ flex: 1 }}>
                    <p style={{ color: text, fontSize: 13, fontWeight: 600, margin: "0 0 1px" }}>{name}</p>
                    {desc && <p style={{ color: muted, fontSize: 10, margin: 0 }}>{desc}</p>}
                  </div>
                  <div style={{ textAlign: "right", flexShrink: 0 }}>
                    <p style={{ color: primary, fontSize: 14, fontWeight: 700, margin: 0 }}>{price}</p>
                    {duration && <p style={{ color: muted, fontSize: 10, margin: 0 }}>{duration}</p>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )
      }

      case "external_shop": return (
        <div style={{ padding: "4px 16px 12px", ...s }}>
          {c.description && <p style={{ color: muted, fontSize: 12, margin: "0 0 10px", textAlign: "center" }}>{c.description}</p>}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 9, background: primary+"10", border: `1.5px solid ${primary}30`, borderRadius: 12, padding: "14px 18px" }}>
            <span style={{ fontSize: 20 }}>🛒</span>
            <div>
              <p style={{ color: text, fontSize: 13, fontWeight: 700, margin: 0 }}>{c.label||"Voir la boutique"}</p>
              {c.platform && <p style={{ color: muted, fontSize: 9, margin: 0 }}>via {c.platform}</p>}
            </div>
            <ExternalLink size={13} color={primary} style={{ marginLeft: "auto" }} />
          </div>
        </div>
      )

      case "advantages": {
        const advList = Array.from({length:50},(_,k)=>c[`adv${k+1}`]).filter(Boolean)
        return (
          <div style={{ padding: "10px 16px", ...s }}>
            {c.title && <p style={{ color: muted, fontSize: 10, textTransform: "uppercase", letterSpacing: 2, margin: "0 0 10px" }}>{c.title}</p>}
            <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
              {advList.length===0
                ? <p style={{ color: muted, fontSize: 11, textAlign: "center", margin: 0 }}>Ajoutez vos avantages</p>
                : advList.map((adv: string, i: number) => (
                  <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, padding: "9px 12px", background: "rgba(57,255,143,0.05)", border: "1px solid rgba(57,255,143,0.15)", borderRadius: 9 }}>
                    <p style={{ color: text, fontSize: 13, margin: 0 }}>{adv}</p>
                  </div>
                ))}
            </div>
          </div>
        )
      }

      case "reassurance": {
        const guarantees = Array.from({length:50},(_,k)=>{const i=k+1;return [c[`g${i}_icon`],c[`g${i}_label`],c[`g${i}_desc`]]}).filter(([,l])=>l)
        return (
          <div style={{ padding: "10px 16px", ...s }}>
            <div style={{ display: "grid", gridTemplateColumns: guarantees.length<=2 ? "1fr 1fr" : "1fr 1fr", gap: 8 }}>
              {guarantees.map(([icon, label, desc], i) => (
                <div key={i} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 5, background: "rgba(57,255,143,0.05)", border: "1px solid rgba(57,255,143,0.12)", borderRadius: 11, padding: "12px 8px", textAlign: "center" }}>
                  <span style={{ fontSize: 24 }}>{icon||"✅"}</span>
                  <p style={{ color: text, fontSize: 11, fontWeight: 700, margin: 0 }}>{label}</p>
                  {desc && <p style={{ color: muted, fontSize: 9, margin: 0 }}>{desc}</p>}
                </div>
              ))}
            </div>
          </div>
        )
      }

      case "sales_counter": return !hasPublishableContent("sales_counter", c)
        ? <div style={{ padding: "10px 16px", ...s }}>{emptyHint("🔥", "Ajoutez le nombre de ventes", HIDDEN_WHEN_EMPTY_NOTE)}</div>
        : (
        <div style={{ padding: "10px 16px", ...s }}>
          <div style={{ background: "rgba(239,68,68,0.08)", border: "1.5px solid rgba(239,68,68,0.25)", borderRadius: 14, padding: "16px", textAlign: "center" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 10, marginBottom: c.subtext ? 6 : 0 }}>
              <span style={{ fontSize: 28 }}>{c.emoji||"🔥"}</span>
              <div>
                <p style={{ color: "#EF4444", fontSize: 28, fontWeight: 700, margin: 0, fontFamily: theme.fontDisplay, lineHeight: 1 }}>
                  <span style={{ color: text }}>{c.count}</span> <span style={{ fontSize: 14 }}>{c.label||"ventes"}</span>
                </p>
                {c.period && <p style={{ color: muted, fontSize: 11, margin: 0 }}>{c.period}</p>}
              </div>
            </div>
            {c.subtext && <p style={{ color: "#EF4444", fontSize: 12, fontWeight: 600, margin: 0 }}>{c.subtext}</p>}
          </div>
        </div>
      )

      case "popular_products": {
        const tops = Array.from({length:50},(_,k)=>{const i=k+1;return [c[`p${i}_rank`],c[`p${i}_img`],c[`p${i}_name`],c[`p${i}_price`],c[`p${i}_sales`],c[`p${i}_url`]]}).filter(([,, n])=>n)
        return (
          <div style={{ padding: "10px 16px", ...s }}>
            {c.title && <p style={{ color: muted, fontSize: 10, textTransform: "uppercase", letterSpacing: 2, margin: "0 0 12px" }}>{c.title}</p>}
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {tops.map(([rank, img, name, price, sales], i) => (
                <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, background: i===0 ? primary+"08" : "rgba(255,255,255,0.03)", border: `1px solid ${i===0 ? primary+"20" : "rgba(255,255,255,0.07)"}`, borderRadius: 10, padding: "10px 12px" }}>
                  {rank && <span style={{ fontSize: 18, flexShrink: 0 }}>{rank.split(" ")[0]}</span>}
                  {img
                    ? <img src={String(img)} alt="" style={{ width: 40, height: 40, objectFit: "cover", borderRadius: 7, flexShrink: 0 }} />
                    : <div style={{ width: 40, height: 40, background: primary+"10", borderRadius: 7, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20, flexShrink: 0 }}>🏆</div>}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ color: text, fontSize: 12, fontWeight: 700, margin: "0 0 1px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{name}</p>
                    {sales && <p style={{ color: muted, fontSize: 10, margin: 0 }}>{sales}</p>}
                  </div>
                  {price && <span style={{ color: primary, fontSize: 13, fontWeight: 700, flexShrink: 0 }}>{price}</span>}
                </div>
              ))}
            </div>
          </div>
        )
      }


      case "image_carousel": {
        const imgs = [c.img1,c.img2,c.img3,c.img4,c.img5,c.img6,c.img7,c.img8,c.img9,c.img10,c.img11,c.img12].filter(Boolean)
        return (
          <div style={{ padding: "10px 16px", ...s }}>
            {c.title && <p style={{ color: muted, fontSize: 10, textTransform: "uppercase", letterSpacing: 2, margin: "0 0 10px" }}>{c.title}</p>}
            <div style={{ display: "flex", gap: 8, overflowX: "auto", paddingBottom: 4 }} className="iphone-scroll">
              {imgs.length===0
                ? [0,1,2].map(i => <div key={i} style={{ width: 120, height: 120, flexShrink: 0, background: "rgba(78,205,196,0.06)", border: "1px solid rgba(78,205,196,0.15)", borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 24 }}>📸</div>)
                : imgs.map((img, i) => <img key={i} src={String(img)} alt="" style={{ width: 120, height: 120, flexShrink: 0, objectFit: "cover", borderRadius: 10 }} />)}
            </div>
            <div style={{ display: "flex", justifyContent: "center", gap: 5, marginTop: 8 }}>
              {Array.from({length: Math.max(imgs.length, 3)}).map((_,i) => <div key={i} style={{ width: i===0 ? 16 : 6, height: 6, borderRadius: 3, background: i===0 ? primary : "rgba(255,255,255,0.2)" }} />)}
            </div>
          </div>
        )
      }

      case "media_before_after": return (
        <div style={{ padding: "10px 16px", ...s }}>
          {c.title && <p style={{ color: text, fontSize: 13, fontWeight: 700, margin: "0 0 10px", textAlign: "center" }}>{c.title}</p>}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
            <div style={{ borderRadius: 10, overflow: "hidden" }}>
              {c.before_img
                ? <img src={c.before_img} alt="Avant" style={{ width: "100%", height: 130, objectFit: "cover", display: "block" }} />
                : <div style={{ height: 130, background: "rgba(239,68,68,0.06)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 28 }}>📸</div>}
              <div style={{ background: "rgba(239,68,68,0.15)", padding: "6px", textAlign: "center" }}>
                <p style={{ color: "#EF4444", fontSize: 11, fontWeight: 700, margin: 0 }}>{c.before_label||"Avant"}</p>
              </div>
            </div>
            <div style={{ borderRadius: 10, overflow: "hidden" }}>
              {c.after_img
                ? <img src={c.after_img} alt="Après" style={{ width: "100%", height: 130, objectFit: "cover", display: "block" }} />
                : <div style={{ height: 130, background: "rgba(57,255,143,0.06)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 28 }}>✨</div>}
              <div style={{ background: "rgba(57,255,143,0.15)", padding: "6px", textAlign: "center" }}>
                <p style={{ color: "var(--success)", fontSize: 11, fontWeight: 700, margin: 0 }}>{c.after_label||"Après"}</p>
              </div>
            </div>
          </div>
          {c.description && <p style={{ color: muted, fontSize: 11, textAlign: "center", margin: "8px 0 0" }}>{c.description}</p>}
        </div>
      )

      case "video_local": return (
        <div style={{ padding: "10px 16px", ...s }}>
          {c.src
            ? <div style={{ borderRadius: 12, overflow: "hidden", background: "#000" }}>
                <video src={c.src} poster={c.poster||undefined} controls style={{ width: "100%", maxHeight: 200, display: "block" }}
                  autoPlay={c.autoplay==="yes"} loop={c.loop==="yes"} muted={c.muted!=="no"} playsInline />
              </div>
            : <div style={{ background: "rgba(78,205,196,0.06)", border: "1px dashed rgba(78,205,196,0.25)", borderRadius: 12, padding: "32px", textAlign: "center" }}>
                {c.poster ? <img src={c.poster} alt="" style={{ width: "100%", maxHeight: 160, objectFit: "cover", borderRadius: 8, display: "block", marginBottom: 10 }} /> : null}
                <span style={{ fontSize: 32 }}>🎥</span>
                <p style={{ color: muted, fontSize: 11, margin: "8px 0 0" }}>Ajoutez l&apos;URL de votre vidéo</p>
              </div>}
          {c.title && <p style={{ color: text, fontSize: 13, fontWeight: 600, margin: "8px 0 0", textAlign: "center" }}>{c.title}</p>}
        </div>
      )

      case "audio_player": return (
        <div style={{ padding: "10px 16px", ...s }}>
          <div style={{ background: "rgba(167,139,250,0.06)", border: "1.5px solid rgba(167,139,250,0.22)", borderRadius: 14, padding: "13px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 11 }}>
              {c.cover
                ? <img src={c.cover} alt="" style={{ width: 46, height: 46, borderRadius: 9, objectFit: "cover", flexShrink: 0 }} />
                : <div style={{ width: 46, height: 46, borderRadius: 9, background: "rgba(167,139,250,0.15)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22, flexShrink: 0 }}>🎧</div>}
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ color: text, fontSize: 13, fontWeight: 700, margin: "0 0 1px" }}>{c.title||"Écouter"}</p>
                {c.artist && <p style={{ color: muted, fontSize: 11, margin: 0 }}>{c.artist}</p>}
                <div style={{ height: 4, background: "rgba(255,255,255,0.1)", borderRadius: 2, marginTop: 6 }}><div style={{ width: "35%", height: "100%", background: "#A78BFA", borderRadius: 2 }} /></div>
              </div>
              <span style={{ fontSize: 18 }}>▶️</span>
            </div>
          </div>
        </div>
      )
      case "pdf_viewer": return (
        <div style={{ padding: "10px 16px", ...s }}>
          <div style={{ background: "rgba(78,205,196,0.06)", border: "1.5px solid rgba(78,205,196,0.2)", borderRadius: 14, padding: "16px" }}>
            {c.cover && <div style={{ borderRadius: 10, overflow: "hidden", marginBottom: 12 }}><img src={c.cover} alt="" style={{ width: "100%", maxHeight: 180, objectFit: "cover", display: "block" }} /></div>}
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: c.url ? 12 : 0 }}>
              {!c.cover && <div style={{ width: 44, height: 52, background: "rgba(239,68,68,0.12)", border: "1px solid rgba(239,68,68,0.25)", borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22, flexShrink: 0 }}>📄</div>}
              <div style={{ flex: 1 }}>
                <p style={{ color: text, fontSize: 13, fontWeight: 700, margin: "0 0 2px" }}>{c.title||"Mon document PDF"}</p>
                {c.description && <p style={{ color: muted, fontSize: 11, margin: "0 0 2px" }}>{c.description}</p>}
                {(c.pages || c.file_size) && <p style={{ color: muted, fontSize: 10, margin: 0 }}>📄 PDF{c.pages ? ` · ${c.pages} pages` : ""}{c.file_size ? ` · ${c.file_size}` : ""}</p>}
              </div>
            </div>
            {c.url && (
              <div style={{ background: "rgba(0,0,0,0.3)", borderRadius: 8, overflow: "hidden", marginBottom: 10, height: 120, display: "flex", alignItems: "center", justifyContent: "center" }}>
                <p style={{ color: muted, fontSize: 11, margin: 0 }}>Aperçu PDF</p>
              </div>
            )}
            <div style={{ display: "flex", gap: 7 }}>
              {c.cta_label && <div style={{ flex: 1, background: `linear-gradient(90deg,${primary},${primary}cc)`, borderRadius: 8, padding: "9px", textAlign: "center", fontSize: 12, fontWeight: 700, color: "#080808" }}>{c.cta_label}</div>}
              {c.show_download!=="no" && <div style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, padding: "9px 14px", fontSize: 12, fontWeight: 600, color: muted }}>↓ PDF</div>}
            </div>
          </div>
        </div>
      )

      case "youtube_gallery": {
        const videos = Array.from({length:50},(_,k)=>{const i=k+1;return [c[`video${i}_url`],c[`video${i}_title`]]}).filter(([u])=>u)
        return (
          <div style={{ padding: "10px 16px", ...s }}>
            {c.title && <p style={{ color: muted, fontSize: 10, textTransform: "uppercase", letterSpacing: 2, margin: "0 0 12px" }}>{c.title}</p>}
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {videos.length===0
                ? [0,1,2].map(i => <div key={i} style={{ height: 90, background: "rgba(255,0,0,0.06)", border: "1px solid rgba(255,0,0,0.15)", borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center", gap: 10 }}><span style={{ fontSize: 24 }}>▶️</span><p style={{ color: muted, fontSize: 11, margin: 0 }}>Vidéo YouTube {i+1}</p></div>)
                : videos.map(([url, title], i) => {
                    const videoId = youtubeId(String(url))
                    return (
                      <div key={i} style={{ borderRadius: 10, overflow: "hidden", background: "#000", position: "relative" }}>
                        {videoId
                          ? <img src={`https://img.youtube.com/vi/${videoId}/mqdefault.jpg`} alt="" style={{ width: "100%", height: 90, objectFit: "cover", display: "block" }} />
                          : <div style={{ height: 90, background: "rgba(255,0,0,0.06)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 24 }}>▶️</div>}
                        <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
                          <div style={{ width: 32, height: 32, background: "rgba(255,0,0,0.9)", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center" }}>
                            <span style={{ color: "#fff", fontSize: 12, marginLeft: 2 }}>▶</span>
                          </div>
                        </div>
                        {title && <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, background: "linear-gradient(transparent,rgba(0,0,0,0.8))", padding: "20px 10px 8px" }}><p style={{ color: "#fff", fontSize: 10, margin: 0 }}>{title}</p></div>}
                      </div>
                    )
                  })}
            </div>
            {c.cta_label && <div style={{ marginTop: 10, background: "rgba(255,0,0,0.1)", border: "1px solid rgba(255,0,0,0.25)", borderRadius: 9, padding: "10px", textAlign: "center", fontSize: 12, fontWeight: 700, color: "#FF0000" }}>{c.cta_label}</div>}
          </div>
        )
      }

      case "tiktok_gallery": return (
        <div style={{ padding: "10px 16px", ...s }}>
          {c.title && <p style={{ color: muted, fontSize: 10, textTransform: "uppercase", letterSpacing: 2, margin: "0 0 10px" }}>{c.title}</p>}
          {c.username && <p style={{ color: muted, fontSize: 11, margin: "0 0 10px", textAlign: "center" }}>{c.username}</p>}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 5 }}>
            {[c.video1_url, c.video2_url, c.video3_url].map((url, i) => (
              <div key={i} style={{ aspectRatio: "9/16", background: "rgba(245,240,232,0.06)", border: "1px solid rgba(245,240,232,0.1)", borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20 }}>
                {url ? "🎵" : "📱"}
              </div>
            ))}
          </div>
          {c.cta_label && <div style={{ marginTop: 10, background: "rgba(245,240,232,0.06)", border: "1px solid rgba(245,240,232,0.15)", borderRadius: 9, padding: "10px", textAlign: "center", fontSize: 12, fontWeight: 700, color: text }}>{c.cta_label}</div>}
        </div>
      )

      case "video_testimonials": {
        const testi = Array.from({length:50},(_,k)=>{const i=k+1;return [c[`t${i}_video_url`],c[`t${i}_name`],c[`t${i}_company`],c[`t${i}_quote`]]}).filter(([,n])=>n)
        return (
          <div style={{ padding: "10px 16px", ...s }}>
            {c.title && <p style={{ color: muted, fontSize: 10, textTransform: "uppercase", letterSpacing: 2, margin: "0 0 12px" }}>{c.title}</p>}
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {testi.length===0
                ? <div style={{ height: 80, background: "rgba(78,205,196,0.06)", border: "1px dashed rgba(78,205,196,0.2)", borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center", color: muted, fontSize: 11 }}>Ajoutez vos témoignages vidéo</div>
                : testi.map(([url, name, company, quote], i) => {
                  const videoId = youtubeId(String(url||""))
                  return (
                    <div key={i} style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 12, overflow: "hidden" }}>
                      {videoId
                        ? <div style={{ position: "relative" }}>
                            <img src={`https://img.youtube.com/vi/${videoId}/mqdefault.jpg`} alt="" style={{ width: "100%", height: 100, objectFit: "cover", display: "block" }} />
                            <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
                              <div style={{ width: 36, height: 36, background: "rgba(0,0,0,0.7)", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center" }}><span style={{ color: "#fff", fontSize: 14, marginLeft: 2 }}>▶</span></div>
                            </div>
                          </div>
                        : <div style={{ height: 80, background: "rgba(78,205,196,0.06)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 24 }}>🎬</div>}
                      <div style={{ padding: "10px 12px" }}>
                        {quote && <p style={{ color: muted, fontSize: 11, fontStyle: "italic", margin: "0 0 7px" }}>"{quote}"</p>}
                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                          <div style={{ width: 26, height: 26, borderRadius: "50%", background: primary+"20", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13 }}>👤</div>
                          <div><p style={{ color: text, fontSize: 11, fontWeight: 700, margin: 0 }}>{name}</p>{company && <p style={{ color: muted, fontSize: 9, margin: 0 }}>{company}</p>}</div>
                        </div>
                      </div>
                    </div>
                  )
                })}
            </div>
          </div>
        )
      }

      case "logo_wall": {
        const logos = Array.from({length:50},(_,k)=>{const i=k+1;return [c[`logo${i}`],c[`logo${i}_name`]]}).filter(([,n])=>n)
        return (
          <div style={{ padding: "10px 16px", ...s }}>
            {c.title && <p style={{ color: muted, fontSize: 10, textTransform: "uppercase", letterSpacing: 2, margin: "0 0 12px", textAlign: "center" }}>{c.title}</p>}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 8 }}>
              {logos.length===0
                ? [0,1,2,3,4,5,6,7].map(i => <div key={i} style={{ height: 36, background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 7, display: "flex", alignItems: "center", justifyContent: "center", color: muted, fontSize: 9 }}>Logo</div>)
                : logos.map(([img,name],i) => (
                  <div key={i} style={{ height: 36, background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 7, display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden" }}>
                    {img
                      ? <img src={String(img)} alt={String(name)} style={{ maxWidth: "90%", maxHeight: "90%", objectFit: "contain" }} />
                      : <p style={{ color: muted, fontSize: 8, margin: 0, textAlign: "center", padding: "0 3px", lineHeight: 1.2 }}>{name}</p>}
                  </div>
                ))}
            </div>
          </div>
        )
      }


      case "stats_block": {
        const stats = Array.from({length:50},(_,k)=>{const i=k+1;return [c[`s${i}_icon`],c[`s${i}_value`],c[`s${i}_label`]]}).filter(([,v])=>v)
        return (
          <div style={{ padding: "10px 16px", ...s }}>
            {!hasPublishableContent("stats_block", c) ? emptyHint("📊", "Ajoutez une statistique", HIDDEN_WHEN_EMPTY_NOTE) : (
            <div style={{ display: "grid", gridTemplateColumns: stats.length<=2 ? "1fr 1fr" : stats.length===3 ? "1fr 1fr 1fr" : "1fr 1fr", gap: 8 }}>
              {stats.map(([icon,value,label],i) => (
                  <div key={i} style={{ background: primary+"08", border: `1px solid ${primary}15`, borderRadius: 12, padding: "14px 10px", textAlign: "center" }}>
                    {icon && <span style={{ fontSize: 20, display: "block", marginBottom: 4 }}>{icon}</span>}
                    <p style={{ color: primary, fontSize: 22, fontWeight: 700, margin: "0 0 3px", fontFamily: theme.fontDisplay, lineHeight: 1 }}>{value}</p>
                    <p style={{ color: muted, fontSize: 10, margin: 0 }}>{label}</p>
                  </div>
                ))}
            </div>)}
          </div>
        )
      }

      case "scan_counter": return !hasPublishableContent("scan_counter", c)
        ? <div style={{ padding: "14px 16px", ...s }}>{emptyHint("📱", "Ajoutez le nombre de scans", HIDDEN_WHEN_EMPTY_NOTE)}</div>
        : (
        <div style={{ padding: "14px 16px", textAlign: "center", ...s }}>
          <div style={{ display: "inline-flex", alignItems: "center", gap: 10, background: "rgba(57,255,143,0.08)", border: "1px solid rgba(57,255,143,0.2)", borderRadius: 14, padding: "16px 24px" }}>
            <span style={{ fontSize: 28 }}>{c.emoji||"📱"}</span>
            <div>
              <p style={{ color: primary, fontSize: 32, fontWeight: 700, margin: 0, fontFamily: theme.fontDisplay, lineHeight: 1 }}>{c.count}</p>
              <p style={{ color: muted, fontSize: 11, margin: "3px 0 0" }}>{c.label}</p>
            </div>
          </div>
        </div>
      )

      case "timeline": {
        const events = Array.from({length:50},(_,k)=>k+1).map(i => ({ i, date: c[`e${i}_date`], title: c[`e${i}_title`], desc: c[`e${i}_desc`], icon: (c[`e${i}_icon`]||"").trim(), linkUrl: (c[`e${i}_link_url`]||"").trim(), linkLabel: (c[`e${i}_link_label`]||"").trim() })).filter(e => e.title || e.date)
        const horizontal = c.layout === "Horizontale"
        const list = events
        if (list.length === 0) return (
          <div style={{ padding: "10px 16px", ...s }}>
            {c.title && <p style={{ color: muted, fontSize: 10, textTransform: "uppercase", letterSpacing: 2, margin: "0 0 12px" }}>{c.title}</p>}
            {emptyHint("📅", "Ajoutez une étape")}
          </div>
        )
        return (
          <div style={{ padding: "10px 16px", ...s }}>
            {c.title && <p style={{ color: muted, fontSize: 10, textTransform: "uppercase", letterSpacing: 2, margin: "0 0 14px" }}>{c.title}</p>}
            {horizontal ? (
              <div style={{ display: "flex", gap: 9, overflowX: "auto", padding: "2px 0 6px" }}>
                {list.map((e,pos) => (
                  <div key={e.i} style={{ flexShrink: 0, width: 150, background: "rgba(255,255,255,0.03)", border: `1px solid ${pos===list.length-1 ? "var(--success)30" : "rgba(255,255,255,0.07)"}`, borderRadius: 12, padding: "12px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 6 }}>
                      <div style={{ width: 26, height: 26, borderRadius: 7, background: `${primary}12`, border: `1px solid ${primary}25`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13 }}>{e.icon || "•"}</div>
                      <InlineEditable as="p" editable={canEdit} value={e.date} onCommit={edit(`e${e.i}_date`)} style={{ color: primary, fontSize: 11, fontWeight: 700, margin: 0 }} />
                    </div>
                    <InlineEditable as="p" editable={canEdit} value={e.title} onCommit={edit(`e${e.i}_title`)} style={{ color: text, fontSize: 12, fontWeight: 600, margin: "0 0 2px" }} />
                    {e.desc && <InlineEditable as="p" editable={canEdit} value={e.desc} multiline onCommit={edit(`e${e.i}_desc`)} style={{ color: muted, fontSize: 10.5, margin: 0 }} />}
                    {e.linkUrl && <span style={{ display: "inline-flex", alignItems: "center", gap: 3, marginTop: 5, color: primary, fontSize: 10, fontWeight: 700 }}>{e.linkLabel || "En savoir plus"} ↗</span>}
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ position: "relative", paddingLeft: 20 }}>
                <div style={{ position: "absolute", left: 6, top: 8, bottom: 8, width: 2, background: `linear-gradient(180deg,${primary},${primary}40)`, borderRadius: 1 }} />
                {list.map((e,pos) => (
                  <div key={e.i} style={{ position: "relative", marginBottom: pos<list.length-1 ? 16 : 0 }}>
                    <div style={{ position: "absolute", left: -17, top: 4, width: 10, height: 10, borderRadius: "50%", background: pos===list.length-1 ? "var(--success)" : primary, border: `2px solid ${pos===list.length-1 ? "var(--success)40" : primary+"40"}` }} />
                    <InlineEditable as="p" editable={canEdit} value={e.date} onCommit={edit(`e${e.i}_date`)} style={{ color: primary, fontSize: 11, fontWeight: 700, margin: "0 0 2px" }} />
                    <p style={{ color: text, fontSize: 12, fontWeight: 600, margin: "0 0 2px", display: "flex", alignItems: "center", gap: 5 }}>{e.icon && <span style={{ fontSize: 13 }}>{e.icon}</span>}<InlineEditable as="span" editable={canEdit} value={e.title} onCommit={edit(`e${e.i}_title`)} /></p>
                    {e.desc && <InlineEditable as="p" editable={canEdit} value={e.desc} multiline onCommit={edit(`e${e.i}_desc`)} style={{ color: muted, fontSize: 11, margin: 0 }} />}
                    {e.linkUrl && <span style={{ display: "inline-flex", alignItems: "center", gap: 3, marginTop: 5, color: primary, fontSize: 10.5, fontWeight: 700 }}>{e.linkLabel || "En savoir plus"} ↗</span>}
                  </div>
                ))}
              </div>
            )}
          </div>
        )
      }

      case "process_steps": {
        const steps = Array.from({length:50},(_,k)=>k+1).map(i=>({ i, icon: c[`s${i}_icon`], title: c[`s${i}_title`], desc: c[`s${i}_desc`] })).filter(st=>st.title)
        return (
          <div style={{ padding: "10px 16px", ...s }}>
            {c.title && <p style={{ color: muted, fontSize: 10, textTransform: "uppercase", letterSpacing: 2, margin: "0 0 12px" }}>{c.title}</p>}
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {!hasPublishableContent("process_steps", c)
                ? emptyHint("🪜", "Ajoutez une étape", HIDDEN_WHEN_EMPTY_NOTE)
                : steps.map((st,pos) => (
                  <div key={st.i} style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
                    <div style={{ width: 32, height: 32, borderRadius: "50%", background: `linear-gradient(135deg,${primary},${accent})`, color: "#080808", display: "flex", alignItems: "center", justifyContent: "center", fontSize: st.icon ? 16 : 13, fontWeight: 700, flexShrink: 0 }}>{st.icon||pos+1}</div>
                    <div style={{ flex: 1 }}>
                      <InlineEditable as="p" editable={canEdit} value={st.title} onCommit={edit(`s${st.i}_title`)} style={{ color: text, fontSize: 12, fontWeight: 700, margin: "4px 0 2px" }} />
                      {st.desc && <InlineEditable as="p" editable={canEdit} value={st.desc} multiline onCommit={edit(`s${st.i}_desc`)} style={{ color: muted, fontSize: 11, margin: 0 }} />}
                    </div>
                    {pos < steps.length-1 && <div style={{ position: "absolute", left: 31, marginTop: 32, width: 2, height: 16, background: primary+"30" }} />}
                  </div>
                ))}
            </div>
          </div>
        )
      }

      case "values": {
        const vals = Array.from({length:50},(_,k)=>k+1).map(i=>({ i, icon: c[`v${i}_icon`], label: c[`v${i}_label`], desc: c[`v${i}_desc`] })).filter(v=>v.label)
        return (
          <div style={{ padding: "10px 16px", ...s }}>
            {c.title && <p style={{ color: muted, fontSize: 10, textTransform: "uppercase", letterSpacing: 2, margin: "0 0 10px" }}>{c.title}</p>}
            {!hasPublishableContent("values", c) ? emptyHint("🎯", "Ajoutez une valeur", HIDDEN_WHEN_EMPTY_NOTE) : (
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
              {vals.map((v,pos) => (
                <div key={pos} style={{ background: primary+"08", border: `1px solid ${primary}15`, borderRadius: 12, padding: "12px 10px", textAlign: "center" }}>
                  <span style={{ fontSize: 24, display: "block", marginBottom: 6 }}>{v.icon}</span>
                  <InlineEditable as="p" editable={canEdit} value={v.label} onCommit={edit(`v${v.i}_label`)} style={{ color: text, fontSize: 12, fontWeight: 700, margin: v.desc ? "0 0 3px" : "0" }} />
                  {v.desc && <InlineEditable as="p" editable={canEdit} value={v.desc} multiline onCommit={edit(`v${v.i}_desc`)} style={{ color: muted, fontSize: 10, margin: 0 }} />}
                </div>
              ))}
            </div>)}
          </div>
        )
      }

      case "team": {
        const members = Array.from({length:50},(_,k)=>k+1).map(i => ({ i, photo: c[`m${i}_photo`], name: c[`m${i}_name`], role: c[`m${i}_role`], bio: c[`m${i}_bio`], phone: (c[`m${i}_phone`]||"").trim(), email: (c[`m${i}_email`]||"").trim(), linkedin: (c[`m${i}_linkedin`]||"").trim() })).filter(m => m.name)
        const grid = c.layout === "Grille"
        const contactDots = (m: any) => {
          const ic = [] as string[]
          if (m.phone) ic.push("📞"); if (m.email) ic.push("✉️"); if (m.linkedin) ic.push("in")
          return ic.length ? <div style={{ display: "flex", gap: 5, marginTop: 6, justifyContent: grid ? "center" : "flex-start" }}>{ic.map((x,k) => <span key={k} style={{ width: 22, height: 22, borderRadius: 6, background: `${primary}12`, border: `1px solid ${primary}25`, display: "inline-flex", alignItems: "center", justifyContent: "center", fontSize: 11 }}>{x}</span>)}</div> : null
        }
        const av = (m: any, size: number) => m.photo
          ? <img src={String(m.photo)} alt={String(m.name)} style={{ width: size, height: size, borderRadius: "50%", objectFit: "cover", flexShrink: 0, border: `2px solid ${primary}40` }} />
          : <div style={{ width: size, height: size, borderRadius: "50%", background: `linear-gradient(135deg,${primary},${accent})`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: size*0.4, fontWeight: 700, color: "#080808", flexShrink: 0 }}>{String(m.name)[0]}</div>
        const list = members
        return (
          <div style={{ padding: "10px 16px", ...s }}>
            {c.title && <p style={{ color: muted, fontSize: 10, textTransform: "uppercase", letterSpacing: 2, margin: "0 0 12px" }}>{c.title}</p>}
            {list.length === 0 && emptyHint("👥", "Ajoutez un membre")}
            {grid ? (
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                {list.map((m) => (
                  <div key={m.i} style={{ display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center", background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 12, padding: "13px 10px" }}>
                    {av(m, 52)}
                    <InlineEditable as="p" editable={canEdit} value={m.name} onCommit={edit(`m${m.i}_name`)} style={{ color: text, fontSize: 12.5, fontWeight: 700, margin: "6px 0 1px" }} />
                    {m.role && <InlineEditable as="p" editable={canEdit} value={m.role} onCommit={edit(`m${m.i}_role`)} style={{ color: primary, fontSize: 11, margin: 0 }} />}
                    {m.bio && <InlineEditable as="p" editable={canEdit} value={m.bio} multiline onCommit={edit(`m${m.i}_bio`)} style={{ color: muted, fontSize: 10, margin: "2px 0 0" }} />}
                    {contactDots(m)}
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {list.map((m) => (
                  <div key={m.i} style={{ display: "flex", alignItems: "flex-start", gap: 12, background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 12, padding: "12px 14px" }}>
                    {av(m, 44)}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <InlineEditable as="p" editable={canEdit} value={m.name} onCommit={edit(`m${m.i}_name`)} style={{ color: text, fontSize: 13, fontWeight: 700, margin: "0 0 2px" }} />
                      {m.role && <InlineEditable as="p" editable={canEdit} value={m.role} onCommit={edit(`m${m.i}_role`)} style={{ color: primary, fontSize: 11, margin: "0 0 1px" }} />}
                      {m.bio && <InlineEditable as="p" editable={canEdit} value={m.bio} multiline onCommit={edit(`m${m.i}_bio`)} style={{ color: muted, fontSize: 10, margin: 0 }} />}
                      {contactDots(m)}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )
      }

      case "engagements": {
        const engList = [c.e1,c.e2,c.e3,c.e4,c.e5,c.e6].filter(Boolean)
        return (
          <div style={{ padding: "10px 16px", ...s }}>
            {c.title && <p style={{ color: muted, fontSize: 10, textTransform: "uppercase", letterSpacing: 2, margin: "0 0 10px" }}>{c.title}</p>}
            <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
              {!hasPublishableContent("engagements", c) ? emptyHint("✅", "Ajoutez un engagement", HIDDEN_WHEN_EMPTY_NOTE) : engList.map((eng: string, i: number) => (
                <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 12px", background: "rgba(57,255,143,0.05)", border: "1px solid rgba(57,255,143,0.15)", borderRadius: 10 }}>
                  <p style={{ color: text, fontSize: 13, margin: 0, lineHeight: 1.4 }}>{eng}</p>
                </div>
              ))}
            </div>
          </div>
        )
      }

      case "trust_badge": {
        const badges = Array.from({length:50},(_,k)=>{const i=k+1;return [c[`b${i}_icon`],c[`b${i}_label`]]}).filter(([,l])=>l)
        return (
          <div style={{ padding: "10px 16px", ...s }}>
            {c.title && <p style={{ color: muted, fontSize: 10, textTransform: "uppercase", letterSpacing: 2, margin: "0 0 10px", textAlign: "center" }}>{c.title}</p>}
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8, justifyContent: "center" }}>
              {!hasPublishableContent("trust_badge", c) ? emptyHint("🏆", "Ajoutez un badge de confiance", HIDDEN_WHEN_EMPTY_NOTE) : badges.map(([icon,label],i) => (
                <div key={i} style={{ display: "flex", alignItems: "center", gap: 7, background: "rgba(57,255,143,0.08)", border: "1px solid rgba(57,255,143,0.2)", borderRadius: 20, padding: "7px 14px" }}>
                  <span style={{ color: "var(--success)", fontSize: 14, fontWeight: 700 }}>{icon}</span>
                  <span style={{ color: text, fontSize: 12, fontWeight: 600 }}>{label}</span>
                </div>
              ))}
            </div>
          </div>
        )
      }

      case "quote_block": return !hasPublishableContent("quote_block", c)
        ? <div style={{ padding: "14px 16px", ...s }}>{emptyHint("❝", "Ajoutez une citation", HIDDEN_WHEN_EMPTY_NOTE)}</div>
        : (
        <div style={{ padding: "14px 16px", ...s }}>
          <div style={{ background: primary+"08", border: `1px solid ${primary}20`, borderRadius: 14, padding: "18px 16px", position: "relative" }}>
            <span style={{ position: "absolute", top: 10, left: 14, color: primary, fontSize: 36, fontFamily: "Georgia, serif", lineHeight: 1, opacity: 0.4 }}>"</span>
            <p style={{ color: text, fontSize: 15, fontStyle: "italic", lineHeight: 1.7, margin: "0 0 10px", paddingTop: 10, fontFamily: theme.fontDisplay }}>{c.quote}</p>
            {c.author && (
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <div style={{ width: 24, height: 2, background: primary, borderRadius: 1 }} />
                <p style={{ color: primary, fontSize: 12, fontWeight: 700, margin: 0 }}>{c.author}{c.source ? <span style={{ color: muted, fontWeight: 400 }}> — {c.source}</span> : null}</p>
              </div>
            )}
          </div>
        </div>
      )

      case "announcement": {
        const meta = announcementMeta(c.type)
        const color = (typeof c.color === "string" && /^#[0-9a-fA-F]{6}$/.test(c.color.trim())) ? c.color.trim() : meta.color
        const icon = (c.emoji||"").trim() || meta.icon
        const compact = c.style === "Compact"
        return (
          <div style={{ padding: "8px 16px", ...s }}>
            <div style={{ background: `${color}14`, border: `1.5px solid ${color}44`, borderRadius: 12, padding: compact ? "10px 13px" : "14px 16px", position: "relative" }}>
              <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
                <span style={{ fontSize: compact ? 18 : 22, flexShrink: 0 }}>{icon}</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  {c.title && <InlineEditable as="p" editable={canEdit} value={c.title} onCommit={edit("title")} style={{ color, fontSize: compact ? 12 : 13, fontWeight: 700, margin: "0 0 4px", paddingRight: c.dismissible==="Oui" ? 16 : 0 }} />}
                  {c.message && <InlineEditable as="p" editable={canEdit} value={c.message} multiline onCommit={edit("message")} style={{ color: text, fontSize: 12, margin: 0, lineHeight: 1.5, whiteSpace: "pre-wrap" }} />}
                  {c.cta_label && c.cta_url && <span style={{ display: "inline-flex", alignItems: "center", gap: 4, marginTop: 8, color, fontSize: 11.5, fontWeight: 700 }}>{c.cta_label} →</span>}
                </div>
                {c.dismissible==="Oui" && <span style={{ position: "absolute", top: 7, right: 9, color, opacity: 0.6, fontSize: 16, lineHeight: 1 }}>×</span>}
              </div>
            </div>
          </div>
        )
      }

      case "info_table": {
        const rows = Array.from({length:50},(_,k)=>{const i=k+1;return [c[`r${i}_label`],c[`r${i}_value`]]}).filter(([l])=>l)
        return (
          <div style={{ padding: "10px 16px", ...s }}>
            {c.title && <p style={{ color: muted, fontSize: 10, textTransform: "uppercase", letterSpacing: 2, margin: "0 0 10px" }}>{c.title}</p>}
            <div style={{ display: "flex", flexDirection: "column" }}>
              {!hasPublishableContent("info_table", c) ? emptyHint("📋", "Ajoutez une ligne d'info", HIDDEN_WHEN_EMPTY_NOTE) : rows.map(([label,value],i,arr) => (
                <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "9px 0", borderBottom: i<arr.length-1 ? `1px solid ${dayMode?"rgba(0,0,0,0.06)":"rgba(255,255,255,0.05)"}` : "none" }}>
                  <span style={{ color: muted, fontSize: 12 }}>{label}</span>
                  <span style={{ color: text, fontSize: 12, fontWeight: 600 }}>{value}</span>
                </div>
              ))}
            </div>
          </div>
        )
      }

      case "founder_message": return !hasPublishableContent("founder_message", c)
        ? <div style={{ padding: "12px 16px", ...s }}>{emptyHint("✍️", "Ajoutez le message du fondateur", HIDDEN_WHEN_EMPTY_NOTE)}</div>
        : (
        <div style={{ padding: "12px 16px", ...s }}>
          <div style={{ background: primary+"06", border: `1px solid ${primary}15`, borderRadius: 14, padding: "16px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12 }}>
              {c.photo
                ? <img src={c.photo} alt="" style={{ width: 50, height: 50, borderRadius: "50%", objectFit: "cover", flexShrink: 0, border: `2px solid ${primary}40` }} />
                : <div style={{ width: 50, height: 50, borderRadius: "50%", background: `linear-gradient(135deg,${primary},${accent})`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22, flexShrink: 0 }}>👤</div>}
              <div>
                <p style={{ color: text, fontSize: 14, fontWeight: 700, margin: "0 0 2px", fontFamily: theme.fontDisplay }}>{c.name}</p>
                <p style={{ color: primary, fontSize: 11, margin: 0 }}>{c.role}</p>
              </div>
            </div>
            <p style={{ color: muted, fontSize: 12, lineHeight: 1.7, margin: c.signature ? "0 0 10px" : "0", fontStyle: "italic" }}>"{c.message||"Bienvenue ! Notre mission est de vous offrir le meilleur service possible."}"</p>
            {c.signature && <p style={{ color: primary, fontSize: 14, fontFamily: "Georgia, serif", margin: 0, fontStyle: "italic" }}>{c.signature}</p>}
          </div>
        </div>
      )

      case "documents": {
        const docs = Array.from({length:50},(_,k)=>k+1).map(i => ({ type: c[`d${i}_type`], title: c[`d${i}_title`], desc: c[`d${i}_desc`]||"", url: (c[`d${i}_url`]||"").trim(), meta: c[`d${i}_meta`]||"" })).filter(d => d.title)
        const list = docs
        return (
          <div style={{ padding: "10px 16px", ...s }}>
            {c.title && <p style={{ color: muted, fontSize: 10, textTransform: "uppercase", letterSpacing: 2, margin: "0 0 10px" }}>{c.title}</p>}
            {list.length === 0 && emptyHint("📄", "Ajoutez un document")}
            <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
              {list.map((d,i) => {
                const dm = docTypeMeta(d.type)
                return (
                  <div key={i} style={{ display: "flex", alignItems: "center", gap: 11, background: dayMode?"rgba(0,0,0,0.03)":"rgba(255,255,255,0.03)", border: `1px solid ${dayMode?"rgba(0,0,0,0.07)":"rgba(255,255,255,0.07)"}`, borderRadius: 11, padding: "10px 12px" }}>
                    <div style={{ width: 38, height: 38, borderRadius: 9, background: `${dm.color}14`, border: `1px solid ${dm.color}30`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, flexShrink: 0 }}>{dm.icon}</div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ color: text, fontSize: 13, fontWeight: 700, margin: "0 0 1px" }}>{d.title}</p>
                      {d.desc && <p style={{ color: muted, fontSize: 11, margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{d.desc}</p>}
                      {d.meta && <p style={{ color: muted, fontSize: 10, margin: "2px 0 0", opacity: 0.8 }}>{d.type ? `${d.type} · ` : ""}{d.meta}</p>}
                    </div>
                    <span style={{ flexShrink: 0, color: primary, fontSize: 11, fontWeight: 700 }}>{docActionLabel(d.type)} ↓</span>
                  </div>
                )
              })}
            </div>
          </div>
        )
      }

      case "google_maps_embed": { const mapSrc = mapEmbedUrl(c.address, c.embed_url, c.zoom); return (
        <div style={{ padding: "10px 16px", ...s }}>
          {c.label && <p style={{ color: muted, fontSize: 10, textTransform: "uppercase", letterSpacing: 2, margin: "0 0 10px" }}>{c.label}</p>}
          {mapSrc
            ? <iframe src={mapSrc} title={c.label||"Carte"} width="100%" height={c.height==="lg" ? 200 : c.height==="sm" ? 120 : 160} style={{ border: "none", borderRadius: 12, display: "block" }} loading="lazy" referrerPolicy="no-referrer-when-downgrade" />
            : <div style={{ height: 160, background: "rgba(66,133,244,0.06)", border: "1px solid rgba(66,133,244,0.2)", borderRadius: 12, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 8 }}>
                <span style={{ fontSize: 32 }}>🗺️</span>
                <p style={{ color: muted, fontSize: 11, margin: 0, textAlign: "center" }}>{c.address||"Ajoutez une adresse"}</p>
              </div>}
          {c.show_directions!=="no" && c.address && (
            <a href={`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(c.address)}`} target="_blank" rel="noopener noreferrer"
              style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 7, marginTop: 10, background: "rgba(66,133,244,0.1)", border: "1px solid rgba(66,133,244,0.25)", borderRadius: 9, padding: "10px", color: "#4285F4", textDecoration: "none", fontSize: 12, fontWeight: 700 }}>
              🧭 Obtenir l&apos;itinéraire
            </a>
          )}
        </div>
      ) }

      case "quote_form": return (
        <div style={{ padding: "10px 16px", ...s }}>
          <p style={{ color: text, fontSize: 14, fontWeight: 700, margin: "0 0 4px" }}>{c.title||"Demander un devis"}</p>
          {c.description && <p style={{ color: muted, fontSize: 11, margin: "0 0 12px" }}>{c.description}</p>}
          <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
            {["Nom complet","Email"].map(f => <div key={f} style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 8, padding: "8px 11px", color: muted, fontSize: 11 }}>{f}</div>)}
            {c.show_phone!=="no" && <div style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 8, padding: "8px 11px", color: muted, fontSize: 11 }}>Téléphone</div>}
            {c.show_budget==="yes" && <div style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 8, padding: "8px 11px", color: muted, fontSize: 11 }}>Budget estimé</div>}
            <div style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 8, padding: "8px 11px 36px", color: muted, fontSize: 11 }}>Description du projet</div>
            <div style={{ background: `linear-gradient(90deg,${primary},${primary}cc)`, borderRadius: 9, padding: "12px", textAlign: "center", fontSize: 13, fontWeight: 700, color: "#080808" }}>{c.button_label||"Envoyer ma demande"}</div>
          </div>
        </div>
      )

      case "quick_contact": return (
        <div style={{ padding: "10px 16px", ...s }}>
          {c.title && <p style={{ color: muted, fontSize: 10, textTransform: "uppercase", letterSpacing: 2, margin: "0 0 10px" }}>{c.title}</p>}
          <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
            {[
              [c.phone, "📞", "var(--success)", `tel:${c.phone}`],
              [c.email, "✉️", "var(--action)", `mailto:${c.email}`],
              [c.whatsapp, "💬", "#25D366", `https://wa.me/${c.whatsapp}`],
              [c.address, "📍", primary, null],
              [c.hours, "🕐", MUTED, null],
            ].filter(([v]) => v).map(([value, icon, color, href], i) => (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: 12, background: (color as string)+"10", border: `1px solid ${color as string}20`, borderRadius: 10, padding: "11px 14px" }}>
                <span style={{ fontSize: 18, flexShrink: 0 }}>{icon}</span>
                <span style={{ color: text, fontSize: 12, fontWeight: 600, flex: 1 }}>{value}</span>
                {href && <ExternalLink size={11} color={color as string} style={{ flexShrink: 0 }} />}
              </div>
            ))}
          </div>
        </div>
      )

      case "multi_contact": {
        const contacts = Array.from({length:50},(_,k)=>{const i=k+1;return [c[`c${i}_photo`],c[`c${i}_name`],c[`c${i}_role`],c[`c${i}_phone`],c[`c${i}_email`]]}).filter(([,n])=>n)
        return (
          <div style={{ padding: "10px 16px", ...s }}>
            {c.title && <p style={{ color: muted, fontSize: 10, textTransform: "uppercase", letterSpacing: 2, margin: "0 0 12px" }}>{c.title}</p>}
            <div style={{ display: "flex", flexDirection: "column", gap: 9 }}>
              {contacts.length===0
                ? [0,1].map(i => (
                  <div key={i} style={{ display: "flex", alignItems: "center", gap: 12, background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 12, padding: "12px 14px" }}>
                    <div style={{ width: 40, height: 40, borderRadius: "50%", background: primary+"20", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, flexShrink: 0 }}>👤</div>
                    <div style={{ flex: 1 }}><p style={{ color: text, fontSize: 12, fontWeight: 700, margin: "0 0 2px" }}>Prénom Nom</p><p style={{ color: primary, fontSize: 10, margin: "0 0 3px" }}>Poste</p></div>
                  </div>
                ))
                : contacts.map(([photo,name,role,phone,email],i) => (
                  <div key={i} style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 12, padding: "12px 14px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: (phone||email) ? 10 : 0 }}>
                      {photo
                        ? <img src={String(photo)} alt="" style={{ width: 40, height: 40, borderRadius: "50%", objectFit: "cover", flexShrink: 0, border: `2px solid ${primary}40` }} />
                        : <div style={{ width: 40, height: 40, borderRadius: "50%", background: `linear-gradient(135deg,${primary},${accent})`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, fontWeight: 700, color: "#080808", flexShrink: 0 }}>{String(name)[0]}</div>}
                      <div><p style={{ color: text, fontSize: 12, fontWeight: 700, margin: "0 0 2px" }}>{name}</p><p style={{ color: primary, fontSize: 10, margin: 0 }}>{role}</p></div>
                    </div>
                    {(phone||email) && (
                      <div style={{ display: "flex", gap: 7 }}>
                        {phone && <a href={`tel:${phone}`} style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 5, background: "rgba(57,255,143,0.08)", border: "1px solid rgba(57,255,143,0.2)", borderRadius: 8, padding: "7px", color: "var(--success)", textDecoration: "none", fontSize: 11, fontWeight: 600 }}>📞 Appeler</a>}
                        {email && <a href={`mailto:${email}`} style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 5, background: "rgba(56,189,248,0.08)", border: "1px solid rgba(56,189,248,0.2)", borderRadius: 8, padding: "7px", color: "var(--action)", textDecoration: "none", fontSize: 11, fontWeight: 600 }}>✉️ Email</a>}
                      </div>
                    )}
                  </div>
                ))}
            </div>
          </div>
        )
      }

      case "service_area": {
        const cities = [c.city1,c.city2,c.city3,c.city4,c.city5,c.city6].filter(Boolean)
        return (
          <div style={{ padding: "10px 16px", ...s }}>
            {c.title && <p style={{ color: muted, fontSize: 10, textTransform: "uppercase", letterSpacing: 2, margin: "0 0 10px" }}>{c.title}</p>}
            {c.area && (
              <div style={{ display: "flex", alignItems: "center", gap: 10, background: "rgba(66,133,244,0.08)", border: "1px solid rgba(66,133,244,0.2)", borderRadius: 10, padding: "11px 14px", marginBottom: 10 }}>
                <span style={{ fontSize: 20 }}>📍</span>
                <div>
                  <p style={{ color: text, fontSize: 13, fontWeight: 700, margin: "0 0 2px" }}>{c.area}</p>
                  {c.radius && <p style={{ color: muted, fontSize: 11, margin: 0 }}>{c.radius}</p>}
                </div>
              </div>
            )}
            {cities.length>0 && (
              <div style={{ display: "flex", flexWrap: "wrap", gap: 7 }}>
                {cities.map((city: string, i: number) => (
                  <span key={i} style={{ background: "rgba(66,133,244,0.08)", border: "1px solid rgba(66,133,244,0.2)", borderRadius: 20, padding: "5px 12px", color: text, fontSize: 12 }}>📍 {city}</span>
                ))}
              </div>
            )}
            {c.note && <p style={{ color: muted, fontSize: 11, margin: "10px 0 0", fontStyle: "italic" }}>{c.note}</p>}
          </div>
        )
      }

      case "legal_info": {
        const rows = [
          ["Société", c.company_name],
          ["SIRET", c.siret],
          ["N° TVA", c.tva],
          ["Siège social", c.address],
          ["Capital", c.capital],
          ["RCS", c.rcs],
          ["Email", c.email],
        ].filter(([,v])=>v)
        return (
          <div style={{ padding: "10px 16px", ...s }}>
            {c.title && <p style={{ color: muted, fontSize: 10, textTransform: "uppercase", letterSpacing: 2, margin: "0 0 10px" }}>{c.title}</p>}
            <div style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 12, overflow: "hidden" }}>
              {rows.map(([label,value],i) => (
                <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "9px 14px", borderBottom: i<rows.length-1 ? "1px solid rgba(255,255,255,0.05)" : "none" }}>
                  <span style={{ color: muted, fontSize: 11 }}>{label}</span>
                  <span style={{ color: text, fontSize: 11, fontWeight: 600, maxWidth: "55%", textAlign: "right", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{value}</span>
                </div>
              ))}
              {rows.length===0 && <p style={{ color: muted, fontSize: 11, textAlign: "center", padding: "20px", margin: 0 }}>Ajoutez vos informations légales</p>}
            </div>
          </div>
        )
      }

      case "business_certifications": {
        const certs = Array.from({length:50},(_,k)=>{const i=k+1;return [c[`c${i}_icon`],c[`c${i}_name`],c[`c${i}_org`],c[`c${i}_year`]]}).filter(([,n])=>n)
        return (
          <div style={{ padding: "10px 16px", ...s }}>
            {c.title && <p style={{ color: muted, fontSize: 10, textTransform: "uppercase", letterSpacing: 2, margin: "0 0 10px" }}>{c.title}</p>}
            <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
              {!hasPublishableContent("business_certifications", c)
                ? emptyHint("🏅", "Ajoutez une certification", HIDDEN_WHEN_EMPTY_NOTE)
                : certs.map(([icon,name,org,year],i) => (
                  <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, background: primary+"06", border: `1px solid ${primary}15`, borderRadius: 11, padding: "10px 12px" }}>
                    <span style={{ fontSize: 20 }}>{icon||"🏅"}</span>
                    <div style={{ flex: 1 }}><p style={{ color: text, fontSize: 12, fontWeight: 700, margin: 0 }}>{name}</p><p style={{ color: muted, fontSize: 10, margin: 0 }}>{org}{year ? ` · ${year}` : ""}</p></div>
                    <Check size={13} color={primary} />
                  </div>
                ))}
            </div>
          </div>
        )
      }

      case "on_site_services": {
        const svcs = Array.from({length:50},(_,k)=>{const i=k+1;return [c[`s${i}_icon`],c[`s${i}_label`]]}).filter(([,l])=>l)
        return (
          <div style={{ padding: "10px 16px", ...s }}>
            {c.title && <p style={{ color: muted, fontSize: 10, textTransform: "uppercase", letterSpacing: 2, margin: "0 0 10px" }}>{c.title}</p>}
            {!hasPublishableContent("on_site_services", c) ? emptyHint("🛎️", "Ajoutez un service sur place", HIDDEN_WHEN_EMPTY_NOTE) : (
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
              {svcs.map(([icon,label],i) => (
                <div key={i} style={{ display: "flex", alignItems: "center", gap: 9, background: "rgba(66,133,244,0.06)", border: "1px solid rgba(66,133,244,0.15)", borderRadius: 10, padding: "10px 12px" }}>
                  <span style={{ fontSize: 20, flexShrink: 0 }}>{icon}</span>
                  <span style={{ color: text, fontSize: 11, fontWeight: 600 }}>{label}</span>
                </div>
              ))}
            </div>)}
          </div>
        )
      }


      case "spotify_embed": {
        const spotifySrc = spotifyEmbedUrl(c.url)
        const height = c.size==="lg" ? 352 : c.size==="sm" ? 80 : 152
        return (
          <div style={{ padding: "10px 16px", ...s }}>
            {spotifySrc
              ? <iframe src={spotifySrc} title="Lecteur Spotify"
                  width="100%" height={height} style={{ borderRadius: 12, border: "none", display: "block" }}
                  allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture" loading="lazy" />
              : <div style={{ height: 152, background: "rgba(29,185,84,0.08)", border: "1.5px solid rgba(29,185,84,0.25)", borderRadius: 12, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 8 }}>
                  <span style={{ fontSize: 32 }}>🎧</span>
                  <p style={{ color: muted, fontSize: 11, margin: 0 }}>Ajoutez un lien Spotify</p>
                  <p style={{ color: MUTED, fontSize: 9, margin: 0 }}>track / album / playlist / artist</p>
                </div>}
          </div>
        )
      }

      case "latest_release": return (
        <div style={{ padding: "10px 16px", ...s }}>
          <div style={{ background: "linear-gradient(135deg,rgba(29,185,84,0.12),rgba(29,185,84,0.06))", border: "1.5px solid rgba(29,185,84,0.3)", borderRadius: 16, overflow: "hidden" }}>
            {c.badge && <div style={{ background: "rgba(29,185,84,0.2)", padding: "6px 14px", fontSize: 11, fontWeight: 700, color: "#1DB954", textAlign: "center" }}>{c.badge}</div>}
            <div style={{ display: "flex", gap: 14, padding: "14px" }}>
              {c.cover
                ? <img src={c.cover} alt="" style={{ width: 80, height: 80, borderRadius: 10, objectFit: "cover", flexShrink: 0, boxShadow: "0 4px 16px rgba(0,0,0,0.4)" }} />
                : <div style={{ width: 80, height: 80, borderRadius: 10, background: "rgba(29,185,84,0.15)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 32, flexShrink: 0 }}>🎵</div>}
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ color: text, fontSize: 16, fontWeight: 700, margin: "0 0 3px", fontFamily: theme.fontDisplay, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{c.title||"Nouveau titre"}</p>
                {c.artist && <p style={{ color: muted, fontSize: 12, margin: "0 0 4px" }}>{c.artist}</p>}
                {c.release_date && <p style={{ color: "#1DB954", fontSize: 11, margin: "0 0 10px", fontWeight: 600 }}>📅 {c.release_date}</p>}
                <div style={{ display: "flex", gap: 6 }}>
                  {c.spotify_url && <div style={{ background: "#1DB954", borderRadius: 6, padding: "4px 10px", fontSize: 10, fontWeight: 700, color: "#000" }}>🎧 Spotify</div>}
                  {c.apple_url && <div style={{ background: "rgba(252,60,68,0.15)", border: "1px solid rgba(252,60,68,0.3)", borderRadius: 6, padding: "4px 10px", fontSize: 10, fontWeight: 700, color: "#FC3C44" }}>🍎 Apple</div>}
                  {c.youtube_url && <div style={{ background: "rgba(255,0,0,0.12)", border: "1px solid rgba(255,0,0,0.25)", borderRadius: 6, padding: "4px 10px", fontSize: 10, fontWeight: 700, color: "#FF0000" }}>▶ YT</div>}
                </div>
              </div>
            </div>
          </div>
        </div>
      )

      case "discography": {
        const albums = Array.from({length:50},(_,k)=>{const i=k+1;return [c[`a${i}_cover`],c[`a${i}_title`],c[`a${i}_year`],c[`a${i}_type`],c[`a${i}_url`]]}).filter(([,t])=>t)
        return (
          <div style={{ padding: "10px 16px", ...s }}>
            {c.title && <p style={{ color: muted, fontSize: 10, textTransform: "uppercase", letterSpacing: 2, margin: "0 0 12px" }}>{c.title}</p>}
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {!hasPublishableContent("discography", c)
                ? emptyHint("💿", "Ajoutez un album ou single", HIDDEN_WHEN_EMPTY_NOTE)
                : albums.map(([cover,title,year,type],i) => (
                  <div key={i} style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    {cover
                      ? <img src={String(cover)} alt="" style={{ width: 52, height: 52, borderRadius: 8, objectFit: "cover", flexShrink: 0 }} />
                      : <div style={{ width: 52, height: 52, borderRadius: 8, background: "rgba(29,185,84,0.1)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 24, flexShrink: 0 }}>💿</div>}
                    <div style={{ flex: 1 }}>
                      <p style={{ color: text, fontSize: 13, fontWeight: 700, margin: "0 0 2px" }}>{title}</p>
                      <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
                        <span style={{ background: "rgba(29,185,84,0.12)", border: "1px solid rgba(29,185,84,0.2)", borderRadius: 10, padding: "1px 7px", color: "#1DB954", fontSize: 9, fontWeight: 700 }}>{type}</span>
                        <span style={{ color: muted, fontSize: 11 }}>{year}</span>
                      </div>
                    </div>
                    <span style={{ color: "#1DB954", fontSize: 18 }}>▶</span>
                  </div>
                ))}
            </div>
          </div>
        )
      }

      case "album_block": return (
        <div style={{ padding: "10px 16px", ...s }}>
          <div style={{ background: "rgba(29,185,84,0.06)", border: "1px solid rgba(29,185,84,0.2)", borderRadius: 14, overflow: "hidden" }}>
            {c.cover
              ? <img src={c.cover} alt="" style={{ width: "100%", height: 160, objectFit: "cover", display: "block" }} />
              : <div style={{ height: 140, background: "rgba(29,185,84,0.08)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 48 }}>💿</div>}
            <div style={{ padding: "14px" }}>
              <p style={{ color: text, fontSize: 18, fontWeight: 700, margin: "0 0 3px", fontFamily: theme.fontDisplay }}>{c.title||"Mon Album"}</p>
              {c.artist && <p style={{ color: muted, fontSize: 12, margin: "0 0 3px" }}>{c.artist}</p>}
              <div style={{ display: "flex", gap: 10, marginBottom: c.description ? 10 : 12 }}>
                {c.year && <span style={{ color: "#1DB954", fontSize: 11, fontWeight: 600 }}>{c.year}</span>}
                {c.tracks && <span style={{ color: muted, fontSize: 11 }}>· {c.tracks}</span>}
              </div>
              {c.description && <p style={{ color: muted, fontSize: 12, margin: "0 0 12px", lineHeight: 1.6 }}>{c.description}</p>}
              <div style={{ display: "flex", gap: 7, marginBottom: 12 }}>
                {c.spotify_url && <div style={{ flex: 1, background: "#1DB954", borderRadius: 8, padding: "8px", textAlign: "center", fontSize: 11, fontWeight: 700, color: "#000" }}>🎧 Spotify</div>}
                {c.apple_url && <div style={{ flex: 1, background: "rgba(252,60,68,0.15)", border: "1px solid rgba(252,60,68,0.3)", borderRadius: 8, padding: "8px", textAlign: "center", fontSize: 11, fontWeight: 700, color: "#FC3C44" }}>🍎 Apple</div>}
                {c.deezer_url && <div style={{ flex: 1, background: "rgba(162,56,255,0.12)", border: "1px solid rgba(162,56,255,0.25)", borderRadius: 8, padding: "8px", textAlign: "center", fontSize: 11, fontWeight: 700, color: "#A238FF" }}>🎶 Deezer</div>}
              </div>
              {!c.spotify_url && !c.apple_url && !c.deezer_url && c.cta_label && (
                <div style={{ background: "#1DB954", borderRadius: 9, padding: "11px", textAlign: "center", fontSize: 13, fontWeight: 700, color: "#000" }}>{c.cta_label}</div>
              )}
            </div>
          </div>
        </div>
      )

      case "playlist_block": return (
        <div style={{ padding: "10px 16px", ...s }}>
          <div style={{ display: "flex", gap: 12, alignItems: "center", marginBottom: 12 }}>
            {c.cover
              ? <img src={c.cover} alt="" style={{ width: 60, height: 60, borderRadius: 10, objectFit: "cover", flexShrink: 0 }} />
              : <div style={{ width: 60, height: 60, borderRadius: 10, background: "rgba(29,185,84,0.12)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 28, flexShrink: 0 }}>📋</div>}
            <div style={{ flex: 1 }}>
              <p style={{ color: text, fontSize: 14, fontWeight: 700, margin: "0 0 3px" }}>{c.title||"Ma Playlist"}</p>
              {c.description && <p style={{ color: muted, fontSize: 11, margin: "0 0 3px" }}>{c.description}</p>}
              {c.tracks_count && <p style={{ color: "#1DB954", fontSize: 11, margin: 0, fontWeight: 600 }}>🎵 {c.tracks_count}</p>}
            </div>
          </div>
          <div style={{ display: "flex", gap: 7 }}>
            {c.spotify_url && <div style={{ flex: 1, background: "#1DB954", borderRadius: 8, padding: "9px", textAlign: "center", fontSize: 11, fontWeight: 700, color: "#000" }}>🎧 Spotify</div>}
            {c.apple_url && <div style={{ flex: 1, background: "rgba(252,60,68,0.15)", border: "1px solid rgba(252,60,68,0.3)", borderRadius: 8, padding: "9px", textAlign: "center", fontSize: 11, fontWeight: 700, color: "#FC3C44" }}>🍎 Apple</div>}
            {c.deezer_url && <div style={{ flex: 1, background: "rgba(162,56,255,0.12)", border: "1px solid rgba(162,56,255,0.25)", borderRadius: 8, padding: "9px", textAlign: "center", fontSize: 11, fontWeight: 700, color: "#A238FF" }}>🎶 Deezer</div>}
            {!c.spotify_url && !c.apple_url && !c.deezer_url && (
              <div style={{ flex: 1, background: "#1DB954", borderRadius: 8, padding: "9px", textAlign: "center", fontSize: 11, fontWeight: 700, color: "#000" }}>{"Écouter la playlist"}</div>
            )}
          </div>
        </div>
      )

      case "concerts": {
        const shows = Array.from({length:50},(_,k)=>{const i=k+1;return [c[`c${i}_date`],c[`c${i}_city`],c[`c${i}_venue`],c[`c${i}_url`]]}).filter(([,city])=>city)
        return (
          <div style={{ padding: "10px 16px", ...s }}>
            {c.title && <p style={{ color: muted, fontSize: 10, textTransform: "uppercase", letterSpacing: 2, margin: "0 0 12px" }}>{c.title}</p>}
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {!hasPublishableContent("concerts", c)
                ? emptyHint("🎫", "Ajoutez une date de concert", HIDDEN_WHEN_EMPTY_NOTE)
                : shows.map(([date,city,venue,url],i) => (
                  <div key={i} style={{ display: "flex", alignItems: "center", gap: 12, background: "rgba(145,70,255,0.06)", border: "1px solid rgba(145,70,255,0.2)", borderRadius: 12, padding: "12px 14px" }}>
                    <div style={{ textAlign: "center", flexShrink: 0, minWidth: 44 }}><p style={{ color: "#9146FF", fontSize: 13, fontWeight: 700, margin: 0, lineHeight: 1.2 }}>{date}</p></div>
                    <div style={{ flex: 1 }}><p style={{ color: text, fontSize: 13, fontWeight: 700, margin: "0 0 2px" }}>{city}</p>{venue && <p style={{ color: muted, fontSize: 11, margin: 0 }}>🎭 {venue}</p>}</div>
                    {url && <div style={{ background: "#9146FF", borderRadius: 7, padding: "6px 12px", fontSize: 11, fontWeight: 700, color: "#fff", flexShrink: 0 }}>Billets →</div>}
                  </div>
                ))}
            </div>
          </div>
        )
      }

      case "ticketing": return (
        <div style={{ padding: "10px 16px", ...s }}>
          <div style={{ background: "rgba(145,70,255,0.08)", border: "1.5px solid rgba(145,70,255,0.3)", borderRadius: 14, padding: "16px" }}>
            <div style={{ display: "flex", gap: 12, alignItems: "flex-start", marginBottom: 14 }}>
              <span style={{ fontSize: 32, flexShrink: 0 }}>🎟️</span>
              <div>
                <p style={{ color: text, fontSize: 14, fontWeight: 700, margin: "0 0 3px" }}>{c.event_name||"Mon Concert"}</p>
                {c.date && <p style={{ color: muted, fontSize: 11, margin: "0 0 2px" }}>📅 {c.date}</p>}
                {c.venue && <p style={{ color: muted, fontSize: 11, margin: "0 0 2px" }}>📍 {c.venue}</p>}
                {c.price && <p style={{ color: "#9146FF", fontSize: 12, fontWeight: 700, margin: 0 }}>💶 {c.price}</p>}
              </div>
            </div>
            <div style={{ background: "#9146FF", borderRadius: 10, padding: "12px", textAlign: "center", fontSize: 13, fontWeight: 700, color: "#fff" }}>
              {c.label||"Acheter mes billets"} {c.platform && c.platform!=="URL personnalisée" ? `— ${c.platform}` : ""}
            </div>
          </div>
        </div>
      )

      case "presave": return (
        <div style={{ padding: "10px 16px", ...s }}>
          <div style={{ background: "linear-gradient(135deg,rgba(29,185,84,0.1),rgba(29,185,84,0.05))", border: "1.5px solid rgba(29,185,84,0.3)", borderRadius: 16, padding: "16px", textAlign: "center" }}>
            {c.cover
              ? <img src={c.cover} alt="" style={{ width: 100, height: 100, borderRadius: 12, objectFit: "cover", margin: "0 auto 12px", display: "block", boxShadow: "0 4px 20px rgba(0,0,0,0.4)" }} />
              : <div style={{ width: 100, height: 100, borderRadius: 12, background: "rgba(29,185,84,0.15)", margin: "0 auto 12px", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 40 }}>💾</div>}
            <p style={{ color: text, fontSize: 16, fontWeight: 700, margin: "0 0 3px", fontFamily: theme.fontDisplay }}>{c.release_name||"Mon prochain titre"}</p>
            {c.release_date && <p style={{ color: "#1DB954", fontSize: 12, fontWeight: 600, margin: "0 0 14px" }}>📅 Sortie le {c.release_date}</p>}
            <div style={{ display: "flex", gap: 8 }}>
              {c.spotify_url && <div style={{ flex: 1, background: "#1DB954", borderRadius: 9, padding: "11px", fontSize: 12, fontWeight: 700, color: "#000" }}>💾 Pré-save Spotify</div>}
              {c.apple_url && <div style={{ flex: 1, background: "rgba(252,60,68,0.15)", border: "1px solid rgba(252,60,68,0.3)", borderRadius: 9, padding: "11px", fontSize: 12, fontWeight: 700, color: "#FC3C44" }}>🍎 Apple Music</div>}
            </div>
            {!c.spotify_url && !c.apple_url && (
              <div style={{ background: "#1DB954", borderRadius: 9, padding: "12px", fontSize: 13, fontWeight: 700, color: "#000" }}>{"Pré-sauvegarder sur Spotify"}</div>
            )}
          </div>
        </div>
      )

      case "booking_request": return (
        <div style={{ padding: "10px 16px", ...s }}>
          <p style={{ color: text, fontSize: 14, fontWeight: 700, margin: "0 0 4px" }}>{c.title||"Réserver pour un événement"}</p>
          {c.description && <p style={{ color: muted, fontSize: 11, margin: "0 0 12px" }}>{c.description}</p>}
          <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
            {["Nom / Organisation","Email","Type d événement","Date souhaitée"].map(f => (
              <div key={f} style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 8, padding: "8px 11px", color: muted, fontSize: 11 }}>{f}</div>
            ))}
            <div style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 8, padding: "8px 11px 32px", color: muted, fontSize: 11 }}>Message</div>
            <div style={{ background: "linear-gradient(90deg,#9146FF,#7B3FCC)", borderRadius: 9, padding: "12px", textAlign: "center", fontSize: 13, fontWeight: 700, color: "#fff" }}>{c.button_label||"Envoyer ma demande"}</div>
          </div>
        </div>
      )

      case "merch": {
        const products = [[c.img1,c.name1,c.price1],[c.img2,c.name2,c.price2],[c.img3,c.name3,c.price3]].filter(([,n])=>n)
        return (
          <div style={{ padding: "10px 16px", ...s }}>
            {c.title && <p style={{ color: muted, fontSize: 10, textTransform: "uppercase", letterSpacing: 2, margin: "0 0 12px" }}>{c.title}</p>}
            {c.description && <p style={{ color: muted, fontSize: 11, margin: "0 0 12px" }}>{c.description}</p>}
            {!hasPublishableContent("merch", c) ? emptyHint("🛍️", "Ajoutez un produit", HIDDEN_WHEN_EMPTY_NOTE) : (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 8, marginBottom: 12 }}>
              {products.map(([img,name,price],i) => (
                <div key={i} style={{ background: "rgba(145,70,255,0.06)", border: "1px solid rgba(145,70,255,0.15)", borderRadius: 10, overflow: "hidden" }}>
                  {img
                    ? <img src={String(img)} alt="" style={{ width: "100%", aspectRatio: "1", objectFit: "cover", display: "block" }} />
                    : <div style={{ aspectRatio: "1", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 24 }}>👕</div>}
                  <div style={{ padding: "6px 8px" }}>
                    <p style={{ color: text, fontSize: 10, fontWeight: 700, margin: "0 0 1px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{name}</p>
                    <p style={{ color: "#9146FF", fontSize: 11, fontWeight: 700, margin: 0 }}>{price}</p>
                  </div>
                </div>
              ))}
            </div>)}
            {c.cta_label && <div style={{ background: "linear-gradient(90deg,#9146FF,#7B3FCC)", borderRadius: 9, padding: "11px", textAlign: "center", fontSize: 13, fontWeight: 700, color: "#fff" }}>{c.cta_label}</div>}
          </div>
        )
      }


      case "event_program": {
        const steps = Array.from({length:50},(_,k)=>{const i=k+1;return [c[`s${i}_time`],c[`s${i}_title`],c[`s${i}_desc`]]}).filter(([,t])=>t)
        return (
          <div style={{ padding: "10px 16px", ...s }}>
            {c.title && <p style={{ color: muted, fontSize: 10, textTransform: "uppercase", letterSpacing: 2, margin: "0 0 12px" }}>{c.title}</p>}
            <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
              {!hasPublishableContent("event_program", c) ? emptyHint("🗓️", "Ajoutez une étape du programme", HIDDEN_WHEN_EMPTY_NOTE) : steps.map(([time,title,desc],i,arr) => (
                <div key={i} style={{ display: "flex", gap: 14, paddingBottom: i<arr.length-1 ? 14 : 0 }}>
                  <div style={{ display: "flex", flexDirection: "column", alignItems: "center", flexShrink: 0 }}>
                    <div style={{ width: 36, height: 36, borderRadius: "50%", background: `linear-gradient(135deg,#EC4899,#F472B6)`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 9, fontWeight: 700, color: "#fff", flexShrink: 0 }}>{time}</div>
                    {i<arr.length-1 && <div style={{ width: 2, flex: 1, background: "rgba(236,72,153,0.2)", marginTop: 4 }} />}
                  </div>
                  <div style={{ flex: 1, paddingTop: 6 }}>
                    <p style={{ color: text, fontSize: 13, fontWeight: 700, margin: "0 0 2px" }}>{title}</p>
                    {desc && <p style={{ color: muted, fontSize: 11, margin: 0 }}>{desc}</p>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )
      }

      case "event_ticketing": return (
        <div style={{ padding: "10px 16px", ...s }}>
          <div style={{ background: "rgba(236,72,153,0.08)", border: "1.5px solid rgba(236,72,153,0.3)", borderRadius: 14, padding: "16px" }}>
            <div style={{ display: "flex", gap: 12, alignItems: "flex-start", marginBottom: 14 }}>
              <span style={{ fontSize: 32, flexShrink: 0 }}>🎟️</span>
              <div style={{ flex: 1 }}>
                <p style={{ color: text, fontSize: 14, fontWeight: 700, margin: "0 0 3px" }}>{c.event_name||"Mon événement"}</p>
                {c.date && <p style={{ color: muted, fontSize: 11, margin: "0 0 2px" }}>📅 {c.date}</p>}
                {c.location && <p style={{ color: muted, fontSize: 11, margin: "0 0 2px" }}>📍 {c.location}</p>}
                {c.price && <p style={{ color: "#EC4899", fontSize: 12, fontWeight: 700, margin: 0 }}>💶 {c.price}</p>}
              </div>
            </div>
            <div style={{ background: "linear-gradient(90deg,#EC4899,#F472B6)", borderRadius: 10, padding: "12px", textAlign: "center", fontSize: 13, fontWeight: 700, color: "#fff" }}>
              {c.label||"Réserver ma place"} {c.platform && c.platform!=="URL personnalisée" ? `— ${c.platform}` : ""}
            </div>
          </div>
        </div>
      )

      case "event_guests": {
        const guests = Array.from({length:50},(_,k)=>{const i=k+1;return [c[`g${i}_photo`],c[`g${i}_name`],c[`g${i}_role`],c[`g${i}_desc`]]}).filter(([,n])=>n)
        return (
          <div style={{ padding: "10px 16px", ...s }}>
            {c.title && <p style={{ color: muted, fontSize: 10, textTransform: "uppercase", letterSpacing: 2, margin: "0 0 12px" }}>{c.title}</p>}
            {!hasPublishableContent("event_guests", c) ? emptyHint("🎤", "Ajoutez un invité", HIDDEN_WHEN_EMPTY_NOTE) : (
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              {guests.map(([photo,name,role,desc],i) => (
                <div key={i} style={{ background: "rgba(236,72,153,0.06)", border: "1px solid rgba(236,72,153,0.15)", borderRadius: 12, padding: "12px 10px", textAlign: "center" }}>
                  {photo
                    ? <img src={String(photo)} alt="" style={{ width: 52, height: 52, borderRadius: "50%", objectFit: "cover", margin: "0 auto 8px", display: "block", border: "2px solid rgba(236,72,153,0.4)" }} />
                    : <div style={{ width: 52, height: 52, borderRadius: "50%", background: "linear-gradient(135deg,#EC4899,#F472B6)", margin: "0 auto 8px", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20, fontWeight: 700, color: "#fff" }}>{String(name)[0]}</div>}
                  <p style={{ color: text, fontSize: 12, fontWeight: 700, margin: "0 0 2px" }}>{name}</p>
                  {role && <span style={{ background: "rgba(236,72,153,0.12)", border: "1px solid rgba(236,72,153,0.25)", borderRadius: 20, padding: "2px 8px", color: "#EC4899", fontSize: 9, fontWeight: 700 }}>{role}</span>}
                  {desc && <p style={{ color: muted, fontSize: 10, margin: "4px 0 0" }}>{desc}</p>}
                </div>
              ))}
            </div>)}
          </div>
        )
      }

      case "lineup": {
        const artists = [[c.a1_name,c.a1_stage,c.a1_time,c.a1_headliner],[c.a2_name,c.a2_stage,c.a2_time,c.a2_headliner],[c.a3_name,c.a3_stage,c.a3_time,c.a3_headliner],[c.a4_name,c.a4_stage,c.a4_time,c.a4_headliner]].filter(([n])=>n)
        return (
          <div style={{ padding: "10px 16px", ...s }}>
            {c.title && <p style={{ color: muted, fontSize: 10, textTransform: "uppercase", letterSpacing: 2, margin: "0 0 12px" }}>{c.title}</p>}
            <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
              {!hasPublishableContent("lineup", c) ? emptyHint("🎧", "Ajoutez un artiste", HIDDEN_WHEN_EMPTY_NOTE) : artists.map(([name,stage,time,headliner],i) => (
                <div key={i} style={{ display: "flex", alignItems: "center", gap: 12, background: headliner==="yes" ? "rgba(236,72,153,0.1)" : "rgba(255,255,255,0.03)", border: `1.5px solid ${headliner==="yes" ? "rgba(236,72,153,0.4)" : "rgba(255,255,255,0.07)"}`, borderRadius: 12, padding: "11px 14px" }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
                      <p style={{ color: headliner==="yes" ? "#EC4899" : text, fontSize: headliner==="yes" ? 15 : 13, fontWeight: 700, margin: 0 }}>{name}</p>
                      {headliner==="yes" && <span style={{ background: "#EC4899", color: "#fff", borderRadius: 10, padding: "1px 7px", fontSize: 8, fontWeight: 700 }}>HEADLINER</span>}
                    </div>
                    {stage && <p style={{ color: muted, fontSize: 10, margin: "2px 0 0" }}>🎭 {stage}</p>}
                  </div>
                  {time && <span style={{ color: headliner==="yes" ? "#EC4899" : muted, fontSize: 12, fontWeight: 700, flexShrink: 0 }}>{time}</span>}
                </div>
              ))}
            </div>
          </div>
        )
      }

      case "event_access": return !hasPublishableContent("event_access", c)
        ? <div style={{ padding: "10px 16px", ...s }}>{emptyHint("🗺️", "Ajoutez une adresse ou un plan", HIDDEN_WHEN_EMPTY_NOTE)}</div>
        : (
        <div style={{ padding: "10px 16px", ...s }}>
          {c.title && <p style={{ color: muted, fontSize: 10, textTransform: "uppercase", letterSpacing: 2, margin: "0 0 10px" }}>{c.title}</p>}
          {(() => { const mapSrc = mapEmbedUrl(c.address, c.embed_url); return mapSrc
            ? <iframe src={mapSrc} title={c.title||"Plan"} width="100%" height={150} style={{ border: "none", borderRadius: 12, display: "block", marginBottom: 10 }} loading="lazy" referrerPolicy="no-referrer-when-downgrade" />
            : <div style={{ height: 130, background: "rgba(236,72,153,0.06)", border: "1px solid rgba(236,72,153,0.2)", borderRadius: 12, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 6, marginBottom: 10 }}>
                <span style={{ fontSize: 28 }}>🗺️</span>
                {c.address && <p style={{ color: muted, fontSize: 11, margin: 0, textAlign: "center", padding: "0 14px" }}>📍 {c.address}</p>}
              </div> })()}
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {[
              [c.transport1_icon, c.transport1_label],
              [c.transport2_icon, c.transport2_label],
              [c.transport3_icon, c.transport3_label],
            ].filter(([,l])=>l).map(([icon,label],i) => (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 9, padding: "9px 12px" }}>
                <span style={{ fontSize: 18 }}>{icon}</span>
                <span style={{ color: text, fontSize: 12 }}>{label}</span>
              </div>
            ))}
          </div>
        </div>
      )

      case "event_register": return (
        <div style={{ padding: "10px 16px", ...s }}>
          <p style={{ color: text, fontSize: 14, fontWeight: 700, margin: "0 0 4px" }}>{c.title||"S inscrire gratuitement"}</p>
          {c.description && <p style={{ color: "#EC4899", fontSize: 11, margin: "0 0 12px", fontWeight: 600 }}>⚡ {c.description}</p>}
          <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
            {["Prénom & Nom","Email"].map(f => <div key={f} style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 8, padding: "8px 11px", color: muted, fontSize: 11 }}>{f}</div>)}
            {c.show_phone==="yes" && <div style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 8, padding: "8px 11px", color: muted, fontSize: 11 }}>Téléphone</div>}
            {c.show_company==="yes" && <div style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 8, padding: "8px 11px", color: muted, fontSize: 11 }}>Société</div>}
            <div style={{ background: "linear-gradient(90deg,#EC4899,#F472B6)", borderRadius: 9, padding: "12px", textAlign: "center", fontSize: 13, fontWeight: 700, color: "#fff" }}>{c.button_label||"Je m inscris"}</div>
          </div>
        </div>
      )

      case "rsvp": return (
        <div style={{ padding: "10px 16px", ...s }}>
          <p style={{ color: text, fontSize: 14, fontWeight: 700, margin: "0 0 4px" }}>{c.title||"Serez-vous présent ?"}</p>
          {c.description && <p style={{ color: muted, fontSize: 11, margin: "0 0 14px" }}>{c.description}</p>}
          <div style={{ display: "flex", gap: 8 }}>
            <button style={{ flex: 2, background: "rgba(57,255,143,0.1)", border: "1.5px solid rgba(57,255,143,0.3)", borderRadius: 10, padding: "12px 8px", color: "var(--success)", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>{c.yes_label||"✅ Oui, je viens"}</button>
            <button style={{ flex: 1, background: "rgba(251,191,36,0.08)", border: "1.5px solid rgba(251,191,36,0.25)", borderRadius: 10, padding: "12px 8px", color: "#FBBF24", fontSize: 11, fontWeight: 700, cursor: "pointer" }}>{c.maybe_label||"🤔 Peut-être"}</button>
            <button style={{ flex: 1, background: "rgba(239,68,68,0.08)", border: "1.5px solid rgba(239,68,68,0.2)", borderRadius: 10, padding: "12px 8px", color: "#EF4444", fontSize: 11, fontWeight: 700, cursor: "pointer" }}>{c.no_label||"❌ Non"}</button>
          </div>
        </div>
      )

      case "add_to_calendar": return (
        <div style={{ padding: "10px 16px", ...s }}>
          <div style={{ background: "rgba(236,72,153,0.06)", border: "1px solid rgba(236,72,153,0.2)", borderRadius: 14, padding: "14px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
              <div style={{ width: 42, height: 42, borderRadius: 10, background: "rgba(236,72,153,0.12)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22, flexShrink: 0 }}>📅</div>
              <div>
                <p style={{ color: text, fontSize: 13, fontWeight: 700, margin: "0 0 2px" }}>{c.event_name||"Mon événement"}</p>
                {c.start_date && <p style={{ color: muted, fontSize: 11, margin: 0 }}>🕐 {c.start_date}</p>}
                {c.location && <p style={{ color: muted, fontSize: 11, margin: 0 }}>📍 {c.location}</p>}
              </div>
            </div>
            <div style={{ display: "flex", gap: 7 }}>
              {(c.google_url || calendarLinks({ name: c.event_name, start: c.start_date, end: c.end_date }))
                ? <>
                    <div style={{ flex: 1, background: "rgba(66,133,244,0.12)", border: "1px solid rgba(66,133,244,0.25)", borderRadius: 8, padding: "9px", textAlign: "center", fontSize: 11, fontWeight: 700, color: "#4285F4" }}>📅 Google</div>
                    <div style={{ flex: 1, background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, padding: "9px", textAlign: "center", fontSize: 11, fontWeight: 700, color: text }}>🍎 Apple</div>
                    <div style={{ flex: 1, background: "rgba(0,120,212,0.1)", border: "1px solid rgba(0,120,212,0.2)", borderRadius: 8, padding: "9px", textAlign: "center", fontSize: 11, fontWeight: 700, color: "#0078D4" }}>📆 Outlook</div>
                  </>
                : <div style={{ flex: 1, background: "linear-gradient(90deg,#EC4899,#F472B6)", borderRadius: 9, padding: "11px", textAlign: "center", fontSize: 13, fontWeight: 700, color: "#fff" }}>{"Ajouter à mon agenda"}</div>}
            </div>
          </div>
        </div>
      )

      case "participants_count": {
        if (!hasPublishableContent("participants_count", c)) return <div style={{ padding: "14px 16px", ...s }}>{emptyHint("👥", "Ajoutez le nombre de participants", HIDDEN_WHEN_EMPTY_NOTE)}</div>
        // Miroir exact du public : sans objectif saisi, aucune barre — et surtout
        // aucun compteur ni objectif inventé, qui donnait un taux de remplissage faux.
        const total = parseInt(c.count || "0")
        const max = parseInt(c.max || "0")
        const pct = max > 0 ? Math.min(100, Math.round((total / max) * 100)) : 0
        return (
          <div style={{ padding: "14px 16px", textAlign: "center", ...s }}>
            <div style={{ display: "inline-flex", alignItems: "center", gap: 12, background: "rgba(236,72,153,0.08)", border: "1px solid rgba(236,72,153,0.2)", borderRadius: 14, padding: "16px 24px", marginBottom: c.show_progress!=="no" ? 12 : 0 }}>
              <span style={{ fontSize: 28 }}>{c.emoji||"👥"}</span>
              <div>
                <p style={{ color: "#EC4899", fontSize: 32, fontWeight: 700, margin: 0, fontFamily: theme.fontDisplay, lineHeight: 1 }}>{c.count}</p>
                <p style={{ color: muted, fontSize: 11, margin: "3px 0 0" }}>{c.label||"participants inscrits"}</p>
              </div>
            </div>
            {c.show_progress!=="no" && (
              <div style={{ marginTop: 10 }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 5 }}>
                  <span style={{ color: muted, fontSize: 10 }}>Inscriptions</span>
                  <span style={{ color: "#EC4899", fontSize: 10, fontWeight: 700 }}>{pct}% · {total}/{max}</span>
                </div>
                <div style={{ height: 6, background: "rgba(255,255,255,0.07)", borderRadius: 3, overflow: "hidden" }}>
                  <div style={{ height: "100%", width: `${pct}%`, background: "linear-gradient(90deg,#EC4899,#F472B6)", borderRadius: 3 }} />
                </div>
              </div>
            )}
          </div>
        )
      }

      case "tickets_left": {
        const urgencyStyles: Record<string,any> = {
          high: { bg: "rgba(239,68,68,0.1)", border: "rgba(239,68,68,0.4)", color: "#EF4444", pulse: true },
          medium: { bg: "rgba(251,191,36,0.08)", border: "rgba(251,191,36,0.3)", color: "#FBBF24", pulse: false },
          low: { bg: "rgba(57,255,143,0.08)", border: "rgba(57,255,143,0.25)", color: "var(--success)", pulse: false },
        }
        const us = urgencyStyles[c.urgency||"high"]
        return (
          <div style={{ padding: "10px 16px", ...s }}>
            <div style={{ background: us.bg, border: `1.5px solid ${us.border}`, borderRadius: 14, padding: "16px", textAlign: "center" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 10, marginBottom: 12 }}>
                <span style={{ fontSize: 28 }}>🎟️</span>
                <div>
                  <p style={{ color: us.color, fontSize: 32, fontWeight: 700, margin: 0, fontFamily: theme.fontDisplay, lineHeight: 1 }}>{c.count||"14"}</p>
                  <p style={{ color: muted, fontSize: 11, margin: "3px 0 0" }}>{c.label||"places restantes"}</p>
                </div>
              </div>
              {c.cta_label && <div style={{ background: us.color, borderRadius: 10, padding: "12px", fontSize: 13, fontWeight: 700, color: c.urgency==="medium" ? "#080808" : "#fff" }}>{c.cta_label}</div>}
            </div>
          </div>
        )
      }


      case "qr_code_block": return (
        <div style={{ padding: "16px", textAlign: "center", ...s }}>
          <div style={{ display: "inline-flex", flexDirection: "column", alignItems: "center", gap: 12 }}>
            <div style={{ background: "#FFFFFF", border: `3px solid ${primary}30`, borderRadius: 14, padding: c.size==="lg" ? 14 : c.size==="sm" ? 7 : 10, boxShadow: "0 8px 30px rgba(0,0,0,0.4)" }}>
              <div style={{ width: c.size==="lg" ? 160 : c.size==="sm" ? 80 : 120, height: c.size==="lg" ? 160 : c.size==="sm" ? 80 : 120, display: "flex", alignItems: "center", justifyContent: "center" }}>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(5,1fr)", gap: 2, width: "100%", height: "100%" }}>
                  {Array.from({length:25}).map((_,i) => {
                    const corners = [0,1,2,3,4,5,9,10,14,15,19,20,21,22,23,24]
                    return <div key={i} style={{ background: corners.includes(i) ? "#111" : Math.random()>0.4 ? "#111" : "transparent", borderRadius: 1 }} />
                  })}
                </div>
              </div>
            </div>
            {c.label && <p style={{ color: text, fontSize: 12, fontWeight: 600, margin: 0 }}>{c.label}</p>}
            {c.show_url!=="no" && <p style={{ color: muted, fontSize: 10, margin: 0, fontFamily: "monospace" }}>/q/...</p>}
            {/* Vérité UX : ce bloc ne s'affiche PAS sur la page publiée (le renderer
                public renvoie null). On le signale pour ne pas laisser croire à un rendu. */}
            <p style={{ color: muted, fontSize: 9, margin: "4px 0 0", fontStyle: "italic", maxWidth: 200, lineHeight: 1.4 }}>
              Aperçu éditeur — ce bloc n'apparaît pas sur la page publiée.
            </p>
          </div>
        </div>
      )

      case "hero_banner": {
        const h = c.height==="lg" ? 220 : c.height==="sm" ? 140 : 180
        const align = c.align==="left" ? "flex-start" : "center"
        const textAlign = c.align==="left" ? "left" : "center"
        return (
          <div style={{ position: "relative", overflow: "hidden", borderRadius: 12 }}>
            {c.bg_image
              ? <img src={c.bg_image} alt="" style={{ width: "100%", height: h, objectFit: "cover", display: "block" }} />
              : <div style={{ width: "100%", height: h, background: c.bg_color ? c.bg_color : `linear-gradient(135deg,${primary}30,${accent}15,#080808)` }} />}
            <div style={{ position: "absolute", inset: 0, background: "linear-gradient(180deg,transparent 20%,rgba(0,0,0,0.7) 100%)" }} />
            <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: align, justifyContent: "flex-end", padding: c.height==="sm" ? "14px" : "20px" }}>
              {c.title && <h2 style={{ color: "#fff", fontSize: c.height==="lg" ? 26 : 20, fontWeight: 700, margin: "0 0 6px", fontFamily: theme.fontDisplay, textAlign, textShadow: "0 2px 10px rgba(0,0,0,0.5)", lineHeight: 1.2 }}>{c.title}</h2>}
              {c.subtitle && <p style={{ color: "rgba(255,255,255,0.8)", fontSize: 13, margin: "0 0 14px", textAlign }}>{c.subtitle}</p>}
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap", justifyContent: align === "center" ? "center" : "flex-start" }}>
                {c.cta_label && <div style={{ background: `linear-gradient(90deg,${primary},${primary}cc)`, borderRadius: 9, padding: "10px 18px", fontSize: 12, fontWeight: 700, color: "#080808" }}>{c.cta_label}</div>}
                {c.cta2_label && <div style={{ background: "rgba(255,255,255,0.15)", border: "1px solid rgba(255,255,255,0.3)", borderRadius: 9, padding: "10px 18px", fontSize: 12, fontWeight: 600, color: "#fff" }}>{c.cta2_label}</div>}
              </div>
            </div>
          </div>
        )
      }

      case "section_banner": {
        const bannerStyles: Record<string,any> = {
          lines: <div style={{ display: "flex", alignItems: "center", gap: 12 }}><div style={{ flex: 1, height: 1, background: `linear-gradient(90deg,transparent,${primary}60)` }} /><span style={{ color: c.color||primary, fontSize: 12, fontWeight: 700, letterSpacing: 3, textTransform: "uppercase", whiteSpace: "nowrap" }}>{c.title||"SECTION"}</span><div style={{ flex: 1, height: 1, background: `linear-gradient(90deg,${primary}60,transparent)` }} /></div>,
          dots: <div style={{ display: "flex", alignItems: "center", gap: 8 }}><div style={{ display: "flex", gap: 3 }}>{[0,1,2].map(i=><div key={i} style={{ width: 4, height: 4, borderRadius: "50%", background: c.color||primary }}/>)}</div><span style={{ color: c.color||primary, fontSize: 12, fontWeight: 700, letterSpacing: 3 }}>{c.title||"SECTION"}</span><div style={{ display: "flex", gap: 3 }}>{[0,1,2].map(i=><div key={i} style={{ width: 4, height: 4, borderRadius: "50%", background: c.color||primary }}/>)}</div></div>,
          gradient: <div style={{ background: `linear-gradient(90deg,${primary}15,${accent}10)`, borderRadius: 8, padding: "10px 16px", textAlign: "center" }}><span style={{ color: c.color||primary, fontSize: 13, fontWeight: 700, letterSpacing: 3, textTransform: "uppercase" }}>{c.title||"SECTION"}</span></div>,
          minimal: <p style={{ color: c.color||primary, fontSize: 13, fontWeight: 700, letterSpacing: 4, textTransform: "uppercase", textAlign: "center", margin: 0 }}>{c.title||"SECTION"}</p>,
          badge: <div style={{ textAlign: "center" }}><span style={{ background: (c.color||primary)+"18", border: `1px solid ${c.color||primary}35`, borderRadius: 20, padding: "6px 18px", color: c.color||primary, fontSize: 12, fontWeight: 700, letterSpacing: 2, textTransform: "uppercase" }}>{c.title||"SECTION"}</span></div>,
        }
        return <div style={{ padding: "12px 16px", ...s }}>{bannerStyles[c.style||"lines"]}</div>
      }

      case "two_columns": {
        // Ne rend que les colonnes réellement remplies (comme le public, qui filtre
        // title||text) → aucune colonne « fantôme » ; état vide explicite si tout est vide.
        const twoCols = [[c.col1_icon,c.col1_title,c.col1_text],[c.col2_icon,c.col2_title,c.col2_text]].filter(([,title,text_col])=>title||text_col)
        return (
          <div style={{ padding: "10px 16px", ...s }}>
            {!hasPublishableContent("two_columns", c) ? emptyHint("🧱", "Ajoutez le contenu des colonnes", HIDDEN_WHEN_EMPTY_NOTE) : (
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              {twoCols.map(([icon,title,text_col],i) => (
                <div key={i} style={{ background: primary+"06", border: `1px solid ${primary}15`, borderRadius: 12, padding: "13px 12px" }}>
                  {icon && <span style={{ fontSize: 24, display: "block", marginBottom: 8 }}>{icon}</span>}
                  {title && <p style={{ color: text, fontSize: 13, fontWeight: 700, margin: "0 0 5px" }}>{title}</p>}
                  {text_col && <p style={{ color: muted, fontSize: 11, margin: 0, lineHeight: 1.6 }}>{text_col}</p>}
                </div>
              ))}
            </div>)}
          </div>
        )
      }

      case "grid_section": {
        const cols = parseInt(c.columns||"3")
        const cards = [
          [c.c1_icon,c.c1_title,c.c1_text],[c.c2_icon,c.c2_title,c.c2_text],
          [c.c3_icon,c.c3_title,c.c3_text],[c.c4_icon,c.c4_title,c.c4_text],
          [c.c5_icon,c.c5_title,c.c5_text],[c.c6_icon,c.c6_title,c.c6_text],
        ].filter(([,t])=>t)
        return (
          <div style={{ padding: "10px 16px", ...s }}>
            {c.title && <p style={{ color: muted, fontSize: 10, textTransform: "uppercase", letterSpacing: 2, margin: "0 0 12px" }}>{c.title}</p>}
            {!hasPublishableContent("grid_section", c) ? emptyHint("▦", "Ajoutez une carte", HIDDEN_WHEN_EMPTY_NOTE) : (
            <div style={{ display: "grid", gridTemplateColumns: `repeat(${cols},1fr)`, gap: 8 }}>
              {cards.slice(0, cols*2).map(([icon,title,txt],i) => (
                <div key={i} style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 10, padding: "12px 10px", textAlign: "center" }}>
                  {icon && <span style={{ fontSize: 22, display: "block", marginBottom: 6 }}>{icon}</span>}
                  <p style={{ color: text, fontSize: 11, fontWeight: 700, margin: "0 0 3px" }}>{title}</p>
                  {txt && <p style={{ color: muted, fontSize: 9, margin: 0 }}>{txt}</p>}
                </div>
              ))}
            </div>)}
          </div>
        )
      }

      case "section_block": return (
        <div style={{ padding: "10px 16px", ...s }}>
          <div style={{ background: c.bg_style==="card" ? "rgba(255,255,255,0.03)" : c.bg_style==="highlight" ? primary+"08" : "transparent", border: c.bg_style==="card" ? "1px solid rgba(255,255,255,0.07)" : c.bg_style==="highlight" ? `1px solid ${primary}20` : "none", borderRadius: c.bg_style!=="transparent" ? 12 : 0, padding: c.bg_style!=="transparent" ? "14px" : "0" }}>
            {c.title && <p style={{ color: primary, fontSize: 14, fontWeight: 700, margin: "0 0 3px", fontFamily: theme.fontDisplay }}>{c.title}</p>}
            {c.subtitle && <p style={{ color: muted, fontSize: 12, margin: c.show_divider!=="no" ? "0 0 10px" : "0" }}>{c.subtitle}</p>}
            {c.show_divider!=="no" && <div style={{ height: 1, background: `linear-gradient(90deg,${primary}50,transparent)`, marginTop: c.title && !c.subtitle ? 8 : 0 }} />}
            {!c.title && <p style={{ color: muted, fontSize: 11, margin: 0, textAlign: "center" }}>Section — ajoutez un titre</p>}
          </div>
        </div>
      )

      case "embed_block": return (
        <div style={{ padding: "10px 16px", ...s }}>
          {c.url
            ? <div>
                {c.title && <p style={{ color: muted, fontSize: 10, margin: "0 0 8px", textTransform: "uppercase", letterSpacing: 1.5 }}>{c.title}</p>}
                <iframe src={embedHref(c.url)} width="100%" height={parseInt(c.height||"400")} style={{ border: "none", borderRadius: 12, display: "block" }} loading="lazy" />
              </div>
            : <div style={{ background: "rgba(201,168,76,0.06)", border: "1.5px dashed rgba(201,168,76,0.25)", borderRadius: 12, padding: "30px", textAlign: "center" }}>
                <span style={{ fontSize: 32, display: "block", marginBottom: 10 }}>🔗</span>
                <p style={{ color: text, fontSize: 13, fontWeight: 600, margin: "0 0 5px" }}>{c.title||"Embed externe"}</p>
                <p style={{ color: muted, fontSize: 11, margin: 0 }}>{c.type||"Google Forms, Typeform, Notion..."}</p>
              </div>}
        </div>
      )

      case "tabs_block": { const [activeTab, setActiveTab] = [0, (_:number) => {}] as const
        const tabs = Array.from({length:50},(_,k)=>{const i=k+1;return [c[`tab${i}_label`],c[`tab${i}_content`]]}).filter(([l])=>l)
        if (!hasPublishableContent("tabs_block", c)) return <div style={{ padding: "10px 16px", ...s }}>{emptyHint("🗂️", "Ajoutez un onglet", HIDDEN_WHEN_EMPTY_NOTE)}</div>
        return (
          <div style={{ padding: "10px 16px", ...s }}>
            <div style={{ display: "flex", gap: 0, borderBottom: "1px solid rgba(255,255,255,0.08)", marginBottom: 12 }}>
              {tabs.map(([label],i) => (
                <button key={i} onClick={() => setActiveTab(i)}
                  style={{ padding: "8px 14px", background: "transparent", border: "none", borderBottom: `2px solid ${activeTab===i ? primary : "transparent"}`, color: activeTab===i ? primary : muted, fontSize: 11, fontWeight: activeTab===i ? 700 : 400, cursor: "pointer", transition: "all 0.15s" }}>
                  {label}
                </button>
              ))}
            </div>
            <div style={{ minHeight: 60 }}>
              <p style={{ color: text, fontSize: 12, margin: 0, lineHeight: 1.7 }}>{tabs[activeTab]?.[1]||"Ajoutez du contenu..."}</p>
            </div>
          </div>
        )
      }

      case "accordion_block": { const [openIdx, setOpenIdx] = [null as number|null, (_:number|null) => {}] as const
        const items = Array.from({length:50},(_,k)=>{const i=k+1;return [c[`a${i}_title`],c[`a${i}_content`]]}).filter(([t])=>t)
        return (
          <div style={{ padding: "10px 16px", ...s }}>
            {c.title && <p style={{ color: muted, fontSize: 10, textTransform: "uppercase", letterSpacing: 2, margin: "0 0 10px" }}>{c.title}</p>}
            {!hasPublishableContent("accordion_block", c) ? emptyHint("➕", "Ajoutez une section", HIDDEN_WHEN_EMPTY_NOTE) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {items.map(([title,content],i) => (
                <div key={i} style={{ border: `1px solid ${openIdx===i ? primary+"40" : "rgba(255,255,255,0.07)"}`, borderRadius: 10, overflow: "hidden" }}>
                  <button onClick={() => setOpenIdx(openIdx===i ? null : i)}
                    style={{ width: "100%", display: "flex", justifyContent: "space-between", alignItems: "center", padding: "11px 14px", background: openIdx===i ? primary+"08" : "transparent", border: "none", color: openIdx===i ? primary : text, fontSize: 13, fontWeight: 600, cursor: "pointer", textAlign: "left" }}>
                    {title}
                    <span style={{ color: primary, fontSize: 16, lineHeight: 1 }}>{openIdx===i ? "−" : "+"}</span>
                  </button>
                  {openIdx===i && content && (
                    <div style={{ padding: "4px 14px 12px", background: "rgba(0,0,0,0.15)" }}>
                      <p style={{ color: muted, fontSize: 12, margin: 0, lineHeight: 1.6 }}>{content}</p>
                    </div>
                  )}
                </div>
              ))}
            </div>)}
          </div>
        )
      }

      case "info_box": {
        if (!hasPublishableContent("info_box", c)) return <div style={{ padding: "10px 16px", ...s }}>{emptyHint("💡", "Ajoutez le texte de l'encadré", HIDDEN_WHEN_EMPTY_NOTE)}</div>
        const boxStyles: Record<string,any> = {
          info: { bg: "rgba(56,189,248,0.08)", border: "rgba(56,189,248,0.3)", color: "var(--action)" },
          warning: { bg: "rgba(251,191,36,0.08)", border: "rgba(251,191,36,0.3)", color: "#FBBF24" },
          success: { bg: "rgba(57,255,143,0.08)", border: "rgba(57,255,143,0.3)", color: "var(--success)" },
          tip: { bg: "rgba(201,168,76,0.08)", border: "rgba(201,168,76,0.3)", color: "#C9A84C" },
          important: { bg: "rgba(239,68,68,0.08)", border: "rgba(239,68,68,0.3)", color: "#EF4444" },
        }
        const bs = boxStyles[c.type||"info"]
        return (
          <div style={{ padding: "8px 16px", ...s }}>
            <div style={{ background: bs.bg, border: `1.5px solid ${bs.border}`, borderRadius: 12, padding: "14px 16px" }}>
              <div style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
                <span style={{ fontSize: 20, flexShrink: 0 }}>{c.emoji||"💡"}</span>
                <div>
                  {c.title && <p style={{ color: bs.color, fontSize: 12, fontWeight: 700, margin: "0 0 4px" }}>{c.title}</p>}
                  <p style={{ color: text, fontSize: 12, margin: 0, lineHeight: 1.6 }}>{c.message}</p>
                </div>
              </div>
            </div>
          </div>
        )
      }

      case "calendly": return (
        <div style={{ padding: "8px 16px", ...s }}>
          <div style={{ background: `${primary}08`, border: `1px solid ${primary}20`, borderRadius: 12, padding: "12px 14px" }}>
            <div style={{ display: "flex", gap: 10, marginBottom: 10 }}>
              <div style={{ width: 36, height: 36, background: `${primary}14`, border: `1px solid ${primary}25`, borderRadius: 9, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 17, flexShrink: 0 }}>📅</div>
              <div><p style={{ color: text, fontSize: 13, fontWeight: 700, margin: 0 }}>{c.label||"Reserver"}</p>{c.description && <p style={{ color: muted, fontSize: 10, margin: 0 }}>{c.description}</p>}</div>
            </div>
            <div style={{ background: `linear-gradient(90deg,${primary},${primary}cc)`, color: "#080808", textAlign: "center", padding: "9px", borderRadius: 8, fontSize: 12, fontWeight: 700 }}>{c.label||"Reserver un creneau"}</div>
          </div>
        </div>
      )
      default: {
        const def = BLOCK_DEFS[block.type]
        return <div style={{ padding: "12px 16px", textAlign: "center", ...s }}><span style={{ fontSize: 22 }}>{def?.icon||"📦"}</span><p style={{ color: muted, fontSize: 11, margin: "5px 0 0" }}>{def?.label||block.type}</p></div>
      }
    }
  }

