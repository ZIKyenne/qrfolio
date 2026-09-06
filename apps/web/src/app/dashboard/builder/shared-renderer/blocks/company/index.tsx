"use client"
// company — Carte d'identite de l'entreprise. L'apercu dessinait toujours la carte,
// meme vide (logo 🏢 et ligne blanche) ; la page ne publiait rien sans nom ni logo.
import { ficheEntreprise } from "../../models/presentationEtEncadres"
import { sharedImageModel } from "../../models/sharedImage"
import { pagePad } from "../../views/TitreSection"
import { PublicSharedImage } from "../../primitives/PublicImage"
import { EditorSharedImage } from "../../primitives/EditorImage"
import { BlockEmptyState, HIDDEN_WHEN_EMPTY_NOTE } from "../../primitives/BlockEmptyState"
import { sz, editorCtx, publicCtx, type UnifiedCtx, type EditorAdapterProps, type PublicAdapterProps } from "../../renderTypes"

function Vue({ u, c }: { u: UnifiedCtx; c: Record<string, any> }) {
  const f = ficheEntreprise(c)!
  const cote = sz(u, 44)
  const logo = sharedImageModel(f.logo, { alt: f.name })
  const styleL = { width: cote, height: cote, borderRadius: sz(u, 10), objectFit: "cover" as const, flexShrink: 0 }
  const sousTitre = [f.sector, f.year && `Depuis ${f.year}`].filter(Boolean).join(" · ")
  return (
    <div style={{ padding: pagePad(u, 8, 12), fontFamily: u.FONT_B }}>
      <div style={{ display: "flex", gap: sz(u, 12), alignItems: "center", background: u.FILL, border: `1px solid ${u.LINE}`, borderRadius: sz(u, 13), padding: `${sz(u, 12)}px ${sz(u, 13)}px` }}>
        {logo.src
          ? (u.mode === "public"
            ? <PublicSharedImage model={logo} width={88} height={88} sizes="44px" style={styleL} />
            : <EditorSharedImage model={logo} width={88} height={88} sizes="44px" style={styleL} />)
          : <div aria-hidden style={{ ...styleL, background: `${u.G}15`, border: `1px solid ${u.G}25`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: sz(u, 21) }}>🏢</div>}
        <div style={{ flex: 1, minWidth: 0 }}>
          {f.name && <p style={{ color: u.TEXT, fontSize: sz(u, 15), fontWeight: 700, margin: "0 0 1px", fontFamily: u.FONT_D }}>{f.name}</p>}
          {sousTitre && <p style={{ color: u.MUTED, fontSize: sz(u, 11), margin: 0 }}>{sousTitre}</p>}
        </div>
      </div>
    </div>
  )
}

export function EditorCompany({ content, ctx }: EditorAdapterProps) {
  const u = editorCtx(ctx)
  if (!ficheEntreprise(content)) return <div style={{ padding: "10px 16px" }}><BlockEmptyState icon="🏢" label="Ajoutez le nom ou le logo de l'entreprise" sub={HIDDEN_WHEN_EMPTY_NOTE} muted={u.MUTED} /></div>
  return <Vue u={u} c={content} />
}
export function PublicCompany({ content, ctx }: PublicAdapterProps) {
  if (!ficheEntreprise(content)) return null
  return <Vue u={publicCtx(ctx)} c={content} />
}
