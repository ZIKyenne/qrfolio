"use client"

// Générateur de QR code GRATUIT (public, sans compte) — îlot interactif embarqué dans la
// page SEO serveur. Réutilise le moteur QR local (qrRender / QRCanvas) et les helpers purs
// (qrLinkUtils). Sortie STATIQUE (PNG/SVG) ; CTA vers l'inscription pour le QR dynamique.
import { useMemo, useRef, useState } from "react"
import Link from "next/link"
import { Download, Check, Link2, Type, Wifi, Phone, Mail, AlertTriangle, ShieldCheck, Zap, Upload, X } from "lucide-react"
import QRCanvas from "../dashboard/qr-codes/QRCanvas"
import { getQRBlob, type QROptions, type QRStyleConfig } from "../dashboard/qr-codes/qrRender"
import { contrast, isInverted, normalizeUrl, buildWifi, buildTel, buildEmail } from "../dashboard/qr-link/qrLinkUtils"

const G = "#C9A84C", INK = "#F5F0E8", MUT = "rgba(168,161,144,0.92)", BOR = "rgba(255,255,255,0.1)"

type QrType = "link" | "text" | "wifi" | "email" | "phone"
type WifiEnc = "WPA" | "WEP" | "nopass"

const TYPES: { k: QrType; label: string; icon: any }[] = [
  { k: "link", label: "Lien", icon: Link2 },
  { k: "text", label: "Texte", icon: Type },
  { k: "wifi", label: "WiFi", icon: Wifi },
  { k: "email", label: "Email", icon: Mail },
  { k: "phone", label: "Appel", icon: Phone },
]
const STYLE_PRESETS: { k: string; label: string; dotStyle: QRStyleConfig["dotStyle"]; cornerStyle: QRStyleConfig["cornerStyle"] }[] = [
  { k: "carre", label: "Carré", dotStyle: "square", cornerStyle: "square" },
  { k: "arrondi", label: "Arrondi", dotStyle: "rounded", cornerStyle: "rounded" },
  { k: "points", label: "Points", dotStyle: "dot", cornerStyle: "circle" },
  { k: "doux", label: "Doux", dotStyle: "softSquare", cornerStyle: "rounded" },
]
const FG_SWATCHES = ["#080808", "#C9A84C", "#1D4ED8", "#059669", "#DB2777", "#DC2626", "#7C3AED"]
const BG_SWATCHES = ["#FFFFFF", "#F5F0E8", "#FEF3C7", "#E0F2FE", "#F0FDF4", "#111111"]
const ECC_OPTS: { k: "L" | "M" | "Q" | "H"; label: string }[] = [
  { k: "L", label: "Faible" }, { k: "M", label: "Moyen" }, { k: "Q", label: "Élevé" }, { k: "H", label: "Max" },
]

const field: React.CSSProperties = { width: "100%", boxSizing: "border-box", height: 50, background: "#0A0A0A", border: `1px solid ${BOR}`, borderRadius: 12, color: INK, fontSize: 16, padding: "0 15px", outline: "none" }
const card: React.CSSProperties = { background: "rgba(255,255,255,0.025)", border: `1px solid ${BOR}`, borderRadius: 18, padding: 18 }

export default function GeneratorClient() {
  const [qrType, setQrType] = useState<QrType>("link")
  const [url, setUrl] = useState("")
  const [text, setText] = useState("")
  const [ssid, setSsid] = useState(""); const [wifiPass, setWifiPass] = useState(""); const [wifiEnc, setWifiEnc] = useState<WifiEnc>("WPA")
  const [email, setEmail] = useState(""); const [subject, setSubject] = useState("")
  const [phone, setPhone] = useState("")
  const [fg, setFg] = useState("#080808"); const [bg, setBg] = useState("#FFFFFF")
  const [ecc, setEcc] = useState<"L" | "M" | "Q" | "H">("M")
  const [styleKey, setStyleKey] = useState("carre")
  const [logo, setLogo] = useState<string | null>(null)
  const [busy, setBusy] = useState<null | "png" | "svg">(null)
  const [done, setDone] = useState(false)
  const logoInput = useRef<HTMLInputElement>(null)

  const data = useMemo(() => {
    if (qrType === "text") return text.trim()
    if (qrType === "wifi") return buildWifi(ssid, wifiPass, wifiEnc)
    if (qrType === "email") return buildEmail(email, subject)
    if (qrType === "phone") return buildTel(phone)
    return normalizeUrl(url)
  }, [qrType, url, text, ssid, wifiPass, wifiEnc, email, subject, phone])

  const ready = data.length > 0
  const ratio = contrast(fg, bg)
  const inverted = isInverted(fg, bg)
  const preset = STYLE_PRESETS.find(p => p.k === styleKey) || STYLE_PRESETS[0]
  const effectiveEcc = logo ? "H" : ecc
  const qrStyle: QRStyleConfig = {
    dotStyle: preset.dotStyle, cornerStyle: preset.cornerStyle,
    ...(logo ? { logoUrl: logo, logoSize: 22, logoShape: "rounded" as const, logoBg: "white" as const, logoPadding: 5 } : {}),
  }

  function onLogoFile(file: File) {
    if (!file.type.startsWith("image/")) return
    const r = new FileReader(); r.onload = () => setLogo(String(r.result)); r.readAsDataURL(file)
  }
  async function download(ext: "png" | "svg") {
    if (!ready) return
    setBusy(ext)
    try {
      const opts: QROptions = { data, fg, bg, ecc: effectiveEcc, style: qrStyle, size: 1024 }
      const blob = await getQRBlob(opts, ext)
      if (blob) { const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = `qrcode.${ext}`; a.click(); URL.revokeObjectURL(a.href); setDone(true); setTimeout(() => setDone(false), 1800) }
    } finally { setBusy(null) }
  }

  const swatch = (c: string, on: boolean, onClick: () => void, aria: string) => (
    <button key={c} onClick={onClick} aria-label={aria} type="button"
      style={{ width: 36, height: 36, borderRadius: 10, background: c, border: on ? `2.5px solid ${G}` : "2px solid rgba(255,255,255,0.14)", boxShadow: on ? `0 0 0 3px ${G}22` : "none", cursor: "pointer", flexShrink: 0 }} />
  )

  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: 16 }} className="gen-grid">
      <style>{`@media(min-width:900px){.gen-grid{grid-template-columns:1fr 360px !important;align-items:start}.gen-aside{position:sticky;top:16px}}`}</style>

      {/* Colonne gauche : saisie + style */}
      <div style={{ display: "flex", flexDirection: "column", gap: 14, minWidth: 0 }}>
        {/* Types */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(5,1fr)", gap: 8 }}>
          {TYPES.map(t => { const on = qrType === t.k; const Icon = t.icon; return (
            <button key={t.k} type="button" onClick={() => setQrType(t.k)}
              style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 5, minHeight: 56, borderRadius: 12, cursor: "pointer", background: on ? "rgba(201,168,76,0.14)" : "rgba(255,255,255,0.03)", border: `1px solid ${on ? G + "66" : BOR}`, color: on ? G : MUT, fontSize: 11.5, fontWeight: on ? 800 : 600 }}>
              <Icon size={17} /> {t.label}
            </button>
          ) })}
        </div>

        {/* Saisie */}
        <div style={card}>
          {qrType === "link" && (
            <input value={url} onChange={e => setUrl(e.target.value)} inputMode="url" placeholder="ex : monsite.fr  ou  instagram.com/moi" aria-label="Lien à encoder" style={{ ...field, borderColor: ready ? G + "80" : BOR }} />
          )}
          {qrType === "text" && (
            <textarea value={text} onChange={e => setText(e.target.value)} rows={3} placeholder="N'importe quel texte à encoder…" aria-label="Texte à encoder"
              style={{ width: "100%", boxSizing: "border-box", resize: "vertical", minHeight: 78, background: "#0A0A0A", border: `1px solid ${BOR}`, borderRadius: 12, color: INK, fontSize: 15, padding: "12px 14px", outline: "none", fontFamily: "inherit" }} />
          )}
          {qrType === "wifi" && (<>
            <input value={ssid} onChange={e => setSsid(e.target.value)} placeholder="Nom du réseau (SSID)" aria-label="Nom du réseau WiFi" style={{ ...field, marginBottom: 10, borderColor: ssid.trim() ? G + "80" : BOR }} />
            {wifiEnc !== "nopass" && <input value={wifiPass} onChange={e => setWifiPass(e.target.value)} placeholder="Mot de passe" aria-label="Mot de passe WiFi" style={{ ...field, marginBottom: 10 }} />}
            <div style={{ display: "flex", gap: 4, background: "rgba(255,255,255,0.04)", borderRadius: 11, padding: 3 }}>
              {([["WPA", "WPA/WPA2"], ["WEP", "WEP"], ["nopass", "Ouvert"]] as [WifiEnc, string][]).map(([k, l]) => (
                <button key={k} type="button" onClick={() => setWifiEnc(k)} style={{ flex: 1, minHeight: 40, borderRadius: 8, border: "none", cursor: "pointer", background: wifiEnc === k ? G : "transparent", color: wifiEnc === k ? "#080808" : MUT, fontSize: 12, fontWeight: wifiEnc === k ? 800 : 600 }}>{l}</button>
              ))}
            </div>
          </>)}
          {qrType === "email" && (<>
            <input value={email} onChange={e => setEmail(e.target.value)} inputMode="email" type="email" placeholder="contact@exemple.fr" aria-label="Adresse email" style={{ ...field, marginBottom: 10, borderColor: email.trim() ? G + "80" : BOR }} />
            <input value={subject} onChange={e => setSubject(e.target.value)} placeholder="Objet (optionnel)" aria-label="Objet de l'email" style={field} />
          </>)}
          {qrType === "phone" && (
            <input value={phone} onChange={e => setPhone(e.target.value)} inputMode="tel" type="tel" placeholder="ex : +33 6 12 34 56 78" aria-label="Numéro de téléphone" style={{ ...field, borderColor: phone.trim() ? G + "80" : BOR }} />
          )}
        </div>

        {/* Style */}
        <div style={card}>
          <p style={{ color: MUT, fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1.2, margin: "0 0 10px" }}>Style</p>
          <div style={{ display: "flex", gap: 7, marginBottom: 16 }}>
            {STYLE_PRESETS.map(p => { const on = styleKey === p.k; return (
              <button key={p.k} type="button" onClick={() => setStyleKey(p.k)} style={{ flex: 1, minHeight: 40, borderRadius: 10, cursor: "pointer", background: on ? "rgba(201,168,76,0.14)" : "rgba(255,255,255,0.03)", border: `1px solid ${on ? G + "66" : BOR}`, color: on ? G : MUT, fontSize: 11.5, fontWeight: on ? 800 : 600 }}>{p.label}</button>
            ) })}
          </div>
          <p style={{ color: MUT, fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1.2, margin: "0 0 10px" }}>Couleur du QR</p>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 16 }}>
            {FG_SWATCHES.map(c => swatch(c, fg === c, () => setFg(c), `Couleur ${c}`))}
            <label style={{ width: 36, height: 36, borderRadius: 10, border: "2px solid rgba(255,255,255,0.14)", cursor: "pointer", overflow: "hidden", position: "relative", flexShrink: 0, background: "conic-gradient(from 0deg,#f00,#ff0,#0f0,#0ff,#00f,#f0f,#f00)" }}>
              <input type="color" value={fg} onChange={e => setFg(e.target.value)} aria-label="Couleur personnalisée du QR" style={{ position: "absolute", inset: -4, opacity: 0, cursor: "pointer" }} />
            </label>
          </div>
          <p style={{ color: MUT, fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1.2, margin: "0 0 10px" }}>Fond</p>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 16 }}>
            {BG_SWATCHES.map(c => swatch(c, bg === c, () => setBg(c), `Fond ${c}`))}
            <label style={{ width: 36, height: 36, borderRadius: 10, border: "2px solid rgba(255,255,255,0.14)", cursor: "pointer", overflow: "hidden", position: "relative", flexShrink: 0, background: "conic-gradient(from 0deg,#f00,#ff0,#0f0,#0ff,#00f,#f0f,#f00)" }}>
              <input type="color" value={bg} onChange={e => setBg(e.target.value)} aria-label="Couleur personnalisée du fond" style={{ position: "absolute", inset: -4, opacity: 0, cursor: "pointer" }} />
            </label>
          </div>
          <p style={{ color: MUT, fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1.2, margin: "0 0 10px" }}>Correction d'erreur</p>
          <div style={{ display: "flex", gap: 4, background: "rgba(255,255,255,0.04)", borderRadius: 11, padding: 3, marginBottom: 16 }}>
            {ECC_OPTS.map(o => (
              <button key={o.k} type="button" onClick={() => setEcc(o.k)} style={{ flex: 1, minHeight: 40, borderRadius: 8, border: "none", cursor: "pointer", background: ecc === o.k ? G : "transparent", color: ecc === o.k ? "#080808" : MUT, fontSize: 12, fontWeight: ecc === o.k ? 800 : 600 }}>{o.label}</button>
            ))}
          </div>
          <p style={{ color: MUT, fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1.2, margin: "0 0 10px" }}>Logo au centre <span style={{ textTransform: "none", letterSpacing: 0, color: "#6E685E", fontWeight: 500 }}>· optionnel</span></p>
          {logo ? (
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <div style={{ width: 44, height: 44, borderRadius: 10, background: "#fff", overflow: "hidden", flexShrink: 0, border: `1px solid ${BOR}` }}><img src={logo} alt="" style={{ width: "100%", height: "100%", objectFit: "contain" }} /></div>
              <span style={{ flex: 1, color: MUT, fontSize: 11.5, lineHeight: 1.4 }}>Logo ajouté — correction portée au maximum.</span>
              <button type="button" onClick={() => setLogo(null)} aria-label="Retirer le logo" style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.2)", borderRadius: 9, width: 38, height: 38, color: "#FF6B6B", cursor: "pointer" }}><X size={16} /></button>
            </div>
          ) : (
            <button type="button" onClick={() => logoInput.current?.click()} style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "center", gap: 8, minHeight: 44, borderRadius: 11, border: "1.5px dashed rgba(201,168,76,0.3)", background: "rgba(201,168,76,0.04)", color: G, fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
              <Upload size={16} /> Ajouter un logo
            </button>
          )}
          <input ref={logoInput} type="file" accept="image/*" style={{ display: "none" }} onChange={e => { const f = e.target.files?.[0]; if (f) onLogoFile(f); e.target.value = "" }} />
        </div>
      </div>

      {/* Colonne droite : aperçu + téléchargement + CTA (collante desktop) */}
      <div className="gen-aside" style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        <div style={{ position: "relative", borderRadius: 20, padding: "26px 18px", overflow: "hidden", background: "radial-gradient(120% 90% at 50% 0%, rgba(201,168,76,0.12), transparent 60%), rgba(255,255,255,0.02)", border: "1px solid rgba(201,168,76,0.16)", display: "flex", flexDirection: "column", alignItems: "center", gap: 16 }}>
          <div style={{ background: bg, borderRadius: 20, padding: 18, boxShadow: "0 14px 40px rgba(0,0,0,0.5)", transition: "background .2s", maxWidth: "100%" }}>
            <QRCanvas value={data || "https://qrowg.com"} size={196} fg={fg} bg={bg} style={qrStyle} ecc={effectiveEcc} />
          </div>
          {!ready
            ? <p style={{ color: MUT, fontSize: 12.5, margin: 0, textAlign: "center" }}>Renseignez le contenu pour générer votre QR code.</p>
            : ratio < 3
              ? <button type="button" onClick={() => { setFg("#080808"); setBg("#FFFFFF") }} style={{ display: "flex", alignItems: "center", gap: 7, color: "#FF6B6B", fontSize: 12, fontWeight: 600, background: "rgba(255,107,107,0.1)", border: "1px solid rgba(255,107,107,0.3)", borderRadius: 999, padding: "6px 14px", cursor: "pointer" }}><AlertTriangle size={14} /> Risque de non-scan — corriger</button>
              : inverted
                ? <button type="button" onClick={() => { const f = fg; setFg(bg); setBg(f) }} style={{ display: "flex", alignItems: "center", gap: 7, color: "#FBBF24", fontSize: 12, fontWeight: 600, background: "rgba(251,191,36,0.1)", border: "1px solid rgba(251,191,36,0.3)", borderRadius: 999, padding: "6px 14px", cursor: "pointer" }}><AlertTriangle size={14} /> Inverser les couleurs</button>
                : <div style={{ display: "flex", alignItems: "center", gap: 7, color: "var(--success,#39FF8F)", fontSize: 12, fontWeight: 600, background: "rgba(57,255,143,0.09)", border: "1px solid rgba(57,255,143,0.28)", borderRadius: 999, padding: "6px 14px" }}><ShieldCheck size={14} /> Scannable</div>}
        </div>

        <div style={{ display: "flex", gap: 10 }}>
          <button type="button" onClick={() => download("png")} disabled={!ready || busy !== null} style={{ flex: 1, display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 8, minHeight: 50, borderRadius: 12, border: "none", background: ready ? G : "rgba(201,168,76,0.3)", color: "#080808", fontSize: 15, fontWeight: 800, cursor: ready ? "pointer" : "default" }}>
            {done ? <Check size={18} /> : <Download size={18} />} {busy === "png" ? "…" : done ? "Téléchargé" : "Télécharger PNG"}
          </button>
          <button type="button" onClick={() => download("svg")} disabled={!ready || busy !== null} style={{ minHeight: 50, padding: "0 18px", borderRadius: 12, border: `1px solid ${BOR}`, background: "rgba(255,255,255,0.04)", color: INK, fontSize: 14, fontWeight: 700, cursor: ready ? "pointer" : "default" }}>SVG</button>
        </div>
        <p style={{ color: "#6E685E", fontSize: 11.5, textAlign: "center", margin: 0 }}>Gratuit, sans compte. Haute résolution, prêt à imprimer.</p>

        {/* CTA dynamique */}
        <Link href="/auth/signup" style={{ textDecoration: "none", display: "block", ...card, borderColor: "rgba(201,168,76,0.3)", background: "rgba(201,168,76,0.06)" }}>
          <p style={{ color: INK, fontSize: 13.5, fontWeight: 800, margin: "0 0 4px", display: "flex", alignItems: "center", gap: 7 }}><Zap size={16} color={G} /> Rendez-le dynamique</p>
          <p style={{ color: MUT, fontSize: 12, margin: 0, lineHeight: 1.5 }}>Ce QR est <strong style={{ color: MUT }}>statique</strong> (le contenu est figé). Créez un compte pour un <strong style={{ color: G }}>QR dynamique</strong> : modifiez la destination après impression et suivez les scans. →</p>
        </Link>
      </div>
    </div>
  )
}
