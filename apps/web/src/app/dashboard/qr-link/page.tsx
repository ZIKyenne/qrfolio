"use client"

// Generateur de QR code — Lien / WiFi / Texte / Contact. 100% local (qr-code-
// styling via qrRender), sans API. Styles, logo, correction, export PNG/SVG,
// historique.
import { useMemo, useRef, useState, useEffect } from "react"
import Link from "next/link"
import { ArrowLeft, Download, Check, QrCode as QrIcon, ShieldCheck, AlertTriangle, Upload, X, Link2, Wifi, Type, Contact, Phone, Mail, Save, Trash2 } from "lucide-react"
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

// Champs qui determinent la charge utile du QR (partages entre l'etat live et l'historique).
type QrSource = {
  type: QrType; url: string; ssid: string; wifiPass: string; wifiEnc: WifiEnc; text: string
  vc: VCardFields; phone: string; em: EmailFields
}
type QrHistEntry = QrSource & {
  fg: string; bg: string; ecc: "L" | "M" | "Q" | "H"; styleKey: string
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
  const [busy, setBusy] = useState<null | "png" | "svg">(null)
  const [done, setDone] = useState(false)
  const logoInput = useRef<HTMLInputElement>(null)
  // QR instantanés ENREGISTRÉS (persistants, comptent dans le quota du plan limits.qr)
  const [saved, setSaved] = useState<any[]>([])
  const [saveBusy, setSaveBusy] = useState(false)
  const [saveMsg, setSaveMsg] = useState<{ text: string; ok: boolean } | null>(null)

  const data = useMemo(() => payload({ type: qrType, url, ssid, wifiPass, wifiEnc, text, vc, phone, em }), [qrType, url, ssid, wifiPass, wifiEnc, text, vc, phone, em])
  const ready = data.length > 0
  const ratio = contrast(fg, bg)
  const inverted = isInverted(fg, bg)

  const [history, setHistory] = useState<QrHistEntry[]>([])
  useEffect(() => { try { const h = JSON.parse(localStorage.getItem("qrfolio_qr_history") || "[]"); if (Array.isArray(h)) setHistory(h.slice(0, 8)) } catch {} }, [])
  // Charge les QR instantanés enregistrés (serveur).
  useEffect(() => { fetch("/api/qr-instant").then(r => r.json()).then(d => { if (Array.isArray(d.items)) setSaved(d.items) }).catch(() => {}) }, [])
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

  // Enregistre le QR courant côté serveur (persistant + compté dans le quota limits.qr).
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

  const secTitle: React.CSSProperties = { color: MUTED, fontSize: 11, fontWeight: 700, display: "flex", alignItems: "center", gap: 7, marginBottom: 11, textTransform: "uppercase", letterSpacing: 1.4 }
  const accentBar = <span style={{ width: 3, height: 13, borderRadius: 2, background: G, flexShrink: 0 }} />
  const card: React.CSSProperties = { background: "rgba(255,255,255,0.025)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 18, padding: 18 }
  const field: React.CSSProperties = { width: "100%", boxSizing: "border-box", height: 50, background: "#0A0A0A", border: "1px solid rgba(255,255,255,0.14)", borderRadius: 12, color: "#F5F0E8", fontSize: 16, padding: "0 15px", outline: "none" }
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

  return (
    <div className="rpad" style={{ minHeight: "100dvh", maxWidth: 640, margin: "0 auto", padding: "18px 18px calc(30px + env(safe-area-inset-bottom))" }}>
      <Link href="/dashboard" style={{ display: "inline-flex", alignItems: "center", gap: 6, color: MUTED, textDecoration: "none", fontSize: 13, marginBottom: 16 }}>
        <ArrowLeft size={16} /> Retour
      </Link>

      <div style={{ display: "flex", alignItems: "center", gap: 13, marginBottom: 20 }}>
        <div style={{ width: 50, height: 50, borderRadius: 14, flexShrink: 0, background: "linear-gradient(145deg,rgba(201,168,76,0.22),rgba(201,168,76,0.06))", border: "1px solid rgba(201,168,76,0.3)", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <QrIcon size={24} color={G} />
        </div>
        <div>
          <h1 style={{ color: "#F5F0E8", fontSize: 23, fontWeight: 800, margin: 0, letterSpacing: -0.3 }}>Créer un QR code</h1>
          <p style={{ color: MUTED, fontSize: 13, margin: "2px 0 0", lineHeight: 1.4 }}>Lien, WiFi, contact, appel, email — prêt à imprimer en 3 secondes.</p>
        </div>
      </div>

      {/* Type de QR */}
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

      {/* Saisie selon le type */}
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

      {/* Aperçu — poster QR */}
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

      {/* Personnalisation */}
      <div style={{ ...card, marginBottom: 14 }}>
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

      {/* Téléchargement */}
      <div style={{ display: "flex", gap: 10 }}>
        <Button variant="primary" size="lg" onClick={() => download("png")} loading={busy === "png"} disabled={!ready || busy !== null}
          leftIcon={done ? <Check size={18} /> : <Download size={18} />} style={{ flex: 1 }}>
          {done ? "Téléchargé" : "Télécharger PNG"}
        </Button>
        <Button variant="secondary" size="lg" onClick={() => download("svg")} loading={busy === "svg"} disabled={!ready || busy !== null}>
          SVG
        </Button>
      </div>

      {/* Enregistrer (persistant, compte dans le quota QR du plan) */}
      <Button variant="secondary" fullWidth onClick={saveInstant} loading={saveBusy} disabled={!ready}
        leftIcon={<Save size={16} />} style={{ marginTop: 10 }}>
        Enregistrer ce QR
      </Button>
      {saveMsg && <p style={{ color: saveMsg.ok ? "var(--success)" : "#FBBF24", fontSize: 12.5, textAlign: "center", margin: "9px 0 0" }}>{saveMsg.text}</p>}

      {saved.length > 0 && (
        <div style={{ marginTop: 24 }}>
          <p style={secTitle}>{accentBar} Mes QR enregistrés</p>
          <div style={{ display: "flex", gap: 10, overflowX: "auto", paddingBottom: 6 }}>
            {saved.map(s => (
              <div key={s.id} style={{ position: "relative", flexShrink: 0, width: 98, display: "flex", flexDirection: "column", alignItems: "center", gap: 7, background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 13, padding: 9 }}>
                <div style={{ background: s.style?.bg || "#fff", borderRadius: 8, padding: 5, lineHeight: 0 }}>
                  <QRCanvas value={s.payload || "https://qrowg.com"} size={58} fg={s.style?.fg || "#080808"} bg={s.style?.bg || "#FFFFFF"} />
                </div>
                <span style={{ color: MUTED, fontSize: 9.5, maxWidth: 86, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{s.label || s.kind}</span>
                <button onClick={() => deleteInstant(s.id)} aria-label="Supprimer ce QR"
                  style={{ position: "absolute", top: 4, right: 4, background: "rgba(239,68,68,0.15)", border: "none", borderRadius: 7, width: 22, height: 22, color: "var(--danger)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}><Trash2 size={12} /></button>
              </div>
            ))}
          </div>
        </div>
      )}

      {history.length > 0 && (
        <div style={{ marginTop: 24 }}>
          <p style={secTitle}>{accentBar} Mes QR récents</p>
          <div style={{ display: "flex", gap: 10, overflowX: "auto", paddingBottom: 6 }}>
            {history.map((h, i) => (
              <button key={i} title={`Réutiliser : ${histLabel(h)}`} onClick={() => loadEntry(h)}
                style={{ flexShrink: 0, width: 98, display: "flex", flexDirection: "column", alignItems: "center", gap: 7, background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 13, padding: 9, cursor: "pointer" }}>
                <div style={{ background: h.bg, borderRadius: 8, padding: 5, lineHeight: 0 }}>
                  <QRCanvas value={payload(h) || "https://qrowg.com"} size={58} fg={h.fg} bg={h.bg} />
                </div>
                <span style={{ color: MUTED, fontSize: 9.5, maxWidth: 86, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{histLabel(h)}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      <p style={{ color: "#6E685E", fontSize: 11.5, margin: "18px 0 0", lineHeight: 1.55, textAlign: "center" }}>
        Ces QR encodent directement le contenu. Pour un lien <strong style={{ color: MUTED }}>modifiable après impression</strong>, créez plutôt un <Link href="/dashboard/qr-codes" style={{ color: G, fontWeight: 600 }}>QR code dynamique</Link>.
      </p>
    </div>
  )
}
