  "use client"

  import { useState, useRef, useEffect, useCallback, Component } from "react"
  import {
    X, ChevronUp, ChevronDown, Trash2,
    Eye, Plus, Settings, Check, Search, Copy, EyeOff,
    ExternalLink, Palette, GripVertical, QrCode, MoreHorizontal, Undo2, Redo2
  } from "lucide-react"
  import { BLOCK_DEFS, BLOCK_CATEGORIES, BLOCK_HINTS, PRESET_CATEGORIES, SOCIAL_NETWORKS, PRESET_THEMES, IDENTITY_PRESETS, ACTION_PRESETS, COMMERCE_PRESETS, MEDIA_PRESETS, SOCIAL_PRESETS, INFO_PRESETS, SOCIAL_URL_TEMPLATES, AVAILABILITY_STATUSES, availabilityStatus, profileBadgeStyle, productBadgeStyle, priceDiscount, countdownParts, stockStatus, paymentBrand, paymentLink, starRow, openStatus, DAY_KEYS, mapEmbedUrl, calendarLinks, spotifyEmbedUrl, youtubeId, docTypeMeta, docActionLabel, announcementMeta, optionLabel, blockDecoration, BLOCK_GRADIENTS, BLOCK_RADIUS_OPTIONS, BLOCK_SHADOW_OPTIONS, BLOCK_SPACE_OPTIONS, BLOCK_WIDTH_OPTIONS, BLOCK_ANIM_OPTIONS, BLOCK_ANIM_SPEED_OPTIONS, BLOCK_HOVER_OPTIONS, BLOCK_LOOP_OPTIONS, BLOCK_INTENSITY_OPTIONS, BLOCK_STYLE_PRESETS, ctaButtonStyle, CTA_ANIM_CSS, stickyActionHref, GOOGLE_FONTS, hexToRgb, rgbToHsl, contrastRatio, wcagLevel, avatarShapeStyle, avatarDecoStyle, avatarBgStyle, bannerBackgroundStyle, bannerHeight, bannerImageStyle, bannerTitleStyle, bannerOverlayLayers, bannerFrame, BANNER_ANIM_CSS, type Block, type BlockContent, type PageTheme } from "./types"
  import { PAGE_TEMPLATES, PAGE_TEMPLATE_GROUPS, type PageTemplate } from "./page-templates"
  import { useUndoRedo, useResize } from "./builderHooks"
  import { G, MUTED } from "./builderConstants"
  import { BlockPreview } from "./builderPreview"
  import { useIsMobile } from "@/lib/useIsMobile"
  import { useToast } from "@/components/Toast"
  import BannerStudio from "./BannerStudio"
  import ImageUpload from "./ImageUpload"
  import FileUpload from "./FileUpload"
  import QRCanvas from "../qr-codes/QRCanvas"
  import { getQRBlob, downloadBlob } from "../qr-codes/qrRender"
  import { createClient } from "@/lib/supabase/client"

  // Helper module-scope (evite la temporal-dead-zone du UUID_RE interne au composant).
  const IS_UUID = (s?: string | null): boolean => !!s && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s)

  // Frontiere d'erreur : isole un apercu de bloc qui planterait (contenu en cours d'edition
  // malforme) pour ne pas crasher toute la session du builder.
  class PreviewBoundary extends Component<{ children: React.ReactNode }, { failed: boolean }> {
    constructor(props: { children: React.ReactNode }) { super(props); this.state = { failed: false } }
    static getDerivedStateFromError() { return { failed: true } }
    componentDidUpdate(prev: { children: React.ReactNode }) { if (prev.children !== this.props.children && this.state.failed) this.setState({ failed: false }) }
    render() { return this.state.failed
      ? <div style={{ padding: "12px 16px", textAlign: "center", color: "#A8A190", fontSize: 11 }}>⚠ Aperçu indisponible pour ce bloc</div>
      : this.props.children }
  }

  const NOISE_SVG_URL = "url('data:image/svg+xml,%3Csvg viewBox=%270 0 200 200%27 xmlns=%27http://www.w3.org/2000/svg%27%3E%3Cfilter id=%27n%27%3E%3CfeTurbulence type=%27fractalNoise%27 baseFrequency=%270.9%27 numOctaves=%274%27 stitchTiles=%27stitch%27/%3E%3C/filter%3E%3Crect width=%27100%25%27 height=%27100%25%27 filter=%27url(%23n)%27/%3E%3C/svg%3E')"
  type Message = { role: "user" | "assistant"; content: string }


  function GalleryImagesEditor({ block, onChange }: { block: Block; onChange: (key: string, val: string) => void }) {
    const M = "#A8A190", TXT = "#F5F0E8", GG = "var(--accent, #C9A84C)"
    const isCarousel = block.type === "image_carousel"
    const KEYS = ["img1", "img2", "img3", "img4", "img5", "img6", "img7", "img8", "img9", "img10", "img11", "img12"]
    const MAX = KEYS.length
    const imgs: string[] = KEYS.map(k => block.content[k]).filter(Boolean) as string[]
    const write = (arr: string[]) => KEYS.forEach((k, i) => onChange(k, arr[i] || ""))
    const move = (i: number, d: number) => { const j = i + d; if (j < 0 || j >= imgs.length) return; const a = [...imgs];[a[i], a[j]] = [a[j], a[i]]; write(a) }
    const replaceAt = (i: number, url: string) => { if (!url) { write(imgs.filter((_, j) => j !== i)); return } const a = [...imgs]; a[i] = url; write(a) }
    const add = (url: string) => { if (url && imgs.length < MAX) write([...imgs, url]) }
    const inputStyle: React.CSSProperties = { width: "100%", background: "#0A0A0A", border: "1px solid rgba(201,168,76,0.2)", borderRadius: 8, padding: "9px 11px", color: TXT, fontSize: 12, outline: "none", boxSizing: "border-box" }
    const Seg = ({ opts, val, k }: { opts: { k: string; l: string }[]; val: string; k: string }) => (
      <div style={{ display: "flex", gap: 4, background: "rgba(255,255,255,0.04)", borderRadius: 9, padding: 3 }}>
        {opts.map(o => <button key={o.k} type="button" onClick={() => onChange(k, o.k)} style={{ flex: 1, padding: "7px 4px", borderRadius: 7, background: val === o.k ? GG : "transparent", border: "none", color: val === o.k ? "#080808" : M, fontSize: 11, fontWeight: val === o.k ? 700 : 500, cursor: "pointer" }}>{o.l}</button>)}
      </div>
    )
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 13 }}>
        <div>
          <label style={{ color: M, fontSize: 11, display: "block", marginBottom: 5, fontWeight: 500 }}>Titre (optionnel)</label>
          <input value={block.content.title || ""} placeholder={isCarousel ? "Mes photos" : "Ma galerie"} onChange={e => onChange("title", e.target.value)} style={inputStyle} />
        </div>
        {isCarousel ? (
          <div><label style={{ color: M, fontSize: 11, display: "block", marginBottom: 6, fontWeight: 500 }}>Défilement automatique</label><Seg k="auto_play" val={block.content.auto_play || "no"} opts={[{ k: "no", l: "Non" }, { k: "yes", l: "Oui" }]} /></div>
        ) : (<>
          <div><label style={{ color: M, fontSize: 11, display: "block", marginBottom: 6, fontWeight: 500 }}>Affichage</label><Seg k="layout" val={block.content.layout || "grid"} opts={[{ k: "grid", l: "Grille" }, { k: "masonry", l: "Mosaïque" }, { k: "compact", l: "Compact" }]} /></div>
          <div><label style={{ color: M, fontSize: 11, display: "block", marginBottom: 6, fontWeight: 500 }}>Colonnes (ordinateur)</label><Seg k="columns" val={block.content.columns || "3"} opts={[{ k: "2", l: "2" }, { k: "3", l: "3" }, { k: "4", l: "4" }]} /></div>
          <div><label style={{ color: M, fontSize: 11, display: "block", marginBottom: 6, fontWeight: 500 }}>Colonnes (mobile)</label><Seg k="columns_mobile" val={block.content.columns_mobile || "2"} opts={[{ k: "1", l: "1" }, { k: "2", l: "2" }, { k: "3", l: "3" }]} /></div>
        </>)}
        <div>
          <label style={{ color: M, fontSize: 11, display: "flex", justifyContent: "space-between", marginBottom: 6, fontWeight: 500 }}><span>Images</span><span>{imgs.length}/{MAX}</span></label>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {imgs.map((img, i) => (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                  <button type="button" onClick={() => move(i, -1)} disabled={i === 0} title="Monter" style={{ background: "none", border: "none", cursor: i === 0 ? "default" : "pointer", color: i === 0 ? "rgba(255,255,255,0.15)" : M, padding: 0, lineHeight: 0.7, fontSize: 11 }}>▲</button>
                  <button type="button" onClick={() => move(i, 1)} disabled={i === imgs.length - 1} title="Descendre" style={{ background: "none", border: "none", cursor: i === imgs.length - 1 ? "default" : "pointer", color: i === imgs.length - 1 ? "rgba(255,255,255,0.15)" : M, padding: 0, lineHeight: 0.7, fontSize: 11 }}>▼</button>
                </span>
                <img src={img} alt="" style={{ width: 44, height: 44, borderRadius: 8, objectFit: "cover", flexShrink: 0 }} />
                <span style={{ flex: 1, color: M, fontSize: 11 }}>Image {i + 1}</span>
                <button type="button" onClick={() => replaceAt(i, "")} title="Retirer" style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.2)", borderRadius: 6, width: 24, height: 24, cursor: "pointer", color: "#EF4444", flexShrink: 0 }}>×</button>
              </div>
            ))}
          </div>
          {imgs.length < MAX && <div style={{ marginTop: 8 }}><ImageUpload value="" onChange={add} hint="Ajouter une image" /></div>}
        </div>
      </div>
    )
  }

  function SkillsEditor({ content, onChange }: { content: BlockContent; onChange: (key: string, val: string) => void }) {
    const M = "#A8A190", TXT = "#F5F0E8", GG = "var(--accent, #C9A84C)"
    const tags: string[] = String(content.tags || "").split(",").map(t => t.trim()).filter(Boolean)
    const [input, setInput] = useState("")
    const commit = (arr: string[]) => onChange("tags", arr.join(", "))
    const add = (v: string) => { const t = v.trim(); if (!t) return; if (!tags.some(x => x.toLowerCase() === t.toLowerCase())) commit([...tags, t]); setInput("") }
    const remove = (i: number) => commit(tags.filter((_, j) => j !== i))
    const move = (i: number, d: number) => { const j = i + d; if (j < 0 || j >= tags.length) return; const a = [...tags];[a[i], a[j]] = [a[j], a[i]]; commit(a) }
    const PRESETS: { label: string; tags: string[] }[] = [
      { label: "Créatif", tags: ["Photographie", "Retouche", "Direction artistique"] },
      { label: "Dév / Tech", tags: ["React", "TypeScript", "UI/UX"] },
      { label: "Coach", tags: ["Coaching", "Nutrition", "Motivation"] },
      { label: "Marketing", tags: ["SEO", "Contenu", "Réseaux sociaux"] },
      { label: "Resto / Bar", tags: ["Cuisine", "Cocktails", "Fait maison"] },
      { label: "Business", tags: ["Conseil", "Stratégie", "Gestion"] },
    ]
    const inputStyle: React.CSSProperties = { width: "100%", background: "#0A0A0A", border: "1px solid rgba(201,168,76,0.2)", borderRadius: 8, padding: "9px 11px", color: TXT, fontSize: 12, outline: "none", boxSizing: "border-box" }
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 13 }}>
        <div>
          <label style={{ color: M, fontSize: 11, display: "block", marginBottom: 5, fontWeight: 500 }}>Titre (optionnel)</label>
          <input value={content.title || ""} placeholder="Mes compétences" onChange={e => onChange("title", e.target.value)} style={inputStyle} />
        </div>
        <div>
          <label style={{ color: M, fontSize: 11, display: "flex", justifyContent: "space-between", marginBottom: 6, fontWeight: 500 }}><span>Compétences</span><span style={{ color: M, fontSize: 10 }}>{tags.length}</span></label>
          {tags.length === 0 && <p style={{ color: M, fontSize: 11, margin: "0 0 8px", fontStyle: "italic" }}>Aucune compétence. Ajoutez-en ci-dessous ou via un modèle.</p>}
          <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
            {tags.map((t, i) => (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: 6, background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 8, padding: "6px 8px" }}>
                <span style={{ display: "flex", flexDirection: "column", gap: 1 }}>
                  <button type="button" onClick={() => move(i, -1)} disabled={i === 0} title="Monter" style={{ background: "none", border: "none", cursor: i === 0 ? "default" : "pointer", color: i === 0 ? "rgba(255,255,255,0.15)" : M, padding: 0, lineHeight: 0.7, fontSize: 10 }}>▲</button>
                  <button type="button" onClick={() => move(i, 1)} disabled={i === tags.length - 1} title="Descendre" style={{ background: "none", border: "none", cursor: i === tags.length - 1 ? "default" : "pointer", color: i === tags.length - 1 ? "rgba(255,255,255,0.15)" : M, padding: 0, lineHeight: 0.7, fontSize: 10 }}>▼</button>
                </span>
                <span style={{ flex: 1, color: TXT, fontSize: 12.5, fontWeight: 600 }}>{t}</span>
                <button type="button" onClick={() => remove(i)} title="Supprimer" style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.2)", borderRadius: 6, width: 22, height: 22, cursor: "pointer", color: "#EF4444", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>×</button>
              </div>
            ))}
          </div>
          <div style={{ display: "flex", gap: 6, marginTop: 8 }}>
            <input value={input} placeholder="Ajouter une compétence…" onChange={e => setInput(e.target.value)} onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); add(input) } }} style={inputStyle} />
            <button type="button" onClick={() => add(input)} disabled={!input.trim()} style={{ flexShrink: 0, background: GG, border: "none", borderRadius: 8, padding: "0 14px", color: "#080808", fontSize: 13, fontWeight: 700, cursor: input.trim() ? "pointer" : "not-allowed", opacity: input.trim() ? 1 : 0.5 }}>+</button>
          </div>
        </div>
        <div>
          <label style={{ color: M, fontSize: 11, display: "block", marginBottom: 6, fontWeight: 500 }}>Modèles rapides (ajoute les compétences)</label>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
            {PRESETS.map(p => (
              <button key={p.label} type="button" onClick={() => commit([...tags, ...p.tags.filter(t => !tags.some(x => x.toLowerCase() === t.toLowerCase()))])}
                style={{ background: "rgba(201,168,76,0.06)", border: "1px solid rgba(201,168,76,0.2)", borderRadius: 20, padding: "5px 11px", color: GG, fontSize: 11, fontWeight: 600, cursor: "pointer" }}>+ {p.label}</button>
            ))}
          </div>
        </div>
      </div>
    )
  }

  function AvailabilityEditor({ content, onChange }: { content: BlockContent; onChange: (key: string, val: string) => void }) {
    const M = "#A8A190", TXT = "#F5F0E8", GG = "var(--accent, #C9A84C)"
    const cur = content.status || "available"
    const sc = availabilityStatus(cur, content.dot_color)
    const inputStyle: React.CSSProperties = { width: "100%", background: "#0A0A0A", border: "1px solid rgba(201,168,76,0.2)", borderRadius: 8, padding: "9px 11px", color: TXT, fontSize: 12, outline: "none", boxSizing: "border-box" }
    const msgSuggestions = ["Ouvert aux nouvelles missions", "Disponible cette semaine", "Complet ce mois-ci", "Réponse en moins de 24h", "Sur réservation uniquement"]
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 13 }}>
        <div>
          <label style={{ color: M, fontSize: 11, display: "block", marginBottom: 7, fontWeight: 500 }}>Statut</label>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
            {AVAILABILITY_STATUSES.map(st => {
              const on = cur === st.key
              return (
                <button key={st.key} type="button" onClick={() => onChange("status", st.key)}
                  style={{ display: "flex", alignItems: "center", gap: 7, padding: "8px 10px", borderRadius: 8, cursor: "pointer", textAlign: "left" as const, background: on ? `${st.color}14` : "rgba(255,255,255,0.03)", border: `1px solid ${on ? `${st.color}66` : "rgba(255,255,255,0.08)"}`, color: on ? TXT : M, fontSize: 11, fontWeight: on ? 700 : 500 }}>
                  <span style={{ width: 8, height: 8, borderRadius: "50%", background: st.color, boxShadow: `0 0 6px ${st.color}80`, flexShrink: 0 }} />
                  <span style={{ lineHeight: 1.2 }}>{st.label}</span>
                </button>
              )
            })}
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
          <label style={{ color: M, fontSize: 11, fontWeight: 500 }}>Couleur de la pastille</label>
          <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
            {content.dot_color && <button type="button" onClick={() => onChange("dot_color", "")} title="Couleur auto" style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 6, padding: "4px 8px", color: M, fontSize: 10, cursor: "pointer" }}>Auto</button>}
            <label style={{ width: 26, height: 26, borderRadius: 7, border: "1px solid rgba(255,255,255,0.15)", background: sc.color, cursor: "pointer", position: "relative", overflow: "hidden", flexShrink: 0 }}>
              <input type="color" value={sc.color} onChange={e => onChange("dot_color", e.target.value)} style={{ position: "absolute", inset: -4, width: 40, height: 40, border: "none", padding: 0, cursor: "pointer", opacity: 0 }} />
            </label>
          </div>
        </div>
        <div>
          <label style={{ color: M, fontSize: 11, display: "block", marginBottom: 5, fontWeight: 500 }}>Message</label>
          <input value={content.message || ""} placeholder="Ouvert aux nouvelles missions" onChange={e => onChange("message", e.target.value)} style={inputStyle} />
          <div style={{ display: "flex", flexWrap: "wrap", gap: 5, marginTop: 6 }}>
            {msgSuggestions.map(m => <button key={m} type="button" onClick={() => onChange("message", m)} style={{ background: "rgba(201,168,76,0.06)", border: "1px solid rgba(201,168,76,0.18)", borderRadius: 20, padding: "4px 9px", color: GG, fontSize: 10, cursor: "pointer" }}>{m}</button>)}
          </div>
        </div>
        <div>
          <label style={{ color: M, fontSize: 11, display: "block", marginBottom: 5, fontWeight: 500 }}>Disponible à partir de (optionnel)</label>
          <input value={content.available_from || ""} placeholder="Janvier 2025" onChange={e => onChange("available_from", e.target.value)} style={inputStyle} />
        </div>
        <div>
          <label style={{ color: M, fontSize: 11, display: "block", marginBottom: 5, fontWeight: 500 }}>Bouton (optionnel)</label>
          <input value={content.cta_label || ""} placeholder="Prendre contact" onChange={e => onChange("cta_label", e.target.value)} style={{ ...inputStyle, marginBottom: 6 }} />
          <input value={content.cta_url || ""} placeholder="https://calendly.com/…" onChange={e => onChange("cta_url", e.target.value)} style={inputStyle} />
        </div>
      </div>
    )
  }

  // Clés de champs considérées comme « mise en page » (onglet dédié), le reste = « contenu ».
  const LAYOUT_FIELD_KEYS = new Set(["align", "layout", "width", "height", "columns", "cols", "disposition", "orientation", "size"])
  const isLayoutField = (key: string) => LAYOUT_FIELD_KEYS.has(key) || key.endsWith("_align")
  // Blocs à éditeur personnalisé : leur UI complète reste sous l'onglet Contenu.
  const CUSTOM_EDITOR_TYPES = new Set(["cover_banner", "skills", "gallery", "image_carousel", "availability", "social_links", "menu_section", "product_catalog", "services_list", "team", "google_reviews_block", "stats_block", "event_guests", "multi_contact", "business_certifications", "reassurance", "info_table", "concerts", "portfolio_work", "partners", "process_steps", "tabs_block", "accordion_block", "favorite_links", "video_testimonials", "event_program", "popular_products", "discography", "timeline", "documents", "packs", "brands", "services_pricing", "values", "certifications", "youtube_gallery", "languages", "expertise", "trust_badge", "on_site_services", "advantages", "logo_wall", "multi_cta", "business_stats"])
  // Clés d'apparence copiables d'un bloc à l'autre (hors __name interne).
  const STYLE_COPY_KEYS = ["__grad", "__bg", "__intensity", "__border", "__radius", "__shadow", "__glow", "__glass", "__space", "__width", "__anim", "__anim_speed", "__hover", "__loop"]

  // Contrôle segmenté sombre (pastilles) — remplace les <select> natifs. `on` gère les valeurs
  // héritées via optionLabel (ex: "warning" -> pastille "Attention").
  function Segmented({ value, options, onChange, active = "#C9A84C", muted = "#9A948A" }: { value: string; options: string[]; onChange: (v: string) => void; active?: string; muted?: string }) {
    return (
      <div style={{ display: "flex", flexWrap: "wrap", gap: 4, background: "rgba(255,255,255,0.04)", borderRadius: 9, padding: 3 }}>
        {options.map(o => {
          const on = value === o || optionLabel(value) === o
          return <button key={o} type="button" onClick={() => onChange(o)}
            style={{ flex: "1 1 auto", minWidth: 0, padding: "6px 9px", borderRadius: 7, border: "none", cursor: "pointer", background: on ? active : "transparent", color: on ? "#080808" : muted, fontSize: 11, fontWeight: on ? 700 : 500, whiteSpace: "nowrap", transition: "all .12s" }}>{optionLabel(o)}</button>
        })}
      </div>
    )
  }

  // Repeteur generique config-driven : liste dynamique d'items (ajouter/supprimer/reordonner) au-dela
  // des champs numerotes fixes. Conserve les cles plates <prefix><i>_<suffix> (aucune migration ; le
  // renderer public de chaque bloc doit lire <prefix>1..<prefix>N dynamiquement, cf Menu/Produits).
  function RepeaterEditor({ block, onChange, prefix, noun, fields, addLabel, topFields = [], bottomFields = [] }: {
    block: Block; onChange: (key: string, val: string) => void
    prefix: string; noun: string; addLabel: string
    fields: { suffix: string; kind?: "text" | "url" | "image" | "file"; placeholder?: string; options?: string[] }[]
    topFields?: { key: string; label: string; placeholder?: string; options?: string[] }[]
    bottomFields?: { key: string; label: string; placeholder?: string; options?: string[] }[]
  }) {
    const c = block.content
    const MAX = 50 // plafond aligne sur les renderers (Array.from({length:50})) -> aucun item cree mais non rendu
    // Cle plate : <prefix><i>_<suffix>, ou <prefix><i> si le suffixe est vide (ex : adv1, logo1).
    const key = (i: number, s: string) => s ? `${prefix}${i}_${s}` : `${prefix}${i}`
    const item = (i: number) => Object.fromEntries(fields.map(f => [f.suffix, c[key(i, f.suffix)] || ""])) as Record<string, string>
    const writeItem = (i: number, v: Record<string, string>) => fields.forEach(f => onChange(key(i, f.suffix), v[f.suffix] || ""))
    let derived = 0
    for (let i = 1; i <= MAX; i++) { if (fields.some(f => c[key(i, f.suffix)])) derived = i }
    const [rows, setRows] = useState(() => Math.max(1, derived))
    const count = Math.max(rows, derived)
    const inputStyle: React.CSSProperties = { width: "100%", background: "#0A0A0A", border: "1px solid rgba(201,168,76,0.2)", borderRadius: 8, padding: "9px 11px", color: "#F5F0E8", fontSize: 12, outline: "none", boxSizing: "border-box", fontFamily: "DM Sans, sans-serif" }
    const foc = (on: boolean) => (e: React.FocusEvent<HTMLInputElement>) => { e.target.style.borderColor = on ? "rgba(201,168,76,0.5)" : "rgba(201,168,76,0.2)" }
    const iconBtn = (disabled: boolean): React.CSSProperties => ({ width: 36, height: 36, display: "flex", alignItems: "center", justifyContent: "center", borderRadius: 8, border: "1px solid rgba(255,255,255,0.1)", background: "rgba(255,255,255,0.03)", color: disabled ? "rgba(255,255,255,0.2)" : "#F5F0E8", cursor: disabled ? "default" : "pointer", flexShrink: 0 })
    const lbl: React.CSSProperties = { color: MUTED, fontSize: 11, display: "block", marginBottom: 5, fontWeight: 500 }
    const deleteItem = (idx: number) => {
      for (let j = idx; j < count; j++) writeItem(j, item(j + 1))
      writeItem(count, {})
      setRows(Math.max(1, count - 1))
    }
    const moveItem = (idx: number, dir: -1 | 1) => { const a = item(idx), b = item(idx + dir); writeItem(idx, b); writeItem(idx + dir, a) }
    const renderLone = (t: { key: string; label: string; placeholder?: string; options?: string[] }) => (
      <div key={t.key}>
        <label style={lbl}>{t.label}</label>
        {t.options
          ? <Segmented value={c[t.key] || t.options[0]} options={t.options} onChange={v => onChange(t.key, v)} />
          : <input value={c[t.key] || ""} onChange={e => onChange(t.key, e.target.value)} placeholder={t.placeholder} style={inputStyle} onFocus={foc(true)} onBlur={foc(false)} />}
      </div>
    )
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {topFields.map(renderLone)}
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {Array.from({ length: count }, (_, k) => k + 1).map(i => {
            const it = item(i)
            return (
              <div key={i} style={{ border: "1px solid rgba(255,255,255,0.08)", borderRadius: 12, padding: 11, background: "rgba(255,255,255,0.02)", display: "flex", flexDirection: "column", gap: 8 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <span style={{ flex: 1, color: MUTED, fontSize: 10.5, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1 }}>{noun} {i}</span>
                  <button type="button" onClick={() => moveItem(i, -1)} disabled={i === 1} aria-label="Monter" style={iconBtn(i === 1)}><ChevronUp size={16} /></button>
                  <button type="button" onClick={() => moveItem(i, 1)} disabled={i === count} aria-label="Descendre" style={iconBtn(i === count)}><ChevronDown size={16} /></button>
                  <button type="button" onClick={() => deleteItem(i)} aria-label="Supprimer" style={{ ...iconBtn(false), color: "var(--danger)" }}><Trash2 size={15} /></button>
                </div>
                {fields.map(f => f.kind === "image"
                  ? <ImageUpload key={f.suffix} value={it[f.suffix]} onChange={url => onChange(key(i, f.suffix), url)} />
                  : f.kind === "file"
                  ? <FileUpload key={f.suffix} value={it[f.suffix]} onChange={url => onChange(key(i, f.suffix), url)} />
                  : f.options
                  ? <div key={f.suffix}>{f.placeholder && <label style={{ color: MUTED, fontSize: 10, display: "block", marginBottom: 4, fontWeight: 500 }}>{f.placeholder}</label>}<Segmented value={it[f.suffix]} options={f.options} onChange={v => onChange(key(i, f.suffix), v)} /></div>
                  : <input key={f.suffix} type={f.kind === "url" ? "url" : "text"} value={it[f.suffix]} onChange={e => onChange(key(i, f.suffix), e.target.value)} placeholder={f.placeholder} style={inputStyle} onFocus={foc(true)} onBlur={foc(false)} />
                )}
              </div>
            )
          })}
        </div>
        {count < MAX
          ? <button type="button" onClick={() => setRows(Math.min(MAX, count + 1))}
              style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 7, minHeight: 46, border: "2px dashed rgba(201,168,76,0.3)", borderRadius: 11, background: "rgba(201,168,76,0.04)", color: G, fontSize: 13, fontWeight: 700, cursor: "pointer" }}>
              <Plus size={16} /> {addLabel}
            </button>
          : <p style={{ textAlign: "center", color: MUTED, fontSize: 11.5, margin: 0, padding: "11px", border: "1px dashed rgba(255,255,255,0.12)", borderRadius: 11 }}>Maximum de {MAX} éléments atteint.</p>}
        {bottomFields.map(renderLone)}
      </div>
    )
  }

  function EditPanel({ block, onChange, only }: { block: Block; onChange: (key: string, val: string) => void; only?: "content" | "layout" }) {
    // Accordeon de l'editeur social_links : un groupe de reseaux ouvert a la fois (evite 78 champs empiles).
    const [openNetGroup, setOpenNetGroup] = useState<string | null>(null)
    // Cartes repliables pour les champs numerotes ("Plat 1 — Nom" -> carte "Plat 1"). Presentation seule.
    const [openCards, setOpenCards] = useState<Set<string>>(() => new Set())
    const def = BLOCK_DEFS[block.type]
    if (!def) return null
    // Les éditeurs personnalisés ne s'affichent que côté Contenu (leur mise en page passe par les réglages universels).
    if (only === "layout" && CUSTOM_EDITOR_TYPES.has(block.type)) return null
    const inputStyle: React.CSSProperties = { width: "100%", background: "#0A0A0A", border: "1px solid rgba(201,168,76,0.2)", borderRadius: 8, padding: "9px 11px", color: "#F5F0E8", fontSize: 12, outline: "none", boxSizing: "border-box", fontFamily: "DM Sans, sans-serif" }

    if (block.type === "cover_banner") {
      return <BannerStudio content={block.content} onChange={onChange} />
    }

    if (block.type === "skills") {
      return <SkillsEditor content={block.content} onChange={onChange} />
    }

    if (block.type === "gallery" || block.type === "image_carousel") {
      return <GalleryImagesEditor block={block} onChange={onChange} />
    }

    if (block.type === "availability") {
      return <AvailabilityEditor content={block.content} onChange={onChange} />
    }

    if (block.type === "menu_section") {
      return <RepeaterEditor block={block} onChange={onChange} prefix="item" noun="Plat" addLabel="Ajouter un plat"
        topFields={[{ key: "category", label: "Nom de la section", placeholder: "Entrées, Plats, Desserts…" }]}
        fields={[{ suffix: "name", placeholder: "Nom du plat" }, { suffix: "price", placeholder: "12€" }, { suffix: "desc", placeholder: "Description (optionnel)" }]} />
    }

    if (block.type === "product_catalog") {
      return <RepeaterEditor block={block} onChange={onChange} prefix="p" noun="Produit" addLabel="Ajouter un produit"
        topFields={[{ key: "title", label: "Titre de la section", placeholder: "Nos produits" }]}
        bottomFields={[{ key: "cta_label", label: "Texte du bouton", placeholder: "Acheter" }]}
        fields={[{ suffix: "img", kind: "image" }, { suffix: "name", placeholder: "Nom du produit" }, { suffix: "price", placeholder: "29€" }, { suffix: "desc", placeholder: "Description courte" }, { suffix: "url", kind: "url", placeholder: "https://… (lien d'achat)" }]} />
    }

    if (block.type === "services_list") {
      return <RepeaterEditor block={block} onChange={onChange} prefix="s" noun="Service" addLabel="Ajouter un service"
        topFields={[{ key: "title", label: "Titre de la section", placeholder: "Mes services" }]}
        fields={[{ suffix: "icon", placeholder: "Emoji (ex : 💻)" }, { suffix: "name", placeholder: "Nom du service" }, { suffix: "desc", placeholder: "Description courte" }]} />
    }

    if (block.type === "team") {
      return <RepeaterEditor block={block} onChange={onChange} prefix="m" noun="Membre" addLabel="Ajouter un membre"
        topFields={[{ key: "title", label: "Titre de la section", placeholder: "Notre équipe" }, { key: "layout", label: "Disposition", options: ["Liste", "Grille"] }]}
        fields={[{ suffix: "photo", kind: "image" }, { suffix: "name", placeholder: "Nom" }, { suffix: "role", placeholder: "Rôle / poste" }, { suffix: "bio", placeholder: "Bio courte" }, { suffix: "phone", placeholder: "Téléphone (optionnel)" }, { suffix: "email", placeholder: "Email (optionnel)" }, { suffix: "linkedin", placeholder: "LinkedIn URL (optionnel)" }]} />
    }

    if (block.type === "google_reviews_block") {
      return <RepeaterEditor block={block} onChange={onChange} prefix="r" noun="Avis" addLabel="Ajouter un avis"
        topFields={[{ key: "title", label: "Titre", placeholder: "Avis clients" }, { key: "avg_rating", label: "Note moyenne", placeholder: "4.8" }, { key: "total_reviews", label: "Nombre d'avis affiché", placeholder: "127" }]}
        bottomFields={[{ key: "google_url", label: "Lien « Voir sur Google »", placeholder: "https://…" }]}
        fields={[{ suffix: "name", placeholder: "Nom du client" }, { suffix: "text", placeholder: "Son avis" }, { suffix: "stars", placeholder: "Note sur 5 (ex : 5)" }]} />
    }

    if (block.type === "stats_block") {
      return <RepeaterEditor block={block} onChange={onChange} prefix="s" noun="Statistique" addLabel="Ajouter une statistique"
        fields={[{ suffix: "icon", placeholder: "Emoji (ex : 🚀)" }, { suffix: "value", placeholder: "Valeur (ex : 10k+)" }, { suffix: "label", placeholder: "Libellé (ex : clients)" }]} />
    }

    if (block.type === "event_guests") {
      return <RepeaterEditor block={block} onChange={onChange} prefix="g" noun="Invité" addLabel="Ajouter un invité"
        topFields={[{ key: "title", label: "Titre de la section", placeholder: "Nos invités" }]}
        fields={[{ suffix: "photo", kind: "image" }, { suffix: "name", placeholder: "Nom" }, { suffix: "role", placeholder: "Rôle / titre (optionnel)" }, { suffix: "desc", placeholder: "Description (optionnel)" }]} />
    }

    if (block.type === "multi_contact") {
      return <RepeaterEditor block={block} onChange={onChange} prefix="c" noun="Contact" addLabel="Ajouter un contact"
        topFields={[{ key: "title", label: "Titre de la section", placeholder: "Nous contacter" }]}
        fields={[{ suffix: "photo", kind: "image" }, { suffix: "name", placeholder: "Nom" }, { suffix: "role", placeholder: "Rôle / poste (optionnel)" }, { suffix: "phone", placeholder: "Téléphone (optionnel)" }, { suffix: "email", placeholder: "Email (optionnel)" }]} />
    }

    if (block.type === "business_certifications") {
      return <RepeaterEditor block={block} onChange={onChange} prefix="c" noun="Certification" addLabel="Ajouter une certification"
        topFields={[{ key: "title", label: "Titre de la section", placeholder: "Nos certifications" }]}
        fields={[{ suffix: "icon", placeholder: "Emoji (ex : 🏅)" }, { suffix: "name", placeholder: "Nom de la certification" }, { suffix: "org", placeholder: "Organisme (optionnel)" }, { suffix: "year", placeholder: "Année (optionnel)" }]} />
    }

    if (block.type === "reassurance") {
      return <RepeaterEditor block={block} onChange={onChange} prefix="g" noun="Garantie" addLabel="Ajouter une garantie"
        fields={[{ suffix: "icon", placeholder: "Emoji (ex : ✅)" }, { suffix: "label", placeholder: "Titre (ex : Livraison offerte)" }, { suffix: "desc", placeholder: "Détail (optionnel)" }]} />
    }

    if (block.type === "info_table") {
      return <RepeaterEditor block={block} onChange={onChange} prefix="r" noun="Ligne" addLabel="Ajouter une ligne"
        topFields={[{ key: "title", label: "Titre du tableau", placeholder: "Informations" }]}
        fields={[{ suffix: "label", placeholder: "Intitulé (ex : Horaires)" }, { suffix: "value", placeholder: "Valeur (ex : 9h – 18h)" }]} />
    }

    if (block.type === "concerts") {
      return <RepeaterEditor block={block} onChange={onChange} prefix="c" noun="Date" addLabel="Ajouter une date"
        topFields={[{ key: "title", label: "Titre de la section", placeholder: "Prochaines dates" }]}
        fields={[{ suffix: "date", placeholder: "Date (ex : 12 JUIN)" }, { suffix: "city", placeholder: "Ville" }, { suffix: "venue", placeholder: "Salle / lieu (optionnel)" }, { suffix: "url", kind: "url", placeholder: "Lien billetterie (optionnel)" }]} />
    }

    if (block.type === "portfolio_work") {
      return <RepeaterEditor block={block} onChange={onChange} prefix="work" noun="Réalisation" addLabel="Ajouter une réalisation"
        topFields={[{ key: "title", label: "Titre de la section", placeholder: "Mes réalisations" }]}
        bottomFields={[{ key: "cta_label", label: "Bouton (optionnel)", placeholder: "Voir plus" }, { key: "cta_url", label: "Lien du bouton", placeholder: "https://…" }]}
        fields={[{ suffix: "img", kind: "image" }, { suffix: "title", placeholder: "Titre" }, { suffix: "desc", placeholder: "Description (optionnel)" }]} />
    }

    if (block.type === "partners") {
      return <RepeaterEditor block={block} onChange={onChange} prefix="logo" noun="Partenaire" addLabel="Ajouter un partenaire"
        topFields={[{ key: "title", label: "Titre de la section", placeholder: "Ils nous font confiance" }]}
        fields={[{ suffix: "img", kind: "image" }, { suffix: "name", placeholder: "Nom (affiché si pas de logo)" }]} />
    }

    if (block.type === "process_steps") {
      return <RepeaterEditor block={block} onChange={onChange} prefix="s" noun="Étape" addLabel="Ajouter une étape"
        topFields={[{ key: "title", label: "Titre de la section", placeholder: "Comment ça marche" }]}
        fields={[{ suffix: "icon", placeholder: "Emoji (ex : 1️⃣)" }, { suffix: "title", placeholder: "Titre de l'étape" }, { suffix: "desc", placeholder: "Description" }]} />
    }

    if (block.type === "tabs_block") {
      return <RepeaterEditor block={block} onChange={onChange} prefix="tab" noun="Onglet" addLabel="Ajouter un onglet"
        fields={[{ suffix: "label", placeholder: "Titre de l'onglet" }, { suffix: "content", placeholder: "Contenu" }]} />
    }

    if (block.type === "accordion_block") {
      return <RepeaterEditor block={block} onChange={onChange} prefix="a" noun="Question" addLabel="Ajouter une question"
        topFields={[{ key: "title", label: "Titre de la section", placeholder: "Questions fréquentes" }]}
        fields={[{ suffix: "title", placeholder: "Question" }, { suffix: "content", placeholder: "Réponse" }]} />
    }

    if (block.type === "favorite_links") {
      return <RepeaterEditor block={block} onChange={onChange} prefix="link_" noun="Lien" addLabel="Ajouter un lien"
        topFields={[{ key: "title", label: "Titre de la section", placeholder: "Mes liens favoris" }]}
        fields={[{ suffix: "icon", placeholder: "Emoji (ex : 🔗)" }, { suffix: "label", placeholder: "Libellé" }, { suffix: "url", kind: "url", placeholder: "https://…" }]} />
    }

    if (block.type === "video_testimonials") {
      return <RepeaterEditor block={block} onChange={onChange} prefix="t" noun="Témoignage" addLabel="Ajouter un témoignage"
        topFields={[{ key: "title", label: "Titre de la section", placeholder: "Ils témoignent" }]}
        fields={[{ suffix: "video_url", kind: "url", placeholder: "Lien vidéo YouTube" }, { suffix: "name", placeholder: "Nom" }, { suffix: "company", placeholder: "Entreprise (optionnel)" }, { suffix: "quote", placeholder: "Citation (optionnel)" }]} />
    }

    if (block.type === "event_program") {
      return <RepeaterEditor block={block} onChange={onChange} prefix="s" noun="Créneau" addLabel="Ajouter un créneau"
        topFields={[{ key: "title", label: "Titre de la section", placeholder: "Programme" }]}
        fields={[{ suffix: "time", placeholder: "Heure (ex : 14h)" }, { suffix: "title", placeholder: "Titre" }, { suffix: "desc", placeholder: "Description (optionnel)" }]} />
    }

    if (block.type === "popular_products") {
      return <RepeaterEditor block={block} onChange={onChange} prefix="p" noun="Produit" addLabel="Ajouter un produit"
        topFields={[{ key: "title", label: "Titre de la section", placeholder: "Nos best-sellers" }]}
        fields={[{ suffix: "rank", placeholder: "Badge (ex : 🥇 Best-seller)" }, { suffix: "img", kind: "image" }, { suffix: "name", placeholder: "Nom du produit" }, { suffix: "price", placeholder: "Prix" }, { suffix: "sales", placeholder: "Ventes (ex : 1200 vendus)" }, { suffix: "url", kind: "url", placeholder: "Lien (optionnel)" }]} />
    }

    if (block.type === "discography") {
      return <RepeaterEditor block={block} onChange={onChange} prefix="a" noun="Sortie" addLabel="Ajouter une sortie"
        topFields={[{ key: "title", label: "Titre de la section", placeholder: "Discographie" }]}
        fields={[{ suffix: "cover", kind: "image" }, { suffix: "title", placeholder: "Titre de l'album" }, { suffix: "year", placeholder: "Année" }, { suffix: "type", placeholder: "Type (Album, EP, Single)" }, { suffix: "url", kind: "url", placeholder: "Lien d'écoute" }]} />
    }

    if (block.type === "timeline") {
      return <RepeaterEditor block={block} onChange={onChange} prefix="e" noun="Événement" addLabel="Ajouter un événement"
        topFields={[{ key: "title", label: "Titre de la section", placeholder: "Mon parcours" }, { key: "layout", label: "Disposition", options: ["Verticale", "Horizontale"] }]}
        fields={[{ suffix: "icon", placeholder: "Emoji (optionnel)" }, { suffix: "date", placeholder: "Date (ex : 2024)" }, { suffix: "title", placeholder: "Titre" }, { suffix: "desc", placeholder: "Description (optionnel)" }]} />
    }

    if (block.type === "documents") {
      return <RepeaterEditor block={block} onChange={onChange} prefix="d" noun="Document" addLabel="Ajouter un document"
        topFields={[{ key: "title", label: "Titre de la section", placeholder: "Mes documents" }]}
        fields={[{ suffix: "title", placeholder: "Nom du document" }, { suffix: "desc", placeholder: "Description (optionnel)" }, { suffix: "url", kind: "file" }, { suffix: "type", placeholder: "Type (PDF, Contrat…)" }, { suffix: "meta", placeholder: "Info (ex : 2 Mo)" }]} />
    }

    if (block.type === "packs") {
      return <RepeaterEditor block={block} onChange={onChange} prefix="pack" noun="Formule" addLabel="Ajouter une formule"
        topFields={[{ key: "title", label: "Titre de la section", placeholder: "Nos formules" }]}
        fields={[{ suffix: "icon", placeholder: "Emoji (ex : 📦)" }, { suffix: "name", placeholder: "Nom de la formule" }, { suffix: "price", placeholder: "Prix" }, { suffix: "content", placeholder: "Ce qui est inclus" }, { suffix: "url", kind: "url", placeholder: "Lien (optionnel)" }]} />
    }

    if (block.type === "brands") {
      return <RepeaterEditor block={block} onChange={onChange} prefix="brand" noun="Marque" addLabel="Ajouter une marque"
        topFields={[{ key: "title", label: "Titre de la section", placeholder: "Nos marques" }]}
        fields={[{ suffix: "icon", placeholder: "Emoji / initiale (si pas de logo)" }, { suffix: "name", placeholder: "Nom de la marque" }]} />
    }

    if (block.type === "services_pricing") {
      return <RepeaterEditor block={block} onChange={onChange} prefix="s" noun="Tarif" addLabel="Ajouter un tarif"
        topFields={[{ key: "title", label: "Titre de la section", placeholder: "Nos tarifs" }]}
        fields={[{ suffix: "name", placeholder: "Prestation" }, { suffix: "price", placeholder: "Prix" }, { suffix: "duration", placeholder: "Durée (optionnel)" }, { suffix: "desc", placeholder: "Description (optionnel)" }]} />
    }

    if (block.type === "values") {
      return <RepeaterEditor block={block} onChange={onChange} prefix="v" noun="Valeur" addLabel="Ajouter une valeur"
        topFields={[{ key: "title", label: "Titre de la section", placeholder: "Nos valeurs" }]}
        fields={[{ suffix: "icon", placeholder: "Emoji (ex : ⭐)" }, { suffix: "label", placeholder: "Titre" }, { suffix: "desc", placeholder: "Description (optionnel)" }]} />
    }

    if (block.type === "certifications") {
      return <RepeaterEditor block={block} onChange={onChange} prefix="cert_" noun="Certification" addLabel="Ajouter une certification"
        topFields={[{ key: "title", label: "Titre de la section", placeholder: "Mes certifications" }]}
        fields={[{ suffix: "icon", placeholder: "Emoji (ex : 🏆)" }, { suffix: "name", placeholder: "Nom de la certification" }, { suffix: "org", placeholder: "Organisme (optionnel)" }, { suffix: "year", placeholder: "Année (optionnel)" }]} />
    }

    if (block.type === "youtube_gallery") {
      return <RepeaterEditor block={block} onChange={onChange} prefix="video" noun="Vidéo" addLabel="Ajouter une vidéo"
        topFields={[{ key: "title", label: "Titre de la section", placeholder: "Mes vidéos" }]}
        fields={[{ suffix: "url", kind: "url", placeholder: "Lien YouTube" }, { suffix: "title", placeholder: "Titre de la vidéo (optionnel)" }]} />
    }

    if (block.type === "languages") {
      return <RepeaterEditor block={block} onChange={onChange} prefix="lang_" noun="Langue" addLabel="Ajouter une langue"
        topFields={[{ key: "title", label: "Titre de la section", placeholder: "Langues" }]}
        fields={[{ suffix: "flag", placeholder: "Drapeau emoji (ex : 🇫🇷)" }, { suffix: "name", placeholder: "Langue" }, { suffix: "level", placeholder: "Niveau", options: ["Natif", "Courant", "Avance", "Intermediaire", "Debutant"] }]} />
    }

    if (block.type === "expertise") {
      return <RepeaterEditor block={block} onChange={onChange} prefix="s" noun="Expertise" addLabel="Ajouter une expertise"
        topFields={[{ key: "title", label: "Titre de la section", placeholder: "Mes expertises" }]}
        fields={[{ suffix: "icon", placeholder: "Emoji (ex : 💻)" }, { suffix: "name", placeholder: "Compétence" }, { suffix: "level", placeholder: "Niveau (1 à 5)", options: ["1", "2", "3", "4", "5"] }]} />
    }

    if (block.type === "trust_badge") {
      return <RepeaterEditor block={block} onChange={onChange} prefix="b" noun="Badge" addLabel="Ajouter un badge"
        topFields={[{ key: "title", label: "Titre de la section", placeholder: "Garanties" }]}
        fields={[{ suffix: "icon", placeholder: "Emoji (ex : ✔)" }, { suffix: "label", placeholder: "Libellé" }]} />
    }

    if (block.type === "on_site_services") {
      return <RepeaterEditor block={block} onChange={onChange} prefix="s" noun="Service" addLabel="Ajouter un service"
        topFields={[{ key: "title", label: "Titre de la section", placeholder: "Sur place" }]}
        fields={[{ suffix: "icon", placeholder: "Emoji (ex : 📶)" }, { suffix: "label", placeholder: "Service (ex : Wi-Fi gratuit)" }]} />
    }

    if (block.type === "advantages") {
      return <RepeaterEditor block={block} onChange={onChange} prefix="adv" noun="Avantage" addLabel="Ajouter un avantage"
        topFields={[{ key: "title", label: "Titre de la section", placeholder: "Nos avantages" }]}
        fields={[{ suffix: "", placeholder: "Avantage (ex : Livraison en 24h)" }]} />
    }

    if (block.type === "logo_wall") {
      return <RepeaterEditor block={block} onChange={onChange} prefix="logo" noun="Logo" addLabel="Ajouter un logo"
        topFields={[{ key: "title", label: "Titre de la section", placeholder: "Ils nous font confiance" }]}
        fields={[{ suffix: "", kind: "image" }, { suffix: "name", placeholder: "Nom (affiché si pas de logo)" }]} />
    }

    if (block.type === "multi_cta") {
      return <RepeaterEditor block={block} onChange={onChange} prefix="btn" noun="Bouton" addLabel="Ajouter un bouton"
        fields={[{ suffix: "icon", placeholder: "Emoji (ex : 📞)" }, { suffix: "label", placeholder: "Texte du bouton" }, { suffix: "url", kind: "url", placeholder: "Lien (https://, tel:, mailto:)" }]} />
    }

    if (block.type === "business_stats") {
      return <RepeaterEditor block={block} onChange={onChange} prefix="stat" noun="Chiffre clé" addLabel="Ajouter un chiffre"
        fields={[{ suffix: "icon", placeholder: "Emoji (ex : 📈)" }, { suffix: "value", placeholder: "Valeur (ex : 500+)" }, { suffix: "label", placeholder: "Libellé (ex : clients)" }]} />
    }

    if (block.type === "social_links") {
      const disp = block.content.display || "list"
      return (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <div>
            <label style={{ color: MUTED, fontSize: 11, display: "block", marginBottom: 6, fontWeight: 500 }}>Affichage</label>
            <div style={{ display: "flex", gap: 4, background: "rgba(255,255,255,0.04)", borderRadius: 9, padding: 3 }}>
              {[{ k: "list", l: "Liste" }, { k: "grid", l: "Grille" }, { k: "icons", l: "Icônes" }].map(o => {
                const on = disp === o.k
                return <button key={o.k} type="button" onClick={() => onChange("display", o.k)} style={{ flex: 1, padding: "7px 4px", borderRadius: 7, background: on ? G : "transparent", border: "none", color: on ? "#080808" : MUTED, fontSize: 11, fontWeight: on ? 700 : 500, cursor: "pointer" }}>{o.l}</button>
              })}
            </div>
          </div>
          {(() => {
            const GROUP_LABELS: Record<string, string> = { social: "Réseaux sociaux", messaging: "Messagerie", video: "Vidéo", music: "Musique", podcast: "Podcast", creative: "Créatif & portfolio", ecommerce: "Boutique", freelance: "Freelance & pro", payment: "Paiement & pourboire", local: "Local & avis", dev: "Développeur", generic: "Autres liens" }
            const GROUP_ORDER = ["social", "messaging", "video", "music", "podcast", "creative", "ecommerce", "freelance", "payment", "local", "dev", "generic"]
            const filled = SOCIAL_NETWORKS.filter(n => block.content[n.key])
            const renderNet = (n: typeof SOCIAL_NETWORKS[number]) => (
              <div key={n.key}>
                <label style={{ color: MUTED, fontSize: 11, display: "flex", alignItems: "center", gap: 5, marginBottom: 4 }}>
                  <span style={{ fontSize: 14 }}>{n.icon}</span>
                  <span style={{ color: n.color, fontWeight: 600 }}>{n.label}</span>
                </label>
                <input type="url" value={block.content[n.key]||""} onChange={e => onChange(n.key, e.target.value)}
                  placeholder={`https://${n.key}.com/...`}
                  style={{ ...inputStyle, borderColor: block.content[n.key] ? n.color+"50" : "rgba(201,168,76,0.2)" }}
                  onFocus={e => e.target.style.borderColor = n.color+"80"}
                  onBlur={e => e.target.style.borderColor = block.content[n.key] ? n.color+"50" : "rgba(201,168,76,0.2)"} />
                {block.content[n.key] && (
                  <div style={{ display: "flex", gap: 6, marginTop: 5 }}>
                    <input value={block.content[n.key+"__label"]||""} onChange={e => onChange(n.key+"__label", e.target.value)} placeholder={`Libellé (${n.label})`} style={{ ...inputStyle, flex: 1, fontSize: 11, padding: "7px 9px" }} />
                    <input value={block.content[n.key+"__count"]||""} onChange={e => onChange(n.key+"__count", e.target.value)} placeholder="Abonnés (ex : 12,5k)" style={{ ...inputStyle, width: 130, fontSize: 11, padding: "7px 9px" }} />
                  </div>
                )}
              </div>
            )
            const grpHeader: React.CSSProperties = { color: MUTED, fontSize: 8.5, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1.2, margin: "2px 2px 6px" }
            return (
              <>
                {filled.length > 0 && (
                  <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                    <p style={grpHeader}>Réseaux ajoutés · {filled.length}</p>
                    {filled.map(renderNet)}
                  </div>
                )}
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  <p style={grpHeader}>{filled.length ? "Ajouter un autre réseau" : "Choisir un réseau"}</p>
                  {GROUP_ORDER.map(g => {
                    const nets = SOCIAL_NETWORKS.filter(n => (n as any).group === g && !block.content[n.key])
                    if (!nets.length) return null
                    const open = openNetGroup === g
                    return (
                      <div key={g}>
                        <button type="button" onClick={() => setOpenNetGroup(open ? null : g)}
                          style={{ width: "100%", display: "flex", alignItems: "center", gap: 8, minHeight: 46, padding: "10px 12px", borderRadius: 10, border: `1px solid ${open ? "rgba(201,168,76,0.4)" : "rgba(255,255,255,0.08)"}`, background: open ? "rgba(201,168,76,0.06)" : "rgba(255,255,255,0.02)", color: "#F5F0E8", cursor: "pointer", textAlign: "left" }}>
                          <span style={{ flex: 1, fontSize: 13, fontWeight: 600 }}>{GROUP_LABELS[g] || g}</span>
                          <span style={{ fontSize: 11, color: MUTED }}>{nets.length}</span>
                          <ChevronDown size={16} color={MUTED} style={{ transform: open ? "rotate(180deg)" : "none", transition: "transform .2s", flexShrink: 0 }} />
                        </button>
                        {open && (
                          <div style={{ display: "flex", flexDirection: "column", gap: 10, padding: "10px 2px 6px" }}>
                            {nets.map(renderNet)}
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              </>
            )
          })()}
        </div>
      )
    }

    const scoped = def.fields.filter(f => only === "layout" ? isLayoutField(f.key) : only === "content" ? !isLayoutField(f.key) : true)
    if (only === "layout" && scoped.length === 0) return null
    const visibleFields = scoped.filter(field => {
      const si = (field as any).showIf
      if (!si) return true
      // Valeur effective : si le champ contrôleur n'est pas encore défini, on retombe sur
      // sa valeur par défaut (1re option d'un select) — sinon les pages existantes masqueraient
      // à tort les champs dont le contrôleur n'a jamais été touché.
      const ctrl = def.fields.find(f => f.key === si.key) as any
      const v = block.content[si.key] ?? ctrl?.options?.[0]
      if (si.equals !== undefined) return v === si.equals
      if (Array.isArray(si.in)) return si.in.includes(v)
      return true
    })
    // Regroupe les champs numerotes ("Plat 1 — Nom", "Produit 2 — Prix"...) en cartes repliables.
    // Presentation seule : meme content/onChange, aucun changement de data-model ni de rendu public.
    const DASH = " — "
    const cardOrder: string[] = []
    const cardMap: Record<string, typeof visibleFields> = {}
    const loneFields: typeof visibleFields = []
    for (const f of visibleFields) {
      const di = f.label.indexOf(DASH)
      if (di > 0) { const g = f.label.slice(0, di); if (!cardMap[g]) { cardMap[g] = []; cardOrder.push(g) } cardMap[g].push(f) }
      else loneFields.push(f)
    }
    const useCards = cardOrder.length >= 2
    const renderField = (field: typeof scoped[number], labelOverride?: string) => (
          <div key={field.key}>
            <label style={{ color: MUTED, fontSize: 11, display: "block", marginBottom: 5, fontWeight: 500 }}>{labelOverride ?? field.label}</label>
            {field.type === "textarea"
              ? <textarea value={block.content[field.key]||""} onChange={e => onChange(field.key, e.target.value)}
                  placeholder={field.placeholder} rows={3}
                  style={{ ...inputStyle, resize: "vertical" }}
                  onFocus={e => e.target.style.borderColor = "rgba(201,168,76,0.5)"}
                  onBlur={e => e.target.style.borderColor = "rgba(201,168,76,0.2)"} />
              : field.type === "select"
              ? (field.options && field.options.length <= 5
                  ? <Segmented value={block.content[field.key] || field.options[0]} options={field.options} onChange={v => onChange(field.key, v)} />
                  : <select value={block.content[field.key]||field.options?.[0]} onChange={e => onChange(field.key, e.target.value)} style={inputStyle}>
                      {field.options?.map(o => <option key={o} value={o}>{optionLabel(o)}</option>)}
                    </select>)
              : field.type === "color"
              ? <div style={{ display: "flex", gap: 7 }}>
                  <input type="color" value={block.content[field.key]||"#C9A84C"} onChange={e => onChange(field.key, e.target.value)} style={{ width: 34, height: 32, border: "none", borderRadius: 6, cursor: "pointer", padding: 0 }} />
                  <input type="text" value={block.content[field.key]||""} onChange={e => onChange(field.key, e.target.value)} placeholder={field.placeholder} style={{ ...inputStyle, flex: 1 }} onFocus={e => e.target.style.borderColor = "rgba(201,168,76,0.5)"} onBlur={e => e.target.style.borderColor = "rgba(201,168,76,0.2)"} />
                </div>
              : field.type === "image"
              ? <ImageUpload value={block.content[field.key]||""} onChange={url => onChange(field.key, url)} hint={field.hint} />
              : field.type === "file"
              ? <FileUpload value={block.content[field.key]||""} onChange={url => onChange(field.key, url)} hint={field.hint} />
              : field.type === "datetime"
              ? <input type="datetime-local" value={block.content[field.key]||""} onChange={e => onChange(field.key, e.target.value)} style={inputStyle} onFocus={e => e.target.style.borderColor = "rgba(201,168,76,0.5)"} onBlur={e => e.target.style.borderColor = "rgba(201,168,76,0.2)"} />
              : <input type={field.type==="url" ? "url" : "text"} value={block.content[field.key]||""}
                  onChange={e => onChange(field.key, e.target.value)}
                  placeholder={field.placeholder} style={inputStyle}
                  onFocus={e => e.target.style.borderColor = "rgba(201,168,76,0.5)"}
                  onBlur={e => e.target.style.borderColor = "rgba(201,168,76,0.2)"} />}
            {field.hint && <p style={{ color: MUTED, fontSize: 11, margin: "3px 0 0", lineHeight: 1.4 }}>{field.hint}</p>}
            {/* Validation guidée : URL / email / téléphone (affichage seul) */}
            {(() => {
              const val = String(block.content[field.key] || "").trim()
              if (!val) return null
              const key = field.key.toLowerCase()
              let valid: boolean | null = null, msg = ""
              if (field.type === "url") {
                if (/^(https?:\/\/|mailto:|tel:|\/|#)/i.test(val)) valid = true
                else { valid = false; msg = "Ajoutez https:// au début du lien" }
              } else if (key.includes("email")) {
                valid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val); if (!valid) msg = "Adresse email invalide"
              } else if (key.includes("phone") || key.includes("numero") || key === "num") {
                valid = val.replace(/\D/g, "").length >= 6; if (!valid) msg = "Numéro trop court"
              }
              if (valid === null) return null
              const isTestable = field.type === "url" && valid && /^https?:\/\//i.test(val)
              return (
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, marginTop: 4 }}>
                  <span style={{ color: valid ? "var(--success)" : "#F59E0B", fontSize: 10.5, fontWeight: 600 }}>{valid ? "✓ Format valide" : `⚠ ${msg}`}</span>
                  {isTestable && <a href={val} target="_blank" rel="noopener noreferrer" style={{ color: G, fontSize: 9, fontWeight: 700, textDecoration: "none" }}>Tester ↗</a>}
                </div>
              )
            })()}
            {/* Compteur + score de lisibilité mobile pour les textes longs (bio, à propos…) */}
            {field.type === "textarea" && !(field as any).maxRecommended && (() => {
              const len = (block.content[field.key] || "").length
              if (!len) return null
              const [txt, col] = len < 40 ? ["Un peu court", "#F59E0B"] : len <= 200 ? ["Bonne longueur ✓", "var(--success)"] : ["Un peu long pour mobile", "#F59E0B"]
              return (
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 4 }}>
                  <span style={{ color: col, fontSize: 10.5, fontWeight: 600 }}>{txt}</span>
                  <span style={{ color: MUTED, fontSize: 10.5 }}>{len} car.</span>
                </div>
              )
            })()}
            {/* Compteur X/max + score pour champs à longueur conseillée (accroche…) */}
            {(field as any).maxRecommended && (() => {
              const len = (block.content[field.key] || "").length
              if (!len) return null
              const max = (field as any).maxRecommended as number
              const short = Math.max(12, Math.round(max * 0.15))
              const [txt, col] = len < short ? ["Un peu court", "#F59E0B"] : len <= max * 0.9 ? ["Excellent ✓", "var(--success)"] : len <= max ? ["Bonne longueur ✓", "var(--success)"] : ["Trop long", "var(--danger)"]
              return (
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 4 }}>
                  <span style={{ color: col, fontSize: 10.5, fontWeight: 600 }}>{txt}</span>
                  <span style={{ color: len > max ? "var(--danger)" : MUTED, fontSize: 10.5 }}>{len}/{max}</span>
                </div>
              )
            })()}
            {/* Suggestions curées — pour ne jamais partir d'un champ vide */}
            {(field as any).suggestions && ((field as any).suggestionsMode === "append" || (block.content[field.key] || "").trim() === "") && (
              <div style={{ display: "flex", flexWrap: "wrap", gap: 5, marginTop: 6 }}>
                <span style={{ color: MUTED, fontSize: 9, alignSelf: "center", marginRight: 1 }}>Exemples&nbsp;:</span>
                {((field as any).suggestions as string[]).map(sug => {
                  const append = (field as any).suggestionsMode === "append"
                  const parts = (block.content[field.key] || "").split(/[,\n]/).map((s: string) => s.trim()).filter(Boolean)
                  const active = append && parts.includes(sug)
                  return (
                    <button key={sug} type="button" title={active ? `Retirer : ${sug}` : `Ajouter : ${sug}`}
                      onClick={() => {
                        if (!append) { onChange(field.key, sug); return }
                        if (active) onChange(field.key, parts.filter((p: string) => p !== sug).join(", "))
                        else if (parts.length < 5) onChange(field.key, [...parts, sug].join(", "))
                      }}
                      style={{ padding: "4px 9px", borderRadius: 999, background: active ? G : "rgba(201,168,76,0.1)", border: `1px solid ${active ? G : "rgba(201,168,76,0.25)"}`, color: active ? "#080808" : G, fontSize: 10, fontWeight: active ? 800 : 600, cursor: "pointer", whiteSpace: "nowrap" as const, maxWidth: "100%", overflow: "hidden", textOverflow: "ellipsis" }}>
                      {active ? "✓ " : ""}{sug}
                    </button>
                  )
                })}
              </div>
            )}
          </div>
    )
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {(useCards ? loneFields : visibleFields).map(f => renderField(f))}
        {useCards && cardOrder.map(g => {
          const fields = cardMap[g]
          const open = openCards.has(g)
          const filled = fields.filter(f => String(block.content[f.key] ?? "").trim()).length
          return (
            <div key={g}>
              <button type="button" onClick={() => setOpenCards(prev => { const n = new Set(prev); if (n.has(g)) n.delete(g); else n.add(g); return n })}
                style={{ width: "100%", display: "flex", alignItems: "center", gap: 8, minHeight: 46, padding: "10px 12px", borderRadius: 10, border: `1px solid ${open ? "rgba(201,168,76,0.4)" : "rgba(255,255,255,0.08)"}`, background: open ? "rgba(201,168,76,0.06)" : "rgba(255,255,255,0.02)", color: "#F5F0E8", cursor: "pointer", textAlign: "left" }}>
                <span style={{ width: 7, height: 7, borderRadius: "50%", background: filled ? "var(--success)" : "rgba(255,255,255,0.18)", flexShrink: 0 }} />
                <span style={{ flex: 1, fontSize: 13, fontWeight: 600 }}>{g}</span>
                <span style={{ fontSize: 10.5, color: MUTED }}>{filled ? `${filled}/${fields.length}` : "vide"}</span>
                <ChevronDown size={16} color={MUTED} style={{ transform: open ? "rotate(180deg)" : "none", transition: "transform .2s", flexShrink: 0 }} />
              </button>
              {open && (
                <div style={{ display: "flex", flexDirection: "column", gap: 12, padding: "12px 2px 6px" }}>
                  {fields.map(f => renderField(f, f.label.slice(f.label.indexOf(DASH) + DASH.length)))}
                </div>
              )}
            </div>
          )
        })}
      </div>
    )
  }

  function ThemePanel({ theme, onThemeChange }: { theme: PageTheme; onThemeChange: (t: PageTheme) => void }) {
    const toast = useToast()
    const [themeTab, setThemeTab] = useState<"themes"|"colors"|"fonts"|"bg"|"blocks">("themes")
    const [themeBlocksAdv, setThemeBlocksAdv] = useState(false) // Avance masque par defaut (animation, effet verre) — review #4
    const [bgMode, setBgMode] = useState<string>(theme.bgMode||"solid")
    const [bgSubTab, setBgSubTab] = useState<"type"|"effects"|"animation"|"presets"|"advanced">("presets")
    const [activeCat, setActiveCat] = useState<string>(PRESET_CATEGORIES[0].id)
    const [colorFormat, setColorFormat] = useState<"hex"|"rgb"|"hsl">("hex")
    const [recentColors, setRecentColors] = useState<string[]>(() => {
      try { return JSON.parse(localStorage.getItem("qrfolio_recent_colors") || "[]") } catch { return [] }
    })

    function addRecentColor(hex: string) {
      setRecentColors(prev => {
        const next = [hex, ...prev.filter(c => c !== hex)].slice(0, 10)
        localStorage.setItem("qrfolio_recent_colors", JSON.stringify(next))
        return next
      })
    }

    function formatColor(hex: string, fmt: "hex"|"rgb"|"hsl"): string {
      if (fmt === "hex") return hex
      const rgb = hexToRgb(hex)
      if (!rgb) return hex
      if (fmt === "rgb") return `rgb(${rgb.r}, ${rgb.g}, ${rgb.b})`
      const hsl = rgbToHsl(rgb.r, rgb.g, rgb.b)
      return `hsl(${hsl.h}, ${hsl.s}%, ${hsl.l}%)`
    }

    function parseColorInput(val: string): string | null {
      val = val.trim()
      if (/^#[0-9a-fA-F]{3,6}$/.test(val)) return val
      const rgbM = val.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/)
      if (rgbM) {
        const [, r, g, b] = rgbM.map(Number)
        return "#" + [r,g,b].map(v => v.toString(16).padStart(2,"0")).join("")
      }
      return null
    }
    const [patternType, setPatternType] = useState<string>((theme as any).bgPattern||"dots")
    const [effectNoise, setEffectNoise] = useState(false)
    const [effectGlow, setEffectGlow] = useState(false)
    const [effectVignette, setEffectVignette] = useState(false)
    const [animation, setAnimation] = useState<string>("none")
    const [copiedStyle, setCopiedStyle] = useState(false)

    const G = "#C9A84C"
    const MUTED = "#A8A190"

    const inputStyle: React.CSSProperties = {
      width: "100%", background: "#0A0A0A", border: "1px solid rgba(201,168,76,0.2)",
      borderRadius: 8, padding: "8px 10px", color: "#F5F0E8", fontSize: 12,
      outline: "none", boxSizing: "border-box" as const, fontFamily: "monospace"
    }

    // 40+ presets
    const PRESETS = [
      // Business
      { name: "Executive Blue", group: "Business", bg: "#0A1628", primary: "#1E88E5", accent: "#42A5F5", text: "#F5F0E8", muted: "#8A9BA8", gradient: "linear-gradient(135deg,#0A1628 0%,#1A2A4A 100%)" },
      { name: "Corporate Black", group: "Business", bg: "#080808", primary: "#C9A84C", accent: "var(--success)", text: "#F5F0E8", muted: "#A8A190", gradient: "linear-gradient(135deg,#080808 0%,#111111 100%)" },
      { name: "Premium Navy", group: "Business", bg: "#0D1B2A", primary: "#C9A84C", accent: "#E8C96A", text: "#F5F0E8", muted: "#7A8B9A", gradient: "linear-gradient(135deg,#0D1B2A 0%,#1A3050 100%)" },
      { name: "Midnight Gold", group: "Business", bg: "#080808", primary: "#C9A84C", accent: "var(--success)", text: "#F5F0E8", muted: "#A8A190", gradient: "linear-gradient(135deg,#080808,#1a1a08)" },
      { name: "Boardroom", group: "Business", bg: "#1A1A1A", primary: "#E0E0E0", accent: "#C9A84C", text: "#F5F0E8", muted: "#888888", gradient: "linear-gradient(160deg,#1A1A1A,#2D2D2D)" },
      // Luxury
      { name: "Velvet Noir", group: "Luxury", bg: "#0D0A1A", primary: "#9B59B6", accent: "#E056FD", text: "#F5F0E8", muted: "#8A7A9A", gradient: "linear-gradient(135deg,#0D0A1A 0%,#1A0D2E 100%)" },
      { name: "Golden Luxury", group: "Luxury", bg: "#0A0800", primary: "#FFD700", accent: "#FFA500", text: "#F5EDD0", muted: "#9A8A70", gradient: "linear-gradient(135deg,#0A0800,#1A1200)" },
      { name: "Royal Purple", group: "Luxury", bg: "#0A0015", primary: "#8B00FF", accent: "#DA70D6", text: "#F5F0E8", muted: "#8A7A9A", gradient: "linear-gradient(135deg,#0A0015,#150020)" },
      { name: "Diamond White", group: "Luxury", bg: "#FAFAFA", primary: "#1A1A1A", accent: "#C9A84C", text: "#1A1A1A", muted: "#6B7280", gradient: "linear-gradient(135deg,#FAFAFA,#F0F0F5)" },
      { name: "Prestige", group: "Luxury", bg: "#0C0C0C", primary: "#C9A84C", accent: "#FFD700", text: "#F5EDD0", muted: "#A8A190", gradient: "linear-gradient(160deg,#0C0C0C,#1A1500)" },
      // SaaS
      { name: "Deep Space", group: "SaaS", bg: "#020B18", primary: "#00D4FF", accent: "#7B2FBE", text: "#F5F0E8", muted: "#8A9BA8", gradient: "linear-gradient(135deg,#020B18,#0A1628)" },
      { name: "Aurora", group: "SaaS", bg: "#0A0F1E", primary: "#00FF9D", accent: "var(--danger)", text: "#F5F0E8", muted: "#8A8FA0", gradient: "linear-gradient(135deg,#0A0F1E,#0D1628)" },
      { name: "Ocean Tech", group: "SaaS", bg: "#050F1A", primary: "#00B4D8", accent: "#0096C7", text: "#F5F0E8", muted: "#6A8A9A", gradient: "linear-gradient(160deg,#050F1A,#0A1E2A)" },
      { name: "Matrix Code", group: "SaaS", bg: "#000D00", primary: "#00FF41", accent: "#00CC33", text: "#00FF41", muted: "#006B1A", gradient: "linear-gradient(180deg,#000D00,#001500)" },
      { name: "Future Grid", group: "SaaS", bg: "#08001A", primary: "#7B2FBE", accent: "#9B59B6", text: "#F5F0E8", muted: "#7A6A8A", gradient: "linear-gradient(135deg,#08001A,#100028)" },
      // Restaurant
      { name: "Wine Red", group: "Restaurant", bg: "#1A0008", primary: "#C0392B", accent: "#E74C3C", text: "#F5E8E0", muted: "#9A7A78", gradient: "linear-gradient(135deg,#1A0008,#2D0010)" },
      { name: "Sunset Fire", group: "Restaurant", bg: "#1A0500", primary: "#FF6B00", accent: "#FF8C00", text: "#F5E8D0", muted: "#9A7A5A", gradient: "linear-gradient(135deg,#1A0500,#2D0A00)" },
      { name: "Coffee House", group: "Restaurant", bg: "#1A0F0A", primary: "#8B4513", accent: "#D2691E", text: "#F5EDE0", muted: "#9A8A7A", gradient: "linear-gradient(135deg,#1A0F0A,#2D1A10)" },
      { name: "Olive Garden", group: "Restaurant", bg: "#0A0F05", primary: "#556B2F", accent: "#6B8E23", text: "#F5F0E8", muted: "#7A8A6A", gradient: "linear-gradient(135deg,#0A0F05,#141A08)" },
      { name: "Italian Night", group: "Restaurant", bg: "#0D0808", primary: "#8B0000", accent: "#C9A84C", text: "#F5E8D0", muted: "#9A8070", gradient: "linear-gradient(160deg,#0D0808,#1A0D0D)" },
      // Creator
      { name: "Neon Pink", group: "Creator", bg: "#0D0010", primary: "#FF0080", accent: "#FF69B4", text: "#F5F0E8", muted: "#8A7A8A", gradient: "linear-gradient(135deg,#0D0010,#180015)" },
      { name: "TikTok Vibes", group: "Creator", bg: "#010101", primary: "#FF0050", accent: "#00F2EA", text: "#F5F0E8", muted: "#888888", gradient: "linear-gradient(135deg,#010101,#0A000A)" },
      { name: "Cyber Purple", group: "Creator", bg: "#0A0015", primary: "#BF00FF", accent: "#7B2FBE", text: "#F5F0E8", muted: "#7A6A8A", gradient: "linear-gradient(135deg,#0A0015,#150020)" },
      { name: "Creator Blue", group: "Creator", bg: "#000A20", primary: "#0066FF", accent: "#4A90FF", text: "#F5F0E8", muted: "#6A7A9A", gradient: "linear-gradient(135deg,#000A20,#000F30)" },
      { name: "Electric Neon", group: "Creator", bg: "#050505", primary: "var(--success)", accent: "#00FFFF", text: "#F5F0E8", muted: "#5A8A7A", gradient: "linear-gradient(135deg,#050505,#050F0A)" },
      // Minimal
      { name: "Pure White", group: "Minimal", bg: "#FFFFFF", primary: "#1A1A1A", accent: "#C9A84C", text: "#1A1A1A", muted: "#6B7280", gradient: "linear-gradient(135deg,#FFFFFF,#F8F8F8)" },
      { name: "Minimal Cream", group: "Minimal", bg: "#FAF7F2", primary: "#1A1A1A", accent: "#C9A84C", text: "#2D2D2D", muted: "#7A7060", gradient: "linear-gradient(135deg,#FAF7F2,#F0EDE8)" },
      { name: "Graphite", group: "Minimal", bg: "#1C1C1E", primary: "#AEAEB2", accent: "#C9A84C", text: "#F5F0E8", muted: "#8E8E93", gradient: "linear-gradient(135deg,#1C1C1E,#2C2C2E)" },
      { name: "Stone", group: "Minimal", bg: "#F5F5F0", primary: "#5A5A5A", accent: "#A8A190", text: "#2D2D2D", muted: "#8A8A8A", gradient: "linear-gradient(135deg,#F5F5F0,#EDEDEA)" },
      { name: "Soft Grey", group: "Minimal", bg: "#F0F0F0", primary: "#333333", accent: "#666666", text: "#1A1A1A", muted: "#888888", gradient: "linear-gradient(135deg,#F0F0F0,#E8E8E8)" },
      // Nature
      { name: "Forest Zen", group: "Nature", bg: "#0A1A0E", primary: "#2ECC71", accent: "#27AE60", text: "#F5F0E8", muted: "#6A8A6A", gradient: "linear-gradient(135deg,#0A1A0E,#0F2414)" },
      { name: "Emerald", group: "Nature", bg: "#022A22", primary: "#00A878", accent: "#00C896", text: "#F5F0E8", muted: "#5A8A7A", gradient: "linear-gradient(135deg,#022A22,#043830)" },
      { name: "Ocean Green", group: "Nature", bg: "#021A1A", primary: "#1ABC9C", accent: "#16A085", text: "#F5F0E8", muted: "#5A8A80", gradient: "linear-gradient(135deg,#021A1A,#042828)" },
      { name: "Arctic", group: "Nature", bg: "#E8F4F8", primary: "#2980B9", accent: "#3498DB", text: "#1A2A3A", muted: "#6A8A9A", gradient: "linear-gradient(135deg,#E8F4F8,#D8ECF8)" },
      { name: "Bamboo", group: "Nature", bg: "#F5F0E8", primary: "#4A7C3F", accent: "#6B9E5E", text: "#2D2D1A", muted: "#7A8A6A", gradient: "linear-gradient(135deg,#F5F0E8,#EDE8D8)" },
      // Event
      { name: "Festival Night", group: "Event", bg: "#050008", primary: "#FF6B35", accent: "#FF8C42", text: "#F5F0E8", muted: "#8A7A6A", gradient: "linear-gradient(135deg,#050008,#0A000F)" },
      { name: "Party Purple", group: "Event", bg: "#0A0015", primary: "#9B59B6", accent: "#8E44AD", text: "#F5F0E8", muted: "#7A6A8A", gradient: "linear-gradient(135deg,#0A0015,#150020)" },
      { name: "Celebration", group: "Event", bg: "#0A0500", primary: "#F39C12", accent: "#E67E22", text: "#F5EDD0", muted: "#9A8A6A", gradient: "linear-gradient(135deg,#0A0500,#150A00)" },
      { name: "Fireworks", group: "Event", bg: "#000008", primary: "#FF0000", accent: "#FFD700", text: "#F5F0E8", muted: "#8A8A8A", gradient: "linear-gradient(135deg,#000008,#050010)" },
      { name: "Spotlight", group: "Event", bg: "#080808", primary: "#FFFFFF", accent: "#C9A84C", text: "#F5F0E8", muted: "#8A8A8A", gradient: "linear-gradient(180deg,#1A1A1A,#080808)" },
    ]

    const PATTERNS_LIST = [
      { id: "dots", label: "Points", icon: "·" },
      { id: "grid", label: "Grille", icon: "#" },
      { id: "lines", label: "Lignes", icon: "═" },
      { id: "waves", label: "Vagues", icon: "～" },
      { id: "diagonals", label: "Diagonales", icon: "╱" },
      { id: "hexagons", label: "Hexagones", icon: "⬡" },
      { id: "squares", label: "Carrés", icon: "□" },
      { id: "circles", label: "Cercles", icon: "○" },
      { id: "zigzag", label: "Zigzag", icon: "∧" },
      { id: "stars", label: "Étoiles", icon: "✦" },
    ]

    const getPatternCSS = (pattern: string, color: string, size: number, opacity: number) => {
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

    const presetGroups = Array.from(new Set(PRESETS.map(p => p.group)))
    const [activePresetGroup, setActivePresetGroup] = useState("Business")

    // Appliquer un preset complet
    const applyPreset = (preset: typeof PRESETS[0]) => {
      onThemeChange({
        ...theme,
        bg: preset.bg,
        bgGradient: preset.gradient,
        bgMode: "gradient",
        primary: preset.primary,
        accent: preset.accent,
        text: preset.text,
        muted: preset.muted,
        name: preset.name,
      } as any)
    }

    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
        {/* Onglets principaux */}
        <div style={{ display: "flex", borderBottom: "1px solid rgba(255,255,255,0.06)", marginBottom: 14, flexShrink: 0 }}>
          {(["themes","colors","fonts","bg","blocks"] as const).map(tab => (
            <button key={tab} onClick={() => setThemeTab(tab)}
              style={{ flex: 1, padding: "10px 2px", background: "transparent", border: "none", borderBottom: `2px solid ${themeTab===tab ? G : "transparent"}`, color: themeTab===tab ? G : MUTED, fontSize: 10.5, fontWeight: themeTab===tab ? 700 : 400, cursor: "pointer" }}>
              {tab==="themes" ? "Thèmes" : tab==="colors" ? "Couleurs" : tab==="fonts" ? "Polices" : tab==="bg" ? "Fond" : "Blocs"}
            </button>
          ))}
        </div>

        {/* ── ONGLET THÈMES ── */}
        {themeTab==="themes" && (
          <div>
            {/* Chips catégories */}
            <div style={{ display: "flex", gap: 5, flexWrap: "wrap", marginBottom: 12 }}>
              {PRESET_CATEGORIES.map(cat => (
                <button key={cat.id} onClick={() => setActiveCat(cat.id)}
                  style={{ display: "flex", alignItems: "center", gap: 4, padding: "4px 10px", background: activeCat===cat.id ? cat.color+"20" : "rgba(255,255,255,0.04)", border: `1px solid ${activeCat===cat.id ? cat.color+"50" : "rgba(255,255,255,0.08)"}`, borderRadius: 20, color: activeCat===cat.id ? cat.color : MUTED, fontSize: 10, fontWeight: activeCat===cat.id ? 700 : 400, cursor: "pointer", transition: "all 0.15s" }}>
                  <span>{cat.icon}</span><span style={{ marginLeft: 3 }}>{cat.id}</span>
                </button>
              ))}
            </div>
            {/* Grille presets filtrés par catégorie */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 7 }}>
              {Object.entries(PRESET_THEMES).filter(([, t]) => t.category === activeCat).map(([key, t]) => (
                <button key={key} onClick={() => onThemeChange(t)}
                  style={{ background: t.bgGradient || t.bg, border: `2px solid ${theme.name===t.name ? G : "rgba(255,255,255,0.1)"}`, borderRadius: 12, padding: "10px 10px", cursor: "pointer", textAlign: "left" as const, position: "relative", overflow: "hidden", minHeight: 72, transition: "border-color 0.15s" }}>
                  <div style={{ display: "flex", gap: 4, marginBottom: 6 }}>
                    {[t.primary, t.accent, t.text].map((col, i) => (
                      <div key={i} style={{ width: 10, height: 10, borderRadius: "50%", background: col, boxShadow: `0 0 4px ${col}80` }} />
                    ))}
                  </div>
                  <p style={{ color: t.text, fontSize: 11, fontWeight: 700, margin: "0 0 2px", fontFamily: `${t.fontDisplay}, serif`, textShadow: "0 1px 3px rgba(0,0,0,0.5)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" as const }}>{t.name}</p>
                  <span style={{ fontSize: 11, opacity: 0.7 }}>{t.emoji}</span>
                  {theme.name===t.name && (
                    <div style={{ position: "absolute", top: 5, right: 5, width: 16, height: 16, background: G, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center" }}>
                      <Check size={9} color="#000" />
                    </div>
                  )}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* ── ONGLET COULEURS ── */}
        {themeTab==="colors" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
            {/* Sélecteur de format */}
            <div style={{ display: "flex", gap: 4, marginBottom: 14 }}>
              {(["hex","rgb","hsl"] as const).map(fmt => (
                <button key={fmt} onClick={() => setColorFormat(fmt)}
                  style={{ flex: 1, padding: "5px", background: colorFormat===fmt ? G+"15" : "rgba(255,255,255,0.04)", border: `1px solid ${colorFormat===fmt ? G+"40" : "rgba(255,255,255,0.07)"}`, borderRadius: 7, color: colorFormat===fmt ? G : MUTED, fontSize: 10, fontWeight: colorFormat===fmt ? 700 : 400, cursor: "pointer", textTransform: "uppercase" as const }}>
                  {fmt}
                </button>
              ))}
            </div>

            {/* Tokens de couleur */}
            {[
              { key: "primary",   label: "Primaire",   hint: "Boutons, CTA, liens",       icon: "🎨" },
              { key: "accent",    label: "Accent",      hint: "Highlights, hover",          icon: "✨" },
              { key: "bg",        label: "Fond",        hint: "Arrière-plan de la page",   icon: "🖼️" },
              { key: "surface",   label: "Cartes",      hint: "Fond des blocs et cartes",  icon: "▣" },
              { key: "text",      label: "Texte",       hint: "Texte principal",           icon: "T" },
              { key: "muted",     label: "Secondaire",  hint: "Texte secondaire, labels",  icon: "t" },
              { key: "border",    label: "Bordures",    hint: "Contours des éléments",     icon: "⬜" },
            ].map(({ key, label, hint, icon }) => {
              const val: string = (theme as any)[key] || "#000000"
              const ratio = contrastRatio(val, (theme as any).bg || "#000000")
              const wcag = wcagLevel(ratio)
              return (
                <div key={key} style={{ marginBottom: 12 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 5 }}>
                    <span style={{ fontSize: 12, width: 18, textAlign: "center" as const }}>{icon}</span>
                    <label style={{ color: "#F5F0E8", fontSize: 11, fontWeight: 600, flex: 1 }}>{label}</label>
                    <span style={{ fontSize: 9, color: MUTED }}>{hint}</span>
                    {/* Badge contraste */}
                    {(key === "text" || key === "muted") && (
                      <span style={{ background: wcag==="AAA" ? "rgba(57,255,143,0.15)" : wcag==="AA" ? "rgba(251,191,36,0.15)" : "rgba(239,68,68,0.15)", border: `1px solid ${wcag==="AAA" ? "rgba(57,255,143,0.3)" : wcag==="AA" ? "rgba(251,191,36,0.3)" : "rgba(239,68,68,0.3)"}`, borderRadius: 6, padding: "1px 6px", fontSize: 9, fontWeight: 700, color: wcag==="AAA" ? "var(--success)" : wcag==="AA" ? "#FBBF24" : "#EF4444" }}>
                        {wcag} {ratio.toFixed(1)}:1
                      </span>
                    )}
                  </div>
                  <div style={{ display: "flex", gap: 7, alignItems: "center" }}>
                    {/* Color picker natif */}
                    <div style={{ position: "relative", flexShrink: 0 }}>
                      <input type="color" value={val.startsWith("#") ? val : "#000000"}
                        onChange={e => { onThemeChange({...theme, [key]: e.target.value} as any); addRecentColor(e.target.value) }}
                        style={{ width: 38, height: 36, border: "none", borderRadius: 8, cursor: "pointer", padding: 2, background: "transparent" }} />
                      <div style={{ position: "absolute", inset: 0, borderRadius: 8, border: "2px solid rgba(255,255,255,0.15)", pointerEvents: "none" }} />
                    </div>
                    {/* Input format */}
                    <input
                      value={formatColor(val, colorFormat)}
                      onChange={e => {
                        const parsed = parseColorInput(e.target.value) || e.target.value
                        if (parsed.startsWith("#")) { onThemeChange({...theme, [key]: parsed} as any); addRecentColor(parsed) }
                      }}
                      style={{ ...inputStyle, flex: 1, fontFamily: "JetBrains Mono, monospace", fontSize: 11 }}
                      placeholder={colorFormat === "hex" ? "#000000" : colorFormat === "rgb" ? "rgb(0,0,0)" : "hsl(0,0%,0%)"}
                    />
                  </div>
                </div>
              )
            })}

            {/* Couleurs récentes */}
            {recentColors.length > 0 && (
              <div style={{ marginTop: 8 }}>
                <p style={{ color: MUTED, fontSize: 9, textTransform: "uppercase" as const, letterSpacing: 2, margin: "0 0 8px" }}>Récentes</p>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                  {recentColors.map((col, i) => (
                    <button key={i} title={col}
                      style={{ width: 24, height: 24, borderRadius: 6, background: col, border: "2px solid rgba(255,255,255,0.1)", cursor: "pointer", flexShrink: 0 }}
                      onClick={() => onThemeChange({...theme, primary: col} as any)} />
                  ))}
                </div>
              </div>
            )}

            {/* Aperçu des couleurs appliquées */}
            <div style={{ marginTop: 14, background: theme.surface || theme.bg, borderRadius: 12, overflow: "hidden", border: "1px solid rgba(255,255,255,0.06)" }}>
              <div style={{ padding: "12px 14px" }}>
                <p style={{ color: theme.text, fontSize: 13, fontWeight: 700, margin: "0 0 3px", fontFamily: theme.fontDisplay }}>Aperçu live</p>
                <p style={{ color: theme.muted, fontSize: 11, margin: "0 0 10px" }}>Texte secondaire exemple</p>
                <div style={{ display: "flex", gap: 7 }}>
                  <div style={{ flex: 1, background: theme.primary, borderRadius: 7, padding: "7px", textAlign: "center", fontSize: 11, fontWeight: 700, color: contrastRatio(theme.primary, "#ffffff") > 4.5 ? "#ffffff" : "#000000" }}>Bouton primaire</div>
                  <div style={{ flex: 1, background: theme.accent, borderRadius: 7, padding: "7px", textAlign: "center", fontSize: 11, fontWeight: 700, color: contrastRatio(theme.accent, "#ffffff") > 4.5 ? "#ffffff" : "#000000" }}>Accent</div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── ONGLET POLICES ── */}
        {themeTab==="fonts" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            {[
              { key: "fontDisplay", label: "Police titres" },
              { key: "fontBody", label: "Police corps" },
            ].map(({ key, label }) => (
              <div key={key}>
                <label style={{ color: MUTED, fontSize: 10, display: "block", marginBottom: 8, fontWeight: 500, textTransform: "uppercase" as const, letterSpacing: 1.5 }}>{label}</label>
                <div style={{ display: "flex", flexDirection: "column", gap: 4, maxHeight: 200, overflowY: "auto" }} className="iphone-scroll">
                  {GOOGLE_FONTS.map(f => (
                    <button key={f} onClick={() => onThemeChange({...theme, [key]: f})}
                      style={{ padding: "9px 12px", background: (theme as any)[key]===f ? G+"12" : "rgba(255,255,255,0.03)", border: `1px solid ${(theme as any)[key]===f ? G+"30" : "rgba(255,255,255,0.06)"}`, borderRadius: 8, color: (theme as any)[key]===f ? G : "#F5F0E8", fontSize: 14, cursor: "pointer", textAlign: "left", fontFamily: f, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                      {f}
                      {(theme as any)[key]===f && <Check size={11} color={G} />}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ── ONGLET FOND ── */}
        {themeTab==="bg" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
            {/* Sous-onglets Fond */}
            <div style={{ display: "flex", gap: 4, marginBottom: 14, flexWrap: "wrap" }}>
              {(["presets","type","effects","animation","advanced"] as const).map(sub => (
                <button key={sub} onClick={() => setBgSubTab(sub)}
                  style={{ flex: 1, minWidth: 60, padding: "7px 4px", background: bgSubTab===sub ? G+"15" : "rgba(255,255,255,0.03)", border: `1px solid ${bgSubTab===sub ? G+"40" : "rgba(255,255,255,0.07)"}`, borderRadius: 8, color: bgSubTab===sub ? G : MUTED, fontSize: 10, fontWeight: bgSubTab===sub ? 700 : 400, cursor: "pointer", transition: "all 0.15s" }}>
                  {sub==="presets" ? "Presets" : sub==="type" ? "Type" : sub==="effects" ? "Effets" : sub==="animation" ? "Anim" : "Avancé"}
                </button>
              ))}
            </div>

            {/* PRESETS */}
            {bgSubTab==="presets" && (
              <div>
                {/* Groupes */}
                <div style={{ display: "flex", gap: 5, flexWrap: "wrap", marginBottom: 12 }}>
                  {presetGroups.map(group => (
                    <button key={group} onClick={() => setActivePresetGroup(group)}
                      style={{ padding: "4px 10px", background: activePresetGroup===group ? G+"15" : "rgba(255,255,255,0.04)", border: `1px solid ${activePresetGroup===group ? G+"40" : "rgba(255,255,255,0.08)"}`, borderRadius: 20, color: activePresetGroup===group ? G : MUTED, fontSize: 10, fontWeight: activePresetGroup===group ? 700 : 400, cursor: "pointer" }}>
                      {group}
                    </button>
                  ))}
                </div>
                {/* Presets du groupe */}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 7 }}>
                  {PRESETS.filter(p => p.group===activePresetGroup).map(preset => (
                    <button key={preset.name} onClick={() => applyPreset(preset)}
                      style={{ background: preset.gradient, border: `2px solid ${theme.name===preset.name ? G : "rgba(255,255,255,0.1)"}`, borderRadius: 12, padding: "12px 10px", cursor: "pointer", textAlign: "left", position: "relative", overflow: "hidden", minHeight: 70 }}>
                      <div style={{ display: "flex", gap: 4, marginBottom: 6 }}>
                        {[preset.primary, preset.accent, preset.text].map((col, i) => <div key={i} style={{ width: 10, height: 10, borderRadius: "50%", background: col, boxShadow: `0 0 4px ${col}80` }} />)}
                      </div>
                      <p style={{ color: preset.text, fontSize: 10, fontWeight: 700, margin: 0, textShadow: "0 1px 3px rgba(0,0,0,0.5)" }}>{preset.name}</p>
                      {theme.name===preset.name && <div style={{ position: "absolute", top: 4, right: 4, width: 14, height: 14, background: G, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center" }}><Check size={8} color="#000" /></div>}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* TYPE DE FOND */}
            {bgSubTab==="type" && (
              <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                {/* Type selector */}
                <div>
                  <label style={{ color: MUTED, fontSize: 10, display: "block", marginBottom: 8, textTransform: "uppercase" as const, letterSpacing: 1.5 }}>Type de fond</label>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 5 }}>
                    {[
                      { id: "solid", label: "Uni", icon: "🎨" },
                      { id: "gradient", label: "Linéaire", icon: "🌈" },
                      { id: "radial", label: "Radial", icon: "🔴" },
                      { id: "mesh", label: "Mesh", icon: "✨" },
                      { id: "pattern", label: "Motif", icon: "▦" },
                      { id: "image", label: "Image", icon: "🖼️" },
                    ].map(({ id, label, icon }) => (
                      <button type="button" key={id} onClick={() => { setBgMode(id); onThemeChange({...theme, bgMode: id} as any) }}
                        style={{ background: bgMode===id ? G+"15" : "rgba(255,255,255,0.03)", border: `1.5px solid ${bgMode===id ? G+"50" : "rgba(255,255,255,0.08)"}`, borderRadius: 9, padding: "9px 5px", cursor: "pointer", color: bgMode===id ? G : MUTED, fontSize: 10, fontWeight: bgMode===id ? 700 : 400, display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
                        <span style={{ fontSize: 16 }}>{icon}</span>
                        <span>{label}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* UNI */}
                {bgMode==="solid" && (
                  <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                    <label style={{ color: MUTED, fontSize: 10, textTransform: "uppercase" as const, letterSpacing: 1.5 }}>Couleur de fond</label>
                    <div style={{ display: "flex", gap: 8 }}>
                      <input type="color" value={theme.bg} onChange={e => onThemeChange({...theme, bg: e.target.value})}
                        style={{ width: 44, height: 40, border: "none", borderRadius: 8, cursor: "pointer", padding: 0 }} />
                      <input type="text" value={theme.bg} onChange={e => onThemeChange({...theme, bg: e.target.value})} style={{ ...inputStyle, flex: 1 }} />
                    </div>
                  </div>
                )}

                {/* DÉGRADÉ */}
                {bgMode==="gradient" && (
                  <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                    <label style={{ color: MUTED, fontSize: 10, textTransform: "uppercase" as const, letterSpacing: 1.5 }}>Dégradé linéaire</label>
                    <div style={{ height: 50, borderRadius: 10, background: theme.bgGradient||"linear-gradient(135deg,#080808,#1a1a08)", border: "1px solid rgba(255,255,255,0.1)" }} />
                    {[
                      { label: "Couleur 1", key: "grad_c1", default: "#080808" },
                      { label: "Couleur 2", key: "grad_c2", default: "#C9A84C" },
                      { label: "Couleur 3 (optionnel)", key: "grad_c3", default: "" },
                    ].map(({ label, key, default: def }) => (
                      <div key={key}>
                        <label style={{ color: MUTED, fontSize: 10, display: "block", marginBottom: 4 }}>{label}</label>
                        <div style={{ display: "flex", gap: 7 }}>
                          <input type="color" value={(theme as any)[key]||def||"#080808"} onChange={e => {
                            const t2 = {...theme, [key]: e.target.value}
                            const c1 = (t2 as any).grad_c1||"#080808"
                            const c2 = (t2 as any).grad_c2||"#C9A84C"
                            const c3 = (t2 as any).grad_c3
                            const angle = (t2 as any).grad_angle||135
                            onThemeChange({...t2, bgGradient: `linear-gradient(${angle}deg,${c1},${c2}${c3?`,${c3}`:""})` } as any)
                          }} style={{ width: 34, height: 32, border: "none", borderRadius: 6, cursor: "pointer", padding: 0 }} />
                          <input type="text" value={(theme as any)[key]||""} onChange={e => onThemeChange({...theme, [key]: e.target.value} as any)}
                            placeholder={def} style={{ ...inputStyle, flex: 1 }} />
                        </div>
                      </div>
                    ))}
                    <div>
                      <label style={{ color: MUTED, fontSize: 10, display: "block", marginBottom: 4 }}>Angle: {(theme as any).grad_angle||135}°</label>
                      <input type="range" min="0" max="360" value={(theme as any).grad_angle||135}
                        onChange={e => {
                          const angle = parseInt(e.target.value)
                          const c1 = (theme as any).grad_c1||theme.bg||"#080808"
                          const c2 = (theme as any).grad_c2||"#C9A84C"
                          const c3 = (theme as any).grad_c3
                          onThemeChange({...theme, grad_angle: angle, bgGradient: `linear-gradient(${angle}deg,${c1},${c2}${c3?`,${c3}`:""})` } as any)
                        }}
                        style={{ width: "100%", accentColor: G }} />
                    </div>
                    <label style={{ color: MUTED, fontSize: 10, textTransform: "uppercase" as const, letterSpacing: 1.5, marginTop: 4 }}>Presets rapides</label>
                    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                      {[
                        "linear-gradient(135deg,#080808,#1a1a08)",
                        "linear-gradient(135deg,#020B18,#0A1628)",
                        "linear-gradient(135deg,#0D0A1A,#1A0D2E)",
                        "linear-gradient(135deg,#0A1A0E,#0F2414)",
                        "linear-gradient(135deg,#1A0A00,#2D1500)",
                        "linear-gradient(135deg,#FAFAFA,#F0F0F0)",
                        "linear-gradient(135deg,#0A0F1E,#1A0A28)",
                        "linear-gradient(160deg,#080808,#1A0010)",
                      ].map((g, i) => (
                        <button key={i} onClick={() => onThemeChange({...theme, bgGradient: g, bgMode: "gradient"} as any)}
                          style={{ height: 32, background: g, border: `2px solid ${theme.bgGradient===g ? G : "rgba(255,255,255,0.08)"}`, borderRadius: 8, cursor: "pointer", position: "relative" }}>
                          {theme.bgGradient===g && <Check size={11} color={G} style={{ position: "absolute", right: 8, top: "50%", transform: "translateY(-50%)" }} />}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* DÉGRADÉ RADIAL */}
                {bgMode==="radial" && (
                  <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                    <label style={{ color: MUTED, fontSize: 10, textTransform: "uppercase" as const, letterSpacing: 1.5 }}>Dégradé radial</label>
                    {/* Preview */}
                    <div style={{ height: 80, borderRadius: 10, background: `radial-gradient(circle at ${(theme as any).radial_x||50}% ${(theme as any).radial_y||50}%, ${(theme as any).radial_c1||"#C9A84C"}, ${(theme as any).radial_c2||"#080808"}${(theme as any).radial_c3 ? `, ${(theme as any).radial_c3}` : ""})`, border: "1px solid rgba(255,255,255,0.1)" }} />
                    {/* Couleurs */}
                    {[
                      { label: "Couleur centre", key: "radial_c1", default: "#C9A84C" },
                      { label: "Couleur milieu", key: "radial_c2", default: "#1A1A1A" },
                      { label: "Couleur bord (opt.)", key: "radial_c3", default: "" },
                    ].map(({ label, key, default: def }) => (
                      <div key={key}>
                        <label style={{ color: MUTED, fontSize: 10, display: "block", marginBottom: 4 }}>{label}</label>
                        <div style={{ display: "flex", gap: 7 }}>
                          <input type="color" value={(theme as any)[key]||def||"#080808"}
                            onChange={e => {
                              const t2 = {...theme, [key]: e.target.value}
                              const c1 = (t2 as any).radial_c1||"#C9A84C"
                              const c2 = (t2 as any).radial_c2||"#080808"
                              const c3 = (t2 as any).radial_c3
                              const x = (t2 as any).radial_x||50
                              const y = (t2 as any).radial_y||50
                              onThemeChange({...t2, bgGradient: `radial-gradient(circle at ${x}% ${y}%, ${c1}, ${c2}${c3?`, ${c3}`:""})`} as any)
                            }}
                            style={{ width: 34, height: 32, border: "none", borderRadius: 6, cursor: "pointer", padding: 0 }} />
                          <input type="text" value={(theme as any)[key]||""}
                            onChange={e => onThemeChange({...theme, [key]: e.target.value} as any)}
                            placeholder={def} style={{ ...inputStyle, flex: 1 }} />
                        </div>
                      </div>
                    ))}
                    {/* Position du centre */}
                    <div style={{ display: "flex", gap: 10 }}>
                      <div style={{ flex: 1 }}>
                        <label style={{ color: MUTED, fontSize: 10, display: "block", marginBottom: 4 }}>Centre X: {(theme as any).radial_x||50}%</label>
                        <input type="range" min="0" max="100" value={(theme as any).radial_x||50}
                          onChange={e => {
                            const x = parseInt(e.target.value)
                            const c1 = (theme as any).radial_c1||"#C9A84C"
                            const c2 = (theme as any).radial_c2||"#080808"
                            const c3 = (theme as any).radial_c3
                            const y = (theme as any).radial_y||50
                            onThemeChange({...theme, radial_x: x, bgGradient: `radial-gradient(circle at ${x}% ${y}%, ${c1}, ${c2}${c3?`, ${c3}`:""})`} as any)
                          }}
                          style={{ width: "100%", accentColor: G }} />
                      </div>
                      <div style={{ flex: 1 }}>
                        <label style={{ color: MUTED, fontSize: 10, display: "block", marginBottom: 4 }}>Centre Y: {(theme as any).radial_y||50}%</label>
                        <input type="range" min="0" max="100" value={(theme as any).radial_y||50}
                          onChange={e => {
                            const y = parseInt(e.target.value)
                            const c1 = (theme as any).radial_c1||"#C9A84C"
                            const c2 = (theme as any).radial_c2||"#080808"
                            const c3 = (theme as any).radial_c3
                            const x = (theme as any).radial_x||50
                            onThemeChange({...theme, radial_y: y, bgGradient: `radial-gradient(circle at ${x}% ${y}%, ${c1}, ${c2}${c3?`, ${c3}`:""})`} as any)
                          }}
                          style={{ width: "100%", accentColor: G }} />
                      </div>
                    </div>
                    {/* Type de forme */}
                    <div style={{ display: "flex", gap: 6 }}>
                      {["circle", "ellipse"].map(shape => (
                        <button key={shape} onClick={() => {
                          const c1 = (theme as any).radial_c1||"#C9A84C"
                          const c2 = (theme as any).radial_c2||"#080808"
                          const c3 = (theme as any).radial_c3
                          const x = (theme as any).radial_x||50
                          const y = (theme as any).radial_y||50
                          onThemeChange({...theme, radial_shape: shape, bgGradient: `radial-gradient(${shape} at ${x}% ${y}%, ${c1}, ${c2}${c3?`, ${c3}`:""})`} as any)
                        }}
                        style={{ flex: 1, padding: "6px", background: ((theme as any).radial_shape||"circle")===shape ? G+"15" : "rgba(255,255,255,0.04)", border: `1px solid ${((theme as any).radial_shape||"circle")===shape ? G+"40" : "rgba(255,255,255,0.08)"}`, borderRadius: 8, color: ((theme as any).radial_shape||"circle")===shape ? G : MUTED, fontSize: 10, cursor: "pointer" }}>
                          {shape === "circle" ? "⭕ Cercle" : "🔵 Ellipse"}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* MESH */}
                {bgMode==="mesh" && (
                  <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                    <label style={{ color: MUTED, fontSize: 10, textTransform: "uppercase" as const, letterSpacing: 1.5 }}>Dégradé Mesh</label>
                    <div style={{ height: 60, borderRadius: 10, background: `radial-gradient(ellipse at 0% 0%, ${(theme as any).mesh_c1||"#C9A84C"}80, transparent 50%), radial-gradient(ellipse at 100% 100%, ${(theme as any).mesh_c2||"var(--success)"}80, transparent 50%), radial-gradient(ellipse at 100% 0%, ${(theme as any).mesh_c3||"#7B2FBE"}60, transparent 50%), ${theme.bg}`, border: "1px solid rgba(255,255,255,0.1)", filter: `blur(${Math.round(((theme as any).mesh_blur||40)/5)}px)`, overflow: "hidden" }} />
                    {[
                      { label: "Couleur 1", key: "mesh_c1", default: "#C9A84C" },
                      { label: "Couleur 2", key: "mesh_c2", default: "var(--success)" },
                      { label: "Couleur 3", key: "mesh_c3", default: "#7B2FBE" },
                    ].map(({ label, key, default: def }) => (
                      <div key={key} style={{ display: "flex", gap: 7, alignItems: "center" }}>
                        <input type="color" value={(theme as any)[key]||def} onChange={e => onThemeChange({...theme, [key]: e.target.value} as any)}
                          style={{ width: 34, height: 32, border: "none", borderRadius: 6, cursor: "pointer", padding: 0 }} />
                        <span style={{ color: MUTED, fontSize: 11 }}>{label}</span>
                      </div>
                    ))}
                    <div>
                      <label style={{ color: MUTED, fontSize: 10, display: "block", marginBottom: 4 }}>Flou: {(theme as any).mesh_blur||40}px</label>
                      <input type="range" min="0" max="100" value={(theme as any).mesh_blur||40}
                        onChange={e => onThemeChange({...theme, mesh_blur: parseInt(e.target.value)} as any)}
                        style={{ width: "100%", accentColor: G }} />
                    </div>
                  </div>
                )}

                {/* MOTIF */}
                {bgMode==="pattern" && (
                  <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                    <label style={{ color: MUTED, fontSize: 10, textTransform: "uppercase" as const, letterSpacing: 1.5 }}>Motif</label>
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(5,1fr)", gap: 5 }}>
                      {PATTERNS_LIST.map(p => (
                        <button key={p.id} onClick={() => { setPatternType(p.id); onThemeChange({...theme, bgPattern: p.id} as any) }}
                          style={{ padding: "8px 4px", background: patternType===p.id ? G+"15" : "rgba(255,255,255,0.03)", border: `1.5px solid ${patternType===p.id ? G+"50" : "rgba(255,255,255,0.08)"}`, borderRadius: 8, cursor: "pointer", color: patternType===p.id ? G : MUTED, fontSize: 9, display: "flex", flexDirection: "column", alignItems: "center", gap: 3 }}>
                          <span style={{ fontSize: 16 }}>{p.icon}</span>
                          <span>{p.label}</span>
                        </button>
                      ))}
                    </div>
                    <div>
                      <label style={{ color: MUTED, fontSize: 10, display: "block", marginBottom: 4 }}>Taille: {(theme as any).pattern_size||20}px</label>
                      <input type="range" min="5" max="80" value={(theme as any).pattern_size||20} onChange={e => onThemeChange({...theme, pattern_size: parseInt(e.target.value)} as any)} style={{ width: "100%", accentColor: G }} />
                    </div>
                    <div>
                      <label style={{ color: MUTED, fontSize: 10, display: "block", marginBottom: 4 }}>Opacité: {Math.round(((theme as any).pattern_opacity||0.15)*100)}%</label>
                      <input type="range" min="1" max="100" value={Math.round(((theme as any).pattern_opacity||0.15)*100)} onChange={e => onThemeChange({...theme, pattern_opacity: parseInt(e.target.value)/100} as any)} style={{ width: "100%", accentColor: G }} />
                    </div>
                    <div style={{ display: "flex", gap: 7, alignItems: "center" }}>
                      <input type="color" value={(theme as any).pattern_color||"#C9A84C"} onChange={e => onThemeChange({...theme, pattern_color: e.target.value} as any)} style={{ width: 34, height: 32, border: "none", borderRadius: 6, cursor: "pointer", padding: 0 }} />
                      <span style={{ color: MUTED, fontSize: 11 }}>Couleur du motif</span>
                    </div>
                    <div style={{ height: 50, borderRadius: 8, background: theme.bg, backgroundImage: getPatternCSS(patternType, (theme as any).pattern_color||"#C9A84C", (theme as any).pattern_size||20, (theme as any).pattern_opacity||0.15), backgroundSize: `${(theme as any).pattern_size||20}px ${(theme as any).pattern_size||20}px`, border: "1px solid rgba(255,255,255,0.08)" }} />
                  </div>
                )}

                {/* IMAGE */}
                {bgMode==="image" && (
                  <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                    <label style={{ color: MUTED, fontSize: 10, textTransform: "uppercase" as const, letterSpacing: 1.5 }}>Image de fond</label>
                    {/* Upload fichier */}
                    <label style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, height: 48, background: "rgba(201,168,76,0.08)", border: "1.5px dashed rgba(201,168,76,0.3)", borderRadius: 10, cursor: "pointer", color: G, fontSize: 12, fontWeight: 600 }}>
                      <span>📁</span> Choisir une image
                      <input type="file" accept="image/*" style={{ display: "none" }} onChange={e => {
                        const file = e.target.files?.[0]
                        if (file) {
                          const reader = new FileReader()
                          reader.onload = ev => onThemeChange({...theme, bgImage: ev.target?.result as string, bgMode: "image"} as any)
                          reader.readAsDataURL(file)
                        }
                      }} />
                    </label>
                    {/* OU lien URL */}
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <div style={{ flex: 1, height: 1, background: "rgba(255,255,255,0.1)" }} />
                      <span style={{ color: MUTED, fontSize: 10 }}>ou URL</span>
                      <div style={{ flex: 1, height: 1, background: "rgba(255,255,255,0.1)" }} />
                    </div>
                    <input type="url" value={(theme as any).bgImage?.startsWith("data:") ? "" : (theme as any).bgImage||""} onChange={e => onThemeChange({...theme, bgImage: e.target.value} as any)}
                      placeholder="https://..." style={{ ...inputStyle }} />
                    {(theme as any).bgImage && (
                      <div style={{ position: "relative" }}>
                        <img src={(theme as any).bgImage} alt="" style={{ width: "100%", height: 80, objectFit: "cover", borderRadius: 8, display: "block" }} />
                        <button onClick={() => onThemeChange({...theme, bgImage: ""} as any)} style={{ position: "absolute", top: 4, right: 4, background: "rgba(0,0,0,0.7)", border: "none", borderRadius: "50%", width: 22, height: 22, color: "#fff", cursor: "pointer", fontSize: 12, display: "flex", alignItems: "center", justifyContent: "center" }}>×</button>
                      </div>
                    )}
                    <div>
                      <label style={{ color: MUTED, fontSize: 10, display: "block", marginBottom: 6 }}>Taille & position</label>
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
                        {[
                          { val: "cover", label: "Cover", icon: "⬛", desc: "Remplit tout" },
                          { val: "contain", label: "Contain", icon: "🔲", desc: "Affiche tout" },
                          { val: "repeat", label: "Mosaïque", icon: "⊞", desc: "Répète" },
                          { val: "auto", label: "Auto", icon: "⬜", desc: "Taille réelle" },
                        ].map(({ val, label, icon, desc }) => (
                          <button key={val} onClick={() => onThemeChange({...theme, bgImageSize: val} as any)}
                            style={{ padding: "7px", background: ((theme as any).bgImageSize||"cover")===val ? G+"15" : "rgba(255,255,255,0.04)", border: `1px solid ${((theme as any).bgImageSize||"cover")===val ? G+"40" : "rgba(255,255,255,0.08)"}`, borderRadius: 8, cursor: "pointer", color: ((theme as any).bgImageSize||"cover")===val ? G : MUTED, fontSize: 10, textAlign: "left" as const }}>
                            <div style={{ fontSize: 14, marginBottom: 2 }}>{icon}</div>
                            <div style={{ fontWeight: 600 }}>{label}</div>
                            <div style={{ fontSize: 8, opacity: 0.7 }}>{desc}</div>
                          </button>
                        ))}
                      </div>
                    </div>
                    <div>
                      <label style={{ color: MUTED, fontSize: 10, display: "block", marginBottom: 4 }}>Overlay: {Math.round(((theme as any).bgOverlayOpacity||0.5)*100)}%</label>
                      <input type="range" min="0" max="100" value={Math.round(((theme as any).bgOverlayOpacity||0.5)*100)} onChange={e => onThemeChange({...theme, bgOverlayOpacity: parseInt(e.target.value)/100} as any)} style={{ width: "100%", accentColor: G }} />
                    </div>
                    <div>
                      <label style={{ color: MUTED, fontSize: 10, display: "block", marginBottom: 4 }}>Flou: {(theme as any).bgBlur||0}px</label>
                      <input type="range" min="0" max="20" value={(theme as any).bgBlur||0} onChange={e => onThemeChange({...theme, bgBlur: parseInt(e.target.value)} as any)} style={{ width: "100%", accentColor: G }} />
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* EFFETS */}
            {bgSubTab==="effects" && (
              <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                {/* Preview fond actuel avec effets */}
                <div style={{ position: "relative", height: 80, borderRadius: 12, overflow: "hidden", border: "1px solid rgba(255,255,255,0.1)", marginBottom: 4 }}>
                  <div style={{ position: "absolute", inset: 0, background: theme.bgGradient||theme.bg }} />
                  {effectNoise && <div style={{ position: "absolute", inset: 0, background: "rgba(128,128,128,0.15)", opacity: 0.2, mixBlendMode: "overlay" as const }} />}
                  {effectGlow && <div style={{ position: "absolute", inset: 0, background: `radial-gradient(circle at 50% 50%, ${(theme as any).glow_color||G}${Math.round(((theme as any).glow_intensity||30)/100*255).toString(16).padStart(2,"0")}, transparent ${(theme as any).glow_size||200}px)` }} />}
                  {effectVignette && <div style={{ position: "absolute", inset: 0, background: `radial-gradient(ellipse at center, transparent ${100-(theme as any).vignette_intensity||60}%, rgba(0,0,0,0.8) 100%)` }} />}
                  <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <p style={{ color: "rgba(255,255,255,0.4)", fontSize: 10, margin: 0, letterSpacing: 2, textTransform: "uppercase" as const }}>Aperçu des effets</p>
                  </div>
                </div>
                {/* Noise */}
                <div style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 12, padding: "12px 14px" }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: (theme as any).effect_noise ? 10 : 0 }}>
                    <label style={{ color: "#F5F0E8", fontSize: 12, fontWeight: 600 }}>🌫️ Noise</label>
                    <button onClick={() => onThemeChange({...theme, effect_noise: !(theme as any).effect_noise} as any)} style={{ width: 36, height: 20, borderRadius: 10, background: (theme as any).effect_noise ? G : "rgba(255,255,255,0.15)", border: "none", cursor: "pointer", position: "relative", transition: "background 0.2s" }}>
                      <div style={{ width: 16, height: 16, borderRadius: "50%", background: "#fff", position: "absolute", top: 2, left: (theme as any).effect_noise ? 18 : 2, transition: "left 0.2s" }} />
                    </button>
                  </div>
                  {(theme as any).effect_noise && (
                    <div>
                      <label style={{ color: MUTED, fontSize: 10, display: "block", marginBottom: 4 }}>Opacité: {(theme as any).noise_opacity||20}%</label>
                      <input type="range" min="1" max="80" value={(theme as any).noise_opacity||20} onChange={e => onThemeChange({...theme, noise_opacity: parseInt(e.target.value)} as any)} style={{ width: "100%", accentColor: G }} />
                    </div>
                  )}
                </div>

                {/* Glow */}
                <div style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 12, padding: "12px 14px" }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: (theme as any).effect_glow ? 10 : 0 }}>
                    <label style={{ color: "#F5F0E8", fontSize: 12, fontWeight: 600 }}>✨ Glow</label>
                    <button onClick={() => onThemeChange({...theme, effect_glow: !(theme as any).effect_glow} as any)} style={{ width: 36, height: 20, borderRadius: 10, background: (theme as any).effect_glow ? G : "rgba(255,255,255,0.15)", border: "none", cursor: "pointer", position: "relative", transition: "background 0.2s" }}>
                      <div style={{ width: 16, height: 16, borderRadius: "50%", background: "#fff", position: "absolute", top: 2, left: (theme as any).effect_glow ? 18 : 2, transition: "left 0.2s" }} />
                    </button>
                  </div>
                  {(theme as any).effect_glow && (
                    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                      <div style={{ display: "flex", gap: 7, alignItems: "center" }}>
                        <input type="color" value={(theme as any).glow_color||G} onChange={e => onThemeChange({...theme, glow_color: e.target.value} as any)} style={{ width: 34, height: 32, border: "none", borderRadius: 6, cursor: "pointer", padding: 0 }} />
                        <span style={{ color: MUTED, fontSize: 11 }}>Couleur</span>
                      </div>
                      <div>
                        <label style={{ color: MUTED, fontSize: 10, display: "block", marginBottom: 4 }}>Intensité: {(theme as any).glow_intensity||30}%</label>
                        <input type="range" min="5" max="100" value={(theme as any).glow_intensity||30} onChange={e => onThemeChange({...theme, glow_intensity: parseInt(e.target.value)} as any)} style={{ width: "100%", accentColor: G }} />
                      </div>
                      <div>
                        <label style={{ color: MUTED, fontSize: 10, display: "block", marginBottom: 4 }}>Taille: {(theme as any).glow_size||200}px</label>
                        <input type="range" min="50" max="600" value={(theme as any).glow_size||200} onChange={e => onThemeChange({...theme, glow_size: parseInt(e.target.value)} as any)} style={{ width: "100%", accentColor: G }} />
                      </div>
                    </div>
                  )}
                </div>

                {/* Vignette */}
                <div style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 12, padding: "12px 14px" }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: (theme as any).effect_vignette ? 10 : 0 }}>
                    <label style={{ color: "#F5F0E8", fontSize: 12, fontWeight: 600 }}>🌑 Vignette</label>
                    <button onClick={() => onThemeChange({...theme, effect_vignette: !(theme as any).effect_vignette} as any)} style={{ width: 36, height: 20, borderRadius: 10, background: (theme as any).effect_vignette ? G : "rgba(255,255,255,0.15)", border: "none", cursor: "pointer", position: "relative", transition: "background 0.2s" }}>
                      <div style={{ width: 16, height: 16, borderRadius: "50%", background: "#fff", position: "absolute", top: 2, left: (theme as any).effect_vignette ? 18 : 2, transition: "left 0.2s" }} />
                    </button>
                  </div>
                  {(theme as any).effect_vignette && (
                    <div>
                      <label style={{ color: MUTED, fontSize: 10, display: "block", marginBottom: 4 }}>Intensité: {(theme as any).vignette_intensity||40}%</label>
                      <input type="range" min="5" max="100" value={(theme as any).vignette_intensity||40} onChange={e => onThemeChange({...theme, vignette_intensity: parseInt(e.target.value)} as any)} style={{ width: "100%", accentColor: G }} />
                    </div>
                  )}
                </div>

                {/* Overlay couleur */}
                <div style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 12, padding: "12px 14px" }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: (theme as any).effect_overlay ? 10 : 0 }}>
                    <label style={{ color: "#F5F0E8", fontSize: 12, fontWeight: 600 }}>🎨 Overlay</label>
                    <button onClick={() => onThemeChange({...theme, effect_overlay: !(theme as any).effect_overlay} as any)}
                      style={{ width: 36, height: 20, borderRadius: 10, background: (theme as any).effect_overlay ? G : "rgba(255,255,255,0.15)", border: "none", cursor: "pointer", position: "relative", transition: "background 0.2s" }}>
                      <div style={{ width: 16, height: 16, borderRadius: "50%", background: "#fff", position: "absolute", top: 2, left: (theme as any).effect_overlay ? 18 : 2, transition: "left 0.2s" }} />
                    </button>
                  </div>
                  {(theme as any).effect_overlay && (
                    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                      <div style={{ display: "flex", gap: 7, alignItems: "center" }}>
                        <input type="color" value={(theme as any).overlay_color||"#000000"}
                          onChange={e => onThemeChange({...theme, overlay_color: e.target.value} as any)}
                          style={{ width: 34, height: 32, border: "none", borderRadius: 6, cursor: "pointer", padding: 0 }} />
                        <span style={{ color: MUTED, fontSize: 11 }}>Couleur de l overlay</span>
                      </div>
                      <div>
                        <label style={{ color: MUTED, fontSize: 10, display: "block", marginBottom: 4 }}>Opacité: {(theme as any).overlay_opacity||30}%</label>
                        <input type="range" min="1" max="90" value={(theme as any).overlay_opacity||30}
                          onChange={e => onThemeChange({...theme, overlay_opacity: parseInt(e.target.value)} as any)}
                          style={{ width: "100%", accentColor: G }} />
                      </div>
                    </div>
                  )}
                </div>

                {/* Blur global */}
                <div style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 12, padding: "12px 14px" }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: (theme as any).effect_blur ? 10 : 0 }}>
                    <label style={{ color: "#F5F0E8", fontSize: 12, fontWeight: 600 }}>💧 Blur</label>
                    <button onClick={() => onThemeChange({...theme, effect_blur: !(theme as any).effect_blur} as any)}
                      style={{ width: 36, height: 20, borderRadius: 10, background: (theme as any).effect_blur ? G : "rgba(255,255,255,0.15)", border: "none", cursor: "pointer", position: "relative", transition: "background 0.2s" }}>
                      <div style={{ width: 16, height: 16, borderRadius: "50%", background: "#fff", position: "absolute", top: 2, left: (theme as any).effect_blur ? 18 : 2, transition: "left 0.2s" }} />
                    </button>
                  </div>
                  {(theme as any).effect_blur && (
                    <div>
                      <label style={{ color: MUTED, fontSize: 10, display: "block", marginBottom: 4 }}>Intensité: {(theme as any).blur_amount||4}px</label>
                      <input type="range" min="1" max="20" value={(theme as any).blur_amount||4}
                        onChange={e => onThemeChange({...theme, blur_amount: parseInt(e.target.value)} as any)}
                        style={{ width: "100%", accentColor: G }} />
                      <p style={{ color: MUTED, fontSize: 9, margin: "5px 0 0" }}>⚠ S applique au fond — les blocs restent nets</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* ANIMATION */}
            {bgSubTab==="animation" && (
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {/* Preview animation */}
                <div style={{ position: "relative", height: 80, borderRadius: 12, overflow: "hidden", border: "1px solid rgba(255,255,255,0.1)", marginBottom: 4 }}>
                  <div style={{
                    position: "absolute", inset: 0,
                    background: animation==="aurora"
                      ? `radial-gradient(ellipse at 20% 50%, ${theme.primary}40, transparent 50%), radial-gradient(ellipse at 80% 20%, ${theme.accent||"var(--success)"}30, transparent 50%), ${theme.bgGradient||theme.bg}`
                      : theme.bgGradient||theme.bg,
                    animation: animation==="gradient-flow" ? `gradientShift ${(theme as any).anim_speed||8}s ease infinite` : animation==="aurora" ? `auroraShift ${(theme as any).anim_speed||12}s ease infinite` : "none",
                    backgroundSize: "200% 200%",
                  }} />
                  <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <p style={{ color: "rgba(255,255,255,0.5)", fontSize: 10, margin: 0, letterSpacing: 2, textTransform: "uppercase" as const }}>
                      {animation==="none" ? "Statique" : animation==="gradient-flow" ? "🌊 Gradient Flow" : animation==="aurora" ? "🌌 Aurora" : animation}
                    </p>
                  </div>
                </div>
                <label style={{ color: MUTED, fontSize: 10, textTransform: "uppercase" as const, letterSpacing: 1.5 }}>Animation de fond</label>
                {[
                  { id: "none", label: "Statique", desc: "Aucune animation", icon: "⏸" },
                  { id: "gradient-flow", label: "Gradient Flow", desc: "Dégradé animé lent", icon: "🌊" },
                  { id: "aurora", label: "Aurora", desc: "Effet Stripe Aurora", icon: "🌌" },
                  { id: "pulse", label: "Pulse", desc: "Pulsation douce", icon: "💫", soon: true },
                  { id: "wave", label: "Wave", desc: "Vagues animées", icon: "〰", soon: true },
                ].map(({ id, label, desc, icon, soon }) => (
                  <button key={id} onClick={() => { if (!soon) { setAnimation(id); onThemeChange({...theme, bgAnimation: id} as any) } }}
                    style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 14px", background: animation===id ? G+"10" : "rgba(255,255,255,0.03)", border: `1.5px solid ${animation===id ? G+"40" : "rgba(255,255,255,0.07)"}`, borderRadius: 11, cursor: soon ? "not-allowed" : "pointer", opacity: soon ? 0.5 : 1 }}>
                    <span style={{ fontSize: 22, flexShrink: 0 }}>{icon}</span>
                    <div style={{ flex: 1, textAlign: "left" }}>
                      <p style={{ color: animation===id ? G : "#F5F0E8", fontSize: 12, fontWeight: 700, margin: "0 0 2px" }}>{label} {soon && <span style={{ color: MUTED, fontSize: 9, fontWeight: 400 }}>— Bientôt</span>}</p>
                      <p style={{ color: MUTED, fontSize: 10, margin: 0 }}>{desc}</p>
                    </div>
                    {animation===id && <Check size={13} color={G} style={{ flexShrink: 0 }} />}
                  </button>
                ))}
                {animation==="gradient-flow" && (
                  <div style={{ marginTop: 6 }}>
                    <label style={{ color: MUTED, fontSize: 10, display: "block", marginBottom: 4 }}>Vitesse: {(theme as any).anim_speed||8}s</label>
                    <input type="range" min="2" max="30" value={(theme as any).anim_speed||8} onChange={e => onThemeChange({...theme, anim_speed: parseInt(e.target.value)} as any)} style={{ width: "100%", accentColor: G }} />
                  </div>
                )}
                {animation==="aurora" && (
                  <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 6 }}>
                    <div>
                      <label style={{ color: MUTED, fontSize: 10, display: "block", marginBottom: 4 }}>Vitesse: {(theme as any).anim_speed||12}s</label>
                      <input type="range" min="4" max="40" value={(theme as any).anim_speed||12} onChange={e => onThemeChange({...theme, anim_speed: parseInt(e.target.value)} as any)} style={{ width: "100%", accentColor: G }} />
                    </div>
                    <div>
                      <label style={{ color: MUTED, fontSize: 10, display: "block", marginBottom: 4 }}>Intensité: {(theme as any).anim_intensity||60}%</label>
                      <input type="range" min="10" max="100" value={(theme as any).anim_intensity||60} onChange={e => onThemeChange({...theme, anim_intensity: parseInt(e.target.value)} as any)} style={{ width: "100%", accentColor: G }} />
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* AVANCÉ */}
            {bgSubTab==="advanced" && (
              <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                <div>
                  <label style={{ color: MUTED, fontSize: 10, display: "block", marginBottom: 6, textTransform: "uppercase" as const, letterSpacing: 1.5 }}>CSS personnalisé</label>
                  <textarea value={(theme as any).customCSS||""} onChange={e => onThemeChange({...theme, bgGradient: e.target.value, customCSS: e.target.value} as any)}
                    placeholder={"linear-gradient(135deg, #080808, #1a1a08)\n\n/* Ou tout CSS valide pour 'background' */"}
                    rows={5}
                    style={{ ...inputStyle, resize: "vertical" as const, lineHeight: 1.6 }} />
                </div>
                <div style={{ display: "flex", gap: 8 }}>
                  <button onClick={() => {
                    const style = { bg: theme.bg, bgGradient: theme.bgGradient, bgMode: (theme as any).bgMode, bgImage: (theme as any).bgImage }
                    navigator.clipboard.writeText(JSON.stringify(style, null, 2))
                    setCopiedStyle(true)
                    setTimeout(() => setCopiedStyle(false), 2000)
                  }} style={{ flex: 1, background: copiedStyle ? "var(--success)20" : "rgba(255,255,255,0.05)", border: `1px solid ${copiedStyle ? "var(--success)40" : "rgba(255,255,255,0.1)"}`, borderRadius: 9, padding: "10px", color: copiedStyle ? "var(--success)" : MUTED, fontSize: 11, fontWeight: 600, cursor: "pointer" }}>
                    {copiedStyle ? "✓ Copié !" : "📋 Copier le style"}
                  </button>
                  <button onClick={() => {
                    const input = prompt("Collez le JSON du style:")
                    if (input) {
                      try {
                        const parsed = JSON.parse(input)
                        onThemeChange({...theme, ...parsed} as any)
                      } catch { toast.error("JSON invalide") }
                    }
                  }} style={{ flex: 1, background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 9, padding: "10px", color: MUTED, fontSize: 11, fontWeight: 600, cursor: "pointer" }}>
                    📥 Importer
                  </button>
                </div>
                <button onClick={() => {
                  const exportData = {
                    background: { bg: theme.bg, bgGradient: theme.bgGradient, bgMode: (theme as any).bgMode, bgImage: (theme as any).bgImage },
                    effects: { noise: (theme as any).noise_opacity, glow: (theme as any).glow_color, vignette: (theme as any).vignette_intensity },
                    animation: { type: (theme as any).bgAnimation, speed: (theme as any).anim_speed }
                  }
                  const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: "application/json" })
                  const url = URL.createObjectURL(blob)
                  const a = document.createElement("a"); a.href = url; a.download = "qrfolio-style.json"; a.click()
                }} style={{ background: "rgba(201,168,76,0.08)", border: "1px solid rgba(201,168,76,0.2)", borderRadius: 9, padding: "10px", color: G, fontSize: 11, fontWeight: 600, cursor: "pointer" }}>
                  📤 Exporter le style complet
                </button>
                {/* Aperçu fond actuel */}
                <div>
                  <label style={{ color: MUTED, fontSize: 10, display: "block", marginBottom: 6 }}>Aperçu fond actuel</label>
                  <div style={{ height: 60, borderRadius: 10, background: theme.bgGradient || theme.bg, backgroundImage: (theme as any).bgMode==="pattern" ? getPatternCSS(patternType, (theme as any).pattern_color||G, (theme as any).pattern_size||20, (theme as any).pattern_opacity||0.15) : undefined, backgroundSize: (theme as any).bgMode==="pattern" ? `${(theme as any).pattern_size||20}px ${(theme as any).pattern_size||20}px` : undefined, border: "1px solid rgba(255,255,255,0.1)" }} />
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── ONGLET BLOCS (style global appliqué à tous les blocs) ── */}
        {themeTab==="blocks" && (() => {
          const bs = (theme.blockStyle || {}) as Record<string, any>
          const setBS = (key: string, val: any) => onThemeChange({ ...theme, blockStyle: { ...bs, [key]: val } } as any)
          const clearBS = () => { const t: any = { ...theme }; delete t.blockStyle; onThemeChange(t) }
          const rows = [
            { key: "__radius", label: "Coins arrondis", opts: BLOCK_RADIUS_OPTIONS, def: "Défaut" },
            { key: "__shadow", label: "Ombre", opts: BLOCK_SHADOW_OPTIONS, def: "Non" },
            { key: "__space",  label: "Espacement vertical", opts: BLOCK_SPACE_OPTIONS, def: "Défaut" },
          ]
          const hasStyle = Object.keys(bs).length > 0
          return (
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <p style={{ color: MUTED, fontSize: 11, margin: 0, lineHeight: 1.5 }}>
                Un style appliqué à <strong style={{ color: "#F5F0E8" }}>tous les blocs</strong> d&apos;un coup. Chaque bloc peut le surcharger dans son onglet <strong style={{ color: "#F5F0E8" }}>Style</strong>.
              </p>
              {rows.map(r => (
                <div key={r.key}>
                  <label style={{ color: MUTED, fontSize: 10, display: "block", marginBottom: 6, textTransform: "uppercase" as const, letterSpacing: 1.5 }}>{r.label}</label>
                  <Segmented value={String(bs[r.key] ?? r.def)} options={r.opts} onChange={v => setBS(r.key, v)} />
                </div>
              ))}
              {/* Avance masque par defaut : animation + effet verre (review #4 "options avancees trop tot") */}
              <button type="button" onClick={() => setThemeBlocksAdv(o => !o)}
                style={{ display: "flex", alignItems: "center", justifyContent: "space-between", width: "100%", background: "none", border: "none", cursor: "pointer", padding: "2px 0", color: MUTED, fontSize: 10, textTransform: "uppercase" as const, letterSpacing: 1.5, fontWeight: 700 }}>
                Avancé
                <ChevronDown size={14} style={{ transform: themeBlocksAdv ? "rotate(180deg)" : "none", transition: "transform .2s" }} />
              </button>
              {themeBlocksAdv && (<>
                <div>
                  <label style={{ color: MUTED, fontSize: 10, display: "block", marginBottom: 6, textTransform: "uppercase" as const, letterSpacing: 1.5 }}>Animation à l&apos;apparition</label>
                  <Segmented value={String(bs.__anim ?? "Aucune")} options={BLOCK_ANIM_OPTIONS} onChange={v => setBS("__anim", v)} />
                </div>
                <div>
                  <label style={{ color: MUTED, fontSize: 10, display: "block", marginBottom: 6, textTransform: "uppercase" as const, letterSpacing: 1.5 }}>Effet verre (flou)</label>
                  <Segmented value={bs.__glass ? "Oui" : "Non"} options={["Non", "Oui"]} onChange={v => setBS("__glass", v === "Oui")} />
                </div>
              </>)}
              {hasStyle && (
                <button onClick={clearBS}
                  style={{ marginTop: 2, background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 9, padding: "9px", color: MUTED, fontSize: 11, fontWeight: 600, cursor: "pointer" }}>
                  ↺ Réinitialiser le style des blocs
                </button>
              )}
              <p style={{ color: "#6E685E", fontSize: 9.5, margin: 0, lineHeight: 1.5 }}>
                Astuce : posez ici l&apos;ambiance générale (coins, ombre, animation), puis affinez au cas par cas dans chaque bloc.
              </p>
            </div>
          )
        })()}
      </div>
    )
  }



  export default function BuilderV4({ pageId }: { pageId?: string }) {
    const undoRedo = useUndoRedo([
      { id: "1", type: "profile", content: { name: "Mon Nom", tagline: "Mon activité" }, visible: true },
      { id: "2", type: "bio", content: { text: "Bienvenue sur ma page !" }, visible: true },
      { id: "3", type: "cta_button", content: { label: "Me contacter", url: "#", style: "gold" }, visible: true },
    ])
    const [blocks, setBlocksRaw] = useState<Block[]>([
      { id: "1", type: "profile", content: { name: "Mon Nom", tagline: "Mon activité" }, visible: true },
      { id: "2", type: "bio", content: { text: "Bienvenue sur ma page !" }, visible: true },
      { id: "3", type: "cta_button", content: { label: "Me contacter", url: "#", style: "gold" }, visible: true },
    ])

    // setBlocks avec push historique automatique
    const setBlocks = useCallback((updater: Block[] | ((prev: Block[]) => Block[]), skipHistory = false) => {
      setBlocksRaw(prev => {
        const next = typeof updater === "function" ? updater(prev) : updater
        if (!skipHistory) undoRedo.push(next)
        return next
      })
    }, [undoRedo])
    const [selectedId, setSelectedId] = useState<string | null>(null)
    const [multiSelection, setMultiSelection] = useState<string[]>([])
    // Refs synchronisées : lecture fraîche de la sélection / des blocs depuis le
    // handler clavier global (deps []), sans re-souscrire l'écouteur à chaque frappe.
    const blocksKbRef = useRef(blocks)
    const selectedIdKbRef = useRef(selectedId)
    useEffect(() => { blocksKbRef.current = blocks }, [blocks])
    useEffect(() => { selectedIdKbRef.current = selectedId }, [selectedId])
    const [pageName, setPageName] = useState("Ma Page")
    const [pageSlug, setPageSlug] = useState("ma-page")
    const [pageStatus, setPageStatus] = useState("draft")
    const [theme, setTheme] = useState<PageTheme>(PRESET_THEMES.midnight_gold)
    const [rightTab, setRightTab] = useState<"preview"|"edit"|"theme">("preview")
    const [editTab, setEditTab] = useState<"contenu"|"style"|"layout"|"avance">("contenu")
    // Mode Simple (defaut) = un seul contexte "Contenu" (audit #10/#14 "montrer moins"). Expert = 4 onglets.
    // Defaut false = ce que rend le SSR ; on lit localStorage APRES montage (pas de mismatch d'hydratation),
    // et on persiste DANS le setter (pas dans un effet -> pas d'ecrasement au montage). Cf review #2.
    const [expertMode, setExpertModeRaw] = useState(false)
    useEffect(() => { try { if (localStorage.getItem("qrfolio_expert_mode") === "1") setExpertModeRaw(true) } catch {} }, [])
    const setExpertMode = (v: boolean | ((p: boolean) => boolean)) => setExpertModeRaw(prev => {
      const next = typeof v === "function" ? v(prev) : v
      try { localStorage.setItem("qrfolio_expert_mode", next ? "1" : "0") } catch {}
      return next
    })
    // Modeles par metier : menu deplie a la demande (replie par defaut) pour alleger la palette.
    const [metierOpen, setMetierOpen] = useState(false)
    const [styleClipboard, setStyleClipboard] = useState<Record<string, string> | null>(null)
    const [showTemplates, setShowTemplates] = useState(false)
    const [templateGroup, setTemplateGroup] = useState<string>(PAGE_TEMPLATE_GROUPS[0])
    const [aiGenPrompt, setAiGenPrompt] = useState("")
    const [aiGenLoading, setAiGenLoading] = useState(false)
    const [aiGenError, setAiGenError] = useState<string | null>(null)
    const [aiGenSoon, setAiGenSoon] = useState(false) // true = IA pas encore activee (ton info, pas erreur)

    async function generateWithAI() {
      const description = aiGenPrompt.trim()
      if (description.length < 5) { setAiGenError("Décrivez votre activité en quelques mots."); return }
      setAiGenLoading(true); setAiGenError(null); setAiGenSoon(false)
      try {
        const res = await fetch("/api/generate-page", {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ description }),
        })
        const data = await res.json().catch(() => ({}))
        if (!res.ok) { setAiGenSoon(!!data?.soon); setAiGenError(data?.error || "La génération a échoué."); return }
        if (!data?.template?.blocks?.length) { setAiGenError("Aucun contenu généré. Réessayez."); return }
        applyPageTemplate(data.template as PageTemplate) // applique + ferme la modale
      } catch {
        setAiGenError("Connexion impossible. Réessayez.")
      } finally {
        setAiGenLoading(false)
      }
    }
    const [activeCategory, setActiveCategory] = useState("identity")
    const [search, setSearch] = useState("")
    const [dayMode, setDayMode] = useState(false)
    const [saving, setSaving] = useState(false)
    const [saved, setSaved] = useState(false)
    const [saveError, setSaveError] = useState(false)
    const [saveErrorMsg, setSaveErrorMsg] = useState("")
    const [hasUnsaved, setHasUnsaved] = useState(false)
    // ID reel de la page en base. Si l'URL est /builder/new (pageId non-UUID),
    // on cree d'abord la page puis on bascule sur son vrai UUID.
    const [liveId, setLiveId] = useState<string | undefined>(() => (IS_UUID(pageId) ? pageId : undefined))
    const [bootstrapError, setBootstrapError] = useState("")
    const creatingRef = useRef(false)
    const [showPublishPopup, setShowPublishPopup] = useState(false)
    const [publishing, setPublishing] = useState(false)
    const [publishSuccess, setPublishSuccess] = useState(false)
    const [publishError, setPublishError] = useState("")
    const [qrShortCode, setQrShortCode] = useState("")
    // Cible du QR (lien de scan) + telechargement PNG genere en local (sans API externe).
    const qrTarget = qrShortCode ? `${typeof window !== "undefined" ? window.location.origin : ""}/q/${qrShortCode}` : ""
    const downloadQrPng = async () => {
      if (!qrTarget) return
      const b = await getQRBlob({ data: qrTarget, fg: "#080808", bg: "#FFFFFF", ecc: "M", style: {}, size: 512 }, "png")
      if (b) downloadBlob(b, "qrcode.png")
    }
    const [showQrPanel, setShowQrPanel] = useState(false)
    const [pageStats, setPageStats] = useState({ views: 0, scans: 0 })
    const [clickCounts, setClickCounts] = useState<Record<string, number>>({}) // clics par bloc (90j) pour le compteur builder
    const [messages, setMessages] = useState<Message[]>([{ role: "assistant", content: "Salut ! 👋 Décris ton activité et je construis ta page." }])
    const [aiInput, setAiInput] = useState("")
    const [aiLoading, setAiLoading] = useState(false)
    const messagesEnd = useRef<HTMLDivElement>(null)
    const saveTimeout = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
    // Vrai s'il reste des modifications non encore sauvegardees (evite la perte de donnees
    // si l'onglet est ferme/recharge pendant le debounce de sauvegarde).
    const dirty = useRef(false)
    // Vrai seulement une fois la page CHARGEE (existante) ou CREEE (nouvelle). Empeche la
    // sauvegarde de partir avec les blocs de demo par defaut avant que load() n'ait ramene
    // les vrais blocs -> sinon, sur connexion lente, on ecraserait le contenu reel.
    const ready = useRef(false)

    // ── États collapse panneaux ────────────────────────────────────────────────
    const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
      if (typeof window !== "undefined") return localStorage.getItem("qrfolio_sidebar_collapsed") === "true"
      return false
    })
    const [blocksCollapsed, setBlocksCollapsed] = useState(() => {
      if (typeof window !== "undefined") return localStorage.getItem("qrfolio_blocks_collapsed") === "true"
      return false
    })
    const [rightCollapsed, setRightCollapsed] = useState(false)
    const [focusMode, setFocusMode] = useState(false)
    const [drawerCategory, setDrawerCategory] = useState<string|null>(null)
    const drawerRef = useRef<HTMLDivElement>(null)

    // Persister collapse sidebar
    useEffect(() => {
      if (typeof window !== "undefined") localStorage.setItem("qrfolio_sidebar_collapsed", String(sidebarCollapsed))
    }, [sidebarCollapsed])

    useEffect(() => {
      if (typeof window !== "undefined") localStorage.setItem("qrfolio_blocks_collapsed", String(blocksCollapsed))
    }, [blocksCollapsed])

    // ── Raccourcis clavier ────────────────────────────────────────────────────
    useEffect(() => {
      const isEditing = (e: KeyboardEvent) =>
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement ||
        e.target instanceof HTMLSelectElement ||
        (e.target as HTMLElement)?.isContentEditable

      const handler = (e: KeyboardEvent) => {
        const ctrl = e.ctrlKey || e.metaKey // Ctrl Windows / Cmd Mac

        // Ctrl+Z — Undo
        if (ctrl && !e.shiftKey && (e.key === "z" || e.key === "Z") && !isEditing(e)) {
          e.preventDefault()
          const prev = undoRedo.undo()
          if (prev) setBlocksRaw(prev)
          return
        }
        // Ctrl+Shift+Z / Ctrl+Y — Redo
        if (ctrl && (e.shiftKey && (e.key === "z" || e.key === "Z") || e.key === "y" || e.key === "Y") && !isEditing(e)) {
          e.preventDefault()
          const next = undoRedo.redo()
          if (next) setBlocksRaw(next)
          return
        }

        // Ctrl+B — Bibliothèque de blocs
        if (ctrl && (e.key === "b" || e.key === "B") && !isEditing(e)) {
          e.preventDefault()
          setBlocksCollapsed(p => !p)
          setFocusMode(false)
          return
        }
        // Ctrl+E — Éditeur (panel droit)
        if (ctrl && (e.key === "e" || e.key === "E") && !isEditing(e)) {
          e.preventDefault()
          setRightCollapsed(p => !p)
          setFocusMode(false)
          return
        }
        // Ctrl+P — Preview (switch onglet)
        if (ctrl && (e.key === "p" || e.key === "P") && !isEditing(e)) {
          e.preventDefault()
          setRightCollapsed(false)
          setRightTab("preview")
          return
        }
        // Ctrl+F — Mode Focus
        if (ctrl && (e.key === "f" || e.key === "F") && !isEditing(e)) {
          e.preventDefault()
          setFocusMode(prev => {
            const next = !prev
            setSidebarCollapsed(next)
            setBlocksCollapsed(next)
            setRightCollapsed(next)
            return next
          })
          return
        }
        // Escape — désélectionner tout
        if (e.key === "Escape" && !isEditing(e)) {
          setMultiSelection([])
          setSelectedId(null)
          return
        }
        // Ctrl+A — sélectionner tous les blocs
        if (ctrl && (e.key === "a" || e.key === "A") && !isEditing(e)) {
          e.preventDefault()
          setMultiSelection(blocks.map(b => b.id))
          return
        }
        // Delete/Backspace — supprimer la sélection multiple
        if ((e.key === "Delete" || e.key === "Backspace") && multiSelection.length > 0 && !isEditing(e)) {
          e.preventDefault()
          deleteMulti()
          return
        }
        // Flèches ↑/↓ — a11y clavier du canvas. Uniquement quand un bloc est déjà
        // sélectionné (sinon on laisse le défilement natif). Flèche seule = déplacer
        // la sélection ; Alt+flèche = déplacer le bloc (réordonnancement).
        if ((e.key === "ArrowUp" || e.key === "ArrowDown") && !ctrl && !e.shiftKey && !isEditing(e)) {
          const cur = selectedIdKbRef.current
          if (!cur) return
          const bs = blocksKbRef.current
          if (bs.length === 0) return
          const dir = e.key === "ArrowDown" ? 1 : -1
          e.preventDefault()
          if (e.altKey) {
            // Déplacer le bloc sélectionné (setBlocks fonctionnel = état frais).
            setBlocks(p => {
              const idx = p.findIndex(b => b.id === cur)
              if (idx < 0 || p[idx]?.locked) return p
              const ni = idx + dir
              if (ni < 0 || ni >= p.length) return p
              const n = [...p]; [n[idx], n[ni]] = [n[ni], n[idx]]; return n
            })
          } else {
            // Déplacer la sélection au bloc voisin.
            const idx = bs.findIndex(b => b.id === cur)
            const ni = Math.max(0, Math.min(bs.length - 1, idx + dir))
            if (ni !== idx) { setMultiSelection([]); setSelectedId(bs[ni].id) }
          }
          return
        }
        // F seul — Mode Focus (fallback sans modificateur)
        if (!ctrl && !e.shiftKey && !e.altKey && (e.key === "f" || e.key === "F") && !isEditing(e)) {
          setFocusMode(prev => {
            const next = !prev
            setSidebarCollapsed(next)
            setBlocksCollapsed(next)
            setRightCollapsed(next)
            return next
          })
        }
      }
      window.addEventListener("keydown", handler)
      return () => window.removeEventListener("keydown", handler)
    }, [])

    // Fermer drawer au clic extérieur
    useEffect(() => {
      const handler = (e: MouseEvent) => {
        if (drawerRef.current && !drawerRef.current.contains(e.target as Node)) setDrawerCategory(null)
      }
      if (drawerCategory) document.addEventListener("mousedown", handler)
      return () => document.removeEventListener("mousedown", handler)
    }, [drawerCategory])

    function toggleSidebar() { setSidebarCollapsed(p => !p); setFocusMode(false) }
    function toggleBlocks() { setBlocksCollapsed(p => !p); setFocusMode(false) }
    function toggleRight() { setRightCollapsed(p => !p); setFocusMode(false) }

    // ── Resize panneaux ────────────────────────────────────────────────────
    const blocksResize = useResize("blocks", 300, 240, 520)
    const rightResize = useResize("right", 340, 280, 520)
    // Responsive : sous 1024px, les 3 colonnes (palette | page | réglages) ne tiennent plus côte à côte.
    // On bascule en mode « un panneau à la fois » piloté par une barre d'onglets en bas.
    const isMobile = useIsMobile(1024)
    const [mobileTab, setMobileTab] = useState<"blocks"|"canvas"|"panel">("canvas")
    const [blockMenu, setBlockMenu] = useState<string | null>(null) // #10 : actions secondaires d'un bloc en bottom sheet
    const [scoreOpen, setScoreOpen] = useState(false) // #16 : score de profil replie en pastille par defaut
    const [blockSearchFocus, setBlockSearchFocus] = useState(false) // #13 : recherche de bloc focus -> on masque la barre du bas pour degager les resultats
    const [preview, setPreview] = useState(false) // #02 : mode Apercu plein ecran (masque tout le chrome d'edition)
    const enterPreview = () => { setPreview(true); setMobileTab("canvas"); setSelectedId(null) }
    // En mobile, les panneaux occupent 100% : on force l'état déplié (le mode réduit à icônes n'a plus de sens).
    useEffect(() => { if (isMobile) { setBlocksCollapsed(false); setRightCollapsed(false) } }, [isMobile])

    // ── Favoris ───────────────────────────────────────────────────────────────
    // ── Popover aperçu bloc ─────────────────────────────────────────────────
    const [popover, setPopover] = useState<{ type: string; x: number; y: number } | null>(null)
    const popoverTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)

    const showPopover = useCallback((type: string, e: React.MouseEvent) => {
      clearTimeout(popoverTimer.current)
      const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
      popoverTimer.current = setTimeout(() => {
        setPopover({ type, x: rect.right + 8, y: rect.top })
      }, 300)
    }, [])

    const hidePopover = useCallback(() => {
      clearTimeout(popoverTimer.current)
      setPopover(null)
    }, [])

    const [favorites, setFavorites] = useState<string[]>(() => {
      if (typeof window !== "undefined") {
        try { return JSON.parse(localStorage.getItem("qrfolio_fav_blocks") || "[]") } catch { return [] }
      }
      return []
    })

    const toggleFav = useCallback((type: string) => {
      setFavorites(prev => {
        const next = prev.includes(type) ? prev.filter(t => t !== type) : [...prev, type]
        localStorage.setItem("qrfolio_fav_blocks", JSON.stringify(next))
        return next
      })
    }, [])

    const isFav = useCallback((type: string) => favorites.includes(type), [favorites])

    // ── Blocs récents ─────────────────────────────────────────────────────────
    const [recentBlocks, setRecentBlocks] = useState<string[]>(() => {
      if (typeof window !== "undefined") {
        try { return JSON.parse(localStorage.getItem("qrfolio_recent_blocks") || "[]") } catch { return [] }
      }
      return []
    })

    const pushRecent = useCallback((type: string) => {
      setRecentBlocks(prev => {
        const next = [type, ...prev.filter(t => t !== type)].slice(0, 8)
        localStorage.setItem("qrfolio_recent_blocks", JSON.stringify(next))
        return next
      })
    }, [])

    // ── Catégories repliées ───────────────────────────────────────────────────
    const [collapsedCats, setCollapsedCats] = useState<string[]>(() => {
      if (typeof window !== "undefined") {
        try { return JSON.parse(localStorage.getItem("qrfolio_collapsed_cats") || "[]") } catch { return [] }
      }
      return []
    })

    const toggleCat = useCallback((catId: string) => {
      setCollapsedCats(prev => {
        const next = prev.includes(catId) ? prev.filter(c => c !== catId) : [...prev, catId]
        localStorage.setItem("qrfolio_collapsed_cats", JSON.stringify(next))
        return next
      })
    }, [])

    const isCatCollapsed = useCallback((catId: string) => collapsedCats.includes(catId), [collapsedCats])
    function toggleFocus() {
      setFocusMode(p => {
        const next = !p
        setSidebarCollapsed(next); setBlocksCollapsed(next); setRightCollapsed(next)
        return next
      })
    }

    useEffect(() => { messagesEnd.current?.scrollIntoView({ behavior: "smooth" }) }, [messages])

    useEffect(() => {
      // Ne charge que les polices CUSTOM (Fraunces / DM Sans deja chargees par le
      // layout) et donne a CHAQUE famille son axe de poids (sinon tout l apercu en faux-gras).
      const DEFAULTS = new Set(["Fraunces", "DM Sans"])
      const custom = [...new Set(
        [theme.fontDisplay, theme.fontBody].filter(Boolean).map(f => f.replace(/,.*/, "").trim()).filter(f => f && !DEFAULTS.has(f))
      )]
      if (!custom.length) return
      const families = custom.map(f => `family=${f.replace(/ /g, "+")}:wght@400;600;700`).join("&")
      const href = `https://fonts.googleapis.com/css2?${families}&display=swap`
      if (document.querySelector(`link[data-qf-font][href="${href}"]`)) return
      const link = document.createElement("link"); link.rel = "stylesheet"; link.href = href
      link.setAttribute("data-qf-font", "1")
      document.head.appendChild(link)
    }, [theme.fontDisplay, theme.fontBody])

    // Bootstrap : URL /builder/new (ou tout pageId non-UUID) -> on cree la page en base,
    // on recupere son vrai UUID, on met a jour l'URL sans rechargement, puis liveId prend le relais.
    useEffect(() => {
      if (!pageId || IS_UUID(pageId)) return
      if (creatingRef.current) return
      creatingRef.current = true
      ;(async () => {
        try {
          const res = await fetch("/api/pages/create", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ title: pageName }) })
          const json = await res.json().catch(() => ({}))
          if (!res.ok || !json?.pageId) { setBootstrapError(json?.message || json?.error || "Impossible de creer la page."); return }
          // Normalise les IDs de blocs par defaut (\"1\"/\"2\"/\"3\") en UUID -> chemin upsert propre.
          setBlocksRaw(prev => prev.map(b => IS_UUID(b.id) ? b : { ...b, id: genId() }))
          // Page neuve creee : la sauvegarde peut persister les blocs initiaux.
          ready.current = true
          setLiveId(json.pageId)
          if (json.slug) setPageSlug(json.slug)
          try { window.history.replaceState(null, "", "/dashboard/builder/" + json.pageId) } catch {}
        } catch (e: any) {
          setBootstrapError(e?.message || "Impossible de creer la page.")
        }
      })()
    }, [pageId])

    useEffect(() => {
      if (!IS_UUID(liveId)) return
      const supabase = createClient()
      async function load() {
        const { data: pg } = await supabase.from("pages").select("title,slug,status,theme,total_views").eq("id", liveId).single()
        if (pg) { setPageName(pg.title); setPageSlug(pg.slug); setPageStatus(pg.status||"draft"); if (pg.theme) setTheme(pg.theme as PageTheme); setPageStats(s => ({ ...s, views: pg.total_views||0 })) }
        const { data: blks } = await supabase.from("blocks").select("*").eq("page_id", liveId).order("position")
        if (blks?.length) {
            const loaded = blks.map(b => { const c = b.content || {}; return { id: b.id, type: b.type, content: c, visible: c.__visible !== undefined ? c.__visible !== false : (b.is_visible !== false), draft: c.__draft || false, locked: c.__locked || false } })
            setBlocksRaw(loaded)
            undoRedo.push(loaded)
          }
        const { data: qr } = await supabase.from("qr_codes").select("short_code,total_scans").eq("page_id", liveId).single()
        if (qr) {
          setQrShortCode(qr.short_code||"")
          setPageStats(s => ({ ...s, scans: qr.total_scans||0 }))
        }
        // Compteur de clics par bloc (90 derniers jours) — lecture proprio via RLS
        const since = new Date(); since.setDate(since.getDate() - 90)
        const { data: clk } = await supabase.from("block_clicks").select("block_id").eq("page_id", liveId).gte("clicked_at", since.toISOString())
        if (clk?.length) {
          const counts: Record<string, number> = {}
          for (const r of clk as any[]) { if (r.block_id) counts[r.block_id] = (counts[r.block_id] || 0) + 1 }
          setClickCounts(counts)
        }
        // Page chargee : la sauvegarde peut desormais s'activer sans risque d'ecraser.
        ready.current = true
      }
      load()
    }, [liveId])

    // Avertit avant de fermer/recharger l'onglet s'il reste des changements non sauvegardes.
    useEffect(() => {
      const handler = (e: BeforeUnloadEvent) => { if (dirty.current) { e.preventDefault(); e.returnValue = "" } }
      window.addEventListener("beforeunload", handler)
      return () => window.removeEventListener("beforeunload", handler)
    }, [])

    // Sauvegarde effective (partagée par le debounce ET le bouton « Enregistrer maintenant »).
    const doSave = useCallback(async () => {
      if (!IS_UUID(liveId) || !ready.current) return
      setSaving(true); setSaveError(false)
      try {
        const supabase = createClient()
        await supabase.from("pages").update({ title: pageName, theme }).eq("id", liveId)
        const allUuid = blocks.every(b => UUID_RE.test(b.id))
        if (allUuid) {
          // Sauvegarde qui CONSERVE les IDs : upsert D'ABORD (le contenu est toujours enregistré),
          // PUIS suppression des blocs retirés via une liste d'IDs explicite (fiable).
          // La table `blocks` n'a que : id, page_id, type, position, is_visible, content, styles.
          // draft/locked/visible n'ont PAS de colonne -> persistes dans content (cles reservees __).
          const rows = blocks.map((b, i) => ({ id: b.id, page_id: liveId, type: b.type, position: i, content: { ...b.content, __draft: b.draft || false, __locked: b.locked || false, __visible: b.visible !== false }, is_visible: b.visible && !b.draft, styles: {} }))
          const keep = new Set(blocks.map(b => b.id))
          if (rows.length) { const { error } = await supabase.from("blocks").upsert(rows, { onConflict: "id" }); if (error) throw error }
          const { data: existing } = await supabase.from("blocks").select("id").eq("page_id", liveId)
          const toDelete = (existing || []).map((r: any) => r.id).filter((id: string) => !keep.has(id))
          if (toDelete.length) await supabase.from("blocks").delete().in("id", toDelete)
          else if (!rows.length) await supabase.from("blocks").delete().eq("page_id", liveId)
        } else {
          // Repli (IDs legacy non-UUID) : delete-all + insert. Les IDs deviennent UUID au prochain chargement.
          await supabase.from("blocks").delete().eq("page_id", liveId)
          if (blocks.length > 0) { const { error } = await supabase.from("blocks").insert(blocks.map((b, i) => ({ page_id: liveId, type: b.type, position: i, content: { ...b.content, __draft: b.draft || false, __locked: b.locked || false, __visible: b.visible !== false }, is_visible: b.visible && !b.draft, styles: {} }))); if (error) throw error }
        }
        dirty.current = false; setHasUnsaved(false); setSaving(false); setSaved(true); setTimeout(() => setSaved(false), 2000)
      } catch (e: any) {
        console.error("[QRowg] Échec de sauvegarde des blocs :", e)
        setSaveErrorMsg(e?.message || e?.hint || "Erreur inconnue")
        setSaving(false); setSaveError(true)
      }
    }, [blocks, pageName, theme, liveId])

    useEffect(() => {
      // ready.current : garde anti-ecrasement — on ne sauvegarde pas tant que la page n'est
      // pas chargee (existante) ou creee (nouvelle), pour ne jamais persister les blocs de demo.
      if (!IS_UUID(liveId) || !ready.current) return
      dirty.current = true; setHasUnsaved(true); setSaved(false)
      clearTimeout(saveTimeout.current)
      saveTimeout.current = setTimeout(() => { doSave() }, 800)
    }, [blocks, pageName, theme, liveId, doSave])

    // Déclenchement manuel immédiat (bouton « Enregistrer maintenant »).
    function saveNow() { clearTimeout(saveTimeout.current); doSave() }

    async function handlePublish() {
      if (!IS_UUID(liveId)) return
      setPublishing(true)
      setPublishError("")
      try {
        const { error } = await createClient()
          .from("pages")
          .update({ status: "published", published_at: new Date().toISOString() })
          .eq("id", liveId)
        if (error) throw error
        setPageStatus("published")
        setPublishSuccess(true)
        setTimeout(() => setPublishSuccess(false), 3500)
      } catch (err: any) {
        setPublishError(err?.message || "Erreur lors de la publication.")
      } finally {
        setPublishing(false)
      }
    }

    // ID de bloc = UUID valide (colonne uuid en base) -> IDs stables entre sauvegardes,
    // ce qui préserve l'historique de clics (block_clicks.block_id) au lieu de le perdre à chaque publication.
    function genId(): string {
      try { if (typeof crypto !== "undefined" && (crypto as any).randomUUID) return (crypto as any).randomUUID() } catch {}
      return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, ch => { const r = Math.floor(Math.random() * 16); const v = ch === "x" ? r : (r & 0x3 | 0x8); return v.toString(16) })
    }
    const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

    function addBlock(type: string, content?: BlockContent) {
      const def = BLOCK_DEFS[type]; if (!def) return
      const id = genId()
      setBlocks(p => [...p, { id, type, content: content||{...def.defaultContent}, visible: true }])
      setSelectedId(id); setRightTab("edit")
      if (isMobile) setMobileTab("panel")   // mobile : on ouvre direct l'éditeur du bloc ajouté
      pushRecent(type)
    }

    // Applique un MODÈLE DE PAGE complet : thème cohérent + jeu de blocs prêt à personnaliser.
    // Remplace les blocs (réversible via Ctrl+Z / undo). Confirme si la page a déjà du contenu.
    function applyPageTemplate(tpl: PageTemplate) {
      const nonEmpty = blocks.filter(b => !(b.type === "profile" && !(b.content?.name))).length
      if (blocks.length > 1 || nonEmpty > 0) {
        if (!window.confirm(`Appliquer le modèle « ${tpl.label} » ?\n\nLes blocs actuels seront remplacés et le thème mis à jour. Réversible avec Annuler (Ctrl+Z).`)) return
      }
      setTheme(prev => ({ ...prev, ...tpl.theme }))
      const next = tpl.blocks.map(b => ({ id: genId(), type: b.type, content: { ...(BLOCK_DEFS[b.type]?.defaultContent || {}), ...b.content }, visible: true }))
      setBlocks(next)
      setSelectedId(null); setRightTab("preview"); setShowTemplates(false)
      if (isMobile) setMobileTab("canvas")   // mobile : on montre la page fraîchement générée
    }

    // Génère une identité de base (curated, sans IA) : profil + bio + compétences + disponibilité
    function generateBaseIdentity() {
      const mk = (type: string, ov: Record<string, string>) => ({ ...(BLOCK_DEFS[type]?.defaultContent || {}), ...ov })
      if (!blocks.some(b => b.type === "profile")) addBlock("profile", mk("profile", { name: "Votre nom", tagline: "Consultant freelance", badge: "Disponible" }))
      addBlock("bio", mk("bio", { text: "Je vous accompagne dans vos projets avec expertise et proximité. Écrivez-moi pour en discuter.", align: "center" }))
      addBlock("skills", mk("skills", { title: "Mes compétences", tags: "Conseil, Accompagnement, Stratégie" }))
      addBlock("availability", mk("availability", { message: "Ouvert aux nouvelles missions" }))
    }

    function generateIdentityPreset(preset: typeof IDENTITY_PRESETS[number]) {
      const mk = (type: string, ov: Record<string, string>) => ({ ...(BLOCK_DEFS[type]?.defaultContent || {}), ...ov })
      const hasProfile = blocks.some(b => b.type === "profile")
      preset.blocks.forEach(b => {
        if (b.type === "profile" && hasProfile) return // ne recrée pas un profil existant
        addBlock(b.type, mk(b.type, b.content))
      })
    }

    function generateActionPreset(preset: typeof ACTION_PRESETS[number]) {
      const mk = (type: string, ov: Record<string, string>) => ({ ...(BLOCK_DEFS[type]?.defaultContent || {}), ...ov })
      preset.blocks.forEach(b => addBlock(b.type, mk(b.type, b.content)))
    }

    function generateSocialPreset(preset: typeof SOCIAL_PRESETS[number]) {
      const content: Record<string, string> = {}
      preset.networks.forEach(k => { content[k] = SOCIAL_URL_TEMPLATES[k] || "https://" })
      addBlock("social_links", content)
    }

    function generateCommercePreset(preset: typeof COMMERCE_PRESETS[number]) {
      const mk = (type: string, ov: Record<string, string>) => ({ ...(BLOCK_DEFS[type]?.defaultContent || {}), ...ov })
      preset.blocks.forEach(b => addBlock(b.type, mk(b.type, b.content)))
    }

    function generateMediaPreset(preset: typeof MEDIA_PRESETS[number]) {
      const mk = (type: string, ov: Record<string, string>) => ({ ...(BLOCK_DEFS[type]?.defaultContent || {}), ...ov })
      preset.blocks.forEach(b => addBlock(b.type, mk(b.type, b.content)))
    }

    function generateInfoPreset(preset: typeof INFO_PRESETS[number]) {
      const mk = (type: string, ov: Record<string, string>) => ({ ...(BLOCK_DEFS[type]?.defaultContent || {}), ...ov })
      preset.blocks.forEach(b => addBlock(b.type, mk(b.type, b.content)))
    }

    function deleteBlock(id: string) {
      if (blocks.find(b => b.id === id)?.locked) return
      setBlocks(p => p.filter(b => b.id !== id))
      if (selectedId === id) { setSelectedId(null); setRightTab("preview") }
    }

    function resetBlock(id: string) {
      const block = blocks.find(b => b.id === id); if (!block || block.locked) return
      const def = BLOCK_DEFS[block.type]
      setBlocks(p => p.map(b => b.id === id ? { ...b, content: { ...(def?.defaultContent || {}) } } : b))
    }

    function duplicateBlock(id: string) {
      const block = blocks.find(b => b.id === id); if (!block) return
      const newId = genId()
      const idx = blocks.findIndex(b => b.id === id)
      setBlocks(p => [...p.slice(0, idx+1), { ...block, id: newId, content: {...block.content} }, ...p.slice(idx+1)])
      setSelectedId(newId)
    }

    function toggleVisible(id: string) { setBlocks(p => p.map(b => b.id===id ? {...b, visible: !b.visible} : b)) }
    function toggleDraft(id: string) { setBlocks(p => p.map(b => b.id===id ? {...b, draft: !b.draft} : b)) }
    function toggleLock(id: string) { setBlocks(p => p.map(b => b.id===id ? {...b, locked: !b.locked} : b)) }

    // ── Sélection multiple ────────────────────────────────────────────────────
    function handleBlockClick(e: React.MouseEvent, blockId: string, blockIdx: number) {
      if (preview) return // #02 : en mode Apercu, aucun clic d'edition
      if (e.ctrlKey || e.metaKey) {
        // Ctrl/Cmd+clic : toggle dans la sélection multiple
        e.preventDefault()
        setMultiSelection(prev =>
          prev.includes(blockId) ? prev.filter(id => id !== blockId) : [...prev, blockId]
        )
        if (multiSelection.length === 0) setSelectedId(blockId)
      } else if (e.shiftKey && selectedId) {
        // Shift+clic : sélectionner une plage
        e.preventDefault()
        const selectedIdx = blocks.findIndex(b => b.id === selectedId)
        const min = Math.min(selectedIdx, blockIdx)
        const max = Math.max(selectedIdx, blockIdx)
        setMultiSelection(blocks.slice(min, max + 1).map(b => b.id))
      } else {
        // Clic simple
        setMultiSelection([])
        setSelectedId(blockId)
        setRightTab("edit")
      }
    }

    function deleteMulti() {
      const ids = multiSelection.length > 0 ? multiSelection : []
      if (ids.length === 0) return
      setBlocks(p => p.filter(b => !ids.includes(b.id) || b.locked))
      setMultiSelection([])
      setSelectedId(null)
    }

    function duplicateMulti() {
      const ids = multiSelection
      if (ids.length === 0) return
      setBlocks(p => {
        const result = [...p]
        const newIds: string[] = []
        // Insérer les clones après le dernier bloc sélectionné
        const lastIdx = Math.max(...ids.map(id => result.findIndex(b => b.id === id)))
        const clones = ids.map(id => {
          const orig = result.find(b => b.id === id)!
          const newId = genId()
          newIds.push(newId)
          return { ...orig, id: newId, content: { ...orig.content } }
        })
        result.splice(lastIdx + 1, 0, ...clones)
        return result
      })
      setMultiSelection([])
    }

    function toggleVisibleMulti() {
      const ids = multiSelection
      if (ids.length === 0) return
      // Si tous visibles → masquer tous, sinon → afficher tous
      const allVisible = ids.every(id => blocks.find(b => b.id === id)?.visible)
      setBlocks(p => p.map(b => ids.includes(b.id) ? { ...b, visible: !allVisible } : b))
    }

    function moveBlock(id: string, dir: number) {
      const block = blocks.find(b => b.id === id)
      if (block?.locked) return // Bloc verrouillé — déplacement interdit
      const idx = blocks.findIndex(b => b.id === id)
      const ni = idx + dir; if (ni < 0 || ni >= blocks.length) return
      setBlocks(p => { const n = [...p]; [n[idx], n[ni]] = [n[ni], n[idx]]; return n })
    }

    // ── FIX CRITIQUE: updateBlock immédiat + EditPanel key ────────────────────
    function updateBlock(id: string, key: string, value: string) {
      setBlocks(prev => prev.map(b => b.id === id ? { ...b, content: { ...b.content, [key]: value } } : b))
    }

    async function sendAI(prompt?: string) {
      const msg = (prompt || aiInput).trim(); if (!msg || aiLoading) return
      setAiInput("")
      setMessages(p => [...p, { role: "user", content: msg }])
      setAiLoading(true)
      try {
        const res = await fetch("/api/ai", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ messages: [...messages, { role: "user", content: msg }] }) })
        const data = await res.json()
        const reply = data.content?.[0]?.text || "Erreur."
        let added = 0
        reply.split("\n").forEach((line: string) => {
          if (line.startsWith("ADD_BLOCK:")) { try { const j = JSON.parse(line.replace("ADD_BLOCK:","").trim()); addBlock(j.type, j.content); added++ } catch {} }
        })
        const clean = reply.split("\n").filter((l: string) => !l.startsWith("ADD_BLOCK:")).join("\n").trim()
        setMessages(p => [...p, { role: "assistant", content: clean + (added>0 ? `\n\n✅ ${added} bloc${added>1?"s":""} ajouté${added>1?"s":""}!` : "") }])
      } catch { setMessages(p => [...p, { role: "assistant", content: "Erreur de connexion." }]) }
      setAiLoading(false)
    }

    // ── Synonymes et recherche enrichie ───────────────────────────────────────
    const SYNONYMS: Record<string, string[]> = {
      "téléphone": ["appel","phone","tel","call"],
      "mail": ["email","courriel","message","@"],
      "maps": ["adresse","localisation","lieu","carte","direction","itinéraire"],
      "avis": ["témoignage","review","note","étoile","recommandation","client"],
      "musique": ["spotify","deezer","apple music","soundcloud","chanson","album","playlist","artiste"],
      "restaurant": ["menu","carte","réservation","plat","cuisine","table"],
      "vente": ["produit","tarif","prix","service","boutique","achat","paiement"],
      "photo": ["image","galerie","picture","visuel","cover","bannière"],
      "vidéo": ["youtube","tiktok","clip","stream","twitch","live","vimeo"],
      "réseau": ["instagram","facebook","twitter","linkedin","snapchat","social"],
      "événement": ["concert","festival","soirée","date","billet","ticket"],
      "contact": ["formulaire","email","téléphone","whatsapp","message"],
      "lien": ["bouton","cta","url","action","click"],
      "profil": ["bio","présentation","avatar","identité","nom"],
      "podcast": ["audio","son","écoute","radio","épisode"],
      "stats": ["statistique","chiffre","nombre","compteur"],
      "qr": ["qr code","scan","flash"],
    }

    function searchScore(type: string, def: {label:string;description:string;category:string}, q: string): number {
      const query = q.toLowerCase().trim()
      if (!query) return 0
      const label = def.label.toLowerCase()
      const desc = def.description.toLowerCase()
      const cat = def.category.toLowerCase()
      if (label === query) return 100
      if (label.startsWith(query)) return 90
      if (label.includes(query)) return 80
      if (desc.includes(query)) return 60
      if (type.toLowerCase().includes(query)) return 50
      if (cat.includes(query)) return 40
      for (const [syn, aliases] of Object.entries(SYNONYMS)) {
        const allTerms = [syn, ...aliases]
        if (allTerms.some(t => query.includes(t) || t.includes(query))) {
          if (allTerms.some(t => label.includes(t))) return 35
          if (allTerms.some(t => desc.includes(t))) return 25
        }
      }
      return 0
    }

    const filteredBlocks = (() => {
      if (!search) {
        if (activeCategory === "recents") {
          return recentBlocks
            .filter(type => BLOCK_DEFS[type])
            .map(type => [type, BLOCK_DEFS[type]] as [string, (typeof BLOCK_DEFS)[string]])
        }
        if (activeCategory === "favorites") {
          return Object.entries(BLOCK_DEFS).filter(([type]) => favorites.includes(type))
        }
        return Object.entries(BLOCK_DEFS).filter(([, def]) => def.category === activeCategory)
      }
      return Object.entries(BLOCK_DEFS)
        .map(([type, def]) => ({ type, def, score: searchScore(type, def, search) }))
        .filter(({ score }) => score > 0)
        .sort((a, b) => b.score - a.score)
        .map(({ type, def }) => [type, def] as [string, (typeof BLOCK_DEFS)[string]])
    })()

    const groupedResults = search
      ? BLOCK_CATEGORIES.map(cat => ({
          cat,
          blocks: filteredBlocks.filter(([, def]) => def.category === cat.id)
        })).filter(({ blocks }) => blocks.length > 0)
      : null

    // Compteurs par catégorie — calculés une seule fois par render
    const catCounts = Object.values(BLOCK_DEFS).reduce((acc, def) => {
      acc[def.category] = (acc[def.category] || 0) + 1
      return acc
    }, {} as Record<string, number>)

    // Compteurs recherche — nb de résultats par catégorie
    const searchCounts = search && groupedResults
      ? Object.fromEntries(groupedResults.map(({ cat, blocks }) => [cat.id, blocks.length]))
      : null

    function hlText(text: string, query: string): React.ReactNode {
      if (!query.trim()) return text
      const lo = text.toLowerCase()
      const idx = lo.indexOf(query.toLowerCase())
      if (idx === -1) return text
      return <>{text.slice(0, idx)}<mark style={{ background: "rgba(201,168,76,0.25)", color: "#F5F0E8", borderRadius: 2, padding: "0 1px" }}>{text.slice(idx, idx + query.length)}</mark>{text.slice(idx + query.length)}</>
    }

    // selectedBlock recalculé depuis blocks à chaque render — garantit fraîcheur
    const selectedBlock = blocks.find(b => b.id === selectedId)
    // Revenir à l'onglet Contenu à chaque changement de bloc sélectionné.
    useEffect(() => { setEditTab("contenu") }, [selectedId])

    // Fond du thème appliqué partout
    function bgStyle(): React.CSSProperties {
      if (dayMode) return { background: "#FAFAFA" }
      if (!theme) return { background: "#080808" }
      const t = theme as any
      let base: React.CSSProperties = {}

      if (t.bgMode === "pattern") {
        const patSize = t.pattern_size || 20
        const patOpacity = t.pattern_opacity || 0.15
        const patColor = t.pattern_color || "#C9A84C"
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
          case "waves": bgImg = `repeating-linear-gradient(90deg, ${c} 0px, ${c} 1px, transparent 1px, transparent ${patSize}px), repeating-linear-gradient(180deg, ${c} 0px, ${c} 1px, transparent 1px, transparent ${patSize}px)`; break
          case "squares": bgImg = `linear-gradient(${c} 1px, transparent 1px), linear-gradient(90deg, ${c} 1px, transparent 1px)`; break
          case "circles": bgImg = `radial-gradient(circle, transparent ${patSize*0.3}px, ${c} ${patSize*0.3}px, ${c} ${patSize*0.32}px, transparent ${patSize*0.32}px)`; break
          case "stars": bgImg = `radial-gradient(circle, ${c} 1.5px, transparent 1.5px), radial-gradient(circle at ${patSize/2}px ${patSize/2}px, ${c} 1.5px, transparent 1.5px)`; break
          default: bgImg = `radial-gradient(circle, ${c} 1px, transparent 1px)`
        }
        base = { background: theme.bg, backgroundImage: bgImg, backgroundSize: `${patSize}px ${patSize}px` }
      } else if (t.bgMode === "radial") {
        return { background: t.bgGradient || `radial-gradient(circle at 50% 50%, ${theme.primary}, ${theme.bg})` }
      } else if (t.bgMode === "mesh") {
        const c1 = t.mesh_c1 || "#C9A84C"; const c2 = t.mesh_c2 || "var(--success)"; const c3 = t.mesh_c3 || "#7B2FBE"
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

    return (
      <div className="builder-root" style={{ height: "100dvh", background: "#080808", display: "flex", flexDirection: "column", fontFamily: "DM Sans, sans-serif", color: "#F5F0E8", overflow: "hidden" }}>

        {/* TOPBAR (masquee en mode Apercu plein ecran sur mobile) */}
        <div style={{ height: 50, background: "#0D0D0D", borderBottom: "1px solid rgba(201,168,76,0.12)", display: (preview && isMobile) ? "none" : "flex", alignItems: "center", padding: isMobile ? "0 9px" : "0 14px", gap: isMobile ? 6 : 10, flexShrink: 0, zIndex: 20 }}>
          <a href="/dashboard" style={{ display: "flex", alignItems: "center", gap: 4, textDecoration: "none", color: G, fontFamily: "Fraunces, serif", fontSize: 16, fontWeight: 700 }}>← QRowg</a>
          <div style={{ width: 1, height: 16, background: "rgba(255,255,255,0.08)" }} />
          <input value={pageName} onChange={e => setPageName(e.target.value)} style={{ background: "transparent", border: "none", color: "#F5F0E8", fontSize: 13, fontWeight: 600, outline: "none", width: isMobile ? 96 : 160, minWidth: 0 }} />
          {saving && <span style={{ color: MUTED, fontSize: 10 }}>Enregistrement…</span>}
          {saved && !saveError && !saving && <span style={{ color: "var(--success)", fontSize: 10, display: "flex", alignItems: "center", gap: 3 }}><Check size={10} /> Enregistré</span>}
          {hasUnsaved && !saving && !saved && !saveError && (
            <button onClick={saveNow} title="Enregistrer maintenant (sinon sauvegarde auto après ~1s)"
              style={{ display: "flex", alignItems: "center", gap: 4, background: "rgba(251,191,36,0.1)", border: "1px solid rgba(251,191,36,0.3)", borderRadius: 6, padding: "3px 8px", color: "#FBBF24", fontSize: 10, cursor: "pointer", flexShrink: 0, whiteSpace: "nowrap" }}>
              <span style={{ width: 5, height: 5, borderRadius: "50%", background: "#FBBF24" }} /> {isMobile ? "Enregistrer" : "Modifications non enregistrées · Enregistrer"}
            </button>
          )}
          {saveError && <button onClick={() => { setSaveError(false); setBlocks(b => [...b]) }} title={saveErrorMsg ? `Erreur : ${saveErrorMsg} — cliquer pour réessayer` : "Réessayer la sauvegarde"} style={{ color: "#EF4444", fontSize: 10, display: "flex", alignItems: "center", gap: 3, background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.3)", borderRadius: 6, padding: "3px 8px", cursor: "pointer", maxWidth: isMobile ? 130 : 340, overflow: "hidden", whiteSpace: "nowrap", textOverflow: "ellipsis", flexShrink: 0 }}>⚠ {isMobile ? "Réessayer" : `${saveErrorMsg ? saveErrorMsg : "Échec"} — Réessayer`}</button>}
          {pageId && !IS_UUID(pageId) && !liveId && !bootstrapError && <span style={{ color: MUTED, fontSize: 10 }}>Création de la page…</span>}
          {bootstrapError && <span style={{ color: "#EF4444", fontSize: 10, display: "flex", alignItems: "center", gap: 3 }} title={bootstrapError}>⚠ {bootstrapError}</span>}
          {!pageId && !isMobile && <span style={{ color: "#8A8478", fontSize: 9 }}>Mode démo</span>}
          <div style={{ flex: 1 }} />

          {/* Boutons Undo / Redo */}
          <div style={{ display: "flex", gap: 3 }}>
            <button onClick={() => { const p = undoRedo.undo(); if(p) setBlocksRaw(p) }}
              disabled={!undoRedo.canUndo()}
              title="Annuler — Ctrl+Z"
              style={{ width: 28, height: 28, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 6, cursor: undoRedo.canUndo() ? "pointer" : "default", color: undoRedo.canUndo() ? "#F5F0E8" : "rgba(255,255,255,0.2)", fontSize: 13, transition: "all 0.15s" }}
              onMouseEnter={e => { if(undoRedo.canUndo()) { e.currentTarget.style.background="rgba(201,168,76,0.1)"; e.currentTarget.style.borderColor="rgba(201,168,76,0.3)" }}}
              onMouseLeave={e => { e.currentTarget.style.background="rgba(255,255,255,0.04)"; e.currentTarget.style.borderColor="rgba(255,255,255,0.08)" }}>
              <Undo2 size={15} />
            </button>
            <button onClick={() => { const n = undoRedo.redo(); if(n) setBlocksRaw(n) }}
              disabled={!undoRedo.canRedo()}
              title="Rétablir — Ctrl+Shift+Z"
              style={{ width: 28, height: 28, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 6, cursor: undoRedo.canRedo() ? "pointer" : "default", color: undoRedo.canRedo() ? "#F5F0E8" : "rgba(255,255,255,0.2)", fontSize: 13, transition: "all 0.15s" }}
              onMouseEnter={e => { if(undoRedo.canRedo()) { e.currentTarget.style.background="rgba(201,168,76,0.1)"; e.currentTarget.style.borderColor="rgba(201,168,76,0.3)" }}}
              onMouseLeave={e => { e.currentTarget.style.background="rgba(255,255,255,0.04)"; e.currentTarget.style.borderColor="rgba(255,255,255,0.08)" }}>
              <Redo2 size={15} />
            </button>
          </div>

          {/* Modèles de page complets (icone seule sur mobile pour degager la barre) */}
          <button onClick={() => setShowTemplates(true)} title="Partir d'un modèle de page complet"
            style={{ display: "flex", alignItems: "center", gap: 5, background: "rgba(201,168,76,0.1)", border: "1px solid rgba(201,168,76,0.3)", borderRadius: 7, padding: isMobile ? "5px 9px" : "5px 10px", color: G, fontSize: 10, fontWeight: 700, cursor: "pointer", flexShrink: 0 }}>
            ✨{!isMobile && " Modèles"}
          </button>

          {/* Bouton Focus Mode (desktop uniquement — panneaux redimensionnables) */}
          {!isMobile && <button onClick={toggleFocus} title="Mode Focus — Ctrl+F"
            style={{ display: "flex", alignItems: "center", gap: 5, background: focusMode ? "rgba(201,168,76,0.15)" : "rgba(255,255,255,0.04)", border: `1px solid ${focusMode ? "rgba(201,168,76,0.4)" : "rgba(255,255,255,0.08)"}`, borderRadius: 7, padding: "5px 10px", color: focusMode ? G : MUTED, fontSize: 10, fontWeight: focusMode ? 700 : 400, cursor: "pointer" }}>
            {focusMode ? "⊞" : "⊡"} Focus
          </button>}

          {/* Raccourcis clavier — tooltip (survol : desktop uniquement) */}
          <div style={{ position: "relative", display: isMobile ? "none" : "block" }}>
            <button
              style={{ width: 26, height: 26, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 6, cursor: "pointer", color: MUTED, fontSize: 11, fontWeight: 700 }}
              title="Raccourcis clavier"
              onMouseEnter={e => { const t = e.currentTarget.nextElementSibling as HTMLElement; if(t) t.style.opacity = "1"; if(t) t.style.pointerEvents = "none" }}
              onMouseLeave={e => { const t = e.currentTarget.nextElementSibling as HTMLElement; if(t) t.style.opacity = "0" }}>
              ?
            </button>
            <div style={{ position: "absolute", top: "calc(100% + 8px)", right: 0, background: "#161616", border: "1px solid rgba(201,168,76,0.2)", borderRadius: 12, padding: "12px 14px", zIndex: 200, opacity: 0, transition: "opacity 0.15s", pointerEvents: "none", minWidth: 200, boxShadow: "0 8px 24px rgba(0,0,0,0.5)" }}>
              <p style={{ color: MUTED, fontSize: 9, textTransform: "uppercase", letterSpacing: 2, margin: "0 0 8px" }}>Raccourcis</p>
              {[
                ["Ctrl+B", "Bibliothèque"],
                ["Ctrl+E", "Éditeur"],
                ["Ctrl+P", "Aperçu"],
                ["Ctrl+F", "Mode Focus"],
              ].map(([k, v]) => (
                <div key={k} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                  <span style={{ color: MUTED, fontSize: 11 }}>{v}</span>
                  <kbd style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 5, padding: "2px 7px", color: G, fontSize: 10, fontFamily: "monospace", fontWeight: 700 }}>{k}</kbd>
                </div>
              ))}
            </div>
          </div>

          {/* Apercu plein ecran (#02) */}
          <button onClick={enterPreview} title="Aperçu plein écran" style={{ display: "flex", alignItems: "center", gap: 5, background: "rgba(201,168,76,0.12)", border: "1px solid rgba(201,168,76,0.35)", borderRadius: 7, padding: isMobile ? "6px 9px" : "5px 11px", color: G, fontSize: 11, fontWeight: 700, cursor: "pointer", flexShrink: 0 }}>
            <Eye size={13} />{!isMobile && " Aperçu"}
          </button>
          <button onClick={() => setRightTab(t => t==="theme" ? "preview" : "theme")} style={{ display: isMobile ? "none" : "flex", alignItems: "center", gap: 5, background: rightTab==="theme" ? "rgba(201,168,76,0.12)" : "transparent", border: `1px solid ${rightTab==="theme" ? "rgba(201,168,76,0.4)" : "rgba(201,168,76,0.2)"}`, borderRadius: 7, padding: "5px 11px", color: rightTab==="theme" ? G : MUTED, fontSize: 11, cursor: "pointer" }}>
            <Palette size={11} /> Thème
          </button>

          {qrTarget && !isMobile && (
            <div style={{ position: "relative" }}>
              <button onClick={() => setShowQrPanel(p => !p)} style={{ display: "flex", alignItems: "center", gap: 5, background: showQrPanel ? "rgba(201,168,76,0.12)" : "rgba(201,168,76,0.06)", border: `1px solid ${showQrPanel ? "rgba(201,168,76,0.4)" : "rgba(201,168,76,0.2)"}`, borderRadius: 8, padding: "5px 11px", color: G, fontSize: 11, fontWeight: 600, cursor: "pointer" }}>
                <QrCode size={11} /> QR Code
              </button>
              {showQrPanel && (
                <>
                  <div onClick={() => setShowQrPanel(false)} style={{ position: "fixed", inset: 0, zIndex: 199 }} />
                  <div style={{ position: "absolute", top: "calc(100% + 8px)", right: 0, background: "#161616", border: "1px solid rgba(201,168,76,0.25)", borderRadius: 16, padding: "18px", zIndex: 200, boxShadow: "0 8px 40px rgba(0,0,0,0.6)", width: 200 }}>
                    <p style={{ color: "#F5F0E8", fontSize: 12, fontWeight: 700, margin: "0 0 10px", textAlign: "center" }}>Mon QR Code</p>
                    <div style={{ background: "#FFFFFF", borderRadius: 10, padding: 8, marginBottom: 10, display: "flex", alignItems: "center", justifyContent: "center" }}>
                      <QRCanvas value={qrTarget} size={120} />
                    </div>
                    <div style={{ background: "#0A0A0A", border: "1px solid rgba(201,168,76,0.15)", borderRadius: 7, padding: "6px 9px", marginBottom: 8 }}>
                      <p style={{ color: MUTED, fontSize: 8, margin: "0 0 1px", textTransform: "uppercase", letterSpacing: 1 }}>URL de scan</p>
                      <p style={{ color: G, fontSize: 10, margin: 0, fontFamily: "monospace", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>/q/{qrShortCode}</p>
                    </div>
                    <div style={{ display: "flex", gap: 5 }}>
                      <button onClick={downloadQrPng} style={{ flex: 1, background: "rgba(201,168,76,0.1)", border: "1px solid rgba(201,168,76,0.25)", borderRadius: 7, padding: "7px", color: G, cursor: "pointer", fontSize: 10, fontWeight: 600, textAlign: "center" }}>↓ PNG</button>
                      <a href="/dashboard/qr-codes" style={{ flex: 1, background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 7, padding: "7px", color: MUTED, textDecoration: "none", fontSize: 10, textAlign: "center" }}>Perso →</a>
                    </div>
                  </div>
                </>
              )}
            </div>
          )}



          {pageId && pageSlug && !isMobile && (
            <a href={`/${pageSlug}`} target="_blank" rel="noopener noreferrer" style={{ display: "flex", alignItems: "center", gap: 5, background: "rgba(201,168,76,0.08)", border: "1px solid rgba(201,168,76,0.25)", borderRadius: 7, padding: "5px 11px", color: G, textDecoration: "none", fontSize: 11, fontWeight: 600 }}>
              <ExternalLink size={11} /> Voir en direct
            </a>
          )}

          <div style={{ position: "relative", flexShrink: 0 }}>
            <button onClick={() => setShowPublishPopup(p => !p)}
              style={{ display: "flex", alignItems: "center", gap: 6, background: pageStatus==="published" ? "rgba(57,255,143,0.12)" : `linear-gradient(90deg,${G},#b8953f)`, border: pageStatus==="published" ? "1px solid rgba(57,255,143,0.35)" : "none", borderRadius: 9, padding: "8px 18px", color: pageStatus==="published" ? "var(--success)" : "#080808", fontSize: 14, fontWeight: 700, cursor: "pointer", boxShadow: pageStatus==="published" ? "none" : `0 4px 16px rgba(201,168,76,0.3)` }}>
              {pageStatus==="published" ? <><Check size={13} /> Publié</> : "Publier"}
            </button>
            {showPublishPopup && (
              <>
                <div onClick={() => setShowPublishPopup(false)} style={{ position: "fixed", inset: 0, zIndex: 199, background: "rgba(0,0,0,0.4)", backdropFilter: "blur(4px)" }} />
                <div style={{ position: "absolute", top: "calc(100% + 12px)", right: 0, background: "#0F0F0F", border: "1px solid rgba(201,168,76,0.3)", borderRadius: 20, padding: "24px", zIndex: 200, boxShadow: "0 20px 60px rgba(0,0,0,0.8), 0 0 0 1px rgba(201,168,76,0.1)", width: 320 }}>
                  {/* Header */}
                  <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20 }}>
                    <div style={{ width: 42, height: 42, borderRadius: 12, background: pageStatus==="published" ? "rgba(57,255,143,0.12)" : "rgba(201,168,76,0.12)", border: `1px solid ${pageStatus==="published" ? "rgba(57,255,143,0.3)" : "rgba(201,168,76,0.3)"}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20 }}>
                      {pageStatus==="published" ? "🌐" : "🚀"}
                    </div>
                    <div>
                      <p style={{ color: "#F5F0E8", fontSize: 15, fontWeight: 700, margin: 0 }}>{pageStatus==="published" ? "Page en ligne" : "Publier la page"}</p>
                      <p style={{ color: MUTED, fontSize: 11, margin: 0 }}>{pageStatus==="published" ? "Votre page est accessible" : "Rendre la page accessible"}</p>
                    </div>
                  </div>

                  {/* Statut */}
                  <div style={{ display: "flex", alignItems: "center", gap: 8, background: pageStatus==="published" ? "rgba(57,255,143,0.08)" : "rgba(255,255,255,0.04)", border: `1px solid ${pageStatus==="published" ? "rgba(57,255,143,0.2)" : "rgba(255,255,255,0.08)"}`, borderRadius: 10, padding: "10px 12px", marginBottom: 14 }}>
                    <div style={{ width: 8, height: 8, borderRadius: "50%", background: pageStatus==="published" ? "var(--success)" : MUTED, boxShadow: pageStatus==="published" ? "0 0 6px var(--success)80" : "none" }} />
                    <span style={{ color: pageStatus==="published" ? "var(--success)" : MUTED, fontSize: 12, fontWeight: 600 }}>{pageStatus==="published" ? "En ligne" : "Brouillon"}</span>
                    <span style={{ color: MUTED, fontSize: 11, marginLeft: "auto" }}>{blocks.length} bloc{blocks.length!==1?"s":""}</span>
                  </div>

                  {/* URL */}
                  {pageSlug && (
                    <div style={{ marginBottom: 16 }}>
                      <p style={{ color: MUTED, fontSize: 10, margin: "0 0 6px", textTransform: "uppercase", letterSpacing: 1.5 }}>URL de la page</p>
                      <div style={{ background: "#0A0A0A", border: "1px solid rgba(201,168,76,0.2)", borderRadius: 10, padding: "10px 12px", display: "flex", alignItems: "center", gap: 8 }}>
                        <p style={{ color: G, fontSize: 12, margin: 0, fontFamily: "JetBrains Mono, monospace", flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {typeof window !== "undefined" ? window.location.origin : ""}/{pageSlug}
                        </p>
                        <button onClick={() => { navigator.clipboard.writeText((typeof window !== "undefined" ? window.location.origin : "")+"/"+pageSlug) }}
                          style={{ background: "rgba(201,168,76,0.1)", border: "1px solid rgba(201,168,76,0.2)", borderRadius: 6, padding: "4px 8px", color: G, cursor: "pointer", fontSize: 10, fontWeight: 600, flexShrink: 0 }}>
                          Copier
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Stats rapides */}
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 16 }}>
                    <div style={{ background: "rgba(201,168,76,0.06)", border: "1px solid rgba(201,168,76,0.15)", borderRadius: 10, padding: "10px", textAlign: "center" }}>
                      <p style={{ color: G, fontSize: 20, fontWeight: 700, margin: 0, fontFamily: "Fraunces, serif" }}>{pageStats.views}</p>
                      <p style={{ color: MUTED, fontSize: 9, margin: 0 }}>👁 Vues</p>
                    </div>
                    <div style={{ background: "rgba(57,255,143,0.06)", border: "1px solid rgba(57,255,143,0.15)", borderRadius: 10, padding: "10px", textAlign: "center" }}>
                      <p style={{ color: "var(--success)", fontSize: 20, fontWeight: 700, margin: 0, fontFamily: "Fraunces, serif" }}>{pageStats.scans}</p>
                      <p style={{ color: MUTED, fontSize: 9, margin: 0 }}>📱 Scans</p>
                    </div>
                  </div>

                  {/* Bouton principal */}
                  <button onClick={handlePublish} disabled={publishing || pageStatus==="published"}
                    style={{ width: "100%", background: pageStatus==="published" ? "rgba(57,255,143,0.1)" : `linear-gradient(90deg,${G},#b8953f)`, border: pageStatus==="published" ? "1px solid rgba(57,255,143,0.3)" : "none", borderRadius: 12, padding: "14px", color: pageStatus==="published" ? "var(--success)" : "#080808", fontSize: 14, fontWeight: 700, cursor: pageStatus==="published" ? "default" : "pointer", marginBottom: pageSlug ? 10 : 0, boxShadow: pageStatus==="published" ? "none" : "0 4px 20px rgba(201,168,76,0.3)" }}>
                    {publishing ? (
                      <span style={{display:"flex",alignItems:"center",gap:8,justifyContent:"center"}}>
                        <span style={{display:"inline-block",width:14,height:14,border:"2px solid #08080880",borderTopColor:"#080808",borderRadius:"50%",animation:"spin 0.7s linear infinite"}} />
                        Publication…
                      </span>
                    ) : publishSuccess ? (
                      <span style={{display:"flex",alignItems:"center",gap:8,justifyContent:"center"}}>
                        <span style={{fontSize:16}}>✓</span> Page publiée !
                      </span>
                    ) : pageStatus==="published" ? "✓ Déjà publiée" : "🚀 Publier maintenant"}
                  </button>

                  {/* Erreur publication */}
                  {publishError && (
                    <div style={{marginBottom:10,padding:"9px 12px",background:"rgba(239,68,68,0.08)",border:"1px solid rgba(239,68,68,0.25)",borderRadius:9,color:"#F87171",fontSize:12,display:"flex",alignItems:"center",gap:6}}>
                      <span>⚠</span>
                      <span>{publishError}</span>
                      <button onClick={()=>setPublishError("")} style={{marginLeft:"auto",background:"none",border:"none",cursor:"pointer",color:"#F87171",fontSize:14,lineHeight:1}}>×</button>
                    </div>
                  )}
                  {/* Voir la page */}
                  {pageSlug && (
                    <a href={`/${pageSlug}`} target="_blank" rel="noopener noreferrer"
                      style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 7, background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 12, padding: "12px", color: MUTED, textDecoration: "none", fontSize: 13, fontWeight: 600 }}>
                      <ExternalLink size={13} /> Voir la page
                    </a>
                  )}
                </div>
              </>
            )}
          </div>
        </div>

        {/* BODY */}
        <div style={{ flex: 1, display: "flex", overflow: "hidden", position: "relative" }}>

          {/* SIDEBAR BLOCS */}
          <div style={{ width: isMobile ? "100%" : (blocksCollapsed ? 64 : blocksResize.width), background: "#0A0A0A", borderRight: "none", display: isMobile && mobileTab !== "blocks" ? "none" : "flex", flexDirection: "column", flexShrink: isMobile ? 1 : 0, overflow: "hidden", transition: blocksCollapsed ? "width 0.25s ease" : "none", position: "relative" }}>
            {/* Bouton collapse/expand */}
            <button onClick={toggleBlocks} title={blocksCollapsed ? "Ouvrir" : "Réduire"}
              style={{ position: "absolute", top: 8, right: 8, zIndex: 20, width: 22, height: 22, background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 6, color: MUTED, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10 }}>
              {blocksCollapsed ? "›" : "‹"}
            </button>
            {/* Mode étendu: recherche normale */}
            {!blocksCollapsed && (
              <div style={{ padding: "10px 8px 10px 10px", borderBottom: "1px solid rgba(255,255,255,0.04)", flexShrink: 0 }}>
                <div style={{ position: "relative" }}>
                  <Search size={isMobile ? 15 : 11} style={{ position: "absolute", left: isMobile ? 12 : 8, top: "50%", transform: "translateY(-50%)", color: MUTED }} />
                  <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Rechercher un bloc..."
                    style={{ width: "100%", height: isMobile ? 46 : undefined, background: "#111", border: "1px solid rgba(201,168,76,0.15)", borderRadius: isMobile ? 11 : 7, padding: isMobile ? "0 34px 0 36px" : "7px 7px 7px 24px", color: "#F5F0E8", fontSize: isMobile ? 15 : 11, outline: "none", boxSizing: "border-box" }}
                    onFocus={e => { e.target.style.borderColor = "rgba(201,168,76,0.4)"; setBlockSearchFocus(true) }}
                    onBlur={e => { e.target.style.borderColor = "rgba(201,168,76,0.15)"; setBlockSearchFocus(false) }} />
                  {search && <button onClick={() => setSearch("")} aria-label="Effacer" style={{ position: "absolute", right: isMobile ? 8 : 7, top: "50%", transform: "translateY(-50%)", width: isMobile ? 30 : undefined, height: isMobile ? 30 : undefined, display: "flex", alignItems: "center", justifyContent: "center", background: "none", border: "none", color: MUTED, cursor: "pointer", padding: 0 }}><X size={isMobile ? 15 : 10} /></button>}
                </div>
              </div>
            )}
            {/* Mode réduit: icône loupe */}
            {blocksCollapsed && (
              <div style={{ padding: "10px 0", display: "flex", justifyContent: "center", borderBottom: "1px solid rgba(255,255,255,0.04)", flexShrink: 0 }}>
                <button onClick={toggleBlocks} style={{ background: "none", border: "none", color: MUTED, cursor: "pointer", padding: 4 }}>
                  <Search size={16} />
                </button>
              </div>
            )}

            {!search && !blocksCollapsed && (
              <div style={{ padding: "8px 10px 6px", borderBottom: "1px solid rgba(255,255,255,0.04)", flexShrink: 0 }}>
                <div style={{ display: "grid", gridTemplateColumns: isMobile ? "repeat(4, minmax(0, 1fr))" : "1fr 1fr", gap: isMobile ? 5 : 6 }}>
                  {/* Catégorie Récents — visible seulement si au moins 1 récent */}
                  {recentBlocks.length > 0 && (
                    <button onClick={() => setActiveCategory("recents")} title="Blocs récemment utilisés"
                      style={{ display: "flex", flexDirection: isMobile ? "column" as const : "row" as const, alignItems: "center", gap: isMobile ? 3 : 7, minWidth: 0, background: activeCategory==="recents" ? "var(--action)18" : "rgba(255,255,255,0.03)", border: `1px solid ${activeCategory==="recents" ? "var(--action)50" : "rgba(255,255,255,0.06)"}`, borderRadius: 10, padding: isMobile ? "5px 3px" : "9px 11px", color: activeCategory==="recents" ? "var(--action)" : MUTED, fontSize: 12, fontWeight: activeCategory==="recents" ? 700 : 500, cursor: "pointer", transition: "all 0.15s", textAlign: "left" as const }}>
                      <span style={{ fontSize: isMobile ? 16 : 15, flexShrink: 0 }}>🕐</span>
                      <span style={{ minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: isMobile ? "normal" as const : "nowrap", fontSize: isMobile ? 9.5 : undefined, textAlign: isMobile ? "center" as const : undefined, lineHeight: isMobile ? 1.15 : undefined, width: isMobile ? "100%" : undefined }}>Récents</span>
                    </button>
                  )}
                  {/* Catégorie Favoris — visible seulement si au moins 1 favori */}
                  {favorites.length > 0 && (
                    <button onClick={() => setActiveCategory("favorites")} title="Vos blocs favoris"
                      style={{ display: "flex", flexDirection: isMobile ? "column" as const : "row" as const, alignItems: "center", gap: isMobile ? 3 : 7, minWidth: 0, background: activeCategory==="favorites" ? "#FFD70018" : "rgba(255,255,255,0.03)", border: `1px solid ${activeCategory==="favorites" ? "#FFD70050" : "rgba(255,255,255,0.06)"}`, borderRadius: 10, padding: isMobile ? "5px 3px" : "9px 11px", color: activeCategory==="favorites" ? "#FFD700" : MUTED, fontSize: 12, fontWeight: activeCategory==="favorites" ? 700 : 500, cursor: "pointer", transition: "all 0.15s", textAlign: "left" as const }}>
                      <span style={{ fontSize: isMobile ? 16 : 15, flexShrink: 0 }}>⭐</span>
                      <span style={{ minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: isMobile ? "normal" as const : "nowrap", fontSize: isMobile ? 9.5 : undefined, textAlign: isMobile ? "center" as const : undefined, lineHeight: isMobile ? 1.15 : undefined, width: isMobile ? "100%" : undefined }}>Favoris</span>
                      <span style={{ display: isMobile ? "none" : undefined, marginLeft: "auto", flexShrink: 0, background: "rgba(255,215,0,0.15)", borderRadius: 10, padding: "0px 6px", fontSize: 9.5, fontWeight: 700 }}>{favorites.length}</span>
                    </button>
                  )}
                  {BLOCK_CATEGORIES.map(cat => (
                    <button key={cat.id} onClick={() => setActiveCategory(cat.id)} title={cat.desc}
                      style={{ display: "flex", flexDirection: isMobile ? "column" as const : "row" as const, alignItems: "center", gap: isMobile ? 3 : 7, minWidth: 0, background: activeCategory===cat.id ? cat.color+"18" : "rgba(255,255,255,0.03)", border: `1px solid ${activeCategory===cat.id ? cat.color+"50" : "rgba(255,255,255,0.06)"}`, borderRadius: 10, padding: isMobile ? "5px 3px" : "9px 11px", color: activeCategory===cat.id ? cat.color : MUTED, fontSize: 12, fontWeight: activeCategory===cat.id ? 700 : 500, cursor: "pointer", transition: "all 0.15s", textAlign: "left" as const }}>
                      <span style={{ fontSize: isMobile ? 16 : 15, flexShrink: 0 }}>{cat.icon}</span>
                      <span style={{ minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: isMobile ? "normal" as const : "nowrap", fontSize: isMobile ? 9.5 : undefined, textAlign: isMobile ? "center" as const : undefined, lineHeight: isMobile ? 1.15 : undefined, width: isMobile ? "100%" : undefined }}>{cat.label}</span>
                      <span style={{ display: isMobile ? "none" : undefined, marginLeft: "auto", flexShrink: 0, background: activeCategory===cat.id ? cat.color+"20" : "rgba(255,255,255,0.06)", color: activeCategory===cat.id ? cat.color : MUTED, borderRadius: 10, padding: "0px 6px", fontSize: 9.5, fontWeight: 700, lineHeight: "17px" }}>
                        {search && searchCounts ? (searchCounts[cat.id] || 0) : (catCounts[cat.id] || 0)}
                      </span>
                    </button>
                  ))}
                </div>
                <p style={{ color: MUTED, fontSize: 11.5, margin: "6px 0 0", paddingLeft: 2 }}>
                  {activeCategory==="recents" ? `${recentBlocks.length} bloc${recentBlocks.length>1?"s":""} récent${recentBlocks.length>1?"s":""}` : activeCategory==="favorites" ? `${favorites.length} bloc${favorites.length>1?"s":""} favori${favorites.length>1?"s":""}` : BLOCK_CATEGORIES.find(c => c.id===activeCategory)?.desc}
                </p>
              </div>
            )}
            {/* Mode réduit : icônes catégories + drawer flottant */}
            {blocksCollapsed && (
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4, padding: "8px 4px", borderBottom: "1px solid rgba(255,255,255,0.04)", flexShrink: 0 }}>
                {recentBlocks.length > 0 && (
                  <button onClick={() => { setDrawerCategory("recents"); setActiveCategory("recents") }}
                    title={`Récents (${recentBlocks.length})`}
                    style={{ width: 44, height: 36, display: "flex", alignItems: "center", justifyContent: "center", background: (drawerCategory==="recents" || activeCategory==="recents") ? "var(--action)18" : "transparent", border: `1px solid ${(drawerCategory==="recents" || activeCategory==="recents") ? "var(--action)40" : "transparent"}`, borderRadius: 8, cursor: "pointer", fontSize: 16, transition: "all 0.15s" }}>
                    🕐
                  </button>
                )}
                {favorites.length > 0 && (
                  <button onClick={() => { setDrawerCategory("favorites"); setActiveCategory("favorites") }}
                    title={`Favoris (${favorites.length})`}
                    style={{ width: 44, height: 36, display: "flex", alignItems: "center", justifyContent: "center", background: (drawerCategory==="favorites" || activeCategory==="favorites") ? "#FFD70018" : "transparent", border: `1px solid ${(drawerCategory==="favorites" || activeCategory==="favorites") ? "#FFD70040" : "transparent"}`, borderRadius: 8, cursor: "pointer", fontSize: 16, transition: "all 0.15s" }}>
                    ⭐
                  </button>
                )}
                {BLOCK_CATEGORIES.map(cat => (
                  <button key={cat.id} onClick={() => { setDrawerCategory(drawerCategory===cat.id ? null : cat.id); setActiveCategory(cat.id) }}
                    title={`${cat.label} (${catCounts[cat.id] || 0})`}
                    style={{ width: 44, height: 36, display: "flex", alignItems: "center", justifyContent: "center", background: (drawerCategory===cat.id || activeCategory===cat.id) ? cat.color+"18" : "transparent", border: `1px solid ${(drawerCategory===cat.id || activeCategory===cat.id) ? cat.color+"40" : "transparent"}`, borderRadius: 8, cursor: "pointer", fontSize: 16, transition: "all 0.15s", position: "relative" as const }}>
                    {cat.icon}
                    <span style={{ position: "absolute", bottom: 2, right: 3, fontSize: 7, color: MUTED, fontWeight: 700, lineHeight: 1 }}>{catCounts[cat.id]||0}</span>
                  </button>
                ))}
              </div>
            )}

            {!blocksCollapsed && <div style={{ flex: 1, overflowY: "auto", padding: "5px 6px" }}>
              {search
                ? (filteredBlocks.length===0
                  ? (
                    <div style={{ padding: "30px 14px", textAlign: "center" }}>
                      <p style={{ fontSize: 22, margin: "0 0 8px" }}>🔍</p>
                      <p style={{ color: "#F5F0E8", fontSize: 12, fontWeight: 600, margin: "0 0 3px" }}>Aucun bloc trouvé</p>
                      <p style={{ color: MUTED, fontSize: 10, margin: "0 0 12px" }}>"{search}"</p>
                      <button onClick={() => setSearch("")} style={{ background: "rgba(201,168,76,0.1)", border: "1px solid rgba(201,168,76,0.25)", borderRadius: 7, padding: "5px 12px", color: G, fontSize: 10, fontWeight: 600, cursor: "pointer" }}>Effacer</button>
                    </div>
                  )
                  : (<>
                    {(groupedResults||[]).map(({ cat, blocks: catBlocks }) => (
                      <div key={cat.id} style={{ marginBottom: 4 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 5, padding: "5px 6px 3px" }}>
                          <span style={{ fontSize: 11 }}>{cat.icon}</span>
                          <span style={{ color: cat.color, fontSize: 9, fontWeight: 700, textTransform: "uppercase" as const, letterSpacing: 1.5 }}>{cat.label}</span>
                          <span style={{ color: MUTED, fontSize: 9 }}>·{catBlocks.length}</span>
                        </div>
                        {catBlocks.map(([type, def]) => (
                          <button key={type} onClick={() => addBlock(type)}
                            style={{ width: "100%", display: "flex", alignItems: "center", gap: 8, padding: "7px 8px", background: "transparent", border: "1px solid transparent", borderRadius: 8, color: MUTED, fontSize: 12, cursor: "pointer", textAlign: "left" as const, marginBottom: 1 }}
                            onMouseEnter={e => { e.currentTarget.style.background = def.color+"10"; e.currentTarget.style.color = "#F5F0E8"; showPopover(type, e) }}
                            onMouseLeave={e => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = MUTED; hidePopover() }}>
                            <div style={{ width: 26, height: 26, borderRadius: 6, background: def.color+"12", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, flexShrink: 0 }}>{def.icon}</div>
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <p style={{ margin: 0, fontSize: 10, fontWeight: 600, color: "inherit", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{hlText(def.label, search)}</p>
                              <p style={{ margin: 0, fontSize: 10.5, color: MUTED, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{hlText(def.description, search)}</p>
                            </div>
                          </button>
                        ))}
                      </div>
                    ))}
                  </>)
                )
                : (
                  /* Mode normal — accordéon par catégorie */
                  <>
                    {/* Récents */}
                    {activeCategory==="recents" && recentBlocks.length > 0 && filteredBlocks.map(([type, def]) => (
                      <button key={type} onClick={() => addBlock(type)}
                        style={{ width: "100%", display: "flex", alignItems: "center", gap: 9, padding: "8px 9px", background: "transparent", border: "1px solid transparent", borderRadius: 8, color: MUTED, fontSize: 12, cursor: "pointer", textAlign: "left" as const, marginBottom: 2 }}
                        onMouseEnter={e => { const el = e.currentTarget; el.style.background = "var(--action)10"; el.style.color = "#F5F0E8" }}
                        onMouseLeave={e => { const el = e.currentTarget; el.style.background = "transparent"; el.style.color = MUTED }}>
                        <div style={{ width: 30, height: 30, borderRadius: 8, background: def.color+"12", border: `1px solid ${def.color}25`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, flexShrink: 0 }}>{def.icon}</div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <p style={{ margin: 0, fontSize: 12, fontWeight: 600, color: "inherit", lineHeight: 1.2 }}>{def.label}</p>
                          <p style={{ margin: 0, fontSize: 10.5, color: MUTED, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{def.description}</p>
                        </div>
                        <button onClick={e => { e.stopPropagation(); toggleFav(type) }} title={isFav(type) ? "Retirer des favoris" : "Ajouter aux favoris"}
                          style={{ width: 22, height: 22, display: "flex", alignItems: "center", justifyContent: "center", background: "none", border: "none", cursor: "pointer", flexShrink: 0, fontSize: 13, opacity: isFav(type) ? 1 : 0, color: isFav(type) ? "#FFD700" : MUTED }}
                          className="fav-star">
                          {isFav(type) ? "⭐" : "☆"}
                        </button>
                      </button>
                    ))}
                    {/* Favoris */}
                    {activeCategory==="favorites" && favorites.length > 0 && filteredBlocks.map(([type, def]) => (
                      <button key={type} onClick={() => addBlock(type)}
                        style={{ width: "100%", display: "flex", alignItems: "center", gap: 9, padding: "8px 9px", background: "transparent", border: "1px solid transparent", borderRadius: 8, color: MUTED, fontSize: 12, cursor: "pointer", textAlign: "left" as const, marginBottom: 2 }}
                        onMouseEnter={e => { const el = e.currentTarget; el.style.background = "#FFD70010"; el.style.color = "#F5F0E8" }}
                        onMouseLeave={e => { const el = e.currentTarget; el.style.background = "transparent"; el.style.color = MUTED }}>
                        <div style={{ width: 30, height: 30, borderRadius: 8, background: def.color+"12", border: `1px solid ${def.color}25`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, flexShrink: 0 }}>{def.icon}</div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <p style={{ margin: 0, fontSize: 12, fontWeight: 600, color: "inherit", lineHeight: 1.2 }}>{def.label}</p>
                          <p style={{ margin: 0, fontSize: 10.5, color: MUTED, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{def.description}</p>
                        </div>
                        <button onClick={e => { e.stopPropagation(); toggleFav(type) }} title="Retirer des favoris"
                          style={{ width: 22, height: 22, display: "flex", alignItems: "center", justifyContent: "center", background: "none", border: "none", cursor: "pointer", flexShrink: 0, fontSize: 13, opacity: 1, color: "#FFD700" }}
                          className="fav-star">⭐</button>
                      </button>
                    ))}
                    {/* Catégories normales en accordéon */}
                    {activeCategory!=="recents" && activeCategory!=="favorites" && (
                      <div>
                        {/* Header catégorie active avec collapse */}
                        {(() => {
                          const cat = BLOCK_CATEGORIES.find(c => c.id===activeCategory)
                          if (!cat) return null
                          const collapsed = isCatCollapsed(activeCategory)
                          const catBlocks = Object.entries(BLOCK_DEFS).filter(([, def]) => def.category === activeCategory)
                          // Sous-groupes clairs pour la section Identité (Essentiel / Image / Présentation / Confiance)
                          const IDENTITY_GROUPS: { label: string; keys: string[] }[] = [
                            { label: "Essentiel",    keys: ["profile", "bio"] },
                            { label: "Image",        keys: ["cover_banner"] },
                            { label: "Présentation", keys: ["skills", "about", "expertise", "languages", "journey"] },
                            { label: "Confiance",    keys: ["availability", "certifications"] },
                            // Preuve sociale : blocs existants (rendu déjà en place) rendus découvrables ici
                            { label: "Preuve sociale", keys: ["business_stats", "google_reviews_block", "testimonials", "visit_counter"] },
                          ]
                          const RECO = new Set(["profile"])
                          const blockBtn = (type: string, def: any) => (
                            <button key={type} onClick={() => addBlock(type)}
                              style={{ width: "100%", display: "flex", alignItems: "center", gap: 9, padding: "8px 9px", background: "transparent", border: "1px solid transparent", borderRadius: 8, color: MUTED, fontSize: 12, cursor: "pointer", textAlign: "left" as const, marginBottom: 2, transition: "all 0.15s" }}
                              onMouseEnter={e => { const el = e.currentTarget; el.style.background = def.color+"10"; el.style.color = "#F5F0E8"; el.style.borderColor = def.color+"20"; const star = el.querySelector(".fav-star") as HTMLElement; if(star && !isFav(type)) star.style.opacity = "0.5"; showPopover(type, e) }}
                              onMouseLeave={e => { const el = e.currentTarget; el.style.background = "transparent"; el.style.color = MUTED; el.style.borderColor = "transparent"; const star = el.querySelector(".fav-star") as HTMLElement; if(star && !isFav(type)) star.style.opacity = "0"; hidePopover() }}>
                              <div style={{ width: 30, height: 30, borderRadius: 8, background: def.color+"12", border: `1px solid ${def.color}25`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, flexShrink: 0 }}>{def.icon}</div>
                              <div style={{ flex: 1, minWidth: 0 }}>
                                <div style={{ display: "flex", alignItems: "center", gap: 6, minWidth: 0 }}>
                                  <p style={{ margin: 0, fontSize: 12, fontWeight: 600, color: "inherit", lineHeight: 1.2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{def.label}</p>
                                  {RECO.has(type) && <span style={{ flexShrink: 0, background: "rgba(201,168,76,0.16)", border: "1px solid rgba(201,168,76,0.35)", color: G, fontSize: 8, fontWeight: 800, letterSpacing: 0.3, borderRadius: 6, padding: "1px 5px", textTransform: "uppercase" as const }}>★ Reco</span>}
                                </div>
                                <p style={{ margin: 0, fontSize: 10.5, color: MUTED, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", lineHeight: 1.3 }}>{def.description}</p>
                              </div>
                              <button onClick={e => { e.stopPropagation(); toggleFav(type) }}
                                title={isFav(type) ? "Retirer des favoris" : "Ajouter aux favoris"}
                                style={{ width: 22, height: 22, display: "flex", alignItems: "center", justifyContent: "center", background: "none", border: "none", cursor: "pointer", flexShrink: 0, fontSize: 13, opacity: isFav(type) ? 1 : 0, transition: "opacity 0.15s", color: isFav(type) ? "#FFD700" : MUTED }}
                                className="fav-star">
                                {isFav(type) ? "⭐" : "☆"}
                              </button>
                            </button>
                          )
                          const subHeader = { color: MUTED, fontSize: 8.5, fontWeight: 700, textTransform: "uppercase" as const, letterSpacing: 1.2, margin: "9px 6px 3px" }
                          return (
                            <div>
                              <button onClick={() => toggleCat(activeCategory)}
                                style={{ width: "100%", display: "flex", alignItems: "center", gap: 8, padding: "7px 9px 6px", background: "transparent", border: "none", borderBottom: `1px solid rgba(255,255,255,0.05)`, cursor: "pointer", marginBottom: collapsed ? 0 : 4 }}>
                                <span style={{ fontSize: 13 }}>{cat.icon}</span>
                                <span style={{ color: cat.color, fontSize: 10, fontWeight: 700, textTransform: "uppercase" as const, letterSpacing: 1.5, flex: 1, textAlign: "left" as const }}>{cat.label}</span>
                                <span style={{ color: MUTED, fontSize: 9, marginRight: 4 }}>{catBlocks.length}</span>
                                <span style={{ color: MUTED, fontSize: 10, display: "inline-block", transform: collapsed ? "rotate(-90deg)" : "rotate(0deg)", transition: "transform 0.2s" }}>▾</span>
                              </button>
                              {!collapsed && (activeCategory === "identity"
                                ? (() => {
                                    const grouped = IDENTITY_GROUPS.flatMap(g => g.keys)
                                    const rest = catBlocks.filter(([t]) => !grouped.includes(t)) // blocs identité non classés -> "Autres"
                                    return (<>
                                      <button type="button" onClick={generateBaseIdentity} title="Ajoute profil + bio + compétences + disponibilité, prêts à éditer"
                                        style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "center", gap: 7, padding: "10px", margin: "2px 0 8px", borderRadius: 9, border: "none", cursor: "pointer", background: "linear-gradient(90deg,var(--accent),color-mix(in srgb, var(--accent) 75%, #000))", color: "#080808", fontSize: 12, fontWeight: 800 }}>
                                        ✨ Générer une identité de base
                                      </button>
                                      {/* Modèles par métier : 1 clic crée une identité adaptée */}
                                      <div style={{ margin: "0 0 10px" }}>
                                        <button type="button" onClick={() => setMetierOpen(o => !o)} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 6, width: "100%", background: metierOpen ? "rgba(201,168,76,0.05)" : "rgba(201,168,76,0.09)", border: `1px solid ${metierOpen ? "rgba(201,168,76,0.18)" : "rgba(201,168,76,0.3)"}`, borderRadius: 9, cursor: "pointer", padding: "9px 12px", margin: "8px 0" }}><span style={{ display: "flex", alignItems: "center", gap: 7, color: "#F5F0E8", fontSize: 12.5, fontWeight: 700 }}><span style={{ fontSize: 14 }}>✨</span> Modèles par métier</span><ChevronDown size={15} color={G} style={{ transform: metierOpen ? "rotate(180deg)" : "none", transition: "transform .2s" }} /></button>
                                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
                                          {metierOpen && IDENTITY_PRESETS.map(p => (
                                            <button key={p.key} type="button" onClick={() => generateIdentityPreset(p)} title={`Crée : ${p.blocks.map(b => (BLOCK_DEFS as any)[b.type]?.label || b.type).join(", ")}`}
                                              style={{ display: "flex", alignItems: "center", gap: 7, minHeight: isMobile ? 46 : undefined, padding: isMobile ? "11px 11px" : "9px 10px", borderRadius: 10, border: "1px solid rgba(201,168,76,0.18)", cursor: "pointer", background: "rgba(201,168,76,0.05)", color: "#F5F0E8", fontSize: isMobile ? 12 : 11, fontWeight: 600, textAlign: "left" as const, transition: "all .15s" }}
                                              onMouseEnter={e => { e.currentTarget.style.background = "rgba(201,168,76,0.12)"; e.currentTarget.style.borderColor = "rgba(201,168,76,0.4)" }}
                                              onMouseLeave={e => { e.currentTarget.style.background = "rgba(201,168,76,0.05)"; e.currentTarget.style.borderColor = "rgba(201,168,76,0.18)" }}>
                                              <span style={{ fontSize: 16 }}>{p.emoji}</span>
                                              <span style={{ flex: 1, lineHeight: 1.2 }}>{p.label}</span>
                                            </button>
                                          ))}
                                        </div>
                                      </div>
                                      {IDENTITY_GROUPS.map(g => {
                                        const gb = g.keys.filter(k => (BLOCK_DEFS as any)[k])
                                        if (!gb.length) return null
                                        return (
                                          <div key={g.label}>
                                            <p style={subHeader}>{g.label}</p>
                                            {gb.map(k => blockBtn(k, (BLOCK_DEFS as any)[k]))}
                                          </div>
                                        )
                                      })}
                                      {rest.length > 0 && (<div><p style={subHeader}>Autres</p>{rest.map(([t, d]) => blockBtn(t, d))}</div>)}
                                    </>)
                                  })()
                                : activeCategory === "actions"
                                ? (<>
                                    <div style={{ margin: "2px 0 10px" }}>
                                      <button type="button" onClick={() => setMetierOpen(o => !o)} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 6, width: "100%", background: metierOpen ? "rgba(201,168,76,0.05)" : "rgba(201,168,76,0.09)", border: `1px solid ${metierOpen ? "rgba(201,168,76,0.18)" : "rgba(201,168,76,0.3)"}`, borderRadius: 9, cursor: "pointer", padding: "9px 12px", margin: "8px 0" }}><span style={{ display: "flex", alignItems: "center", gap: 7, color: "#F5F0E8", fontSize: 12.5, fontWeight: 700 }}><span style={{ fontSize: 14 }}>✨</span> Modèles par métier</span><ChevronDown size={15} color={G} style={{ transform: metierOpen ? "rotate(180deg)" : "none", transition: "transform .2s" }} /></button>
                                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
                                        {metierOpen && ACTION_PRESETS.map(p => (
                                          <button key={p.key} type="button" onClick={() => generateActionPreset(p)} title={`Crée : ${p.blocks.map(b => (BLOCK_DEFS as any)[b.type]?.label || b.type).join(", ")}`}
                                            style={{ display: "flex", alignItems: "center", gap: 7, padding: "9px 10px", borderRadius: 9, border: "1px solid rgba(201,168,76,0.18)", cursor: "pointer", background: "rgba(201,168,76,0.05)", color: "#F5F0E8", fontSize: 11, fontWeight: 600, textAlign: "left" as const, transition: "all .15s" }}
                                            onMouseEnter={e => { e.currentTarget.style.background = "rgba(201,168,76,0.12)"; e.currentTarget.style.borderColor = "rgba(201,168,76,0.4)" }}
                                            onMouseLeave={e => { e.currentTarget.style.background = "rgba(201,168,76,0.05)"; e.currentTarget.style.borderColor = "rgba(201,168,76,0.18)" }}>
                                            <span style={{ fontSize: 16 }}>{p.emoji}</span>
                                            <span style={{ flex: 1, lineHeight: 1.2 }}>{p.label}</span>
                                          </button>
                                        ))}
                                      </div>
                                    </div>
                                    <p style={subHeader}>Toutes les actions</p>
                                    {catBlocks.map(([type, def]) => blockBtn(type, def))}
                                  </>)
                                : activeCategory === "media"
                                ? (<>
                                    <div style={{ margin: "2px 0 10px" }}>
                                      <button type="button" onClick={() => setMetierOpen(o => !o)} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 6, width: "100%", background: metierOpen ? "rgba(201,168,76,0.05)" : "rgba(201,168,76,0.09)", border: `1px solid ${metierOpen ? "rgba(201,168,76,0.18)" : "rgba(201,168,76,0.3)"}`, borderRadius: 9, cursor: "pointer", padding: "9px 12px", margin: "8px 0" }}><span style={{ display: "flex", alignItems: "center", gap: 7, color: "#F5F0E8", fontSize: 12.5, fontWeight: 700 }}><span style={{ fontSize: 14 }}>✨</span> Modèles par métier</span><ChevronDown size={15} color={G} style={{ transform: metierOpen ? "rotate(180deg)" : "none", transition: "transform .2s" }} /></button>
                                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
                                        {metierOpen && MEDIA_PRESETS.map(p => (
                                          <button key={p.key} type="button" onClick={() => generateMediaPreset(p)} title={`Crée : ${p.blocks.map(b => (BLOCK_DEFS as any)[b.type]?.label || b.type).join(", ")}`}
                                            style={{ display: "flex", alignItems: "center", gap: 7, padding: "9px 10px", borderRadius: 9, border: "1px solid rgba(201,168,76,0.18)", cursor: "pointer", background: "rgba(201,168,76,0.05)", color: "#F5F0E8", fontSize: 11, fontWeight: 600, textAlign: "left" as const, transition: "all .15s" }}
                                            onMouseEnter={e => { e.currentTarget.style.background = "rgba(201,168,76,0.12)"; e.currentTarget.style.borderColor = "rgba(201,168,76,0.4)" }}
                                            onMouseLeave={e => { e.currentTarget.style.background = "rgba(201,168,76,0.05)"; e.currentTarget.style.borderColor = "rgba(201,168,76,0.18)" }}>
                                            <span style={{ fontSize: 16 }}>{p.emoji}</span>
                                            <span style={{ flex: 1, lineHeight: 1.2 }}>{p.label}</span>
                                          </button>
                                        ))}
                                      </div>
                                    </div>
                                    <p style={subHeader}>Tous les blocs médias</p>
                                    {catBlocks.map(([type, def]) => blockBtn(type, def))}
                                  </>)
                                : activeCategory === "commerce"
                                ? (<>
                                    <div style={{ margin: "2px 0 10px" }}>
                                      <button type="button" onClick={() => setMetierOpen(o => !o)} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 6, width: "100%", background: metierOpen ? "rgba(201,168,76,0.05)" : "rgba(201,168,76,0.09)", border: `1px solid ${metierOpen ? "rgba(201,168,76,0.18)" : "rgba(201,168,76,0.3)"}`, borderRadius: 9, cursor: "pointer", padding: "9px 12px", margin: "8px 0" }}><span style={{ display: "flex", alignItems: "center", gap: 7, color: "#F5F0E8", fontSize: 12.5, fontWeight: 700 }}><span style={{ fontSize: 14 }}>✨</span> Modèles par métier</span><ChevronDown size={15} color={G} style={{ transform: metierOpen ? "rotate(180deg)" : "none", transition: "transform .2s" }} /></button>
                                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
                                        {metierOpen && COMMERCE_PRESETS.map(p => (
                                          <button key={p.key} type="button" onClick={() => generateCommercePreset(p)} title={`Crée : ${p.blocks.map(b => (BLOCK_DEFS as any)[b.type]?.label || b.type).join(", ")}`}
                                            style={{ display: "flex", alignItems: "center", gap: 7, padding: "9px 10px", borderRadius: 9, border: "1px solid rgba(201,168,76,0.18)", cursor: "pointer", background: "rgba(201,168,76,0.05)", color: "#F5F0E8", fontSize: 11, fontWeight: 600, textAlign: "left" as const, transition: "all .15s" }}
                                            onMouseEnter={e => { e.currentTarget.style.background = "rgba(201,168,76,0.12)"; e.currentTarget.style.borderColor = "rgba(201,168,76,0.4)" }}
                                            onMouseLeave={e => { e.currentTarget.style.background = "rgba(201,168,76,0.05)"; e.currentTarget.style.borderColor = "rgba(201,168,76,0.18)" }}>
                                            <span style={{ fontSize: 16 }}>{p.emoji}</span>
                                            <span style={{ flex: 1, lineHeight: 1.2 }}>{p.label}</span>
                                          </button>
                                        ))}
                                      </div>
                                    </div>
                                    <p style={subHeader}>Tous les blocs commerce</p>
                                    {catBlocks.map(([type, def]) => blockBtn(type, def))}
                                  </>)
                                : activeCategory === "social"
                                ? (<>
                                    <div style={{ margin: "2px 0 10px" }}>
                                      <button type="button" onClick={() => setMetierOpen(o => !o)} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 6, width: "100%", background: metierOpen ? "rgba(201,168,76,0.05)" : "rgba(201,168,76,0.09)", border: `1px solid ${metierOpen ? "rgba(201,168,76,0.18)" : "rgba(201,168,76,0.3)"}`, borderRadius: 9, cursor: "pointer", padding: "9px 12px", margin: "8px 0" }}><span style={{ display: "flex", alignItems: "center", gap: 7, color: "#F5F0E8", fontSize: 12.5, fontWeight: 700 }}><span style={{ fontSize: 14 }}>✨</span> Modèles par métier</span><ChevronDown size={15} color={G} style={{ transform: metierOpen ? "rotate(180deg)" : "none", transition: "transform .2s" }} /></button>
                                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
                                        {metierOpen && SOCIAL_PRESETS.map(p => (
                                          <button key={p.key} type="button" onClick={() => generateSocialPreset(p)} title={`Crée un bloc Liens sociaux : ${p.networks.join(", ")}`}
                                            style={{ display: "flex", alignItems: "center", gap: 7, padding: "9px 10px", borderRadius: 9, border: "1px solid rgba(201,168,76,0.18)", cursor: "pointer", background: "rgba(201,168,76,0.05)", color: "#F5F0E8", fontSize: 11, fontWeight: 600, textAlign: "left" as const, transition: "all .15s" }}
                                            onMouseEnter={e => { e.currentTarget.style.background = "rgba(201,168,76,0.12)"; e.currentTarget.style.borderColor = "rgba(201,168,76,0.4)" }}
                                            onMouseLeave={e => { e.currentTarget.style.background = "rgba(201,168,76,0.05)"; e.currentTarget.style.borderColor = "rgba(201,168,76,0.18)" }}>
                                            <span style={{ fontSize: 16 }}>{p.emoji}</span>
                                            <span style={{ flex: 1, lineHeight: 1.2 }}>{p.label}</span>
                                          </button>
                                        ))}
                                      </div>
                                      <p style={{ color: MUTED, fontSize: 9, margin: "6px 0 0" }}>Les liens de base sont pré-remplis : complétez-les avec votre nom d&apos;utilisateur.</p>
                                    </div>
                                    <p style={subHeader}>Tous les réseaux</p>
                                    {catBlocks.map(([type, def]) => blockBtn(type, def))}
                                  </>)
                                : activeCategory === "info"
                                ? (() => {
                                    // Sous-catégories Infos : bibliothèque de contenu organisée façon Notion.
                                    // Certains blocs sont "empruntés" à d'autres catégories (par clé) pour la découvrabilité,
                                    // sans changer leur catégorie d'origine (ils restent aussi dans Business/Actions).
                                    const INFO_GROUPS: { label: string; keys: string[] }[] = [
                                      { label: "Présentation",           keys: ["heading", "rich_text", "quote_block", "about", "announcement"] },
                                      { label: "Organisation",           keys: ["process_steps", "timeline", "values", "engagements"] },
                                      { label: "Preuves & confiance",     keys: ["testimonials", "stats_block", "trust_badge", "visit_counter", "scan_counter"] },
                                      { label: "Entreprise",              keys: ["team", "founder_message", "info_table"] },
                                      { label: "Informations pratiques",  keys: ["opening_hours", "google_maps_embed", "service_area", "on_site_services"] },
                                      { label: "Questions fréquentes",    keys: ["faq"] },
                                      { label: "Documents",               keys: ["documents", "download_file"] },
                                      { label: "Informations légales",    keys: ["legal_info", "business_certifications"] },
                                    ]
                                    const grouped = new Set(INFO_GROUPS.flatMap(g => g.keys))
                                    const rest = catBlocks.filter(([t]) => !grouped.has(t))
                                    return (<>
                                      {/* Modèles par métier : 1 clic crée une section informative complète */}
                                      <div style={{ margin: "2px 0 10px" }}>
                                        <button type="button" onClick={() => setMetierOpen(o => !o)} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 6, width: "100%", background: metierOpen ? "rgba(201,168,76,0.05)" : "rgba(201,168,76,0.09)", border: `1px solid ${metierOpen ? "rgba(201,168,76,0.18)" : "rgba(201,168,76,0.3)"}`, borderRadius: 9, cursor: "pointer", padding: "9px 12px", margin: "8px 0" }}><span style={{ display: "flex", alignItems: "center", gap: 7, color: "#F5F0E8", fontSize: 12.5, fontWeight: 700 }}><span style={{ fontSize: 14 }}>✨</span> Modèles par métier</span><ChevronDown size={15} color={G} style={{ transform: metierOpen ? "rotate(180deg)" : "none", transition: "transform .2s" }} /></button>
                                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
                                          {metierOpen && INFO_PRESETS.map(p => (
                                            <button key={p.key} type="button" onClick={() => generateInfoPreset(p)} title={`Crée : ${p.blocks.map(b => (BLOCK_DEFS as any)[b.type]?.label || b.type).join(", ")}`}
                                              style={{ display: "flex", alignItems: "center", gap: 7, minHeight: isMobile ? 46 : undefined, padding: isMobile ? "11px 11px" : "9px 10px", borderRadius: 10, border: "1px solid rgba(201,168,76,0.18)", cursor: "pointer", background: "rgba(201,168,76,0.05)", color: "#F5F0E8", fontSize: isMobile ? 12 : 11, fontWeight: 600, textAlign: "left" as const, transition: "all .15s" }}
                                              onMouseEnter={e => { e.currentTarget.style.background = "rgba(201,168,76,0.12)"; e.currentTarget.style.borderColor = "rgba(201,168,76,0.4)" }}
                                              onMouseLeave={e => { e.currentTarget.style.background = "rgba(201,168,76,0.05)"; e.currentTarget.style.borderColor = "rgba(201,168,76,0.18)" }}>
                                              <span style={{ fontSize: 16 }}>{p.emoji}</span>
                                              <span style={{ flex: 1, lineHeight: 1.2 }}>{p.label}</span>
                                            </button>
                                          ))}
                                        </div>
                                      </div>
                                      {INFO_GROUPS.map(g => {
                                        const gb = g.keys.filter(k => (BLOCK_DEFS as any)[k])
                                        if (!gb.length) return null
                                        return (
                                          <div key={g.label}>
                                            <p style={subHeader}>{g.label}</p>
                                            {gb.map(k => blockBtn(k, (BLOCK_DEFS as any)[k]))}
                                          </div>
                                        )
                                      })}
                                      {rest.length > 0 && (<div><p style={subHeader}>Autres</p>{rest.map(([t, d]) => blockBtn(t, d))}</div>)}
                                    </>)
                                  })()
                                : catBlocks.map(([type, def]) => blockBtn(type, def))
                              )}
                            </div>
                          )
                        })()}
                      </div>
                    )}
                  </>
                )}
            </div>}
          </div>

          {/* POIGNÉE RESIZE sidebar blocs (souris uniquement -> masquée en mobile) */}
          {!blocksCollapsed && !isMobile && (
            <div
              onMouseDown={blocksResize.onMouseDown}
              style={{
                width: 4, flexShrink: 0, background: "rgba(201,168,76,0.1)",
                borderRight: "1px solid rgba(201,168,76,0.1)",
                cursor: "col-resize", position: "relative", zIndex: 10,
                transition: "background 0.15s"
              }}
              onMouseEnter={e => e.currentTarget.style.background = "rgba(201,168,76,0.4)"}
              onMouseLeave={e => e.currentTarget.style.background = "rgba(201,168,76,0.1)"}
            >
              {/* Indicateur visuel */}
              <div style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%,-50%)", display: "flex", flexDirection: "column", gap: 3 }}>
                {[0,1,2].map(i => <div key={i} style={{ width: 2, height: 2, borderRadius: "50%", background: "rgba(201,168,76,0.6)" }} />)}
              </div>
            </div>
          )}

          {/* DRAWER FLOTTANT — mode réduit blocs */}
          {blocksCollapsed && drawerCategory && (
            <div ref={drawerRef} style={{ position: "absolute", left: 64, top: 0, width: 240, height: "100%", background: "#0D0D0D", borderRight: "1px solid rgba(201,168,76,0.15)", zIndex: 50, display: "flex", flexDirection: "column", boxShadow: "4px 0 24px rgba(0,0,0,0.5)" }}>
              <div style={{ padding: "10px 12px", borderBottom: "1px solid rgba(255,255,255,0.06)", display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
                  <span style={{ fontSize: 14 }}>{drawerCategory==="recents" ? "🕐" : drawerCategory==="favorites" ? "⭐" : BLOCK_CATEGORIES.find(c => c.id===drawerCategory)?.icon}</span>
                  <span style={{ color: drawerCategory==="recents" ? "var(--action)" : drawerCategory==="favorites" ? "#FFD700" : "#F5F0E8", fontSize: 12, fontWeight: 700 }}>{drawerCategory==="recents" ? `Récents (${recentBlocks.length})` : drawerCategory==="favorites" ? `Favoris (${favorites.length})` : BLOCK_CATEGORIES.find(c => c.id===drawerCategory)?.label}</span>
                  {drawerCategory!=="recents" && drawerCategory!=="favorites" && (
                    <span style={{ background: "rgba(255,255,255,0.07)", color: MUTED, borderRadius: 10, padding: "1px 7px", fontSize: 9, fontWeight: 700, marginLeft: 4 }}>
                      {catCounts[drawerCategory||""] || 0}
                    </span>
                  )}
                </div>
                <button onClick={() => setDrawerCategory(null)} style={{ background: "none", border: "none", color: MUTED, cursor: "pointer", padding: 2 }}><X size={13} /></button>
              </div>
              <div style={{ flex: 1, overflowY: "auto", padding: "5px 6px" }}>
                {(drawerCategory === "recents"
                  ? recentBlocks.filter(t => BLOCK_DEFS[t]).map(t => [t, BLOCK_DEFS[t]] as [string, (typeof BLOCK_DEFS)[string]])
                  : drawerCategory === "favorites"
                  ? Object.entries(BLOCK_DEFS).filter(([type]) => favorites.includes(type))
                  : Object.entries(BLOCK_DEFS).filter(([, def]) => def.category === drawerCategory)
                ).map(([type, def]) => (
                  <button key={type} onClick={() => { addBlock(type); setDrawerCategory(null) }}
                    style={{ width: "100%", display: "flex", alignItems: "center", gap: 9, padding: "8px 9px", background: "transparent", border: "1px solid transparent", borderRadius: 8, color: MUTED, fontSize: 12, cursor: "pointer", textAlign: "left" as const, marginBottom: 2 }}
                    onMouseEnter={e => { const el = e.currentTarget; el.style.background = BLOCK_DEFS[type]?.color+"10"; el.style.color = "#F5F0E8" }}
                    onMouseLeave={e => { const el = e.currentTarget; el.style.background = "transparent"; el.style.color = MUTED }}>
                    <div style={{ width: 28, height: 28, borderRadius: 7, background: def.color+"12", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, flexShrink: 0 }}>{def.icon}</div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ margin: 0, fontSize: 12, fontWeight: 600, color: "inherit", lineHeight: 1.2 }}>{def.label}</p>
                      <p style={{ margin: 0, fontSize: 10.5, color: MUTED, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{def.description}</p>
                    </div>
                    <button onClick={e => { e.stopPropagation(); toggleFav(type) }}
                      title={isFav(type) ? "Retirer des favoris" : "Ajouter aux favoris"}
                      style={{ width: 20, height: 20, display: "flex", alignItems: "center", justifyContent: "center", background: "none", border: "none", cursor: "pointer", flexShrink: 0, fontSize: 12, color: isFav(type) ? "#FFD700" : "rgba(255,255,255,0.25)" }}>
                      {isFav(type) ? "⭐" : "☆"}
                    </button>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* CANVAS */}
          <div style={{ flex: 1, overflowY: "auto", padding: preview && isMobile ? "0 0 96px" : isMobile ? "12px" : "20px", background: "#0A0A0A", display: isMobile && mobileTab !== "canvas" ? "none" : undefined }}
            onClick={e => { if (e.target === e.currentTarget) { setSelectedId(null); setMultiSelection([]) } }}>
            <div style={{ maxWidth: 640, margin: "0 auto" }}>
              {/* ── Toolbar flottante multi-sélection (≥2 blocs) ─────────────── */}
              {multiSelection.length >= 2 && (
                <div style={{
                  position: "sticky", top: 0, zIndex: 20, marginBottom: 10,
                  display: "flex", alignItems: "center", gap: 6,
                  padding: "8px 12px",
                  background: "rgba(8,8,8,0.92)",
                  border: `1px solid ${G}40`,
                  borderRadius: 12,
                  backdropFilter: "blur(12px)",
                  boxShadow: `0 4px 24px rgba(0,0,0,0.5), 0 0 0 1px ${G}15`,
                  animation: "popoverIn 0.15s ease",
                }}>
                  {/* Badge sélection */}
                  <div style={{ display: "flex", alignItems: "center", gap: 6, paddingRight: 8, borderRight: "1px solid rgba(255,255,255,0.08)" }}>
                    <div style={{ width: 20, height: 20, borderRadius: 6, background: G+"20", border: `1px solid ${G}40`, display: "flex", alignItems: "center", justifyContent: "center" }}>
                      <span style={{ color: G, fontSize: 9, fontWeight: 700 }}>{multiSelection.length}</span>
                    </div>
                    <span style={{ color: G, fontSize: 11, fontWeight: 700 }}>
                      {multiSelection.length} bloc{multiSelection.length>1?"s":""} sélectionné{multiSelection.length>1?"s":""}
                    </span>
                  </div>

                  <div style={{ flex: 1 }} />

                  {/* Actions */}
                  {(() => {
                    const allVisible = multiSelection.every(id => blocks.find(b => b.id===id)?.visible)
                    const allLocked = multiSelection.every(id => blocks.find(b => b.id===id)?.locked)
                    const lockedCount = multiSelection.filter(id => blocks.find(b => b.id===id)?.locked).length

                    return (<>
                      {/* Masquer/Afficher */}
                      <button onClick={toggleVisibleMulti}
                        title={allVisible ? "Masquer les blocs sélectionnés" : "Afficher les blocs sélectionnés"}
                        style={{ display: "flex", alignItems: "center", gap: 5, background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, padding: "6px 11px", color: allVisible ? MUTED : "#EF4444", fontSize: 11, cursor: "pointer", transition: "all 0.15s" }}
                        onMouseEnter={e => { e.currentTarget.style.background="rgba(255,255,255,0.1)"; e.currentTarget.style.color="#F5F0E8" }}
                        onMouseLeave={e => { e.currentTarget.style.background="rgba(255,255,255,0.05)"; e.currentTarget.style.color=allVisible?MUTED:"#EF4444" }}>
                        {allVisible ? <><EyeOff size={11} /> <span>Masquer</span></> : <><Eye size={11} /> <span>Afficher</span></>}
                      </button>

                      {/* Verrouiller/Déverrouiller */}
                      <button onClick={() => {
                          const ids = multiSelection
                          setBlocks(p => p.map(b => ids.includes(b.id) ? {...b, locked: !allLocked} : b))
                        }}
                        title={allLocked ? "Déverrouiller" : `Verrouiller${lockedCount>0?` (${lockedCount} déjà verrouillé${lockedCount>1?"s":""})`:""}`}
                        style={{ display: "flex", alignItems: "center", gap: 5, background: allLocked ? "rgba(99,102,241,0.12)" : "rgba(255,255,255,0.05)", border: `1px solid ${allLocked ? "rgba(99,102,241,0.3)" : "rgba(255,255,255,0.1)"}`, borderRadius: 8, padding: "6px 11px", color: allLocked ? "#818CF8" : MUTED, fontSize: 11, cursor: "pointer", transition: "all 0.15s" }}
                        onMouseEnter={e => { e.currentTarget.style.background="rgba(99,102,241,0.15)"; e.currentTarget.style.color="#818CF8" }}
                        onMouseLeave={e => { e.currentTarget.style.background=allLocked?"rgba(99,102,241,0.12)":"rgba(255,255,255,0.05)"; e.currentTarget.style.color=allLocked?"#818CF8":MUTED }}>
                        <span style={{ fontSize: 11 }}>{allLocked ? "🔓" : "🔒"}</span>
                        <span>{allLocked ? "Déverrouiller" : "Verrouiller"}</span>
                      </button>

                      {/* Dupliquer */}
                      <button onClick={duplicateMulti}
                        title={`Dupliquer ${multiSelection.length} blocs`}
                        style={{ display: "flex", alignItems: "center", gap: 5, background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, padding: "6px 11px", color: MUTED, fontSize: 11, cursor: "pointer", transition: "all 0.15s" }}
                        onMouseEnter={e => { e.currentTarget.style.background="rgba(255,255,255,0.1)"; e.currentTarget.style.color="#F5F0E8" }}
                        onMouseLeave={e => { e.currentTarget.style.background="rgba(255,255,255,0.05)"; e.currentTarget.style.color=MUTED }}>
                        <Copy size={11} /> <span>Dupliquer</span>
                      </button>

                      {/* Supprimer avec confirmation */}
                      <button onClick={() => {
                          const unlocked = multiSelection.filter(id => !blocks.find(b => b.id===id)?.locked)
                          if (unlocked.length === 0) return
                          const msg = `Supprimer ${unlocked.length} bloc${unlocked.length>1?"s":""}${unlocked.length<multiSelection.length?` (${multiSelection.length-unlocked.length} verrouillé${multiSelection.length-unlocked.length>1?"s":""} ignoré${multiSelection.length-unlocked.length>1?"s":""})`:""}?`
                          if (window.confirm(msg)) deleteMulti()
                        }}
                        title="Supprimer les blocs sélectionnés"
                        style={{ display: "flex", alignItems: "center", gap: 5, background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.25)", borderRadius: 8, padding: "6px 11px", color: "#EF4444", fontSize: 11, cursor: "pointer", transition: "all 0.15s" }}
                        onMouseEnter={e => { e.currentTarget.style.background="rgba(239,68,68,0.18)"; e.currentTarget.style.borderColor="rgba(239,68,68,0.5)" }}
                        onMouseLeave={e => { e.currentTarget.style.background="rgba(239,68,68,0.08)"; e.currentTarget.style.borderColor="rgba(239,68,68,0.25)" }}>
                        <Trash2 size={11} /> <span>Supprimer</span>
                      </button>
                    </>)
                  })()}

                  {/* Séparateur */}
                  <div style={{ width: 1, height: 20, background: "rgba(255,255,255,0.08)", margin: "0 2px" }} />

                  {/* Désélectionner */}
                  <button onClick={() => setMultiSelection([])} title="Désélectionner (Échap)"
                    style={{ width: 26, height: 26, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 7, color: MUTED, cursor: "pointer", fontSize: 14, fontWeight: 300 }}
                    onMouseEnter={e => { e.currentTarget.style.background="rgba(255,255,255,0.1)"; e.currentTarget.style.color="#F5F0E8" }}
                    onMouseLeave={e => { e.currentTarget.style.background="rgba(255,255,255,0.04)"; e.currentTarget.style.color=MUTED }}>
                    ×
                  </button>
                </div>
              )}
              {!preview && <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12, padding: "6px 12px", background: "rgba(10,10,10,0.8)", border: "1px solid rgba(255,255,255,0.05)", borderRadius: 9, backdropFilter: "blur(10px)", position: "sticky", top: 0, zIndex: 10 }}>
                <span style={{ fontSize: 9, letterSpacing: 2, textTransform: "uppercase", color: "#8A8478" }}>CANVAS</span>
                <span style={{ background: "rgba(201,168,76,0.08)", border: "1px solid rgba(201,168,76,0.2)", borderRadius: 6, padding: "1px 6px", fontSize: 10, color: G }}>{blocks.length} bloc{blocks.length!==1?"s":""}</span>
                {blocks.filter(b => b.draft).length > 0 && (
                  <span style={{ background: "rgba(251,191,36,0.08)", border: "1px solid rgba(251,191,36,0.25)", borderRadius: 6, padding: "1px 6px", fontSize: 10, color: "#FBBF24" }}>
                    ✏ {blocks.filter(b => b.draft).length} brouillon{blocks.filter(b => b.draft).length > 1 ? "s" : ""}
                  </span>
                )}
                {!pageId && <span style={{ color: "#8A8478", fontSize: 9, marginLeft: "auto" }}>Mode démo</span>}
              </div>}

              <div style={{ ...bgStyle(), borderRadius: 20, overflow: "hidden", minHeight: 200, position: "relative", boxShadow: "0 8px 60px rgba(0,0,0,0.6)", border: "1px solid rgba(255,255,255,0.05)" }}>
              {/* Effets overlay */}
              {(theme as any).effect_noise && (
                <div style={{ position: "absolute", inset: 0, zIndex: 1, pointerEvents: "none", opacity: (theme as any).noise_opacity ? (theme as any).noise_opacity/100 : 0.06, mixBlendMode: "overlay" as const, backgroundImage: NOISE_SVG_URL, backgroundRepeat: "repeat", backgroundSize: "128px 128px" }} />
              )}
              {(theme as any).effect_glow && <div style={{ position: "absolute", inset: 0, zIndex: 1, pointerEvents: "none", background: `radial-gradient(ellipse at 50% 0%, ${(theme as any).glow_color||"#C9A84C"}${Math.round(((theme as any).glow_intensity||40)/100*180).toString(16).padStart(2,"0")}, transparent ${(theme as any).glow_size||300}px)` }} />}
              {(theme as any).effect_overlay && <div style={{ position: "absolute", inset: 0, zIndex: 1, pointerEvents: "none", background: (theme as any).overlay_color||"#000000", opacity: ((theme as any).overlay_opacity||30)/100 }} />}
              {(theme as any).effect_vignette && <div style={{ position: "absolute", inset: 0, zIndex: 1, pointerEvents: "none", background: `radial-gradient(ellipse at 50% 50%, transparent ${Math.max(10, 100-((theme as any).vignette_intensity||40))}%, rgba(0,0,0,${((theme as any).vignette_intensity||40)/100}) 100%)` }} />}
              {(theme as any).effect_blur && (
                <div style={{ position: "absolute", inset: 0, zIndex: 1, pointerEvents: "none", backdropFilter: `blur(${(theme as any).blur_amount||4}px)`, WebkitBackdropFilter: `blur(${(theme as any).blur_amount||4}px)` }} />
              )}
              {blocks.length===0 ? (
                <div style={{ padding: "60px 30px", textAlign: "center" }}>
                  <p style={{ color: "#8A8478", fontSize: 28, margin: "0 0 8px" }}>✦</p>
                  <p style={{ color: MUTED, fontSize: 13, margin: 0 }}>Page vide — ajoute des blocs depuis la bibliothèque</p>
                </div>
              ) : blocks.map((block, idx) => {
                const def = BLOCK_DEFS[block.type]
                const isSelected = block.id === selectedId
                const isMultiSelected = multiSelection.includes(block.id)
                return (
                  <div key={block.id}
                    onClick={(e) => handleBlockClick(e, block.id, idx)}
                    style={{ fontFamily: theme.fontBody || "DM Sans, sans-serif", position: "relative", marginBottom: 0, border: "none", borderRadius: isSelected ? 10 : 0, overflow: "visible", cursor: block.locked ? "default" : "pointer", transition: "box-shadow 0.15s, background 0.1s", opacity: block.visible ? (block.draft ? 0.6 : 1) : 0.35, background: isSelected ? "rgba(201,168,76,0.05)" : isMultiSelected ? "rgba(201,168,76,0.06)" : block.draft ? "rgba(251,191,36,0.03)" : "transparent", boxShadow: isSelected ? `inset 0 0 0 2px ${G}, 0 0 0 4px ${G}1f` : isMultiSelected ? `inset 3px 0 0 ${G}80` : block.draft ? "inset 3px 0 0 rgba(251,191,36,0.5)" : block.locked ? "inset 3px 0 0 rgba(99,102,241,0.5)" : "none" }}
                    onMouseEnter={e => {
                      if (!isSelected) e.currentTarget.style.boxShadow = `inset 3px 0 0 rgba(201,168,76,0.3)`
                      const overlay = e.currentTarget.querySelector(".block-overlay") as HTMLElement
                      const handle = e.currentTarget.querySelector(".block-handle") as HTMLElement
                      if (overlay) overlay.style.opacity = "1"
                      if (handle) handle.style.opacity = "1"
                    }}
                    onMouseLeave={e => {
                      if (!isSelected) e.currentTarget.style.boxShadow = "none"
                      const overlay = e.currentTarget.querySelector(".block-overlay") as HTMLElement
                      const handle = e.currentTarget.querySelector(".block-handle") as HTMLElement
                      if (overlay) overlay.style.opacity = "0"
                      if (handle) handle.style.opacity = "0"
                    }}>

                    {!preview && <div className="block-handle" style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: 18, display: "flex", alignItems: "center", justifyContent: "center", opacity: 0, transition: "opacity 0.15s", cursor: block.locked ? "not-allowed" : "grab", zIndex: 10 }}>
                      <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                        {[0,1,2,3,4,5].map(i => <div key={i} style={{ width: 3, height: 3, borderRadius: "50%", background: "rgba(201,168,76,0.5)" }} />)}
                      </div>
                    </div>}

                    {!preview && <div className="block-overlay" style={{ position: "absolute", top: 6, right: 6, display: "flex", gap: isMobile ? 6 : 3, opacity: (isMobile && isSelected) ? 1 : 0, transition: "opacity 0.15s", zIndex: 10 }}
                      onClick={e => e.stopPropagation()}>
                      {/* #10 : uniquement Monter/Descendre + "..." ; le reste dans un bottom sheet (cibles 40px mobile, #6) */}
                      <button onClick={() => moveBlock(block.id, -1)} disabled={idx===0} title="Monter" aria-label="Monter le bloc" style={{ width: isMobile?40:24, height: isMobile?40:24, background: "rgba(15,15,15,0.92)", backdropFilter: "blur(4px)", border: "1px solid rgba(255,255,255,0.1)", color: idx===0 ? "rgba(255,255,255,0.2)" : "#F5F0E8", cursor: idx===0 ? "default" : "pointer", display: "flex", alignItems: "center", justifyContent: "center", borderRadius: 7 }}><ChevronUp size={isMobile?17:10} /></button>
                      <button onClick={() => moveBlock(block.id, 1)} disabled={idx===blocks.length-1} title="Descendre" aria-label="Descendre le bloc" style={{ width: isMobile?40:24, height: isMobile?40:24, background: "rgba(15,15,15,0.92)", backdropFilter: "blur(4px)", border: "1px solid rgba(255,255,255,0.1)", color: idx===blocks.length-1 ? "rgba(255,255,255,0.2)" : "#F5F0E8", cursor: idx===blocks.length-1 ? "default" : "pointer", display: "flex", alignItems: "center", justifyContent: "center", borderRadius: 7 }}><ChevronDown size={isMobile?17:10} /></button>
                      <button onClick={e => { e.stopPropagation(); setBlockMenu(block.id) }} title="Plus d'actions" aria-label="Plus d'actions" style={{ width: isMobile?40:24, height: isMobile?40:24, background: "rgba(15,15,15,0.92)", backdropFilter: "blur(4px)", border: "1px solid rgba(255,255,255,0.1)", color: "#F5F0E8", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", borderRadius: 7 }}><MoreHorizontal size={isMobile?17:12} /></button>
                    </div>}

                    {!preview && isSelected && (
                      <div style={{ position: "absolute", bottom: 6, left: 22, display: "flex", alignItems: "center", gap: 4, background: "rgba(8,8,8,0.88)", backdropFilter: "blur(4px)", border: `1px solid ${G}25`, borderRadius: 6, padding: "2px 7px", zIndex: 10 }}>
                        <span style={{ fontSize: 10 }}>{def?.icon}</span>
                        <span style={{ color: G, fontSize: 9, fontWeight: 700 }}>{def?.label}</span>
                      </div>
                    )}
                    {block.draft && !block.locked && (
                      <div style={{ position: "absolute", top: 6, left: 22, display: "flex", alignItems: "center", gap: 4, background: "rgba(251,191,36,0.12)", border: "1px solid rgba(251,191,36,0.35)", borderRadius: 5, padding: "2px 7px", zIndex: 10, pointerEvents: "none" }}>
                        <span style={{ fontSize: 8 }}>✏️</span>
                        <span style={{ color: "#FBBF24", fontSize: 8, fontWeight: 700, letterSpacing: 1, textTransform: "uppercase" as const }}>Brouillon</span>
                      </div>
                    )}
                    {block.locked && (
                      <div style={{ position: "absolute", top: 6, right: 8, display: "flex", alignItems: "center", gap: 3, background: "rgba(99,102,241,0.1)", border: "1px solid rgba(99,102,241,0.3)", borderRadius: 5, padding: "2px 6px", zIndex: 10, pointerEvents: "none" }}>
                        <span style={{ fontSize: 8 }}>🔒</span>
                        <span style={{ color: "#818CF8", fontSize: 8, fontWeight: 700, letterSpacing: 1, textTransform: "uppercase" as const }}>Verrouillé</span>
                      </div>
                    )}
                    {clickCounts[block.id] > 0 && (
                      <div title={`${clickCounts[block.id]} clic${clickCounts[block.id] > 1 ? "s" : ""} sur 90 jours`} style={{ position: "absolute", bottom: 6, right: 8, display: "flex", alignItems: "center", gap: 3, background: "rgba(57,255,143,0.12)", border: "1px solid rgba(57,255,143,0.3)", borderRadius: 20, padding: "2px 8px", zIndex: 10, pointerEvents: "none" }}>
                        <span style={{ fontSize: 9 }}>👆</span>
                        <span style={{ color: "var(--success)", fontSize: 9, fontWeight: 700 }}>{clickCounts[block.id]} clic{clickCounts[block.id] > 1 ? "s" : ""}</span>
                      </div>
                    )}

                    <div style={{ overflow: "hidden", minHeight: 36, position: "relative", zIndex: 2, ...blockDecoration(block.content, theme).style }}>
                      <PreviewBoundary><BlockPreview block={block} theme={theme} dayMode={dayMode} /></PreviewBoundary>
                    </div>
                  </div>
                )
              })}

              {!preview && <button onClick={() => { setActiveCategory("identity"); setSearch("") }}
                style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "center", gap: 10, background: "rgba(201,168,76,0.04)", border: "2px dashed rgba(201,168,76,0.2)", borderRadius: 14, padding: "18px", color: MUTED, fontSize: 14, fontWeight: 600, cursor: "pointer", marginTop: 8, transition: "all 0.2s" }}
                onMouseEnter={e => { e.currentTarget.style.borderColor="rgba(201,168,76,0.5)"; e.currentTarget.style.color=G; e.currentTarget.style.background="rgba(201,168,76,0.08)"; e.currentTarget.style.transform="translateY(-1px)" }}
                onMouseLeave={e => { e.currentTarget.style.borderColor="rgba(201,168,76,0.2)"; e.currentTarget.style.color=MUTED; e.currentTarget.style.background="rgba(201,168,76,0.04)"; e.currentTarget.style.transform="translateY(0)" }}>
                <div style={{ width: 28, height: 28, borderRadius: "50%", background: "rgba(201,168,76,0.1)", border: "1px solid rgba(201,168,76,0.2)", display: "flex", alignItems: "center", justifyContent: "center" }}><Plus size={14} color={G} /></div>
                Ajouter un nouveau bloc
              </button>}
              {!preview && <button onClick={() => setShowTemplates(true)}
                style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "center", gap: 8, background: "transparent", border: "none", color: MUTED, fontSize: 12, cursor: "pointer", marginTop: 10 }}
                onMouseEnter={e => e.currentTarget.style.color = G} onMouseLeave={e => e.currentTarget.style.color = MUTED}>
                ✨ ou partir d&apos;un modèle de page complet
              </button>}
              </div>
            </div>
          </div>

          {/* PANEL DROIT */}
          {/* POIGNÉE RESIZE panel droit (souris uniquement -> masquée en mobile) */}
          {!rightCollapsed && !isMobile && (
            <div
              onMouseDown={rightResize.onMouseDown}
              style={{
                width: 4, flexShrink: 0, background: "rgba(201,168,76,0.1)",
                borderLeft: "1px solid rgba(201,168,76,0.1)",
                cursor: "col-resize", position: "relative", zIndex: 10,
                transition: "background 0.15s"
              }}
              onMouseEnter={e => e.currentTarget.style.background = "rgba(201,168,76,0.4)"}
              onMouseLeave={e => e.currentTarget.style.background = "rgba(201,168,76,0.1)"}
            >
              <div style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%,-50%)", display: "flex", flexDirection: "column", gap: 3 }}>
                {[0,1,2].map(i => <div key={i} style={{ width: 2, height: 2, borderRadius: "50%", background: "rgba(201,168,76,0.6)" }} />)}
              </div>
            </div>
          )}
          <div style={{ width: isMobile ? "100%" : (rightCollapsed ? 48 : rightResize.width), background: "#161616", borderLeft: "none", display: isMobile && mobileTab !== "panel" ? "none" : "flex", flexDirection: "column", flexShrink: isMobile ? 1 : 0, overflow: "hidden", transition: rightCollapsed ? "width 0.25s ease" : "none", position: "relative" }}>
            <div style={{ display: "flex", borderBottom: "1px solid rgba(255,255,255,0.06)", flexShrink: 0 }}>
              {rightCollapsed
                ? /* Mode réduit: onglets verticaux */
                  <div style={{ display: "flex", flexDirection: "column", width: "100%", gap: 0 }}>
                    {(["preview","edit","theme"] as const).map(tab => (
                      <button key={tab} onClick={() => { setRightTab(tab); setRightCollapsed(false) }}
                        style={{ padding: "14px 4px", background: "transparent", border: "none", borderLeft: `2px solid ${rightTab===tab ? G : "transparent"}`, color: rightTab===tab ? G : MUTED, fontSize: 9, fontWeight: rightTab===tab ? 700 : 400, cursor: "pointer", writingMode: "vertical-rl" as const, textOrientation: "mixed" as const, letterSpacing: 1 }}>
                        {tab==="preview" ? "▶" : tab==="edit" ? "✏" : "🎨"}
                      </button>
                    ))}
                    <button onClick={toggleRight} style={{ padding: "12px 4px", background: "none", border: "none", color: MUTED, cursor: "pointer", fontSize: 14, marginTop: "auto" }}>›</button>
                  </div>
                : /* Mode normal: onglets horizontaux */
                  <>
                    {(["preview","edit","theme"] as const).map(tab => (
                      <button key={tab} onClick={() => setRightTab(tab)}
                        style={{ flex: 1, padding: "11px 4px", background: "transparent", border: "none", borderBottom: `2px solid ${rightTab===tab ? G : "transparent"}`, color: rightTab===tab ? G : MUTED, fontSize: 12, fontWeight: rightTab===tab ? 700 : 400, cursor: "pointer", transition: "all 0.15s" }}>
                        {tab==="preview" ? "Aperçu" : tab==="edit" ? "Éditer" : "Thème"}
                      </button>
                    ))}
                    <button onClick={toggleRight} title="Réduire" style={{ padding: "11px 8px", background: "none", border: "none", color: MUTED, cursor: "pointer", fontSize: 12 }}>‹</button>
                  </>
              }
            </div>

            {!rightCollapsed && rightTab==="preview" && (
              <div style={{ flex: 1, overflowY: "auto", padding: "14px 10px" }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                    <span style={{ fontSize: 12, color: "#F5F0E8", fontWeight: 600 }}>Aperçu live</span>
                    <div style={{ width: 6, height: 6, borderRadius: "50%", background: "var(--success)", animation: "pulse 2s infinite" }} />
                  </div>
                  {pageSlug && <a href={`/${pageSlug}`} target="_blank" rel="noopener noreferrer" style={{ display: "flex", alignItems: "center", gap: 4, background: "rgba(201,168,76,0.1)", border: "1px solid rgba(201,168,76,0.3)", borderRadius: 7, padding: "5px 10px", color: G, textDecoration: "none", fontSize: 10, fontWeight: 700 }}><ExternalLink size={10} /> Voir en direct</a>}
                </div>

                {/* Score de profil (lecture seule, non-IA) — complétude + suggestions cliquables */}
                {(() => {
                  const pb = blocks.find(b => b.type === "profile")
                  const selPb = () => { if (pb) { setSelectedId(pb.id); setRightTab("edit") } else addBlock("profile") }
                  const checks: { label: string; ok: boolean; act: () => void }[] = [
                    { label: "Photo de profil", ok: !!pb?.content.avatar, act: selPb },
                    { label: "Accroche", ok: !!(pb?.content.tagline || "").trim(), act: selPb },
                    { label: "Bio", ok: blocks.some(b => (b.type === "bio" || b.type === "about") && (b.content.text || "").trim()), act: () => addBlock("bio") },
                    { label: "Badge de confiance", ok: !!(pb?.content.badge || "").trim() || blocks.some(b => ["availability", "certifications", "business_stats", "google_reviews_block"].includes(b.type)), act: () => addBlock("availability") },
                    { label: "Bouton d'action", ok: blocks.some(b => b.type === "cta_button"), act: () => addBlock("cta_button") },
                    { label: "Réseaux sociaux", ok: blocks.some(b => b.type === "social_links"), act: () => addBlock("social_links") },
                    { label: "Localisation", ok: blocks.some(b => b.type === "google_maps"), act: () => addBlock("google_maps") },
                  ]
                  const score = Math.round((checks.filter(c => c.ok).length / checks.length) * 100)
                  const col = score >= 80 ? "var(--success)" : score >= 50 ? "#F59E0B" : "var(--danger)"
                  const missing = checks.filter(c => !c.ok).slice(0, 3)
                  return (
                    <div style={{ marginBottom: 14, borderRadius: 12, background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)", overflow: "hidden" }}>
                      {/* Pastille compacte (repli par defaut) — ne prend plus l'aperçu en otage (#16) */}
                      <button type="button" onClick={() => setScoreOpen(o => !o)}
                        style={{ width: "100%", display: "flex", alignItems: "center", gap: 10, padding: "9px 12px", background: "none", border: "none", cursor: missing.length ? "pointer" : "default", textAlign: "left" as const }}>
                        <span style={{ width: 34, height: 34, borderRadius: "50%", flexShrink: 0, background: col + "1e", border: `1.5px solid ${col}66`, display: "flex", alignItems: "center", justifyContent: "center", color: col, fontSize: 11, fontWeight: 800 }}>{score}%</span>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <p style={{ color: "#F5F0E8", fontSize: 12.5, fontWeight: 700, margin: 0 }}>Qualité du profil</p>
                          <p style={{ color: MUTED, fontSize: 10.5, margin: 0 }}>{missing.length ? `${missing.length} amélioration${missing.length > 1 ? "s" : ""} possible${missing.length > 1 ? "s" : ""}` : "Profil complet 🎉"}</p>
                        </div>
                        {missing.length > 0 && <ChevronDown size={16} color={MUTED} style={{ transform: scoreOpen ? "rotate(180deg)" : "none", transition: "transform .2s", flexShrink: 0 }} />}
                      </button>
                      {scoreOpen && missing.length > 0 && (
                        <div style={{ padding: "0 12px 12px", display: "flex", flexDirection: "column", gap: 5 }}>
                          <div style={{ height: 6, borderRadius: 4, background: "rgba(255,255,255,0.08)", overflow: "hidden", marginBottom: 3 }}>
                            <div style={{ height: "100%", width: `${Math.max(4, score)}%`, borderRadius: 4, background: col, transition: "width .5s cubic-bezier(.2,.8,.2,1)" }} />
                          </div>
                          {missing.map(c => (
                            <button key={c.label} type="button" onClick={c.act}
                              style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, width: "100%", padding: "9px 10px", borderRadius: 8, background: "rgba(201,168,76,0.06)", border: "1px solid rgba(201,168,76,0.18)", color: "#E8E2D6", fontSize: 11.5, cursor: "pointer", textAlign: "left" as const }}>
                              <span>Ajoutez : <strong style={{ color: G }}>{c.label}</strong></span>
                              <span style={{ color: G, flexShrink: 0, fontSize: 14, lineHeight: 1 }}>+</span>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  )
                })()}

                <div style={{ display: "flex", justifyContent: "center" }}>
                  <div style={{ position: "relative", width: isMobile ? 302 : 220 }}>
                    <div style={{ width: isMobile ? 302 : 220, background: "linear-gradient(145deg,#2A2A2A,#1A1A1A)", borderRadius: isMobile ? 40 : 34, padding: "10px 8px", boxShadow: "0 0 0 1px #3A3A3A, 0 20px 60px rgba(0,0,0,0.8), inset 0 1px 0 rgba(255,255,255,0.08)", position: "relative" }}>
                      <div style={{ position: "absolute", left: -3, top: 68, width: 3, height: 24, background: "#2A2A2A", borderRadius: "2px 0 0 2px" }} />
                      <div style={{ position: "absolute", left: -3, top: 100, width: 3, height: 38, background: "#2A2A2A", borderRadius: "2px 0 0 2px" }} />
                      <div style={{ position: "absolute", left: -3, top: 146, width: 3, height: 38, background: "#2A2A2A", borderRadius: "2px 0 0 2px" }} />
                      <div style={{ position: "absolute", right: -3, top: 96, width: 3, height: 58, background: "#2A2A2A", borderRadius: "0 2px 2px 0" }} />

                      <div style={{ borderRadius: 26, overflow: "hidden", ...bgStyle(), position: "relative" }}>
                        {/* Overlays sync canvas */}
                        {(theme as any).effect_noise && <div style={{ position:"absolute",inset:0,zIndex:2,pointerEvents:"none",opacity:(theme as any).noise_opacity?((theme as any).noise_opacity/100):0.06,mixBlendMode:"overlay" as const,backgroundImage:NOISE_SVG_URL,backgroundRepeat:"repeat",backgroundSize:"128px 128px",borderRadius:26 }} />}
                        {(theme as any).effect_glow && <div style={{ position:"absolute",inset:0,zIndex:2,pointerEvents:"none",background:`radial-gradient(ellipse at 50% 0%, ${(theme as any).glow_color||"#C9A84C"}${Math.round(((theme as any).glow_intensity||40)/100*180).toString(16).padStart(2,"0")}, transparent ${(theme as any).glow_size||300}px)`,borderRadius:26 }} />}
                        {(theme as any).effect_overlay && <div style={{ position:"absolute",inset:0,zIndex:2,pointerEvents:"none",background:(theme as any).overlay_color||"#000000",opacity:((theme as any).overlay_opacity||30)/100,borderRadius:26 }} />}
                        {(theme as any).effect_vignette && <div style={{ position:"absolute",inset:0,zIndex:2,pointerEvents:"none",background:`radial-gradient(ellipse at 50% 50%, transparent ${Math.max(10,100-((theme as any).vignette_intensity||40))}%, rgba(0,0,0,${((theme as any).vignette_intensity||40)/100}) 100%)`,borderRadius:26 }} />}
                        <div style={{ background: dayMode ? "#FAFAFA" : (theme.bgGradient||theme.bg), padding: "9px 0 3px", display: "flex", justifyContent: "center", position: "relative" }}>
                          <div style={{ width: 78, height: 20, background: "#000", borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center", gap: 4 }}>
                            <div style={{ width: 7, height: 7, borderRadius: "50%", background: "#111", border: "1px solid #222" }} />
                            <div style={{ width: 36, height: 7, borderRadius: 3.5, background: "#111" }} />
                          </div>
                          <div style={{ position: "absolute", right: 12, top: 5, display: "flex", gap: 3, alignItems: "center" }}>
                            <span style={{ color: dayMode ? "#333" : "#F5F0E8", fontSize: 6, fontWeight: 600, opacity: 0.6 }}>9:41</span>
                            <div style={{ width: 10, height: 5, border: `1px solid ${dayMode?"#333":"#F5F0E8"}`, borderRadius: 1.5, opacity: 0.5 }}><div style={{ width: "75%", height: "100%", background: "var(--success)", borderRadius: 1 }} /></div>
                          </div>
                        </div>

                        <div style={{ maxHeight: isMobile ? 560 : 420, overflowY: "auto", ...bgStyle() }} className="iphone-scroll">
                          {blocks.filter(b => b.visible).length===0
                            ? <div style={{ padding: "40px 14px", textAlign: "center", ...bgStyle() }}><p style={{ fontSize: 24, margin: "0 0 6px" }}>✦</p><p style={{ color: MUTED, fontSize: 10 }}>Ta page apparaîtra ici</p></div>
                            : blocks.filter(b => b.visible && !b.draft).map(b => (
                              <div key={b.id} onClick={() => { setSelectedId(b.id); setRightTab("edit") }} style={{ cursor: "pointer", ...blockDecoration(b.content, theme).style }}
                                onMouseEnter={e => e.currentTarget.style.opacity="0.85"}
                                onMouseLeave={e => e.currentTarget.style.opacity="1"}>
                                <PreviewBoundary><BlockPreview block={b} theme={theme} dayMode={dayMode} /></PreviewBoundary>
                              </div>
                            ))}
                          <div style={{ padding: "8px", textAlign: "center", ...bgStyle() }}>
                            <p style={{ color: MUTED, fontSize: 7, margin: 0, opacity: 0.4 }}>Créé avec QRowg</p>
                          </div>
                        </div>

                        <div style={{ ...bgStyle(), padding: "5px 0 7px", display: "flex", justifyContent: "center" }}>
                          <div style={{ width: 72, height: 3.5, background: dayMode ? "rgba(0,0,0,0.2)" : "rgba(255,255,255,0.2)", borderRadius: 2 }} />
                        </div>
                      </div>
                    </div>
                    <div style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, borderRadius: 34, background: "linear-gradient(135deg,rgba(255,255,255,0.04) 0%,transparent 40%)", pointerEvents: "none" }} />
                  </div>
                </div>

                <div style={{ marginTop: 22, display: "flex", flexDirection: "column", alignItems: "center", gap: 18 }}>
                  <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 10 }}>
                    <p style={{ color: MUTED, fontSize: 10, margin: 0, textTransform: "uppercase", letterSpacing: 1.5, fontWeight: 600 }}>QR Code</p>
                    {qrTarget
                      ? <div style={{ background: "#FFFFFF", border: "3px solid rgba(201,168,76,0.3)", borderRadius: 14, padding: 9, boxShadow: "0 8px 30px rgba(0,0,0,0.5)" }}>
                          <QRCanvas value={qrTarget} size={130} />
                        </div>
                      : <div style={{ background: "#FFFFFF", border: "3px solid rgba(201,168,76,0.2)", borderRadius: 14, width: 130, height: 130, display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 8px 30px rgba(0,0,0,0.4)" }}>
                          <QrCode size={48} color="#C9A84C" />
                        </div>}
                    <div style={{ display: "flex", alignItems: "center", gap: 5, background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 20, padding: "3px 10px" }}>
                      <div style={{ width: 5, height: 5, borderRadius: "50%", background: pageStatus==="published" ? "var(--success)" : MUTED, boxShadow: pageStatus==="published" ? "0 0 5px var(--success)70" : "none" }} />
                      <span style={{ color: MUTED, fontSize: 9, fontFamily: "monospace" }}>{qrShortCode ? `/q/${qrShortCode}` : "en attente"}</span>
                    </div>
                  </div>

                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 9, width: "100%" }}>
                    <div style={{ background: "rgba(201,168,76,0.06)", border: "1px solid rgba(201,168,76,0.18)", borderRadius: 11, padding: "12px 10px", textAlign: "center" }}>
                      <p style={{ color: G, fontSize: 24, fontWeight: 700, margin: "0 0 2px", fontFamily: "Fraunces, serif", lineHeight: 1 }}>{pageStats.views.toLocaleString("fr-FR")}</p>
                      <p style={{ color: MUTED, fontSize: 9, margin: 0 }}>👁 Vues</p>
                    </div>
                    <div style={{ background: "rgba(57,255,143,0.06)", border: "1px solid rgba(57,255,143,0.18)", borderRadius: 11, padding: "12px 10px", textAlign: "center" }}>
                      <p style={{ color: "var(--success)", fontSize: 24, fontWeight: 700, margin: "0 0 2px", fontFamily: "Fraunces, serif", lineHeight: 1 }}>{pageStats.scans.toLocaleString("fr-FR")}</p>
                      <p style={{ color: MUTED, fontSize: 9, margin: 0 }}>📱 Scans</p>
                    </div>
                  </div>

                  <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 7, padding: "7px 14px", background: pageStatus==="published" ? "rgba(57,255,143,0.06)" : "rgba(255,255,255,0.03)", border: `1px solid ${pageStatus==="published" ? "rgba(57,255,143,0.2)" : "rgba(255,255,255,0.07)"}`, borderRadius: 20 }}>
                    <div style={{ width: 6, height: 6, borderRadius: "50%", background: pageStatus==="published" ? "var(--success)" : MUTED, boxShadow: pageStatus==="published" ? "0 0 5px var(--success)50" : "none" }} />
                    <span style={{ color: pageStatus==="published" ? "var(--success)" : MUTED, fontSize: 10, fontWeight: 600 }}>{pageStatus==="published" ? "En ligne" : "Brouillon"}</span>
                    <span style={{ color: MUTED, fontSize: 9 }}>• {blocks.filter(b=>b.visible).length} bloc{blocks.filter(b=>b.visible).length!==1?"s":""}</span>
                  </div>
                </div>
              </div>
            )}

            {!rightCollapsed && rightTab==="edit" && (
              <div style={{ flex: 1, overflowY: "auto", padding: 14 }}>
                {!selectedBlock
                  ? <div style={{ textAlign: "center", padding: "50px 14px" }}>
                      <Settings size={28} color={MUTED} style={{ margin: "0 auto 8px", opacity: 0.2, display: "block" }} />
                      <p style={{ color: MUTED, fontSize: 12, margin: 0, lineHeight: 1.7 }}>Clique sur un bloc dans le canvas pour l&apos;éditer</p>
                    </div>
                  : <>
                      <div style={{ display: "flex", alignItems: "center", gap: 9, marginBottom: 16, paddingBottom: 12, borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
                        <div style={{ background: `${BLOCK_DEFS[selectedBlock.type]?.color||G}12`, border: `1px solid ${BLOCK_DEFS[selectedBlock.type]?.color||G}25`, borderRadius: 8, width: 34, height: 34, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16 }}>
                          {BLOCK_DEFS[selectedBlock.type]?.icon}
                        </div>
                        <div>
                          <p style={{ color: "#F5F0E8", fontSize: 12, fontWeight: 700, margin: 0 }}>{BLOCK_DEFS[selectedBlock.type]?.label}</p>
                          <p style={{ color: MUTED, fontSize: 10, margin: 0 }}>{BLOCK_DEFS[selectedBlock.type]?.description}</p>
                        </div>
                        <div style={{ marginLeft: "auto", display: "flex", gap: 4 }}>
                          {/* #11 : une seule action "..." -> meme bottom sheet que l'overlay (dup/masquer/verrouiller/brouillon/supprimer) */}
                          <button onClick={() => setBlockMenu(selectedBlock.id)} title="Plus d'actions" aria-label="Plus d'actions" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 8, width: isMobile ? 34 : 26, height: isMobile ? 34 : 26, cursor: "pointer", color: "#F5F0E8", display: "flex", alignItems: "center", justifyContent: "center" }}><MoreHorizontal size={isMobile ? 17 : 13} /></button>
                        </div>
                      </div>
                      {(() => {
                        const bc = selectedBlock.content as any
                        const set = (k: string, v: string) => updateBlock(selectedBlock.id, k, v)
                        const selStyle: React.CSSProperties = { width: "100%", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(201,168,76,0.2)", borderRadius: 8, color: "#F5F0E8", fontSize: 12, padding: "7px 9px", cursor: "pointer" }
                        const labelStyle: React.CSSProperties = { color: MUTED, fontSize: 11, display: "block", marginBottom: 4, fontWeight: 500 }
                        const secTitle: React.CSSProperties = { color: MUTED, fontSize: 10, fontWeight: 700, letterSpacing: 1, textTransform: "uppercase", margin: "0 0 9px" }
                        // Helpers appelés en ligne (sel/toggle) au lieu de composants JSX — évite un remontage à chaque rendu.
                        const sel = (k: string, label: string, options: string[], def: string) => (
                          <div>
                            <label style={labelStyle}>{label}</label>
                            <Segmented value={bc[k] || def} options={options} onChange={v => set(k, v)} active={G} muted={MUTED} />
                          </div>
                        )
                        const toggle = (k: string, label: string, icon: string) => {
                          const on = bc[k] === "Oui"
                          return (
                            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "6px 0" }}>
                              <span style={{ color: "#F5F0E8", fontSize: 12, display: "flex", alignItems: "center", gap: 7 }}><span>{icon}</span>{label}</span>
                              <button onClick={() => set(k, on ? "" : "Oui")}
                                style={{ width: 42, height: 24, borderRadius: 12, background: on ? G : "rgba(255,255,255,0.12)", border: "none", cursor: "pointer", position: "relative", transition: "background .2s", flexShrink: 0 }}>
                                <span style={{ position: "absolute", top: 3, left: on ? 21 : 3, width: 18, height: 18, borderRadius: "50%", background: "#fff", transition: "left .2s", boxShadow: "0 1px 4px rgba(0,0,0,0.3)" }} />
                              </button>
                            </div>
                          )
                        }
                        const active = STYLE_COPY_KEYS.some(k => bc[k] && !["Aucun", "Défaut", "Non", "Normale", "Aucune", "Plein", ""].includes(bc[k]))
                        const applyPreset = (apply: Record<string, string>) => setBlocks(p => p.map(b => b.id === selectedBlock.id ? { ...b, content: { ...b.content, ...apply } } : b))
                        const TABS = [
                          { k: "contenu", label: "Contenu" },
                          { k: "style", label: "Style" },
                          { k: "layout", label: "Mise en page" },
                          { k: "avance", label: "Avancé" },
                        ] as const
                        return (
                          <>
                            {/* Onglets d'édition du bloc — visibles seulement en mode Expert (audit #10 : un seul contexte) */}
                            {expertMode && (
                            <div style={{ display: "flex", gap: 3, background: "rgba(255,255,255,0.03)", borderRadius: 10, padding: 3, margin: "0 0 14px" }}>
                              {TABS.map(t => (
                                <button key={t.k} onClick={() => setEditTab(t.k)}
                                  style={{ flex: 1, minHeight: isMobile ? 42 : undefined, padding: isMobile ? "10px 3px" : "7px 3px", borderRadius: 8, border: "none", cursor: "pointer", background: editTab===t.k ? G : "transparent", color: editTab===t.k ? "#080808" : MUTED, fontSize: isMobile ? 11.5 : 10, fontWeight: editTab===t.k ? 800 : 600, transition: "all .15s", whiteSpace: "nowrap" as const }}>{t.label}</button>
                              ))}
                            </div>
                            )}

                            {/* CONTENU — toujours affiché en mode Simple, ou sous l'onglet Contenu en Expert */}
                            {(!expertMode || editTab === "contenu") && <EditPanel key={selectedBlock.id+"-c"} block={selectedBlock} onChange={set} only="content" />}

                            {/* MISE EN PAGE */}
                            {expertMode && editTab === "layout" && (
                              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                                <EditPanel key={selectedBlock.id+"-l"} block={selectedBlock} onChange={set} only="layout" />
                                {sel("__width", "Largeur du bloc", BLOCK_WIDTH_OPTIONS, "Normale")}
                                {sel("__space", "Espacement vertical", BLOCK_SPACE_OPTIONS, "Défaut")}
                              </div>
                            )}

                            {/* STYLE */}
                            {expertMode && editTab === "style" && (
                              <div>
                                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", margin: "0 0 10px" }}>
                                  <p style={secTitle}>Modèles d&apos;apparence</p>
                                  {active && <button onClick={() => STYLE_COPY_KEYS.forEach(k => set(k, ""))} title="Réinitialiser l'apparence de ce bloc"
                                    style={{ background: "none", border: "none", color: MUTED, fontSize: 10, cursor: "pointer", textDecoration: "underline" }}>Réinitialiser</button>}
                                </div>
                                {/* Copier / coller le style entre blocs */}
                                <div style={{ display: "flex", gap: 6, marginBottom: 12 }}>
                                  <button onClick={() => setStyleClipboard(Object.fromEntries(STYLE_COPY_KEYS.map(k => [k, bc[k] || ""])))} title="Copier l'apparence de ce bloc"
                                    style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 6, padding: "8px", borderRadius: 8, border: "1px solid rgba(255,255,255,0.1)", background: "rgba(255,255,255,0.04)", color: "#F5F0E8", fontSize: 11, fontWeight: 600, cursor: "pointer" }}>
                                    <Copy size={11} /> Copier le style
                                  </button>
                                  <button onClick={() => { if (styleClipboard) applyPreset(styleClipboard) }} disabled={!styleClipboard} title={styleClipboard ? "Appliquer l'apparence copiée" : "Copiez d'abord le style d'un bloc"}
                                    style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 6, padding: "8px", borderRadius: 8, border: `1px solid ${styleClipboard ? "rgba(201,168,76,0.3)" : "rgba(255,255,255,0.07)"}`, background: styleClipboard ? "rgba(201,168,76,0.08)" : "rgba(255,255,255,0.02)", color: styleClipboard ? G : "rgba(255,255,255,0.25)", fontSize: 11, fontWeight: 600, cursor: styleClipboard ? "pointer" : "not-allowed" }}>
                                    📋 Coller le style
                                  </button>
                                </div>
                                <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 14 }}>
                                  {BLOCK_STYLE_PRESETS.map(p => (
                                    <button key={p.key} onClick={() => applyPreset(p.apply)} title={`Appliquer le style ${p.label}`}
                                      style={{ display: "flex", alignItems: "center", gap: 5, padding: "6px 10px", borderRadius: 8, border: "1px solid rgba(201,168,76,0.2)", background: "rgba(201,168,76,0.05)", color: "#F5F0E8", fontSize: 11, fontWeight: 600, cursor: "pointer" }}
                                      onMouseEnter={e => { e.currentTarget.style.background = "rgba(201,168,76,0.12)"; e.currentTarget.style.borderColor = "rgba(201,168,76,0.4)" }}
                                      onMouseLeave={e => { e.currentTarget.style.background = "rgba(201,168,76,0.05)"; e.currentTarget.style.borderColor = "rgba(201,168,76,0.2)" }}>
                                      <span style={{ fontSize: 13 }}>{p.emoji}</span>{p.label}
                                    </button>
                                  ))}
                                </div>
                                <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                                  {/* Fond dégradé — sélecteur visuel (swatches), fini le menu natif blanc */}
                                  <div>
                                    <label style={labelStyle}>Fond dégradé</label>
                                    <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 6 }}>
                                      {[["Aucun", "transparent"] as const, ...Object.entries(BLOCK_GRADIENTS)].map(([name, val]) => {
                                        const sel = (bc.__grad || "Aucun") === name
                                        return (
                                          <button key={name} onClick={() => set("__grad", name === "Aucun" ? "" : name)} title={name}
                                            style={{ height: 34, borderRadius: 8, cursor: "pointer", border: sel ? `2px solid ${G}` : "1px solid rgba(255,255,255,0.12)", background: name === "Aucun" ? "repeating-conic-gradient(rgba(255,255,255,0.06) 0% 25%, transparent 0% 50%) 50% / 10px 10px" : val, position: "relative", padding: 0 }}>
                                            {name === "Aucun" && <span style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 8, color: MUTED }}>Aucun</span>}
                                            {sel && name !== "Aucun" && <span style={{ position: "absolute", top: 2, right: 3, color: "#fff", fontSize: 10, textShadow: "0 1px 2px rgba(0,0,0,0.6)" }}>✓</span>}
                                          </button>
                                        )
                                      })}
                                    </div>
                                  </div>
                                  {(!bc.__grad || bc.__grad === "Aucun") && (
                                    <div>
                                      <label style={labelStyle}>Fond (couleur unie)</label>
                                      <div style={{ display: "flex", gap: 7 }}>
                                        <input type="color" value={bc.__bg || "#111111"} onChange={e => set("__bg", e.target.value)} style={{ width: 34, height: 32, border: "none", borderRadius: 6, cursor: "pointer", padding: 0, background: "none" }} />
                                        <input type="text" value={bc.__bg || ""} onChange={e => set("__bg", e.target.value)} placeholder="Aucun (transparent)" style={{ ...selStyle, flex: 1, cursor: "text" }} />
                                        {bc.__bg && <button onClick={() => set("__bg", "")} title="Retirer le fond" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, color: MUTED, cursor: "pointer", padding: "0 9px", fontSize: 12 }}>✕</button>}
                                      </div>
                                    </div>
                                  )}
                                  {/* Intensité : n'a de sens que si un fond est actif */}
                                  {((bc.__grad && bc.__grad !== "Aucun") || (bc.__bg && bc.__bg.startsWith("#"))) && (
                                    <div>
                                      <label style={labelStyle}>Intensité du fond</label>
                                      <Segmented value={bc.__intensity || "Plein"} options={BLOCK_INTENSITY_OPTIONS} onChange={v => set("__intensity", v)} active={G} muted={MUTED} />
                                      <p style={{ color: MUTED, fontSize: 9.5, margin: "4px 0 0" }}>« Léger » laisse transparaître le fond de la page — plus doux, texte toujours lisible.</p>
                                    </div>
                                  )}
                                  {toggle("__border", "Bordure", "⬜")}
                                  {sel("__radius", "Coins arrondis", BLOCK_RADIUS_OPTIONS, "Défaut")}
                                  {sel("__shadow", "Ombre", BLOCK_SHADOW_OPTIONS, "Non")}
                                  {toggle("__glow", "Halo lumineux (glow)", "✨")}
                                  {toggle("__glass", "Effet verre (flou)", "🧊")}
                                </div>
                              </div>
                            )}

                            {/* AVANCÉ */}
                            {expertMode && editTab === "avance" && (
                              <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                                <div>
                                  <p style={secTitle}>Visibilité</p>
                                  {[
                                    { key: "hide_mobile", label: "Afficher sur mobile", icon: "📱" },
                                    { key: "hide_desktop", label: "Afficher sur ordinateur", icon: "🖥️" },
                                  ].map(o => {
                                    const shown = bc[o.key] !== "yes" // "yes" = masqué
                                    return (
                                      <div key={o.key} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "7px 0" }}>
                                        <span style={{ color: "#F5F0E8", fontSize: 12, display: "flex", alignItems: "center", gap: 7 }}><span>{o.icon}</span>{o.label}</span>
                                        <button onClick={() => set(o.key, shown ? "yes" : "")} title={shown ? "Cliquer pour masquer" : "Cliquer pour afficher"}
                                          style={{ width: 42, height: 24, borderRadius: 12, background: shown ? G : "rgba(255,255,255,0.12)", border: "none", cursor: "pointer", position: "relative", transition: "background .2s", flexShrink: 0 }}>
                                          <span style={{ position: "absolute", top: 3, left: shown ? 21 : 3, width: 18, height: 18, borderRadius: "50%", background: "#fff", transition: "left .2s", boxShadow: "0 1px 4px rgba(0,0,0,0.3)" }} />
                                        </button>
                                      </div>
                                    )
                                  })}
                                  {(bc.hide_mobile === "yes" || bc.hide_desktop === "yes") && (
                                    <p style={{ color: "#F59E0B", fontSize: 9.5, margin: "4px 0 0" }}>⚠ Ce bloc est masqué sur {bc.hide_mobile === "yes" ? "mobile" : ""}{bc.hide_mobile === "yes" && bc.hide_desktop === "yes" ? " et " : ""}{bc.hide_desktop === "yes" ? "ordinateur" : ""} (page publiée).</p>
                                  )}
                                </div>
                                <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                                  <p style={secTitle}>Animations</p>
                                  {sel("__anim", "À l'apparition (au scroll)", BLOCK_ANIM_OPTIONS, "Aucune")}
                                  {bc.__anim && bc.__anim !== "Aucune" && sel("__anim_speed", "Vitesse d'apparition", BLOCK_ANIM_SPEED_OPTIONS, "Normal")}
                                  {sel("__hover", "Au survol", BLOCK_HOVER_OPTIONS, "Aucun")}
                                  {sel("__loop", "En boucle (emphase)", BLOCK_LOOP_OPTIONS, "Aucune")}
                                  <p style={{ color: MUTED, fontSize: 9.5, margin: "-2px 0 0" }}>L&apos;apparition se déclenche quand le bloc entre à l&apos;écran (visible sur la page publiée).</p>
                                </div>
                                <div>
                                  <p style={secTitle}>Nom interne</p>
                                  <input type="text" value={bc.__name || ""} onChange={e => set("__name", e.target.value)} placeholder="Ex : Section horaires (privé)" style={{ ...selStyle, cursor: "text" }} />
                                  <p style={{ color: MUTED, fontSize: 9.5, margin: "4px 0 0" }}>Aide-mémoire visible uniquement par vous.</p>
                                </div>
                                <div>
                                  <p style={secTitle}>Actions</p>
                                  <div style={{ display: "flex", gap: 6 }}>
                                    <button onClick={() => duplicateBlock(selectedBlock.id)} style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 6, padding: "9px", borderRadius: 8, border: "1px solid rgba(255,255,255,0.1)", background: "rgba(255,255,255,0.04)", color: "#F5F0E8", fontSize: 12, cursor: "pointer" }}><Copy size={11} /> Dupliquer</button>
                                    {!selectedBlock.locked && <button onClick={() => deleteBlock(selectedBlock.id)} style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 6, padding: "9px", borderRadius: 8, border: "1px solid rgba(239,68,68,0.2)", background: "rgba(239,68,68,0.07)", color: "#EF4444", fontSize: 12, cursor: "pointer" }}><Trash2 size={11} /> Supprimer</button>}
                                  </div>
                                </div>
                              </div>
                            )}

                            {/* Bascule Simple <-> Expert (audit #10/#14 : options avancees masquees par defaut) */}
                            {!expertMode ? (
                              <button type="button" onClick={() => { setExpertMode(true); setEditTab("style") }}
                                style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "center", gap: 8, minHeight: 46, marginTop: 16, border: "1px dashed rgba(255,255,255,0.14)", borderRadius: 11, background: "rgba(255,255,255,0.02)", color: MUTED, fontSize: 12.5, fontWeight: 600, cursor: "pointer" }}>
                                <Settings size={15} /> Style &amp; options avancées
                              </button>
                            ) : (
                              <button type="button" onClick={() => { setExpertMode(false); setEditTab("contenu") }}
                                style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "center", gap: 7, minHeight: 42, marginTop: 16, border: "none", background: "none", color: MUTED, fontSize: 12, fontWeight: 600, cursor: "pointer" }}>
                                ← Revenir au mode simple
                              </button>
                            )}
                          </>
                        )
                      })()}
                    </>
                }
              </div>
            )}

            {!rightCollapsed && rightTab==="theme" && (
              <div style={{ flex: 1, overflowY: "auto", padding: 14 }}>
                <ThemePanel theme={theme} onThemeChange={setTheme} />
              </div>
            )}

          </div>
        </div>

        {/* BARRE D'ONGLETS MOBILE — un panneau à la fois (palette | page | réglages) */}
        {/* Barre flottante en mode Apercu : sortir + voir en direct (#02) */}
        {isMobile && preview && (
          <div style={{ position: "fixed", left: 0, right: 0, bottom: 0, zIndex: 60, display: "flex", gap: 10, padding: "10px 14px calc(10px + env(safe-area-inset-bottom))", background: "rgba(12,11,9,0.9)", backdropFilter: "blur(14px)", borderTop: "1px solid rgba(201,168,76,0.2)" }}>
            <button onClick={() => setPreview(false)} style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 7, minHeight: 48, background: "linear-gradient(90deg,var(--accent,#C9A84C),color-mix(in srgb, var(--accent,#C9A84C) 75%, #000))", border: "none", borderRadius: 12, color: "#080808", fontSize: 14, fontWeight: 800, cursor: "pointer" }}>
              <ChevronDown size={16} style={{ transform: "rotate(90deg)" }} /> Modifier
            </button>
            {pageSlug && <a href={`/${pageSlug}`} target="_blank" rel="noopener noreferrer" style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 6, minHeight: 48, padding: "0 16px", background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.14)", borderRadius: 12, color: "#F5F0E8", fontSize: 13, fontWeight: 700, textDecoration: "none" }}><ExternalLink size={14} /> Voir en direct</a>}
          </div>
        )}

        {/* #13 : pendant la recherche de bloc, on masque la barre du bas -> les resultats prennent toute la hauteur au-dessus du clavier */}
        {isMobile && !preview && !(blockSearchFocus && mobileTab === "blocks") && (
          <div style={{ flexShrink: 0, display: "flex", background: "#0C0C0C", borderTop: "1px solid rgba(255,255,255,0.08)", paddingBottom: "env(safe-area-inset-bottom)" }}>
            {([
              { id: "blocks", label: "Blocs", icon: "🧱" },
              { id: "canvas", label: "Page", icon: "📄" },
              { id: "panel", label: "Réglages", icon: "⚙️" },
            ] as const).map(t => {
              const on = mobileTab === t.id
              return (
                <button key={t.id} onClick={() => setMobileTab(t.id)}
                  style={{ flex: 1, minHeight: 52, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 3, padding: "8px 4px", background: on ? "rgba(201,168,76,0.12)" : "transparent", border: "none", borderTop: `3px solid ${on ? G : "transparent"}`, color: on ? G : MUTED, fontSize: 11, fontWeight: on ? 800 : 500, cursor: "pointer" }}>
                  <span style={{ fontSize: 17 }}>{t.icon}</span>{t.label}
                </button>
              )
            })}
          </div>
        )}

        {/* Actions secondaires d'un bloc (bottom sheet) — #10 : sorties de l'overlay pour desencombrer */}
        {blockMenu && (() => {
          const b = blocks.find(x => x.id === blockMenu)
          if (!b) return null
          const def = BLOCK_DEFS[b.type]
          const items: { icon: React.ReactNode; label: string; onClick: () => void; danger?: boolean }[] = [
            { icon: <Copy size={17} />, label: "Dupliquer", onClick: () => { duplicateBlock(b.id); setBlockMenu(null) } },
            { icon: b.visible ? <EyeOff size={17} /> : <Eye size={17} />, label: b.visible ? "Masquer" : "Afficher", onClick: () => { toggleVisible(b.id); setBlockMenu(null) } },
            { icon: <span style={{ fontSize: 15 }}>{b.locked ? "🔓" : "🔒"}</span>, label: b.locked ? "Déverrouiller" : "Verrouiller", onClick: () => { toggleLock(b.id); setBlockMenu(null) } },
            ...(b.locked ? [] : [{ icon: <span style={{ fontSize: 15 }}>✏</span>, label: b.draft ? "Retirer du brouillon" : "Mettre en brouillon", onClick: () => { toggleDraft(b.id); setBlockMenu(null) } }]),
            ...(b.locked ? [] : [{ icon: <span style={{ fontSize: 15 }}>↺</span>, label: "Réinitialiser", onClick: () => { resetBlock(b.id); setBlockMenu(null) } }]),
            ...(b.locked ? [] : [{ icon: <Trash2 size={17} color="#EF4444" />, label: "Supprimer", danger: true, onClick: () => { deleteBlock(b.id); setBlockMenu(null) } }]),
          ]
          return (
            <div onClick={() => setBlockMenu(null)} style={{ position: "fixed", inset: 0, zIndex: 1100, background: "rgba(0,0,0,0.55)", backdropFilter: "blur(3px)", display: "flex", alignItems: "flex-end", justifyContent: "center" }}>
              <div onClick={e => e.stopPropagation()} style={{ width: "100%", maxWidth: 460, background: "#141210", borderTopLeftRadius: 20, borderTopRightRadius: 20, border: "1px solid rgba(255,255,255,0.1)", borderBottom: "none", padding: "10px 12px calc(14px + env(safe-area-inset-bottom))", boxShadow: "0 -16px 44px rgba(0,0,0,0.55)" }}>
                <div style={{ width: 40, height: 4, borderRadius: 4, background: "rgba(255,255,255,0.18)", margin: "0 auto 10px" }} />
                <p style={{ color: "#F5F0E8", fontSize: 14, fontWeight: 700, margin: "0 6px 6px", display: "flex", alignItems: "center", gap: 8 }}><span>{def?.icon}</span> {def?.label || "Bloc"}</p>
                {items.map((it, i) => (
                  <button key={i} onClick={it.onClick}
                    style={{ display: "flex", alignItems: "center", gap: 13, width: "100%", padding: "13px 12px", background: "none", border: "none", borderTop: i ? "1px solid rgba(255,255,255,0.05)" : "none", color: it.danger ? "#EF4444" : "#F5F0E8", fontSize: 14.5, fontWeight: 500, cursor: "pointer", textAlign: "left" }}>
                    <span style={{ width: 24, display: "flex", justifyContent: "center", flexShrink: 0 }}>{it.icon}</span> {it.label}
                  </button>
                ))}
              </div>
            </div>
          )
        })()}

        {/* Popover aperçu bloc */}
        {popover && (() => {
          const def = BLOCK_DEFS[popover.type]
          const hint = BLOCK_HINTS[popover.type]
          if (!def) return null
          const cat = BLOCK_CATEGORIES.find(c => c.id === def.category)
          // Ajustement vertical pour rester dans l'écran
          const adjustedY = Math.min(popover.y, window.innerHeight - 200)
          return (
            <div style={{
              position: "fixed", left: popover.x, top: adjustedY, zIndex: 9999,
              width: 220, background: "#161616",
              border: `1px solid ${def.color}30`,
              borderRadius: 14, overflow: "hidden",
              boxShadow: `0 8px 32px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.04)`,
              animation: "popoverIn 0.15s ease",
              pointerEvents: "none",
            }}>
              {/* Header coloré */}
              <div style={{ padding: "12px 14px", background: `linear-gradient(135deg, ${def.color}12, ${def.color}06)`, borderBottom: `1px solid ${def.color}20` }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                  <div style={{ width: 32, height: 32, borderRadius: 8, background: def.color+"18", border: `1px solid ${def.color}30`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, flexShrink: 0 }}>{def.icon}</div>
                  <div>
                    <p style={{ color: "#F5F0E8", fontSize: 12, fontWeight: 700, margin: "0 0 1px" }}>{def.label}</p>
                    {cat && <span style={{ background: cat.color+"15", color: cat.color, borderRadius: 10, padding: "1px 6px", fontSize: 8, fontWeight: 700, textTransform: "uppercase" as const, letterSpacing: 0.8 }}>{cat.label}</span>}
                  </div>
                </div>
                <p style={{ color: "rgba(245,240,232,0.65)", fontSize: 10, margin: 0, lineHeight: 1.5 }}>{def.description}</p>
              </div>
              {/* Preview + hint */}
              <div style={{ padding: "10px 14px" }}>
                {hint ? (
                  <>
                    <div style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 8, padding: "8px 10px", marginBottom: 8, fontFamily: "monospace", fontSize: 10, color: "rgba(245,240,232,0.5)", lineHeight: 1.5 }}>
                      {hint.preview}
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                      <span style={{ fontSize: 9 }}>💡</span>
                      <span style={{ color: def.color, fontSize: 10, fontWeight: 500 }}>{hint.hint}</span>
                    </div>
                  </>
                ) : (
                  <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                    <span style={{ fontSize: 9 }}>💡</span>
                    <span style={{ color: MUTED, fontSize: 10 }}>Cliquez pour ajouter à la page</span>
                  </div>
                )}
              </div>
              {/* Champs disponibles */}
              {def.fields.length > 0 && (
                <div style={{ padding: "0 14px 10px", display: "flex", flexWrap: "wrap", gap: 4 }}>
                  {def.fields.slice(0, 4).map(f => (
                    <span key={f.key} style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 6, padding: "2px 6px", fontSize: 8, color: "rgba(245,240,232,0.4)" }}>{f.label.split(" — ").pop()}</span>
                  ))}
                  {def.fields.length > 4 && <span style={{ fontSize: 8, color: MUTED }}>+{def.fields.length - 4}</span>}
                </div>
              )}
            </div>
          )
        })()}

        {/* MODALE — Modèles de page complets (par métier -> sous-variantes) */}
        {showTemplates && (
          <div onClick={() => setShowTemplates(false)}
            style={{ position: "fixed", inset: 0, zIndex: 300, background: "rgba(0,0,0,0.6)", backdropFilter: "blur(4px)", display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
            <div onClick={e => e.stopPropagation()}
              style={{ width: "100%", maxWidth: 860, maxHeight: "88vh", background: "#111", border: "1px solid rgba(201,168,76,0.2)", borderRadius: 16, overflow: "hidden", display: "flex", flexDirection: "column", boxShadow: "0 24px 80px rgba(0,0,0,0.6)" }}>
              {/* En-tête */}
              <div style={{ padding: "16px 20px", borderBottom: "1px solid rgba(255,255,255,0.07)", display: "flex", alignItems: "center", gap: 10 }}>
                <span style={{ fontSize: 20 }}>✨</span>
                <div style={{ flex: 1 }}>
                  <p style={{ margin: 0, color: "#F5F0E8", fontSize: 15, fontWeight: 700 }}>Modèles de page</p>
                  <p style={{ margin: 0, color: MUTED, fontSize: 11 }}>Une page complète et cohérente en un clic — personnalisable ensuite.</p>
                </div>
                <button onClick={() => setShowTemplates(false)} aria-label="Fermer" style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, color: MUTED, cursor: "pointer", width: 30, height: 30, fontSize: 16 }}>×</button>
              </div>
              {/* Génération par IA — décris ton activité, l'IA construit la page */}
              <div style={{ padding: "12px 20px", borderBottom: "1px solid rgba(255,255,255,0.07)", background: "linear-gradient(120deg,rgba(201,168,76,0.09),rgba(57,255,143,0.05))" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 3 }}>
                  <span style={{ fontSize: 17 }}>🪄</span>
                  <p style={{ margin: 0, color: "#F5F0E8", fontSize: 13.5, fontWeight: 800 }}>Générer ma page avec l&apos;IA</p>
                </div>
                <p style={{ margin: "0 0 10px", color: MUTED, fontSize: 11.5, lineHeight: 1.4 }}>Décris ton activité en une phrase — l&apos;IA construit une page complète, prête à personnaliser.</p>
                <div style={{ display: "flex", flexDirection: isMobile ? "column" as const : "row" as const, gap: 8, alignItems: isMobile ? "stretch" : "flex-start" }}>
                  <textarea
                    value={aiGenPrompt}
                    onChange={e => { setAiGenPrompt(e.target.value); if (aiGenError) { setAiGenError(null); setAiGenSoon(false) } }}
                    disabled={aiGenLoading}
                    placeholder="Ex : Salon de coiffure haut de gamme à Lyon, coupe, coloration, barbier. Réservation en ligne, ambiance chaleureuse."
                    rows={3}
                    style={{ flex: 1, resize: "vertical", minHeight: isMobile ? 76 : 60, background: "rgba(0,0,0,0.35)", border: "1px solid rgba(255,255,255,0.14)", borderRadius: 10, color: "#F5F0E8", fontSize: 12.5, padding: "10px 12px", lineHeight: 1.45, fontFamily: "inherit", width: "100%", boxSizing: "border-box" as const }}
                  />
                  <button onClick={generateWithAI} disabled={aiGenLoading}
                    style={{ flexShrink: 0, alignSelf: "stretch", minHeight: isMobile ? 48 : undefined, minWidth: isMobile ? undefined : 120, padding: "0 18px", borderRadius: 10, border: "none", cursor: aiGenLoading ? "wait" : "pointer", background: aiGenLoading ? "rgba(201,168,76,0.4)" : `linear-gradient(90deg,${G},#b8953f)`, color: "#080808", fontSize: 13, fontWeight: 800, display: "flex", alignItems: "center", justifyContent: "center", gap: 7, boxShadow: aiGenLoading ? "none" : "0 4px 14px rgba(201,168,76,0.3)" }}>
                    {aiGenLoading
                      ? <><span style={{ width: 13, height: 13, border: "2px solid rgba(8,8,8,0.3)", borderTopColor: "#080808", borderRadius: "50%", animation: "spin 0.7s linear infinite" }} /> Génération…</>
                      : <>✨ Générer ma page</>}
                  </button>
                </div>
                {aiGenError && (aiGenSoon
                  ? <div style={{ margin: "9px 0 0", padding: "9px 11px", borderRadius: 9, background: "rgba(201,168,76,0.1)", border: "1px solid rgba(201,168,76,0.28)", color: "#E8D9A8", fontSize: 11.5, lineHeight: 1.45, display: "flex", gap: 7 }}><span style={{ flexShrink: 0 }}>⏳</span><span>{aiGenError}</span></div>
                  : <p style={{ margin: "7px 0 0", color: "#F87171", fontSize: 10.5 }}>{aiGenError}</p>)}
                {aiGenLoading && <p style={{ margin: "7px 0 0", color: MUTED, fontSize: 10 }}>L&apos;IA rédige votre page… (quelques secondes)</p>}
              </div>
              <div style={{ display: "flex", flex: 1, minHeight: 0 }}>
                {/* Colonne métiers */}
                <div style={{ width: 190, flexShrink: 0, borderRight: "1px solid rgba(255,255,255,0.07)", overflowY: "auto", padding: 8 }} className="iphone-scroll">
                  {PAGE_TEMPLATE_GROUPS.map(grp => {
                    const on = templateGroup === grp
                    const emoji = PAGE_TEMPLATES.find(t => t.group === grp)?.emoji || "📄"
                    return (
                      <button key={grp} onClick={() => setTemplateGroup(grp)}
                        style={{ width: "100%", display: "flex", alignItems: "center", gap: 8, padding: "9px 10px", marginBottom: 3, borderRadius: 9, border: "none", cursor: "pointer", background: on ? "rgba(201,168,76,0.12)" : "transparent", color: on ? G : "#C8C2B6", fontSize: 12, fontWeight: on ? 700 : 500, textAlign: "left" as const }}>
                        <span style={{ fontSize: 15 }}>{emoji}</span>{grp}
                      </button>
                    )
                  })}
                </div>
                {/* Variantes du métier */}
                <div style={{ flex: 1, overflowY: "auto", padding: 14, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, alignContent: "start" }} className="iphone-scroll">
                  {PAGE_TEMPLATES.filter(t => t.group === templateGroup).map(tpl => (
                    <div key={tpl.key} style={{ border: "1px solid rgba(255,255,255,0.08)", borderRadius: 13, overflow: "hidden", background: "rgba(255,255,255,0.02)", display: "flex", flexDirection: "column" }}>
                      {/* Mini-apercu de page (avatar + titre + CTA aux couleurs du theme) — plus visuel (#16) */}
                      <div style={{ height: 148, background: tpl.theme.bgGradient || tpl.theme.bg, position: "relative", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 7, padding: "16px" }}>
                        <div style={{ width: 38, height: 38, borderRadius: "50%", background: `linear-gradient(135deg, ${tpl.theme.primary}, ${tpl.theme.accent})`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, boxShadow: "0 2px 8px rgba(0,0,0,0.25)" }}>{tpl.emoji}</div>
                        <div style={{ width: "56%", height: 6, borderRadius: 3, background: (tpl.theme as any).text || "#F5F0E8", opacity: 0.9 }} />
                        <div style={{ width: "40%", height: 4, borderRadius: 2, background: (tpl.theme as any).muted || "#9A948A", opacity: 0.7 }} />
                        <div style={{ width: "74%", height: 15, borderRadius: 8, background: tpl.theme.accent || tpl.theme.primary, marginTop: 3, boxShadow: "0 2px 6px rgba(0,0,0,0.2)" }} />
                        <div style={{ position: "absolute", bottom: 7, right: 7, display: "flex", gap: 3 }}>
                          <span style={{ width: 10, height: 10, borderRadius: "50%", background: tpl.theme.primary, border: "1px solid rgba(255,255,255,0.25)" }} />
                          <span style={{ width: 10, height: 10, borderRadius: "50%", background: tpl.theme.accent, border: "1px solid rgba(255,255,255,0.25)" }} />
                        </div>
                      </div>
                      <div style={{ padding: "11px 12px", flex: 1, display: "flex", flexDirection: "column" }}>
                        <p style={{ margin: "0 0 2px", color: "#F5F0E8", fontSize: 13, fontWeight: 700 }}>{tpl.label}</p>
                        <p style={{ margin: "0 0 8px", color: MUTED, fontSize: 10.5, lineHeight: 1.4 }}>{tpl.desc}</p>
                        <p style={{ margin: "0 0 10px", color: "#6E685E", fontSize: 9.5 }}>{tpl.blocks.length} sections · {(BLOCK_DEFS[tpl.blocks[0]?.type]?.label) || ""}…</p>
                        <button onClick={() => applyPageTemplate(tpl)}
                          style={{ marginTop: "auto", width: "100%", padding: "8px", borderRadius: 8, border: "none", cursor: "pointer", background: G, color: "#080808", fontSize: 11.5, fontWeight: 700 }}>
                          Utiliser ce modèle
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        <style>{`
          @keyframes popoverIn { from { opacity: 0; transform: translateX(-4px) scale(0.97) } to { opacity: 1; transform: translateX(0) scale(1) } }
          @keyframes bounce{0%,80%,100%{transform:translateY(0);opacity:.4}40%{transform:translateY(-5px);opacity:1}}
          @keyframes pulse{0%,100%{opacity:1}50%{opacity:0.4}}
          @keyframes gradientShift{0%{background-position:0% 50%}50%{background-position:100% 50%}100%{background-position:0% 50%}}
          @keyframes auroraShift{0%{background-position:0% 0%}33%{background-position:100% 0%}66%{background-position:50% 100%}100%{background-position:0% 0%}}
          @keyframes spin{0%{transform:rotate(0deg)}100%{transform:rotate(360deg)}}
          .iphone-scroll::-webkit-scrollbar{display:none}
          .block-handle:active{cursor:grabbing}
          .panel-collapse{transition:width 0.25s cubic-bezier(0.4,0,0.2,1)}
          .focus-mode .sidebar{width:64px!important}
          button:focus-visible, input:focus-visible, select:focus-visible, textarea:focus-visible, a:focus-visible, [role="button"]:focus-visible { outline: 2px solid #C9A84C; outline-offset: 2px; border-radius: 4px; }
        `}</style>
      </div>
    )
  }
