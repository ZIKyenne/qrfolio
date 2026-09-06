// trackEngagement.ts — profondeur de scroll + impressions de blocs + taps + dwell.
// Passe par l'endpoint serveur /api/track (service role) : plus d'insert anonyme
// direct (fermeture de l'empoisonnement analytics). RGPD : aucune IP ni donnée
// personnelle — seulement page_id, un type d'événement et une référence.
// Envoi GROUPÉ (une requête) : mise en file, dédup, flush au départ / après délai.

type Kind = "scroll" | "impression"
type Ev = { page_id: string; kind: Kind; ref: string }
type Tap = { page_id: string; kind: "tap"; ref: string; x: number; y: number }

let buffer: Ev[] = []
let tapBuffer: Tap[] = []   // taps : jamais dédupliqués (chaque clic compte)
const seen = new Set<string>()   // dédup : une impression par bloc / un jalon de scroll
let bound = false
let flushTimer: ReturnType<typeof setTimeout> | null = null

function post(pageId: string, rows: unknown[]) {
  if (!rows.length) return
  try {
    fetch("/api/track", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      keepalive: true,
      body: JSON.stringify({ type: "events", pageId, rows }),
    }).catch(() => {})
  } catch { /* silencieux : ne jamais perturber la page publique */ }
}

function flush() {
  if (buffer.length === 0 && tapBuffer.length === 0) return
  const rows = [...buffer.splice(0, buffer.length), ...tapBuffer.splice(0, tapBuffer.length)]
  if (rows.length) post((rows[0] as Ev | Tap).page_id, rows)
}

function bindFlushOnce() {
  if (bound || typeof window === "undefined") return
  bound = true
  document.addEventListener("visibilitychange", () => { if (document.visibilityState === "hidden") flush() })
  window.addEventListener("pagehide", () => { flush() })
}

// Temps d'attention par bloc : envoi direct (fire-and-forget) à la fermeture/masquage.
// entries = [{ ref: block_id, value: secondes }]. RGPD : aucune donnée personnelle.
export function trackDwell(pageId: string, entries: { ref: string; value: number }[]) {
  if (typeof window === "undefined" || !pageId || entries.length === 0) return
  const rows = entries.map(e => ({ page_id: pageId, kind: "dwell" as const, ref: e.ref, value: e.value }))
  post(pageId, rows)
}

// Enregistre un clic/tap avec sa position (fractions 0..1). Pas de dédup. Garde-fou anti-spam.
export function queueTap(pageId: string, ref: string, x: number, y: number) {
  if (typeof window === "undefined" || !pageId) return
  if (!(x >= 0 && x <= 1 && y >= 0 && y <= 1)) return
  if (tapBuffer.length >= 60) return    // garde-fou : 60 taps suffisent à une carte de chaleur, le serveur en accepte 80 lignes par lot
  tapBuffer.push({ page_id: pageId, kind: "tap", ref: ref || "-", x: Math.round(x * 1000) / 1000, y: Math.round(y * 1000) / 1000 })
  bindFlushOnce()
  if (flushTimer) clearTimeout(flushTimer)
  flushTimer = setTimeout(() => { flush() }, 4000)
}

// Met un événement en file (fire-and-forget). Dédup automatique.
export function queueEngagement(pageId: string, kind: Kind, ref: string) {
  if (typeof window === "undefined" || !pageId || !ref) return
  const key = `${kind}:${ref}`
  if (seen.has(key)) return
  seen.add(key)
  buffer.push({ page_id: pageId, kind, ref })
  bindFlushOnce()
  if (flushTimer) clearTimeout(flushTimer)
  flushTimer = setTimeout(() => { flush() }, 4000)
}
