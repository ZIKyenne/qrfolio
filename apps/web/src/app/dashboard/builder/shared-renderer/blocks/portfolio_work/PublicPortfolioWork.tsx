"use client"
import { portfolioWorkViewModel } from "../../models/portfolioWork"
import { PublicCtaLink } from "../../primitives/BlockCtaLink"
import type { PublicAdapterProps } from "../../renderTypes"

export function PublicPortfolioWork({ content, ctx }: PublicAdapterProps) {
  const { visible, title, items, ctaLabel, link } = portfolioWorkViewModel(content)
  if (!visible) return null
  const { G, TEXT, MUTED, FONT_B, trackClick } = ctx
  return (
    <div style={{ padding: "10px 24px 14px" }}>
      {title && <p style={{ color: MUTED, fontSize: 11, textTransform: "uppercase", letterSpacing: 2, margin: "0 0 12px", fontFamily: FONT_B }}>{title}</p>}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 9 }}>
        {items.map((w, i) => (
          <div key={i} style={{ borderRadius: 11, overflow: "hidden", background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)" }}>
            {w.img
              ? <img onError={e => { e.currentTarget.style.display = 'none' }} loading="lazy" decoding="async" src={w.img} alt="" style={{ width: "100%", height: 100, objectFit: "cover", display: "block" }} />
              : <div style={{ height: 100, background: `${G}08`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 28 }}>📂</div>}
            <div style={{ padding: "9px 10px" }}>
              <p style={{ color: TEXT, fontSize: 12, fontWeight: 700, margin: "0 0 2px", fontFamily: FONT_B }}>{w.title}</p>
              {w.desc && <p style={{ color: MUTED, fontSize: 13.5, margin: 0 }}>{w.desc}</p>}
            </div>
          </div>
        ))}
      </div>
      {ctaLabel && (link.href
        ? <PublicCtaLink href={link.href} external={link.external} trackTarget={link.trackTarget} trackClick={trackClick} style={{ display: "block", marginTop: 11, background: `${G}10`, border: `1px solid ${G}25`, borderRadius: 10, padding: "12px", textAlign: "center", fontSize: 13, fontWeight: 700, color: G, textDecoration: "none" }}>{ctaLabel}</PublicCtaLink>
        : <div style={{ marginTop: 11, background: `${G}10`, border: `1px solid ${G}25`, borderRadius: 10, padding: "12px", textAlign: "center", fontSize: 13, fontWeight: 700, color: G }}>{ctaLabel}</div>)}
    </div>
  )
}
