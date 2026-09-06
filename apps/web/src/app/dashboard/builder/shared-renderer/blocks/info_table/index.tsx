"use client"
// info_table — Tableau d'informations libre (capacité, superficie, délai de livraison…).
import { lignesInfo } from "../../models/logosEtTableaux"
import { TableauLignes } from "../../views/TableauLignes"
import { BlockEmptyState, HIDDEN_WHEN_EMPTY_NOTE } from "../../primitives/BlockEmptyState"
import { editorCtx, publicCtx, type EditorAdapterProps, type PublicAdapterProps } from "../../renderTypes"

export function EditorInfoTable({ content, ctx }: EditorAdapterProps) {
  const u = editorCtx(ctx)
  const lignes = lignesInfo(content)
  if (lignes.length === 0) return <div style={{ padding: "10px 16px" }}><BlockEmptyState icon="📋" label="Ajoutez une ligne d'info" sub={HIDDEN_WHEN_EMPTY_NOTE} muted={u.MUTED} /></div>
  return <TableauLignes u={u} titre={content?.title} lignes={lignes} encadre={false} tailleTexte={13} />
}

export function PublicInfoTable({ content, ctx }: PublicAdapterProps) {
  const lignes = lignesInfo(content)
  if (lignes.length === 0) return null
  return <TableauLignes u={publicCtx(ctx)} titre={content?.title} lignes={lignes} encadre={false} tailleTexte={13} />
}
