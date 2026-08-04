// Modèle pur `pdf_viewer`. Document PDF public : lien direct (href durci via extHref) +
// téléchargement, aucune preview iframe. Couverture via safeMediaSrc. Public masqué si vide.
import { extHref } from "../../types"
import { safeMediaSrc } from "./mediaUrl"

export type PdfViewerViewModel = {
  visible: boolean; title: string; description?: string; cover: string | null
  pages?: string; fileSize?: string; href: string | null; ctaLabel?: string; showDownload: boolean; trackTarget: string
}

export function pdfViewerViewModel(content: Record<string, any> | null | undefined): PdfViewerViewModel {
  const c = content || {}
  const url = typeof c.url === "string" ? c.url : ""
  return {
    visible: !!(c.url || c.title), title: c.title || "Mon document PDF", description: c.description || undefined,
    cover: safeMediaSrc(c.cover), pages: c.pages || undefined, fileSize: c.file_size || undefined,
    href: extHref(url) || null, ctaLabel: c.cta_label || undefined, showDownload: c.show_download !== "no", trackTarget: url,
  }
}
