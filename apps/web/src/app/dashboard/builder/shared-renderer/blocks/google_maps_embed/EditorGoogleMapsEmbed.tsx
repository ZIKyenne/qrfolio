"use client"
import { googleMapsEmbedViewModel } from "../../models/googleMapsEmbed"
import { EditorCtaShell } from "../../primitives/BlockCtaLink"
import type { EditorAdapterProps } from "../../renderTypes"

// Éditeur : iframe Google Maps (URL déjà contrôlée) ; lien itinéraire NEUTRALISÉ (non navigable).
export function EditorGoogleMapsEmbed({ content, ctx }: EditorAdapterProps) {
  const { embed, label, address, height, showDirections } = googleMapsEmbedViewModel(content)
  const { muted, surfaceStyle } = ctx
  return (
    <div style={{ padding: "10px 16px", ...surfaceStyle }}>
      {label && <p style={{ color: muted, fontSize: 10, textTransform: "uppercase", letterSpacing: 2, margin: "0 0 10px" }}>{label}</p>}
      {embed.src
        ? <iframe src={embed.src} title={embed.title} width="100%" height={height === "lg" ? 200 : height === "sm" ? 120 : 160} style={{ border: "none", borderRadius: 12, display: "block" }} loading="lazy" referrerPolicy="no-referrer-when-downgrade" />
        : <div style={{ height: 160, background: "rgba(66,133,244,0.06)", border: "1px solid rgba(66,133,244,0.2)", borderRadius: 12, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 8 }}>
            <span style={{ fontSize: 32 }}>🗺️</span>
            <p style={{ color: muted, fontSize: 11, margin: 0, textAlign: "center" }}>{address || "Ajoutez une adresse"}</p>
          </div>}
      {showDirections && <EditorCtaShell style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 7, marginTop: 10, background: "rgba(66,133,244,0.1)", border: "1px solid rgba(66,133,244,0.25)", borderRadius: 9, padding: "10px", color: "#4285F4", fontSize: 12, fontWeight: 700 }}>🧭 Obtenir l&apos;itinéraire</EditorCtaShell>}
    </div>
  )
}
