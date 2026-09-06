// journalActivite.ts — Le journal d'activité du profil, reconstruit à partir des
// pages, des QR et des parrainages quand la table activity_logs est vide.
//
// Il vivait dans un composant de 3 294 lignes, et il INVENTAIT la date de création
// de chaque QR : `new Date(now - Math.random() * 30 jours)`. Le journal montrait
// donc des dates fausses, différentes à chaque affichage. Elles viennent maintenant
// de la base, et un QR sans date n'apparaît pas plutôt que d'en recevoir une fausse.

export type ActivityEventType =
  | "page_created" | "page_published" | "page_updated"
  | "qr_created"   | "qr_customized"  | "qr_scanned"   | "qr_downloaded"
  | "plan_changed" | "referral_validated" | "profile_updated"
  | "template_used"| "api_key_created"    | "export_done"

export type ActivityEvent = {
  id:           string
  user_id?:     string
  event_type:   ActivityEventType
  title:        string
  description:  string | null
  entity_id:    string | null
  entity_type:  string | null
  entity_label: string | null
  metadata:     Record<string, unknown>
  created_at:   string
}

export type DonneesJournal = {
  pages: { id: string; title: string; status: string; created_at: string; updated_at: string }[]
  qrs:   { id: string; short_code: string; created_at: string | null; pages: { title: string } | null }[]
  parrainages: { id: string; status: string; reward_months?: number | null; created_at: string }[]
}

export function construireJournal(d: DonneesJournal): ActivityEvent[] {
  const evts: ActivityEvent[] = []
  // Pages
  for (const p of d.pages) {
    if (p.created_at) evts.push({
      id: `page-created-${p.id}`, event_type: "page_created",
      title: "Page créée", description: p.title,
      entity_id: p.id, entity_type: "page", entity_label: p.title,
      metadata: {}, created_at: p.created_at,
    })
    if (p.updated_at && p.updated_at !== p.created_at) {
      const diffMs = new Date(p.updated_at).getTime() - new Date(p.created_at).getTime()
      if (diffMs > 60000) evts.push({
        id: `page-updated-${p.id}-${p.updated_at}`, event_type: p.status === "published" ? "page_published" : "page_updated",
        title: p.status === "published" ? "Page publiée" : "Page modifiée",
        description: p.title, entity_id: p.id, entity_type: "page",
        entity_label: p.title, metadata: {}, created_at: p.updated_at,
      })
    }
  }
  // QR — sans date réelle, on n'invente pas : l'événement est simplement absent.
  for (const q of d.qrs) {
    if (!q.created_at) continue
    evts.push({
      id: `qr-created-${q.id}`, event_type: "qr_created",
      title: "QR code créé", description: q.pages?.title || `/${q.short_code}`,
      entity_id: q.id, entity_type: "qr_code", entity_label: q.short_code,
      metadata: {}, created_at: q.created_at,
    })
  }
  // Referrals
  for (const r of d.parrainages.filter(r => r.status !== "pending")) {
    evts.push({
      id: `ref-${r.id}`, event_type: "referral_validated",
      title: "Parrainage valide", description: `+${r.reward_months || 1} mois Pro`,
      entity_id: r.id, entity_type: "referral", entity_label: null,
      metadata: {}, created_at: r.created_at,
    })
  }
  return evts.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
}
