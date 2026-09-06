"use client"
import { pdfViewerViewModel } from "../../models/pdfViewer"
import { EditorCtaShell } from "../../primitives/BlockCtaLink"
import type { EditorAdapterProps } from "../../renderTypes"
import SmartImage from "@/components/SmartImage"

export function EditorPdfViewer({ content, ctx }: EditorAdapterProps) {
  const { title, description, cover, pages, fileSize, ctaLabel, showDownload, trackTarget } = pdfViewerViewModel(content)
  const { text, muted, primary, surfaceStyle } = ctx
  const hasMeta = !!(pages || fileSize)
  const hasUrl = !!trackTarget
  return (
    <div style={{ padding: "10px 16px", ...surfaceStyle }}>
      <div style={{ background: "rgba(78,205,196,0.06)", border: "1.5px solid rgba(78,205,196,0.2)", borderRadius: 14, padding: "16px" }}>
        {cover && <div style={{ borderRadius: 10, overflow: "hidden", marginBottom: 12 }}><SmartImage src={cover} alt="" width={560} height={180} sizes="(max-width: 640px) 100vw, 560px" style={{ width: "100%", maxHeight: 180, objectFit: "cover", display: "block" }} /></div>}
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: hasUrl ? 12 : 0 }}>
          {!cover && <div style={{ width: 44, height: 52, background: "rgba(239,68,68,0.12)", border: "1px solid rgba(239,68,68,0.25)", borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22, flexShrink: 0 }}>📄</div>}
          <div style={{ flex: 1 }}>
            <p style={{ color: text, fontSize: 13, fontWeight: 700, margin: "0 0 2px" }}>{title}</p>
            {description && <p style={{ color: muted, fontSize: 12.5, margin: "0 0 2px" }}>{description}</p>}
            {hasMeta && <p style={{ color: muted, fontSize: 10, margin: 0 }}>📄 PDF{pages ? ` · ${pages} pages` : ""}{fileSize ? ` · ${fileSize}` : ""}</p>}
          </div>
        </div>
        {hasUrl && <div style={{ background: "rgba(0,0,0,0.3)", borderRadius: 8, overflow: "hidden", marginBottom: 10, height: 120, display: "flex", alignItems: "center", justifyContent: "center" }}><p style={{ color: muted, fontSize: 11, margin: 0 }}>Aperçu PDF</p></div>}
        <div style={{ display: "flex", gap: 7 }}>
          {ctaLabel && <EditorCtaShell style={{ flex: 1, background: `linear-gradient(90deg,${primary},${primary}cc)`, borderRadius: 8, padding: "9px", textAlign: "center", fontSize: 12, fontWeight: 700, color: "#080808" }}>{ctaLabel}</EditorCtaShell>}
          {showDownload && <div style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, padding: "9px 14px", fontSize: 12, fontWeight: 600, color: muted }}>↓ PDF</div>}
        </div>
      </div>
    </div>
  )
}
