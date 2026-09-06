// seoMeta — la carte de visite d'une page pour les réseaux sociaux et les moteurs.
//
// En App Router, `openGraph` défini par une page REMPLACE entièrement celui du
// layout racine : `locale: "fr_FR"` y était posé une fois, et disparaissait des
// 14 sous-pages qui déclarent le leur. Un partage Facebook d'une page française
// était donc annoncé sans langue.
//
// `ogFor()` construit les deux blocs (Open Graph + Twitter) à partir des trois
// seules choses qui changent d'une page à l'autre : l'adresse, le titre, la
// description. Tout le reste — siteName, locale, type, carte Twitter — est ici,
// à un seul endroit.

import type { Metadata } from "next"

export const SITE_NAME = "QRowg"
export const LOCALE = "fr_FR"

export type OgOptions = {
  /** Chemin absolu de la page (https://qrowg.com/features). */
  url: string
  /** Titre affiché dans l'aperçu de partage. « | QRowg » est ajouté s'il manque. */
  title: string
  description: string
  /** « website » par défaut ; « article » pour un guide. */
  type?: "website" | "article"
  /** Image de partage (absolue). Sans elle, l'image générée par la route opengraph-image sert. */
  image?: string
  publishedTime?: string
  modifiedTime?: string
}

/** Ajoute « | QRowg » une seule fois. */
export function titreSocial(titre: string): string {
  return titre.includes(SITE_NAME) ? titre : `${titre} | ${SITE_NAME}`
}

export function ogFor(o: OgOptions): Pick<Metadata, "openGraph" | "twitter"> {
  const title = titreSocial(o.title)
  const images = o.image ? [{ url: o.image, width: 1200, height: 630, alt: title }] : undefined
  return {
    openGraph: {
      type: o.type ?? "website",
      locale: LOCALE,
      url: o.url,
      siteName: SITE_NAME,
      title,
      description: o.description,
      ...(images ? { images } : {}),
      ...(o.type === "article" && o.publishedTime ? { publishedTime: o.publishedTime } : {}),
      ...(o.type === "article" && o.modifiedTime ? { modifiedTime: o.modifiedTime } : {}),
    },
    twitter: {
      card: "summary_large_image",
      title,
      description: o.description,
      ...(o.image ? { images: [o.image] } : {}),
    },
  }
}

// ── Longueur des descriptions ────────────────────────────────────────────────
// Google coupe autour de 155-160 caractères ; en dessous de 120, l'extrait est
// complété par une phrase prise au hasard dans la page. Quatre descriptions
// dépassaient (183, 182, 178) et une était trop courte (108).
export const DESC_MIN = 120
export const DESC_MAX = 160

export function descriptionHorsFenetre(d: string): boolean {
  return d.length < DESC_MIN || d.length > DESC_MAX
}
