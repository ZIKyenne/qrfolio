"use client"
// directions_button — « Obtenir l'itinéraire ». L'apercu affichait l'adresse en
// texte sous le bouton ; la page publiait, elle, un bouton « Copier l'adresse ».
// Deux choses differentes au meme endroit. C'est le bouton de copie qui gagne :
// c'est lui que le visiteur utilise, debout devant la vitrine.
import { boutonItineraire } from "../../models/contactEtAction"
import { pagePad } from "../../views/TitreSection"
import { SmartCta } from "../../primitives/LayoutSurface"
import { BlockEmptyState, HIDDEN_WHEN_EMPTY_NOTE } from "../../primitives/BlockEmptyState"
import { sz, editorCtx, publicCtx, type UnifiedCtx, type EditorAdapterProps, type PublicAdapterProps } from "../../renderTypes"
import { useState, type ReactNode } from "react"

const BLEU = "#4285F4"

function Vue({ u, c, boutonCopie }: { u: UnifiedCtx; c: Record<string, any>; boutonCopie: (adresse: string) => ReactNode }) {
  const m = boutonItineraire(c)!
  return (
    <div style={{ padding: pagePad(u, 6, 10), fontFamily: u.FONT_B }}>
      <SmartCta u={u} href={m.href} trackTarget="directions"
        style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: sz(u, 9), background: "rgba(66,133,244,0.12)", border: "1.5px solid rgba(66,133,244,0.35)", borderRadius: sz(u, 13), padding: `${sz(u, 15)}px ${sz(u, 18)}px`, textDecoration: "none" }}
        label={<>
          <span aria-hidden style={{ fontSize: sz(u, 17) }}>🧭</span>
          <span style={{ color: BLEU, fontSize: sz(u, 15), fontWeight: 700, fontFamily: u.FONT_B }}>{m.label}</span>
        </>} />
      {m.copier && boutonCopie(m.adresse)}
    </div>
  )
}

// L'apercu montre le bouton de copie, inerte : le commercant voit ce que verra
// son visiteur, sans que cliquer dans le canvas copie quoi que ce soit.
function styleCopie(u: UnifiedCtx) {
  return { display: "flex", alignItems: "center", justifyContent: "center", gap: sz(u, 6), width: "100%", marginTop: sz(u, 7), background: u.FILL, border: `1px solid ${u.LINE}`, borderRadius: sz(u, 11), padding: sz(u, 10), color: u.MUTED, fontSize: sz(u, 12), fontWeight: 600, fontFamily: u.FONT_B } as const
}

export function EditorDirectionsButton({ content, ctx }: EditorAdapterProps) {
  const u = editorCtx(ctx)
  if (!boutonItineraire(content)) return <div style={{ padding: "10px 16px" }}><BlockEmptyState icon="🧭" label="Ajoutez votre adresse" sub={HIDDEN_WHEN_EMPTY_NOTE} muted={u.MUTED} /></div>
  return <Vue u={u} c={content} boutonCopie={() => <div aria-disabled="true" style={{ ...styleCopie(u), boxSizing: "border-box" }}>📋 Copier l&apos;adresse</div>} />
}

export function PublicDirectionsButton({ content, ctx }: PublicAdapterProps) {
  if (!boutonItineraire(content)) return null
  const u = publicCtx(ctx)
  return <Vue u={u} c={content} boutonCopie={adresse => <BoutonCopie adresse={adresse} u={u} />} />
}

// Le seul morceau interactif du bloc, ecrit ici plutot qu'importe de la page
// publique : un bloc partage ne doit rien tirer du bundle public.
// `navigator.clipboard` n'existe pas partout (vieux navigateur, page non
// securisee) : en cas d'echec on ne ment pas, le libelle ne change pas.
function BoutonCopie({ adresse, u }: { adresse: string; u: UnifiedCtx }) {
  const [copie, setCopie] = useState(false)
  const copier = async () => {
    try {
      await navigator.clipboard.writeText(adresse)
      setCopie(true)
      u.trackClick("copy-address")
      setTimeout(() => setCopie(false), 2000)
    } catch { /* rien : le libelle reste « Copier » */ }
  }
  return (
    <button type="button" onClick={copier} style={{ ...styleCopie(u), cursor: "pointer" }}>
      {copie ? "✅ Adresse copiée" : "📋 Copier l'adresse"}
    </button>
  )
}
