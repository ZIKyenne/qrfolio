'use client'

/**
 * QRowg — MobileNav (Liquid Nav)
 * Barre de navigation mobile "liquide" :
 *  - la surface de la barre se creuse sous l'onglet actif (encoche en mask radial)
 *  - une bulle dorée glisse au-dessus, étirée à volume constant pendant le trajet
 *  - deux gouttes traînent derrière et fusionnent avec la bulle (filtre SVG "goo")
 *  - un halo doré suit le mouvement avec un léger retard
 *
 * Adapté au projet QRowg : AUCUNE classe Tailwind (le projet n'utilise pas Tailwind),
 * tout est en styles inline. La couleur suit l'accent utilisateur (var --accent).
 * L'onglet central "Créer" n'est pas un lien : il ouvre le sheet "Créer" du layout
 * via la prop `onCreate`. La visibilité (mobile only) + le masquage dans le builder
 * sont gérés PAR LE LAYOUT (il ne rend ce composant que sur mobile hors builder).
 */

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useMemo, useRef, useState } from 'react'
import type { CSSProperties, ReactElement } from 'react'

type IconC = () => ReactElement
// `more` : l'onglet ouvre la feuille « Plus » ; `routes` : chemins qui le rendent actif.
type Tab = { key: string; label: string; href?: string; icon: IconC; create?: boolean; more?: boolean; routes?: string[] }

const svgBase: CSSProperties = { width: '100%', height: '100%', display: 'block' }

const Icon = {
  home: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" style={svgBase}>
      <rect x="3" y="3" width="7" height="7" rx="1.6" />
      <rect x="14" y="3" width="7" height="7" rx="1.6" />
      <rect x="3" y="14" width="7" height="7" rx="1.6" />
      <rect x="14" y="14" width="7" height="7" rx="1.6" />
    </svg>
  ),
  qr: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" style={svgBase}>
      <rect x="3" y="3" width="6" height="6" rx="1" />
      <rect x="15" y="3" width="6" height="6" rx="1" />
      <rect x="3" y="15" width="6" height="6" rx="1" />
      <path d="M15 15h2v2h-2z" />
      <path d="M20 15v2M15 20h6" />
    </svg>
  ),
  plus: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" style={svgBase}>
      <path d="M12 5v14M5 12h14" />
    </svg>
  ),
  stats: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" style={svgBase}>
      <path d="M6 20v-6M12 20V6M18 20v-9" />
    </svg>
  ),
  user: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" style={svgBase}>
      <circle cx="12" cy="8" r="3.4" />
      <path d="M4.5 20c1.2-3.6 4-5.4 7.5-5.4s6.3 1.8 7.5 5.4" />
    </svg>
  ),
  more: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" style={svgBase}>
      <rect x="4" y="4" width="6.5" height="6.5" rx="1.6" />
      <rect x="13.5" y="4" width="6.5" height="6.5" rx="1.6" />
      <rect x="4" y="13.5" width="6.5" height="6.5" rx="1.6" />
      <rect x="13.5" y="13.5" width="6.5" height="6.5" rx="1.6" />
    </svg>
  ),
}

// Tout ce qui existe dans la barre latérale PC et n'a pas d'onglet : Messages,
// Médias, Équipe, Domaines, Redirections, Paramètres… n'avaient AUCUNE entrée sur
// téléphone. La feuille « Plus » les liste toutes (le badge Messages y compris).
export const MORE_ITEMS: { href: string; label: string; sub: string }[] = [
  { href: '/dashboard/leads', label: 'Messages', sub: 'Demandes reçues depuis vos pages' },
  { href: '/dashboard/templates', label: 'Modèles', sub: '48 modèles par métier' },
  { href: '/dashboard/assets', label: 'Médias', sub: 'Photos et fichiers réutilisables' },
  { href: '/dashboard/print-studio', label: 'Print Studio', sub: 'Supports à imprimer' },
  { href: '/dashboard/qr-link', label: 'QR vers un lien', sub: 'Site, WiFi, téléphone' },
  { href: '/dashboard/team', label: 'Équipe', sub: 'Inviter des collaborateurs' },
  { href: '/dashboard/domains', label: 'Domaines', sub: 'Votre propre adresse' },
  { href: '/dashboard/redirects', label: 'Redirections', sub: 'Anciennes adresses' },
  { href: '/dashboard/profile', label: 'Profil', sub: 'Identité, abonnement' },
  { href: '/dashboard/settings', label: 'Paramètres', sub: 'Notifications, mot de passe, compte' },
]

// Routes réelles du projet (cf. dashboard/layout.tsx). "Créer" = sheet, pas de href.
const FULL_TABS: Tab[] = [
  { key: 'home', label: 'Accueil', href: '/dashboard', icon: Icon.home },
  { key: 'pages', label: 'Mes pages', href: '/dashboard/qr-codes', icon: Icon.qr },
  { key: 'create', label: 'Créer', icon: Icon.plus, create: true },
  { key: 'stats', label: 'Stats', href: '/dashboard/analytics', icon: Icon.stats },
  { key: 'more', label: 'Plus', icon: Icon.more, more: true, routes: MORE_ITEMS.map(m => m.href) },
]

// Sans compte, quatre des cinq onglets ci-dessus mènent à la page de connexion
// (Accueil, Pages, Stats, Profil). Un visiteur venu essayer l'éditeur se cognerait
// donc à un mur au premier appui. On lui donne les destinations qui existent pour lui.
const GUEST_TABS: Tab[] = [
  { key: 'templates', label: 'Modèles', href: '/dashboard/templates', icon: Icon.home },
  { key: 'create', label: 'Créer', icon: Icon.plus, create: true },
  { key: 'qr', label: 'Créer un QR', href: '/dashboard/qr-link', icon: Icon.qr },
  { key: 'account', label: 'Compte', href: '/auth/signup', icon: Icon.user },
]

const GOLD = 'var(--accent, #C9A84C)'
const MUTED = '#8A8478'
const EASE = 'cubic-bezier(0.32, 0.02, 0.14, 1)'

export default function MobileNav({ onCreate, unread = 0, guest = false }: { onCreate?: () => void; unread?: number; guest?: boolean }) {
  const pathname = usePathname() || '/dashboard'
  const TABS = guest ? GUEST_TABS : FULL_TABS

  const active = useMemo(() => {
    // match le plus long, sur les onglets AYANT une route (Créer exclu)
    let best = 0
    let bestLen = -1
    const hitOn = (h: string) => pathname === h || pathname.startsWith(h + '/')
    TABS.forEach((t, i) => {
      const routes = t.href ? [t.href] : (t.routes ?? [])
      for (const h of routes) if (hitOn(h) && h.length > bestLen) { best = i; bestLen = h.length }
    })
    return best
  }, [pathname, TABS])

  const prev = useRef(active)
  const [moving, setMoving] = useState(0)
  const [burst, setBurst] = useState(0)
  const [moreOpen, setMoreOpen] = useState(false)

  // La feuille « Plus » se ferme à la navigation et à Échap.
  useEffect(() => { setMoreOpen(false) }, [pathname])
  useEffect(() => {
    if (!moreOpen) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setMoreOpen(false) }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [moreOpen])

  useEffect(() => {
    if (prev.current === active) return
    const dist = Math.min(Math.abs(active - prev.current), 4)
    prev.current = active
    setMoving(dist)
    const t = [
      setTimeout(() => setMoving(0), 360 + dist * 70),
      setTimeout(() => setBurst((b) => b + 1), 400 + dist * 70),
    ]
    return () => t.forEach(clearTimeout)
  }, [active])

  const n = TABS.length
  const centerPct = ((active + 0.5) / n) * 100
  const surfaceShift = (((active + 0.5) / n) - 0.5) * 50

  const stretch = moving ? 1 + 0.03 * moving : 1
  const bubbleTransform = `translateY(${moving ? 2 : 0}px) scale(${stretch.toFixed(3)}, ${(1 / stretch).toFixed(3)})`
  const iconTransform = `scale(${(1 / stretch).toFixed(3)}, ${stretch.toFixed(3)})`

  const notchMask = `radial-gradient(circle ${moving ? 31 : 28}px at 50% ${moving ? -4 : -2}px, transparent 99%, #000 100%)`
  const burstAnim = burst === 0 ? 'none' : `${burst % 2 ? 'qrf-burstA' : 'qrf-burstB'} 0.7s cubic-bezier(0.16, 0.75, 0.3, 1) forwards`

  const ActiveIcon = TABS[active].icon

  const blob = (top: number, size: number, duration: string, delay: string, opacity: number): CSSProperties => ({
    position: 'absolute',
    top,
    left: `${centerPct}%`,
    width: size,
    height: size,
    marginLeft: -size / 2,
    borderRadius: '50%',
    background: GOLD,
    opacity,
    transition: `left ${duration} cubic-bezier(0.36, 0.02, 0.13, 1) ${delay}, opacity 0.55s ease`,
  })

  return (
    <nav aria-label="Navigation principale" style={{ position: 'fixed', left: 0, right: 0, bottom: 0, zIndex: 50, pointerEvents: 'none' }}>
      {/* dégradé de fond : le contenu se fond sous la barre */}
      <div style={{ height: 80, width: '100%', background: 'linear-gradient(180deg, rgba(8,8,8,0) 0%, rgba(8,8,8,0.85) 55%, #080808 100%)' }} />

      <div style={{ pointerEvents: 'auto', padding: '0 12px', paddingBottom: 'max(12px, env(safe-area-inset-bottom))', background: '#080808' }}>
        <div style={{ position: 'relative', height: 54 }}>
          {/* filtre "goo" : fait fusionner la bulle et ses gouttes */}
          <svg width="0" height="0" style={{ position: 'absolute' }} aria-hidden>
            <defs>
              <filter id="qrf-goo">
                <feGaussianBlur in="SourceGraphic" stdDeviation="6" result="blur" />
                <feColorMatrix in="blur" mode="matrix" values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 22 -10" result="goo" />
                <feBlend in="SourceGraphic" in2="goo" />
              </filter>
            </defs>
          </svg>

          {/* halo doré, suit avec du retard */}
          <div style={{ pointerEvents: 'none', position: 'absolute', top: -46, left: 0, right: 0, height: 92, overflow: 'hidden', opacity: 0.34, filter: 'blur(20px)' }}>
            <div style={{ position: 'absolute', top: 8, left: `${centerPct}%`, width: 118, height: 62, marginLeft: -59, borderRadius: '50%', background: `radial-gradient(50% 50% at 50% 50%, ${GOLD} 0%, rgba(0,0,0,0) 72%)`, transition: 'left 1.02s cubic-bezier(0.3, 0.03, 0.14, 1) 0.05s' }} />
          </div>

          {/* surface de la barre + encoche liquide */}
          <div style={{ position: 'absolute', inset: 0, overflow: 'hidden', borderRadius: 20, boxShadow: '0 14px 32px rgba(0,0,0,0.5)' }}>
            <div style={{
              position: 'absolute', top: 0, height: '100%', left: '-50%', width: '200%',
              background: 'linear-gradient(180deg, #16140d 0%, #100f09 100%)',
              transform: `translateX(${surfaceShift}%)`,
              transition: 'transform 0.84s cubic-bezier(0.3, 0.02, 0.12, 1) 0.06s',
              WebkitMaskImage: notchMask, maskImage: notchMask,
            }} />
          </div>

          {/* couche gooey : bulle fantôme + 2 gouttes qui traînent */}
          <div style={{ pointerEvents: 'none', position: 'absolute', top: -46, left: 0, right: 0, height: 92, filter: 'url(#qrf-goo)' }}>
            <div style={{ ...blob(29, 46, '0.72s', '0s', 1), transform: bubbleTransform, transition: `left 0.72s ${EASE}, transform 0.42s ${EASE}` }} />
            <div style={blob(33, 32, '0.94s', '0.07s', moving ? 1 : 0)} />
            <div style={blob(36, 22, '1.1s', '0.12s', moving ? 1 : 0)} />
          </div>

          {/* bulle réelle (icône + relief) */}
          <div aria-hidden style={{
            position: 'absolute', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '50%',
            top: -17, left: `${centerPct}%`, width: 46, height: 46, marginLeft: -23,
            background: GOLD, boxShadow: '0 6px 18px rgba(201,168,76,0.22), inset 0 -2px 5px rgba(0,0,0,0.14)',
            transform: bubbleTransform, transition: `left 0.72s ${EASE}, transform 0.42s ${EASE}`, willChange: 'left, transform',
          }}>
            {/* onde qui se propage à l'arrivée */}
            <div style={{ position: 'absolute', inset: -1, borderRadius: '50%', border: `2px solid ${GOLD}`, opacity: moving ? 0 : 0.32, transform: moving ? 'scale(1.6)' : 'scale(1)', transition: 'transform 0.7s cubic-bezier(0.2, 0.75, 0.3, 1), opacity 0.7s ease' }} />
            {/* éclaboussure de gouttelettes à l'arrivée */}
            <div style={{ pointerEvents: 'none', position: 'absolute', borderRadius: '50%', inset: -6, animation: burstAnim }}>
              {[
                { top: 0, left: '50%', s: 3.5, ml: -1.75 },
                { bottom: 0, left: '50%', s: 3, ml: -1.5 },
                { top: '50%', left: 0, s: 3, mt: -1.5 },
                { top: '50%', right: 0, s: 3, mt: -1.5 },
                { top: '12%', left: '12%', s: 2.5 },
                { bottom: '12%', right: '12%', s: 2.5 },
              ].map((d: any, i) => (
                <span key={i} style={{ position: 'absolute', top: d.top, bottom: d.bottom, left: d.left, right: d.right, width: d.s, height: d.s, marginLeft: d.ml, marginTop: d.mt, borderRadius: '50%', background: GOLD }} />
              ))}
            </div>

            {/* reflet : donne l'aspect goutte plutôt que pastille plate */}
            <div style={{ pointerEvents: 'none', position: 'absolute', inset: 0, borderRadius: '50%', background: 'radial-gradient(60% 55% at 32% 26%, rgba(255,255,255,0.4) 0%, rgba(255,255,255,0) 62%), radial-gradient(80% 70% at 70% 92%, rgba(0,0,0,0.22) 0%, rgba(0,0,0,0) 60%)' }} />

            <span style={{ display: 'block', height: 22, width: 22, color: '#0B0A06', transform: iconTransform, transition: `transform 0.3s ${EASE}` }}>
              <ActiveIcon />
            </span>
          </div>

          {/* onglets */}
          {/* `repeat(${n})` : l'invité a 4 onglets ; avec 5 colonnes fixes, la bulle
              (calculée sur n) ne tombait plus sous l'icône. */}
          <div style={{ position: 'absolute', inset: 0, display: 'grid', gridTemplateColumns: `repeat(${n}, 1fr)`, alignItems: 'end', paddingBottom: 7 }}>
            {TABS.map((tab, i) => {
              const isActive = i === active
              const TabIcon = tab.icon
              const iconWrap: CSSProperties = {
                display: 'block', height: 21, width: 21, color: MUTED,
                opacity: isActive ? 0 : 1,
                transform: isActive
                  ? 'translateY(-6px)'
                  : `translateY(${moving && Math.abs(i - active) <= 2 ? (3 - Math.abs(i - active)) * 0.9 : 0}px)`,
                transition: 'opacity 0.28s ease, transform 0.4s ease',
                position: 'relative',
              }
              const labelStyle: CSSProperties = { fontSize: 10, fontWeight: 500, color: isActive ? GOLD : MUTED, transition: 'color 0.28s ease' }
              const cellStyle: CSSProperties = { display: 'flex', height: 46, minHeight: 44, flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-end', gap: 3, textDecoration: 'none', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }

              const inner = (
                <>
                  <span style={iconWrap}>
                    <TabIcon />
                    {(tab.href === '/dashboard' || tab.more) && unread > 0 && (
                      <span style={{ position: 'absolute', top: -5, right: -7, minWidth: 14, height: 14, padding: '0 3px', borderRadius: 7, background: '#EF4444', color: '#fff', fontSize: 9, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', lineHeight: 1 }}>{unread > 99 ? '99+' : unread}</span>
                    )}
                  </span>
                  <span style={labelStyle}>{tab.label}</span>
                </>
              )

              if (tab.create) {
                return (
                  <button key={tab.key} type="button" onClick={() => onCreate?.()} aria-label="Créer" style={cellStyle}>
                    {inner}
                  </button>
                )
              }
              if (tab.more) {
                return (
                  <button key={tab.key} type="button" onClick={() => setMoreOpen(o => !o)} aria-label={unread > 0 ? `Plus — ${unread} message${unread > 1 ? 's' : ''} non lu${unread > 1 ? 's' : ''}` : 'Plus'} aria-expanded={moreOpen} aria-haspopup="dialog" aria-current={isActive ? 'page' : undefined} style={cellStyle}>
                    {inner}
                  </button>
                )
              }
              return (
                <Link key={tab.key} href={tab.href!} aria-current={isActive ? 'page' : undefined} style={cellStyle}>
                  {inner}
                </Link>
              )
            })}
          </div>
        </div>
      </div>

      {/* Feuille « Plus » */}
      {moreOpen && (
        <div onClick={() => setMoreOpen(false)} style={{ pointerEvents: 'auto', position: 'fixed', inset: 0, zIndex: 60, background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(3px)', display: 'flex', alignItems: 'flex-end' }}>
          <div role="dialog" aria-modal="true" aria-label="Toutes les sections" onClick={e => e.stopPropagation()}
            style={{ width: '100%', maxHeight: '78dvh', overflowY: 'auto', background: '#141210', borderTopLeftRadius: 22, borderTopRightRadius: 22, border: `1px solid color-mix(in srgb, ${GOLD} 16%, transparent)`, borderBottom: 'none', padding: '10px 14px calc(16px + env(safe-area-inset-bottom))', boxShadow: '0 -16px 44px rgba(0,0,0,0.55)', animation: 'sheetUp .24s var(--mo-ease-standard, ease)' }}>
            <div style={{ width: 40, height: 4, borderRadius: 4, background: 'rgba(255,255,255,0.18)', margin: '0 auto 12px' }} />
            <p style={{ margin: '0 4px 6px', color: '#F5F0E8', fontSize: 15, fontWeight: 800 }}>Toutes les sections</p>
            {MORE_ITEMS.map((it, i) => {
              const courant = pathname === it.href || pathname.startsWith(it.href + '/')
              const badge = it.href === '/dashboard/leads' && unread > 0
              return (
                <Link key={it.href} href={it.href} aria-current={courant ? 'page' : undefined} onClick={() => setMoreOpen(false)}
                  style={{ display: 'flex', alignItems: 'center', gap: 12, minHeight: 52, padding: '8px 6px', textDecoration: 'none', borderTop: i ? '1px solid rgba(255,255,255,0.05)' : 'none' }}>
                  <span style={{ display: 'flex', flexDirection: 'column', gap: 2, flex: 1, minWidth: 0 }}>
                    <span style={{ color: courant ? GOLD : '#F5F0E8', fontSize: 15, fontWeight: 700 }}>{it.label}</span>
                    <span style={{ color: MUTED, fontSize: 12.5, lineHeight: 1.35 }}>{it.sub}</span>
                  </span>
                  {badge && <span style={{ minWidth: 22, height: 22, padding: '0 7px', borderRadius: 11, background: '#EF4444', color: '#fff', fontSize: 12, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>{unread > 99 ? '99+' : unread}</span>}
                  <span aria-hidden style={{ color: MUTED, fontSize: 18, flexShrink: 0 }}>›</span>
                </Link>
              )
            })}
          </div>
        </div>
      )}
    </nav>
  )
}
