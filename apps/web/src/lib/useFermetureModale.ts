"use client"

// useFermetureModale.ts — Ce qu'une fenêtre superposée doit faire, et que les
// trois de la page « Créer un QR » ne faisaient pas : se fermer avec Échap, geler
// le défilement de la page derrière, et rendre le focus à l'élément d'origine.
//
// Sans ça, on ouvre une fiche, on appuie sur Échap — rien ; on fait défiler, c'est
// la page du dessous qui bouge ; on ferme, et le focus est reparti au début du
// document. Le seul moyen de sortir au clavier était de tabuler jusqu'à la croix.

import { useEffect, useRef } from "react"

export function useFermetureModale(ouvert: boolean, onFermer: () => void) {
  const origine = useRef<HTMLElement | null>(null)

  useEffect(() => {
    if (!ouvert) return
    origine.current = (document.activeElement as HTMLElement) || null

    const defilement = document.body.style.overflow
    document.body.style.overflow = "hidden"

    const auClavier = (e: KeyboardEvent) => {
      if (e.key === "Escape") { e.stopPropagation(); onFermer() }
    }
    document.addEventListener("keydown", auClavier, true)

    return () => {
      document.removeEventListener("keydown", auClavier, true)
      document.body.style.overflow = defilement
      origine.current?.focus?.()
    }
  }, [ouvert, onFermer])
}

/**
 * Rend une carte cliquable utilisable au clavier, sans en faire un <button>
 * (impossible ici : ces cartes contiennent déjà des boutons imbriqués).
 */
export function carteCliquable(onActiver: () => void) {
  return {
    role: "button" as const,
    tabIndex: 0,
    onClick: onActiver,
    onKeyDown: (e: React.KeyboardEvent) => {
      if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onActiver() }
    },
  }
}
