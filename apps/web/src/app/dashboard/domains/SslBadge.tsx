"use client"

import { useState, useEffect } from "react"
import { Shield, ShieldCheck, ShieldAlert, ShieldOff, RefreshCw, Loader, ChevronDown, ChevronUp } from "lucide-react"

type SslStatus = "active" | "pending" | "error"

type SslInfo = {
  status:     SslStatus
  label:      string
  message:    string
  detail?:    string
  checked_at: string
  issuer?:    string
  expiry?:    string
  days_left?: number
}

interface Props {
  domain:   string
  verified: boolean
}

const STATUS_CFG: Record<SslStatus, {
  color: string; bg: string; border: string
  icon: React.ReactNode; shield: React.ReactNode
}> = {
  active: {
    color:  "var(--success)",
    bg:     "rgba(57,255,143,0.08)",
    border: "rgba(57,255,143,0.2)",
    icon:   <ShieldCheck size={12}/>,
    shield: <ShieldCheck size={16}/>,
  },
  pending: {
    color:  "#F97316",
    bg:     "rgba(249,115,22,0.08)",
    border: "rgba(249,115,22,0.2)",
    icon:   <Shield size={12}/>,
    shield: <Shield size={16}/>,
  },
  error: {
    color:  "var(--danger)",
    bg:     "rgba(255,107,107,0.08)",
    border: "rgba(255,107,107,0.2)",
    icon:   <ShieldAlert size={12}/>,
    shield: <ShieldAlert size={16}/>,
  },
}

const MUTED = "#A8A190"

function formatCheckedAt(iso: string): string {
  const d = new Date(iso)
  const now = new Date()
  const diffMin = Math.floor((now.getTime() - d.getTime()) / 60000)
  if (diffMin < 1) return "à l'instant"
  if (diffMin < 60) return `il y a ${diffMin} min`
  return d.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })
}

export default function SslBadge({ domain, verified }: Props) {
  const [ssl,      setSsl]      = useState<SslInfo | null>(null)
  const [loading,  setLoading]  = useState(false)
  const [expanded, setExpanded] = useState(false)
  const [fetched,  setFetched]  = useState(false)

  async function fetchSsl() {
    setLoading(true)
    try {
      const res = await fetch(`/api/domains/ssl?domain=${encodeURIComponent(domain)}`)
      const d   = await res.json()
      if (!d.error) setSsl(d)
    } catch {}
    setLoading(false)
    setFetched(true)
  }

  // Auto-fetch quand le domaine est vérifié
  useEffect(() => {
    if (verified && !fetched) fetchSsl()
  }, [verified])

  // Si domaine pas vérifié → badge neutre
  if (!verified) {
    return (
      <span style={{ display:"inline-flex", alignItems:"center", gap:4, padding:"2px 8px", background:"rgba(255,255,255,0.04)", border:"1px solid rgba(255,255,255,0.08)", borderRadius:6, color:MUTED, fontSize:10, fontWeight:600 }}>
        <ShieldOff size={11}/> SSL en attente
      </span>
    )
  }

  // Avant le premier fetch
  if (!ssl) {
    return (
      <button type="button" onClick={fetchSsl} disabled={loading}
        style={{ display:"inline-flex", alignItems:"center", gap:4, padding:"2px 8px", background:"rgba(255,255,255,0.04)", border:"1px solid rgba(255,255,255,0.08)", borderRadius:6, color:MUTED, fontSize:10, fontWeight:600, cursor:"pointer" }}>
        {loading
          ? <Loader size={11} style={{ animation:"spin 0.8s linear infinite" }}/>
          : <Shield size={11}/>
        }
        {loading ? "Vérification…" : "Vérifier SSL"}
      </button>
    )
  }

  const cfg = STATUS_CFG[ssl.status]

  return (
    <div style={{ display:"inline-block" }}>
      {/* Badge principal */}
      <button type="button"
        onClick={() => setExpanded(e => !e)}
        style={{ display:"inline-flex", alignItems:"center", gap:5, padding:"3px 10px", background:cfg.bg, border:`1px solid ${cfg.border}`, borderRadius:7, color:cfg.color, fontSize:10, fontWeight:700, cursor:"pointer", transition:"all 0.15s" }}>
        <span style={{ color:cfg.color, display:"flex", alignItems:"center" }}>{cfg.icon}</span>
        SSL {ssl.label}
        {expanded ? <ChevronUp size={10}/> : <ChevronDown size={10}/>}
      </button>

      {/* Panneau détail */}
      {expanded && (
        <div style={{ position:"absolute", zIndex:50, marginTop:6, minWidth:280, background:"#111009", border:`1px solid ${cfg.border}`, borderRadius:10, padding:14, boxShadow:"0 8px 32px rgba(0,0,0,0.6)" }}>

          {/* Icône + statut */}
          <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:12 }}>
            <div style={{ width:36, height:36, background:cfg.bg, border:`1.5px solid ${cfg.border}`, borderRadius:9, display:"flex", alignItems:"center", justifyContent:"center", color:cfg.color, flexShrink:0 }}>
              {cfg.shield}
            </div>
            <div>
              <p style={{ color:cfg.color, fontSize:12, fontWeight:700, margin:"0 0 2px" }}>{ssl.label}</p>
              <p style={{ color:MUTED, fontSize:11, margin:0 }}>{ssl.message}</p>
            </div>
          </div>

          {/* Infos certificat */}
          <div style={{ display:"flex", flexDirection:"column", gap:7, marginBottom:ssl.detail ? 10 : 0 }}>
            {ssl.issuer && (
              <div style={{ display:"flex", justifyContent:"space-between" }}>
                <span style={{ color:MUTED, fontSize:11 }}>Émetteur</span>
                <span style={{ color:"#F5F0E8", fontSize:11, fontWeight:600 }}>{ssl.issuer}</span>
              </div>
            )}
            {ssl.expiry && (
              <div style={{ display:"flex", justifyContent:"space-between" }}>
                <span style={{ color:MUTED, fontSize:11 }}>Expiration</span>
                <span style={{ color: (ssl.days_left ?? 999) < 14 ? "#F97316" : "#F5F0E8", fontSize:11, fontWeight:600 }}>
                  {ssl.expiry}
                  {ssl.days_left !== undefined && ssl.days_left < 30 && (
                    <span style={{ color:"#F97316", marginLeft:6 }}>({ssl.days_left}j)</span>
                  )}
                </span>
              </div>
            )}
            <div style={{ display:"flex", justifyContent:"space-between" }}>
              <span style={{ color:MUTED, fontSize:11 }}>Dernière vérif.</span>
              <span style={{ color:"#F5F0E8", fontSize:11 }}>{formatCheckedAt(ssl.checked_at)}</span>
            </div>
            {ssl.status === "active" && (
              <div style={{ display:"flex", justifyContent:"space-between" }}>
                <span style={{ color:MUTED, fontSize:11 }}>Renouvellement</span>
                <span style={{ color:"var(--success)", fontSize:11, fontWeight:600 }}>Automatique ✓</span>
              </div>
            )}
          </div>

          {ssl.detail && (
            <div style={{ padding:"8px 10px", background:"rgba(255,255,255,0.03)", borderRadius:7, marginBottom:10 }}>
              <p style={{ color:MUTED, fontSize:11, margin:0, lineHeight:1.5 }}>💡 {ssl.detail}</p>
            </div>
          )}

          {/* Bouton re-vérifier */}
          <button type="button" onClick={() => { fetchSsl() }}
            style={{ display:"flex", alignItems:"center", gap:6, width:"100%", padding:"7px 12px", background:"rgba(255,255,255,0.04)", border:"1px solid rgba(255,255,255,0.08)", borderRadius:8, color:MUTED, fontSize:11, cursor:"pointer", justifyContent:"center" }}>
            {loading ? <Loader size={11} style={{ animation:"spin 0.8s linear infinite" }}/> : <RefreshCw size={11}/>}
            Actualiser
          </button>
        </div>
      )}

      <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
    </div>
  )
}
