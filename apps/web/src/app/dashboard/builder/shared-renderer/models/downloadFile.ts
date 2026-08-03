// Modèle pur du bloc `download_file`. href via extHref (sécurisé). Aucun React.
import { extHref } from "../../types"
import type { CtaLink } from "./ctaLink"

export type DownloadFileViewModel = { icon: string; label: string; typeDoc: string; link: CtaLink }
export function downloadFileViewModel(content: Record<string, any> | null | undefined): DownloadFileViewModel {
  const c = content || {}
  const url = typeof c.url === "string" ? c.url.trim() : ""
  const href = url ? extHref(url) : null
  return {
    icon: c.icon || "📄",
    label: c.label || "Télécharger",
    typeDoc: typeof c.type_doc === "string" ? c.type_doc : "",
    link: { href, external: true, trackTarget: "download", visible: href != null },
  }
}
