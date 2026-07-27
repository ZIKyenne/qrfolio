"use client"

import { useState, useMemo } from "react"
import { createClient } from "@/lib/supabase/client"
import { Inbox, Mail, Phone, Trash2, Check, Search } from "lucide-react"
import Particles from "@/components/Particles"

const G = "var(--accent, #C9A84C)"
const MUTED = "#A8A190"
const TEXT = "#F5F0E8"

type Lead = {
  id: string; page_id: string; block_id: string | null; type: string
  name: string | null; email: string | null; phone: string | null
  message: string | null; data: Record<string, any>; is_read: boolean; status?: string; created_at: string
}
type Page = { id: string; title: string; slug: string }

// Statuts = états sémantiques -> tokens du design system (action / alerte / succès)
const STATUSES: { key: string; label: string; color: string }[] = [
  { key: "new", label: "Nouveau", color: "var(--action)" },
  { key: "in_progress", label: "En cours", color: "var(--warning)" },
  { key: "done", label: "Traité", color: "var(--success)" },
]

const TYPE_LABELS: Record<string, string> = {
  quote: "Devis", reservation: "Réservation", booking: "Réservation événement",
  register: "Inscription", rsvp: "RSVP", form: "Message",
}
const TYPE_COLORS: Record<string, string> = {
  quote: "#C9A84C", reservation: "#EF4444", booking: "#9146FF",
  register: "#EC4899", rsvp: "var(--success)", form: "var(--action)",
}

function fmtDate(iso: string) {
  const d = new Date(iso)
  return d.toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric" }) + " · " +
    d.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })
}

export default function LeadsClient({ leads: initialLeads, pages, setupNeeded }: { leads: Lead[]; pages: Page[]; setupNeeded?: boolean }) {
  const [leads, setLeads] = useState<Lead[]>(initialLeads)
  const [filter, setFilter] = useState<string>("all")
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [query, setQuery] = useState("")
  const supabase = createClient()

  const pageTitle = (id: string) => pages.find(p => p.id === id)?.title || "Page"

  const unreadCount = leads.filter(l => !l.is_read).length

  const filtered = useMemo(() => {
    return leads.filter(l => {
      if (filter === "unread" && l.is_read) return false
      if (filter !== "all" && filter !== "unread" && l.type !== filter) return false
      if (statusFilter !== "all" && (l.status || "new") !== statusFilter) return false
      if (query) {
        const q = query.toLowerCase()
        const hay = [l.name, l.email, l.phone, l.message, JSON.stringify(l.data)].join(" ").toLowerCase()
        if (!hay.includes(q)) return false
      }
      return true
    })
  }, [leads, filter, statusFilter, query])

  const setStatus = async (id: string, status: string) => {
    // Passer un lead hors de "nouveau" le marque aussi comme lu (il a été traité/vu)
    const is_read = status !== "new"
    setLeads(prev => prev.map(l => l.id === id ? { ...l, status, is_read: is_read || l.is_read } : l))
    await supabase.from("leads").update({ status, ...(is_read ? { is_read: true } : {}) }).eq("id", id)
  }
  const remove = async (id: string) => {
    const lead = leads.find(l => l.id === id)
    if (!window.confirm(`Supprimer définitivement ce message${lead?.name ? ` de ${lead.name}` : ""} ?\n\nCette action est irréversible.`)) return
    setLeads(prev => prev.filter(l => l.id !== id))
    await supabase.from("leads").delete().eq("id", id)
  }
  const exportCsv = () => {
    const rows = [["Date", "Type", "Page", "Nom", "Email", "Téléphone", "Message", "Détails"]]
    filtered.forEach(l => rows.push([
      fmtDate(l.created_at), TYPE_LABELS[l.type] || l.type, pageTitle(l.page_id),
      l.name || "", l.email || "", l.phone || "", (l.message || "").replace(/\n/g, " "),
      Object.entries(l.data || {}).map(([k, v]) => `${k}=${v}`).join("; "),
    ]))
    const csv = rows.map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n")
    const url = URL.createObjectURL(new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8" }))
    const a = document.createElement("a")
    a.href = url; a.download = `messages-qrfolio.csv`; a.click()
    URL.revokeObjectURL(url)
  }

  const types = ["all", "unread", ...Array.from(new Set(leads.map(l => l.type)))]

  return (
    <div style={{ minHeight: "100dvh", position: "relative", fontFamily: "DM Sans, sans-serif" }}>
      {/* Particules dorées en fond (comme les autres pages du dashboard) */}
      <Particles />
      <div className="rpad" style={{ padding: "28px 24px 60px", maxWidth: 900, margin: "0 auto", position: "relative", zIndex: 1 }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16, marginBottom: 6, flexWrap: "wrap" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ width: 40, height: 40, borderRadius: 11, background: `color-mix(in srgb, ${G} 14%, transparent)`, border: `1px solid color-mix(in srgb, ${G} 30%, transparent)`, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Inbox size={20} color={G as string} />
          </div>
          <div>
            <h1 style={{ color: TEXT, fontSize: 24, fontWeight: 700, margin: 0, fontFamily: "Fraunces, serif" }}>Messages</h1>
            <p style={{ color: MUTED, fontSize: 13, margin: 0 }}>{leads.length} reçu{leads.length > 1 ? "s" : ""}{unreadCount > 0 ? ` · ${unreadCount} non lu${unreadCount > 1 ? "s" : ""}` : ""}</p>
          </div>
        </div>
        {leads.length > 0 && (
          <button onClick={exportCsv} style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 9, padding: "9px 14px", color: TEXT, fontSize: 13, fontWeight: 600, cursor: "pointer" }}>↓ Exporter CSV</button>
        )}
      </div>

      {setupNeeded && (
        <div style={{ marginTop: 20, padding: "18px 20px", background: "var(--warning-bg)", border: "1px solid var(--warning-border)", borderRadius: 14 }}>
          <p style={{ color: "var(--warning)", fontSize: 14, fontWeight: 700, margin: "0 0 6px" }}>⚙ Messagerie à activer</p>
          <p style={{ color: MUTED, fontSize: 13, margin: "0 0 10px", lineHeight: 1.6 }}>
            La table <code style={{ color: TEXT }}>leads</code> n&apos;existe pas encore en base. Exécutez la migration <code style={{ color: TEXT }}>016_leads</code> dans Supabase (SQL Editor) pour recevoir et stocker les messages de vos pages. Les notifications par email nécessitent en plus la variable <code style={{ color: TEXT }}>RESEND_API_KEY</code> sur Vercel.
          </p>
          <p style={{ color: "#8A8478", fontSize: 11, margin: 0 }}>Fichier : supabase/migrations/20260701_016_leads.sql</p>
        </div>
      )}

      {leads.length === 0 ? (
        <div style={{ marginTop: 40, textAlign: "center", padding: "50px 20px", background: "rgba(255,255,255,0.02)", border: "1px dashed rgba(255,255,255,0.1)", borderRadius: 16 }}>
          <Inbox size={40} color={MUTED} style={{ marginBottom: 14 }} />
          <p style={{ color: TEXT, fontSize: 16, fontWeight: 600, margin: "0 0 6px" }}>Aucun message pour l&apos;instant</p>
          <p style={{ color: MUTED, fontSize: 13, margin: 0, maxWidth: 380, marginInline: "auto", lineHeight: 1.6 }}>
            Les demandes de devis, réservations, inscriptions et réponses RSVP envoyées depuis vos pages publiques apparaîtront ici.
          </p>
        </div>
      ) : (
        <>
          {/* Filtres + recherche */}
          <div style={{ display: "flex", gap: 8, alignItems: "center", margin: "20px 0 16px", flexWrap: "wrap" }}>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              {types.map(t => (
                <button key={t} onClick={() => setFilter(t)} style={{
                  background: filter === t ? `color-mix(in srgb, ${G} 16%, transparent)` : "rgba(255,255,255,0.04)",
                  border: `1px solid ${filter === t ? `color-mix(in srgb, ${G} 35%, transparent)` : "rgba(255,255,255,0.08)"}`,
                  borderRadius: 20, padding: "6px 13px", color: filter === t ? (G as string) : MUTED, fontSize: 12, fontWeight: 600, cursor: "pointer",
                }}>
                  {t === "all" ? "Tous" : t === "unread" ? `Non lus${unreadCount ? ` (${unreadCount})` : ""}` : TYPE_LABELS[t] || t}
                </button>
              ))}
            </div>
            <div style={{ position: "relative", marginLeft: "auto", minWidth: 180 }}>
              <Search size={14} color={MUTED} style={{ position: "absolute", left: 11, top: "50%", transform: "translateY(-50%)" }} />
              <input value={query} onChange={e => setQuery(e.target.value)} placeholder="Rechercher…" style={{ width: "100%", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 9, padding: "8px 12px 8px 32px", color: TEXT, fontSize: 13, outline: "none", boxSizing: "border-box" }} />
            </div>
          </div>

          {/* Filtre par statut (pipeline) */}
          <div style={{ display: "flex", gap: 6, marginBottom: 16, flexWrap: "wrap" }}>
            {[{ key: "all", label: "Tous les statuts", color: MUTED }, ...STATUSES].map(s => {
              const n = s.key === "all" ? leads.length : leads.filter(l => (l.status || "new") === s.key).length
              return (
                <button key={s.key} onClick={() => setStatusFilter(s.key)} style={{
                  display: "inline-flex", alignItems: "center", gap: 6,
                  background: statusFilter === s.key ? `color-mix(in srgb, ${s.color} 16%, transparent)` : "rgba(255,255,255,0.03)",
                  border: `1px solid ${statusFilter === s.key ? `color-mix(in srgb, ${s.color} 40%, transparent)` : "rgba(255,255,255,0.07)"}`,
                  borderRadius: 9, padding: "6px 12px", color: statusFilter === s.key ? s.color : MUTED, fontSize: 12, fontWeight: 600, cursor: "pointer",
                }}>
                  {s.key !== "all" && <span style={{ width: 7, height: 7, borderRadius: "50%", background: s.color }} />}
                  {s.label} <span style={{ opacity: 0.7 }}>· {n}</span>
                </button>
              )
            })}
          </div>

          {/* Liste */}
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {filtered.map(l => {
              const tc = TYPE_COLORS[l.type] || G as string
              const extra = Object.entries(l.data || {}).filter(([k]) => !["nom", "email", "telephone"].includes(k.toLowerCase()))
              return (
                <div key={l.id} style={{
                  background: l.is_read ? "rgba(255,255,255,0.02)" : "rgba(255,255,255,0.04)",
                  border: `1px solid ${l.is_read ? "rgba(255,255,255,0.07)" : `color-mix(in srgb, ${tc} 30%, transparent)`}`,
                  borderRadius: 14, padding: "15px 16px",
                }}>
                  <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12, marginBottom: 8 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 9, flexWrap: "wrap" }}>
                      {!l.is_read && <span style={{ width: 8, height: 8, borderRadius: "50%", background: tc, flexShrink: 0 }} />}
                      <span style={{ background: `color-mix(in srgb, ${tc} 14%, transparent)`, border: `1px solid color-mix(in srgb, ${tc} 30%, transparent)`, borderRadius: 20, padding: "3px 10px", color: tc, fontSize: 11, fontWeight: 700 }}>{TYPE_LABELS[l.type] || l.type}</span>
                      <span style={{ color: MUTED, fontSize: 12 }}>{pageTitle(l.page_id)}</span>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
                      <span style={{ color: MUTED, fontSize: 11 }}>{fmtDate(l.created_at)}</span>
                      <button title="Supprimer" onClick={() => remove(l.id)} style={{ background: "transparent", border: "none", cursor: "pointer", color: MUTED, width: 32, height: 32, display: "inline-flex", alignItems: "center", justifyContent: "center", borderRadius: 8, flexShrink: 0 }}><Trash2 size={15} /></button>
                    </div>
                  </div>

                  {/* Pipeline : statut du lead */}
                  <div style={{ display: "flex", gap: 4, marginBottom: (l.name || l.message) ? 10 : 0 }}>
                    {STATUSES.map(s => {
                      const on = (l.status || "new") === s.key
                      return (
                        <button key={s.key} onClick={() => setStatus(l.id, s.key)} style={{
                          display: "inline-flex", alignItems: "center", gap: 5,
                          background: on ? `color-mix(in srgb, ${s.color} 18%, transparent)` : "rgba(255,255,255,0.03)",
                          border: `1px solid ${on ? `color-mix(in srgb, ${s.color} 45%, transparent)` : "rgba(255,255,255,0.07)"}`,
                          borderRadius: 8, padding: "5px 10px", color: on ? s.color : MUTED, fontSize: 11, fontWeight: on ? 700 : 500, cursor: "pointer",
                        }}>
                          {on && <Check size={11} />}{s.label}
                        </button>
                      )
                    })}
                  </div>

                  {l.name && <p style={{ color: TEXT, fontSize: 15, fontWeight: 700, margin: "0 0 4px" }}>{l.name}</p>}
                  {l.message && <p style={{ color: TEXT, fontSize: 13, margin: "0 0 8px", lineHeight: 1.5, whiteSpace: "pre-wrap" }}>{l.message}</p>}

                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: extra.length ? 8 : 0 }}>
                    {l.email && <a href={`mailto:${l.email}`} style={{ display: "inline-flex", alignItems: "center", gap: 6, background: "var(--action-bg)", border: "1px solid var(--action-border)", borderRadius: 8, padding: "6px 11px", color: "var(--action)", textDecoration: "none", fontSize: 12, fontWeight: 600 }}><Mail size={12} /> {l.email}</a>}
                    {l.phone && <a href={`tel:${l.phone}`} style={{ display: "inline-flex", alignItems: "center", gap: 6, background: "var(--success-bg)", border: "1px solid var(--success-border)", borderRadius: 8, padding: "6px 11px", color: "var(--success)", textDecoration: "none", fontSize: 12, fontWeight: 600 }}><Phone size={12} /> {l.phone}</a>}
                  </div>

                  {extra.length > 0 && (
                    <div style={{ display: "flex", flexDirection: "column", gap: 3, background: "rgba(0,0,0,0.2)", borderRadius: 9, padding: "9px 12px" }}>
                      {extra.map(([k, v]) => (
                        <div key={k} style={{ display: "flex", justifyContent: "space-between", gap: 12, fontSize: 12 }}>
                          <span style={{ color: MUTED }}>{k}</span>
                          <span style={{ color: TEXT, fontWeight: 500, textAlign: "right" }}>{String(v)}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )
            })}
            {filtered.length === 0 && <p style={{ color: MUTED, fontSize: 13, textAlign: "center", padding: "30px" }}>Aucun message ne correspond à ce filtre.</p>}
          </div>
        </>
      )}
      </div>
    </div>
  )
}
