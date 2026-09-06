"use client"

// ─────────────────────────────────────────────────────────────────────────────
// QR Studio « ZERO SCROLL » (refonte UX radicale, opt-in via ?zero=1).
// Objectif : 3 zones stables (Mes QR / Aperçu / Personnaliser) tenant dans 100dvh,
// personnalisation réduite à Style / Forme / Couleurs / Logo (+ Avancé caché),
// lisibilité AUTOMATIQUE (un seul indicateur), supports déportés vers Atelier d'impression.
// Réutilise les moteurs existants (QRCanvas, presets, qrScannability, qrRender) —
// aucune logique QR réimplémentée. L'ancien QRStudio reste intact (zéro régression).
// ─────────────────────────────────────────────────────────────────────────────
import { useEffect, useMemo, useRef, useState } from "react"
import Link from "next/link"
import { QrCode, Search, Copy, Check, Download, Printer, Plus, Settings, ChevronDown, PanelLeftClose, PanelLeftOpen, X, AlertTriangle, Trash2, Maximize2 } from "lucide-react"
import QRCanvas from "./QRCanvas"
import { getQRBlob, downloadBlob, buildAndDownloadPdf } from "./qrRender"
import { composeLogo } from "./logoCompose"
import { qrScannability, scanLevelColor } from "./qrScannability"
import { DOT_STYLES, CORNER_STYLE_LIST, DEFAULT_STYLE, type QRStyleConfig, type QRCode } from "./QRStudio"
import { PRESETS, PRESET_CATS, canUsePreset, type Preset } from "./presetsQr"
import { PLAN_RANK } from "@/lib/plans"

const G = "var(--accent)"
const INK = "#F5F0E8"
const MUTED = "#A8A190"
const FAINT = "rgba(245,240,232,0.42)"
const SHELL_BG = "#0B0A08"
const SURF = "rgba(255,255,255,0.035)"
const LINE = "rgba(255,255,255,0.08)"



// Mesure d'un conteneur → taille carrée d'aperçu qui s'ajuste (fit-to-view, pas de scroll).
function useFitSize(min = 180, max = 380) {
  const ref = useRef<HTMLDivElement>(null)
  const [size, setSize] = useState(280)
  useEffect(() => {
    const el = ref.current
    if (!el || typeof ResizeObserver === "undefined") return
    const ro = new ResizeObserver(() => {
      const r = el.getBoundingClientRect()
      setSize(Math.max(min, Math.min(max, Math.floor(Math.min(r.width, r.height) - 8))))
    })
    ro.observe(el)
    return () => ro.disconnect()
  }, [min, max])
  return { ref, size }
}

type Props = { qrCodes: QRCode[]; userPlan: string; appUrl: string }

export default function QRStudioZero({ qrCodes: initialQRCodes, userPlan, appUrl }: Props) {
  const [qrCodes, setQRCodes] = useState<QRCode[]>(initialQRCodes)
  const [activeId, setActiveId] = useState<string | null>(initialQRCodes.find(q => (q.status ?? "active") === "active")?.id ?? initialQRCodes[0]?.id ?? null)
  const [search, setSearch] = useState("")
  const [collapsed, setCollapsed] = useState(false)          // mode focus : replier la colonne Mes QR
  const [fg, setFg] = useState("")
  const [bg, setBg] = useState("")
  const [corner, setCorner] = useState<"square" | "rounded" | "dot">("square")
  const [ecc, setEcc] = useState<"L" | "M" | "Q" | "H">("M")
  const [styleConf, setStyleConf] = useState<QRStyleConfig>({ ...DEFAULT_STYLE })
  const [status, setStatus] = useState<"idle" | "saving" | "saved" | "error">("idle")
  const [advOpen, setAdvOpen] = useState(false)
  const [dlOpen, setDlOpen] = useState(false)
  const [dlBusy, setDlBusy] = useState<string | null>(null)
  const [scanOpen, setScanOpen] = useState(false)
  const [gradOpen, setGradOpen] = useState(false)
  const [allPresets, setAllPresets] = useState(false)       // « Voir tout » : bibliothèque complète de presets
  const [fsPreview, setFsPreview] = useState(false)         // aperçu QR plein écran (mode focus)
  const [copied, setCopied] = useState(false)
  const [logoErr, setLogoErr] = useState("")
  const [composedLogo, setComposedLogo] = useState("")
  const loadedRef = useRef(false)
  const logoInput = useRef<HTMLInputElement>(null)
  const { ref: previewBox, size: previewSize } = useFitSize()

  const active = qrCodes.find(q => q.id === activeId) ?? null
  const qrUrl = active ? `${appUrl}/q/${active.short_code}` : ""

  // Restaurer la palette focus persistée (mode focus laptop).
  useEffect(() => { try { if (localStorage.getItem("qrowg-qr-focus") === "1") setCollapsed(true) } catch {} }, [])

  // Charger la config du QR actif (et geler l'autosave le temps du chargement).
  useEffect(() => {
    if (!active) return
    loadedRef.current = false
    setFg(active.foreground_color)
    setBg(active.background_color)
    setCorner(active.corner_style)
    setEcc(active.error_correction)
    const sc = { ...DEFAULT_STYLE, ...(active.style_config ?? {}) }
    if (!sc.logoUrl && active.logo_url) sc.logoUrl = active.logo_url
    setStyleConf(sc)
    const t = setTimeout(() => { loadedRef.current = true }, 0)
    return () => clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeId])

  // Sauvegarde AUTOMATIQUE (§12) — debounce ; jamais pendant le chargement initial.
  useEffect(() => {
    if (!active || !loadedRef.current) return
    setStatus("saving")
    const t = setTimeout(() => { void save() }, 650)
    return () => clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fg, bg, corner, ecc, styleConf])

  // Logo : ECC forcé H (le logo masque des modules) + logo COMPOSÉ (forme/fond) au rendu, comme l'ancien.
  const effectiveEcc = styleConf.logoUrl ? "H" : ecc
  useEffect(() => {
    let cancelled = false
    const src = styleConf.logoUrl
    if (!src) { setComposedLogo(""); return }
    composeLogo(src, { shape: styleConf.logoShape, bg: styleConf.logoBg, bgColor: styleConf.logoBgColor })
      .then(u => { if (!cancelled) setComposedLogo(u) })
      .catch(() => { if (!cancelled) setComposedLogo(src) })
    return () => { cancelled = true }
  }, [styleConf.logoUrl, styleConf.logoShape, styleConf.logoBg, styleConf.logoBgColor])
  const renderStyle: QRStyleConfig = (styleConf.logoUrl && composedLogo && composedLogo !== styleConf.logoUrl)
    ? { ...styleConf, logoUrl: composedLogo } : styleConf

  async function save() {
    if (!active) return
    try {
      const res = await fetch("/api/qr-style", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ qr_id: active.id, foreground_color: fg, background_color: bg, corner_style: corner, error_correction: ecc, style_config: styleConf }),
      })
      const d = await res.json().catch(() => ({}))
      if (!res.ok || d?.error) { setStatus("error"); return }
      setQRCodes(prev => prev.map(q => q.id === active.id ? { ...q, foreground_color: fg, background_color: bg, corner_style: corner, error_correction: ecc, style_config: styleConf } : q))
      setStatus("saved"); setTimeout(() => setStatus(s => (s === "saved" ? "idle" : s)), 1600)
    } catch { setStatus("error") }
  }

  // Lisibilité AUTOMATIQUE — un seul moteur, un seul indicateur (§16).
  const scan = useMemo(() => qrScannability({
    fg: fg || "#080808", bg: bg || "#FFFFFF", transparent: styleConf.transparent,
    ecc: effectiveEcc, dotStyle: styleConf.dotStyle, hasLogo: !!styleConf.logoUrl, margin: styleConf.margin,
  }), [fg, bg, styleConf.transparent, effectiveEcc, styleConf.dotStyle, styleConf.logoUrl, styleConf.margin])
  const scanColor = scanLevelColor(scan.level)
  const risky = scan.level === "risque"

  function applyPreset(p: Preset) {
    if (!canUsePreset(userPlan, p)) { window.location.href = "/upgrade"; return }
    setFg(p.fg); setBg(p.bg)
    if (p.cornerStyle === "rounded" || p.cornerStyle === "circle" || p.cornerStyle === "luxury" || p.dotStyle === "rounded") setCorner("rounded")
    else if (p.dotStyle === "dot" || p.cornerStyle === "minimal") setCorner("dot")
    else setCorner("square")
    if (p.ecc) setEcc(p.ecc)
    setStyleConf(s => ({
      ...s,
      fg2: p.fg2 ?? "", cornerColor: p.cornerColor ?? "", eyeColor: p.eyeColor ?? "",
      gradient: p.gradient ?? "none", gradientBg: p.gradientBg ?? "",
      dotStyle: (p.dotStyle as any) ?? "square", cornerStyle: (p.cornerStyle as any) ?? "square",
      ...(p.margin !== undefined ? { margin: p.margin } : {}),
      ...(p.density !== undefined ? { density: p.density } : {}),
      ...(p.transparent !== undefined ? { transparent: p.transparent } : {}),
    }))
  }
  const presetActive = (p: Preset) => fg.toLowerCase() === p.fg.toLowerCase() && bg.toLowerCase() === p.bg.toLowerCase()

  // Prévention (§14/15 #8) : corriger une combinaison illisible en un clic (noir sur blanc).
  function fixContrast() { setFg("#0A0A0A"); setBg("#FFFFFF"); setStyleConf(s => ({ ...s, transparent: false })) }
  function invert() { setFg(bg || "#FFFFFF"); setBg(fg || "#0A0A0A") }

  function onLogoFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0]; e.target.value = ""; if (!f) return
    setLogoErr("")
    if (!f.type.startsWith("image/")) { setLogoErr("Fichier image requis (PNG, JPG, SVG)."); return }
    if (f.size > 2 * 1024 * 1024) { setLogoErr("Logo trop volumineux (max 2 Mo)."); return }
    const r = new FileReader()
    r.onload = () => setStyleConf(s => ({ ...s, logoUrl: String(r.result), logoSize: Math.min(s.logoSize ?? 18, 22) }))
    r.readAsDataURL(f)
  }

  function filename(ext: string) {
    const base = active?.pages?.title?.replace(/[^a-z0-9]/gi, "-").toLowerCase() || active?.short_code || "qr"
    return `${base}.${ext}`
  }
  async function download(fmt: "png" | "png-t" | "svg" | "pdf") {
    if (!active || risky) return
    setDlBusy(fmt)
    try {
      const opts = { data: qrUrl, fg, bg, ecc: effectiveEcc, style: renderStyle, size: 1024 }
      if (fmt === "svg") { const b = await getQRBlob(opts, "svg"); if (b) downloadBlob(b, filename("svg")) }
      else if (fmt === "pdf") {
        const png = await getQRBlob({ ...opts, style: { ...renderStyle, transparent: false } }, "png")
        if (png) await buildAndDownloadPdf(png, filename("pdf"), { title: active.pages?.title || undefined, url: qrUrl })
      } else if (fmt === "png-t") {
        const b = await getQRBlob({ ...opts, style: { ...renderStyle, transparent: true } }, "png"); if (b) downloadBlob(b, filename("png"))
      } else { const b = await getQRBlob(opts, "png"); if (b) downloadBlob(b, filename("png")) }
    } catch {}
    setDlBusy(null)
  }

  function copyUrl() { try { navigator.clipboard.writeText(qrUrl); setCopied(true); setTimeout(() => setCopied(false), 1500) } catch {} }
  function toggleFocus() { setCollapsed(v => { const n = !v; try { n ? localStorage.setItem("qrowg-qr-focus", "1") : localStorage.removeItem("qrowg-qr-focus") } catch {} ; return n }) }

  // Liste filtrée (archivés masqués) — la colonne ne sert qu'à changer de QR, pas à gérer.
  const list = useMemo(() => {
    const q = search.trim().toLowerCase()
    return qrCodes
      .filter(x => (x.status ?? "active") !== "archived")
      .filter(x => !q || (x.pages?.title || "").toLowerCase().includes(q) || x.short_code.toLowerCase().includes(q))
  }, [qrCodes, search])

  const statusText = status === "saving" ? "Enregistrement…" : status === "saved" ? "Enregistré" : status === "error" ? "Échec — réessayer" : "Enregistré"
  const statusColor = status === "error" ? "var(--danger)" : status === "saving" ? MUTED : "var(--success)"

  // Presets recommandés d'abord (catégorie détectée) puis le reste, limité pour rester compact.
  const detectedCat = useMemo(() => {
    const blob = `${active?.pages?.title ?? ""} ${active?.pages?.slug ?? ""}`.toLowerCase()
    const KW: Record<string, string[]> = {
      restaurant: ["resto", "restaurant", "pizz", "bistro", "cafe", "café", "menu", "burger", "sushi", "brasserie"],
      business: ["agence", "consult", "avocat", "cabinet", "finance", "immo", "corporate", "coach", "salon", "barber"],
      creator: ["photo", "studio", "portfolio", "artist", "design", "insta", "music", "podcast", "beauty", "tattoo"],
      tech: ["tech", "dev", "app", "saas", "crypto", "startup", "gaming", "digital"],
      event: ["mariage", "wedding", "event", "gala", "concert", "festival", "soiree", "club"],
      luxury: ["luxe", "luxury", "premium", "bijou", "prestige", "spa"],
    }
    for (const [cat, words] of Object.entries(KW)) if (words.some(w => blob.includes(w))) return cat
    return "classic"
  }, [active])
  const stylePresets = useMemo(() => {
    const reco = PRESETS.filter(p => p.cat === detectedCat)
    const rest = PRESETS.filter(p => p.cat !== detectedCat)
    return [...reco, ...rest].slice(0, 6)
  }, [detectedCat])

  const leftW = collapsed ? "0px" : "clamp(210px, 17vw, 244px)"

  return (
    <div style={{ fontFamily: "DM Sans, sans-serif", color: INK }}>
      <style>{`
        .qz-shell { height: calc(100dvh - 66px - 40px); }
        .qz-col::-webkit-scrollbar { width: 8px }
        .qz-col::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.12); border-radius: 8px }
        .qz-row { transition: background var(--mo-fast,.12s) var(--mo-ease-standard,ease), border-color var(--mo-fast,.12s) }
        .qz-row:hover { background: rgba(255,255,255,0.04) }
        .qz-preset { transition: transform var(--mo-fast,.12s) var(--mo-ease-standard,ease), border-color var(--mo-fast,.12s) }
        .qz-preset:hover { transform: translateY(-2px) }
        .qz-row:focus-visible, .qz-preset:focus-visible { outline: 2px solid var(--accent); outline-offset: 2px }
        @media (prefers-reduced-motion: reduce) { .qz-preset:hover { transform: none } }
        @media (max-width: 980px) {
          .qz-shell { height: auto }
          .qz-grid { grid-template-columns: 1fr !important }
          .qz-center { order: 1; min-height: 62vh }
          .qz-right { order: 2; overflow: visible !important; border-left: none !important; border-top: 1px solid ${LINE} }
          .qz-aside { order: 3; display: flex !important; max-height: 44vh; border-right: none !important; border-top: 1px solid ${LINE} }
        }
      `}</style>

      <div className="qz-shell qz-grid" style={{ display: "grid", gridTemplateColumns: `${leftW} minmax(0,1fr) clamp(300px, 24vw, 344px)`, gap: 0, background: SHELL_BG, border: `1px solid ${LINE}`, borderRadius: 16, overflow: "hidden" }}>

        {/* ── GAUCHE — MES QR ─────────────────────────────────────────── */}
        <aside className="qz-col qz-aside" style={{ borderRight: `1px solid ${LINE}`, display: collapsed ? "none" : "flex", flexDirection: "column", minHeight: 0, background: "rgba(0,0,0,0.18)" }}>
          <div style={{ padding: "12px 12px 8px", flexShrink: 0 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
              <span style={{ fontSize: 10.5, fontWeight: 800, letterSpacing: 1, color: MUTED, textTransform: "uppercase" }}>Mes QR</span>
              <Link href="/dashboard/templates" title="Nouveau QR" style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: 26, height: 26, borderRadius: 8, background: "color-mix(in srgb, var(--accent) 14%, transparent)", border: `1px solid color-mix(in srgb, var(--accent) 30%, transparent)`, color: G }}><Plus size={15} /></Link>
            </div>
            <div style={{ position: "relative" }}>
              <Search size={13} color={FAINT} style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)" }} />
              <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Rechercher…" style={{ width: "100%", boxSizing: "border-box", height: 34, padding: "0 10px 0 30px", background: SURF, border: `1px solid ${LINE}`, borderRadius: 9, color: INK, fontSize: 12.5, outline: "none" }} />
            </div>
          </div>
          <div className="qz-col" style={{ flex: 1, overflowY: "auto", padding: "0 8px 10px", minHeight: 0 }}>
            {list.map(q => {
              const on = q.id === activeId
              return (
                <button key={q.id} type="button" onClick={() => setActiveId(q.id)} className="qz-row" style={{ width: "100%", display: "flex", alignItems: "center", gap: 9, padding: "8px 9px", marginBottom: 3, borderRadius: 10, cursor: "pointer", textAlign: "left", background: on ? "color-mix(in srgb, var(--accent) 12%, transparent)" : "transparent", border: `1px solid ${on ? "color-mix(in srgb, var(--accent) 40%, transparent)" : "transparent"}` }}>
                  {/* Pastille légère (PAS de moteur QR par ligne — cf. perfs mobile). */}
                  <span style={{ width: 30, height: 30, borderRadius: 8, flexShrink: 0, background: q.background_color || "#fff", border: `1px solid ${LINE}`, display: "flex", alignItems: "center", justifyContent: "center" }}><QrCode size={16} color={q.foreground_color || "#0A0A0A"} /></span>
                  <span style={{ flex: 1, minWidth: 0 }}>
                    <span style={{ display: "block", fontSize: 12.5, fontWeight: 600, color: on ? INK : "#D9D3C7", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{q.pages?.title || q.short_code}</span>
                    <span style={{ display: "block", fontSize: 10, color: FAINT, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{q.pages ? "Page" : "Lien"} · {q.short_code}</span>
                  </span>
                  {(q.status ?? "active") === "active" && <span style={{ width: 6, height: 6, borderRadius: "50%", background: "var(--success)", flexShrink: 0 }} />}
                </button>
              )
            })}
            {list.length === 0 && <p style={{ color: FAINT, fontSize: 12, textAlign: "center", padding: "16px 8px" }}>Aucun QR.</p>}
          </div>
        </aside>

        {/* ── CENTRE — APERÇU ─────────────────────────────────────────── */}
        <section className="qz-center" style={{ display: "flex", flexDirection: "column", minWidth: 0, minHeight: 0 }}>
          {/* Barre d'action (autosave + sorties) — pas de toolbar chargée. */}
          <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 14px", borderBottom: `1px solid ${LINE}`, flexShrink: 0 }}>
            <button type="button" onClick={toggleFocus} title={collapsed ? "Afficher mes QR" : "Masquer mes QR (mode focus)"} style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: 32, height: 32, borderRadius: 8, background: "transparent", border: `1px solid ${LINE}`, color: MUTED, cursor: "pointer" }}>{collapsed ? <PanelLeftOpen size={16} /> : <PanelLeftClose size={16} />}</button>
            {active && <button type="button" onClick={() => setFsPreview(true)} title="Aperçu plein écran" style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: 32, height: 32, borderRadius: 8, background: "transparent", border: `1px solid ${LINE}`, color: MUTED, cursor: "pointer" }}><Maximize2 size={15} /></button>}
            <span style={{ fontSize: 11.5, color: statusColor, display: "inline-flex", alignItems: "center", gap: 5, fontWeight: 600 }}>
              {status === "saving" ? <span className="mo-pulse" style={{ width: 7, height: 7, borderRadius: "50%", background: MUTED }} /> : <Check size={13} />}{active ? statusText : ""}
            </span>
            <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 9 }}>
              <Link href={`/dashboard/print-studio${active ? `?qr=${active.short_code}` : ""}`} style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "8px 14px", borderRadius: 10, background: "transparent", border: `1px solid ${LINE}`, color: INK, fontSize: 12.5, fontWeight: 700, textDecoration: "none" }}><Printer size={14} /> Créer un support</Link>
              <button type="button" onClick={() => setDlOpen(true)} disabled={!active} className="da-btn-primary da-btn-primary--sm"><Download className="da-ic da-ic-dl" size={14} /> <span>Télécharger</span></button>
            </div>
          </div>

          {/* Résultat dominant : QR + nom + destination + UNE ligne de lisibilité. */}
          {active ? (
            <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 16, padding: 20, minHeight: 0 }}>
              <div ref={previewBox} style={{ flex: 1, width: "100%", maxWidth: 460, display: "flex", alignItems: "center", justifyContent: "center", minHeight: 0 }}>
                <div style={{ padding: 18, background: bg || "#fff", borderRadius: 20, boxShadow: "0 18px 50px rgba(0,0,0,0.45)", lineHeight: 0 }}>
                  <QRCanvas value={qrUrl} size={previewSize} fg={fg || "#080808"} bg={bg || "#FFFFFF"} ecc={effectiveEcc} style={renderStyle} />
                </div>
              </div>
              <div style={{ textAlign: "center", flexShrink: 0 }}>
                <p style={{ fontFamily: "Fraunces, serif", fontSize: 18, fontWeight: 700, color: INK, margin: "0 0 2px" }}>{active.pages?.title || active.short_code}</p>
                <button type="button" onClick={copyUrl} style={{ display: "inline-flex", alignItems: "center", gap: 6, background: "none", border: "none", color: MUTED, fontSize: 12, cursor: "pointer", fontFamily: "ui-monospace, monospace" }}>{qrUrl.replace(/^https?:\/\//, "")} {copied ? <Check size={12} color="var(--success)" /> : <Copy size={12} />}</button>
              </div>
              {/* Indicateur UNIQUE de lisibilité (§16) — détails au clic. */}
              <div style={{ flexShrink: 0, width: "100%", maxWidth: 460 }}>
                <button type="button" onClick={() => setScanOpen(o => !o)} style={{ width: "100%", display: "flex", alignItems: "center", gap: 9, padding: "9px 13px", borderRadius: 11, background: `color-mix(in srgb, ${scanColor} 8%, transparent)`, border: `1px solid color-mix(in srgb, ${scanColor} 30%, transparent)`, color: INK, cursor: "pointer", textAlign: "left" }}>
                  <span style={{ width: 9, height: 9, borderRadius: "50%", background: scanColor, flexShrink: 0, boxShadow: `0 0 8px ${scanColor}` }} />
                  <span style={{ flex: 1, fontSize: 12.5, fontWeight: 700, color: scanColor }}>{scan.label}</span>
                  {risky && <span onClick={e => { e.stopPropagation(); fixContrast() }} style={{ fontSize: 11, fontWeight: 700, color: "#080808", background: scanColor, borderRadius: 7, padding: "4px 9px" }}>Corriger</span>}
                  <ChevronDown size={15} color={MUTED} style={{ transform: scanOpen ? "rotate(180deg)" : "none", transition: "transform .2s", flexShrink: 0 }} />
                </button>
                {scanOpen && (
                  <div className="mo-fade-up" style={{ marginTop: 8, padding: "10px 13px", background: SURF, border: `1px solid ${LINE}`, borderRadius: 11, fontSize: 11.5, color: MUTED, lineHeight: 1.5 }}>
                    <p style={{ margin: "0 0 6px", color: INK, fontWeight: 700 }}>Diagnostic {scan.contrast != null ? `· contraste ${scan.contrast.toFixed(1)}:1` : ""} · correction {effectiveEcc}{styleConf.logoUrl ? " (auto pour logo)" : ""}</p>
                    {scan.advices.length ? <ul style={{ margin: 0, paddingLeft: 16 }}>{scan.advices.map((a, i) => <li key={i} style={{ marginBottom: 3 }}>{a}</li>)}</ul> : <p style={{ margin: 0 }}>Contraste, structure et marges validés — scan garanti.</p>}
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 12, color: MUTED, padding: 24, textAlign: "center" }}>
              <QrCode size={40} color={FAINT} />
              <p style={{ margin: 0, fontSize: 14 }}>{qrCodes.length ? "Choisissez un QR à gauche." : "Créez votre première page pour obtenir un QR."}</p>
              {!qrCodes.length && <Link href="/dashboard/templates" style={{ padding: "9px 16px", borderRadius: 10, background: G, color: "#080808", fontWeight: 700, fontSize: 13, textDecoration: "none" }}>Nouvelle page + QR</Link>}
            </div>
          )}
        </section>

        {/* ── DROITE — PERSONNALISER ──────────────────────────────────── */}
        <aside className="qz-col qz-right" style={{ borderLeft: `1px solid ${LINE}`, display: active ? "flex" : "none", flexDirection: "column", minHeight: 0, overflowY: "auto", background: "rgba(0,0,0,0.12)" }}>
          <div style={{ padding: 16, display: "flex", flexDirection: "column", gap: 20 }}>

            {/* STYLE */}
            <section>
              <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: 10 }}>
                <h3 style={{ ...secH, margin: 0 }}>Style</h3>
                <button type="button" onClick={() => setAllPresets(true)} style={{ background: "none", border: "none", color: MUTED, fontSize: 11.5, fontWeight: 600, cursor: "pointer", padding: 0 }}>Voir tout</button>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 8 }}>
                {stylePresets.map(p => {
                  const locked = !canUsePreset(userPlan, p)
                  const on = presetActive(p)
                  const dotR = p.dotStyle === "dot" ? "50%" : p.dotStyle === "rounded" ? "34%" : "2px"
                  return (
                    <button key={p.id} type="button" onClick={() => applyPreset(p)} className="qz-preset" title={p.label} style={{ position: "relative", padding: 8, borderRadius: 11, cursor: "pointer", background: p.bg, border: `2px solid ${on ? G : "transparent"}`, boxShadow: on ? `0 0 0 2px color-mix(in srgb, var(--accent) 30%, transparent)` : "none", opacity: locked ? 0.55 : 1 }}>
                      <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 2, width: 30, height: 30, margin: "0 auto" }}>
                        {Array.from({ length: 9 }).map((_, i) => <span key={i} style={{ background: [0, 2, 4, 6, 8, 3, 5].includes(i) ? p.fg : "transparent", borderRadius: dotR }} />)}
                      </div>
                      <span style={{ display: "block", marginTop: 6, fontSize: 8.5, fontWeight: 700, color: MUTED, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", textAlign: "center" }}>{p.label}</span>
                      {locked && <span style={{ position: "absolute", top: 4, right: 4, fontSize: 8, fontWeight: 800, color: G, background: "rgba(0,0,0,0.6)", borderRadius: 5, padding: "1px 4px" }}>PRO</span>}
                    </button>
                  )
                })}
              </div>
            </section>

            {/* FORME */}
            <section>
              <h3 style={secH}>Forme</h3>
              <p style={miniLabel}>Modules</p>
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 10 }}>
                {DOT_STYLES.slice(0, 6).map(d => {
                  const on = (styleConf.dotStyle ?? "square") === d.id
                  return <button key={d.id} type="button" onClick={() => setStyleConf(s => ({ ...s, dotStyle: d.id }))} title={d.label} style={shapeBtn(on)}>{d.emoji}</button>
                })}
              </div>
              <p style={miniLabel}>Coins</p>
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                {CORNER_STYLE_LIST.map(c => {
                  const on = (styleConf.cornerStyle ?? "square") === c.id
                  const g = c.id === "circle" ? "◉" : c.id === "rounded" ? "▢" : c.id === "diamond" ? "◈" : c.id === "luxury" ? "❖" : c.id === "minimal" ? "▫" : "■"
                  return <button key={c.id} type="button" onClick={() => setStyleConf(s => ({ ...s, cornerStyle: c.id }))} title={c.label} style={shapeBtn(on)}>{g}</button>
                })}
              </div>
            </section>

            {/* COULEURS */}
            <section>
              <h3 style={secH}>Couleurs</h3>
              <ColorRow label="QR" value={fg || "#0A0A0A"} onChange={setFg} />
              <ColorRow label="Fond" value={bg || "#FFFFFF"} onChange={setBg} />
              <div style={{ display: "flex", alignItems: "center", gap: 12, marginTop: 4 }}>
                <button type="button" onClick={invert} style={{ background: "none", border: "none", color: G, fontSize: 11.5, fontWeight: 700, cursor: "pointer", padding: 0 }}>Inverser</button>
                <button type="button" onClick={() => setGradOpen(o => !o)} style={{ background: "none", border: "none", color: MUTED, fontSize: 11.5, fontWeight: 600, cursor: "pointer", padding: 0 }}>{gradOpen || (styleConf.gradient && styleConf.gradient !== "none") ? "− Dégradé" : "+ Dégradé"}</button>
              </div>
              {/* Palettes recommandées (contraste garanti) */}
              <div style={{ display: "flex", gap: 7, flexWrap: "wrap", marginTop: 10 }}>
                {PALETTES.map(([pfg, pbg]) => {
                  const on = fg.toLowerCase() === pfg.toLowerCase() && bg.toLowerCase() === pbg.toLowerCase()
                  return <button key={pfg + pbg} type="button" onClick={() => { setFg(pfg); setBg(pbg) }} title="Palette" style={{ width: 30, height: 30, borderRadius: 8, cursor: "pointer", background: pbg, border: `2px solid ${on ? G : LINE}`, position: "relative", flexShrink: 0 }}><span style={{ position: "absolute", inset: 6, borderRadius: 4, background: pfg }} /></button>
                })}
              </div>
              {(gradOpen || (styleConf.gradient && styleConf.gradient !== "none")) && (
                <div className="mo-fade-up" style={{ marginTop: 12, padding: 10, background: SURF, border: `1px solid ${LINE}`, borderRadius: 10 }}>
                  <p style={miniLabel}>Type de dégradé</p>
                  <div style={{ display: "flex", gap: 4, background: "rgba(0,0,0,0.2)", borderRadius: 8, padding: 3, marginBottom: 8 }}>
                    {(["none", "linear", "radial", "diagonal"] as const).map(gt => <button key={gt} type="button" onClick={() => setStyleConf(s => ({ ...s, gradient: gt }))} style={{ flex: 1, padding: "6px 0", borderRadius: 6, border: "none", cursor: "pointer", fontSize: 10.5, fontWeight: (styleConf.gradient ?? "none") === gt ? 800 : 600, background: (styleConf.gradient ?? "none") === gt ? G : "transparent", color: (styleConf.gradient ?? "none") === gt ? "#080808" : MUTED }}>{gt === "none" ? "Aucun" : gt === "linear" ? "Linéaire" : gt === "radial" ? "Radial" : "Diagonal"}</button>)}
                  </div>
                  {styleConf.gradient && styleConf.gradient !== "none" && <ColorRow label="2ᵉ ton" value={styleConf.fg2 || fg || "#0A0A0A"} onChange={v => setStyleConf(s => ({ ...s, fg2: v }))} />}
                </div>
              )}
            </section>

            {/* LOGO */}
            <section>
              <h3 style={secH}>Logo</h3>
              <input ref={logoInput} type="file" aria-label="Importer un logo" accept="image/*" onChange={onLogoFile} style={{ display: "none" }} />
              {styleConf.logoUrl ? (
                <>
                  <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
                    <img src={styleConf.logoUrl} alt="" style={{ width: 34, height: 34, borderRadius: 8, objectFit: "contain", background: "#fff", border: `1px solid ${LINE}` }} />
                    <button type="button" onClick={() => logoInput.current?.click()} style={{ ...smallBtn, flex: 1 }}>Remplacer</button>
                    <button type="button" onClick={() => setStyleConf(s => ({ ...s, logoUrl: "" }))} title="Retirer" style={{ ...smallBtn, width: 34, padding: 0, color: "var(--danger)" }}><Trash2 size={14} /></button>
                  </div>
                  <p style={miniLabel}>Taille — plafonnée pour garantir le scan</p>
                  <input type="range" min={10} max={22} step={1} aria-label="Taille du logo" value={styleConf.logoSize ?? 18} onChange={e => setStyleConf(s => ({ ...s, logoSize: Number(e.target.value) }))} style={{ width: "100%", accentColor: "var(--accent)" }} />
                  <p style={{ ...miniLabel, marginTop: 8 }}>Forme</p>
                  <div style={{ display: "flex", gap: 6 }}>
                    {(["square", "rounded", "circle"] as const).map(sh => <button key={sh} type="button" onClick={() => setStyleConf(s => ({ ...s, logoShape: sh }))} style={shapeBtn((styleConf.logoShape ?? "rounded") === sh)}>{sh === "circle" ? "●" : sh === "rounded" ? "▢" : "■"}</button>)}
                  </div>
                </>
              ) : (
                <button type="button" onClick={() => logoInput.current?.click()} style={{ width: "100%", padding: "11px", borderRadius: 10, border: `1.5px dashed color-mix(in srgb, var(--accent) 34%, transparent)`, background: "color-mix(in srgb, var(--accent) 8%, transparent)", color: G, fontSize: 12.5, fontWeight: 700, cursor: "pointer" }}>+ Ajouter un logo</button>
              )}
              {logoErr && <p style={{ margin: "6px 0 0", fontSize: 11, color: "var(--danger)" }}>{logoErr}</p>}
            </section>

            {/* AVANCÉ (drawer discret) */}
            <div>
              <button type="button" onClick={() => setAdvOpen(o => !o)} style={{ display: "flex", alignItems: "center", gap: 7, width: "100%", padding: "9px 0", background: "none", border: "none", borderTop: `1px solid ${LINE}`, color: MUTED, fontSize: 12, fontWeight: 600, cursor: "pointer" }}>
                <Settings size={14} /> Réglages avancés <ChevronDown size={14} style={{ marginLeft: "auto", transform: advOpen ? "rotate(180deg)" : "none", transition: "transform .2s" }} />
              </button>
              {advOpen && (
                <div className="mo-fade-up" style={{ display: "flex", flexDirection: "column", gap: 14, paddingTop: 6 }}>
                  <div>
                    <p style={miniLabel}>Correction d'erreur</p>
                    <div style={{ display: "flex", gap: 4, background: SURF, borderRadius: 9, padding: 3 }}>
                      {(["L", "M", "Q", "H"] as const).map(l => <button key={l} type="button" onClick={() => setEcc(l)} style={{ flex: 1, padding: "7px 0", borderRadius: 7, border: "none", cursor: "pointer", fontSize: 11.5, fontWeight: ecc === l ? 800 : 600, background: ecc === l ? G : "transparent", color: ecc === l ? "#080808" : MUTED }}>{l}</button>)}
                    </div>
                  </div>
                  <div>
                    <p style={miniLabel}>Marge (zone silencieuse) · {styleConf.margin ?? 10}</p>
                    <input type="range" min={0} max={30} step={1} aria-label="Marge blanche" value={styleConf.margin ?? 10} onChange={e => setStyleConf(s => ({ ...s, margin: Number(e.target.value) }))} style={{ width: "100%", accentColor: "var(--accent)" }} />
                  </div>
                  <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12, color: INK, cursor: "pointer" }}>
                    <input type="checkbox" checked={!!styleConf.transparent} onChange={e => setStyleConf(s => ({ ...s, transparent: e.target.checked }))} style={{ accentColor: "var(--accent)" }} /> Fond transparent
                  </label>
                </div>
              )}
            </div>
          </div>
        </aside>
      </div>

      {/* ── MODALE TÉLÉCHARGER (§10) — sortie simple ─────────────────── */}
      {dlOpen && (
        <div onClick={() => setDlOpen(false)} style={{ position: "fixed", inset: 0, zIndex: 90, background: "rgba(0,0,0,0.6)", backdropFilter: "blur(4px)", display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
          <div onClick={e => e.stopPropagation()} className="mo-pop-in" style={{ width: "100%", maxWidth: 380, background: SHELL_BG, border: `1px solid ${LINE}`, borderRadius: 18, padding: 20, boxShadow: "0 24px 60px rgba(0,0,0,0.6)" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 4 }}>
              <h3 style={{ fontFamily: "Fraunces, serif", fontSize: 18, fontWeight: 700, margin: 0 }}>Télécharger votre QR</h3>
              <button type="button" onClick={() => setDlOpen(false)} style={{ background: "none", border: "none", color: MUTED, cursor: "pointer" }}><X size={18} /></button>
            </div>
            {risky ? (
              <div style={{ margin: "10px 0", padding: "12px 14px", borderRadius: 12, background: "var(--danger-bg)", border: "1px solid var(--danger-border)", color: "var(--danger)", fontSize: 12.5, display: "flex", gap: 8, alignItems: "flex-start" }}>
                <AlertTriangle size={16} style={{ flexShrink: 0, marginTop: 1 }} />
                <span>Ce QR risque de ne pas être lu. <button type="button" onClick={() => { fixContrast(); }} style={{ background: "none", border: "none", color: "var(--danger)", textDecoration: "underline", cursor: "pointer", fontWeight: 700, padding: 0 }}>Corriger automatiquement</button> avant de télécharger.</span>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 8, margin: "12px 0" }}>
                {([["png", "PNG", "Web, documents, présentations"], ["png-t", "PNG fond transparent", "Superposition sur un visuel"], ["svg", "SVG", "Vectoriel, qualité illimitée"], ["pdf", "PDF", "Impression simple"]] as const).map(([fmt, label, sub]) => (
                  <button key={fmt} type="button" onClick={() => download(fmt)} disabled={!!dlBusy} style={{ display: "flex", alignItems: "center", gap: 12, padding: "11px 13px", borderRadius: 12, background: SURF, border: `1px solid ${LINE}`, color: INK, cursor: "pointer", textAlign: "left" }}>
                    <Download size={16} color={G} />
                    <span style={{ flex: 1 }}><span style={{ display: "block", fontSize: 13, fontWeight: 700 }}>{label}</span><span style={{ display: "block", fontSize: 10.5, color: MUTED }}>{sub}</span></span>
                    {dlBusy === fmt && <span className="mo-pulse" style={{ fontSize: 11, color: MUTED }}>…</span>}
                  </button>
                ))}
              </div>
            )}
            <p style={{ margin: "6px 0 0", fontSize: 11, color: "var(--success)", display: "flex", alignItems: "center", gap: 6 }}><Check size={13} /> Lisibilité vérifiée automatiquement</p>
          </div>
        </div>
      )}

      {/* ── BIBLIOTHÈQUE COMPLÈTE DE STYLES (§P1.1 « Voir tout ») ─────── */}
      {allPresets && (
        <div onClick={() => setAllPresets(false)} style={{ position: "fixed", inset: 0, zIndex: 90, background: "rgba(0,0,0,0.6)", backdropFilter: "blur(4px)", display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
          <div onClick={e => e.stopPropagation()} className="mo-pop-in qz-col" style={{ width: "100%", maxWidth: 560, maxHeight: "80vh", overflowY: "auto", background: SHELL_BG, border: `1px solid ${LINE}`, borderRadius: 18, padding: 20, boxShadow: "0 24px 60px rgba(0,0,0,0.6)" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12, position: "sticky", top: 0, background: SHELL_BG }}>
              <h3 style={{ fontFamily: "Fraunces, serif", fontSize: 18, fontWeight: 700, margin: 0 }}>Tous les styles</h3>
              <button type="button" onClick={() => setAllPresets(false)} style={{ background: "none", border: "none", color: MUTED, cursor: "pointer" }}><X size={18} /></button>
            </div>
            {PRESET_CATS.map(cat => {
              const inCat = PRESETS.filter(p => p.cat === cat.id)
              if (!inCat.length) return null
              return (
                <div key={cat.id} style={{ marginBottom: 16 }}>
                  <p style={{ ...miniLabel, marginBottom: 8 }}>{cat.emoji} {cat.label}</p>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 8 }}>
                    {inCat.map(p => {
                      const locked = !canUsePreset(userPlan, p)
                      const on = presetActive(p)
                      const dotR = p.dotStyle === "dot" ? "50%" : p.dotStyle === "rounded" ? "34%" : "2px"
                      return (
                        <button key={p.id} type="button" onClick={() => { applyPreset(p); if (canUsePreset(userPlan, p)) setAllPresets(false) }} className="qz-preset" title={p.label} style={{ position: "relative", padding: 8, borderRadius: 11, cursor: "pointer", background: p.bg, border: `2px solid ${on ? G : "transparent"}`, opacity: locked ? 0.55 : 1 }}>
                          <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 2, width: 28, height: 28, margin: "0 auto" }}>
                            {Array.from({ length: 9 }).map((_, i) => <span key={i} style={{ background: [0, 2, 4, 6, 8, 3, 5].includes(i) ? p.fg : "transparent", borderRadius: dotR }} />)}
                          </div>
                          <span style={{ display: "block", marginTop: 5, fontSize: 8, fontWeight: 700, color: MUTED, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", textAlign: "center" }}>{p.label}</span>
                          {locked && <span style={{ position: "absolute", top: 3, right: 3, fontSize: 7.5, fontWeight: 800, color: G, background: "rgba(0,0,0,0.6)", borderRadius: 4, padding: "1px 3px" }}>PRO</span>}
                        </button>
                      )
                    })}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* ── APERÇU PLEIN ÉCRAN (§P0.3 mode focus) ────────────────────── */}
      {fsPreview && active && (
        <div onClick={() => setFsPreview(false)} style={{ position: "fixed", inset: 0, zIndex: 95, background: "rgba(0,0,0,0.92)", backdropFilter: "blur(6px)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 16, padding: 24 }}>
          <button type="button" onClick={() => setFsPreview(false)} aria-label="Fermer" style={{ position: "absolute", top: 20, right: 20, width: 42, height: 42, borderRadius: 999, background: "rgba(255,255,255,0.12)", border: "1px solid rgba(255,255,255,0.2)", color: "#fff", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}><X size={20} /></button>
          <div onClick={e => e.stopPropagation()} style={{ padding: 26, background: bg || "#fff", borderRadius: 24, lineHeight: 0, boxShadow: "0 24px 70px rgba(0,0,0,0.55)" }}>
            <QRCanvas value={qrUrl} size={Math.min(460, typeof window !== "undefined" ? Math.floor(Math.min(window.innerWidth, window.innerHeight) * 0.62) : 360)} fg={fg || "#080808"} bg={bg || "#FFFFFF"} ecc={effectiveEcc} style={renderStyle} />
          </div>
          <p style={{ color: "rgba(255,255,255,0.7)", fontSize: 13, margin: 0 }}>{active.pages?.title || active.short_code} · <span style={{ color: scanColor }}>{scan.label}</span></p>
        </div>
      )}
    </div>
  )
}

// Palettes recommandées — paires à contraste élevé (scan fiable garanti).
const PALETTES: [string, string][] = [
  ["#0A0A0A", "#FFFFFF"], ["#1E3A5F", "#FFFFFF"], ["#B91C1C", "#FFF7ED"],
  ["#047857", "#ECFDF5"], ["#4F46E5", "#FFFFFF"], ["#C9A84C", "#0A0A0A"], ["#2D2D2D", "#F5F0E8"],
]
const secH: React.CSSProperties = { fontFamily: "Fraunces, serif", fontSize: 15, fontWeight: 700, color: INK, margin: "0 0 10px" }
const miniLabel: React.CSSProperties = { margin: "0 0 6px", fontSize: 10.5, fontWeight: 600, color: MUTED }
const smallBtn: React.CSSProperties = { minHeight: 34, padding: "0 12px", borderRadius: 9, background: SURF, border: `1px solid ${LINE}`, color: INK, fontSize: 12, fontWeight: 600, cursor: "pointer", display: "inline-flex", alignItems: "center", justifyContent: "center" }
function shapeBtn(on: boolean): React.CSSProperties {
  return { width: 38, height: 38, borderRadius: 9, cursor: "pointer", fontSize: 16, display: "inline-flex", alignItems: "center", justifyContent: "center", background: on ? "color-mix(in srgb, var(--accent) 16%, transparent)" : SURF, border: `1px solid ${on ? "color-mix(in srgb, var(--accent) 45%, transparent)" : LINE}`, color: INK }
}
function ColorRow({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
      <span style={{ width: 42, fontSize: 12, color: MUTED }}>{label}</span>
      <label style={{ width: 30, height: 30, borderRadius: 8, border: `1px solid ${LINE}`, background: value, cursor: "pointer", position: "relative", overflow: "hidden", flexShrink: 0 }}>
        <input type="color" value={value} onChange={e => onChange(e.target.value)} style={{ position: "absolute", inset: 0, width: "100%", height: "100%", opacity: 0, cursor: "pointer", border: "none" }} />
      </label>
      <input value={value} onChange={e => onChange(e.target.value)} style={{ flex: 1, minWidth: 0, height: 30, padding: "0 8px", background: SURF, border: `1px solid ${LINE}`, borderRadius: 8, color: INK, fontSize: 12, fontFamily: "ui-monospace, monospace", outline: "none" }} />
    </div>
  )
}
