// Le contraste, calculé et jugé au même endroit pour tout le produit.
//
// Trois ÉCHELLES incompatibles coexistaient : le QR Studio, l'atelier d'impression et
// le testeur public. À 4,2 pour 1, l'atelier d'impression annonçait « conforme » et le
// testeur du même site annonçait « risque ». Deux outils de QRowg donnaient au
// même client deux réponses opposées sur le même fichier. Les seuils ci-dessous
// ont réglé ça.
//
// Restait le CALCUL lui-même, réécrit cinq fois : qrLinkUtils, printPreflight,
// builder/types, print-studio/mockup et pageIntro. Même formule à chaque fois,
// mais trois façons de traiter une couleur invalide (luminance 1, 0, ou null) et
// un arrondi à deux décimales chez un seul — de quoi faire basculer un rapport
// de 4,4951 d'un côté ou de l'autre du seuil de 4,5 selon l'écran consulté.
//
// Une seule implémentation désormais. Les cinq autres en dérivent.

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


// ── Le calcul ─────────────────────────────────────────────────────────────────

/**
 * Luminance relative sRGB (WCAG 2.x) d'une couleur `#rgb` ou `#rrggbb`.
 * `null` si la couleur n'est pas lisible — jamais une valeur inventée : les trois
 * anciennes versions renvoyaient 1, 0 ou null pour le même cas, donc trois
 * verdicts différents sur une couleur abîmée en base.
 */
export function luminance(hex: unknown): number | null {
  if (typeof hex !== "string") return null
  let h = hex.trim().replace(/^#/, "")
  if (h.length === 3) h = h.split("").map(c => c + c).join("")
  if (!/^[0-9a-fA-F]{6}$/.test(h)) return null
  const lin = (v: number) => { const s = v / 255; return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4) }
  const r = lin(parseInt(h.slice(0, 2), 16))
  const g = lin(parseInt(h.slice(2, 4), 16))
  const b = lin(parseInt(h.slice(4, 6), 16))
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}

/**
 * Rapport de contraste WCAG entre deux couleurs (1 à 21), NON arrondi.
 * C'est cette valeur qu'on compare aux seuils : arrondir d'abord faisait passer
 * 4,4951 pour 4,5 sur un écran et pas sur l'autre.
 */
export function rapportContraste(a: unknown, b: unknown): number | null {
  const la = luminance(a), lb = luminance(b)
  if (la === null || lb === null) return null
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05)
}

/** Le même rapport arrondi à deux décimales — pour l'AFFICHAGE seulement. */
export function rapportAffiche(a: unknown, b: unknown): number | null {
  const r = rapportContraste(a, b)
  return r === null ? null : Math.round(r * 100) / 100
}

/**
 * Rapport ou, si une couleur est illisible, la valeur la PLUS DÉFAVORABLE (1).
 * Pour les contrôles avant impression : une couleur qu'on n'arrive pas à lire ne
 * doit jamais produire un « conforme » par accident.
 */
export function rapportOuPire(a: unknown, b: unknown): number {
  return rapportContraste(a, b) ?? 1
}

/**
 * Vrai si les modules sont plus CLAIRS que le fond. Le rapport de contraste est
 * symétrique et ne le dit pas ; or un QR clair sur fond sombre est refusé par une
 * partie des lecteurs et par la plupart des impressions, même bien contrasté.
 */
export function estInverse(modules: unknown, fond: unknown): boolean {
  const lm = luminance(modules), lf = luminance(fond)
  if (lm === null || lf === null) return false
  return lm > lf
}

/**
 * Noir ou blanc — celui des deux qui se lit le mieux sur `fond`.
 *
 * Deux méthodes coexistaient : comparer les deux rapports de contraste (juste),
 * et comparer la luminance à un seuil de 0,48 (faux). Elles divergeaient sur
 * huit couleurs de la palette QRowg sur vingt-deux testées — dont l'or #C9A84C,
 * pour lequel la seconde choisissait du BLANC : 2,4 pour 1, sous le minimum
 * lisible de 4,5, sur la couleur de marque elle-même.
 */
export function encreLisible(fond: unknown, sombre = "#111111", clair = "#FFFFFF"): string {
  const rSombre = rapportContraste(sombre, fond)
  const rClair = rapportContraste(clair, fond)
  if (rSombre === null || rClair === null) return sombre
  return rSombre >= rClair ? sombre : clair
}
