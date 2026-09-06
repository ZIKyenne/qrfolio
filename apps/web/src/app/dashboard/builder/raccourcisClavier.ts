// raccourcisClavier.ts — La table des raccourcis de l'éditeur, en règle pure.
//
// Elle vivait dans un `useEffect` de 171 lignes au milieu de BuilderV4.tsx
// (3 119 lignes) : seize raccourcis, avec des conditions fines — Ctrl+C ne
// s'empare de la copie que hors champ de saisie ET s'il y a une sélection,
// Suppr ne supprime que hors saisie, une flèche seule déplace la sélection tandis
// qu'Alt+flèche déplace le bloc — et pas une ligne de test.
// Ici, la décision est séparée de l'exécution : elle se teste, l'éditeur se
// contente d'exécuter ce qu'elle renvoie.

export type ActionClavier =
  | "palette" | "paletteOuvrir"
  | "annuler" | "retablir"
  | "bibliotheque" | "editeur" | "apercu" | "focus"
  | "dupliquer" | "copier" | "coller"
  | "deselectionner" | "toutSelectionner"
  | "supprimerSelection" | "supprimerBloc"
  | "deplacerBloc" | "deplacerSelection"

/** Ce que la règle a besoin de savoir de l'écran. */
export type EtatClavier = {
  /** Le curseur est dans un champ de saisie : presque tout est neutralisé. */
  saisieEnCours: boolean
  blocSelectionne: boolean
  selectionMultiple: boolean
}

export type ToucheClavier = { key: string; ctrl: boolean; shift?: boolean; alt?: boolean }

export type DecisionClavier = {
  action: ActionClavier
  /** −1 vers le haut, +1 vers le bas. Seulement pour les deux actions de flèche. */
  direction?: -1 | 1
  /** L'éditeur doit-il confisquer la touche au navigateur ? */
  bloquer: boolean
}

const est = (t: ToucheClavier, lettre: string) => t.key === lettre || t.key === lettre.toUpperCase()

/**
 * La touche pressée, l'état de l'écran → l'action à faire, ou null si l'éditeur
 * laisse passer. L'ordre des règles est celui d'origine : il compte (Ctrl+Z avant
 * Ctrl+Maj+Z, Ctrl+F avant « f » seul).
 */
export function actionClavier(t: ToucheClavier, etat: EtatClavier): DecisionClavier | null {
  const saisie = etat.saisieEnCours
  const ctrl = t.ctrl

  // La palette répond même en cours de saisie : c'est la porte de sortie.
  if (ctrl && est(t, "k")) return { action: "palette", bloquer: true }
  if (t.key === "/" && !ctrl && !saisie) return { action: "paletteOuvrir", bloquer: true }

  if (ctrl && !t.shift && est(t, "z") && !saisie) return { action: "annuler", bloquer: true }
  if (ctrl && ((t.shift && est(t, "z")) || est(t, "y")) && !saisie) return { action: "retablir", bloquer: true }

  if (ctrl && est(t, "b") && !saisie) return { action: "bibliotheque", bloquer: true }
  if (ctrl && est(t, "e") && !saisie) return { action: "editeur", bloquer: true }
  if (ctrl && est(t, "p") && !saisie) return { action: "apercu", bloquer: true }
  if (ctrl && est(t, "d") && !saisie) return { action: "dupliquer", bloquer: true }

  // Copier / coller : en cours de saisie, on laisse le navigateur faire son travail
  // dans le champ. Copier sans rien de sélectionné ne fait rien non plus.
  if (ctrl && est(t, "c")) {
    if (!saisie && (etat.blocSelectionne || etat.selectionMultiple)) return { action: "copier", bloquer: true }
    return null
  }
  if (ctrl && est(t, "v")) {
    if (!saisie) return { action: "coller", bloquer: true }
    return null
  }

  if (ctrl && est(t, "f") && !saisie) return { action: "focus", bloquer: true }
  if (t.key === "Escape" && !saisie) return { action: "deselectionner", bloquer: false }
  if (ctrl && est(t, "a") && !saisie) return { action: "toutSelectionner", bloquer: true }

  if ((t.key === "Delete" || t.key === "Backspace") && !saisie) {
    if (etat.selectionMultiple) return { action: "supprimerSelection", bloquer: true }
    if (etat.blocSelectionne) return { action: "supprimerBloc", bloquer: true }
    return null
  }

  // Flèches : seulement quand un bloc est déjà sélectionné, sinon on laisse la page
  // défiler normalement. Alt déplace le bloc, sans Alt on change de bloc.
  if ((t.key === "ArrowUp" || t.key === "ArrowDown") && !ctrl && !t.shift && !saisie) {
    if (!etat.blocSelectionne) return null
    const direction = t.key === "ArrowDown" ? 1 : -1
    return { action: t.alt ? "deplacerBloc" : "deplacerSelection", direction, bloquer: true }
  }

  // « f » seul, en dernier : Ctrl+F l'a déjà pris plus haut.
  if (!ctrl && !t.shift && !t.alt && est(t, "f") && !saisie) return { action: "focus", bloquer: false }

  return null
}
