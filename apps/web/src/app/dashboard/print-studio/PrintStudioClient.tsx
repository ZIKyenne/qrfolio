"use client"

// Print Studio — UI guidée « objets, pas outils » (Print Studio Mobile v3).
// Bibliothèque -> aperçu packshot + 3 volets bornés -> contrôle avant export -> export.
// Consomme les modules purs : catalog / mockup / states / tokens.

import { useEffect, useMemo, useRef, useState } from "react"
import Link from "next/link"
import { ArrowLeft, Lock, Check, X, Download, ShieldCheck, AlertTriangle, ChevronDown, Copy, Layers } from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import Particles from "@/components/Particles"
import { Modal } from "@/components/ui/Modal"
import { Button } from "@/components/ui/Button"
import QRCanvas from "../qr-codes/QRCanvas"
import { getQRBlob, createQRSvg, type QROptions } from "../qr-codes/qrRender"
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
// eTitle / ePad sont des MULTIPLICATEURS continus (curseurs), 1 = valeur nominale.
const FINISH_LABEL: Record<string, string> = { uni: "Uni", degrade: "Dégradé", grain: "Grain", rayures: "Rayures", quadrillage: "Quadrillage" }
const FINISH_OPTS = [{ id: "uni", label: "Uni" }, { id: "degrade", label: "Dégradé" }, { id: "grain", label: "Grain" }, { id: "rayures", label: "Rayures" }, { id: "quadrillage", label: "Quadrillage" }]
const FRAME_LABEL: Record<string, string> = { aucun: "sans cadre", filet: "filet", double: "double filet", coins: "coins ornés" }
// Mises en page adaptées aux supports RONDS (centrées/symétriques) : les autres (bandeau, affiche, colonnes…)
// supposent un rectangle et se retrouvent rognées par le cercle.
const ROUND_LAYOUTS = new Set(["centre", "qrgeant", "cadre", "orne"])
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
  const [qrScale, setQrScale] = useState(1)            // curseur fin de taille du QR (× facteur du palier)
  const [blockY, setBlockY] = useState(0)              // placement vertical du bloc (curseur, -1..1)
  const [qrDx, setQrDx] = useState(0)                  // décalage fin du QR en X (-1..1)
  const [qrDy, setQrDy] = useState(0)                  // décalage fin du QR en Y (-1..1)
  const [bgImage, setBgImage] = useState<string | null>(null)  // photo de fond optionnelle (data URL)
  const [titleColor, setTitleColor] = useState("")     // couleurs par élément ("" = auto/thème)
  const [subColor, setSubColor] = useState("")
  const [ctaColor, setCtaColor] = useState("")
  const [advColor, setAdvColor] = useState(false)      // repli des couleurs avancées
  const [advQr, setAdvQr] = useState(false)            // repli du décalage fin du QR
  const [bgFinish, setBgFinish] = useState("uni")      // fini du fond du support (uni / dégradé / grain)
  const [frame, setFrame] = useState("aucun")          // cadre décoratif indépendant
  const [open, setOpen] = useState<string | null>(null)   // un seul volet ouvert
  const [showAllColors, setShowAllColors] = useState(false)
  const [control, setControl] = useState(false)           // écran « contrôle avant export »
  const [declineOpen, setDeclineOpen] = useState(false)    // sélecteur « décliner sur un autre support »
  const [campaignOpen, setCampaignOpen] = useState(false)  // sélecteur « planche multi-supports »
  const [campaign, setCampaign] = useState<string[]>([])   // supports retenus pour la planche
  const [campaignQty, setCampaignQty] = useState(1)        // exemplaires par format (imposition N-up)
  const [multiPrinting, setMultiPrinting] = useState(false)
  const [busy, setBusy] = useState(false)
  const [done, setDone] = useState(false)
  const [printing, setPrinting] = useState(false)         // la planche PDF n'est montée QUE pendant l'impression
  const [logoUrl, setLogoUrl] = useState<string | null>(null)
  const logoInput = useRef<HTMLInputElement>(null)
  const bgInput = useRef<HTMLInputElement>(null)

  // Source du QR : un QR EXISTANT de l'utilisateur, ou un PNG importé. AUCUNE création ici
  // (Print Studio n'est pas un concepteur de QR — il met en scène un QR déjà fait).
  const [qrSource, setQrSource] = useState<"mine" | "png">("mine")
  const [qrPickId, setQrPickId] = useState("")
  const [qrPng, setQrPng] = useState<string | null>(null)
  const [myQRs, setMyQRs] = useState<{ id: string; label: string; url: string }[]>([])
  const qrPngInput = useRef<HTMLInputElement>(null)

  // Modèles personnels (enregistrés sur CE navigateur — localStorage, aucune donnée serveur).
  const [savedPresets, setSavedPresets] = useState<{ id: string; name: string; cfg: Record<string, any> }[]>([])
  const [presetsRemote, setPresetsRemote] = useState(false)   // true = table print_presets dispo (compte) ; false = localStorage
  const [saving, setSaving] = useState(false)
  const [saveName, setSaveName] = useState("")
  // Ma charte (logo + accent + police), au compte ; repli localStorage.
  const [brandKit, setBrandKit] = useState<{ logo: string | null; accent: string; typo: string } | null>(null)
  const [brandRemote, setBrandRemote] = useState(false)
  // Modèles : d'abord le compte (Supabase, multi-appareils) ; repli localStorage si la table n'existe pas encore.
  useEffect(() => {
    let alive = true
    const sb = createClient()
    sb.from("print_presets").select("id, name, cfg").order("created_at", { ascending: false })
      .then(({ data, error }) => {
        if (!alive) return
        if (!error && data) { setSavedPresets(data.map((r: any) => ({ id: r.id, name: r.name, cfg: r.cfg || {} }))); setPresetsRemote(true) }
        else { try { const raw = localStorage.getItem("qrowg-print-presets"); if (raw) setSavedPresets(JSON.parse(raw)) } catch {} }
      })
    // Charte : peut renvoyer plusieurs lignes en équipe (une par membre) -> on prend la plus récente.
    sb.from("print_brand_kit").select("logo, accent, typo").order("updated_at", { ascending: false }).limit(1).maybeSingle()
      .then(({ data, error }) => {
        if (!alive) return
        if (!error) { setBrandRemote(true); if (data) setBrandKit({ logo: (data as any).logo || null, accent: (data as any).accent || "auto", typo: (data as any).typo || "auto" }) }
        else { try { const raw = localStorage.getItem("qrowg-print-brandkit"); if (raw) setBrandKit(JSON.parse(raw)) } catch {} }
      })
    return () => { alive = false }
  }, [])
  // Montage à la demande de la planche PDF : on la monte, on laisse le QR se rendre, puis on imprime.
  useEffect(() => {
    if (!printing) return
    const t = setTimeout(() => { try { window.print() } catch {} }, 220)   // laisse le QR SVG se rendre
    const after = () => setPrinting(false)
    window.addEventListener("afterprint", after)
    return () => { clearTimeout(t); window.removeEventListener("afterprint", after) }
  }, [printing])
  useEffect(() => {
    if (!multiPrinting) return
    const t = setTimeout(() => { try { window.print() } catch {} }, 340)   // multi = plus de QR SVG à rendre
    const after = () => setMultiPrinting(false)
    window.addEventListener("afterprint", after)
    return () => { clearTimeout(t); window.removeEventListener("afterprint", after) }
  }, [multiPrinting])
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
    }).catch(() => { /* liste vide : on retombe sur l'import PNG, pas de crash */ })
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
  const currentCfg: Record<string, any> = { styleId, layoutId, accent, bgFinish, frame, titleCase, titleWeight, qrBadge, qrPos, blockY, qrDx, qrDy, titleColor, subColor, ctaColor, eCorner, eAccent, eTypo, eAlign, eTitle, ePad }
  const activeSavedId = savedPresets.find(p => Object.keys(currentCfg).every(k => p.cfg[k] === currentCfg[k]))?.id
  const ambiances = useMemo(() => ambiancesFor(metier), [metier])
  // Taille EFFECTIVE du QR = palier × curseur fin. Sert au rendu ET au contrôle (guard ≥ 20 mm honnête).
  const effSize = { ...size, factor: +(size.factor * qrScale).toFixed(3) }
  const controls = useMemo(() => {
    let base = item ? evaluateControls(item, style, effSize) : []
    // Contrôles honnêtes : ce qu'on ne mesure pas réellement n'est pas affiché en vert.
    if (qrSource === "png") base = base.map(c => c.cle === "contrast" ? { ...c, ok: true, gravite: "avertissement" as const, valeur: "PNG — à vérifier" } : c)
    if (bgImage) base = base.map(c => c.cle === "textContrast" ? { ...c, ok: true, gravite: "avertissement" as const, valeur: "photo — à vérifier" } : c)
    return base
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [item, style, size, qrScale, qrSource, bgImage])
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
    if (typeof c.eTitle === "number") setETitle(c.eTitle); if (typeof c.ePad === "number") setEPad(c.ePad); if (typeof c.blockY === "number") setBlockY(c.blockY)
    if (typeof c.qrDx === "number") setQrDx(c.qrDx); if (typeof c.qrDy === "number") setQrDy(c.qrDy)
    setTitleColor(c.titleColor || ""); setSubColor(c.subColor || ""); setCtaColor(c.ctaColor || "")
  }
  function resetDesign() {
    if (!item) return
    setStyleId(item.pal); setLayoutId(resolveLayoutId(item.layout)); setAccent("auto"); setBgFinish("uni"); setFrame("aucun")
    setTitleCase("normal"); setTitleWeight("normal"); setQrBadge("carre"); setQrPos("centre"); setQrScale(1); setBlockY(0); setBgImage(null)
    setQrDx(0); setQrDy(0); setTitleColor(""); setSubColor(""); setCtaColor("")
    setECorner("adouci"); setEAccent("plein"); setETypo("auto"); setEAlign("center"); setETitle(1); setEPad(1)
  }
  async function saveCurrent() {
    const name = saveName.trim() || `Mon style ${savedPresets.length + 1}`
    setSaving(false); setSaveName("")
    if (presetsRemote) {
      const { data, error } = await createClient().from("print_presets").insert({ name, cfg: currentCfg }).select("id, name, cfg").single()
      if (!error && data) { setSavedPresets(p => [{ id: (data as any).id, name: (data as any).name, cfg: (data as any).cfg || {} }, ...p]); return }
    }
    persistPresets([...savedPresets, { id: `sv_${Date.now()}`, name, cfg: currentCfg }])
  }
  function deletePreset(id: string) {
    const next = savedPresets.filter(x => x.id !== id)
    setSavedPresets(next)
    if (presetsRemote) createClient().from("print_presets").delete().eq("id", id).then(() => {})
    else persistPresets(next)
  }
  async function saveBrandKit() {
    const kit = { logo: logoUrl, accent, typo: eTypo }
    setBrandKit(kit)
    if (brandRemote) { try { await createClient().from("print_brand_kit").upsert({ logo: logoUrl, accent, typo: eTypo, updated_at: new Date().toISOString() }, { onConflict: "user_id" }) } catch {} }
    else { try { localStorage.setItem("qrowg-print-brandkit", JSON.stringify(kit)) } catch {} }
  }
  function applyBrandKit() {
    if (!brandKit) return
    if (brandKit.logo) { setLogoUrl(brandKit.logo); setLogo("objet") }
    if (brandKit.accent) setAccent(brandKit.accent)
    if (brandKit.typo) setETypo(brandKit.typo)
  }
  // Décliner : on change de support en GARDANT tout (design + textes + QR). Rien n'est réinitialisé.
  function switchSupport(id: string) {
    const it = ITEM_BY_ID[id]; if (!it) return
    // Un layout rectangulaire (bandeau, affiche…) serait rogné sur un rond -> on recentre.
    if (it.shape === "round" && !ROUND_LAYOUTS.has(layoutId)) setLayoutId("centre")
    setItemId(id); setDeclineOpen(false)
  }

  function openItem(id: string) {
    const it = ITEM_BY_ID[id]; if (!it) return
    setItemId(id); setStyleId(it.pal); setLayoutId(resolveLayoutId(it.layout))
    setSizeId("moyen"); setBrandText(BRANDNAMES[0]); setSubtitle(""); setMessage(""); setCtaText(it.cta); setLogo("aucun")
    setETitle(1); setEPad(1); setECorner("adouci"); setEAccent("plein"); setETypo("auto"); setEAlign("center")
    setAccent("auto"); setTitleCase("normal"); setTitleWeight("normal"); setQrBadge("carre"); setQrPos("centre"); setQrScale(1); setBlockY(0); setBgImage(null)
    setQrDx(0); setQrDy(0); setTitleColor(""); setSubColor(""); setCtaColor(""); setAdvColor(false); setAdvQr(false)
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
      <div style={{ minHeight: "100dvh", background: C.bg, color: C.fg, display: "flex", alignItems: "center", justifyContent: "center", padding: 24, fontFamily: "Inter, system-ui, sans-serif" }}>
        <div style={{ maxWidth: 400, textAlign: "center" }}>
          <div style={{ width: 54, height: 54, borderRadius: 16, background: C.goldSoft, border: `1px solid ${C.goldA55}`, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px" }}><Lock size={22} color={C.gold} /></div>
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
    return (
      <div style={{ position: "relative", minHeight: "100dvh", color: C.fg, fontFamily: "Inter, system-ui, sans-serif", padding: "0 16px 40px" }}>
        <Particles behind />
        <header style={{ maxWidth: 1040, margin: "0 auto", padding: "18px 0 8px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <Link href="/dashboard/qr-codes" style={{ display: "inline-flex", alignItems: "center", gap: 6, color: C.fgMuted, textDecoration: "none", fontSize: 13 }}><ArrowLeft size={16} /> QR codes</Link>
          <span style={{ fontSize: 13, fontWeight: 700, color: C.gold, letterSpacing: 0.3 }}>Print Studio</span>
        </header>
        <div style={{ maxWidth: 1040, margin: "0 auto" }}>
          <style>{`.ps-card{transition:border-color .15s var(--mo-ease,ease), transform .15s var(--mo-ease,ease), background .15s}.ps-card:hover{border-color:color-mix(in srgb,var(--accent) 45%,transparent);transform:translateY(-2px)}`}</style>
          <h1 style={{ fontFamily: "Fraunces, Georgia, serif", fontSize: "clamp(24px,4vw,34px)", fontWeight: 600, letterSpacing: "-0.02em", margin: "10px 0 6px" }}>Choisissez un support</h1>
          <p style={{ color: C.fgMuted, fontSize: 14, margin: "0 0 18px" }}>Un objet réel, déjà réussi. Trois suffisent : à table, en vitrine, dans la main.</p>

          {/* Filtres métier × objectif */}
          <Rail label="Métier" value={metier} options={METIERS} onPick={setMetier} />
          <Rail label="Objectif" value={objectif} options={OBJECTIFS} onPick={setObjectif} />

          {/* Grille d'objets */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(150px,1fr))", gap: 12, marginTop: 18 }}>
            {items.map(it => (
              <button key={it.id} className="ps-card" onClick={() => openItem(it.id)} style={{ textAlign: "left", background: C.surface, border: `1px solid ${C.hairline}`, borderRadius: R.card, padding: 12, cursor: "pointer", color: C.fg, display: "flex", flexDirection: "column", gap: 10 }}>
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
        </div>
      </div>
    )
  }

  // ── Studio (aperçu + volets + action) ─────────────────────────────────────────
  const scene = sceneLayers(item.scene, metier === "Tout" ? null : metier)
  const pal = paletteFromStyle(style)
  // Tous les réglages de DESIGN partagés (sans `item`/`physW`/`w`/`h`) — réutilisés pour la planche multi-supports.
  const designProps = { style, pal, layout, size: effSize, qrValue, qrImg, qrBadge, qrPos, qrDx, qrDy, logo, logoUrl, bgFinish, bgImage, frame, accent, titleCase, titleWeight, titleColor, subColor, ctaColor, blockY, brand, subtitle, title, cta, eCorner, eAccent, eTypo, eAlign, eTitle, ePad }
  // Planche = chaque format retenu, répété `campaignQty` fois (imposition N-up : N exemplaires par format).
  const campaignItems = (campaign.length ? campaign : [item.id]).flatMap(id => Array(Math.max(1, campaignQty)).fill(id)).map(id => ITEM_BY_ID[id]).filter(Boolean)
  return (
    <div style={{ position: "relative", minHeight: "100dvh", color: C.fg, fontFamily: "Inter, system-ui, sans-serif" }}>
      <Particles behind />
      <header style={{ maxWidth: 1180, margin: "0 auto", padding: "14px 16px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <button onClick={() => setPhase("library")} style={{ display: "inline-flex", alignItems: "center", gap: 6, background: "none", border: "none", color: C.fgMuted, cursor: "pointer", fontSize: 13 }}><ArrowLeft size={16} /> Bibliothèque</button>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <button onClick={() => setDeclineOpen(true)} style={{ display: "inline-flex", alignItems: "center", gap: 6, background: C.goldSoft, border: `1px solid ${C.goldA55}`, color: C.gold, cursor: "pointer", fontSize: 12.5, fontWeight: 700, borderRadius: 999, padding: "7px 14px" }}><Copy size={14} /> Décliner</button>
          <button onClick={() => { if (!campaign.length) setCampaign([item.id]); setCampaignOpen(true) }} style={{ display: "inline-flex", alignItems: "center", gap: 6, background: "transparent", border: `1px solid ${C.hairline}`, color: C.fg, cursor: "pointer", fontSize: 12.5, fontWeight: 700, borderRadius: 999, padding: "7px 14px" }}><Layers size={14} /> Planche</button>
          <span style={{ fontSize: 12.5, fontWeight: 700, color: C.fgMuted }}>{item.name} · <span style={{ fontFamily: "ui-monospace, monospace" }}>{item.size}</span></span>
        </div>
      </header>

      <div className="ps-grid" style={{ maxWidth: 1180, margin: "0 auto", padding: "0 16px 120px", display: "grid", gap: 18, gridTemplateColumns: "1fr" }}>
        <style>{`@media(min-width:1025px){.ps-grid{grid-template-columns:1.2fr 1fr!important}.ps-aside{position:sticky;top:14px;align-self:start}}`}</style>

        {/* Aperçu packshot */}
        <div className="ps-aside">
          <Packshot item={item} scene={scene} pal={pal} style={style} layout={layout} size={effSize} qrValue={qrValue} qrImg={qrImg} qrBadge={qrBadge} qrPos={qrPos} qrDx={qrDx} qrDy={qrDy} logo={logo} logoUrl={logoUrl} bgFinish={bgFinish} bgImage={bgImage} frame={frame} accent={accent} titleCase={titleCase} titleWeight={titleWeight} titleColor={titleColor} subColor={subColor} ctaColor={ctaColor} blockY={blockY}
            brand={brand} subtitle={subtitle} title={title} cta={cta} eCorner={eCorner} eAccent={eAccent} eTypo={eTypo} eAlign={eAlign} eTitle={eTitle} ePad={ePad} />
          <p style={{ textAlign: "center", color: C.fgMuted, fontSize: 11.5, margin: "8px 0 0" }}>{scene.caption} · {qrReady ? "votre QR est en place" : "ajoutez votre QR dans « Le QR »"}</p>
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
                  <button onClick={() => deletePreset(p.id)} aria-label="Supprimer ce modèle" style={{ background: "none", border: "none", color: "inherit", cursor: "pointer", padding: "0 6px", opacity: 0.55, fontSize: 15, lineHeight: 1 }}>×</button>
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
            {/* Ma charte : logo + accent + police mémorisés au compte, appliqués en 1 clic. */}
            <div style={{ display: "flex", gap: 7, marginTop: 8, alignItems: "center", flexWrap: "wrap" }}>
              <span style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1, color: C.fgFaint, marginRight: 2 }}>Ma charte</span>
              {brandKit && <button onClick={applyBrandKit} style={{ ...chipStyle(false), minHeight: 38 }}>Appliquer</button>}
              <button onClick={saveBrandKit} style={{ ...chipStyle(false), minHeight: 38, whiteSpace: "nowrap" }}>{brandKit ? "Mettre à jour" : "Enregistrer (logo · accent · police)"}</button>
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
                <button onClick={() => qrPngInput.current?.click()} style={{ marginTop: 10, width: "100%", minHeight: 44, borderRadius: 11, border: `1.5px dashed ${C.goldA55}`, background: C.goldSoft, color: C.gold, fontSize: 13, fontWeight: 600, cursor: "pointer" }}>Importer un PNG</button>
              )
            )}
            <input ref={qrPngInput} type="file" accept="image/png,image/*" style={{ display: "none" }} onChange={e => { const f = e.target.files?.[0]; if (f) { const r = new FileReader(); r.onload = () => setQrPng(String(r.result)); r.readAsDataURL(f) } if (e.target) e.target.value = "" }} />
            <Field label="Taille du QR"><RailInline value={sizeId} options={SIZES.map(s => ({ id: s.id, label: s.label, note: s.note }))} onPick={setSizeId} /></Field>
            <Field label="Ajustement fin"><Range value={qrScale} min={0.7} max={1.5} step={0.05} onChange={setQrScale} hint={`${Math.round(qrScale * 100)} % · ${Math.round(item.qrMm * size.factor * qrScale)} mm`} /></Field>
            <Field label="Pastille"><Seg value={qrBadge} options={["carre", "cercle", "aucune"]} onPick={setQrBadge} labels={["Carré", "Cercle", "Aucune"]} /></Field>
            {layout.content === "stack" && <Field label="Position du QR"><Seg value={qrPos} options={["haut", "centre", "bas"]} onPick={setQrPos} labels={["Haut", "Centre", "Bas"]} /></Field>}
            <button onClick={() => setAdvQr(v => !v)} style={{ alignSelf: "flex-start", background: "none", border: "none", color: C.gold, cursor: "pointer", fontSize: 12, padding: 0 }}>{advQr ? "Masquer le décalage fin" : "Décalage fin du QR (avancé) →"}</button>
            {advQr && <>
              <Field label="Décalage horizontal"><Range value={qrDx} min={-1} max={1} step={0.1} onChange={setQrDx} hint={qrDx < -0.05 ? "← gauche" : qrDx > 0.05 ? "droite →" : "centré"} /></Field>
              <Field label="Décalage vertical"><Range value={qrDy} min={-1} max={1} step={0.1} onChange={setQrDy} hint={qrDy < -0.05 ? "↑ haut" : qrDy > 0.05 ? "bas ↓" : "centré"} /></Field>
            </>}
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
                  <button key={a.id} onClick={() => setAccent(a.id)} title={a.label} style={{ width: 44, height: 44, borderRadius: 11, cursor: "pointer", border: `2px solid ${accent === a.id ? C.gold : "transparent"}`, boxShadow: accent === a.id ? `0 0 0 2px ${C.goldA33}` : "none", background: a.hex || "conic-gradient(from 210deg,#C9A84C,#D4483B,#3E9E6E,#3B6FD4,#7A5CD4,#C9A84C)", position: "relative" }}>
                    {a.id === "auto" && <span style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 8.5, fontWeight: 800, color: "#fff", textShadow: "0 1px 2px rgba(0,0,0,.6)" }}>AUTO</span>}
                  </button>
                ))}
              </div>
            </Field>
            <Field label="Mise en page"><RailInline value={layoutId} options={LAYOUTS.filter(l => item.shape !== "round" || ROUND_LAYOUTS.has(l.id)).map(l => ({ id: l.id, label: l.label }))} onPick={setLayoutId} /></Field>
          </Panel>

          {/* Volet DESIGN — 100 % design (aucun réglage du QR : il est fourni tel quel) */}
          <Panel id="details" title="Le design" resume={`${FINISH_LABEL[bgFinish] ?? "Uni"} · ${FRAME_LABEL[frame] ?? "sans cadre"}`} open={open} setOpen={setOpen}>
            <Field label="Fond"><RailInline value={bgFinish} options={FINISH_OPTS} onPick={setBgFinish} /></Field>
            <Field label="Photo de fond">
              {bgImage
                ? <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <div style={{ width: 44, height: 44, borderRadius: 8, overflow: "hidden", flexShrink: 0, border: `1px solid ${C.hairline}`, backgroundImage: `url(${bgImage})`, backgroundSize: "cover", backgroundPosition: "center" }} />
                    <span style={{ flex: 1, fontSize: 11.5, color: C.fgMuted, lineHeight: 1.4 }}>Photo posée en fond — voile de lisibilité automatique.</span>
                    <button onClick={() => setBgImage(null)} aria-label="Retirer la photo" style={{ background: "rgba(255,86,74,0.1)", border: "1px solid rgba(255,86,74,0.25)", borderRadius: 8, width: 40, height: 40, color: C.bad, cursor: "pointer", flexShrink: 0 }}><X size={15} /></button>
                  </div>
                : <button onClick={() => bgInput.current?.click()} style={{ width: "100%", minHeight: 42, borderRadius: 11, border: `1.5px dashed ${C.goldA55}`, background: C.goldSoft, color: C.gold, fontSize: 13, fontWeight: 600, cursor: "pointer" }}>Importer une photo</button>}
              <input ref={bgInput} type="file" accept="image/*" style={{ display: "none" }} onChange={e => { const f = e.target.files?.[0]; if (f) { const r = new FileReader(); r.onload = () => setBgImage(String(r.result)); r.readAsDataURL(f) } if (e.target) e.target.value = "" }} />
            </Field>
            <Field label="Cadre"><Seg value={frame} options={["aucun", "filet", "double", "coins"]} onPick={setFrame} labels={["Aucun", "Filet", "Double", "Coins"]} /></Field>
            <Field label="Taille du titre"><Range value={eTitle} min={0.7} max={1.6} step={0.05} onChange={setETitle} hint={`${Math.round(eTitle * 100)} %`} /></Field>
            <Field label="Air autour"><Range value={ePad} min={0.5} max={1.6} step={0.05} onChange={setEPad} hint={ePad < 0.85 ? "serré" : ePad > 1.2 ? "large" : "équilibré"} /></Field>
            {layout.content !== "band" && <Field label="Placement vertical"><Range value={blockY} min={-1} max={1} step={0.1} onChange={setBlockY} hint={blockY < -0.1 ? "vers le haut" : blockY > 0.1 ? "vers le bas" : "centré"} /></Field>}
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
                : <button onClick={() => logoInput.current?.click()} style={{ marginTop: 8, width: "100%", minHeight: 42, borderRadius: 11, border: `1.5px dashed ${C.goldA55}`, background: C.goldSoft, color: C.gold, fontSize: 13, fontWeight: 600, cursor: "pointer" }}>Ajouter un logo</button>
              )}
              <input ref={logoInput} type="file" accept="image/*" style={{ display: "none" }} onChange={e => { const f = e.target.files?.[0]; if (f) { const r = new FileReader(); r.onload = () => setLogoUrl(String(r.result)); r.readAsDataURL(f) } if (e.target) e.target.value = "" }} />
            </Field>
            <button onClick={() => setAdvColor(v => !v)} style={{ alignSelf: "flex-start", background: "none", border: "none", color: C.gold, cursor: "pointer", fontSize: 12, padding: 0 }}>{advColor ? "Masquer les couleurs par élément" : "Couleurs par élément (avancé) →"}</button>
            {advColor && <>
              <Field label="Couleur du titre"><ColorField value={titleColor} onChange={setTitleColor} /></Field>
              <Field label="Couleur du sous-titre"><ColorField value={subColor} onChange={setSubColor} /></Field>
              <Field label="Couleur du bouton"><ColorField value={ctaColor} onChange={setCtaColor} /></Field>
            </>}
            <button onClick={resetDesign} style={{ alignSelf: "flex-start", background: "none", border: "none", color: C.fgMuted, cursor: "pointer", fontSize: 12, padding: 0, textDecoration: "underline" }}>Réinitialiser le design</button>
          </Panel>
        </div>
      </div>

      {/* Barre d'action ancrée */}
      <div style={{ position: "fixed", left: 0, right: 0, bottom: 0, background: `${C.surface}f2`, borderTop: `1px solid ${C.hairline}`, backdropFilter: "blur(8px)", padding: "12px 16px calc(12px + env(safe-area-inset-bottom))", zIndex: 30 }}>
        <div style={{ maxWidth: 1180, margin: "0 auto", display: "flex", gap: 10, alignItems: "center", justifyContent: "flex-end" }}>
          <span style={{ marginRight: "auto", fontSize: 12, fontWeight: 600, color: ok ? C.ok : C.bad, background: ok ? "var(--success-bg)" : "var(--danger-bg)", border: `1px solid ${ok ? "color-mix(in srgb,var(--success) 30%,transparent)" : "var(--danger-border)"}`, borderRadius: 999, padding: "6px 12px", display: "inline-flex", alignItems: "center", gap: 6 }}>{ok ? <><ShieldCheck size={14} /> Prêt à imprimer</> : <><AlertTriangle size={14} /> Un réglage à corriger</>}</span>
          <Button variant="primary" onClick={() => setControl(true)}>Vérifier & exporter</Button>
        </div>
      </div>

      {/* Écran CONTRÔLE avant export */}
      <Modal open={control} onClose={() => setControl(false)} title="Contrôle avant export" maxWidth={520}>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {controls.map(c => (
            <div key={c.cle} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 12px", borderRadius: 11, background: C.surfaceUp, border: `1px solid ${c.ok ? "transparent" : (c.gravite === "bloquant" ? `${C.badA55}` : `${C.goldA55}`)}` }}>
              <span style={{ width: 20, height: 20, borderRadius: "50%", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", background: c.ok ? `${C.okA22}` : (c.gravite === "bloquant" ? `${C.badA22}` : `${C.goldA22}`), color: c.ok ? C.ok : (c.gravite === "bloquant" ? C.bad : C.gold) }}>{c.ok ? <Check size={12} /> : <AlertTriangle size={12} />}</span>
              <span style={{ flex: 1, fontSize: 13, color: C.fg }}>{c.libelle}{!c.ok && c.gravite === "avertissement" && <span style={{ color: C.gold, fontSize: 11 }}> · avertissement</span>}</span>
              <span style={{ fontFamily: "ui-monospace, monospace", fontSize: 12, color: C.fgMuted }}>{c.valeur}</span>
            </div>
          ))}
        </div>
        {!qrReady && <p style={{ margin: "12px 0 0", fontSize: 12, color: C.gold, display: "inline-flex", alignItems: "center", gap: 6 }}><AlertTriangle size={13} /> Ajoutez d'abord votre QR (volet « Le QR »).</p>}
        <div style={{ marginTop: 14 }}>
          <Button variant="primary" fullWidth disabled={!ok || !qrReady} leftIcon={<Download size={18} />} onClick={() => { setControl(false); setPrinting(true) }}>{ok ? "Exporter la planche (PDF · taille réelle)" : "Corrigez le réglage rouge"}</Button>
        </div>
        <p style={{ color: C.fgFaint, fontSize: 11, textAlign: "center", margin: "8px 0 0" }}>Ouvre l'impression du navigateur → « Enregistrer en PDF » : à la taille réelle ({pageDims(item).pageWmm} × {pageDims(item).pageHmm} mm, {item.shape === "round" ? "fond perdu inclus" : "fond perdu + traits de coupe"}, texte + QR vectoriels).</p>
        {qrSource === "mine" && (
          <div style={{ display: "flex", gap: 10, marginTop: 14 }}>
            <Button variant="secondary" fullWidth disabled={!ok || !qrReady || busy} leftIcon={done ? <Check size={16} /> : <Download size={16} />} onClick={() => exportQr("png")}>{busy ? "…" : done ? "Téléchargé" : "QR seul (PNG)"}</Button>
            <Button variant="secondary" disabled={!ok || !qrReady || busy} onClick={() => exportQr("svg")}>SVG</Button>
          </div>
        )}
      </Modal>

      {/* Décliner : choisir un autre support en gardant tout le design + textes + QR. */}
      {declineOpen && (
        <Modal open={declineOpen} onClose={() => setDeclineOpen(false)} title="Décliner sur un autre support" maxWidth={720}>
          <p style={{ margin: "0 0 14px", fontSize: 12.5, color: C.fgMuted }}>Le design, les textes et le QR sont conservés — même campagne, autre format.</p>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(130px,1fr))", gap: 10 }}>
            {filterItems("Tout", "Tout").map(it => (
              <button key={it.id} className="ps-card" onClick={() => switchSupport(it.id)} style={{ textAlign: "left", background: it.id === item.id ? C.goldSoft : C.surfaceUp, border: `1px solid ${it.id === item.id ? `${C.goldA88}` : C.hairline}`, borderRadius: R.card, padding: 10, cursor: "pointer", color: C.fg, display: "flex", flexDirection: "column", gap: 8 }}>
                <div style={{ height: 96, borderRadius: 9, background: "radial-gradient(80% 70% at 50% 8%, #2a2e34, #16181c)", display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden" }}>
                  <MiniSupport item={it} style={style} />
                </div>
                <div>
                  <p style={{ margin: 0, fontSize: 12.5, fontWeight: 700, color: C.fg }}>{it.name}{it.id === item.id && <span style={{ color: C.gold }}> · actuel</span>}</p>
                  <p style={{ margin: "2px 0 0", fontSize: 10.5, color: C.fgFaint, fontFamily: "ui-monospace, monospace" }}>{it.size}</p>
                </div>
              </button>
            ))}
          </div>
        </Modal>
      )}

      {/* Planche multi-supports : choisir plusieurs formats, tous avec le MÊME design. */}
      {campaignOpen && (
        <Modal open={campaignOpen} onClose={() => setCampaignOpen(false)} title="Planche multi-supports" maxWidth={720}
          footer={<Button variant="primary" fullWidth disabled={!campaign.length} leftIcon={<Download size={18} />} onClick={() => { if (campaign.length) { setCampaignOpen(false); setMultiPrinting(true) } }}>Exporter la planche ({campaign.length} format{campaign.length > 1 ? "s" : ""}{campaignQty > 1 ? ` × ${campaignQty}` : ""})</Button>}>
          <p style={{ margin: "0 0 14px", fontSize: 12.5, color: C.fgMuted }}>Cochez les formats à imprimer ensemble (même design, mêmes textes, même QR). Une seule feuille, à découper.</p>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(130px,1fr))", gap: 10 }}>
            {filterItems("Tout", "Tout").map(it => {
              const on = campaign.includes(it.id)
              return (
                <button key={it.id} className="ps-card" onClick={() => setCampaign(cur => on ? cur.filter(x => x !== it.id) : [...cur, it.id])} style={{ position: "relative", textAlign: "left", background: on ? C.goldSoft : C.surfaceUp, border: `1px solid ${on ? `${C.goldA88}` : C.hairline}`, borderRadius: R.card, padding: 10, cursor: "pointer", color: C.fg, display: "flex", flexDirection: "column", gap: 8 }}>
                  {on && <span style={{ position: "absolute", top: 8, right: 8, width: 22, height: 22, borderRadius: "50%", background: C.gold, color: "#0A0A0A", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 2 }}><Check size={13} /></span>}
                  <div style={{ height: 96, borderRadius: 9, background: "radial-gradient(80% 70% at 50% 8%, #2a2e34, #16181c)", display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden" }}>
                    <MiniSupport item={it} style={style} />
                  </div>
                  <div>
                    <p style={{ margin: 0, fontSize: 12.5, fontWeight: 700, color: C.fg }}>{it.name}</p>
                    <p style={{ margin: "2px 0 0", fontSize: 10.5, color: C.fgFaint, fontFamily: "ui-monospace, monospace" }}>{it.size}</p>
                  </div>
                </button>
              )
            })}
          </div>
          <div style={{ marginTop: 14 }}>
            <p style={{ margin: "0 0 6px", fontSize: 11.5, fontWeight: 600, color: C.fgMuted }}>Exemplaires par format · {campaignQty}</p>
            <Range value={campaignQty} min={1} max={24} step={1} onChange={v => setCampaignQty(Math.round(v))} hint={`${(campaign.length || 1) * campaignQty} vignette${(campaign.length || 1) * campaignQty > 1 ? "s" : ""} au total`} />
          </div>
          <p style={{ color: C.fgFaint, fontSize: 11, textAlign: "center", margin: "10px 0 0" }}>Une feuille auto-dimensionnée, chaque exemplaire à sa taille réelle avec repère de découpe (idéal cartes/stickers en série).</p>
        </Modal>
      )}

      {/* Rendu de la PLANCHE multi-supports — monté seulement pendant l'impression. */}
      {multiPrinting && <MultiSheet items={campaignItems} design={designProps} />}

      {/* Planche d'impression — montée UNIQUEMENT pendant l'impression (évite un 2e moteur QR en fond). */}
      {printing && <div className="ps-print-root" aria-hidden>
        <style>{`@media screen{.ps-print-root{display:none!important}}@media print{body *{visibility:hidden!important}.ps-print-root,.ps-print-root *{visibility:visible!important}.ps-print-root{position:fixed!important;left:0;top:0;display:block!important}@page{size:${mediaDims(item).mediaWmm}mm ${mediaDims(item).mediaHmm}mm;margin:0}}`}</style>
        <PrintSheet item={item} style={style} pal={pal} layout={layout} brand={brand} subtitle={subtitle} title={title} cta={cta} size={effSize} qrValue={qrValue} qrImg={qrImg} qrBadge={qrBadge} qrPos={qrPos} qrDx={qrDx} qrDy={qrDy} logo={logo} logoUrl={logoUrl} bgFinish={bgFinish} bgImage={bgImage} frame={frame} accent={accent} titleCase={titleCase} titleWeight={titleWeight} titleColor={titleColor} subColor={subColor} ctaColor={ctaColor} blockY={blockY} eCorner={eCorner} eAccent={eAccent} eTypo={eTypo} eAlign={eAlign} eTitle={eTitle} ePad={ePad} />
      </div>}
    </div>
  )
}

/* ─────────────────────────── sous-composants ─────────────────────────── */

const inputStyle: React.CSSProperties = { width: "100%", boxSizing: "border-box", height: 48, background: "#0A0A0A", border: `1px solid ${C.hairline}`, borderRadius: 12, color: C.fg, fontSize: 16, padding: "0 14px", outline: "none" }

function Rail({ label, value, options, onPick }: { label: string; value: string; options: string[]; onPick: (v: string) => void }) {
  return (
    <div style={{ marginTop: 12 }}>
      <p style={{ margin: "0 0 6px", fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1, color: C.fgFaint }}>{label}</p>
      {/* fondu à droite = repère « ça défile » quand la liste dépasse (26 métiers) */}
      <div style={{ position: "relative" }}>
        <div style={{ display: "flex", gap: 7, overflowX: "auto", paddingBottom: 4, scrollbarWidth: "none" }}>
          {options.map(o => <button key={o} onClick={() => onPick(o)} style={chipStyle(value === o)}>{o}</button>)}
        </div>
        <div aria-hidden style={{ position: "absolute", top: 0, right: 0, bottom: 4, width: 28, pointerEvents: "none", background: "linear-gradient(90deg, transparent, #080808)" }} />
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
          <span style={{ display: "block", fontFamily: "Fraunces, Georgia, serif", fontSize: 15.5, fontWeight: 600 }}>{title}</span>
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
  return <button onClick={onClick} style={{ minHeight: 44, padding: "10px 14px", borderRadius: R.chip, cursor: "pointer", fontSize: 12.5, fontWeight: 600, border: `1px solid ${on ? C.gold : C.hairline}`, background: on ? C.goldSoft : "transparent", color: on ? C.gold : C.fg }}>{children}</button>
}
function Seg({ value, options, onPick, labels }: { value: string; options: string[]; onPick: (v: string) => void; labels?: string[] }) {
  return (
    <div style={{ display: "flex", gap: 4, background: C.surfaceUp, borderRadius: 11, padding: 3 }}>
      {options.map((o, i) => <button key={o} onClick={() => onPick(o)} style={{ flex: 1, minHeight: 44, borderRadius: 8, border: "none", cursor: "pointer", background: value === o ? C.gold : "transparent", color: value === o ? "#0A0A0A" : C.fgMuted, fontSize: 12.5, fontWeight: value === o ? 800 : 600 }}>{labels ? labels[i] : o}</button>)}
    </div>
  )
}
function ColorField({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  // value === "" => auto (couleur du thème). Sinon un hex choisi librement.
  return (
    <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
      <button onClick={() => onChange("")} style={{ ...chipStyle(value === ""), minHeight: 40 }}>Auto</button>
      <label style={{ width: 44, height: 44, borderRadius: 11, border: `2px solid ${value ? C.gold : C.hairline}`, cursor: "pointer", position: "relative", flexShrink: 0, background: value || "conic-gradient(from 210deg,#C9A84C,#D4483B,#3E9E6E,#3B6FD4,#7A5CD4,#C9A84C)", overflow: "hidden" }}>
        <input type="color" value={value || "#C9A84C"} onChange={e => onChange(e.target.value)} style={{ position: "absolute", inset: 0, width: "100%", height: "100%", opacity: 0, cursor: "pointer", border: "none" }} />
      </label>
      {value && <span style={{ fontFamily: "ui-monospace, monospace", fontSize: 11, color: C.fgMuted }}>{value}</span>}
    </div>
  )
}
function Range({ value, min, max, step, onChange, hint }: { value: number; min: number; max: number; step: number; onChange: (v: number) => void; hint?: string }) {
  return (
    <div>
      <input type="range" min={min} max={max} step={step} value={value} onChange={e => onChange(parseFloat(e.target.value))} style={{ width: "100%", accentColor: C.gold, height: 40, cursor: "pointer" }} />
      {hint && <div style={{ fontSize: 10.5, color: C.fgFaint, marginTop: -2 }}>{hint}</div>}
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
function SupportVisual({ item, pal, layout, brand, subtitle, title, cta, size, qrValue, qrImg, qrBadge, qrPos, qrStatic, qrVector, physW, qrDx, qrDy, logo, logoUrl, bgFinish, bgImage, frame, accent, titleCase, titleWeight, titleColor, subColor, ctaColor, blockY, eCorner, eAccent, eTypo, eAlign, eTitle, ePad, w, h }:
  { item: Item; style: Style; pal: ReturnType<typeof paletteFromStyle>; layout: { content: string; deco: string | null }; brand: string; subtitle: string; title: string; cta: string; size: { factor: number }; qrValue: string; qrImg: string | null; qrBadge: string; qrPos: string; qrStatic?: boolean; qrVector?: boolean; physW: number; qrDx: number; qrDy: number; logo: string; logoUrl: string | null; bgFinish: string; bgImage: string | null; frame: string; accent: string; titleCase: string; titleWeight: string; titleColor: string; subColor: string; ctaColor: string; blockY: number; eCorner: string; eAccent: string; eTypo: string; eAlign: "left" | "center" | "right"; eTitle: number; ePad: number; w: number; h: number }) {
  const typo = TYPOS.find(t => t.id === eTypo)
  const titleFont = typo?.t ? `"${typo.t}",Georgia,serif` : pal.titleFont
  const bodyFont = typo?.b ? `"${typo.b}",Helvetica,Arial,sans-serif` : pal.bodyFont
  const unit = Math.min(w, h)
  const isRound = item.shape === "round"
  // Sur un support ROND, le contenu doit tenir dans le CERCLE inscrit (≈ 0,707 × Ø) :
  // on impose une marge plancher (~15 %) pour ne jamais rogner le titre/QR/bouton au bord.
  const pad = Math.max(isRound ? unit * 0.15 : 0, unit * 0.09 * ePad)
  const cornerInset = isRound ? unit * 0.15 : pad * 0.5   // repères de coin visibles même sur un rond (près du carré inscrit)
  const titleSize = unit * 0.11 * eTitle
  // Taille du QR pilotée par la PHYSIQUE (item.qrMm × facteur), convertie en px via l'échelle du support
  // (physW = largeur physique en mm que représente `w`). => aperçu, planche PDF et contrôle réfèrent LE MÊME mm.
  const qrPx = Math.max(24, item.qrMm * size.factor * (w / physW))
  const radiusEl = eCorner === "vif" ? 0 : eCorner === "rond" ? 999 : 10

  // Couleur d'accent : override d'ambiance (« auto » garde pal.band / pal.ctaBg).
  const accHex = ACCENTS.find(a => a.id === accent)?.hex || ""
  const bandColor = accHex || pal.band
  const bandFg = accHex ? readableOn(accHex) : pal.bandFg
  const ctaBg = accHex || pal.ctaBg
  const ctaFg = accHex ? readableOn(accHex) : pal.ctaFg
  const effWeight = TITLE_WEIGHT[titleWeight] || Number(pal.titleWeight) || 500
  const shownTitle = titleCase === "upper" ? title.toUpperCase() : title

  // Couleurs par élément : "" = auto (couleur du thème/accent). Le bouton peut avoir sa propre couleur.
  const titleCol = titleColor || pal.fg
  const subCol = subColor || pal.fg
  const btnBg = ctaColor || ctaBg
  const btnFg = ctaColor ? readableOn(ctaColor) : ctaFg
  const btnStroke = ctaColor || bandColor
  const clampTxt: React.CSSProperties = { maxWidth: "100%", overflowWrap: "anywhere" }
  const kickerEl = <div style={{ fontFamily: bodyFont, fontSize: unit * 0.045, fontWeight: 700, letterSpacing: ".08em", textTransform: "uppercase", color: bandColor, ...clampTxt }}>{brand}</div>
  const titleEl = <div style={{ fontFamily: titleFont, fontSize: titleSize, fontWeight: effWeight as any, letterSpacing: pal.titleLs, lineHeight: 1.02, color: titleCol, ...clampTxt }}>{shownTitle}</div>
  const subtitleEl = subtitle.trim() ? <div style={{ fontFamily: bodyFont, fontSize: unit * 0.05, fontWeight: 500, lineHeight: 1.25, color: subCol, opacity: subColor ? 1 : 0.82, ...clampTxt }}>{subtitle}</div> : null
  // Le QR est FOURNI (code existant réencodé, ou PNG importé) — jamais recréé/redesigné ici.
  const qrInner = qrImg
    ? <img src={qrImg} alt="" style={{ display: "block", width: Math.round(qrPx), height: Math.round(qrPx), objectFit: "contain" }} />
    : qrStatic
    ? <FauxQR size={Math.round(qrPx)} fg={pal.ink} bg={pal.qrBg} />
    : qrVector
    ? <QRVector value={qrValue} size={Math.round(qrPx)} fg={pal.ink} bg={pal.qrBg} />
    : <QRCanvas value={qrValue} size={Math.round(qrPx)} fg={pal.ink} bg={pal.qrBg} ecc="M" />
  const qrBadgeEl = qrBadge === "aucune"
    ? <div style={{ lineHeight: 0 }}>{qrInner}</div>
    : <div style={{ background: pal.qrBg, padding: unit * (qrBadge === "cercle" ? 0.05 : 0.028), borderRadius: qrBadge === "cercle" ? "50%" : (eCorner === "rond" ? 16 : eCorner === "vif" ? 2 : 8), lineHeight: 0, display: "inline-block" }}>{qrInner}</div>
  // Décalage fin du QR (curseurs X/Y) — n'affecte que le QR, pas le reste du bloc.
  const qrEl = (qrDx || qrDy) ? <div style={{ transform: `translate(${qrDx * 18}%, ${qrDy * 18}%)`, display: "inline-block" }}>{qrBadgeEl}</div> : qrBadgeEl
  const ctaEl = eAccent === "aucun" ? null : (
    <div style={{ fontFamily: bodyFont, fontSize: unit * 0.05, fontWeight: 800, padding: `${unit * 0.035}px ${unit * 0.09}px`, borderRadius: radiusEl, maxWidth: "100%", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", boxSizing: "border-box",
      ...(eAccent === "trait" ? { border: `2px solid ${btnStroke}`, color: btnStroke }
        : eAccent === "degrade" ? { background: `linear-gradient(135deg, ${shade(btnBg, 0.12)}, ${shade(btnBg, -0.28)})`, color: btnFg }
        : { background: btnBg, color: btnFg }) }}>{cta}</div>
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
  // Photo de fond : voile de lisibilité auto (sombre si le texte est clair, clair si le texte est sombre).
  const scrim = readableOn(pal.fg) === "#0A0A0A"
    ? "linear-gradient(rgba(0,0,0,0.30), rgba(0,0,0,0.52))"
    : "linear-gradient(rgba(255,255,255,0.42), rgba(255,255,255,0.64))"
  const finalBg = bgImage ? `${scrim}, url(${bgImage}) center / cover no-repeat` : bgCss
  const base: React.CSSProperties = { width: w, height: h, boxSizing: "border-box", background: finalBg, color: pal.fg, borderRadius: isRound ? "50%" : (item.ratio >= 2 || item.ratio <= 0.5 ? 6 : 10), overflow: "hidden", position: "relative", display: "flex", padding: pad }

  // Cadre décoratif INDÉPENDANT de la mise en page (aucun / filet / double filet / coins ornés).
  const frameEl = frame === "filet"
    ? <div style={{ position: "absolute", inset: pad * 0.5, border: `1.5px solid ${pal.rule}`, borderRadius: isRound ? "50%" : 6, pointerEvents: "none" }} />
    : frame === "double"
    ? <><div style={{ position: "absolute", inset: pad * 0.42, border: `1.5px solid ${pal.rule}`, borderRadius: isRound ? "50%" : 6, pointerEvents: "none" }} /><div style={{ position: "absolute", inset: pad * 0.64, border: `1px solid ${pal.rule}`, borderRadius: isRound ? "50%" : 5, opacity: 0.6, pointerEvents: "none" }} /></>
    : frame === "coins"
    ? <><Corner p={pal.rule} pos={{ top: cornerInset, left: cornerInset }} /><Corner p={pal.rule} pos={{ top: cornerInset, right: cornerInset }} r /><Corner p={pal.rule} pos={{ bottom: cornerInset, left: cornerInset }} b /><Corner p={pal.rule} pos={{ bottom: cornerInset, right: cornerInset }} b r /></>
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
    // « QR géant » = layout centré sur le QR. La taille du QR reste PHYSIQUE (réglée par la taille/le curseur) :
    // pas de scale CSS ici (ça gonflait le QR au-delà de qrMm et débordait). On rapproche juste les textes.
    body = <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: unit * (isRound ? 0.028 : 0.04), minHeight: 0, overflow: "hidden" }}><div style={{ fontFamily: titleFont, fontSize: titleSize * 0.72, fontWeight: effWeight as any, color: titleCol, textAlign: "center", ...clampTxt }}>{shownTitle}</div>{subtitleEl}{qrEl}{ctaEl}</div>
  } else if (layout.content === "split") {
    body = <div style={{ flex: 1, display: "flex", alignItems: "center", gap: pad, minWidth: 0 }}><div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: unit * 0.035 }}>{kickerEl}{titleEl}{subtitleEl}{ctaEl}</div>{qrEl}</div>
  } else if (layout.content === "poster") {
    body = <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems, justifyContent: "space-between", minWidth: 0 }}><div style={{ display: "flex", flexDirection: "column", gap: unit * 0.03, alignItems, maxWidth: "100%" }}>{kickerEl}<div style={{ fontFamily: titleFont, fontSize: titleSize * 1.5, fontWeight: effWeight as any, letterSpacing: pal.titleLs, lineHeight: 1, color: titleCol, ...clampTxt }}>{shownTitle}</div>{subtitleEl}</div><div style={{ display: "flex", alignItems: "center", gap: pad, alignSelf: eAlign === "right" ? "flex-end" : eAlign === "left" ? "flex-start" : "center" }}>{qrEl}{ctaEl}</div></div>
  } else { // stack / center — la position du QR se règle (haut / centre / bas)
    const stackInner = qrPos === "haut"
      ? <>{qrEl}{kickerEl}{titleEl}{subtitleEl}{ctaEl}</>
      : qrPos === "bas"
      ? <>{kickerEl}{titleEl}{subtitleEl}{ctaEl}{qrEl}</>
      : <>{kickerEl}{titleEl}{subtitleEl}{qrEl}{ctaEl}</>
    body = <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems, justifyContent: "center", gap: unit * (isRound ? 0.032 : 0.045), textAlign: eAlign, minHeight: 0, overflow: "hidden" }}>{stackInner}</div>
  }

  // Placement vertical (curseur) : on décale le bloc de contenu — sauf le bandeau (absolu, plein cadre).
  const placed = layout.content === "band"
    ? body
    : <div style={{ flex: 1, display: "flex", minWidth: 0, transform: blockY ? `translateY(${blockY * 12}%)` : undefined }}>{body}</div>
  return (
    <div style={base}>
      {placed}
      {logo === "objet" && logoUrl && <img src={logoUrl} alt="" style={{ position: "absolute", top: isRound ? unit * 0.2 : pad, left: isRound ? unit * 0.2 : pad, width: unit * 0.14, height: unit * 0.14, objectFit: "contain", zIndex: 2 }} />}
      {frameEl}
      {/* décor optionnel (lié à la mise en page) */}
      {layout.deco === "frame" && <div style={{ position: "absolute", inset: pad * 0.5, border: `2px solid ${pal.rule}`, borderRadius: isRound ? "50%" : 6, pointerEvents: "none" }} />}
      {layout.deco === "footer" && <div style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: unit * 0.04, background: pal.band }} />}
      {layout.deco === "diagonal" && <div style={{ position: "absolute", top: -h * 0.3, right: -w * 0.2, width: w * 0.9, height: h * 0.5, background: pal.band, opacity: 0.16, transform: "rotate(-24deg)", pointerEvents: "none" }} />}
      {layout.deco === "ornate" && <><Corner p={pal.rule} pos={{ top: cornerInset, left: cornerInset }} /><Corner p={pal.rule} pos={{ top: cornerInset, right: cornerInset }} r /><Corner p={pal.rule} pos={{ bottom: cornerInset, left: cornerInset }} b /><Corner p={pal.rule} pos={{ bottom: cornerInset, right: cornerInset }} b r /></>}
    </div>
  )
}
function Corner({ p, pos, r, b }: { p: string; pos: React.CSSProperties; r?: boolean; b?: boolean }) {
  return <span style={{ position: "absolute", width: 14, height: 14, ...(pos), borderTop: b ? "none" : `2px solid ${p}`, borderBottom: b ? `2px solid ${p}` : "none", borderLeft: r ? "none" : `2px solid ${p}`, borderRight: r ? `2px solid ${p}` : "none", pointerEvents: "none" }} />
}

/* Largeur physique du support (trim), en mm — sert d'échelle mm→px pour le QR. */
function trimWidthMm(item: Item) { return item.shape === "round" ? item.hMm : item.hMm * item.ratio }
/* Dimensions physiques de la PLANCHE (trim + fond perdu), en mm. */
function pageDims(item: Item) {
  const trimW = trimWidthMm(item)
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
function PrintSheet(props: Omit<React.ComponentProps<typeof SupportVisual>, "w" | "h" | "physW">) {
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
          <SupportVisual {...props} qrVector physW={pageWmm} w={bigW} h={bigH} />
        </div>
      </div>
      {marks.map((mk, i) => <div key={i} aria-hidden style={{ position: "absolute", background: "#000", left: `${mk.left}mm`, top: `${mk.top}mm`, width: `${mk.width}mm`, height: `${mk.height}mm` }} />)}
    </div>
  )
}

// Tous les réglages de design partagés (sans ce qui dépend du support/rendu).
type DesignProps = Omit<React.ComponentProps<typeof SupportVisual>, "item" | "physW" | "w" | "h" | "qrStatic">

/* Une case de la planche multi-supports : le support à sa taille TRIM réelle (mm), haute-déf puis mis à l'échelle. */
function GangCell({ it, wmm, design }: { it: Item; wmm: number; design: DesignProps }) {
  const long = 1100
  const bigW = it.ratio >= 1 ? long : Math.round(long * it.ratio)
  const bigH = it.shape === "round" ? bigW : Math.round(bigW / it.ratio)
  const scale = (wmm * 96 / 25.4) / bigW
  return (
    <div style={{ width: bigW, height: bigH, transformOrigin: "top left", transform: `scale(${scale})` }}>
      <SupportVisual {...design} item={it} qrVector physW={wmm} w={bigW} h={bigH} />
    </div>
  )
}

/* Planche multi-supports : une seule feuille auto-dimensionnée, supports rangés en étagères (mm réels),
   chacun avec un repère de découpe. Même mécanisme fixe que la planche simple (une page => fiable). */
function MultiSheet({ items, design }: { items: Item[]; design: DesignProps }) {
  const GAP = 8, MARGIN = 10, MAXW = 380   // MAXW ~ largeur A3
  let x = 0, y = 0, rowH = 0, totalW = 0
  const placed: { it: Item; x: number; y: number; w: number; h: number }[] = []
  for (const it of items) {
    const w = trimWidthMm(it), h = it.hMm
    if (x > 0 && x + GAP + w > MAXW) { totalW = Math.max(totalW, x - GAP); y += rowH + GAP; x = 0; rowH = 0 }
    placed.push({ it, x, y, w, h })
    x += w + GAP; rowH = Math.max(rowH, h)
  }
  totalW = Math.max(totalW, x - GAP)
  const pageW = +(totalW + 2 * MARGIN).toFixed(1), pageH = +(y + rowH + 2 * MARGIN).toFixed(1)
  const css = `@media screen{.ps-print-root{display:none!important}}@media print{body *{visibility:hidden!important}.ps-print-root,.ps-print-root *{visibility:visible!important}.ps-print-root{position:fixed!important;left:0;top:0;display:block!important}@page{size:${pageW}mm ${pageH}mm;margin:0}}`
  return (
    <div className="ps-print-root" aria-hidden>
      <style>{css}</style>
      <div style={{ position: "relative", width: `${pageW}mm`, height: `${pageH}mm`, background: "#fff" }}>
        {placed.map(({ it, x, y, w, h }, i) => (
          <div key={i} style={{ position: "absolute", left: `${MARGIN + x}mm`, top: `${MARGIN + y}mm`, width: `${w}mm`, height: `${h}mm`, overflow: "hidden", border: "0.2mm dashed rgba(0,0,0,0.45)", borderRadius: it.shape === "round" ? "50%" : 0 }}>
            <GangCell it={it} wmm={w} design={design} />
          </div>
        ))}
      </div>
    </div>
  )
}

/* Aperçu packshot : le support posé dans sa scène (perspective + ombres + sol). */
function Packshot(props: { item: Item; scene: ReturnType<typeof sceneLayers>; pal: ReturnType<typeof paletteFromStyle>; style: Style; layout: { content: string; deco: string | null }; size: { factor: number }; qrValue: string; qrImg: string | null; qrBadge: string; qrPos: string; qrDx: number; qrDy: number; logo: string; logoUrl: string | null; bgFinish: string; bgImage: string | null; frame: string; accent: string; titleCase: string; titleWeight: string; titleColor: string; subColor: string; ctaColor: string; blockY: number; brand: string; subtitle: string; title: string; cta: string; eCorner: string; eAccent: string; eTypo: string; eAlign: "left" | "center" | "right"; eTitle: number; ePad: number }) {
  const { item, scene } = props
  const box = 460
  const hPx = scaleFor(item.hMm, box, SCENES[item.scene])
  const wPx = item.shape === "round" ? hPx : hPx * item.ratio
  const clampedW = Math.min(wPx, box - 40)
  const clampedH = item.shape === "round" ? clampedW : clampedW / item.ratio
  const support = (
    <SupportVisual {...props} physW={trimWidthMm(item)} w={clampedW} h={clampedH} />
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

/* Faux QR décoratif (100 % CSS, zéro moteur) — pour les vignettes : on ne veut PAS instancier
   16 moteurs qr-code-styling sur la grille (ça faisait ramer/planter mobile). Non scannable, assumé. */
function FauxQR({ size, fg, bg }: { size: number; fg: string; bg: string }) {
  const cell = Math.max(3, Math.round(size / 9))
  // Vrais « repères » de coin (carré plein → trou → point) pour que ça se lise comme un QR, pas un damier.
  const finder = (pos: React.CSSProperties) => (
    <span style={{ position: "absolute", width: cell * 2.6, height: cell * 2.6, background: fg, display: "flex", alignItems: "center", justifyContent: "center", ...pos }}>
      <span style={{ width: "56%", height: "56%", background: bg, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <span style={{ width: "50%", height: "50%", background: fg }} />
      </span>
    </span>
  )
  return (
    <div style={{ width: size, height: size, background: bg, position: "relative", overflow: "hidden", borderRadius: Math.max(2, size * 0.04), backgroundImage: `radial-gradient(${fg} 44%, transparent 47%)`, backgroundSize: `${cell}px ${cell}px`, backgroundPosition: `${cell / 2}px ${cell / 2}px` }}>
      {finder({ top: cell * 0.5, left: cell * 0.5 })}
      {finder({ top: cell * 0.5, right: cell * 0.5 })}
      {finder({ bottom: cell * 0.5, left: cell * 0.5 })}
    </div>
  )
}

/* QR VECTORIEL (SVG natif qr-code-styling) — utilisé sur le chemin d'impression pour un PDF prêt imprimeur. */
function QRVector({ value, size, fg, bg }: { value: string; size: number; fg: string; bg: string }) {
  const holder = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const qr = createQRSvg({ data: value || "https://qrowg.com", fg, bg, ecc: "M", style: {}, size })
    if (holder.current) { holder.current.innerHTML = ""; qr.append(holder.current) }
  }, [value, size, fg, bg])
  return <div ref={holder} style={{ width: size, height: size, lineHeight: 0 }} />
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
        <SupportVisual item={item} style={style} pal={pal} layout={layout} brand={BRANDNAMES[0]} subtitle="" title={MESSAGES[item.id]?.[0] || item.title} cta={item.cta} size={{ factor: 1 }} qrValue="https://qrowg.com" qrImg={null} qrBadge="carre" qrPos="centre" qrStatic physW={trimWidthMm(item)} qrDx={0} qrDy={0} logo="aucun" logoUrl={null} bgFinish="uni" bgImage={null} frame="aucun" accent="auto" titleCase="normal" titleWeight="normal" titleColor="" subColor="" ctaColor="" blockY={0} eCorner="adouci" eAccent="plein" eTypo="auto" eAlign="center" eTitle={1} ePad={1} w={baseW} h={baseH} />
      </div>
    </div>
  )
}
