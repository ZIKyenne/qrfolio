// typesProfil.ts — Les formes de données de l'écran Profil et leurs libellés
// d'affichage : profil, clés d'API, pages et scans récents, préférences, domaines,
// et la configuration visuelle du journal d'activité.
//
// Sorties de page.tsx pour que ce fichier redescende sous les 3 000 lignes.
import { Activity, Award, CheckCircle, Crown, Download, FileEdit, Key, QrCode, ScanLine, Settings, Star, Tag } from "lucide-react"
import type { ActivityEventType } from "./journalActivite"
import { PLAN_LIST, fmtPrice } from "@/lib/plans"

// -- Types --------------------------------------------------------------------
export type Profile = {
  id: string; email: string; full_name: string | null; username: string | null
  bio: string | null; avatar_url: string | null; plan: string; website: string | null
  total_pages: number; total_scans: number; created_at: string; ref_code: string | null
}

export type ApiKey = {
  id: string; name: string; key_preview: string; last_used_at: string | null
  expires_at: string | null; is_active: boolean; created_at: string
  calls_this_month?: number   // enrichi cote client si disponible
}

export type RecentPage = {
  id: string; title: string; slug: string; status: string
  total_views: number; unique_views: number; updated_at: string; created_at: string
}

export type RecentScan = {
  id: string; scanned_at: string; device: string; country: string | null
}

// -- Activity Log -------------------------------------------------------------

// Config d'affichage par type d'evenement
export const ACTIVITY_CFG: Record<ActivityEventType, { icon: any; color: string; bg: string }> = {
  page_created:       { icon: FileEdit,  color: "var(--accent)",  bg: "color-mix(in srgb, var(--accent) 10%, transparent)"  },
  page_published:     { icon: CheckCircle,color: "var(--success)", bg: "rgba(57,255,143,0.1)"  },
  page_updated:       { icon: FileEdit,  color: "var(--accent)",  bg: "color-mix(in srgb, var(--accent) 10%, transparent)"  },
  qr_created:         { icon: QrCode,    color: "var(--accent)",  bg: "color-mix(in srgb, var(--accent) 10%, transparent)"  },
  qr_customized:      { icon: Settings,  color: "var(--accent)",  bg: "color-mix(in srgb, var(--accent) 10%, transparent)"  },
  qr_scanned:         { icon: ScanLine,      color: "var(--success)",  bg: "rgba(57,255,143,0.1)"  },
  qr_downloaded:      { icon: Download,  color: "var(--accent)",  bg: "color-mix(in srgb, var(--accent) 10%, transparent)"  },
  plan_changed:       { icon: Activity,       color: "var(--accent)",  bg: "color-mix(in srgb, var(--accent) 10%, transparent)"  },
  referral_validated: { icon: Award,     color: "var(--accent)",  bg: "color-mix(in srgb, var(--accent) 10%, transparent)"  },
  profile_updated:    { icon: Settings,  color: "#A8A190",  bg: "rgba(138,132,120,0.1)" },
  template_used:      { icon: Tag,       color: "var(--accent)",  bg: "color-mix(in srgb, var(--accent) 10%, transparent)"  },
  api_key_created:    { icon: Key,       color: "var(--accent)",  bg: "color-mix(in srgb, var(--accent) 10%, transparent)"  },
  export_done:        { icon: Download,  color: "var(--accent)",  bg: "color-mix(in srgb, var(--accent) 10%, transparent)"  },
}

export const ACTIVITY_FILTER_OPTS = [
  { id: "all",       label: "Tout"       },
  { id: "pages",     label: "Pages"      },
  { id: "qr",        label: "QR Codes"   },
  { id: "account",   label: "Compte"     },
]

// -- Preferences utilisateur --------------------------------------------------
export type UserPreferences = {
  locale:         string   // fr | en | es | de | pt
  timezone:       string   // IANA timezone
  date_format:    string   // DD/MM/YYYY | MM/DD/YYYY | YYYY-MM-DD
  time_format:    string   // 24h | 12h
  currency:       string   // EUR | USD | GBP | CHF
  notif_email:    boolean
  notif_scan:     boolean
  notif_security: boolean
  report_weekly:  boolean
  report_monthly: boolean
  accent_color:   string   // hex color
}

export const DEFAULT_PREFS: UserPreferences = {
  locale: "fr", timezone: "Europe/Paris", date_format: "DD/MM/YYYY",
  time_format: "24 heures", currency: "EUR",
  notif_email: true, notif_scan: true, notif_security: true,
  report_weekly: false, report_monthly: false,
  accent_color: "#C9A84C",
}

export type DomainRecord = {
  id:            string
  domain:        string
  page_id:       string
  is_primary:    boolean
  verified:      boolean
  verified_at:   string | null
  vercel_status: string   // "pending" | "active" | "error"
  vercel_error:  string | null
  created_at:    string
  pages:         { title: string; slug: string } | null
}

export type QRStat = {
  id: string; short_code: string; total_scans: number; status: string | null
  /** Date réelle de création : le journal d'activité en INVENTAIT une, au hasard
   *  dans les 30 derniers jours, et elle changeait à chaque affichage. */
  created_at: string | null
  pages: { title: string } | null
}

// -- Plans complets avec limites reelles --------------------------------------
export type PlanLimit = { pages: number|null; views: number|null; qr: number|null; team: number|null }

// Icônes par plan (l'UI seule ; les données viennent de lib/plans)
const PLAN_ICONS: Record<string, any> = { free: Star, starter: Activity, pro: Activity, business: Crown }
// PLAN_CFG dérivé de la source unique (lib/plans) — même forme qu'avant pour le reste du fichier
export const PLAN_CFG: Record<string, {
  color: string; label: string; icon: any
  price_monthly: string; price_annual: string
  description: string
  limits: PlanLimit
  features: string[]
  badge?: string
}> = Object.fromEntries(PLAN_LIST.map(p => [p.id, {
  color: p.color, label: p.label, icon: PLAN_ICONS[p.id],
  price_monthly: fmtPrice(p.priceMonthly), price_annual: fmtPrice(p.priceAnnual),
  description: p.description, limits: p.limits, features: p.features,
  badge: p.badge ?? undefined,
}]))
