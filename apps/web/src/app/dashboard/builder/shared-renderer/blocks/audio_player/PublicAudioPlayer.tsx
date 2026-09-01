"use client"
import SmartImage from "@/components/SmartImage"
import { audioPlayerViewModel } from "../../models/audioPlayer"
import type { PublicAdapterProps } from "../../renderTypes"
import { avecCibleTactile } from "../../primitives/BlockCtaLink"

// Public : <audio> natif (controls, preload=none) ; téléchargement optionnel tracké.
export function PublicAudioPlayer({ content, ctx }: PublicAdapterProps) {
  const { visible, src, cover, title, artist, showDownload } = audioPlayerViewModel(content)
  if (!visible) return null
  const { TEXT, MUTED, FONT_B, trackClick } = ctx
  return (
    <div style={{ padding: "10px 24px 14px" }}>
      <div style={{ background: "rgba(167,139,250,0.06)", border: "1.5px solid rgba(167,139,250,0.22)", borderRadius: 15, padding: "15px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 13, marginBottom: 13 }}>
          {cover
            ? <SmartImage onError={e => { e.currentTarget.style.display = 'none' }} src={cover} alt="" width={60} height={60} style={{ width: 60, height: 60, borderRadius: 11, objectFit: "cover", flexShrink: 0 }} />
            : <div style={{ width: 60, height: 60, borderRadius: 11, background: "rgba(167,139,250,0.15)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 28, flexShrink: 0 }}>🎧</div>}
          <div style={{ minWidth: 0 }}>
            <p style={{ color: TEXT, fontSize: 15, fontWeight: 700, margin: "0 0 2px", fontFamily: FONT_B, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{title}</p>
            {artist && <p style={{ color: MUTED, fontSize: 12, margin: 0 }}>{artist}</p>}
          </div>
        </div>
        <audio src={src!} controls preload="none" style={{ width: "100%", display: "block" }} />
        {showDownload && <a href={src!} download onClick={() => { try { trackClick("audio-download") } catch {} }} style={avecCibleTactile({ display: "inline-block", marginTop: 9, color: MUTED, fontSize: 12, fontWeight: 600, textDecoration: "none" })}>↓ Télécharger</a>}
      </div>
    </div>
  )
}
