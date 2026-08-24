// Quelles pages publiées méritent d'être proposées à Google et aux moteurs IA.
//
// Le problème concret : le sitemap déclarait TOUTES les pages publiées. Sur les
// sept premières, trois étaient des essais — « Ma Page » sans un mot de contenu,
// « TEST 135 » sans un seul bloc. Envoyer un moteur lire ça, c'est lui apprendre
// que le domaine publie du vide.
//
// Une page exclue n'est PAS cassée : elle reste en ligne, le QR code y mène
// toujours, elle s'ouvre normalement. Elle n'est simplement pas *proposée* aux
// moteurs. Dès que son propriétaire lui donne un titre et du contenu, elle entre
// d'elle-même dans le sitemap au déploiement suivant.
//
// Le jugement porte sur le texte réellement rendu, pas sur le nombre de blocs :
// un bar peut avoir treize blocs dont deux seulement sont « du contenu » au sens
// du catalogue, et être une excellente page.

/** Longueur minimale du texte réel d'une page, hors titre. */
export const TEXTE_MINIMUM = 120

/** Titres que l'éditeur attribue par défaut, ou qui annoncent un essai. */
const TITRES_PAR_DEFAUT = [
  /^ma\s*page$/i,
  /^sans\s*titre$/i,
  /^nouvelle\s*page$/i,
  /^page\s*\d*$/i,
  /^untitled$/i,
  /^test\b/i,
  /^essai\b/i,
  /^demo\b/i,
  /^exemple\b/i,
]

/** Adresse générée automatiquement à la création et jamais renommée. */
const SLUG_AUTOMATIQUE = /^ma-page-[a-z0-9]{4,8}$/i

/** Clés de style et de mise en page : elles ne sont pas du contenu lisible. */
const CLE_TECHNIQUE = /^__/

// Tous les réglages ne sont pas préfixés par « __ » : « avatar_bg: halo »,
// « align: Centre », « pad: Aéré » sont stockés à plat, à côté du vrai texte.
// Les compter reviendrait à faire passer pour du contenu une page vide dont on
// aurait seulement choisi les couleurs. Liste relevée sur les blocs réels.
const CLES_DE_STYLE = new Set([
  "bg_color", "bg_color2", "bg_image", "bg_type", "edge", "overlay", "pad", "radius", "text_color",
  "align", "size", "layout", "height", "width", "zoom", "position", "icon_style",
  "avatar_bg", "avatar_border", "avatar_shadow", "hide_avatar",
  "columns", "gap", "ratio", "shape", "theme", "variant", "speed", "direction", "effect",
  "border", "shadow", "style", "anim", "loop", "hover",
])

/** Valeurs qui ne sont pas du texte : adresses, couleurs, réglages courts. */
const PAS_DU_TEXTE = [
  /^https?:\/\//i,
  /^data:/i,
  /^mailto:/i,
  /^tel:/i,
  /^#[0-9a-f]{3,8}$/i,
  /^\d+(\.\d+)?(px|rem|em|%|deg)?$/i,
]

/** Un titre est-il celui d'une vraie page, ou celui que l'éditeur a posé seul ? */
export function titreReel(titre: string | null | undefined): boolean {
  const t = (titre || "").trim()
  if (t.length < 2) return false
  if (SLUG_AUTOMATIQUE.test(t)) return false
  return !TITRES_PAR_DEFAUT.some(r => r.test(t))
}

/** Le texte que produit un bloc, tel qu'un lecteur le verrait. */
export { CLES_DE_STYLE }

export function texteDuBloc(content: unknown): string {
  const morceaux: string[] = []
  const visite = (v: unknown, cle: string) => {
    if (CLE_TECHNIQUE.test(cle) || CLES_DE_STYLE.has(cle)) return
    if (typeof v === "string") {
      const s = v.trim()
      if (s.length < 3) return
      if (PAS_DU_TEXTE.some(r => r.test(s))) return
      morceaux.push(s)
      return
    }
    if (Array.isArray(v)) { v.forEach(x => visite(x, cle)); return }
    if (v && typeof v === "object") {
      for (const [k, x] of Object.entries(v as Record<string, unknown>)) visite(x, k)
    }
  }
  visite(content, "")
  return morceaux.join(" ")
}

export type PagePubliee = {
  slug: string
  title?: string | null
  blocks?: { content?: unknown }[] | null
}

export type Verdict = {
  indexable: boolean
  /** Pourquoi la page est écartée — sert aux tests et au message affiché au client. */
  motif?: "slug_automatique" | "titre_par_defaut" | "sans_bloc" | "texte_insuffisant"
  texte: number
}

/** Décide si une page publiée doit être proposée aux moteurs. */
export function jugerPage(page: PagePubliee): Verdict {
  const blocs = page.blocks || []
  const texte = blocs.map(b => texteDuBloc(b?.content)).join(" ").trim().length

  if (SLUG_AUTOMATIQUE.test(page.slug)) return { indexable: false, motif: "slug_automatique", texte }
  if (!titreReel(page.title)) return { indexable: false, motif: "titre_par_defaut", texte }
  if (blocs.length === 0) return { indexable: false, motif: "sans_bloc", texte }
  if (texte < TEXTE_MINIMUM) return { indexable: false, motif: "texte_insuffisant", texte }
  return { indexable: true, texte }
}

/** Phrase affichée au propriétaire d'une page écartée, dans son tableau de bord. */
export function pourquoiPasReferencee(motif: Verdict["motif"]): string {
  switch (motif) {
    case "slug_automatique":
      return "Votre page garde l'adresse créée automatiquement. Choisissez une adresse à vous pour qu'elle soit proposée à Google."
    case "titre_par_defaut":
      return "Votre page n'a pas encore de titre à elle. Renommez-la pour qu'elle soit proposée à Google."
    case "sans_bloc":
      return "Votre page est encore vide. Ajoutez au moins un bloc pour qu'elle soit proposée à Google."
    case "texte_insuffisant":
      return "Votre page contient encore peu de texte. Complétez-la pour qu'elle soit proposée à Google."
    default:
      return "Votre page est proposée à Google."
  }
}
