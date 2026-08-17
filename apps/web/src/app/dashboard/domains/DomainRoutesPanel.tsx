"use client"

import { useState, useEffect } from "react"
import {
  Globe, Plus, Trash2, ArrowRight, Loader,
  AlertCircle, CheckCircle, Star, Layers, X
} from "lucide-react"

// ── Types ─────────────────────────────────────────────────────────────────────
type Route = {
  id:          string
  root_domain: string
  subdomain:   string | null
  page_id:     string
  priority:    number
  pages:       { id: string; title: string; slug: string; status: string } | null
}

type DomainVerif = {
  id:       string
  domain:   string
  verified: boolean
  pages:    { title: string; slug: string } | null
}

interface Props {
  verifiedDomains: DomainVerif[]
  pages:           { id: string; title: string; slug: string; status: string }[]
}

const SUBDOMAIN_LABELS: Record<string, string> = {
  "":        "Domaine racine",
  "*":       "Wildcard (toutes les autres routes)",
  "www":     "www",
  "booking": "booking",
  "menu":    "menu",
  "shop":    "shop",
  "blog":    "blog",
  "events":  "events",
  "contact": "contact",
}

const G     = "var(--accent)"
const MUTED = "#A8A190"

export default function DomainRoutesPanel({ verifiedDomains, pages }: Props) {
  const [routes,     setRoutes]     = useState<Route[]>([])
  const [loading,    setLoading]    = useState(true)
  const [showForm,   setShowForm]   = useState(false)
  const [deleting,   setDeleting]   = useState<string | null>(null)
  const [saving,     setSaving]     = useState(false)
  const [error,      setError]      = useState("")
  const [selDomain,  setSelDomain]  = useState(verifiedDomains[0]?.domain ?? "")

  const [fDomain,    setFDomain]    = useState(verifiedDomains[0]?.domain ?? "")
  const [fSub,       setFSub]       = useState("")
  const [fCustomSub, setFCustomSub] = useState("")
  const [fPageId,    setFPageId]    = useState(pages[0]?.id ?? "")

  const effectiveSub = fSub === "__custom__" ? fCustomSub : fSub

  useEffect(() => {
    fetch("/api/domains/routes")
      .then(r => r.json())
      .then(d => { setRoutes(d.routes ?? []); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  // Regrouper les routes par domaine racine
  const byDomain = routes.reduce<Record<string, Route[]>>((acc, r) => {
    if (!acc[r.root_domain]) acc[r.root_domain] = []
    acc[r.root_domain].push(r)
    return acc
  }, {})

  const displayDomains = Object.keys(byDomain).length > 0
    ? Object.keys(byDomain)
    : verifiedDomains.map(d => d.domain)

  function subLabel(sub: string | null): string {
    if (sub === null)  return "Racine"
    if (sub === "*")   return "Wildcard *"
    if (sub === "www") return "www"
    return sub
  }

  function fullUrl(root: string, sub: string | null): string {
    if (!sub) return root
    if (sub === "*") return `*.${root}`
    return `${sub}.${root}`
  }

  async function addRoute() {
    if (!fDomain || !fPageId) return
    setSaving(true); setError("")

    const res = await fetch("/api/domains/routes", {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({
        root_domain: fDomain,
        subdomain:   effectiveSub || null,
        page_id:     fPageId,
      }),
    })
    const d = await res.json()
    if (d.error) { setError(d.error); setSaving(false); return }
    setRoutes(prev => {
      const filtered = prev.filter(r => !(r.root_domain === d.route.root_domain && r.subdomain === d.route.subdomain))
      return [...filtered, d.route]
    })
    setShowForm(false)
    setFSub(""); setFCustomSub(""); setError("")
    setSaving(false)
  }

  async function deleteRoute(id: string) {
    setDeleting(id)
    await fetch("/api/domains/routes", {
      method:  "DELETE",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ id }),
    })
    setRoutes(prev => prev.filter(r => r.id !== id))
    setDeleting(null)
  }

  if (verifiedDomains.length === 0) {
    return (
      <div style={{ background:"#0F0E0B", border:"1px solid rgba(255,255,255,0.07)", borderRadius:14, padding:24, fontFamily:"DM Sans, sans-serif" }}>
        <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:10 }}>
          <Layers size={16} color={MUTED}/>
          <h3 style={{ color:"#F5F0E8", fontSize:14, fontWeight:700, margin:0 }}>Routing multi-pages</h3>
        </div>
        <div style={{ textAlign:"center", padding:"24px 0", color:MUTED }}>
          <Globe size={28} color={MUTED} style={{ marginBottom:10 }}/>
          <p style={{ margin:"0 0 4px", fontSize:13, color:"#F5F0E8" }}>Aucun domaine vérifié</p>
          <p style={{ margin:0, fontSize:12 }}>Vérifiez un domaine pour configurer les routes</p>
        </div>
      </div>
    )
  }

  return (
    <div style={{ background:"#0F0E0B", border:"1px solid color-mix(in srgb, var(--accent) 12%, transparent)", borderRadius:14, padding:24, fontFamily:"DM Sans, sans-serif" }}>

      {/* Header */}
      <div style={{ display:"flex", alignItems:"flex-start", justifyContent:"space-between", marginBottom:20, gap:12, flexWrap:"wrap" }}>
        <div>
          <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:4 }}>
            <Layers size={16} color={G}/>
            <h3 style={{ color:"#F5F0E8", fontSize:14, fontWeight:700, margin:0 }}>Routing multi-pages</h3>
          </div>
          <p style={{ color:MUTED, fontSize:12, margin:0 }}>
            Associez chaque sous-domaine à une page différente
          </p>
        </div>
        <button type="button" onClick={() => setShowForm(true)} className="da-btn-primary da-btn-primary--sm">
          <Plus className="da-ic da-ic-plus" size={13}/> Ajouter une route
        </button>
      </div>

      {/* Exemple visuel */}
      {routes.length === 0 && !showForm && (
        <div style={{ marginBottom:18, padding:"14px 16px", background:"rgba(255,255,255,0.02)", border:"1px dashed rgba(255,255,255,0.08)", borderRadius:10 }}>
          <p style={{ color:MUTED, fontSize:11, fontWeight:700, textTransform:"uppercase", letterSpacing:1, margin:"0 0 10px" }}>
            Exemple de configuration
          </p>
          {[
            { url: "restaurant.fr",         page: "Page principale",  icon: "🏠", special: "racine" },
            { url: "booking.restaurant.fr",  page: "Page Réservation", icon: "📅", special: null },
            { url: "menu.restaurant.fr",     page: "Page Menu",        icon: "🍽️", special: null },
            { url: "*.restaurant.fr",        page: "Page principale",  icon: "🌐", special: "wildcard" },
          ].map((ex, i) => (
            <div key={i} style={{ display:"flex", alignItems:"center", gap:10, padding:"5px 0", borderBottom: i < 3 ? "1px solid rgba(255,255,255,0.04)" : "none" }}>
              <span style={{ fontSize:14 }}>{ex.icon}</span>
              <code style={{ color:G, fontSize:11, flex:1 }}>{ex.url}</code>
              <ArrowRight size={11} color={MUTED}/>
              <span style={{ color:"#F5F0E8", fontSize:11 }}>{ex.page}</span>
              {ex.special === "wildcard" && (
                <span style={{ background:"color-mix(in srgb, var(--accent) 10%, transparent)", border:"1px solid color-mix(in srgb, var(--accent) 20%, transparent)", borderRadius:5, padding:"1px 6px", fontSize:9, color:G }}>wildcard</span>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Formulaire */}
      {showForm && (
        <div style={{ background:"rgba(255,255,255,0.02)", border:"1px solid color-mix(in srgb, var(--accent) 15%, transparent)", borderRadius:11, padding:18, marginBottom:18 }}>
          <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:16 }}>
            <p style={{ color:"#F5F0E8", fontSize:13, fontWeight:700, margin:0 }}>Nouvelle route</p>
            <button type="button" onClick={() => { setShowForm(false); setError("") }}
              style={{ background:"none", border:"none", color:MUTED, cursor:"pointer" }}>
              <X size={15}/>
            </button>
          </div>

          <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
            {/* Domaine racine */}
            <div>
              <label style={{ color:MUTED, fontSize:11, fontWeight:600, display:"block", marginBottom:5 }}>Domaine racine</label>
              <select value={fDomain} onChange={e => setFDomain(e.target.value)}
                style={{ width:"100%", background:"#111009", border:"1px solid rgba(255,255,255,0.1)", borderRadius:8, color:"#F5F0E8", padding:"9px 12px", fontSize:12, outline:"none", cursor:"pointer", boxSizing:"border-box" as const }}>
                {verifiedDomains.map(d => (
                  <option key={d.id} value={d.domain}>{d.domain}</option>
                ))}
              </select>
            </div>

            {/* Sous-domaine */}
            <div>
              <label style={{ color:MUTED, fontSize:11, fontWeight:600, display:"block", marginBottom:5 }}>Sous-domaine</label>
              <select value={fSub} onChange={e => setFSub(e.target.value)}
                style={{ width:"100%", background:"#111009", border:"1px solid rgba(255,255,255,0.1)", borderRadius:8, color:"#F5F0E8", padding:"9px 12px", fontSize:12, outline:"none", cursor:"pointer", boxSizing:"border-box" as const, marginBottom:6 }}>
                <option value="">Domaine racine ({fDomain})</option>
                <option value="www">www.{fDomain}</option>
                <option value="booking">booking.{fDomain}</option>
                <option value="menu">menu.{fDomain}</option>
                <option value="shop">shop.{fDomain}</option>
                <option value="blog">blog.{fDomain}</option>
                <option value="events">events.{fDomain}</option>
                <option value="contact">contact.{fDomain}</option>
                <option value="*">*.{fDomain} (wildcard)</option>
                <option value="__custom__">Autre (saisie libre)</option>
              </select>
              {fSub === "__custom__" && (
                <div style={{ display:"flex", alignItems:"center", gap:0, background:"#111009", border:"1px solid color-mix(in srgb, var(--accent) 20%, transparent)", borderRadius:8, overflow:"hidden" }}>
                  <input value={fCustomSub} onChange={e => setFCustomSub(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g,""))}
                    placeholder="mon-sous-domaine"
                    style={{ flex:1, background:"transparent", border:"none", color:"#F5F0E8", padding:"9px 10px", fontSize:12, outline:"none" }}/>
                  <span style={{ color:MUTED, fontSize:11, padding:"0 10px", whiteSpace:"nowrap" }}>.{fDomain}</span>
                </div>
              )}
              {/* Aperçu URL */}
              {(effectiveSub !== "__custom__") && (
                <p style={{ color:G, fontSize:11, margin:"5px 0 0" }}>
                  → <code>{fullUrl(fDomain, effectiveSub || null)}</code>
                </p>
              )}
            </div>

            {/* Page cible */}
            <div>
              <label style={{ color:MUTED, fontSize:11, fontWeight:600, display:"block", marginBottom:5 }}>Page cible</label>
              <select value={fPageId} onChange={e => setFPageId(e.target.value)}
                style={{ width:"100%", background:"#111009", border:"1px solid rgba(255,255,255,0.1)", borderRadius:8, color:"#F5F0E8", padding:"9px 12px", fontSize:12, outline:"none", cursor:"pointer", boxSizing:"border-box" as const }}>
                {pages.map(p => (
                  <option key={p.id} value={p.id}>
                    {p.title} {p.status !== "published" ? "(brouillon)" : ""}
                  </option>
                ))}
              </select>
            </div>

            {error && (
              <div style={{ display:"flex", alignItems:"center", gap:7, padding:"8px 12px", background:"rgba(255,107,107,0.08)", border:"1px solid rgba(255,107,107,0.2)", borderRadius:8 }}>
                <AlertCircle size={13} color="var(--danger)"/>
                <span style={{ color:"var(--danger)", fontSize:12 }}>{error}</span>
              </div>
            )}

            <div style={{ display:"flex", gap:8, justifyContent:"flex-end" }}>
              <button type="button" onClick={() => { setShowForm(false); setError("") }} className="da-btn-neutral da-btn-neutral--sm">
                Annuler
              </button>
              <button type="button" onClick={addRoute} disabled={!fDomain || !fPageId || saving} className="da-btn-primary da-btn-primary--sm">
                {saving ? <><Loader size={12} style={{ animation:"mo-spin 0.8s linear infinite" }}/> <span>Ajout…</span></> : <><CheckCircle size={12}/> <span>Ajouter la route</span></>}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Routes existantes */}
      {loading ? (
        <div style={{ textAlign:"center", padding:"32px", color:MUTED }}>
          <Loader size={18} color={MUTED} style={{ animation:"mo-spin 0.8s linear infinite" }}/>
        </div>
      ) : displayDomains.length === 0 ? (
        <p style={{ color:MUTED, fontSize:12, textAlign:"center", padding:"20px 0" }}>
          Aucune route configurée
        </p>
      ) : (
        <div style={{ display:"flex", flexDirection:"column", gap:16 }}>
          {displayDomains.map(rootDomain => {
            const domRoutes = (byDomain[rootDomain] ?? []).sort((a, b) => b.priority - a.priority)
            const verif = verifiedDomains.find(d => d.domain === rootDomain)

            return (
              <div key={rootDomain}>
                {/* En-tête domaine */}
                <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:8 }}>
                  <Globe size={13} color={G}/>
                  <span style={{ color:G, fontSize:12, fontWeight:700 }}>{rootDomain}</span>
                  {verif?.verified && <CheckCircle size={11} color="var(--success)"/>}
                  <span style={{ color:MUTED, fontSize:10 }}>{domRoutes.length} route{domRoutes.length !== 1 ? "s" : ""}</span>
                </div>

                {/* Tableau routes */}
                {domRoutes.length === 0 ? (
                  <p style={{ color:MUTED, fontSize:11, padding:"8px 12px" }}>Aucune route — ajoutez-en une ci-dessus</p>
                ) : (
                  <div style={{ display:"flex", flexDirection:"column", gap:5 }}>
                    {domRoutes.map((route, i) => (
                      <div key={route.id} style={{ display:"flex", alignItems:"center", gap:10, padding:"10px 14px", background: i % 2 === 0 ? "rgba(255,255,255,0.02)" : "transparent", border:"1px solid rgba(255,255,255,0.05)", borderRadius:9 }}>
                        {/* URL source */}
                        <div style={{ flex:1, minWidth:0 }}>
                          <div style={{ display:"flex", alignItems:"center", gap:6 }}>
                            {route.subdomain === null && <Star size={11} color={G}/>}
                            {route.subdomain === "*" && <span style={{ color:MUTED, fontSize:10 }}>*</span>}
                            <code style={{ color: route.subdomain === null ? G : "#F5F0E8", fontSize:12, fontWeight: route.subdomain === null ? 700 : 500, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>
                              {fullUrl(rootDomain, route.subdomain)}
                            </code>
                          </div>
                          <p style={{ color:MUTED, fontSize:10, margin:"2px 0 0" }}>
                            {subLabel(route.subdomain)}
                            {route.subdomain === null && " · priorité racine"}
                            {route.subdomain === "*" && " · fallback"}
                          </p>
                        </div>

                        {/* Flèche */}
                        <ArrowRight size={13} color={MUTED}/>

                        {/* Page cible */}
                        <div style={{ minWidth:0, maxWidth:160 }}>
                          <p style={{ color:"#F5F0E8", fontSize:12, fontWeight:600, margin:0, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>
                            {route.pages?.title ?? "Page inconnue"}
                          </p>
                          <p style={{ color:MUTED, fontSize:10, margin:"2px 0 0" }}>/{route.pages?.slug}</p>
                        </div>

                        {/* Statut page */}
                        {route.pages?.status === "published"
                          ? <CheckCircle size={12} color="var(--success)"/>
                          : <AlertCircle size={12} color="#F97316"/>
                        }

                        {/* Supprimer */}
                        <button type="button" onClick={() => deleteRoute(route.id)} disabled={deleting === route.id}
                          style={{ width:26, height:26, background:"rgba(255,100,100,0.08)", border:"1px solid rgba(255,100,100,0.15)", borderRadius:7, display:"flex", alignItems:"center", justifyContent:"center", color:"var(--danger)", cursor:deleting===route.id?"wait":"pointer", opacity:deleting===route.id?0.5:1, flexShrink:0 }}>
                          {deleting === route.id ? <Loader size={11} style={{ animation:"mo-spin 0.8s linear infinite" }}/> : <Trash2 size={11}/>}
                        </button>
                      </div>
                    ))}
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
