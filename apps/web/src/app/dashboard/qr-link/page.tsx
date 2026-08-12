"use client"

// Générateur de QR code — Lien / WiFi / Texte / Contact / Appel / Email.
// Rendu 100% local (qr-code-styling via qrRender), sans API. Deux sorties :
//  · TÉLÉCHARGEMENT PNG/SVG : fichier statique (contenu encodé directement).
//  · COMPTE : QR DYNAMIQUE (lien/texte/appel/email → redirigé /q/<code>, modifiable,
//    suivi des scans, essai 30 j) ou STATIQUE (WiFi/Contact → hors ligne, sans expiration).
import { useMemo, useRef, useState, useEffect } from "react"
import Link from "next/link"
import { ArrowLeft, Download, Check, QrCode as QrIcon, ShieldCheck, AlertTriangle, Upload, X, Link2, Wifi, Type, Contact, Phone, Mail, Save, Trash2, ChevronDown, Zap, BarChart3, Clock, Calendar, TrendingUp, Activity, Pencil, Lock, Pause, Play } from "lucide-react"
import Particles from "@/components/Particles"
import { countryFlag, DEVICE_LABEL } from "@/lib/scanStats"
import { canDynLinkSecurity, canDynBulk } from "@/lib/dynamicPlans"
import { parseBulkCsv } from "@/lib/bulkCsv"
import QRCanvas from "../qr-codes/QRCanvas"
import { getQRBlob, type QROptions, type QRStyleConfig } from "../qr-codes/qrRender"
import { contrast, isInverted, normalizeUrl, buildWifi, buildVCard, buildTel, buildEmail, type VCardFields } from "./qrLinkUtils"
import { Button } from "@/components/ui/Button"

const G = "#C9A84C"
const MUTED = "#A8A190"

const ECC_OPTS: { k: "L" | "M" | "Q" | "H"; label: string }[] = [
  { k: "L", label: "Faible" }, { k: "M", label: "Moyen" }, { k: "Q", label: "Élevé" }, { k: "H", label: "Maximum" },
]
const FG_SWATCHES = ["#080808", "#C9A84C", "#1D4ED8", "#059669", "#DB2777", "#DC2626", "#7C3AED", "#0F766E"]
const BG_SWATCHES = ["#FFFFFF", "#F5F0E8", "#FEF3C7", "#E0F2FE", "#F0FDF4", "#111111"]
const STYLE_PRESETS: { k: string; label: string; dotStyle: QRStyleConfig["dotStyle"]; cornerStyle: QRStyleConfig["cornerStyle"] }[] = [
  { k: "carre", label: "Carré", dotStyle: "square", cornerStyle: "square" },
  { k: "arrondi", label: "Arrondi", dotStyle: "rounded", cornerStyle: "rounded" },
  { k: "points", label: "Points", dotStyle: "dot", cornerStyle: "circle" },
  { k: "doux", label: "Doux", dotStyle: "softSquare", cornerStyle: "rounded" },
  { k: "luxe", label: "Luxe", dotStyle: "luxury", cornerStyle: "luxury" },
]
const TYPES = [
  { k: "link" as const, label: "Lien", icon: Link2 },
  { k: "wifi" as const, label: "WiFi", icon: Wifi },
  { k: "text" as const, label: "Texte", icon: Type },
  { k: "contact" as const, label: "Contact", icon: Contact },
  { k: "phone" as const, label: "Appel", icon: Phone },
  { k: "email" as const, label: "Email", icon: Mail },
]
type QrType = "link" | "wifi" | "text" | "contact" | "phone" | "email"
type WifiEnc = "WPA" | "WEP" | "nopass"
type EmailFields = { to?: string; subject?: string; body?: string }

const EMPTY_VC: VCardFields = { firstName: "", lastName: "", phone: "", email: "", org: "", title: "", url: "" }
const EMPTY_EM: EmailFields = { to: "", subject: "", body: "" }

// Types éligibles au QR DYNAMIQUE (redirigé + expirable). WiFi/Contact restent statiques.
const isDynamicType = (t: QrType) => t !== "wifi" && t !== "contact"

// Champs qui determinent la charge utile du QR (partages entre l'etat live et l'historique).
type QrSource = {
  type: QrType; url: string; ssid: string; wifiPass: string; wifiEnc: WifiEnc; text: string
  vc: VCardFields; phone: string; em: EmailFields
}
type QrHistEntry = QrSource & {
  fg: string; bg: string; ecc: "L" | "M" | "Q" | "H"; styleKey: string
}

// Détecte un écran étroit (pop-up en feuille sur mobile, ancrée à droite sur PC).
function useIsMobile(bp = 768): boolean {
  const [m, setM] = useState(false)
  useEffect(() => {
    const check = () => setM(window.innerWidth < bp)
    check(); window.addEventListener("resize", check)
    return () => window.removeEventListener("resize", check)
  }, [bp])
  return m
}

// Date lisible en français (jour mois · heure).
function fmtDateTime(iso?: string | null): string {
  if (!iso) return "—"
  try { return new Date(iso).toLocaleString("fr-FR", { day: "numeric", month: "long", hour: "2-digit", minute: "2-digit" }) }
  catch { return "—" }
}

// Charge utile encodee dans le QR selon le type.
function payload(s: QrSource): string {
  if (s.type === "wifi") return buildWifi(s.ssid, s.wifiPass, s.wifiEnc)
  if (s.type === "text") return s.text.trim()
  if (s.type === "contact") return buildVCard(s.vc)
  if (s.type === "phone") return buildTel(s.phone)
  if (s.type === "email") return buildEmail(s.em.to ?? "", s.em.subject, s.em.body)
  return normalizeUrl(s.url)
}

export default function QrLinkPage() {
  const [qrType, setQrType] = useState<QrType>("link")
  const [url, setUrl] = useState("")
  const [ssid, setSsid] = useState("")
  const [wifiPass, setWifiPass] = useState("")
  const [wifiEnc, setWifiEnc] = useState<WifiEnc>("WPA")
  const [text, setText] = useState("")
  const [vc, setVc] = useState<VCardFields>(EMPTY_VC)
  const [phone, setPhone] = useState("")
  const [em, setEm] = useState<EmailFields>(EMPTY_EM)
  const [fg, setFg] = useState("#080808")
  const [bg, setBg] = useState("#FFFFFF")
  const [ecc, setEcc] = useState<"L" | "M" | "Q" | "H">("M")
  const [styleKey, setStyleKey] = useState("carre")
  const [logo, setLogo] = useState<string | null>(null)
  const [showStyle, setShowStyle] = useState(false) // « Apparence » repliée par défaut (montrer moins)
  const [busy, setBusy] = useState<null | "png" | "svg">(null)
  const [done, setDone] = useState(false)
  const logoInput = useRef<HTMLInputElement>(null)
  // QR instantanés ENREGISTRÉS (persistants, comptent dans le quota du plan limits.qr)
  const [saved, setSaved] = useState<any[]>([])
  // Palier « QR Dynamique » (gating sécurité/stats/masse + bandeau d'upsell). Démarre INCONNU ("")
  // et non "none" : évite d'afficher le bandeau « Passez au QR Dynamique » aux abonnés avant le fetch.
  const [dynPlan, setDynPlan] = useState<string>("")
  const [saveBusy, setSaveBusy] = useState(false)
  const [saveMsg, setSaveMsg] = useState<{ text: string; ok: boolean } | null>(null)
  const [detail, setDetail] = useState<any | null>(null) // aperçu détaillé d'un QR enregistré (clic)
  const [detailCopied, setDetailCopied] = useState(false)
  const [stats, setStats] = useState<any | null>(null) // pop-up statistiques d'un lien dynamique
  const [statsData, setStatsData] = useState<any | null>(null) // stats détaillées (Pro+) chargées
  const [statsLoading, setStatsLoading] = useState(false)
  const [bulkOpen, setBulkOpen] = useState(false) // modal génération en masse (Business)
  const [bulkText, setBulkText] = useState("")
  const [bulkBusy, setBulkBusy] = useState(false)
  const [bulkMsg, setBulkMsg] = useState<{ ok: boolean; text: string } | null>(null)
  const bulkFileInput = useRef<HTMLInputElement>(null)
  const bulkParse = useMemo(() => parseBulkCsv(bulkText), [bulkText])
  const isMobile = useIsMobile(768)

  // Sur desktop (2 colonnes), on déplie « Apparence » par défaut pour remplir la colonne
  // de gauche et équilibrer avec l'aperçu à droite. Sur mobile, elle reste repliée.
  useEffect(() => { if (typeof window !== "undefined" && window.innerWidth >= 920) setShowStyle(true) }, [])

  // Charge les stats détaillées (par jour/appareil/pays) à l'ouverture de la pop-up.
  useEffect(() => {
    if (!stats?.id) { setStatsData(null); return }
    setStatsLoading(true); setStatsData(null)
    fetch(`/api/qr-instant/stats?id=${stats.id}`).then(r => r.json())
      .then(d => setStatsData(d)).catch(() => setStatsData(null))
      .finally(() => setStatsLoading(false))
  }, [stats])

  const data = useMemo(() => payload({ type: qrType, url, ssid, wifiPass, wifiEnc, text, vc, phone, em }), [qrType, url, ssid, wifiPass, wifiEnc, text, vc, phone, em])
  const ready = data.length > 0
  const ratio = contrast(fg, bg)
  const inverted = isInverted(fg, bg)
  const dynamic = isDynamicType(qrType)

  const [history, setHistory] = useState<QrHistEntry[]>([])
  useEffect(() => { try { const h = JSON.parse(localStorage.getItem("qrfolio_qr_history") || "[]"); if (Array.isArray(h)) setHistory(h.slice(0, 8)) } catch {} }, [])
  // Charge les QR instantanés enregistrés (serveur).
  useEffect(() => { fetch("/api/qr-instant").then(r => r.json()).then(d => { if (Array.isArray(d.items)) setSaved(d.items); if (d.dyn_plan) setDynPlan(d.dyn_plan) }).catch(() => {}) }, [])
  const saveToHistory = () => setHistory(prev => {
    const entry: QrHistEntry = { type: qrType, url: url.trim(), ssid, wifiPass, wifiEnc, text: text.trim(), vc, phone, em, fg, bg, ecc, styleKey }
    const next = [entry, ...prev.filter(e => payload(e) !== data)].slice(0, 8)
    try { localStorage.setItem("qrfolio_qr_history", JSON.stringify(next)) } catch {}
    return next
  })
  const loadEntry = (h: QrHistEntry) => {
    setQrType(h.type); setUrl(h.url); setSsid(h.ssid); setWifiPass(h.wifiPass); setWifiEnc(h.wifiEnc); setText(h.text)
    setVc({ ...EMPTY_VC, ...(h.vc || {}) }); setPhone(h.phone || ""); setEm({ ...EMPTY_EM, ...(h.em || {}) })
    setFg(h.fg); setBg(h.bg); setEcc(h.ecc); setStyleKey(h.styleKey); setLogo(null)
    if (typeof window !== "undefined") window.scrollTo({ top: 0, behavior: "smooth" })
  }
  const vcName = (v: VCardFields) => [v.firstName, v.lastName].filter(Boolean).join(" ").trim()
  const histLabel = (h: QrHistEntry) =>
    h.type === "wifi" ? `📶 ${h.ssid}`
    : h.type === "text" ? h.text
    : h.type === "contact" ? `👤 ${vcName(h.vc || {})}`
    : h.type === "phone" ? `📞 ${h.phone}`
    : h.type === "email" ? `✉️ ${h.em?.to || ""}`
    : normalizeUrl(h.url).replace(/^https?:\/\//, "")

  const preset = STYLE_PRESETS.find(p => p.k === styleKey) || STYLE_PRESETS[0]
  const effectiveEcc: "L" | "M" | "Q" | "H" = logo ? "H" : ecc
  const qrStyle: QRStyleConfig = {
    dotStyle: preset.dotStyle, cornerStyle: preset.cornerStyle,
    ...(logo ? { logoUrl: logo, logoSize: 22, logoShape: "rounded" as const, logoBg: "white" as const, logoPadding: 5 } : {}),
  }

  function onLogoFile(file: File) {
    if (!file.type.startsWith("image/")) return
    const reader = new FileReader()
    reader.onload = () => setLogo(String(reader.result))
    reader.readAsDataURL(file)
  }

  async function download(ext: "png" | "svg") {
    if (!ready) return
    setBusy(ext)
    try {
      const opts: QROptions = { data, fg, bg, ecc: effectiveEcc, style: qrStyle, size: 1024 }
      const blob = await getQRBlob(opts, ext)
      if (blob) {
        const a = document.createElement("a")
        a.href = URL.createObjectURL(blob); a.download = `qrcode.${ext}`; a.click(); URL.revokeObjectURL(a.href)
        saveToHistory(); setDone(true); setTimeout(() => setDone(false), 1800)
      }
    } finally { setBusy(null) }
  }

  // Enregistre le QR courant côté serveur (STATIQUE : contenu encodé, hors ligne). WiFi/Contact.
  async function saveInstant() {
    if (!ready || saveBusy) return
    setSaveBusy(true); setSaveMsg(null)
    try {
      // On ne stocke pas le mot de passe WiFi en clair dans `inputs` (il figure de
      // toute façon dans `payload`, inhérent au QR WiFi, protégé par la RLS proprio).
      const inputs = { type: qrType, url, ssid, wifiEnc, text, vc, phone, em }
      const res = await fetch("/api/qr-instant", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ kind: qrType, label: previewLabel || null, payload: data, inputs, style: { fg, bg, ecc: effectiveEcc, styleKey } }),
      })
      const d = await res.json().catch(() => ({}))
      if (res.ok && d.item) { setSaved(prev => [d.item, ...prev]); setSaveMsg({ text: "Enregistré ✓", ok: true }) }
      else setSaveMsg({ text: d.error || "Enregistrement impossible", ok: false })
    } catch { setSaveMsg({ text: "Erreur réseau", ok: false }) }
    finally { setSaveBusy(false); setTimeout(() => setSaveMsg(null), 3500) }
  }
  async function deleteInstant(id: string) {
    try {
      const res = await fetch("/api/qr-instant", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id }) })
      if (res.ok) setSaved(prev => prev.filter(s => s.id !== id))
    } catch {}
  }

  // QR DYNAMIQUE (lien/texte/appel/email) : le QR encode qrowg.com/q/<code>, expirable (essai 30 j).
  async function createDynamic() {
    if (!ready || saveBusy) return
    setSaveBusy(true); setSaveMsg(null)
    try {
      const inputs = { type: qrType, url, ssid, wifiEnc, text, vc, phone, em }
      const res = await fetch("/api/qr-instant", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ kind: qrType, dynamic: true, payload: data, dest: qrType === "link" ? url : data, label: previewLabel || null, inputs, style: { fg, bg, ecc: effectiveEcc, styleKey } }),
      })
      const d = await res.json().catch(() => ({}))
      if (res.ok && d.item) { setSaved(prev => [d.item, ...prev]); setDetail(d.item); setSaveMsg({ text: "QR créé ✓ — essai 30 jours", ok: true }) }
      else setSaveMsg({ text: d.error || "Création impossible", ok: false })
    } catch { setSaveMsg({ text: "Erreur réseau", ok: false }) }
    finally { setSaveBusy(false); setTimeout(() => setSaveMsg(null), 4000) }
  }
  async function editDest(s: any) {
    const next = typeof window !== "undefined" ? window.prompt("Nouvelle destination du lien :", s.dest_url || "") : null
    if (next === null) return
    try {
      const res = await fetch("/api/qr-instant", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: s.id, dest: next }) })
      const d = await res.json().catch(() => ({}))
      if (res.ok && d.item) setSaved(prev => prev.map(x => x.id === s.id ? d.item : x))
      else alert(d.error || "Modification impossible")
    } catch {}
  }
  // Applique un item mis à jour (PATCH) à la liste + à la fiche ouverte.
  function applyItem(item: any) {
    setSaved(prev => prev.map(x => x.id === item.id ? item : x))
    setDetail((d: any) => (d && d.id === item.id ? item : d))
  }
  async function patchLink(id: string, body: any): Promise<boolean> {
    try {
      const res = await fetch("/api/qr-instant", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id, ...body }) })
      const d = await res.json().catch(() => ({}))
      if (res.ok && d.item) { applyItem(d.item); return true }
      alert(d.error || "Modification impossible"); return false
    } catch { alert("Erreur réseau"); return false }
  }
  // ── Sécurité du lien (Pro+) ──
  async function setLinkPassword(s: any) {
    const pw = typeof window !== "undefined" ? window.prompt("Mot de passe pour protéger ce lien :", "") : null
    if (pw === null || !pw.trim()) return
    await patchLink(s.id, { password: pw })
  }
  async function removeLinkPassword(s: any) {
    if (typeof window !== "undefined" && window.confirm("Retirer le mot de passe de ce lien ?")) await patchLink(s.id, { password: "" })
  }
  async function scheduleExpiry(s: any) {
    const cur = s.expires_at ? new Date(s.expires_at).toISOString().slice(0, 10) : ""
    const v = typeof window !== "undefined" ? window.prompt("Date d'expiration (AAAA-MM-JJ) — laisser vide pour un lien permanent :", cur) : null
    if (v === null) return
    if (!v.trim()) { await patchLink(s.id, { expires_at: null }); return }
    const t = Date.parse(`${v.trim()}T23:59:59`)
    if (isNaN(t)) { alert("Date invalide (format AAAA-MM-JJ)."); return }
    await patchLink(s.id, { expires_at: new Date(t).toISOString() })
  }
  async function toggleManualPause(s: any) {
    await patchLink(s.id, { action: s.status === "active" ? "pause" : "resume" })
  }

  // ── Génération en masse (Business) ──
  function onBulkFile(file: File) {
    const r = new FileReader()
    r.onload = () => setBulkText(String(r.result || ""))
    r.readAsText(file)
  }
  async function runBulk() {
    const items = bulkParse.rows.filter(r => r.valid).map(r => ({ label: r.label, dest: r.dest }))
    if (items.length === 0 || bulkBusy) return
    setBulkBusy(true); setBulkMsg(null)
    try {
      const res = await fetch("/api/qr-instant/bulk", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ items }) })
      const d = await res.json().catch(() => ({}))
      if (res.ok && Array.isArray(d.items)) {
        setSaved(prev => [...d.items, ...prev])
        const extra = [d.skipped ? `${d.skipped} ignoré(s)` : "", d.truncated ? `${d.truncated} au-delà de la limite (100)` : ""].filter(Boolean).join(" · ")
        setBulkMsg({ ok: true, text: `${d.created} lien(s) créé(s)${extra ? " · " + extra : ""}` })
        setBulkText("")
      } else setBulkMsg({ ok: false, text: d.error || "Import impossible" })
    } catch { setBulkMsg({ ok: false, text: "Erreur réseau" }) }
    finally { setBulkBusy(false) }
  }

  // Statut lisible d'un lien dynamique (essai 30 j par lien).
  function dynStatus(s: any): { label: string; color: string; expired: boolean } {
    if (s.status === "expired") return { label: "Expiré", color: "#FF6B6B", expired: true }
    if (s.status === "paused") return { label: "En pause", color: "#FBBF24", expired: false }
    if (s.expires_at) {
      const ms = new Date(s.expires_at).getTime() - Date.now()
      if (ms <= 0) return { label: "Expiré", color: "#FF6B6B", expired: true }
      const days = Math.ceil(ms / 86400000)
      return { label: `Essai · expire dans ${days} j`, color: "#FBBF24", expired: false }
    }
    return { label: "Actif", color: "var(--success)", expired: false }
  }
  // Décompte précis avant expiration (aperçu détaillé).
  function expiryText(s: any): { text: string; color: string; expired: boolean } {
    if (!s?.dynamic) return { text: "Contenu encodé — n'expire pas", color: MUTED, expired: false }
    if (s.status === "expired") return { text: "Expiré", color: "#FF6B6B", expired: true }
    if (s.status === "paused") return { text: "En pause", color: "#FBBF24", expired: false }
    if (!s.expires_at) return { text: "Permanent (aucune expiration)", color: "var(--success)", expired: false }
    const ms = new Date(s.expires_at).getTime() - Date.now()
    if (ms <= 0) return { text: "Expiré", color: "#FF6B6B", expired: true }
    const d = Math.floor(ms / 86400000), h = Math.floor((ms % 86400000) / 3600000), m = Math.floor((ms % 3600000) / 60000)
    const left = d > 0 ? `${d} j ${h} h` : h > 0 ? `${h} h ${m} min` : `${m} min`
    const date = new Date(s.expires_at).toLocaleString("fr-FR", { day: "numeric", month: "long", hour: "2-digit", minute: "2-digit" })
    return { text: `Expire dans ${left} · le ${date}`, color: "#FBBF24", expired: false }
  }
  async function copyDetail() {
    try { await navigator.clipboard.writeText(detail?.payload || ""); setDetailCopied(true); setTimeout(() => setDetailCopied(false), 1600) } catch {}
  }
  async function downloadDetail() {
    if (!detail) return
    const p = STYLE_PRESETS.find(x => x.k === (detail.style?.styleKey || "carre")) || STYLE_PRESETS[0]
    const opts: QROptions = { data: detail.payload, fg: detail.style?.fg || "#080808", bg: detail.style?.bg || "#FFFFFF", ecc: (detail.style?.ecc || "M"), style: { dotStyle: p.dotStyle, cornerStyle: p.cornerStyle }, size: 1024 }
    const blob = await getQRBlob(opts, "png")
    if (blob) { const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = `${detail.label || detail.kind || "qr"}.png`; a.click(); URL.revokeObjectURL(a.href) }
  }

  const dynamicLinks = saved.filter(s => s.dynamic)
  const staticQrs = saved.filter(s => !s.dynamic)
  const hasSaved = dynamicLinks.length > 0 || staticQrs.length > 0

  const secTitle: React.CSSProperties = { color: MUTED, fontSize: 11, fontWeight: 700, display: "flex", alignItems: "center", gap: 7, marginBottom: 11, textTransform: "uppercase", letterSpacing: 1.4 }
  const subLabel: React.CSSProperties = { color: "#6E685E", fontSize: 10.5, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1, margin: "0 0 9px 2px" }
  const accentBar = <span style={{ width: 3, height: 13, borderRadius: 2, background: G, flexShrink: 0 }} />
  const card: React.CSSProperties = { background: "rgba(255,255,255,0.025)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 18, padding: 18 }
  const field: React.CSSProperties = { width: "100%", boxSizing: "border-box", height: 50, background: "#0A0A0A", border: "1px solid rgba(255,255,255,0.14)", borderRadius: 12, color: "#F5F0E8", fontSize: 16, padding: "0 15px", outline: "none" }
  const dot = (c: string): React.CSSProperties => ({ width: 15, height: 15, borderRadius: 5, background: c, border: "1px solid rgba(255,255,255,0.22)", flexShrink: 0 })
  // Couleur d'avant-plan sûre pour les MINI-vignettes (toujours sur fond blanc) : si le QR enregistré
  // est trop clair/peu contrasté (ex. blanc sur fond sombre), on retombe sur du noir pour rester net.
  const safeFg = (c?: string) => (contrast(c || "#080808", "#FFFFFF") >= 2 ? (c || "#080808") : "#080808")
  // Lignes de la section « Sécurité » (fiche détaillée d'un lien dynamique, Pro+).
  const secRow: React.CSSProperties = { display: "flex", alignItems: "center", gap: 10 }
  const secRowLabel: React.CSSProperties = { display: "inline-flex", alignItems: "center", gap: 6, color: "#D8D2C6", fontSize: 12.5, width: 110, flexShrink: 0 }
  const secBtn: React.CSSProperties = { background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.14)", borderRadius: 8, color: "#F5F0E8", fontSize: 11.5, fontWeight: 600, cursor: "pointer", padding: "6px 10px", flexShrink: 0 }
  const swatch = (c: string, on: boolean, onClick: () => void, aria: string) => (
    <button key={c} onClick={onClick} aria-label={aria}
      style={{ width: 38, height: 38, borderRadius: 11, background: c, border: on ? `2.5px solid ${G}` : "2px solid rgba(255,255,255,0.14)", boxShadow: on ? `0 0 0 3px ${G}22` : "none", cursor: "pointer", flexShrink: 0, transition: "all .15s" }} />
  )

  const previewLabel =
    qrType === "wifi" ? (ssid ? `📶 ${ssid}` : "")
    : qrType === "text" ? text.trim()
    : qrType === "contact" ? (vcName(vc) ? `👤 ${vcName(vc)}` : "")
    : qrType === "phone" ? (phone.trim() ? `📞 ${phone.trim()}` : "")
    : qrType === "email" ? (em.to?.trim() ? `✉️ ${em.to.trim()}` : "")
    : normalizeUrl(url).replace(/^https?:\/\//, "")

  // Boutons de téléchargement PNG/SVG (fichier statique). `primary` = mis en avant.
  const downloadRow = (primary: boolean) => (
    <div style={{ display: "flex", gap: 10 }}>
      <Button variant={primary ? "primary" : "secondary"} size="lg" onClick={() => download("png")} loading={busy === "png"} disabled={!ready || busy !== null}
        leftIcon={done ? <Check size={18} /> : <Download size={18} />} style={{ flex: 1 }}>
        {done ? "Téléchargé" : "Télécharger PNG"}
      </Button>
      <Button variant="secondary" size="lg" onClick={() => download("svg")} loading={busy === "svg"} disabled={!ready || busy !== null}>
        SVG
      </Button>
    </div>
  )

  return (
    <div className="rpad" style={{ position: "relative", minHeight: "100dvh", maxWidth: 1000, margin: "0 auto", padding: "18px 18px calc(40px + env(safe-area-inset-bottom))" }}>
      <Particles behind />
      <Link href="/dashboard" style={{ display: "inline-flex", alignItems: "center", gap: 6, color: MUTED, textDecoration: "none", fontSize: 13, marginBottom: 16 }}>
        <ArrowLeft size={16} /> Retour
      </Link>

      <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 18 }}>
        <div style={{ width: 50, height: 50, borderRadius: 14, flexShrink: 0, background: "linear-gradient(145deg,rgba(201,168,76,0.24),rgba(201,168,76,0.06))", border: "1px solid rgba(201,168,76,0.32)", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <QrIcon size={24} color={G} />
        </div>
        <div>
          <h1 style={{ color: "#F5F0E8", fontSize: 24, fontWeight: 800, margin: 0, letterSpacing: -0.4 }}>QR Dynamique</h1>
          <p style={{ color: MUTED, fontSize: 13, margin: "2px 0 0", lineHeight: 1.4 }}>Créez un QR code — et gardez la main dessus après impression.</p>
        </div>
      </div>

      {/* Mise en avant de l'offre QR Dynamique (masquée si déjà abonné). */}
      {dynPlan === "none" && (
        <Link href="/dashboard/qr-dynamique" style={{ display: "flex", alignItems: "center", gap: 11, marginBottom: 16, padding: "13px 15px", borderRadius: 14, textDecoration: "none", background: "linear-gradient(100deg, rgba(201,168,76,0.16), rgba(201,168,76,0.05))", border: "1px solid rgba(201,168,76,0.32)" }}>
          <span style={{ width: 38, height: 38, borderRadius: 11, background: "rgba(201,168,76,0.18)", border: "1px solid rgba(201,168,76,0.4)", display: "flex", alignItems: "center", justifyContent: "center", color: G, flexShrink: 0 }}><Zap size={19} /></span>
          <span style={{ flex: 1, minWidth: 0 }}>
            <span style={{ display: "block", color: "#F5F0E8", fontSize: 13.5, fontWeight: 800 }}>Passez au QR Dynamique</span>
            <span style={{ display: "block", color: MUTED, fontSize: 11.5, lineHeight: 1.4 }}>Modifiez la destination après impression + suivez les scans. 2 essais gratuits / mois, 30 jours chacun.</span>
          </span>
          <span style={{ color: G, fontSize: 20, fontWeight: 700, flexShrink: 0 }}>→</span>
        </Link>
      )}

      {/* Mise en page : saisie (gauche) · panneau résultat collant (droite) sur desktop. */}
      <div className="qrdyn-layout">
        <div className="qrdyn-main">

      {/* 1 · Type de QR */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8, marginBottom: 14 }}>
        {TYPES.map(t => {
          const on = qrType === t.k
          const Icon = t.icon
          return (
            <button key={t.k} onClick={() => setQrType(t.k)}
              style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 5, minHeight: 60, borderRadius: 13, cursor: "pointer", background: on ? "rgba(201,168,76,0.14)" : "rgba(255,255,255,0.03)", border: `1px solid ${on ? G + "66" : "rgba(255,255,255,0.09)"}`, color: on ? G : MUTED, fontSize: 12.5, fontWeight: on ? 800 : 600, transition: "all .15s" }}>
              <Icon size={19} /> {t.label}
            </button>
          )
        })}
      </div>

      {/* 2 · Saisie selon le type */}
      <div style={{ ...card, marginBottom: 14 }}>
        {qrType === "link" && (<>
          <p style={secTitle}>{accentBar} Lien à encoder</p>
          <input value={url} onChange={e => setUrl(e.target.value)} inputMode="url" autoComplete="url"
            placeholder="ex : monsite.fr  ou  instagram.com/moncompte" style={{ ...field, borderColor: ready ? G + "80" : "rgba(255,255,255,0.14)" }} />
          {url.trim() && normalizeUrl(url) !== url.trim() && (
            <p style={{ color: MUTED, fontSize: 11.5, margin: "9px 2px 0" }}>Encodé comme : <span style={{ color: G, fontWeight: 600 }}>{normalizeUrl(url)}</span></p>
          )}
        </>)}

        {qrType === "wifi" && (<>
          <p style={secTitle}>{accentBar} Réseau WiFi</p>
          <input value={ssid} onChange={e => setSsid(e.target.value)} placeholder="Nom du réseau (SSID)" style={{ ...field, marginBottom: 10, borderColor: ssid.trim() ? G + "80" : "rgba(255,255,255,0.14)" }} />
          {wifiEnc !== "nopass" && (
            <input value={wifiPass} onChange={e => setWifiPass(e.target.value)} placeholder="Mot de passe" style={{ ...field, marginBottom: 10 }} />
          )}
          <div style={{ display: "flex", gap: 4, background: "rgba(255,255,255,0.04)", borderRadius: 11, padding: 3 }}>
            {([["WPA", "WPA/WPA2"], ["WEP", "WEP"], ["nopass", "Ouvert"]] as [WifiEnc, string][]).map(([k, l]) => (
              <button key={k} onClick={() => setWifiEnc(k)}
                style={{ flex: 1, minHeight: 42, borderRadius: 8, border: "none", cursor: "pointer", background: wifiEnc === k ? G : "transparent", color: wifiEnc === k ? "#080808" : MUTED, fontSize: 12, fontWeight: wifiEnc === k ? 800 : 600 }}>{l}</button>
            ))}
          </div>
          <p style={{ color: MUTED, fontSize: 11, margin: "9px 2px 0", lineHeight: 1.45 }}>Scanné, ce QR propose de rejoindre le réseau — idéal sur une table ou une affiche.</p>
        </>)}

        {qrType === "text" && (<>
          <p style={secTitle}>{accentBar} Texte</p>
          <textarea value={text} onChange={e => setText(e.target.value)} rows={3} placeholder="N'importe quel texte à encoder…"
            style={{ width: "100%", boxSizing: "border-box", resize: "vertical", minHeight: 76, background: "#0A0A0A", border: "1px solid rgba(255,255,255,0.14)", borderRadius: 12, color: "#F5F0E8", fontSize: 15, padding: "12px 14px", lineHeight: 1.45, fontFamily: "inherit", outline: "none" }} />
        </>)}

        {qrType === "contact" && (<>
          <p style={secTitle}>{accentBar} Carte de visite</p>
          <div style={{ display: "flex", gap: 10, marginBottom: 10 }}>
            <input value={vc.firstName} onChange={e => setVc(v => ({ ...v, firstName: e.target.value }))} placeholder="Prénom" autoComplete="given-name"
              style={{ ...field, borderColor: vcName(vc) ? G + "80" : "rgba(255,255,255,0.14)" }} />
            <input value={vc.lastName} onChange={e => setVc(v => ({ ...v, lastName: e.target.value }))} placeholder="Nom" autoComplete="family-name" style={field} />
          </div>
          <input value={vc.phone} onChange={e => setVc(v => ({ ...v, phone: e.target.value }))} inputMode="tel" autoComplete="tel" placeholder="Téléphone" style={{ ...field, marginBottom: 10 }} />
          <input value={vc.email} onChange={e => setVc(v => ({ ...v, email: e.target.value }))} inputMode="email" autoComplete="email" placeholder="Email" style={{ ...field, marginBottom: 10 }} />
          <input value={vc.org} onChange={e => setVc(v => ({ ...v, org: e.target.value }))} autoComplete="organization" placeholder="Entreprise" style={{ ...field, marginBottom: 10 }} />
          <input value={vc.title} onChange={e => setVc(v => ({ ...v, title: e.target.value }))} autoComplete="organization-title" placeholder="Fonction (ex : Gérant)" style={{ ...field, marginBottom: 10 }} />
          <input value={vc.url} onChange={e => setVc(v => ({ ...v, url: e.target.value }))} inputMode="url" autoComplete="url" placeholder="Site web" style={field} />
          <p style={{ color: MUTED, fontSize: 11, margin: "9px 2px 0", lineHeight: 1.45 }}>Scanné, ce QR propose d&apos;enregistrer le contact. Seul un nom (ou prénom) est requis.</p>
        </>)}

        {qrType === "phone" && (<>
          <p style={secTitle}>{accentBar} Numéro à appeler</p>
          <input value={phone} onChange={e => setPhone(e.target.value)} inputMode="tel" autoComplete="tel" type="tel"
            placeholder="ex : +33 6 12 34 56 78" style={{ ...field, borderColor: phone.trim() ? G + "80" : "rgba(255,255,255,0.14)" }} />
          <p style={{ color: MUTED, fontSize: 11, margin: "9px 2px 0", lineHeight: 1.45 }}>Scanné, ce QR propose de composer le numéro directement.</p>
        </>)}

        {qrType === "email" && (<>
          <p style={secTitle}>{accentBar} Email à contacter</p>
          <input value={em.to} onChange={e => setEm(v => ({ ...v, to: e.target.value }))} inputMode="email" autoComplete="email" type="email"
            placeholder="contact@monentreprise.fr" style={{ ...field, marginBottom: 10, borderColor: (em.to ?? "").trim() ? G + "80" : "rgba(255,255,255,0.14)" }} />
          <input value={em.subject} onChange={e => setEm(v => ({ ...v, subject: e.target.value }))} placeholder="Objet (optionnel)" style={{ ...field, marginBottom: 10 }} />
          <textarea value={em.body} onChange={e => setEm(v => ({ ...v, body: e.target.value }))} rows={2} placeholder="Message pré-rempli (optionnel)"
            style={{ width: "100%", boxSizing: "border-box", resize: "vertical", minHeight: 60, background: "#0A0A0A", border: "1px solid rgba(255,255,255,0.14)", borderRadius: 12, color: "#F5F0E8", fontSize: 15, padding: "12px 14px", lineHeight: 1.45, fontFamily: "inherit", outline: "none" }} />
          <p style={{ color: MUTED, fontSize: 11, margin: "9px 2px 0", lineHeight: 1.45 }}>Scanné, ce QR ouvre un brouillon d&apos;email pré-rempli vers cette adresse.</p>
        </>)}
      </div>

      {/* 4 · Apparence (repliée par défaut : style, couleurs, correction, logo) */}
      <div style={{ ...card, padding: 0, marginBottom: 14, overflow: "hidden" }}>
        <button onClick={() => setShowStyle(v => !v)} aria-expanded={showStyle}
          style={{ width: "100%", display: "flex", alignItems: "center", gap: 10, padding: "15px 18px", background: "transparent", border: "none", cursor: "pointer", textAlign: "left" }}>
          <span style={{ ...secTitle, marginBottom: 0 }}>{accentBar} Apparence</span>
          <span style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 9 }}>
            {!showStyle && (
              <span style={{ display: "flex", alignItems: "center", gap: 6, color: MUTED, fontSize: 11.5 }}>
                <span style={dot(fg)} /><span style={dot(bg)} />
                <span>{preset.label}{logo ? " · logo" : ""}</span>
              </span>
            )}
            <ChevronDown size={18} color={MUTED} style={{ transform: showStyle ? "rotate(180deg)" : "none", transition: "transform .2s", flexShrink: 0 }} />
          </span>
        </button>

        {showStyle && (
          <div style={{ padding: "0 18px 18px" }}>
            <p style={secTitle}>{accentBar} Style</p>
            <div style={{ display: "flex", gap: 7, marginBottom: 4 }}>
              {STYLE_PRESETS.map(p => {
                const on = styleKey === p.k
                return (
                  <button key={p.k} onClick={() => setStyleKey(p.k)}
                    style={{ flex: "1 1 0", minWidth: 0, minHeight: 42, borderRadius: 10, cursor: "pointer", background: on ? "rgba(201,168,76,0.14)" : "rgba(255,255,255,0.03)", border: `1px solid ${on ? G + "66" : "rgba(255,255,255,0.1)"}`, color: on ? G : MUTED, fontSize: 11.5, fontWeight: on ? 800 : 600, transition: "all .15s" }}>{p.label}</button>
                )
              })}
            </div>

            <p style={{ ...secTitle, marginTop: 20 }}>{accentBar} Couleur du QR</p>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 9, marginBottom: 4 }}>
              {FG_SWATCHES.map(c => swatch(c, fg === c, () => setFg(c), `Couleur ${c}`))}
              <label style={{ width: 38, height: 38, borderRadius: 11, border: "2px solid rgba(255,255,255,0.14)", cursor: "pointer", overflow: "hidden", position: "relative", flexShrink: 0, background: "conic-gradient(from 0deg,#f00,#ff0,#0f0,#0ff,#00f,#f0f,#f00)" }}>
                <input type="color" value={fg} onChange={e => setFg(e.target.value)} style={{ position: "absolute", inset: -4, opacity: 0, cursor: "pointer" }} />
              </label>
            </div>

            <p style={{ ...secTitle, marginTop: 20 }}>{accentBar} Couleur du fond</p>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 9 }}>
              {BG_SWATCHES.map(c => swatch(c, bg === c, () => setBg(c), `Fond ${c}`))}
              <label style={{ width: 38, height: 38, borderRadius: 11, border: "2px solid rgba(255,255,255,0.14)", cursor: "pointer", overflow: "hidden", position: "relative", flexShrink: 0, background: "conic-gradient(from 0deg,#f00,#ff0,#0f0,#0ff,#00f,#f0f,#f00)" }}>
                <input type="color" value={bg} onChange={e => setBg(e.target.value)} style={{ position: "absolute", inset: -4, opacity: 0, cursor: "pointer" }} />
              </label>
            </div>

            <p style={{ ...secTitle, marginTop: 20 }}>{accentBar} Correction d&apos;erreur</p>
            <div style={{ display: "flex", gap: 4, background: "rgba(255,255,255,0.04)", borderRadius: 11, padding: 3 }}>
              {ECC_OPTS.map(o => (
                <button key={o.k} onClick={() => setEcc(o.k)}
                  style={{ flex: 1, minHeight: 42, borderRadius: 8, border: "none", cursor: "pointer", background: ecc === o.k ? G : "transparent", color: ecc === o.k ? "#080808" : MUTED, fontSize: 12.5, fontWeight: ecc === o.k ? 800 : 600, transition: "all .15s" }}>{o.label}</button>
              ))}
            </div>
            <p style={{ color: MUTED, fontSize: 11, margin: "9px 2px 0", lineHeight: 1.45 }}>Plus la correction est élevée, plus le QR reste lisible s&apos;il est abîmé (utile pour l&apos;impression).</p>

            <p style={{ ...secTitle, marginTop: 20 }}>{accentBar} Logo au centre <span style={{ fontWeight: 500, textTransform: "none", letterSpacing: 0, color: "#6E685E" }}>· optionnel</span></p>
            {logo ? (
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <div style={{ width: 46, height: 46, borderRadius: 10, background: "#fff", overflow: "hidden", flexShrink: 0, border: "1px solid rgba(255,255,255,0.12)" }}>
                  <img src={logo} alt="" style={{ width: "100%", height: "100%", objectFit: "contain" }} />
                </div>
                <span style={{ flex: 1, color: MUTED, fontSize: 11.5, lineHeight: 1.4 }}>Logo ajouté — correction d&apos;erreur portée au maximum pour rester scannable.</span>
                <button onClick={() => setLogo(null)} aria-label="Retirer le logo" style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.2)", borderRadius: 9, width: 38, height: 38, color: "var(--danger)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}><X size={16} /></button>
              </div>
            ) : (
              <button onClick={() => logoInput.current?.click()} style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "center", gap: 8, minHeight: 46, borderRadius: 11, border: "1.5px dashed rgba(201,168,76,0.3)", background: "rgba(201,168,76,0.04)", color: G, fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
                <Upload size={16} /> Ajouter un logo
              </button>
            )}
            <input ref={logoInput} type="file" accept="image/*" style={{ display: "none" }} onChange={e => { const f = e.target.files?.[0]; if (f) onLogoFile(f); e.target.value = "" }} />
          </div>
        )}
      </div>

        </div>{/* fin qrdyn-main */}

        <div className="qrdyn-aside">

      {/* 3 · Aperçu — poster QR */}
      <div style={{ position: "relative", borderRadius: 20, padding: "26px 18px", marginBottom: 14, overflow: "hidden", background: "radial-gradient(120% 90% at 50% 0%, rgba(201,168,76,0.12), transparent 60%), rgba(255,255,255,0.02)", border: "1px solid rgba(201,168,76,0.16)", display: "flex", flexDirection: "column", alignItems: "center", gap: 16 }}>
        <div style={{ background: bg, borderRadius: 20, padding: 20, boxShadow: "0 14px 40px rgba(0,0,0,0.5), inset 0 0 0 1px rgba(0,0,0,0.06)", display: "flex", flexDirection: "column", alignItems: "center", gap: 12, transition: "background .2s", maxWidth: "100%" }}>
          <QRCanvas value={data || "https://qrowg.com"} size={210} fg={fg} bg={bg} style={qrStyle} ecc={effectiveEcc} />
          {ready && previewLabel && (
            <p style={{ margin: 0, maxWidth: 210, color: fg, opacity: 0.85, fontSize: 10.5, fontWeight: 600, textAlign: "center", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", letterSpacing: 0.2 }}>{previewLabel}</p>
          )}
        </div>

        {!ready
          ? <p style={{ color: MUTED, fontSize: 12.5, margin: 0, textAlign: "center" }}>{qrType === "wifi" ? "Entrez le nom du réseau pour générer le QR." : qrType === "contact" ? "Entrez au moins un nom pour générer la carte." : qrType === "phone" ? "Entrez un numéro pour générer le QR." : qrType === "email" ? "Entrez une adresse email pour générer le QR." : "Renseignez le contenu ci-dessus pour générer votre QR code."}</p>
          : ratio < 3
            ? <button onClick={() => { setFg("#080808"); setBg("#FFFFFF") }} title="Rétablir noir sur blanc"
                style={{ display: "flex", alignItems: "center", gap: 7, color: "var(--danger)", fontSize: 12, fontWeight: 600, background: "rgba(255,107,107,0.1)", border: "1px solid rgba(255,107,107,0.3)", borderRadius: 999, padding: "6px 14px", cursor: "pointer" }}>
                <AlertTriangle size={14} /> Risque de non-scan — <span style={{ textDecoration: "underline" }}>corriger</span>
              </button>
            : inverted
              ? <button onClick={() => { const f = fg; setFg(bg); setBg(f) }} title="Inverser les couleurs (modules sombres sur fond clair)"
                  style={{ display: "flex", alignItems: "center", gap: 7, color: "#FBBF24", fontSize: 12, fontWeight: 600, background: "rgba(251,191,36,0.1)", border: "1px solid rgba(251,191,36,0.3)", borderRadius: 999, padding: "6px 14px", cursor: "pointer" }}>
                  <AlertTriangle size={14} /> Clair sur fond sombre — <span style={{ textDecoration: "underline" }}>inverser</span>
                </button>
            : ratio < 4.5
              ? <div style={{ display: "flex", alignItems: "center", gap: 7, color: "#FBBF24", fontSize: 12, fontWeight: 600, background: "rgba(251,191,36,0.1)", border: "1px solid rgba(251,191,36,0.3)", borderRadius: 999, padding: "6px 14px" }}>
                  <AlertTriangle size={14} /> Contraste limite — testez avant d&apos;imprimer
                </div>
              : <div style={{ display: "flex", alignItems: "center", gap: 7, color: "var(--success)", fontSize: 12, fontWeight: 600, background: "rgba(57,255,143,0.09)", border: "1px solid rgba(57,255,143,0.28)", borderRadius: 999, padding: "6px 14px" }}>
                  <ShieldCheck size={14} /> Scannable
                </div>}
      </div>

      {/* 5 · Actions — hiérarchie selon le type. Dynamique (lien/texte/appel/email) : créer en avant,
          téléchargement en repli. Statique (WiFi/Contact) : téléchargement en avant, enregistrement en repli. */}
      <div style={{ ...card, marginBottom: hasSaved || history.length > 0 ? 4 : 14 }}>
        {dynamic ? (<>
          <Button onClick={createDynamic} disabled={!ready || saveBusy} size="lg" leftIcon={<Zap size={17} />} style={{ width: "100%" }}>
            {saveBusy ? "Création…" : "Créer le QR dynamique — essai 30 j"}
          </Button>
          <p style={{ color: MUTED, fontSize: 11.5, margin: "9px 2px 0", lineHeight: 1.5 }}>
            Modifiable après impression + suivi des scans. Gratuit <strong style={{ color: "#FBBF24" }}>30 jours</strong> (2/mois), puis <Link href="/dashboard/qr-dynamique" style={{ color: G, fontWeight: 700, textDecoration: "none" }}>un abonnement</Link> pour rester actif.
            {qrType === "text" && <span style={{ display: "block", color: "#6E685E", fontSize: 11, marginTop: 3 }}>Ouvre une page au scan (Internet requis).</span>}
          </p>
          <div style={{ display: "flex", alignItems: "center", gap: 12, margin: "15px 0 13px" }}>
            <span style={{ flex: 1, height: 1, background: "rgba(255,255,255,0.09)" }} />
            <span style={{ color: "#6E685E", fontSize: 11, fontWeight: 600 }}>ou télécharger un fichier statique</span>
            <span style={{ flex: 1, height: 1, background: "rgba(255,255,255,0.09)" }} />
          </div>
          {downloadRow(false)}
          <p style={{ color: "#6E685E", fontSize: 11, margin: "8px 2px 0", lineHeight: 1.45 }}>Image imprimable, non modifiable et sans suivi.</p>
        </>) : (<>
          {downloadRow(true)}
          <div style={{ display: "flex", alignItems: "center", gap: 12, margin: "15px 0 13px" }}>
            <span style={{ flex: 1, height: 1, background: "rgba(255,255,255,0.09)" }} />
            <span style={{ color: "#6E685E", fontSize: 11, fontWeight: 600 }}>ou enregistrer dans mon compte</span>
            <span style={{ flex: 1, height: 1, background: "rgba(255,255,255,0.09)" }} />
          </div>
          <Button variant="secondary" onClick={saveInstant} loading={saveBusy} disabled={!ready} leftIcon={<Save size={16} />} style={{ width: "100%" }}>
            Enregistrer ce QR
          </Button>
          <p style={{ color: "#6E685E", fontSize: 11, margin: "8px 2px 0", lineHeight: 1.45 }}>
            QR statique — fonctionne hors ligne, sans expiration ({qrType === "wifi" ? "auto-connexion WiFi" : "ajout du contact"} au scan).
          </p>
        </>)}
        {saveMsg && <p style={{ color: saveMsg.ok ? "var(--success)" : "#FBBF24", fontSize: 12.5, textAlign: "center", margin: "11px 0 0" }}>{saveMsg.text}</p>}
      </div>

        </div>{/* fin qrdyn-aside */}
      </div>{/* fin qrdyn-layout */}

      {/* Génération en masse (Business) : créer plusieurs liens dynamiques depuis un CSV. */}
      {canDynBulk(dynPlan) && (
        <button onClick={() => { setBulkOpen(true); setBulkMsg(null) }}
          style={{ marginTop: 22, width: "100%", display: "flex", alignItems: "center", justifyContent: "center", gap: 8, minHeight: 46, borderRadius: 12, border: "1.5px dashed rgba(201,168,76,0.35)", background: "rgba(201,168,76,0.05)", color: G, fontSize: 13.5, fontWeight: 700, cursor: "pointer" }}>
          <Upload size={16} /> Importer des liens en masse (CSV)
        </button>
      )}

      {/* 6 · Mes QR codes — liens dynamiques + QR enregistrés, regroupés sous un seul titre. */}
      {hasSaved && (
        <div style={{ marginTop: 22 }}>
          <p style={secTitle}>{accentBar} Mes QR codes</p>

          {dynamicLinks.length > 0 && (<>
            <p style={subLabel}>Liens dynamiques</p>
            <div style={{ display: "flex", flexDirection: "column", gap: 9, marginBottom: staticQrs.length > 0 ? 18 : 0 }}>
              {dynamicLinks.map(s => { const st = dynStatus(s); return (
                <div key={s.id} onClick={() => setDetail(s)} title="Voir le détail" style={{ display: "flex", alignItems: "center", gap: 14, background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.09)", borderRadius: 16, padding: 12, cursor: "pointer" }}>
                  <div style={{ background: "#fff", borderRadius: 12, padding: 8, lineHeight: 0, flexShrink: 0, boxShadow: "0 3px 14px rgba(0,0,0,0.32)" }}>
                    <QRCanvas value={s.payload || "https://qrowg.com"} size={92} fg={safeFg(s.style?.fg)} bg="#FFFFFF" />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ color: "#F5F0E8", fontSize: 13.5, fontWeight: 700, margin: "0 0 2px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{s.label || (s.dest_url || "").replace(/^https?:\/\//, "")}</p>
                    <p style={{ color: MUTED, fontSize: 11, margin: "0 0 5px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>→ {s.dest_url}</p>
                    <div style={{ display: "flex", alignItems: "center", gap: 7, flexWrap: "wrap" }}>
                      <span style={{ display: "inline-flex", alignItems: "center", gap: 5, color: st.color, fontSize: 10.5, fontWeight: 700, background: `${st.color}18`, borderRadius: 999, padding: "3px 8px" }}><span style={{ width: 6, height: 6, borderRadius: "50%", background: st.color }} />{st.label}</span>
                      <span style={{ display: "inline-flex", alignItems: "center", gap: 4, color: "#6E685E", fontSize: 10.5, fontWeight: 600 }}><BarChart3 size={11} />{s.total_scans ?? 0} scan{(s.total_scans ?? 0) > 1 ? "s" : ""}</span>
                    </div>
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 6, flexShrink: 0 }}>
                    <button onClick={e => { e.stopPropagation(); editDest(s) }} title="Modifier la destination" aria-label="Modifier la destination" style={{ background: "rgba(201,168,76,0.1)", border: "1px solid rgba(201,168,76,0.28)", borderRadius: 9, color: G, cursor: "pointer", width: 34, height: 34, display: "flex", alignItems: "center", justifyContent: "center" }}><Pencil size={14} /></button>
                    <button onClick={e => { e.stopPropagation(); deleteInstant(s.id) }} aria-label="Supprimer" style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.2)", borderRadius: 9, width: 34, height: 34, color: "var(--danger)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}><Trash2 size={14} /></button>
                  </div>
                </div>
              ) })}
            </div>
          </>)}

          {staticQrs.length > 0 && (<>
            <p style={subLabel}>Enregistrés (statiques)</p>
            <div style={{ display: "flex", gap: 10, overflowX: "auto", paddingBottom: 6 }}>
              {staticQrs.map(s => (
                <div key={s.id} onClick={() => setDetail(s)} title="Voir le détail"
                  style={{ position: "relative", flexShrink: 0, width: 124, display: "flex", flexDirection: "column", alignItems: "center", gap: 8, background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 14, padding: 11, cursor: "pointer" }}>
                  <div style={{ background: "#fff", borderRadius: 10, padding: 7, lineHeight: 0, boxShadow: "0 2px 10px rgba(0,0,0,0.3)" }}>
                    <QRCanvas value={s.payload || "https://qrowg.com"} size={82} fg={safeFg(s.style?.fg)} bg="#FFFFFF" />
                  </div>
                  <span style={{ color: MUTED, fontSize: 10, maxWidth: 108, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", textAlign: "center" }}>{s.label || s.kind}</span>
                  <button onClick={e => { e.stopPropagation(); deleteInstant(s.id) }} aria-label="Supprimer ce QR"
                    style={{ position: "absolute", top: 5, right: 5, background: "rgba(239,68,68,0.15)", border: "none", borderRadius: 7, width: 24, height: 24, color: "var(--danger)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}><Trash2 size={12} /></button>
                </div>
              ))}
            </div>
          </>)}
        </div>
      )}

      {/* Brouillons récents (locaux, non enregistrés — cliquer pour réutiliser le design) */}
      {history.length > 0 && (
        <div style={{ marginTop: 22 }}>
          <p style={secTitle}>{accentBar} Brouillons récents</p>
          <div style={{ display: "flex", gap: 10, overflowX: "auto", paddingBottom: 6 }}>
            {history.map((h, i) => (
              <button key={i} title={`Réutiliser : ${histLabel(h)}`} onClick={() => loadEntry(h)}
                style={{ flexShrink: 0, width: 98, display: "flex", flexDirection: "column", alignItems: "center", gap: 7, background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 13, padding: 9, cursor: "pointer" }}>
                <div style={{ background: "#fff", borderRadius: 9, padding: 6, lineHeight: 0, boxShadow: "0 2px 8px rgba(0,0,0,0.25)" }}>
                  <QRCanvas value={payload(h) || "https://qrowg.com"} size={58} fg={safeFg(h.fg)} bg="#FFFFFF" />
                </div>
                <span style={{ color: MUTED, fontSize: 9.5, maxWidth: 86, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{histLabel(h)}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Aperçu détaillé d'un QR enregistré (clic) : grand QR + infos + décompte d'expiration */}
      {detail && (() => { const ex = expiryText(detail); return (
        <div onClick={() => setDetail(null)} style={{ position: "fixed", inset: 0, zIndex: 300, background: "rgba(0,0,0,0.7)", backdropFilter: "blur(6px)", display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
          <div onClick={e => e.stopPropagation()} style={{ width: "100%", maxWidth: 400, maxHeight: "90vh", overflowY: "auto", background: "#141210", border: "1px solid rgba(201,168,76,0.25)", borderRadius: 20, padding: 20, boxShadow: "0 20px 60px rgba(0,0,0,0.7)" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
              <p style={{ flex: 1, color: "#F5F0E8", fontSize: 15, fontWeight: 700, margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{detail.label || (detail.dynamic ? "Lien dynamique" : detail.kind)}</p>
              <button onClick={() => setDetail(null)} aria-label="Fermer" style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, color: MUTED, cursor: "pointer", width: 30, height: 30 }}><X size={15} /></button>
            </div>
            <div style={{ display: "flex", justifyContent: "center", marginBottom: 16 }}>
              <div style={{ background: detail.style?.bg || "#fff", borderRadius: 14, padding: 12, lineHeight: 0 }}>
                <QRCanvas value={detail.payload || "https://qrowg.com"} size={196} fg={detail.style?.fg || "#080808"} bg={detail.style?.bg || "#FFFFFF"} />
              </div>
            </div>

            {/* Expiration (au premier plan) */}
            <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "11px 13px", borderRadius: 12, background: `${ex.color}14`, border: `1px solid ${ex.color}44`, marginBottom: 12 }}>
              <span style={{ width: 8, height: 8, borderRadius: "50%", background: ex.color, flexShrink: 0 }} />
              <span style={{ color: ex.color, fontSize: 12.5, fontWeight: 700 }}>{ex.text}</span>
            </div>

            {detail.dynamic ? (
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                <div>
                  <p style={{ color: MUTED, fontSize: 10.5, textTransform: "uppercase", letterSpacing: 1, margin: "0 0 4px" }}>Lien court (le QR pointe ici)</p>
                  <p style={{ color: "#F5F0E8", fontSize: 12.5, margin: 0, wordBreak: "break-all", fontFamily: "monospace" }}>{detail.payload}</p>
                </div>
                <div>
                  <p style={{ color: MUTED, fontSize: 10.5, textTransform: "uppercase", letterSpacing: 1, margin: "0 0 4px" }}>Destination (modifiable)</p>
                  <p style={{ color: "#F5F0E8", fontSize: 12.5, margin: "0 0 6px", wordBreak: "break-all" }}>{detail.dest_url}</p>
                  <button onClick={() => editDest(detail)} style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 8, color: "#F5F0E8", fontSize: 12, fontWeight: 600, cursor: "pointer", padding: "8px 12px" }}>Modifier la destination</button>
                </div>
                <button onClick={() => setStats(detail)}
                  style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 8, alignSelf: "flex-start", background: "rgba(201,168,76,0.1)", border: "1px solid rgba(201,168,76,0.3)", borderRadius: 10, color: G, fontSize: 12.5, fontWeight: 700, cursor: "pointer", padding: "9px 14px" }}>
                  <BarChart3 size={15} /> Statistiques
                </button>

                {/* Sécurité du lien (Pro+) : mot de passe, expiration programmée, pause manuelle. */}
                {canDynLinkSecurity(dynPlan) ? (
                  <div style={{ borderTop: "1px solid rgba(255,255,255,0.08)", paddingTop: 13, display: "flex", flexDirection: "column", gap: 11 }}>
                    <p style={{ color: MUTED, fontSize: 10.5, textTransform: "uppercase", letterSpacing: 1, margin: 0, display: "flex", alignItems: "center", gap: 6 }}><ShieldCheck size={13} /> Sécurité</p>
                    <div style={secRow}>
                      <span style={secRowLabel}><Lock size={14} /> Mot de passe</span>
                      <span style={{ flex: 1, fontSize: 12, color: detail.has_password ? "var(--success)" : MUTED }}>{detail.has_password ? "Activé" : "Aucun"}</span>
                      <button style={secBtn} onClick={() => detail.has_password ? removeLinkPassword(detail) : setLinkPassword(detail)}>{detail.has_password ? "Retirer" : "Ajouter"}</button>
                    </div>
                    <div style={secRow}>
                      <span style={secRowLabel}><Clock size={14} /> Expiration</span>
                      <span style={{ flex: 1, fontSize: 12, color: detail.expires_at ? "#FBBF24" : MUTED }}>{detail.expires_at ? new Date(detail.expires_at).toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" }) : "Permanent"}</span>
                      <button style={secBtn} onClick={() => scheduleExpiry(detail)}>Modifier</button>
                    </div>
                    <div style={secRow}>
                      <span style={secRowLabel}>{detail.status === "active" ? <Pause size={14} /> : <Play size={14} />} État</span>
                      <span style={{ flex: 1, fontSize: 12, color: detail.status === "active" ? "var(--success)" : "#FBBF24" }}>{detail.status === "active" ? "Actif" : detail.status === "paused" ? "En pause" : detail.status === "expired" ? "Expiré" : detail.status}</span>
                      <button style={secBtn} onClick={() => toggleManualPause(detail)}>{detail.status === "active" ? "Mettre en pause" : "Réactiver"}</button>
                    </div>
                  </div>
                ) : (
                  <a href="/dashboard/qr-dynamique" style={{ display: "block", borderTop: "1px solid rgba(255,255,255,0.08)", paddingTop: 13, textDecoration: "none" }}>
                    <p style={{ color: G, fontSize: 12.5, fontWeight: 700, margin: "0 0 3px", display: "flex", alignItems: "center", gap: 6 }}><ShieldCheck size={14} /> Sécurité du lien</p>
                    <p style={{ color: MUTED, fontSize: 11.5, margin: 0, lineHeight: 1.5 }}>Mot de passe, expiration programmée et pause avec le palier <strong style={{ color: "#F5F0E8" }}>Pro</strong> →</p>
                  </a>
                )}
              </div>
            ) : (
              <div>
                <p style={{ color: MUTED, fontSize: 10.5, textTransform: "uppercase", letterSpacing: 1, margin: "0 0 4px" }}>Contenu encodé</p>
                <p style={{ color: "#F5F0E8", fontSize: 12.5, margin: 0, wordBreak: "break-all", fontFamily: "monospace" }}>{detail.payload}</p>
              </div>
            )}

            <div style={{ display: "flex", gap: 9, marginTop: 16 }}>
              <button onClick={copyDetail} style={{ flex: 1, display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 6, padding: "11px", borderRadius: 10, border: "1px solid rgba(255,255,255,0.12)", background: "rgba(255,255,255,0.04)", color: detailCopied ? "var(--success)" : "#F5F0E8", fontSize: 13, fontWeight: 700, cursor: "pointer" }}>
                {detailCopied ? <><Check size={15} /> Copié !</> : <><Link2 size={15} /> Copier</>}
              </button>
              <button onClick={downloadDetail} style={{ flex: 1, display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 6, padding: "11px", borderRadius: 10, border: "none", background: G, color: "#080808", fontSize: 13, fontWeight: 700, cursor: "pointer" }}>
                <Download size={15} /> PNG
              </button>
            </div>
            {detail.dynamic && detail.payload && (
              <a href={detail.payload} target="_blank" rel="noopener noreferrer" style={{ display: "block", textAlign: "center", color: G, fontSize: 12, fontWeight: 600, textDecoration: "none", marginTop: 11 }}>Ouvrir le lien ↗</a>
            )}
          </div>
        </div>
      ) })()}

      {/* Pop-up statistiques d'un lien dynamique — ancrée à droite sur PC, feuille par-dessus sur mobile.
          Données 100% réelles (aucun graphe fictif) : total, dernier scan, moyenne/jour, création, statut. */}
      {stats && (() => {
        const total = stats.total_scans ?? 0
        const created = stats.created_at ? new Date(stats.created_at) : null
        const daysActive = created ? Math.max(1, Math.round((Date.now() - created.getTime()) / 86400000)) : 1
        const perDay = total / daysActive
        const st = dynStatus(stats)
        const ex = expiryText(stats)
        const rows: { icon: any; label: string; value: string; color?: string }[] = [
          { icon: Clock, label: "Dernier scan", value: stats.last_scan_at ? fmtDateTime(stats.last_scan_at) : "Aucun scan pour l'instant" },
          { icon: TrendingUp, label: "Moyenne par jour", value: `${perDay.toLocaleString("fr-FR", { maximumFractionDigits: 1 })} / jour · sur ${daysActive} j` },
          { icon: Calendar, label: "Créé le", value: fmtDateTime(stats.created_at) },
          { icon: Activity, label: "Statut", value: st.label, color: st.color },
        ]
        const panel: React.CSSProperties = {
          background: "#141210", border: "1px solid rgba(201,168,76,0.25)", boxShadow: "0 20px 60px rgba(0,0,0,0.7)",
          zIndex: 401, overflowY: "auto", position: "fixed",
          ...(isMobile
            ? { left: 0, right: 0, bottom: 0, width: "100%", maxHeight: "85dvh", borderRadius: "22px 22px 0 0", padding: 20, paddingBottom: "calc(20px + env(safe-area-inset-bottom))", animation: "mo-slide-up .22s ease" }
            : { top: "50%", right: 24, transform: "translateY(-50%)", width: 380, maxHeight: "88vh", borderRadius: 20, padding: 22 }),
        }
        return (
          <div onClick={() => setStats(null)} style={{ position: "fixed", inset: 0, zIndex: 400, background: "rgba(0,0,0,0.55)", backdropFilter: "blur(3px)" }}>
            {isMobile && <div style={{ position: "absolute", bottom: "calc(85dvh - 4px)", left: "50%", transform: "translateX(-50%)", width: 40, height: 4, borderRadius: 2, background: "rgba(255,255,255,0.25)" }} />}
            <div onClick={e => e.stopPropagation()} style={panel}>
              <div style={{ display: "flex", alignItems: "center", gap: 9, marginBottom: 16 }}>
                <BarChart3 size={18} color={G} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ color: "#F5F0E8", fontSize: 15, fontWeight: 800, margin: 0 }}>Statistiques</p>
                  <p style={{ color: MUTED, fontSize: 11.5, margin: "1px 0 0", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{stats.label || stats.dest_url || "Lien dynamique"}</p>
                </div>
                <button onClick={() => setStats(null)} aria-label="Fermer" style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, color: MUTED, cursor: "pointer", width: 30, height: 30, flexShrink: 0 }}><X size={15} /></button>
              </div>

              {/* Total (chiffre héro) */}
              <div style={{ textAlign: "center", padding: "18px 12px", borderRadius: 16, background: "radial-gradient(120% 100% at 50% 0%, rgba(201,168,76,0.14), transparent 65%), rgba(255,255,255,0.02)", border: "1px solid rgba(201,168,76,0.16)", marginBottom: 14 }}>
                <p style={{ color: G, fontSize: 44, fontWeight: 800, margin: 0, lineHeight: 1, letterSpacing: -1 }}>{total.toLocaleString("fr-FR")}</p>
                <p style={{ color: MUTED, fontSize: 12, fontWeight: 600, margin: "7px 0 0", textTransform: "uppercase", letterSpacing: 1.2 }}>scan{total > 1 ? "s" : ""} au total</p>
              </div>

              {/* Expiration (essai) */}
              <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 12px", borderRadius: 12, background: `${ex.color}14`, border: `1px solid ${ex.color}44`, marginBottom: 14 }}>
                <span style={{ width: 8, height: 8, borderRadius: "50%", background: ex.color, flexShrink: 0 }} />
                <span style={{ color: ex.color, fontSize: 12, fontWeight: 700 }}>{ex.text}</span>
              </div>

              {/* Détail */}
              <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                {rows.map((r, i) => { const Icon = r.icon; return (
                  <div key={i} style={{ display: "flex", alignItems: "center", gap: 11, padding: "11px 2px", borderTop: i === 0 ? "none" : "1px solid rgba(255,255,255,0.06)" }}>
                    <Icon size={16} color={MUTED} style={{ flexShrink: 0 }} />
                    <span style={{ flex: 1, color: MUTED, fontSize: 12.5 }}>{r.label}</span>
                    <span style={{ color: r.color || "#F5F0E8", fontSize: 12.5, fontWeight: 700, textAlign: "right" }}>{r.value}</span>
                  </div>
                ) })}
              </div>

              {/* Stats détaillées (Pro+) : graphe par jour, appareils, pays — données réelles. */}
              {statsLoading && <p style={{ color: MUTED, fontSize: 12, textAlign: "center", margin: "16px 0 0" }}>Chargement des statistiques…</p>}

              {statsData?.detailed && (() => {
                const days = (statsData.byDay || []).slice(-14)
                const maxDay = Math.max(1, ...days.map((d: any) => d.count))
                const totalWindow = (statsData.byDevice || []).reduce((n: number, d: any) => n + d.count, 0)
                return (
                  <div style={{ marginTop: 18 }}>
                    <p style={{ color: MUTED, fontSize: 10.5, textTransform: "uppercase", letterSpacing: 1, margin: "0 0 9px", display: "flex", justifyContent: "space-between" }}>
                      <span>Scans · 14 derniers jours</span>
                      {statsData.peakDay && <span style={{ color: "#6E685E", textTransform: "none", letterSpacing: 0 }}>pic : {statsData.peakDay.count}</span>}
                    </p>
                    {/* Histogramme par jour */}
                    <div style={{ display: "flex", alignItems: "flex-end", gap: 3, height: 56, marginBottom: 4 }}>
                      {days.map((d: any, i: number) => (
                        <div key={i} title={`${d.date} · ${d.count} scan${d.count > 1 ? "s" : ""}`}
                          style={{ flex: 1, minWidth: 0, height: `${Math.max(3, (d.count / maxDay) * 100)}%`, borderRadius: 3,
                            background: d.count > 0 ? "linear-gradient(180deg, #E6C766, #C9A84C)" : "rgba(255,255,255,0.06)" }} />
                      ))}
                    </div>
                    {totalWindow === 0 && <p style={{ color: "#6E685E", fontSize: 11, textAlign: "center", margin: "6px 0 0" }}>Aucun scan sur la période — partagez votre QR pour voir les données arriver.</p>}

                    {/* Appareils */}
                    {(statsData.byDevice || []).length > 0 && (
                      <div style={{ marginTop: 16 }}>
                        <p style={{ color: MUTED, fontSize: 10.5, textTransform: "uppercase", letterSpacing: 1, margin: "0 0 8px" }}>Appareils</p>
                        <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
                          {statsData.byDevice.map((d: any) => {
                            const pct = totalWindow ? Math.round((d.count / totalWindow) * 100) : 0
                            return (
                              <div key={d.device} style={{ display: "flex", alignItems: "center", gap: 9 }}>
                                <span style={{ width: 78, flexShrink: 0, color: "#D8D2C6", fontSize: 12 }}>{DEVICE_LABEL[d.device as keyof typeof DEVICE_LABEL] || d.device}</span>
                                <div style={{ flex: 1, height: 7, borderRadius: 4, background: "rgba(255,255,255,0.06)", overflow: "hidden" }}>
                                  <div style={{ width: `${pct}%`, height: "100%", borderRadius: 4, background: G }} />
                                </div>
                                <span style={{ width: 40, flexShrink: 0, textAlign: "right", color: MUTED, fontSize: 11.5, fontVariantNumeric: "tabular-nums" }}>{d.count} · {pct}%</span>
                              </div>
                            )
                          })}
                        </div>
                      </div>
                    )}

                    {/* Pays */}
                    {(statsData.byCountry || []).length > 0 && (
                      <div style={{ marginTop: 16 }}>
                        <p style={{ color: MUTED, fontSize: 10.5, textTransform: "uppercase", letterSpacing: 1, margin: "0 0 8px" }}>Pays</p>
                        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                          {statsData.byCountry.slice(0, 5).map((c: any) => (
                            <div key={c.country} style={{ display: "flex", alignItems: "center", gap: 9, fontSize: 12.5 }}>
                              <span style={{ fontSize: 15 }}>{countryFlag(c.country)}</span>
                              <span style={{ flex: 1, color: "#D8D2C6" }}>{c.country === "??" ? "Inconnu" : c.country}</span>
                              <span style={{ color: MUTED, fontVariantNumeric: "tabular-nums" }}>{c.count}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )
              })()}

              {/* Upsell : stats détaillées réservées au Pro */}
              {statsData && statsData.detailed === false && (
                <a href="/dashboard/qr-dynamique" style={{ display: "block", marginTop: 16, padding: "13px 14px", borderRadius: 12, background: "rgba(201,168,76,0.08)", border: "1px solid rgba(201,168,76,0.28)", textDecoration: "none" }}>
                  <p style={{ color: G, fontSize: 12.5, fontWeight: 700, margin: "0 0 3px", display: "flex", alignItems: "center", gap: 6 }}><BarChart3 size={14} /> Statistiques détaillées</p>
                  <p style={{ color: MUTED, fontSize: 11.5, margin: 0, lineHeight: 1.5 }}>Scans par jour, appareil et pays avec le palier <strong style={{ color: "#F5F0E8" }}>Pro</strong>. Toucher pour découvrir →</p>
                </a>
              )}

              <div style={{ marginTop: 16, padding: "11px 13px", borderRadius: 12, background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)" }}>
                <p style={{ color: "#6E685E", fontSize: 10.5, textTransform: "uppercase", letterSpacing: 1, margin: "0 0 3px" }}>Lien suivi</p>
                <p style={{ color: "#F5F0E8", fontSize: 12, margin: 0, wordBreak: "break-all", fontFamily: "monospace" }}>{stats.payload}</p>
              </div>
              <p style={{ color: "#6E685E", fontSize: 10.5, margin: "10px 2px 0", lineHeight: 1.5, textAlign: "center" }}>Mis à jour à chaque scan.</p>
            </div>
          </div>
        )
      })()}

      {/* Modal génération en masse (Business) : coller/charger un CSV → créer N liens dynamiques. */}
      {bulkOpen && (
        <div onClick={() => setBulkOpen(false)} style={{ position: "fixed", inset: 0, zIndex: 320, background: "rgba(0,0,0,0.7)", backdropFilter: "blur(6px)", display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
          <div onClick={e => e.stopPropagation()} style={{ width: "100%", maxWidth: 460, maxHeight: "90vh", overflowY: "auto", background: "#141210", border: "1px solid rgba(201,168,76,0.25)", borderRadius: 20, padding: 20, boxShadow: "0 20px 60px rgba(0,0,0,0.7)" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 9, marginBottom: 6 }}>
              <Upload size={17} color={G} />
              <p style={{ flex: 1, color: "#F5F0E8", fontSize: 16, fontWeight: 800, margin: 0 }}>Importer en masse</p>
              <button onClick={() => setBulkOpen(false)} aria-label="Fermer" style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, color: MUTED, cursor: "pointer", width: 30, height: 30 }}><X size={15} /></button>
            </div>
            <p style={{ color: MUTED, fontSize: 12, margin: "0 0 14px", lineHeight: 1.55 }}>
              Une ligne par lien : <code style={{ color: "#F5F0E8" }}>destination</code> ou <code style={{ color: "#F5F0E8" }}>libellé,destination</code>. En-tête (<code style={{ color: "#F5F0E8" }}>label,url</code>) et point-virgule acceptés. Jusqu'à 100 liens.
            </p>

            <div style={{ display: "flex", gap: 9, marginBottom: 10 }}>
              <button onClick={() => bulkFileInput.current?.click()} style={{ display: "inline-flex", alignItems: "center", gap: 7, background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.14)", borderRadius: 10, color: "#F5F0E8", fontSize: 12.5, fontWeight: 600, cursor: "pointer", padding: "9px 13px" }}><Upload size={14} /> Charger un .csv</button>
              {bulkText && <button onClick={() => { setBulkText(""); setBulkMsg(null) }} style={{ background: "transparent", border: "none", color: MUTED, fontSize: 12.5, cursor: "pointer" }}>Effacer</button>}
              <input ref={bulkFileInput} type="file" accept=".csv,text/csv,text/plain" style={{ display: "none" }} onChange={e => { const f = e.target.files?.[0]; if (f) onBulkFile(f); e.target.value = "" }} />
            </div>

            <textarea value={bulkText} onChange={e => setBulkText(e.target.value)} rows={7} placeholder={"label,url\nMa boutique,maboutique.fr\nInstagram,instagram.com/moncompte"}
              style={{ width: "100%", boxSizing: "border-box", resize: "vertical", minHeight: 130, background: "#0A0A0A", border: "1px solid rgba(255,255,255,0.14)", borderRadius: 12, color: "#F5F0E8", fontSize: 13, padding: "12px 14px", lineHeight: 1.5, fontFamily: "monospace", outline: "none" }} />

            {bulkText.trim() && (
              <div style={{ marginTop: 12 }}>
                <p style={{ color: MUTED, fontSize: 11.5, margin: "0 0 8px" }}>
                  <strong style={{ color: "var(--success)" }}>{bulkParse.validCount}</strong> valide{bulkParse.validCount > 1 ? "s" : ""}
                  {bulkParse.rows.length - bulkParse.validCount > 0 && <> · <strong style={{ color: "#FF6B6B" }}>{bulkParse.rows.length - bulkParse.validCount}</strong> à corriger</>}
                  {bulkParse.truncated > 0 && <> · {bulkParse.truncated} au-delà de 100 (ignorées)</>}
                </p>
                <div style={{ maxHeight: 150, overflowY: "auto", display: "flex", flexDirection: "column", gap: 5 }}>
                  {bulkParse.rows.slice(0, 30).map((r, i) => (
                    <div key={i} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 11.5 }}>
                      {r.valid ? <Check size={13} color="var(--success)" style={{ flexShrink: 0 }} /> : <X size={13} color="#FF6B6B" style={{ flexShrink: 0 }} />}
                      <span style={{ color: "#D8D2C6", flexShrink: 0, maxWidth: 130, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{r.label || "—"}</span>
                      <span style={{ color: r.valid ? MUTED : "#FF6B6B", flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{r.valid ? r.dest : `${r.dest || "(vide)"} · ${r.error}`}</span>
                    </div>
                  ))}
                  {bulkParse.rows.length > 30 && <p style={{ color: "#6E685E", fontSize: 11, margin: 0 }}>… et {bulkParse.rows.length - 30} autres</p>}
                </div>
              </div>
            )}

            {bulkMsg && <p style={{ color: bulkMsg.ok ? "var(--success)" : "#FBBF24", fontSize: 12.5, textAlign: "center", margin: "12px 0 0" }}>{bulkMsg.text}</p>}

            <Button onClick={runBulk} disabled={bulkParse.validCount === 0 || bulkBusy} style={{ width: "100%", marginTop: 14 }}>
              {bulkBusy ? "Création…" : `Créer ${bulkParse.validCount} lien${bulkParse.validCount > 1 ? "s" : ""} dynamique${bulkParse.validCount > 1 ? "s" : ""}`}
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
