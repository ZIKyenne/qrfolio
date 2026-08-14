"use client"

// Print Studio — UI guidée « objets, pas outils » (Print Studio Mobile v3).
// Bibliothèque -> aperçu packshot + 3 volets bornés -> contrôle avant export -> export.
// Consomme les modules purs : catalog / mockup / states / tokens.

import { useEffect, useMemo, useRef, useState } from "react"
import Link from "next/link"
import { ArrowLeft, Lock, Check, X, Download, ShieldCheck, AlertTriangle, ChevronDown } from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import Particles from "@/components/Particles"
import QRCanvas from "../qr-codes/QRCanvas"
import { getQRBlob, type QROptions } from "../qr-codes/qrRender"
import {
  METIERS, OBJECTIFS, BRANDNAMES, filterItems, ambiancesFor, ITEM_BY_ID, STYLE_BY_ID,
  LAYOUT_BY_ID, LAYOUTS, STYLES, TYPOS, SIZES, MESSAGES, type Item, type Style,
} from "./catalog"
import { sceneLayers, paletteFromStyle, scaleFor, SCENES } from "./mockup"
import { evaluateControls, canExport } from "./states"
import { color as C, radius as R } from "./tokens"

// item.layout est parfois une clé de contenu ('stack'), parfois un id de layout ('orne').
// On résout toujours vers un id de LAYOUTS valide (pour le volet Mise en page).
function resolveLayoutId(itemLayout: string): string {
  if (LAYOUT_BY_ID[itemLayout]) return itemLayout
  const byContent = LAYOUTS.find(l => l.content === itemLayout)
  return byContent ? byContent.id : "centre"
}
const PAD_MM = [0.7, 1, 1.35]      // multiplicateur d'air autour (ePad 0..2)
const TITLE_MM = [0.82, 1, 1.2]    // multiplicateur de titre (eTitle 0..2)
const FINISH_LABEL: Record<string, string> = { uni: "Uni", degrade: "Dégradé", grain: "Grain", rayures: "Rayures", quadrillage: "Quadrillage" }
const FINISH_OPTS = [{ id: "uni", label: "Uni" }, { id: "degrade", label: "Dégradé" }, { id: "grain", label: "Grain" }, { id: "rayures", label: "Rayures" }, { id: "quadrillage", label: "Quadrillage" }]
const FRAME_LABEL: Record<string, string> = { aucun: "sans cadre", filet: "filet", double: "double filet", coins: "coins ornés" }
// Couleurs d'accent (override de l'ambiance) : « auto » = laisse l'ambiance décider.
const ACCENTS: { id: string; label: string; hex: string }[] = [
  { id: "auto", label: "Auto", hex: "" },
  { id: "or", label: "Or", hex: "#C9A84C" },
  { id: "rouge", label: "Rouge", hex: "#D4483B" },
  { id: "corail", label: "Corail", hex: "#E5735B" },
  { id: "vert", label: "Vert", hex: "#3E9E6E" },
  { id: "bleu", label: "Bleu", hex: "#3B6FD4" },
  { id: "violet", label: "Violet", hex: "#7A5CD4" },
  { id: "rose", label: "Rose", hex: "#D45C9E" },
]
const TITLE_WEIGHT: Record<string, number> = { fin: 400, normal: 0, gras: 800 } // 0 = graisse de l'ambiance
// Encre lisible (noir/blanc) sur une couleur donnée — pour le libellé du bouton accentué.
function readableOn(hex: string): string {
  const m = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
  if (!m) return "#0A0A0A"
  const L = (0.299 * parseInt(m[1], 16) + 0.587 * parseInt(m[2], 16) + 0.114 * parseInt(m[3], 16)) / 255
  return L > 0.6 ? "#0A0A0A" : "#FFFFFF"
}
// Éclaircit (amt>0) ou assombrit (amt<0) une couleur hex ; renvoie l'entrée si non hex (bi-ton du bouton).
function shade(hex: string, amt: number): string {
  const m = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
  if (!m) return hex
  const adj = (c: number) => Math.max(0, Math.min(255, Math.round(amt < 0 ? c * (1 + amt) : c + (255 - c) * amt)))
  return `#${[1, 2, 3].map(i => adj(parseInt(m[i], 16)).toString(16).padStart(2, "0")).join("")}`
}
// Modèles « 1 clic » : combinaisons de réglages prêtes (ambiance + mise en page + accent + fond + cadre + textes).
type Preset = { id: string; label: string; style: string; layout: string; accent: string; bgFinish: string; frame: string; titleCase: string; titleWeight: string; qrBadge: string; eCorner: string; eAccent: string; eAlign: "left" | "center" | "right" }
const PRESETS: Preset[] = [
  { id: "epure", label: "Épuré", style: "minimal", layout: "centre", accent: "auto", bgFinish: "uni", frame: "aucun", titleCase: "normal", titleWeight: "normal", qrBadge: "carre", eCorner: "adouci", eAccent: "trait", eAlign: "center" },
  { id: "luxe", label: "Luxe", style: "luxgold", layout: "cadre", accent: "or", bgFinish: "degrade", frame: "coins", titleCase: "upper", titleWeight: "normal", qrBadge: "cercle", eCorner: "adouci", eAccent: "plein", eAlign: "center" },
  { id: "nuit", label: "Nuit", style: "premiumdark", layout: "centre", accent: "auto", bgFinish: "degrade", frame: "filet", titleCase: "normal", titleWeight: "normal", qrBadge: "carre", eCorner: "adouci", eAccent: "plein", eAlign: "center" },
  { id: "pop", label: "Pop", style: "neon", layout: "bandeau", accent: "rose", bgFinish: "grain", frame: "aucun", titleCase: "upper", titleWeight: "gras", qrBadge: "carre", eCorner: "vif", eAccent: "plein", eAlign: "left" },
  { id: "nature", label: "Nature", style: "sage", layout: "centre", accent: "vert", bgFinish: "uni", frame: "filet", titleCase: "normal", titleWeight: "normal", qrBadge: "carre", eCorner: "rond", eAccent: "plein", eAlign: "center" },
  { id: "affiche", label: "Affiche", style: "sunset", layout: "affiche", accent: "corail", bgFinish: "degrade", frame: "aucun", titleCase: "upper", titleWeight: "gras", qrBadge: "carre", eCorner: "vif", eAccent: "plein", eAlign: "left" },
  { id: "carte", label: "Carte", style: "modernblack", layout: "colonnes", accent: "auto", bgFinish: "uni", frame: "filet", titleCase: "normal", titleWeight: "normal", qrBadge: "carre", eCorner: "adouci", eAccent: "trait", eAlign: "left" },
  { id: "edito", label: "Édito", style: "inkedit", layout: "diagonale", accent: "auto", bgFinish: "quadrillage", frame: "aucun", titleCase: "upper", titleWeight: "normal", qrBadge: "carre", eCorner: "vif", eAccent: "trait", eAlign: "left" },
]

export default function PrintStudioClient({ canAccess }: { canAccess: boolean }) {
  const [phase, setPhase] = useState<"library" | "studio">("library")
  const [metier, setMetier] = useState("Tout")
  const [objectif, setObjectif] = useState("Tout")
  const [itemId, setItemId] = useState<string | null>(null)

  // état studio
  const [styleId, setStyleId] = useState("premiumdark")
  const [layoutId, setLayoutId] = useState("centre")
  const [sizeId, setSizeId] = useState("moyen")
  const [brandText, setBrandText] = useState(BRANDNAMES[0])   // nom affiché (libre)
  const [subtitle, setSubtitle] = useState("")               // accroche / sous-titre optionnel
  const [message, setMessage] = useState("")                 // titre principal
  const [ctaText, setCtaText] = useState("")                 // libellé du bouton
  const [logo, setLogo] = useState("aucun")            // logo de marque sur l'OBJET (jamais sur le QR)
  const [eTitle, setETitle] = useState(1)
  const [ePad, setEPad] = useState(1)
  const [eCorner, setECorner] = useState("adouci")     // arrondi des éléments du support (pas le QR)
  const [eAccent, setEAccent] = useState("plein")
  const [eTypo, setETypo] = useState("auto")
  const [eAlign, setEAlign] = useState<"left" | "center" | "right">("center")
  const [accent, setAccent] = useState("auto")         // couleur d'accent (override d'ambiance)
  const [titleCase, setTitleCase] = useState("normal") // casse du titre : Aa / MAJUSCULES
  const [titleWeight, setTitleWeight] = useState("normal") // graisse du titre : fin / normal / gras
  const [qrBadge, setQrBadge] = useState("carre")      // pastille derrière le QR : carré / cercle / aucune
  const [qrPos, setQrPos] = useState("centre")         // position verticale du QR (mise en page centrée)
  const [bgFinish, setBgFinish] = useState("uni")      // fini du fond du support (uni / dégradé / grain)
  const [frame, setFrame] = useState("aucun")          // cadre décoratif indépendant
  const [open, setOpen] = useState<string | null>(null)   // un seul volet ouvert
  const [showAllColors, setShowAllColors] = useState(false)
  const [control, setControl] = useState(false)           // écran « contrôle avant export »
  const [busy, setBusy] = useState(false)
  const [done, setDone] = useState(false)
  const [logoUrl, setLogoUrl] = useState<string | null>(null)
  const logoInput = useRef<HTMLInputElement>(null)

  // Source du QR : un QR EXISTANT de l'utilisateur, ou un PNG importé. AUCUNE création ici
  // (Print Studio n'est pas un concepteur de QR — il met en scène un QR déjà fait).
  const [qrSource, setQrSource] = useState<"mine" | "png">("mine")
  const [qrPickId, setQrPickId] = useState("")
  const [qrPng, setQrPng] = useState<string | null>(null)
  const [myQRs, setMyQRs] = useState<{ id: string; label: string; url: string }[]>([])
  const qrPngInput = useRef<HTMLInputElement>(null)

  // Modèles personnels (enregistrés sur CE navigateur — localStorage, aucune donnée serveur).
  const [savedPresets, setSavedPresets] = useState<{ id: string; name: string; cfg: Record<string, any> }[]>([])
  const [saving, setSaving] = useState(false)
  const [saveName, setSaveName] = useState("")
  useEffect(() => { try { const raw = localStorage.getItem("qrowg-print-presets"); if (raw) setSavedPresets(JSON.parse(raw)) } catch {} }, [])
  function persistPresets(next: { id: string; name: string; cfg: Record<string, any> }[]) { setSavedPresets(next); try { localStorage.setItem("qrowg-print-presets", JSON.stringify(next)) } catch {} }

  // QR existants de l'utilisateur (codes statiques liés à une page + QR instantanés dynamiques/statiques).
  // RLS scope automatiquement. Le QR imprimé encode /q/<short_code> (redirigeable) ou le payload direct.
  useEffect(() => {
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://qrowg.com"
    let alive = true
    const sb = createClient()
    Promise.all([
      sb.from("qr_codes").select("short_code, pages(title, slug)").order("created_at", { ascending: false }).limit(60),
      sb.from("instant_qrs").select("id, label, kind, payload, dynamic, short_code").order("created_at", { ascending: false }).limit(60),
    ]).then(([a, b]) => {
      if (!alive) return
      const list: { id: string; label: string; url: string }[] = []
      for (const r of ((a.data || []) as any[])) {
        if (!r.short_code) continue
        const pg = Array.isArray(r.pages) ? r.pages[0] : r.pages
        list.push({ id: `q_${r.short_code}`, label: pg?.title || pg?.slug || "QR code", url: `${appUrl}/q/${r.short_code}` })
      }
      for (const r of ((b.data || []) as any[])) {
        const url = r.dynamic && r.short_code ? `${appUrl}/q/${r.short_code}` : (r.payload || "")
        if (!url) continue
        list.push({ id: `i_${r.id}`, label: r.label || (r.kind ? `QR ${r.kind}` : "QR instantané"), url })
      }
      setMyQRs(list)
      setQrPickId(prev => prev || (list[0]?.id ?? ""))
    })
    return () => { alive = false }
  }, [])

  const item = itemId ? ITEM_BY_ID[itemId] : null
  const style = STYLE_BY_ID[styleId] || STYLE_BY_ID.premiumdark
  const layout = LAYOUT_BY_ID[layoutId] || LAYOUT_BY_ID.centre
  const size = SIZES.find(s => s.id === sizeId) || SIZES[1]
  const messages = item ? (MESSAGES[item.id] || []) : []
  const brand = brandText.trim() || BRANDNAMES[0]
  const title = message.trim() || (messages[0] ?? item?.title ?? "")
  const cta = ctaText.trim() || item?.cta || ""
  const pickedQR = myQRs.find(q => q.id === qrPickId)
  const qrValue = qrSource === "mine" ? (pickedQR?.url || "https://qrowg.com") : "https://qrowg.com"
  const qrImg = qrSource === "png" ? qrPng : null
  const qrReady = qrSource === "png" ? !!qrPng : !!pickedQR
  const activePreset = PRESETS.find(p => p.style === styleId && p.layout === layoutId && p.accent === accent && p.bgFinish === bgFinish && p.frame === frame && p.titleCase === titleCase && p.titleWeight === titleWeight && p.qrBadge === qrBadge && p.eCorner === eCorner && p.eAccent === eAccent && p.eAlign === eAlign)?.id
  // Config de DESIGN capturable pour un modèle personnel (ni QR ni textes — c'est un « look »).
  const currentCfg: Record<string, any> = { styleId, layoutId, accent, bgFinish, frame, titleCase, titleWeight, qrBadge, qrPos, eCorner, eAccent, eTypo, eAlign, eTitle, ePad }
  const activeSavedId = savedPresets.find(p => Object.keys(currentCfg).every(k => p.cfg[k] === currentCfg[k]))?.id
  const ambiances = useMemo(() => ambiancesFor(metier), [metier])
  const controls = useMemo(() => item ? evaluateControls(item, style, size) : [], [item, style, size])
  const ok = canExport(controls)

  function applyPreset(p: Preset) {
    setStyleId(p.style); setLayoutId(p.layout); setAccent(p.accent); setBgFinish(p.bgFinish); setFrame(p.frame)
    setTitleCase(p.titleCase); setTitleWeight(p.titleWeight); setQrBadge(p.qrBadge); setECorner(p.eCorner); setEAccent(p.eAccent); setEAlign(p.eAlign)
  }
  function applyCfg(c: Record<string, any>) {
    if (c.styleId) setStyleId(c.styleId); if (c.layoutId) setLayoutId(c.layoutId); if (c.accent) setAccent(c.accent)
    if (c.bgFinish) setBgFinish(c.bgFinish); if (c.frame) setFrame(c.frame); if (c.titleCase) setTitleCase(c.titleCase)
    if (c.titleWeight) setTitleWeight(c.titleWeight); if (c.qrBadge) setQrBadge(c.qrBadge); if (c.qrPos) setQrPos(c.qrPos)
    if (c.eCorner) setECorner(c.eCorner); if (c.eAccent) setEAccent(c.eAccent); if (c.eTypo) setETypo(c.eTypo); if (c.eAlign) setEAlign(c.eAlign)
    if (typeof c.eTitle === "number") setETitle(c.eTitle); if (typeof c.ePad === "number") setEPad(c.ePad)
  }
  function saveCurrent() {
    const name = saveName.trim() || `Mon style ${savedPresets.length + 1}`
    persistPresets([...savedPresets, { id: `sv_${Date.now()}`, name, cfg: currentCfg }])
    setSaving(false); setSaveName("")
  }

  function openItem(id: string) {
    const it = ITEM_BY_ID[id]; if (!it) return
    setItemId(id); setStyleId(it.pal); setLayoutId(resolveLayoutId(it.layout))
    setSizeId("moyen"); setBrandText(BRANDNAMES[0]); setSubtitle(""); setMessage(""); setCtaText(it.cta); setLogo("aucun")
    setETitle(1); setEPad(1); setECorner("adouci"); setEAccent("plein"); setETypo("auto"); setEAlign("center")
    setAccent("auto"); setTitleCase("normal"); setTitleWeight("normal"); setQrBadge("carre"); setQrPos("centre")
    setBgFinish("uni"); setFrame("aucun"); setLogoUrl(null); setOpen(null); setShowAllColors(false); setControl(false); setPhase("studio")
  }

  // Ré-export du QR choisi, seul (source « Mes QR »). On réencode le lien du QR existant :
  // aucune création de destination — c'est le même code, juste au format fichier.
  async function exportQr(ext: "png" | "svg") {
    if (!item || !ok || busy || qrSource !== "mine") return
    setBusy(true)
    try {
      const opts: QROptions = { data: qrValue, fg: style.qr, bg: style.qrBg, ecc: "M", style: {}, size: 1024 }
      const blob = await getQRBlob(opts, ext)
      if (blob) { const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = `qrowg-${item.support}.${ext}`.replace(/\s+/g, "-").toLowerCase(); a.click(); URL.revokeObjectURL(a.href); setDone(true); setTimeout(() => setDone(false), 1800) }
    } finally { setBusy(false) }
  }

  // ── Upsell (free) ──────────────────────────────────────────────────────────
  if (!canAccess) {
    return (
      <div style={{ minHeight: "100dvh", background: C.bg, color: C.fg, display: "flex", alignItems: "center", justifyContent: "center", padding: 24, fontFamily: "system-ui, sans-serif" }}>
        <div style={{ maxWidth: 400, textAlign: "center" }}>
          <div style={{ width: 54, height: 54, borderRadius: 16, background: C.goldSoft, border: `1px solid ${C.gold}55`, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px" }}><Lock size={22} color={C.gold} /></div>
          <h1 style={{ fontSize: 22, fontWeight: 700, margin: "0 0 8px" }}>Print Studio</h1>
          <p style={{ color: C.fgMuted, fontSize: 14.5, lineHeight: 1.6, margin: "0 0 20px" }}>Concevez des supports imprimables prêts à poser — stickers, chevalets, affiches, cartes — avec votre QR. Inclus dès le plan Starter.</p>
          <Link href="/upgrade" style={{ display: "inline-flex", alignItems: "center", gap: 8, background: C.gold, color: "#0A0A0A", fontWeight: 800, fontSize: 14, padding: "12px 24px", borderRadius: 12, textDecoration: "none" }}>Voir les plans →</Link>
        </div>
      </div>
    )
  }

  // ── Bibliothèque ─────────────────────────────────────────────────────────────
  if (phase === "library" || !item) {
    const items = filterItems(metier, objectif)
    const skel = [{ w: 92, h: 92, r: "50%" }, { w: 132, h: 92, r: 12 }, { w: 82, h: 116, r: 12 }]
    return (
      <div style={{ position: "relative", minHeight: "100dvh", color: C.fg, fontFamily: "system-ui, sans-serif", padding: "0 16px 40px" }}>
        <Particles behind />
        <header style={{ maxWidth: 1040, margin: "0 auto", padding: "18px 0 8px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <Link href="/dashboard/qr-codes" style={{ display: "inline-flex", alignItems: "center", gap: 6, color: C.fgMuted, textDecoration: "none", fontSize: 13 }}><ArrowLeft size={16} /> QR codes</Link>
          <span style={{ fontSize: 13, fontWeight: 700, color: C.gold, letterSpacing: 0.3 }}>Print Studio</span>
        </header>
        <div style={{ maxWidth: 1040, margin: "0 auto" }}>
          <h1 style={{ fontSize: "clamp(24px,4vw,34px)", fontWeight: 700, letterSpacing: "-0.02em", margin: "10px 0 6px" }}>Choisissez un support</h1>
          <p style={{ color: C.fgMuted, fontSize: 14, margin: "0 0 18px" }}>Un objet réel, déjà réussi. Trois suffisent : à table, en vitrine, dans la main.</p>

          {/* Filtres métier × objectif */}
          <Rail label="Métier" value={metier} options={METIERS} onPick={setMetier} />
          <Rail label="Objectif" value={objectif} options={OBJECTIFS} onPick={setObjectif} />

          {/* Grille d'objets */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(150px,1fr))", gap: 12, marginTop: 18 }}>
            {items.map(it => (
              <button key={it.id} onClick={() => openItem(it.id)} style={{ textAlign: "left", background: C.surface, border: `1px solid ${C.hairline}`, borderRadius: R.card, padding: 12, cursor: "pointer", color: C.fg, display: "flex", flexDirection: "column", gap: 10 }}>
                <div style={{ height: 122, borderRadius: 10, background: `radial-gradient(80% 70% at 50% 8%, #2a2e34, #16181c)`, display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden" }}>
                  <MiniSupport item={it} style={STYLE_BY_ID[it.pal]} />
                </div>
                <div>
                  <p style={{ margin: 0, fontSize: 13.5, fontWeight: 700 }}>{it.name}</p>
                  <p style={{ margin: "2px 0 0", fontSize: 11, color: C.fgFaint, fontFamily: "ui-monospace, monospace" }}>{it.support} · {it.size}</p>
                </div>
              </button>
            ))}
          </div>
          {items.length === 0 && <p style={{ color: C.fgMuted, fontSize: 13, marginTop: 20 }}>Aucun support pour ce filtre. <button onClick={() => { setMetier("Tout"); setObjectif("Tout") }} style={{ background: "none", border: "none", color: C.gold, cursor: "pointer", fontSize: 13 }}>Tout afficher</button></p>}

          {/* squelettes (état chargement, décoratif) */}
          <div aria-hidden style={{ display: "flex", gap: 10, marginTop: 24, opacity: 0.25 }}>
            {skel.map((s, i) => <div key={i} style={{ width: s.w, height: s.h, borderRadius: s.r as any, background: C.surfaceUp }} />)}
          </div>
        </div>
      </div>
    )
  }

  // ── Studio (aperçu + volets + action) ─────────────────────────────────────────
  const scene = sceneLayers(item.scene, metier === "Tout" ? null : metier)
  const pal = paletteFromStyle(style)
  return (
    <div style={{ position: "relative", minHeight: "100dvh", color: C.fg, fontFamily: "system-ui, sans-serif" }}>
      <Particles behind />
      <header style={{ maxWidth: 1180, margin: "0 auto", padding: "14px 16px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <button onClick={() => setPhase("library")} style={{ display: "inline-flex", alignItems: "center", gap: 6, background: "none", border: "none", color: C.fgMuted, cursor: "pointer", fontSize: 13 }}><ArrowLeft size={16} /> Bibliothèque</button>
        <span style={{ fontSize: 12.5, fontWeight: 700, color: C.fgMuted }}>{item.name} · <span style={{ fontFamily: "ui-monospace, monospace" }}>{item.size}</span></span>
      </header>

      <div className="ps-grid" style={{ maxWidth: 1180, margin: "0 auto", padding: "0 16px 120px", display: "grid", gap: 18, gridTemplateColumns: "1fr" }}>
        <style>{`@media(min-width:1025px){.ps-grid{grid-template-columns:1.2fr 1fr!important}.ps-aside{position:sticky;top:14px;align-self:start}}`}</style>

        {/* Aperçu packshot */}
        <div className="ps-aside">
          <Packshot item={item} scene={scene} pal={pal} style={style} layout={layout} size={size} qrValue={qrValue} qrImg={qrImg} qrBadge={qrBadge} qrPos={qrPos} logo={logo} logoUrl={logoUrl} bgFinish={bgFinish} frame={frame} accent={accent} titleCase={titleCase} titleWeight={titleWeight}
            brand={brand} subtitle={subtitle} title={title} cta={cta} eCorner={eCorner} eAccent={eAccent} eTypo={eTypo} eAlign={eAlign} eTitle={eTitle} ePad={ePad} />
          <p style={{ textAlign: "center", color: C.fgFaint, fontSize: 11.5, margin: "8px 0 0" }}>{scene.caption} · {qrReady ? "votre QR est en place" : "ajoutez votre QR dans « Le QR »"}</p>
        </div>

        {/* Volets + action */}
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {/* Modèles « 1 clic » — applique une combinaison complète de réglages, live. */}
          <div>
            <p style={{ margin: "0 0 7px", fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1, color: C.fgFaint }}>Modèles · 1 clic</p>
            <div style={{ display: "flex", gap: 7, overflowX: "auto", paddingBottom: 4 }}>
              {PRESETS.map(p => <button key={p.id} onClick={() => applyPreset(p)} style={chipStyle(activePreset === p.id)}>{p.label}</button>)}
            </div>
            {/* Mes modèles — enregistrés sur ce navigateur */}
            <div style={{ display: "flex", gap: 7, overflowX: "auto", paddingBottom: 4, marginTop: 7, alignItems: "center" }}>
              {savedPresets.map(p => (
                <span key={p.id} style={{ ...chipStyle(activeSavedId === p.id), padding: "0 4px 0 12px", gap: 2 }}>
                  <button onClick={() => applyCfg(p.cfg)} style={{ background: "none", border: "none", color: "inherit", font: "inherit", fontWeight: "inherit", cursor: "pointer", padding: "8px 2px 8px 0" }}>{p.name}</button>
                  <button onClick={() => persistPresets(savedPresets.filter(x => x.id !== p.id))} aria-label="Supprimer ce modèle" style={{ background: "none", border: "none", color: "inherit", cursor: "pointer", padding: "0 6px", opacity: 0.55, fontSize: 15, lineHeight: 1 }}>×</button>
                </span>
              ))}
              {saving ? (
                <span style={{ display: "inline-flex", gap: 6, alignItems: "center", flexShrink: 0 }}>
                  <input autoFocus value={saveName} onChange={e => setSaveName(e.target.value)} onKeyDown={e => { if (e.key === "Enter") saveCurrent(); if (e.key === "Escape") { setSaving(false); setSaveName("") } }} placeholder="Nom du modèle…" style={{ ...inputStyle, height: 38, width: 150 }} />
                  <button onClick={saveCurrent} style={{ ...chipStyle(true), minHeight: 38 }}>OK</button>
                  <button onClick={() => { setSaving(false); setSaveName("") }} aria-label="Annuler" style={{ ...chipStyle(false), minHeight: 38, padding: "0 12px" }}>×</button>
                </span>
              ) : (
                <button onClick={() => setSaving(true)} style={{ ...chipStyle(false), minHeight: 38, whiteSpace: "nowrap", flexShrink: 0 }}>＋ Enregistrer ce style</button>
              )}
            </div>
          </div>

          {/* Volet QR — on RÉUTILISE un QR existant ou on importe un PNG. Aucune création. */}
          <Panel id="qr" title="Le QR" resume={qrSource === "png" ? (qrPng ? "PNG importé" : "importer un PNG") : (pickedQR ? pickedQR.label : "choisir un QR")} open={open} setOpen={setOpen}>
            <Seg value={qrSource} options={["mine", "png"]} labels={["Mes QR", "Importer un PNG"]} onPick={v => setQrSource(v as "mine" | "png")} />
            {qrSource === "mine" ? (
              myQRs.length > 0 ? (
                <Field label="Votre QR code">
                  <select value={qrPickId} onChange={e => setQrPickId(e.target.value)} style={{ ...inputStyle, appearance: "none", cursor: "pointer" }}>
                    {myQRs.map(q => <option key={q.id} value={q.id}>{q.label}</option>)}
                  </select>
                  <p style={{ margin: "8px 0 0", fontSize: 11, color: C.fgFaint, lineHeight: 1.45 }}>On met en scène ce QR existant — il reste pilotable depuis vos QR codes (destination modifiable) même après impression.</p>
                </Field>
              ) : (
                <p style={{ fontSize: 12.5, color: C.fgMuted, lineHeight: 1.5, margin: "10px 0 0" }}>Vous n'avez pas encore de QR. <Link href="/dashboard/qr-codes" style={{ color: C.gold }}>Créez-en un</Link>, ou importez un PNG ci-dessus.</p>
              )
            ) : (
              qrPng ? (
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 10 }}>
                  <div style={{ width: 48, height: 48, borderRadius: 8, background: "#fff", overflow: "hidden", flexShrink: 0, border: `1px solid ${C.hairline}` }}><img src={qrPng} alt="" style={{ width: "100%", height: "100%", objectFit: "contain" }} /></div>
                  <span style={{ flex: 1, fontSize: 11.5, color: C.fgMuted, lineHeight: 1.4 }}>QR importé — placé tel quel sur le support.</span>
                  <button onClick={() => setQrPng(null)} aria-label="Retirer le QR" style={{ background: "rgba(255,86,74,0.1)", border: "1px solid rgba(255,86,74,0.25)", borderRadius: 8, width: 34, height: 34, color: C.bad, cursor: "pointer", flexShrink: 0 }}><X size={15} /></button>
                </div>
              ) : (
                <button onClick={() => qrPngInput.current?.click()} style={{ marginTop: 10, width: "100%", minHeight: 44, borderRadius: 11, border: `1.5px dashed ${C.gold}55`, background: C.goldSoft, color: C.gold, fontSize: 13, fontWeight: 600, cursor: "pointer" }}>Importer un PNG</button>
              )
            )}
            <input ref={qrPngInput} type="file" accept="image/png,image/*" style={{ display: "none" }} onChange={e => { const f = e.target.files?.[0]; if (f) { const r = new FileReader(); r.onload = () => setQrPng(String(r.result)); r.readAsDataURL(f) } if (e.target) e.target.value = "" }} />
            <Field label="Taille du QR"><RailInline value={sizeId} options={SIZES.map(s => ({ id: s.id, label: s.label, note: s.note }))} onPick={setSizeId} /></Field>
            <Field label="Pastille"><Seg value={qrBadge} options={["carre", "cercle", "aucune"]} onPick={setQrBadge} labels={["Carré", "Cercle", "Aucune"]} /></Field>
            <Field label="Position du QR (mise en page centrée)"><Seg value={qrPos} options={["haut", "centre", "bas"]} onPick={setQrPos} labels={["Haut", "Centre", "Bas"]} /></Field>
          </Panel>

          {/* Volet TEXTE — tout est éditable librement */}
          <Panel id="texte" title="Les textes" resume={`${brand} · « ${title} »`} open={open} setOpen={setOpen}>
            <Field label="Nom affiché">
              <input value={brandText} onChange={e => setBrandText(e.target.value)} placeholder="Votre marque…" style={inputStyle} />
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 8 }}>
                {BRANDNAMES.map(b => <Chip key={b} on={brand === b} onClick={() => setBrandText(b)}>{b}</Chip>)}
              </div>
            </Field>
            <Field label="Titre">
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 8 }}>
                {messages.map(m => <Chip key={m} on={title === m} onClick={() => setMessage(m)}>{m}</Chip>)}
              </div>
              <input value={message} onChange={e => setMessage(e.target.value)} placeholder="Titre principal…" style={inputStyle} />
            </Field>
            <Field label="Sous-titre (optionnel)"><input value={subtitle} onChange={e => setSubtitle(e.target.value)} placeholder="Une ligne d'accroche…" style={inputStyle} /></Field>
            <Field label="Bouton"><input value={ctaText} onChange={e => setCtaText(e.target.value)} placeholder={item.cta} style={inputStyle} /></Field>
            <Field label="Casse du titre"><Seg value={titleCase} options={["normal", "upper"]} onPick={setTitleCase} labels={["Aa normal", "MAJUSCULES"]} /></Field>
            <Field label="Graisse du titre"><Seg value={titleWeight} options={["fin", "normal", "gras"]} onPick={setTitleWeight} labels={["Fin", "Normal", "Gras"]} /></Field>
            <Field label="Typographie"><RailInline value={eTypo} options={TYPOS.map(t => ({ id: t.id, label: t.label }))} onPick={setETypo} /></Field>
            <Field label="Alignement"><Seg value={eAlign} options={["left", "center", "right"]} onPick={(v) => setEAlign(v as any)} labels={["Gauche", "Centre", "Droite"]} /></Field>
          </Panel>

          {/* Volet ALLURE */}
          <Panel id="allure" title="L'allure" resume={`${style.label} · ${ACCENTS.find(a => a.id === accent)?.label ?? "Auto"} · ${layout.label}`} open={open} setOpen={setOpen}>
            <Field label="Ambiance">
              <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 8 }}>
                {(showAllColors ? STYLES : ambiances.map(a => STYLE_BY_ID[a.rep])).map(s => (
                  <Swatch key={s.id} s={s} on={styleId === s.id} label={showAllColors ? s.label : undefined} onClick={() => setStyleId(s.id)} />
                ))}
              </div>
              <button onClick={() => setShowAllColors(v => !v)} style={{ background: "none", border: "none", color: C.gold, cursor: "pointer", fontSize: 12, marginTop: 8, padding: 0 }}>{showAllColors ? "Voir les ambiances" : `Voir les ${STYLES.length} coloris détaillés`}</button>
            </Field>
            <Field label="Couleur d'accent">
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                {ACCENTS.map(a => (
                  <button key={a.id} onClick={() => setAccent(a.id)} title={a.label} style={{ width: 34, height: 34, borderRadius: 9, cursor: "pointer", border: `2px solid ${accent === a.id ? C.gold : "transparent"}`, boxShadow: accent === a.id ? `0 0 0 2px ${C.gold}33` : "none", background: a.hex || "conic-gradient(from 210deg,#C9A84C,#D4483B,#3E9E6E,#3B6FD4,#7A5CD4,#C9A84C)", position: "relative" }}>
                    {a.id === "auto" && <span style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 8.5, fontWeight: 800, color: "#fff", textShadow: "0 1px 2px rgba(0,0,0,.6)" }}>AUTO</span>}
                  </button>
                ))}
              </div>
            </Field>
            <Field label="Mise en page"><RailInline value={layoutId} options={LAYOUTS.map(l => ({ id: l.id, label: l.label }))} onPick={setLayoutId} /></Field>
          </Panel>

          {/* Volet DESIGN — 100 % design (aucun réglage du QR : il est fourni tel quel) */}
          <Panel id="details" title="Le design" resume={`${FINISH_LABEL[bgFinish] ?? "Uni"} · ${FRAME_LABEL[frame] ?? "sans cadre"}`} open={open} setOpen={setOpen}>
            <Field label="Fond"><RailInline value={bgFinish} options={FINISH_OPTS} onPick={setBgFinish} /></Field>
            <Field label="Cadre"><Seg value={frame} options={["aucun", "filet", "double", "coins"]} onPick={setFrame} labels={["Aucun", "Filet", "Double", "Coins"]} /></Field>
            <Field label="Taille du titre"><Step value={eTitle} min={0} max={2} onChange={setETitle} labels={["plus petit", "normal", "plus grand"]} /></Field>
            <Field label="Air autour"><Step value={ePad} min={0} max={2} onChange={setEPad} labels={["serré", "normal", "large"]} /></Field>
            <Field label="Arrondi"><Seg value={eCorner} options={["vif", "adouci", "rond"]} onPick={setECorner} labels={["Vif", "Adouci", "Rond"]} /></Field>
            <Field label="Style du bouton"><Seg value={eAccent} options={["plein", "degrade", "trait", "aucun"]} onPick={setEAccent} labels={["Plein", "Dégradé", "Trait", "Aucun"]} /></Field>
            <Field label="Logo de marque">
              <Seg value={logo} options={["objet", "aucun"]} onPick={setLogo} labels={["Sur l'objet", "Aucun"]} />
              {logo === "objet" && (logoUrl
                ? <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 8 }}>
                    <div style={{ width: 40, height: 40, borderRadius: 8, background: "#fff", overflow: "hidden", flexShrink: 0, border: `1px solid ${C.hairline}` }}><img src={logoUrl} alt="" style={{ width: "100%", height: "100%", objectFit: "contain" }} /></div>
                    <span style={{ flex: 1, fontSize: 11.5, color: C.fgMuted, lineHeight: 1.4 }}>Logo posé dans le coin du support.</span>
                    <button onClick={() => setLogoUrl(null)} aria-label="Retirer le logo" style={{ background: "rgba(255,86,74,0.1)", border: "1px solid rgba(255,86,74,0.25)", borderRadius: 8, width: 34, height: 34, color: C.bad, cursor: "pointer", flexShrink: 0 }}><X size={15} /></button>
                  </div>
                : <button onClick={() => logoInput.current?.click()} style={{ marginTop: 8, width: "100%", minHeight: 42, borderRadius: 11, border: `1.5px dashed ${C.gold}55`, background: C.goldSoft, color: C.gold, fontSize: 13, fontWeight: 600, cursor: "pointer" }}>Ajouter un logo</button>
              )}
              <input ref={logoInput} type="file" accept="image/*" style={{ display: "none" }} onChange={e => { const f = e.target.files?.[0]; if (f) { const r = new FileReader(); r.onload = () => setLogoUrl(String(r.result)); r.readAsDataURL(f) } if (e.target) e.target.value = "" }} />
            </Field>
          </Panel>
        </div>
      </div>

      {/* Barre d'action ancrée */}
      <div style={{ position: "fixed", left: 0, right: 0, bottom: 0, background: `${C.surface}f2`, borderTop: `1px solid ${C.hairline}`, backdropFilter: "blur(8px)", padding: "12px 16px calc(12px + env(safe-area-inset-bottom))", zIndex: 30 }}>
        <div style={{ maxWidth: 1180, margin: "0 auto", display: "flex", gap: 10, alignItems: "center", justifyContent: "flex-end" }}>
          <span style={{ marginRight: "auto", fontSize: 12, color: ok ? C.ok : C.bad, display: "inline-flex", alignItems: "center", gap: 6 }}>{ok ? <><ShieldCheck size={14} /> Prêt à imprimer</> : <><AlertTriangle size={14} /> Un réglage à corriger</>}</span>
          <button onClick={() => setControl(true)} style={{ background: C.gold, color: "#0A0A0A", fontWeight: 800, fontSize: 14, padding: "12px 24px", borderRadius: 12, border: "none", cursor: "pointer" }}>Vérifier & exporter</button>
        </div>
      </div>

      {/* Écran CONTRÔLE avant export */}
      {control && (
        <div onClick={() => setControl(false)} style={{ position: "fixed", inset: 0, zIndex: 50, background: "rgba(0,0,0,0.55)", display: "flex", alignItems: "flex-end", justifyContent: "center", padding: 0 }}>
          <div onClick={e => e.stopPropagation()} style={{ width: "100%", maxWidth: 520, background: C.surface, borderRadius: "20px 20px 0 0", border: `1px solid ${C.hairline}`, padding: "18px 18px calc(18px + env(safe-area-inset-bottom))", maxHeight: "86vh", overflowY: "auto" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
              <p style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>Contrôle avant export</p>
              <button onClick={() => setControl(false)} style={{ background: "none", border: "none", color: C.fgMuted, cursor: "pointer" }}><X size={18} /></button>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {controls.map(c => (
                <div key={c.cle} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 12px", borderRadius: 11, background: C.surfaceUp, border: `1px solid ${c.ok ? "transparent" : (c.gravite === "bloquant" ? `${C.bad}55` : `${C.gold}55`)}` }}>
                  <span style={{ width: 20, height: 20, borderRadius: "50%", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", background: c.ok ? `${C.ok}22` : (c.gravite === "bloquant" ? `${C.bad}22` : `${C.gold}22`), color: c.ok ? C.ok : (c.gravite === "bloquant" ? C.bad : C.gold) }}>{c.ok ? <Check size={12} /> : <AlertTriangle size={12} />}</span>
                  <span style={{ flex: 1, fontSize: 13 }}>{c.libelle}{!c.ok && c.gravite === "avertissement" && <span style={{ color: C.gold, fontSize: 11 }}> · avertissement</span>}</span>
                  <span style={{ fontFamily: "ui-monospace, monospace", fontSize: 12, color: C.fgMuted }}>{c.valeur}</span>
                </div>
              ))}
            </div>
            {!qrReady && <p style={{ margin: "12px 0 0", fontSize: 12, color: C.gold, display: "inline-flex", alignItems: "center", gap: 6 }}><AlertTriangle size={13} /> Ajoutez d'abord votre QR (volet « Le QR »).</p>}
            {/* Livrable principal : la planche imprimable à taille réelle. */}
            <button onClick={() => { setControl(false); setTimeout(() => window.print(), 180) }} disabled={!ok || !qrReady} style={{ width: "100%", marginTop: 14, minHeight: 52, borderRadius: 12, border: "none", background: (ok && qrReady) ? C.gold : "rgba(201,168,76,0.3)", color: "#0A0A0A", fontSize: 15, fontWeight: 800, cursor: (ok && qrReady) ? "pointer" : "default", display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 8 }}><Download size={18} /> {ok ? "Exporter la planche (PDF · taille réelle)" : "Corrigez le réglage rouge"}</button>
            <p style={{ color: C.fgFaint, fontSize: 11, textAlign: "center", margin: "8px 0 0" }}>Ouvre l'impression du navigateur → « Enregistrer en PDF » : à la taille réelle ({pageDims(item).pageWmm} × {pageDims(item).pageHmm} mm, {item.shape === "round" ? "fond perdu inclus" : "fond perdu + traits de coupe inclus"}).</p>
            {/* Option : ré-exporter le QR choisi seul (uniquement quand c'est un QR existant). */}
            {qrSource === "mine" && (
              <div style={{ display: "flex", gap: 10, marginTop: 14 }}>
                <button onClick={() => exportQr("png")} disabled={!ok || !qrReady || busy} style={{ flex: 1, minHeight: 46, borderRadius: 12, border: `1px solid ${C.hairline}`, background: C.surfaceUp, color: C.fg, fontSize: 13.5, fontWeight: 700, cursor: (ok && qrReady) ? "pointer" : "default", opacity: (ok && qrReady) ? 1 : 0.5, display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 8 }}>{done ? <Check size={16} /> : <Download size={16} />} {busy ? "…" : done ? "Téléchargé" : "QR seul (PNG)"}</button>
                <button onClick={() => exportQr("svg")} disabled={!ok || !qrReady || busy} style={{ minHeight: 46, padding: "0 18px", borderRadius: 12, border: `1px solid ${C.hairline}`, background: C.surfaceUp, color: C.fg, fontSize: 13.5, fontWeight: 700, cursor: (ok && qrReady) ? "pointer" : "default", opacity: (ok && qrReady) ? 1 : 0.5 }}>SVG</button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Planche d'impression — window.print() -> PDF à taille réelle (mm), fidèle à l'aperçu. */}
      <div className="ps-print-root" aria-hidden>
        <style>{`@media screen{.ps-print-root{display:none!important}}@media print{body *{visibility:hidden!important}.ps-print-root,.ps-print-root *{visibility:visible!important}.ps-print-root{position:fixed!important;left:0;top:0;display:block!important}@page{size:${mediaDims(item).mediaWmm}mm ${mediaDims(item).mediaHmm}mm;margin:0}}`}</style>
        <PrintSheet item={item} style={style} pal={pal} layout={layout} brand={brand} subtitle={subtitle} title={title} cta={cta} size={size} qrValue={qrValue} qrImg={qrImg} qrBadge={qrBadge} qrPos={qrPos} logo={logo} logoUrl={logoUrl} bgFinish={bgFinish} frame={frame} accent={accent} titleCase={titleCase} titleWeight={titleWeight} eCorner={eCorner} eAccent={eAccent} eTypo={eTypo} eAlign={eAlign} eTitle={eTitle} ePad={ePad} />
      </div>
    </div>
  )
}

/* ─────────────────────────── sous-composants ─────────────────────────── */

const inputStyle: React.CSSProperties = { width: "100%", boxSizing: "border-box", height: 42, background: "#0A0B0D", border: `1px solid ${C.hairline}`, borderRadius: 11, color: C.fg, fontSize: 14, padding: "0 12px", outline: "none" }

function Rail({ label, value, options, onPick }: { label: string; value: string; options: string[]; onPick: (v: string) => void }) {
  return (
    <div style={{ marginTop: 12 }}>
      <p style={{ margin: "0 0 6px", fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1, color: C.fgFaint }}>{label}</p>
      <div style={{ display: "flex", gap: 7, overflowX: "auto", paddingBottom: 4 }}>
        {options.map(o => <button key={o} onClick={() => onPick(o)} style={chipStyle(value === o)}>{o}</button>)}
      </div>
    </div>
  )
}
function RailInline({ value, options, onPick }: { value: string; options: { id: string; label: string; note?: string }[]; onPick: (v: string) => void }) {
  return (
    <div style={{ display: "flex", gap: 7, overflowX: "auto", paddingBottom: 4 }}>
      {options.map(o => (
        <button key={o.id} onClick={() => onPick(o.id)} style={{ ...chipStyle(value === o.id), flexDirection: "column", alignItems: "flex-start", minWidth: o.note ? 108 : undefined }}>
          <span>{o.label}</span>{o.note && <span style={{ fontSize: 9.5, color: value === o.id ? "#0A0A0A" : C.fgFaint }}>{o.note}</span>}
        </button>
      ))}
    </div>
  )
}
function chipStyle(on: boolean): React.CSSProperties {
  return { flexShrink: 0, minHeight: 40, padding: "8px 14px", borderRadius: R.chip, cursor: "pointer", fontSize: 12.5, fontWeight: 700, whiteSpace: "nowrap", border: `1px solid ${on ? C.gold : C.hairline}`, background: on ? C.gold : C.surfaceUp, color: on ? "#0A0A0A" : C.fg, display: "inline-flex" }
}

function Panel({ id, title, resume, open, setOpen, children }: { id: string; title: string; resume: string; open: string | null; setOpen: (v: string | null) => void; children: React.ReactNode }) {
  const isOpen = open === id
  return (
    <div style={{ background: C.surface, border: `1px solid ${C.hairline}`, borderRadius: R.card, overflow: "hidden" }}>
      <button onClick={() => setOpen(isOpen ? null : id)} style={{ width: "100%", display: "flex", alignItems: "center", gap: 10, padding: "14px 16px", background: "none", border: "none", cursor: "pointer", color: C.fg, textAlign: "left" }}>
        <span style={{ flex: 1 }}>
          <span style={{ display: "block", fontSize: 14.5, fontWeight: 700 }}>{title}</span>
          {!isOpen && <span style={{ display: "block", fontSize: 11.5, color: C.fgMuted, marginTop: 2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{resume}</span>}
        </span>
        <ChevronDown size={18} color={C.fgMuted} style={{ transform: isOpen ? "rotate(180deg)" : "none", transition: "transform .15s" }} />
      </button>
      {isOpen && <div style={{ padding: "0 16px 16px", display: "flex", flexDirection: "column", gap: 14 }}>{children}</div>}
    </div>
  )
}
function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div><p style={{ margin: "0 0 7px", fontSize: 11.5, fontWeight: 600, color: C.fgMuted }}>{label}</p>{children}</div>
}
function Chip({ on, onClick, children }: { on: boolean; onClick: () => void; children: React.ReactNode }) {
  return <button onClick={onClick} style={{ minHeight: 36, padding: "6px 12px", borderRadius: R.chip, cursor: "pointer", fontSize: 12.5, fontWeight: 600, border: `1px solid ${on ? C.gold : C.hairline}`, background: on ? C.goldSoft : "transparent", color: on ? C.gold : C.fg }}>{children}</button>
}
function Seg({ value, options, onPick, labels }: { value: string; options: string[]; onPick: (v: string) => void; labels?: string[] }) {
  return (
    <div style={{ display: "flex", gap: 4, background: C.surfaceUp, borderRadius: 11, padding: 3 }}>
      {options.map((o, i) => <button key={o} onClick={() => onPick(o)} style={{ flex: 1, minHeight: 38, borderRadius: 8, border: "none", cursor: "pointer", background: value === o ? C.gold : "transparent", color: value === o ? "#0A0A0A" : C.fgMuted, fontSize: 12.5, fontWeight: value === o ? 800 : 600 }}>{labels ? labels[i] : o}</button>)}
    </div>
  )
}
function Step({ value, min, max, onChange, labels }: { value: number; min: number; max: number; onChange: (v: number) => void; labels: string[] }) {
  const opts = []; for (let i = min; i <= max; i++) opts.push(i)
  return (
    <div style={{ display: "flex", gap: 4, background: C.surfaceUp, borderRadius: 11, padding: 3 }}>
      {opts.map(i => <button key={i} onClick={() => onChange(i)} style={{ flex: 1, minHeight: 38, borderRadius: 8, border: "none", cursor: "pointer", background: value === i ? C.gold : "transparent", color: value === i ? "#0A0A0A" : C.fgMuted, fontSize: 12, fontWeight: value === i ? 800 : 600 }}>{labels[i - min]}</button>)}
    </div>
  )
}
function Swatch({ s, on, label, onClick }: { s: Style; on: boolean; label?: string; onClick: () => void }) {
  return (
    <button onClick={onClick} title={s.label} style={{ borderRadius: 12, overflow: "hidden", border: `2px solid ${on ? C.gold : "transparent"}`, cursor: "pointer", background: "none", padding: 0 }}>
      <div style={{ height: 46, background: s.bg, display: "flex", alignItems: "center", justifyContent: "center", gap: 4 }}>
        <span style={{ width: 12, height: 12, borderRadius: "50%", background: s.accent }} />
        <span style={{ width: 12, height: 12, borderRadius: 3, background: s.ink }} />
      </div>
      {label && <div style={{ fontSize: 9.5, color: C.fgMuted, padding: "3px 4px", background: C.surface, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{label}</div>}
    </button>
  )
}

/* Rendu du support (le visuel imprimé) — palette + texte + QR, arrangé par layout. */
function SupportVisual({ item, pal, layout, brand, subtitle, title, cta, size, qrValue, qrImg, qrBadge, qrPos, logo, logoUrl, bgFinish, frame, accent, titleCase, titleWeight, eCorner, eAccent, eTypo, eAlign, eTitle, ePad, w, h }:
  { item: Item; style: Style; pal: ReturnType<typeof paletteFromStyle>; layout: { content: string; deco: string | null }; brand: string; subtitle: string; title: string; cta: string; size: { factor: number }; qrValue: string; qrImg: string | null; qrBadge: string; qrPos: string; logo: string; logoUrl: string | null; bgFinish: string; frame: string; accent: string; titleCase: string; titleWeight: string; eCorner: string; eAccent: string; eTypo: string; eAlign: "left" | "center" | "right"; eTitle: number; ePad: number; w: number; h: number }) {
  const typo = TYPOS.find(t => t.id === eTypo)
  const titleFont = typo?.t ? `"${typo.t}",Georgia,serif` : pal.titleFont
  const bodyFont = typo?.b ? `"${typo.b}",Helvetica,Arial,sans-serif` : pal.bodyFont
  const unit = Math.min(w, h)
  const pad = unit * 0.09 * PAD_MM[ePad]
  const titleSize = unit * 0.11 * TITLE_MM[eTitle]
  const qrPx = Math.max(28, unit * 0.34 * (size.factor / 1))
  const radiusEl = eCorner === "vif" ? 0 : eCorner === "rond" ? 999 : 10
  const isRound = item.shape === "round"

  // Couleur d'accent : override d'ambiance (« auto » garde pal.band / pal.ctaBg).
  const accHex = ACCENTS.find(a => a.id === accent)?.hex || ""
  const bandColor = accHex || pal.band
  const bandFg = accHex ? readableOn(accHex) : pal.bandFg
  const ctaBg = accHex || pal.ctaBg
  const ctaFg = accHex ? readableOn(accHex) : pal.ctaFg
  const effWeight = TITLE_WEIGHT[titleWeight] || Number(pal.titleWeight) || 500
  const shownTitle = titleCase === "upper" ? title.toUpperCase() : title

  const kickerEl = <div style={{ fontFamily: bodyFont, fontSize: unit * 0.045, fontWeight: 700, letterSpacing: ".08em", textTransform: "uppercase", color: bandColor }}>{brand}</div>
  const titleEl = <div style={{ fontFamily: titleFont, fontSize: titleSize, fontWeight: effWeight as any, letterSpacing: pal.titleLs, lineHeight: 1.02, color: pal.fg }}>{shownTitle}</div>
  const subtitleEl = subtitle.trim() ? <div style={{ fontFamily: bodyFont, fontSize: unit * 0.05, fontWeight: 500, lineHeight: 1.25, color: pal.fg, opacity: 0.82 }}>{subtitle}</div> : null
  // Le QR est FOURNI (code existant réencodé, ou PNG importé) — jamais recréé/redesigné ici.
  const qrInner = qrImg
    ? <img src={qrImg} alt="" style={{ display: "block", width: Math.round(qrPx), height: Math.round(qrPx), objectFit: "contain" }} />
    : <QRCanvas value={qrValue} size={Math.round(qrPx)} fg={pal.ink} bg={pal.qrBg} ecc="M" />
  const qrEl = qrBadge === "aucune"
    ? <div style={{ lineHeight: 0 }}>{qrInner}</div>
    : <div style={{ background: pal.qrBg, padding: unit * (qrBadge === "cercle" ? 0.05 : 0.028), borderRadius: qrBadge === "cercle" ? "50%" : (eCorner === "rond" ? 16 : eCorner === "vif" ? 2 : 8), lineHeight: 0, display: "inline-block" }}>{qrInner}</div>
  const ctaEl = eAccent === "aucun" ? null : (
    <div style={{ fontFamily: bodyFont, fontSize: unit * 0.05, fontWeight: 800, padding: `${unit * 0.035}px ${unit * 0.09}px`, borderRadius: radiusEl, whiteSpace: "nowrap",
      ...(eAccent === "trait" ? { border: `2px solid ${bandColor}`, color: bandColor }
        : eAccent === "degrade" ? { background: `linear-gradient(135deg, ${shade(ctaBg, 0.12)}, ${shade(ctaBg, -0.28)})`, color: ctaFg }
        : { background: ctaBg, color: ctaFg }) }}>{cta}</div>
  )

  const alignItems = eAlign === "left" ? "flex-start" : eAlign === "right" ? "flex-end" : "center"
  // Fini du fond : uni, dégradé (voile lumière→ombre) ou grain (trame de points fine). Composé sur pal.bg.
  const grainStep = Math.max(4, unit * 0.02)
  const gridStep = Math.max(8, unit * 0.06)
  const stripeStep = Math.max(6, unit * 0.05)
  const bgCss = bgFinish === "degrade"
    ? `linear-gradient(155deg, rgba(255,255,255,0.10), transparent 42%, rgba(0,0,0,0.16)), ${pal.bg}`
    : bgFinish === "grain"
    ? `radial-gradient(rgba(255,255,255,0.06) 1px, transparent 1.5px) 0 0 / ${grainStep}px ${grainStep}px, ${pal.bg}`
    : bgFinish === "rayures"
    ? `repeating-linear-gradient(45deg, rgba(255,255,255,0.05) 0 ${stripeStep * 0.5}px, transparent ${stripeStep * 0.5}px ${stripeStep}px), ${pal.bg}`
    : bgFinish === "quadrillage"
    ? `linear-gradient(rgba(255,255,255,0.05) 1px, transparent 1px) 0 0 / ${gridStep}px ${gridStep}px, linear-gradient(90deg, rgba(255,255,255,0.05) 1px, transparent 1px) 0 0 / ${gridStep}px ${gridStep}px, ${pal.bg}`
    : pal.bg
  const base: React.CSSProperties = { width: w, height: h, boxSizing: "border-box", background: bgCss, color: pal.fg, borderRadius: isRound ? "50%" : (item.ratio >= 2 || item.ratio <= 0.5 ? 6 : 10), overflow: "hidden", position: "relative", display: "flex", padding: pad }

  // Cadre décoratif INDÉPENDANT de la mise en page (aucun / filet / double filet / coins ornés).
  const frameEl = frame === "filet"
    ? <div style={{ position: "absolute", inset: pad * 0.5, border: `1.5px solid ${pal.rule}`, borderRadius: isRound ? "50%" : 6, pointerEvents: "none" }} />
    : frame === "double"
    ? <><div style={{ position: "absolute", inset: pad * 0.42, border: `1.5px solid ${pal.rule}`, borderRadius: isRound ? "50%" : 6, pointerEvents: "none" }} /><div style={{ position: "absolute", inset: pad * 0.64, border: `1px solid ${pal.rule}`, borderRadius: isRound ? "50%" : 5, opacity: 0.6, pointerEvents: "none" }} /></>
    : frame === "coins"
    ? <><Corner p={pal.rule} pos={{ top: pad * 0.5, left: pad * 0.5 }} /><Corner p={pal.rule} pos={{ top: pad * 0.5, right: pad * 0.5 }} r /><Corner p={pal.rule} pos={{ bottom: pad * 0.5, left: pad * 0.5 }} b /><Corner p={pal.rule} pos={{ bottom: pad * 0.5, right: pad * 0.5 }} b r /></>
    : null

  let body: React.ReactNode
  if (layout.content === "band") {
    body = (
      <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column" }}>
        <div style={{ background: bandColor, color: bandFg, padding: `${pad * 0.7}px ${pad}px`, fontFamily: titleFont, fontSize: titleSize * 0.86, fontWeight: effWeight as any }}>{shownTitle}</div>
        <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: unit * 0.05, padding: pad }}>{subtitleEl}{qrEl}{ctaEl}</div>
      </div>
    )
  } else if (layout.content === "qrbig") {
    body = <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: unit * 0.045 }}><div style={{ fontFamily: titleFont, fontSize: titleSize * 0.7, fontWeight: effWeight as any, color: pal.fg }}>{shownTitle}</div>{subtitleEl}<div style={{ transform: "scale(1.35)", margin: `${unit * 0.05}px 0` }}>{qrEl}</div>{ctaEl}</div>
  } else if (layout.content === "split") {
    body = <div style={{ flex: 1, display: "flex", alignItems: "center", gap: pad }}><div style={{ flex: 1, display: "flex", flexDirection: "column", gap: unit * 0.035 }}>{kickerEl}{titleEl}{subtitleEl}{ctaEl}</div>{qrEl}</div>
  } else if (layout.content === "poster") {
    body = <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems, justifyContent: "space-between" }}><div style={{ display: "flex", flexDirection: "column", gap: unit * 0.03, alignItems }}>{kickerEl}<div style={{ fontFamily: titleFont, fontSize: titleSize * 1.5, fontWeight: effWeight as any, letterSpacing: pal.titleLs, lineHeight: 1, color: pal.fg }}>{shownTitle}</div>{subtitleEl}</div><div style={{ display: "flex", alignItems: "center", gap: pad, alignSelf: eAlign === "right" ? "flex-end" : eAlign === "left" ? "flex-start" : "center" }}>{qrEl}{ctaEl}</div></div>
  } else { // stack / center — la position du QR se règle (haut / centre / bas)
    const stackInner = qrPos === "haut"
      ? <>{qrEl}{kickerEl}{titleEl}{subtitleEl}{ctaEl}</>
      : qrPos === "bas"
      ? <>{kickerEl}{titleEl}{subtitleEl}{ctaEl}{qrEl}</>
      : <>{kickerEl}{titleEl}{subtitleEl}{qrEl}{ctaEl}</>
    body = <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems, justifyContent: "center", gap: unit * 0.045, textAlign: eAlign }}>{stackInner}</div>
  }

  return (
    <div style={base}>
      {body}
      {logo === "objet" && logoUrl && <img src={logoUrl} alt="" style={{ position: "absolute", top: pad, left: pad, width: unit * 0.14, height: unit * 0.14, objectFit: "contain", zIndex: 2 }} />}
      {frameEl}
      {/* décor optionnel (lié à la mise en page) */}
      {layout.deco === "frame" && <div style={{ position: "absolute", inset: pad * 0.5, border: `2px solid ${pal.rule}`, borderRadius: isRound ? "50%" : 6, pointerEvents: "none" }} />}
      {layout.deco === "footer" && <div style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: unit * 0.04, background: pal.band }} />}
      {layout.deco === "diagonal" && <div style={{ position: "absolute", top: -h * 0.3, right: -w * 0.2, width: w * 0.9, height: h * 0.5, background: pal.band, opacity: 0.16, transform: "rotate(-24deg)", pointerEvents: "none" }} />}
      {layout.deco === "ornate" && <><Corner p={pal.rule} pos={{ top: pad * 0.5, left: pad * 0.5 }} /><Corner p={pal.rule} pos={{ top: pad * 0.5, right: pad * 0.5 }} r /><Corner p={pal.rule} pos={{ bottom: pad * 0.5, left: pad * 0.5 }} b /><Corner p={pal.rule} pos={{ bottom: pad * 0.5, right: pad * 0.5 }} b r /></>}
    </div>
  )
}
function Corner({ p, pos, r, b }: { p: string; pos: React.CSSProperties; r?: boolean; b?: boolean }) {
  return <span style={{ position: "absolute", width: 14, height: 14, ...(pos), borderTop: b ? "none" : `2px solid ${p}`, borderBottom: b ? `2px solid ${p}` : "none", borderLeft: r ? "none" : `2px solid ${p}`, borderRight: r ? `2px solid ${p}` : "none", pointerEvents: "none" }} />
}

/* Dimensions physiques de la PLANCHE (trim + fond perdu), en mm. */
function pageDims(item: Item) {
  const trimW = item.shape === "round" ? item.hMm : item.hMm * item.ratio
  return { pageWmm: +(trimW + 2 * item.bleed).toFixed(1), pageHmm: +(item.hMm + 2 * item.bleed).toFixed(1) }
}
/* Marge blanche prépresse pour loger les traits de coupe (coupe droite uniquement ;
   les supports ronds sont découpés à la forme -> pas de repères rectangulaires). */
const CROP_MARGIN_MM = 4, CROP_LEN_MM = 3, CROP_STROKE_MM = 0.25
function marksMargin(item: Item) { return item.shape === "round" ? 0 : CROP_MARGIN_MM }
/* Dimensions du SUPPORT physique imprimé (planche + marge des traits de coupe) = format @page réel. */
function mediaDims(item: Item) {
  const { pageWmm, pageHmm } = pageDims(item)
  const m = marksMargin(item)
  return { mediaWmm: +(pageWmm + 2 * m).toFixed(1), mediaHmm: +(pageHmm + 2 * m).toFixed(1) }
}
/* Planche d'impression : le support à sa taille RÉELLE (mm) rendu en haute résolution puis
   remis à l'échelle physique — consommé par window.print() -> PDF prêt imprimeur (fidèle à l'aperçu). */
function PrintSheet(props: Omit<React.ComponentProps<typeof SupportVisual>, "w" | "h">) {
  const { item } = props
  const { pageWmm, pageHmm } = pageDims(item)
  const { mediaWmm, mediaHmm } = mediaDims(item)
  const m = marksMargin(item)
  const long = 1600
  const bigW = item.ratio >= 1 ? long : Math.round(long * item.ratio)
  const bigH = item.shape === "round" ? bigW : Math.round(bigW / item.ratio)
  const scale = (pageWmm * 96 / 25.4) / bigW  // px haute-déf -> mm réels (1mm = 96/25.4 px CSS)
  // Traits de coupe : au trait de rogne (trim), dans la marge blanche, sans toucher le fond perdu.
  const L = CROP_LEN_MM, S = CROP_STROKE_MM
  const tlx = m + item.bleed, tty = m + item.bleed
  const trx = m + pageWmm - item.bleed, tby = m + pageHmm - item.bleed
  const marks: { left: number; top: number; width: number; height: number }[] = m === 0 ? [] : [
    { left: tlx, top: m - L, width: S, height: L }, { left: m - L, top: tty, width: L, height: S },           // haut-gauche
    { left: trx, top: m - L, width: S, height: L }, { left: mediaWmm - m, top: tty, width: L, height: S },     // haut-droite
    { left: tlx, top: mediaHmm - m, width: S, height: L }, { left: m - L, top: tby, width: L, height: S },     // bas-gauche
    { left: trx, top: mediaHmm - m, width: S, height: L }, { left: mediaWmm - m, top: tby, width: L, height: S }, // bas-droite
  ]
  return (
    <div style={{ position: "relative", width: `${mediaWmm}mm`, height: `${mediaHmm}mm`, background: "#fff", overflow: "hidden" }}>
      <div style={{ position: "absolute", left: `${m}mm`, top: `${m}mm`, width: `${pageWmm}mm`, height: `${pageHmm}mm`, overflow: "hidden", background: props.pal.flat }}>
        <div style={{ width: bigW, height: bigH, transformOrigin: "top left", transform: `scale(${scale})` }}>
          <SupportVisual {...props} w={bigW} h={bigH} />
        </div>
      </div>
      {marks.map((mk, i) => <div key={i} aria-hidden style={{ position: "absolute", background: "#000", left: `${mk.left}mm`, top: `${mk.top}mm`, width: `${mk.width}mm`, height: `${mk.height}mm` }} />)}
    </div>
  )
}

/* Aperçu packshot : le support posé dans sa scène (perspective + ombres + sol). */
function Packshot(props: { item: Item; scene: ReturnType<typeof sceneLayers>; pal: ReturnType<typeof paletteFromStyle>; style: Style; layout: { content: string; deco: string | null }; size: { factor: number }; qrValue: string; qrImg: string | null; qrBadge: string; qrPos: string; logo: string; logoUrl: string | null; bgFinish: string; frame: string; accent: string; titleCase: string; titleWeight: string; brand: string; subtitle: string; title: string; cta: string; eCorner: string; eAccent: string; eTypo: string; eAlign: "left" | "center" | "right"; eTitle: number; ePad: number }) {
  const { item, scene } = props
  const box = 460
  const hPx = scaleFor(item.hMm, box, SCENES[item.scene])
  const wPx = item.shape === "round" ? hPx : hPx * item.ratio
  const clampedW = Math.min(wPx, box - 40)
  const clampedH = item.shape === "round" ? clampedW : clampedW / item.ratio
  const support = (
    <SupportVisual {...props} w={clampedW} h={clampedH} />
  )
  return (
    <div style={{ position: "relative", width: "100%", aspectRatio: "1 / 1", maxWidth: box, margin: "0 auto", borderRadius: 20, overflow: "hidden", background: scene.background }}>
      {/* sol */}
      {scene.floorHeight > 0 && <div style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: `${scene.floorHeight * 100}%`, background: scene.floor }} />}
      {scene.floorHeight > 0 && <div style={{ position: "absolute", left: 0, right: 0, bottom: `${scene.floorHeight * 100}%`, height: 1, background: scene.horizon }} />}
      {/* scène 3D */}
      <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", perspective: scene.perspective, perspectiveOrigin: scene.perspectiveOrigin }}>
        <div style={{ transform: `${scene.transform} translateY(${scene.verticalOffset * 100}%)`, transformStyle: "preserve-3d", position: "relative" }}>
          {/* ombre portée */}
          <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,1)", opacity: scene.castShadow.opacity, filter: `blur(${scene.castShadow.blur}px)`, transform: `translate(${scene.castShadow.dx}px, ${scene.castShadow.dy}px) scaleX(${scene.castShadow.scaleX})`, borderRadius: item.shape === "round" ? "50%" : 10 }} />
          {support}
          {/* reflet */}
          {scene.mirror > 0 && <div style={{ position: "absolute", top: "100%", left: 0, right: 0, transform: "scaleY(-1)", opacity: scene.mirror, maskImage: "linear-gradient(to bottom, rgba(0,0,0,.5), transparent 60%)", WebkitMaskImage: "linear-gradient(to bottom, rgba(0,0,0,.5), transparent 60%)", pointerEvents: "none" }}>{support}</div>}
        </div>
      </div>
      {/* lumière + grain */}
      <div style={{ position: "absolute", inset: 0, background: scene.light, pointerEvents: "none" }} />
      {scene.grainOpacity > 0 && scene.grain !== "none" && <div style={{ position: "absolute", inset: 0, background: scene.grain, opacity: scene.grainOpacity, mixBlendMode: "overlay", pointerEvents: "none" }} />}
      {scene.streak && <div style={{ position: "absolute", top: "-20%", left: "-10%", width: "50%", height: "140%", background: "linear-gradient(105deg, transparent, rgba(255,255,255,.10), transparent)", transform: "rotate(8deg)", pointerEvents: "none" }} />}
    </div>
  )
}

/* Mini-visuel pour la grille de bibliothèque : le VRAI support (mise en page + palette + QR),
   rendu grand puis mis à l'échelle et centré dans la vignette — lisible d'un coup d'œil. */
function MiniSupport({ item, style }: { item: Item; style: Style }) {
  const pal = paletteFromStyle(style)
  const layout = LAYOUT_BY_ID[resolveLayoutId(item.layout)] || LAYOUT_BY_ID.centre
  const BW = 152, BH = 120                          // zone d'aperçu de la vignette
  const baseW = item.shape === "round" ? 220 : (item.ratio >= 1 ? 220 : Math.round(220 * item.ratio))
  const baseH = item.shape === "round" ? 220 : Math.round(baseW / item.ratio)
  const scale = Math.min((BW - 22) / baseW, (BH - 20) / baseH)
  return (
    <div style={{ width: BW, height: BH, display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden" }}>
      <div style={{ width: baseW, height: baseH, transform: `scale(${scale})`, transformOrigin: "center", filter: "drop-shadow(0 10px 22px rgba(0,0,0,.55))" }}>
        <SupportVisual item={item} style={style} pal={pal} layout={layout} brand={BRANDNAMES[0]} subtitle="" title={MESSAGES[item.id]?.[0] || item.title} cta={item.cta} size={{ factor: 1 }} qrValue="https://qrowg.com" qrImg={null} qrBadge="carre" qrPos="centre" logo="aucun" logoUrl={null} bgFinish="uni" frame="aucun" accent="auto" titleCase="normal" titleWeight="normal" eCorner="adouci" eAccent="plein" eTypo="auto" eAlign="center" eTitle={1} ePad={1} w={baseW} h={baseH} />
      </div>
    </div>
  )
}
