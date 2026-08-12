"use client"

// Onboarding par objectif — wizard : « Que voulez-vous accomplir ? » → une page pré-remplie
// (blocs + CTA), un QR et un objectif de conversion sont générés, puis on atterrit dans le builder.
// Réutilise POST /api/templates/use (page+blocs+QR, validation BLOCK_DEFS, quotas) + POST /api/goals.
import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { ArrowLeft, Sparkles } from "lucide-react"
import Particles from "@/components/Particles"
import { OBJECTIVES, type Objective } from "./objectives"

const G = "var(--accent)"
const INK = "#F5F0E8"
const MUT = "#A8A190"

export default function OnboardingClient() {
  const router = useRouter()
  const [busy, setBusy] = useState<string | null>(null)
  const [err, setErr] = useState<string | null>(null)

  async function pick(o: Objective) {
    if (busy) return
    setBusy(o.key); setErr(null)
    try {
      const res = await fetch("/api/templates/use", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ templateId: `goal_${o.key}`, templateName: `Ma page — ${o.label}`, theme: {}, blocks: o.blocks }),
      })
      const d = await res.json().catch(() => ({} as any))
      if (!res.ok || !d.pageId) { setErr(d.message || d.error || "Création impossible pour le moment."); setBusy(null); return }
      // Objectif de conversion (best-effort : ne bloque pas la redirection vers le builder).
      if (o.goal) {
        fetch("/api/goals", {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: o.goal.name, goal_type: o.goal.goal_type, target_match: o.goal.target_match, page_id: d.pageId }),
        }).catch(() => {})
      }
      router.push(`/dashboard/builder/${d.pageId}`)
    } catch {
      setErr("Erreur réseau. Réessayez."); setBusy(null)
    }
  }

  const card: React.CSSProperties = {
    position: "relative", textAlign: "left", background: "rgba(255,255,255,0.025)",
    border: "1px solid rgba(201,168,76,0.16)", borderRadius: 18, padding: "20px 20px 18px",
    cursor: "pointer", transition: "transform .15s var(--mo-ease-spring), border-color .15s, background .15s",
    display: "flex", flexDirection: "column", gap: 8, minHeight: 150,
  }

  return (
    <div style={{ position: "relative", minHeight: "100dvh", padding: "0 22px 60px", overflowX: "hidden" }}>
      <Particles behind />

      <div style={{ position: "relative", zIndex: 1, maxWidth: 900, margin: "0 auto" }}>
        <div style={{ paddingTop: 26, marginBottom: 6 }}>
          <Link href="/dashboard" style={{ display: "inline-flex", alignItems: "center", gap: 6, color: MUT, textDecoration: "none", fontSize: 13 }}>
            <ArrowLeft size={16} /> Retour
          </Link>
        </div>

        <div style={{ textAlign: "center", maxWidth: 640, margin: "8px auto 34px" }}>
          <p style={{ color: G, fontSize: 12, fontWeight: 800, letterSpacing: "0.16em", textTransform: "uppercase", display: "inline-flex", alignItems: "center", gap: 7 }}>
            <Sparkles size={14} /> Création guidée
          </p>
          <h1 style={{ color: INK, fontSize: "clamp(26px,5vw,40px)", fontWeight: 800, letterSpacing: "-0.02em", lineHeight: 1.12, margin: "12px 0 12px", textWrap: "balance" }}>
            Que voulez-vous accomplir ?
          </h1>
          <p style={{ color: MUT, fontSize: "clamp(14px,2.2vw,16px)", lineHeight: 1.6, margin: 0 }}>
            Choisissez votre objectif — on génère la page, les blocs, le QR et le suivi qui vont avec. Vous personnalisez ensuite.
          </p>
        </div>

        {err && (
          <div style={{ maxWidth: 640, margin: "0 auto 20px", background: "rgba(255,107,107,0.08)", border: "1px solid rgba(255,107,107,0.3)", borderRadius: 12, padding: "12px 16px", color: "#FF9B9B", fontSize: 13.5, textAlign: "center" }}>{err}</div>
        )}

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 14 }}>
          {OBJECTIVES.map(o => {
            const loading = busy === o.key
            return (
              <button key={o.key} type="button" onClick={() => pick(o)} disabled={busy !== null}
                style={{ ...card, opacity: busy && !loading ? 0.5 : 1, cursor: busy ? "default" : "pointer" }}
                onMouseEnter={e => { if (!busy) { const el = e.currentTarget; el.style.transform = "translateY(-3px)"; el.style.borderColor = "color-mix(in srgb, var(--accent) 45%, transparent)"; el.style.background = "rgba(201,168,76,0.06)" } }}
                onMouseLeave={e => { const el = e.currentTarget; el.style.transform = "none"; el.style.borderColor = "rgba(201,168,76,0.16)"; el.style.background = "rgba(255,255,255,0.025)" }}>
                <span style={{ fontSize: 30, lineHeight: 1 }}>{o.emoji}</span>
                <span style={{ color: INK, fontSize: 16.5, fontWeight: 800 }}>{o.label}</span>
                <span style={{ color: MUT, fontSize: 13, lineHeight: 1.5, flex: 1 }}>{o.desc}</span>
                <span style={{ display: "inline-flex", alignItems: "center", gap: 7, color: G, fontSize: 12.5, fontWeight: 700, marginTop: 2 }}>
                  {loading ? (
                    <><span style={{ width: 13, height: 13, border: "2px solid rgba(201,168,76,0.3)", borderTopColor: "var(--accent)", borderRadius: "50%", display: "inline-block", animation: "mo-spin 0.7s linear infinite" }} /> Création…</>
                  ) : (
                    <>{o.cta} →</>
                  )}
                </span>
              </button>
            )
          })}
        </div>

        <p style={{ textAlign: "center", color: "#6E685E", fontSize: 12.5, marginTop: 26 }}>
          Vous préférez partir d'un modèle ? <Link href="/dashboard/templates" style={{ color: G, textDecoration: "none", fontWeight: 700 }}>Voir la galerie</Link> · ou <Link href="/dashboard/builder/new" style={{ color: MUT, textDecoration: "none" }}>page vierge</Link>
        </p>
      </div>
    </div>
  )
}
