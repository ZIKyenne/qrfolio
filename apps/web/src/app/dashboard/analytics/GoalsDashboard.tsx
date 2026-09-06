"use client"

import { useState, useEffect, useMemo } from "react"
import { useToast } from "@/components/Toast"
import { useConfirm } from "@/components/ui/Confirm"
import { Button } from "@/components/ui/Button"
import {
  Target, Plus, Trash2, Pencil, TrendingUp, TrendingDown, CheckCircle,
  MessageCircle, Calendar, Phone, Mail, ShoppingBag,
  MousePointerClick, Zap, ArrowRight, ArrowLeft, Loader, X
} from "lucide-react"
import {
  AreaChart, Area, XAxis, YAxis, Tooltip,
  ResponsiveContainer, CartesianGrid
} from "recharts"

// ── Types ─────────────────────────────────────────────────────────────────────
type Goal = {
  id: string; name: string; description: string | null
  goal_type: string; target_match: string | null
  target_count: number | null; period_days: number
  color: string; page_id: string | null; created_at: string
}

type ClickRow = {
  block_id: string; click_target: string | null
  clicked_at: string; page_id: string; block_type?: string
}

type ViewRow  = { viewed_at: string; page_id: string }
type PageRow  = { id: string; title: string; slug: string }

interface Props {
  clicks:    ClickRow[]
  pageViews: ViewRow[]
  pages:     PageRow[]
}

// ── Config types d'objectifs ──────────────────────────────────────────────────
const GOAL_TYPES: Record<string, {
  label: string; color: string
  icon: React.ReactNode; matchHint: string; autoMatch: string
}> = {
  whatsapp:       { label: "Clic WhatsApp",      color: "#25D366",       icon: <MessageCircle size={16} />,    matchHint: "wa.me/ ou whatsapp.com",  autoMatch: "wa.me" },
  calendly:       { label: "Réservation",        color: "#818CF8",       icon: <Calendar size={16} />,         matchHint: "calendly.com",            autoMatch: "calendly.com" },
  phone:          { label: "Appel téléphone",    color: "#4ADE80",       icon: <Phone size={16} />,            matchHint: "tel:",                    autoMatch: "tel:" },
  email:          { label: "Clic Email",         color: "#A78BFA",       icon: <Mail size={16} />,             matchHint: "mailto:",                 autoMatch: "mailto:" },
  stripe_product: { label: "Achat produit",      color: "var(--success)", icon: <ShoppingBag size={16} />,      matchHint: "stripe.com ou buy.",      autoMatch: "stripe.com" },
  cta_button:     { label: "Bouton d'action",    color: "var(--accent)",  icon: <MousePointerClick size={16} />, matchHint: "URL ou laisser vide",     autoMatch: "" },
  contact_form:   { label: "Formulaire contact", color: "var(--action)",  icon: <Mail size={16} />,             matchHint: "contact",                 autoMatch: "contact" },
  custom:         { label: "Personnalisé",       color: "var(--danger)",  icon: <Zap size={16} />,              matchHint: "URL ou mot-clé",          autoMatch: "" },
}

const PERIODS   = [{ v: 7, l: "7 jours" }, { v: 30, l: "30 jours" }, { v: 90, l: "90 jours" }]
const TARGETS   = [10, 30, 100]
const SWATCHES  = ["var(--accent)", "var(--success)", "#818CF8", "var(--danger)", "var(--action)", "#25D366"]

// ── Tokens gold DA ──────────────────────────────────────────────────────────
const G       = "var(--accent)"
const TEXT    = "#F5F0E8"
const MUTED   = "#A8A190"
const CARD    = "#141210"
const PANEL   = "#100e0c"
const FIELD   = "#1a1712"
const BORDER  = "#221f1b"
const HAIR    = "rgba(255,255,255,0.07)"

const isTypeLabel = (s: string) => Object.values(GOAL_TYPES).some(c => c.label === s)

// ── Calculer les conversions d'un objectif ────────────────────────────────────
function calcConversions(goal: Goal, clicks: ClickRow[], views: ViewRow[]) {
  const cutoff = new Date()
  cutoff.setDate(cutoff.getDate() - goal.period_days)

  const periodClicks = clicks.filter(c => {
    const inTime = new Date(c.clicked_at) >= cutoff
    const inPage = !goal.page_id || c.page_id === goal.page_id
    return inTime && inPage
  })

  const periodViews = views.filter(v => {
    const inTime = new Date(v.viewed_at) >= cutoff
    const inPage = !goal.page_id || v.page_id === goal.page_id
    return inTime && inPage
  })

  // Filtrer les clics correspondant à l'objectif
  const cfg       = GOAL_TYPES[goal.goal_type]
  const autoMatch = goal.target_match || cfg?.autoMatch || ""

  const conversions = periodClicks.filter(c => {
    if (c.block_type === goal.goal_type) return true
    if (autoMatch && c.click_target?.toLowerCase().includes(autoMatch.toLowerCase())) return true
    return false
  })

  const total     = conversions.length
  const totalViews = periodViews.length
  // Taux de conversion = clics-objectif / vues. Si AUCUNE vue, le taux n'existe pas :
  // on renvoie null (affiché « — »), jamais un pourcentage fabriqué (division par 1).
  const ctr       = totalViews > 0 ? parseFloat(((total / totalViews) * 100).toFixed(1)) : null
  const progress  = goal.target_count ? Math.min(Math.round((total / goal.target_count) * 100), 100) : null

  // Allure (§4) : « en bonne voie » ou « en retard » se juge sur le RYTHME, pas sur un seuil fixe.
  // On compare la part de l'objectif atteinte (conversions/cible) à la part de temps écoulée
  // (temps depuis la création, plafonné à la période). Sans cible saisie, pas de statut.
  let pace: "ahead" | "behind" | null = null
  let paceMarker: number | null = null
  if (goal.target_count && goal.target_count > 0) {
    const daysSince    = Math.max(0, (Date.now() - new Date(goal.created_at).getTime()) / 86400000)
    const elapsedFrac  = Math.min(Math.min(daysSince, goal.period_days) / goal.period_days, 1)
    const progressFrac = total / goal.target_count
    paceMarker = Math.round(elapsedFrac * 100)
    // Au tout début (temps écoulé quasi nul), on ne crie pas « en retard » : on attend un peu de recul.
    pace = elapsedFrac < 0.05 ? null : (progressFrac >= elapsedFrac ? "ahead" : "behind")
  }

  // Données pour le mini graphique (par jour)
  const dailyMap: Record<string, number> = {}
  for (let i = goal.period_days - 1; i >= 0; i--) {
    const d = new Date(); d.setDate(d.getDate() - i)
    dailyMap[d.toISOString().slice(0, 10)] = 0
  }
  conversions.forEach(c => {
    const day = c.clicked_at.slice(0, 10)
    if (day in dailyMap) dailyMap[day]++
  })
  const chartData = Object.entries(dailyMap).map(([date, count]) => ({
    date: date.slice(5), count
  }))

  return { total, ctr, progress, chartData, totalViews, pace, paceMarker }
}

// ── Tooltip mini graphique ────────────────────────────────────────────────────
function MiniTip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null
  return (
    <div style={{ background: "#111009", border: "1px solid color-mix(in srgb, var(--accent) 30%, transparent)", borderRadius: 7, padding: "6px 10px" }}>
      <p style={{ color: MUTED, fontSize: 10, margin: "0 0 2px" }}>{label}</p>
      <p style={{ color: G, fontSize: 13, fontWeight: 700, margin: 0 }}>{payload[0].value} conv.</p>
    </div>
  )
}

// ── Petits blocs réutilisés ─────────────────────────────────────────────────
const fieldLabel: React.CSSProperties = { color: "#C8BFB2", fontSize: 11, fontWeight: 600, display: "block", marginBottom: 7, letterSpacing: 0.2 }
const inputStyle: React.CSSProperties = { width: "100%", background: FIELD, border: `1px solid ${BORDER}`, borderRadius: 10, color: TEXT, padding: "10px 12px", fontSize: 13, outline: "none", boxSizing: "border-box" }

// ── Composant principal ───────────────────────────────────────────────────────
export default function GoalsDashboard({ clicks, pageViews, pages }: Props) {
  const [goals,      setGoals]      = useState<Goal[]>([])
  const [loading,    setLoading]    = useState(true)
  const [showForm,   setShowForm]   = useState(false)
  const [editId,     setEditId]     = useState<string | null>(null)
  const [step,       setStep]       = useState<1 | 2>(1)
  const [deleting,   setDeleting]   = useState<string | null>(null)
  const confirm = useConfirm()
  const toast = useToast()
  const [saving,     setSaving]     = useState(false)

  // Formulaire
  const [fName,   setFName]   = useState("")
  const [fType,   setFType]   = useState("whatsapp")
  const [fMatch,  setFMatch]  = useState("")
  const [fTarget, setFTarget] = useState("")
  const [fPeriod, setFPeriod] = useState(30)
  const [fColor,  setFColor]  = useState("var(--accent)")
  const [fPageId, setFPageId] = useState("all")

  useEffect(() => {
    fetch("/api/goals")
      .then(r => r.json())
      .then(d => { setGoals(d.goals ?? []); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  function resetForm() {
    setFName(""); setFType("whatsapp"); setFMatch("")
    setFTarget(""); setFPeriod(30); setFColor("var(--accent)"); setFPageId("all")
  }
  function closeForm() { setShowForm(false); setEditId(null); setStep(1); resetForm() }

  // Ouvrir un formulaire vierge à l'étape 1 (choix du type).
  function openNew() { setEditId(null); resetForm(); setStep(1); setShowForm(true) }

  // Démarrage rapide depuis une puce : type déjà choisi -> on saute direct aux réglages.
  function startWith(type: string) {
    const cfg = GOAL_TYPES[type]
    setEditId(null)
    setFType(type)
    setFName(cfg?.label ?? "")
    setFMatch(cfg?.autoMatch ?? "")
    setFColor(cfg?.color ?? "var(--accent)")
    setFTarget(""); setFPeriod(30); setFPageId("all")
    setStep(2)
    setShowForm(true)
  }

  // Choix d'un type à l'étape 1 : pré-remplit le nom (si l'utilisateur n'a pas déjà tapé le sien)
  // et l'URL cible, puis passe aux réglages.
  function selectType(key: string) {
    const cfg = GOAL_TYPES[key]
    setFType(key)
    if (!fName.trim() || isTypeLabel(fName)) setFName(cfg.label)
    if (!fMatch.trim()) setFMatch(cfg.autoMatch)
    setFColor(cfg.color)
    setStep(2)
  }

  function openEdit(goal: Goal) {
    setEditId(goal.id)
    setFType(goal.goal_type)
    setFName(goal.name)
    setFMatch(goal.target_match ?? "")
    setFTarget(goal.target_count ? String(goal.target_count) : "")
    setFPeriod(goal.period_days)
    setFColor(goal.color)
    setFPageId(goal.page_id ?? "all")
    setStep(2)
    setShowForm(true)
  }

  async function saveGoal() {
    if (!fName || !fType) return
    setSaving(true)
    const payload = {
      name: fName, description: null, goal_type: fType,
      target_match: fMatch || GOAL_TYPES[fType]?.autoMatch || null,
      target_count: fTarget ? parseInt(fTarget) : null,
      period_days: fPeriod, color: fColor,
      page_id: fPageId === "all" ? null : fPageId,
    }
    try {
      const res = await fetch("/api/goals", {
        method: editId ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editId ? { id: editId, ...payload } : payload),
      })
      const d = await res.json().catch(() => ({}))
      // La réponse n'était pas lue en cas d'échec : le formulaire restait ouvert,
      // sans un mot, et l'objectif n'existait nulle part.
      if (!res.ok || d.error || !d.goal) {
        toast.error(d.error || "L'objectif n'a pas pu être enregistré.")
        return
      }
      setGoals(prev => editId ? prev.map(g => g.id === editId ? d.goal : g) : [d.goal, ...prev])
      closeForm()
    } catch {
      toast.error("Connexion impossible. Vérifiez votre réseau et réessayez.")
    } finally {
      setSaving(false)
    }
  }

  // Confirmation d'abord, retrait de l'écran seulement après la réponse du serveur.
  async function deleteGoal(id: string) {
    const g = goals.find(x => x.id === id)
    if (!(await confirm({ title: "Supprimer cet objectif ?", message: `« ${g?.name ?? "Objectif"} » et son historique de conversions seront effacés.`, confirmLabel: "Supprimer", danger: true }))) return
    setDeleting(id)
    try {
      const res = await fetch("/api/goals", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      })
      const d = await res.json().catch(() => ({}))
      if (!res.ok || d.error) { toast.error(d.error || "L'objectif n'a pas pu être supprimé."); return }
      setGoals(prev => prev.filter(g => g.id !== id))
    } catch {
      toast.error("Connexion impossible. Vérifiez votre réseau et réessayez.")
    } finally {
      setDeleting(null)
    }
  }

  // KPIs globaux
  const allStats = useMemo(() =>
    goals.map(g => calcConversions(g, clicks, pageViews)),
    [goals, clicks, pageViews]
  )

  const totalConv    = allStats.reduce((a, s) => a + s.total, 0)
  const bestIdx      = allStats.length ? allStats.reduce((best, s, i) => s.total > allStats[best].total ? i : best, 0) : -1
  const bestGoal     = bestIdx >= 0 && allStats[bestIdx].total > 0 ? goals[bestIdx] : null
  // « En bonne voie » = objectifs dont l'allure est en avance (§4), pas un seuil fixe de progression.
  const goalsOnTrack = allStats.filter(s => s.pace === "ahead").length

  return (
    <div style={{ fontFamily: "DM Sans, sans-serif", color: TEXT }}>

      {/* En-tête de section */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 22, gap: 16, flexWrap: "wrap", paddingTop: 8 }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
            <span style={{ width: 34, height: 34, borderRadius: 10, background: "color-mix(in srgb, var(--accent) 12%, transparent)", border: "1px solid color-mix(in srgb, var(--accent) 26%, transparent)", display: "inline-flex", alignItems: "center", justifyContent: "center" }}>
              <Target size={18} color={G} />
            </span>
            <h2 style={{ fontSize: 19, fontWeight: 700, margin: 0 }}>Objectifs de conversion</h2>
          </div>
          <p style={{ color: MUTED, fontSize: 13, margin: 0 }}>
            Suivez vos conversions clés : WhatsApp, réservations, appels, achats…
          </p>
        </div>
        {(goals.length > 0 || showForm) && (
          <button type="button" onClick={openNew} className="da-btn-primary da-btn-primary--sm">
            <Plus className="da-ic da-ic-plus" size={15} strokeWidth={2.4} /> <span>Nouvel objectif</span>
          </button>
        )}
      </div>

      {/* KPIs globaux */}
      {goals.length > 0 && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 12, marginBottom: 22 }}>
          {[
            { icon: <TrendingUp size={15} color={G} />,               label: "Conversions totales", value: totalConv.toLocaleString() },
            { icon: <Target size={15} color="#818CF8" />,             label: "Objectifs actifs",    value: String(goals.length) },
            { icon: <CheckCircle size={15} color="var(--success)" />, label: "En bonne voie",       value: String(goalsOnTrack) },
            { icon: <Zap size={15} color="var(--danger)" />,          label: "Meilleur objectif",   value: bestGoal?.name ?? "—" },
          ].map((k, i) => (
            <div key={i} style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 12, padding: "14px 16px", display: "flex", alignItems: "center", gap: 11 }}>
              {k.icon}
              <div style={{ minWidth: 0 }}>
                <p style={{ color: MUTED, fontSize: 10, textTransform: "uppercase", letterSpacing: 1, margin: "0 0 3px" }}>{k.label}</p>
                <p style={{ color: TEXT, fontSize: 15, fontWeight: 800, margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{k.value}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Formulaire création / édition — 2 étapes */}
      {showForm && (
        <div style={{ background: CARD, border: `1px solid color-mix(in srgb, var(--accent) 22%, ${BORDER})`, borderRadius: 16, padding: 22, marginBottom: 24, boxShadow: "0 20px 50px -30px rgba(0,0,0,0.8)" }}>
          {/* Barre d'en-tête + fil d'étapes */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 18, gap: 12 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
              <h3 style={{ fontSize: 14, fontWeight: 700, margin: 0, whiteSpace: "nowrap" }}>
                {editId ? "Modifier l'objectif" : "Nouvel objectif"}
              </h3>
              {!editId && (
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  {[1, 2].map(n => (
                    <span key={n} style={{ width: 22, height: 22, borderRadius: "50%", display: "inline-flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 700,
                      background: step === n ? G : (step > n ? "color-mix(in srgb, var(--accent) 22%, transparent)" : PANEL),
                      color: step === n ? "#1a1408" : (step > n ? G : MUTED),
                      border: `1px solid ${step >= n ? "color-mix(in srgb, var(--accent) 40%, transparent)" : BORDER}` }}>{n}</span>
                  ))}
                  <span style={{ color: MUTED, fontSize: 11.5, marginLeft: 2 }}>{step === 1 ? "Type de conversion" : "Réglages"}</span>
                </div>
              )}
            </div>
            <button type="button" onClick={closeForm} aria-label="Fermer le formulaire"
              style={{ background: "none", border: "none", color: MUTED, cursor: "pointer", display: "flex", alignItems: "center" }}>
              <X size={16} />
            </button>
          </div>

          {/* Étape 1 — choix du type */}
          {step === 1 && !editId && (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 10 }}>
              {Object.entries(GOAL_TYPES).map(([key, cfg]) => (
                <button key={key} type="button" onClick={() => selectType(key)}
                  style={{ display: "flex", alignItems: "center", gap: 12, padding: "14px 14px", background: fType === key ? `color-mix(in srgb, ${cfg.color} 12%, ${PANEL})` : PANEL, border: fType === key ? `1px solid ${cfg.color}55` : `1px solid ${BORDER}`, borderRadius: 12, color: TEXT, cursor: "pointer", textAlign: "left", transition: "border-color .15s, background .15s" }}>
                  <span style={{ width: 38, height: 38, borderRadius: 10, flexShrink: 0, display: "inline-flex", alignItems: "center", justifyContent: "center", color: cfg.color, background: `color-mix(in srgb, ${cfg.color} 14%, transparent)`, border: `1px solid color-mix(in srgb, ${cfg.color} 30%, transparent)` }}>{cfg.icon}</span>
                  <span style={{ minWidth: 0, flex: 1 }}>
                    <span style={{ display: "block", fontSize: 13, fontWeight: 700, marginBottom: 2 }}>{cfg.label}</span>
                    <span style={{ display: "block", color: MUTED, fontSize: 11, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{cfg.matchHint}</span>
                  </span>
                  <ArrowRight size={15} color={MUTED} style={{ flexShrink: 0 }} />
                </button>
              ))}
            </div>
          )}

          {/* Étape 2 — réglages */}
          {(step === 2 || editId) && (
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              {/* Rappel du type choisi */}
              <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                {!editId && (
                  <button type="button" onClick={() => setStep(1)}
                    style={{ display: "inline-flex", alignItems: "center", gap: 6, background: PANEL, border: `1px solid ${BORDER}`, borderRadius: 9, color: MUTED, fontSize: 12, fontWeight: 600, padding: "7px 11px", cursor: "pointer" }}>
                    <ArrowLeft size={13} /> Changer
                  </button>
                )}
                <span style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "7px 12px", borderRadius: 9, background: `color-mix(in srgb, ${GOAL_TYPES[fType]?.color ?? G} 12%, transparent)`, border: `1px solid color-mix(in srgb, ${GOAL_TYPES[fType]?.color ?? G} 30%, transparent)`, color: GOAL_TYPES[fType]?.color ?? G, fontSize: 12.5, fontWeight: 700 }}>
                  {GOAL_TYPES[fType]?.icon} {GOAL_TYPES[fType]?.label}
                </span>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 16 }}>
                {/* Colonne gauche */}
                <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                  <div>
                    <label style={fieldLabel}>Nom de l'objectif *</label>
                    <input value={fName} onChange={e => setFName(e.target.value)} placeholder="ex : Clics WhatsApp"
                      style={inputStyle} />
                  </div>
                  <div>
                    <label style={fieldLabel}>Cible URL / mot-clé (optionnel)</label>
                    <input value={fMatch} onChange={e => setFMatch(e.target.value)}
                      placeholder={GOAL_TYPES[fType]?.matchHint ?? "mot-clé ou URL"}
                      style={{ ...inputStyle, fontSize: 12.5 }} />
                    <p style={{ color: MUTED, fontSize: 10.5, margin: "6px 0 0" }}>Laissez vide pour compter tous les clics de ce type.</p>
                  </div>
                  <div>
                    <label style={fieldLabel}>Page suivie</label>
                    <select aria-label="Page concernée par l'objectif" value={fPageId} onChange={e => setFPageId(e.target.value)}
                      style={{ ...inputStyle, cursor: "pointer" }}>
                      <option value="all">Toutes les pages</option>
                      {pages.map(p => <option key={p.id} value={p.id}>{p.title}</option>)}
                    </select>
                  </div>
                </div>

                {/* Colonne droite */}
                <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                  <div>
                    <label style={fieldLabel}>Objectif cible (optionnel)</label>
                    <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                      <input value={fTarget} onChange={e => setFTarget(e.target.value.replace(/[^0-9]/g, ""))} inputMode="numeric" placeholder="ex : 50"
                        style={{ ...inputStyle, width: 92, fontSize: 12.5 }} />
                      <div style={{ display: "flex", gap: 6 }}>
                        {TARGETS.map(t => {
                          const on = fTarget === String(t)
                          return (
                            <button key={t} type="button" onClick={() => setFTarget(String(t))}
                              style={{ padding: "8px 12px", borderRadius: 9, fontSize: 12, fontWeight: 700, cursor: "pointer",
                                background: on ? "color-mix(in srgb, var(--accent) 16%, transparent)" : PANEL,
                                border: on ? "1px solid color-mix(in srgb, var(--accent) 45%, transparent)" : `1px solid ${BORDER}`,
                                color: on ? G : MUTED }}>{t}</button>
                          )
                        })}
                      </div>
                    </div>
                    <p style={{ color: MUTED, fontSize: 10.5, margin: "6px 0 0" }}>Sert à mesurer votre allure. Sans cible, pas de barre de progression.</p>
                  </div>

                  <div>
                    <label style={fieldLabel}>Période de mesure</label>
                    <div style={{ display: "flex", gap: 6, background: PANEL, border: `1px solid ${BORDER}`, borderRadius: 11, padding: 4 }}>
                      {PERIODS.map(p => {
                        const on = fPeriod === p.v
                        return (
                          <button key={p.v} type="button" onClick={() => setFPeriod(p.v)}
                            style={{ flex: 1, padding: "8px 0", borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: "pointer", border: "none",
                              background: on ? G : "transparent", color: on ? "#1a1408" : MUTED, transition: "background .15s" }}>{p.l}</button>
                        )
                      })}
                    </div>
                  </div>

                  <div>
                    <label style={fieldLabel}>Couleur</label>
                    <div style={{ display: "flex", gap: 9 }}>
                      {SWATCHES.map(c => (
                        <button key={c} type="button" onClick={() => setFColor(c)} aria-label={`Couleur ${c}`}
                          style={{ width: 26, height: 26, borderRadius: "50%", background: c, cursor: "pointer",
                            border: fColor === c ? "2px solid #F5F0E8" : "2px solid transparent",
                            outline: fColor === c ? "none" : `1px solid ${BORDER}`,
                            boxShadow: fColor === c ? `0 0 0 3px color-mix(in srgb, ${c} 30%, transparent)` : "none", transition: "box-shadow .15s" }} />
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              <div style={{ display: "flex", gap: 10, marginTop: 4, justifyContent: "flex-end" }}>
                <Button variant="ghost" size="sm" onClick={closeForm}>Annuler</Button>
                <Button variant="primary" size="sm" onClick={saveGoal} loading={saving} disabled={!fName}
                  leftIcon={<CheckCircle size={13} />}>
                  {editId ? "Enregistrer" : "Créer l'objectif"}
                </Button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Liste des objectifs */}
      {loading ? (
        <div style={{ textAlign: "center", padding: "60px 20px", color: MUTED }}>
          <Loader size={24} color={MUTED} style={{ animation: "mo-spin 0.8s linear infinite" }} />
        </div>
      ) : goals.length === 0 && !showForm ? (
        // ── État vide compact + démarrage rapide ──
        <div style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 16, padding: "26px 24px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 6 }}>
            <span style={{ width: 40, height: 40, borderRadius: 12, background: "color-mix(in srgb, var(--accent) 12%, transparent)", border: "1px solid color-mix(in srgb, var(--accent) 26%, transparent)", display: "inline-flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              <Target size={20} color={G} />
            </span>
            <div>
              <p style={{ color: TEXT, fontSize: 15, fontWeight: 700, margin: "0 0 2px" }}>Suivez ce qui compte vraiment</p>
              <p style={{ color: MUTED, fontSize: 12.5, margin: 0 }}>Choisissez une conversion à mesurer — vous verrez son taux et votre allure.</p>
            </div>
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 9, marginTop: 16 }}>
            {["whatsapp", "calendly", "phone", "stripe_product", "cta_button"].map(key => {
              const cfg = GOAL_TYPES[key]
              return (
                <button key={key} type="button" onClick={() => startWith(key)}
                  style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "9px 14px", borderRadius: 10, background: PANEL, border: `1px solid ${BORDER}`, color: TEXT, fontSize: 12.5, fontWeight: 600, cursor: "pointer", transition: "border-color .15s" }}>
                  <span style={{ color: cfg.color, display: "inline-flex" }}>{cfg.icon}</span>
                  {cfg.label}
                  <Plus size={13} color={MUTED} />
                </button>
              )
            })}
            <button type="button" onClick={openNew}
              style={{ display: "inline-flex", alignItems: "center", gap: 7, padding: "9px 14px", borderRadius: 10, background: "color-mix(in srgb, var(--accent) 14%, transparent)", border: "1px solid color-mix(in srgb, var(--accent) 34%, transparent)", color: G, fontSize: 12.5, fontWeight: 700, cursor: "pointer" }}>
              Autre conversion <ArrowRight size={13} />
            </button>
          </div>
        </div>
      ) : goals.length === 0 ? null : (
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {goals.map((goal, gi) => {
            const cfg   = GOAL_TYPES[goal.goal_type] ?? GOAL_TYPES.custom
            const stats = allStats[gi] ?? { total: 0, ctr: null, progress: null, chartData: [], totalViews: 0, pace: null, paceMarker: null }
            const pageName = goal.page_id ? (pages.find(p => p.id === goal.page_id)?.title ?? "Page") : "Toutes les pages"

            return (
              <div key={goal.id} style={{ background: CARD, border: `1px solid color-mix(in srgb, ${goal.color} 22%, ${BORDER})`, borderRadius: 16, padding: 20 }}>
                <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 14, marginBottom: 16 }}>

                  {/* Identité */}
                  <div style={{ display: "flex", gap: 12, flex: 1, minWidth: 0 }}>
                    <div style={{ width: 44, height: 44, background: `color-mix(in srgb, ${goal.color} 14%, transparent)`, border: `1.5px solid color-mix(in srgb, ${goal.color} 32%, transparent)`, borderRadius: 12, display: "flex", alignItems: "center", justifyContent: "center", color: goal.color, flexShrink: 0 }}>
                      {cfg.icon}
                    </div>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 3, flexWrap: "wrap" }}>
                        <h3 style={{ color: TEXT, fontSize: 14.5, fontWeight: 700, margin: 0 }}>{goal.name}</h3>
                        {stats.pace === "ahead" && (
                          <span style={{ display: "inline-flex", alignItems: "center", gap: 4, background: "color-mix(in srgb, var(--success) 12%, transparent)", border: "1px solid color-mix(in srgb, var(--success) 30%, transparent)", borderRadius: 6, padding: "2px 8px", fontSize: 10, color: "var(--success)", fontWeight: 700 }}>
                            <TrendingUp size={11} /> En bonne voie
                          </span>
                        )}
                        {stats.pace === "behind" && (
                          <span style={{ display: "inline-flex", alignItems: "center", gap: 4, background: "color-mix(in srgb, var(--warning) 12%, transparent)", border: "1px solid color-mix(in srgb, var(--warning) 30%, transparent)", borderRadius: 6, padding: "2px 8px", fontSize: 10, color: "var(--warning)", fontWeight: 700 }}>
                            <TrendingDown size={11} /> En retard
                          </span>
                        )}
                      </div>
                      {/* Résumé en une ligne */}
                      <p style={{ color: MUTED, fontSize: 11.5, margin: 0 }}>
                        {cfg.label} · {goal.period_days} j · {pageName}
                      </p>
                    </div>
                  </div>

                  {/* Actions */}
                  <div style={{ display: "flex", alignItems: "center", gap: 4, flexShrink: 0 }}>
                    <button type="button" onClick={() => openEdit(goal)} aria-label="Modifier"
                      style={{ background: "none", border: "none", color: MUTED, cursor: "pointer", padding: 6, borderRadius: 8, display: "inline-flex" }}>
                      <Pencil size={14} />
                    </button>
                    <button type="button" onClick={() => deleteGoal(goal.id)} disabled={deleting === goal.id} aria-label={`Supprimer l'objectif ${goal.name}`}
                      style={{ background: "none", border: "none", color: MUTED, cursor: "pointer", opacity: deleting === goal.id ? 0.5 : 1, width: 40, height: 40, borderRadius: 8, display: "inline-flex", alignItems: "center", justifyContent: "center" }}>
                      {deleting === goal.id ? <Loader size={14} style={{ animation: "mo-spin 0.8s linear infinite" }} /> : <Trash2 size={14} />}
                    </button>
                  </div>
                </div>

                {/* Métriques hiérarchisées */}
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(100px, 1fr))", gap: 10, marginBottom: 16 }}>
                  {[
                    { label: "Conversions",  value: stats.total.toLocaleString(),                        color: goal.color },
                    { label: "Taux de conv.", value: stats.ctr === null ? "—" : stats.ctr + "%",         color: stats.ctr === null ? MUTED : TEXT },
                    { label: "Vues",          value: stats.totalViews.toLocaleString(),                   color: MUTED },
                    ...(goal.target_count ? [{ label: "Objectif", value: goal.target_count.toLocaleString(), color: MUTED }] : []),
                  ].map((m, i) => (
                    <div key={i} style={{ background: PANEL, border: `1px solid ${HAIR}`, borderRadius: 10, padding: "10px 12px" }}>
                      <p style={{ color: MUTED, fontSize: 10, textTransform: "uppercase", letterSpacing: 1, margin: "0 0 4px" }}>{m.label}</p>
                      <p style={{ color: m.color, fontSize: 18, fontWeight: 800, margin: 0 }}>{m.value}</p>
                    </div>
                  ))}
                </div>

                {/* Barre de progression + repère d'allure */}
                {stats.progress !== null && (
                  <div style={{ marginBottom: 16 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                      <span style={{ color: MUTED, fontSize: 11 }}>Progression vers l'objectif</span>
                      <span style={{ color: goal.color, fontSize: 11, fontWeight: 700 }}>{stats.progress}%</span>
                    </div>
                    <div style={{ position: "relative", height: 9, background: "rgba(255,255,255,0.06)", borderRadius: 5, overflow: "visible" }}>
                      <div style={{ height: "100%", width: stats.progress + "%", background: `linear-gradient(90deg, ${goal.color}, color-mix(in srgb, ${goal.color} 70%, #000))`, borderRadius: 5, transition: "width 0.8s ease" }} />
                      {/* Repère « où vous devriez être aujourd'hui » selon le temps écoulé */}
                      {stats.paceMarker !== null && stats.paceMarker > 0 && stats.paceMarker < 100 && (
                        <div title="Où vous devriez être aujourd'hui" style={{ position: "absolute", left: `${stats.paceMarker}%`, top: -3, bottom: -3, width: 2, background: "rgba(245,240,232,0.6)", transform: "translateX(-1px)", borderRadius: 2 }} />
                      )}
                    </div>
                    {stats.paceMarker !== null && stats.paceMarker > 0 && stats.paceMarker < 100 && (
                      <p style={{ color: MUTED, fontSize: 10, margin: "5px 0 0" }}>Le repère clair indique le rythme attendu à ce stade de la période.</p>
                    )}
                  </div>
                )}

                {/* Mini graphique tendance */}
                {stats.chartData.length > 0 && stats.total > 0 && (
                  <div style={{ height: 80 }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={stats.chartData} margin={{ top: 4, right: 0, bottom: 0, left: -40 }}>
                        <defs>
                          <linearGradient id={`grad-${goal.id}`} x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%"  stopColor={goal.color} stopOpacity={0.3} />
                            <stop offset="95%" stopColor={goal.color} stopOpacity={0}   />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" vertical={false} />
                        <XAxis dataKey="date" tick={{ fill: MUTED, fontSize: 9 }} axisLine={false} tickLine={false} interval={Math.floor(stats.chartData.length / 4)} />
                        <YAxis tick={{ fill: MUTED, fontSize: 9 }} axisLine={false} tickLine={false} allowDecimals={false} />
                        <Tooltip content={<MiniTip />} />
                        <Area type="monotone" dataKey="count" stroke={goal.color} strokeWidth={2} fill={`url(#grad-${goal.id})`} />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
