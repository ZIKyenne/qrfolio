"use client"
import { merchViewModel } from "../../models/merch"
import { PublicCtaLink } from "../../primitives/BlockCtaLink"
import type { PublicAdapterProps } from "../../renderTypes"

export function PublicMerch({ content, ctx }: PublicAdapterProps) {
  const { items, title, description, ctaLabel, link } = merchViewModel(content)
  if (items.length === 0) return null
  const { TEXT, MUTED, FONT_B, trackClick } = ctx
  return (
    <div style={{ padding: "10px 24px 14px" }}>
      {title && <p style={{ color: MUTED, fontSize: 11, textTransform: "uppercase", letterSpacing: 2, margin: "0 0 12px", fontFamily: FONT_B }}>{title}</p>}
      {description && <p style={{ color: MUTED, fontSize: 12, margin: "0 0 12px" }}>{description}</p>}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 9, marginBottom: ctaLabel ? 13 : 0 }}>
        {items.map((p, i) => (
          <div key={i} style={{ background: "rgba(145,70,255,0.06)", border: "1px solid rgba(145,70,255,0.15)", borderRadius: 11, overflow: "hidden" }}>
            {p.img
              ? <img onError={e => { e.currentTarget.style.display = 'none' }} loading="lazy" decoding="async" src={p.img} alt="" style={{ width: "100%", aspectRatio: "1", objectFit: "cover", display: "block" }} />
              : <div style={{ aspectRatio: "1", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 26 }}>👕</div>}
            <div style={{ padding: "7px 9px" }}>
              <p style={{ color: TEXT, fontSize: 11, fontWeight: 700, margin: "0 0 1px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", fontFamily: FONT_B }}>{p.name}</p>
              <p style={{ color: "#9146FF", fontSize: 12, fontWeight: 700, margin: 0 }}>{p.price}</p>
            </div>
          </div>
        ))}
      </div>
      {ctaLabel && <PublicCtaLink href={link.href} external={link.external} trackTarget={link.trackTarget} trackClick={trackClick} style={{ display: "block", background: "linear-gradient(90deg,#9146FF,#7B3FCC)", borderRadius: 10, padding: "12px", textAlign: "center", fontSize: 13, fontWeight: 700, color: "#fff", textDecoration: "none", fontFamily: FONT_B }}>{ctaLabel}</PublicCtaLink>}
    </div>
  )
}
