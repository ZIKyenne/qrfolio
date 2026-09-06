"use client"
// logo_wall — Mur de logos sur 4 colonnes (clients, marques distribuées, labels).
import { murLogos } from "../../models/logosEtTableaux"
import { MurLogos } from "../../views/MurLogos"
import { BlockEmptyState, HIDDEN_WHEN_EMPTY_NOTE } from "../../primitives/BlockEmptyState"
import { editorCtx, publicCtx, type EditorAdapterProps, type PublicAdapterProps } from "../../renderTypes"

export function EditorLogoWall({ content, ctx }: EditorAdapterProps) {
  const u = editorCtx(ctx)
  const logos = murLogos(content, "logo")
  if (logos.length === 0) return <div style={{ padding: "10px 16px" }}><BlockEmptyState icon="🏢" label="Ajoutez un logo" sub={HIDDEN_WHEN_EMPTY_NOTE} muted={u.MUTED} /></div>
  return <MurLogos u={u} titre={content?.title} logos={logos} cols={4} hauteur={40} padImage={0} radius={8} />
}

export function PublicLogoWall({ content, ctx }: PublicAdapterProps) {
  const logos = murLogos(content, "logo")
  if (logos.length === 0) return null
  return <MurLogos u={publicCtx(ctx)} titre={content?.title} logos={logos} cols={4} hauteur={40} padImage={0} radius={8} />
}
