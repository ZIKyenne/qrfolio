"use client"
// founder_message — Le mot du fondateur. L'apercu affichait un message INVENTE
// (« Bienvenue ! Notre mission est de vous offrir le meilleur service possible. »)
// quand le champ etait vide, comme s'il allait etre publie ; la page, elle,
// publiait deux guillemets vides des qu'un nom etait saisi. Le message porte
// maintenant le bloc : sans lui, rien n'est affiche nulle part.
import { messageFondateur } from "../../models/presentationEtEncadres"
import { sharedImageModel } from "../../models/sharedImage"
import { pagePad } from "../../views/TitreSection"
import { PublicSharedImage } from "../../primitives/PublicImage"
import { EditorSharedImage } from "../../primitives/EditorImage"
import { BlockEmptyState, HIDDEN_WHEN_EMPTY_NOTE } from "../../primitives/BlockEmptyState"
import { sz, editorCtx, publicCtx, type UnifiedCtx, type EditorAdapterProps, type PublicAdapterProps } from "../../renderTypes"

function Vue({ u, c, accent }: { u: UnifiedCtx; c: Record<string, any>; accent: string }) {
  const f = messageFondateur(c)!
  const cote = sz(u, 52)
  const photo = sharedImageModel(f.photo, { alt: f.name })
  const styleP = { width: cote, height: cote, borderRadius: "50%", objectFit: "cover" as const, flexShrink: 0, border: `2px solid ${u.G}40` }
  return (
    <div style={{ padding: pagePad(u, 12, 14), fontFamily: u.FONT_B }}>
      <div style={{ background: `${u.G}06`, border: `1px solid ${u.G}15`, borderRadius: sz(u, 15), padding: sz(u, 17) }}>
        <div style={{ display: "flex", alignItems: "center", gap: sz(u, 13), marginBottom: sz(u, 13) }}>
          {photo.src
            ? (u.mode === "public"
              ? <PublicSharedImage model={photo} width={104} height={104} sizes="52px" style={styleP} />
              : <EditorSharedImage model={photo} width={104} height={104} sizes="52px" style={styleP} />)
            : <div aria-hidden style={{ ...styleP, border: "none", background: `linear-gradient(135deg,${u.G},${accent})`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: sz(u, 23) }}>👤</div>}
          <div style={{ minWidth: 0 }}>
            {f.name && <p style={{ color: u.TEXT, fontSize: sz(u, 15), fontWeight: 700, margin: `0 0 2px`, fontFamily: u.FONT_D }}>{f.name}</p>}
            {f.role && <p style={{ color: u.G, fontSize: sz(u, 13), margin: 0 }}>{f.role}</p>}
          </div>
        </div>
        <p style={{ color: u.MUTED, fontSize: sz(u, 13), lineHeight: 1.7, margin: f.signature ? `0 0 ${sz(u, 11)}px` : 0, fontStyle: "italic", whiteSpace: "pre-wrap" }}>&laquo;&nbsp;{f.message}&nbsp;&raquo;</p>
        {f.signature && <p style={{ color: u.G, fontSize: sz(u, 15), fontFamily: "Georgia, serif", margin: 0, fontStyle: "italic" }}>{f.signature}</p>}
      </div>
    </div>
  )
}

export function EditorFounderMessage({ content, ctx }: EditorAdapterProps) {
  const u = editorCtx(ctx)
  if (!messageFondateur(content)) return <div style={{ padding: "12px 16px" }}><BlockEmptyState icon="✍️" label="Ajoutez le message du fondateur" sub={HIDDEN_WHEN_EMPTY_NOTE} muted={u.MUTED} /></div>
  return <Vue u={u} c={content} accent={ctx.accent} />
}
export function PublicFounderMessage({ content, ctx }: PublicAdapterProps) {
  if (!messageFondateur(content)) return null
  return <Vue u={publicCtx(ctx)} c={content} accent={(ctx.theme as any)?.accent || "var(--success)"} />
}
