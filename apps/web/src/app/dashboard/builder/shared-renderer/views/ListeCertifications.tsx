"use client"
// Liste de certifications partagée par `certifications` et `business_certifications`.
// Les deux blocs affichent la même chose ; ils ne différaient que par le nom de leurs
// champs, l'emoji par défaut — et par un écart qui, lui, se voyait : l'aperçu de
// `certifications` dessinait une coche verte à droite de chaque ligne, que la page
// publiée n'affichait jamais. La coche est désormais rendue par la même ligne de code
// des deux côtés, donc soit visible partout, soit nulle part.
import type { Certification } from "../models/logosEtTableaux"
import { TitreSection, pagePad } from "./TitreSection"
import { sz, type UnifiedCtx } from "../renderTypes"

export function ListeCertifications({ u, titre, certs, iconDefaut, fond, bord, margeTitre }: {
  u: UnifiedCtx
  titre?: string
  certs: Certification[]
  iconDefaut: string
  fond: string
  bord: string
  margeTitre: number
}) {
  return (
    <div style={{ padding: pagePad(u, 8), fontFamily: u.FONT_B }}>
      <TitreSection u={u} titre={titre} marge={margeTitre} />
      <div style={{ display: "flex", flexDirection: "column", gap: sz(u, 8) }}>
        {certs.map((ct, i) => (
          <div key={i} style={{
            display: "flex", alignItems: "center", gap: sz(u, 11),
            background: fond, border: `1px solid ${bord}`, borderRadius: sz(u, 12),
            padding: `${sz(u, 11)}px ${sz(u, 13)}px`,
          }}>
            <span style={{ fontSize: sz(u, 21), flexShrink: 0 }} aria-hidden>{ct.icon || iconDefaut}</span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ color: u.TEXT, fontSize: sz(u, 13), fontWeight: 700, margin: 0, fontFamily: u.FONT_B }}>{ct.name}</p>
              {(ct.org || ct.year) && <p style={{ color: u.MUTED, fontSize: sz(u, 11), margin: 0 }}>{ct.org}{ct.year ? (ct.org ? ` · ${ct.year}` : ct.year) : ""}</p>}
            </div>
            <span style={{ color: u.G, fontSize: sz(u, 15), flexShrink: 0 }} aria-hidden>✓</span>
          </div>
        ))}
      </div>
    </div>
  )
}
