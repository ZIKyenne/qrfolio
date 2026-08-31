import { construireVCard } from "@/lib/vcard"

// Helpers purs de la page "QR d'un lien" — isoles ici pour rester testables
// sans dependre du gros builder/types (garde le bundle de la page leger).

// Le contraste vit dans lib/contrasteQr : il était réécrit ici pour la cinquième
// fois, avec un traitement des couleurs invalides qui lui était propre.

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

export type VCardFields = {
  firstName?: string; lastName?: string; phone?: string
  email?: string; org?: string; title?: string; url?: string
}

// La fiche contact vit dans lib/vcard : elle était écrite deux fois, et CETTE
// version-ci joignait ses lignes en LF simple là où la norme impose CRLF — or
// c'est elle qui fabrique les QR de contact réellement imprimés.
export function buildVCard(v: VCardFields): string {
  return construireVCard({
    prenom: v.firstName, nom: v.lastName, telephone: v.phone,
    email: v.email, organisation: v.org, fonction: v.title,
    siteWeb: v.url ? normalizeUrl(v.url) : undefined,
  })
}
