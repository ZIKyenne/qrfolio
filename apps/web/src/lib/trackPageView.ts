// trackPageView.ts — tracker une vue avec source de trafic détectée
// Appelé côté client sur les pages publiques
import { detectTrafficSource } from "./detectTrafficSource"
import { qrSource } from "./qrSource"

// Déduplication par pageId (et non par contexte JS) : une vue comptée une seule fois par
// page, tout en supportant la navigation client-side entre plusieurs pages publiques et
// en absorbant le double-appel de React StrictMode.
const trackedPages = new Set<string>()

export async function trackPageView(pageId: string) {
  if (typeof window === "undefined" || !pageId || trackedPages.has(pageId)) return
  trackedPages.add(pageId)

  try {
    const { source, referrer } = detectTrafficSource()

    // Session pseudo-anonyme (localStorage, jamais de cookie tiers)
    let sessionId = sessionStorage.getItem("qrf_sid")
    if (!sessionId) {
      sessionId = Math.random().toString(36).slice(2) + Date.now().toString(36)
      sessionStorage.setItem("qrf_sid", sessionId)
    }

    // Device
    const ua = navigator.userAgent
    const device = /Mobi|Android/i.test(ua) ? "mobile" : /Tablet|iPad/i.test(ua) ? "tablet" : "desktop"

    // Passe par l'endpoint serveur (service role) : plus d'insert anonyme direct.
    await fetch("/api/track", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      keepalive: true,
      body: JSON.stringify({ type: "view", pageId, source, referrer, device, session_id: sessionId, qrSource: qrSource() }),
    })
  } catch {
    // Silencieux — le tracking ne doit jamais casser la page
  }
}
