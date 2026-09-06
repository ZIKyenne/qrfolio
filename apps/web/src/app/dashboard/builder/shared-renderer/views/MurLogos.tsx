"use client"
// Mur de logos partagé par `logo_wall` (4 colonnes) et `partners` (3 colonnes).
// Ces deux blocs étaient écrits quatre fois au total (deux blocs × deux renderers)
// pour la même grille ; ils n'ont plus qu'une seule source.
//
// Deux corrections héritées de la mise en commun :
//  • l'aperçu remplissait la grille de cases « Logo » factices quand elle était vide,
//    alors que la page publiée n'affichait rien. Un état vide explicite le remplace.
//  • la case du logo était peinte en blanc à 4 % en dur : invisible sur un thème
//    clair. Elle prend maintenant le jeton de surface adaptatif (u.FILL / u.LINE).
import { sharedImageModel } from "../models/sharedImage"
import type { Logo } from "../models/logosEtTableaux"
import { PublicSharedImage } from "../primitives/PublicImage"
import { EditorSharedImage } from "../primitives/EditorImage"
import { TitreSection, pagePad } from "./TitreSection"
import { sz, type UnifiedCtx } from "../renderTypes"

export function MurLogos({ u, titre, logos, cols, hauteur, padImage, radius }: {
  u: UnifiedCtx
  titre?: string
  logos: Logo[]
  cols: 3 | 4
  hauteur: number
  padImage: number
  radius: number
}) {
  const sizes = cols === 4 ? "(max-width: 520px) 25vw, 110px" : "(max-width: 520px) 33vw, 145px"
  const cote = sz(u, hauteur)
  return (
    <div style={{ padding: pagePad(u), fontFamily: u.FONT_B }}>
      <TitreSection u={u} titre={titre} marge={12} />
      <div style={{ display: "grid", gridTemplateColumns: `repeat(${cols},1fr)`, gap: sz(u, 9) }}>
        {logos.map((l, i) => (
          <div key={i} style={{
            height: cote, background: u.FILL, border: `1px solid ${u.LINE}`, borderRadius: sz(u, radius),
            display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden",
          }}>
            {/* Pas d'image, ou une source refusee par le contrat d'image : on affiche
                le nom. L'ancienne page publiait une balise image cassee dans ce dernier cas. */}
            {(() => {
              const modele = sharedImageModel(l.img, { alt: l.name })
              const styleImg = { maxWidth: "100%", maxHeight: "100%", objectFit: "contain" as const, padding: padImage ? sz(u, padImage) : undefined }
              if (!modele.src) return <p style={{ color: u.MUTED, fontSize: sz(u, cols === 4 ? 9 : 11), margin: 0, textAlign: "center", padding: `0 ${sz(u, 5)}px`, lineHeight: 1.2 }}>{l.name}</p>
              return u.mode === "public"
                ? <PublicSharedImage model={modele} width={240} height={240} sizes={sizes} style={styleImg} />
                : <EditorSharedImage model={modele} width={240} height={240} sizes={sizes} style={styleImg} />
            })()}
          </div>
        ))}
      </div>
    </div>
  )
}
