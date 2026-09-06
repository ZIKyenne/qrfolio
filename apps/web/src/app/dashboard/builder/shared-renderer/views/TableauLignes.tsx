"use client"
// Tableau « libellé à gauche, valeur à droite » partagé par `info_table` et
// `legal_info`. Le filet de séparation était figé en blanc à 6 % sur la page publiée :
// invisible sur un thème clair, alors que l'aperçu, lui, le teintait selon le thème.
// Il prend maintenant le jeton adaptatif u.LINE des deux côtés.
import { TitreSection, pagePad } from "./TitreSection"
import type { LigneInfo } from "../models/logosEtTableaux"
import { sz, type UnifiedCtx } from "../renderTypes"

export function TableauLignes({ u, titre, lignes, encadre, tailleTexte }: {
  u: UnifiedCtx
  titre?: string
  lignes: LigneInfo[]
  encadre: boolean
  tailleTexte: number
}) {
  const cadre = encadre
    ? { background: u.FILL, border: `1px solid ${u.LINE}`, borderRadius: sz(u, 13), overflow: "hidden" as const }
    : undefined
  const padH = encadre ? sz(u, 15) : 0
  return (
    <div style={{ padding: pagePad(u), fontFamily: u.FONT_B }}>
      <TitreSection u={u} titre={titre} />
      <div style={cadre}>
        {lignes.map((l, i) => (
          <div key={i} style={{
            display: "flex", justifyContent: "space-between", alignItems: "center", gap: sz(u, 12),
            padding: `${sz(u, 10)}px ${padH}px`,
            borderBottom: i < lignes.length - 1 ? `1px solid ${u.LINE}` : "none",
          }}>
            <span style={{ color: u.MUTED, fontSize: sz(u, tailleTexte), flexShrink: 0 }}>{l.label}</span>
            {/* La valeur passe à la ligne plutôt que d'être coupée : un SIRET, une
                adresse de siège ou un numéro de TVA doivent rester lisibles en entier. */}
            <span style={{ color: u.TEXT, fontSize: sz(u, tailleTexte), fontWeight: 600, fontFamily: u.FONT_B, textAlign: "right", minWidth: 0, overflowWrap: "anywhere" }}>{l.value}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
