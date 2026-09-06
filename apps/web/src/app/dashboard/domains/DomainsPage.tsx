"use client"

import { useState, useEffect } from "react"
import { useConfirm } from "@/components/ui/Confirm"
import DnsChecker from "./DnsChecker"
import MultiBrandDomainsPanel from "./MultiBrandDomainsPanel"
import DomainRoutesPanel from "./DomainRoutesPanel"
import { Button } from "@/components/ui/Button"
import { useToast } from "@/components/Toast"
import {
  Globe, Plus, Trash2, CheckCircle, Clock, AlertCircle,
  Copy, ExternalLink, Loader, ChevronDown, ChevronUp, X, RefreshCw
} from "lucide-react"

// ── Types ─────────────────────────────────────────────────────────────────────
type DomainRecord = {
  id:            string
  domain:        string
  page_id:       string
  txt_record:    string
  is_primary:    boolean
  verified:      boolean
  verified_at:   string | null
  vercel_status: string
  vercel_error:  string | null
  created_at:    string
  pages:         { title: string; slug: string } | null
}

interface Props {
  pages: { id: string; title: string; slug: string; status: string }[]
  plan:  string
}

// ── Config ────────────────────────────────────────────────────────────────────
const PAID_PLANS = ["pro", "business"]

const STATUS_CFG: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  pending: { label: "En attente",   color: "#F97316", icon: <Clock size={13}/> },
  active:  { label: "Actif",        color: "var(--success)", icon: <CheckCircle size={13}/> },
  error:   { label: "Erreur",       color: "var(--danger)", icon: <AlertCircle size={13}/> },
}

const G     = "var(--accent)"
const MUTED = "#A8A190"

export default function DomainsPage({ pages, plan }: Props) {
  const toast = useToast()
  const confirm = useConfirm()
  const [domains,    setDomains]    = useState<DomainRecord[]>([])
  const [loading,    setLoading]    = useState(true)
  const [showForm,   setShowForm]   = useState(false)
  const [expanded,   setExpanded]   = useState<string | null>(null)
  const [copied,     setCopied]     = useState<string | null>(null)
  const [verifying,  setVerifying]  = useState<string | null>(null)
  const [deleting,   setDeleting]   = useState<string | null>(null)
  const [saving,     setSaving]     = useState(false)
  const [error,      setError]      = useState("")
  const [showChecker, setShowChecker] = useState<string | null>(null)

  const [fDomain,  setFDomain]  = useState("")
  const [fPageId,  setFPageId]  = useState(pages[0]?.id ?? "")

  const isPaid = PAID_PLANS.includes(plan?.toLowerCase() ?? "")

  useEffect(() => {
    fetch("/api/domains")
      .then(r => r.json())
      .then(d => { setDomains(d.domains ?? []); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  async function addDomain() {
    if (!fDomain || !fPageId) return
    setSaving(true); setError("")
    try {
      const res = await fetch("/api/domains", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ domain: fDomain, page_id: fPageId }),
      })
      const d = await res.json().catch(() => ({}))
      if (!res.ok || d.error || !d.domain) { setError(d.error || "Le domaine n'a pas pu être ajouté."); return }
      setDomains(prev => [d.domain, ...prev])
      setExpanded(d.domain.id)
      setShowForm(false)
      setFDomain("")
    } catch {
      setError("Connexion impossible. Vérifiez votre réseau et réessayez.")
    } finally {
      setSaving(false)
    }
  }

  async function verifyDomain(rec: DomainRecord) {
    setVerifying(rec.id)
    try {
      const res = await fetch("/api/domains", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ action: "verify", domain: rec.domain, page_id: rec.page_id }),
      })
      const d = await res.json().catch(() => ({}))
      if (d.verified) {
        setDomains(prev => prev.map(r =>
          r.id === rec.id ? { ...r, verified: true, vercel_status: d.vercel_ok ? "active" : "error", vercel_error: d.vercel_error } : r
        ))
        if (d.vercel_ok) toast.success(`${rec.domain} est actif.`)
        else toast.error(`DNS validé, mais le rattachement a échoué : ${d.vercel_error || "réessayez dans quelques minutes"}.`)
      } else {
        toast.error(d.error || "Le DNS ne pointe pas encore vers QRowg. Réessayez dans quelques minutes.")
      }
    } catch {
      toast.error("Connexion impossible. Réessayez.")
    } finally {
      setVerifying(null)
    }
  }

  // Les mises à jour ne sont appliquées à l'écran QU'APRÈS la réponse du serveur :
  // un domaine « supprimé » qui réapparaît au rechargement est pire qu'une erreur.
  async function setPrimaryDomain(domain: string) {
    try {
      const res = await fetch("/api/domains", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ action: "set_primary", domain }),
      })
      const d = await res.json().catch(() => ({}))
      if (!res.ok || d.error) { toast.error(d.error || "Le domaine principal n'a pas pu être changé."); return }
      setDomains(prev => prev.map(d => ({ ...d, is_primary: d.domain === domain })))
      toast.success(`${domain} est maintenant le domaine principal.`)
    } catch {
      toast.error("Connexion impossible. Vérifiez votre réseau et réessayez.")
    }
  }

  async function deleteDomain(id: string) {
    const rec = domains.find(d => d.id === id)
    if (!(await confirm({ title: "Supprimer ce domaine ?", message: `${rec?.domain ?? "Ce domaine"} cessera immédiatement de mener à votre page. Vous pourrez le rajouter plus tard, mais il faudra refaire la vérification DNS.`, confirmLabel: "Supprimer", danger: true }))) return
    setDeleting(id)
    try {
      const res = await fetch("/api/domains", {
        method:  "DELETE",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ id }),
      })
      const d = await res.json().catch(() => ({}))
      if (!res.ok || d.error) { toast.error(d.error || "Le domaine n'a pas pu être supprimé."); return }
      setDomains(prev => prev.filter(d => d.id !== id))
    } catch {
      toast.error("Connexion impossible. Vérifiez votre réseau et réessayez.")
    } finally {
      setDeleting(null)
    }
  }

  function copyText(text: string, key: string) {
    navigator.clipboard.writeText(text).catch(() => {})
    setCopied(key)
    setTimeout(() => setCopied(null), 2000)
  }

  function formatDate(iso: string) {
    return new Date(iso).toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" })
  }

  return (
    <div style={{ minHeight:"100vh", background:"#080808", padding:"32px 24px 80px", fontFamily:"DM Sans, sans-serif" }}>
      <div style={{ maxWidth:800, margin:"0 auto" }}>

        {/* Header */}
        <div style={{ display:"flex", alignItems:"flex-start", justifyContent:"space-between", marginBottom:28, gap:16, flexWrap:"wrap" }}>
          <div>
            <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:6 }}>
              <Globe size={22} color={G}/>
              <h1 style={{ fontSize:22, fontWeight:700, color:"#F5F0E8", margin:0 }}>Domaines personnalisés</h1>
            </div>
            <p style={{ color:MUTED, fontSize:13, margin:0 }}>
              Connectez votre propre domaine à vos pages QRowg
            </p>
          </div>

        </div>

        {!isPaid ? (
          /* Paywall */
          <div style={{ textAlign:"center", padding:"48px 20px", background:"#0F0E0B", border:"1px dashed rgba(255,255,255,0.1)", borderRadius:16 }}>
            <Globe size={40} color={MUTED} style={{ marginBottom:14 }}/>
            <p style={{ color:"#F5F0E8", fontSize:15, fontWeight:600, margin:"0 0 6px" }}>Domaines personnalisés — Pro & Business</p>
            <p style={{ color:MUTED, fontSize:13, margin:"0 0 24px", lineHeight:1.6 }}>
              Connectez emilien.fr, monrestaurant.com…<br/>directement à vos pages QRowg.
            </p>
            <span className="da-halo-wrap">
              <a href="/upgrade" className="da-btn-primary da-btn-primary--sm"><span>Passer au Pro</span></a>
            </span>
          </div>
        ) : (
          <div>
            {/* ── Vue multi-brand ──────────────────────────────────────────── */}
            <div style={{ marginBottom: 20 }}>
              <MultiBrandDomainsPanel
                domains={domains}
                pages={pages}
                plan={plan}
                onSetPrimary={setPrimaryDomain}
                onDelete={async (id) => { await deleteDomain(id) }}
                onAddClick={() => setShowForm(true)}
              />
            </div>

            {/* Formulaire ajout */}
            {showForm && (
              <div style={{ background:"#0F0E0B", border:`1px solid color-mix(in srgb, var(--accent) 20%, transparent)`, borderRadius:14, padding:22, marginBottom:20 }}>
                <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:18 }}>
                  <p style={{ color:"#F5F0E8", fontSize:14, fontWeight:700, margin:0, display:"flex", alignItems:"center", gap:8 }}>
                    <Plus size={14} color={G}/> Nouveau domaine
                  </p>
                  <button type="button" onClick={() => { setShowForm(false); setError("") }}
                    style={{ background:"none", border:"none", color:MUTED, cursor:"pointer" }}>
                    <X size={16}/>
                  </button>
                </div>

                <div style={{ display:"flex", flexDirection:"column", gap:14 }}>
                  <div>
                    <label style={{ color:MUTED, fontSize:11, fontWeight:600, display:"block", marginBottom:6 }}>Nom de domaine</label>
                    <input
                      value={fDomain}
                      onChange={e => setFDomain(e.target.value)}
                      placeholder="mondomaine.fr"
                      style={{ width:"100%", background:"#111009", border:"1px solid color-mix(in srgb, var(--accent) 20%, transparent)", borderRadius:9, color:"#F5F0E8", padding:"10px 14px", fontSize:13, outline:"none", boxSizing:"border-box" }}
                    />
                    <p style={{ color:MUTED, fontSize:11, margin:"5px 0 0" }}>
                      Sans www. ni https:// — ex: mondomaine.fr
                    </p>
                  </div>

                  <div>
                    <label style={{ color:MUTED, fontSize:11, fontWeight:600, display:"block", marginBottom:6 }}>Page associée</label>
                    <select value={fPageId} onChange={e => setFPageId(e.target.value)}
                      style={{ width:"100%", background:"#111009", border:"1px solid rgba(255,255,255,0.1)", borderRadius:9, color:"#F5F0E8", padding:"10px 14px", fontSize:13, outline:"none", cursor:"pointer" }}>
                      {pages.map(p => <option key={p.id} value={p.id}>{p.title} (/{p.slug})</option>)}
                    </select>
                  </div>

                  {error && (
                    <p style={{ color:"var(--danger)", fontSize:12, margin:0, display:"flex", alignItems:"center", gap:6 }}>
                      <AlertCircle size={13}/> {error}
                    </p>
                  )}

                  <div style={{ display:"flex", gap:10, justifyContent:"flex-end" }}>
                    <button type="button" onClick={() => { setShowForm(false); setError("") }} className="da-btn-neutral da-btn-neutral--sm">Annuler</button>
                    <button type="button" onClick={addDomain} disabled={saving || !fDomain} className="da-btn-primary da-btn-primary--sm">
                      {saving ? <span aria-hidden style={{ width:13, height:13, border:"2px solid currentColor", borderTopColor:"transparent", borderRadius:"50%", animation:"mo-spin .8s linear infinite" }}/> : <Globe size={13} />}<span>Ajouter</span>
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Liste domaines */}
            {loading ? (
              <div style={{ textAlign:"center", padding:"48px", color:MUTED }}>
                <Loader size={22} color={MUTED} style={{ animation:"mo-spin 0.8s linear infinite" }}/>
              </div>
            ) : domains.length === 0 ? (
              <div style={{ textAlign:"center", padding:"30px 20px", background:"#0F0E0B", border:"1px dashed rgba(255,255,255,0.1)", borderRadius:14 }}>
                <Globe size={30} color={MUTED} style={{ marginBottom:10 }}/>
                <p style={{ color:"#F5F0E8", fontSize:14.5, fontWeight:700, margin:"0 0 6px" }}>Utilisez votre propre nom de domaine</p>
                <p style={{ color:MUTED, fontSize:12.5, margin:"0 auto 14px", lineHeight:1.55, maxWidth:330 }}>
                  Remplacez l'adresse <span style={{ color:"#C9C3B6", fontFamily:"monospace" }}>qrowg.com</span> par la vôtre — vos clients ne voient que votre marque.
                </p>
                {/* Exemple concret */}
                <div style={{ display:"inline-flex", alignItems:"center", gap:8, padding:"7px 14px", background:"color-mix(in srgb, var(--accent) 8%, transparent)", border:"1px solid color-mix(in srgb, var(--accent) 20%, transparent)", borderRadius:9, marginBottom:18 }}>
                  <span style={{ width:6, height:6, borderRadius:"50%", background:"var(--success)", flexShrink:0 }}/>
                  <span style={{ color:"#F5F0E8", fontSize:13, fontWeight:600, fontFamily:"monospace" }}>votreentreprise.fr</span>
                </div>
                <span className="da-halo-wrap">
                  <button type="button" onClick={() => setShowForm(true)} className="da-btn-primary da-btn-primary--sm"><Plus className="da-ic da-ic-plus" size={14} /> <span>Ajouter mon domaine</span></button>
                </span>
              </div>
            ) : (
              <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
                {domains.map(rec => {
                  const statusCfg = STATUS_CFG[rec.vercel_status] ?? STATUS_CFG.pending
                  const isOpen    = expanded === rec.id
                  const isBusy    = verifying === rec.id || deleting === rec.id

                  return (
                    <div key={rec.id} style={{ background:"#0F0E0B", border:`1px solid ${rec.verified ? "rgba(57,255,143,0.15)" : "rgba(255,255,255,0.07)"}`, borderRadius:14, overflow:"hidden" }}>

                      {/* Ligne principale */}
                      <div style={{ display:"flex", alignItems:"center", gap:12, padding:"16px 18px" }}>
                        <div style={{ width:36, height:36, background:rec.verified?"rgba(57,255,143,0.1)":"rgba(255,255,255,0.04)", borderRadius:9, display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
                          <Globe size={16} color={rec.verified?"var(--success)":MUTED}/>
                        </div>
                        <div style={{ flex:1, minWidth:0 }}>
                          <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:2, flexWrap:"wrap" }}>
                            <span style={{ color:"#F5F0E8", fontSize:14, fontWeight:700 }}>{rec.domain}</span>
                            <span style={{ display:"flex", alignItems:"center", gap:4, background:`${statusCfg.color}15`, border:`1px solid ${statusCfg.color}30`, borderRadius:6, padding:"2px 8px", fontSize:10, color:statusCfg.color, fontWeight:600 }}>
                              {statusCfg.icon}{statusCfg.label}
                            </span>
                          </div>
                          <p style={{ color:MUTED, fontSize:11, margin:0 }}>
                            → {rec.pages?.title ?? pages.find(p => p.id === rec.page_id)?.title ?? "Page non liée"} · Ajouté le {formatDate(rec.created_at)}
                          </p>
                        </div>
                        <div style={{ display:"flex", gap:6, alignItems:"center", flexShrink:0 }}>
                          {rec.verified && (
                            <a href={`https://${rec.domain}`} target="_blank" rel="noopener noreferrer"
                              style={{ width:28, height:28, background:"rgba(255,255,255,0.04)", border:"1px solid rgba(255,255,255,0.08)", borderRadius:8, display:"flex", alignItems:"center", justifyContent:"center", color:MUTED, textDecoration:"none" }}>
                              <ExternalLink size={13}/>
                            </a>
                          )}
                          {!rec.verified && (
                            <button type="button" onClick={() => { const ouvre = showChecker !== rec.id; setShowChecker(ouvre ? rec.id : null); if (ouvre) setExpanded(rec.id) }}
                              style={{ display:"flex", alignItems:"center", gap:5, padding:"6px 12px", background: showChecker===rec.id ? "color-mix(in srgb, var(--accent) 20%, transparent)" : "color-mix(in srgb, var(--accent) 10%, transparent)", border:`1px solid color-mix(in srgb, var(--accent) 25%, transparent)`, borderRadius:8, color:G, fontSize:11, fontWeight:700, cursor:"pointer" }}>
                              <RefreshCw size={12}/>
                              {showChecker === rec.id ? "Fermer" : "Vérifier DNS"}
                            </button>
                          )}
                          <button type="button" onClick={() => deleteDomain(rec.id)} disabled={isBusy} aria-label={`Supprimer ${rec.domain}`}
                            style={{ width:40, height:40, background:"rgba(255,100,100,0.08)", border:"1px solid rgba(255,100,100,0.15)", borderRadius:8, display:"flex", alignItems:"center", justifyContent:"center", color:"var(--danger)", cursor:isBusy?"wait":"pointer", opacity:isBusy?0.5:1 }}>
                            {deleting===rec.id ? <Loader size={12} style={{ animation:"mo-spin 0.8s linear infinite" }}/> : <Trash2 size={13}/>}
                          </button>
                          <button type="button" onClick={() => setExpanded(isOpen ? null : rec.id)} aria-label={isOpen ? "Replier" : "Voir les instructions DNS"} aria-expanded={isOpen}
                            style={{ width:40, height:40, background:"rgba(255,255,255,0.04)", border:"1px solid rgba(255,255,255,0.08)", borderRadius:8, display:"flex", alignItems:"center", justifyContent:"center", color:MUTED, cursor:"pointer" }}>
                            {isOpen ? <ChevronUp size={13}/> : <ChevronDown size={13}/>}
                          </button>
                        </div>
                      </div>

                      {/* Instructions DNS (accordéon) */}
                      {isOpen && (
                        <div style={{ borderTop:"1px solid rgba(255,255,255,0.06)", padding:"18px 18px 20px", background:"rgba(255,255,255,0.01)" }}>
                          {showChecker === rec.id && !rec.verified && (
                        <DnsChecker
                          domain={rec.domain}
                          onVerified={() => {
                            // Mesuré le 4 septembre : on marquait « actif » côté
                            // client sans jamais enregistrer le domaine sur Vercel.
                            // verifyDomain fait les deux (persistance + addToVercel)
                            // et rapporte l'état réel renvoyé par le serveur.
                            setShowChecker(null)
                            void verifyDomain(rec)
                          }}
                        />
                      )}
                      {!rec.verified ? (
                            <div>
                              <p style={{ color:"#F5F0E8", fontSize:13, fontWeight:600, margin:"0 0 14px" }}>
                                📋 Instructions de configuration DNS
                              </p>

                              {/* Étape 1: TXT */}
                              <div style={{ marginBottom:16 }}>
                                <p style={{ color:MUTED, fontSize:11, fontWeight:700, textTransform:"uppercase", letterSpacing:1, margin:"0 0 8px" }}>
                                  Étape 1 — Vérification : Enregistrement TXT
                                </p>
                                <div style={{ background:"#080808", border:"1px solid rgba(255,255,255,0.08)", borderRadius:8, padding:"12px 14px" }}>
                                  <div style={{ display:"grid", gridTemplateColumns:"60px 1fr 80px 1fr", gap:8, marginBottom:8 }}>
                                    {["Type","Nom","TTL","Valeur"].map((h,i) => (
                                      <span key={i} style={{ color:MUTED, fontSize:10, fontWeight:700, textTransform:"uppercase" }}>{h}</span>
                                    ))}
                                  </div>
                                  <div style={{ display:"grid", gridTemplateColumns:"60px 1fr 80px 1fr", gap:8, alignItems:"center" }}>
                                    <span style={{ color:G, fontSize:12, fontWeight:700 }}>TXT</span>
                                    <span style={{ color:"#F5F0E8", fontSize:12 }}>@</span>
                                    <span style={{ color:"#F5F0E8", fontSize:12 }}>3600</span>
                                    <div style={{ display:"flex", alignItems:"center", gap:6 }}>
                                      <code style={{ color:"var(--success)", fontSize:11, background:"rgba(57,255,143,0.08)", padding:"3px 7px", borderRadius:5, wordBreak:"break-all" }}>
                                        qrowg-verify={rec.txt_record}
                                      </code>
                                      <button type="button" onClick={() => copyText(`qrowg-verify=${rec.txt_record}`, `txt-${rec.id}`)}
                                        style={{ flexShrink:0, background:"none", border:"none", color:copied===`txt-${rec.id}`?"var(--success)":MUTED, cursor:"pointer", padding:2 }}>
                                        {copied===`txt-${rec.id}` ? <CheckCircle size={13}/> : <Copy size={13}/>}
                                      </button>
                                    </div>
                                  </div>
                                </div>
                              </div>

                              {/* Étape 2: CNAME/A */}
                              <div style={{ marginBottom:16 }}>
                                <p style={{ color:MUTED, fontSize:11, fontWeight:700, textTransform:"uppercase", letterSpacing:1, margin:"0 0 8px" }}>
                                  Étape 2 — Pointage : Enregistrement CNAME
                                </p>
                                <div style={{ background:"#080808", border:"1px solid rgba(255,255,255,0.08)", borderRadius:8, padding:"12px 14px" }}>
                                  <div style={{ display:"grid", gridTemplateColumns:"60px 1fr 80px 1fr", gap:8, marginBottom:8 }}>
                                    {["Type","Nom","TTL","Valeur"].map((h,i) => (
                                      <span key={i} style={{ color:MUTED, fontSize:10, fontWeight:700, textTransform:"uppercase" }}>{h}</span>
                                    ))}
                                  </div>
                                  <div style={{ display:"grid", gridTemplateColumns:"60px 1fr 80px 1fr", gap:8, alignItems:"center" }}>
                                    <span style={{ color:G, fontSize:12, fontWeight:700 }}>CNAME</span>
                                    <span style={{ color:"#F5F0E8", fontSize:12 }}>www</span>
                                    <span style={{ color:"#F5F0E8", fontSize:12 }}>3600</span>
                                    <div style={{ display:"flex", alignItems:"center", gap:6 }}>
                                      <code style={{ color:G, fontSize:11, background:"color-mix(in srgb, var(--accent) 8%, transparent)", padding:"3px 7px", borderRadius:5 }}>
                                        cname.vercel-dns.com
                                      </code>
                                      <button type="button" onClick={() => copyText("cname.vercel-dns.com", `cname-${rec.id}`)}
                                        style={{ background:"none", border:"none", color:copied===`cname-${rec.id}`?"var(--success)":MUTED, cursor:"pointer", padding:2 }}>
                                        {copied===`cname-${rec.id}` ? <CheckCircle size={13}/> : <Copy size={13}/>}
                                      </button>
                                    </div>
                                  </div>
                                </div>
                                <p style={{ color:MUTED, fontSize:11, margin:"6px 0 0" }}>
                                  Pour un domaine racine (sans www), utilisez un enregistrement A pointant vers <strong style={{ color:"#F5F0E8" }}>76.76.21.21</strong>
                                </p>
                              </div>

                              <div style={{ background:"rgba(249,115,22,0.08)", border:"1px solid rgba(249,115,22,0.2)", borderRadius:9, padding:"10px 14px", display:"flex", gap:8 }}>
                                <Clock size={14} color="#F97316" style={{ flexShrink:0, marginTop:1 }}/>
                                <p style={{ color:"#F97316", fontSize:12, margin:0, lineHeight:1.5 }}>
                                  La propagation DNS peut prendre de quelques minutes à 48h. Cliquez "Vérifier" dès que vous avez ajouté les enregistrements.
                                </p>
                              </div>
                            </div>
                          ) : (
                            <div style={{ display:"flex", alignItems:"center", gap:10 }}>
                              <CheckCircle size={18} color="var(--success)"/>
                              <div>
                                <p style={{ color:"var(--success)", fontSize:13, fontWeight:700, margin:"0 0 2px" }}>Domaine actif</p>
                                <p style={{ color:MUTED, fontSize:12, margin:0 }}>
                                  Vérifié le {formatDate(rec.verified_at!)} · Accessible sur{" "}
                                  <a href={`https://${rec.domain}`} target="_blank" rel="noopener noreferrer" style={{ color:G }}>
                                    https://{rec.domain}
                                  </a>
                                </p>
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            )}

            {/* ── Routing multi-pages ───────────────────────────────── */}
            {domains.some(d => d.verified) && (
              <div style={{ marginTop: 24 }}>
                <DomainRoutesPanel
                  verifiedDomains={domains.filter(d => d.verified)}
                  pages={pages}
                />
              </div>
            )}

            {/* Guide rapide */}
            <div style={{ marginTop:24, background:"#0F0E0B", border:"1px solid rgba(255,255,255,0.07)", borderRadius:12, padding:"16px 18px" }}>
              <p style={{ color:"#F5F0E8", fontSize:12, fontWeight:700, margin:"0 0 10px" }}>📖 Comment ça fonctionne ?</p>
              <div style={{ display:"flex", flexDirection:"column", gap:7 }}>
                {[
                  ["1", "Ajoutez votre domaine et sélectionnez la page à associer"],
                  ["2", "Copiez les enregistrements DNS dans votre registrar (OVH, Gandi, Namecheap…)"],
                  ["3", "Cliquez Vérifier — la validation est automatique"],
                  ["4", "Votre domaine redirige vers votre page QRowg"],
                ].map(([step, text]) => (
                  <div key={step} style={{ display:"flex", gap:10, alignItems:"flex-start" }}>
                    <span style={{ background:"color-mix(in srgb, var(--accent) 15%, transparent)", color:G, fontSize:10, fontWeight:700, width:18, height:18, borderRadius:"50%", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>{step}</span>
                    <span style={{ color:MUTED, fontSize:12, lineHeight:1.5 }}>{text}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
      <style>{``}</style>
    </div>
  )
}
