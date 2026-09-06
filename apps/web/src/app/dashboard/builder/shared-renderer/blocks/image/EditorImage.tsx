"use client"
import { imageViewModel } from "../../models/image"
import type { EditorAdapterProps } from "../../renderTypes"
import SmartImage from "@/components/SmartImage"

// Éditeur : aucun lien (neutralisé) ; placeholder « Aucune image » si pas de média.
export function EditorImage({ content, ctx }: EditorAdapterProps) {
  const { hasMedia, src, alt, caption, isCircle, rounded, aspectRatio } = imageViewModel(content)
  const { muted, surfaceStyle } = ctx
  if (!hasMedia) return (
    <div style={{ ...surfaceStyle }}>
      <div style={{ background: "rgba(255,255,255,0.03)", border: "1px dashed rgba(255,255,255,0.1)", borderRadius: 8, padding: "28px", textAlign: "center", margin: "10px 16px" }}>
        <span style={{ fontSize: 28 }}>🖼️</span>
        <p style={{ color: muted, fontSize: 11, margin: "6px 0 0" }}>Aucune image</p>
      </div>
    </div>
  )
  const img = <SmartImage src={src!} alt={alt} width={560} height={220} sizes="(max-width: 640px) 100vw, 560px" style={{ width: "100%", height: aspectRatio ? "auto" : undefined, maxHeight: aspectRatio ? undefined : 220, aspectRatio, objectFit: "cover", display: "block", borderRadius: isCircle ? "50%" : rounded === "rounded" ? 10 : 0 }} />
  return (
    <div style={{ ...surfaceStyle }}>
      <div>
        {isCircle ? <div style={{ maxWidth: 170, margin: "0 auto" }}>{img}</div> : img}
        {caption && <p style={{ color: muted, fontSize: 10, textAlign: "center", margin: "6px 14px" }}>{caption}</p>}
      </div>
    </div>
  )
}
