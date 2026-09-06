// identitePageSeo — de qui parle une page publiée, pour Google.
//
// Deux défauts mesurés le 4 septembre :
//  1. la description de repli commençait par le nom du TITULAIRE DU COMPTE :
//     l'extrait Google d'une brasserie annonçait « Jean Dupont sur QRowg » ;
//  2. le JSON-LD déclarait `mainEntity: Person` pour TOUTE page, brasserie et
//     agence immobilière comprises — un balisage faux, que Google ignore au
//     mieux, qui empêche le rich result « établissement » au pire.
//
// La page porte un titre choisi par son auteur : c'est lui qui nomme l'affaire.
// Le modèle d'origine (`template_id`) dit de quel genre d'affaire il s'agit.

export type EntreeIdentite = {
  titre?: string | null
  nomProprietaire?: string | null
  templateId?: string | null
}

/** Le nom que Google doit lire : le titre de la page d'abord, le compte en dernier recours. */
export function nomAffiche(e: EntreeIdentite): string {
  return (e.titre || "").trim() || (e.nomProprietaire || "").trim() || "Cette page"
}

// Préfixes des modèles rattachés à un établissement ayant une adresse physique.
const ETABLISSEMENT = ["resto", "commerce", "beaute", "immo", "artisan", "asso", "event"]
// Préfixes des modèles où la page présente UNE personne.
const PERSONNE = ["freelance", "creatif", "coach"]

export type TypeEntite = "LocalBusiness" | "Person" | "Organization"

export function typeEntite(templateId?: string | null): TypeEntite {
  const t = (templateId || "").toLowerCase()
  if (ETABLISSEMENT.some(p => t.startsWith(p))) return "LocalBusiness"
  if (PERSONNE.some(p => t.startsWith(p))) return "Person"
  // Sans modèle connu, « Organization » : neutre, vrai pour une page d'entreprise
  // comme pour une page de projet, et jamais faux au point d'être trompeur.
  return "Organization"
}

/** Description de repli, quand l'auteur n'a pas rempli la sienne. 158 caractères max. */
export function descriptionRepli(e: EntreeIdentite): string {
  const nom = nomAffiche(e)
  return `${nom} — coordonnées, horaires, liens et contact réunis sur une seule page, accessible en un scan.`.slice(0, 158)
}

/** Le type Open Graph : « profile » ne vaut que pour la page d'une personne. */
export function typeOg(templateId?: string | null): "profile" | "website" {
  return typeEntite(templateId) === "Person" ? "profile" : "website"
}

export function jsonLdPage(opts: {
  titre?: string | null
  nomProprietaire?: string | null
  templateId?: string | null
  descriptionSeo?: string | null
  url: string
  image?: string | null
}): Record<string, unknown> {
  const e: EntreeIdentite = { titre: opts.titre, nomProprietaire: opts.nomProprietaire, templateId: opts.templateId }
  const nom = nomAffiche(e)
  const type = typeEntite(opts.templateId)
  return {
    "@context": "https://schema.org",
    "@type": type === "Person" ? "ProfilePage" : "WebPage",
    name: nom,
    description: opts.descriptionSeo || descriptionRepli(e),
    url: opts.url,
    inLanguage: "fr",
    mainEntity: {
      "@type": type,
      name: nom,
      url: opts.url,
      ...(opts.image ? { image: opts.image } : {}),
    },
  }
}
