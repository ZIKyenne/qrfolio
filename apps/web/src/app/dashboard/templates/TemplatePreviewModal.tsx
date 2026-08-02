// TemplatePreviewModal.tsx — Preview d'un template dans une simulation iPhone
"use client"
import { useEffect, useRef } from "react"
import { X, ArrowRight, Lock, Check, Layers, Clock, ExternalLink } from "lucide-react"
import { type Block, type PageTheme, BLOCK_DEFS } from "../builder/types"
import { useIsMobile } from "@/lib/useIsMobile"

const NOISE_SVG_URL = "url('data:image/svg+xml,%3Csvg viewBox=%270 0 200 200%27 xmlns=%27http://www.w3.org/2000/svg%27%3E%3Cfilter id=%27n%27%3E%3CfeTurbulence type=%27fractalNoise%27 baseFrequency=%270.9%27 numOctaves=%274%27 stitchTiles=%27stitch%27/%3E%3C/filter%3E%3Crect width=%27100%25%27 height=%27100%25%27 filter=%27url(%23n)%27/%3E%3C/svg%3E')"

// ── Définitions manquantes (réseaux sociaux, FAQ, compte à rebours) ──────────
const SOCIAL_NETWORKS = [
  { key: "instagram", icon: "📸", label: "Instagram", color: "#E1306C" },
  { key: "facebook",  icon: "👍", label: "Facebook",  color: "#1877F2" },
  { key: "tiktok",    icon: "🎵", label: "TikTok",    color: "#F5F0E8" },
  { key: "youtube",   icon: "▶️", label: "YouTube",   color: "#FF0000" },
  { key: "twitter",   icon: "🐦", label: "Twitter / X", color: "#1DA1F2" },
  { key: "linkedin",  icon: "💼", label: "LinkedIn",  color: "#0A66C2" },
  { key: "github",    icon: "💻", label: "GitHub",    color: "#F5F0E8" },
  { key: "spotify",   icon: "🎧", label: "Spotify",   color: "#1DB954" },
  { key: "pinterest", icon: "📌", label: "Pinterest", color: "#E60023" },
  { key: "website",   icon: "🌐", label: "Site web",  color: "var(--accent)" },
  { key: "phone",     icon: "📞", label: "Téléphone", color: "var(--success)" },
  { key: "email",     icon: "✉️", label: "Email",     color: "var(--action)" },
  { key: "whatsapp",  icon: "💬", label: "WhatsApp",  color: "#25D366" },
]

function FAQItem({ q, a, theme }: { q: string; a: string; theme: PageTheme }) {
  return (
    <div style={{ marginBottom: 8, background: theme.primary + "06", border: `1px solid ${theme.primary}12`, borderRadius: 9, padding: "10px 12px" }}>
      <p style={{ color: theme.text, fontSize: 12, fontWeight: 700, margin: "0 0 4px" }}>{q}</p>
      {a && <p style={{ color: theme.muted, fontSize: 11, margin: 0, lineHeight: 1.5 }}>{a}</p>}
    </div>
  )
}

function CountdownDisplay({ date, theme }: { date: string; theme: PageTheme }) {
  const target = new Date(date).getTime()
  let diff = Math.max(0, (isNaN(target) ? 0 : target) - Date.now())
  const days = Math.floor(diff / 86400000); diff -= days * 86400000
  const hours = Math.floor(diff / 3600000); diff -= hours * 3600000
  const mins = Math.floor(diff / 60000)
  const units: [number, string][] = [[days, "Jours"], [hours, "Heures"], [mins, "Min"]]
  return (
    <div style={{ display: "flex", justifyContent: "center", gap: 8 }}>
      {units.map(([val, label], i) => (
        <div key={i} style={{ background: theme.primary + "12", border: `1px solid ${theme.primary}25`, borderRadius: 10, padding: "10px 12px", minWidth: 52 }}>
          <p style={{ color: theme.primary, fontSize: 22, fontWeight: 700, margin: 0, fontFamily: theme.fontDisplay, lineHeight: 1 }}>{String(val).padStart(2, "0")}</p>
          <p style={{ color: theme.muted, fontSize: 9, margin: "3px 0 0", textTransform: "uppercase", letterSpacing: 1 }}>{label}</p>
        </div>
      ))}
    </div>
  )
}

const SETUP_TIME: Record<string, string> = {
  freelance:"5 min",restaurant:"7 min",artiste:"5 min",coach:"6 min",
  createur:"4 min",event:"6 min",ecommerce:"8 min",coiffeur:"6 min",
  agence:"7 min",medecin:"6 min",vente_produits:"8 min",
  immobilier:"7 min",startup:"7 min",influenceur:"5 min",
}

const getPatternCSS = (pattern: string, color: string, size: number, opacity: number): string => {
  const c = color + Math.round(opacity * 255).toString(16).padStart(2, "0")
  const s = size
  switch(pattern) {
    case "dots": return `radial-gradient(circle, ${c} 1.5px, transparent 1.5px)`
    case "grid": return `linear-gradient(${c} 1px, transparent 1px), linear-gradient(90deg, ${c} 1px, transparent 1px)`
    case "lines": return `repeating-linear-gradient(0deg, ${c} 0px, ${c} 1px, transparent 1px, transparent ${s}px)`
    case "waves": return `repeating-linear-gradient(90deg, ${c} 0px, ${c} 1px, transparent 1px, transparent ${s}px), repeating-linear-gradient(180deg, ${c} 0px, ${c} 1px, transparent 1px, transparent ${s}px)`
    case "diagonals": return `repeating-linear-gradient(45deg, ${c} 0px, ${c} 1px, transparent 1px, transparent ${s}px)`
    case "hexagons": return `radial-gradient(circle at 0% 50%, ${c} ${s*0.12}px, transparent ${s*0.12}px), radial-gradient(circle at 100% 50%, ${c} ${s*0.12}px, transparent ${s*0.12}px), radial-gradient(circle at 50% 0%, ${c} ${s*0.12}px, transparent ${s*0.12}px)`
    case "squares": return `linear-gradient(${c} 1px, transparent 1px), linear-gradient(90deg, ${c} 1px, transparent 1px)`
    case "circles": return `radial-gradient(circle, transparent ${s*0.3}px, ${c} ${s*0.3}px, ${c} ${s*0.35}px, transparent ${s*0.35}px)`
    case "zigzag": return `linear-gradient(135deg, ${c} 25%, transparent 25%), linear-gradient(225deg, ${c} 25%, transparent 25%)`
    case "stars": return `radial-gradient(circle, ${c} 1px, transparent 1px), radial-gradient(circle at ${s/2}px ${s/2}px, ${c} 1px, transparent 1px)`
    default: return `radial-gradient(circle, ${c} 1.5px, transparent 1.5px)`
  }
}

function computeBgStyle(theme: PageTheme, dayMode: boolean): React.CSSProperties {
  if (dayMode) return { background: "#FAFAFA" }
  const t = theme as any
  let base: React.CSSProperties = {}

  if (t.bgMode === "pattern") {
    const patSize = t.pattern_size || 20
    const patOpacity = t.pattern_opacity || 0.15
    const patColor = t.pattern_color || "var(--accent)"
    const alpha = Math.round(patOpacity * 255).toString(16).padStart(2, "0")
    const c = patColor + alpha
    let bgImg = ""
    switch(t.bgPattern || "dots") {
      case "dots": bgImg = `radial-gradient(circle, ${c} 1px, transparent 1px)`; break
      case "grid": bgImg = `linear-gradient(${c} 1px, transparent 1px), linear-gradient(90deg, ${c} 1px, transparent 1px)`; break
      case "lines": bgImg = `linear-gradient(0deg, ${c} 1px, transparent 1px)`; break
      case "diagonals": bgImg = `linear-gradient(45deg, ${c} 1px, transparent 1px)`; break
      case "hexagons": bgImg = `radial-gradient(circle, ${c} 2px, transparent 2px)`; break
      case "circles": bgImg = `radial-gradient(circle, transparent ${patSize*0.3}px, ${c} ${patSize*0.3}px, ${c} ${patSize*0.32}px, transparent ${patSize*0.32}px)`; break
      case "zigzag": bgImg = `linear-gradient(135deg, ${c} 25%, transparent 25%), linear-gradient(225deg, ${c} 25%, transparent 25%)`; break
      default: bgImg = `radial-gradient(circle, ${c} 1px, transparent 1px)`
    }
    base = { background: theme.bg, backgroundImage: bgImg, backgroundSize: `${patSize}px ${patSize}px` }
  } else if (t.bgMode === "radial") {
    return { background: t.bgGradient || `radial-gradient(circle at 50% 50%, ${theme.primary}, ${theme.bg})` }
  } else if (t.bgMode === "mesh") {
    const c1 = t.mesh_c1 || "var(--accent)"; const c2 = t.mesh_c2 || "var(--success)"; const c3 = t.mesh_c3 || "#7B2FBE"
    const blurPx = Math.round((t.mesh_blur||40)/3)
    base = {
      background: `radial-gradient(ellipse at 10% 20%, ${c1}90, transparent 55%), radial-gradient(ellipse at 90% 80%, ${c2}90, transparent 55%), radial-gradient(ellipse at 80% 10%, ${c3}70, transparent 55%), ${theme.bg}`,
      ...(blurPx > 0 ? { backdropFilter: `blur(${blurPx}px)` } : {})
    }
  } else if (t.bgMode === "image" && t.bgImage) {
    base = {
      backgroundImage: `url(${t.bgImage})`,
      backgroundSize: t.bgImageSize || "cover",
      backgroundPosition: "center",
      ...(t.bgBlur > 0 ? { filter: `blur(${t.bgBlur}px)` } : {})
    }
  } else {
    const animStyle: React.CSSProperties = t.bgAnimation === "gradient-flow"
      ? { backgroundSize: "400% 400%", animation: `gradientShift ${t.anim_speed||8}s ease infinite` }
      : t.bgAnimation === "aurora"
      ? { backgroundSize: "300% 300%", animation: `auroraShift ${t.anim_speed||12}s ease infinite` }
      : {}
    base = { background: theme.bgGradient || theme.bg, ...animStyle }
  }
  return base
}

function BlockPreview({ block, theme, dayMode }: { block: Block; theme: PageTheme; dayMode: boolean }) {
  const c = block.content
  const bg = "transparent"
  const text = dayMode ? "#1A1A1A" : theme.text
  const muted = dayMode ? "#6B7280" : theme.muted
  const primary = theme.primary
  const accent = theme.accent
  const s = { background: bg }

  switch (block.type) {
    case "profile": return (
      <div style={{ textAlign: "center", padding: "20px 16px", ...s }}>
        {c.avatar
          ? <img src={c.avatar} alt="" style={{ width: 72, height: 72, borderRadius: "50%", objectFit: "cover", margin: "0 auto 10px", display: "block", border: `3px solid ${primary}60` }} />
          : <div style={{ width: 72, height: 72, borderRadius: "50%", background: `linear-gradient(135deg,${primary},${accent})`, margin: "0 auto 10px", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 28, fontWeight: 700, color: "#080808" }}>{(c.name||"?")[0].toUpperCase()}</div>}
        <p style={{ color: text, fontSize: 18, fontWeight: 700, margin: "0 0 3px", fontFamily: theme.fontDisplay }}>{c.name || "Mon Nom"}</p>
        <p style={{ color: muted, fontSize: 13, margin: c.badge ? "0 0 7px" : "0" }}>{c.tagline}</p>
        {c.badge && <span style={{ background: primary+"18", border: `1px solid ${primary}40`, borderRadius: 20, padding: "3px 10px", fontSize: 11, color: primary }}>{c.badge}</span>}
      </div>
    )
    case "bio": return (
      <div style={{ padding: "12px 16px", textAlign: (c.align as any)||"left", ...s }}>
        <p style={{ color: text, fontSize: 13, lineHeight: 1.7, margin: 0 }}>{c.text}</p>
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
      const btnStyles: Record<string,any> = {
        gold: { background: `linear-gradient(90deg,${primary},${primary}cc)`, color: "#080808", border: "none" },
        neon: { background: accent+"15", border: `1.5px solid ${accent}`, color: accent },
        outline: { background: "transparent", border: `1.5px solid ${primary}`, color: primary },
        ghost: { background: "rgba(255,255,255,0.06)", color: text, border: "1px solid rgba(255,255,255,0.1)" },
        red: { background: "rgba(239,68,68,0.15)", border: "1.5px solid #EF4444", color: "#EF4444" },
      }
      return (
        <div style={{ padding: "10px 16px", ...s }}>
          <div style={{ ...btnStyles[c.style||"gold"], display: "flex", alignItems: "center", justifyContent: "center", gap: 7, borderRadius: 12, padding: "13px 18px", fontSize: 14, fontWeight: 700 }}>
            {c.icon && <span>{c.icon}</span>}{c.label||"Bouton"}
          </div>
        </div>
      )
    }
    case "heading": {
      const sizes: Record<string,number> = { small: 15, medium: 20, large: 27, xl: 34 }
      const hColors: Record<string,string> = { default: text, primary, accent, muted }
      return (
        <div style={{ padding: "14px 16px", textAlign: (c.align as any)||"center", ...s }}>
          <h2 style={{ fontFamily: theme.fontDisplay, fontSize: sizes[c.size||"medium"], color: hColors[c.color||"default"], fontWeight: 700, margin: "0 0 3px" }}>{c.text||"Titre"}</h2>
          {c.subtitle && <p style={{ color: muted, fontSize: 12, margin: 0 }}>{c.subtitle}</p>}
        </div>
      )
    }
    case "rich_text": {
      const tSizes: Record<string,number> = { small: 11, normal: 13, large: 15 }
      return <div style={{ padding: "8px 16px", textAlign: (c.align as any)||"left", ...s }}><p style={{ color: muted, fontSize: tSizes[c.size||"normal"], lineHeight: 1.7, margin: 0 }}>{c.text}</p></div>
    }
    case "faq": return (
      <div style={{ padding: "10px 16px", ...s }}>
        {c.title && <p style={{ color: muted, fontSize: 10, textTransform: "uppercase", letterSpacing: 2, margin: "0 0 10px" }}>{c.title}</p>}
        {[[c.q1,c.a1],[c.q2,c.a2],[c.q3,c.a3]].filter(([q])=>q).map(([q,a],i) => <FAQItem key={i} q={q!} a={a||""} theme={theme} />)}
      </div>
    )
    case "social_links": {
      const active = SOCIAL_NETWORKS.filter(n => c[n.key])
      return (
        <div style={{ padding: "10px 16px", ...s }}>
          {active.length === 0
            ? <p style={{ color: muted, fontSize: 11, textAlign: "center", margin: 0 }}>Aucun réseau configuré</p>
            : <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {active.map(n => (
                  <div key={n.key} style={{ display: "flex", alignItems: "center", gap: 10, background: n.color+"10", border: `1px solid ${n.color}25`, borderRadius: 10, padding: "9px 12px" }}>
                    <span style={{ fontSize: 15 }}>{n.icon}</span>
                    <span style={{ color: text, fontSize: 12, fontWeight: 600, flex: 1 }}>{n.label}</span>
                    <ExternalLink size={11} color={n.color} />
                  </div>
                ))}
              </div>}
        </div>
      )
    }
    case "testimonials": {
      const reviews = [[c.name1,c.text1,c.stars1],[c.name2,c.text2,c.stars2],[c.name3,c.text3,c.stars3]].filter(([n])=>n)
      return (
        <div style={{ padding: "10px 16px", display: "flex", flexDirection: "column", gap: 7, ...s }}>
          {reviews.map(([n,t,stars],i) => (
            <div key={i} style={{ background: primary+"06", border: `1px solid ${primary}12`, borderRadius: 9, padding: "10px 12px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                <p style={{ color: text, fontSize: 12, fontWeight: 700, margin: 0 }}>{n}</p>
                <p style={{ color: "#FFD700", fontSize: 11, margin: 0 }}>{"★".repeat(parseInt(stars||"5"))}</p>
              </div>
              <p style={{ color: muted, fontSize: 11, margin: 0, fontStyle: "italic" }}>"{t}"</p>
            </div>
          ))}
        </div>
      )
    }
    case "image": return (
      <div style={{ ...s }}>
        {c.src
          ? <div><img src={c.src} alt={c.caption||""} style={{ width: "100%", maxHeight: 220, objectFit: "cover", display: "block", borderRadius: c.rounded==="circle" ? "50%" : c.rounded==="rounded" ? 10 : 0 }} />{c.caption && <p style={{ color: muted, fontSize: 10, textAlign: "center", margin: "6px 14px" }}>{c.caption}</p>}</div>
          : <div style={{ background: "rgba(255,255,255,0.03)", border: "1px dashed rgba(255,255,255,0.1)", borderRadius: 8, padding: "28px", textAlign: "center", margin: "10px 16px" }}><span style={{ fontSize: 28 }}>🖼️</span><p style={{ color: muted, fontSize: 11, margin: "6px 0 0" }}>Aucune image</p></div>}
      </div>
    )
    case "gallery": {
      const imgs = [c.img1,c.img2,c.img3,c.img4,c.img5,c.img6].filter(Boolean)
      return (
        <div style={{ padding: "10px 14px", display: "grid", gridTemplateColumns: `repeat(${parseInt(c.columns||"3")},1fr)`, gap: 4, ...s }}>
          {imgs.length>0 ? imgs.map((img,i) => <img key={i} src={img} alt="" style={{ width: "100%", aspectRatio: "1", objectFit: "cover", borderRadius: 6 }} />)
            : [0,1,2,3,4,5].map(i => <div key={i} style={{ background: "rgba(255,255,255,0.04)", borderRadius: 6, aspectRatio: "1", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, color: muted }}>🖼️</div>)}
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
    case "opening_hours": return (
      <div style={{ padding: "10px 16px", ...s }}>
        {c.title && <p style={{ color: muted, fontSize: 10, textTransform: "uppercase", letterSpacing: 2, margin: "0 0 8px" }}>{c.title}</p>}
        <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
          {[["Lun — Ven",c.mon_fri],["Samedi",c.saturday],["Dimanche",c.sunday]].filter(([,h])=>h).map(([d,h]) => (
            <div key={String(d)} style={{ display: "flex", justifyContent: "space-between", padding: "4px 0", borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
              <span style={{ color: muted, fontSize: 12 }}>{d}</span>
              <span style={{ color: text, fontSize: 12, fontWeight: 600 }}>{h}</span>
            </div>
          ))}
        </div>
      </div>
    )
    case "pricing": {
      const plans = [[c.title1,c.price1,c.desc1],[c.title2,c.price2,c.desc2],[c.title3,c.price3,c.desc3]].filter(([t])=>t)
      return (
        <div style={{ padding: "10px 16px", ...s }}>
          {c.title && <p style={{ color: muted, fontSize: 10, textTransform: "uppercase", letterSpacing: 2, margin: "0 0 10px" }}>{c.title}</p>}
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            {plans.map(([t,p,d],i) => (
              <div key={i} style={{ flex: 1, minWidth: 70, background: i===1 ? primary+"12" : "rgba(255,255,255,0.04)", border: `1px solid ${i===1 ? primary+"40" : "rgba(255,255,255,0.08)"}`, borderRadius: 9, padding: "12px 8px", textAlign: "center" }}>
                <p style={{ color: muted, fontSize: 9, margin: "0 0 3px", textTransform: "uppercase", letterSpacing: 1 }}>{t}</p>
                <p style={{ color: primary, fontSize: 20, fontWeight: 700, margin: "0 0 3px", fontFamily: theme.fontDisplay }}>{p}</p>
                <p style={{ color: muted, fontSize: 9, margin: 0 }}>{d}</p>
              </div>
            ))}
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
            </div>
            {c.cta_label && <div style={{ background: `linear-gradient(90deg,${primary},${primary}cc)`, borderRadius: 7, padding: "8px", textAlign: "center", fontSize: 12, fontWeight: 700, color: "#080808" }}>{c.cta_label}</div>}
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
    case "menu_section": return (
      <div style={{ padding: "10px 16px", ...s }}>
        {c.category && <p style={{ color: primary, fontSize: 12, fontWeight: 700, margin: "0 0 8px", textTransform: "uppercase", letterSpacing: 1 }}>{c.category}</p>}
        <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
          {[[c.item1_name,c.item1_price,c.item1_desc],[c.item2_name,c.item2_price,c.item2_desc],[c.item3_name,c.item3_price,c.item3_desc]].filter(([n])=>n).map(([n,p,d],i) => (
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
      const services = [[c.s1_icon,c.s1_name,c.s1_desc],[c.s2_icon,c.s2_name,c.s2_desc],[c.s3_icon,c.s3_name,c.s3_desc]].filter(([,n])=>n)
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
    case "countdown": return (
      <div style={{ padding: "14px 16px", textAlign: "center", ...s }}>
        {c.title && <p style={{ color: muted, fontSize: 11, margin: "0 0 12px", textTransform: "uppercase", letterSpacing: 1 }}>{c.title}</p>}
        <CountdownDisplay date={c.date||"2026-12-31"} theme={theme} />
        {c.subtitle && <p style={{ color: muted, fontSize: 11, margin: "10px 0 0" }}>{c.subtitle}</p>}
      </div>
    )
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
      <div style={{ padding: "10px 16px", ...s }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 3, marginBottom: 10 }}>
          {[0,1,2,3,4,5].map(i => <div key={i} style={{ background: "rgba(225,48,108,0.06)", border: "1px solid rgba(225,48,108,0.1)", borderRadius: 5, aspectRatio: "1", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16 }}>📸</div>)}
        </div>
        {c.username && <p style={{ color: muted, fontSize: 11, textAlign: "center", margin: "0 0 8px" }}>{c.username}</p>}
        {c.cta_label && <div style={{ background: "rgba(225,48,108,0.15)", border: "1px solid rgba(225,48,108,0.3)", color: "#E1306C", textAlign: "center", padding: "9px", borderRadius: 7, fontSize: 12, fontWeight: 700 }}>{c.cta_label}</div>}
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
      const btns = [[c.btn1_icon,c.btn1_label],[c.btn2_icon,c.btn2_label],[c.btn3_icon,c.btn3_label],[c.btn4_icon,c.btn4_label]].filter(([,l])=>l)
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
    case "promo_code": return (
      <div style={{ padding: "4px 16px 10px", ...s }}>
        <div style={{ background: "rgba(249,115,22,0.08)", border: "2px dashed rgba(249,115,22,0.3)", borderRadius: 12, padding: "14px", textAlign: "center" }}>
          {c.description && <p style={{ color: muted, fontSize: 11, margin: "0 0 8px" }}>{c.description}</p>}
          <div style={{ background: "rgba(249,115,22,0.15)", border: "2px solid rgba(249,115,22,0.4)", borderRadius: 8, padding: "9px 16px", fontFamily: "monospace", fontSize: 18, fontWeight: 700, color: "#F97316", letterSpacing: 3 }}>{c.code||"PROMO10"}</div>
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
    case "payment_button": return (
      <div style={{ padding: "4px 16px 10px", ...s }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, background: "rgba(57,255,143,0.1)", border: "1.5px solid rgba(57,255,143,0.3)", borderRadius: 12, padding: "13px 18px" }}>
          <span style={{ fontSize: 16 }}>💳</span>
          <p style={{ color: "var(--success)", fontSize: 13, fontWeight: 700, margin: 0 }}>{c.label||"Payer maintenant"}{c.amount ? ` — ${c.amount}` : ""}</p>
        </div>
      </div>
    )
    case "quote_request": return (
      <div style={{ padding: "4px 16px 10px", ...s }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, background: primary+"08", border: `1.5px solid ${primary}20`, borderRadius: 12, padding: "11px 14px" }}>
          <div style={{ width: 38, height: 38, background: primary+"12", borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, flexShrink: 0 }}>📋</div>
          <div style={{ flex: 1 }}><p style={{ color: text, fontSize: 12, fontWeight: 700, margin: 0 }}>{c.label||"Demander un devis"}</p>{c.description && <p style={{ color: muted, fontSize: 9, margin: 0 }}>{c.description}</p>}</div>
          <span style={{ color: primary, fontSize: 14 }}>→</span>
        </div>
      </div>
    )
    case "cover_banner": return (
      <div style={{ position: "relative", overflow: "hidden", borderRadius: "10px 10px 0 0" }}>
        {c.src
          ? <img src={c.src} alt="" style={{ width: "100%", height: c.height==="lg" ? 140 : c.height==="sm" ? 70 : 100, objectFit: "cover", display: "block" }} />
          : <div style={{ width: "100%", height: c.height==="lg" ? 140 : c.height==="sm" ? 70 : 100, background: `linear-gradient(135deg,${primary}30,${accent}20)`, display: "flex", alignItems: "center", justifyContent: "center" }}><span style={{ color: muted, fontSize: 11 }}>Bannière / Cover</span></div>}
        {c.cover_title && <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "flex-end", padding: "10px 14px" }}><p style={{ color: "#fff", fontSize: 16, fontWeight: 700, margin: 0, textShadow: "0 2px 8px rgba(0,0,0,0.5)", fontFamily: theme.fontDisplay }}>{c.cover_title}</p></div>}
      </div>
    )
    case "about": return (
      <div style={{ padding: "10px 16px", ...s }}>
        {c.emoji && <span style={{ fontSize: 18, display: "block", marginBottom: 5 }}>{c.emoji}</span>}
        {c.title && <p style={{ color: primary, fontSize: 10, fontWeight: 700, margin: "0 0 5px", textTransform: "uppercase", letterSpacing: 1.5 }}>{c.title}</p>}
        <p style={{ color: text, fontSize: 12, lineHeight: 1.75, margin: 0 }}>{c.text||"Votre histoire ici..."}</p>
        {c.collapsible==="yes" && <button style={{ color: primary, fontSize: 10, background: "none", border: "none", cursor: "pointer", padding: "5px 0 0", fontWeight: 600 }}>Lire la suite →</button>}
      </div>
    )
    case "availability": {
      const scMap: Record<string,any> = {
        available: { color: "var(--success)", bg: "rgba(57,255,143,0.08)", border: "rgba(57,255,143,0.25)", label: "Disponible" },
        busy: { color: "#F97316", bg: "rgba(249,115,22,0.08)", border: "rgba(249,115,22,0.25)", label: "En mission" },
        closed: { color: "#EF4444", bg: "rgba(239,68,68,0.08)", border: "rgba(239,68,68,0.25)", label: "Indisponible" },
      }
      const sc = scMap[c.status||"available"]
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
      const skills = [[c.s1_name,c.s1_level,c.s1_icon],[c.s2_name,c.s2_level,c.s2_icon],[c.s3_name,c.s3_level,c.s3_icon],[c.s4_name,c.s4_level,c.s4_icon],[c.s5_name,c.s5_level,c.s5_icon]].filter(([n])=>n)
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
      const langs = [[c.lang_1_flag,c.lang_1_name,c.lang_1_level],[c.lang_2_flag,c.lang_2_name,c.lang_2_level],[c.lang_3_flag,c.lang_3_name,c.lang_3_level],[c.lang_4_flag,c.lang_4_name,c.lang_4_level]].filter(([,n])=>n)
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
      const certs = [[c.cert_1_icon,c.cert_1_name,c.cert_1_org,c.cert_1_year],[c.cert_2_icon,c.cert_2_name,c.cert_2_org,c.cert_2_year],[c.cert_3_icon,c.cert_3_name,c.cert_3_org,c.cert_3_year],[c.cert_4_icon,c.cert_4_name,c.cert_4_org,c.cert_4_year]].filter(([,n])=>n)
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
      const links = [
        [c.link_1_icon, c.link_1_label, c.link_1_url],
        [c.link_2_icon, c.link_2_label, c.link_2_url],
        [c.link_3_icon, c.link_3_label, c.link_3_url],
        [c.link_4_icon, c.link_4_label, c.link_4_url],
        [c.link_5_icon, c.link_5_label, c.link_5_url],
      ].filter(([,l])=>l)
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
      const products = [
        [c.p1_img, c.p1_name, c.p1_price, c.p1_desc, c.p1_url],
        [c.p2_img, c.p2_name, c.p2_price, c.p2_desc, c.p2_url],
        [c.p3_img, c.p3_name, c.p3_price, c.p3_desc, c.p3_url],
      ].filter(([,n])=>n)
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

    case "featured_product": return (
      <div style={{ padding: "10px 16px", ...s }}>
        <div style={{ background: `linear-gradient(135deg,${primary}10,${accent}08)`, border: `1.5px solid ${primary}30`, borderRadius: 14, overflow: "hidden" }}>
          {c.badge && <div style={{ background: primary, color: "#080808", padding: "6px 14px", fontSize: 11, fontWeight: 700, textAlign: "center" }}>{c.badge}</div>}
          {c.image
            ? <img src={c.image} alt="" style={{ width: "100%", height: 160, objectFit: "cover", display: "block" }} />
            : <div style={{ height: 120, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(249,115,22,0.06)", fontSize: 40 }}>⭐</div>}
          <div style={{ padding: "14px" }}>
            <p style={{ color: text, fontSize: 16, fontWeight: 700, margin: "0 0 6px", fontFamily: theme.fontDisplay }}>{c.name||"Mon produit phare"}</p>
            {c.description && <p style={{ color: muted, fontSize: 12, margin: "0 0 10px", lineHeight: 1.5 }}>{c.description}</p>}
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
              <span style={{ color: primary, fontSize: 22, fontWeight: 700 }}>{c.price||"99€"}</span>
              {c.old_price && <span style={{ color: muted, fontSize: 14, textDecoration: "line-through" }}>{c.old_price}</span>}
              {c.old_price && <span style={{ background: "#EF4444", color: "#fff", borderRadius: 6, padding: "2px 7px", fontSize: 10, fontWeight: 700 }}>Promo</span>}
            </div>
            {c.cta_label && <div style={{ background: `linear-gradient(90deg,${primary},${primary}cc)`, borderRadius: 10, padding: "12px", textAlign: "center", fontSize: 13, fontWeight: 700, color: "#080808" }}>{c.cta_label}</div>}
          </div>
        </div>
      </div>
    )

    case "offer_comparison": {
      const plans = [
        { name: c.plan1_name, price: c.plan1_price, features: c.plan1_features, highlight: false },
        { name: c.plan2_name, price: c.plan2_price, features: c.plan2_features, highlight: c.plan2_highlight==="yes" },
        { name: c.plan3_name, price: c.plan3_price, features: c.plan3_features, highlight: false },
      ].filter(p => p.name)
      return (
        <div style={{ padding: "10px 16px", ...s }}>
          {c.title && <p style={{ color: muted, fontSize: 10, textTransform: "uppercase", letterSpacing: 2, margin: "0 0 12px", textAlign: "center" }}>{c.title}</p>}
          <div style={{ display: "flex", gap: 7 }}>
            {plans.map((plan, i) => (
              <div key={i} style={{ flex: 1, background: plan.highlight ? primary+"12" : "rgba(255,255,255,0.03)", border: `1.5px solid ${plan.highlight ? primary+"50" : "rgba(255,255,255,0.08)"}`, borderRadius: 12, padding: "12px 10px", position: "relative" }}>
                {plan.highlight && <div style={{ position: "absolute", top: -8, left: "50%", transform: "translateX(-50%)", background: primary, color: "#080808", borderRadius: 20, padding: "2px 10px", fontSize: 9, fontWeight: 700, whiteSpace: "nowrap" }}>⭐ Populaire</div>}
                <p style={{ color: plan.highlight ? primary : text, fontSize: 11, fontWeight: 700, margin: "0 0 4px", textAlign: "center" }}>{plan.name}</p>
                <p style={{ color: primary, fontSize: 18, fontWeight: 700, margin: "0 0 8px", textAlign: "center", fontFamily: theme.fontDisplay }}>{plan.price}</p>
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
      const packs = [
        [c.pack1_icon, c.pack1_name, c.pack1_price, c.pack1_content, c.pack1_url],
        [c.pack2_icon, c.pack2_name, c.pack2_price, c.pack2_content, c.pack2_url],
        [c.pack3_icon, c.pack3_name, c.pack3_price, c.pack3_content, c.pack3_url],
      ].filter(([,n])=>n)
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
      const works = [[c.work1_img,c.work1_title,c.work1_desc],[c.work2_img,c.work2_title,c.work2_desc],[c.work3_img,c.work3_title,c.work3_desc]].filter(([,t])=>t)
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
      const reviews = [[c.r1_name,c.r1_text,c.r1_stars],[c.r2_name,c.r2_text,c.r2_stars],[c.r3_name,c.r3_text,c.r3_stars]].filter(([n])=>n)
      return (
        <div style={{ padding: "10px 16px", ...s }}>
          {(c.avg_rating || c.title) && (
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12, padding: "10px 12px", background: "rgba(251,191,36,0.06)", border: "1px solid rgba(251,191,36,0.2)", borderRadius: 10 }}>
              <div style={{ textAlign: "center" }}>
                <p style={{ color: "#FBBF24", fontSize: 28, fontWeight: 700, margin: 0, fontFamily: theme.fontDisplay }}>{c.avg_rating||"5.0"}</p>
                <div style={{ display: "flex", gap: 2 }}>{[1,2,3,4,5].map(i => <span key={i} style={{ color: "#FBBF24", fontSize: 10 }}>★</span>)}</div>
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
                  <p style={{ color: "#FBBF24", fontSize: 10, margin: 0 }}>{"★".repeat(parseInt(stars||"5"))}</p>
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
      const stats = [
        [c.stat1_icon, c.stat1_value, c.stat1_label],
        [c.stat2_icon, c.stat2_value, c.stat2_label],
        [c.stat3_icon, c.stat3_value, c.stat3_label],
        [c.stat4_icon, c.stat4_value, c.stat4_label],
      ].filter(([,v])=>v)
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
      const logos = [
        [c.logo1_img, c.logo1_name],[c.logo2_img, c.logo2_name],[c.logo3_img, c.logo3_name],
        [c.logo4_img, c.logo4_name],[c.logo5_img, c.logo5_name],[c.logo6_img, c.logo6_name],
      ].filter(([,n])=>n)
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
      const brandList = [
        [c.brand1_icon, c.brand1_name],[c.brand2_icon, c.brand2_name],[c.brand3_icon, c.brand3_name],
        [c.brand4_icon, c.brand4_name],[c.brand5_icon, c.brand5_name],[c.brand6_icon, c.brand6_name],
      ].filter(([,n])=>n)
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
      const svcs = [
        [c.s1_name, c.s1_price, c.s1_duration, c.s1_desc],
        [c.s2_name, c.s2_price, c.s2_duration, c.s2_desc],
        [c.s3_name, c.s3_price, c.s3_duration, c.s3_desc],
        [c.s4_name, c.s4_price, c.s4_duration, c.s4_desc],
        [c.s5_name, c.s5_price, c.s5_duration, c.s5_desc],
      ].filter(([n])=>n)
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
      const advList = [c.adv1, c.adv2, c.adv3, c.adv4, c.adv5, c.adv6].filter(Boolean)
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
      const guarantees = [
        [c.g1_icon, c.g1_label, c.g1_desc],
        [c.g2_icon, c.g2_label, c.g2_desc],
        [c.g3_icon, c.g3_label, c.g3_desc],
        [c.g4_icon, c.g4_label, c.g4_desc],
      ].filter(([,l])=>l)
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

    case "sales_counter": return (
      <div style={{ padding: "10px 16px", ...s }}>
        <div style={{ background: "rgba(239,68,68,0.08)", border: "1.5px solid rgba(239,68,68,0.25)", borderRadius: 14, padding: "16px", textAlign: "center" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 10, marginBottom: c.subtext ? 6 : 0 }}>
            <span style={{ fontSize: 28 }}>{c.emoji||"🔥"}</span>
            <div>
              <p style={{ color: "#EF4444", fontSize: 28, fontWeight: 700, margin: 0, fontFamily: theme.fontDisplay, lineHeight: 1 }}>
                <span style={{ color: text }}>{c.count||"127"}</span> <span style={{ fontSize: 14 }}>{c.label||"ventes"}</span>
              </p>
              {c.period && <p style={{ color: muted, fontSize: 11, margin: 0 }}>{c.period}</p>}
            </div>
          </div>
          {c.subtext && <p style={{ color: "#EF4444", fontSize: 12, fontWeight: 600, margin: 0 }}>{c.subtext}</p>}
        </div>
      </div>
    )

    case "popular_products": {
      const tops = [
        [c.p1_rank, c.p1_img, c.p1_name, c.p1_price, c.p1_sales, c.p1_url],
        [c.p2_rank, c.p2_img, c.p2_name, c.p2_price, c.p2_sales, c.p2_url],
        [c.p3_rank, null, c.p3_name, c.p3_price, c.p3_sales, c.p3_url],
      ].filter(([,, n])=>n)
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
      const imgs = [c.img1,c.img2,c.img3,c.img4,c.img5,c.img6].filter(Boolean)
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

    case "pdf_viewer": return (
      <div style={{ padding: "10px 16px", ...s }}>
        <div style={{ background: "rgba(78,205,196,0.06)", border: "1.5px solid rgba(78,205,196,0.2)", borderRadius: 14, padding: "16px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: c.url ? 12 : 0 }}>
            <div style={{ width: 44, height: 52, background: "rgba(239,68,68,0.12)", border: "1px solid rgba(239,68,68,0.25)", borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22, flexShrink: 0 }}>📄</div>
            <div style={{ flex: 1 }}>
              <p style={{ color: text, fontSize: 13, fontWeight: 700, margin: "0 0 2px" }}>{c.title||"Mon document PDF"}</p>
              {c.description && <p style={{ color: muted, fontSize: 11, margin: 0 }}>{c.description}</p>}
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
      const videos = [[c.video1_url,c.video1_title],[c.video2_url,c.video2_title],[c.video3_url,c.video3_title]].filter(([u])=>u)
      return (
        <div style={{ padding: "10px 16px", ...s }}>
          {c.title && <p style={{ color: muted, fontSize: 10, textTransform: "uppercase", letterSpacing: 2, margin: "0 0 12px" }}>{c.title}</p>}
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {videos.length===0
              ? [0,1,2].map(i => <div key={i} style={{ height: 90, background: "rgba(255,0,0,0.06)", border: "1px solid rgba(255,0,0,0.15)", borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center", gap: 10 }}><span style={{ fontSize: 24 }}>▶️</span><p style={{ color: muted, fontSize: 11, margin: 0 }}>Vidéo YouTube {i+1}</p></div>)
              : videos.map(([url, title], i) => {
                  const videoId = String(url).match(/(?:v=|youtu\.be\/)([^&\s]+)/)?.[1]
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
      const testi = [[c.t1_video_url,c.t1_name,c.t1_company,c.t1_quote],[c.t2_video_url,c.t2_name,c.t2_company,c.t2_quote]].filter(([,n])=>n)
      return (
        <div style={{ padding: "10px 16px", ...s }}>
          {c.title && <p style={{ color: muted, fontSize: 10, textTransform: "uppercase", letterSpacing: 2, margin: "0 0 12px" }}>{c.title}</p>}
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {testi.length===0
              ? <div style={{ height: 80, background: "rgba(78,205,196,0.06)", border: "1px dashed rgba(78,205,196,0.2)", borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center", color: muted, fontSize: 11 }}>Ajoutez vos témoignages vidéo</div>
              : testi.map(([url, name, company, quote], i) => {
                const videoId = String(url||"").match(/(?:v=|youtu\.be\/)([^&\s]+)/)?.[1]
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
      const logos = [
        [c.logo1,c.logo1_name],[c.logo2,c.logo2_name],[c.logo3,c.logo3_name],[c.logo4,c.logo4_name],
        [c.logo5,c.logo5_name],[c.logo6,c.logo6_name],[c.logo7,c.logo7_name],[c.logo8,c.logo8_name],
      ].filter(([,n])=>n)
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
      const stats = [[c.s1_icon,c.s1_value,c.s1_label],[c.s2_icon,c.s2_value,c.s2_label],[c.s3_icon,c.s3_value,c.s3_label],[c.s4_icon,c.s4_value,c.s4_label]].filter(([,v])=>v)
      return (
        <div style={{ padding: "10px 16px", ...s }}>
          <div style={{ display: "grid", gridTemplateColumns: stats.length<=2 ? "1fr 1fr" : stats.length===3 ? "1fr 1fr 1fr" : "1fr 1fr", gap: 8 }}>
            {stats.length===0
              ? [0,1,2].map(i => <div key={i} style={{ background: primary+"08", border: `1px solid ${primary}15`, borderRadius: 12, padding: "14px 10px", textAlign: "center" }}><p style={{ color: primary, fontSize: 22, fontWeight: 700, margin: "0 0 3px" }}>—</p><p style={{ color: muted, fontSize: 10, margin: 0 }}>Label</p></div>)
              : stats.map(([icon,value,label],i) => (
                <div key={i} style={{ background: primary+"08", border: `1px solid ${primary}15`, borderRadius: 12, padding: "14px 10px", textAlign: "center" }}>
                  {icon && <span style={{ fontSize: 20, display: "block", marginBottom: 4 }}>{icon}</span>}
                  <p style={{ color: primary, fontSize: 22, fontWeight: 700, margin: "0 0 3px", fontFamily: theme.fontDisplay, lineHeight: 1 }}>{value}</p>
                  <p style={{ color: muted, fontSize: 10, margin: 0 }}>{label}</p>
                </div>
              ))}
          </div>
        </div>
      )
    }

    case "scan_counter": return (
      <div style={{ padding: "14px 16px", textAlign: "center", ...s }}>
        <div style={{ display: "inline-flex", alignItems: "center", gap: 10, background: "rgba(57,255,143,0.08)", border: "1px solid rgba(57,255,143,0.2)", borderRadius: 14, padding: "16px 24px" }}>
          <span style={{ fontSize: 28 }}>{c.emoji||"📱"}</span>
          <div>
            <p style={{ color: "var(--success)", fontSize: 32, fontWeight: 700, margin: 0, fontFamily: theme.fontDisplay, lineHeight: 1 }}>1 284</p>
            <p style={{ color: muted, fontSize: 11, margin: "3px 0 0" }}>{c.label||"scans QR ce mois"}</p>
          </div>
        </div>
      </div>
    )

    case "timeline": {
      const events = [[c.e1_date,c.e1_title,c.e1_desc],[c.e2_date,c.e2_title,c.e2_desc],[c.e3_date,c.e3_title,c.e3_desc],[c.e4_date,c.e4_title,c.e4_desc]].filter(([,t])=>t)
      return (
        <div style={{ padding: "10px 16px", ...s }}>
          {c.title && <p style={{ color: muted, fontSize: 10, textTransform: "uppercase", letterSpacing: 2, margin: "0 0 14px" }}>{c.title}</p>}
          <div style={{ position: "relative", paddingLeft: 20 }}>
            <div style={{ position: "absolute", left: 6, top: 8, bottom: 8, width: 2, background: `linear-gradient(180deg,${primary},${primary}40)`, borderRadius: 1 }} />
            {events.length===0
              ? [0,1,2].map(i => (
                <div key={i} style={{ position: "relative", marginBottom: 16 }}>
                  <div style={{ position: "absolute", left: -17, top: 4, width: 10, height: 10, borderRadius: "50%", background: primary, border: `2px solid ${primary}40` }} />
                  <p style={{ color: primary, fontSize: 11, fontWeight: 700, margin: "0 0 2px" }}>202{i+2}</p>
                  <p style={{ color: text, fontSize: 12, fontWeight: 600, margin: "0 0 2px" }}>Étape {i+1}</p>
                  <p style={{ color: muted, fontSize: 11, margin: 0 }}>Description</p>
                </div>
              ))
              : events.map(([date,title,desc],i) => (
                <div key={i} style={{ position: "relative", marginBottom: i<events.length-1 ? 16 : 0 }}>
                  <div style={{ position: "absolute", left: -17, top: 4, width: 10, height: 10, borderRadius: "50%", background: i===events.length-1 ? "var(--success)" : primary, border: `2px solid ${i===events.length-1 ? "var(--success)40" : primary+"40"}` }} />
                  <p style={{ color: primary, fontSize: 11, fontWeight: 700, margin: "0 0 2px" }}>{date}</p>
                  <p style={{ color: text, fontSize: 12, fontWeight: 600, margin: "0 0 2px" }}>{title}</p>
                  {desc && <p style={{ color: muted, fontSize: 11, margin: 0 }}>{desc}</p>}
                </div>
              ))}
          </div>
        </div>
      )
    }

    case "process_steps": {
      const steps = [[c.s1_icon,c.s1_title,c.s1_desc],[c.s2_icon,c.s2_title,c.s2_desc],[c.s3_icon,c.s3_title,c.s3_desc],[c.s4_icon,c.s4_title,c.s4_desc]].filter(([,t])=>t)
      return (
        <div style={{ padding: "10px 16px", ...s }}>
          {c.title && <p style={{ color: muted, fontSize: 10, textTransform: "uppercase", letterSpacing: 2, margin: "0 0 12px" }}>{c.title}</p>}
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {steps.length===0
              ? [1,2,3].map(i => (
                <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
                  <div style={{ width: 28, height: 28, borderRadius: "50%", background: primary, color: "#080808", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 700, flexShrink: 0 }}>{i}</div>
                  <div><p style={{ color: text, fontSize: 12, fontWeight: 700, margin: 0 }}>Étape {i}</p></div>
                </div>
              ))
              : steps.map(([icon,title,desc],i) => (
                <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
                  <div style={{ width: 32, height: 32, borderRadius: "50%", background: `linear-gradient(135deg,${primary},${accent})`, color: "#080808", display: "flex", alignItems: "center", justifyContent: "center", fontSize: icon ? 16 : 13, fontWeight: 700, flexShrink: 0 }}>{icon||i+1}</div>
                  <div style={{ flex: 1 }}>
                    <p style={{ color: text, fontSize: 12, fontWeight: 700, margin: "4px 0 2px" }}>{title}</p>
                    {desc && <p style={{ color: muted, fontSize: 11, margin: 0 }}>{desc}</p>}
                  </div>
                  {i < steps.length-1 && <div style={{ position: "absolute", left: 31, marginTop: 32, width: 2, height: 16, background: primary+"30" }} />}
                </div>
              ))}
          </div>
        </div>
      )
    }

    case "values": {
      const vals = [[c.v1_icon,c.v1_label,c.v1_desc],[c.v2_icon,c.v2_label,c.v2_desc],[c.v3_icon,c.v3_label,c.v3_desc],[c.v4_icon,c.v4_label,c.v4_desc]].filter(([,l])=>l)
      return (
        <div style={{ padding: "10px 16px", ...s }}>
          {c.title && <p style={{ color: muted, fontSize: 10, textTransform: "uppercase", letterSpacing: 2, margin: "0 0 10px" }}>{c.title}</p>}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
            {(vals.length===0 ? [[" 🤝","Transparence",""],[" ⚡","Réactivité",""],[" 🎯","Qualité",""]] : vals).map(([icon,label,desc],i) => (
              <div key={i} style={{ background: primary+"08", border: `1px solid ${primary}15`, borderRadius: 12, padding: "12px 10px", textAlign: "center" }}>
                <span style={{ fontSize: 24, display: "block", marginBottom: 6 }}>{icon}</span>
                <p style={{ color: text, fontSize: 12, fontWeight: 700, margin: desc ? "0 0 3px" : "0" }}>{label}</p>
                {desc && <p style={{ color: muted, fontSize: 10, margin: 0 }}>{desc}</p>}
              </div>
            ))}
          </div>
        </div>
      )
    }

    case "team": {
      const members = [[c.m1_photo,c.m1_name,c.m1_role,c.m1_bio],[c.m2_photo,c.m2_name,c.m2_role,c.m2_bio],[c.m3_photo,c.m3_name,c.m3_role,c.m3_bio]].filter(([,n])=>n)
      return (
        <div style={{ padding: "10px 16px", ...s }}>
          {c.title && <p style={{ color: muted, fontSize: 10, textTransform: "uppercase", letterSpacing: 2, margin: "0 0 12px" }}>{c.title}</p>}
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {members.length===0
              ? [0,1].map(i => (
                <div key={i} style={{ display: "flex", alignItems: "center", gap: 12, background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 12, padding: "12px 14px" }}>
                  <div style={{ width: 44, height: 44, borderRadius: "50%", background: primary+"20", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20, flexShrink: 0 }}>👤</div>
                  <div><p style={{ color: text, fontSize: 13, fontWeight: 700, margin: "0 0 2px" }}>Prénom Nom</p><p style={{ color: muted, fontSize: 11, margin: 0 }}>Poste</p></div>
                </div>
              ))
              : members.map(([photo,name,role,bio],i) => (
                <div key={i} style={{ display: "flex", alignItems: "center", gap: 12, background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 12, padding: "12px 14px" }}>
                  {photo
                    ? <img src={String(photo)} alt={String(name)} style={{ width: 44, height: 44, borderRadius: "50%", objectFit: "cover", flexShrink: 0, border: `2px solid ${primary}40` }} />
                    : <div style={{ width: 44, height: 44, borderRadius: "50%", background: `linear-gradient(135deg,${primary},${accent})`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, fontWeight: 700, color: "#080808", flexShrink: 0 }}>{String(name)[0]}</div>}
                  <div>
                    <p style={{ color: text, fontSize: 13, fontWeight: 700, margin: "0 0 2px" }}>{name}</p>
                    <p style={{ color: primary, fontSize: 11, margin: "0 0 1px" }}>{role}</p>
                    {bio && <p style={{ color: muted, fontSize: 10, margin: 0 }}>{bio}</p>}
                  </div>
                </div>
              ))}
          </div>
        </div>
      )
    }

    case "engagements": {
      const engList = [c.e1,c.e2,c.e3,c.e4,c.e5,c.e6].filter(Boolean)
      return (
        <div style={{ padding: "10px 16px", ...s }}>
          {c.title && <p style={{ color: muted, fontSize: 10, textTransform: "uppercase", letterSpacing: 2, margin: "0 0 10px" }}>{c.title}</p>}
          <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
            {(engList.length===0 ? ["✅ Réponse sous 24h","✅ Satisfaction garantie","✅ Sans engagement"] : engList).map((eng: string, i: number) => (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 12px", background: "rgba(57,255,143,0.05)", border: "1px solid rgba(57,255,143,0.15)", borderRadius: 10 }}>
                <p style={{ color: text, fontSize: 13, margin: 0, lineHeight: 1.4 }}>{eng}</p>
              </div>
            ))}
          </div>
        </div>
      )
    }

    case "trust_badge": {
      const badges = [[c.b1_icon,c.b1_label],[c.b2_icon,c.b2_label],[c.b3_icon,c.b3_label],[c.b4_icon,c.b4_label]].filter(([,l])=>l)
      return (
        <div style={{ padding: "10px 16px", ...s }}>
          {c.title && <p style={{ color: muted, fontSize: 10, textTransform: "uppercase", letterSpacing: 2, margin: "0 0 10px", textAlign: "center" }}>{c.title}</p>}
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8, justifyContent: "center" }}>
            {(badges.length===0 ? [["✔","Vérifié"],["🏆","Certifié"],["⭐","Partenaire officiel"]] : badges).map(([icon,label],i) => (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: 7, background: "rgba(57,255,143,0.08)", border: "1px solid rgba(57,255,143,0.2)", borderRadius: 20, padding: "7px 14px" }}>
                <span style={{ color: "var(--success)", fontSize: 14, fontWeight: 700 }}>{icon}</span>
                <span style={{ color: text, fontSize: 12, fontWeight: 600 }}>{label}</span>
              </div>
            ))}
          </div>
        </div>
      )
    }

    case "quote_block": return (
      <div style={{ padding: "14px 16px", ...s }}>
        <div style={{ background: primary+"08", border: `1px solid ${primary}20`, borderRadius: 14, padding: "18px 16px", position: "relative" }}>
          <span style={{ position: "absolute", top: 10, left: 14, color: primary, fontSize: 36, fontFamily: "Georgia, serif", lineHeight: 1, opacity: 0.4 }}>"</span>
          <p style={{ color: text, fontSize: 15, fontStyle: "italic", lineHeight: 1.7, margin: "0 0 10px", paddingTop: 10, fontFamily: theme.fontDisplay }}>{c.quote||"La qualité n est jamais un accident."}</p>
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
      const typeStyles: Record<string,any> = {
        warning: { bg: "rgba(251,191,36,0.08)", border: "rgba(251,191,36,0.3)", color: "#FBBF24" },
        info: { bg: "rgba(56,189,248,0.08)", border: "rgba(56,189,248,0.3)", color: "var(--action)" },
        success: { bg: "rgba(57,255,143,0.08)", border: "rgba(57,255,143,0.3)", color: "var(--success)" },
        promo: { bg: "color-mix(in srgb, var(--accent) 8%, transparent)", border: "color-mix(in srgb, var(--accent) 30%, transparent)", color: "var(--accent)" },
      }
      const ts = typeStyles[c.type||"warning"]
      return (
        <div style={{ padding: "8px 16px", ...s }}>
          <div style={{ background: ts.bg, border: `1.5px solid ${ts.border}`, borderRadius: 12, padding: "14px 16px" }}>
            <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
              <span style={{ fontSize: 22, flexShrink: 0 }}>{c.emoji||"⚠️"}</span>
              <div>
                {c.title && <p style={{ color: ts.color, fontSize: 13, fontWeight: 700, margin: "0 0 4px" }}>{c.title}</p>}
                {c.message && <p style={{ color: text, fontSize: 12, margin: 0, lineHeight: 1.5 }}>{c.message}</p>}
              </div>
            </div>
          </div>
        </div>
      )
    }

    case "info_table": {
      const rows = [[c.r1_label,c.r1_value],[c.r2_label,c.r2_value],[c.r3_label,c.r3_value],[c.r4_label,c.r4_value],[c.r5_label,c.r5_value],[c.r6_label,c.r6_value]].filter(([l])=>l)
      return (
        <div style={{ padding: "10px 16px", ...s }}>
          {c.title && <p style={{ color: muted, fontSize: 10, textTransform: "uppercase", letterSpacing: 2, margin: "0 0 10px" }}>{c.title}</p>}
          <div style={{ display: "flex", flexDirection: "column" }}>
            {(rows.length===0 ? [["Création","2020"],["Clients","500+"],["Pays","12"]] : rows).map(([label,value],i,arr) => (
              <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "9px 0", borderBottom: i<arr.length-1 ? `1px solid ${dayMode?"rgba(0,0,0,0.06)":"rgba(255,255,255,0.05)"}` : "none" }}>
                <span style={{ color: muted, fontSize: 12 }}>{label}</span>
                <span style={{ color: text, fontSize: 12, fontWeight: 600 }}>{value}</span>
              </div>
            ))}
          </div>
        </div>
      )
    }

    case "founder_message": return (
      <div style={{ padding: "12px 16px", ...s }}>
        <div style={{ background: primary+"06", border: `1px solid ${primary}15`, borderRadius: 14, padding: "16px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12 }}>
            {c.photo
              ? <img src={c.photo} alt="" style={{ width: 50, height: 50, borderRadius: "50%", objectFit: "cover", flexShrink: 0, border: `2px solid ${primary}40` }} />
              : <div style={{ width: 50, height: 50, borderRadius: "50%", background: `linear-gradient(135deg,${primary},${accent})`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22, flexShrink: 0 }}>👤</div>}
            <div>
              <p style={{ color: text, fontSize: 14, fontWeight: 700, margin: "0 0 2px", fontFamily: theme.fontDisplay }}>{c.name||"Jean Dupont"}</p>
              <p style={{ color: primary, fontSize: 11, margin: 0 }}>{c.role||"Fondateur & CEO"}</p>
            </div>
          </div>
          <p style={{ color: muted, fontSize: 12, lineHeight: 1.7, margin: c.signature ? "0 0 10px" : "0", fontStyle: "italic" }}>"{c.message||"Bienvenue ! Notre mission est de vous offrir le meilleur service possible."}"</p>
          {c.signature && <p style={{ color: primary, fontSize: 14, fontFamily: "Georgia, serif", margin: 0, fontStyle: "italic" }}>{c.signature}</p>}
        </div>
      </div>
    )


    case "google_maps_embed": return (
      <div style={{ padding: "10px 16px", ...s }}>
        {c.label && <p style={{ color: muted, fontSize: 10, textTransform: "uppercase", letterSpacing: 2, margin: "0 0 10px" }}>{c.label}</p>}
        {c.embed_url
          ? <iframe src={c.embed_url} width="100%" height={c.height==="lg" ? 200 : c.height==="sm" ? 120 : 160} style={{ border: "none", borderRadius: 12, display: "block" }} loading="lazy" />
          : <div style={{ height: 160, background: "rgba(66,133,244,0.06)", border: "1px solid rgba(66,133,244,0.2)", borderRadius: 12, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 8 }}>
              <span style={{ fontSize: 32 }}>🗺️</span>
              <p style={{ color: muted, fontSize: 11, margin: 0, textAlign: "center" }}>{c.address||"Ajoutez l URL embed Google Maps"}</p>
            </div>}
        {c.show_directions!=="no" && c.address && (
          <a href={`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(c.address)}`} target="_blank" rel="noopener noreferrer"
            style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 7, marginTop: 10, background: "rgba(66,133,244,0.1)", border: "1px solid rgba(66,133,244,0.25)", borderRadius: 9, padding: "10px", color: "#4285F4", textDecoration: "none", fontSize: 12, fontWeight: 700 }}>
            🧭 Obtenir l&apos;itinéraire
          </a>
        )}
      </div>
    )

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
      const contacts = [
        [c.c1_photo, c.c1_name, c.c1_role, c.c1_phone, c.c1_email],
        [c.c2_photo, c.c2_name, c.c2_role, c.c2_phone, c.c2_email],
        [c.c3_photo, c.c3_name, c.c3_role, c.c3_phone, c.c3_email],
      ].filter(([,n])=>n)
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
      const certs = [
        [c.c1_icon,c.c1_name,c.c1_org,c.c1_year],
        [c.c2_icon,c.c2_name,c.c2_org,c.c2_year],
        [c.c3_icon,c.c3_name,c.c3_org,c.c3_year],
        [c.c4_icon,c.c4_name,c.c4_org,c.c4_year],
      ].filter(([,n])=>n)
      return (
        <div style={{ padding: "10px 16px", ...s }}>
          {c.title && <p style={{ color: muted, fontSize: 10, textTransform: "uppercase", letterSpacing: 2, margin: "0 0 10px" }}>{c.title}</p>}
          <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
            {certs.length===0
              ? [["✅","Qualiopi","Ministère du Travail","2023"],["🏆","RGE","ADEME","2024"]].map(([icon,name,org,year],i) => (
                <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, background: primary+"06", border: `1px solid ${primary}15`, borderRadius: 11, padding: "10px 12px" }}>
                  <span style={{ fontSize: 20 }}>{icon}</span>
                  <div style={{ flex: 1 }}><p style={{ color: text, fontSize: 12, fontWeight: 700, margin: 0 }}>{name}</p><p style={{ color: muted, fontSize: 10, margin: 0 }}>{org} · {year}</p></div>
                  <Check size={13} color={primary} />
                </div>
              ))
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
      const svcs = [
        [c.s1_icon,c.s1_label],[c.s2_icon,c.s2_label],[c.s3_icon,c.s3_label],[c.s4_icon,c.s4_label],
        [c.s5_icon,c.s5_label],[c.s6_icon,c.s6_label],[c.s7_icon,c.s7_label],[c.s8_icon,c.s8_label],
      ].filter(([,l])=>l)
      return (
        <div style={{ padding: "10px 16px", ...s }}>
          {c.title && <p style={{ color: muted, fontSize: 10, textTransform: "uppercase", letterSpacing: 2, margin: "0 0 10px" }}>{c.title}</p>}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
            {(svcs.length===0 ? [["♿","Accès PMR"],["📶","WiFi gratuit"],["🚗","Parking"],["💳","CB acceptée"]] : svcs).map(([icon,label],i) => (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: 9, background: "rgba(66,133,244,0.06)", border: "1px solid rgba(66,133,244,0.15)", borderRadius: 10, padding: "10px 12px" }}>
                <span style={{ fontSize: 20, flexShrink: 0 }}>{icon}</span>
                <span style={{ color: text, fontSize: 11, fontWeight: 600 }}>{label}</span>
              </div>
            ))}
          </div>
        </div>
      )
    }


    case "spotify_embed": {
      const getSpotifyId = (url: string, type: string) => {
        const match = url?.match(new RegExp(`spotify\.com\/${type}\/([a-zA-Z0-9]+)`))
        return match?.[1] || null
      }
      const embedType = c.type || "track"
      const spotifyId = c.url ? getSpotifyId(c.url, embedType) : null
      const height = c.size==="lg" ? 352 : c.size==="sm" ? 80 : 152
      return (
        <div style={{ padding: "10px 16px", ...s }}>
          {spotifyId
            ? <iframe src={`https://open.spotify.com/embed/${embedType}/${spotifyId}?utm_source=generator&theme=0`}
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
          {c.cta_label && <div style={{ margin: "0 14px 14px", background: "#1DB954", borderRadius: 10, padding: "11px", textAlign: "center", fontSize: 13, fontWeight: 700, color: "#000" }}>{c.cta_label}</div>}
        </div>
      </div>
    )

    case "discography": {
      const albums = [[c.a1_cover,c.a1_title,c.a1_year,c.a1_type,c.a1_url],[c.a2_cover,c.a2_title,c.a2_year,c.a2_type,c.a2_url],[c.a3_cover,c.a3_title,c.a3_year,c.a3_type,c.a3_url]].filter(([,t])=>t)
      return (
        <div style={{ padding: "10px 16px", ...s }}>
          {c.title && <p style={{ color: muted, fontSize: 10, textTransform: "uppercase", letterSpacing: 2, margin: "0 0 12px" }}>{c.title}</p>}
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {albums.length===0
              ? [["","Album 1","2024","Album"],["","Single","2023","Single"]].map(([,title,year,type],i) => (
                <div key={i} style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <div style={{ width: 52, height: 52, borderRadius: 8, background: "rgba(29,185,84,0.1)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 24, flexShrink: 0 }}>💿</div>
                  <div style={{ flex: 1 }}><p style={{ color: text, fontSize: 13, fontWeight: 700, margin: "0 0 2px" }}>{title}</p><p style={{ color: muted, fontSize: 11, margin: 0 }}>{type} · {year}</p></div>
                  <span style={{ color: "#1DB954", fontSize: 18 }}>▶</span>
                </div>
              ))
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
            <div style={{ flex: 1, background: "#1DB954", borderRadius: 8, padding: "9px", textAlign: "center", fontSize: 11, fontWeight: 700, color: "#000" }}>{c.cta_label||"Écouter la playlist"}</div>
          )}
        </div>
      </div>
    )

    case "concerts": {
      const shows = [[c.c1_date,c.c1_city,c.c1_venue,c.c1_url],[c.c2_date,c.c2_city,c.c2_venue,c.c2_url],[c.c3_date,c.c3_city,c.c3_venue,c.c3_url],[c.c4_date,c.c4_city,c.c4_venue,c.c4_url]].filter(([,city])=>city)
      return (
        <div style={{ padding: "10px 16px", ...s }}>
          {c.title && <p style={{ color: muted, fontSize: 10, textTransform: "uppercase", letterSpacing: 2, margin: "0 0 12px" }}>{c.title}</p>}
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {shows.length===0
              ? [["15 juin","Paris","L Olympia"],["22 juin","Lyon","Le Transbordeur"]].map(([date,city,venue],i) => (
                <div key={i} style={{ display: "flex", alignItems: "center", gap: 12, background: "rgba(145,70,255,0.06)", border: "1px solid rgba(145,70,255,0.2)", borderRadius: 12, padding: "12px 14px" }}>
                  <div style={{ textAlign: "center", flexShrink: 0, minWidth: 44 }}><p style={{ color: "#9146FF", fontSize: 13, fontWeight: 700, margin: 0 }}>{date}</p></div>
                  <div style={{ flex: 1 }}><p style={{ color: text, fontSize: 13, fontWeight: 700, margin: "0 0 2px" }}>{city}</p><p style={{ color: muted, fontSize: 11, margin: 0 }}>🎭 {venue}</p></div>
                  <div style={{ background: "#9146FF", borderRadius: 7, padding: "6px 12px", fontSize: 11, fontWeight: 700, color: "#fff" }}>Billets</div>
                </div>
              ))
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
            <div style={{ background: "#1DB954", borderRadius: 9, padding: "12px", fontSize: 13, fontWeight: 700, color: "#000" }}>{c.cta_label||"Pré-sauvegarder sur Spotify"}</div>
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
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 8, marginBottom: 12 }}>
            {(products.length===0 ? [[null,"T-shirt","25€"],[null,"Vinyle","35€"],[null,"Casquette","20€"]] : products).map(([img,name,price],i) => (
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
          </div>
          {c.cta_label && <div style={{ background: "linear-gradient(90deg,#9146FF,#7B3FCC)", borderRadius: 9, padding: "11px", textAlign: "center", fontSize: 13, fontWeight: 700, color: "#fff" }}>{c.cta_label}</div>}
        </div>
      )
    }


    case "event_program": {
      const steps = [
        [c.s1_time, c.s1_title, c.s1_desc],
        [c.s2_time, c.s2_title, c.s2_desc],
        [c.s3_time, c.s3_title, c.s3_desc],
        [c.s4_time, c.s4_title, c.s4_desc],
        [c.s5_time, c.s5_title, c.s5_desc],
      ].filter(([,t])=>t)
      return (
        <div style={{ padding: "10px 16px", ...s }}>
          {c.title && <p style={{ color: muted, fontSize: 10, textTransform: "uppercase", letterSpacing: 2, margin: "0 0 12px" }}>{c.title}</p>}
          <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
            {(steps.length===0 ? [["18h00","Accueil","Espace lounge"],["19h00","Concert live","Scène principale"],["22h00","DJ Set","Jusqu au matin"]] : steps).map(([time,title,desc],i,arr) => (
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
      const guests = [[c.g1_photo,c.g1_name,c.g1_role,c.g1_desc],[c.g2_photo,c.g2_name,c.g2_role,c.g2_desc],[c.g3_photo,c.g3_name,c.g3_role,c.g3_desc],[c.g4_photo,c.g4_name,c.g4_role,c.g4_desc]].filter(([,n])=>n)
      return (
        <div style={{ padding: "10px 16px", ...s }}>
          {c.title && <p style={{ color: muted, fontSize: 10, textTransform: "uppercase", letterSpacing: 2, margin: "0 0 12px" }}>{c.title}</p>}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            {(guests.length===0 ? [[null,"DJ Shadow","Headliner","DJ & Producteur"],[null,"Marie D.","Conférencière","CEO Startup"]] : guests).map(([photo,name,role,desc],i) => (
              <div key={i} style={{ background: "rgba(236,72,153,0.06)", border: "1px solid rgba(236,72,153,0.15)", borderRadius: 12, padding: "12px 10px", textAlign: "center" }}>
                {photo
                  ? <img src={String(photo)} alt="" style={{ width: 52, height: 52, borderRadius: "50%", objectFit: "cover", margin: "0 auto 8px", display: "block", border: "2px solid rgba(236,72,153,0.4)" }} />
                  : <div style={{ width: 52, height: 52, borderRadius: "50%", background: "linear-gradient(135deg,#EC4899,#F472B6)", margin: "0 auto 8px", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20, fontWeight: 700, color: "#fff" }}>{String(name)[0]}</div>}
                <p style={{ color: text, fontSize: 12, fontWeight: 700, margin: "0 0 2px" }}>{name}</p>
                {role && <span style={{ background: "rgba(236,72,153,0.12)", border: "1px solid rgba(236,72,153,0.25)", borderRadius: 20, padding: "2px 8px", color: "#EC4899", fontSize: 9, fontWeight: 700 }}>{role}</span>}
                {desc && <p style={{ color: muted, fontSize: 10, margin: "4px 0 0" }}>{desc}</p>}
              </div>
            ))}
          </div>
        </div>
      )
    }

    case "lineup": {
      const artists = [[c.a1_name,c.a1_stage,c.a1_time,c.a1_headliner],[c.a2_name,c.a2_stage,c.a2_time,c.a2_headliner],[c.a3_name,c.a3_stage,c.a3_time,c.a3_headliner],[c.a4_name,c.a4_stage,c.a4_time,c.a4_headliner]].filter(([n])=>n)
      return (
        <div style={{ padding: "10px 16px", ...s }}>
          {c.title && <p style={{ color: muted, fontSize: 10, textTransform: "uppercase", letterSpacing: 2, margin: "0 0 12px" }}>{c.title}</p>}
          <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
            {(artists.length===0 ? [["DJ Shadow","Scène principale","22h00","yes"],["The Blaze","Scène 2","20h00","no"],["Polo & Pan","Scène électro","18h00","no"]] : artists).map(([name,stage,time,headliner],i) => (
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

    case "event_access": return (
      <div style={{ padding: "10px 16px", ...s }}>
        {c.title && <p style={{ color: muted, fontSize: 10, textTransform: "uppercase", letterSpacing: 2, margin: "0 0 10px" }}>{c.title}</p>}
        {c.embed_url
          ? <iframe src={c.embed_url} width="100%" height={150} style={{ border: "none", borderRadius: 12, display: "block", marginBottom: 10 }} loading="lazy" />
          : <div style={{ height: 130, background: "rgba(236,72,153,0.06)", border: "1px solid rgba(236,72,153,0.2)", borderRadius: 12, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 6, marginBottom: 10 }}>
              <span style={{ fontSize: 28 }}>🗺️</span>
              {c.address && <p style={{ color: muted, fontSize: 11, margin: 0, textAlign: "center", padding: "0 14px" }}>📍 {c.address}</p>}
            </div>}
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
            {c.google_url
              ? <>
                  <div style={{ flex: 1, background: "rgba(66,133,244,0.12)", border: "1px solid rgba(66,133,244,0.25)", borderRadius: 8, padding: "9px", textAlign: "center", fontSize: 11, fontWeight: 700, color: "#4285F4" }}>📅 Google</div>
                  <div style={{ flex: 1, background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, padding: "9px", textAlign: "center", fontSize: 11, fontWeight: 700, color: text }}>🍎 Apple</div>
                  <div style={{ flex: 1, background: "rgba(0,120,212,0.1)", border: "1px solid rgba(0,120,212,0.2)", borderRadius: 8, padding: "9px", textAlign: "center", fontSize: 11, fontWeight: 700, color: "#0078D4" }}>📆 Outlook</div>
                </>
              : <div style={{ flex: 1, background: "linear-gradient(90deg,#EC4899,#F472B6)", borderRadius: 9, padding: "11px", textAlign: "center", fontSize: 13, fontWeight: 700, color: "#fff" }}>{c.cta_label||"Ajouter à mon agenda"}</div>}
          </div>
        </div>
      </div>
    )

    case "participants_count": {
      const total = parseInt(c.count||"287")
      const max = parseInt(c.max||"500")
      const pct = Math.min(100, Math.round((total/max)*100))
      return (
        <div style={{ padding: "14px 16px", textAlign: "center", ...s }}>
          <div style={{ display: "inline-flex", alignItems: "center", gap: 12, background: "rgba(236,72,153,0.08)", border: "1px solid rgba(236,72,153,0.2)", borderRadius: 14, padding: "16px 24px", marginBottom: c.show_progress!=="no" ? 12 : 0 }}>
            <span style={{ fontSize: 28 }}>{c.emoji||"👥"}</span>
            <div>
              <p style={{ color: "#EC4899", fontSize: 32, fontWeight: 700, margin: 0, fontFamily: theme.fontDisplay, lineHeight: 1 }}>{c.count||"287"}</p>
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

    case "two_columns": return (
      <div style={{ padding: "10px 16px", ...s }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          {[[c.col1_icon,c.col1_title,c.col1_text],[c.col2_icon,c.col2_title,c.col2_text]].map(([icon,title,text_col],i) => (
            <div key={i} style={{ background: primary+"06", border: `1px solid ${primary}15`, borderRadius: 12, padding: "13px 12px" }}>
              {icon && <span style={{ fontSize: 24, display: "block", marginBottom: 8 }}>{icon}</span>}
              {title && <p style={{ color: text, fontSize: 13, fontWeight: 700, margin: "0 0 5px" }}>{title}</p>}
              {text_col && <p style={{ color: muted, fontSize: 11, margin: 0, lineHeight: 1.6 }}>{text_col}</p>}
              {!title && !text_col && <p style={{ color: muted, fontSize: 11, margin: 0 }}>Colonne {i+1}</p>}
            </div>
          ))}
        </div>
      </div>
    )

    case "grid_section": {
      const cols = parseInt(c.columns||"3")
      const cards = [
        [c.c1_icon,c.c1_title,c.c1_text],[c.c2_icon,c.c2_title,c.c2_text],
        [c.c3_icon,c.c3_title,c.c3_text],[c.c4_icon,c.c4_title,c.c4_text],
        [c.c5_icon,c.c5_title,c.c5_text],[c.c6_icon,c.c6_title,c.c6_text],
      ].filter(([,t])=>t)
      const displayCards = cards.length===0 ? Array.from({length:cols}).map((_,i)=>["⚡",`Carte ${i+1}`,"Description"]) : cards
      return (
        <div style={{ padding: "10px 16px", ...s }}>
          {c.title && <p style={{ color: muted, fontSize: 10, textTransform: "uppercase", letterSpacing: 2, margin: "0 0 12px" }}>{c.title}</p>}
          <div style={{ display: "grid", gridTemplateColumns: `repeat(${cols},1fr)`, gap: 8 }}>
            {displayCards.slice(0, cols*2).map(([icon,title,txt],i) => (
              <div key={i} style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 10, padding: "12px 10px", textAlign: "center" }}>
                {icon && <span style={{ fontSize: 22, display: "block", marginBottom: 6 }}>{icon}</span>}
                <p style={{ color: text, fontSize: 11, fontWeight: 700, margin: "0 0 3px" }}>{title}</p>
                {txt && <p style={{ color: muted, fontSize: 9, margin: 0 }}>{txt}</p>}
              </div>
            ))}
          </div>
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
              <iframe src={c.url} width="100%" height={parseInt(c.height||"400")} style={{ border: "none", borderRadius: 12, display: "block" }} loading="lazy" />
            </div>
          : <div style={{ background: "color-mix(in srgb, var(--accent) 6%, transparent)", border: "1.5px dashed color-mix(in srgb, var(--accent) 25%, transparent)", borderRadius: 12, padding: "30px", textAlign: "center" }}>
              <span style={{ fontSize: 32, display: "block", marginBottom: 10 }}>🔗</span>
              <p style={{ color: text, fontSize: 13, fontWeight: 600, margin: "0 0 5px" }}>{c.title||"Embed externe"}</p>
              <p style={{ color: muted, fontSize: 11, margin: 0 }}>{c.type||"Google Forms, Typeform, Notion..."}</p>
            </div>}
      </div>
    )

    case "tabs_block": { const [activeTab, setActiveTab] = [0, (_:number) => {}] as const
      const tabs = [[c.tab1_label,c.tab1_content],[c.tab2_label,c.tab2_content],[c.tab3_label,c.tab3_content]].filter(([l])=>l)
      return (
        <div style={{ padding: "10px 16px", ...s }}>
          <div style={{ display: "flex", gap: 0, borderBottom: "1px solid rgba(255,255,255,0.08)", marginBottom: 12 }}>
            {(tabs.length===0 ? [["Présentation"],["Tarifs"],["FAQ"]] : tabs).map(([label],i) => (
              <button key={i} onClick={() => setActiveTab(i)}
                style={{ padding: "8px 14px", background: "transparent", border: "none", borderBottom: `2px solid ${activeTab===i ? primary : "transparent"}`, color: activeTab===i ? primary : muted, fontSize: 11, fontWeight: activeTab===i ? 700 : 400, cursor: "pointer", transition: "all 0.15s" }}>
                {label}
              </button>
            ))}
          </div>
          <div style={{ minHeight: 60 }}>
            {tabs.length===0
              ? <p style={{ color: muted, fontSize: 11, margin: 0 }}>Contenu de l onglet {activeTab+1}</p>
              : <p style={{ color: text, fontSize: 12, margin: 0, lineHeight: 1.7 }}>{tabs[activeTab]?.[1]||"Ajoutez du contenu..."}</p>}
          </div>
        </div>
      )
    }

    case "accordion_block": { const [openIdx, setOpenIdx] = [null as number|null, (_:number|null) => {}] as const
      const items = [[c.a1_title,c.a1_content],[c.a2_title,c.a2_content],[c.a3_title,c.a3_content],[c.a4_title,c.a4_content]].filter(([t])=>t)
      return (
        <div style={{ padding: "10px 16px", ...s }}>
          {c.title && <p style={{ color: muted, fontSize: 10, textTransform: "uppercase", letterSpacing: 2, margin: "0 0 10px" }}>{c.title}</p>}
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {(items.length===0 ? [["Nos services","Détail des services..."],["Nos tarifs","Détail des tarifs..."],["Conditions","Nos conditions..."]] : items).map(([title,content],i) => (
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
          </div>
        </div>
      )
    }

    case "info_box": {
      const boxStyles: Record<string,any> = {
        info: { bg: "rgba(56,189,248,0.08)", border: "rgba(56,189,248,0.3)", color: "var(--action)" },
        warning: { bg: "rgba(251,191,36,0.08)", border: "rgba(251,191,36,0.3)", color: "#FBBF24" },
        success: { bg: "rgba(57,255,143,0.08)", border: "rgba(57,255,143,0.3)", color: "var(--success)" },
        tip: { bg: "color-mix(in srgb, var(--accent) 8%, transparent)", border: "color-mix(in srgb, var(--accent) 30%, transparent)", color: "var(--accent)" },
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
                <p style={{ color: text, fontSize: 12, margin: 0, lineHeight: 1.6 }}>{c.message||"Information importante à retenir."}</p>
              </div>
            </div>
          </div>
        </div>
      )
    }

    default: {
      const def = BLOCK_DEFS[block.type]
      return <div style={{ padding: "12px 16px", textAlign: "center", ...s }}><span style={{ fontSize: 22 }}>{def?.icon||"📦"}</span><p style={{ color: muted, fontSize: 11, margin: "5px 0 0" }}>{def?.label||block.type}</p></div>
    }
  }
}

// ── Props ────────────────────────────────────────────────────────────────────
interface TemplatePreviewModalProps {
  template: {
    id: string; name: string; category: string; plan: string
    emoji: string; color: string; accent: string; bg: string; surface: string
    description: string; tags: string[]
  }
  blocks: { type: string; content: Record<string, string> }[]
  onClose: () => void
  onUse: () => void
  canUse: boolean
  isCreating?: boolean
}

const PLAN_LABELS: Record<string, string> = { free: "Gratuit", starter: "Starter", pro: "Pro", business: "Business" }
const MUTED = "#A8A190"
const G = "var(--accent)"

export default function TemplatePreviewModal({
  template, blocks, onClose, onUse, canUse, isCreating
}: TemplatePreviewModalProps) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const isMobile = useIsMobile(768) // mobile : aperçu + panneau empilés et scrollables

  // Fermer avec Escape
  useEffect(() => {
    function onKey(e: KeyboardEvent) { if (e.key === "Escape") onClose() }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [onClose])

  // Empêcher le scroll de la page derrière
  useEffect(() => {
    document.body.style.overflow = "hidden"
    return () => { document.body.style.overflow = "" }
  }, [])

  // Convertir les blocs du template en Block[] pour BlockPreview
  const previewBlocks: Block[] = blocks.map((b, i) => ({
    id: "prev_" + i,
    type: b.type,
    content: b.content,
    visible: true,
  }))

  // Thème reconstruit depuis les props
  const theme: PageTheme = {
    name: template.name,
    bg: template.bg,
    surface: template.surface,
    primary: template.color,
    accent: template.accent,
    text: "#F5F0E8",
    muted: "#A8A190",
    fontDisplay: "Fraunces",
    fontBody: "DM Sans",
    bgMode: "solid",
  }

  const bgStyles = computeBgStyle(theme, false)
  const blockCount = blocks.length
  const setupTime = SETUP_TIME[template.id] || "5 min"

  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed", inset: 0, zIndex: 300,
        background: "rgba(0,0,0,0.88)",
        display: "flex", alignItems: "center", justifyContent: "center",
        padding: "20px 16px",
        backdropFilter: "blur(6px)",
        animation: "tplFadeIn 0.18s ease",
      }}>

      {/* Conteneur central — stop propagation */}
      <div onClick={e => e.stopPropagation()} style={{
        display: "flex",
        flexDirection: isMobile ? "column" : "row",
        gap: isMobile ? 16 : 24,
        alignItems: "center",
        maxWidth: isMobile ? 420 : 820, width: "100%", maxHeight: "92vh",
        overflowY: isMobile ? "auto" : "visible",
        overflowX: "hidden",
        WebkitOverflowScrolling: "touch",
      }}>

        {/* ── Simulation iPhone ──────────────────────────────────────────── */}
        <div style={{ flex: "0 0 auto", display: "flex", flexDirection: "column", alignItems: "center", gap: 12 }}>
          {/* Coque iPhone */}
          <div style={{
            width: isMobile ? 264 : 320, height: isMobile ? 528 : 640,
            background: "#1A1A1A",
            border: "2px solid #333",
            borderRadius: 44,
            padding: "14px 10px",
            boxShadow: "0 0 0 1px #111, 0 24px 64px rgba(0,0,0,0.8), inset 0 1px 0 rgba(255,255,255,0.05)",
            position: "relative",
            display: "flex", flexDirection: "column",
          }}>
            {/* Notch */}
            <div style={{ position: "absolute", top: 14, left: "50%", transform: "translateX(-50%)", width: 100, height: 22, background: "#111", borderRadius: 12, zIndex: 2 }}>
              <div style={{ position: "absolute", right: 24, top: "50%", transform: "translateY(-50%)", width: 10, height: 10, borderRadius: "50%", background: "#222", border: "1px solid #333" }} />
            </div>

            {/* Boutons latéraux (déco) */}
            <div style={{ position: "absolute", left: -3, top: 90, width: 3, height: 28, background: "#333", borderRadius: "2px 0 0 2px" }} />
            <div style={{ position: "absolute", left: -3, top: 130, width: 3, height: 52, background: "#333", borderRadius: "2px 0 0 2px" }} />
            <div style={{ position: "absolute", right: -3, top: 120, width: 3, height: 60, background: "#333", borderRadius: "0 2px 2px 0" }} />

            {/* Écran */}
            <div style={{
              flex: 1, borderRadius: 34, overflow: "hidden",
              position: "relative", marginTop: 8,
            }}>
              {/* Status bar */}
              <div style={{
                height: 28, background: theme.bg,
                display: "flex", alignItems: "center", justifyContent: "space-between",
                padding: "0 16px", flexShrink: 0,
                borderBottom: "1px solid rgba(255,255,255,0.04)",
              }}>
                <span style={{ color: theme.text, fontSize: 10, fontWeight: 700, opacity: 0.8 }}>9:41</span>
                <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
                  <div style={{ display: "flex", gap: 1, alignItems: "flex-end" }}>
                    {[3,4,5,6].map((h,i) => <div key={i} style={{ width: 2, height: h, background: theme.text, opacity: 0.7, borderRadius: 1 }} />)}
                  </div>
                  <svg width="12" height="8" viewBox="0 0 12 8" fill="none">
                    <path d="M6 1.5C7.5 1.5 9 2 10.5 3.2L11.5 2.2C9.8 0.8 8 0 6 0C4 0 2.2 0.8 0.5 2.2L1.5 3.2C3 2 4.5 1.5 6 1.5Z" fill={theme.text} opacity="0.7"/>
                    <path d="M6 4.5C7 4.5 7.9 4.8 8.7 5.4L9.7 4.4C8.6 3.6 7.4 3.2 6 3.2C4.6 3.2 3.4 3.6 2.3 4.4L3.3 5.4C4.1 4.8 5 4.5 6 4.5Z" fill={theme.text} opacity="0.7"/>
                    <circle cx="6" cy="7" r="1" fill={theme.text} opacity="0.8"/>
                  </svg>
                  <div style={{ width: 20, height: 10, border: "1.5px solid " + theme.text, borderRadius: 3, opacity: 0.7, position: "relative" }}>
                    <div style={{ position: "absolute", left: 1, top: 1, bottom: 1, width: "80%", background: theme.text, borderRadius: 1, opacity: 0.8 }} />
                    <div style={{ position: "absolute", right: -3, top: "50%", transform: "translateY(-50%)", width: 2, height: 5, background: theme.text, borderRadius: 1, opacity: 0.5 }} />
                  </div>
                </div>
              </div>

              {/* Page scrollable */}
              <div
                ref={scrollRef}
                style={{
                  flex: 1, overflowY: "auto", height: "100%",
                  ...bgStyles,
                  position: "relative",
                  scrollbarWidth: "none",
                }}
                className="preview-scroll">

                {/* Effets visuels du thème */}
                {(theme as any).effect_noise && (
                  <div style={{ position: "sticky", top: 0, height: 0, zIndex: 2, pointerEvents: "none" }}>
                    <div style={{ position: "absolute", inset: 0, height: "100vh", opacity: (theme as any).noise_opacity/100||0.06, mixBlendMode: "overlay", backgroundImage: NOISE_SVG_URL, backgroundRepeat: "repeat", backgroundSize: "128px" }} />
                  </div>
                )}
                {(theme as any).effect_glow && (
                  <div style={{ position: "sticky", top: 0, height: 0, zIndex: 1, pointerEvents: "none" }}>
                    <div style={{ position: "absolute", inset: 0, height: "60vh", background: `radial-gradient(ellipse at 50% 0%, ${(theme as any).glow_color||G}50, transparent ${(theme as any).glow_size||200}px)` }} />
                  </div>
                )}

                {/* Blocs */}
                <div style={{ minHeight: "100%" }}>
                  {(canUse ? previewBlocks : previewBlocks.slice(0, 2)).map((block, i) => (
                    <BlockPreview key={i} block={block} theme={theme} dayMode={false} />
                  ))}
                  {!canUse && (<div style={{ margin: "8px 16px 0", padding: "24px 16px", borderRadius: 14, background: theme.primary + "0A", border: "1px solid " + theme.primary + "25", textAlign: "center", display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}><div style={{ width: 40, height: 40, borderRadius: "50%", background: theme.primary + "18", border: "1px solid " + theme.primary + "40", display: "flex", alignItems: "center", justifyContent: "center" }}><Lock size={16} color={theme.primary} /></div><p style={{ color: theme.text, fontSize: 13, fontWeight: 700, margin: 0 }}>Apercu limite</p><p style={{ color: theme.muted, fontSize: 11, margin: 0, lineHeight: 1.5 }}>{previewBlocks.length > 2 ? "+" + (previewBlocks.length - 2) + " blocs reserves au plan superieur" : "Reserve a un plan superieur"}</p></div>)}<div style={{ height: 40 }} />
                </div>
              </div>
            </div>

            {/* Home indicator */}
            <div style={{ height: 6, display: "flex", alignItems: "center", justifyContent: "center", marginTop: 4 }}>
              <div style={{ width: 100, height: 3, background: "rgba(255,255,255,0.25)", borderRadius: 2 }} />
            </div>
          </div>

          {/* Label sous l'iPhone */}
          <div style={{ display: "flex", alignItems: "center", gap: 6, color: MUTED, fontSize: 11 }}>
            <div style={{ width: 6, height: 6, borderRadius: "50%", background: "var(--success)", animation: "pulse 2s ease-in-out infinite" }} />
            Aperçu en temps réel
          </div>
        </div>

        {/* ── Panneau info ───────────────────────────────────────────────── */}
        <div style={{
          flex: isMobile ? "0 0 auto" : 1, width: isMobile ? "100%" : "auto",
          background: "#0F0E0B",
          border: "1px solid color-mix(in srgb, var(--accent) 15%, transparent)",
          borderRadius: 20, padding: isMobile ? "20px" : "24px",
          display: "flex", flexDirection: "column", gap: 20,
          maxHeight: isMobile ? "none" : "90vh", overflowY: isMobile ? "visible" : "auto",
          scrollbarWidth: "none",
        }}>
          {/* Header */}
          <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
            <div style={{ width: 48, height: 48, background: template.bg, border: "1.5px solid " + template.color + "30", borderRadius: 12, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 24, flexShrink: 0 }}>
              {template.emoji}
            </div>
            <div style={{ flex: 1 }}>
              <h2 style={{ color: "#F5F0E8", fontSize: 18, fontWeight: 700, margin: "0 0 4px" }}>{template.name}</h2>
              <span style={{ background: template.color + "15", border: "1px solid " + template.color + "25", borderRadius: 8, padding: "2px 8px", fontSize: 10, color: template.color, fontWeight: 600 }}>{template.category}</span>
            </div>
            <button type="button" onClick={onClose} style={{ width: 32, height: 32, borderRadius: 9, background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", flexShrink: 0 }}>
              <X size={14} color={MUTED} />
            </button>
          </div>

          {/* Description */}
          <p style={{ color: MUTED, fontSize: 13, margin: 0, lineHeight: 1.7 }}>{template.description}</p>

          {/* Stats */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            {[
              { icon: <Layers size={14} color={template.color} />, label: "Blocs inclus", value: blockCount + " blocs" },
              { icon: <Clock size={14} color={template.color} />, label: "Temps de setup", value: "≈ " + setupTime },
            ].map((stat, i) => (
              <div key={i} style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 10, padding: "12px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
                  {stat.icon}
                  <span style={{ color: MUTED, fontSize: 10 }}>{stat.label}</span>
                </div>
                <span style={{ color: "#F5F0E8", fontSize: 15, fontWeight: 700 }}>{stat.value}</span>
              </div>
            ))}
          </div>

          {/* Liste des blocs */}
          <div>
            <p style={{ color: MUTED, fontSize: 10, fontWeight: 700, letterSpacing: 1.5, textTransform: "uppercase", margin: "0 0 10px" }}>Blocs du template</p>
            <div style={{ display: "flex", flexDirection: "column", gap: 5, maxHeight: 220, overflowY: "auto", scrollbarWidth: "none" }}>
            {(canUse ? blocks : blocks.slice(0, 3)).map((block, i) => {
                const def = BLOCK_DEFS[block.type]
                return (
                  <div key={i} style={{ display: "flex", alignItems: "center", gap: 8, padding: "7px 10px", background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.05)", borderRadius: 8 }}>
                    <Check size={10} color={template.color} />
                    <span style={{ fontSize: 14 }}>{def?.icon || "📦"}</span>
                    <span style={{ color: "#F5F0E8", fontSize: 11, fontWeight: 500, flex: 1 }}>{def?.label || block.type}</span>
                    <span style={{ color: MUTED, fontSize: 9, opacity: 0.6 }}>{i + 1}</span>
                  </div>
                )
              })}
         </div>
            {!canUse && blocks.length > 3 && (
              <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 10px", marginTop: 5, background: "color-mix(in srgb, var(--accent) 6%, transparent)", border: "1px dashed color-mix(in srgb, var(--accent) 30%, transparent)", borderRadius: 8 }}>
                <Lock size={11} color={template.color} />
                <span style={{ color: MUTED, fontSize: 11, fontWeight: 500, flex: 1 }}>+{blocks.length - 3} blocs reserves au plan superieur</span>
              </div>
            )}
          </div>

          {/* Tags */}
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            {template.tags.map((tag, i) => (
              <span key={i} style={{ background: template.color + "10", border: "1px solid " + template.color + "20", borderRadius: 6, padding: "3px 9px", fontSize: 10, color: template.color, fontWeight: 500 }}>{tag}</span>
            ))}
          </div>

          {/* Aperçu couleurs thème */}
          <div>
            <p style={{ color: MUTED, fontSize: 10, fontWeight: 700, letterSpacing: 1.5, textTransform: "uppercase", margin: "0 0 8px" }}>Palette de couleurs</p>
            <div style={{ display: "flex", gap: 6 }}>
              {[
                { c: template.bg, label: "Fond" },
                { c: template.surface, label: "Surface" },
                { c: template.color, label: "Primaire" },
                { c: template.accent, label: "Accent" },
                { c: "#F5F0E8", label: "Texte" },
              ].map((col, i) => (
                <div key={i} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
                  <div style={{ width: 32, height: 32, borderRadius: 8, background: col.c, border: "1px solid rgba(255,255,255,0.1)", boxShadow: "0 2px 8px rgba(0,0,0,0.4)" }} />
                  <span style={{ color: MUTED, fontSize: 8, textAlign: "center" }}>{col.label}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Action principale — sticky en bas sur mobile (toujours accessible sans scroller) */}
          <div style={{ marginTop: "auto", display: "flex", gap: 10,
            ...(isMobile ? { position: "sticky" as const, bottom: 0, margin: "12px -20px 0", padding: "12px 20px calc(4px + env(safe-area-inset-bottom))", background: "rgba(16,15,10,0.92)", backdropFilter: "blur(8px)", borderTop: "1px solid rgba(255,255,255,0.08)", zIndex: 3 } : {}) }}>
            <button type="button" onClick={onClose} style={{ padding: "12px 16px", background: "transparent", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 11, color: MUTED, fontSize: 12, cursor: "pointer", display: "flex", alignItems: "center", gap: 6 }}>
              <X size={12} /> Fermer
            </button>
            <button type="button" onClick={onUse} disabled={!!isCreating}
              style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 8, padding: "12px", background: canUse ? "linear-gradient(90deg,var(--accent),color-mix(in srgb, var(--accent) 75%, #000))" : "rgba(255,255,255,0.05)", border: canUse ? "none" : "1px solid rgba(255,255,255,0.08)", borderRadius: 11, color: canUse ? "#080808" : MUTED, fontSize: 13, fontWeight: 700, cursor: isCreating ? "wait" : canUse ? "pointer" : "not-allowed", opacity: isCreating ? 0.7 : 1, transition: "all 0.15s" }}>
              {isCreating
                ? <><div style={{ width: 12, height: 12, border: "2px solid var(--accent)", borderTopColor: "transparent", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} /> Création...</>
                : canUse
                  ? <><ArrowRight size={14} /> Utiliser ce template</>
                  : <><Lock size={12} /> Plan {PLAN_LABELS[template.plan]} requis</>
              }
            </button>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes tplFadeIn { from { opacity: 0; transform: scale(0.97) } to { opacity: 1; transform: scale(1) } }
        @keyframes spin { to { transform: rotate(360deg) } }
        @keyframes pulse { 0%,100% { opacity:1 } 50% { opacity:0.4 } }
        .preview-scroll::-webkit-scrollbar { display: none }
      `}</style>
    </div>
  )
}
