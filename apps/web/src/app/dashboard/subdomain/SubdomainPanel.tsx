"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import {
  Globe, Check, X, Loader, AlertCircle,
  CheckCircle, Copy, ExternalLink, Pencil, Trash2
} from "lucide-react"
import { useConfirm } from "@/components/ui/Confirm"

interface Props {
  currentUsername: string | null
  onUpdated?: (username: string | null) => void
}

type AvailStatus = "idle" | "checking" | "available" | "taken" | "invalid" | "own"

const G     = "var(--accent)"
const MUTED = "#A8A190"
const APP   = "qrowg.com"

// Suggestions basées sur le nom saisi
function getSuggestions(base: string): string[] {
  const clean = base.toLowerCase().replace(/[^a-z0-9]/g, "")
  if (!clean || clean.length < 2) return []
  return [
    clean,
    `${clean}pro`,
    `${clean}hq`,
    `${clean}studio`,
    `the${clean}`,
  ].filter(s => s.length >= 3 && s.length <= 30).slice(0, 4)
}

export default function SubdomainPanel({ currentUsername, onUpdated }: Props) {
  const [editing,   setEditing]   = useState(!currentUsername)
  const [input,     setInput]     = useState(currentUsername ?? "")
  const [status,    setStatus]    = useState<AvailStatus>("idle")
  const [message,   setMessage]   = useState("")
  const [saving,    setSaving]    = useState(false)
  const [deleting,  setDeleting]  = useState(false)
  const confirm = useConfirm()
  const [copied,    setCopied]    = useState(false)
  const [error,     setError]     = useState("")
  const debounceRef = useRef<NodeJS.Timeout | null>(null)

  const subdomain = `${input}.${APP}`

  // Vérification disponibilité avec debounce 500ms
  const checkAvailability = useCallback(async (value: string) => {
    const clean = value.toLowerCase().trim()
    if (!clean || clean.length < 3) {
      setStatus(clean.length > 0 ? "invalid" : "idle")
      setMessage(clean.length > 0 ? "Minimum 3 caractères" : "")
      return
    }

    setStatus("checking")
    setMessage("")

    try {
      const res = await fetch(`/api/subdomain?username=${encodeURIComponent(clean)}`)
      const d   = await res.json()

      if (d.available) {
        setStatus("available")
        setMessage(`${clean}.${APP} est disponible !`)
      } else if (d.isOwn) {
        setStatus("own")
        setMessage("C'est votre sous-domaine actuel")
      } else {
        setStatus("taken")
        setMessage(d.reason ?? d.error ?? "Non disponible")
      }
    } catch {
      setStatus("invalid")
      setMessage("Impossible de vérifier la disponibilité")
    }
  }, [])

  useEffect(() => {
    if (!editing) return
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => checkAvailability(input), 500)
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current) }
  }, [input, editing])

  async function save() {
    if (status !== "available") return
    setSaving(true)
    setError("")
    try {
      const res = await fetch("/api/subdomain", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ username: input.toLowerCase().trim() }),
      })
      const d = await res.json()
      if (d.error) { setError(d.error); setSaving(false); return }
      setEditing(false)
      onUpdated?.(d.username)
    } catch {
      setError("Erreur lors de la réservation")
    }
    setSaving(false)
  }

  async function release() {
    if (!(await confirm({ title: "Libérer le sous-domaine ?", message: "Il deviendra disponible pour d'autres utilisateurs.", confirmLabel: "Libérer", danger: true }))) return
    setDeleting(true)
    try {
      const res = await fetch("/api/subdomain", { method: "DELETE" })
      const d = await res.json().catch(() => ({}))
      if (!res.ok || d.error) { setStatus("invalid"); setMessage(d.error || "Le sous-domaine n'a pas pu être libéré."); return }
      setInput("")
      setStatus("idle")
      setEditing(true)
      onUpdated?.(null)
    } catch { setStatus("invalid"); setMessage("Connexion impossible. Réessayez.") }
    finally { setDeleting(false) }
  }

  function copySubdomain() {
    navigator.clipboard.writeText(`https://${subdomain}`).catch(() => {})
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const suggestions = getSuggestions(input)

  // ── Indicateur disponibilité ──────────────────────────────────────────────
  const statusIndicator = () => {
    if (status === "checking") return <Loader size={14} color={MUTED} style={{ animation:"mo-spin 0.7s linear infinite" }}/>
    if (status === "available") return <CheckCircle size={14} color="var(--success)"/>
    if (status === "own")       return <CheckCircle size={14} color={G}/>
    if (status === "taken" || status === "invalid") return <X size={14} color="var(--danger)"/>
    return null
  }

  const msgColor = () => {
    if (status === "available") return "var(--success)"
    if (status === "own")       return G
    if (status === "taken" || status === "invalid") return "var(--danger)"
    return MUTED
  }

  return (
    <div style={{ background:"#0F0E0B", border:"1px solid color-mix(in srgb, var(--accent) 12%, transparent)", borderRadius:16, padding:24, fontFamily:"DM Sans, sans-serif" }}>

      {/* Header */}
      <div style={{ display:"flex", alignItems:"flex-start", gap:10, marginBottom:20 }}>
        <Globe size={16} color={G} style={{ marginTop:2, flexShrink:0 }}/>
        <div>
          <h3 style={{ color:"#F5F0E8", fontSize:15, fontWeight:700, margin:"0 0 3px" }}>
            Sous-domaine personnalisé
          </h3>
          <p style={{ color:MUTED, fontSize:12, margin:0 }}>
            Votre adresse unique sur QRowg — <strong style={{ color:"#F5F0E8" }}>vous.{APP}</strong>
          </p>
        </div>
      </div>

      {/* Domaine actuel (si configuré + pas en édition) */}
      {currentUsername && !editing ? (
        <div>
          {/* Carte sous-domaine actif */}
          <div style={{ background:"rgba(57,255,143,0.06)", border:"1px solid rgba(57,255,143,0.2)", borderRadius:12, padding:"16px 18px", marginBottom:16 }}>
            <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", gap:12, flexWrap:"wrap" }}>
              <div style={{ display:"flex", alignItems:"center", gap:10 }}>
                <div style={{ width:36, height:36, background:"rgba(57,255,143,0.1)", borderRadius:9, display:"flex", alignItems:"center", justifyContent:"center" }}>
                  <CheckCircle size={18} color="var(--success)"/>
                </div>
                <div>
                  <p style={{ color:"#F5F0E8", fontSize:14, fontWeight:700, margin:"0 0 2px" }}>
                    {currentUsername}.{APP}
                  </p>
                  <p style={{ color:MUTED, fontSize:11, margin:0 }}>Sous-domaine actif</p>
                </div>
              </div>
              <div style={{ display:"flex", gap:6, alignItems:"center" }}>
                <a href={`https://${currentUsername}.${APP}`} target="_blank" rel="noopener noreferrer"
                  style={{ width:30, height:30, background:"rgba(255,255,255,0.04)", border:"1px solid rgba(255,255,255,0.08)", borderRadius:8, display:"flex", alignItems:"center", justifyContent:"center", color:MUTED, textDecoration:"none" }}>
                  <ExternalLink size={13}/>
                </a>
                <button type="button" onClick={copySubdomain}
                  style={{ width:30, height:30, background:"rgba(255,255,255,0.04)", border:"1px solid rgba(255,255,255,0.08)", borderRadius:8, display:"flex", alignItems:"center", justifyContent:"center", color:copied?"var(--success)":MUTED, cursor:"pointer" }}>
                  {copied ? <Check size={13}/> : <Copy size={13}/>}
                </button>
                <button type="button" onClick={() => { setInput(currentUsername); setEditing(true) }}
                  style={{ width:30, height:30, background:"color-mix(in srgb, var(--accent) 8%, transparent)", border:"1px solid color-mix(in srgb, var(--accent) 20%, transparent)", borderRadius:8, display:"flex", alignItems:"center", justifyContent:"center", color:G, cursor:"pointer" }}>
                  <Pencil size={13}/>
                </button>
                <button type="button" onClick={release} disabled={deleting}
                  style={{ width:30, height:30, background:"rgba(255,100,100,0.08)", border:"1px solid rgba(255,100,100,0.15)", borderRadius:8, display:"flex", alignItems:"center", justifyContent:"center", color:"var(--danger)", cursor:deleting?"wait":"pointer", opacity:deleting?0.6:1 }}>
                  {deleting ? <Loader size={13} style={{ animation:"mo-spin 0.7s linear infinite" }}/> : <Trash2 size={13}/>}
                </button>
              </div>
            </div>
          </div>

          {/* URL complète copiable */}
          <div style={{ display:"flex", alignItems:"center", gap:8, padding:"10px 14px", background:"rgba(255,255,255,0.02)", border:"1px solid rgba(255,255,255,0.06)", borderRadius:9 }}>
            <span style={{ color:MUTED, fontSize:11 }}>URL :</span>
            <code style={{ color:G, fontSize:12, flex:1 }}>https://{currentUsername}.{APP}</code>
            <button type="button" onClick={copySubdomain}
              style={{ background:"none", border:"none", color:copied?"var(--success)":MUTED, cursor:"pointer", display:"flex" }}>
              {copied ? <Check size={12}/> : <Copy size={12}/>}
            </button>
          </div>
        </div>

      ) : (
        /* Formulaire réservation / modification */
        <div>
          {/* Champ de saisie */}
          <div style={{ marginBottom:12 }}>
            <label style={{ color:MUTED, fontSize:11, fontWeight:600, display:"block", marginBottom:6 }}>
              Choisissez votre sous-domaine
            </label>
            <div style={{ display:"flex", alignItems:"center", gap:0, background:"#111009", border:`1px solid ${status==="available"?"rgba(57,255,143,0.4)":status==="taken"||status==="invalid"?"rgba(255,107,107,0.3)":"color-mix(in srgb, var(--accent) 20%, transparent)"}`, borderRadius:10, overflow:"hidden", transition:"border-color 0.15s" }}>
              {/* Préfixe */}
              <div style={{ display:"flex", alignItems:"center", padding:"10px 12px", borderRight:"1px solid rgba(255,255,255,0.06)", flexShrink:0 }}>
                <Globe size={13} color={MUTED} style={{ marginRight:4 }}/>
                <span style={{ color:MUTED, fontSize:12, whiteSpace:"nowrap" }}>https://</span>
              </div>
              {/* Input */}
              <input
                value={input}
                onChange={e => setInput(e.target.value.toLowerCase().replace(/[^a-z0-9_-]/g, ""))}
                placeholder="votre-nom"
                maxLength={30}
                autoFocus
                style={{ flex:1, background:"transparent", border:"none", color:"#F5F0E8", padding:"10px 10px", fontSize:13, fontWeight:600, outline:"none", minWidth:0 }}
              />
              {/* Suffixe */}
              <div style={{ padding:"10px 12px", borderLeft:"1px solid rgba(255,255,255,0.06)", flexShrink:0 }}>
                <span style={{ color:MUTED, fontSize:12, whiteSpace:"nowrap" }}>.{APP}</span>
              </div>
              {/* Indicateur */}
              <div style={{ padding:"10px 12px", flexShrink:0 }}>
                {statusIndicator()}
              </div>
            </div>
            {/* Message disponibilité */}
            {message && (
              <p style={{ color:msgColor(), fontSize:11, margin:"5px 0 0", display:"flex", alignItems:"center", gap:4 }}>
                {status==="available" && <CheckCircle size={11}/>}
                {(status==="taken"||status==="invalid") && <AlertCircle size={11}/>}
                {message}
              </p>
            )}
          </div>

          {/* Suggestions */}
          {status === "taken" && suggestions.length > 0 && (
            <div style={{ marginBottom:12 }}>
              <p style={{ color:MUTED, fontSize:11, fontWeight:600, margin:"0 0 6px" }}>💡 Suggestions disponibles :</p>
              <div style={{ display:"flex", gap:6, flexWrap:"wrap" }}>
                {suggestions.map(s => (
                  <button key={s} type="button" onClick={() => setInput(s)}
                    style={{ padding:"5px 12px", background:"color-mix(in srgb, var(--accent) 8%, transparent)", border:"1px solid color-mix(in srgb, var(--accent) 20%, transparent)", borderRadius:8, color:G, fontSize:11, fontWeight:600, cursor:"pointer" }}>
                    {s}.{APP}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Règles de format */}
          <div style={{ marginBottom:16, padding:"10px 12px", background:"rgba(255,255,255,0.02)", borderRadius:8 }}>
            <div style={{ display:"flex", gap:16, flexWrap:"wrap" }}>
              {[
                { ok: input.length >= 3 && input.length <= 30, label: "3–30 caractères" },
                { ok: /^[a-z0-9_-]*$/.test(input), label: "a–z, 0–9, - et _" },
                { ok: !input.startsWith("-") && !input.endsWith("-"), label: "Commence/finit par alphanumérique" },
              ].map((rule, i) => (
                <div key={i} style={{ display:"flex", alignItems:"center", gap:5 }}>
                  {rule.ok && input.length > 0
                    ? <CheckCircle size={11} color="var(--success)"/>
                    : <div style={{ width:11, height:11, borderRadius:"50%", border:`1.5px solid ${MUTED}` }}/>
                  }
                  <span style={{ color: rule.ok && input.length > 0 ? "var(--success)" : MUTED, fontSize:10 }}>{rule.label}</span>
                </div>
              ))}
            </div>
          </div>

          {error && (
            <div style={{ display:"flex", alignItems:"center", gap:7, padding:"9px 12px", background:"rgba(255,107,107,0.08)", border:"1px solid rgba(255,107,107,0.2)", borderRadius:8, marginBottom:12 }}>
              <AlertCircle size={13} color="var(--danger)"/>
              <span style={{ color:"var(--danger)", fontSize:12 }}>{error}</span>
            </div>
          )}

          {/* Actions */}
          <div style={{ display:"flex", gap:8 }}>
            {currentUsername && (
              <button type="button" onClick={() => { setEditing(false); setInput(currentUsername); setStatus("idle") }}
                style={{ padding:"9px 16px", background:"transparent", border:"1px solid rgba(255,255,255,0.1)", borderRadius:9, color:MUTED, fontSize:12, cursor:"pointer" }}>
                Annuler
              </button>
            )}
            <button type="button" onClick={save}
              disabled={status !== "available" || saving}
              className="da-btn-primary da-btn-primary--sm" style={{ flex:1 }}>
              {saving
                ? <><Loader size={13} style={{ animation:"mo-spin 0.7s linear infinite" }}/> Réservation…</>
                : <><Check size={13}/> {currentUsername ? "Modifier le sous-domaine" : "Réserver ce sous-domaine"}</>
              }
            </button>
          </div>

          {/* Info SEO */}
          <p style={{ color:MUTED, fontSize:11, margin:"12px 0 0", lineHeight:1.5 }}>
            🔍 Votre sous-domaine est <strong style={{ color:"#F5F0E8" }}>indexable par Google</strong> et partageable. Il pointe automatiquement vers votre page la plus visitée.
          </p>
        </div>
      )}

      <style>{``}</style>
    </div>
  )
}
