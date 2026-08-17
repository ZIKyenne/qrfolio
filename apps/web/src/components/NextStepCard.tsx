import Link from "next/link"
import { ArrowRight } from "lucide-react"
import type { ReactNode, CSSProperties } from "react"

/**
 * Carte « prochaine étape » de l'assistant : icône + une phrase + un seul CTA.
 * Source unique pour les nudges contextuels homogènes (Dashboard, Profil…).
 * Fournir soit `href` (rendu <Link>), soit `onClick` (rendu <button>).
 */
export default function NextStepCard({
  icon, children, ctaLabel, href, onClick, animationDelay,
}: {
  icon: ReactNode           // emoji (string) ou icône lucide — les deux rendent dans la pastille
  children: ReactNode
  ctaLabel: string
  href?: string
  onClick?: () => void
  animationDelay?: string
}) {
  const cta: CSSProperties = { flexShrink: 0, textDecoration: "none" }
  return (
    <div style={{
      display: "flex", alignItems: "center", gap: 13, flexWrap: "wrap",
      padding: "14px 18px", borderRadius: 14, animationDelay,
      background: "#141210",
      border: "1px solid color-mix(in srgb, var(--accent) 22%, #221f1b)",
    }}>
      <span style={{ width: 36, height: 36, flexShrink: 0, borderRadius: 10, display: "inline-flex", alignItems: "center", justifyContent: "center", fontSize: 17, color: "var(--accent)", background: "color-mix(in srgb, var(--accent) 12%, transparent)", border: "1px solid color-mix(in srgb, var(--accent) 26%, transparent)" }}>{icon}</span>
      <p style={{ flex: 1, minWidth: 160, margin: 0, color: "#C9C3B6", fontSize: 13.5, lineHeight: 1.5 }}>{children}</p>
      {href
        ? <Link href={href} className="da-btn-primary da-btn-primary--sm" style={cta}><span>{ctaLabel}</span> <ArrowRight className="da-ic da-ic-arrow" size={14} strokeWidth={2.5} /></Link>
        : <button type="button" onClick={onClick} className="da-btn-primary da-btn-primary--sm"><span>{ctaLabel}</span> <ArrowRight className="da-ic da-ic-arrow" size={14} strokeWidth={2.5} /></button>}
    </div>
  )
}
