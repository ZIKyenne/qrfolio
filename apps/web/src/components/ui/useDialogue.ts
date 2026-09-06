"use client"

// useDialogue — ce qui fait qu'une fenêtre est une VRAIE fenêtre modale :
// rôle annoncé, Échap qui ferme, tabulation qui tourne en rond dedans, focus
// rendu au bouton qui l'a ouverte, page derrière qui ne défile plus.
//
// La primitive Modal portait déjà tout cela ; quatre fenêtres écrites à la main
// (aperçu d'un modèle, nommage d'une page, « Publier », feuille « ⋯ » de
// l'éditeur) n'en avaient rien. Plutôt que de les reconstruire — et de risquer
// leur mise en page — elles adoptent le même comportement en trois lignes.

import { useEffect, useRef, type RefObject } from "react"

const FOCUSABLE =
  'a[href],button:not([disabled]),textarea:not([disabled]),input:not([disabled]),select:not([disabled]),[tabindex]:not([tabindex="-1"])'

export type PropsDialogue = {
  role: "dialog"
  "aria-modal": true
  "aria-label"?: string
  "aria-labelledby"?: string
  tabIndex: -1
}

/**
 * @param ouvert  la fenêtre est-elle affichée
 * @param fermer  ce qu'il faut appeler pour la fermer (Échap)
 * @param nom     nom accessible, ou `labelledBy` si un titre existe déjà
 */
export function useDialogue(
  ouvert: boolean,
  fermer: () => void,
  nom?: { label?: string; labelledBy?: string },
): { ref: RefObject<HTMLDivElement | null>; props: PropsDialogue } {
  const ref = useRef<HTMLDivElement>(null)
  const focusPrecedent = useRef<HTMLElement | null>(null)

  useEffect(() => {
    if (!ouvert) return
    focusPrecedent.current = document.activeElement as HTMLElement | null
    const boite = ref.current
    const focusables = () => Array.from(boite?.querySelectorAll<HTMLElement>(FOCUSABLE) ?? [])
    ;(focusables()[0] ?? boite)?.focus()

    const surTouche = (e: KeyboardEvent) => {
      if (e.key === "Escape") { e.stopPropagation(); fermer(); return }
      if (e.key !== "Tab") return
      const f = focusables()
      if (f.length === 0) { e.preventDefault(); return }
      const premier = f[0], dernier = f[f.length - 1]
      if (e.shiftKey && document.activeElement === premier) { e.preventDefault(); dernier.focus() }
      else if (!e.shiftKey && document.activeElement === dernier) { e.preventDefault(); premier.focus() }
    }
    document.addEventListener("keydown", surTouche, true)
    const debordementPrecedent = document.body.style.overflow
    document.body.style.overflow = "hidden"
    return () => {
      document.removeEventListener("keydown", surTouche, true)
      document.body.style.overflow = debordementPrecedent
      focusPrecedent.current?.focus?.()
    }
  }, [ouvert, fermer])

  return {
    ref,
    props: {
      role: "dialog",
      "aria-modal": true,
      ...(nom?.labelledBy ? { "aria-labelledby": nom.labelledBy } : nom?.label ? { "aria-label": nom.label } : {}),
      tabIndex: -1,
    },
  }
}
