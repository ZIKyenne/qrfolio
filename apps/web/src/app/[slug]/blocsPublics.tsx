"use client"
// blocsPublics.tsx — Les blocs de la page publiée qui se tiennent seuls : questions
// fréquentes, horaires, compte à rebours, carrousel, galerie, accordéon, RSVP,
// inscription à un événement, formulaire de contact, annonce, partage, avant/après.
//
// Ils vivaient en tête de PublicPageClient.tsx — 3 196 lignes pour la page que voit
// chaque visiteur après un scan. C'est le fichier où un bug coûte le plus cher :
// il mérite d'être lisible.
import { useEffect, useState, useRef, Component } from "react"
import SmartImage from "@/components/SmartImage"
import { altGalerie } from "@/lib/texteAlternatif"
import { trackLinkClick } from "@/lib/trackLinkClick"
import { submitLead } from "@/lib/submitLead"
import { contactFormFields } from "@/lib/leadForms"
import { openStatus, DAY_KEYS, countdownParts, shareLinks, calendarLinks, extHref, announcementMeta, SOCIAL_NETWORKS_MAP } from "../dashboard/builder/types"

type Block = { id: string; type: string; content: Record<string, any>; position: number }

function useInView(threshold = 0.15) {
  const ref = useRef<HTMLDivElement>(null)
  const [inView, setInView] = useState(false)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    // Repli : sans IntersectionObserver (ou en cas d'echec), on affiche le contenu
    // immediatement -> jamais de bloc invisible de facon permanente (accessibilite).
    if (typeof IntersectionObserver === "undefined") { setInView(true); return }
    try {
      const obs = new IntersectionObserver(([e]) => { if (e.isIntersecting) { setInView(true); obs.disconnect() } }, { threshold })
      obs.observe(el)
      return () => obs.disconnect()
    } catch { setInView(true) }
  }, [])
  return { ref, inView }
}

// ── Frontière d'erreur par bloc : isole un rendu de bloc qui planterait ──────
// (contenu malformé) pour éviter l'écran blanc — le bloc fautif disparaît, le
// reste de la page s'affiche normalement.
export class BlockBoundary extends Component<{ children: React.ReactNode }, { failed: boolean }> {
  constructor(props: { children: React.ReactNode }) { super(props); this.state = { failed: false } }
  static getDerivedStateFromError() { return { failed: true } }
  componentDidCatch(err: unknown) { if (typeof console !== "undefined") console.error("[QRowg] Bloc ignoré (erreur de rendu) :", err) }
  render() { return this.state.failed ? null : this.props.children }
}

// ── Animated Block Wrapper ───────────────────────────────────────────────────
export function AnimatedBlock({ children, delay = 0 }: { children: React.ReactNode; delay?: number }) {
  const { ref, inView } = useInView()
  return (
    <div ref={ref} className={inView ? "qf-ab qf-ab-in" : "qf-ab"} style={{ transitionDelay: `${delay}ms` }}>
      {children}
    </div>
  )
}

// ── Countdown ────────────────────────────────────────────────────────────────
// ── FAQ Item ─────────────────────────────────────────────────────────────────
export function FAQItem({ q, a, theme, link, linkLabel, compact, onLink }: { q: string; a: string; theme: any; link?: string; linkLabel?: string; compact?: boolean; onLink?: (url: string) => void }) {
  const [open, setOpen] = useState(false)
  const pad = compact ? "10px 14px" : "13px 16px"
  return (
    <div style={{ border: `1px solid ${open ? theme.primary + "30" : "rgba(255,255,255,0.06)"}`, borderRadius: compact ? 10 : 12, overflow: "hidden", marginBottom: compact ? 6 : 8, transition: "all 0.2s" }}>
      <button onClick={() => setOpen(o => !o)} aria-expanded={open} style={{ width: "100%", display: "flex", justifyContent: "space-between", alignItems: "center", padding: pad, background: open ? `${theme.primary}06` : "transparent", border: "none", color: theme.text, fontSize: compact ? 13 : 14, fontWeight: 600, cursor: "pointer", textAlign: "left" }}>
        {q}<span style={{ color: theme.primary, fontSize: 20, flexShrink: 0, marginLeft: 12, transition: "transform 0.2s", transform: open ? "rotate(45deg)" : "rotate(0)" }}>+</span>
      </button>
      <div style={{ maxHeight: open ? 1500 : 0, overflow: "hidden", transition: "max-height 0.35s ease" }}>
        <div style={{ padding: compact ? "0 14px 12px" : "0 16px 14px" }}>
          {a && <p style={{ color: theme.muted, fontSize: 13, margin: 0, lineHeight: 1.7, whiteSpace: "pre-wrap" }}>{a}</p>}
          {link && <a href={extHref(link)} target="_blank" rel="noopener noreferrer" onClick={() => onLink?.(extHref(link))}
            style={{ display: "inline-flex", alignItems: "center", gap: 5, marginTop: a ? 10 : 0, color: theme.primary, fontSize: 12.5, fontWeight: 700, textDecoration: "none" }}>
            {linkLabel || "En savoir plus"} <span aria-hidden>→</span>
          </a>}
        </div>
      </div>
    </div>
  )
}

// FAQ premium : recherche instantanée + filtres par catégorie + styles (accordéon / compact / cartes).
export function FAQPublic({ c, theme, pageId, blockId }: { c: any; theme: any; pageId: string; blockId: string }) {
  const items = [1,2,3,4,5,6,7,8]
    .map(i => ({ q: c[`q${i}`] as string, a: (c[`a${i}`] || "") as string, cat: (c[`q${i}_cat`] || "").trim() as string, link: (c[`q${i}_link`] || "").trim() as string, linkLabel: (c[`q${i}_link_label`] || "").trim() as string }))
    .filter(it => it.q)
  const [query, setQuery] = useState("")
  const [cat, setCat] = useState("")
  if (items.length === 0) return null
  const compact = c.style === "Compact"
  const cards = c.style === "Cartes"
  const searchOn = c.search === "Oui"
  const MUTED = theme.muted || "#8A8478"
  const FONT_B = theme.fontBody || "DM Sans, sans-serif"
  const cats = Array.from(new Set(items.map(it => it.cat).filter(Boolean)))
  const q = query.trim().toLowerCase()
  const filtered = items.filter(it => (!cat || it.cat === cat) && (!q || it.q.toLowerCase().includes(q) || it.a.toLowerCase().includes(q)))
  const chip = (active: boolean): any => ({ padding: "6px 12px", borderRadius: 999, fontSize: 12, fontWeight: 600, cursor: "pointer", border: `1px solid ${active ? theme.primary + "60" : "rgba(255,255,255,0.1)"}`, background: active ? `${theme.primary}14` : "transparent", color: active ? theme.primary : MUTED, whiteSpace: "nowrap" })
  return (
    <div style={{ padding: "6px 24px 16px" }}>
      {c.title && <p style={{ color: MUTED, fontSize: 11, textTransform: "uppercase", letterSpacing: 2, margin: "0 0 4px", fontFamily: FONT_B }}>{c.title}</p>}
      {c.subtitle && <p style={{ color: theme.text, fontSize: 14, fontWeight: 600, margin: "0 0 12px", fontFamily: FONT_B }}>{c.subtitle}</p>}
      {searchOn && (
        <input value={query} onChange={e => setQuery(e.target.value)} type="search" inputMode="search" placeholder="Rechercher une question…" aria-label="Rechercher dans la FAQ"
          style={{ width: "100%", boxSizing: "border-box", padding: "11px 14px", marginBottom: cats.length ? 10 : 12, borderRadius: 11, border: "1px solid rgba(255,255,255,0.1)", background: "rgba(255,255,255,0.04)", color: theme.text, fontSize: 13.5, outline: "none", fontFamily: FONT_B }} />
      )}
      {cats.length > 0 && (
        <div style={{ display: "flex", gap: 7, overflowX: "auto", padding: "2px 0 12px", WebkitOverflowScrolling: "touch" }}>
          <button onClick={() => setCat("")} style={chip(!cat)}>Tout</button>
          {cats.map(cn => <button key={cn} onClick={() => setCat(cn)} style={chip(cat === cn)}>{cn}</button>)}
        </div>
      )}
      {filtered.length > 0
        ? filtered.map((it, i) => <FAQItem key={i} q={it.q} a={it.a} theme={theme} link={it.link || undefined} linkLabel={it.linkLabel || undefined} compact={compact || cards}
            onLink={url => trackLinkClick(pageId, blockId, url)} />)
        : <p style={{ color: theme.muted, fontSize: 13, textAlign: "center", padding: "18px 0", margin: 0 }}>Aucune question ne correspond à votre recherche.</p>}
    </div>
  )
}

// ── Social Networks ──────────────────────────────────────────────────────────
// Réseaux : map dérivée de l'éditeur (source unique) + repli pour d'éventuelles clés legacy.
export const SOCIAL_NETWORKS: Record<string, { icon: string; color: string; label: string }> = {
  website: { icon: "🌐", color: "#C9A84C", label: "Site web" },
  ...SOCIAL_NETWORKS_MAP,
}

// ── Render Block ─────────────────────────────────────────────────────────────
// ── Blocs interactifs publics (onglets / accordéon) ──────────────────────────
// ── Avant / Après interactif (curseur à glisser, clip-path) ──────────────────
export function BeforeAfterPublic({ before, after, beforeLabel, afterLabel }: { before: string; after: string; beforeLabel: string; afterLabel: string }) {
  const [pos, setPos] = useState(50)
  const boxRef = useRef<HTMLDivElement>(null)
  const dragging = useRef(false)
  const move = (clientX: number) => { const b = boxRef.current?.getBoundingClientRect(); if (!b) return; setPos(Math.min(100, Math.max(0, ((clientX - b.left) / b.width) * 100))) }
  return (
    <div ref={boxRef} role="slider" aria-valuenow={Math.round(pos)} aria-label="Comparateur avant / après"
      onPointerDown={e => { dragging.current = true; e.currentTarget.setPointerCapture(e.pointerId); move(e.clientX) }}
      onPointerMove={e => { if (dragging.current) move(e.clientX) }}
      onPointerUp={() => dragging.current = false} onPointerCancel={() => dragging.current = false}
      style={{ position: "relative", height: 260, borderRadius: 12, overflow: "hidden", touchAction: "pan-y", userSelect: "none", cursor: "ew-resize" }}>
      <SmartImage width={1600} height={1200} sizes={SIZES_PLEINE} onError={e => { e.currentTarget.style.display = 'none' }} src={before} alt="Avant" draggable={false} style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }} />
      <SmartImage width={1600} height={1200} sizes={SIZES_PLEINE} onError={e => { e.currentTarget.style.display = 'none' }} src={after} alt="Après" draggable={false} style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", clipPath: `inset(0 ${100 - pos}% 0 0)` }} />
      {/* Ligne + poignée */}
      <div style={{ position: "absolute", top: 0, bottom: 0, left: `${pos}%`, width: 2, background: "#fff", transform: "translateX(-1px)", boxShadow: "0 0 8px rgba(0,0,0,0.5)" }} />
      <div style={{ position: "absolute", top: "50%", left: `${pos}%`, transform: "translate(-50%,-50%)", width: 34, height: 34, borderRadius: "50%", background: "#fff", boxShadow: "0 2px 8px rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", color: "#080808", fontSize: 14, fontWeight: 700 }}>⇔</div>
      {/* Labels */}
      <span style={{ position: "absolute", bottom: 10, left: 10, background: "rgba(239,68,68,0.85)", color: "#fff", fontSize: 11, fontWeight: 700, borderRadius: 6, padding: "3px 9px" }}>{beforeLabel}</span>
      <span style={{ position: "absolute", bottom: 10, right: 10, background: "rgba(57,255,143,0.85)", color: "#080808", fontSize: 11, fontWeight: 700, borderRadius: 6, padding: "3px 9px" }}>{afterLabel}</span>
    </div>
  )
}

// ── Bouton Copier réutilisable (feedback visible, plus de copie silencieuse) ──
export function CopyButton({ value, label, copiedLabel = "Copié", track, style }: { value: string; label: React.ReactNode; copiedLabel?: string; track?: () => void; style: any }) {
  const [copied, setCopied] = useState(false)
  const onClick = async () => {
    try { await navigator.clipboard?.writeText(value); setCopied(true); setTimeout(() => setCopied(false), 1800); track?.() } catch {}
  }
  return <button onClick={onClick} aria-live="polite" style={{ ...style, ...(copied ? { color: "var(--success)", borderColor: "rgba(57,255,143,0.4)" } : null) }}>{copied ? `✓ ${copiedLabel}` : label}</button>
}

// ── Bouton Partager : partage natif (mobile) ou popover réseaux + copie (desktop) ─
export function ShareButton({ pageId, blockId, style, inner }: { pageId: string; blockId: string; style: any; inner: React.ReactNode }) {
  const [open, setOpen] = useState(false)
  const [copied, setCopied] = useState(false)
  const url = () => (typeof window !== "undefined" ? window.location.href : "")
  const title = () => (typeof document !== "undefined" ? document.title : "QRowg")
  const onClick = async () => {
    trackLinkClick(pageId, blockId, "share")
    const nav = typeof navigator !== "undefined" ? navigator : undefined
    if (nav && (nav as any).share) {
      try { await (nav as any).share({ title: title(), text: title(), url: url() }) } catch {}
    } else {
      setOpen(o => !o)
    }
  }
  const copy = async () => {
    try { await navigator.clipboard?.writeText(url()); setCopied(true); setTimeout(() => setCopied(false), 1800) } catch {}
  }
  const targets = shareLinks(url(), title())
  return (
    <div style={{ position: "relative", flex: 1, display: "flex" }}>
      <button onClick={onClick} style={style} aria-haspopup="menu" aria-expanded={open}>{inner}</button>
      {open && (
        <>
          <div onClick={() => setOpen(false)} style={{ position: "fixed", inset: 0, zIndex: 70 }} />
          <div role="menu" style={{ position: "absolute", bottom: "calc(100% + 10px)", left: "50%", transform: "translateX(-50%)", zIndex: 71, background: "#141414", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 14, padding: 10, boxShadow: "0 12px 40px rgba(0,0,0,0.6)", display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 6, width: 232 }}>
            {targets.map(tgt => (
              <a key={tgt.key} href={tgt.href} target="_blank" rel="noopener noreferrer" onClick={() => { setOpen(false); trackLinkClick(pageId, blockId, `share:${tgt.key}`) }}
                style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4, padding: "8px 4px", borderRadius: 9, textDecoration: "none", background: "rgba(255,255,255,0.04)" }}>
                <span style={{ fontSize: 18 }}>{tgt.icon}</span>
                <span style={{ color: "#F5F0E8", fontSize: 9, fontWeight: 600 }}>{tgt.label}</span>
              </a>
            ))}
            <button onClick={copy} style={{ gridColumn: "1 / -1", display: "flex", alignItems: "center", justifyContent: "center", gap: 6, padding: "9px", borderRadius: 9, border: "none", cursor: "pointer", background: copied ? "rgba(57,255,143,0.14)" : "rgba(201,168,76,0.12)", color: copied ? "var(--success)" : "#C9A84C", fontSize: 11, fontWeight: 700 }}>
              {copied ? "✓ Lien copié" : "🔗 Copier le lien"}
            </button>
          </div>
        </>
      )}
    </div>
  )
}

// ── Badge "Ouvert / Fermé" calculé en direct (tick 60s) ──────────────────────
export function OpenBadge({ c, FONT_B }: { c: any; FONT_B: string }) {
  const [st, setSt] = useState<ReturnType<typeof openStatus>>(null)
  useEffect(() => {
    const upd = () => setSt(openStatus(c, new Date()))
    upd(); const t = setInterval(upd, 60000); return () => clearInterval(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [c.mon_fri, c.saturday, c.sunday, c.mon, c.tue, c.wed, c.thu, c.fri, c.sat, c.sun, c.mode])
  if (!st) return null
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 6, background: `${st.color}18`, border: `1px solid ${st.color}55`, color: st.color, borderRadius: 20, padding: "4px 12px", fontSize: 12, fontWeight: 700, fontFamily: FONT_B }}>
      <span style={{ width: 7, height: 7, borderRadius: "50%", background: st.color, boxShadow: `0 0 6px ${st.color}` }} />{st.label}
    </span>
  )
}

// Horaires publics : tableau (mode simple hérité OU jour-par-jour), jour actuel surligné,
// bannière d'exception (congés), badge de statut en direct. `todayIdx` en effet -> pas de mismatch SSR.
export function HoursPublic({ c, theme }: { c: any; theme: any }) {
  const [today, setToday] = useState(-1)
  useEffect(() => { setToday(new Date().getDay()) }, [])
  const MUTED = theme.muted || "#8A8478"
  const TEXT = theme.text || "#F5F0E8"
  const G = theme.primary || "#C9A84C"
  const FONT_B = theme.fontBody || "DM Sans, sans-serif"
  const perDayMode = c.mode === "Jour par jour" || DAY_KEYS.some(k => c[k] && String(c[k]).trim())
  // Lignes { label, hours, dayIdx } — dayIdx sert au surlignage du jour courant (-1 = groupe hérité).
  const DAY_FULL = ["Dimanche", "Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi"]
  let rows: { label: string; hours: string; dayIdx: number }[]
  if (perDayMode) {
    rows = [1,2,3,4,5,6,0].map(d => ({ label: DAY_FULL[d], hours: (c[DAY_KEYS[d]] || "").trim() || "Fermé", dayIdx: d }))
  } else {
    rows = [
      { label: "Lundi — Vendredi", hours: c.mon_fri, dayIdx: -1 },
      { label: "Samedi", hours: c.saturday, dayIdx: 6 },
      { label: "Dimanche", hours: c.sunday, dayIdx: 0 },
    ].filter(r => r.hours) as any
  }
  if (rows.length === 0 && !c.exception) return null
  const isToday = (dayIdx: number) => dayIdx === today || (dayIdx === -1 && today >= 1 && today <= 5)
  return (
    <div style={{ padding: "6px 24px 16px" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, margin: "0 0 10px", flexWrap: "wrap" }}>
        {c.title ? <p style={{ color: MUTED, fontSize: 11, textTransform: "uppercase", letterSpacing: 2, margin: 0, fontFamily: FONT_B }}>{c.title}</p> : <span />}
        <OpenBadge c={c} FONT_B={FONT_B} />
      </div>
      {c.exception && (
        <div style={{ display: "flex", alignItems: "center", gap: 8, background: "rgba(251,191,36,0.08)", border: "1px solid rgba(251,191,36,0.3)", borderRadius: 11, padding: "10px 13px", marginBottom: 10 }}>
          <span style={{ fontSize: 16, flexShrink: 0 }}>📅</span>
          <p style={{ color: "#FBBF24", fontSize: 12.5, fontWeight: 600, margin: 0, fontFamily: FONT_B }}>{c.exception}</p>
        </div>
      )}
      {rows.length > 0 && (
        <div style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 13, overflow: "hidden" }}>
          {rows.map((r, i) => {
            const highlight = isToday(r.dayIdx)
            const closed = /^(fermé|ferme|closed|repos)/i.test(r.hours.trim())
            return (
              <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "11px 16px", background: highlight ? `${G}0c` : "transparent", borderBottom: i < rows.length - 1 ? "1px solid rgba(255,255,255,0.04)" : "none" }}>
                <span style={{ color: highlight ? TEXT : MUTED, fontSize: 13, fontWeight: highlight ? 700 : 400, fontFamily: FONT_B }}>{r.label}{highlight && <span style={{ color: G, fontSize: 10, fontWeight: 700, marginLeft: 7, textTransform: "uppercase", letterSpacing: 0.5 }}>Aujourd&apos;hui</span>}</span>
                <span style={{ color: closed ? MUTED : TEXT, fontSize: 13, fontWeight: 600, fontFamily: FONT_B, opacity: closed ? 0.65 : 1 }}>{r.hours}</span>
              </div>
            )
          })}
          {c.note && <div style={{ padding: "9px 16px", background: `${G}05` }}><p style={{ color: MUTED, fontSize: 13.5, margin: 0, fontStyle: "italic", fontFamily: FONT_B }}>{c.note}</p></div>}
        </div>
      )}
    </div>
  )
}

// ── Rangée d'étoiles à remplissage partiel précis ────────────────────────────
export function StarRow({ fills, size = 13, color = "#FBBF24", empty = "rgba(255,255,255,0.18)", gap = 2 }: { fills: number[]; size?: number; color?: string; empty?: string; gap?: number }) {
  return (
    <div style={{ display: "inline-flex", gap }} aria-hidden="true">
      {fills.map((f, i) => (
        <span key={i} style={{ position: "relative", display: "inline-block", color: empty, fontSize: size, lineHeight: 1 }}>★
          <span style={{ position: "absolute", left: 0, top: 0, overflow: "hidden", width: `${Math.round(f * 100)}%`, color }}>★</span>
        </span>
      ))}
    </div>
  )
}

// ── Compte à rebours d'offre (tick 1s, urgence) ──────────────────────────────
export function CountdownPublic({ c, TEXT, MUTED, FONT_D, FONT_B, pageId, blockId }: { c: any; TEXT: string; MUTED: string; FONT_D: string; FONT_B: string; pageId: string; blockId: string }) {
  const accent = c.accent || "#EF4444"
  const rawTarget = c.target || c.date  // rétrocompat : ancien bloc event utilisait `date`
  const targetMs = rawTarget ? new Date(rawTarget).getTime() : NaN
  // L'heure ne se lit qu'APRES le montage. Le serveur rend la page, puis la met
  // en cache 60 s (ISR) : ses chiffres sont donc vieux de 0 a 60 secondes quand
  // le navigateur hydrate. Avec un `Date.now()` a l'initialisation, le texte du
  // serveur et celui du client differaient a coup sur — React #418, releve au
  // navigateur sur le modele « Soiree » — et React jetait le HTML du serveur
  // pour tout refaire cote client. Ses trois voisins (Ouvert/Ferme, Horaires,
  // Annonce) appliquaient deja ce motif ; le compte a rebours l'avait manque.
  const [now, setNow] = useState<number | null>(null)
  useEffect(() => {
    if (!isFinite(targetMs)) return
    setNow(Date.now())
    const id = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(id)
  }, [targetMs])
  if (!isFinite(targetMs)) return null
  // Avant le montage : la boite, ses libelles, et des tirets a la place des
  // chiffres. Serveur et premier rendu client sont identiques, donc aucun
  // mismatch — et jamais « Offre terminee » affiche a tort sur un cache.
  const p = now === null ? null : countdownParts(targetMs, now)
  const units: [string, number | null][] = [["Jours", p && p.days], ["Heures", p && p.hours], ["Min", p && p.mins], ["Sec", p && p.secs]]
  return (
    <div style={{ padding: "14px 16px" }}>
      <div style={{ background: `linear-gradient(135deg,${accent}22,${accent}0d)`, border: `1px solid ${accent}55`, borderRadius: 14, padding: "18px 16px", textAlign: "center" }}>
        {c.title && <p style={{ color: TEXT, fontSize: 18, fontWeight: 800, margin: "0 0 4px", fontFamily: FONT_D }}>{c.title}</p>}
        {c.subtitle && <p style={{ color: MUTED, fontSize: 13, margin: "0 0 14px", fontFamily: FONT_B }}>{c.subtitle}</p>}
        {p?.expired
          ? <p style={{ color: accent, fontSize: 17, fontWeight: 800, margin: "8px 0 0", fontFamily: FONT_D }}>{c.expired_text || "Offre terminée"}</p>
          : <div style={{ display: "flex", justifyContent: "center", gap: 10 }} role="timer" aria-label="Compte à rebours">
              {units.map(([lbl, val]) => (
                <div key={lbl} style={{ minWidth: 62, background: "rgba(0,0,0,0.28)", border: `1px solid ${accent}33`, borderRadius: 11, padding: "10px 6px" }}>
                  <div style={{ color: accent, fontSize: 26, fontWeight: 800, fontVariantNumeric: "tabular-nums", lineHeight: 1, fontFamily: FONT_D }}>{val === null ? "––" : String(val).padStart(2, "0")}</div>
                  <div style={{ color: MUTED, fontSize: 10, marginTop: 4, textTransform: "uppercase", letterSpacing: 0.6, fontFamily: FONT_B }}>{lbl}</div>
                </div>
              ))}
            </div>}
        {!p?.expired && c.cta_label && <a href={extHref(c.cta_url) || "#"} onClick={() => trackLinkClick(pageId, blockId, c.cta_url || "countdown")} style={{ display: "inline-block", marginTop: 16, background: accent, color: "#fff", padding: "11px 24px", borderRadius: 9, textDecoration: "none", fontSize: 14, fontWeight: 700, fontFamily: FONT_B }}>{c.cta_label}</a>}
      </div>
    </div>
  )
}

// ── Carrousel plein largeur (autoplay + points + flèches + swipe) ────────────
export function CarouselPublic({ imgs, legendes = [], title, autoplay, MUTED, FONT_B }: { imgs: string[]; legendes?: string[]; title?: string; autoplay: boolean; MUTED: string; FONT_B: string }) {
  const [idx, setIdx] = useState(0)
  const paused = useRef(false)
  const drag = useRef<{ x: number } | null>(null)
  const go = (n: number) => setIdx(((n % imgs.length) + imgs.length) % imgs.length)
  useEffect(() => {
    if (!autoplay || imgs.length < 2) return
    const t = setInterval(() => { if (!paused.current) setIdx(i => (i + 1) % imgs.length) }, 3500)
    return () => clearInterval(t)
  }, [autoplay, imgs.length])
  const onDown = (e: React.PointerEvent) => { drag.current = { x: e.clientX }; paused.current = true }
  const onUp = (e: React.PointerEvent) => {
    if (drag.current) { const dx = e.clientX - drag.current.x; if (dx > 40) go(idx - 1); else if (dx < -40) go(idx + 1) }
    drag.current = null; paused.current = false
  }
  return (
    <div style={{ padding: "10px 24px 14px" }}>
      {title && <p style={{ color: MUTED, fontSize: 11, textTransform: "uppercase", letterSpacing: 2, margin: "0 0 10px", fontFamily: FONT_B }}>{title}</p>}
      <div style={{ position: "relative", overflow: "hidden", borderRadius: 14, touchAction: "pan-y" }}
        onPointerDown={onDown} onPointerUp={onUp} onMouseEnter={() => paused.current = true} onMouseLeave={() => paused.current = false}>
        <div style={{ display: "flex", transition: "transform .45s var(--mo-ease-standard)", transform: `translateX(-${idx * 100}%)` }}>
          {imgs.map((img, i) => <SmartImage width={1600} height={1200} sizes={SIZES_PLEINE} eager={i === 0} onError={e => { e.currentTarget.style.display = 'none' }} key={i} src={img} alt={altGalerie(legendes[i], title, i, imgs.length)} draggable={false} style={{ width: "100%", height: 240, flexShrink: 0, objectFit: "cover", display: "block", userSelect: "none" }} />)}
        </div>
        {imgs.length > 1 && <>
          <button onClick={() => go(idx - 1)} aria-label="Précédente" style={{ position: "absolute", left: 8, top: "50%", transform: "translateY(-50%)", width: 34, height: 34, borderRadius: "50%", background: "rgba(0,0,0,0.45)", border: "none", color: "#fff", fontSize: 20, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>‹</button>
          <button onClick={() => go(idx + 1)} aria-label="Suivante" style={{ position: "absolute", right: 8, top: "50%", transform: "translateY(-50%)", width: 34, height: 34, borderRadius: "50%", background: "rgba(0,0,0,0.45)", border: "none", color: "#fff", fontSize: 20, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>›</button>
          <div style={{ position: "absolute", bottom: 10, left: "50%", transform: "translateX(-50%)", display: "flex", gap: 6 }}>
            {imgs.map((_, i) => <button key={i} onClick={() => go(i)} aria-label={`Photo ${i + 1}`} style={{ width: i === idx ? 18 : 7, height: 7, borderRadius: 4, border: "none", background: i === idx ? "#fff" : "rgba(255,255,255,0.5)", cursor: "pointer", transition: "width .2s, background .2s", padding: 0 }} />)}
          </div>
        </>}
      </div>
    </div>
  )
}

// ── Galerie publique avec lightbox plein écran (clic pour agrandir + navigation) ──
/**
 * Largeur d'affichage d'une image qui occupe toute la largeur du contenu.
 *
 * La page publiée ne dépasse jamais 520 px. Sans cette indication, le
 * navigateur suppose la pleine largeur de l'écran et prend la plus grosse
 * variante disponible — une photo de 1600 px là où 828 suffisent.
 */
export const SIZES_PLEINE = "(max-width: 520px) 100vw, 520px"

/** Idem pour une image posée dans une grille de deux colonnes. */
export const SIZES_DEMI = "(max-width: 520px) 50vw, 260px"

/**
 * Largeur d'affichage d'une vignette de galerie, en CSS.
 *
 * Sans `sizes`, le navigateur suppose la pleine largeur et prend la plus grosse
 * variante : mesuré, une photo de 1600 px pour une vignette de 168 px. La page
 * publiée fait au plus 520 px de large ; en dessous, chaque vignette occupe
 * 100/colonnes pour cent de l'écran.
 */
export function sizesGrille(colonnesMobile: number, colonnes: number): string {
  const m = Math.max(1, colonnesMobile), d = Math.max(1, colonnes)
  return `(max-width: 520px) ${Math.round(100 / m)}vw, ${Math.round(520 / d)}px`
}

export function GalleryPublic({ imgs, legendes = [], layout, cols, colsMobile, title, MUTED, FONT_B }: { imgs: string[]; legendes?: string[]; layout: string; cols: number; colsMobile: number; title?: string; MUTED: string; FONT_B: string }) {
  const [idx, setIdx] = useState<number | null>(null)
  useEffect(() => {
    if (idx === null) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setIdx(null)
      else if (e.key === "ArrowRight") setIdx(i => (i === null ? i : (i + 1) % imgs.length))
      else if (e.key === "ArrowLeft") setIdx(i => (i === null ? i : (i - 1 + imgs.length) % imgs.length))
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [idx, imgs.length])

  const titleEl = title && <p style={{ color: MUTED, fontSize: 11, textTransform: "uppercase", letterSpacing: 2, margin: "0 0 10px", fontFamily: FONT_B }}>{title}</p>
  const open = (i: number) => setIdx(i)

  const lightbox = idx !== null && (
    <div onClick={() => setIdx(null)} role="dialog" aria-modal="true" style={{ position: "fixed", inset: 0, zIndex: 9999, background: "rgba(0,0,0,0.92)", display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
      <button onClick={e => { e.stopPropagation(); setIdx(null) }} aria-label="Fermer" style={{ position: "absolute", top: 14, right: 16, width: 40, height: 40, borderRadius: "50%", background: "rgba(255,255,255,0.12)", border: "none", color: "#fff", fontSize: 22, cursor: "pointer" }}>×</button>
      {imgs.length > 1 && <>
        <button onClick={e => { e.stopPropagation(); setIdx(i => i === null ? i : (i - 1 + imgs.length) % imgs.length) }} aria-label="Précédente" style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", width: 44, height: 44, borderRadius: "50%", background: "rgba(255,255,255,0.12)", border: "none", color: "#fff", fontSize: 24, cursor: "pointer" }}>‹</button>
        <button onClick={e => { e.stopPropagation(); setIdx(i => i === null ? i : (i + 1) % imgs.length) }} aria-label="Suivante" style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", width: 44, height: 44, borderRadius: "50%", background: "rgba(255,255,255,0.12)", border: "none", color: "#fff", fontSize: 24, cursor: "pointer" }}>›</button>
      </>}
      <SmartImage onError={e => { e.currentTarget.style.display = 'none' }} width={1600} height={1200} sizes="100vw" src={imgs[idx]} alt={altGalerie(legendes[idx], title, idx, imgs.length)} onClick={e => e.stopPropagation()} style={{ maxWidth: "100%", maxHeight: "90vh", objectFit: "contain", borderRadius: 8 }} />
      {imgs.length > 1 && <span style={{ position: "absolute", bottom: 16, left: "50%", transform: "translateX(-50%)", color: "rgba(255,255,255,0.8)", fontSize: 12, background: "rgba(0,0,0,0.4)", borderRadius: 20, padding: "4px 12px" }}>{idx + 1} / {imgs.length}</span>}
    </div>
  )

  if (layout === "masonry") return (
    <div style={{ padding: "6px 24px 16px" }}>
      {titleEl}
      <div className={`qf-cm-${colsMobile}`} style={{ columnCount: cols, columnGap: 8 }}>
        {imgs.map((img, i) => <SmartImage key={i} src={img} alt={altGalerie(legendes[i], title, i, imgs.length)} width={1200} height={1600} sizes={sizesGrille(colsMobile, cols)} onClick={() => open(i)} onError={e => (e.currentTarget.style.display = "none")} style={{ width: "100%", borderRadius: 10, marginBottom: 8, display: "block", breakInside: "avoid", cursor: "zoom-in" }} />)}
      </div>
      {lightbox}
    </div>
  )
  const effCols = layout === "compact" ? Math.max(cols, 3) : cols
  const gap = layout === "compact" ? 5 : 7
  const rad = layout === "compact" ? 8 : 10
  return (
    <div style={{ padding: "6px 24px 16px" }}>
      {titleEl}
      <div className={`qf-gm-${colsMobile}`} style={{ display: "grid", gridTemplateColumns: `repeat(${effCols},1fr)`, gap }}>
        {imgs.map((img, i) => (
          <div key={i} onClick={() => open(i)} style={{ overflow: "hidden", borderRadius: rad, aspectRatio: "1", cursor: "zoom-in" }}>
            <SmartImage src={img} alt={altGalerie(legendes[i], title, i, imgs.length)} width={1200} height={1200} sizes={sizesGrille(colsMobile, effCols)} onError={e => { const p = e.currentTarget.parentElement; if (p) p.style.display = "none" }} style={{ width: "100%", height: "100%", objectFit: "cover", transition: "transform 0.3s" }}
              onMouseEnter={e => (e.currentTarget.style.transform = "scale(1.08)")}
              onMouseLeave={e => (e.currentTarget.style.transform = "scale(1)")} />
          </div>
        ))}
      </div>
      {lightbox}
    </div>
  )
}

export function TabsPublic({ tabs, G, TEXT, MUTED, FONT_B }: { tabs: [string, string][]; G: string; TEXT: string; MUTED: string; FONT_B: string }) {
  const [active, setActive] = useState(0)
  return (
    <div style={{ padding: "10px 24px 14px" }}>
      <div role="tablist" style={{ display: "flex", gap: 0, borderBottom: "1px solid rgba(255,255,255,0.08)", marginBottom: 13, overflowX: "auto" }}>
        {tabs.map(([label], i) => (
          <button key={i} role="tab" aria-selected={active === i} onClick={() => setActive(i)} style={{ padding: "9px 15px", background: "transparent", border: "none", borderBottom: `2px solid ${active === i ? G : "transparent"}`, color: active === i ? G : MUTED, fontSize: 13, fontWeight: active === i ? 700 : 400, cursor: "pointer", whiteSpace: "nowrap", fontFamily: FONT_B }}>{label}</button>
        ))}
      </div>
      <p role="tabpanel" style={{ color: TEXT, fontSize: 14, margin: 0, lineHeight: 1.7, whiteSpace: "pre-wrap", fontFamily: FONT_B }}>{tabs[active]?.[1] || ""}</p>
    </div>
  )
}

export function AccordionPublic({ items, title, G, TEXT, MUTED, FONT_B }: { items: [string, string][]; title?: string; G: string; TEXT: string; MUTED: string; FONT_B: string }) {
  const [openIdx, setOpenIdx] = useState<number | null>(0)
  return (
    <div style={{ padding: "10px 24px 14px" }}>
      {title && <p style={{ color: MUTED, fontSize: 11, textTransform: "uppercase", letterSpacing: 2, margin: "0 0 10px", fontFamily: FONT_B }}>{title}</p>}
      <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
        {items.map(([t, content], i) => (
          <div key={i} style={{ border: `1px solid ${openIdx === i ? `${G}40` : "rgba(255,255,255,0.07)"}`, borderRadius: 11, overflow: "hidden" }}>
            <button onClick={() => setOpenIdx(openIdx === i ? null : i)} aria-expanded={openIdx === i} style={{ width: "100%", display: "flex", justifyContent: "space-between", alignItems: "center", padding: "13px 15px", background: openIdx === i ? `${G}08` : "transparent", border: "none", color: openIdx === i ? G : TEXT, fontSize: 14, fontWeight: 600, cursor: "pointer", textAlign: "left", fontFamily: FONT_B }}>
              {t}
              <span style={{ color: G, fontSize: 18, lineHeight: 1, flexShrink: 0, marginLeft: 10 }}>{openIdx === i ? "−" : "+"}</span>
            </button>
            {openIdx === i && content && (
              <div style={{ padding: "4px 15px 14px", background: "rgba(0,0,0,0.15)" }}>
                <p style={{ color: MUTED, fontSize: 13, margin: 0, lineHeight: 1.6, whiteSpace: "pre-wrap", fontFamily: FONT_B }}>{content}</p>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

// ── RSVP interactif public (réponse enregistrée en base + trackée) ───────────
export function RsvpPublic({ block, pageId, TEXT, MUTED }: { block: Block; pageId: string; TEXT: string; MUTED: string }) {
  const c = block.content
  const [choice, setChoice] = useState<string | null>(null)
  const pick = (val: string) => {
    setChoice(val)
    trackLinkClick(pageId, block.id, `rsvp:${val}`)
    submitLead({ pageId, blockId: block.id, type: "rsvp", message: val, data: { question: c.title || "RSVP", reponse: val } })
  }
  return (
    <div style={{ padding: "10px 24px 14px" }}>
      <p style={{ color: TEXT, fontSize: 15, fontWeight: 700, margin: "0 0 4px" }}>{c.title || "Serez-vous présent ?"}</p>
      {c.description && <p style={{ color: MUTED, fontSize: 13.5, margin: "0 0 14px" }}>{c.description}</p>}
      {choice ? (
        <div style={{ background: "rgba(57,255,143,0.08)", border: "1.5px solid rgba(57,255,143,0.3)", borderRadius: 11, padding: "14px", textAlign: "center", color: "var(--success)", fontSize: 13, fontWeight: 700 }}>✅ Merci, votre réponse est enregistrée !</div>
      ) : (
        <div style={{ display: "flex", gap: 8 }}>
          <button onClick={() => pick("oui")} style={{ flex: 2, background: "rgba(57,255,143,0.1)", border: "1.5px solid rgba(57,255,143,0.3)", borderRadius: 11, padding: "13px 8px", color: "var(--success)", fontSize: 13, fontWeight: 700, cursor: "pointer" }}>{c.yes_label || "✅ Oui, je viens"}</button>
          <button onClick={() => pick("peut-etre")} style={{ flex: 1, background: "rgba(251,191,36,0.08)", border: "1.5px solid rgba(251,191,36,0.25)", borderRadius: 11, padding: "13px 8px", color: "#FBBF24", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>{c.maybe_label || "🤔 Peut-être"}</button>
          <button onClick={() => pick("non")} style={{ flex: 1, background: "rgba(239,68,68,0.08)", border: "1.5px solid rgba(239,68,68,0.2)", borderRadius: 11, padding: "13px 8px", color: "#EF4444", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>{c.no_label || "❌ Non"}</button>
        </div>
      )}
    </div>
  )
}

// ── Inscription événement public (enregistrée en base) ───────────────────────
export function EventRegisterPublic({ block, pageId, TEXT, MUTED, ownerEmail }: { block: Block; pageId: string; TEXT: string; MUTED: string; ownerEmail?: string }) {
  const c = block.content
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [phone, setPhone] = useState("")
  const [company, setCompany] = useState("")
  const [hp, setHp] = useState("") // honeypot anti-spam
  const [status, setStatus] = useState<"idle" | "sending" | "done" | "error">("idle")
  const inputStyle: any = { width: "100%", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.09)", borderRadius: 9, padding: "11px 13px", color: TEXT, fontSize: 13, outline: "none", boxSizing: "border-box", fontFamily: "inherit" }
  const emailOk = !email.trim() || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())
  const canSubmit = !!name && !!email && emailOk && status !== "sending"
  const submit = async () => {
    if (hp) { setStatus("done"); return } // honeypot rempli = bot
    setStatus("sending")
    trackLinkClick(pageId, block.id, "register")
    const data: Record<string, any> = { nom: name, email }
    if (c.show_phone === "yes") data.telephone = phone
    if (c.show_company === "yes") data.societe = company
    const ok = await submitLead({ pageId, blockId: block.id, type: "register", name, email, phone: c.show_phone === "yes" ? phone : undefined, message: `Inscription: ${c.title || "événement"}`, data })
    if (ok) { setStatus("done"); return }
    // Repli mailto si l'enregistrement échoue
    if (ownerEmail) {
      const body = encodeURIComponent(Object.entries(data).map(([k, v]) => `${k}: ${v}`).join("\n"))
      window.location.href = `mailto:${ownerEmail}?subject=${encodeURIComponent(`Inscription: ${c.title || "evenement"}`)}&body=${body}`
      setStatus("done")
    } else setStatus("error")
  }
  if (status === "done") return (
    <div style={{ padding: "10px 24px 14px" }}>
      <div style={{ background: "rgba(57,255,143,0.08)", border: "1.5px solid rgba(57,255,143,0.3)", borderRadius: 12, padding: "16px", textAlign: "center", color: "var(--success)", fontSize: 14, fontWeight: 700 }}>✅ Inscription enregistrée, merci !</div>
    </div>
  )
  return (
    <div style={{ padding: "10px 24px 14px" }}>
      <p style={{ color: TEXT, fontSize: 15, fontWeight: 700, margin: "0 0 4px" }}>{c.title || "S'inscrire gratuitement"}</p>
      {c.description && <p style={{ color: "#EC4899", fontSize: 12, margin: "0 0 13px", fontWeight: 600 }}>⚡ {c.description}</p>}
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        <input type="text" name="website" tabIndex={-1} autoComplete="off" aria-hidden="true" value={hp} onChange={e => setHp(e.target.value)} style={{ position: "absolute", left: "-9999px", width: 1, height: 1, opacity: 0, pointerEvents: "none" }} />
        <input placeholder="Prénom & Nom" aria-label="Prénom & Nom" autoComplete="name" value={name} onChange={e => setName(e.target.value)} style={inputStyle} />
        <input placeholder="Email" aria-label="Email" type="email" inputMode="email" autoComplete="email" autoCapitalize="off" value={email} onChange={e => setEmail(e.target.value)} style={inputStyle} />
        {c.show_phone === "yes" && <input placeholder="Téléphone" aria-label="Téléphone" type="tel" inputMode="tel" autoComplete="tel" value={phone} onChange={e => setPhone(e.target.value)} style={inputStyle} />}
        {c.show_company === "yes" && <input placeholder="Société" aria-label="Société" autoComplete="organization" value={company} onChange={e => setCompany(e.target.value)} style={inputStyle} />}
        {email.trim() && !emailOk && <p style={{ color: "#F59E0B", fontSize: 12, margin: 0 }}>Adresse email invalide.</p>}
        {status === "error" && <p style={{ color: "#EF4444", fontSize: 12, margin: 0 }}>Une erreur est survenue. Réessayez.</p>}
        <button onClick={submit} disabled={!canSubmit} style={{ background: "linear-gradient(90deg,#EC4899,#F472B6)", borderRadius: 10, padding: "13px", textAlign: "center", fontSize: 14, fontWeight: 700, color: "#fff", border: "none", cursor: canSubmit ? "pointer" : "not-allowed", opacity: canSubmit ? 1 : 0.55 }}>{status === "sending" ? "Envoi…" : (c.button_label || "Je m'inscris")}</button>
      </div>
    </div>
  )
}

// ── Formulaire public générique (enregistré en base, repli mailto) ───────────
export function LeadFormPublic({ block, pageId, ownerEmail, leadType, title, description, descColor, fields, button, accent, buttonTextColor = "#fff", subject, TEXT, MUTED }: { block: Block; pageId: string; ownerEmail?: string; leadType: string; title: string; description?: string; descColor?: string; fields: { key: string; label: string; area?: boolean }[]; button: string; accent: string; buttonTextColor?: string; subject: string; TEXT: string; MUTED: string }) {
  const [vals, setVals] = useState<Record<string, string>>({})
  const [status, setStatus] = useState<"idle" | "sending" | "done" | "error">("idle")
  const [hp, setHp] = useState("") // honeypot anti-spam (invisible pour un humain)
  const set = (k: string, v: string) => setVals(p => ({ ...p, [k]: v }))
  const required = fields.slice(0, 2).map(f => f.key)
  // Bon clavier mobile + autofill selon le type de champ (formulaire souvent scanne au telephone).
  const fieldProps = (key: string): any => {
    const k = key.toLowerCase()
    if (/e?mail/.test(k)) return { type: "email", inputMode: "email", autoComplete: "email", autoCapitalize: "off" }
    if (/phone|tel|mobile|whatsapp|numero/.test(k)) return { type: "tel", inputMode: "tel", autoComplete: "tel" }
    if (/name|nom|prenom/.test(k)) return { type: "text", autoComplete: "name" }
    return { type: "text" }
  }
  const emailKey = fields.find(f => /e?mail/i.test(f.key))?.key
  const emailVal = emailKey ? (vals[emailKey] || "").trim() : ""
  const emailOk = !emailVal || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailVal)
  const ready = required.every(k => (vals[k] || "").trim()) && emailOk
  const inputStyle: any = { width: "100%", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.09)", borderRadius: 9, padding: "11px 13px", color: TEXT, fontSize: 13, outline: "none", boxSizing: "border-box", fontFamily: "inherit" }
  const submit = async () => {
    // Honeypot rempli = bot -> on simule un envoi reussi sans rien enregistrer.
    if (hp) { setStatus("done"); return }
    setStatus("sending")
    trackLinkClick(pageId, block.id, "form")
    const data: Record<string, any> = {}
    fields.forEach(f => { if (vals[f.key]) data[f.label] = vals[f.key] })
    const ok = await submitLead({ pageId, blockId: block.id, type: leadType, name: vals.name, email: vals.email, phone: vals.phone, message: vals.message || vals.project || subject, data })
    if (ok) { setStatus("done"); return }
    if (ownerEmail) {
      const body = encodeURIComponent(fields.map(f => `${f.label}: ${vals[f.key] || ""}`).join("\n"))
      window.location.href = `mailto:${ownerEmail}?subject=${encodeURIComponent(subject)}&body=${body}`
      setStatus("done")
    } else setStatus("error")
  }
  if (status === "done") return (
    <div style={{ padding: "10px 24px 14px" }}>
      <div style={{ background: "rgba(57,255,143,0.08)", border: "1.5px solid rgba(57,255,143,0.3)", borderRadius: 12, padding: "16px", textAlign: "center", color: "var(--success)", fontSize: 14, fontWeight: 700 }}>✅ Demande envoyée, merci ! Nous revenons vers vous rapidement.</div>
    </div>
  )
  return (
    <div style={{ padding: "10px 24px 14px" }}>
      <p style={{ color: TEXT, fontSize: 15, fontWeight: 700, margin: "0 0 4px" }}>{title}</p>
      {description && <p style={{ color: descColor || MUTED, fontSize: 13.5, margin: "0 0 13px" }}>{description}</p>}
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {/* Honeypot : hors ecran, ignore par les humains, rempli par les bots */}
        <input type="text" name="website" tabIndex={-1} autoComplete="off" aria-hidden="true"
          value={hp} onChange={e => setHp(e.target.value)}
          style={{ position: "absolute", left: "-9999px", width: 1, height: 1, opacity: 0, pointerEvents: "none" }} />
        {fields.map(f => f.area
          ? <textarea key={f.key} placeholder={f.label} aria-label={f.label} value={vals[f.key] || ""} onChange={e => set(f.key, e.target.value)} rows={3} style={{ ...inputStyle, resize: "vertical" }} />
          : <input key={f.key} {...fieldProps(f.key)} placeholder={f.label} aria-label={f.label} value={vals[f.key] || ""} onChange={e => set(f.key, e.target.value)} style={inputStyle} />)}
        {emailVal && !emailOk && <p style={{ color: "#F59E0B", fontSize: 12, margin: 0 }}>Adresse email invalide.</p>}
        {status === "error" && <p style={{ color: "#EF4444", fontSize: 12, margin: 0 }}>Une erreur est survenue. Réessayez.</p>}
        <button onClick={submit} disabled={!ready || status === "sending"} style={{ background: accent, borderRadius: 10, padding: "13px", textAlign: "center", fontSize: 14, fontWeight: 700, color: buttonTextColor, border: "none", cursor: ready && status !== "sending" ? "pointer" : "not-allowed", opacity: ready && status !== "sending" ? 1 : 0.55 }}>{status === "sending" ? "Envoi…" : button}</button>
      </div>
    </div>
  )
}

// ── Avatar du profil : image avec repli sur l'initiale si l'URL est cassée (404) ─
export function ProfileAvatar({ src, name, shapeStyle, decoStyle, bgStyle, fontD }: { src?: string; name?: string; shapeStyle: any; decoStyle: any; bgStyle: any; fontD: string }) {
  const [failed, setFailed] = useState(false)
  if (!src || failed) {
    return <div style={{ width: 96, height: 96, ...shapeStyle, ...decoStyle, ...bgStyle, margin: "0 auto 14px", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 38, fontWeight: 700, color: "#080808", fontFamily: fontD }}>{(name || "?")[0]?.toUpperCase()}</div>
  }
  return <SmartImage src={src} alt={name || ""} width={96} height={96} eager onError={() => setFailed(true)} style={{ width: 96, height: 96, ...shapeStyle, ...decoStyle, objectFit: "cover", margin: "0 auto 14px", display: "block" }} />
}

// Annonce / alerte : icône + couleur auto (ou personnalisée), fenêtre de dates optionnelle,
// bouton optionnel, fermeture par le visiteur (mémorisée en localStorage). Couleurs douces.
export function AnnouncementPublic({ c, theme, pageId, blockId }: { c: any; theme: any; pageId: string; blockId: string }) {
  const [dismissed, setDismissed] = useState(false)
  const [now, setNow] = useState<number | null>(null)
  useEffect(() => {
    const tick = () => setNow(Date.now())
    tick()
    try { if (c.dismissible === "Oui" && localStorage.getItem("qf-ann-" + blockId) === "1") setDismissed(true) } catch {}
    // Ré-évalue la fenêtre de dates sans rechargement (apparition/expiration en direct).
    if (c.start_date || c.end_date) { const t = setInterval(tick, 60000); return () => clearInterval(t) }
  }, [c.dismissible, c.start_date, c.end_date, blockId])
  const TEXT = theme.text || "#F5F0E8"
  const FONT_B = theme.fontBody || "DM Sans, sans-serif"
  if (!c.title && !c.message) return null
  // Fenêtre d'affichage : appliquée seulement après le montage (évite tout décalage SSR).
  // Une date invalide (NaN) est ignorée plutôt que de masquer/afficher par erreur.
  if (now !== null) {
    const s = c.start_date ? Date.parse(c.start_date) : NaN
    const e = c.end_date ? Date.parse(c.end_date) : NaN
    if (!isNaN(s) && now < s) return null
    if (!isNaN(e) && now > e) return null
  }
  if (dismissed) return null
  const meta = announcementMeta(c.type)
  const color = (typeof c.color === "string" && /^#[0-9a-fA-F]{6}$/.test(c.color.trim())) ? c.color.trim() : meta.color
  const icon = (c.emoji || "").trim() || meta.icon
  const compact = c.style === "Compact"
  const dismiss = () => { setDismissed(true); try { localStorage.setItem("qf-ann-" + blockId, "1") } catch {} }
  return (
    <div style={{ padding: compact ? "6px 24px" : "8px 24px" }}>
      <div role="status" style={{ background: `${color}14`, border: `1.5px solid ${color}44`, borderRadius: 13, padding: compact ? "10px 13px" : "15px 17px", position: "relative" }}>
        <div style={{ display: "flex", alignItems: "flex-start", gap: 11 }}>
          <span style={{ fontSize: compact ? 18 : 23, flexShrink: 0, lineHeight: 1.2 }} aria-hidden>{icon}</span>
          <div style={{ flex: 1, minWidth: 0 }}>
            {c.title && <p style={{ color, fontSize: compact ? 13 : 14, fontWeight: 700, margin: c.message || (c.cta_label && c.cta_url) ? "0 0 4px" : "0", fontFamily: FONT_B, paddingRight: c.dismissible === "Oui" ? 20 : 0 }}>{c.title}</p>}
            {c.message && <p style={{ color: TEXT, fontSize: 13, margin: 0, lineHeight: 1.5, whiteSpace: "pre-wrap" }}>{c.message}</p>}
            {c.cta_label && c.cta_url && (
              <a href={extHref(c.cta_url)} target="_blank" rel="noopener noreferrer" onClick={() => trackLinkClick(pageId, blockId, extHref(c.cta_url))}
                style={{ display: "inline-flex", alignItems: "center", gap: 5, marginTop: 9, color, fontSize: 12.5, fontWeight: 700, textDecoration: "none" }}>
                {c.cta_label} <span aria-hidden>→</span>
              </a>
            )}
          </div>
          {c.dismissible === "Oui" && (
            <button onClick={dismiss} aria-label="Fermer l'annonce"
              style={{ position: "absolute", top: 8, right: 10, width: 22, height: 22, display: "flex", alignItems: "center", justifyContent: "center", background: "none", border: "none", color, opacity: 0.7, fontSize: 18, lineHeight: 1, cursor: "pointer" }}>×</button>
          )}
        </div>
      </div>
    </div>
  )
}
