// Le contraste d'un QR code, jugé au même endroit pour tout le produit.
//
// Trois échelles incompatibles coexistaient : le QR Studio, le Print Studio et
// le testeur public. À 4,2 pour 1, le Print Studio annonçait « conforme » et le
// testeur du même site annonçait « risque ». Deux outils de QRowg donnaient au
// même client deux réponses opposées sur le même fichier.
//
// Les seuils retenus sont ceux du QR Studio, les plus granulaires et déjà en
// production. Les deux autres outils en dérivent désormais.

/** En dessous : le code sera probablement illisible. */
export const CONTRASTE_INSUFFISANT = 2
/** En dessous : risque réel de non-lecture à l'impression. */
export const CONTRASTE_FAIBLE = 3
/** En dessous : ça passe, mais sans marge. */
export const CONTRASTE_JUSTE = 4.5
/** À partir d'ici, le contraste est franc, y compris sous un mauvais éclairage. */
export const CONTRASTE_FRANC = 7

export type NiveauContraste = "insuffisant" | "faible" | "juste" | "bon" | "franc"

/** Le niveau d'un rapport de contraste. `null` quand la mesure est impossible. */
export function niveauContraste(rapport: number | null | undefined): NiveauContraste | null {
  if (typeof rapport !== "number" || !Number.isFinite(rapport)) return null
  if (rapport < CONTRASTE_INSUFFISANT) return "insuffisant"
  if (rapport < CONTRASTE_FAIBLE) return "faible"
  if (rapport < CONTRASTE_JUSTE) return "juste"
  if (rapport < CONTRASTE_FRANC) return "bon"
  return "franc"
}

/**
 * Le même jugement ramené à trois marches, pour les écrans qui n'en affichent
 * que trois (vert / orange / rouge). Dériver plutôt que redéfinir : c'est ce
 * qui garantit que les trois outils ne se contrediront plus.
 */
export function verdictContraste(rapport: number | null | undefined): "ok" | "warn" | "fail" | "na" {
  const n = niveauContraste(rapport)
  if (n === null) return "na"
  if (n === "insuffisant" || n === "faible") return "fail"
  if (n === "juste") return "warn"
  return "ok"
}
