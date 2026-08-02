"use client"

import { useEffect, useState, useRef, useCallback } from "react"
import { createClient } from "@/lib/supabase/client"
import { PLAN_LIST, PLAN_ORDER, fmtPrice } from "@/lib/plans"
import Particles from "@/components/Particles"
import {
  Copy, Check, Gift, Star, TrendingUp, Users,
  QrCode, Eye, Crown, Camera, Save, ExternalLink,
  Shield, Key, Bell, Globe, Trash2, Download, User,
  ChevronRight, Lock, LogOut, AlertTriangle, Plus, X,
  RotateCcw, Activity, CreditCard, Code, Settings, CheckCircle,
  AtSign, Link, Link2, ImageOff, Crop, UserCheck,
  UserX, Clock, Filter, Calendar, FileEdit, ScanLine,
  Tag, Award, Share2, MessageCircle, Mail, Hash as Twitter,
  Briefcase as Linkedin, Smartphone, Monitor, Tablet, Wifi, ShieldCheck,
  ShieldOff, ImageIcon
} from "lucide-react"
import NextStepCard from "@/components/NextStepCard"
import { useToast } from "@/components/Toast"

// -- Types --------------------------------------------------------------------
type Profile = {
  id: string; email: string; full_name: string | null; username: string | null
  bio: string | null; avatar_url: string | null; plan: string; website: string | null
  total_pages: number; total_scans: number; created_at: string; ref_code: string | null
}

type ApiKey = {
  id: string; name: string; key_preview: string; last_used_at: string | null
  expires_at: string | null; is_active: boolean; created_at: string
  calls_this_month?: number   // enrichi cote client si disponible
}

type RecentPage = {
  id: string; title: string; slug: string; status: string
  total_views: number; unique_views: number; updated_at: string; created_at: string
}

type RecentScan = {
  id: string; scanned_at: string; device: string; country: string | null
}

// -- Activity Log -------------------------------------------------------------
type ActivityEventType =
  | "page_created" | "page_published" | "page_updated"
  | "qr_created"   | "qr_customized"  | "qr_scanned"   | "qr_downloaded"
  | "plan_changed" | "referral_validated" | "profile_updated"
  | "template_used"| "api_key_created"    | "export_done"

type ActivityEvent = {
  id:           string
  user_id?:     string
  event_type:   ActivityEventType
  title:        string
  description:  string | null
  entity_id:    string | null
  entity_type:  string | null
  entity_label: string | null
  metadata:     Record<string, any>
  created_at:   string
}

// Config d'affichage par type d'evenement
const ACTIVITY_CFG: Record<ActivityEventType, { icon: any; color: string; bg: string }> = {
  page_created:       { icon: FileEdit,  color: "var(--accent)",  bg: "color-mix(in srgb, var(--accent) 10%, transparent)"  },
  page_published:     { icon: CheckCircle,color: "var(--success)", bg: "rgba(57,255,143,0.1)"  },
  page_updated:       { icon: FileEdit,  color: "var(--action)",  bg: "rgba(56,189,248,0.1)"  },
  qr_created:         { icon: QrCode,    color: "var(--accent)",  bg: "color-mix(in srgb, var(--accent) 10%, transparent)"  },
  qr_customized:      { icon: Settings,  color: "#7B61FF",  bg: "rgba(123,97,255,0.1)"  },
  qr_scanned:         { icon: ScanLine,      color: "var(--success)",  bg: "rgba(57,255,143,0.1)"  },
  qr_downloaded:      { icon: Download,  color: "var(--action)",  bg: "rgba(56,189,248,0.1)"  },
  plan_changed:       { icon: Activity,       color: "var(--accent)",  bg: "color-mix(in srgb, var(--accent) 10%, transparent)"  },
  referral_validated: { icon: Award,     color: "#EC4899",  bg: "rgba(236,72,153,0.1)"  },
  profile_updated:    { icon: Settings,  color: "#A8A190",  bg: "rgba(138,132,120,0.1)" },
  template_used:      { icon: Tag,       color: "#F97316",  bg: "rgba(249,115,22,0.1)"  },
  api_key_created:    { icon: Key,       color: "#7B61FF",  bg: "rgba(123,97,255,0.1)"  },
  export_done:        { icon: Download,  color: "var(--action)",  bg: "rgba(56,189,248,0.1)"  },
}

const ACTIVITY_FILTER_OPTS = [
  { id: "all",       label: "Tout"       },
  { id: "pages",     label: "Pages"      },
  { id: "qr",        label: "QR Codes"   },
  { id: "account",   label: "Compte"     },
]

// -- Preferences utilisateur --------------------------------------------------
type UserPreferences = {
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

const DEFAULT_PREFS: UserPreferences = {
  locale: "fr", timezone: "Europe/Paris", date_format: "DD/MM/YYYY",
  time_format: "24h", currency: "EUR",
  notif_email: true, notif_scan: true, notif_security: true,
  report_weekly: false, report_monthly: false,
  accent_color: "#C9A84C",
}

type DomainRecord = {
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

type QRStat = {
  id: string; short_code: string; total_scans: number; status: string | null
  pages: { title: string } | null
}

// -- Constantes ---------------------------------------------------------------
const G = "var(--accent)"
const MUTED = "#A8A190"
const BG = "#080808"
const SURF = "#111009"
const SURF2 = "#0F0E0B"

// -- Plans complets avec limites reelles --------------------------------------
type PlanLimit = { pages: number|null; views: number|null; qr: number|null; team: number|null }

// Icônes par plan (l'UI seule ; les données viennent de lib/plans)
const PLAN_ICONS: Record<string, any> = { free: Star, starter: Activity, pro: Activity, business: Crown }
// PLAN_CFG dérivé de la source unique (lib/plans) — même forme qu'avant pour le reste du fichier
const PLAN_CFG: Record<string, {
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

// -- Composants utilitaires ----------------------------------------------------
function SectionCard({ title, icon: Icon, color = G, children, action, tag }: {
  title: string; icon: any; color?: string; children: React.ReactNode
  action?: React.ReactNode; tag?: string
}) {
  return (
    <div style={{ background: SURF, border: "1px solid rgba(255,255,255,0.07)", borderRadius: 16, overflow: "hidden" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 20px 14px", borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
          <div style={{ width: 30, height: 30, borderRadius: 8, background: color + "12", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Icon size={14} color={color}/>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
            <p style={{ color: "#F5F0E8", fontSize: 13, fontWeight: 700, margin: 0 }}>{title}</p>
            {tag && <span style={{ background: "color-mix(in srgb, var(--accent) 12%, transparent)", border: "1px solid color-mix(in srgb, var(--accent) 20%, transparent)", borderRadius: 4, padding: "1px 6px", fontSize: 9, color: G, fontWeight: 700 }}>{tag}</span>}
          </div>
        </div>
        {action}
      </div>
      <div style={{ padding: "16px 20px" }}>{children}</div>
    </div>
  )
}

function StatPill({ icon: Icon, label, value, color }: { icon: any; label: string; value: string | number; color: string }) {
  return (
    <div style={{ background: SURF2, border: "1px solid rgba(255,255,255,0.06)", borderRadius: 10, padding: "12px 14px", display: "flex", alignItems: "center", gap: 10 }}>
      <div style={{ width: 32, height: 32, borderRadius: 8, background: color + "15", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
        <Icon size={15} color={color}/>
      </div>
      <div>
        <p style={{ color: "#F5F0E8", fontSize: 20, fontWeight: 800, margin: 0, lineHeight: 1, fontFamily: "Fraunces, serif" }}>{value}</p>
        <p style={{ color: MUTED, fontSize: 10, margin: "2px 0 0", textTransform: "uppercase", letterSpacing: 0.8 }}>{label}</p>
      </div>
    </div>
  )
}

// Compteur animé (s'incrémente de 0 à la valeur au montage) — donne de la vie au Hero
function CountUp({ value, duration = 900 }: { value: number; duration?: number }) {
  const [n, setN] = useState(0)
  useEffect(() => {
    if (!value) { setN(0); return }
    let raf = 0
    const start = performance.now()
    const tick = (t: number) => {
      const p = Math.min(1, (t - start) / duration)
      setN(Math.round(value * (1 - Math.pow(1 - p, 3))))
      if (p < 1) raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [value, duration])
  return <>{n.toLocaleString("fr-FR")}</>
}

// -- Page principale -----------------------------------------------------------
export default function ProfilePage() {
  const [profile, setProfile]           = useState<Profile | null>(null)
  const [referrals, setReferrals]       = useState<any[]>([])
  const [apiKeys, setApiKeys]           = useState<ApiKey[]>([])
  const [recentPages, setRecentPages]   = useState<RecentPage[]>([])
  const [recentScans, setRecentScans]   = useState<RecentScan[]>([])
  const [loading, setLoading]           = useState(true)
  const [saving, setSaving]             = useState(false)
  const [saved, setSaved]               = useState(false)
  const [copied, setCopied]             = useState(false)
  const [copiedKey, setCopiedKey]       = useState<string | null>(null)
  const [uploadingAvatar, setUploadingAvatar] = useState(false)
  const [showNewKey, setShowNewKey]     = useState(false)
  const [newKeyName, setNewKeyName]     = useState("")
  const [newKeyCreated, setNewKeyCreated] = useState<string | null>(null)
  const [deletingKey,      setDeletingKey]      = useState<string|null>(null)
  const [regenKeyId,       setRegenKeyId]       = useState<string|null>(null)   // id cle a regenerer
  const [confirmRegen,     setConfirmRegen]     = useState<string|null>(null)   // modal confirmation
  const [confirmRevoke,    setConfirmRevoke]    = useState<string|null>(null)   // modal confirmation
  const [apiCallsCount,    setApiCallsCount]    = useState<number>(0)
  const API_CALLS_LIMIT: Record<string,number> = { free:0, starter:0, pro:1000, business:10000 }
  const [showDanger, setShowDanger]     = useState(false)
  const [dangerConfirm, setDangerConfirm] = useState("")
  const [activeSection, setActiveSection] = useState<string | null>(null)
  const [form, setForm]                 = useState({ full_name: "", username: "", bio: "", website: "" })
  const [formOriginal, setFormOriginal] = useState({ full_name: "", username: "", bio: "", website: "" })
  const [usernameStatus, setUsernameStatus] = useState<"idle"|"checking"|"ok"|"taken"|"invalid">("idle")
  const [usernameMsg, setUsernameMsg]   = useState("")
  const [copiedUrl, setCopiedUrl]       = useState(false)
  const [copiedRef, setCopiedRef]       = useState(false)
  const [refFilter, setRefFilter]       = useState("all")
  const [showShareMenu, setShowShareMenu] = useState(false)
  const toast = useToast()
  const [cropMode, setCropMode]         = useState(false)
  const [cropSrc, setCropSrc]           = useState<string|null>(null)
  const [deletingAvatar, setDeletingAvatar] = useState(false)
  const [allPages,   setAllPages]   = useState<RecentPage[]>([])
  const [qrStats,    setQrStats]    = useState<QRStat[]>([])
  const [statsLoading, setStatsLoading] = useState(true)
  const [statsTooltip, setStatsTooltip]     = useState<string | null>(null)
  const [activityLog,  setActivityLog]       = useState<ActivityEvent[]>([])
  const [activityLoading, setActivityLoading]= useState(true)
  const [activityFilter,  setActivityFilter] = useState("all")
  const [activityPage,    setActivityPage]   = useState(0)
  const ACTIVITY_PAGE_SIZE = 10
  // Subscription state (simule depuis le plan Supabase, enrichi si Stripe webhook)
  const [subStatus,   setSubStatus]   = useState<"active"|"trialing"|"canceled"|"past_due"|"free">("free")
  const [subRenewal,  setSubRenewal]  = useState<string|null>(null)
  const [subCycle,    setSubCycle]    = useState<"monthly"|"annual">("monthly")
  const [domains,       setDomains]       = useState<DomainRecord[]>([])
  const [domainsLoading,setDomainsLoading]= useState(true)
  const [prefs,         setPrefs]         = useState<UserPreferences>(DEFAULT_PREFS)
  const [prefsSaving,   setPrefsSaving]   = useState(false)
  const [prefsSaved,    setPrefsSaved]    = useState(false)
  const prefsSaveTimer = useRef<NodeJS.Timeout|null>(null)
  const [deletingDomain,setDeletingDomain]= useState<string|null>(null)
  const [settingPrimary,setSettingPrimary]= useState<string|null>(null)
  const [subLoading,  setSubLoading]  = useState(true)
  // -- Securite ------------------------------------------
  const [authUser,       setAuthUser]       = useState<any>(null)
  const [ptab,           setPtab]            = useState<"identite"|"abonnement"|"securite"|"donnees"|"preferences"|"parrainage">("identite") // onglets profil
  const [emailVerified,  setEmailVerified]  = useState(false)
  const [lastSignIn,     setLastSignIn]      = useState<string|null>(null)
  const [sessions,       setSessions]        = useState<any[]>([])
  const [secLoading,     setSecLoading]      = useState(true)
  const [sendingVerif,   setSendingVerif]    = useState(false)
  const [verifSent,      setVerifSent]       = useState(false)
  const [pwdLoading,     setPwdLoading]      = useState(false)
  const [pwdSent,        setPwdSent]         = useState(false)
  const [signOutAllLoading, setSignOutAllLoading] = useState(false)
  const [showReauthModal, setShowReauthModal] = useState(false)
  const [reauthAction,   setReauthAction]    = useState<string|null>(null)
  const [reauthPwd,      setReauthPwd]       = useState("")
  const [reauthError,    setReauthError]     = useState("")
  const [reauthLoading,  setReauthLoading]   = useState(false)
  const [showPwdChange,  setShowPwdChange]   = useState(false)
  const [newPwd,         setNewPwd]          = useState("")
  const [newPwdConfirm,  setNewPwdConfirm]  = useState("")
  const [pwdStrength,    setPwdStrength]     = useState(0)
  const usernameTimer = useRef<NodeJS.Timeout | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)
  const cropRef = useRef<HTMLCanvasElement>(null)

  // -- Chargement --------------------------------------------------------------
  useEffect(() => {
    const supabase = createClient()
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { window.location.href = "/auth/login"; return }
      setAuthUser(user)
      setEmailVerified(!!user.email_confirmed_at)
      setLastSignIn(user.last_sign_in_at || null)
      // Simuler sessions (Supabase ne retourne pas la liste des sessions actives en client)
      setSessions([{
        id: "current", device: navigator.userAgent.includes("Mobile") ? "mobile" : "desktop",
        browser: navigator.userAgent.includes("Chrome") ? "Chrome"
          : navigator.userAgent.includes("Firefox") ? "Firefox"
          : navigator.userAgent.includes("Safari") ? "Safari" : "Navigateur",
        location: "Session actuelle",
        last_active: new Date().toISOString(), current: true,
      }])
      setSecLoading(false)

      const [
        { data: prof },
        { data: refs },
        { data: keys },
        { data: pages },
        { data: allPagesData },
        { data: qrData },
      ] = await Promise.all([
        supabase.from("profiles").select("*").eq("id", user.id).single(),
        supabase.from("referrals").select("id,status,reward_months,created_at,referred_id").eq("referrer_id", user.id).order("created_at", { ascending: false }),
        supabase.from("api_keys").select("*").eq("user_id", user.id).order("created_at", { ascending: false }),
        supabase.from("pages").select("id,title,slug,status,total_views,unique_views,updated_at,created_at").eq("user_id", user.id).order("updated_at", { ascending: false }).limit(5),
        supabase.from("pages").select("id,title,slug,status,total_views,unique_views,updated_at,created_at").eq("user_id", user.id),
        supabase.from("qr_codes").select("id,short_code,total_scans,status,pages(title)").eq("user_id", user.id).order("total_scans", { ascending: false }),
      ])

      if (prof) {
        setProfile(prof)
        const init = { full_name: prof.full_name || "", username: prof.username || "", bio: prof.bio || "", website: prof.website || "" }
        setForm(init)
        setFormOriginal(init)
        // Charger les preferences (JSONB) + auto-detect timezone si absent
        const storedPrefs = prof.preferences as Partial<UserPreferences> | null
        const detectedTz  = Intl.DateTimeFormat().resolvedOptions().timeZone
        setPrefs({
          ...DEFAULT_PREFS,
          timezone: detectedTz || DEFAULT_PREFS.timezone,
          ...storedPrefs,
        })
      }
      if (refs)  setReferrals(refs)
      if (keys)  setApiKeys(keys)
      if (pages)       setRecentPages(pages)
      if (allPagesData) setAllPages(allPagesData)
      // postgrest infere pages en tableau ; au runtime c'est un objet (relation many-to-one)
      if (qrData)      setQrStats(qrData as unknown as QRStat[])
      // Charger activity_logs (ou construire depuis donnees existantes)
      try {
        const { data: actData } = await supabase
          .from("activity_logs")
          .select("*")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false })
          .limit(100)
        if (actData && actData.length > 0) {
          setActivityLog(actData)
        }
        // Sera override par buildTimelineFromData si vide
      } catch { /* activity_logs pas encore cree */ }
      // Statut subscription (simplifie : free = free, autre = active)
      // En prod, ces donnees viendraient d'un webhook Stripe
      if (prof) {
        setSubStatus(prof.plan === "free" ? "free" : "active")
      }
      // Charger les domaines
      try {
        const dRes = await fetch("/api/domains")
        const dData = await dRes.json()
        setDomains(dData.domains ?? [])
      } catch { /* API domains peut ne pas etre disponible */ }
      setDomainsLoading(false)
      setSubLoading(false)
      setActivityLoading(false)
      setStatsLoading(false)
      setLoading(false)
    }
    load()
  }, [])

  // -- Actions -----------------------------------------------------------------
  // -- Helpers timeline -------------------------------------------------------
  function timeAgo(iso: string): string {
    const diff = Date.now() - new Date(iso).getTime()
    const m = Math.floor(diff / 60000)
    const h = Math.floor(diff / 3600000)
    const d = Math.floor(diff / 86400000)
    if (m < 2)  return "a l'instant"
    if (m < 60) return `il y a ${m}min`
    if (h < 24) return `il y a ${h}h`
    if (d < 7)  return `il y a ${d}j`
    return new Date(iso).toLocaleDateString("fr-FR", { day:"numeric", month:"short" })
  }

  function groupLabel(iso: string): string {
    const d = Math.floor((Date.now() - new Date(iso).getTime()) / 86400000)
    if (d === 0) return "Aujourd'hui"
    if (d === 1) return "Hier"
    if (d < 7)   return "Cette semaine"
    if (d < 30)  return "Ce mois"
    return "Plus ancien"
  }

  function filterEvents(evts: ActivityEvent[]): ActivityEvent[] {
    if (activityFilter === "all") return evts
    if (activityFilter === "pages") return evts.filter(e =>
      ["page_created","page_published","page_updated"].includes(e.event_type))
    if (activityFilter === "qr") return evts.filter(e =>
      ["qr_created","qr_customized","qr_scanned","qr_downloaded"].includes(e.event_type))
    if (activityFilter === "account") return evts.filter(e =>
      ["plan_changed","referral_validated","profile_updated","api_key_created","export_done"].includes(e.event_type))
    return evts
  }

  // Construire la timeline depuis les donnees existantes (fallback si activity_logs vide)
  function buildTimelineFromData(): ActivityEvent[] {
    const evts: ActivityEvent[] = []
    const now = Date.now()
    // Pages
    for (const p of allPages) {
      if (p.created_at) evts.push({
        id: `page-created-${p.id}`, event_type: "page_created",
        title: "Page creee", description: p.title,
        entity_id: p.id, entity_type: "page", entity_label: p.title,
        metadata: {}, created_at: p.created_at,
      })
      if (p.updated_at && p.updated_at !== p.created_at) {
        const diffMs = new Date(p.updated_at).getTime() - new Date(p.created_at).getTime()
        if (diffMs > 60000) evts.push({
          id: `page-updated-${p.id}-${p.updated_at}`, event_type: p.status === "published" ? "page_published" : "page_updated",
          title: p.status === "published" ? "Page publiee" : "Page modifiee",
          description: p.title, entity_id: p.id, entity_type: "page",
          entity_label: p.title, metadata: {}, created_at: p.updated_at,
        })
      }
    }
    // QR
    for (const q of qrStats) {
      evts.push({
        id: `qr-created-${q.id}`, event_type: "qr_created",
        title: "QR Code cree", description: (q.pages as any)?.title || `/${q.short_code}`,
        entity_id: q.id, entity_type: "qr_code", entity_label: q.short_code,
        metadata: {}, created_at: new Date(now - Math.random()*86400000*30).toISOString(),
      })
    }
    // Referrals
    for (const r of referrals.filter(r => r.status !== "pending")) {
      evts.push({
        id: `ref-${r.id}`, event_type: "referral_validated",
        title: "Parrainage valide", description: `+${r.reward_months || 1} mois Pro`,
        entity_id: r.id, entity_type: "referral", entity_label: null,
        metadata: {}, created_at: r.created_at,
      })
    }
    return evts.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
  }

  // Logger un evenement
  async function logActivity(
    event_type: ActivityEventType, title: string,
    opts?: { description?: string; entity_id?: string; entity_type?: string; entity_label?: string; metadata?: Record<string, any> }
  ) {
    if (!profile?.id) return
    const sb = createClient()
    const evt: Omit<ActivityEvent, "id"> = {
      user_id: profile.id, event_type, title,
      description:  opts?.description  ?? null,
      entity_id:    opts?.entity_id    ?? null,
      entity_type:  opts?.entity_type  ?? null,
      entity_label: opts?.entity_label ?? null,
      metadata:     opts?.metadata     ?? {},
      created_at:   new Date().toISOString(),
    }
    // Optimistic update
    const tempId = crypto.randomUUID()
    setActivityLog(prev => [{ id: tempId, ...evt } as ActivityEvent, ...prev])
    // Persist
    try {
      await sb.from("activity_logs").insert({ ...evt })
    } catch { /* table peut ne pas exister encore */ }
  }

  // -- Fonctions preferences ----------------------------------------
  async function savePrefs(updated: UserPreferences) {
    if (!profile) return
    setPrefs(updated)
    // Debounce: annuler le timer precedent
    if (prefsSaveTimer.current) clearTimeout(prefsSaveTimer.current)
    prefsSaveTimer.current = setTimeout(async () => {
      setPrefsSaving(true)
      const sb = createClient()
      const { error } = await sb.from("profiles")
        .update({ preferences: updated })
        .eq("id", profile.id)
      if (error) { showToast("Erreur sauvegarde preferences", "err") }
      else { setPrefsSaved(true); setTimeout(() => setPrefsSaved(false), 2000) }
      setPrefsSaving(false)
    }, 800)  // 800ms debounce pour les toggles
  }

  function togglePref(key: keyof UserPreferences, value: boolean) {
    savePrefs({ ...prefs, [key]: value })
  }

  function setPrefField<K extends keyof UserPreferences>(key: K, value: UserPreferences[K]) {
    // La couleur d'accent : appliquée + persistée localement (fiable, hors-ligne),
    // sync DB best-effort silencieuse -> pas de toast d'erreur même si la colonne manque.
    if (key === "accent_color" && typeof value === "string") {
      const next = { ...prefs, accent_color: value }
      setPrefs(next)
      localStorage.setItem("qrfolio_accent", value)
      window.dispatchEvent(new CustomEvent("qrfolio-accent", { detail: value }))
      if (profile) {
        createClient().from("profiles").update({ preferences: next }).eq("id", profile.id).then(() => {})
      }
      return
    }
    savePrefs({ ...prefs, [key]: value })
  }

  // -- Fonctions domaines ----------------------------------------
  async function deleteDomain(id: string) {
    setDeletingDomain(id)
    try {
      const res = await fetch("/api/domains", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      })
      const d = await res.json()
      if (d.ok || d.success) {
        setDomains(prev => prev.filter(dm => dm.id !== id))
        showToast("Domaine supprime")
      } else {
        showToast(d.error || "Erreur suppression", "err")
      }
    } catch { showToast("Erreur reseau", "err") }
    setDeletingDomain(null)
  }

  async function setPrimaryDomain(id: string) {
    setSettingPrimary(id)
    try {
      const res = await fetch("/api/domains", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, action: "set_primary" }),
      })
      const d = await res.json()
      if (d.ok || d.success) {
        setDomains(prev => prev.map(dm => ({ ...dm, is_primary: dm.id === id })))
        showToast("Domaine principal defini")
      } else {
        showToast(d.error || "Erreur", "err")
      }
    } catch { showToast("Erreur reseau", "err") }
    setSettingPrimary(null)
  }

  // -- Fonctions securite ----------------------------------------
  async function sendVerificationEmail() {
    if (!authUser?.email) return
    setSendingVerif(true)
    const sb = createClient()
    try {
      await sb.auth.resend({ type: "signup", email: authUser.email })
      setVerifSent(true); showToast("Email de verification envoye !")
      setTimeout(() => setVerifSent(false), 5000)
    } catch { showToast("Erreur envoi email", "err") }
    setSendingVerif(false)
  }

  async function sendPasswordReset() {
    if (!authUser?.email) return
    setPwdLoading(true)
    const sb = createClient()
    try {
      await sb.auth.resetPasswordForEmail(authUser.email, {
        redirectTo: window.location.origin + "/auth/reset-password",
      })
      setPwdSent(true); showToast("Email de reinitialisation envoye !")
      setTimeout(() => setPwdSent(false), 5000)
    } catch { showToast("Erreur envoi email", "err") }
    setPwdLoading(false)
    setShowPwdChange(false)
  }

  async function changePasswordDirect() {
    if (newPwd.length < 8) { showToast("Mot de passe trop court (min 8 car.)", "err"); return }
    if (newPwd !== newPwdConfirm) { showToast("Les mots de passe ne correspondent pas", "err"); return }
    setPwdLoading(true)
    const sb = createClient()
    try {
      const { error } = await sb.auth.updateUser({ password: newPwd })
      if (error) { showToast("Erreur : " + error.message, "err") }
      else { showToast("Mot de passe mis a jour !"); setShowPwdChange(false); setNewPwd(""); setNewPwdConfirm("") }
    } catch { showToast("Erreur", "err") }
    setPwdLoading(false)
  }

  async function signOutAllDevices() {
    setSignOutAllLoading(true)
    const sb = createClient()
    try {
      await sb.auth.signOut({ scope: "global" })
      window.location.href = "/auth/login"
    } catch { showToast("Erreur deconnexion globale", "err") }
    setSignOutAllLoading(false)
  }

  function computePwdStrength(pwd: string): number {
    let score = 0
    if (pwd.length >= 8)  score += 25
    if (pwd.length >= 12) score += 15
    if (/[A-Z]/.test(pwd)) score += 20
    if (/[0-9]/.test(pwd)) score += 20
    if (/[^A-Za-z0-9]/.test(pwd)) score += 20
    return Math.min(score, 100)
  }

  // Délègue au toast global unifié (garde la signature pour tous les appels existants).
  function showToast(msg: string, type: "ok"|"err" = "ok") {
    if (type === "err") toast.error(msg); else toast.success(msg)
  }

  // Validation username temps reel
  function handleUsernameChange(val: string) {
    const clean2 = val.toLowerCase().replace(/[^a-z0-9_-]/g, "")
    setForm(f => ({ ...f, username: clean2 }))
    if (usernameTimer.current) clearTimeout(usernameTimer.current)
    if (!clean2) { setUsernameStatus("idle"); setUsernameMsg(""); return }
    if (clean2.length < 3) {
      setUsernameStatus("invalid")
      setUsernameMsg("Minimum 3 caracteres")
      return
    }
    if (clean2.length > 30) {
      setUsernameStatus("invalid")
      setUsernameMsg("Maximum 30 caracteres")
      return
    }
    if (clean2 === formOriginal.username) {
      setUsernameStatus("ok"); setUsernameMsg("Username actuel"); return
    }
    setUsernameStatus("checking"); setUsernameMsg("Verification...")
    usernameTimer.current = setTimeout(async () => {
      const sb = createClient()
      const { data } = await sb.from("profiles").select("id").eq("username", clean2).single()
      if (data) {
        setUsernameStatus("taken"); setUsernameMsg("Deja utilise")
      } else {
        setUsernameStatus("ok"); setUsernameMsg("Disponible")
      }
    }, 500)
  }

  async function saveProfile() {
    if (!profile || !hasChanges) return
    if (usernameStatus === "taken") { showToast("Username deja utilise", "err"); return }
    if (usernameStatus === "invalid") { showToast("Username invalide", "err"); return }
    if (form.username && form.username.length < 3) { showToast("Username trop court", "err"); return }
    setSaving(true)
    const sb = createClient()
    const { error } = await sb.from("profiles").update({
      full_name: form.full_name || null,
      username:  form.username || null,
      bio:       form.bio || null,
      website:   form.website || null,
    }).eq("id", profile.id)
    if (error) { showToast("Erreur de sauvegarde", "err"); setSaving(false); return }
    const updated = { ...form }
    setProfile(p => p ? { ...p, ...updated } : p)
    setFormOriginal(updated)
    setSaving(false); setSaved(true); setTimeout(() => setSaved(false), 2500)
    showToast("Profil sauvegarde avec succes")
    logActivity("profile_updated", "Profil mis a jour", { entity_type: "profile" })
  }

  // Ouvre le crop preview
  function handleAvatarFile(file: File) {
    if (!file.type.startsWith("image/")) { showToast("Format non supporte (PNG, JPG, WEBP)", "err"); return }
    if (file.size > 5 * 1024 * 1024) { showToast("ImageIcon trop lourde (max 5 Mo)", "err"); return }
    const reader = new FileReader()
    reader.onload = e => { setCropSrc(e.target?.result as string); setCropMode(true) }
    reader.readAsDataURL(file)
  }

  // Crop carre 400x400 et upload
  async function uploadAvatar(dataUrl?: string) {
    if (!profile) return
    const src = dataUrl || cropSrc
    if (!src) return
    setUploadingAvatar(true); setCropMode(false); setCropSrc(null)
    try {
      // Redimensionner en 400x400 via canvas
      const canvas = document.createElement("canvas")
      canvas.width = 400; canvas.height = 400
      const ctx = canvas.getContext("2d")!
      const img = new Image(); img.src = src
      await new Promise<void>(r => { img.onload = () => r() })
      // Crop carre centree
      const size = Math.min(img.width, img.height)
      const sx = (img.width - size) / 2; const sy = (img.height - size) / 2
      ctx.drawImage(img, sx, sy, size, size, 0, 0, 400, 400)
      // Convertir en blob
      const blob: Blob = await new Promise(res => canvas.toBlob(b => res(b!), "image/jpeg", 0.92))
      const sb = createClient()
      const path = `avatars/${profile.id}.jpg`
      const { error } = await sb.storage.from("page-assets").upload(path, blob, { upsert: true, contentType: "image/jpeg" })
      if (error) { showToast("Erreur upload avatar", "err"); return }
      const { data: { publicUrl } } = sb.storage.from("page-assets").getPublicUrl(path)
      const cacheBust = publicUrl + "?v=" + Date.now()
      await sb.from("profiles").update({ avatar_url: cacheBust }).eq("id", profile.id)
      setProfile(p => p ? { ...p, avatar_url: cacheBust } : p)
      showToast("Avatar mis a jour")
    } catch { showToast("Erreur lors de l'upload", "err") }
    setUploadingAvatar(false)
  }

  async function deleteAvatar() {
    if (!profile?.avatar_url) return
    setDeletingAvatar(true)
    const sb = createClient()
    await sb.from("profiles").update({ avatar_url: null }).eq("id", profile.id)
    setProfile(p => p ? { ...p, avatar_url: null } : p)
    setDeletingAvatar(false); showToast("Avatar supprime")
  }

  function copyReferral() {
    navigator.clipboard.writeText(referralLink).then(() => { setCopiedRef(true); setTimeout(() => setCopiedRef(false), 2500) })
  }

  // Partage vers les reseaux
  function shareRef(platform: "whatsapp"|"email"|"twitter"|"linkedin") {
    const msg = `Rejoins QRowg, la plateforme de QR codes dynamiques professionnels ! Cree ta premiere page gratuitement : ${referralLink}`
    const urls: Record<string, string> = {
      whatsapp:  `https://wa.me/?text=${encodeURIComponent(msg)}`,
      email:     `mailto:?subject=${encodeURIComponent("Rejoins QRowg !")}&body=${encodeURIComponent(msg)}`,
      twitter:   `https://twitter.com/intent/tweet?text=${encodeURIComponent(msg)}`,
      linkedin:  `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(referralLink)}`,
    }
    window.open(urls[platform], "_blank", "noopener,noreferrer")
    setShowShareMenu(false)
  }

  function copyPublicUrl() {
    if (!publicUrl) return
    navigator.clipboard.writeText(publicUrl).then(() => { setCopiedUrl(true); setTimeout(() => setCopiedUrl(false), 2500) })
  }

  // (La génération de clé API est désormais serveur : POST /api/keys — vrai SHA-256,
  //  la clé en clair n'est jamais stockée. Voir createApiKey / regenerateApiKey.)

  async function createApiKey() {
    if (!profile || !newKeyName.trim()) return
    const nm  = newKeyName.trim()
    const res = await fetch("/api/keys", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: nm }) })
    const d   = await res.json().catch(() => ({}))
    if (!res.ok) { showToast(d.error || "Erreur creation cle", "err"); return }
    setApiKeys(prev => [d.record, ...prev])
    setNewKeyCreated(d.key)  // afficher UNE FOIS la cle complete (generee serveur, hashee)
    setNewKeyName("")
    setShowNewKey(false)
    showToast("Cle API creee -- copiez-la maintenant !")
    logActivity("api_key_created", "Cle API creee", { entity_label: nm, entity_type: "api_key" })
  }

  async function regenerateApiKey(id: string) {
    setRegenKeyId(id)
    const res = await fetch("/api/keys", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id }) })
    const d   = await res.json().catch(() => ({}))
    if (!res.ok) { showToast(d.error || "Erreur regeneration", "err") }
    else {
      setApiKeys(prev => prev.map(k => k.id === id ? { ...k, key_preview: d.record.key_preview } : k))
      setNewKeyCreated(d.key)
      showToast("Cle regeneree -- copiez-la maintenant !")
    }
    setRegenKeyId(null)
    setConfirmRegen(null)
  }

  async function revokeApiKey(id: string) {
    setDeletingKey(id)
    const sb = createClient()
    const { error } = await sb.from("api_keys").update({ is_active: false }).eq("id", id).eq("user_id", profile!.id)
    if (error) { showToast("Erreur revocation", "err") }
    else {
      setApiKeys(prev => prev.map(k => k.id === id ? { ...k, is_active: false } : k))
      showToast("Cle revoquee")
    }
    setDeletingKey(null)
    setConfirmRevoke(null)
  }

  // -- Exports RGPD -----------------------------------------------
  type ExportJob = { id:string; label:string; status:"idle"|"running"|"done"|"error"; filename?:string }
  const [exportJobs, setExportJobs] = useState<ExportJob[]>([
    { id:"full",      label:"Export complet",        status:"idle" },
    { id:"pages",     label:"Pages",                 status:"idle" },
    { id:"qrcodes",   label:"QR Codes",              status:"idle" },
    { id:"analytics", label:"Analytics",             status:"idle" },
    { id:"activity",  label:"Historique activite",   status:"idle" },
  ])
  const [exportHistory, setExportHistory] = useState<{date:string;label:string;format:string}[]>([])

  function downloadBlob(content: string, filename: string, mime: string) {
    const blob = new Blob([content], { type: mime })
    const url  = URL.createObjectURL(blob)
    const a    = Object.assign(document.createElement("a"), { href:url, download:filename })
    a.click(); setTimeout(() => URL.revokeObjectURL(url), 1000)
  }

  function arrayToCsv(rows: Record<string,any>[], cols?: string[]): string {
    if (!rows.length) return ""
    const keys = cols ?? Object.keys(rows[0])
    const esc  = (v: any) => `"${String(v ?? "").replace(/"/g, '"\""' )}"`
    return [keys.join(","), ...rows.map(r => keys.map(k => esc(r[k])).join(","))].join("\r\n")
  }

  function setJobStatus(id: string, status: ExportJob["status"], filename?: string) {
    setExportJobs(prev => prev.map(j => j.id===id ? {...j,status,filename} : j))
  }

  async function runExport(jobId: string) {
    if (!profile) return
    setJobStatus(jobId, "running")
    const slug = profile.username || profile.id.slice(0,8)
    const ts   = new Date().toISOString().slice(0,10)

    try {
      switch (jobId) {

        case "full": {
          // Export complet RGPD -- JSON
          const data = {
            _rgpd: { exported_at: new Date().toISOString(), user_id: profile.id },
            profile: {
              id: profile.id, email: profile.email, full_name: profile.full_name,
              username: profile.username, bio: profile.bio, website: profile.website,
              plan: profile.plan, created_at: profile.created_at,
            },
            preferences: prefs,
            pages: allPages.map(p => ({ id:p.id, title:p.title, slug:p.slug, status:p.status, total_views:p.total_views, unique_views:p.unique_views, created_at:p.created_at })),
            qr_codes: qrStats.map(q => ({ id:q.id, short_code:q.short_code, total_scans:q.total_scans, status:q.status })),
            referrals: referrals.map(r => ({ id:r.id, status:r.status, reward_months:r.reward_months, created_at:r.created_at })),
            api_keys: apiKeys.map(k => ({ id:k.id, name:k.name, key_preview:k.key_preview, is_active:k.is_active, created_at:k.created_at, last_used_at:k.last_used_at })),
            activity: activityLog.map(e => ({ id:e.id, event_type:e.event_type, title:e.title, description:e.description, created_at:e.created_at })),
          }
          const fn = `qrfolio-export-complet-${slug}-${ts}.json`
          downloadBlob(JSON.stringify(data, null, 2), fn, "application/json")
          setJobStatus(jobId, "done", fn)
          setExportHistory(h => [{ date:new Date().toISOString(), label:"Export complet", format:"JSON" }, ...h].slice(0,10))
          break
        }

        case "pages": {
          // Pages en CSV
          const rows = allPages.map(p => ({ titre:p.title, slug:p.slug, statut:p.status, vues:p.total_views, visiteurs_uniques:p.unique_views, cree_le:p.created_at, modifie_le:p.updated_at }))
          const fn   = `qrfolio-pages-${slug}-${ts}.csv`
          downloadBlob("\uFEFF" + arrayToCsv(rows), fn, "text/csv;charset=utf-8")
          setJobStatus(jobId, "done", fn)
          setExportHistory(h => [{ date:new Date().toISOString(), label:"Pages", format:"CSV" }, ...h].slice(0,10))
          break
        }

        case "qrcodes": {
          // QR Codes en CSV
          const rows = qrStats.map(q => ({ short_code:q.short_code, page:(q.pages as any)?.title||"", total_scans:q.total_scans, statut:q.status||"active" }))
          const fn   = `qrfolio-qrcodes-${slug}-${ts}.csv`
          downloadBlob("\uFEFF" + arrayToCsv(rows), fn, "text/csv;charset=utf-8")
          setJobStatus(jobId, "done", fn)
          setExportHistory(h => [{ date:new Date().toISOString(), label:"QR Codes", format:"CSV" }, ...h].slice(0,10))
          break
        }

        case "analytics": {
          // Analytics pages en CSV
          const rows = allPages.map(p => ({ page:p.title, slug:p.slug, vues_total:p.total_views, visiteurs_uniques:p.unique_views }))
          const fn   = `qrfolio-analytics-${slug}-${ts}.csv`
          downloadBlob("\uFEFF" + arrayToCsv(rows), fn, "text/csv;charset=utf-8")
          setJobStatus(jobId, "done", fn)
          setExportHistory(h => [{ date:new Date().toISOString(), label:"Analytics", format:"CSV" }, ...h].slice(0,10))
          break
        }

        case "activity": {
          // Historique activite en JSON
          const data = activityLog.map(e => ({ type:e.event_type, titre:e.title, detail:e.description, date:e.created_at }))
          const fn   = `qrfolio-activite-${slug}-${ts}.json`
          downloadBlob(JSON.stringify(data, null, 2), fn, "application/json")
          setJobStatus(jobId, "done", fn)
          setExportHistory(h => [{ date:new Date().toISOString(), label:"Activite", format:"JSON" }, ...h].slice(0,10))
          break
        }
      }
    } catch { setJobStatus(jobId, "error") }
  }

  // Compat ancien export
  async function exportData() { runExport("full") }

  async function signOut() {
    const supabase = createClient()
    await supabase.auth.signOut()
    window.location.href = "/auth/login"
  }

  // -- Donnees calculees --------------------------------------------------------
  // -- Stats calculees ------------------------------------------------------
  const totalPages     = allPages.length
  const publishedPages = allPages.filter(p => p.status === "published").length
  const draftPages     = allPages.filter(p => p.status === "draft").length
  const totalViews     = allPages.reduce((s, p) => s + (p.total_views || 0), 0)
  const uniqueViews    = allPages.reduce((s, p) => s + (p.unique_views || 0), 0)
  const totalQR        = qrStats.length
  const activeQR       = qrStats.filter(q => (q.status ?? "active") === "active").length
  const totalScansQR   = qrStats.reduce((s, q) => s + (q.total_scans || 0), 0)
  const topPage        = [...allPages].sort((a,b) => (b.total_views||0)-(a.total_views||0))[0] ?? null
  const topQR          = qrStats[0] ?? null  // deja trie par total_scans DESC
  const convRate       = totalViews > 0 ? Math.round((totalScansQR / totalViews) * 100) : 0
  const avgViews       = totalPages > 0 ? Math.round(totalViews / totalPages) : 0

  // -- Badges + Niveau QRowg -----------------------------------
  type Badge = {
    id: string; emoji: string; label: string; desc: string
    category: "pages"|"scans"|"referrals"|"plan"|"milestone"
    color: string; unlocked: boolean
  }

  function computeBadges(): Badge[] {
    const plan    = profile?.plan || "free"
    const isPro   = plan === "pro" || plan === "business"
    const isBiz   = plan === "business"
    const isEarly = memberMonths >= 0 && memberMonths <= 6
    return [
      { id:"first_page",     emoji:"📄", label:"Premiere page",      desc:"Publiez votre premiere page",               category:"pages",     color:"var(--accent)", unlocked: publishedPages >= 1      },
      { id:"builder_expert", emoji:"🏗",  label:"Builder Expert",     desc:"Publiez 10 pages differentes",              category:"pages",     color:"var(--action)", unlocked: publishedPages >= 10     },
      { id:"template_master",emoji:"🎨", label:"Template Master",     desc:"Creez 3 pages ou plus",                    category:"pages",     color:"#7B61FF", unlocked: totalPages >= 3          },
      { id:"first_qr",       emoji:"⬛", label:"Premier QR",         desc:"Creez votre premier QR Code",              category:"scans",     color:"#F97316", unlocked: qrStats.length >= 1      },
      { id:"scans_100",      emoji:"📡", label:"100 Scans",          desc:"Atteignez 100 scans au total",             category:"scans",     color:"var(--success)", unlocked: totalScansQR >= 100      },
      { id:"scans_1k",       emoji:"🚀", label:"1 000 Scans",        desc:"Atteignez 1 000 scans",                    category:"scans",     color:"var(--accent)", unlocked: totalScansQR >= 1000     },
      { id:"scans_10k",      emoji:"💫", label:"10 000 Scans",       desc:"Top 1% des utilisateurs",                  category:"scans",     color:"#EC4899", unlocked: totalScansQR >= 10000    },
      { id:"first_ref",      emoji:"🤝", label:"Parrain",            desc:"Validez votre premier parrainage",         category:"referrals", color:"#7B61FF", unlocked: validatedRefs >= 1       },
      { id:"refs_5",         emoji:"🌟", label:"Super Parrain",      desc:"Validez 5 parrainages",                    category:"referrals", color:"#EC4899", unlocked: validatedRefs >= 5       },
      { id:"pro_user",       emoji:"⚡", label:"Utilisateur Pro",    desc:"Passez au plan Pro ou superieur",          category:"plan",      color:"var(--accent)", unlocked: isPro                   },
      { id:"business_user",  emoji:"👑", label:"Business",           desc:"Atteignez le plan Business",               category:"plan",      color:"var(--success)", unlocked: isBiz                   },
      { id:"early_user",     emoji:"🌱", label:"Early User",         desc:"Parmi les premiers utilisateurs",          category:"milestone", color:"var(--success)", unlocked: isEarly                 },
    ]
  }

  function computeLevel() {
    const score = Math.min(Math.round(
      Math.min(totalScansQR / 100, 30)   +
      Math.min(publishedPages * 5, 25)   +
      Math.min(validatedRefs * 5, 20)    +
      (profile?.plan==="business"?15 : profile?.plan==="pro"?10 : profile?.plan==="starter"?5 : 0) +
      Math.min(memberMonths, 10)
    ), 100)
    type LevelDef = { min:number; label:string; color:string; emoji:string; next:number }
    const LEVELS: LevelDef[] = [
      { min:0,  label:"Debutant",      color:"#A8A190", emoji:"🌱", next:15  },
      { min:15, label:"Explorateur",   color:"var(--action)", emoji:"🧭", next:30  },
      { min:30, label:"Createur",      color:"var(--accent)", emoji:"✨", next:50  },
      { min:50, label:"Professionnel", color:"#F97316", emoji:"🔥", next:70  },
      { min:70, label:"Expert",        color:"#7B61FF", emoji:"💎", next:90  },
      { min:90, label:"Legende",       color:"#EC4899", emoji:"👑", next:100 },
    ]
    const current     = [...LEVELS].reverse().find(l => score >= l.min) ?? LEVELS[0]
    const nextIdx     = LEVELS.findIndex(l => l.min === current.min) + 1
    const nextLvl     = nextIdx < LEVELS.length ? LEVELS[nextIdx] : null
    const progressPct = nextLvl
      ? Math.round(((score - current.min) / (nextLvl.min - current.min)) * 100)
      : 100
    return { score, current, nextLvl, progressPct }
  }

  // -- Consommation calculee --------------------------------------------------
  const currentPlan  = profile?.plan || "free"
  const planLimits   = PLAN_CFG[currentPlan]?.limits ?? { pages:1, views:500, qr:1, team:null }
  const nextPlanKey  = PLAN_ORDER[Math.min((PLAN_ORDER as readonly string[]).indexOf(currentPlan)+1, PLAN_ORDER.length-1)]
  const nextPlan     = PLAN_CFG[nextPlanKey]
  // Le quota du plan porte sur les QR ACTIFS (visitables), pas sur le total de
  // pages : on peut créer jusqu'à 300 pages, seuls les actifs consomment un slot.
  const pagesUsagePct  = planLimits.pages  ? Math.min((activeQR   / planLimits.pages)  * 100, 100) : 0
  const viewsUsagePct  = planLimits.views  ? Math.min((totalViews  / planLimits.views)  * 100, 100) : 0
  const isNearPages    = planLimits.pages  && activeQR    >= Math.floor(planLimits.pages  * 0.8)
  const isNearViews    = planLimits.views  && totalViews  >= Math.floor(planLimits.views  * 0.8)
  const isAtLimitPages = planLimits.pages  && activeQR    >= planLimits.pages
  const isAtLimitViews = planLimits.views  && totalViews  >= planLimits.views

  const hasChanges = form.full_name !== formOriginal.full_name
    || form.username !== formOriginal.username
    || form.bio !== formOriginal.bio
    || form.website !== formOriginal.website
  const publicUrl  = form.username ? `https://qrowg.com/@${form.username}` : null

  const planCfg       = PLAN_CFG[profile?.plan || "free"] || PLAN_CFG["free"]
  const PlanIcon      = planCfg.icon
  const pc            = planCfg.color
  const pendingRefs   = referrals.filter(r => r.status === "pending").length
  const validatedRefs = referrals.filter(r => r.status === "validated" || r.status === "rewarded").length
  const expiredRefs   = referrals.filter(r => r.status === "expired").length
  const totalMonths   = referrals.reduce((s, r) => s + (r.reward_months || 0), 0)
  const referralLink  = `https://qrowg.com?ref=${profile?.ref_code || profile?.id?.slice(0, 8) || ""}`
  const filteredRefs  = refFilter === "all" ? referrals
    : referrals.filter(r => refFilter === "validated"
      ? (r.status === "validated" || r.status === "rewarded")
      : r.status === refFilter)
  const memberMonths  = profile ? Math.floor((Date.now() - new Date(profile.created_at).getTime()) / (1000 * 60 * 60 * 24 * 30)) : 0

  const inputStyle: React.CSSProperties = {
    width: "100%", background: SURF2, border: "1px solid rgba(255,255,255,0.08)",
    borderRadius: 9, padding: "10px 13px", color: "#F5F0E8", fontSize: 13,
    outline: "none", boxSizing: "border-box", fontFamily: "DM Sans, sans-serif",
    transition: "border-color 0.15s",
  }

  const labelStyle: React.CSSProperties = {
    color: MUTED, fontSize: 11, display: "block", marginBottom: 5, fontWeight: 500
  }

  function formatDate(iso: string) {
    return new Date(iso).toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" })
  }

  // -- Loading ------------------------------------------------------------------
  if (loading) return (
    <div style={{ minHeight: "100vh", background: "transparent", padding: "28px 28px 48px", fontFamily: "DM Sans, sans-serif" }}>
      <div style={{ maxWidth: 1100, margin: "0 auto" }}>
        {/* Bandeau profil */}
        <div style={{ display: "flex", alignItems: "center", gap: 18, marginBottom: 28 }}>
          <div className="skeleton" style={{ width: 92, height: 92, borderRadius: "50%", flexShrink: 0 }} />
          <div style={{ flex: 1 }}>
            <div className="skeleton" style={{ width: 220, height: 30, marginBottom: 10 }} />
            <div className="skeleton" style={{ width: 300, height: 16 }} />
          </div>
        </div>
        {/* Stat pills */}
        <div style={{ display: "flex", gap: 12, marginBottom: 26, flexWrap: "wrap" }}>
          {[0, 1, 2, 3].map(i => <div key={i} className="skeleton" style={{ width: 150, height: 54, borderRadius: 12 }} />)}
        </div>
        {/* 2 colonnes */}
        <div className="dash-2col" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 18 }}>
          <div className="skeleton" style={{ height: 420, borderRadius: 16 }} />
          <div className="skeleton" style={{ height: 420, borderRadius: 16 }} />
        </div>
      </div>
    </div>
  )

  // -- RENDER -------------------------------------------------------------------
  return (
    <div style={{ minHeight: "100dvh", background: "transparent", fontFamily: "DM Sans, sans-serif", position: "relative", isolation: "isolate" }}>
      <Particles behind />
      <style>{`
        @keyframes spin{to{transform:rotate(360deg)}}
        @keyframes profileFadeIn{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}
        @keyframes slideUp{from{opacity:0;transform:translateX(-50%) translateY(12px)}to{opacity:1;transform:translateX(-50%) translateY(0)}}
        @keyframes pulse{0%,100%{opacity:0.3}50%{opacity:0.7}}
        @keyframes heroFloat1{0%,100%{transform:translate(0,0) scale(1)}50%{transform:translate(40px,30px) scale(1.12)}}
        @keyframes heroFloat2{0%,100%{transform:translate(0,0) scale(1)}50%{transform:translate(-50px,20px) scale(1.08)}}
        @keyframes heroGlow{0%,100%{opacity:0.5}50%{opacity:0.9}}
        @keyframes heroIn{from{opacity:0;transform:translateY(16px) scale(.985)}to{opacity:1;transform:translateY(0) scale(1)}}
        @keyframes ringPulse{0%{box-shadow:0 0 0 0 color-mix(in srgb, var(--accent) 45%, transparent)}70%{box-shadow:0 0 0 14px color-mix(in srgb, var(--accent) 0%, transparent)}100%{box-shadow:0 0 0 0 color-mix(in srgb, var(--accent) 0%, transparent)}}
        @keyframes badgeShine{0%{background-position:-120% 0}60%,100%{background-position:220% 0}}
        .hero-in{animation:heroIn .6s cubic-bezier(.2,.8,.2,1) backwards}
        .hero-tile{transition:transform .2s cubic-bezier(.2,.8,.2,1), border-color .2s, background .2s}
        .hero-tile:hover{transform:translateY(-3px);border-color:color-mix(in srgb, var(--accent) 35%, transparent)!important}
        input:focus,textarea:focus,select:focus{border-color:color-mix(in srgb, var(--accent) 40%, transparent)!important}
        .section-card{animation:profileFadeIn 0.3s ease}
        /* Carte "prochaine etape" masquee sur mobile (redondante avec le reste du profil) */
        @media (max-width: 760px){ .next-step-card{ display:none !important } }
        * { box-sizing: border-box }
      `}</style>

      {/* Tooltip stats */}
      {statsTooltip && (
        <div style={{ position:"fixed", bottom:70, left:"50%", transform:"translateX(-50%)", zIndex:9998, padding:"7px 14px", background:"rgba(20,18,12,0.95)", border:"1px solid color-mix(in srgb, var(--accent) 20%, transparent)", borderRadius:8, color:"#A8A190", fontSize:11, whiteSpace:"nowrap" as const, backdropFilter:"blur(8px)", pointerEvents:"none" }}>
          {statsTooltip}
        </div>
      )}

      {/* Notifications : toast global unifié (voir components/Toast). */}


      {/* ====================== HERO — centre de contrôle ====================== */}
      <div className="rpad" style={{ position: "relative", overflow: "hidden", padding: "30px 28px 20px" }}>
        {/* Couches de fond animées (profondeur : mesh + glow à la couleur d'accent).
            Masque vertical : les halos s'estompent vers le haut et le bas pour
            éviter toute arête nette (démarcation) à la limite du hero. */}
        <div aria-hidden style={{ position: "absolute", inset: 0, pointerEvents: "none", overflow: "hidden", maskImage: "linear-gradient(to bottom, transparent 0%, #000 14%, #000 78%, transparent 100%)", WebkitMaskImage: "linear-gradient(to bottom, transparent 0%, #000 14%, #000 78%, transparent 100%)" }}>
          <div style={{ position: "absolute", top: -130, right: -50, width: 440, height: 440, borderRadius: "50%", background: "radial-gradient(circle, color-mix(in srgb, var(--accent) 22%, transparent), transparent 65%)", filter: "blur(44px)", animation: "heroFloat1 22s ease-in-out infinite, heroGlow 9s ease-in-out infinite" }}/>
          <div style={{ position: "absolute", bottom: -170, left: -50, width: 380, height: 380, borderRadius: "50%", background: "radial-gradient(circle, color-mix(in srgb, var(--accent) 13%, transparent), transparent 65%)", filter: "blur(50px)", animation: "heroFloat2 28s ease-in-out infinite, heroGlow 11s ease-in-out infinite" }}/>
          <div style={{ position: "absolute", inset: 0, background: "radial-gradient(720px 300px at 62% -10%, rgba(255,255,255,0.035), transparent 60%)" }}/>
        </div>

        <div style={{ maxWidth: 1100, margin: "0 auto", position: "relative", zIndex: 1 }}>

          {/* Ligne 1 : avatar + identite compacte (avatar aligne en haut, pas de vide) */}
          <div className="hero-in" style={{ display: "flex", alignItems: "flex-start", gap: 13, marginBottom: 12 }}>
            <div style={{ position: "relative", flexShrink: 0 }}>
              <div style={{ width: 62, height: 62, borderRadius: "50%", background: profile?.avatar_url ? "transparent" : `linear-gradient(135deg,${pc},color-mix(in srgb, var(--accent) 55%, #000))`, border: `2px solid ${pc}66`, overflow: "hidden", display: "flex", alignItems: "center", justifyContent: "center", animation: "ringPulse 3.6s ease-in-out infinite" }}>
                {profile?.avatar_url
                  ? <img src={profile.avatar_url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }}/>
                  : <span style={{ fontSize: 26, fontWeight: 700, color: "#080808", fontFamily: "Fraunces, serif" }}>{(form.full_name || profile?.email || "?")[0]?.toUpperCase()}</span>}
              </div>
              <button onClick={() => fileRef.current?.click()} disabled={uploadingAvatar} title="Changer la photo"
                style={{ position: "absolute", bottom: 0, right: 0, width: 24, height: 24, borderRadius: "50%", background: G, border: "2px solid #0A0906", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", boxShadow: "0 2px 10px rgba(0,0,0,0.5)" }}>
                {uploadingAvatar
                  ? <div style={{ width: 9, height: 9, border: "1.5px solid #080808", borderTopColor: "transparent", borderRadius: "50%", animation: "spin 0.6s linear infinite" }}/>
                  : <Camera size={11} color="#080808"/>}
              </button>
              <input ref={fileRef} type="file" accept="image/*" style={{ display: "none" }} onChange={e => { const f = e.target.files?.[0]; if (f) handleAvatarFile(f); e.target.value="" }}/>
            </div>

            <div style={{ minWidth: 0, flex: 1 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4, flexWrap: "wrap" }}>
                <h1 style={{ fontFamily: "Fraunces, serif", fontSize: "clamp(21px,3vw,30px)", color: "#F8F4EC", fontWeight: 700, margin: 0, lineHeight: 1.05, letterSpacing: "-0.3px" }}>
                  Bonjour, {(form.full_name || "").trim().split(" ")[0] || profile?.email?.split("@")[0] || "vous"}
                </h1>
                <span style={{ position: "relative", overflow: "hidden", display: "inline-flex", alignItems: "center", gap: 5, background: currentPlan === "free" ? "rgba(255,255,255,0.06)" : `linear-gradient(135deg, ${pc}33, ${pc}1a)`, border: `1px solid ${pc}55`, borderRadius: 999, padding: "3px 10px" }}>
                  <PlanIcon size={11} color={pc}/>
                  <span style={{ color: pc, fontSize: 10.5, fontWeight: 800 }}>{planCfg.label}</span>
                  {currentPlan !== "free" && <span aria-hidden style={{ position: "absolute", inset: 0, background: "linear-gradient(110deg, transparent 30%, rgba(255,255,255,0.45) 50%, transparent 70%)", backgroundSize: "220% 100%", animation: "badgeShine 4.5s ease-in-out infinite" }}/>}
                </span>
              </div>
              <p style={{ color: "#C9C3B6", fontSize: 12.5, margin: "0 0 3px", lineHeight: 1.4 }}>
                {(profile?.total_scans || 0) > 0
                  ? <><strong style={{ color: pc }}>{(profile?.total_scans || 0).toLocaleString("fr-FR")} scans</strong> — continuez sur votre lancée.</>
                  : totalPages > 0
                  ? <><strong style={{ color: G }}>{totalPages} page{totalPages > 1 ? "s" : ""}</strong> prête{totalPages > 1 ? "s" : ""} — partagez pour décoller.</>
                  : <>Créez votre première page pour démarrer.</>}
              </p>
              <p style={{ color: MUTED, fontSize: 11, margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {profile?.email}{form.username ? ` · @${form.username}` : ""} · Membre depuis {memberMonths > 0 ? `${memberMonths} mois` : "auj."}
              </p>
            </div>
          </div>

          {/* Ligne 2 : actions sur une seule ligne, pleine largeur */}
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 14 }}>
            <a href="/dashboard/avatar"
              style={{ display: "flex", alignItems: "center", gap: 6, padding: "9px 15px", background: `linear-gradient(90deg,${G},color-mix(in srgb, var(--accent) 75%, #000))`, border: "none", borderRadius: 10, color: "#080808", fontSize: 12.5, fontWeight: 800, cursor: "pointer", textDecoration: "none", boxShadow: `0 6px 20px ${pc}33` }}>
              <QrCode size={13}/> Créer mon avatar
            </a>
            {publicUrl && (
              <a href={publicUrl} target="_blank" rel="noopener noreferrer"
                style={{ display: "flex", alignItems: "center", gap: 6, padding: "9px 15px", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 10, color: "#F5F0E8", fontSize: 12.5, fontWeight: 600, textDecoration: "none" }}>
                <Globe size={13}/> Voir ma page
              </a>
            )}
            {publicUrl && (
              <button onClick={() => { navigator.clipboard?.writeText(publicUrl); showToast("Lien copié", "ok") }}
                style={{ display: "flex", alignItems: "center", gap: 6, padding: "9px 15px", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 10, color: "#F5F0E8", fontSize: 12.5, fontWeight: 600, cursor: "pointer" }}>
                <Link2 size={13}/> Copier
              </button>
            )}
            <button onClick={signOut} title="Se déconnecter" aria-label="Se déconnecter"
              style={{ display: "flex", alignItems: "center", justifyContent: "center", width: 40, padding: "9px", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 10, color: MUTED, cursor: "pointer", marginLeft: "auto" }}>
              <LogOut size={14}/>
            </button>
          </div>

          {/* Ligne 2 : tuiles "ownership" (compteurs animés) + jauges en verre */}
          <div className="dash-2col" style={{ display: "grid", gridTemplateColumns: "1.5fr 1fr", gap: 14 }}>

            {/* Tuiles stats sur UNE ligne (#11) : libelles courts + padding resserre pour tenir sur mobile */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 7 }}>
              {([
                { icon: Calendar, label: "Jours", value: profile ? Math.max(0, Math.floor((Date.now() - new Date(profile.created_at).getTime()) / 86400000)) : 0, color: pc },
                { icon: FileEdit, label: "Pages", value: totalPages, color: "var(--action)" },
                { icon: QrCode, label: "QR", value: activeQR, color: "var(--success)" },
                { icon: TrendingUp, label: "Scans", value: profile?.total_scans || 0, color: "#F97316" },
              ] as const).map((s, i) => (
                <div key={i} className="hero-in hero-tile" style={{ animationDelay: `${120 + i * 80}ms`, background: "rgba(255,255,255,0.04)", backdropFilter: "blur(10px)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 12, padding: "9px 7px", textAlign: "center" as const }}>
                  <span style={{ display: "inline-flex", width: 24, height: 24, borderRadius: 7, background: s.color + "1c", alignItems: "center", justifyContent: "center", marginBottom: 5 }}><s.icon size={12} color={s.color}/></span>
                  <p style={{ color: "#F8F4EC", fontSize: 20, fontWeight: 700, margin: 0, fontFamily: "Fraunces, serif", lineHeight: 1 }}><CountUp value={s.value}/></p>
                  <p style={{ color: MUTED, fontSize: 10.5, margin: "2px 0 0" }}>{s.label}</p>
                </div>
              ))}
            </div>

            {/* Jauges utilisation (verre) */}
            <div className="hero-in" style={{ animationDelay: "200ms", background: "rgba(255,255,255,0.04)", backdropFilter: "blur(10px)", border: `1px solid ${pc}2e`, borderRadius: 16, padding: "13px 16px", display: "flex", flexDirection: "column", justifyContent: "center" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
                <span style={{ color: "#F8F4EC", fontSize: 12.5, fontWeight: 700 }}>Mon utilisation</span>
                {profile?.plan !== "business" && (
                  <a href="/upgrade" style={{ display: "inline-flex", alignItems: "center", gap: 4, color: G, fontSize: 11, fontWeight: 700, textDecoration: "none" }}>
                    <Activity size={12}/> Améliorer
                  </a>
                )}
              </div>
              {([
                { label: "QR actifs", used: activeQR, limit: planLimits.pages, pct: pagesUsagePct, near: isAtLimitPages },
                { label: "Vues ce mois", used: totalViews, limit: planLimits.views, pct: viewsUsagePct, near: isAtLimitViews },
              ] as const).map((g, i) => (
                <div key={i} style={{ marginBottom: i === 0 ? 11 : 0 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 5 }}>
                    <span style={{ color: "#C9C3B6", fontSize: 11, fontWeight: 500 }}>{g.label}</span>
                    <span style={{ color: g.near ? "var(--danger)" : "#F5F0E8", fontSize: 11, fontWeight: 700 }}>
                      {(g.used || 0).toLocaleString("fr-FR")}<span style={{ color: MUTED, fontWeight: 400 }}> / {g.limit == null ? "∞" : g.limit.toLocaleString("fr-FR")}</span>
                    </span>
                  </div>
                  <div style={{ height: 7, borderRadius: 4, background: "rgba(255,255,255,0.08)", overflow: "hidden" }}>
                    <div style={{ height: "100%", width: g.limit == null ? "12%" : `${Math.max(3, g.pct)}%`, borderRadius: 4, background: g.near ? "linear-gradient(90deg,var(--danger),#F97316)" : `linear-gradient(90deg,${pc},color-mix(in srgb, var(--accent) 70%, #000))`, transition: "width .8s cubic-bezier(.2,.8,.2,1)" }}/>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* -- Onglets profil ------------------------------------------------------ */}
      <div className="qr-scroll rpad" style={{ maxWidth: 1100, margin: "0 auto", padding: "4px 28px 0", display: "flex", gap: 6, overflowX: "auto" }}>
        {([
          ["identite", "Identité", User],
          ["abonnement", "Abonnement", CreditCard],
          ["securite", "Sécurité", Shield],
          ["donnees", "Données", Download],
          ["preferences", "Préférences", Settings],
          ["parrainage", "Parrainage", Gift],
        ] as const).map(([k, label, Icon]) => {
          const on = ptab === k
          return (
            <button key={k} type="button" onClick={() => setPtab(k)}
              style={{ display: "flex", alignItems: "center", gap: 7, padding: "9px 15px", borderRadius: 10, cursor: "pointer", whiteSpace: "nowrap" as const, flexShrink: 0,
                background: on ? "color-mix(in srgb, var(--accent) 14%, transparent)" : "rgba(255,255,255,0.03)",
                border: `1px solid ${on ? "color-mix(in srgb, var(--accent) 40%, transparent)" : "rgba(255,255,255,0.07)"}`,
                color: on ? G : MUTED, fontSize: 13, fontWeight: on ? 700 : 500 }}>
              <Icon size={15} /> {label}
            </button>
          )
        })}
      </div>

      {/* -- Assistant : profil incomplet (prochaine étape) --------------------- */}
      {(() => {
        const m =
          !profile?.avatar_url ? { icon: "🎨", text: <>Composez votre <strong style={{ color: "#F5F0E8" }}>avatar QR-art</strong> pour vous démarquer.</>, label: "Composer", href: "/dashboard/avatar" as string | null, onClick: null as (() => void) | null }
          : !profile?.username ? { icon: "🔖", text: <>Choisissez votre <strong style={{ color: "#F5F0E8" }}>identifiant public</strong> (qrowg.com/@vous).</>, href: null, onClick: () => setPtab("identite"), label: "Définir" }
          : !profile?.bio ? { icon: "✍️", text: <>Ajoutez une <strong style={{ color: "#F5F0E8" }}>bio</strong> pour vous présenter en quelques mots.</>, href: null, onClick: () => setPtab("identite"), label: "Ajouter" }
          : !profile?.website ? { icon: "🔗", text: <>Ajoutez votre <strong style={{ color: "#F5F0E8" }}>site web</strong> ou lien principal.</>, href: null, onClick: () => setPtab("identite"), label: "Ajouter" }
          : null
        if (!m) return null
        return (
          <div className="section-card next-step-card" style={{ maxWidth: 1100, margin: "14px auto 0", padding: "0 28px" }}>
            <NextStepCard icon={m.icon} ctaLabel={m.label} href={m.href ?? undefined} onClick={m.onClick ?? undefined}>{m.text}</NextStepCard>
          </div>
        )
      })()}

      {/* -- Corps en 2 colonnes ------------------------------------------------ */}
      <div className="dash-pad" style={{ maxWidth: 1100, margin: "0 auto", padding: "18px 28px 48px", display: "flex", flexDirection: "column", gap: 18 }}>

        {/* == COLONNE GAUCHE ================================================== */}
        <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>

          {/* 1. IDENTITE */}
          {ptab === "identite" && (
          <SectionCard title="Identite" icon={Settings} color={G}
            action={
              <div style={{ display:"flex", alignItems:"center", gap:6 }}>
                {profile?.plan === "free" && memberMonths <= 6 && (
                  <span style={{ background:"rgba(57,255,143,0.1)", border:"1px solid rgba(57,255,143,0.2)", borderRadius:20, padding:"2px 8px", fontSize:9, color:"var(--success)", fontWeight:700 }}>
                    Early User
                  </span>
                )}
                <span style={{ background:pc+"15", border:`1px solid ${pc}30`, borderRadius:20, padding:"2px 9px", fontSize:9, color:pc, fontWeight:700 }}>
                  {planCfg.label}
                </span>
              </div>
            }>
            <div style={{ display:"flex", flexDirection:"column", gap:14 }}>

              {/* Avatar premium */}
              <div style={{ display:"flex", alignItems:"center", gap:14, padding:"14px", background:"#0F0E0B", borderRadius:12, border:"1px solid rgba(255,255,255,0.06)" }}>
                {/* Avatar */}
                <div style={{ position:"relative", flexShrink:0 }}>
                  <div style={{ width:72, height:72, borderRadius:"50%", background:profile?.avatar_url?"transparent":`linear-gradient(135deg,${pc},${pc}80)`, border:`2px solid ${pc}40`, overflow:"hidden", display:"flex", alignItems:"center", justifyContent:"center", boxShadow:`0 0 20px ${pc}15` }}>
                    {uploadingAvatar ? (
                      <div style={{ width:22, height:22, border:`2px solid ${pc}30`, borderTopColor:pc, borderRadius:"50%", animation:"spin 0.7s linear infinite" }}/>
                    ) : profile?.avatar_url ? (
                      <img src={profile.avatar_url} alt="" style={{ width:"100%", height:"100%", objectFit:"cover" }}/>
                    ) : (
                      <span style={{ fontSize:26, fontWeight:700, color:"#080808", fontFamily:"Fraunces, serif" }}>
                        {(form.full_name || profile?.email || "?")[0]?.toUpperCase()}
                      </span>
                    )}
                  </div>
                  {/* Bouton camera */}
                  <button onClick={() => fileRef.current?.click()} disabled={uploadingAvatar}
                    style={{ position:"absolute", bottom:0, right:0, width:24, height:24, borderRadius:"50%", background:G, border:"2px solid #080808", display:"flex", alignItems:"center", justifyContent:"center", cursor:"pointer", boxShadow:"0 2px 8px rgba(0,0,0,0.4)" }}>
                    <Camera size={10} color="#080808"/>
                  </button>
                  <input ref={fileRef} type="file" accept="image/*" style={{ display:"none" }}
                    onChange={e => { const f = e.target.files?.[0]; if (f) handleAvatarFile(f); e.target.value="" }}/>
                </div>
                {/* Infos preview + actions */}
                <div style={{ flex:1, minWidth:0 }}>
                  <p style={{ color:"#F5F0E8", fontSize:14, fontWeight:700, margin:"0 0 2px", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" as const, fontFamily:"Fraunces, serif" }}>
                    {form.full_name || "Sans nom"}
                  </p>
                  {form.username && (
                    <p style={{ color:"#A8A190", fontSize:12, margin:"0 0 8px", fontFamily:"monospace" }}>@{form.username}</p>
                  )}
                  <div style={{ display:"flex", gap:6 }}>
                    <button onClick={() => fileRef.current?.click()}
                      style={{ display:"flex", alignItems:"center", gap:5, padding:"5px 10px", background:"color-mix(in srgb, var(--accent) 8%, transparent)", border:"1px solid color-mix(in srgb, var(--accent) 20%, transparent)", borderRadius:7, color:G, fontSize:11, cursor:"pointer" }}>
                      <Camera size={11}/> Changer
                    </button>
                    {/* Action secondaire discrete (#11) : pas de rouge (reversible), moins prioritaire que "Changer" */}
                    {profile?.avatar_url && (
                      <button onClick={deleteAvatar} disabled={deletingAvatar} title="Retirer la photo de profil"
                        style={{ display:"flex", alignItems:"center", gap:4, padding:"5px 8px", background:"none", border:"none", color:"#A8A190", fontSize:11, cursor:"pointer" }}>
                        <ImageOff size={11}/> Retirer
                      </button>
                    )}
                  </div>
                  <p style={{ color:"#A8A190", fontSize:9, margin:"6px 0 0" }}>PNG, JPG, WEBP -- max 5 Mo -- recadrage automatique 400x400</p>
                </div>
              </div>

              {/* Modal crop */}
              {cropMode && cropSrc && (
                <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.85)", display:"flex", alignItems:"center", justifyContent:"center", zIndex:2000, padding:24 }}
                  onClick={() => { setCropMode(false); setCropSrc(null) }}>
                  <div style={{ background:"#111009", border:"1px solid color-mix(in srgb, var(--accent) 20%, transparent)", borderRadius:16, padding:24, maxWidth:440, width:"100%" }}
                    onClick={e => e.stopPropagation()}>
                    <p style={{ color:"#F5F0E8", fontSize:15, fontWeight:700, margin:"0 0 14px" }}>Apercu de l'avatar</p>
                    <div style={{ display:"flex", alignItems:"center", justifyContent:"center", gap:16, marginBottom:18 }}>
                      <img src={cropSrc} alt="preview" style={{ width:120, height:120, objectFit:"cover", borderRadius:"50%", border:"2px solid color-mix(in srgb, var(--accent) 30%, transparent)" }}/>
                      <div>
                        <p style={{ color:"#A8A190", fontSize:11, margin:"0 0 6px" }}>L'image sera recadree<br/>en carre 400x400 px.</p>
                        <p style={{ color:"#A8A190", fontSize:10, margin:0 }}>Format: JPEG 92%</p>
                      </div>
                    </div>
                    <div style={{ display:"flex", gap:8 }}>
                      <button onClick={() => { setCropMode(false); setCropSrc(null) }}
                        style={{ flex:1, padding:"10px", background:"rgba(255,255,255,0.04)", border:"1px solid rgba(255,255,255,0.08)", borderRadius:9, color:"#A8A190", fontSize:13, cursor:"pointer" }}>
                        Annuler
                      </button>
                      <button onClick={() => uploadAvatar(cropSrc)}
                        style={{ flex:2, padding:"10px", background:"linear-gradient(90deg,var(--accent),color-mix(in srgb, var(--accent) 75%, #000))", border:"none", borderRadius:9, color:"#080808", fontSize:13, fontWeight:700, cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", gap:7 }}>
                        <Camera size={13}/> Utiliser cette photo
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Champs identité — grille 2 colonnes pour limiter la hauteur */}
              <div className="rcols-2" style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:13 }}>
              {/* Nom complet */}
              <div>
                <label style={{ color:"#A8A190", fontSize:11, display:"block", marginBottom:5, fontWeight:500 }}>Nom complet</label>
                <input value={form.full_name} onChange={e => setForm(f => ({ ...f, full_name: e.target.value }))}
                  placeholder="Jean Dupont"
                  style={{ width:"100%", background:"#0F0E0B", border:"1px solid rgba(255,255,255,0.08)", borderRadius:9, padding:"10px 13px", color:"#F5F0E8", fontSize:13, outline:"none", boxSizing:"border-box" as const }}/>
              </div>

              {/* Username avec validation live */}
              <div>
                <label style={{ color:"#A8A190", fontSize:11, display:"block", marginBottom:5, fontWeight:500 }}>Nom d'utilisateur</label>
                <div style={{ position:"relative" }}>
                  <span style={{ position:"absolute", left:12, top:"50%", transform:"translateY(-50%)", color:"#A8A190", fontSize:13 }}>@</span>
                  <input value={form.username}
                    onChange={e => handleUsernameChange(e.target.value)}
                    placeholder="jean-dupont"
                    style={{ width:"100%", background:"#0F0E0B", border:`1px solid ${usernameStatus==="ok"?"rgba(57,255,143,0.3)":usernameStatus==="taken"||usernameStatus==="invalid"?"rgba(255,107,107,0.3)":"rgba(255,255,255,0.08)"}`, borderRadius:9, padding:"10px 36px 10px 26px", color:"#F5F0E8", fontSize:13, outline:"none", boxSizing:"border-box" as const }}/>
                  {/* Icone statut */}
                  <div style={{ position:"absolute", right:11, top:"50%", transform:"translateY(-50%)" }}>
                    {usernameStatus==="checking" && <div style={{ width:13, height:13, border:"1.5px solid color-mix(in srgb, var(--accent) 30%, transparent)", borderTopColor:"var(--accent)", borderRadius:"50%", animation:"spin 0.7s linear infinite" }}/>}
                    {usernameStatus==="ok"      && <UserCheck size={14} color="var(--success)"/>}
                    {(usernameStatus==="taken"||usernameStatus==="invalid") && <UserX size={14} color="var(--danger)"/>}
                  </div>
                </div>
                {/* Message validation */}
                {usernameMsg && (
                  <p style={{ color:usernameStatus==="ok"?"var(--success)":usernameStatus==="checking"?"#A8A190":"var(--danger)", fontSize:10, margin:"4px 0 0", display:"flex", alignItems:"center", gap:4 }}>
                    {usernameMsg}
                  </p>
                )}
                <p style={{ color:"#A8A190", fontSize:10, margin:"3px 0 0" }}>3-30 caracteres -- lettres, chiffres, _ et -</p>
              </div>

              {/* URL publique */}
              {publicUrl && (
                <div style={{ gridColumn:"1 / -1", display:"flex", alignItems:"center", gap:7, padding:"9px 12px", background:"color-mix(in srgb, var(--accent) 5%, transparent)", border:"1px solid color-mix(in srgb, var(--accent) 15%, transparent)", borderRadius:9 }}>
                  <Link size={12} color={G} style={{ flexShrink:0 }}/>
                  <span style={{ flex:1, color:G, fontSize:11, fontFamily:"monospace", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" as const }}>
                    {publicUrl}
                  </span>
                  <button onClick={copyPublicUrl}
                    style={{ width:26, height:26, background:"none", border:"none", cursor:"pointer", color:copiedUrl?"var(--success)":G, display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
                    {copiedUrl ? <Check size={12}/> : <Copy size={12}/>}
                  </button>
                  <a href={publicUrl} target="_blank" rel="noopener noreferrer"
                    style={{ width:26, height:26, background:"none", border:"none", display:"flex", alignItems:"center", justifyContent:"center", color:"#A8A190", flexShrink:0 }}>
                    <ExternalLink size={12}/>
                  </a>
                </div>
              )}

              {/* Bio */}
              <div>
                <label style={{ color:"#A8A190", fontSize:11, display:"block", marginBottom:5, fontWeight:500 }}>Bio</label>
                <textarea value={form.bio} onChange={e => setForm(f => ({ ...f, bio: e.target.value }))}
                  placeholder="Decris-toi en quelques mots..." rows={2}
                  style={{ width:"100%", background:"#0F0E0B", border:"1px solid rgba(255,255,255,0.08)", borderRadius:9, padding:"10px 13px", color:"#F5F0E8", fontSize:13, outline:"none", boxSizing:"border-box" as const, resize:"vertical" as const, lineHeight:1.6 }}/>
                <p style={{ color:"#A8A190", fontSize:10, margin:"3px 0 0" }}>{form.bio.length}/160</p>
              </div>

              {/* Site web */}
              <div>
                <label style={{ color:"#A8A190", fontSize:11, display:"block", marginBottom:5, fontWeight:500 }}>Site web</label>
                <input value={form.website} onChange={e => setForm(f => ({ ...f, website: e.target.value }))}
                  placeholder="https://mon-site.com"
                  style={{ width:"100%", background:"#0F0E0B", border:"1px solid rgba(255,255,255,0.08)", borderRadius:9, padding:"10px 13px", color:"#F5F0E8", fontSize:13, outline:"none", boxSizing:"border-box" as const }}/>
              </div>

              {/* Bouton save */}
              <button onClick={saveProfile}
                disabled={saving || !hasChanges || usernameStatus==="taken" || usernameStatus==="invalid" || usernameStatus==="checking"}
                style={{ gridColumn:"1 / -1", display:"flex", alignItems:"center", justifyContent:"center", gap:7, background:saved?"rgba(57,255,143,0.1)":hasChanges?"linear-gradient(90deg,var(--accent),color-mix(in srgb, var(--accent) 75%, #000))":"rgba(255,255,255,0.04)", border:saved?"1px solid rgba(57,255,143,0.3)":"none", borderRadius:9, padding:"11px", color:saved?"var(--success)":hasChanges?"#080808":"#A8A190", fontSize:13, fontWeight:700, cursor:saving||!hasChanges||usernameStatus==="taken"||usernameStatus==="invalid"||usernameStatus==="checking"?"not-allowed":"pointer", transition:"all 0.2s", opacity:saving?0.7:1 }}>
                {saved ? <><Check size={13}/> Sauvegarde !</>
                  : saving ? "Sauvegarde..."
                  : !hasChanges ? "Aucune modification"
                  : <><Save size={13}/> Sauvegarder les modifications</>}
              </button>
              </div>
            </div>
          </SectionCard>
          )}


          {/* 2. ACTIVITE RECENTE */}
          {ptab === "identite" && (
          <SectionCard title="Activite recente" icon={Clock} color="var(--action)"
            action={
              <a href="/dashboard/analytics" style={{ color:MUTED, fontSize:11, display:"flex", alignItems:"center", gap:3, textDecoration:"none" }}>
                Tout voir <ChevronRight size={12}/>
              </a>
            }>
            {(() => {
              // Fusionner activity_logs et timeline reconstituee
              const rawEvts = activityLog.length > 0 ? activityLog : buildTimelineFromData()
              const filtered = filterEvents(rawEvts)
              const paginated = filtered.slice(0, (activityPage + 1) * ACTIVITY_PAGE_SIZE)
              const hasMore  = filtered.length > paginated.length

              // Grouper par periode
              const groups: Record<string, ActivityEvent[]> = {}
              for (const evt of paginated) {
                const label = groupLabel(evt.created_at)
                if (!groups[label]) groups[label] = []
                groups[label].push(evt)
              }
              const GROUP_ORDER = ["Aujourd'hui","Hier","Cette semaine","Ce mois","Plus ancien"]
              const sortedGroups = GROUP_ORDER.filter(g => groups[g])

              return (
                <div style={{ display:"flex", flexDirection:"column", gap:14 }}>

                  {/* Filtres */}
                  <div style={{ display:"flex", gap:5, overflowX:"auto" }}>
                    {ACTIVITY_FILTER_OPTS.map(f => (
                      <button key={f.id} type="button" onClick={() => { setActivityFilter(f.id); setActivityPage(0) }}
                        style={{ display:"inline-flex", alignItems:"center", gap:4, padding:"4px 10px", background:activityFilter===f.id?"color-mix(in srgb, var(--accent) 12%, transparent)":"rgba(255,255,255,0.04)", border:`1px solid ${activityFilter===f.id?"color-mix(in srgb, var(--accent) 35%, transparent)":"rgba(255,255,255,0.08)"}`, borderRadius:20, color:activityFilter===f.id?G:MUTED, fontSize:10, fontWeight:activityFilter===f.id?700:400, cursor:"pointer", whiteSpace:"nowrap" as const, flexShrink:0 }}>
                        {f.label}
                        <span style={{ background:activityFilter===f.id?"color-mix(in srgb, var(--accent) 20%, transparent)":"rgba(255,255,255,0.06)", borderRadius:10, padding:"0px 5px", fontSize:9 }}>
                          {f.id==="all" ? rawEvts.length
                            : f.id==="pages" ? rawEvts.filter(e=>["page_created","page_published","page_updated"].includes(e.event_type)).length
                            : f.id==="qr"    ? rawEvts.filter(e=>["qr_created","qr_customized","qr_scanned","qr_downloaded"].includes(e.event_type)).length
                            : rawEvts.filter(e=>["plan_changed","referral_validated","profile_updated","api_key_created","export_done"].includes(e.event_type)).length
                          }
                        </span>
                      </button>
                    ))}
                  </div>

                  {/* Loading skeleton */}
                  {activityLoading ? (
                    <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
                      {[...Array(5)].map((_,i) => (
                        <div key={i} style={{ display:"flex", gap:10, alignItems:"flex-start", padding:"10px 0" }}>
                          <div style={{ width:32, height:32, borderRadius:9, background:"rgba(255,255,255,0.04)", flexShrink:0, animation:"pulse 1.4s ease-in-out infinite", animationDelay:`${i*0.1}s` }}/>
                          <div style={{ flex:1, display:"flex", flexDirection:"column", gap:5 }}>
                            <div style={{ height:12, width:`${60+i*8}%`, borderRadius:4, background:"rgba(255,255,255,0.04)", animation:"pulse 1.4s ease-in-out infinite", animationDelay:`${i*0.1+0.05}s` }}/>
                            <div style={{ height:10, width:"40%", borderRadius:4, background:"rgba(255,255,255,0.03)", animation:"pulse 1.4s ease-in-out infinite", animationDelay:`${i*0.1+0.1}s` }}/>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : filtered.length === 0 ? (
                    /* Empty state */
                    <div style={{ textAlign:"center" as const, padding:"24px 0" }}>
                      <Clock size={28} color={MUTED} style={{ marginBottom:10 }}/>
                      <p style={{ color:"#F5F0E8", fontSize:13, fontWeight:600, margin:"0 0 4px" }}>Aucune activite</p>
                      <p style={{ color:MUTED, fontSize:11, margin:0, lineHeight:1.5 }}>
                        {activityFilter === "all"
                          ? "Vos actions apparaitront ici au fur et a mesure"
                          : "Aucun evenement de ce type"}
                      </p>
                    </div>
                  ) : (
                    /* Timeline */
                    <div style={{ display:"flex", flexDirection:"column", gap:16 }}>
                      {sortedGroups.map(groupName => (
                        <div key={groupName}>
                          {/* Label de groupe */}
                          <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:10 }}>
                            <span style={{ color:MUTED, fontSize:9, fontWeight:700, textTransform:"uppercase" as const, letterSpacing:1.2, whiteSpace:"nowrap" as const }}>
                              {groupName}
                            </span>
                            <div style={{ flex:1, height:1, background:"rgba(255,255,255,0.05)" }}/>
                          </div>

                          {/* Events du groupe */}
                          <div style={{ display:"flex", flexDirection:"column", gap:1 }}>
                            {groups[groupName].map((evt, idx) => {
                              const cfg = ACTIVITY_CFG[evt.event_type] || ACTIVITY_CFG.page_updated
                              const Icon = cfg.icon
                              const isLast = idx === groups[groupName].length - 1
                              const href = evt.entity_type === "page"
                                ? `/dashboard/builder/${evt.entity_id}`
                                : evt.entity_type === "qr_code"
                                ? `/dashboard/qr-codes`
                                : null
                              return (
                                <div key={evt.id} style={{ display:"flex", gap:12, position:"relative" as const }}>
                                  {/* Ligne de timeline */}
                                  {!isLast && (
                                    <div style={{ position:"absolute", left:15, top:34, bottom:-1, width:1, background:"rgba(255,255,255,0.06)", zIndex:0 }}/>
                                  )}
                                  {/* Icone */}
                                  <div style={{ width:32, height:32, borderRadius:9, background:cfg.bg, border:`1px solid ${cfg.color}25`, display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0, zIndex:1, position:"relative" as const }}>
                                    <Icon size={14} color={cfg.color}/>
                                  </div>
                                  {/* Contenu */}
                                  <div style={{ flex:1, paddingTop:6, paddingBottom:isLast?0:10 }}>
                                    <div style={{ display:"flex", alignItems:"flex-start", justifyContent:"space-between", gap:8 }}>
                                      <div style={{ flex:1, minWidth:0 }}>
                                        <p style={{ color:"#F5F0E8", fontSize:12, fontWeight:600, margin:"0 0 2px", display:"flex", alignItems:"center", gap:6 }}>
                                          {evt.title}
                                          {evt.entity_label && (
                                            <span style={{ color:cfg.color, fontSize:10, fontWeight:400, background:cfg.bg, padding:"1px 6px", borderRadius:4, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" as const, maxWidth:120 }}>
                                              {evt.entity_label}
                                            </span>
                                          )}
                                        </p>
                                        {evt.description && (
                                          <p style={{ color:MUTED, fontSize:11, margin:0, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" as const }}>{evt.description}</p>
                                        )}
                                      </div>
                                      <div style={{ display:"flex", alignItems:"center", gap:6, flexShrink:0 }}>
                                        <span style={{ color:MUTED, fontSize:9, whiteSpace:"nowrap" as const }}>{timeAgo(evt.created_at)}</span>
                                        {href && (
                                          <a href={href} style={{ color:MUTED, display:"flex", alignItems:"center" }}>
                                            <ExternalLink size={10}/>
                                          </a>
                                        )}
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              )
                            })}
                          </div>
                        </div>
                      ))}

                      {/* Pagination */}
                      {hasMore && (
                        <button type="button" onClick={() => setActivityPage(p => p + 1)}
                          style={{ display:"flex", alignItems:"center", justifyContent:"center", gap:6, padding:"9px", background:"rgba(255,255,255,0.03)", border:"1px solid rgba(255,255,255,0.07)", borderRadius:9, color:MUTED, fontSize:11, cursor:"pointer" }}>
                          Voir plus ({filtered.length - paginated.length} evenements)
                        </button>
                      )}
                    </div>
                  )}
                </div>
              )
            })()}
          </SectionCard>
          )}


          {/* 3. PARRAINAGE */}
          {ptab === "parrainage" && (
          <SectionCard title="Programme de parrainage" icon={Gift} color="#EC4899">
            <div style={{ display:"flex", flexDirection:"column", gap:14 }}>

              {/* Etapes visuelles */}
              <div style={{ display:"flex", alignItems:"center", gap:0 }}>
                {([
                  { emoji:"🔗", step:"1", label:"Partage",     desc:"Tu envoies ton lien"          },
                  { emoji:"👤", step:"2", label:"Inscription",  desc:"Un ami cree son compte"       },
                  { emoji:"🎁", step:"3", label:"Recompense",   desc:"+1 mois Pro offert"            },
                ] as const).map((s, i) => (
                  <div key={i} style={{ display:"flex", alignItems:"center", flex:1 }}>
                    <div style={{ flex:1, background:"rgba(236,72,153,0.06)", border:"1px solid rgba(236,72,153,0.14)", borderRadius:9, padding:"10px 8px", textAlign:"center" as const, position:"relative" as const }}>
                      <div style={{ position:"absolute" as const, top:-8, left:"50%", transform:"translateX(-50%)", background:"rgba(236,72,153,0.15)", border:"1px solid rgba(236,72,153,0.3)", borderRadius:20, padding:"1px 7px", fontSize:8, color:"#EC4899", fontWeight:800 }}>{s.step}</div>
                      <span style={{ fontSize:20, display:"block", margin:"4px 0 5px" }}>{s.emoji}</span>
                      <p style={{ color:"#F5F0E8", fontSize:10, fontWeight:700, margin:"0 0 2px" }}>{s.label}</p>
                      <p style={{ color:MUTED, fontSize:9, margin:0, lineHeight:1.4 }}>{s.desc}</p>
                    </div>
                    {i < 2 && <div style={{ width:16, height:1, background:"rgba(236,72,153,0.25)", flexShrink:0 }}/>}
                  </div>
                ))}
              </div>

              {/* KPIs */}
              <div className="rcols-4" style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:7 }}>
                {([
                  { value:referrals.length, label:"Invitations",  color:"var(--action)" },
                  { value:pendingRefs,       label:"En attente",   color:"#F97316" },
                  { value:validatedRefs,     label:"Valides",      color:"#7B61FF" },
                  { value:totalMonths,       label:"Mois Pro",     color:"var(--success)" },
                ] as const).map((k, i) => (
                  <div key={i} style={{ background:SURF2, border:"1px solid rgba(255,255,255,0.05)", borderRadius:9, padding:"10px 8px", textAlign:"center" as const }}>
                    <p style={{ color:k.color, fontSize:20, fontWeight:800, margin:0, fontFamily:"Fraunces, serif", lineHeight:1 }}>{k.value}</p>
                    <p style={{ color:MUTED, fontSize:9, margin:"3px 0 0", lineHeight:1.3 }}>{k.label}</p>
                  </div>
                ))}
              </div>

              {/* Condition de validation */}
              <div style={{ padding:"10px 13px", background:"color-mix(in srgb, var(--accent) 5%, transparent)", border:"1px solid color-mix(in srgb, var(--accent) 15%, transparent)", borderRadius:9 }}>
                <p style={{ color:G, fontSize:11, fontWeight:700, margin:"0 0 3px", display:"flex", alignItems:"center", gap:6 }}>
                  Comment gagner un mois Pro ?
                </p>
                <p style={{ color:MUTED, fontSize:10, margin:0, lineHeight:1.6 }}>
                  Ton filleul doit s'inscrire via ton lien et <strong style={{ color:"#F5F0E8" }}>souscrire a un plan payant</strong> dans les 30 jours. La recompense est creditee automatiquement.
                </p>
              </div>

              {/* Lien + actions partage */}
              <div style={{ display:"flex", flexDirection:"column", gap:7 }}>
                <label style={{ color:MUTED, fontSize:10, fontWeight:500 }}>Ton lien de parrainage</label>
                <div style={{ display:"flex", gap:7 }}>
                  <div style={{ flex:1, background:SURF2, border:`1px solid color-mix(in srgb, var(--accent) 13%, transparent)`, borderRadius:9, padding:"9px 12px", color:G, fontSize:11, fontFamily:"monospace", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" as const, display:"flex", alignItems:"center" }}>
                    {referralLink}
                  </div>
                  <button onClick={copyReferral}
                    style={{ flexShrink:0, display:"flex", alignItems:"center", gap:5, background:copiedRef?"rgba(57,255,143,0.1)":"color-mix(in srgb, var(--accent) 7%, transparent)", border:`1px solid ${copiedRef?"rgba(57,255,143,0.3)":"color-mix(in srgb, var(--accent) 15%, transparent)"}`, borderRadius:9, padding:"9px 14px", color:copiedRef?"var(--success)":G, fontSize:11, fontWeight:600, cursor:"pointer" }}>
                    {copiedRef ? <><Check size={12}/> Copie !</> : <><Copy size={12}/> Copier</>}
                  </button>
                </div>

                {/* Boutons de partage */}
                <div className="rcols-4" style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:6 }}>
                  {([
                    { id:"whatsapp" as const, label:"WhatsApp", color:"#25D366", emoji:"💬" },
                    { id:"email"    as const, label:"Email",    color:"var(--action)", emoji:"✉" },
                    { id:"twitter"  as const, label:"X / Twitter", color:"#F5F0E8", emoji:"🐦" },
                    { id:"linkedin" as const, label:"LinkedIn", color:"#0A66C2", emoji:"💼" },
                  ]).map(btn => (
                    <button key={btn.id} type="button" onClick={() => shareRef(btn.id)}
                      style={{ display:"flex", flexDirection:"column", alignItems:"center", gap:4, padding:"8px 4px", background:`${btn.color}10`, border:`1px solid ${btn.color}25`, borderRadius:9, cursor:"pointer" }}>
                      <span style={{ fontSize:16 }}>{btn.emoji}</span>
                      <span style={{ color:MUTED, fontSize:8, fontWeight:600 }}>{btn.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Historique filleuls */}
              {referrals.length === 0 ? (
                <div style={{ textAlign:"center" as const, padding:"20px 0" }}>
                  <Gift size={28} color={MUTED} style={{ marginBottom:8 }}/>
                  <p style={{ color:"#F5F0E8", fontSize:13, fontWeight:600, margin:"0 0 5px" }}>Aucun filleul pour l'instant</p>
                  <p style={{ color:MUTED, fontSize:11, margin:"0 0 12px", lineHeight:1.5 }}>
                    Partage ton lien et gagne 1 mois Pro<br/>pour chaque ami qui s'abonne.
                  </p>
                  <button onClick={copyReferral}
                    style={{ display:"inline-flex", alignItems:"center", gap:6, padding:"9px 18px", background:`linear-gradient(90deg,#EC4899,#c73b7e)`, border:"none", borderRadius:9, color:"#F5F0E8", fontSize:12, fontWeight:700, cursor:"pointer" }}>
                    <Share2 size={13}/> Partager maintenant
                  </button>
                </div>
              ) : (
                <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
                  {/* Filtres */}
                  <div style={{ display:"flex", gap:5 }}>
                    {([
                      { id:"all",       label:"Tous",       count:referrals.length },
                      { id:"pending",   label:"En attente", count:pendingRefs      },
                      { id:"validated", label:"Valides",    count:validatedRefs    },
                      { id:"expired",   label:"Expires",    count:expiredRefs      },
                    ] as const).filter(f => f.id === "all" || f.count > 0).map(f => (
                      <button key={f.id} type="button" onClick={() => setRefFilter(f.id)}
                        style={{ display:"inline-flex", alignItems:"center", gap:4, padding:"3px 10px", background:refFilter===f.id?"rgba(236,72,153,0.12)":"rgba(255,255,255,0.04)", border:`1px solid ${refFilter===f.id?"rgba(236,72,153,0.35)":"rgba(255,255,255,0.07)"}`, borderRadius:20, color:refFilter===f.id?"#EC4899":MUTED, fontSize:10, fontWeight:refFilter===f.id?700:400, cursor:"pointer" }}>
                        {f.label}
                        <span style={{ background:"rgba(255,255,255,0.07)", borderRadius:10, padding:"0 5px", fontSize:9 }}>{f.count}</span>
                      </button>
                    ))}
                  </div>

                  {/* Liste filleuls */}
                  <div style={{ display:"flex", flexDirection:"column", gap:0 }}>
                    {filteredRefs.slice(0, 8).map((r, i) => {
                      const STATUS_CFG2: Record<string, { label:string; color:string; bg:string }> = {
                        pending:   { label:"Inscrit",  color:"#F97316", bg:"rgba(249,115,22,0.1)"  },
                        validated: { label:"Valide",   color:"var(--success)", bg:"rgba(57,255,143,0.1)"  },
                        rewarded:  { label:"Recompense",color:"#7B61FF",bg:"rgba(123,97,255,0.1)"  },
                        expired:   { label:"Expire",   color:"var(--danger)", bg:"rgba(255,107,107,0.1)" },
                      }
                      const scfg = STATUS_CFG2[r.status] ?? STATUS_CFG2.pending
                      const isLast = i === Math.min(filteredRefs.length, 8) - 1
                      return (
                        <div key={r.id || i} style={{ display:"flex", alignItems:"center", gap:10, padding:"9px 0", borderBottom:isLast?"none":"1px solid rgba(255,255,255,0.04)" }}>
                          {/* Avatar initiales anonyme */}
                          <div style={{ width:30, height:30, borderRadius:"50%", background:`${scfg.color}18`, border:`1px solid ${scfg.color}30`, display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0, fontSize:12 }}>
                            👤
                          </div>
                          <div style={{ flex:1, minWidth:0 }}>
                            <p style={{ color:"#F5F0E8", fontSize:11, fontWeight:600, margin:"0 0 1px" }}>Filleul #{i+1}</p>
                            <p style={{ color:MUTED, fontSize:9, margin:0 }}>{formatDate(r.created_at)}{r.reward_months ? ` . +${r.reward_months} mois Pro` : ""}</p>
                          </div>
                          <span style={{ background:scfg.bg, border:`1px solid ${scfg.color}30`, borderRadius:5, padding:"2px 8px", fontSize:9, color:scfg.color, fontWeight:700, flexShrink:0 }}>
                            {scfg.label}
                          </span>
                        </div>
                      )
                    })}
                  </div>

                  {filteredRefs.length > 8 && (
                    <p style={{ color:MUTED, fontSize:11, textAlign:"center" as const, margin:"4px 0 0" }}>
                      +{filteredRefs.length - 8} autres filleuls
                    </p>
                  )}
                </div>
              )}
            </div>
          </SectionCard>
          )}


          {/* STATISTIQUES */}
          {ptab === "identite" && (
          <SectionCard title="Statistiques" icon={TrendingUp} color="var(--action)"
            tag={statsLoading ? "..." : `${totalPages} pages`}
            action={
              <a href="/dashboard/analytics"
                style={{ display:"flex", alignItems:"center", gap:4, color:MUTED, fontSize:11, textDecoration:"none" }}>
                Analytics <ChevronRight size={12}/>
              </a>
            }>
            {statsLoading ? (
              /* Skeleton */
              <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
                <div className="rcols-3" style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:8 }}>
                  {[...Array(6)].map((_,i) => (
                    <div key={i} style={{ height:60, borderRadius:9, background:"rgba(255,255,255,0.04)", animation:"pulse 1.5s ease-in-out infinite", animationDelay:`${i*0.1}s` }}/>
                  ))}
                </div>
              </div>
            ) : totalPages === 0 && totalQR === 0 ? (
              /* Empty state */
              <div style={{ textAlign:"center" as const, padding:"20px 0" }}>
                <TrendingUp size={28} color={MUTED} style={{ marginBottom:8 }}/>
                <p style={{ color:"#F5F0E8", fontSize:13, fontWeight:600, margin:"0 0 4px" }}>Aucune donnee</p>
                <p style={{ color:MUTED, fontSize:11, margin:"0 0 12px" }}>Creez votre premiere page pour voir vos stats</p>
                <a href="/dashboard" style={{ color:G, fontSize:11, display:"inline-block" }}>Creer une page</a>
              </div>
            ) : (
              <div style={{ display:"flex", flexDirection:"column", gap:12 }}>

                {/* Grille principale 3x2 */}
                <div className="rcols-3" style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:8 }}>
                  {[
                    { icon:Eye,        label:"Pages",        value:totalPages,              color:G,          tooltip:"Nombre total de pages creees" },
                    { icon:CheckCircle,label:"Publiees",      value:publishedPages,          color:"var(--success)",  tooltip:"Pages avec statut Publie" },
                    { icon:QrCode,     label:"QR actifs",     value:activeQR,                color:"var(--action)",  tooltip:"QR Codes avec statut Actif" },
                    { icon:TrendingUp, label:"Vues total",    value:totalViews.toLocaleString("fr-FR"), color:"var(--accent)", tooltip:"Total des vues sur toutes les pages" },
                    { icon:Users,      label:"Visiteurs uniq",value:uniqueViews.toLocaleString("fr-FR"),color:"#7B61FF", tooltip:"Visiteurs uniques (hors doublons)" },
                    { icon:QrCode,     label:"Scans QR",      value:totalScansQR.toLocaleString("fr-FR"),color:"#F97316",tooltip:"Total des scans sur tous les QR" },
                  ].map((s, i) => (
                    <div key={i}
                      onMouseEnter={() => setStatsTooltip(s.tooltip)}
                      onMouseLeave={() => setStatsTooltip(null)}
                      style={{ position:"relative" as const, background:"#0F0E0B", border:"1px solid rgba(255,255,255,0.05)", borderRadius:9, padding:"10px 11px", cursor:"default" }}>
                      <div style={{ display:"flex", alignItems:"center", gap:6, marginBottom:5 }}>
                        <div style={{ width:22, height:22, borderRadius:6, background:s.color+"15", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
                          <s.icon size={11} color={s.color}/>
                        </div>
                        <span style={{ color:MUTED, fontSize:9, textTransform:"uppercase" as const, letterSpacing:0.8, lineHeight:1.2 }}>{s.label}</span>
                      </div>
                      <p style={{ color:"#F5F0E8", fontSize:18, fontWeight:800, margin:0, fontFamily:"Fraunces, serif", lineHeight:1 }}>
                        {s.value}
                      </p>
                    </div>
                  ))}
                </div>

                {/* Ligne de conversion */}
                <div className="rcols-2" style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8 }}>
                  <div style={{ background:"#0F0E0B", border:"1px solid rgba(255,255,255,0.05)", borderRadius:9, padding:"10px 12px" }}>
                    <p style={{ color:MUTED, fontSize:9, textTransform:"uppercase" as const, letterSpacing:0.8, margin:"0 0 5px" }}>Taux conversion</p>
                    <div style={{ display:"flex", alignItems:"flex-end", gap:6 }}>
                      <p style={{ color:convRate > 10 ? "var(--success)" : convRate > 5 ? G : MUTED, fontSize:22, fontWeight:800, margin:0, fontFamily:"Fraunces, serif", lineHeight:1 }}>
                        {convRate}%
                      </p>
                      <span style={{ color:MUTED, fontSize:9, paddingBottom:2 }}>scans / vues</span>
                    </div>
                    {/* Barre */}
                    <div style={{ height:3, background:"rgba(255,255,255,0.05)", borderRadius:2, marginTop:6, overflow:"hidden" }}>
                      <div style={{ height:"100%", width:`${Math.min(convRate*5, 100)}%`, background:`linear-gradient(90deg,${G},var(--success))`, borderRadius:2, transition:"width 0.6s ease" }}/>
                    </div>
                  </div>
                  <div style={{ background:"#0F0E0B", border:"1px solid rgba(255,255,255,0.05)", borderRadius:9, padding:"10px 12px" }}>
                    <p style={{ color:MUTED, fontSize:9, textTransform:"uppercase" as const, letterSpacing:0.8, margin:"0 0 5px" }}>Vues / page moy.</p>
                    <p style={{ color:"#F5F0E8", fontSize:22, fontWeight:800, margin:0, fontFamily:"Fraunces, serif", lineHeight:1 }}>
                      {avgViews.toLocaleString("fr-FR")}
                    </p>
                  </div>
                </div>

                {/* Top page / Top QR -- Pro+ */}
                {(profile?.plan === "pro" || profile?.plan === "business") && (topPage || topQR) && (
                  <div style={{ display:"flex", flexDirection:"column", gap:7 }}>
                    <p style={{ color:MUTED, fontSize:9, textTransform:"uppercase" as const, letterSpacing:1, margin:0 }}>Top performers</p>
                    {topPage && (
                      <a href={`/dashboard/builder/${topPage.id}`} style={{ display:"flex", alignItems:"center", gap:9, padding:"9px 11px", background:"color-mix(in srgb, var(--accent) 5%, transparent)", border:"1px solid color-mix(in srgb, var(--accent) 12%, transparent)", borderRadius:9, textDecoration:"none" }}>
                        <div style={{ width:28, height:28, borderRadius:7, background:"color-mix(in srgb, var(--accent) 10%, transparent)", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
                          <Eye size={13} color={G}/>
                        </div>
                        <div style={{ flex:1, minWidth:0 }}>
                          <p style={{ color:"#F5F0E8", fontSize:11, fontWeight:600, margin:"0 0 1px", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" as const }}>
                            {topPage.title}
                          </p>
                          <p style={{ color:MUTED, fontSize:10, margin:0 }}>{topPage.total_views.toLocaleString("fr-FR")} vues</p>
                        </div>
                        <span style={{ color:G, fontSize:9, fontWeight:700, background:"color-mix(in srgb, var(--accent) 10%, transparent)", borderRadius:5, padding:"2px 7px", flexShrink:0 }}>Top page</span>
                      </a>
                    )}
                    {topQR && topQR.total_scans > 0 && (
                      <div style={{ display:"flex", alignItems:"center", gap:9, padding:"9px 11px", background:"rgba(249,115,22,0.05)", border:"1px solid rgba(249,115,22,0.12)", borderRadius:9 }}>
                        <div style={{ width:28, height:28, borderRadius:7, background:"rgba(249,115,22,0.1)", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
                          <QrCode size={13} color="#F97316"/>
                        </div>
                        <div style={{ flex:1, minWidth:0 }}>
                          <p style={{ color:"#F5F0E8", fontSize:11, fontWeight:600, margin:"0 0 1px", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" as const }}>
                            {(topQR.pages as any)?.title || topQR.short_code}
                          </p>
                          <p style={{ color:MUTED, fontSize:10, margin:0 }}>/{topQR.short_code} . {topQR.total_scans.toLocaleString("fr-FR")} scans</p>
                        </div>
                        <span style={{ color:"#F97316", fontSize:9, fontWeight:700, background:"rgba(249,115,22,0.1)", borderRadius:5, padding:"2px 7px", flexShrink:0 }}>Top QR</span>
                      </div>
                    )}
                  </div>
                )}

                {/* Teaser Pro si free */}
                {profile?.plan === "free" && (
                  <div style={{ padding:"10px 12px", background:"color-mix(in srgb, var(--accent) 4%, transparent)", border:"1px dashed color-mix(in srgb, var(--accent) 20%, transparent)", borderRadius:9, display:"flex", alignItems:"center", justifyContent:"space-between", gap:10 }}>
                    <div>
                      <p style={{ color:"#F5F0E8", fontSize:11, fontWeight:600, margin:"0 0 2px" }}>Top page & Top QR</p>
                      <p style={{ color:MUTED, fontSize:10, margin:0 }}>Disponible en plan Pro</p>
                    </div>
                    <a href="/upgrade" style={{ display:"flex", alignItems:"center", gap:5, padding:"6px 12px", background:`linear-gradient(90deg,${G},color-mix(in srgb, var(--accent) 75%, #000))`, borderRadius:7, color:"#080808", textDecoration:"none", fontSize:11, fontWeight:700, flexShrink:0 }}>
                      Upgrade
                    </a>
                  </div>
                )}
              </div>
            )}
          </SectionCard>
          )}


          {/* 4. SECURITE */}
          {ptab === "securite" && (
          <SectionCard title="Securite" icon={Shield} color="var(--danger)">
            {secLoading ? (
              <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
                {[...Array(3)].map((_,i) => (
                  <div key={i} style={{ height:52, borderRadius:9, background:"rgba(255,255,255,0.04)", animation:"pulse 1.4s ease-in-out infinite", animationDelay:`${i*0.15}s` }}/>
                ))}
              </div>
            ) : (
              <div style={{ display:"flex", flexDirection:"column", gap:14 }}>

                {/* Alerte email non verifie */}
                {!emailVerified && (
                  <div style={{ display:"flex", alignItems:"flex-start", gap:10, padding:"12px 14px", background:"rgba(249,115,22,0.08)", border:"1px solid rgba(249,115,22,0.25)", borderRadius:10 }}>
                    <AlertTriangle size={15} color="#F97316" style={{ flexShrink:0, marginTop:1 }}/>
                    <div style={{ flex:1 }}>
                      <p style={{ color:"#F97316", fontSize:12, fontWeight:700, margin:"0 0 3px" }}>Email non verifie</p>
                      <p style={{ color:"rgba(249,115,22,0.8)", fontSize:11, margin:"0 0 8px" }}>
                        Verifiez votre email pour securiser votre compte et recevoir les notifications.
                      </p>
                      <button onClick={sendVerificationEmail} disabled={sendingVerif || verifSent}
                        style={{ display:"flex", alignItems:"center", gap:6, padding:"6px 13px", background:"rgba(249,115,22,0.15)", border:"1px solid rgba(249,115,22,0.3)", borderRadius:7, color:"#F97316", fontSize:11, fontWeight:700, cursor:sendingVerif||verifSent?"default":"pointer" }}>
                        {verifSent ? <><Check size={11}/> Email envoye !</>
                          : sendingVerif ? "Envoi..."
                          : <><Mail size={11}/> Renvoyer l'email de verification</>}
                      </button>
                    </div>
                  </div>
                )}

                {/* Statut email */}
                <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", padding:"12px 14px", background:SURF2, border:"1px solid rgba(255,255,255,0.06)", borderRadius:9 }}>
                  <div style={{ display:"flex", alignItems:"center", gap:10 }}>
                    <div style={{ width:32, height:32, borderRadius:8, background:emailVerified?"rgba(57,255,143,0.1)":"rgba(249,115,22,0.1)", display:"flex", alignItems:"center", justifyContent:"center" }}>
                      {emailVerified
                        ? <ShieldCheck size={15} color="var(--success)"/>
                        : <ShieldOff   size={15} color="#F97316"/>}
                    </div>
                    <div>
                      <p style={{ color:"#F5F0E8", fontSize:12, fontWeight:600, margin:"0 0 1px" }}>
                        {authUser?.email || profile?.email}
                      </p>
                      <div style={{ display:"flex", alignItems:"center", gap:5 }}>
                        <div style={{ width:5, height:5, borderRadius:"50%", background:emailVerified?"var(--success)":"#F97316" }}/>
                        <span style={{ color:emailVerified?"var(--success)":"#F97316", fontSize:10 }}>
                          {emailVerified ? "Email verifie" : "Email non verifie"}
                        </span>
                      </div>
                    </div>
                  </div>
                  {lastSignIn && (
                    <div style={{ textAlign:"right" as const }}>
                      <p style={{ color:MUTED, fontSize:9, margin:0 }}>Derniere connexion</p>
                      <p style={{ color:"#F5F0E8", fontSize:10, fontWeight:600, margin:0 }}>
                        {new Date(lastSignIn).toLocaleDateString("fr-FR", { day:"numeric", month:"short", hour:"2-digit", minute:"2-digit" })}
                      </p>
                    </div>
                  )}
                </div>

                {/* Mot de passe */}
                <div style={{ background:SURF2, border:"1px solid rgba(255,255,255,0.06)", borderRadius:9, overflow:"hidden" }}>
                  <button type="button" onClick={() => setShowPwdChange(p => !p)}
                    style={{ display:"flex", alignItems:"center", gap:10, padding:"12px 14px", background:"none", border:"none", cursor:"pointer", width:"100%", textAlign:"left" as const }}>
                    <div style={{ width:32, height:32, borderRadius:8, background:"rgba(255,107,107,0.1)", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
                      <Lock size={14} color="var(--danger)"/>
                    </div>
                    <div style={{ flex:1 }}>
                      <p style={{ color:"#F5F0E8", fontSize:12, fontWeight:600, margin:0 }}>Mot de passe</p>
                      <p style={{ color:MUTED, fontSize:10, margin:0 }}>Modifier ou reinitialiser votre mot de passe</p>
                    </div>
                    <ChevronRight size={14} color={MUTED} style={{ transform:showPwdChange?"rotate(90deg)":"none", transition:"transform 0.2s" }}/>
                  </button>

                  {showPwdChange && (
                    <div style={{ padding:"0 14px 14px", borderTop:"1px solid rgba(255,255,255,0.05)", display:"flex", flexDirection:"column", gap:10 }}>
                      <div style={{ display:"flex", gap:7, marginTop:12 }}>
                        <button type="button" onClick={sendPasswordReset} disabled={pwdLoading||pwdSent}
                          style={{ flex:1, display:"flex", alignItems:"center", justifyContent:"center", gap:6, padding:"9px", background:"rgba(255,255,255,0.04)", border:"1px solid rgba(255,255,255,0.08)", borderRadius:8, color:MUTED, fontSize:11, cursor:"pointer" }}>
                          <Mail size={12}/>
                          {pwdSent ? "Email envoye !" : "Recevoir un email de reinitialisation"}
                        </button>
                      </div>
                      <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                        <div style={{ flex:1, height:1, background:"rgba(255,255,255,0.06)" }}/>
                        <span style={{ color:MUTED, fontSize:9 }}>ou changer directement</span>
                        <div style={{ flex:1, height:1, background:"rgba(255,255,255,0.06)" }}/>
                      </div>
                      <div>
                        <input type="password" value={newPwd}
                          onChange={e => { setNewPwd(e.target.value); setPwdStrength(computePwdStrength(e.target.value)) }}
                          placeholder="Nouveau mot de passe"
                          style={{ width:"100%", background:"#0F0E0B", border:"1px solid rgba(255,255,255,0.08)", borderRadius:8, padding:"9px 12px", color:"#F5F0E8", fontSize:12, outline:"none", boxSizing:"border-box" as const, marginBottom:6 }}/>
                        {newPwd && (
                          <div>
                            <div style={{ height:4, background:"rgba(255,255,255,0.06)", borderRadius:2, overflow:"hidden", marginBottom:3 }}>
                              <div style={{ height:"100%", width:`${pwdStrength}%`, background:pwdStrength<40?"var(--danger)":pwdStrength<70?"#F97316":"var(--success)", borderRadius:2, transition:"width 0.3s, background 0.3s" }}/>
                            </div>
                            <p style={{ color:pwdStrength<40?"var(--danger)":pwdStrength<70?"#F97316":"var(--success)", fontSize:9, margin:0 }}>
                              {pwdStrength<40?"Mot de passe faible":pwdStrength<70?"Correct -- ajoutez des chiffres et symboles":"Mot de passe fort"}
                            </p>
                          </div>
                        )}
                      </div>
                      <input type="password" value={newPwdConfirm}
                        onChange={e => setNewPwdConfirm(e.target.value)}
                        placeholder="Confirmer le mot de passe"
                        style={{ width:"100%", background:"#0F0E0B", border:`1px solid ${newPwdConfirm && newPwd !== newPwdConfirm?"rgba(255,107,107,0.4)":"rgba(255,255,255,0.08)"}`, borderRadius:8, padding:"9px 12px", color:"#F5F0E8", fontSize:12, outline:"none", boxSizing:"border-box" as const }}/>
                      {newPwdConfirm && newPwd !== newPwdConfirm && (
                        <p style={{ color:"var(--danger)", fontSize:10, margin:"0" }}>Les mots de passe ne correspondent pas</p>
                      )}
                      <button type="button" onClick={changePasswordDirect}
                        disabled={pwdLoading || newPwd.length < 8 || newPwd !== newPwdConfirm}
                        style={{ padding:"10px", background:newPwd.length>=8&&newPwd===newPwdConfirm?"linear-gradient(90deg,var(--danger),#e05555)":"rgba(255,255,255,0.04)", border:"none", borderRadius:8, color:newPwd.length>=8&&newPwd===newPwdConfirm?"#F5F0E8":MUTED, fontSize:12, fontWeight:700, cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", gap:6 }}>
                        {pwdLoading ? "Mise a jour..." : <><Lock size={12}/> Mettre a jour le mot de passe</>}
                      </button>
                    </div>
                  )}
                </div>

                {/* Sessions actives */}
                <div>
                  <p style={{ color:MUTED, fontSize:9, textTransform:"uppercase" as const, letterSpacing:1.2, margin:"0 0 8px" }}>Sessions actives</p>
                  <div style={{ display:"flex", flexDirection:"column", gap:6 }}>
                    {sessions.map((sess, i) => {
                      const DevIcon = sess.device === "mobile" ? Smartphone : sess.device === "tablet" ? Tablet : Monitor
                      return (
                        <div key={i} style={{ display:"flex", alignItems:"center", gap:10, padding:"10px 12px", background:sess.current?"rgba(57,255,143,0.04)":SURF2, border:`1px solid ${sess.current?"rgba(57,255,143,0.15)":"rgba(255,255,255,0.06)"}`, borderRadius:9 }}>
                          <div style={{ width:32, height:32, borderRadius:8, background:sess.current?"rgba(57,255,143,0.1)":"rgba(255,255,255,0.04)", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
                            <DevIcon size={15} color={sess.current?"var(--success)":MUTED}/>
                          </div>
                          <div style={{ flex:1, minWidth:0 }}>
                            <div style={{ display:"flex", alignItems:"center", gap:7 }}>
                              <p style={{ color:"#F5F0E8", fontSize:12, fontWeight:600, margin:0 }}>{sess.browser}</p>
                              {sess.current && (
                                <span style={{ background:"rgba(57,255,143,0.1)", border:"1px solid rgba(57,255,143,0.2)", borderRadius:4, padding:"1px 6px", fontSize:8, color:"var(--success)", fontWeight:700 }}>
                                  Session actuelle
                                </span>
                              )}
                            </div>
                            <p style={{ color:MUTED, fontSize:10, margin:0 }}>{sess.location}</p>
                          </div>
                          {!sess.current && (
                            <button type="button" onClick={() => signOutAllDevices()}
                              style={{ padding:"4px 10px", background:"rgba(255,107,107,0.08)", border:"1px solid rgba(255,107,107,0.15)", borderRadius:6, color:"var(--danger)", fontSize:10, cursor:"pointer" }}>
                              Revoquer
                            </button>
                          )}
                        </div>
                      )
                    })}
                  </div>
                </div>

                {/* Actions globales */}
                <div style={{ display:"flex", flexDirection:"column", gap:7 }}>
                  <button type="button" onClick={signOutAllDevices} disabled={signOutAllLoading}
                    style={{ display:"flex", alignItems:"center", gap:10, padding:"12px 14px", background:"rgba(255,107,107,0.06)", border:"1px solid rgba(255,107,107,0.15)", borderRadius:9, cursor:"pointer", textAlign:"left" as const, opacity:signOutAllLoading?0.7:1 }}>
                    <div style={{ width:32, height:32, borderRadius:8, background:"rgba(255,107,107,0.1)", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
                      <LogOut size={14} color="var(--danger)"/>
                    </div>
                    <div style={{ flex:1 }}>
                      <p style={{ color:"var(--danger)", fontSize:12, fontWeight:600, margin:0 }}>
                        {signOutAllLoading ? "Deconnexion en cours..." : "Deconnecter tous les appareils"}
                      </p>
                      <p style={{ color:MUTED, fontSize:10, margin:0 }}>Met fin a toutes les sessions actives</p>
                    </div>
                    <ChevronRight size={14} color="var(--danger)"/>
                  </button>
                </div>

                {/* Badges securite */}
                <div style={{ display:"flex", gap:7, flexWrap:"wrap" as const }}>
                  <span style={{ display:"inline-flex", alignItems:"center", gap:5, padding:"4px 10px", background:emailVerified?"rgba(57,255,143,0.08)":"rgba(249,115,22,0.08)", border:`1px solid ${emailVerified?"rgba(57,255,143,0.2)":"rgba(249,115,22,0.2)"}`, borderRadius:20, fontSize:10, color:emailVerified?"var(--success)":"#F97316" }}>
                    {emailVerified ? <ShieldCheck size={11}/> : <ShieldOff size={11}/>}
                    Email {emailVerified?"verifie":"non verifie"}
                  </span>
                  <span style={{ display:"inline-flex", alignItems:"center", gap:5, padding:"4px 10px", background:"rgba(57,255,143,0.08)", border:"1px solid rgba(57,255,143,0.2)", borderRadius:20, fontSize:10, color:"var(--success)" }}>
                    <Shield size={11}/>
                    Compte actif
                  </span>
                  {profile?.plan !== "free" && (
                    <span style={{ display:"inline-flex", alignItems:"center", gap:5, padding:"4px 10px", background:"color-mix(in srgb, var(--accent) 8%, transparent)", border:"1px solid color-mix(in srgb, var(--accent) 20%, transparent)", borderRadius:20, fontSize:10, color:G }}>
                      <Key size={11}/>
                      Plan payant
                    </span>
                  )}
                </div>
              </div>
            )}
          </SectionCard>
          )}


          {/* 5. EXPORT + DANGER */}
          {ptab === "donnees" && (
          <SectionCard title="Donnees personnelles" icon={Download} color="var(--action)">
            <div style={{ display:"flex", flexDirection:"column", gap:14 }}>

              {/* Badge RGPD */}
              <div style={{ display:"flex", alignItems:"center", gap:10, padding:"10px 14px", background:"rgba(56,189,248,0.05)", border:"1px solid rgba(56,189,248,0.15)", borderRadius:10 }}>
                <div style={{ width:36, height:36, borderRadius:10, background:"rgba(56,189,248,0.1)", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
                  <Shield size={16} color="var(--action)"/>
                </div>
                <div>
                  <div style={{ display:"flex", alignItems:"center", gap:7, marginBottom:2 }}>
                    <p style={{ color:"#F5F0E8", fontSize:12, fontWeight:700, margin:0 }}>Vos droits RGPD</p>
                    <span style={{ background:"rgba(56,189,248,0.12)", border:"1px solid rgba(56,189,248,0.25)", borderRadius:4, padding:"1px 7px", fontSize:8, color:"var(--action)", fontWeight:800 }}>
                      RGPD
                    </span>
                  </div>
                  <p style={{ color:MUTED, fontSize:10, margin:0, lineHeight:1.5 }}>
                    Conformement au RGPD, vous pouvez exporter, corriger ou supprimer vos donnees a tout moment. Seules vos donnees sont incluses.
                  </p>
                </div>
              </div>

              {/* Exports granulaires */}
              <div style={{ display:"flex", flexDirection:"column", gap:7 }}>
                <p style={{ color:MUTED, fontSize:9, textTransform:"uppercase" as const, letterSpacing:1.2, margin:0 }}>Telecharger mes donnees</p>
                {exportJobs.map(job => {
                  const fmtMap: Record<string,string> = {
                    full:"JSON", pages:"CSV", qrcodes:"CSV", analytics:"CSV", activity:"JSON"
                  }
                  const iconMap: Record<string, React.ReactNode> = {
                    full:      <Download size={13}/>,
                    pages:     <Eye size={13}/>,
                    qrcodes:   <QrCode size={13}/>,
                    analytics: <TrendingUp size={13}/>,
                    activity:  <Clock size={13}/>,
                  }
                  const fmt = fmtMap[job.id] ?? "JSON"
                  return (
                    <div key={job.id} style={{ display:"flex", alignItems:"center", gap:10, padding:"11px 13px", background:SURF2, border:`1px solid ${job.status==="done"?"rgba(57,255,143,0.15)":job.status==="error"?"rgba(255,107,107,0.15)":"rgba(255,255,255,0.06)"}`, borderRadius:9 }}>
                      <div style={{ width:32, height:32, borderRadius:8, background:"rgba(56,189,248,0.08)", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0, color:"var(--action)" }}>
                        {iconMap[job.id]}
                      </div>
                      <div style={{ flex:1, minWidth:0 }}>
                        <div style={{ display:"flex", alignItems:"center", gap:7 }}>
                          <p style={{ color:"#F5F0E8", fontSize:12, fontWeight:600, margin:0 }}>{job.label}</p>
                          <span style={{ background:"rgba(255,255,255,0.05)", border:"1px solid rgba(255,255,255,0.08)", borderRadius:4, padding:"1px 6px", fontSize:8, color:MUTED, fontFamily:"monospace" }}>
                            {fmt}
                          </span>
                        </div>
                        <p style={{ color:MUTED, fontSize:10, margin:0 }}>
                          {job.status==="done" && job.filename
                            ? <span style={{ color:"var(--success)" }}>{job.filename}</span>
                            : job.status==="error"
                            ? <span style={{ color:"var(--danger)" }}>Erreur -- reessayez</span>
                            : job.id==="full"       ? "Toutes vos donnees en un fichier (profil, pages, QR, activite)"
                            : job.id==="pages"      ? "Titre, slug, statut, vues par page"
                            : job.id==="qrcodes"    ? "Short code, scans, statut par QR"
                            : job.id==="analytics"  ? "Vues et visiteurs uniques par page"
                            : "Historique de vos actions sur QRowg"
                          }
                        </p>
                      </div>
                      <button type="button"
                        onClick={() => { if (job.status !== "running") runExport(job.id) }}
                        disabled={job.status === "running"}
                        style={{ display:"flex", alignItems:"center", gap:6, padding:"7px 13px", background:job.status==="done"?"rgba(57,255,143,0.08)":job.status==="error"?"rgba(255,107,107,0.08)":"rgba(56,189,248,0.08)", border:`1px solid ${job.status==="done"?"rgba(57,255,143,0.2)":job.status==="error"?"rgba(255,107,107,0.2)":"rgba(56,189,248,0.2)"}`, borderRadius:7, color:job.status==="done"?"var(--success)":job.status==="error"?"var(--danger)":"var(--action)", fontSize:11, fontWeight:600, cursor:job.status==="running"?"wait":"pointer", flexShrink:0 }}>
                        {job.status==="running"
                          ? <><div style={{ width:11, height:11, border:"1.5px solid rgba(56,189,248,0.3)", borderTopColor:"var(--action)", borderRadius:"50%", animation:"spin 0.7s linear infinite" }}/> Export...</>
                          : job.status==="done"
                          ? <><Check size={12}/> OK</>
                          : job.status==="error"
                          ? <><RotateCcw size={12}/> Retry</>
                          : <><Download size={12}/> Exporter</>}
                      </button>
                    </div>
                  )
                })}
              </div>

              {/* Historique exports */}
              {exportHistory.length > 0 && (
                <div>
                  <p style={{ color:MUTED, fontSize:9, textTransform:"uppercase" as const, letterSpacing:1.2, margin:"0 0 8px" }}>
                    Historique de cette session ({exportHistory.length})
                  </p>
                  <div style={{ display:"flex", flexDirection:"column", gap:5 }}>
                    {exportHistory.slice(0,5).map((h,i) => (
                      <div key={i} style={{ display:"flex", alignItems:"center", gap:10, padding:"7px 11px", background:"rgba(255,255,255,0.02)", border:"1px solid rgba(255,255,255,0.04)", borderRadius:8 }}>
                        <Check size={11} color="var(--success)"/>
                        <span style={{ flex:1, color:MUTED, fontSize:10 }}>{h.label}</span>
                        <span style={{ background:"rgba(255,255,255,0.05)", borderRadius:4, padding:"1px 6px", fontSize:8, color:MUTED, fontFamily:"monospace" }}>{h.format}</span>
                        <span style={{ color:MUTED, fontSize:9 }}>
                          {new Date(h.date).toLocaleTimeString("fr-FR",{hour:"2-digit",minute:"2-digit"})}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Note securite */}
              <div style={{ padding:"10px 13px", background:"rgba(255,255,255,0.02)", border:"1px solid rgba(255,255,255,0.05)", borderRadius:9 }}>
                <div style={{ display:"flex", flexDirection:"column", gap:5 }}>
                  {([
                    "Seules vos propres donnees sont incluses dans l'export",
                    "Les exports se font directement dans votre navigateur (aucune URL publique)",
                    "Les cles API sont masquees (key_preview uniquement)",
                  ] as const).map((note, i) => (
                    <div key={i} style={{ display:"flex", alignItems:"flex-start", gap:7 }}>
                      <Shield size={10} color={MUTED} style={{ flexShrink:0, marginTop:1 }}/>
                      <span style={{ color:MUTED, fontSize:10, lineHeight:1.5 }}>{note}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </SectionCard>
          )}

          {/* -- Zone Danger ------------------------------------------- */}
          {ptab === "securite" && (
          <SectionCard title="Zone danger" icon={AlertTriangle} color="var(--danger)">
            <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
              <div style={{ padding:"12px 14px", background:"rgba(255,107,107,0.04)", border:"1px solid rgba(255,107,107,0.15)", borderRadius:9 }}>
                <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:showDanger?12:0 }}>
                  <div>
                    <p style={{ color:"var(--danger)", fontSize:12, fontWeight:700, margin:0 }}>Supprimer mon compte</p>
                    <p style={{ color:MUTED, fontSize:10, margin:"2px 0 0" }}>Action irreversible -- toutes les donnees seront perdues</p>
                  </div>
                  <button type="button" onClick={() => setShowDanger(!showDanger)}
                    style={{ padding:"6px 12px", background:"rgba(255,107,107,0.1)", border:"1px solid rgba(255,107,107,0.2)", borderRadius:7, color:"var(--danger)", fontSize:11, cursor:"pointer" }}>
                    {showDanger ? "Annuler" : "Supprimer"}
                  </button>
                </div>
                {showDanger && (
                  <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
                    <p style={{ color:"var(--danger)", fontSize:11, margin:0 }}>Tape <strong>SUPPRIMER</strong> pour confirmer :</p>
                    <input value={dangerConfirm} onChange={e => setDangerConfirm(e.target.value)}
                      placeholder="SUPPRIMER"
                      style={{ width:"100%", background:"#0F0E0B", border:"1px solid rgba(255,107,107,0.3)", borderRadius:8, padding:"9px 12px", color:"#F5F0E8", fontSize:12, outline:"none", boxSizing:"border-box" as const }}/>
                    <button type="button" disabled={dangerConfirm !== "SUPPRIMER"}
                      style={{ padding:"9px", background:dangerConfirm==="SUPPRIMER"?"rgba(255,107,107,0.2)":"rgba(255,255,255,0.03)", border:"1px solid rgba(255,107,107,0.3)", borderRadius:8, color:dangerConfirm==="SUPPRIMER"?"var(--danger)":MUTED, fontSize:12, fontWeight:700, cursor:dangerConfirm==="SUPPRIMER"?"pointer":"not-allowed" }}>
                      Confirmer la suppression
                    </button>
                  </div>
                )}
              </div>
            </div>
          </SectionCard>
          )}

        </div>

        {/* == COLONNE DROITE ================================================== */}
        <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>

          {/* 6. ABONNEMENT */}
          {ptab === "abonnement" && (
          <SectionCard title="Abonnement" icon={CreditCard} color={pc}>
            {subLoading ? (
              <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
                {[...Array(3)].map((_,i) => (
                  <div key={i} style={{ height:52, borderRadius:10, background:"rgba(255,255,255,0.04)", animation:"pulse 1.4s ease-in-out infinite", animationDelay:`${i*0.15}s` }}/>
                ))}
              </div>
            ) : (
              <div style={{ display:"flex", flexDirection:"column", gap:14 }}>

                {/* En-tete plan */}
                <div style={{ padding:"14px 16px", background:pc+"08", border:`1px solid ${pc}20`, borderRadius:12, position:"relative" as const, overflow:"hidden" }}>
                  <div style={{ position:"absolute", top:-20, right:-20, width:80, height:80, borderRadius:"50%", background:`radial-gradient(circle,${pc}15,transparent 70%)`, pointerEvents:"none" }}/>
                  <div style={{ display:"flex", alignItems:"center", gap:12 }}>
                    <div style={{ width:44, height:44, borderRadius:11, background:pc+"18", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
                      <PlanIcon size={20} color={pc}/>
                    </div>
                    <div style={{ flex:1 }}>
                      <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:3 }}>
                        <p style={{ color:"#F5F0E8", fontSize:16, fontWeight:700, margin:0 }}>
                          Plan {planCfg.label}
                        </p>
                        {planCfg.badge && (
                          <span style={{ background:"rgba(56,189,248,0.15)", border:"1px solid rgba(56,189,248,0.3)", borderRadius:5, padding:"1px 7px", fontSize:9, color:"var(--action)", fontWeight:800 }}>
                            {planCfg.badge}
                          </span>
                        )}
                        <span style={{ display:"inline-flex", alignItems:"center", gap:4, background:subStatus==="active"?"rgba(57,255,143,0.1)":subStatus==="trialing"?"color-mix(in srgb, var(--accent) 10%, transparent)":subStatus==="free"?"rgba(138,132,120,0.1)":"rgba(255,107,107,0.1)", border:`1px solid ${subStatus==="active"?"rgba(57,255,143,0.25)":subStatus==="trialing"?"color-mix(in srgb, var(--accent) 25%, transparent)":subStatus==="free"?"rgba(138,132,120,0.2)":"rgba(255,107,107,0.25)"}`, borderRadius:20, padding:"2px 9px" }}>
                          <div style={{ width:5, height:5, borderRadius:"50%", background:subStatus==="active"?"var(--success)":subStatus==="trialing"?"var(--accent)":subStatus==="free"?"#A8A190":"var(--danger)" }}/>
                          <span style={{ color:subStatus==="active"?"var(--success)":subStatus==="trialing"?"var(--accent)":subStatus==="free"?"#A8A190":"var(--danger)", fontSize:10, fontWeight:600 }}>
                            {subStatus==="active"?"Actif":subStatus==="trialing"?"Essai gratuit":subStatus==="free"?"Plan gratuit":subStatus==="past_due"?"Paiement en attente":"Annule"}
                          </span>
                        </span>
                      </div>
                      <p style={{ color:MUTED, fontSize:11, margin:0 }}>{planCfg.description}</p>
                    </div>
                    {/* Prix */}
                    <div style={{ textAlign:"right" as const, flexShrink:0 }}>
                      {planCfg.price_monthly === "0" ? (
                        <p style={{ color:MUTED, fontSize:14, fontWeight:700, margin:0 }}>Gratuit</p>
                      ) : (
                        <>
                          <p style={{ color:"#F5F0E8", fontSize:18, fontWeight:800, margin:0, fontFamily:"Fraunces, serif", lineHeight:1 }}>
                            {subCycle==="annual" ? planCfg.price_annual : planCfg.price_monthly}.
                          </p>
                          <p style={{ color:MUTED, fontSize:9, margin:"2px 0 0" }}>/ mois</p>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Cycle toggle */}
                  {planCfg.price_monthly !== "0" && (
                    <div style={{ display:"flex", alignItems:"center", gap:8, marginTop:12, paddingTop:12, borderTop:"1px solid rgba(255,255,255,0.06)" }}>
                      <p style={{ color:MUTED, fontSize:10, margin:0 }}>Cycle de facturation :</p>
                      <div style={{ display:"flex", gap:5 }}>
                        {(["monthly","annual"] as const).map(c => (
                          <button key={c} type="button" onClick={() => setSubCycle(c)}
                            style={{ padding:"3px 10px", background:subCycle===c?"color-mix(in srgb, var(--accent) 12%, transparent)":"transparent", border:`1px solid ${subCycle===c?"color-mix(in srgb, var(--accent) 30%, transparent)":"rgba(255,255,255,0.08)"}`, borderRadius:6, color:subCycle===c?G:MUTED, fontSize:10, fontWeight:subCycle===c?700:400, cursor:"pointer" }}>
                            {c==="monthly"?"Mensuel":"Annuel -20%"}
                          </button>
                        ))}
                      </div>
                      {subRenewal && (
                        <p style={{ color:MUTED, fontSize:10, margin:"0 0 0 auto" }}>
                          Renouvellement : {new Date(subRenewal).toLocaleDateString("fr-FR", { day:"numeric", month:"long" })}
                        </p>
                      )}
                    </div>
                  )}
                </div>

                {/* Features incluses */}
                <div>
                  <p style={{ color:MUTED, fontSize:9, fontWeight:700, textTransform:"uppercase" as const, letterSpacing:1.2, margin:"0 0 8px" }}>Inclus dans votre plan</p>
                  <div className="rcols-2" style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:6 }}>
                    {planCfg.features.map((f, i) => (
                      <div key={i} style={{ display:"flex", alignItems:"center", gap:7 }}>
                        <CheckCircle size={12} color="var(--success)" style={{ flexShrink:0 }}/>
                        <span style={{ color:"#C9C3B6", fontSize:11 }}>{f}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Fonctionnalités à débloquer (vend l'upgrade) */}
                {currentPlan !== "business" && nextPlan && (() => {
                  const locked = (nextPlan.features || []).filter((f: string) => !planCfg.features.includes(f)).slice(0, 4)
                  if (!locked.length) return null
                  return (
                    <div style={{ background:`${nextPlan.color}0d`, border:`1px solid ${nextPlan.color}26`, borderRadius:12, padding:"13px 15px" }}>
                      <p style={{ color:MUTED, fontSize:9, fontWeight:700, textTransform:"uppercase" as const, letterSpacing:1.2, margin:"0 0 8px" }}>
                        Débloqué avec <span style={{ color:nextPlan.color }}>{nextPlan.label}</span>
                      </p>
                      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:6 }}>
                        {locked.map((f: string, i: number) => (
                          <div key={i} style={{ display:"flex", alignItems:"center", gap:7, opacity:0.85 }}>
                            <Lock size={11} color={nextPlan.color} style={{ flexShrink:0 }}/>
                            <span style={{ color:MUTED, fontSize:11 }}>{f}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )
                })()}

                {/* Boutons action */}
                <div style={{ display:"flex", gap:8 }}>
                  {currentPlan !== "business" && (
                    <a href="/upgrade"
                      style={{ flex:1, display:"flex", alignItems:"center", justifyContent:"center", gap:7, padding:"10px", background:`linear-gradient(90deg,${pc},${pc}cc)`, borderRadius:9, color: pc === MUTED ? "#F5F0E8" : "#080808", textDecoration:"none", fontSize:12, fontWeight:700 }}>
                      <Activity size={13}/>
                      {currentPlan==="free"?"Choisir un plan":"Upgrader vers "+nextPlan?.label}
                    </a>
                  )}
                  {currentPlan !== "free" && (
                    <button type="button"
                      onClick={async () => {
                        try {
                          const res = await fetch("/api/stripe/portal", { method: "POST" })
                          const data = await res.json()
                          if (data.url) window.location.href = data.url
                          else showToast(data.error || "Portail de facturation indisponible pour le moment.", "err")
                        } catch { showToast("Impossible d'ouvrir le portail de facturation.", "err") }
                      }}
                      style={{ flex:currentPlan==="business"?1:0, display:"flex", alignItems:"center", justifyContent:"center", gap:6, padding:"10px 14px", background:"rgba(255,255,255,0.04)", border:"1px solid rgba(255,255,255,0.08)", borderRadius:9, color:MUTED, fontFamily:"inherit", fontSize:12, cursor:"pointer", whiteSpace:"nowrap" as const }}>
                      <CreditCard size={13}/> Gerer la facturation
                    </button>
                  )}
                </div>
              </div>
            )}
          </SectionCard>
          )}

          {/* CONSOMMATION */}
          {ptab === "abonnement" && (
          <SectionCard title="Consommation" icon={TrendingUp} color="var(--action)">
            {statsLoading ? (
              <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
                {[...Array(3)].map((_,i) => (
                  <div key={i} style={{ display:"flex", flexDirection:"column", gap:5 }}>
                    <div style={{ height:10, width:"60%", borderRadius:4, background:"rgba(255,255,255,0.04)", animation:"pulse 1.4s ease-in-out infinite" }}/>
                    <div style={{ height:6, borderRadius:3, background:"rgba(255,255,255,0.04)", animation:"pulse 1.4s ease-in-out infinite", animationDelay:`${i*0.1}s` }}/>
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ display:"flex", flexDirection:"column", gap:14 }}>

                {/* Alert limite atteinte */}
                {(isAtLimitPages || isAtLimitViews) && (
                  <div style={{ display:"flex", alignItems:"flex-start", gap:9, padding:"10px 12px", background:"rgba(255,107,107,0.08)", border:"1px solid rgba(255,107,107,0.25)", borderRadius:9 }}>
                    <AlertTriangle size={14} color="var(--danger)" style={{ flexShrink:0, marginTop:1 }}/>
                    <div>
                      <p style={{ color:"var(--danger)", fontSize:12, fontWeight:700, margin:"0 0 2px" }}>Limite atteinte</p>
                      <p style={{ color:"rgba(255,107,107,0.8)", fontSize:11, margin:"0 0 8px" }}>
                        {isAtLimitPages ? "Vous avez atteint la limite de QR actifs de votre plan. Mettez un QR en pause ou passez à un plan supérieur pour en activer un autre." : "Vous avez atteint la limite de vues mensuelle."}
                      </p>
                      <a href="/upgrade" style={{ color:"var(--danger)", fontSize:11, fontWeight:700 }}>Upgrader maintenant .</a>
                    </div>
                  </div>
                )}

                {/* Barre Pages */}
                {(() => {
                  const limit = planLimits.pages
                  const used  = totalPages
                  const pct   = limit ? Math.min((used/limit)*100, 100) : 0
                  const isNear = limit && used >= Math.floor(limit * 0.8)
                  const isAt   = limit && used >= limit
                  const barColor = isAt ? "var(--danger)" : isNear ? "#F97316" : "var(--action)"
                  return (
                    <div>
                      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"baseline", marginBottom:6 }}>
                        <div style={{ display:"flex", alignItems:"center", gap:7 }}>
                          <Eye size={12} color="var(--action)"/>
                          <span style={{ color:"#F5F0E8", fontSize:12, fontWeight:600 }}>Pages</span>
                          {isNear && !isAt && <span style={{ color:"#F97316", fontSize:9, fontWeight:700, background:"rgba(249,115,22,0.1)", border:"1px solid rgba(249,115,22,0.2)", borderRadius:4, padding:"1px 5px" }}>Bientot plein</span>}
                          {isAt && <span style={{ color:"var(--danger)", fontSize:9, fontWeight:700, background:"rgba(255,107,107,0.1)", border:"1px solid rgba(255,107,107,0.2)", borderRadius:4, padding:"1px 5px" }}>Limite atteinte</span>}
                        </div>
                        <span style={{ color:isAt?"var(--danger)":isNear?"#F97316":MUTED, fontSize:11, fontWeight:600 }}>
                          {used} {limit ? `/ ${limit}` : "/ illimite"}
                        </span>
                      </div>
                      {limit ? (
                        <div style={{ height:6, background:"rgba(255,255,255,0.06)", borderRadius:3, overflow:"hidden" }}>
                          <div style={{ height:"100%", width:`${pct}%`, background:isAt?"var(--danger)":isNear?`linear-gradient(90deg,#F97316,var(--danger))`:`linear-gradient(90deg,var(--action),#7B61FF)`, borderRadius:3, transition:"width 0.6s ease" }}/>
                        </div>
                      ) : (
                        <div style={{ height:6, background:`linear-gradient(90deg,var(--action),#7B61FF)`, borderRadius:3, opacity:0.3 }}/>
                      )}
                    </div>
                  )
                })()}

                {/* Barre Vues */}
                {(() => {
                  const limit = planLimits.views
                  const used  = totalViews
                  const pct   = limit ? Math.min((used/limit)*100, 100) : 0
                  const isNear = limit && used >= Math.floor(limit * 0.8)
                  const isAt   = limit && used >= limit
                  const barColor = isAt ? "var(--danger)" : isNear ? "#F97316" : G
                  return (
                    <div>
                      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"baseline", marginBottom:6 }}>
                        <div style={{ display:"flex", alignItems:"center", gap:7 }}>
                          <TrendingUp size={12} color={G}/>
                          <span style={{ color:"#F5F0E8", fontSize:12, fontWeight:600 }}>Vues ce mois</span>
                          {isNear && !isAt && <span style={{ color:"#F97316", fontSize:9, fontWeight:700, background:"rgba(249,115,22,0.1)", border:"1px solid rgba(249,115,22,0.2)", borderRadius:4, padding:"1px 5px" }}>Bientot plein</span>}
                          {isAt && <span style={{ color:"var(--danger)", fontSize:9, fontWeight:700, background:"rgba(255,107,107,0.1)", border:"1px solid rgba(255,107,107,0.2)", borderRadius:4, padding:"1px 5px" }}>Limite atteinte</span>}
                        </div>
                        <span style={{ color:isAt?"var(--danger)":isNear?"#F97316":MUTED, fontSize:11, fontWeight:600 }}>
                          {used.toLocaleString("fr-FR")} {limit ? `/ ${limit.toLocaleString("fr-FR")}` : "/ illimite"}
                        </span>
                      </div>
                      {limit ? (
                        <div style={{ height:6, background:"rgba(255,255,255,0.06)", borderRadius:3, overflow:"hidden" }}>
                          <div style={{ height:"100%", width:`${pct}%`, background:isAt?"var(--danger)":isNear?`linear-gradient(90deg,#F97316,var(--danger))`:`linear-gradient(90deg,${G},var(--action))`, borderRadius:3, transition:"width 0.6s ease" }}/>
                        </div>
                      ) : (
                        <div style={{ height:6, background:`linear-gradient(90deg,${G},var(--success))`, borderRadius:3, opacity:0.3 }}/>
                      )}
                    </div>
                  )
                })()}

                {/* QR Codes */}
                <div>
                  <div style={{ display:"flex", justifyContent:"space-between", alignItems:"baseline", marginBottom:6 }}>
                    <div style={{ display:"flex", alignItems:"center", gap:7 }}>
                      <QrCode size={12} color="#F97316"/>
                      <span style={{ color:"#F5F0E8", fontSize:12, fontWeight:600 }}>QR Codes actifs</span>
                    </div>
                    <span style={{ color:MUTED, fontSize:11, fontWeight:600 }}>
                      {activeQR} {planLimits.qr ? `/ ${planLimits.qr}` : "/ illimite"}
                    </span>
                  </div>
                  {planLimits.qr ? (
                    <div style={{ height:6, background:"rgba(255,255,255,0.06)", borderRadius:3, overflow:"hidden" }}>
                      <div style={{ height:"100%", width:`${Math.min((activeQR/planLimits.qr)*100,100)}%`, background:"linear-gradient(90deg,#F97316,var(--danger))", borderRadius:3, transition:"width 0.6s ease" }}/>
                    </div>
                  ) : (
                    <div style={{ height:6, background:"linear-gradient(90deg,#F97316,var(--accent))", borderRadius:3, opacity:0.3 }}/>
                  )}
                </div>

                {/* Equipe -- Business only */}
                {planLimits.team && (
                  <div>
                    <div style={{ display:"flex", justifyContent:"space-between", alignItems:"baseline", marginBottom:6 }}>
                      <div style={{ display:"flex", alignItems:"center", gap:7 }}>
                        <Users size={12} color="#7B61FF"/>
                        <span style={{ color:"#F5F0E8", fontSize:12, fontWeight:600 }}>Membres equipe</span>
                      </div>
                      <span style={{ color:MUTED, fontSize:11, fontWeight:600 }}>1 / {planLimits.team}</span>
                    </div>
                    <div style={{ height:6, background:"rgba(255,255,255,0.06)", borderRadius:3, overflow:"hidden" }}>
                      <div style={{ height:"100%", width:`${(1/planLimits.team)*100}%`, background:"linear-gradient(90deg,#7B61FF,var(--action))", borderRadius:3 }}/>
                    </div>
                  </div>
                )}

                {/* CTA upgrade contextuel */}
                {currentPlan !== "business" && (isNearPages || isNearViews) && (
                  <div style={{ padding:"12px 14px", background:`${nextPlan?.color || G}06`, border:`1px solid ${nextPlan?.color || G}20`, borderRadius:10 }}>
                    <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", gap:10 }}>
                      <div>
                        <p style={{ color:"#F5F0E8", fontSize:12, fontWeight:700, margin:"0 0 3px" }}>
                          Passez a {nextPlan?.label}
                        </p>
                        <p style={{ color:MUTED, fontSize:11, margin:0 }}>
                          {planLimits.views ? `${(nextPlan?.limits.views || 0) > (planLimits.views || 0) ? "+" + ((nextPlan?.limits.views ?? 0) - (planLimits.views ?? 0)).toLocaleString("fr-FR") : "Illimite"} vues/mois` : "Capacite augmentee"}
                          {" "}&middot; {nextPlan?.price_monthly}./mois
                        </p>
                      </div>
                      <a href="/upgrade"
                        style={{ display:"flex", alignItems:"center", gap:5, padding:"8px 14px", background:`linear-gradient(90deg,${nextPlan?.color || G},${nextPlan?.color || G}cc)`, borderRadius:8, color:"#080808", textDecoration:"none", fontSize:11, fontWeight:700, flexShrink:0 }}>
                        <Activity size={11}/> Upgrader
                      </a>
                    </div>
                  </div>
                )}
              </div>
            )}
          </SectionCard>
          )}


          {/* 7. RECOMPENSES */}
          {ptab === "parrainage" && (
          <SectionCard title="Recompenses & Niveau" icon={Star} color="#F59E0B">
            {(() => {
              const badges  = computeBadges()
              const lvl     = computeLevel()
              const earned  = badges.filter(b => b.unlocked)
              const locked  = badges.filter(b => !b.unlocked)
              const cats    = ["pages","scans","referrals","plan","milestone"] as const
              const catLabels: Record<string, string> = {
                pages:"Pages", scans:"Scans", referrals:"Parrainage", plan:"Plan", milestone:"Special"
              }
              return (
                <div style={{ display:"flex", flexDirection:"column", gap:16 }}>

                  {/* Niveau + Score */}
                  <div style={{ padding:"16px", background:`${lvl.current.color}08`, border:`1px solid ${lvl.current.color}25`, borderRadius:12, position:"relative" as const, overflow:"hidden" }}>
                    <div style={{ position:"absolute", top:-24, right:-24, width:90, height:90, borderRadius:"50%", background:`radial-gradient(circle,${lvl.current.color}15,transparent 70%)`, pointerEvents:"none" }}/>

                    <div style={{ display:"flex", alignItems:"center", gap:12, marginBottom:12 }}>
                      {/* Emoji niveau */}
                      <div style={{ width:44, height:44, borderRadius:12, background:`${lvl.current.color}15`, border:`1px solid ${lvl.current.color}30`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:22, flexShrink:0 }}>
                        {lvl.current.emoji}
                      </div>
                      <div style={{ flex:1 }}>
                        <div style={{ display:"flex", alignItems:"baseline", gap:8, marginBottom:2 }}>
                          <p style={{ color:"#F5F0E8", fontSize:15, fontWeight:800, margin:0 }}>{lvl.current.label}</p>
                          {lvl.nextLvl && (
                            <span style={{ color:MUTED, fontSize:10 }}>{"-> "}{lvl.nextLvl.label}</span>
                          )}
                        </div>
                        <p style={{ color:MUTED, fontSize:11, margin:0 }}>Score QRowg : <span style={{ color:lvl.current.color, fontWeight:700 }}>{lvl.score}/100</span></p>
                      </div>
                      {/* Score cercle */}
                      <div style={{ position:"relative" as const, width:48, height:48, flexShrink:0 }}>
                        <svg width="48" height="48" viewBox="0 0 48 48" style={{ transform:"rotate(-90deg)" }}>
                          <circle cx="24" cy="24" r="20" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="4"/>
                          <circle cx="24" cy="24" r="20" fill="none"
                            stroke={lvl.current.color} strokeWidth="4"
                            strokeDasharray={`${(lvl.score/100)*125.7} 125.7`}
                            strokeLinecap="round"
                            style={{ transition:"stroke-dasharray 0.8s ease" }}/>
                        </svg>
                        <span style={{ position:"absolute" as const, inset:0, display:"flex", alignItems:"center", justifyContent:"center", color:lvl.current.color, fontSize:11, fontWeight:800 }}>
                          {lvl.score}
                        </span>
                      </div>
                    </div>

                    {/* Barre progression vers prochain niveau */}
                    {lvl.nextLvl && (
                      <div>
                        <div style={{ display:"flex", justifyContent:"space-between", marginBottom:5 }}>
                          <span style={{ color:MUTED, fontSize:9 }}>Progression vers {lvl.nextLvl.label}</span>
                          <span style={{ color:lvl.current.color, fontSize:9, fontWeight:700 }}>{lvl.progressPct}%</span>
                        </div>
                        <div style={{ height:5, background:"rgba(255,255,255,0.06)", borderRadius:3, overflow:"hidden" }}>
                          <div style={{ height:"100%", width:`${lvl.progressPct}%`, background:`linear-gradient(90deg,${lvl.current.color},${lvl.nextLvl.color})`, borderRadius:3, transition:"width 0.8s ease" }}/>
                        </div>
                        <p style={{ color:MUTED, fontSize:9, margin:"4px 0 0" }}>
                          Gagnez des points en publiant des pages, obtenant des scans et parrainant des amis
                        </p>
                      </div>
                    )}
                    {!lvl.nextLvl && (
                      <p style={{ color:lvl.current.color, fontSize:11, fontWeight:700, margin:0, textAlign:"center" as const }}>
                        Niveau maximum atteint !
                      </p>
                    )}
                  </div>

                  {/* Compteur badges */}
                  <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between" }}>
                    <p style={{ color:MUTED, fontSize:9, textTransform:"uppercase" as const, letterSpacing:1.2, margin:0 }}>
                      Badges debloques
                    </p>
                    <span style={{ color:"#F5F0E8", fontSize:11, fontWeight:700 }}>
                      {earned.length} / {badges.length}
                    </span>
                  </div>

                  {/* Grille badges par categorie */}
                  {cats.map(cat => {
                    const catBadges = badges.filter(b => b.category === cat)
                    if (catBadges.length === 0) return null
                    return (
                      <div key={cat}>
                        <p style={{ color:MUTED, fontSize:9, textTransform:"uppercase" as const, letterSpacing:1, margin:"0 0 8px", display:"flex", alignItems:"center", gap:6 }}>
                          {catLabels[cat]}
                          <span style={{ color:"rgba(138,132,120,0.5)", fontSize:9 }}>
                            {catBadges.filter(b=>b.unlocked).length}/{catBadges.length}
                          </span>
                        </p>
                        <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:7 }}>
                          {catBadges.map(badge => (
                            <div key={badge.id}
                              title={badge.unlocked ? badge.desc : `Verrou : ${badge.desc}`}
                              style={{ position:"relative" as const, display:"flex", flexDirection:"column", alignItems:"center", gap:5, padding:"10px 8px", background:badge.unlocked?`${badge.color}08`:"rgba(255,255,255,0.02)", border:`1px solid ${badge.unlocked?`${badge.color}25`:"rgba(255,255,255,0.05)"}`, borderRadius:10, textAlign:"center" as const, filter:badge.unlocked?"none":"grayscale(1)", opacity:badge.unlocked?1:0.45, transition:"all 0.2s" }}>
                              <span style={{ fontSize:22, lineHeight:1, filter:badge.unlocked?"none":"brightness(0.3)" }}>
                                {badge.emoji}
                              </span>
                              <p style={{ color:badge.unlocked?badge.color:MUTED, fontSize:9, fontWeight:badge.unlocked?700:400, margin:0, lineHeight:1.3 }}>
                                {badge.label}
                              </p>
                              {badge.unlocked && (
                                <div style={{ position:"absolute" as const, top:-4, right:-4, width:14, height:14, borderRadius:"50%", background:"var(--success)", border:"2px solid #080808", display:"flex", alignItems:"center", justifyContent:"center" }}>
                                  <span style={{ fontSize:7, color:"#080808", fontWeight:900 }}>v</span>
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )
                  })}

                  {/* Stats parrainage conservees */}
                  {(totalMonths > 0 || validatedRefs > 0) && (
                    <div style={{ padding:"12px 14px", background:"rgba(236,72,153,0.05)", border:"1px solid rgba(236,72,153,0.12)", borderRadius:10 }}>
                      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10, textAlign:"center" as const }}>
                        <div>
                          <p style={{ color:"#EC4899", fontSize:20, fontWeight:800, margin:0, fontFamily:"Fraunces, serif" }}>{totalMonths}</p>
                          <p style={{ color:MUTED, fontSize:10, margin:0 }}>Mois Pro gagnes</p>
                        </div>
                        <div>
                          <p style={{ color:"#7B61FF", fontSize:20, fontWeight:800, margin:0, fontFamily:"Fraunces, serif" }}>{validatedRefs}</p>
                          <p style={{ color:MUTED, fontSize:10, margin:0 }}>Parrainages valides</p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )
            })()}
          </SectionCard>
          )}


          {/* 8. API BUSINESS */}
          {ptab === "abonnement" && (
          <SectionCard title="API Business" icon={Code} color="#7B61FF"
            tag={currentPlan==="business"?"Business":currentPlan==="pro"?"Pro":"Verrouille"}
            action={
              <a href="https://docs.qrowg.com" target="_blank" rel="noopener noreferrer"
                style={{ display:"flex", alignItems:"center", gap:4, color:MUTED, fontSize:11, textDecoration:"none" }}>
                Docs <ExternalLink size={11}/>
              </a>
            }>
            {currentPlan === "free" || currentPlan === "starter" ? (
              /* Plans insuffisants */
              <div style={{ textAlign:"center" as const, padding:"20px 0" }}>
                <div style={{ width:48, height:48, borderRadius:14, background:"rgba(123,97,255,0.08)", border:"1px solid rgba(123,97,255,0.15)", display:"flex", alignItems:"center", justifyContent:"center", margin:"0 auto 12px" }}>
                  <Lock size={20} color="#7B61FF"/>
                </div>
                <p style={{ color:"#F5F0E8", fontSize:13, fontWeight:600, margin:"0 0 5px" }}>Acces API</p>
                <p style={{ color:MUTED, fontSize:11, margin:"0 0 14px", lineHeight:1.5 }}>
                  Integrez QRowg dans vos applications<br/>avec notre API RESTful.
                </p>
                <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8, marginBottom:16, textAlign:"left" as const }}>
                  {["1 000 appels/mois (Pro)","10 000 appels/mois (Business)","Gestion QR via API","Webhooks","Analytics en temps reel","SDK officiel"].map((f,i) => (
                    <div key={i} style={{ display:"flex", alignItems:"center", gap:6 }}>
                      <CheckCircle size={11} color="rgba(123,97,255,0.5)"/>
                      <span style={{ color:MUTED, fontSize:10 }}>{f}</span>
                    </div>
                  ))}
                </div>
                <a href="/upgrade"
                  style={{ display:"inline-flex", alignItems:"center", gap:6, padding:"9px 20px", background:"linear-gradient(90deg,#7B61FF,#6040e0)", border:"none", borderRadius:9, color:"#F5F0E8", textDecoration:"none", fontSize:12, fontWeight:700 }}>
                  <Activity size={13}/> Passer a Pro ou Business
                </a>
              </div>
            ) : (
              <div style={{ display:"flex", flexDirection:"column", gap:12 }}>

                {/* Modales confirmation */}
                {(confirmRegen || confirmRevoke) && (
                  <div style={{ position:"fixed" as const, inset:0, background:"rgba(0,0,0,0.75)", display:"flex", alignItems:"center", justifyContent:"center", zIndex:2000, padding:20 }}
                    onClick={() => { setConfirmRegen(null); setConfirmRevoke(null) }}>
                    <div style={{ background:"#111009", border:`1px solid ${confirmRevoke?"rgba(255,107,107,0.3)":"color-mix(in srgb, var(--accent) 25%, transparent)"}`, borderRadius:16, padding:28, maxWidth:360, width:"100%" }}
                      onClick={e => e.stopPropagation()}>
                      <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:12 }}>
                        <AlertTriangle size={18} color={confirmRevoke?"var(--danger)":"var(--accent)"}/>
                        <p style={{ color:"#F5F0E8", fontSize:14, fontWeight:700, margin:0 }}>
                          {confirmRevoke ? "Revoquer la cle ?" : "Regenerer la cle ?"}
                        </p>
                      </div>
                      <p style={{ color:MUTED, fontSize:12, margin:"0 0 16px", lineHeight:1.6 }}>
                        {confirmRevoke
                          ? "La cle sera immediatement invalide. Les applications qui l'utilisent cesseront de fonctionner."
                          : "L'ancienne cle sera invalide immediatement. Mettez a jour vos applications avant de regenerer."}
                      </p>
                      <div style={{ display:"flex", gap:8 }}>
                        <button type="button" onClick={() => { setConfirmRegen(null); setConfirmRevoke(null) }}
                          style={{ flex:1, padding:"9px", background:"rgba(255,255,255,0.04)", border:"1px solid rgba(255,255,255,0.08)", borderRadius:9, color:MUTED, fontSize:12, cursor:"pointer" }}>
                          Annuler
                        </button>
                        <button type="button" disabled={!!regenKeyId || !!deletingKey}
                          onClick={() => confirmRegen ? regenerateApiKey(confirmRegen) : confirmRevoke ? revokeApiKey(confirmRevoke) : null}
                          style={{ flex:2, padding:"9px", background:confirmRevoke?"linear-gradient(90deg,var(--danger),#e05555)":"linear-gradient(90deg,var(--accent),color-mix(in srgb, var(--accent) 75%, #000))", border:"none", borderRadius:9, color:confirmRevoke?"#F5F0E8":"#080808", fontSize:12, fontWeight:700, cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", gap:7 }}>
                          {regenKeyId || deletingKey
                            ? <><div style={{ width:13, height:13, border:"2px solid rgba(255,255,255,0.3)", borderTopColor:"#F5F0E8", borderRadius:"50%", animation:"spin 0.7s linear infinite" }}/> Traitement...</>
                            : confirmRevoke ? "Revoquer" : "Regenerer"}
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {/* Banniere cle visible UNE SEULE FOIS */}
                {newKeyCreated && (
                  <div style={{ padding:"12px 14px", background:"rgba(57,255,143,0.08)", border:"1px solid rgba(57,255,143,0.25)", borderRadius:10 }}>
                    <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:8 }}>
                      <ShieldCheck size={14} color="var(--success)"/>
                      <p style={{ color:"var(--success)", fontSize:12, fontWeight:700, margin:0 }}>
                        Cle creee -- copiez-la maintenant, elle ne sera plus affichee
                      </p>
                    </div>
                    <div style={{ display:"flex", alignItems:"center", gap:8, background:SURF2, borderRadius:8, padding:"8px 11px", marginBottom:8 }}>
                      <code style={{ flex:1, color:"#F5F0E8", fontSize:10, wordBreak:"break-all" as const, fontFamily:"monospace" }}>
                        {newKeyCreated}
                      </code>
                    </div>
                    <button type="button"
                      onClick={() => { navigator.clipboard.writeText(newKeyCreated); setCopiedKey("new"); showToast("Cle copiee !") }}
                      style={{ display:"flex", alignItems:"center", gap:6, padding:"7px 14px", background:copiedKey==="new"?"rgba(57,255,143,0.12)":"rgba(255,255,255,0.06)", border:`1px solid ${copiedKey==="new"?"rgba(57,255,143,0.3)":"rgba(255,255,255,0.1)"}`, borderRadius:8, color:copiedKey==="new"?"var(--success)":"#F5F0E8", fontSize:11, fontWeight:600, cursor:"pointer" }}>
                      {copiedKey==="new" ? <><Check size={12}/> Copiee !</> : <><Copy size={12}/> Copier la cle</>}
                    </button>
                    <p style={{ color:"rgba(57,255,143,0.5)", fontSize:9, margin:"8px 0 0" }}>
                      Cette cle complete ne sera plus visible apres fermeture. Stockez-la dans votre gestionnaire de secrets.
                    </p>
                  </div>
                )}

                {/* Quota appels */}
                {(() => {
                  const limit = API_CALLS_LIMIT[currentPlan] ?? 0
                  const used  = apiCallsCount
                  const pct   = limit > 0 ? Math.min((used/limit)*100, 100) : 0
                  const isNear= limit > 0 && used >= Math.floor(limit * 0.8)
                  return (
                    <div style={{ padding:"12px 14px", background:`${isNear?"rgba(249,115,22,0.06)":"rgba(123,97,255,0.06)"}`, border:`1px solid ${isNear?"rgba(249,115,22,0.2)":"rgba(123,97,255,0.15)"}`, borderRadius:10 }}>
                      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"baseline", marginBottom:7 }}>
                        <div style={{ display:"flex", alignItems:"center", gap:7 }}>
                          <span style={{ color:"#7B61FF", fontSize:11, fontWeight:700 }}>Appels API ce mois</span>
                          {isNear && <span style={{ color:"#F97316", fontSize:9, fontWeight:700, background:"rgba(249,115,22,0.1)", border:"1px solid rgba(249,115,22,0.2)", borderRadius:4, padding:"1px 5px" }}>Limite proche</span>}
                        </div>
                        <span style={{ color:isNear?"#F97316":"#7B61FF", fontSize:12, fontWeight:700 }}>
                          {used.toLocaleString("fr-FR")} / {limit > 0 ? limit.toLocaleString("fr-FR") : "illimite"}
                        </span>
                      </div>
                      {limit > 0 && (
                        <div style={{ height:5, background:"rgba(255,255,255,0.06)", borderRadius:3, overflow:"hidden" }}>
                          <div style={{ height:"100%", width:`${pct}%`, background:isNear?"linear-gradient(90deg,#F97316,var(--danger))":"linear-gradient(90deg,#7B61FF,var(--action))", borderRadius:3, transition:"width 0.6s ease" }}/>
                        </div>
                      )}
                    </div>
                  )
                })()}

                {/* Liste des cles */}
                {apiKeys.length > 0 && (
                  <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
                    <p style={{ color:MUTED, fontSize:9, textTransform:"uppercase" as const, letterSpacing:1.2, margin:0 }}>
                      Cles API ({apiKeys.filter(k=>k.is_active).length} active{apiKeys.filter(k=>k.is_active).length>1?"s":""})
                    </p>
                    {apiKeys.map(key => (
                      <div key={key.id} style={{ background:SURF2, border:`1px solid ${key.is_active?"rgba(123,97,255,0.15)":"rgba(255,255,255,0.05)"}`, borderRadius:10, overflow:"hidden", opacity:key.is_active?1:0.6 }}>
                        {/* Header cle */}
                        <div style={{ display:"flex", alignItems:"center", gap:10, padding:"11px 13px" }}>
                          <div style={{ width:8, height:8, borderRadius:"50%", background:key.is_active?"var(--success)":MUTED, flexShrink:0 }}/>
                          <div style={{ flex:1, minWidth:0 }}>
                            <div style={{ display:"flex", alignItems:"center", gap:7, marginBottom:2 }}>
                              <p style={{ color:"#F5F0E8", fontSize:12, fontWeight:600, margin:0 }}>{key.name}</p>
                              {!key.is_active && (
                                <span style={{ background:"rgba(255,107,107,0.1)", border:"1px solid rgba(255,107,107,0.2)", borderRadius:4, padding:"1px 6px", fontSize:8, color:"var(--danger)", fontWeight:700 }}>
                                  REVOQUEE
                                </span>
                              )}
                            </div>
                            <code style={{ color:MUTED, fontSize:10 }}>{key.key_preview}</code>
                          </div>
                          {/* Actions */}
                          {key.is_active && (
                            <div style={{ display:"flex", gap:5, flexShrink:0 }}>
                              <button type="button"
                                onClick={() => { navigator.clipboard.writeText(key.key_preview); setCopiedKey(key.id); setTimeout(()=>setCopiedKey(null),2000) }}
                                title="Copier l'apercu"
                                style={{ width:28, height:28, background:"rgba(255,255,255,0.04)", border:"1px solid rgba(255,255,255,0.08)", borderRadius:7, display:"flex", alignItems:"center", justifyContent:"center", cursor:"pointer", color:copiedKey===key.id?"var(--success)":MUTED }}>
                                {copiedKey===key.id ? <Check size={12}/> : <Copy size={12}/>}
                              </button>
                              <button type="button"
                                onClick={() => setConfirmRegen(key.id)}
                                title="Regenerer"
                                style={{ width:28, height:28, background:"color-mix(in srgb, var(--accent) 8%, transparent)", border:"1px solid color-mix(in srgb, var(--accent) 20%, transparent)", borderRadius:7, display:"flex", alignItems:"center", justifyContent:"center", cursor:"pointer", color:G }}>
                                <RotateCcw size={12}/>
                              </button>
                              <button type="button"
                                onClick={() => setConfirmRevoke(key.id)}
                                title="Revoquer"
                                style={{ width:28, height:28, background:"rgba(255,107,107,0.06)", border:"1px solid rgba(255,107,107,0.15)", borderRadius:7, display:"flex", alignItems:"center", justifyContent:"center", cursor:"pointer", color:"var(--danger)" }}>
                                <Trash2 size={12}/>
                              </button>
                            </div>
                          )}
                        </div>
                        {/* Meta cle */}
                        <div style={{ display:"flex", gap:12, padding:"7px 13px", background:"rgba(0,0,0,0.15)", borderTop:"1px solid rgba(255,255,255,0.04)" }}>
                          <span style={{ color:MUTED, fontSize:9 }}>
                            Cree le {new Date(key.created_at).toLocaleDateString("fr-FR",{day:"numeric",month:"short",year:"numeric"})}
                          </span>
                          {key.last_used_at ? (
                            <span style={{ color:MUTED, fontSize:9 }}>
                              {" . "}Derniere util. {new Date(key.last_used_at).toLocaleDateString("fr-FR",{day:"numeric",month:"short"})}
                            </span>
                          ) : (
                            <span style={{ color:MUTED, fontSize:9 }}>{" . "}Jamais utilisee</span>
                          )}
                          {key.expires_at && (
                            <span style={{ color:new Date(key.expires_at)<new Date()?"var(--danger)":"#F97316", fontSize:9 }}>
                              {" . "}Expire le {new Date(key.expires_at).toLocaleDateString("fr-FR",{day:"numeric",month:"short",year:"numeric"})}
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Formulaire nouvelle cle */}
                {showNewKey ? (
                  <div style={{ display:"flex", gap:7 }}>
                    <input value={newKeyName} onChange={e => setNewKeyName(e.target.value)}
                      placeholder="Nom de la cle (ex: Production App)"
                      style={{ flex:1, background:"#0F0E0B", border:"1px solid rgba(255,255,255,0.08)", borderRadius:9, padding:"10px 12px", color:"#F5F0E8", fontSize:12, outline:"none", boxSizing:"border-box" as const }}
                      onKeyDown={e => e.key==="Enter" && createApiKey()}/>
                    <button type="button" onClick={createApiKey} disabled={!newKeyName.trim()}
                      style={{ padding:"0 16px", background:`linear-gradient(90deg,${G},color-mix(in srgb, var(--accent) 75%, #000))`, border:"none", borderRadius:9, color:"#080808", fontSize:12, fontWeight:700, cursor:"pointer", flexShrink:0 }}>
                      Creer
                    </button>
                    <button type="button" onClick={() => setShowNewKey(false)}
                      style={{ width:38, background:"none", border:"1px solid rgba(255,255,255,0.08)", borderRadius:9, color:MUTED, cursor:"pointer", flexShrink:0, display:"flex", alignItems:"center", justifyContent:"center" }}>
                      <X size={14}/>
                    </button>
                  </div>
                ) : (
                  <button type="button" onClick={() => setShowNewKey(true)}
                    style={{ display:"flex", alignItems:"center", justifyContent:"center", gap:6, padding:"10px", background:"rgba(123,97,255,0.08)", border:"1px solid rgba(123,97,255,0.2)", borderRadius:9, color:"#7B61FF", fontSize:12, fontWeight:600, cursor:"pointer" }}>
                    <Plus size={13}/> Nouvelle cle API
                  </button>
                )}

                {/* Infos securite */}
                <div style={{ padding:"10px 13px", background:"rgba(255,255,255,0.02)", border:"1px solid rgba(255,255,255,0.05)", borderRadius:9 }}>
                  <div style={{ display:"flex", flexDirection:"column", gap:5 }}>
                    {([
                      { icon:Shield,     text:"La cle complete n'est affichee qu'une seule fois a la creation" },
                      { icon:Key,        text:"Seul un hash SHA-256 est stocke en base de donnees" },
                      { icon:AlertTriangle, text:"Revoquez immediatement toute cle compromise" },
                    ] as const).map((info, i) => (
                      <div key={i} style={{ display:"flex", alignItems:"flex-start", gap:8 }}>
                        <info.icon size={11} color={MUTED} style={{ flexShrink:0, marginTop:1 }}/>
                        <span style={{ color:MUTED, fontSize:10, lineHeight:1.5 }}>{info.text}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Documentation API — exemples pour développeurs */}
                <div style={{ padding:"14px", background:"rgba(255,255,255,0.02)", border:"1px solid rgba(255,255,255,0.06)", borderRadius:9 }}>
                  <p style={{ color:"#F5F0E8", fontSize:12, fontWeight:700, margin:"0 0 4px" }}>Documentation API</p>
                  <p style={{ color:MUTED, fontSize:10.5, margin:"0 0 12px", lineHeight:1.6 }}>
                    Base <code style={{ color:"#C9C3B6" }}>https://qrowg.com/api/v1</code> · en-tête <code style={{ color:"#C9C3B6" }}>Authorization: Bearer &lt;clé&gt;</code> · 120 req/min par clé.
                  </p>
                  {([
                    { m:"GET",  p:"/pages",                  d:"Lister vos pages",                cmd:'curl https://qrowg.com/api/v1/pages \\\n  -H "Authorization: Bearer VOTRE_CLE"' },
                    { m:"GET",  p:"/qr-codes",               d:"Lister vos QR codes",             cmd:'curl https://qrowg.com/api/v1/qr-codes \\\n  -H "Authorization: Bearer VOTRE_CLE"' },
                    { m:"POST", p:"/qr/:code/destination",   d:"Changer la destination d'un QR",  cmd:'curl -X POST https://qrowg.com/api/v1/qr/CODE/destination \\\n  -H "Authorization: Bearer VOTRE_CLE" \\\n  -H "Content-Type: application/json" \\\n  -d \'{"type":"url","value":"https://exemple.fr"}\'' },
                  ] as const).map((e, i) => (
                    <div key={i} style={{ marginBottom:11 }}>
                      <div style={{ display:"flex", alignItems:"center", gap:7, marginBottom:5, flexWrap:"wrap" }}>
                        <span style={{ fontSize:9, fontWeight:800, color:e.m==="GET"?"var(--success)":"#F97316", background:e.m==="GET"?"rgba(57,255,143,0.1)":"rgba(249,115,22,0.1)", border:`1px solid ${e.m==="GET"?"rgba(57,255,143,0.25)":"rgba(249,115,22,0.25)"}`, borderRadius:4, padding:"1px 6px" }}>{e.m}</span>
                        <code style={{ color:"#F5F0E8", fontSize:11 }}>{e.p}</code>
                        <span style={{ color:MUTED, fontSize:10 }}>· {e.d}</span>
                      </div>
                      <pre style={{ margin:0, padding:"8px 10px", background:"#0A0908", border:"1px solid rgba(255,255,255,0.06)", borderRadius:7, color:"#B8B2A4", fontSize:9.5, lineHeight:1.6, overflowX:"auto", whiteSpace:"pre" }}>{e.cmd}</pre>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </SectionCard>
          )}


          {/* 9. DOMAINES */}
          {ptab === "abonnement" && (
          <SectionCard title="Domaines personnalises" icon={Globe} color="var(--action)"
            tag={domains.length > 0 ? `${domains.length}` : undefined}
            action={
              <a href="/dashboard/domains"
                style={{ display:"flex", alignItems:"center", gap:4, color:MUTED, fontSize:11, textDecoration:"none" }}>
                Gerer <ChevronRight size={12}/>
              </a>
            }>
            {currentPlan === "free" ? (
              /* CTA upgrade plan insuffisant */
              <div style={{ textAlign:"center" as const, padding:"20px 0" }}>
                <Globe size={28} color={MUTED} style={{ marginBottom:10 }}/>
                <p style={{ color:"#F5F0E8", fontSize:13, fontWeight:600, margin:"0 0 5px" }}>Domaines personnalises</p>
                <p style={{ color:MUTED, fontSize:11, margin:"0 0 14px", lineHeight:1.5 }}>
                  Connectez votre propre domaine<br/>a vos pages QRowg.
                </p>
                <a href="/upgrade"
                  style={{ display:"inline-flex", alignItems:"center", gap:6, padding:"9px 18px", background:`linear-gradient(90deg,${G},color-mix(in srgb, var(--accent) 75%, #000))`, border:"none", borderRadius:9, color:"#080808", textDecoration:"none", fontSize:12, fontWeight:700 }}>
                  <Activity size={13}/> Passer a Starter ou Pro
                </a>
              </div>
            ) : domainsLoading ? (
              /* Skeleton */
              <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
                {[...Array(2)].map((_,i) => (
                  <div key={i} style={{ height:60, borderRadius:9, background:"rgba(255,255,255,0.04)", animation:"pulse 1.4s ease-in-out infinite", animationDelay:`${i*0.1}s` }}/>
                ))}
              </div>
            ) : domains.length === 0 ? (
              /* Empty state Pro */
              <div style={{ textAlign:"center" as const, padding:"16px 0" }}>
                <Globe size={26} color={MUTED} style={{ marginBottom:9 }}/>
                <p style={{ color:"#F5F0E8", fontSize:13, fontWeight:600, margin:"0 0 4px" }}>Aucun domaine connecte</p>
                <p style={{ color:MUTED, fontSize:11, margin:"0 0 14px", lineHeight:1.5 }}>
                  Utilisez votre propre domaine pour<br/>toutes vos pages QRowg.
                </p>
                <a href="/dashboard/domains"
                  style={{ display:"inline-flex", alignItems:"center", gap:6, padding:"9px 18px", background:"rgba(56,189,248,0.1)", border:"1px solid rgba(56,189,248,0.25)", borderRadius:9, color:"var(--action)", textDecoration:"none", fontSize:12, fontWeight:700 }}>
                  <Plus size={13}/> Ajouter un domaine
                </a>
              </div>
            ) : (
              /* Liste domaines */
              <div style={{ display:"flex", flexDirection:"column", gap:10 }}>

                {/* KPIs rapides */}
                <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:7 }}>
                  {([
                    { label:"Total",    value:domains.length,                                              color:"var(--action)" },
                    { label:"Actifs",   value:domains.filter(d=>d.vercel_status==="active").length,        color:"var(--success)" },
                    { label:"En attente",value:domains.filter(d=>d.vercel_status==="pending").length,      color:"#F97316" },
                  ] as const).map((k,i) => (
                    <div key={i} style={{ background:SURF2, border:"1px solid rgba(255,255,255,0.05)", borderRadius:9, padding:"9px 10px", textAlign:"center" as const }}>
                      <p style={{ color:k.color, fontSize:18, fontWeight:800, margin:0, fontFamily:"Fraunces, serif", lineHeight:1 }}>{k.value}</p>
                      <p style={{ color:MUTED, fontSize:9, margin:"3px 0 0" }}>{k.label}</p>
                    </div>
                  ))}
                </div>

                {/* Cartes domaines */}
                {domains.slice(0, 4).map(dm => {
                  const statusMap: Record<string, { label:string; color:string; dot:string }> = {
                    active:  { label:"Actif",       color:"var(--success)", dot:"var(--success)" },
                    pending: { label:"En attente",  color:"#F97316", dot:"#F97316" },
                    error:   { label:"Erreur DNS",  color:"var(--danger)", dot:"var(--danger)" },
                  }
                  const st = statusMap[dm.vercel_status] ?? statusMap["pending"]
                  return (
                    <div key={dm.id} style={{ background:SURF2, border:`1px solid ${dm.is_primary?"color-mix(in srgb, var(--accent) 20%, transparent)":"rgba(255,255,255,0.06)"}`, borderRadius:10, overflow:"hidden" }}>
                      {/* Header domaine */}
                      <div style={{ display:"flex", alignItems:"center", gap:10, padding:"11px 13px" }}>
                        {/* Dot statut */}
                        <div style={{ width:8, height:8, borderRadius:"50%", background:st.dot, flexShrink:0, boxShadow:dm.vercel_status==="active"?`0 0 6px ${st.dot}60`:undefined }}/>
                        <div style={{ flex:1, minWidth:0 }}>
                          <div style={{ display:"flex", alignItems:"center", gap:7 }}>
                            <a href={`https://${dm.domain}`} target="_blank" rel="noopener noreferrer"
                              style={{ color:"#F5F0E8", fontSize:12, fontWeight:700, textDecoration:"none", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" as const }}>
                              {dm.domain}
                            </a>
                            {dm.is_primary && (
                              <span style={{ background:"color-mix(in srgb, var(--accent) 12%, transparent)", border:"1px solid color-mix(in srgb, var(--accent) 25%, transparent)", borderRadius:4, padding:"1px 6px", fontSize:8, color:G, fontWeight:800, flexShrink:0 }}>
                                PRINCIPAL
                              </span>
                            )}
                          </div>
                          <div style={{ display:"flex", alignItems:"center", gap:8, marginTop:2 }}>
                            <span style={{ color:st.color, fontSize:9, fontWeight:600 }}>{st.label}</span>
                            {dm.pages && (
                              <span style={{ color:MUTED, fontSize:9 }}>
                                {" . "}{dm.pages.title}
                              </span>
                            )}
                          </div>
                        </div>
                        {/* Actions */}
                        <div style={{ display:"flex", gap:5, flexShrink:0 }}>
                          {!dm.is_primary && dm.vercel_status === "active" && (
                            <button type="button"
                              onClick={() => setPrimaryDomain(dm.id)}
                              disabled={settingPrimary === dm.id}
                              title="Definir comme principal"
                              style={{ width:26, height:26, background:"color-mix(in srgb, var(--accent) 8%, transparent)", border:"1px solid color-mix(in srgb, var(--accent) 20%, transparent)", borderRadius:6, display:"flex", alignItems:"center", justifyContent:"center", cursor:"pointer", color:G }}>
                              {settingPrimary===dm.id
                                ? <div style={{ width:11, height:11, border:`1.5px solid color-mix(in srgb, var(--accent) 19%, transparent)`, borderTopColor:G, borderRadius:"50%", animation:"spin 0.7s linear infinite" }}/>
                                : <CheckCircle size={12}/>}
                            </button>
                          )}
                          <a href="/dashboard/domains"
                            title="Configurer DNS"
                            style={{ width:26, height:26, background:"rgba(56,189,248,0.06)", border:"1px solid rgba(56,189,248,0.15)", borderRadius:6, display:"flex", alignItems:"center", justifyContent:"center", color:"var(--action)", textDecoration:"none" }}>
                            <Settings size={11}/>
                          </a>
                          <button type="button"
                            onClick={() => deleteDomain(dm.id)}
                            disabled={deletingDomain === dm.id}
                            title="Supprimer"
                            style={{ width:26, height:26, background:"rgba(255,107,107,0.06)", border:"1px solid rgba(255,107,107,0.15)", borderRadius:6, display:"flex", alignItems:"center", justifyContent:"center", cursor:"pointer", color:"var(--danger)" }}>
                            {deletingDomain===dm.id
                              ? <div style={{ width:11, height:11, border:"1.5px solid rgba(255,107,107,0.3)", borderTopColor:"var(--danger)", borderRadius:"50%", animation:"spin 0.7s linear infinite" }}/>
                              : <Trash2 size={11}/>}
                          </button>
                        </div>
                      </div>

                      {/* Alerte erreur DNS */}
                      {dm.vercel_status === "error" && dm.vercel_error && (
                        <div style={{ padding:"8px 13px", background:"rgba(255,107,107,0.06)", borderTop:"1px solid rgba(255,107,107,0.12)" }}>
                          <p style={{ color:"rgba(255,107,107,0.8)", fontSize:10, margin:0 }}>{dm.vercel_error}</p>
                        </div>
                      )}

                      {/* Bande SSL si actif */}
                      {dm.vercel_status === "active" && (
                        <div style={{ display:"flex", alignItems:"center", gap:6, padding:"6px 13px", background:"rgba(57,255,143,0.03)", borderTop:"1px solid rgba(57,255,143,0.08)" }}>
                          <Shield size={10} color="var(--success)"/>
                          <span style={{ color:"rgba(57,255,143,0.7)", fontSize:9 }}>
                            SSL actif {dm.verified_at ? `depuis le ${new Date(dm.verified_at).toLocaleDateString("fr-FR",{day:"numeric",month:"short",year:"numeric"})}` : ""}
                          </span>
                        </div>
                      )}
                    </div>
                  )
                })}

                {domains.length > 4 && (
                  <a href="/dashboard/domains"
                    style={{ display:"flex", alignItems:"center", justifyContent:"center", gap:5, padding:"8px", color:MUTED, fontSize:11, textDecoration:"none" }}>
                    Voir les {domains.length - 4} autres domaines <ChevronRight size={12}/>
                  </a>
                )}

                {/* CTA ajouter */}
                <a href="/dashboard/domains"
                  style={{ display:"flex", alignItems:"center", justifyContent:"center", gap:7, padding:"10px", background:"rgba(56,189,248,0.06)", border:"1px solid rgba(56,189,248,0.15)", borderRadius:9, color:"var(--action)", textDecoration:"none", fontSize:12, fontWeight:600 }}>
                  <Plus size={13}/> Ajouter un domaine
                </a>
              </div>
            )}
          </SectionCard>
          )}


          {/* 10. PREFERENCES */}
          {ptab === "preferences" && (
          <SectionCard title="Preferences" icon={Settings} color="#F97316"
            action={
              <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                {prefsSaving && (
                  <div style={{ width:12, height:12, border:"1.5px solid rgba(249,115,22,0.3)", borderTopColor:"#F97316", borderRadius:"50%", animation:"spin 0.7s linear infinite" }}/>
                )}
                {prefsSaved && !prefsSaving && (
                  <span style={{ color:"var(--success)", fontSize:10, display:"flex", alignItems:"center", gap:4 }}>
                    <Check size={10}/> Sauvegarde
                  </span>
                )}
              </div>
            }>
            <div style={{ display:"flex", flexDirection:"column", gap:16 }}>

              {/* -- Localisation ---------------------------------------- */}
              <div>
                <p style={{ color:MUTED, fontSize:9, textTransform:"uppercase" as const, letterSpacing:1.2, margin:"0 0 10px" }}>Localisation</p>
                <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8 }}>

                  {/* Langue */}
                  <div>
                    <label style={{ color:MUTED, fontSize:10, display:"block", marginBottom:5, fontWeight:500 }}>Langue</label>
                    <select value={prefs.locale} onChange={e => setPrefField("locale", e.target.value)}
                      style={{ width:"100%", background:"#0F0E0B", border:"1px solid rgba(255,255,255,0.08)", borderRadius:8, padding:"8px 10px", color:"#F5F0E8", fontSize:12, outline:"none", cursor:"pointer", boxSizing:"border-box" as const }}>
                      <option value="fr">Francais</option>
                      <option value="en">English</option>
                      <option value="es">Espanol</option>
                      <option value="de">Deutsch</option>
                      <option value="pt">Portugues</option>
                    </select>
                  </div>

                  {/* Devise */}
                  <div>
                    <label style={{ color:MUTED, fontSize:10, display:"block", marginBottom:5, fontWeight:500 }}>Devise</label>
                    <select value={prefs.currency} onChange={e => setPrefField("currency", e.target.value)}
                      style={{ width:"100%", background:"#0F0E0B", border:"1px solid rgba(255,255,255,0.08)", borderRadius:8, padding:"8px 10px", color:"#F5F0E8", fontSize:12, outline:"none", cursor:"pointer", boxSizing:"border-box" as const }}>
                      <option value="EUR">EUR (Euro)</option>
                      <option value="USD">USD (Dollar)</option>
                      <option value="GBP">GBP (Livre)</option>
                      <option value="CHF">CHF (Franc suisse)</option>
                      <option value="CAD">CAD (Dollar canadien)</option>
                    </select>
                  </div>

                  {/* Fuseau horaire */}
                  <div style={{ gridColumn:"1 / -1" }}>
                    <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:5 }}>
                      <label style={{ color:MUTED, fontSize:10, fontWeight:500 }}>Fuseau horaire</label>
                      <button type="button"
                        onClick={() => setPrefField("timezone", Intl.DateTimeFormat().resolvedOptions().timeZone)}
                        style={{ color:G, fontSize:9, background:"none", border:"none", cursor:"pointer", padding:0, display:"flex", alignItems:"center", gap:3 }}>
                        <RotateCcw size={9}/> Auto-detecter
                      </button>
                    </div>
                    <select value={prefs.timezone} onChange={e => setPrefField("timezone", e.target.value)}
                      style={{ width:"100%", background:"#0F0E0B", border:"1px solid rgba(255,255,255,0.08)", borderRadius:8, padding:"8px 10px", color:"#F5F0E8", fontSize:12, outline:"none", cursor:"pointer", boxSizing:"border-box" as const }}>
                      {[
                        "Europe/Paris","Europe/London","Europe/Berlin","Europe/Madrid","Europe/Rome",
                        "America/New_York","America/Chicago","America/Denver","America/Los_Angeles",
                        "America/Sao_Paulo","America/Montreal",
                        "Asia/Tokyo","Asia/Shanghai","Asia/Kolkata","Asia/Dubai",
                        "Pacific/Auckland","Australia/Sydney","Africa/Casablanca",
                      ].map(tz => <option key={tz} value={tz}>{tz.replace("_"," ")}</option>)}
                    </select>
                  </div>

                  {/* Format date */}
                  <div>
                    <label style={{ color:MUTED, fontSize:10, display:"block", marginBottom:5, fontWeight:500 }}>Format date</label>
                    <select value={prefs.date_format} onChange={e => setPrefField("date_format", e.target.value)}
                      style={{ width:"100%", background:"#0F0E0B", border:"1px solid rgba(255,255,255,0.08)", borderRadius:8, padding:"8px 10px", color:"#F5F0E8", fontSize:12, outline:"none", cursor:"pointer", boxSizing:"border-box" as const }}>
                      <option value="DD/MM/YYYY">DD/MM/YYYY</option>
                      <option value="MM/DD/YYYY">MM/DD/YYYY</option>
                      <option value="YYYY-MM-DD">YYYY-MM-DD</option>
                      <option value="D MMMM YYYY">D MMMM YYYY</option>
                    </select>
                  </div>

                  {/* Format heure */}
                  <div>
                    <label style={{ color:MUTED, fontSize:10, display:"block", marginBottom:5, fontWeight:500 }}>Format heure</label>
                    <select value={prefs.time_format} onChange={e => setPrefField("time_format", e.target.value)}
                      style={{ width:"100%", background:"#0F0E0B", border:"1px solid rgba(255,255,255,0.08)", borderRadius:8, padding:"8px 10px", color:"#F5F0E8", fontSize:12, outline:"none", cursor:"pointer", boxSizing:"border-box" as const }}>
                      <option value="24h">24h (14:30)</option>
                      <option value="12h">12h (2:30 PM)</option>
                    </select>
                  </div>
                </div>

                {/* Preview format */}
                <div style={{ marginTop:8, padding:"7px 11px", background:"rgba(249,115,22,0.05)", border:"1px solid rgba(249,115,22,0.12)", borderRadius:8, display:"flex", alignItems:"center", gap:8 }}>
                  <Clock size={11} color="#F97316"/>
                  <span style={{ color:MUTED, fontSize:10 }}>
                    Apercu : {(() => {
                      const now = new Date()
                      const d   = now.getDate().toString().padStart(2,"0")
                      const m   = (now.getMonth()+1).toString().padStart(2,"0")
                      const y   = now.getFullYear()
                      const h24 = now.getHours().toString().padStart(2,"0")
                      const min = now.getMinutes().toString().padStart(2,"0")
                      const h12 = now.getHours() % 12 || 12
                      const ampm = now.getHours() >= 12 ? "PM" : "AM"
                      const dateStr = prefs.date_format === "DD/MM/YYYY" ? `${d}/${m}/${y}`
                        : prefs.date_format === "MM/DD/YYYY" ? `${m}/${d}/${y}`
                        : prefs.date_format === "YYYY-MM-DD" ? `${y}-${m}-${d}`
                        : `${now.getDate()} ${now.toLocaleString("fr-FR",{month:"long"})} ${y}`
                      const timeStr = prefs.time_format === "24h" ? `${h24}:${min}` : `${h12}:${min} ${ampm}`
                      return `${dateStr} a ${timeStr}`
                    })()}
                  </span>
                </div>
              </div>

              {/* -- Notifications --------------------------------------- */}
              <div>
                <p style={{ color:MUTED, fontSize:9, textTransform:"uppercase" as const, letterSpacing:1.2, margin:"0 0 10px" }}>Notifications</p>
                <div style={{ display:"flex", flexDirection:"column", gap:7 }}>
                  {([
                    { key:"notif_email"    as const, label:"Notifications par email",   desc:"Alertes scans, vues, QR codes"         },
                    { key:"notif_scan"     as const, label:"Alertes scan en temps reel", desc:"Notification a chaque scan QR"         },
                    { key:"notif_security" as const, label:"Alertes de securite",        desc:"Connexions et changements de compte"   },
                  ]).map(item => (
                    <div key={item.key} style={{ display:"flex", alignItems:"center", justifyContent:"space-between", padding:"10px 12px", background:SURF2, border:"1px solid rgba(255,255,255,0.05)", borderRadius:9 }}>
                      <div>
                        <p style={{ color:"#F5F0E8", fontSize:12, fontWeight:600, margin:0 }}>{item.label}</p>
                        <p style={{ color:MUTED, fontSize:10, margin:"2px 0 0" }}>{item.desc}</p>
                      </div>
                      <button type="button" onClick={() => togglePref(item.key, !prefs[item.key])}
                        style={{ width:38, height:21, borderRadius:11, background:prefs[item.key]?`linear-gradient(90deg,${G},color-mix(in srgb, var(--accent) 75%, #000))`:"rgba(255,255,255,0.08)", border:"none", cursor:"pointer", position:"relative" as const, transition:"background 0.2s", flexShrink:0 }}>
                        <div style={{ position:"absolute" as const, top:2.5, left:prefs[item.key]?20:3, width:16, height:16, borderRadius:"50%", background:"#F5F0E8", transition:"left 0.2s", boxShadow:"0 1px 3px rgba(0,0,0,0.3)" }}/>
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* -- Rapports ------------------------------------------- */}
              <div>
                <p style={{ color:MUTED, fontSize:9, textTransform:"uppercase" as const, letterSpacing:1.2, margin:"0 0 10px" }}>Rapports automatiques</p>
                <div style={{ display:"flex", flexDirection:"column", gap:7 }}>
                  {([
                    { key:"report_weekly"  as const, label:"Resume hebdomadaire", desc:"Stats de la semaine chaque lundi matin",   plan:"free" },
                    { key:"report_monthly" as const, label:"Rapport mensuel",     desc:"Bilan complet du mois + recommandations",  plan:"pro"  },
                  ]).map(item => {
                    const locked = item.plan === "pro" && currentPlan === "free"
                    return (
                      <div key={item.key} style={{ display:"flex", alignItems:"center", justifyContent:"space-between", padding:"10px 12px", background:SURF2, border:"1px solid rgba(255,255,255,0.05)", borderRadius:9, opacity:locked?0.6:1 }}>
                        <div>
                          <div style={{ display:"flex", alignItems:"center", gap:7 }}>
                            <p style={{ color:"#F5F0E8", fontSize:12, fontWeight:600, margin:0 }}>{item.label}</p>
                            {locked && <span style={{ background:`color-mix(in srgb, var(--accent) 7%, transparent)`, border:`1px solid color-mix(in srgb, var(--accent) 15%, transparent)`, borderRadius:4, padding:"1px 6px", fontSize:8, color:G, fontWeight:700 }}>Pro</span>}
                          </div>
                          <p style={{ color:MUTED, fontSize:10, margin:"2px 0 0" }}>{item.desc}</p>
                        </div>
                        <button type="button"
                          disabled={locked}
                          onClick={() => !locked && togglePref(item.key, !prefs[item.key])}
                          style={{ width:38, height:21, borderRadius:11, background:!locked&&prefs[item.key]?`linear-gradient(90deg,${G},color-mix(in srgb, var(--accent) 75%, #000))`:"rgba(255,255,255,0.08)", border:"none", cursor:locked?"not-allowed":"pointer", position:"relative" as const, transition:"background 0.2s", flexShrink:0 }}>
                          <div style={{ position:"absolute" as const, top:2.5, left:!locked&&prefs[item.key]?20:3, width:16, height:16, borderRadius:"50%", background:"#F5F0E8", transition:"left 0.2s", boxShadow:"0 1px 3px rgba(0,0,0,0.3)" }}/>
                        </button>
                      </div>
                    )
                  })}
                </div>
              </div>

              {/* -- Couleur d'accent ------------------------------------ */}
              <div>
                <p style={{ color:MUTED, fontSize:9, textTransform:"uppercase" as const, letterSpacing:1.2, margin:"0 0 10px" }}>Couleur d'accent</p>
                <div style={{ display:"flex", alignItems:"center", gap:10 }}>
                  <div style={{ display:"flex", gap:7, flexWrap:"wrap" as const }}>
                    {[
                      "#C9A84C","var(--success)","var(--action)","#7B61FF",
                      "#EC4899","#F97316","var(--danger)","#F5F0E8",
                    ].map(color => (
                      <button key={color} type="button" onClick={() => setPrefField("accent_color", color)}
                        style={{ width:28, height:28, borderRadius:8, background:color, border:prefs.accent_color===color?`2px solid #F5F0E8`:"2px solid transparent", cursor:"pointer", transition:"border 0.15s", boxShadow:prefs.accent_color===color?`0 0 10px ${color}60`:"none" }}/>
                    ))}
                    <label style={{ width:28, height:28, borderRadius:8, border:"1px dashed rgba(255,255,255,0.2)", cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", position:"relative" as const, overflow:"hidden" as const }}
                      title="Couleur personnalisee">
                      <span style={{ color:MUTED, fontSize:14 }}>+</span>
                      <input type="color" value={prefs.accent_color}
                        onChange={e => setPrefField("accent_color", e.target.value)}
                        style={{ position:"absolute" as const, inset:0, opacity:0, cursor:"pointer", width:"100%", height:"100%" }}/>
                    </label>
                  </div>
                  <div style={{ flex:1, height:6, borderRadius:3, background:`linear-gradient(90deg,${prefs.accent_color},${prefs.accent_color}40)`, transition:"background 0.3s" }}/>
                  <code style={{ color:prefs.accent_color, fontSize:10, fontFamily:"monospace", flexShrink:0 }}>{prefs.accent_color}</code>
                </div>
                <p style={{ color:MUTED, fontSize:9, margin:"6px 0 0" }}>
                  S'applique immediatement au tableau de bord (menu lateral, logo, elements actifs).
                </p>
              </div>
            </div>
          </SectionCard>
          )}

        </div>
      </div>
    </div>
  )
}
