// quotaQr.ts — Un seul endroit qui répond « est-ce que je peux, et sinon pourquoi ».
//
// Six messages indépendants pouvaient s'afficher en même temps sur cet écran :
// un bandeau qui promettait « 2 essais gratuits », un bouton verrouillé qui
// annonçait « limite de 2 essais atteinte », un paragraphe qui reparlait de
// gratuité juste en dessous, un cadenas sur l'aperçu, un second bouton verrouillé
// pour une AUTRE limite, et une barre latérale qui affichait un troisième chiffre.
// Ils venaient de trois compteurs différents, tous appelés « QR ».
//
// Il n'y en a plus qu'un jeu, dérivé du plan, calculé ici, et la page n'affiche
// que ce que cette fonction dit.

import { qrLimit, dynLimit, getPlan } from "@/lib/plans"

export type QrEnregistre = { dynamic?: boolean | null }

export type EtatQuota = {
  /** Places restantes parmi les QR autonomes. null = illimité. */
  restants: number | null
  /** Places restantes parmi les QR modifiables après impression. null = illimité. */
  restantsModifiables: number | null
  /** Peut enregistrer un QR de plus, modifiable ou non. */
  peutEnregistrer: boolean
  /** Peut créer un QR modifiable de plus (exige aussi une place « autonome »). */
  peutCreerModifiable: boolean
  /** LA phrase à afficher quand une action est refusée. null si rien n'est bloqué. */
  raison: string | null
  /** La même, pour le refus spécifique d'un QR modifiable. */
  raisonModifiable: string | null
}

const pluriel = (n: number, mot: string) => `${n} ${mot}${n > 1 ? "s" : ""}`

export function etatQuota(plan: string | null | undefined, enregistres: QrEnregistre[]): EtatQuota {
  const nomPlan = getPlan(plan).label
  const limite = qrLimit(plan)
  const limiteModifiables = dynLimit(plan)

  const total = enregistres.length
  const modifiables = enregistres.filter(q => q?.dynamic === true).length

  const restants = limite === null ? null : Math.max(0, limite - total)
  const restantsModifiables = limiteModifiables === null ? null : Math.max(0, limiteModifiables - modifiables)

  const peutEnregistrer = restants === null || restants > 0
  const placeModifiable = restantsModifiables === null || restantsModifiables > 0
  const peutCreerModifiable = peutEnregistrer && placeModifiable

  const raison = peutEnregistrer
    ? null
    : `Vous avez atteint les ${pluriel(limite as number, "QR")} du plan ${nomPlan}. Supprimez-en un, ou changez de plan.`

  const raisonModifiable = peutCreerModifiable
    ? null
    : !peutEnregistrer
      ? raison
      : `Vous avez atteint ${limiteModifiables === 1 ? "le QR modifiable" : `les ${pluriel(limiteModifiables as number, "QR modifiable")}`} du plan ${nomPlan}. Vous pouvez encore créer un QR non modifiable.`

  return { restants, restantsModifiables, peutEnregistrer, peutCreerModifiable, raison, raisonModifiable }
}
