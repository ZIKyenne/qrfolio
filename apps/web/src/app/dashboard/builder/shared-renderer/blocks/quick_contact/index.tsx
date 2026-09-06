"use client"
// quick_contact — Telephone, e-mail, WhatsApp, adresse, horaires, en une liste.
// L'apercu fabriquait « tel:… » et « wa.me/… » a la main, sans passer par les
// fonctions qui nettoient le numero, et ignorait l'indicatif pays du WhatsApp :
// le commercant voyait un lien, son visiteur en obtenait un autre.
import { contactsRapides, type LigneContact } from "../../models/contactEtAction"
import { TitreSection, pagePad } from "../../views/TitreSection"
import { SmartCta } from "../../primitives/LayoutSurface"
import { BlockEmptyState, HIDDEN_WHEN_EMPTY_NOTE } from "../../primitives/BlockEmptyState"
import { sz, editorCtx, publicCtx, type UnifiedCtx, type EditorAdapterProps, type PublicAdapterProps } from "../../renderTypes"

function couleurDe(c: LigneContact["couleur"], u: UnifiedCtx): string {
  switch (c) {
    case "success": return "var(--success)"
    case "action": return "var(--action)"
    case "whatsapp": return "#25D366"
    case "accent": return u.G
    default: return u.MUTED
  }
}

function Vue({ u, c }: { u: UnifiedCtx; c: Record<string, any> }) {
  const lignes = contactsRapides(c)
  return (
    <div style={{ padding: pagePad(u), fontFamily: u.FONT_B }}>
      <TitreSection u={u} titre={c?.title} />
      <div style={{ display: "flex", flexDirection: "column", gap: sz(u, 8) }}>
        {lignes.map((l, i) => {
          const col = couleurDe(l.couleur, u)
          const style = { display: "flex", alignItems: "center", gap: sz(u, 12), background: `${col}10`, border: `1px solid ${col}20`, borderRadius: sz(u, 11), padding: `${sz(u, 12)}px ${sz(u, 15)}px`, textDecoration: "none" } as const
          const dedans = <>
            <span aria-hidden style={{ fontSize: sz(u, 19), flexShrink: 0 }}>{l.icone}</span>
            <span style={{ color: u.TEXT, fontSize: sz(u, 13), fontWeight: 600, flex: 1, minWidth: 0, overflowWrap: "anywhere", fontFamily: u.FONT_B }}>{l.valeur}</span>
            {l.lien && <span aria-hidden style={{ color: col, fontSize: sz(u, 12), flexShrink: 0 }}>↗</span>}
          </>
          return l.lien
            ? <SmartCta key={i} u={u} href={l.lien.href || "#"} external={l.lien.external} trackTarget={l.lien.trackTarget} style={style} label={dedans} />
            : <div key={i} style={style}>{dedans}</div>
        })}
      </div>
    </div>
  )
}

export function EditorQuickContact({ content, ctx }: EditorAdapterProps) {
  const u = editorCtx(ctx)
  if (contactsRapides(content).length === 0) return <div style={{ padding: "10px 16px" }}><BlockEmptyState icon="📇" label="Ajoutez un moyen de vous joindre" sub={HIDDEN_WHEN_EMPTY_NOTE} muted={u.MUTED} /></div>
  return <Vue u={u} c={content} />
}
export function PublicQuickContact({ content, ctx }: PublicAdapterProps) {
  if (contactsRapides(content).length === 0) return null
  return <Vue u={publicCtx(ctx)} c={content} />
}
