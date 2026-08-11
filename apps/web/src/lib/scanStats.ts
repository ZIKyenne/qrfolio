// Statistiques de scan des QR dynamiques — moteur PUR (aucune I/O), testable.
// Alimente la pop-up « Statistiques » (palier Pro+). Données 100% réelles issues de
// la table instant_scan_events (un événement par scan) — aucun chiffre inventé.

export type DeviceKind = "mobile" | "tablet" | "desktop" | "bot" | "unknown"

// Déduit le type d'appareil depuis le User-Agent. Ordre important : bot avant tout,
// puis tablette (Android SANS "mobile", iPad) avant mobile.
export function parseDevice(ua?: string | null): DeviceKind {
  const s = (ua || "").toLowerCase()
  if (!s) return "unknown"
  if (/bot|crawler|spider|crawling|facebookexternalhit|preview|slurp/.test(s)) return "bot"
  if (/ipad|tablet|playbook|silk|(android(?!.*mobile))/.test(s)) return "tablet"
  if (/mobile|iphone|ipod|android|blackberry|iemobile|opera mini/.test(s)) return "mobile"
  return "desktop"
}

export type ScanEvent = { scanned_at: string; device?: string | null; country?: string | null }

export type ScanStats = {
  total: number
  byDay: { date: string; count: number }[]      // `days` derniers jours, ordre chronologique (YYYY-MM-DD, UTC)
  byDevice: { device: DeviceKind; count: number }[] // trié décroissant, buckets non vides
  byCountry: { country: string; count: number }[]   // trié décroissant (code ISO), "??" si inconnu
  peakDay: { date: string; count: number } | null   // jour le plus actif de la fenêtre
}

const DEVICE_ORDER: DeviceKind[] = ["mobile", "desktop", "tablet", "bot", "unknown"]
const toUtcDay = (iso: string): string => new Date(iso).toISOString().slice(0, 10)

// Agrège une liste d'événements sur les `days` derniers jours (fenêtre finissant à `now`).
export function aggregateScanEvents(events: ScanEvent[], days: number, now: number): ScanStats {
  // Squelette des jours (du plus ancien au plus récent), tous à 0.
  const dayCounts = new Map<string, number>()
  const order: string[] = []
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(now - i * 86400000).toISOString().slice(0, 10)
    dayCounts.set(d, 0); order.push(d)
  }

  const devCounts = new Map<DeviceKind, number>()
  const ctryCounts = new Map<string, number>()

  for (const e of events) {
    if (!e?.scanned_at) continue
    const day = toUtcDay(e.scanned_at)
    if (dayCounts.has(day)) dayCounts.set(day, (dayCounts.get(day) || 0) + 1)

    const dev = (DEVICE_ORDER.includes(e.device as DeviceKind) ? e.device : "unknown") as DeviceKind
    devCounts.set(dev, (devCounts.get(dev) || 0) + 1)

    const ctry = (e.country || "").trim().toUpperCase() || "??"
    ctryCounts.set(ctry, (ctryCounts.get(ctry) || 0) + 1)
  }

  const byDay = order.map(date => ({ date, count: dayCounts.get(date) || 0 }))
  const peakDay = byDay.reduce<{ date: string; count: number } | null>(
    (best, d) => (d.count > 0 && (!best || d.count > best.count) ? d : best), null,
  )

  const byDevice = [...devCounts.entries()]
    .map(([device, count]) => ({ device, count }))
    .sort((a, b) => b.count - a.count || DEVICE_ORDER.indexOf(a.device) - DEVICE_ORDER.indexOf(b.device))

  const byCountry = [...ctryCounts.entries()]
    .map(([country, count]) => ({ country, count }))
    .sort((a, b) => b.count - a.count || a.country.localeCompare(b.country))

  return { total: events.length, byDay, byDevice, byCountry, peakDay }
}

// Emoji drapeau depuis un code pays ISO-2 (ex. "FR" -> 🇫🇷). "??" ou invalide -> 🌍.
export function countryFlag(code: string): string {
  const c = (code || "").trim().toUpperCase()
  if (!/^[A-Z]{2}$/.test(c)) return "🌍"
  return String.fromCodePoint(...[...c].map(ch => 0x1f1e6 + ch.charCodeAt(0) - 65))
}

export const DEVICE_LABEL: Record<DeviceKind, string> = {
  mobile: "Mobile", desktop: "Ordinateur", tablet: "Tablette", bot: "Robot", unknown: "Inconnu",
}
