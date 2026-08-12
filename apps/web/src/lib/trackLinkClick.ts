// trackLinkClick.ts — tracker un clic sur un lien, fire-and-forget.
// Passe par l'endpoint serveur /api/track (service role) : plus d'insert anonyme
// direct. RGPD : on stocke uniquement l'URL cible et le label, pas d'IP.

import { qrSource } from "./qrSource"

export function trackLinkClick(
  pageId: string,
  blockId: string,
  clickTarget: string  // URL ou label — max 500 chars
) {
  if (typeof window === "undefined" || !pageId) return
  // Fire-and-forget : ne bloque jamais la navigation
  try {
    fetch("/api/track", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      keepalive: true,
      body: JSON.stringify({ type: "click", pageId, blockId, clickTarget: clickTarget.slice(0, 500), qrSource: qrSource() }),
    }).catch(() => {})
  } catch {
    // silencieux
  }
}
