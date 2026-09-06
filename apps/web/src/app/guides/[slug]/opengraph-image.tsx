import { ImageResponse } from "next/og"
import { GUIDES, GUIDE_ORDER } from "../guides"

// Image de partage d'UN guide. L'Article JSON-LD exigeait un champ `image` :
// il n'y en avait aucun, et Google refuse le rich result « Article » sans image.
// Générée ici : le titre du guide sur la charte QRowg, jamais un 404.

// Pas de `runtime = "edge"` ici : Next 16 refuse de construire une route image qui
// déclare à la fois le runtime edge et generateStaticParams. On garde la
// pré-génération — les 19 images sortent au build, aucune ne se calcule en ligne.
export const size = { width: 1200, height: 630 }
export const contentType = "image/png"

export function generateStaticParams() {
  return GUIDE_ORDER.map(slug => ({ slug }))
}

export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const g = GUIDES[slug]
  const titre = g?.h1 ?? "Guides QR code"
  const categorie = g?.category ?? "Guides"

  return new ImageResponse(
    (
      <div
        style={{
          height: "100%",
          width: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          background: "#080808",
          color: "#F5F0E8",
          fontFamily: "sans-serif",
          padding: 72,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
          <div
            style={{
              width: 64, height: 64, borderRadius: 16, background: "#C9A84C",
              display: "flex", alignItems: "center", justifyContent: "center",
              color: "#080808", fontSize: 30, fontWeight: 800,
            }}
          >
            QR
          </div>
          <div style={{ display: "flex", fontSize: 34, fontWeight: 800, letterSpacing: -0.5 }}>QRowg</div>
          <div
            style={{
              display: "flex", marginLeft: "auto", fontSize: 22, fontWeight: 700,
              color: "#C9A84C", border: "1px solid #4a3f1e", borderRadius: 999, padding: "10px 22px",
            }}
          >
            {categorie}
          </div>
        </div>

        <div style={{ display: "flex", fontSize: titre.length > 52 ? 54 : 66, fontWeight: 800, lineHeight: 1.12, letterSpacing: -1.5, maxWidth: 1000 }}>
          {titre}
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 14, fontSize: 24, color: "#A8A190" }}>
          <div style={{ display: "flex", width: 40, height: 3, background: "#C9A84C" }} />
          <div style={{ display: "flex" }}>Guide gratuit · qrowg.com</div>
        </div>
      </div>
    ),
    { ...size },
  )
}
