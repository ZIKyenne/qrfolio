// firstPublish.ts — ce qui se passe juste après « ma page est en ligne ».
//
// Une page publiée ne sert à rien tant que personne ne peut la scanner. Entre
// « en ligne » et « un client scanne », il reste trois gestes que le produit ne
// disait nulle part : tester le QR, l'imprimer, le poser quelque part.
//
// Le plus important est le premier. Imprimer deux cents flyers avec un QR qu'on
// n'a jamais scanné soi-même, c'est le genre d'erreur qui coûte cher et qu'on ne
// découvre que devant un client. On le dit donc AVANT de proposer d'imprimer.
//
// Module PUR : aucune dépendance React, testable seul.

/** Où poser le support, par métier. Concret : un lieu, pas un conseil général. */
export const POSE_PAR_METIER: Record<string, string> = {
  "Restaurant":     "sur les tables et à côté de la caisse",
  "Café":           "sur le comptoir et les tables en terrasse",
  "Bar":            "sur le comptoir, là où on attend sa commande",
  "Boulangerie":    "près de la caisse, à hauteur des yeux",
  "Boucherie":      "sur le comptoir, près de la balance",
  "Traiteur":       "sur le comptoir et sur les emballages à emporter",
  "Food truck":     "sur le flanc du camion et au bord du passe-plat",
  "Caviste":        "en rayon, près des bouteilles conseillées",
  "Coiffeur":       "devant les miroirs et à l'accueil",
  "Beauté":         "en cabine et sur le comptoir d'accueil",
  "Spa":            "à l'accueil et dans les vestiaires",
  "Tatoueur":       "sur le poste de travail et en vitrine",
  "Boutique":       "en vitrine et à côté de la caisse",
  "Bijouterie":     "en vitrine, près des pièces mises en avant",
  "Fleuriste":      "sur le comptoir et dans les bouquets livrés",
  "Pharmacie":      "au comptoir et près de la file d'attente",
  "Hôtel":          "à la réception et dans chaque chambre",
  "Artisan":        "sur le véhicule, les devis et la carte de visite",
  "Garage":         "à l'accueil et sur la facture remise au client",
  "Coach":          "sur le lieu des séances et dans vos supports",
  "Salle de sport": "à l'accueil et sur les machines",
  "Immobilier":     "en vitrine et sur les panneaux devant les biens",
  "Freelance":      "sur la carte de visite et en signature de devis",
  "Photographe":    "sur les tirages et le book présenté aux clients",
  "Événement":      "à l'entrée, sur les tables et les affiches",
}

/** Phrase de pose pour un métier, avec repli utilisable partout. */
export function conseilPose(metier: string | null | undefined): string {
  const m = (metier || "").trim()
  return POSE_PAR_METIER[m] || "là où vos clients attendent : comptoir, vitrine, table"
}

export type Etape = { n: number; titre: string; pourquoi: string }

/**
 * Les trois gestes, dans l'ordre qui compte.
 *
 * `mobile` change le premier : on ne peut pas scanner un QR affiché sur le
 * téléphone qu'on tient. Sur mobile, on propose donc d'ouvrir la page — la
 * vérification utile devient « est-ce que ma page s'affiche bien ? ».
 */
export function etapes(mobile: boolean, metier?: string | null): Etape[] {
  return [
    mobile
      ? { n: 1, titre: "Vérifiez votre page", pourquoi: "Ouvrez-la comme le ferait un client. Un QR ne peut pas être scanné depuis le téléphone qui l'affiche — testez-le depuis un autre appareil avant d'imprimer." }
      : { n: 1, titre: "Testez le QR code", pourquoi: "Scannez-le avec votre téléphone, maintenant. Avant d'imprimer quoi que ce soit." },
    { n: 2, titre: "Imprimez-le sur un support", pourquoi: "Les textes sont déjà remplis à partir de votre page." },
    { n: 3, titre: "Posez-le", pourquoi: `Le meilleur endroit : ${conseilPose(metier)}.` },
  ]
}

/** Adresse publique lisible (sans le protocole), pour l'afficher telle qu'on la dicte. */
export function adresseLisible(url: string): string {
  return (url || "").replace(/^https?:\/\//, "").replace(/\/$/, "")
}
