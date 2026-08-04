"use client"
import { googleMapsEmbedViewModel } from "../../models/googleMapsEmbed"
import type { PublicAdapterProps } from "../../renderTypes"

// Public : iframe Google Maps uniquement + lien itinéraire réel tracké. null si ni adresse ni embed.
export function PublicGoogleMapsEmbed({ content, ctx }: PublicAdapterProps) {
  const { visible, embed, label, address, height, showDirections, directionsHref } = googleMapsEmbedViewModel(content)
  if (!visible) return null
  const { MUTED, FONT_B, trackClick } = ctx
  return (
    <div style={{ padding: "10px 24px 14px" }}>
      {label && <p style={{ color: MUTED, fontSize: 11, textTransform: "uppercase", letterSpacing: 2, margin: "0 0 10px", fontFamily: FONT_B }}>{label}</p>}
      {embed.src
        ? <iframe src={embed.src} title={embed.title} width="100%" height={height === "lg" ? 240 : height === "sm" ? 140 : 190} style={{ border: "none", borderRadius: 13, display: "block" }} loading="lazy" referrerPolicy="no-referrer-when-downgrade" />
        : <div style={{ height: 190, background: "rgba(66,133,244,0.06)", border: "1px solid rgba(66,133,244,0.2)", borderRadius: 13, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 8 }}><span style={{ fontSize: 34 }}>🗺️</span><p style={{ color: MUTED, fontSize: 12, margin: 0, textAlign: "center" }}>📍 {address}</p></div>}
      {showDirections && directionsHref && <a href={directionsHref} target="_blank" rel="noopener noreferrer" onClick={() => { try { trackClick("directions") } catch {} }} style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, marginTop: 11, background: "rgba(66,133,244,0.1)", border: "1px solid rgba(66,133,244,0.25)", borderRadius: 10, padding: "12px", color: "#4285F4", textDecoration: "none", fontSize: 13, fontWeight: 700 }}>🧭 Obtenir l&apos;itinéraire</a>}
    </div>
  )
}
