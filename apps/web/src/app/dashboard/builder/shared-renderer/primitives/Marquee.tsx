"use client"
// Marquee — défilement horizontal continu, sans dépendance ni JavaScript d'animation.
// Le contenu est dupliqué une fois puis translaté de -50 % : la boucle est invisible.
// L'animation est désactivée si l'utilisateur a demandé moins d'animations (accessibilité)
// et dans l'éditeur (un canvas qui bouge en permanence gêne la mise en page).
import type { ReactNode } from "react"

const CSS = `@keyframes qfMarquee{0%{transform:translateX(0)}100%{transform:translateX(-50%)}}
.qf-mq{display:flex;width:max-content;animation:qfMarquee var(--qf-mq-dur,26s) linear infinite}
.qf-mq-rev{animation-direction:reverse}
.qf-mq-wrap:hover .qf-mq{animation-play-state:paused}
@media (prefers-reduced-motion:reduce){.qf-mq{animation:none}}`

export function Marquee({ children, durationSec = 26, reverse = false, animate = true, gap = 14, fade = true }: {
  children: ReactNode
  durationSec?: number
  reverse?: boolean
  animate?: boolean
  gap?: number
  fade?: boolean
}) {
  const mask = fade ? "linear-gradient(to right, transparent, #000 8%, #000 92%, transparent)" : undefined
  return (
    <div className="qf-mq-wrap" style={{ overflow: "hidden", width: "100%", maskImage: mask, WebkitMaskImage: mask }}>
      <style dangerouslySetInnerHTML={{ __html: CSS }} />
      <div className={animate ? `qf-mq${reverse ? " qf-mq-rev" : ""}` : undefined}
        style={{ display: "flex", gap, width: animate ? "max-content" : "100%", overflowX: animate ? undefined : "auto", ["--qf-mq-dur" as any]: `${durationSec}s` }}>
        {children}
        {animate && <div aria-hidden style={{ display: "flex", gap }}>{children}</div>}
      </div>
    </div>
  )
}
