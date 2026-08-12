"use client"

// Onboarding par objectif — wizard 2 étapes : objectif → secteur (facultatif) → génération.
// On génère une page pré-remplie (blocs + CTA) + un QR + un objectif de conversion, puis on
// atterrit dans le builder. Réutilise POST /api/templates/use + POST /api/goals (aucune migration).
import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { ArrowLeft, Sparkles } from "lucide-react"
import Particles from "@/components/Particles"
import { OBJECTIVES, SECTORS, composeRecipe, type Objective, type Sector } from "./objectives"

const G = "var(--accent)"
const INK = "#F5F0E8"
const MUT = "#A8A190"

export default function OnboardingClient() {
  const router = useRouter()
  const [chosen, setChosen] = useState<Objective | null>(null)
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  async function generate(o: Objective, s?: Sector) {
    if (busy) return
    setBusy(true); setErr(null)
    const { templateName, blocks, goal } = composeRecipe(o, s)
    try {
      const res = await fetch("/api/templates/use", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ templateId: `goal_${o.key}${s ? "_" + s.key : ""}`, templateName, theme: {}, blocks }),
      })
      const d = await res.json().catch(() => ({} as any))
      if (!res.ok || !d.pageId) { setErr(d.message || d.error || "Création impossible pour le moment."); setBusy(false); return }
      if (goal) {
        fetch("/api/goals", {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: goal.name, goal_type: goal.goal_type, target_match: goal.target_match, page_id: d.pageId }),
        }).catch(() => {})
      }
      router.push(`/dashboard/builder/${d.pageId}`)
    } catch {
      setErr("Erreur réseau. Réessayez."); setBusy(false)
    }
  }

  const tile: React.CSSProperties = {
    position: "relative", textAlign: "left", background: "rgba(255,255,255,0.025)",
    border: "1px solid rgba(201,168,76,0.16)", borderRadius: 18, padding: "20px 20px 18px",
    cursor: "pointer", transition: "transform .15s var(--mo-ease-spring), border-color .15s, background .15s",
    display: "flex", flexDirection: "column", gap: 8,
  }
  const hoverIn = (e: React.MouseEvent) => { if (busy) return; const el = e.currentTarget as HTMLElement; el.style.transform = "translateY(-3px)"; el.style.borderColor = "color-mix(in srgb, var(--accent) 45%, transparent)"; el.style.background = "rgba(201,168,76,0.06)" }
  const hoverOut = (e: React.MouseEvent) => { const el = e.currentTarget as HTMLElement; el.style.transform = "none"; el.style.borderColor = "rgba(201,168,76,0.16)"; el.style.background = "rgba(255,255,255,0.025)" }

  return (
    <div style={{ position: "relative", minHeight: "100dvh", padding: "0 22px 60px", overflowX: "hidden" }}>
      <Particles behind />

      {busy && (
        <div style={{ position: "fixed", inset: 0, zIndex: 200, background: "rgba(8,8,8,0.72)", backdropFilter: "blur(4px)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 16 }}>
          <div style={{ width: 30, height: 30, border: "3px solid rgba(201,168,76,0.25)", borderTopColor: "var(--accent)", borderRadius: "50%", animation: "mo-spin 0.8s linear infinite" }} />
          <p style={{ color: INK, fontSize: 15, fontWeight: 700, margin: 0 }}>Création de votre page…</p>
          <p style={{ color: MUT, fontSize: 12.5, margin: 0 }}>Page + blocs + QR + objectif</p>
        </div>
      )}

      <div style={{ position: "relative", zIndex: 1, maxWidth: 900, margin: "0 auto" }}>
        <div style={{ paddingTop: 26, marginBottom: 6 }}>
          {chosen ? (
            <button type="button" onClick={() => { if (!busy) setChosen(null) }} style={{ display: "inline-flex", alignItems: "center", gap: 6, color: MUT, background: "none", border: "none", cursor: "pointer", fontSize: 13, padding: 0 }}>
              <ArrowLeft size={16} /> Changer d'objectif
            </button>
          ) : (
            <Link href="/dashboard" style={{ display: "inline-flex", alignItems: "center", gap: 6, color: MUT, textDecoration: "none", fontSize: 13 }}>
              <ArrowLeft size={16} /> Retour
            </Link>
          )}
        </div>

        {/* En-tête */}
        <div style={{ textAlign: "center", maxWidth: 660, margin: "8px auto 30px" }}>
          <p style={{ color: G, fontSize: 12, fontWeight: 800, letterSpacing: "0.16em", textTransform: "uppercase", display: "inline-flex", alignItems: "center", gap: 7 }}>
            <Sparkles size={14} /> Création guidée{chosen ? " · étape 2/2" : ""}
          </p>
          <h1 style={{ color: INK, fontSize: "clamp(24px,4.6vw,38px)", fontWeight: 800, letterSpacing: "-0.02em", lineHeight: 1.12, margin: "12px 0 12px", textWrap: "balance" }}>
            {chosen ? <>Vous êtes plutôt… <span style={{ color: G }}>{chosen.emoji} {chosen.label.toLowerCase()}</span></> : "Que voulez-vous accomplir ?"}
          </h1>
          <p style={{ color: MUT, fontSize: "clamp(14px,2.2vw,16px)", lineHeight: 1.6, margin: 0 }}>
            {chosen ? "Choisissez votre secteur pour un pré-remplissage plus juste — ou générez sans préciser." : "Choisissez votre objectif — on génère la page, les blocs, le QR et le suivi qui vont avec."}
          </p>
        </div>

        {err && (
          <div style={{ maxWidth: 640, margin: "0 auto 20px", background: "rgba(255,107,107,0.08)", border: "1px solid rgba(255,107,107,0.3)", borderRadius: 12, padding: "12px 16px", color: "#FF9B9B", fontSize: 13.5, textAlign: "center" }}>{err}</div>
        )}

        {/* Étape 1 — objectif */}
        {!chosen && (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 14 }}>
            {OBJECTIVES.map(o => (
              <button key={o.key} type="button" onClick={() => setChosen(o)} style={{ ...tile, minHeight: 150 }} onMouseEnter={hoverIn} onMouseLeave={hoverOut}>
                <span style={{ fontSize: 30, lineHeight: 1 }}>{o.emoji}</span>
                <span style={{ color: INK, fontSize: 16.5, fontWeight: 800 }}>{o.label}</span>
                <span style={{ color: MUT, fontSize: 13, lineHeight: 1.5, flex: 1 }}>{o.desc}</span>
                <span style={{ color: G, fontSize: 12.5, fontWeight: 700, marginTop: 2 }}>{o.cta} →</span>
              </button>
            ))}
          </div>
        )}

        {/* Étape 2 — secteur (facultatif) */}
        {chosen && (
          <>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 12 }}>
              {SECTORS.map(s => (
                <button key={s.key} type="button" disabled={busy} onClick={() => generate(chosen, s)} style={{ ...tile, minHeight: 96, flexDirection: "row", alignItems: "center", gap: 13 }} onMouseEnter={hoverIn} onMouseLeave={hoverOut}>
                  <span style={{ fontSize: 26, lineHeight: 1, flexShrink: 0 }}>{s.emoji}</span>
                  <span style={{ display: "flex", flexDirection: "column", gap: 2, minWidth: 0 }}>
                    <span style={{ color: INK, fontSize: 15, fontWeight: 800, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{s.label}</span>
                    <span style={{ color: MUT, fontSize: 12 }}>{s.tagline}</span>
                  </span>
                </button>
              ))}
            </div>
            <div style={{ textAlign: "center", marginTop: 20 }}>
              <button type="button" disabled={busy} onClick={() => generate(chosen)} style={{ background: "none", border: "none", color: MUT, cursor: busy ? "default" : "pointer", fontSize: 13.5, fontWeight: 600, textDecoration: "underline", textUnderlineOffset: 3 }}>
                Générer sans préciser le secteur
              </button>
            </div>
          </>
        )}

        {!chosen && (
          <p style={{ textAlign: "center", color: "#6E685E", fontSize: 12.5, marginTop: 26 }}>
            Vous préférez partir d'un modèle ? <Link href="/dashboard/templates" style={{ color: G, textDecoration: "none", fontWeight: 700 }}>Voir la galerie</Link> · ou <Link href="/dashboard/builder/new" style={{ color: MUT, textDecoration: "none" }}>page vierge</Link>
          </p>
        )}
      </div>
    </div>
  )
}
