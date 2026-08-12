// Agrégation PURE du funnel « par support physique ».
// Pour chaque QR (= un support : vitrine, table, flyer, carte…), on compte l'entonnoir
// scan → vue de page → clic CTA → conversion, à partir d'événements déjà attribués :
//  · les SCANS sont attribués par `qr_code_id` (table `scans`) ;
//  · vue / clic / conversion sont attribués par `qr_source` (= short_code du QR, propagé
//    par le redirect /q/[code] et persisté dans page_views / block_clicks / leads).
// Aucune I/O : prend des tableaux, renvoie des lignes triées. Testé (supportFunnel.test.ts).

export type SupportInput = {
  qrs: { id: string; short_code: string; label?: string | null }[]
  scans: { qr_code_id?: string | null }[]
  views: { qr_source?: string | null }[]
  clicks: { qr_source?: string | null }[]
  conversions: { qr_source?: string | null }[]
}

export type SupportRow = {
  id: string
  shortCode: string
  label: string
  scans: number
  views: number
  clicks: number
  conversions: number
  viewRate: number | null   // vues / scans      (null si 0 scan)
  clickRate: number | null  // clics / vues       (null si 0 vue)
  convRate: number | null   // conversions / clics (null si 0 clic)
}

// Libellé par défaut d'un support non nommé.
export function defaultSupportLabel(shortCode: string): string {
  return `QR ${shortCode}`
}

const rate = (num: number, den: number): number | null => (den > 0 ? num / den : null)

export function buildSupportFunnel(input: SupportInput): SupportRow[] {
  const byId = new Map<string, SupportRow>()
  const codeToId = new Map<string, string>()

  for (const q of input.qrs) {
    if (!q?.id || !q.short_code) continue
    byId.set(q.id, {
      id: q.id, shortCode: q.short_code,
      label: (q.label ?? "").trim() || defaultSupportLabel(q.short_code),
      scans: 0, views: 0, clicks: 0, conversions: 0,
      viewRate: null, clickRate: null, convRate: null,
    })
    codeToId.set(q.short_code, q.id)
  }

  for (const s of input.scans) {
    const r = s?.qr_code_id ? byId.get(s.qr_code_id) : undefined
    if (r) r.scans++
  }
  const bump = (arr: { qr_source?: string | null }[], key: "views" | "clicks" | "conversions") => {
    for (const e of arr) {
      const id = e?.qr_source ? codeToId.get(e.qr_source) : undefined
      const r = id ? byId.get(id) : undefined
      if (r) r[key]++
    }
  }
  bump(input.views, "views")
  bump(input.clicks, "clicks")
  bump(input.conversions, "conversions")

  const rows = [...byId.values()]
  for (const r of rows) {
    r.viewRate = rate(r.views, r.scans)
    r.clickRate = rate(r.clicks, r.views)
    r.convRate = rate(r.conversions, r.clicks)
  }
  // support le plus scanné en tête
  rows.sort((a, b) => b.scans - a.scans || b.views - a.views)
  return rows
}

// Totaux tous supports confondus (en-tête récap).
export function supportTotals(rows: SupportRow[]) {
  const t = rows.reduce(
    (a, r) => ({ scans: a.scans + r.scans, views: a.views + r.views, clicks: a.clicks + r.clicks, conversions: a.conversions + r.conversions }),
    { scans: 0, views: 0, clicks: 0, conversions: 0 },
  )
  return { ...t, viewRate: rate(t.views, t.scans), clickRate: rate(t.clicks, t.views), convRate: rate(t.conversions, t.clicks) }
}
