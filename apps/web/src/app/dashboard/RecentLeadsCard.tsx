"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { createClient } from "@/lib/supabase/client"
import { Inbox, ArrowRight } from "lucide-react"

const MUTED = "#A8A190"

type Lead = { id: string; type: string; name: string | null; message: string | null; is_read: boolean; created_at: string }

const TYPE_LABELS: Record<string, string> = {
  quote: "Devis", reservation: "Réservation", booking: "Réservation événement",
  register: "Inscription", rsvp: "RSVP", form: "Message",
}
const TYPE_COLORS: Record<string, string> = {
  quote: "#C9A84C", reservation: "#EF4444", booking: "#9146FF",
  register: "#EC4899", rsvp: "var(--success)", form: "var(--action)",
}

function ago(iso: string) {
  const s = Math.floor((Date.now() - new Date(iso).getTime()) / 1000)
  if (s < 60) return "à l'instant"
  if (s < 3600) return `il y a ${Math.floor(s / 60)} min`
  if (s < 86400) return `il y a ${Math.floor(s / 3600)} h`
  const d = Math.floor(s / 86400)
  if (d < 30) return `il y a ${d} j`
  return new Date(iso).toLocaleDateString("fr-FR", { day: "2-digit", month: "short" })
}

export default function RecentLeadsCard() {
  const [leads, setLeads] = useState<Lead[] | null>(null)
  const [unread, setUnread] = useState(0)

  useEffect(() => {
    const sb = createClient()
    sb.from("leads").select("id, type, name, message, is_read, created_at").order("created_at", { ascending: false }).limit(5)
      .then(({ data }: any) => {
        setLeads(data || [])
        setUnread((data || []).filter((l: Lead) => !l.is_read).length)
      })
  }, [])

  // Rien à afficher tant qu'aucun message n'a été reçu (on n'encombre pas un dashboard vide)
  if (!leads || leads.length === 0) return null

  return (
    <div className="dz dz-card" style={{ animationDelay: "150ms", marginBottom: 20, background: "linear-gradient(180deg,#13110B,#100F0A)", border: "1px solid color-mix(in srgb, var(--accent) 22%, transparent)", borderRadius: 16, overflow: "hidden", boxShadow: "0 8px 30px rgba(0,0,0,0.25)", position: "relative" }}>
      <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 2, background: "linear-gradient(90deg, transparent, var(--accent), transparent)" }} />
      <div style={{ padding: "16px 20px", borderBottom: "1px solid rgba(255,255,255,0.05)", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
          <span style={{ color: "var(--accent)", background: "color-mix(in srgb, var(--accent) 12%, transparent)", borderRadius: 8, padding: 7, display: "flex" }}><Inbox size={16} /></span>
          <p style={{ color: "#F8F4EC", fontSize: 15.5, fontWeight: 700, margin: 0, letterSpacing: "-0.2px" }}>
            Derniers messages{unread > 0 && <span style={{ marginLeft: 8, background: "#EF4444", color: "#fff", fontSize: 10, fontWeight: 700, borderRadius: 9, padding: "1px 7px", verticalAlign: "middle" }}>{unread} non lu{unread > 1 ? "s" : ""}</span>}
          </p>
        </div>
        <Link href="/dashboard/leads" style={{ display: "inline-flex", alignItems: "center", gap: 5, color: "var(--accent)", fontSize: 12.5, fontWeight: 600, textDecoration: "none" }}>
          Tout voir <ArrowRight size={13} />
        </Link>
      </div>
      <div>
        {leads.map((l, i) => {
          const tc = TYPE_COLORS[l.type] || "#C9A84C"
          return (
            <Link key={l.id} href="/dashboard/leads" style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 20px", borderBottom: i < leads.length - 1 ? "1px solid rgba(255,255,255,0.04)" : "none", textDecoration: "none" }}>
              {!l.is_read && <span style={{ width: 7, height: 7, borderRadius: "50%", background: tc, flexShrink: 0 }} />}
              <span style={{ background: `color-mix(in srgb, ${tc} 14%, transparent)`, border: `1px solid color-mix(in srgb, ${tc} 30%, transparent)`, borderRadius: 20, padding: "2px 9px", color: tc, fontSize: 10.5, fontWeight: 700, flexShrink: 0 }}>{TYPE_LABELS[l.type] || l.type}</span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ color: "#F5F0E8", fontSize: 13, fontWeight: l.is_read ? 500 : 700, margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{l.name || l.message || "Nouveau message"}</p>
              </div>
              <span style={{ color: MUTED, fontSize: 11, flexShrink: 0 }}>{ago(l.created_at)}</span>
            </Link>
          )
        })}
      </div>
    </div>
  )
}
