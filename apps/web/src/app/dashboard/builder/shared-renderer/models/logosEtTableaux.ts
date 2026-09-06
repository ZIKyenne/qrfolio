// Modèles PURS de la vague « logos, certifications et tableaux » (aucun React).
//
// Ces six blocs étaient écrits DEUX fois — une fois dans l'aperçu de l'éditeur, une
// fois dans la page publiée — et les deux copies avaient divergé. Le commerçant
// réglait donc une chose et en publiait une autre. Les écarts constatés :
//   • certifications : l'aperçu dessinait un ✓ vert à droite de chaque ligne, absent
//     de la page publiée. Son jumeau business_certifications l'affichait des deux
//     côtés — deux blocs quasi identiques, deux comportements.
//   • logo_wall / partners : l'aperçu remplissait la grille de 8 (resp. 6) cases
//     « Logo » quand elle était vide. Rien de tout cela n'était publié.
//   • info_table : le filet de séparation suivait le thème dans l'aperçu, et était
//     figé en blanc à 6 % sur la page — invisible sur un thème clair.
//   • legal_info : l'aperçu coupait la valeur sur une ligne (…), la page la laissait
//     passer à la ligne. Un SIRET long ne rendait pas pareil des deux côtés.
//
// La géométrie de référence est celle de la PAGE PUBLIÉE : c'est ce que voit le
// visiteur. L'aperçu la reprend, réduite par `scale`.

export type Logo = { img: string; name: string }
export type Certification = { icon: string; name: string; org: string; year: string }
export type LigneInfo = { label: string; value: string }

const txt = (v: unknown): string => (typeof v === "string" ? v.trim() : "")

// Mur de logos. `cle` vaut "logo" (logo_wall) ou "logo_img" (partners) : les deux
// blocs stockent l'image sous un nom différent, tout le reste est commun.
export function murLogos(c: Record<string, any> | null | undefined, cle: "logo" | "logo_img", max = 50): Logo[] {
  const src = c || {}
  const out: Logo[] = []
  for (let i = 1; i <= max; i++) {
    const name = txt(src[`logo${i}_name`])
    if (!name) continue          // le nom porte la ligne : sans lui, rien à montrer
    out.push({ img: txt(src[cle === "logo" ? `logo${i}` : `logo${i}_img`]), name })
  }
  return out
}

// Certifications. `prefixe` vaut "cert_" (certifications) ou "c" (business_certifications).
export function listeCertifications(c: Record<string, any> | null | undefined, prefixe: "cert_" | "c", max = 50): Certification[] {
  const src = c || {}
  const out: Certification[] = []
  for (let i = 1; i <= max; i++) {
    const k = `${prefixe}${i}_`
    const name = txt(src[`${k}name`])
    if (!name) continue
    out.push({ icon: txt(src[`${k}icon`]), name, org: txt(src[`${k}org`]), year: txt(src[`${k}year`]) })
  }
  return out
}

// Tableau d'informations libre : label + valeur.
export function lignesInfo(c: Record<string, any> | null | undefined, max = 50): LigneInfo[] {
  const src = c || {}
  const out: LigneInfo[] = []
  for (let i = 1; i <= max; i++) {
    const label = txt(src[`r${i}_label`])
    if (!label) continue         // parité legacy : le label seul décide
    out.push({ label, value: txt(src[`r${i}_value`]) })
  }
  return out
}

// Mentions légales : sept champs nommés, dans un ordre fixe, les vides sautés.
export const CHAMPS_LEGAUX: ReadonlyArray<readonly [string, string]> = [
  ["Société", "company_name"], ["SIRET", "siret"], ["N° TVA", "tva"],
  ["Siège social", "address"], ["Capital", "capital"], ["RCS", "rcs"], ["Email", "email"],
]

export function lignesLegales(c: Record<string, any> | null | undefined): LigneInfo[] {
  const src = c || {}
  return CHAMPS_LEGAUX.map(([label, cle]) => ({ label, value: txt(src[cle]) })).filter(l => l.value !== "")
}
