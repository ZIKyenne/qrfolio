"use client"

import { useState, useEffect, useMemo } from "react"
import {
  Target, Plus, Trash2, TrendingUp, CheckCircle,
  MessageCircle, Calendar, Phone, Mail, ShoppingBag,
  MousePointerClick, Zap, ArrowRight, Loader, X
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
  label: string; emoji: string; color: string
  icon: React.ReactNode; matchHint: string; autoMatch: string
}> = {
  whatsapp:       { label: "Clic WhatsApp",   emoji: "💬", color: "#25D366", icon: <MessageCircle size={14} />, matchHint: "wa.me/ ou whatsapp.com", autoMatch: "wa.me" },
  calendly:       { label: "Réservation",      emoji: "📅", color: "#818CF8", icon: <Calendar size={14} />,     matchHint: "calendly.com",            autoMatch: "calendly.com" },
  phone:          { label: "Appel téléphone",  emoji: "📞", color: "#4ADE80", icon: <Phone size={14} />,        matchHint: "tel:",                    autoMatch: "tel:" },
  email:          { label: "Clic Email",       emoji: "📧", color: "#A78BFA", icon: <Mail size={14} />,         matchHint: "mailto:",                 autoMatch: "mailto:" },
  stripe_product: { label: "Achat produit",    emoji: "🛍️", color: "var(--success)", icon: <ShoppingBag size={14} />, matchHint: "stripe.com ou buy.",      autoMatch: "stripe.com" },
  cta_button:     { label: "Bouton CTA",       emoji: "🔘", color: "var(--accent)", icon: <MousePointerClick size={14} />, matchHint: "URL ou laisser vide", autoMatch: "" },
  contact_form:   { label: "Formulaire contact",emoji: "📬", color: "var(--action)", icon: <Mail size={14} />,        matchHint: "contact",                 autoMatch: "contact" },
  custom:         { label: "Personnalisé",     emoji: "⚡", color: "var(--danger)", icon: <Zap size={14} />,          matchHint: "URL ou mot-clé",          autoMatch: "" },
}

const PERIODS = [{ v: 7, l: "7j" }, { v: 30, l: "30j" }, { v: 90, l: "90j" }]

const G     = "var(--accent)"
const MUTED = "#A8A190"
const BG    = "#0F0E0B"

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
  const totalViews = periodViews.length || 1
  const ctr       = parseFloat(((total / totalViews) * 100).toFixed(1))
  const progress  = goal.target_count ? Math.min(Math.round((total / goal.target_count) * 100), 100) : null

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

  return { total, ctr, progress, chartData, totalViews }
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

// ── Composant principal ───────────────────────────────────────────────────────
export default function GoalsDashboard({ clicks, pageViews, pages }: Props) {
  const [goals,      setGoals]      = useState<Goal[]>([])
  const [loading,    setLoading]    = useState(true)
  const [showForm,   setShowForm]   = useState(false)
  const [deleting,   setDeleting]   = useState<string | null>(null)
  const [saving,     setSaving]     = useState(false)

  // Formulaire
  const [fName,        setFName]        = useState("")
  const [fDesc,        setFDesc]        = useState("")
  const [fType,        setFType]        = useState("whatsapp")
  const [fMatch,       setFMatch]       = useState("")
  const [fTarget,      setFTarget]      = useState("")
  const [fPeriod,      setFPeriod]      = useState(30)
  const [fColor,       setFColor]       = useState("var(--accent)")
  const [fPageId,      setFPageId]      = useState("all")

  useEffect(() => {
    fetch("/api/goals")
      .then(r => r.json())
      .then(d => { setGoals(d.goals ?? []); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  async function saveGoal() {
    if (!fName || !fType) return
    setSaving(true)
    const res = await fetch("/api/goals", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: fName, description: fDesc, goal_type: fType,
        target_match: fMatch || GOAL_TYPES[fType]?.autoMatch || null,
        target_count: fTarget ? parseInt(fTarget) : null,
        period_days: fPeriod, color: fColor,
        page_id: fPageId === "all" ? null : fPageId,
      }),
    })
    const d = await res.json()
    if (d.goal) {
      setGoals(prev => [d.goal, ...prev])
      setShowForm(false)
      setFName(""); setFDesc(""); setFType("whatsapp"); setFMatch("")
      setFTarget(""); setFPeriod(30); setFColor("var(--accent)"); setFPageId("all")
    }
    setSaving(false)
  }

  async function deleteGoal(id: string) {
    setDeleting(id)
    await fetch("/api/goals", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    })
    setGoals(prev => prev.filter(g => g.id !== id))
    setDeleting(null)
  }

  // KPIs globaux
  const allStats = useMemo(() =>
    goals.map(g => calcConversions(g, clicks, pageViews)),
    [goals, clicks, pageViews]
  )

  const totalConv  = allStats.reduce((a, s) => a + s.total, 0)
  const bestGoal   = goals[allStats.indexOf(allStats.reduce((a, b) => b.total > a.total ? b : a, allStats[0] ?? { total: -1, ctr: 0, progress: 0, chartData: [], totalViews: 0 }) )]
  const goalsOnTrack = allStats.filter(s => s.progress !== null && s.progress >= 70).length

  return (
    <div style={{ fontFamily: "DM Sans, sans-serif", color: "#F5F0E8" }}>

      {/* Header */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 28, gap: 16, flexWrap: "wrap" }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
            <Target size={22} color={G} />
            <h1 style={{ fontSize: 22, fontWeight: 700, margin: 0 }}>Objectifs de conversion</h1>
          </div>
          <p style={{ color: MUTED, fontSize: 13, margin: 0 }}>
            Suivez vos conversions clés : WhatsApp, réservations, appels, achats…
          </p>
        </div>
        <button type="button" onClick={() => setShowForm(true)}
          style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 20px", background: "linear-gradient(90deg,var(--accent),color-mix(in srgb, var(--accent) 75%, #000))", border: "none", borderRadius: 11, color: "#080808", fontSize: 13, fontWeight: 700, cursor: "pointer" }}>
          <Plus size={15} /> Nouvel objectif
        </button>
      </div>

      {/* KPIs globaux */}
      {goals.length > 0 && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 12, marginBottom: 28 }}>
          {[
            { icon: <TrendingUp size={14} color={G} />,        label: "Conversions totales", value: totalConv.toLocaleString() },
            { icon: <Target size={14} color="#818CF8" />,      label: "Objectifs actifs",   value: String(goals.length) },
            { icon: <CheckCircle size={14} color="var(--success)" />, label: "En bonne voie",      value: String(goalsOnTrack) },
            { icon: <Zap size={14} color="var(--danger)" />,         label: "Meilleur objectif",  value: bestGoal?.name ?? "—" },
          ].map((k, i) => (
            <div key={i} style={{ background: BG, border: "1px solid color-mix(in srgb, var(--accent) 10%, transparent)", borderRadius: 12, padding: "14px 16px", display: "flex", alignItems: "center", gap: 10 }}>
              {k.icon}
              <div style={{ minWidth: 0 }}>
                <p style={{ color: MUTED, fontSize: 10, textTransform: "uppercase", letterSpacing: 1, margin: "0 0 3px" }}>{k.label}</p>
                <p style={{ color: "#F5F0E8", fontSize: 15, fontWeight: 800, margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{k.value}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Formulaire création */}
      {showForm && (
        <div style={{ background: BG, border: "1px solid color-mix(in srgb, var(--accent) 20%, transparent)", borderRadius: 16, padding: 24, marginBottom: 28 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
            <h3 style={{ fontSize: 14, fontWeight: 700, margin: 0, display: "flex", alignItems: "center", gap: 8 }}>
              <Plus size={15} color={G} /> Créer un objectif
            </h3>
            <button type="button" onClick={() => setShowForm(false)}
              style={{ background: "none", border: "none", color: MUTED, cursor: "pointer", display: "flex", alignItems: "center" }}>
              <X size={16} />
            </button>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
            {/* Nom */}
            <div style={{ gridColumn: "1 / -1" }}>
              <label style={{ color: MUTED, fontSize: 11, fontWeight: 600, display: "block", marginBottom: 6 }}>Nom de l'objectif *</label>
              <input value={fName} onChange={e => setFName(e.target.value)} placeholder="ex: Clics WhatsApp juillet"
                style={{ width: "100%", background: "#111009", border: "1px solid color-mix(in srgb, var(--accent) 20%, transparent)", borderRadius: 9, color: "#F5F0E8", padding: "9px 12px", fontSize: 13, outline: "none", boxSizing: "border-box" }} />
            </div>

            {/* Type d'objectif */}
            <div>
              <label style={{ color: MUTED, fontSize: 11, fontWeight: 600, display: "block", marginBottom: 6 }}>Type de conversion *</label>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
                {Object.entries(GOAL_TYPES).map(([key, cfg]) => (
                  <button key={key} type="button" onClick={() => { setFType(key); setFMatch(cfg.autoMatch) }}
                    style={{ display: "flex", alignItems: "center", gap: 7, padding: "8px 10px", background: fType === key ? `${cfg.color}15` : "rgba(255,255,255,0.02)", border: fType === key ? `1px solid ${cfg.color}40` : "1px solid rgba(255,255,255,0.07)", borderRadius: 8, color: fType === key ? cfg.color : MUTED, fontSize: 11, fontWeight: fType === key ? 700 : 500, cursor: "pointer", textAlign: "left" }}>
                    <span style={{ fontSize: 14 }}>{cfg.emoji}</span>
                    {cfg.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Droite: options */}
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <div>
                <label style={{ color: MUTED, fontSize: 11, fontWeight: 600, display: "block", marginBottom: 6 }}>Cible URL (optionnel)</label>
                <input value={fMatch} onChange={e => setFMatch(e.target.value)}
                  placeholder={GOAL_TYPES[fType]?.matchHint ?? "mot-clé ou URL"}
                  style={{ width: "100%", background: "#111009", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 9, color: "#F5F0E8", padding: "9px 12px", fontSize: 12, outline: "none", boxSizing: "border-box" }} />
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                <div>
                  <label style={{ color: MUTED, fontSize: 11, fontWeight: 600, display: "block", marginBottom: 6 }}>Objectif cible</label>
                  <input value={fTarget} onChange={e => setFTarget(e.target.value)} type="number" min="1" placeholder="ex: 100"
                    style={{ width: "100%", background: "#111009", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 9, color: "#F5F0E8", padding: "9px 12px", fontSize: 12, outline: "none", boxSizing: "border-box" }} />
                </div>
                <div>
                  <label style={{ color: MUTED, fontSize: 11, fontWeight: 600, display: "block", marginBottom: 6 }}>Période</label>
                  <select value={fPeriod} onChange={e => setFPeriod(parseInt(e.target.value))}
                    style={{ width: "100%", background: "#111009", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 9, color: "#F5F0E8", padding: "9px 12px", fontSize: 12, outline: "none", cursor: "pointer" }}>
                    {PERIODS.map(p => <option key={p.v} value={p.v}>{p.l}</option>)}
                  </select>
                </div>
              </div>

              <div>
                <label style={{ color: MUTED, fontSize: 11, fontWeight: 600, display: "block", marginBottom: 6 }}>Page (optionnel)</label>
                <select value={fPageId} onChange={e => setFPageId(e.target.value)}
                  style={{ width: "100%", background: "#111009", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 9, color: "#F5F0E8", padding: "9px 12px", fontSize: 12, outline: "none", cursor: "pointer" }}>
                  <option value="all">Toutes les pages</option>
                  {pages.map(p => <option key={p.id} value={p.id}>{p.title}</option>)}
                </select>
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <label style={{ color: MUTED, fontSize: 11, fontWeight: 600 }}>Couleur</label>
                <input type="color" value={fColor} onChange={e => setFColor(e.target.value)}
                  style={{ width: 36, height: 28, border: "1px solid rgba(255,255,255,0.1)", borderRadius: 6, background: "none", cursor: "pointer" }} />
                <div style={{ display: "flex", gap: 5 }}>
                  {["var(--accent)","var(--success)","#818CF8","var(--danger)","var(--action)","#25D366"].map(c => (
                    <button key={c} type="button" onClick={() => setFColor(c)}
                      style={{ width: 18, height: 18, borderRadius: "50%", background: c, border: fColor === c ? "2px solid white" : "2px solid transparent", cursor: "pointer" }} />
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div style={{ display: "flex", gap: 10, marginTop: 20, justifyContent: "flex-end" }}>
            <button type="button" onClick={() => setShowForm(false)}
              style={{ padding: "9px 18px", background: "transparent", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 9, color: MUTED, fontSize: 12, cursor: "pointer" }}>
              Annuler
            </button>
            <button type="button" onClick={saveGoal} disabled={!fName || saving}
              style={{ display: "flex", alignItems: "center", gap: 8, padding: "9px 20px", background: fName ? "linear-gradient(90deg,var(--accent),color-mix(in srgb, var(--accent) 75%, #000))" : "rgba(255,255,255,0.05)", border: "none", borderRadius: 9, color: fName ? "#080808" : MUTED, fontSize: 13, fontWeight: 700, cursor: fName ? "pointer" : "not-allowed", opacity: saving ? 0.7 : 1 }}>
              {saving ? <><Loader size={13} style={{ animation: "mo-spin 0.8s linear infinite" }} /> Création...</> : <><CheckCircle size={13} /> Créer l'objectif</>}
            </button>
          </div>
        </div>
      )}

      {/* Liste des objectifs */}
      {loading ? (
        <div style={{ textAlign: "center", padding: "60px 20px", color: MUTED }}>
          <Loader size={24} color={MUTED} style={{ animation: "mo-spin 0.8s linear infinite" }} />
        </div>
      ) : goals.length === 0 ? (
        <div style={{ textAlign: "center", padding: "60px 20px", background: BG, border: "1px dashed rgba(255,255,255,0.1)", borderRadius: 16 }}>
          <Target size={40} color={MUTED} style={{ marginBottom: 14 }} />
          <p style={{ color: "#F5F0E8", fontSize: 15, fontWeight: 600, margin: "0 0 6px" }}>Aucun objectif défini</p>
          <p style={{ color: MUTED, fontSize: 12, margin: "0 0 20px" }}>Créez votre premier objectif pour suivre vos conversions</p>
          <button type="button" onClick={() => setShowForm(true)}
            style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "10px 20px", background: "linear-gradient(90deg,var(--accent),color-mix(in srgb, var(--accent) 75%, #000))", border: "none", borderRadius: 10, color: "#080808", fontSize: 13, fontWeight: 700, cursor: "pointer" }}>
            <Plus size={14} /> Créer un objectif
          </button>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {goals.map((goal, gi) => {
            const cfg   = GOAL_TYPES[goal.goal_type] ?? GOAL_TYPES.custom
            const stats = allStats[gi] ?? { total: 0, ctr: 0, progress: null, chartData: [], totalViews: 0 }
            const onTrack = stats.progress !== null && stats.progress >= 70

            return (
              <div key={goal.id} style={{ background: BG, border: `1px solid ${goal.color}20`, borderRadius: 16, padding: 22, transition: "border-color 0.2s" }}>
                <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 16, marginBottom: 18 }}>

                  {/* Identité */}
                  <div style={{ display: "flex", gap: 12, flex: 1, minWidth: 0 }}>
                    <div style={{ width: 44, height: 44, background: `${goal.color}15`, border: `1.5px solid ${goal.color}30`, borderRadius: 12, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22, flexShrink: 0 }}>
                      {cfg.emoji}
                    </div>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 3, flexWrap: "wrap" }}>
                        <h3 style={{ color: "#F5F0E8", fontSize: 14, fontWeight: 700, margin: 0 }}>{goal.name}</h3>
                        <span style={{ background: `${goal.color}15`, border: `1px solid ${goal.color}30`, borderRadius: 6, padding: "2px 8px", fontSize: 10, color: goal.color, fontWeight: 600 }}>{cfg.label}</span>
                        {onTrack && <span style={{ background: "rgba(57,255,143,0.1)", borderRadius: 6, padding: "2px 8px", fontSize: 10, color: "var(--success)", fontWeight: 600 }}>✓ En bonne voie</span>}
                      </div>
                      {goal.description && <p style={{ color: MUTED, fontSize: 11, margin: "0 0 2px" }}>{goal.description}</p>}
                      <p style={{ color: MUTED, fontSize: 10, margin: 0 }}>
                        {goal.period_days}j · {goal.page_id ? (pages.find(p => p.id === goal.page_id)?.title ?? "Page") : "Toutes les pages"}
                      </p>
                    </div>
                  </div>

                  <button type="button" onClick={() => deleteGoal(goal.id)} disabled={deleting === goal.id}
                    style={{ background: "none", border: "none", color: MUTED, cursor: "pointer", opacity: deleting === goal.id ? 0.5 : 1, flexShrink: 0, padding: 4 }}>
                    {deleting === goal.id ? <Loader size={14} style={{ animation: "mo-spin 0.8s linear infinite" }} /> : <Trash2 size={14} />}
                  </button>
                </div>

                {/* Métriques */}
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(100px, 1fr))", gap: 12, marginBottom: 18 }}>
                  {[
                    { label: "Conversions", value: stats.total.toLocaleString(), color: goal.color },
                    { label: "Taux de conv.", value: stats.ctr + "%", color: "#F5F0E8" },
                    { label: "Vues",          value: stats.totalViews.toLocaleString(), color: MUTED },
                    ...(goal.target_count ? [{ label: "Objectif", value: goal.target_count.toLocaleString(), color: MUTED }] : []),
                  ].map((m, i) => (
                    <div key={i} style={{ background: "rgba(255,255,255,0.02)", borderRadius: 9, padding: "10px 12px" }}>
                      <p style={{ color: MUTED, fontSize: 10, textTransform: "uppercase", letterSpacing: 1, margin: "0 0 4px" }}>{m.label}</p>
                      <p style={{ color: m.color, fontSize: 18, fontWeight: 800, margin: 0 }}>{m.value}</p>
                    </div>
                  ))}
                </div>

                {/* Barre de progression */}
                {stats.progress !== null && (
                  <div style={{ marginBottom: 18 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                      <span style={{ color: MUTED, fontSize: 11 }}>Progression vers l'objectif</span>
                      <span style={{ color: goal.color, fontSize: 11, fontWeight: 700 }}>{stats.progress}%</span>
                    </div>
                    <div style={{ height: 8, background: "rgba(255,255,255,0.06)", borderRadius: 4, overflow: "hidden" }}>
                      <div style={{ height: "100%", width: stats.progress + "%", background: `linear-gradient(90deg, ${goal.color}, ${goal.color}cc)`, borderRadius: 4, transition: "width 0.8s ease" }} />
                    </div>
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

      <style>{``}</style>
    </div>
  )
}
