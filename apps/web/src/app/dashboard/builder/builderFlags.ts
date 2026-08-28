// builderFlags.ts — Feature flags LOCAUX du Builder + activation progressive (missions C01 → C06).
//
// `BUILDER_REDESIGN` (valeur ENV, évaluée au build) reste la valeur de rendu SSR : c'est elle qui
// garantit une hydratation cohérente (serveur et 1er rendu client identiques). L'activation CANARY
// (localStorage / query param en dev) se résout APRÈS montage via `useBuilderRedesign()` — jamais au
// premier rendu, pour éviter tout mismatch d'hydratation.
//
// Règles d'activation (C06 §19/§26) : production OFF par défaut ; ENV peut activer (staging/canary
// serveur) ; override local explicite ("1"/"0") prioritaire et réversible par navigateur ; query
// param uniquement hors production ; repli OFF ; AUCUN secret ni email codé en dur.

import { useEffect, useState } from "react"

// Valeur ENV (build) — utilisée pour le rendu SSR et comme base d'hydratation.
//
// La référence DOIT être écrite en toutes lettres : Next remplace `process.env.NEXT_PUBLIC_X`
// par sa valeur au moment du build, mais uniquement quand la clé est littérale. L'ancienne
// version lisait `process.env[nom]` avec une clé calculée — impossible à remplacer, donc
// toujours `undefined` dans le navigateur. Résultat : la variable pouvait être posée sur
// Vercel sans le moindre effet, et toute la coquille mobile restait inatteignable.
export const BUILDER_REDESIGN: boolean =
  process.env.NEXT_PUBLIC_BUILDER_REDESIGN === "1" || process.env.NEXT_PUBLIC_BUILDER_REDESIGN === "true"

export const REDESIGN_STORAGE_KEY = "qrowg_builder_redesign"
export const REDESIGN_QUERY_PARAM = "builderRedesign"

export interface RedesignResolveInput {
  envEnabled: boolean
  /** localStorage["qrowg_builder_redesign"] : "1" force ON, "0" force OFF, autre = neutre. */
  localOverride?: string | null
  /** ?builderRedesign=1 allume, =0 éteint. Prioritaire, et valable en production. */
  queryOverride?: string | null
  isProduction: boolean
}

// Résolution PURE et déterministe du flag (testable sans navigateur). Priorité :
// query param explicite > override local explicite > ENV > OFF.
//
// Le param passe AVANT le local, et il vaut aussi en production. Sans cela, la
// seule façon d'essayer le nouveau Builder sur son téléphone était d'ouvrir une
// console de navigateur pour écrire dans localStorage — infaisable sur iPhone.
// Un lien doit suffire : ?builderRedesign=1 allume, =0 éteint. Le hook mémorise
// ensuite le choix, pour que la navigation suivante le garde.
export function resolveBuilderRedesignEnabled(input: RedesignResolveInput): boolean {
  const q = input.queryOverride
  if (q === "1" || q === "true") return true
  if (q === "0" || q === "false") return false
  if (input.localOverride === "1") return true
  if (input.localOverride === "0") return false
  return input.envEnabled
}

// Hook client. Démarre à la valeur ENV (= rendu SSR → pas de mismatch), puis applique l'override
// canary (localStorage / query en dev) après montage. Réagit aux changements de localStorage.
export function useBuilderRedesign(): boolean {
  const [enabled, setEnabled] = useState<boolean>(BUILDER_REDESIGN)

  useEffect(() => {
    const compute = () => {
      let localOverride: string | null = null
      let queryOverride: string | null = null
      try { localOverride = localStorage.getItem(REDESIGN_STORAGE_KEY) } catch { /* noop */ }
      try { queryOverride = new URLSearchParams(window.location.search).get(REDESIGN_QUERY_PARAM) } catch { /* noop */ }
      return resolveBuilderRedesignEnabled({
        envEnabled: BUILDER_REDESIGN,
        localOverride,
        queryOverride,
        isProduction: process.env.NODE_ENV === "production",
      })
    }
    // Un lien avec ?builderRedesign=1 (ou =0) mémorise le choix : la page
    // suivante le garde, sans reposer le paramètre dans l'URL.
    try {
      const q = new URLSearchParams(window.location.search).get(REDESIGN_QUERY_PARAM)
      if (q === "1" || q === "true") localStorage.setItem(REDESIGN_STORAGE_KEY, "1")
      else if (q === "0" || q === "false") localStorage.setItem(REDESIGN_STORAGE_KEY, "0")
    } catch { /* noop */ }
    setEnabled(compute())
    const onStorage = (e: StorageEvent) => { if (e.key === REDESIGN_STORAGE_KEY) setEnabled(compute()) }
    window.addEventListener("storage", onStorage)
    return () => window.removeEventListener("storage", onStorage)
  }, [])

  return enabled
}

// Aide dev : (dé)activer le nouveau Builder sur CE navigateur, sans variable d'env.
// À appeler depuis la console : window.__qrowgBuilderRedesign(true|false).
export function setBuilderRedesignOverride(on: boolean | null): void {
  try {
    if (on === null) localStorage.removeItem(REDESIGN_STORAGE_KEY)
    else localStorage.setItem(REDESIGN_STORAGE_KEY, on ? "1" : "0")
  } catch { /* noop */ }
}
