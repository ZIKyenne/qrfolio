"use client"

import { useState, useEffect } from "react"
import {
  ArrowRight, Plus, Trash2, Pencil, ToggleLeft,
  ToggleRight, Loader, AlertCircle, CheckCircle,
  ExternalLink, MousePointerClick, X, Info
} from "lucide-react"

// ── Types ─────────────────────────────────────────────────────────────────────
type Redirect = {
  id:            string
  from_domain:   string
  from_path:     string
  to_url:        string
  redirect_type: 301 | 302
  label:         string | null
  enabled:       boolean
  hit_count:     number
  last_hit_at:   string | null
  created_at:    string
}

interface Props {
  userDomains: string[]
}

const G     = "var(--accent)"
const MUTED = "#A8A190"

const TYPE_CFG = {
  301: { color: "var(--success)", bg: "rgba(57,255,143,0.1)",  border: "rgba(57,255,143,0.25)",  label: "301 Permanent",  desc: "SEO transféré vers la destination" },
  302: { color: "var(--action)", bg: "rgba(56,189,248,0.1)",  border: "rgba(56,189,248,0.25)",  label: "302 Temporaire", desc: "Le SEO reste sur la source" },
}

export default function RedirectsPanel({ userDomains }: Props) {
  const [redirects, setRedirects] = useState<Redirect[]>([])
  const [loading,   setLoading]   = useState(true)
  const [showForm,  setShowForm]  = useState(false)
  const [editId,    setEditId]    = useState<string | null>(null)
  const [saving,    setSaving]    = useState(false)
  const [deleting,  setDeleting]  = useState<string | null>(null)
  const [toggling,  setToggling]  = useState<string | null>(null)
  const [error,     setError]     = useState("")

  const [fDomain,   setFDomain]   = useState(userDomains[0] ?? "")
  const [fPath,     setFPath]     = useState("/")
  const [fTo,       setFTo]       = useState("")
  const [fType,     setFType]     = useState<301|302>(301)
  const [fLabel,    setFLabel]    = useState("")

  useEffect(() => {
    fetch("/api/redirects")
      .then(r => r.json())
      .then(d => { setRedirects(d.redirects ?? []); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  function openEdit(r: Redirect) {
    setEditId(r.id)
    setFDomain(r.from_domain)
    setFPath(r.from_path)
    setFTo(r.to_url)
    setFType(r.redirect_type)
    setFLabel(r.label ?? "")
    setShowForm(true)
  }

  function resetForm() {
    setEditId(null)
    setFDomain(userDomains[0] ?? "")
    setFPath("/")
    setFTo("")
    setFType(301)
    setFLabel("")
    setError("")
    setShowForm(false)
  }

  async function save() {
    if (!fDomain || !fTo) return
    setSaving(true); setError("")
    const method = editId ? "PATCH" : "POST"
    const body   = editId
      ? { id: editId, to_url: fTo, redirect_type: fType, label: fLabel }
      : { from_domain: fDomain, from_path: fPath, to_url: fTo, redirect_type: fType, label: fLabel }

    const res = await fetch("/api/redirects", {
      method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
    })
    const d = await res.json()
    if (d.error) { setError(d.error); setSaving(false); return }
    if (editId) {
      setRedirects(prev => prev.map(r => r.id === editId ? d.redirect : r))
    } else {
      setRedirects(prev => [d.redirect, ...prev])
    }
    resetForm()
    setSaving(false)
  }

  async function toggle(r: Redirect) {
    setToggling(r.id)
    const res = await fetch("/api/redirects", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: r.id, enabled: !r.enabled }),
    })
    const d = await res.json()
    if (d.redirect) setRedirects(prev => prev.map(x => x.id === r.id ? d.redirect : x))
    setToggling(null)
  }

  async function del(id: string) {
    setDeleting(id)
    await fetch("/api/redirects", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    })
    setRedirects(prev => prev.filter(r => r.id !== id))
    setDeleting(null)
  }

  function formatDate(iso: string) {
    return new Date(iso).toLocaleDateString("fr-FR", { day:"numeric", month:"short" })
  }

  const active   = redirects.filter(r => r.enabled).length
  const inactive = redirects.filter(r => !r.enabled).length

  return (
    <div style={{ minHeight:"100vh", background:"#080808", padding:"32px 24px 80px", fontFamily:"DM Sans, sans-serif" }}>
      <div style={{ maxWidth:860, margin:"0 auto" }}>

        {/* Header */}
        <div style={{ display:"flex", alignItems:"flex-start", justifyContent:"space-between", marginBottom:28, gap:16, flexWrap:"wrap" }}>
          <div>
            <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:6 }}>
              <ArrowRight size={22} color={G}/>
              <h1 style={{ fontSize:22, fontWeight:700, color:"#F5F0E8", margin:0 }}>Redirections</h1>
            </div>
            <p style={{ color:MUTED, fontSize:13, margin:0 }}>
              Redirigez des domaines ou chemins vers de nouvelles destinations
            </p>
          </div>
          <button type="button" onClick={() => setShowForm(true)}
            style={{ display:"flex", alignItems:"center", gap:8, padding:"10px 20px", background:"linear-gradient(90deg,var(--accent),color-mix(in srgb, var(--accent) 75%, #000))", border:"none", borderRadius:11, color:"#080808", fontSize:13, fontWeight:700, cursor:"pointer" }}>
            <Plus size={15}/> Ajouter une redirection
          </button>
        </div>

        {/* KPIs */}
        {redirects.length > 0 && (
          <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(140px,1fr))", gap:12, marginBottom:24 }}>
            {[
              { icon:<ArrowRight size={14} color={G}/>,            label:"Total",    value:redirects.length },
              { icon:<CheckCircle size={14} style={{ color:"var(--success)" }}/>,     label:"Actives",  value:active },
              { icon:<ToggleLeft size={14} color={MUTED}/>,        label:"Inactives",value:inactive },
              { icon:<MousePointerClick size={14} color="#818CF8"/>,label:"Clics total",value:redirects.reduce((a,r)=>a+r.hit_count,0).toLocaleString() },
            ].map((k,i) => (
              <div key={i} style={{ background:"#0F0E0B", border:"1px solid color-mix(in srgb, var(--accent) 10%, transparent)", borderRadius:11, padding:"12px 14px", display:"flex", alignItems:"center", gap:9 }}>
                {k.icon}
                <div>
                  <p style={{ color:MUTED, fontSize:10, textTransform:"uppercase", letterSpacing:1, margin:"0 0 2px" }}>{k.label}</p>
                  <p style={{ color:"#F5F0E8", fontSize:16, fontWeight:800, margin:0 }}>{k.value}</p>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Formulaire */}
        {showForm && (
          <div style={{ background:"#0F0E0B", border:"1px solid color-mix(in srgb, var(--accent) 20%, transparent)", borderRadius:14, padding:22, marginBottom:24 }}>
            <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:18 }}>
              <p style={{ color:"#F5F0E8", fontSize:14, fontWeight:700, margin:0 }}>
                {editId ? "✏️ Modifier la redirection" : "➕ Nouvelle redirection"}
              </p>
              <button type="button" onClick={resetForm}
                style={{ background:"none", border:"none", color:MUTED, cursor:"pointer" }}>
                <X size={16}/>
              </button>
            </div>

            {/* Type 301/302 */}
            <div style={{ marginBottom:16 }}>
              <label style={{ color:MUTED, fontSize:11, fontWeight:600, display:"block", marginBottom:8 }}>Type de redirection</label>
              <div style={{ display:"flex", gap:10 }}>
                {([301, 302] as const).map(t => {
                  const cfg = TYPE_CFG[t]
                  const sel = fType === t
                  return (
                    <button key={t} type="button" onClick={() => setFType(t)}
                      style={{ flex:1, padding:"12px 14px", background: sel ? cfg.bg : "rgba(255,255,255,0.02)", border: sel ? `1px solid ${cfg.border}` : "1px solid rgba(255,255,255,0.07)", borderRadius:10, cursor:"pointer", textAlign:"left" as const, transition:"all 0.15s" }}>
                      <p style={{ color: sel ? cfg.color : "#F5F0E8", fontSize:13, fontWeight:700, margin:"0 0 3px" }}>{cfg.label}</p>
                      <p style={{ color:MUTED, fontSize:11, margin:0 }}>{cfg.desc}</p>
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Source */}
            {!editId && (
              <div style={{ marginBottom:14 }}>
                <label style={{ color:MUTED, fontSize:11, fontWeight:600, display:"block", marginBottom:7 }}>Source</label>
                <div style={{ display:"flex", gap:8, alignItems:"center" }}>
                  <select value={fDomain} onChange={e => setFDomain(e.target.value)}
                    style={{ flex:2, background:"#111009", border:"1px solid rgba(255,255,255,0.1)", borderRadius:9, color:"#F5F0E8", padding:"9px 12px", fontSize:12, outline:"none", cursor:"pointer" }}>
                    {userDomains.map(d => <option key={d} value={d}>{d}</option>)}
                    <option value="qrowg.com">qrowg.com (sous-domaine)</option>
                  </select>
                  <input value={fPath} onChange={e => setFPath(e.target.value.startsWith("/") ? e.target.value : "/" + e.target.value)}
                    placeholder="/chemin"
                    style={{ flex:1, background:"#111009", border:"1px solid rgba(255,255,255,0.1)", borderRadius:9, color:"#F5F0E8", padding:"9px 12px", fontSize:12, outline:"none" }}/>
                </div>
                <p style={{ color:MUTED, fontSize:10, margin:"5px 0 0" }}>
                  → URL source : <code style={{ color:G }}>{fDomain}{fPath}</code>
                </p>
              </div>
            )}

            {/* Destination */}
            <div style={{ marginBottom:14 }}>
              <label style={{ color:MUTED, fontSize:11, fontWeight:600, display:"block", marginBottom:7 }}>Destination</label>
              <input value={fTo} onChange={e => setFTo(e.target.value)}
                placeholder="https://nouveau-site.fr ou /nouvelle-page"
                style={{ width:"100%", background:"#111009", border:`1px solid ${fTo ? "color-mix(in srgb, var(--accent) 30%, transparent)" : "rgba(255,255,255,0.1)"}`, borderRadius:9, color:"#F5F0E8", padding:"9px 12px", fontSize:12, outline:"none", boxSizing:"border-box" as const, transition:"border-color 0.15s" }}/>
              {fTo && (
                <p style={{ color:MUTED, fontSize:10, margin:"5px 0 0" }}>
                  ↳ <code style={{ color:"var(--success)" }}>{fTo}</code>
                </p>
              )}
            </div>

            {/* Label */}
            <div style={{ marginBottom:16 }}>
              <label style={{ color:MUTED, fontSize:11, fontWeight:600, display:"block", marginBottom:7 }}>Note interne (optionnel)</label>
              <input value={fLabel} onChange={e => setFLabel(e.target.value)}
                placeholder="ex: Ancien site migré vers nouveau domaine"
                style={{ width:"100%", background:"#111009", border:"1px solid rgba(255,255,255,0.07)", borderRadius:9, color:"#F5F0E8", padding:"9px 12px", fontSize:12, outline:"none", boxSizing:"border-box" as const }}/>
            </div>

            {error && (
              <div style={{ display:"flex", alignItems:"center", gap:7, padding:"9px 12px", background:"rgba(255,107,107,0.08)", border:"1px solid rgba(255,107,107,0.2)", borderRadius:8, marginBottom:14 }}>
                <AlertCircle size={13} style={{ color:"var(--danger)" }}/>
                <span style={{ color:"var(--danger)", fontSize:12 }}>{error}</span>
              </div>
            )}

            <div style={{ display:"flex", gap:8, justifyContent:"flex-end" }}>
              <button type="button" onClick={resetForm}
                style={{ padding:"9px 18px", background:"transparent", border:"1px solid rgba(255,255,255,0.1)", borderRadius:9, color:MUTED, fontSize:12, cursor:"pointer" }}>
                Annuler
              </button>
              <button type="button" onClick={save} disabled={!fTo || saving}
                style={{ display:"flex", alignItems:"center", gap:7, padding:"9px 20px", background:fTo?"linear-gradient(90deg,var(--accent),color-mix(in srgb, var(--accent) 75%, #000))":"rgba(255,255,255,0.05)", border:"none", borderRadius:9, color:fTo?"#080808":MUTED, fontSize:13, fontWeight:700, cursor:fTo&&!saving?"pointer":"not-allowed", opacity:saving?0.7:1 }}>
                {saving ? <><Loader size={13} style={{ animation:"spin 0.8s linear infinite" }}/> Enregistrement…</> : <><CheckCircle size={13}/> {editId ? "Modifier" : "Créer la redirection"}</>}
              </button>
            </div>
          </div>
        )}

        {/* Liste */}
        {loading ? (
          <div style={{ textAlign:"center", padding:"60px", color:MUTED }}>
            <Loader size={22} color={MUTED} style={{ animation:"spin 0.8s linear infinite" }}/>
          </div>
        ) : redirects.length === 0 ? (
          <div style={{ textAlign:"center", padding:"56px 20px", background:"#0F0E0B", border:"1px dashed rgba(255,255,255,0.1)", borderRadius:14 }}>
            <ArrowRight size={36} color={MUTED} style={{ marginBottom:14 }}/>
            <p style={{ color:"#F5F0E8", fontSize:14, fontWeight:600, margin:"0 0 6px" }}>Aucune redirection</p>
            <p style={{ color:MUTED, fontSize:12, margin:"0 0 20px", lineHeight:1.6 }}>
              Redirigez ancien-site.fr → nouveau-site.fr<br/>ou /page-a → /page-b
            </p>
            <button type="button" onClick={() => setShowForm(true)}
              style={{ display:"inline-flex", alignItems:"center", gap:8, padding:"10px 20px", background:"linear-gradient(90deg,var(--accent),color-mix(in srgb, var(--accent) 75%, #000))", border:"none", borderRadius:10, color:"#080808", fontSize:13, fontWeight:700, cursor:"pointer" }}>
              <Plus size={14}/> Créer une redirection
            </button>
          </div>
        ) : (
          <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
            {redirects.map(r => {
              const typeCfg = TYPE_CFG[r.redirect_type]
              return (
                <div key={r.id} style={{ background:"#0F0E0B", border:`1px solid ${r.enabled ? "rgba(255,255,255,0.08)" : "rgba(255,255,255,0.04)"}`, borderRadius:12, padding:"14px 16px", opacity:r.enabled ? 1 : 0.55, transition:"all 0.2s" }}>
                  <div style={{ display:"flex", alignItems:"center", gap:12, flexWrap:"wrap" }}>

                    {/* Badge type */}
                    <span style={{ flexShrink:0, padding:"3px 9px", background:typeCfg.bg, border:`1px solid ${typeCfg.border}`, borderRadius:7, color:typeCfg.color, fontSize:11, fontWeight:700 }}>
                      {r.redirect_type}
                    </span>

                    {/* Source → Destination */}
                    <div style={{ flex:1, minWidth:0, display:"flex", alignItems:"center", gap:8, flexWrap:"wrap" }}>
                      <code style={{ color:"#F5F0E8", fontSize:12, fontWeight:600, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap", maxWidth:220 }}>
                        {r.from_domain}{r.from_path !== "/" ? r.from_path : ""}
                      </code>
                      <ArrowRight size={13} color={MUTED}/>
                      <code style={{ color:G, fontSize:12, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap", maxWidth:220 }}>
                        {r.to_url}
                      </code>
                    </div>

                    {/* Stats */}
                    <div style={{ display:"flex", alignItems:"center", gap:5, flexShrink:0 }}>
                      <MousePointerClick size={11} color={MUTED}/>
                      <span style={{ color:MUTED, fontSize:11 }}>{r.hit_count}</span>
                    </div>

                    {/* Actions */}
                    <div style={{ display:"flex", gap:5, flexShrink:0 }}>
                      <button type="button" onClick={() => toggle(r)} disabled={toggling === r.id}
                        style={{ width:28, height:28, background:"rgba(255,255,255,0.04)", border:"1px solid rgba(255,255,255,0.08)", borderRadius:8, display:"flex", alignItems:"center", justifyContent:"center", cursor:toggling===r.id?"wait":"pointer", color:r.enabled?"var(--success)":MUTED }}>
                        {toggling === r.id ? <Loader size={12} style={{ animation:"spin 0.8s linear infinite" }}/> : r.enabled ? <ToggleRight size={13}/> : <ToggleLeft size={13}/>}
                      </button>
                      <button type="button" onClick={() => openEdit(r)}
                        style={{ width:28, height:28, background:"color-mix(in srgb, var(--accent) 8%, transparent)", border:"1px solid color-mix(in srgb, var(--accent) 15%, transparent)", borderRadius:8, display:"flex", alignItems:"center", justifyContent:"center", cursor:"pointer", color:G }}>
                        <Pencil size={12}/>
                      </button>
                      <a href={`https://${r.from_domain}${r.from_path}`} target="_blank" rel="noopener noreferrer"
                        style={{ width:28, height:28, background:"rgba(255,255,255,0.04)", border:"1px solid rgba(255,255,255,0.08)", borderRadius:8, display:"flex", alignItems:"center", justifyContent:"center", color:MUTED, textDecoration:"none" }}>
                        <ExternalLink size={12}/>
                      </a>
                      <button type="button" onClick={() => del(r.id)} disabled={deleting === r.id}
                        style={{ width:28, height:28, background:"rgba(255,100,100,0.08)", border:"1px solid rgba(255,100,100,0.15)", borderRadius:8, display:"flex", alignItems:"center", justifyContent:"center", cursor:deleting===r.id?"wait":"pointer", color:"var(--danger)", opacity:deleting===r.id?0.5:1 }}>
                        {deleting === r.id ? <Loader size={12} style={{ animation:"spin 0.8s linear infinite" }}/> : <Trash2 size={12}/>}
                      </button>
                    </div>
                  </div>

                  {/* Note + date */}
                  {(r.label || r.last_hit_at) && (
                    <div style={{ display:"flex", gap:16, marginTop:8, paddingTop:8, borderTop:"1px solid rgba(255,255,255,0.05)", flexWrap:"wrap" }}>
                      {r.label && <span style={{ color:MUTED, fontSize:11 }}>📝 {r.label}</span>}
                      {r.last_hit_at && <span style={{ color:MUTED, fontSize:11 }}>Dernier clic : {formatDate(r.last_hit_at)}</span>}
                      <span style={{ color:MUTED, fontSize:11 }}>Créée le {formatDate(r.created_at)}</span>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}

        {/* Guide SEO */}
        <div style={{ marginTop:24, padding:"14px 18px", background:"#0F0E0B", border:"1px solid rgba(255,255,255,0.07)", borderRadius:12 }}>
          <div style={{ display:"flex", gap:8, alignItems:"flex-start" }}>
            <Info size={14} color={G} style={{ flexShrink:0, marginTop:1 }}/>
            <div>
              <p style={{ color:"#F5F0E8", fontSize:12, fontWeight:700, margin:"0 0 6px" }}>301 vs 302 — Lequel choisir ?</p>
              <div style={{ display:"flex", flexDirection:"column", gap:4 }}>
                <p style={{ color:MUTED, fontSize:11, margin:0 }}>
                  <strong style={{ color:"var(--success)" }}>301 Permanent</strong> — Le domaine/page a définitivement changé. Google transfère le PageRank vers la nouvelle URL. À utiliser pour les migrations définitives.
                </p>
                <p style={{ color:MUTED, fontSize:11, margin:0 }}>
                  <strong style={{ color:"var(--action)" }}>302 Temporaire</strong> — La redirection est temporaire. Google garde le SEO sur l'URL source. À utiliser pour des tests ou des promotions limitées.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
    </div>
  )
}
