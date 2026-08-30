import { libelleSource } from "@/lib/sourcesTrafic"
// analyticsAgg.ts — Agregations pures et testables pour le tableau de bord analytics.
// Aucune dependance React : ces fonctions sont couvertes par des tests unitaires.
// `now` est injectable partout ou une fenetre glissante est calculee (testabilite).

export type AggScan = { scanned_at: string; device?: string | null; page_id?: string }
export type AggView = { viewed_at: string; source?: string | null; page_id?: string }
export type DailyPoint = { date: string; scans: number; views: number }
export type NameValue = { name: string; value: number }

// Libelle court jour/mois a partir d'une date ISO (ex "2026-07-05" -> "5/7").
export function formatDay(dateStr: string): string {
  const d = new Date(dateStr)
  return `${d.getDate()}/${d.getMonth() + 1}`
}

// Serie sur les 30 derniers jours (buckets UTC), scans + vues par jour.
// Les jours sans evenement restent a 0 (pas de trous dans le graphe).
export function buildDailyData(scans: AggScan[], views: AggView[], now: number = Date.now()): DailyPoint[] {
  const map: Record<string, DailyPoint> = {}
  const base = new Date(now)
  for (let i = 29; i >= 0; i--) {
    const d = new Date(base)
    d.setDate(d.getDate() - i)
    const key = d.toISOString().slice(0, 10)
    map[key] = { date: formatDay(key), scans: 0, views: 0 }
  }
  for (const s of scans) {
    const key = (s.scanned_at || "").slice(0, 10)
    if (map[key]) map[key].scans++
  }
  for (const v of views) {
    const key = (v.viewed_at || "").slice(0, 10)
    if (map[key]) map[key].views++
  }
  return Object.values(map)
}

// Repartition par type d'appareil (mobile/tablet/desktop/…). Valeurs manquantes -> "unknown".
export function buildDeviceData(scans: AggScan[]): NameValue[] {
  const counts: Record<string, number> = {}
  for (const s of scans) {
    const key = s.device || "unknown"
    counts[key] = (counts[key] || 0) + 1
  }
  return Object.entries(counts).map(([name, value]) => ({ name, value }))
}

// Repartition par source de trafic. Source absente/vide -> "direct".
export function buildSourceData(views: AggView[]): NameValue[] {
  const counts: Record<string, number> = {}
  for (const v of views) {
    const src = v.source || "direct"
    counts[src] = (counts[src] || 0) + 1
  }
  // Nom lisible dès l'agrégation : le graphique affiche `name` tel quel, et le
  // client lisait donc « qr_scan » et « direct ». Les libellés français vivaient
  // dans un composant que plus rien ne montait.
  return Object.entries(counts)
    .map(([name, value]) => ({ name: libelleSource(name), value }))
    .sort((a, b) => b.value - a.value)
}

// ── Engagement (page_events : scroll + impressions + temps par bloc + clics) ───
export type PageEvent = { kind: "scroll" | "impression" | "dwell" | "tap"; ref: string; value?: number | null; x?: number | null; y?: number | null; page_id?: string; created_at?: string }

// Vrai si l'evenement est posterieur ou egal a la borne `since` (timestamp ms).
// Sans borne (undefined) ou sans date, l'evenement est conserve (retro-compat).
function withinSince(e: PageEvent, since?: number): boolean {
  if (since === undefined) return true
  if (!e.created_at) return true
  return new Date(e.created_at).getTime() >= since
}
export type ScrollStep = { depth: string; count: number; pct: number }

// Entonnoir de profondeur de scroll : jalons 25/50/75/100 %. Chaque visiteur qui atteint
// un jalon a aussi franchi les precedents (un evenement par jalon et par session), donc
// count(25) >= count(50) >= ... Le pct est relatif au 1er jalon (base = a scrolle un minimum).
export function buildScrollFunnel(events: PageEvent[]): ScrollStep[] {
  const counts: Record<string, number> = { "25": 0, "50": 0, "75": 0, "100": 0 }
  for (const e of events) {
    if (e.kind === "scroll" && counts[e.ref] !== undefined) counts[e.ref]++
  }
  // Série rendue MONOTONE DÉCROISSANTE : un palier ne peut pas être atteint plus souvent que le
  // précédent (sinon 50 % > 25 % ⇒ « 106 % »). On plafonne chaque palier au précédent.
  let prevCount = Infinity
  for (const m of ["25", "50", "75", "100"]) { counts[m] = Math.min(counts[m], prevCount); prevCount = counts[m] }
  const base = counts["25"] || 0
  // pct relatif à la MÊME base (1er palier) pour tous ⇒ libellé et barre cohérents, jamais > 100 %.
  return ["25", "50", "75", "100"].map(m => ({
    depth: `${m}%`,
    count: counts[m],
    pct: base > 0 ? Math.round((counts[m] / base) * 100) : 0,
  }))
}

// Nombre d'impressions (bloc reellement vu) par block_id.
// `since` (timestamp ms) borne la fenetre : indispensable pour que le CTR reel
// (clics / impressions) compare des numerateur et denominateur sur la MEME periode.
export function buildBlockImpressions(events: PageEvent[], since?: number): Record<string, number> {
  const counts: Record<string, number> = {}
  for (const e of events) {
    if (e.kind === "impression" && e.ref && withinSince(e, since)) counts[e.ref] = (counts[e.ref] || 0) + 1
  }
  return counts
}

// CTR reel d'un bloc = clics / impressions (borne a 100 %). Renvoie null si aucune impression.
export function blockCtr(clicks: number, impressions: number): number | null {
  if (!impressions) return null
  return Math.min(100, Math.round((clicks / impressions) * 100))
}

// ── Tunnel de conversion ──────────────────────────────────────────────────────
export type FunnelStep = { label: string; count: number; pctOfTop: number; dropFromPrev: number }

// Transforme une suite d'etapes { label, count } en entonnoir : % relatif a la 1re etape
// et taux d'abandon par rapport a l'etape precedente (borne a 0, jamais negatif).
export function buildFunnel(stages: { label: string; count: number }[]): FunnelStep[] {
  const top = stages[0]?.count || 0
  return stages.map((s, i) => {
    const prev = i > 0 ? (stages[i - 1].count || 0) : s.count
    return {
      label: s.label,
      count: s.count,
      pctOfTop: top > 0 ? Math.min(100, Math.round((s.count / top) * 100)) : 0,
      dropFromPrev: i === 0 || prev <= 0 ? 0 : Math.max(0, Math.round((1 - s.count / prev) * 100)),
    }
  })
}

// Temps d'attention moyen (secondes) par block_id, a partir des evenements 'dwell'.
// `since` (timestamp ms) borne la fenetre, coherent avec la periode selectionnee.
export function buildBlockDwell(events: PageEvent[], since?: number): Record<string, number> {
  const sum: Record<string, number> = {}
  const n: Record<string, number> = {}
  for (const e of events) {
    if (e.kind === "dwell" && e.ref && typeof e.value === "number" && withinSince(e, since)) {
      sum[e.ref] = (sum[e.ref] || 0) + e.value
      n[e.ref] = (n[e.ref] || 0) + 1
    }
  }
  const avg: Record<string, number> = {}
  for (const ref of Object.keys(sum)) avg[ref] = Math.round(sum[ref] / n[ref])
  return avg
}

// ── Carte de chaleur des clics (heatmap) ──────────────────────────────────────
// Grille d'intensité normalisée 0..1 à partir des taps (x/y = fractions 0..1).
// x = colonne (largeur), y = ligne (hauteur totale de la page). Ignore les taps
// hors bornes / sans coordonnées. cols × rows cellules ; chaque cellule = part du max.
export function buildTapGrid(events: PageEvent[], cols: number, rows: number): number[][] {
  const c = Math.max(1, Math.floor(cols))
  const r = Math.max(1, Math.floor(rows))
  const grid: number[][] = Array.from({ length: r }, () => new Array(c).fill(0))
  let max = 0
  for (const e of events) {
    if (e.kind !== "tap") continue
    const x = e.x, y = e.y
    if (typeof x !== "number" || typeof y !== "number") continue
    if (x < 0 || x > 1 || y < 0 || y > 1 || Number.isNaN(x) || Number.isNaN(y)) continue
    const ci = Math.min(c - 1, Math.floor(x * c))
    const ri = Math.min(r - 1, Math.floor(y * r))
    const v = grid[ri][ci] + 1
    grid[ri][ci] = v
    if (v > max) max = v
  }
  if (max === 0) return grid
  for (let i = 0; i < r; i++) for (let j = 0; j < c; j++) grid[i][j] = grid[i][j] / max
  return grid
}

// Nombre de clics (taps) par bloc touché. Ignore ref vide ou '-' (taps hors bloc).
export function buildTapsByBlock(events: PageEvent[]): Record<string, number> {
  const counts: Record<string, number> = {}
  for (const e of events) {
    if (e.kind === "tap" && e.ref && e.ref !== "-") counts[e.ref] = (counts[e.ref] || 0) + 1
  }
  return counts
}

// Nombre total de taps enregistrés (avec ou sans coordonnées valides).
export function countTaps(events: PageEvent[]): number {
  let n = 0
  for (const e of events) if (e.kind === "tap") n++
  return n
}
