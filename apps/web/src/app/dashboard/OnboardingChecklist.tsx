"use client"

import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { Check, X, ChevronRight, Sparkles, ArrowRight } from "lucide-react"
import Link from "next/link"

type Step = {
  id: string
  label: string
  description: string
  emoji: string
  cta: string
  href: string
  check: (data: any) => boolean
}

const STEPS: Step[] = [
  {
    id: "profile",
    label: "Complète ton profil",
    description: "Ajoute ton nom et une photo pour personnaliser ton compte",
    emoji: "👤",
    cta: "Compléter mon profil",
    href: "/dashboard/profile",
    check: (d) => !!(d.profile?.full_name && d.profile?.avatar_url),
  },
  {
    id: "page",
    label: "Crée ta première page",
    description: "Choisis un template et personnalise ta page en 5 minutes",
    emoji: "📄",
    cta: "Choisir un template",
    href: "/dashboard/templates",
    check: (d) => (d.profile?.total_pages || 0) > 0,
  },
  {
    id: "publish",
    label: "Publie ta page",
    description: "Rends ta page accessible à tes visiteurs",
    emoji: "🚀",
    cta: "Voir mes pages",
    href: "/dashboard",
    check: (d) => (d.publishedPages || 0) > 0,
  },
  {
    id: "qr",
    label: "Teste ton QR code",
    description: "Scanne ton QR code avec ton téléphone pour voir ta page",
    emoji: "📱",
    cta: "Voir mes QR codes",
    href: "/dashboard/qr-codes",
    check: (d) => (d.profile?.total_scans || 0) > 0,
  },
  {
    id: "theme",
    label: "Personnalise ton thème",
    description: "Choisis les couleurs et polices qui te ressemblent",
    emoji: "🎨",
    cta: "Ouvrir le builder",
    href: "/dashboard",
    check: (d) => d.hasCustomTheme || false,
  },
]

export default function OnboardingChecklist() {
  const [data, setData] = useState<any>(null)
  const [dismissed, setDismissed] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Check if already dismissed
    const isDismissed = localStorage.getItem("onboarding_dismissed")
    if (isDismissed) { setDismissed(true); setLoading(false); return }

    const supabase = createClient()
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { setLoading(false); return }

      const [{ data: profile }, { data: pages }] = await Promise.all([
        supabase.from("profiles").select("*").eq("id", user.id).single(),
        supabase.from("pages").select("status").eq("user_id", user.id),
      ])

      const publishedPages = (pages || []).filter((p: any) => p.status === "published").length

      setData({ profile, publishedPages })
      setLoading(false)
    }
    load()
  }, [])

  function dismiss() {
    localStorage.setItem("onboarding_dismissed", "1")
    setDismissed(true)
  }

  if (loading || dismissed || !data) return null

  const completedSteps = STEPS.filter(s => s.check(data))
  const progress = completedSteps.length
  const total = STEPS.length
  const pct = Math.round((progress / total) * 100)

  // Si tout est complété, proposer de dismiss automatiquement
  if (progress === total) {
    return (
      <div style={{ background: "linear-gradient(135deg,rgba(57,255,143,0.08),rgba(201,168,76,0.06))", border: "1px solid rgba(57,255,143,0.25)", borderRadius: 16, padding: "20px 24px", marginBottom: 24, display: "flex", alignItems: "center", gap: 16, fontFamily: "DM Sans, sans-serif" }}>
        <div style={{ width: 48, height: 48, borderRadius: "50%", background: "rgba(57,255,143,0.15)", border: "1px solid rgba(57,255,143,0.3)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 24, flexShrink: 0 }}>🎉</div>
        <div style={{ flex: 1 }}>
          <p style={{ color: "#F5F0E8", fontSize: 15, fontWeight: 700, margin: "0 0 2px", fontFamily: "Fraunces, serif" }}>Configuration terminée !</p>
          <p style={{ color: "#A8A190", fontSize: 13, margin: 0 }}>Tu as complété toutes les étapes. QRowg est prêt à être utilisé.</p>
        </div>
        <button onClick={dismiss} style={{ background: "rgba(57,255,143,0.1)", border: "1px solid rgba(57,255,143,0.25)", borderRadius: 8, padding: "8px 16px", color: "var(--success)", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
          Masquer ✓
        </button>
      </div>
    )
  }

  const nextStep = STEPS.find(s => !s.check(data))

  return (
    <div style={{ background: "#111009", border: "1px solid rgba(201,168,76,0.2)", borderRadius: 16, padding: "20px 24px", marginBottom: 24, fontFamily: "DM Sans, sans-serif", position: "relative", overflow: "hidden" }}>
      {/* Background glow */}
      <div style={{ position: "absolute", top: -20, right: -20, width: 120, height: 120, borderRadius: "50%", background: "radial-gradient(circle,rgba(201,168,76,0.08),transparent 70%)", pointerEvents: "none" }} />

      {/* Header */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 16 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ width: 40, height: 40, borderRadius: 10, background: "rgba(201,168,76,0.12)", border: "1px solid rgba(201,168,76,0.25)", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Sparkles size={18} color="#C9A84C" />
          </div>
          <div>
            <p style={{ color: "#F5F0E8", fontSize: 15, fontWeight: 700, margin: 0, fontFamily: "Fraunces, serif" }}>
              Bienvenue sur QRowg ! 👋
            </p>
            <p style={{ color: "#A8A190", fontSize: 12, margin: 0 }}>{progress}/{total} étapes complétées</p>
          </div>
        </div>
        <button onClick={dismiss} title="Masquer" style={{ background: "transparent", border: "none", color: "#A8A190", cursor: "pointer", padding: 4, borderRadius: 4 }}>
          <X size={16} />
        </button>
      </div>

      {/* Progress bar */}
      <div style={{ marginBottom: 18 }}>
        <div style={{ height: 6, background: "rgba(255,255,255,0.05)", borderRadius: 3, overflow: "hidden" }}>
          <div style={{ height: "100%", width: `${pct}%`, background: "linear-gradient(90deg,#C9A84C,var(--success))", borderRadius: 3, transition: "width 0.5s ease" }} />
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", marginTop: 5 }}>
          <span style={{ color: "#A8A190", fontSize: 10 }}>Progression</span>
          <span style={{ color: "#C9A84C", fontSize: 10, fontWeight: 700 }}>{pct}%</span>
        </div>
      </div>

      {/* Steps */}
      <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 16 }}>
        {STEPS.map((step, i) => {
          const done = step.check(data)
          const isNext = step.id === nextStep?.id

          return (
            <div key={step.id}
              style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 12px", background: isNext ? "rgba(201,168,76,0.05)" : done ? "rgba(57,255,143,0.04)" : "rgba(255,255,255,0.02)", border: `1px solid ${isNext ? "rgba(201,168,76,0.2)" : done ? "rgba(57,255,143,0.15)" : "rgba(255,255,255,0.05)"}`, borderRadius: 10, transition: "all 0.15s" }}>

              {/* Status icon */}
              <div style={{ width: 28, height: 28, borderRadius: "50%", background: done ? "rgba(57,255,143,0.15)" : isNext ? "rgba(201,168,76,0.12)" : "rgba(255,255,255,0.05)", border: `1px solid ${done ? "rgba(57,255,143,0.3)" : isNext ? "rgba(201,168,76,0.25)" : "rgba(255,255,255,0.08)"}`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, transition: "all 0.2s" }}>
                {done ? <Check size={13} color="var(--success)" /> : <span style={{ color: done ? "var(--success)" : isNext ? "#C9A84C" : "#A8A190", fontSize: 14 }}>{step.emoji}</span>}
              </div>

              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ color: done ? "#A8A190" : "#F5F0E8", fontSize: 13, fontWeight: done ? 400 : 600, margin: 0, textDecoration: done ? "line-through" : "none", opacity: done ? 0.6 : 1 }}>
                  {step.label}
                </p>
                {!done && <p style={{ color: "#A8A190", fontSize: 11, margin: 0, marginTop: 1 }}>{step.description}</p>}
              </div>

              {!done && isNext && (
                <Link href={step.href} style={{ display: "flex", alignItems: "center", gap: 5, background: "linear-gradient(90deg,#C9A84C,#b8953f)", border: "none", borderRadius: 7, padding: "6px 12px", color: "#080808", fontSize: 11, fontWeight: 700, textDecoration: "none", flexShrink: 0, whiteSpace: "nowrap" }}>
                  {step.cta} <ArrowRight size={10} />
                </Link>
              )}
              {!done && !isNext && (
                <ChevronRight size={14} color="#A8A190" style={{ opacity: 0.4, flexShrink: 0 }} />
              )}
              {done && (
                <span style={{ color: "var(--success)", fontSize: 10, flexShrink: 0 }}>✓ Fait</span>
              )}
            </div>
          )
        })}
      </div>

      {/* Bottom CTA */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", paddingTop: 12, borderTop: "1px solid rgba(255,255,255,0.04)" }}>
        <p style={{ color: "#A8A190", fontSize: 11, margin: 0 }}>
          Plus que {total - progress} étape{total - progress > 1 ? "s" : ""} pour démarrer
        </p>
        <button onClick={dismiss} style={{ background: "transparent", border: "none", color: "#A8A190", fontSize: 11, cursor: "pointer", textDecoration: "underline" }}>
          Masquer pour l'instant
        </button>
      </div>
    </div>
  )
}
