"use client"

// Édition inline sur le canvas (Builder, Phase 2 §2.13). Champ texte éditable
// DIRECTEMENT dans l'aperçu : contentEditable NON contrôlé (le texte est posé via
// ref, jamais via children React) pour ne PAS déplacer le curseur au re-render.
// Commit AU BLUR -> une seule mutation = une seule entrée d'undo. Échap annule,
// Entrée valide (sauf multiligne). N'est éditable QUE dans le canvas d'édition
// (jamais dans le mini-aperçu ni sur la page publique).

import { useEffect, useRef, createElement, type CSSProperties } from "react"

interface Props {
  as?: keyof React.JSX.IntrinsicElements
  /**
   * Le texte affiché. Peut être absent : les modèles de blocs rendent des champs
   * optionnels (`e3_date` d'une frise vide, par exemple), et le composant les
   * normalise déjà en chaîne vide plus bas. Le type disait `string` alors que le
   * comportement acceptait `undefined` — cinq appelants étaient en faute pour un
   * défaut qui n'existait pas.
   */
  value: string | undefined
  onCommit: (v: string) => void
  editable: boolean
  style?: CSSProperties
  placeholder?: string
  multiline?: boolean
}

export function InlineEditable({ as = "span", value, onCommit, editable, style, placeholder, multiline }: Props) {
  const ref = useRef<HTMLElement | null>(null)

  // Pose/synchronise le texte SANS toucher au DOM tant que l'élément est focus
  // (sinon le curseur sauterait). value ?? "" évite un "undefined" affiché.
  useEffect(() => {
    const el = ref.current
    if (el && document.activeElement !== el) {
      const t = value ?? ""
      if (el.textContent !== t) el.textContent = t
    }
  }, [value, editable])

  if (!editable) {
    return createElement(as, { style }, value || placeholder || "")
  }

  const commit = () => {
    const el = ref.current
    if (!el) return
    const t = el.textContent ?? ""
    if (t !== (value ?? "")) onCommit(t)
  }

  return createElement(as, {
    ref,
    contentEditable: true,
    suppressContentEditableWarning: true,
    "data-inline-ph": placeholder,
    onBlur: commit,
    onKeyDown: (e: React.KeyboardEvent) => {
      if (e.key === "Enter" && !multiline) { e.preventDefault(); (e.currentTarget as HTMLElement).blur() }
      else if (e.key === "Escape") { const el = ref.current; if (el) el.textContent = value ?? ""; (e.currentTarget as HTMLElement).blur() }
    },
    style: { ...style, outline: "none", cursor: "text" },
  })
}
