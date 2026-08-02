"use client"

import { useEffect, useState, useCallback } from "react"
import { createClient } from "@/lib/supabase/client"
import Link from "next/link"
import { Plus, QrCode, BarChart2, Eye, Zap, ArrowRight, Globe, Trash2, ExternalLink, Edit3, AlertTriangle, X, Check, MoreHorizontal } from "lucide-react"
import { getPlan, fmtPrice } from "@/lib/plans"
import Particles from "@/components/Particles"
import { useIsMobile } from "@/lib/useIsMobile"
import NextStepCard from "@/components/NextStepCard"
import { accessibleOwnerIds } from "@/lib/team"
import RecentLeadsCard from "./RecentLeadsCard"
import { useToast } from "@/components/Toast"
import { Button } from "@/components/ui/Button"
import { Modal } from "@/components/ui/Modal"

type Page = { id: string; title: string; slug: string; status: string; total_views: number; created_at: string }
type Profile = { full_name: string | null; plan: string; total_scans: number; total_pages: number; avatar_url: string | null }

const PLAN_CONFIG: Record<string, { color: string; label: string }> = {
  free: { color: "#A8A190", label: "Free" },
  starter: { color: "var(--action)", label: "Starter" },
  pro: { color: "var(--accent)", label: "Pro" },
  business: { color: "var(--success)", label: "Business" },
}

function DeleteModal({ page, onConfirm, onCancel, deleting }: { page: Page; onConfirm: () => void; onCancel: () => void; deleting: boolean }) {
  return (
    <Modal open onClose={onCancel} title="Supprimer cette page ?"
      footer={<>
        <Button variant="ghost" onClick={onCancel} disabled={deleting}>Annuler</Button>
        <Button variant="danger" onClick={onConfirm} loading={deleting} leftIcon={<Trash2 size={15} />}>Supprimer définitivement</Button>
      </>}>
      Vous êtes sur le point de supprimer <strong style={{ color: "#F5F0E8" }}>« {page.title} »</strong>. Cette action supprimera aussi les blocs, le QR code et toutes les données analytics associées. Elle est irréversible.
    </Modal>
  )
}

type DashProps = {
  // Données préchargées côté SERVEUR (évite le double getUser() + le waterfall
  // client + le spinner initial). Optionnelles : si absentes, on charge au montage.
  initialProfile?: Profile | null
  initialPages?: Page[]
  initialMonthViews?: number
  initialTodayViews?: number
  initialWeekViews?: number[]
}

export default function DashboardClient({
  initialProfile = null, initialPages = [], initialMonthViews = 0, initialTodayViews = 0, initialWeekViews = [],
}: DashProps = {}) {
  const isMobile = useIsMobile()
  const toast = useToast()
  const [profile, setProfile] = useState<Profile | null>(initialProfile)
  const [pages, setPages] = useState<Page[]>(initialPages)
  const [loading, setLoading] = useState(!initialProfile) // pas de spinner si déjà seedé par le serveur
  const [pageToDelete, setPageToDelete] = useState<Page | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [hour] = useState(new Date().getHours())
  const [monthViews, setMonthViews] = useState(initialMonthViews) // vues du mois en cours (quota)
  const [todayViews, setTodayViews] = useState(initialTodayViews) // vues aujourd'hui (vie du dashboard)
  const [weekViews, setWeekViews] = useState<number[]>(initialWeekViews) // 7 derniers jours (mini-sparkline)
  const [menuPage, setMenuPage] = useState<Page | null>(null) // ligne "..." -> bottom sheet d'actions (echappe l'overflow de la carte)
  const [copiedId, setCopiedId] = useState<string | null>(null) // feedback "Lien copie"

  const greeting = hour < 12 ? "Bonjour" : hour < 18 ? "Bon apres-midi" : "Bonsoir"

  async function load() {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { window.location.href = "/auth/login"; return }
    // Pages accessibles : les siennes + celles des équipes dont il est membre.
    const ownerIds = await accessibleOwnerIds(supabase, user.id)
    const [{ data: prof }, { data: pgs }] = await Promise.all([
      supabase.from("profiles").select("full_name,plan,total_scans,total_pages,avatar_url").eq("id", user.id).single(),
      supabase.from("pages").select("id,title,slug,status,total_views,created_at").in("user_id", ownerIds).order("created_at", { ascending: false }).limit(20),
    ])
    if (prof) setProfile(prof)
    if (pgs) setPages(pgs)
    // Vues du mois en cours (quota) — compte les page_views des pages de l'user depuis le 1er du mois
    const ids = (pgs ?? []).map(p => p.id)
    if (ids.length) {
      const now = new Date()
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()
      const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate())
      const weekStart  = new Date(todayStart); weekStart.setDate(weekStart.getDate() - 6)
      const [{ count: mCount }, { count: tCount }, { data: wRows }] = await Promise.all([
        supabase.from("page_views").select("id", { count: "exact", head: true }).in("page_id", ids).gte("viewed_at", monthStart),
        supabase.from("page_views").select("id", { count: "exact", head: true }).in("page_id", ids).gte("viewed_at", todayStart.toISOString()),
        supabase.from("page_views").select("viewed_at").in("page_id", ids).gte("viewed_at", weekStart.toISOString()),
      ])
      setMonthViews(mCount ?? 0)
      setTodayViews(tCount ?? 0)
      // Répartition sur 7 jours pour la mini-courbe
      const buckets = Array(7).fill(0)
      for (const r of (wRows ?? [])) {
        const d = new Date((r as any).viewed_at)
        const idx = Math.floor((d.getTime() - weekStart.getTime()) / 86400000)
        if (idx >= 0 && idx < 7) buckets[idx]++
      }
      setWeekViews(buckets)
    } else { setMonthViews(0); setTodayViews(0); setWeekViews([]) }
    setLoading(false)
  }

  // Si le serveur a déjà seedé les données (props), on évite le fetch initial
  // (et le 2e getUser()). load() reste utilisé pour rafraîchir après une mutation.
  useEffect(() => { if (!initialProfile) load() }, [])

  async function deletePage(page: Page) {
    setDeleting(true)
    const supabase = createClient()
    // Supprimer blocs, QR codes, scans, vues (cascade via FK). On ne retire de
    // l'UI qu'en cas de SUCCÈS (sinon la page "disparaissait" puis revenait au
    // reload sans explication).
    const { error } = await supabase.from("pages").delete().eq("id", page.id)
    setDeleting(false)
    setPageToDelete(null)
    if (error) { toast.error("Suppression impossible : " + error.message); return }
    setPages(p => p.filter(pg => pg.id !== page.id))
    toast.success("Page supprimée")
    // Refresh profile stats
    load()
  }

  async function togglePublish(page: Page) {
    const supabase = createClient()
    const newStatus = page.status === "published" ? "draft" : "published"
    // .select() confirme que l'update a porté : sinon on affichait "En ligne"
    // alors que la page restait en brouillon (état mensonger).
    const { data, error } = await supabase.from("pages").update({ status: newStatus }).eq("id", page.id).select("id")
    if (error || !data || data.length === 0) {
      toast.error("Action impossible" + (error ? " : " + error.message : ""))
      return
    }
    setPages(p => p.map(pg => pg.id === page.id ? { ...pg, status: newStatus } : pg))
    setMenuPage(m => m && m.id === page.id ? { ...m, status: newStatus } : m)
    toast.success(newStatus === "published" ? "Page publiée" : "Page dépubliée")
  }

  // Miniature deterministe (pas de theme stocke) : degrade + initiale, teinte derivee du titre.
  function pageHue(s: string) { let h = 0; for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) % 360; return h }
  // Temps relatif court (fr) a partir d'une date ISO.
  function relTime(iso?: string) {
    if (!iso) return ""
    const d = Math.floor((Date.now() - new Date(iso).getTime()) / 1000)
    if (d < 60) return "à l'instant"
    if (d < 3600) return `il y a ${Math.floor(d / 60)} min`
    if (d < 86400) return `il y a ${Math.floor(d / 3600)} h`
    if (d < 2592000) return `il y a ${Math.floor(d / 86400)} j`
    return `il y a ${Math.floor(d / 2592000)} mois`
  }
  function copyLink(page: Page) {
    try { navigator.clipboard?.writeText(window.location.origin + "/" + page.slug) } catch {}
    setCopiedId(page.id); setTimeout(() => setCopiedId(null), 1600)
  }

  const planCfg = PLAN_CONFIG[profile?.plan || "free"]
  const G = "var(--accent)"; const MUTED = "#A8A190"
  const publishedCount = pages.filter(p => p.status === "published").length
  // Parcours guidé : tant qu'aucun scan, on montre la prochaine meilleure action
  const totalScans = profile?.total_scans || 0
  const firstPub = pages.find(p => p.status === "published")
  const guide: null | "nopage" | "noscan" = pages.length === 0 ? "nopage" : totalScans === 0 ? "noscan" : null
  // Quota de vues mensuel (soft-cap : on alerte, on ne bloque jamais les pages publiques)
  const viewsLimit = getPlan(profile?.plan).limits.views // null = illimité
  const viewsPct   = viewsLimit ? Math.min(Math.round((monthViews / viewsLimit) * 100), 999) : 0
  const nearViews  = viewsLimit != null && monthViews >= viewsLimit * 0.8 && monthViews < viewsLimit
  const overViews  = viewsLimit != null && monthViews >= viewsLimit

  if (loading) return (
    <div style={{ minHeight: "100dvh", background: "transparent", padding: "30px 28px 48px", fontFamily: "DM Sans, sans-serif" }}>
      <div style={{ maxWidth: 1080, margin: "0 auto", position: "relative", zIndex: 1 }}>
        {/* En-tête */}
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 22 }}>
          <div>
            <div className="skeleton" style={{ width: 280, height: 38, marginBottom: 10 }} />
            <div className="skeleton" style={{ width: 150, height: 16 }} />
          </div>
          <div className="skeleton" style={{ width: 150, height: 44, borderRadius: 12 }} />
        </div>
        {/* KPI */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(170px,1fr))", gap: 13, marginBottom: 20 }}>
          {[0, 1, 2, 3].map(i => <div key={i} className="skeleton" style={{ height: 104, borderRadius: 14 }} />)}
        </div>
        {/* Colonnes */}
        <div style={{ display: "grid", gridTemplateColumns: "1.5fr 1fr", gap: 14 }}>
          <div className="skeleton" style={{ height: 340, borderRadius: 16 }} />
          <div className="skeleton" style={{ height: 340, borderRadius: 16 }} />
        </div>
      </div>
    </div>
  )

  // Hover lift réutilisable (anime + restaure l'ombre de repos)
  const hov = (rest = "none") => ({
    onMouseEnter: (e: any) => { e.currentTarget.style.transform = "translateY(-3px)"; e.currentTarget.style.boxShadow = "0 16px 38px rgba(0,0,0,0.5)" },
    onMouseLeave: (e: any) => { e.currentTarget.style.transform = "translateY(0)"; e.currentTarget.style.boxShadow = rest },
  })
  const maxToday = Math.max(1, ...weekViews)

  return (
    <div style={{ minHeight: "100dvh", background: "radial-gradient(1200px 600px at 70% -10%, color-mix(in srgb, var(--accent) 6%, transparent), transparent 60%), #080808", padding: isMobile ? "22px 16px 40px" : "30px 28px 48px", fontFamily: "DM Sans, sans-serif", position: "relative" }}>
      <Particles />
      <style>{`
        .dz{animation:mo-fade-up .5s var(--mo-ease-standard) backwards}
        .dz-row{transition:background .15s, transform .15s}
        .dz-row:hover{background:rgba(255,255,255,0.025)!important;transform:translateX(2px)}
        .dz-card{transition:transform .2s var(--mo-ease-standard), box-shadow .2s, border-color .2s}
        .dz-arrow{transition:transform .2s}
        .dz-row:hover .dz-arrow,.dz-act:hover .dz-arrow{transform:translateX(3px)}
        .dz-cta{transition:transform .18s, box-shadow .18s}
        .dz-cta:hover{transform:translateY(-2px) scale(1.02);box-shadow:0 10px 30px color-mix(in srgb, var(--accent) 40%, transparent)!important}
        .dz-cta:active{transform:translateY(0) scale(.98)}
        /* Mobile : la grille "Pages recentes + Raccourcis" s'empile (au lieu de 2 colonnes serrees) */
        @media (max-width: 760px){ .dash-2col{ grid-template-columns:1fr !important; } }
        /* Mobile : masque la stat "Publiees" (doublon avec "Pages creees -> X publiees") pour alleger */
        @media (max-width: 760px){ .dash-stat-hide-mobile{ display:none !important; } }
      `}</style>

      {pageToDelete && (
        <DeleteModal
          page={pageToDelete}
          onConfirm={() => deletePage(pageToDelete)}
          onCancel={() => setPageToDelete(null)}
          deleting={deleting}
        />
      )}

      {/* Menu secondaire d'une page (bottom sheet) — rendu hors de la carte pour ne pas etre clippe */}
      {menuPage && (
        <div onClick={() => setMenuPage(null)} style={{ position: "fixed", inset: 0, zIndex: 1100, background: "rgba(0,0,0,0.55)", backdropFilter: "blur(3px)", display: "flex", alignItems: "flex-end", justifyContent: "center" }}>
          <div onClick={e => e.stopPropagation()} style={{ width: "100%", maxWidth: 460, background: "#141210", borderTopLeftRadius: 20, borderTopRightRadius: 20, border: "1px solid rgba(255,255,255,0.1)", borderBottom: "none", padding: "10px 12px calc(14px + env(safe-area-inset-bottom))", boxShadow: "0 -16px 44px rgba(0,0,0,0.55)" }}>
            <div style={{ width: 40, height: 4, borderRadius: 4, background: "rgba(255,255,255,0.18)", margin: "0 auto 10px" }} />
            <p style={{ color: "#F5F0E8", fontSize: 14, fontWeight: 700, margin: "0 6px 6px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{menuPage.title}</p>
            {([
              ...(menuPage.status === "published" ? [{ icon: <ExternalLink size={17} />, label: "Voir la page", onClick: () => { window.open("/" + menuPage.slug, "_blank"); setMenuPage(null) } }] : []),
              { icon: copiedId === menuPage.id ? <Check size={17} color="var(--success)" /> : <Globe size={17} />, label: copiedId === menuPage.id ? "Lien copié !" : "Copier le lien", onClick: () => copyLink(menuPage) },
              { icon: <Eye size={17} />, label: menuPage.status === "published" ? "Dépublier" : "Publier", onClick: () => { togglePublish(menuPage); setMenuPage(null) } },
              { icon: <Trash2 size={17} color="#EF4444" />, label: "Supprimer", danger: true, onClick: () => { setPageToDelete(menuPage); setMenuPage(null) } },
            ] as { icon: React.ReactNode; label: string; onClick: () => void; danger?: boolean }[]).map((a, i) => (
              <button key={i} onClick={a.onClick}
                style={{ display: "flex", alignItems: "center", gap: 13, width: "100%", padding: "13px 12px", background: "none", border: "none", borderTop: i ? "1px solid rgba(255,255,255,0.05)" : "none", color: a.danger ? "#EF4444" : "#F5F0E8", fontSize: 14.5, fontWeight: 500, cursor: "pointer", textAlign: "left" }}>
                <span style={{ width: 24, display: "flex", justifyContent: "center", flexShrink: 0 }}>{a.icon}</span> {a.label}
              </button>
            ))}
          </div>
        </div>
      )}

      <div style={{ maxWidth: 1080, margin: "0 auto", position: "relative", zIndex: 1 }}>
        {/* Header */}
        <div className="dz" style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", marginBottom: 22, flexWrap: "wrap", gap: 14 }}>
          <div>
            <h1 style={{ fontFamily: "Fraunces, serif", fontSize: "clamp(30px,4.5vw,44px)", lineHeight: 1.05, color: "#F5F0E8", fontWeight: 700, margin: "0 0 8px", letterSpacing: "-0.5px" }}>
              {greeting}{profile?.full_name ? ", " + profile.full_name.split(" ")[0] : ""} !
            </h1>
            <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
              <span style={{ display: "inline-flex", alignItems: "center", gap: 6, background: planCfg.color + "14", border: "1px solid " + planCfg.color + "33", borderRadius: 999, padding: "3px 11px" }}>
                <span style={{ width: 6, height: 6, borderRadius: "50%", background: planCfg.color, boxShadow: "0 0 7px " + planCfg.color, animation: "mo-pulse 2.4s ease-in-out infinite" }} />
                <span style={{ color: planCfg.color, fontSize: 12, fontWeight: 700 }}>Plan {planCfg.label}</span>
              </span>
              <span style={{ color: MUTED, fontSize: 12.5 }}>
                <span style={{ color: "var(--success)", fontWeight: 700 }}>{todayViews}</span> vue{todayViews > 1 ? "s" : ""} aujourd'hui
              </span>
            </div>
          </div>
          <Link href="/dashboard/templates" className="dz-cta"
            style={{ display: "flex", alignItems: "center", gap: 8, background: "linear-gradient(90deg,var(--accent),color-mix(in srgb, var(--accent) 75%, #000))", borderRadius: 12, padding: "11px 22px", color: "#080808", textDecoration: "none", fontSize: 14, fontWeight: 800, boxShadow: "0 6px 22px color-mix(in srgb, var(--accent) 28%, transparent)", flexShrink: 0 }}>
            <Plus size={16} strokeWidth={2.6} /> Nouvelle page
          </Link>
        </div>

        {/* Soft-cap quota de vues : alerte (jamais de blocage des pages publiques) */}
        {(nearViews || overViews) && (
          <div style={{ display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap", background: overViews ? "rgba(255,107,107,0.08)" : "color-mix(in srgb, var(--accent) 8%, transparent)", border: "1px solid " + (overViews ? "rgba(255,107,107,0.3)" : "color-mix(in srgb, var(--accent) 30%, transparent)"), borderRadius: 14, padding: "14px 18px", marginBottom: 22 }}>
            <AlertTriangle size={18} color={overViews ? "var(--danger)" : G} style={{ flexShrink: 0 }} />
            <div style={{ flex: 1, minWidth: 220 }}>
              <p style={{ color: "#F5F0E8", fontSize: 13.5, fontWeight: 700, margin: "0 0 2px" }}>
                {overViews
                  ? `Quota de vues atteint (${monthViews.toLocaleString("fr-FR")} / ${viewsLimit!.toLocaleString("fr-FR")} ce mois-ci)`
                  : `Bientôt à court de vues : ${monthViews.toLocaleString("fr-FR")} / ${viewsLimit!.toLocaleString("fr-FR")} (${viewsPct}%)`}
              </p>
              <p style={{ color: MUTED, fontSize: 11.5, margin: 0, lineHeight: 1.5 }}>
                {overViews
                  ? "Tes QR codes et pages restent 100% en ligne — rien n'est coupé. Passe à un plan supérieur pour relancer le compteur et débloquer plus de vues."
                  : "Tes pages restent en ligne sans interruption. Pense à monter en plan pour ne pas être limité."}
              </p>
              <div style={{ height: 5, borderRadius: 3, background: "rgba(255,255,255,0.08)", marginTop: 8, overflow: "hidden" }}>
                <div style={{ height: "100%", width: Math.min(viewsPct, 100) + "%", background: overViews ? "linear-gradient(90deg,var(--danger),#F97316)" : "linear-gradient(90deg,var(--accent),color-mix(in srgb, var(--accent) 75%, #000))", borderRadius: 3 }} />
              </div>
            </div>
            <Link href="/upgrade" style={{ flexShrink: 0, display: "flex", alignItems: "center", gap: 6, background: overViews ? "linear-gradient(90deg,var(--danger),#F97316)" : "linear-gradient(90deg,var(--accent),color-mix(in srgb, var(--accent) 75%, #000))", borderRadius: 10, padding: "9px 16px", color: "#080808", textDecoration: "none", fontSize: 12.5, fontWeight: 800 }}>
              <Zap size={13} /> Augmenter mon quota
            </Link>
          </div>
        )}

        {/* Assistant : conseil contextuel du parcours "normal" (onboarding fini, pas de quota) */}
        {!guide && !nearViews && !overViews && (() => {
          const onePage = pages.length === 1
          const tip = onePage
            ? { icon: "➕", text: <>Créez une 2ᵉ page pour un autre usage (menu, événement, promo).</>, label: "Nouvelle page", href: "/dashboard/templates" }
            : { icon: "🖨️", text: <><strong style={{ color: "#F5F0E8" }}>{totalScans.toLocaleString("fr-FR")}</strong> scan{totalScans > 1 ? "s" : ""} — créez un support imprimable pour booster vos scans.</>, label: "Créer un support", href: "/dashboard/qr-codes" }
          return (
            <div className="dz" style={{ marginBottom: 20 }}>
              <NextStepCard icon={tip.icon} ctaLabel={tip.label} href={tip.href} animationDelay="40ms">{tip.text}</NextStepCard>
            </div>
          )
        })()}

        {/* Premiers pas : checklist d'onboarding (tant qu'aucun scan) */}
        {guide && (() => {
          const firstPage = pages[0]
          const steps = [
            { label: "Créer une page", desc: "Partez d'un modèle adapté à votre métier.", done: pages.length > 0, cta: { label: "Créer ma première page", href: "/dashboard/templates", Icon: Plus } },
            { label: "Publier votre page", desc: "Rendez-la accessible via son lien et son QR.", done: publishedCount > 0, cta: firstPage ? { label: "Publier ma page", href: "/dashboard/builder/" + firstPage.id, Icon: Globe } : { label: "Créer une page", href: "/dashboard/templates", Icon: Plus } },
            { label: "Obtenir un premier scan", desc: "Testez ou partagez votre QR pour démarrer le suivi.", done: totalScans > 0, cta: { label: "Tester mon QR code", href: "/dashboard/qr-codes", Icon: QrCode } },
          ]
          const doneN = steps.filter(s => s.done).length
          const current = steps.find(s => !s.done)
          return (
            <div className="dz" style={{ animationDelay: "40ms", marginBottom: 20, padding: "20px 22px", borderRadius: 16, position: "relative", overflow: "hidden",
              background: "linear-gradient(135deg, color-mix(in srgb, var(--accent) 12%, #100F0A), #100F0A)",
              border: "1px solid color-mix(in srgb, var(--accent) 30%, transparent)", boxShadow: "0 10px 34px rgba(0,0,0,0.3)" }}>
              <div style={{ position: "absolute", top: -30, right: -20, width: 150, height: 150, borderRadius: "50%", background: "radial-gradient(circle, color-mix(in srgb, var(--accent) 14%, transparent), transparent 70%)" }} />
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap", marginBottom: 12 }}>
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: 9, marginBottom: 4 }}>
                    <span style={{ display: "flex", alignItems: "center", justifyContent: "center", width: 26, height: 26, borderRadius: 8, background: "color-mix(in srgb, var(--accent) 18%, transparent)", color: G }}><Zap size={15} /></span>
                    <span style={{ color: G, fontSize: 11, fontWeight: 800, letterSpacing: 1, textTransform: "uppercase" as const }}>Premiers pas</span>
                  </div>
                  <h2 style={{ color: "#F8F4EC", fontSize: 21, fontWeight: 700, margin: 0, fontFamily: "Fraunces, serif", letterSpacing: "-0.3px" }}>Lancez votre QRowg en 3 étapes</h2>
                </div>
                <div style={{ textAlign: "right" as const, minWidth: 120 }}>
                  <span style={{ color: "#F8F4EC", fontSize: 22, fontWeight: 700, fontFamily: "Fraunces, serif" }}>{doneN}<span style={{ color: MUTED, fontSize: 15 }}> / {steps.length}</span></span>
                  <div style={{ height: 6, width: 120, borderRadius: 3, background: "rgba(255,255,255,0.08)", marginTop: 5, overflow: "hidden" }}>
                    <div style={{ height: "100%", width: `${(doneN / steps.length) * 100}%`, background: "linear-gradient(90deg,var(--accent),color-mix(in srgb, var(--accent) 75%, #000))", borderRadius: 3, transition: "width .5s ease" }} />
                  </div>
                </div>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {steps.map((s, i) => {
                  const isCurrent = !s.done && current === s
                  // Mobile : on ne montre que l'étape en cours (la barre indique déjà X/3) -> bloc compact
                  if (isMobile && !isCurrent) return null
                  return (
                    <div key={i} style={{ display: "flex", alignItems: "center", flexWrap: isMobile ? "wrap" : "nowrap", gap: isMobile ? 10 : 12, padding: "10px 12px", borderRadius: 11,
                      background: isCurrent ? "color-mix(in srgb, var(--accent) 9%, transparent)" : "rgba(255,255,255,0.02)",
                      border: `1px solid ${isCurrent ? "color-mix(in srgb, var(--accent) 28%, transparent)" : "rgba(255,255,255,0.05)"}` }}>
                      <span style={{ flexShrink: 0, width: 24, height: 24, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center",
                        background: s.done ? "rgba(57,255,143,0.15)" : "transparent",
                        border: s.done ? "1px solid rgba(57,255,143,0.4)" : `2px solid ${isCurrent ? G : "rgba(255,255,255,0.15)"}` }}>
                        {s.done ? <Check size={13} color="var(--success)" /> : <span style={{ color: isCurrent ? G : MUTED, fontSize: 11, fontWeight: 700 }}>{i + 1}</span>}
                      </span>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{ color: s.done ? MUTED : "#F5F0E8", fontSize: 13.5, fontWeight: 600, margin: 0, textDecoration: s.done ? "line-through" : "none" }}>{s.label}</p>
                        {!s.done && <p style={{ color: MUTED, fontSize: 11.5, margin: "1px 0 0" }}>{s.desc}</p>}
                      </div>
                      {isCurrent && (
                        <Link href={s.cta.href} className="dz-cta" style={{ flexShrink: 0, width: isMobile ? "100%" : "auto", justifyContent: "center", display: "flex", alignItems: "center", gap: 6, padding: isMobile ? "11px 15px" : "8px 15px", borderRadius: 9, background: "linear-gradient(90deg,var(--accent),color-mix(in srgb, var(--accent) 75%, #000))", color: "#080808", textDecoration: "none", fontSize: 12.5, fontWeight: 800, boxShadow: "0 5px 16px color-mix(in srgb, var(--accent) 25%, transparent)" }}>
                          <s.cta.Icon size={14} strokeWidth={2.5} /> {s.cta.label}
                        </Link>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          )
        })()}

        {/* Cockpit : 1 métrique héro + stats secondaires (au lieu de 4 cartes concurrentes) */}
        <div className="dz dz-card" style={{ animationDelay: "120ms", marginBottom: 20, background: "linear-gradient(135deg, color-mix(in srgb,var(--success) 7%,#13110B), #100F0A)", border: "1px solid rgba(57,255,143,0.22)", borderRadius: 16, padding: "18px 22px", position: "relative", overflow: "hidden", boxShadow: "0 8px 30px rgba(0,0,0,0.25)" }}>
          <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 2, background: "linear-gradient(90deg, transparent, var(--success), transparent)" }} />
          <div aria-hidden style={{ position: "absolute", top: -30, right: -20, width: 170, height: 170, borderRadius: "50%", background: "radial-gradient(circle,var(--success)18,transparent 70%)", pointerEvents: "none" }} />
          <div style={{ display: "flex", alignItems: "center", gap: 24, flexWrap: "wrap", position: "relative" }}>

            {/* HÉRO : scans totaux */}
            <div style={{ flex: "1 1 190px", minWidth: 150 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ color: "var(--success)", background: "var(--success)1a", borderRadius: 9, padding: 8, display: "flex" }}><QrCode size={18} /></span>
                <span style={{ color: "#C9C3B6", fontSize: 12.5, fontWeight: 600 }}>Scans totaux</span>
              </div>
              <p style={{ color: "#F8F4EC", fontSize: 44, fontWeight: 700, margin: "8px 0 0", fontFamily: "Fraunces, serif", lineHeight: 1 }}>{(profile?.total_scans || 0).toLocaleString("fr-FR")}</p>
              <p style={{ color: "var(--success)b0", fontSize: 11, margin: "2px 0 0" }}>tous temps</p>
            </div>

            {!isMobile && <div aria-hidden style={{ width: 1, alignSelf: "stretch", minHeight: 64, background: "rgba(255,255,255,0.07)" }} />}

            {/* SECONDAIRES : vues / pages / publiées */}
            <div style={{ display: "flex", gap: 24, flexWrap: "wrap", flex: "2 1 300px" }}>
              {[
                { icon: <BarChart2 size={15} />, label: "Vues ce mois", value: monthViews.toLocaleString("fr-FR"), sub: viewsLimit ? `/ ${viewsLimit.toLocaleString("fr-FR")}` : "illimitées", color: overViews ? "var(--danger)" : "#7B61FF", spark: true },
                { icon: <Eye size={15} />, label: "Pages créées", value: profile?.total_pages || 0, sub: publishedCount + " publiée" + (publishedCount > 1 ? "s" : ""), color: G, spark: false },
                { icon: <Globe size={15} />, label: "Publiées", value: publishedCount, sub: "sur " + pages.length, color: "var(--action)", spark: false, hideMobile: true },
              ].map((s, i) => (
                <div key={i} className={(s as any).hideMobile ? "dash-stat-hide-mobile" : undefined} style={{ minWidth: 92 }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <span style={{ color: s.color, display: "flex" }}>{s.icon}</span>
                      <span style={{ color: "#C9C3B6", fontSize: 11.5, fontWeight: 500 }}>{s.label}</span>
                    </div>
                    {s.spark && weekViews.length === 7 && (
                      <div style={{ display: "flex", alignItems: "flex-end", gap: 2, height: 18 }}>
                        {weekViews.map((v, j) => (
                          <div key={j} style={{ width: 3, height: Math.max(2, Math.round((v / maxToday) * 18)), borderRadius: 2, background: j === 6 ? s.color : s.color + "55" }} />
                        ))}
                      </div>
                    )}
                  </div>
                  <p style={{ color: "#F8F4EC", fontSize: 26, fontWeight: 700, margin: "6px 0 0", fontFamily: "Fraunces, serif", lineHeight: 1 }}>{s.value}</p>
                  <p style={{ color: s.color + "b0", fontSize: 10, margin: "2px 0 0", whiteSpace: "nowrap" }}>{s.sub}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Derniers messages reçus (masqué si aucun) */}
        <RecentLeadsCard />

        {/* Layout 2 colonnes — Mes pages = carte principale */}
        <div className="dz dash-2col" style={{ animationDelay: "180ms", display: "grid", gridTemplateColumns: "1.5fr 1fr", gap: 14 }}>

          {/* Pages (PRINCIPAL) */}
          <div style={{ background: "linear-gradient(180deg,#13110B,#100F0A)", border: "1px solid color-mix(in srgb, var(--accent) 22%, transparent)", borderRadius: 16, overflow: "hidden", boxShadow: "0 8px 30px rgba(0,0,0,0.25)", position: "relative" }}>
            <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 2, background: "linear-gradient(90deg, transparent, var(--accent), transparent)" }} />
            <div style={{ padding: "16px 20px", borderBottom: "1px solid rgba(255,255,255,0.05)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <p style={{ color: "#F8F4EC", fontSize: 15.5, fontWeight: 700, margin: 0, letterSpacing: "-0.2px" }}>Mes pages <span style={{ color: MUTED, fontWeight: 500 }}>({pages.length})</span></p>
              <Link href="/dashboard/templates" className="dz-cta" style={{ display: "flex", alignItems: "center", gap: 5, color: "#080808", background: "color-mix(in srgb, var(--accent) 90%, #fff)", padding: "5px 11px", borderRadius: 8, fontSize: 11, fontWeight: 800, textDecoration: "none" }}>
                <Plus size={11} strokeWidth={2.8} /> Nouvelle
              </Link>
            </div>
            {pages.length === 0 ? (
              <div style={{ padding: "32px 20px", textAlign: "center" }}>
                <p style={{ fontSize: 32, margin: "0 0 10px" }}>📄</p>
                <p style={{ color: "#F5F0E8", fontSize: 13, fontWeight: 600, margin: "0 0 6px" }}>Aucune page</p>
                <p style={{ color: MUTED, fontSize: 12, margin: "0 0 16px" }}>Cree ta premiere page avec un template</p>
                <Link href="/dashboard/templates" style={{ background: "linear-gradient(90deg," + G + ",color-mix(in srgb, var(--accent) 75%, #000))", color: "#080808", textDecoration: "none", padding: "8px 16px", borderRadius: 8, fontSize: 12, fontWeight: 700 }}>
                  Choisir un template
                </Link>
              </div>
            ) : (
              <div>
                {/* Accueil = apercu : 3 pages recentes max, le reste via "Voir toutes" (#03) */}
                {pages.slice(0, 3).map((page, i, arr) => {
                  const pub = page.status === "published"
                  const hue = pageHue(page.title || page.slug)
                  return (
                  <div key={page.id} className="dz-row" style={{ display: "flex", alignItems: "center", gap: 11, padding: "10px 14px", borderBottom: i < arr.length - 1 ? "1px solid rgba(255,255,255,0.03)" : "none" }}>

                    {/* Miniature (degrade + initiale ; anneau vert = en ligne) */}
                    <div style={{ width: isMobile ? 42 : 38, height: isMobile ? 42 : 38, flexShrink: 0, borderRadius: 10, background: `linear-gradient(135deg, hsl(${hue} 52% 44%), hsl(${(hue + 42) % 360} 52% 26%))`, border: `1.5px solid ${pub ? "var(--success)" : "rgba(255,255,255,0.14)"}`, display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontWeight: 800, fontSize: 17, fontFamily: "Fraunces, serif" }}>
                      {(page.title || page.slug || "?").trim()[0]?.toUpperCase() || "?"}
                    </div>

                    {/* Titre + statut / vues / date */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ color: "#F5F0E8", fontSize: 13.5, fontWeight: 600, margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{page.title}</p>
                      <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 2, overflow: "hidden", whiteSpace: "nowrap" }}>
                        <span style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 10.5, fontWeight: 700, color: pub ? "var(--success)" : MUTED, flexShrink: 0 }}>
                          <span style={{ width: 5, height: 5, borderRadius: "50%", background: pub ? "var(--success)" : MUTED }} />{pub ? "En ligne" : "Brouillon"}
                        </span>
                        <span style={{ color: MUTED, fontSize: 10.5, flexShrink: 0 }}>· {page.total_views} vues</span>
                        {relTime(page.created_at) && <span style={{ color: MUTED, fontSize: 10.5, overflow: "hidden", textOverflow: "ellipsis" }}>· {relTime(page.created_at)}</span>}
                      </div>
                    </div>

                    {/* Action principale : Modifier */}
                    <Link href={"/dashboard/builder/" + page.id} className="dz-cta" style={{ flexShrink: 0, display: "flex", alignItems: "center", gap: 5, padding: isMobile ? "9px 12px" : "7px 12px", background: "color-mix(in srgb, var(--accent) 12%, transparent)", border: "1px solid color-mix(in srgb, var(--accent) 25%, transparent)", borderRadius: 9, color: G, fontSize: 12, fontWeight: 700, textDecoration: "none" }}>
                      <Edit3 size={13} />{!isMobile && " Modifier"}
                    </Link>

                    {/* Menu secondaire (bottom sheet -> echappe l'overflow de la carte) */}
                    <button onClick={() => setMenuPage(page)} aria-label="Plus d'actions"
                      style={{ flexShrink: 0, width: isMobile ? 40 : 32, height: isMobile ? 40 : 32, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 9, color: MUTED, cursor: "pointer" }}>
                      <MoreHorizontal size={17} />
                    </button>
                  </div>
                )})}
                {pages.length > 3 && (
                  <Link href="/dashboard/qr-codes" className="dz-row" style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 6, padding: "12px", textDecoration: "none", color: G, fontSize: 12.5, fontWeight: 700, borderTop: "1px solid rgba(255,255,255,0.05)" }}>
                    Voir toutes mes pages ({pages.length}) <ArrowRight className="dz-arrow" size={13} />
                  </Link>
                )}
              </div>
            )}
          </div>

          {/* Actions rapides */}
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {profile?.plan === "free" && (
              <div style={{ background: "linear-gradient(135deg,color-mix(in srgb, var(--accent) 10%, transparent),rgba(57,255,143,0.05))", border: "1px solid color-mix(in srgb, var(--accent) 25%, transparent)", borderRadius: 14, padding: "16px 18px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                  <Zap size={16} color={G} />
                  <p style={{ color: "#F5F0E8", fontSize: 13, fontWeight: 700, margin: 0 }}>Passe a Starter — {fmtPrice(getPlan("starter").priceMonthly)}€/mois</p>
                </div>
                <p style={{ color: MUTED, fontSize: 12, margin: "0 0 12px", lineHeight: 1.5 }}>{getPlan("starter").limits.pages} pages, {getPlan("starter").limits.views!.toLocaleString("fr-FR")} vues/mois, QR personnalises, sans branding</p>
                <Link href="/upgrade" style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 6, background: "linear-gradient(90deg," + G + ",color-mix(in srgb, var(--accent) 75%, #000))", color: "#080808", textDecoration: "none", padding: "9px", borderRadius: 8, fontSize: 12, fontWeight: 700 }}>
                  Voir les offres <ArrowRight size={11} />
                </Link>
              </div>
            )}

            {/* Raccourcis : uniquement les destinations PAS deja dans la nav / le sheet Creer
                (Templates, Analytics, QR y sont deja -> on ne les duplique plus ici). */}
            <div style={{ background: "#111009", border: "1px solid color-mix(in srgb, var(--accent) 12%, transparent)", borderRadius: 14, overflow: "hidden" }}>
              <div style={{ padding: "14px 18px", borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
                <p style={{ color: "#F5F0E8", fontSize: 14, fontWeight: 700, margin: 0 }}>Raccourcis</p>
              </div>
              {[
                { icon: "🌐", label: "Domaines perso", href: "/dashboard/domains", color: "var(--success)" },
                { icon: "⚙️", label: "Paramètres", href: "/dashboard/settings", color: MUTED },
              ].map((action, i, arr) => (
                <Link key={i} href={action.href} className="dz-row dz-act"
                  style={{ display: "flex", alignItems: "center", gap: 12, padding: "13px 18px", textDecoration: "none", borderBottom: i < arr.length - 1 ? "1px solid rgba(255,255,255,0.03)" : "none" }}>
                  <span style={{ width: 32, height: 32, borderRadius: 8, background: action.color + "14", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 15, flexShrink: 0 }}>{action.icon}</span>
                  <span style={{ color: "#F5F0E8", fontSize: 13.5, fontWeight: 500 }}>{action.label}</span>
                  <ArrowRight className="dz-arrow" size={14} color={action.color} style={{ marginLeft: "auto" }} />
                </Link>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
