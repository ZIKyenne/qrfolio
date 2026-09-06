"use client"
// legal_info — Mentions légales : sept champs nommés, dans un ordre fixe, encadrés.
// Les champs vides sont sautés (une société sans capital social n'affiche pas
// « Capital : — »), et le bloc entier disparaît si aucun n'est rempli.
import { lignesLegales } from "../../models/logosEtTableaux"
import { TableauLignes } from "../../views/TableauLignes"
import { BlockEmptyState, HIDDEN_WHEN_EMPTY_NOTE } from "../../primitives/BlockEmptyState"
import { editorCtx, publicCtx, type EditorAdapterProps, type PublicAdapterProps } from "../../renderTypes"

export function EditorLegalInfo({ content, ctx }: EditorAdapterProps) {
  const u = editorCtx(ctx)
  const lignes = lignesLegales(content)
  if (lignes.length === 0) return <div style={{ padding: "10px 16px" }}><BlockEmptyState icon="⚖️" label="Ajoutez vos informations légales" sub={HIDDEN_WHEN_EMPTY_NOTE} muted={u.MUTED} /></div>
  return <TableauLignes u={u} titre={content?.title} lignes={lignes} encadre tailleTexte={12} />
}

export function PublicLegalInfo({ content, ctx }: PublicAdapterProps) {
  const lignes = lignesLegales(content)
  if (lignes.length === 0) return null
  return <TableauLignes u={publicCtx(ctx)} titre={content?.title} lignes={lignes} encadre tailleTexte={12} />
}
