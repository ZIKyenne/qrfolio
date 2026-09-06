"use client"

import { useState } from "react"
import {
  CheckCircle, Clock, AlertCircle, RefreshCw,
  Loader, ChevronDown, ChevronUp, Copy, Check
} from "lucide-react"

// ── Types ─────────────────────────────────────────────────────────────────────
type CheckStatus = "ok" | "pending" | "error"

type DnsCheck = {
  id:       string
  label:    string
  status:   CheckStatus
  message:  string
  detail?:  string
  found?:   string
  expected?: string
}

type CheckResult = {
  domain:    string
  allOk:     boolean
  checks:    DnsCheck[]
  canVerify: boolean
}

interface Props {
  domain:    string
  onVerified: () => void
}

// ── Config statuts ────────────────────────────────────────────────────────────
const STATUS: Record<CheckStatus, { color: string; bg: string; border: string; icon: React.ReactNode; label: string }> = {
  ok: {
    color:  "var(--success)",
    bg:     "rgba(57,255,143,0.08)",
    border: "rgba(57,255,143,0.2)",
    icon:   <CheckCircle size={15}/>,
    label:  "Vérifié",
  },
  pending: {
    color:  "#F97316",
    bg:     "rgba(249,115,22,0.08)",
    border: "rgba(249,115,22,0.2)",
    icon:   <Clock size={15}/>,
    label:  "En attente",
  },
  error: {
    color:  "var(--danger)",
    bg:     "rgba(255,107,107,0.08)",
    border: "rgba(255,107,107,0.2)",
    icon:   <AlertCircle size={15}/>,
    label:  "Erreur",
  },
}

const CHECK_ICONS: Record<string, string> = {
  txt:     "🔑",
  cname:   "🔀",
  arecord: "📍",
  http:    "🌐",
}

const G     = "var(--accent)"
const MUTED = "#A8A190"

export default function DnsChecker({ domain, onVerified }: Props) {
  const [result,   setResult]   = useState<CheckResult | null>(null)
  const [loading,  setLoading]  = useState(false)
  const [expanded, setExpanded] = useState<string | null>(null)
  const [copied,   setCopied]   = useState<string | null>(null)
  const [error,    setError]    = useState("")

  async function runCheck() {
    setLoading(true)
    setError("")
    try {
      const res = await fetch(`/api/domains/check?domain=${encodeURIComponent(domain)}`)
      const d   = await res.json()
      if (d.error) { setError(d.error); setLoading(false); return }
      setResult(d)
      if (d.canVerify) onVerified()
    } catch {
      setError("Impossible de contacter le serveur de vérification")
    }
    setLoading(false)
  }

  function copyText(text: string, key: string) {
    navigator.clipboard.writeText(text).catch(() => {})
    setCopied(key)
    setTimeout(() => setCopied(null), 2000)
  }

  const okCount = result?.checks.filter(c => c.status === "ok").length ?? 0
  const total   = result?.checks.length ?? 4

  return (
    <div style={{ marginTop: 16 }}>

      {/* Bouton lancer la vérification */}
      <button type="button" onClick={runCheck} disabled={loading}
        style={{ display:"flex", alignItems:"center", gap:8, padding:"9px 18px", background: loading ? "color-mix(in srgb, var(--accent) 8%, transparent)" : "color-mix(in srgb, var(--accent) 12%, transparent)", border:`1px solid color-mix(in srgb, var(--accent) 30%, transparent)`, borderRadius:9, color:G, fontSize:12, fontWeight:700, cursor:loading?"wait":"pointer", opacity:loading?0.8:1, transition:"all 0.15s", marginBottom: result ? 16 : 0 }}>
        {loading
          ? <><Loader size={13} style={{ animation:"mo-spin 0.8s linear infinite" }}/> Vérification en cours…</>
          : result
            ? <><RefreshCw size={13}/> Re-vérifier</>
            : <><RefreshCw size={13}/> Lancer la vérification DNS</>
        }
      </button>

      {error && (
        <div style={{ display:"flex", alignItems:"center", gap:8, padding:"10px 14px", background:"rgba(255,107,107,0.08)", border:"1px solid rgba(255,107,107,0.2)", borderRadius:9, marginTop:10 }}>
          <AlertCircle size={14} color="var(--danger)"/>
          <span style={{ color:"var(--danger)", fontSize:12 }}>{error}</span>
        </div>
      )}

      {result && (
        <div>
          {/* Résumé global */}
          <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", padding:"12px 16px", background: result.allOk ? "rgba(57,255,143,0.06)" : "rgba(249,115,22,0.06)", border:`1px solid ${result.allOk ? "rgba(57,255,143,0.2)" : "rgba(249,115,22,0.2)"}`, borderRadius:11, marginBottom:12 }}>
            <div style={{ display:"flex", alignItems:"center", gap:10 }}>
              {result.allOk
                ? <CheckCircle size={18} color="var(--success)"/>
                : <Clock size={18} color="#F97316"/>
              }
              <div>
                <p style={{ color:"#F5F0E8", fontSize:13, fontWeight:700, margin:"0 0 2px" }}>
                  {result.allOk ? "Configuration DNS complète ✓" : `${okCount}/${total} vérifications réussies`}
                </p>
                <p style={{ color:MUTED, fontSize:11, margin:0 }}>
                  {result.allOk
                    ? "Votre domaine est correctement configuré"
                    : result.canVerify
                      ? "Propriété vérifiée — configurez les autres enregistrements"
                      : "Complétez la configuration DNS pour activer votre domaine"
                  }
                </p>
              </div>
            </div>
            {/* Barre de progression */}
            <div style={{ display:"flex", gap:4 }}>
              {result.checks.map(c => (
                <div key={c.id} style={{ width:8, height:8, borderRadius:"50%", background: STATUS[c.status].color, opacity: c.status === "pending" ? 0.4 : 0.9 }}/>
              ))}
            </div>
          </div>

          {/* Détail de chaque check */}
          <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
            {result.checks.map(check => {
              const cfg    = STATUS[check.status]
              const isOpen = expanded === check.id
              const hasDetail = !!(check.detail || check.found || check.expected)

              return (
                <div key={check.id} style={{ background: cfg.bg, border:`1px solid ${cfg.border}`, borderRadius:10, overflow:"hidden" }}>
                  <div
                    style={{ display:"flex", alignItems:"center", gap:10, padding:"11px 14px", cursor: hasDetail ? "pointer" : "default" }}
                    onClick={() => hasDetail && setExpanded(isOpen ? null : check.id)}>

                    {/* Icône check */}
                    <span style={{ fontSize:16, flexShrink:0 }}>{CHECK_ICONS[check.id] ?? "🔍"}</span>

                    {/* Label + message */}
                    <div style={{ flex:1, minWidth:0 }}>
                      <p style={{ color:"#F5F0E8", fontSize:12, fontWeight:700, margin:"0 0 2px" }}>{check.label}</p>
                      <p style={{ color: cfg.color, fontSize:11, margin:0 }}>{check.message}</p>
                    </div>

                    {/* Badge statut */}
                    <div style={{ display:"flex", alignItems:"center", gap:5, flexShrink:0 }}>
                      <span style={{ color: cfg.color, display:"flex", alignItems:"center" }}>{cfg.icon}</span>
                      <span style={{ color: cfg.color, fontSize:11, fontWeight:700 }}>{cfg.label}</span>
                      {hasDetail && (
                        <span style={{ color:MUTED, marginLeft:4 }}>
                          {isOpen ? <ChevronUp size={13}/> : <ChevronDown size={13}/>}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Détails dépliables */}
                  {isOpen && hasDetail && (
                    <div style={{ padding:"12px 14px 14px", borderTop:`1px solid ${cfg.border}`, background:"rgba(0,0,0,0.15)" }}>

                      {check.detail && (
                        <p style={{ color:MUTED, fontSize:12, margin:"0 0 10px", lineHeight:1.5 }}>
                          💡 {check.detail}
                        </p>
                      )}

                      {check.expected && (
                        <div style={{ marginBottom:8 }}>
                          <p style={{ color:MUTED, fontSize:10, fontWeight:700, textTransform:"uppercase", letterSpacing:1, margin:"0 0 5px" }}>Valeur attendue</p>
                          <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                            <code style={{ color:"var(--success)", fontSize:11, background:"rgba(57,255,143,0.08)", padding:"5px 10px", borderRadius:7, flex:1, wordBreak:"break-all" }}>
                              {check.expected}
                            </code>
                            <button type="button" onClick={() => copyText(check.expected!, `exp-${check.id}`)}
                              style={{ flexShrink:0, width:28, height:28, background:"rgba(255,255,255,0.05)", border:"1px solid rgba(255,255,255,0.1)", borderRadius:7, display:"flex", alignItems:"center", justifyContent:"center", cursor:"pointer", color: copied===`exp-${check.id}` ? "var(--success)" : MUTED }}>
                              {copied===`exp-${check.id}` ? <Check size={12}/> : <Copy size={12}/>}
                            </button>
                          </div>
                        </div>
                      )}

                      {check.found && (
                        <div>
                          <p style={{ color:MUTED, fontSize:10, fontWeight:700, textTransform:"uppercase", letterSpacing:1, margin:"0 0 5px" }}>
                            {check.status === "error" ? "Valeur actuelle (incorrecte)" : "Valeur trouvée"}
                          </p>
                          <code style={{ color: check.status === "error" ? "var(--danger)" : "#F5F0E8", fontSize:11, background:"rgba(255,255,255,0.04)", padding:"5px 10px", borderRadius:7, display:"block", wordBreak:"break-all" }}>
                            {check.found}
                          </code>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )
            })}
          </div>

          {/* Guide fournisseurs */}
          {!result.allOk && (
            <div style={{ marginTop:14, padding:"12px 14px", background:"rgba(255,255,255,0.02)", border:"1px solid rgba(255,255,255,0.07)", borderRadius:10 }}>
              <p style={{ color:"#F5F0E8", fontSize:11, fontWeight:700, margin:"0 0 8px" }}>🔧 Où modifier vos DNS ?</p>
              <div style={{ display:"flex", gap:8, flexWrap:"wrap" }}>
                {[
                  { name:"OVH",       url:"https://www.ovh.com/manager/web" },
                  { name:"Gandi",     url:"https://admin.gandi.net" },
                  { name:"Namecheap", url:"https://ap.www.namecheap.com" },
                  { name:"Cloudflare",url:"https://dash.cloudflare.com" },
                  { name:"GoDaddy",   url:"https://dcc.godaddy.com" },
                ].map(provider => (
                  <a key={provider.name} href={provider.url} target="_blank" rel="noopener noreferrer"
                    style={{ display:"inline-flex", alignItems:"center", gap:4, padding:"5px 10px", background:"rgba(255,255,255,0.04)", border:"1px solid rgba(255,255,255,0.08)", borderRadius:7, color:MUTED, fontSize:11, textDecoration:"none", transition:"color 0.15s" }}>
                    {provider.name}
                  </a>
                ))}
              </div>
              <p style={{ color:MUTED, fontSize:11, margin:"10px 0 0", lineHeight:1.5 }}>
                ⏱ La propagation DNS peut prendre <strong style={{ color:"#F5F0E8" }}>quelques minutes à 48h</strong> selon votre fournisseur. Relancez la vérification régulièrement.
              </p>
            </div>
          )}
        </div>
      )}

      <style>{``}</style>
    </div>
  )
}
