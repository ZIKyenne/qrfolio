"use client"
import { videoLocalViewModel } from "../../models/videoLocal"
import type { PublicAdapterProps } from "../../renderTypes"

// Public : <video> natif ; autoplay conservé UNIQUEMENT s'il existe (jamais ajouté) et muté.
export function PublicVideoLocal({ content, ctx }: PublicAdapterProps) {
  const vm = videoLocalViewModel(content)
  if (!vm.visible) return null
  const { TEXT, FONT_B } = ctx
  return (
    <div style={{ padding: "10px 24px 14px" }}>
      <div style={{ borderRadius: 13, overflow: "hidden", background: "#000", maxWidth: vm.vertical ? 280 : undefined, margin: vm.vertical ? "0 auto" : undefined }}>
        <video src={vm.src!} poster={vm.poster || undefined} controls
          style={{ width: "100%", aspectRatio: vm.aspectRatio, maxHeight: vm.aspectRatio ? undefined : 260, objectFit: "cover", display: "block" }}
          autoPlay={vm.autoplay} loop={vm.loop} muted={vm.muted} playsInline />
      </div>
      {vm.title && <p style={{ color: TEXT, fontSize: 14, fontWeight: 600, margin: "9px 0 0", textAlign: "center", fontFamily: FONT_B }}>{vm.title}</p>}
    </div>
  )
}
