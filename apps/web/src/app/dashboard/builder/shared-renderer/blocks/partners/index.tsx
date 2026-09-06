"use client"
// partners — Mur de partenaires sur 3 colonnes. Même grille que logo_wall, cases
// plus grandes et logos légèrement rentrés : ils sont moins nombreux, donc plus gros.
import { murLogos } from "../../models/logosEtTableaux"
import { MurLogos } from "../../views/MurLogos"
import { BlockEmptyState, HIDDEN_WHEN_EMPTY_NOTE } from "../../primitives/BlockEmptyState"
import { editorCtx, publicCtx, type EditorAdapterProps, type PublicAdapterProps } from "../../renderTypes"

export function EditorPartners({ content, ctx }: EditorAdapterProps) {
  const u = editorCtx(ctx)
  const logos = murLogos(content, "logo_img")
  if (logos.length === 0) return <div style={{ padding: "10px 16px" }}><BlockEmptyState icon="🤝" label="Ajoutez un partenaire" sub={HIDDEN_WHEN_EMPTY_NOTE} muted={u.MUTED} /></div>
  return <MurLogos u={u} titre={content?.title} logos={logos} cols={3} hauteur={48} padImage={5} radius={9} />
}

export function PublicPartners({ content, ctx }: PublicAdapterProps) {
  const logos = murLogos(content, "logo_img")
  if (logos.length === 0) return null
  return <MurLogos u={publicCtx(ctx)} titre={content?.title} logos={logos} cols={3} hauteur={48} padImage={5} radius={9} />
}
