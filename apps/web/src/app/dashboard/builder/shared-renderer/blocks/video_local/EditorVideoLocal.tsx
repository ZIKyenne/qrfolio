"use client"
import { videoLocalViewModel } from "../../models/videoLocal"
import type { EditorAdapterProps } from "../../renderTypes"
import SmartImage from "@/components/SmartImage"

// Éditeur : lecteur natif SANS autoplay (B09.10 §8/§15 — jamais de lecture auto au canvas) ;
// placeholder si pas de source.
export function EditorVideoLocal({ content, ctx }: EditorAdapterProps) {
  const vm = videoLocalViewModel(content)
  const { text, muted, surfaceStyle } = ctx
  return (
    <div style={{ padding: "10px 16px", ...surfaceStyle }}>
      {vm.src
        ? <div style={{ borderRadius: 12, overflow: "hidden", background: "#000" }}>
            <video src={vm.src} poster={vm.poster || undefined} controls style={{ width: "100%", maxHeight: 200, display: "block" }} loop={vm.loop} muted={vm.muted} playsInline />
          </div>
        : <div style={{ background: "rgba(78,205,196,0.06)", border: "1px dashed rgba(78,205,196,0.25)", borderRadius: 12, padding: "32px", textAlign: "center" }}>
            {vm.poster ? <SmartImage src={vm.poster} alt="" width={480} height={160} sizes="(max-width: 640px) 100vw, 480px" style={{ width: "100%", maxHeight: 160, objectFit: "cover", borderRadius: 8, display: "block", marginBottom: 10 }} /> : null}
            <span style={{ fontSize: 32 }}>🎥</span>
            <p style={{ color: muted, fontSize: 11, margin: "8px 0 0" }}>Ajoutez l&apos;URL de votre vidéo</p>
          </div>}
      {vm.title && <p style={{ color: text, fontSize: 13, fontWeight: 600, margin: "8px 0 0", textAlign: "center" }}>{vm.title}</p>}
    </div>
  )
}
