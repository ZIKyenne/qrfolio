"use client"
import { pdfViewerViewModel } from "../../models/pdfViewer"
import { PublicCtaLink } from "../../primitives/BlockCtaLink"
import type { PublicAdapterProps } from "../../renderTypes"
import SmartImage from "@/components/SmartImage"

// Public : document PDF via liens directs (consulter + télécharger). Aucune preview iframe.
export function PublicPdfViewer({ content, ctx }: PublicAdapterProps) {
  const { visible, title, description, cover, pages, fileSize, href, ctaLabel, showDownload, trackTarget } = pdfViewerViewModel(content)
  if (!visible) return null
  const { G, TEXT, MUTED, FONT_B, trackClick } = ctx
  const hasMeta = !!(pages || fileSize)
  return (
    <div style={{ padding: "10px 24px 14px" }}>
      <div style={{ background: "rgba(78,205,196,0.06)", border: "1.5px solid rgba(78,205,196,0.2)", borderRadius: 15, padding: "17px" }}>
        {cover && <div style={{ borderRadius: 11, overflow: "hidden", marginBottom: 13, boxShadow: "0 6px 20px rgba(0,0,0,0.35)" }}><SmartImage onError={e => { e.currentTarget.style.display = 'none' }} src={cover} alt={title} width={640} height={260} sizes="(max-width: 640px) 100vw, 640px" style={{ width: "100%", maxHeight: 260, objectFit: "cover", display: "block" }} /></div>}
        <div style={{ display: "flex", alignItems: "center", gap: 13, marginBottom: href ? 13 : 0 }}>
          {!cover && <div style={{ width: 46, height: 54, background: "rgba(239,68,68,0.12)", border: "1px solid rgba(239,68,68,0.25)", borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 23, flexShrink: 0 }}>📄</div>}
          <div style={{ flex: 1 }}>
            <p style={{ color: TEXT, fontSize: 14, fontWeight: 700, margin: "0 0 2px", fontFamily: FONT_B }}>{title}</p>
            {description && <p style={{ color: MUTED, fontSize: 13.5, margin: "0 0 2px" }}>{description}</p>}
            {hasMeta && <p style={{ color: MUTED, fontSize: 11, margin: 0 }}>📄 PDF{pages ? ` · ${pages} pages` : ""}{fileSize ? ` · ${fileSize}` : ""}</p>}
          </div>
        </div>
        {href && (
          <div style={{ display: "flex", gap: 8 }}>
            <PublicCtaLink href={href} external trackTarget={trackTarget} trackClick={trackClick} style={{ flex: 1, background: `linear-gradient(90deg,${G},${G}cc)`, borderRadius: 9, padding: "11px", textAlign: "center", fontSize: 13, fontWeight: 700, color: "#080808", textDecoration: "none", fontFamily: FONT_B }}>{ctaLabel || "Consulter le PDF"}</PublicCtaLink>
            {showDownload && <a href={href} download onClick={() => { try { trackClick(trackTarget) } catch {} }} style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 9, padding: "11px 16px", fontSize: 13, fontWeight: 600, color: MUTED, textDecoration: "none" }}>↓ PDF</a>}
          </div>
        )}
      </div>
    </div>
  )
}
