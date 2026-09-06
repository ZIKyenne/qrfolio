// texteAlternatif — ce qu'un lecteur d'écran annonce à la place d'une image.
//
// Relevé le 4 septembre : la galerie de la page publiée rendait ses photos avec
// `alt=""`, et le bloc n'avait aucun champ pour en écrire un. Sur une page dont
// les photos SONT le contenu — un menu photographié, un portfolio, une carte des
// desserts — une personne aveugle n'entendait rien du tout.
//
// Règle : une image qui EST le contenu reçoit un texte ; une vignette posée à
// côté d'un titre déjà lisible reste `alt=""` (l'annoncer deux fois est pire).

/** Nettoie une légende saisie par l'auteur : une ligne, 160 caractères. */
export function legendeSaine(v: unknown): string {
  return typeof v === "string" ? v.replace(/\s+/g, " ").trim().slice(0, 160) : ""
}

/**
 * Texte d'une photo de galerie.
 * `legende` : ce que l'auteur a écrit pour CETTE photo (prioritaire).
 * `titre`   : le titre du bloc, s'il y en a un.
 * `i`, `total` : rang (0-based) et nombre de photos.
 */
export function altGalerie(legende: unknown, titre: unknown, i: number, total: number): string {
  const l = legendeSaine(legende)
  if (l) return l
  const t = legendeSaine(titre)
  const rang = total > 1 ? `Photo ${i + 1} sur ${total}` : "Photo"
  return t ? `${t} — ${rang.toLowerCase()}` : rang
}

/** Texte d'une image illustrant un élément nommé (plat, produit, membre…). */
export function altDe(nom: unknown, repli = ""): string {
  return legendeSaine(nom) || repli
}
