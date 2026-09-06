"use client"
// business_certifications — Le même bloc que `certifications`, côté commerce
// (agréments, normes, assurances). Champs `c1_…` au lieu de `cert_1_…`.
import { listeCertifications } from "../../models/logosEtTableaux"
import { ListeCertifications } from "../../views/ListeCertifications"
import { BlockEmptyState, HIDDEN_WHEN_EMPTY_NOTE } from "../../primitives/BlockEmptyState"
import { editorCtx, publicCtx, type UnifiedCtx, type EditorAdapterProps, type PublicAdapterProps } from "../../renderTypes"

const vue = (u: UnifiedCtx, c: Record<string, any>) => (
  <ListeCertifications u={u} titre={c?.title} certs={listeCertifications(c, "c")} iconDefaut="🏅"
    fond={`${u.G}06`} bord={`${u.G}15`} margeTitre={10} />
)

export function EditorBusinessCertifications({ content, ctx }: EditorAdapterProps) {
  const u = editorCtx(ctx)
  if (listeCertifications(content, "c").length === 0) return <div style={{ padding: "10px 16px" }}><BlockEmptyState icon="🏅" label="Ajoutez une certification" sub={HIDDEN_WHEN_EMPTY_NOTE} muted={u.MUTED} /></div>
  return vue(u, content)
}

export function PublicBusinessCertifications({ content, ctx }: PublicAdapterProps) {
  if (listeCertifications(content, "c").length === 0) return null
  return vue(publicCtx(ctx), content)
}
