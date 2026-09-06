"use client"
// certifications — Diplômes, agréments, labels. Le ✓ à droite de chaque ligne
// n'existait que dans l'aperçu : il est maintenant rendu par la vue partagée, donc
// réellement publié.
import { listeCertifications } from "../../models/logosEtTableaux"
import { ListeCertifications } from "../../views/ListeCertifications"
import { BlockEmptyState, HIDDEN_WHEN_EMPTY_NOTE } from "../../primitives/BlockEmptyState"
import { editorCtx, publicCtx, type UnifiedCtx, type EditorAdapterProps, type PublicAdapterProps } from "../../renderTypes"

const vue = (u: UnifiedCtx, c: Record<string, any>) => (
  <ListeCertifications u={u} titre={c?.title} certs={listeCertifications(c, "cert_")} iconDefaut="🏆"
    fond={`${u.G}0a`} bord={`${u.G}18`} margeTitre={9} />
)

export function EditorCertifications({ content, ctx }: EditorAdapterProps) {
  const u = editorCtx(ctx)
  if (listeCertifications(content, "cert_").length === 0) return <div style={{ padding: "10px 16px" }}><BlockEmptyState icon="🏆" label="Ajoutez une certification" sub={HIDDEN_WHEN_EMPTY_NOTE} muted={u.MUTED} /></div>
  return vue(u, content)
}

export function PublicCertifications({ content, ctx }: PublicAdapterProps) {
  if (listeCertifications(content, "cert_").length === 0) return null
  return vue(publicCtx(ctx), content)
}
