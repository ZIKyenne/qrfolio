// Helpers purs de la page "QR d'un lien" — isoles ici pour rester testables
// sans dependre du gros builder/types (garde le bundle de la page leger).

// Luminance relative (sRGB) d'une couleur hex 6 chiffres.
export function lum(hex: string): number {
  const m = hex.replace("#", "").match(/.{2}/g)
  if (!m || m.length < 3) return 1
  const [r, g, b] = m.map(h => {
    const v = parseInt(h, 16) / 255
    return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4)
  })
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}

// Ratio de contraste WCAG entre deux couleurs (1 = identique, 21 = noir/blanc).
export function contrast(a: string, b: string): number {
  const l1 = lum(a), l2 = lum(b)
  return (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05)
}

// Un QR se lit de maniere fiable quand les modules sont plus SOMBRES que le fond.
// Inverse (clair sur fond sombre), certains scanners et impressions echouent —
// meme si le ratio de contraste (symetrique) reste eleve.
export function isInverted(fg: string, bg: string): boolean {
  return lum(fg) > lum(bg)
}

// Ajoute https:// si aucun schema reconnu (site tape sans protocole).
export function normalizeUrl(v: string): string {
  const s = v.trim()
  if (!s) return ""
  if (/^(https?:\/\/|mailto:|tel:|sms:|geo:|wifi:)/i.test(s)) return s
  return "https://" + s
}

// Echappe les caracteres speciaux du format WIFI (\ ; , : ").
export function escapeWifi(s: string): string {
  return s.replace(/([\\;,":])/g, "\\$1")
}

// Construit la charge utile d'un QR WiFi standard (scan -> propose de rejoindre le reseau).
export function buildWifi(ssid: string, password: string, enc: "WPA" | "WEP" | "nopass"): string {
  const s = ssid.trim()
  if (!s) return ""
  const p = enc === "nopass" ? "" : password
  return `WIFI:T:${enc};S:${escapeWifi(s)};P:${escapeWifi(p)};;`
}

// Construit un QR d'appel telephonique (scan -> propose d'appeler).
// Ne garde que les chiffres et le prefixe international +.
export function buildTel(phone: string): string {
  const p = phone.replace(/[^\d+]/g, "")
  return p ? `tel:${p}` : ""
}

// Construit un QR SMS (scan -> ouvre l'app SMS avec destinataire + message pre-remplis).
// Format SMSTO: (standard de fait des lecteurs QR, large compatibilite iOS/Android).
// Ne garde que les chiffres et le prefixe international + pour le numero.
export function buildSms(phone: string, message?: string): string {
  const p = phone.replace(/[^\d+]/g, "")
  if (!p) return ""
  const m = (message ?? "").trim()
  return m ? `SMSTO:${p}:${m}` : `SMSTO:${p}`
}

// Construit un QR email mailto: (scan -> ouvre un brouillon pre-rempli, RFC 6068).
export function buildEmail(to: string, subject?: string, body?: string): string {
  const t = to.trim()
  if (!t) return ""
  const params: string[] = []
  if (subject?.trim()) params.push(`subject=${encodeURIComponent(subject.trim())}`)
  if (body?.trim()) params.push(`body=${encodeURIComponent(body.trim())}`)
  return `mailto:${t}${params.length ? "?" + params.join("&") : ""}`
}

// Echappe les caracteres speciaux du format vCard (\ , ; et retours ligne).
export function escapeVCard(s: string): string {
  return s.replace(/\\/g, "\\\\").replace(/\n/g, "\\n").replace(/,/g, "\\,").replace(/;/g, "\\;")
}

export type VCardFields = {
  firstName?: string; lastName?: string; phone?: string
  email?: string; org?: string; title?: string; url?: string
}

// Construit une carte de visite vCard 3.0 (scan -> propose d'ajouter le contact).
// Au moins un nom est requis (FN obligatoire), sinon chaine vide.
export function buildVCard(v: VCardFields): string {
  const first = (v.firstName ?? "").trim()
  const last = (v.lastName ?? "").trim()
  const fn = [first, last].filter(Boolean).join(" ")
  if (!fn) return ""
  const lines = ["BEGIN:VCARD", "VERSION:3.0"]
  lines.push(`N:${escapeVCard(last)};${escapeVCard(first)};;;`)
  lines.push(`FN:${escapeVCard(fn)}`)
  if (v.org?.trim()) lines.push(`ORG:${escapeVCard(v.org.trim())}`)
  if (v.title?.trim()) lines.push(`TITLE:${escapeVCard(v.title.trim())}`)
  if (v.phone?.trim()) lines.push(`TEL;TYPE=CELL:${escapeVCard(v.phone.trim())}`)
  if (v.email?.trim()) lines.push(`EMAIL;TYPE=INTERNET:${escapeVCard(v.email.trim())}`)
  if (v.url?.trim()) lines.push(`URL:${escapeVCard(normalizeUrl(v.url.trim()))}`)
  lines.push("END:VCARD")
  return lines.join("\n")
}
