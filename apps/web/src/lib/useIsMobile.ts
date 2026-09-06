"use client"

import { useCallback, useSyncExternalStore } from "react"

/**
 * Renvoie true quand la largeur de la fenêtre est <= breakpoint (768px par défaut).
 * Sert à adapter les styles inline (grilles, paddings, tailles) en mobile, là où
 * les media queries CSS ne s'appliquent pas (styles inline React).
 *
 * Le serveur ne connaît pas l'écran : il rend `false`. Avec `useSyncExternalStore`,
 * React compare la valeur serveur à la vraie valeur PENDANT l'hydratation et
 * corrige le rendu avant la première peinture qui suit — au lieu de peindre la
 * version PC, puis de la remplacer un effet plus tard (mesuré : 270 ms de barre
 * latérale fantôme sur téléphone).
 *
 * Ce que le HTML rendu par le serveur affiche AVANT l'arrivée du JavaScript reste
 * l'affaire du CSS : les éléments réservés à un format portent une classe et une
 * media query (voir DashboardShell : .qf-sidebar / .qf-mobile-nav).
 */
export function useIsMobile(breakpoint = 768): boolean {
  const subscribe = useCallback((notifier: () => void) => {
    const mq = window.matchMedia(`(max-width: ${breakpoint}px)`)
    mq.addEventListener("change", notifier)
    return () => mq.removeEventListener("change", notifier)
  }, [breakpoint])
  const getSnapshot = useCallback(() => window.matchMedia(`(max-width: ${breakpoint}px)`).matches, [breakpoint])
  return useSyncExternalStore(subscribe, getSnapshot, serveur)
}

const serveur = () => false
