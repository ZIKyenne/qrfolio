"use client"

import { useState, useEffect, useRef } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  QrCode, User,
  Activity, ChevronRight, LogOut, Menu, X, Eye,
  Plus, Printer, Sparkles, Link2, LayoutTemplate, Image as ImageIcon
} from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import { ToastProvider } from "@/components/Toast"
import { ConfirmProvider } from "@/components/ui/Confirm"
import MobileNav from "@/components/MobileNav"
import { SessionShellContext } from "./sessionShell"
import { accessibleOwnerIds } from "@/lib/team"
import { pageLimit } from "@/lib/plans"

const DEFAULT_ACCENT = "#C9A84C"
const MUTED = "#A8A190"

// Jeu de glyphes filaires de la nav (DA §10) : 16×16, traits 1.4px, dessinés en `currentColor` → ils s'éclairent
// avec le libellé (actif or / survol clair / repos muté). Fond des masques = #0A0A0A (fond réel de la sidebar).
const S16 = { position: "relative" as const, display: "inline-block" as const, width: 16, height: 16, flexShrink: 0 }
const SB  = "#0A0A0A"

// Glyphe QR partagé (même dessin que la tuile du header, à l'échelle nav) : 3 repères + matrice de données.
function QRNavGlyph() {
  const finder = { position: "absolute" as const, display: "inline-flex" as const, alignItems: "center" as const, justifyContent: "center" as const, width: 6.5, height: 6.5, border: "1.4px solid currentColor", borderRadius: 1.5 }
  const eye = { width: 1.8, height: 1.8, background: "currentColor" }
  return (
    <span aria-hidden="true" style={S16}>
      <span style={{ ...finder, left: 0, top: 0 }}><span style={eye} /></span>
      <span style={{ ...finder, right: 0, top: 0 }}><span style={eye} /></span>
      <span style={{ ...finder, left: 0, bottom: 0 }}><span style={eye} /></span>
      <span style={{ position: "absolute", right: 0, bottom: 0, width: 2.4, height: 2.4, background: "currentColor" }} />
      <span style={{ position: "absolute", right: 4, bottom: 4, width: 2.4, height: 2.4, background: "currentColor", opacity: 0.5 }} />
    </span>
  )
}

// Glyphe par entrée (voir tableau du handoff §10). Chacun décrit littéralement sa page.
function NavGlyph({ name }: { name: string }) {
  switch (name) {
    case "qr": return <QRNavGlyph />
    case "dashboard": return (
      <span aria-hidden="true" style={S16}>
        <span style={{ position: "absolute", left: 0, top: 0, width: 6, height: 16, border: "1.4px solid currentColor", borderRadius: 2 }} />
        <span style={{ position: "absolute", right: 0, top: 0, width: 8, height: 7, border: "1.4px solid currentColor", borderRadius: 2 }} />
        <span style={{ position: "absolute", right: 0, bottom: 0, width: 8, height: 7, border: "1.4px solid currentColor", borderRadius: 2, opacity: 0.55 }} />
      </span>)
    case "templates": return (
      <span aria-hidden="true" style={S16}>
        <span style={{ position: "absolute", right: 0, top: 0, width: 11, height: 13, border: "1.4px solid currentColor", borderRadius: 2, opacity: 0.4 }} />
        <span style={{ position: "absolute", left: 0, bottom: 0, width: 12.5, height: 14.5, border: "1.4px solid currentColor", borderRadius: 2.5, background: SB, overflow: "hidden" }}>
          <span style={{ position: "absolute", left: 0, top: 0, right: 0, height: 4, background: "currentColor" }} />
          <span style={{ position: "absolute", left: 2.5, top: 6.5, width: 5, height: 5, background: "currentColor", borderRadius: 1, opacity: 0.6 }} />
        </span>
      </span>)
    case "media": return (
      <span aria-hidden="true" style={S16}>
        <span style={{ position: "absolute", left: 0, top: 1, width: 16, height: 13, border: "1.4px solid currentColor", borderRadius: 2, overflow: "hidden" }}>
          <span style={{ position: "absolute", left: 2, top: 2, width: 3, height: 3, borderRadius: "50%", background: "currentColor" }} />
          <span style={{ position: "absolute", left: 2, bottom: 0, width: 0, height: 0, borderLeft: "4px solid transparent", borderRight: "4px solid transparent", borderBottom: "6px solid currentColor" }} />
        </span>
      </span>)
    case "print": return (
      <span aria-hidden="true" style={S16}>
        <span style={{ position: "absolute", left: 3.5, top: 0, width: 9, height: 4, border: "1.4px solid currentColor", borderBottom: "none", borderRadius: "1.5px 1.5px 0 0", opacity: 0.55 }} />
        <span style={{ position: "absolute", left: 0, top: 4, width: 16, height: 7.5, border: "1.4px solid currentColor", borderRadius: 2.5 }} />
        <span style={{ position: "absolute", right: 2.5, top: 6.5, width: 2.2, height: 2.2, borderRadius: "50%", background: "currentColor" }} />
        <span style={{ position: "absolute", left: 3.5, bottom: 0, width: 9, height: 5, background: "currentColor", borderRadius: "0 0 1.5px 1.5px" }} />
      </span>)
    case "dynamic": return (
      <span aria-hidden="true" style={{ ...S16, background: "currentColor", clipPath: "polygon(58% 0, 20% 55%, 45% 55%, 38% 100%, 80% 42%, 53% 42%)" }} />)
    case "analytics": return (
      <span aria-hidden="true" style={{ display: "flex", alignItems: "flex-end", gap: 2.5, width: 16, height: 16, flexShrink: 0 }}>
        <span style={{ width: 3, height: 7, background: "currentColor", borderRadius: 1, opacity: 0.6 }} />
        <span style={{ width: 3, height: 12, background: "currentColor", borderRadius: 1 }} />
        <span style={{ width: 3, height: 16, background: "currentColor", borderRadius: 1 }} />
      </span>)
    case "goals": return (
      <span aria-hidden="true" style={{ position: "relative", display: "inline-flex", alignItems: "center", justifyContent: "center", width: 16, height: 16, flexShrink: 0 }}>
        <span style={{ position: "absolute", inset: 0, border: "1.4px solid currentColor", borderRadius: "50%", opacity: 0.55 }} />
        <span style={{ position: "absolute", inset: 4.5, border: "1.4px solid currentColor", borderRadius: "50%" }} />
        <span style={{ width: 3, height: 3, borderRadius: "50%", background: "currentColor" }} />
      </span>)
    case "messages": return (
      <span aria-hidden="true" style={S16}>
        <span style={{ position: "absolute", left: 0, top: 1, width: 16, height: 11, border: "1.4px solid currentColor", borderRadius: 3 }} />
        <span style={{ position: "absolute", left: 2.5, top: 11.4, width: 0, height: 0, borderRight: "5.5px solid transparent", borderTop: "4.5px solid currentColor" }} />
        <span style={{ position: "absolute", left: 4, top: 5, width: 8, height: 1.4, background: "currentColor" }} />
      </span>)
    case "team": return (
      <span aria-hidden="true" style={S16}>
        <span style={{ position: "absolute", left: 1.5, top: 1, width: 6, height: 6, border: "1.4px solid currentColor", borderRadius: "50%" }} />
        <span style={{ position: "absolute", left: 0.5, bottom: 1, width: 8, height: 5, border: "1.4px solid currentColor", borderBottom: "none", borderRadius: "5px 5px 0 0" }} />
        <span style={{ position: "absolute", right: 1.5, top: 1, width: 6, height: 6, border: "1.4px solid currentColor", borderRadius: "50%" }} />
        <span style={{ position: "absolute", right: 0.5, bottom: 1, width: 8, height: 5, border: "1.4px solid currentColor", borderBottom: "none", borderRadius: "5px 5px 0 0", background: SB }} />
      </span>)
    case "domains": return (
      <span aria-hidden="true" style={S16}>
        <span style={{ position: "absolute", inset: 0, border: "1.4px solid currentColor", borderRadius: "50%", overflow: "hidden" }}>
          <span style={{ position: "absolute", left: -2, top: 7.5, width: 20, height: 1.4, background: "currentColor", transform: "rotate(-24deg)" }} />
        </span>
      </span>)
    case "redirects": return (
      <span aria-hidden="true" style={S16}>
        <span style={{ position: "absolute", left: 0.7, bottom: 1.2, width: 8.5, height: 9.5, borderLeft: "1.4px solid currentColor", borderBottom: "1.4px solid currentColor", borderBottomLeftRadius: 4, transform: "scaleX(-1)" }} />
        <span style={{ position: "absolute", left: 5.4, top: 0, width: 0, height: 0, borderLeft: "4px solid transparent", borderRight: "4px solid transparent", borderBottom: "5px solid currentColor" }} />
      </span>)
    case "profile": return (
      <span aria-hidden="true" style={S16}>
        <span style={{ position: "absolute", left: 4.5, top: 0, width: 7, height: 7, border: "1.4px solid currentColor", borderRadius: "50%" }} />
        <span style={{ position: "absolute", left: 1, bottom: 0, width: 14, height: 7, border: "1.4px solid currentColor", borderBottom: "none", borderRadius: "7px 7px 0 0" }} />
      </span>)
    case "settings": return (
      <span aria-hidden="true" style={{ position: "relative", display: "inline-flex", alignItems: "center", justifyContent: "center", width: 16, height: 16, flexShrink: 0 }}>
        <span style={{ position: "absolute", inset: 0, background: "currentColor", clipPath: "polygon(41% 0,59% 0,63% 12%,78% 8%,88% 22%,80% 33%,94% 41%,94% 59%,80% 67%,88% 78%,78% 92%,63% 88%,59% 100%,41% 100%,37% 88%,22% 92%,12% 78%,20% 67%,6% 59%,6% 41%,20% 33%,12% 22%,22% 8%,37% 12%)" }} />
        <span style={{ position: "relative", width: 5.5, height: 5.5, borderRadius: "50%", background: SB }} />
      </span>)
    default: return null
  }
}

// Navigation groupée en 4 familles étiquetées (DA §10) — glyphes filaires maison (voir NavGlyph).
const NAV_GROUPS = [
  { label: "Principal", items: [
    { href: "/dashboard", glyph: "dashboard", label: "Dashboard", exact: true },
    { href: "/dashboard/templates", glyph: "templates", label: "Templates" },
    { href: "/dashboard/assets", glyph: "media", label: "Médias" },
  ] },
  // Deux entrées fabriquent des QR codes. Elles s'appelaient « QR Codes » et
  // « QR Dynamique », et toutes deux se décrivaient comme « créez un QR code » :
  // aucun moyen de choisir. Elles portent maintenant le nom de ce vers quoi le QR
  // mène — la seule question que se pose vraiment un commerçant.
  { label: "QR & impression", items: [
    { href: "/dashboard/qr-codes", glyph: "qr", label: "QR de mes pages" },
    { href: "/dashboard/print-studio", glyph: "print", label: "Print Studio" },
    { href: "/dashboard/qr-link", glyph: "dynamic", label: "QR vers un lien" },
  ] },
  { label: "Mesure", items: [
    { href: "/dashboard/analytics", glyph: "analytics", label: "Analytics" },
    // « Objectifs » n'est plus une page : la section vit en bas du Dashboard (#objectifs).
    { href: "/dashboard/leads", glyph: "messages", label: "Messages" },
  ] },
  { label: "Compte", items: [
    { href: "/dashboard/team", glyph: "team", label: "Équipe" },
    { href: "/dashboard/domains", glyph: "domains", label: "Domaines" },
    { href: "/dashboard/redirects", glyph: "redirects", label: "Redirections" },
    { href: "/dashboard/profile", glyph: "profile", label: "Profil" },
    { href: "/dashboard/settings", glyph: "settings", label: "Paramètres" },
  ] },
]

// Navigation d'un VISITEUR SANS COMPTE. Depuis l'essai sans inscription, cette
// personne atterrit ici avant même d'avoir un compte : lui montrer Analytics,
// Messages, Équipe, Domaines ou Facturation revient à lui présenter douze portes
// dont neuf sont fermées à clé. On ne garde que ce qui marche vraiment sans session.
const GUEST_NAV: { label: string; items: { href: string; glyph: string; label: string; exact?: boolean }[] }[] = [
  { label: "", items: [
    { href: "/dashboard/templates", glyph: "templates", label: "Modèles" },
    { href: "/dashboard/builder", glyph: "dashboard", label: "Ma page" },
    { href: "/dashboard/qr-link", glyph: "dynamic", label: "QR vers un lien" },
  ] },
]

// Actions du bouton central « Créer ».
//
// Réécrit en partant de la question que se pose vraiment un commerçant qui ouvre
// ce menu : « je veux faire quoi ? ». Les libellés d'avant répondaient à une
// autre question — comment le logiciel range ses fonctions.
//
//  · « Créer par objectif » : personne ne se dit « je vais créer par objectif ».
//  · « QR de mes pages » et « Créer un QR » : deux entrées qui disent « QR »
//    sans qu'on puisse les distinguer. La vraie différence n'est pas le mot QR,
//    c'est OÙ il mène : « QR de mes pages » / « QR vers un lien ». Ces noms sont
//    aussi ceux de la barre latérale — une destination, un seul nom dans toute
//    l'application (invariant tenu par nomsEtQuotas.test.ts).
//  · « Support imprimable » : du vocabulaire d'imprimeur. C'est le sticker qu'on
//    colle sur la table.
//  · « Créer une page » (page vierge) est RETIRÉE : partir d'une page blanche est
//    le pire départ possible pour quelqu'un qui n'a jamais fait de site. Les deux
//    entrées du haut mènent au même éditeur, avec du contenu déjà en place.
//
// L'ordre suit le trajet réel : je fais ma page → j'obtiens son QR → je l'imprime.
const CREATE_ACTIONS = [
  { href: "/dashboard/onboarding", icon: Sparkles, label: "Créer ma page", sub: "Guidé en quelques questions — le plus simple" },
  { href: "/dashboard/templates", icon: LayoutTemplate, label: "Partir d'un modèle", sub: "48 designs par métier, à personnaliser" },
  { href: "/dashboard/qr-codes", icon: QrCode, label: "QR de mes pages", sub: "Celui qui mène à une page QRowg" },
  { href: "/dashboard/qr-link", icon: Link2, label: "QR vers un lien", sub: "Site web, WiFi, téléphone, fiche contact" },
  { href: "/dashboard/print-studio", icon: Printer, label: "Un support à imprimer", sub: "Sticker de table, chevalet, affiche" },
  { href: "/dashboard/assets", icon: ImageIcon, label: "Mes photos et logos", sub: "À importer une fois, réutilisables partout" },
]

// Sans compte, plusieurs de ces actions mènent à la page de connexion. On ne
// propose que celles qui aboutissent vraiment — et pas davantage la page vierge.
const GUEST_CREATE_ACTIONS = [
  { href: "/dashboard/templates", icon: LayoutTemplate, label: "Partir d'un modèle", sub: "Le plus rapide — 48 modèles par métier" },
  { href: "/dashboard/qr-link", icon: Link2, label: "QR vers un lien", sub: "Site web, WiFi, téléphone — sans compte" },
]

export default function DashboardShell({ children, initialSignedIn, initialCollapsed = false }: { children: React.ReactNode; initialSignedIn: boolean; initialCollapsed?: boolean }) {
  const pathname = usePathname()
  // La préférence « barre repliée » arrive du SERVEUR (cookie lu dans layout.tsx),
  // donc identique des deux côtés de l'hydratation : plus de barre qui se rétracte
  // après coup. localStorage reste la copie de secours (cookie perdu).
  const [collapsed, setCollapsed] = useState(initialCollapsed)
  const [user, setUser] = useState<any>(null)
  // « invité » = session absente. La valeur initiale vient du SERVEUR (cookie de
  // session lu dans layout.tsx) : le HTML rendu porte donc déjà le bon menu, et un
  // visiteur ne voit jamais clignoter des entrées de compte auxquelles il n'a pas
  // accès. `getUser()` confirme ensuite — c'est lui qui fait foi.
  const [signedIn, setSignedIn] = useState<boolean>(initialSignedIn)
  const [sessionConfirmee, setSessionConfirmee] = useState(false) // getUser() a répondu
  const guest = !signedIn
  const [profile, setProfile] = useState<any>(null)
  const [mounted, setMounted] = useState(false)
  const [accent, setAccent] = useState(DEFAULT_ACCENT) // couleur d'accent de l'utilisateur
  // < 860px : menu replié d'office. Le serveur ne connaît pas l'écran (false) ;
  // ce qui est visible AVANT le JavaScript est décidé par les media queries
  // .qf-sidebar / .qf-mobile-nav plus bas, jamais par cette valeur.
  const [isMobile, setIsMobile] = useState(false)
  const [unreadLeads, setUnreadLeads] = useState(0) // messages non lus (badge nav)
  const [qrActive, setQrActive] = useState<number | null>(null) // QR actifs (jauge de quota du pied de page)
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
      setSignedIn(!!data.user)
      setSessionConfirmee(true)
      if (data.user) {
        setUser(data.user)
        supabase.from("profiles").select("*").eq("id", data.user.id).single()
          .then(({ data: p }) => {
            setProfile(p)
            const acc = p?.preferences?.accent_color || p?.accent_color
            if (acc) { setAccent(acc); localStorage.setItem("qrfolio_accent", acc) }
          })
        // Compteurs (le sien + celui des équipes dont il est membre) : messages non lus + QR actifs (quota).
        accessibleOwnerIds(supabase, data.user.id).then(ownerIds => {
          supabase.from("leads").select("id", { count: "exact", head: true }).in("user_id", ownerIds).eq("is_read", false)
            .then(({ count }: any) => { if (typeof count === "number") setUnreadLeads(count) })
          // Quota = QR ACTIFS (status "active" ou nul par défaut) — cf. modèle de quota par actifs.
          supabase.from("qr_codes").select("id", { count: "exact", head: true }).in("user_id", ownerIds).or("status.eq.active,status.is.null")
            .then(({ count }: any) => { if (typeof count === "number") setQrActive(count) })
        })
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
      const v = collapsed ? "collapsed" : "expanded"
      localStorage.setItem("qrfolio_sidebar", v)
      document.cookie = `qrfolio_sidebar=${v}; path=/; max-age=31536000; samesite=lax`
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
      {/* SIDEBAR (masquée sur mobile : remplacée par la barre du bas). La classe
          porte la media query qui la cache dès le HTML serveur, avant tout JS. */}
      <div className="qf-sidebar" style={{
        width: W, minWidth: W, background: "#0A0A0A",
        borderRight: "1px solid rgba(201,168,76,0.1)",
        display: isMobile ? "none" : "flex", flexDirection: "column",
        transition: "width 0.25s var(--mo-ease-emphasized), min-width 0.25s var(--mo-ease-emphasized)",
        overflow: "hidden", flexShrink: 0, position: "relative", zIndex: 30
      }}>
        {/* Header: Logo + Toggle */}
        <div style={{ height: 56, display: "flex", alignItems: "center", justifyContent: "space-between", padding: collapsed ? "0 14px" : "0 16px 0 20px", borderBottom: "1px solid rgba(201,168,76,0.08)", flexShrink: 0 }}>
          {/* Logo — lockup 1b (handoff « Logo QROWG ») : repère à contour transparent + mot IVOIRE,
              l'or ne reste que sur le Q ; lueur diagonale confinée au repère. Anime au montage. */}
          <Link href="/dashboard" aria-label="QROWG — tableau de bord" style={{ textDecoration: "none", display: "flex", alignItems: "center", gap: 11, overflow: "hidden" }}>
            {/* Repère QR (30×30) : la lueur est masquée par l'overflow arrondi du repère. */}
            <span style={{ position: "relative", overflow: "hidden", display: "inline-flex", flexShrink: 0, width: 30, height: 30, borderRadius: 9 }}>
              <span aria-hidden="true" className="qlogo-glow" style={{ position: "absolute", top: "-60%", bottom: "-60%", left: 0, width: "34%", zIndex: 1, pointerEvents: "none", background: "linear-gradient(90deg, rgba(251,240,207,0), rgba(251,240,207,.4), rgba(251,240,207,0))", transform: "translateX(-170%) rotate(18deg)" }} />
              <svg viewBox="0 0 32 32" width="30" height="30" style={{ flex: "none" }}>
                <rect className="qlogo-frame" x=".9" y=".9" width="30.2" height="30.2" rx="9" fill="none" stroke="rgba(232,200,119,.26)" strokeWidth="1.4" style={{ transformBox: "fill-box", transformOrigin: "center" }} />
                <g className="qlogo-pop" style={{ transformBox: "fill-box", transformOrigin: "center", animationDelay: ".1s" }}><rect x="7" y="7" width="7" height="7" rx="2" fill="none" stroke="#e8c877" strokeWidth="1.5" /><rect x="10" y="10" width="1.9" height="1.9" fill="#e8c877" /></g>
                <g className="qlogo-pop" style={{ transformBox: "fill-box", transformOrigin: "center", animationDelay: ".18s" }}><rect x="18" y="7" width="7" height="7" rx="2" fill="none" stroke="rgba(244,239,230,.55)" strokeWidth="1.5" /><rect x="21" y="10" width="1.9" height="1.9" fill="rgba(244,239,230,.55)" /></g>
                <g className="qlogo-pop" style={{ transformBox: "fill-box", transformOrigin: "center", animationDelay: ".26s" }}><rect x="7" y="18" width="7" height="7" rx="2" fill="none" stroke="rgba(244,239,230,.55)" strokeWidth="1.5" /><rect x="10" y="21" width="1.9" height="1.9" fill="rgba(244,239,230,.55)" /></g>
                <rect className="qlogo-blink" x="19.5" y="19.5" width="2.6" height="2.6" fill="#e8c877" />
                <rect x="23.4" y="23.4" width="2.6" height="2.6" fill="rgba(244,239,230,.3)" />
              </svg>
            </span>
            {!collapsed && (
              <span style={{ position: "relative", display: "inline-block", fontFamily: "'DM Sans', system-ui, sans-serif", fontSize: 18, fontWeight: 600, letterSpacing: ".035em", lineHeight: 1.15, whiteSpace: "nowrap" }}>
                {/* Couche IVOIRE lisible (une seule pour les lecteurs d'écran) — les lettres montent une à une. */}
                <span style={{ display: "inline-block", overflow: "hidden", padding: "3px 0", color: "#f4efe6", verticalAlign: "top" }}>
                  {["Q", "R", "O", "W", "G"].map((ch, i) => (
                    <span key={i} className="qlogo-rise" style={{ display: "inline-block", animationDelay: `${(0.22 + i * 0.055).toFixed(3)}s` }}>{ch}</span>
                  ))}
                </span>
                {/* Calque OR (décoratif) clipé sur le Q — s'écoule dans le mot puis se retire (omGoldSettle). */}
                <span aria-hidden="true" className="qlogo-gold" style={{ position: "absolute", left: 0, top: 3, whiteSpace: "nowrap", clipPath: "inset(0 79% 0 0)", background: "linear-gradient(100deg, #c09a45 0%, #fbf0cf 26%, #e8c877 52%, #c09a45 76%, #fbf0cf 100%)", backgroundSize: "220% 100%", WebkitBackgroundClip: "text", backgroundClip: "text", WebkitTextFillColor: "transparent", color: "transparent" }}>QROWG</span>
              </span>
            )}
          </Link>
          {/* Bouton toggle */}
          <button onClick={() => setCollapsed(p => !p)} aria-label={collapsed ? "Déployer le menu" : "Replier le menu"} aria-expanded={!collapsed}
            style={{ width: 32, height: 32, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 6, cursor: "pointer", color: MUTED, flexShrink: 0, transition: "all 0.2s" }}
            onMouseEnter={e => { e.currentTarget.style.background = "rgba(201,168,76,0.1)"; e.currentTarget.style.color = G; e.currentTarget.style.borderColor = "rgba(201,168,76,0.3)" }}
            onMouseLeave={e => { e.currentTarget.style.background = "rgba(255,255,255,0.04)"; e.currentTarget.style.color = MUTED; e.currentTarget.style.borderColor = "rgba(255,255,255,0.08)" }}>
            <ChevronRight size={13} style={{ transform: collapsed ? "rotate(0deg)" : "rotate(180deg)", transition: "transform 0.25s" }} />
          </button>
        </div>

        {/* Navigation */}
        <nav aria-label="Navigation principale" style={{ flex: 1, overflowY: "auto", overflowX: "hidden", padding: "10px 8px" }} className="sidebar-nav">
          {(guest ? GUEST_NAV : NAV_GROUPS).map((group, gi) => (
            <div key={group.label}>
              {/* Étiquette de famille (DA §10) — masquée repliée ; un filet sépare les groupes en mode réduit. */}
              {!collapsed && group.label
                ? <div style={{ padding: gi === 0 ? "2px 8px 5px" : "12px 8px 5px", fontSize: 9.5, letterSpacing: ".2em", textTransform: "uppercase", color: "#5c554b", fontWeight: 700, whiteSpace: "nowrap", overflow: "hidden" }}>{group.label}</div>
                : gi > 0 && <div aria-hidden="true" style={{ margin: "8px 12px", height: 1, background: "rgba(255,255,255,0.05)" }} />}
              {group.items.map(({ href, glyph, label, exact }) => {
                const active = isActive(href, exact)
                return (
                  <div key={href} style={{ position: "relative" }} className="sidebar-item">
                    <Link href={href} style={{ textDecoration: "none" }} aria-label={collapsed ? label : undefined} aria-current={active ? "page" : undefined}>
                      <div style={{
                        position: "relative",
                        display: "flex", alignItems: "center", gap: 11,
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
                      onMouseEnter={e => { if (!active) { e.currentTarget.style.background = "rgba(255,255,255,0.035)"; e.currentTarget.style.color = "#e8e3da" } }}
                      onMouseLeave={e => { if (!active) { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = MUTED } }}>
                        {/* Filet doré à gauche de l'item actif (DA §08/§10) */}
                        {active && !collapsed && <span aria-hidden="true" style={{ position: "absolute", left: 0, top: 8, bottom: 8, width: 2, borderRadius: 2, background: `linear-gradient(180deg, ${G}, color-mix(in srgb, var(--accent) 70%, #000))` }} />}
                        <div style={{ position: "relative", flexShrink: 0, display: "flex" }}>
                          <NavGlyph name={glyph} />
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
            </div>
          ))}
        </nav>

        {/* Section bas: Upgrade + User */}
        <div style={{ padding: "8px", borderTop: "1px solid rgba(255,255,255,0.05)", flexShrink: 0 }}>
          {/* Visiteur sans compte : « Passer au Pro » et sa jauge de quota n'ont aucun
              sens — il n'a même pas de plan. On lui dit plutôt ce qu'un compte apporte. */}
          {guest && (
            <div className="sidebar-item" style={{ position: "relative" }}>
              <Link href="/auth/signup" style={{ textDecoration: "none" }} aria-label={collapsed ? "Créer mon compte" : undefined}>
                <div style={{
                  display: "flex", flexDirection: collapsed ? "row" : "column",
                  alignItems: collapsed ? "center" : "stretch", justifyContent: "center", gap: 6,
                  padding: collapsed ? "10px 0" : "12px 13px", marginBottom: 8,
                  borderRadius: 11, cursor: "pointer", overflow: "hidden",
                  background: "color-mix(in srgb, var(--accent) 8%, transparent)",
                  border: "1px solid color-mix(in srgb, var(--accent) 32%, transparent)",
                }}>
                  {collapsed ? <Sparkles size={16} color={G} style={{ flexShrink: 0 }} /> : <>
                    <span style={{ color: G, fontSize: 12.5, fontWeight: 700 }}>Créer mon compte</span>
                    <span style={{ color: "#8A8478", fontSize: 11, lineHeight: 1.35 }}>
                      Pour publier votre page, obtenir son QR code et suivre les scans. Gratuit.
                    </span>
                  </>}
                </div>
              </Link>
              {collapsed && (
                <div className="sidebar-tooltip" style={{
                  position: "absolute", left: "calc(100% + 10px)", top: "50%", transform: "translateY(-50%)",
                  background: "#1A1A1A", border: "1px solid rgba(201,168,76,0.2)", borderRadius: 8,
                  padding: "6px 12px", color: "#F5F0E8", fontSize: 12, fontWeight: 600,
                  whiteSpace: "nowrap", pointerEvents: "none", zIndex: 100,
                  opacity: 0, transition: "opacity 0.15s", boxShadow: "0 4px 16px rgba(0,0,0,0.4)"
                }}>Créer mon compte</div>
              )}
            </div>
          )}

          {/* Carte plan (DA §10) : bordure bronze, pastille « Actif », jauge de quota RÉELLE (QR actifs / limite du plan). */}
          {!guest && (() => {
            const plan = profile?.plan || "free"
            const isPaid = plan === "pro" || plan === "business" || plan === "starter"
            const planLabel = plan === "business" ? "Business" : plan === "pro" ? "Plan Pro" : plan === "starter" ? "Starter" : "Passer au Pro"
            // La jauge annonçait « QR utilisés N / 25 » : elle comptait bien des QR
            // de page, mais divisait par la limite de PAGES. Sur Pro, la vraie limite
            // de QR autonomes est 35 — trois nombres appelés « QR » sur le même écran.
            // Une page = un QR de page : la jauge parle donc de pages, et le dit.
            const planLimit = pageLimit(plan)
            const pct = planLimit && qrActive != null ? Math.min(100, Math.round((qrActive / planLimit) * 100)) : 0
            return (
              <div style={{ position: "relative" }} className="sidebar-item">
                <Link href="/upgrade" style={{ textDecoration: "none" }} aria-label={collapsed ? "Voir les offres" : undefined}>
                  <div style={{
                    display: "flex", flexDirection: collapsed ? "row" : "column", alignItems: collapsed ? "center" : "stretch", gap: 8,
                    padding: collapsed ? "10px 0" : "12px 13px",
                    justifyContent: "center",
                    borderRadius: 11, cursor: "pointer",
                    background: "color-mix(in srgb, var(--accent) 4%, transparent)", border: "1px solid color-mix(in srgb, var(--accent) 26%, transparent)",
                    marginBottom: 8, transition: "border-color 0.26s", overflow: "hidden",
                  }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = "color-mix(in srgb, var(--accent) 50%, transparent)" }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = "color-mix(in srgb, var(--accent) 26%, transparent)" }}>
                    {collapsed ? (
                      <Activity size={16} color={G} style={{ flexShrink: 0 }} />
                    ) : (
                      <>
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
                          <span style={{ fontSize: 12.5, fontWeight: 700, color: G, letterSpacing: "-.01em", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{planLabel}</span>
                          {isPaid && <span style={{ padding: "2px 8px", borderRadius: 999, border: "1px solid color-mix(in srgb, var(--accent) 30%, transparent)", fontSize: 9.5, letterSpacing: ".1em", textTransform: "uppercase", color: "#c9a24d", fontWeight: 700, flexShrink: 0 }}>Actif</span>}
                        </div>
                        {planLimit && qrActive != null ? (
                          <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
                            <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between" }}>
                              <span style={{ fontSize: 11, color: MUTED }}>Pages publiées</span>
                              <span style={{ fontSize: 11, color: "#b8b1a6" }}>{qrActive} / {planLimit}</span>
                            </div>
                            <div style={{ height: 2, borderRadius: 2, background: "#221f1b", overflow: "hidden" }}>
                              <div style={{ width: `${pct}%`, height: "100%", background: "linear-gradient(90deg, #c9a24d, #e8c877)", transition: "width .6s cubic-bezier(.2,.8,.2,1)" }} />
                            </div>
                          </div>
                        ) : planLimit == null && qrActive != null ? (
                          <span style={{ fontSize: 11, color: MUTED }}>{qrActive} pages · illimité</span>
                        ) : (
                          <span style={{ fontSize: 11, color: MUTED }}>{isPaid ? "Abonnement actif" : "Débloquez tout QRowg"}</span>
                        )}
                      </>
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
                    {planLabel}
                  </div>
                )}
              </div>
            )
          })()}

          {/* Ligne compte (DA §10) : avatar + nom + e-mail (au lieu du plan, redondant avec la carte). */}
          {user && (
            <div style={{ position: "relative" }} className="sidebar-item">
              <Link href="/dashboard/profile" aria-label={collapsed ? "Mon profil" : undefined} style={{ textDecoration: "none", display: "flex", alignItems: "center", gap: 10,
                padding: collapsed ? "8px 0" : "8px 9px",
                justifyContent: collapsed ? "center" : "flex-start",
                borderRadius: 10, overflow: "hidden", cursor: "pointer", transition: "background 0.2s" }}
                onMouseEnter={e => { if (!collapsed) e.currentTarget.style.background = "rgba(255,255,255,0.035)" }}
                onMouseLeave={e => { e.currentTarget.style.background = "transparent" }}>
                <div style={{ width: 28, height: 28, borderRadius: "50%", background: `linear-gradient(135deg, ${G}, color-mix(in srgb, var(--accent) 75%, #000))`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 700, color: "#080808", flexShrink: 0 }}>
                  {(profile?.full_name || user.email || "?")[0].toUpperCase()}
                </div>
                {!collapsed && (
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ color: "#e8e3da", fontSize: 12.5, fontWeight: 600, margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {profile?.full_name || user.email?.split("@")[0] || "Utilisateur"}
                    </p>
                    <p style={{ color: MUTED, fontSize: 10.5, margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {user.email || "—"}
                    </p>
                  </div>
                )}
                {!collapsed && <span aria-hidden="true" style={{ marginLeft: "auto", width: 6, height: 6, borderRight: "1.5px solid #7d766c", borderTop: "1.5px solid #7d766c", transform: "rotate(45deg)", flexShrink: 0 }} />}
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
      <main className={hideMobileNav ? undefined : "qf-main-nav"} style={{ flex: 1, overflow: "auto", minWidth: 0 }}>
        <SessionShellContext.Provider value={{ signedIn, confirmee: sessionConfirmee }}>
          <ToastProvider><ConfirmProvider>{children}</ConfirmProvider></ToastProvider>
        </SessionShellContext.Provider>
      </main>

      {/* Sheet "Créer" (bouton central de la barre mobile) */}
      {isMobile && !hideMobileNav && createOpen && (
        <div onClick={() => setCreateOpen(false)} style={{ position: "fixed", inset: 0, zIndex: 60, background: "rgba(0,0,0,0.55)", backdropFilter: "blur(3px)", display: "flex", alignItems: "flex-end" }}>
          <div role="dialog" aria-modal="true" aria-label="Créer" onClick={e => e.stopPropagation()} style={{ width: "100%", background: "#141210", borderTopLeftRadius: 22, borderTopRightRadius: 22, border: `1px solid color-mix(in srgb, ${G} 16%, transparent)`, borderBottom: "none", padding: "10px 14px calc(16px + env(safe-area-inset-bottom))", boxShadow: "0 -16px 44px rgba(0,0,0,0.55)", animation: "sheetUp .24s var(--mo-ease-standard)" }}>
            <div style={{ width: 40, height: 4, borderRadius: 4, background: "rgba(255,255,255,0.18)", margin: "0 auto 12px" }} />
            <p style={{ margin: "0 4px 10px", color: "#F5F0E8", fontSize: 15, fontWeight: 800 }}>Créer</p>
            {(guest ? GUEST_CREATE_ACTIONS : CREATE_ACTIONS).map(({ href, icon: Icon, label, sub }, i) => (
              <Link key={i} href={href} onClick={() => setCreateOpen(false)}
                style={{ display: "flex", alignItems: "center", gap: 14, padding: "13px 10px", textDecoration: "none", borderTop: i ? "1px solid rgba(255,255,255,0.05)" : "none" }}>
                <span style={{ width: 42, height: 42, flexShrink: 0, borderRadius: 12, background: `color-mix(in srgb, ${G} 14%, transparent)`, border: `1px solid color-mix(in srgb, ${G} 28%, transparent)`, display: "flex", alignItems: "center", justifyContent: "center", color: G }}><Icon size={20} /></span>
                {/* `minWidth: 0` : sans lui, un libellé long pousse le chevron
                    hors de l'écran au lieu de se replier. */}
                <span style={{ display: "flex", flexDirection: "column", gap: 2, flex: 1, minWidth: 0 }}>
                  <span style={{ color: "#F5F0E8", fontSize: 15, fontWeight: 700 }}>{label}</span>
                  <span style={{ color: MUTED, fontSize: 12.5, lineHeight: 1.35 }}>{sub}</span>
                </span>
                <ChevronRight size={18} color={MUTED} style={{ marginLeft: "auto", flexShrink: 0 }} />
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* BARRE DE NAVIGATION MOBILE — « Liquid Nav » (components/MobileNav).
          Le bouton central « Créer » ouvre le même sheet qu'avant (onCreate). */}
      {!hideMobileNav && (
        <div className="qf-mobile-nav">
          <MobileNav onCreate={() => setCreateOpen(true)} unread={unreadLeads} guest={guest} />
        </div>
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
