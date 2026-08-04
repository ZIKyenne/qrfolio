// Divergence CTA d'`album_block` (B09.11). Constat produit : album_block possède `cta_label`
// (défaut « Écouter l'album ») mais AUCUN champ `cta_url` dans BLOCK_DEFS → le CTA n'a pas de
// destination : c'est un LIBELLÉ non navigable, affiché uniquement en l'absence de plateforme
// (spotify/apple/deezer). L'éditeur le rendait, le public non → divergence §7. Ce modèle
// rétablit la parité (même condition des deux côtés) SANS inventer d'URL ni modifier les données.
export type AlbumBlockCtaModel = { visible: boolean; label: string }

export function albumBlockCtaModel(content: Record<string, any> | null | undefined): AlbumBlockCtaModel {
  const c = content || {}
  const noPlatform = !c.spotify_url && !c.apple_url && !c.deezer_url
  const label = typeof c.cta_label === "string" ? c.cta_label : ""
  return { visible: noPlatform && !!label, label }
}
