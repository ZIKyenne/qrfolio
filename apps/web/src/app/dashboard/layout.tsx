"use client"

import { useState, useEffect, useRef } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  LayoutDashboard, FileText, BarChart, QrCode, User,
  Activity, ChevronRight, LogOut, Settings, Menu, X, Eye, Inbox, Images,
  Plus, Printer, Upload, Sparkles, Link2, Users, Globe, Target, Shuffle, Zap
} from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import { ToastProvider } from "@/components/Toast"
import { ConfirmProvider } from "@/components/ui/Confirm"
import MobileNav from "@/components/MobileNav"
import { accessibleOwnerIds } from "@/lib/team"

const DEFAULT_ACCENT = "#C9A84C"
const MUTED = "#A8A190"

const NAV_ITEMS = [
  { href: "/dashboard", icon: LayoutDashboard, label: "Dashboard", exact: true },
  { href: "/dashboard/templates", icon: FileText, label: "Templates" },
  { href: "/dashboard/assets", icon: Images, label: "Médias" },
  { href: "/dashboard/analytics", icon: BarChart, label: "Analytics" },
  { href: "/dashboard/goals", icon: Target, label: "Objectifs" },
  { href: "/dashboard/leads", icon: Inbox, label: "Messages" },
  { href: "/dashboard/qr-codes", icon: QrCode, label: "QR Codes" },
  { href: "/dashboard/print-studio", icon: Printer, label: "Print Studio" },
  { href: "/dashboard/qr-link", icon: Zap, label: "QR Dynamique" },
  { href: "/dashboard/team", icon: Users, label: "Équipe" },
  { href: "/dashboard/domains", icon: Globe, label: "Domaines" },
  { href: "/dashboard/redirects", icon: Shuffle, label: "Redirections" },
  { href: "/dashboard/profile", icon: User, label: "Profil" },
  { href: "/dashboard/settings", icon: Settings, label: "Paramètres" },
]

// Actions du bouton central "Créer".
const CREATE_ACTIONS = [
  { href: "/dashboard/onboarding", icon: Sparkles, label: "Créer par objectif", sub: "Guidé — on génère tout pour vous" },
  { href: "/dashboard/builder", icon: FileText, label: "Créer une page", sub: "Une page pro éditable" },
  { href: "/dashboard/qr-codes", icon: QrCode, label: "Créer un QR code", sub: "Dynamique, modifiable" },
  { href: "/dashboard/qr-link", icon: Link2, label: "QR Dynamique", sub: "Modifiable · suivi des scans" },
  { href: "/dashboard/print-studio", icon: Printer, label: "Créer un support imprimable", sub: "Sticker, chevalet, affiche…" },
  { href: "/dashboard/templates", icon: Sparkles, label: "Utiliser un modèle", sub: "Partir d'un design" },
  { href: "/dashboard/assets", icon: Upload, label: "Importer un média", sub: "Photos, logos…" },
]

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const [collapsed, setCollapsed] = useState(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("qrfolio_sidebar") === "collapsed"
    }
    return false
  })
  const [user, setUser] = useState<any>(null)
  const [profile, setProfile] = useState<any>(null)
  const [mounted, setMounted] = useState(false)
  const [accent, setAccent] = useState(DEFAULT_ACCENT) // couleur d'accent de l'utilisateur
  const [isMobile, setIsMobile] = useState(false) // < 860px : menu replié d'office
  const [unreadLeads, setUnreadLeads] = useState(0) // messages non lus (badge nav)
  const [createOpen, setCreateOpen] = useState(false) // sheet "Créer" (bouton central mobile)

  // Mode Focus du builder : replie la nav (via l'événement `qrowg:builder-focus`) SANS écraser la
  // préférence utilisateur (garde-fou `focusActive` sur la persistance + restauration à la sortie).
  const focusActive = useRef(false)
  const preFocus = useRef<boolean | null>(null)
  useEffect(() => {
    const onSig = (e: Event) => {
      const on = !!(e as CustomEvent).detail
      focusActive.current = on
      setCollapsed(prev => {
        if (on) { if (preFocus.current === null) preFocus.current = prev; return true }
        const restore = preFocus.current ?? prev; preFocus.current = null; return restore
      })
    }
    window.addEventListener("qrowg:builder-focus", onSig as EventListener)
    return () => window.removeEventListener("qrowg:builder-focus", onSig as EventListener)
  }, [])

  // Fermer le sheet "Créer" sur Échap (a11y clavier).
  useEffect(() => {
    if (!createOpen) return
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setCreateOpen(false) }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [createOpen])
  const G = accent
  // Masquer la barre mobile dans les editeurs plein ecran (le Print Studio se porte deja au-dessus).
  // Studios immersifs (Mode Focus) : la barre de nav globale ne doit jamais recouvrir un réglage.
  const hideMobileNav = pathname.startsWith("/dashboard/builder") || pathname.startsWith("/dashboard/print-studio")

  useEffect(() => {
    setMounted(true)
    // accent instantané depuis le cache local (évite le flash)
    const cached = localStorage.getItem("qrfolio_accent")
    if (cached) setAccent(cached)
    const supabase = createClient()
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) {
        setUser(data.user)
        supabase.from("profiles").select("*").eq("id", data.user.id).single()
          .then(({ data: p }) => {
            setProfile(p)
            const acc = p?.preferences?.accent_color || p?.accent_color
            if (acc) { setAccent(acc); localStorage.setItem("qrfolio_accent", acc) }
          })
        // Compteur de messages non lus (le sien + celui des équipes dont il est membre)
        accessibleOwnerIds(supabase, data.user.id).then(ownerIds =>
          supabase.from("leads").select("id", { count: "exact", head: true }).in("user_id", ownerIds).eq("is_read", false)
            .then(({ count }: any) => { if (typeof count === "number") setUnreadLeads(count) }))
      }
    })
  }, [])

  // Rafraîchit le compteur quand on quitte la page Messages (les lus y sont marqués)
  useEffect(() => {
    if (!user || pathname === "/dashboard/leads") return
    const supabase = createClient()
    accessibleOwnerIds(supabase, user.id).then(ownerIds =>
      supabase.from("leads").select("id", { count: "exact", head: true }).in("user_id", ownerIds).eq("is_read", false)
        .then(({ count }: any) => { if (typeof count === "number") setUnreadLeads(count) }))
  }, [pathname, user])

  // Mise à jour live quand on change la couleur depuis la page Profil
  useEffect(() => {
    const onAccent = (e: Event) => { const c = (e as CustomEvent).detail; if (c) setAccent(c) }
    window.addEventListener("qrfolio-accent", onAccent)
    return () => window.removeEventListener("qrfolio-accent", onAccent)
  }, [])

  // Expose l'accent en variable CSS globale -> toutes les pages du dashboard (et portails) la suivent
  useEffect(() => {
    document.documentElement.style.setProperty("--accent", accent)
  }, [accent])

  // Responsive : sous 860px on replie d'office (sans écraser la préférence desktop)
  useEffect(() => {
    const onResize = () => {
      const mob = window.innerWidth < 860
      setIsMobile(mob)
      if (mob) setCollapsed(true)
      else setCollapsed(localStorage.getItem("qrfolio_sidebar") === "collapsed")
    }
    onResize()
    window.addEventListener("resize", onResize)
    return () => window.removeEventListener("resize", onResize)
  }, [])

  useEffect(() => {
    // Ne pas persister un repli piloté par le mode Focus (préférence utilisateur préservée).
    if (mounted && !isMobile && !focusActive.current) {
      localStorage.setItem("qrfolio_sidebar", collapsed ? "collapsed" : "expanded")
    }
  }, [collapsed, mounted, isMobile])

  const isActive = (href: string, exact = false) => {
    if (exact) return pathname === href
    return pathname.startsWith(href)
  }

  const W = isMobile ? 0 : (collapsed ? 72 : 240)

  return (
    <div style={{
      display: "flex", height: "100dvh", fontFamily: "DM Sans, sans-serif", overflow: "hidden",
      // Signature QRowg : socle doré + trame matrice QR (cellules carrées) partagée par toute l'app
      background:
        "radial-gradient(120% 80% at 50% -8%, rgba(201,168,76,0.05), transparent 55%)," +
        "linear-gradient(rgba(201,168,76,0.022) 1px, transparent 1px) 0 0 / 24px 24px," +
        "linear-gradient(90deg, rgba(201,168,76,0.022) 1px, transparent 1px) 0 0 / 24px 24px," +
        "#070707",
    }}>
      {/* SIDEBAR (masquée sur mobile : remplacée par la barre du bas) */}
      <div style={{
        width: W, minWidth: W, background: "#0A0A0A",
        borderRight: "1px solid rgba(201,168,76,0.1)",
        display: isMobile ? "none" : "flex", flexDirection: "column",
        transition: "width 0.25s var(--mo-ease-emphasized), min-width 0.25s var(--mo-ease-emphasized)",
        overflow: "hidden", flexShrink: 0, position: "relative", zIndex: 30
      }}>
        {/* Header: Logo + Toggle */}
        <div style={{ height: 56, display: "flex", alignItems: "center", justifyContent: "space-between", padding: collapsed ? "0 14px" : "0 16px 0 20px", borderBottom: "1px solid rgba(201,168,76,0.08)", flexShrink: 0 }}>
          {/* Logo */}
          <Link href="/dashboard" style={{ textDecoration: "none", display: "flex", alignItems: "center", gap: 8, overflow: "hidden" }}>
            <div style={{ width: 28, height: 28, borderRadius: 8, background: `linear-gradient(135deg, ${G}, color-mix(in srgb, var(--accent) 75%, #000))`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, boxShadow: `0 2px 8px ${G}40` }}>
              <QrCode size={14} color="#080808" />
            </div>
            {!collapsed && (
              <span style={{ color: G, fontFamily: "Fraunces, serif", fontSize: 18, fontWeight: 700, whiteSpace: "nowrap", overflow: "hidden", textTransform: "uppercase" }}>
                QRowg
              </span>
            )}
          </Link>
          {/* Bouton toggle */}
          <button onClick={() => setCollapsed(p => !p)}
            style={{ width: 26, height: 26, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 6, cursor: "pointer", color: MUTED, flexShrink: 0, transition: "all 0.2s" }}
            onMouseEnter={e => { e.currentTarget.style.background = "rgba(201,168,76,0.1)"; e.currentTarget.style.color = G; e.currentTarget.style.borderColor = "rgba(201,168,76,0.3)" }}
            onMouseLeave={e => { e.currentTarget.style.background = "rgba(255,255,255,0.04)"; e.currentTarget.style.color = MUTED; e.currentTarget.style.borderColor = "rgba(255,255,255,0.08)" }}>
            <ChevronRight size={13} style={{ transform: collapsed ? "rotate(0deg)" : "rotate(180deg)", transition: "transform 0.25s" }} />
          </button>
        </div>

        {/* Navigation */}
        <nav aria-label="Navigation principale" style={{ flex: 1, overflowY: "auto", overflowX: "hidden", padding: "10px 8px" }} className="sidebar-nav">
          {NAV_ITEMS.map(({ href, icon: Icon, label, exact }) => {
            const active = isActive(href, exact)
            return (
              <div key={href} style={{ position: "relative" }} className="sidebar-item">
                <Link href={href} style={{ textDecoration: "none" }}>
                  <div style={{
                    position: "relative",
                    display: "flex", alignItems: "center", gap: 10,
                    padding: collapsed ? "10px 0" : "9px 12px",
                    justifyContent: collapsed ? "center" : "flex-start",
                    borderRadius: 9,
                    background: active ? "linear-gradient(90deg, color-mix(in srgb, var(--accent) 10%, transparent), color-mix(in srgb, var(--accent) 2%, transparent))" : "transparent",
                    border: "1px solid transparent",
                    color: active ? G : MUTED,
                    fontSize: 13, fontWeight: active ? 600 : 400,
                    cursor: "pointer",
                    transition: "all 0.15s",
                    marginBottom: 2,
                    whiteSpace: "nowrap", overflow: "hidden",
                  }}
                  onMouseEnter={e => { if (!active) { e.currentTarget.style.background = "rgba(255,255,255,0.04)"; e.currentTarget.style.color = "#F5F0E8" } }}
                  onMouseLeave={e => { if (!active) { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = MUTED } }}>
                    {/* Filet doré à gauche de l'item actif (DA §08) */}
                    {active && !collapsed && <span aria-hidden="true" style={{ position: "absolute", left: 0, top: 9, bottom: 9, width: 2, borderRadius: 2, background: `linear-gradient(180deg, ${G}, color-mix(in srgb, var(--accent) 70%, #000))` }} />}
                    <div style={{ position: "relative", flexShrink: 0, display: "flex" }}>
                      <Icon size={16} />
                      {href === "/dashboard/leads" && unreadLeads > 0 && (
                        <span style={{ position: "absolute", top: -5, right: collapsed ? -5 : -6, minWidth: 15, height: 15, padding: "0 4px", borderRadius: 8, background: "#EF4444", color: "#fff", fontSize: 9, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center", lineHeight: 1, boxShadow: "0 0 0 2px #0A0A0A" }}>{unreadLeads > 99 ? "99+" : unreadLeads}</span>
                      )}
                    </div>
                    {!collapsed && <span style={{ overflow: "hidden", textOverflow: "ellipsis" }}>{label}</span>}
                    {!collapsed && href === "/dashboard/leads" && unreadLeads > 0 && <span style={{ marginLeft: "auto", background: "#EF4444", color: "#fff", fontSize: 10, fontWeight: 700, borderRadius: 9, padding: "1px 7px", flexShrink: 0 }}>{unreadLeads > 99 ? "99+" : unreadLeads}</span>}
                    {!collapsed && active && href !== "/dashboard/leads" && <div style={{ width: 7, height: 7, borderRadius: "50%", background: G, marginLeft: "auto", flexShrink: 0, boxShadow: "0 0 0 3px color-mix(in srgb, var(--accent) 14%, transparent)" }} />}
                  </div>
                </Link>
                {/* Tooltip en mode collapsed */}
                {collapsed && (
                  <div className="sidebar-tooltip" style={{
                    position: "absolute", left: "calc(100% + 10px)", top: "50%", transform: "translateY(-50%)",
                    background: "#1A1A1A", border: "1px solid rgba(201,168,76,0.2)", borderRadius: 8,
                    padding: "6px 12px", color: "#F5F0E8", fontSize: 12, fontWeight: 600,
                    whiteSpace: "nowrap", pointerEvents: "none", zIndex: 100,
                    opacity: 0, transition: "opacity 0.15s", boxShadow: "0 4px 16px rgba(0,0,0,0.4)"
                  }}>
                    {label}
                  </div>
                )}
              </div>
            )
          })}
        </nav>

        {/* Section bas: Upgrade + User */}
        <div style={{ padding: "8px", borderTop: "1px solid rgba(255,255,255,0.05)", flexShrink: 0 }}>
          {/* Upgrade */}
          <div style={{ position: "relative" }} className="sidebar-item">
            <Link href="/upgrade" style={{ textDecoration: "none" }}>
              {/* Carte Upgrade apaisée (DA §08) : plus de fond doré plein — bordure bronze + texte doré. */}
              <div style={{
                display: "flex", alignItems: "center", gap: 10,
                padding: collapsed ? "10px 0" : "10px 12px",
                justifyContent: collapsed ? "center" : "flex-start",
                borderRadius: 11, cursor: "pointer",
                background: "color-mix(in srgb, var(--accent) 4%, transparent)", border: "1px solid color-mix(in srgb, var(--accent) 26%, transparent)",
                marginBottom: 6, transition: "all 0.15s", overflow: "hidden",
              }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = "color-mix(in srgb, var(--accent) 50%, transparent)" }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = "color-mix(in srgb, var(--accent) 26%, transparent)" }}>
                <Activity size={16} color={G} style={{ flexShrink: 0 }} />
                {!collapsed && (
                  <div style={{ overflow: "hidden", minWidth: 0 }}>
                    <p style={{ color: G, fontSize: 13, fontWeight: 700, letterSpacing: "-.01em", margin: 0, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                      {profile?.plan === "business" ? "Business" : profile?.plan === "pro" ? "Plan Pro" : "Passer au Pro"}
                    </p>
                    <p style={{ color: MUTED, fontSize: 10, margin: 0, whiteSpace: "nowrap" }}>{profile?.plan === "pro" || profile?.plan === "business" ? "Abonnement actif" : "Débloquez tout QRowg"}</p>
                  </div>
                )}
              </div>
            </Link>
            {collapsed && (
              <div className="sidebar-tooltip" style={{
                position: "absolute", left: "calc(100% + 10px)", top: "50%", transform: "translateY(-50%)",
                background: "#1A1A1A", border: "1px solid rgba(201,168,76,0.2)", borderRadius: 8,
                padding: "6px 12px", color: G, fontSize: 12, fontWeight: 600,
                whiteSpace: "nowrap", pointerEvents: "none", zIndex: 100,
                opacity: 0, transition: "opacity 0.15s", boxShadow: "0 4px 16px rgba(0,0,0,0.4)"
              }}>
                Upgrade
              </div>
            )}
          </div>

          {/* Utilisateur */}
          {user && (
            <div style={{ position: "relative" }} className="sidebar-item">
              <Link href="/dashboard/profile" style={{ textDecoration: "none", display: "flex", alignItems: "center", gap: 10,
                padding: collapsed ? "8px 0" : "8px 10px",
                justifyContent: collapsed ? "center" : "flex-start",
                borderRadius: 9, overflow: "hidden", cursor: "pointer" }}>
                <div style={{ width: 28, height: 28, borderRadius: "50%", background: `linear-gradient(135deg, ${G}, color-mix(in srgb, var(--accent) 75%, #000))`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 700, color: "#080808", flexShrink: 0 }}>
                  {(profile?.full_name || user.email || "?")[0].toUpperCase()}
                </div>
                {!collapsed && (
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ color: "#F5F0E8", fontSize: 12, fontWeight: 600, margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {profile?.full_name || user.email?.split("@")[0] || "Utilisateur"}
                    </p>
                    <p style={{ color: MUTED, fontSize: 10, margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {profile?.plan ? `Plan ${profile.plan}` : "Plan Free"}
                    </p>
                  </div>
                )}
              </Link>
              {collapsed && (
                <div className="sidebar-tooltip" style={{
                  position: "absolute", left: "calc(100% + 10px)", top: "50%", transform: "translateY(-50%)",
                  background: "#1A1A1A", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8,
                  padding: "6px 12px", color: "#F5F0E8", fontSize: 12, fontWeight: 600,
                  whiteSpace: "nowrap", pointerEvents: "none", zIndex: 100,
                  opacity: 0, transition: "opacity 0.15s", boxShadow: "0 4px 16px rgba(0,0,0,0.4)"
                }}>
                  {profile?.full_name || user.email?.split("@")[0] || "Compte"}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* MAIN CONTENT */}
      <main style={{ flex: 1, overflow: "auto", minWidth: 0, paddingBottom: (isMobile && !hideMobileNav) ? "calc(84px + env(safe-area-inset-bottom))" : 0 }}>
        <ToastProvider><ConfirmProvider>{children}</ConfirmProvider></ToastProvider>
      </main>

      {/* Sheet "Créer" (bouton central de la barre mobile) */}
      {isMobile && !hideMobileNav && createOpen && (
        <div onClick={() => setCreateOpen(false)} style={{ position: "fixed", inset: 0, zIndex: 60, background: "rgba(0,0,0,0.55)", backdropFilter: "blur(3px)", display: "flex", alignItems: "flex-end" }}>
          <div role="dialog" aria-modal="true" aria-label="Créer" onClick={e => e.stopPropagation()} style={{ width: "100%", background: "#141210", borderTopLeftRadius: 22, borderTopRightRadius: 22, border: `1px solid color-mix(in srgb, ${G} 16%, transparent)`, borderBottom: "none", padding: "10px 14px calc(16px + env(safe-area-inset-bottom))", boxShadow: "0 -16px 44px rgba(0,0,0,0.55)", animation: "sheetUp .24s var(--mo-ease-standard)" }}>
            <div style={{ width: 40, height: 4, borderRadius: 4, background: "rgba(255,255,255,0.18)", margin: "0 auto 12px" }} />
            <p style={{ margin: "0 4px 10px", color: "#F5F0E8", fontSize: 15, fontWeight: 800 }}>Créer</p>
            {CREATE_ACTIONS.map(({ href, icon: Icon, label, sub }, i) => (
              <Link key={i} href={href} onClick={() => setCreateOpen(false)}
                style={{ display: "flex", alignItems: "center", gap: 14, padding: "13px 10px", textDecoration: "none", borderTop: i ? "1px solid rgba(255,255,255,0.05)" : "none" }}>
                <span style={{ width: 42, height: 42, flexShrink: 0, borderRadius: 12, background: `color-mix(in srgb, ${G} 14%, transparent)`, border: `1px solid color-mix(in srgb, ${G} 28%, transparent)`, display: "flex", alignItems: "center", justifyContent: "center", color: G }}><Icon size={20} /></span>
                <span style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                  <span style={{ color: "#F5F0E8", fontSize: 15, fontWeight: 700 }}>{label}</span>
                  <span style={{ color: MUTED, fontSize: 12.5 }}>{sub}</span>
                </span>
                <ChevronRight size={18} color={MUTED} style={{ marginLeft: "auto", flexShrink: 0 }} />
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* BARRE DE NAVIGATION MOBILE — « Liquid Nav » (components/MobileNav).
          Le bouton central « Créer » ouvre le même sheet qu'avant (onCreate). */}
      {isMobile && !hideMobileNav && (
        <MobileNav onCreate={() => setCreateOpen(true)} unread={unreadLeads} />
      )}

      <style>{`
        .sidebar-nav::-webkit-scrollbar { display: none }
        .sidebar-item:hover .sidebar-tooltip { opacity: 1 !important }
        @keyframes sheetUp { from { transform: translateY(100%) } to { transform: translateY(0) } }
        * { box-sizing: border-box; }
      `}</style>
    </div>
  )
}
