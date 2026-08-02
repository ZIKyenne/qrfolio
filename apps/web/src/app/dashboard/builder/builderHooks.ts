import { useState, useRef, useCallback } from "react"

// ── Historique Undo/Redo ─────────────────────────────────────────────────
const MAX_HISTORY = 50
// Fenêtre de coalescing : deux push consécutifs portant la MÊME clé et espacés de
// moins que cette durée fusionnent en une seule entrée d'historique.
export const COALESCE_MS = 600

// Décision de coalescing — PURE (testable sans React, voir builderHooks.test.ts).
// Fusionne uniquement si : une clé est fournie, elle est identique à la précédente,
// on est au sommet de la pile (pas après un undo), et l'écart temporel est court.
export function shouldCoalesce(
  prevKey: string | null,
  prevTime: number,
  nextKey: string | null | undefined,
  now: number,
  atTip: boolean,
  windowMs: number = COALESCE_MS,
): boolean {
  if (nextKey == null) return false
  if (nextKey !== prevKey) return false
  if (!atTip) return false
  return now - prevTime < windowMs
}

// Générique sur T = l'unité d'historique. Le Builder l'utilise avec un SNAPSHOT
// { blocks, theme, name } pour rendre thème et nom de page annulables (pas seulement
// les blocs). T doit être sérialisable en JSON (deep clone).
export function useUndoRedo<T>(initial: T) {
  const historyRef = useRef<T[]>([JSON.parse(JSON.stringify(initial))])
  const cursorRef = useRef(0)
  const [, forceRender] = useState(0)
  // Suivi du dernier push pour le coalescing des frappes (même champ, rafale courte).
  const lastKeyRef = useRef<string | null>(null)
  const lastTimeRef = useRef(0)

  const getState = () => historyRef.current[cursorRef.current]

  // `coalesceKey` (optionnel) : ex. "field:<blocId>:<champ>". Les frappes rapides
  // sur le même champ REMPLACENT l'entrée de sommet au lieu d'en empiler une par
  // caractère (corrige la saturation de l'historique). Les opérations structurelles
  // (ajout/suppression/déplacement) n'en passent PAS -> chacune = une entrée.
  const push = useCallback((next: T, coalesceKey?: string | null) => {
    const now = Date.now()
    const atTip = cursorRef.current === historyRef.current.length - 1
    const clone = JSON.parse(JSON.stringify(next))
    if (shouldCoalesce(lastKeyRef.current, lastTimeRef.current, coalesceKey, now, atTip)) {
      // Remplace l'entrée de sommet (l'état d'AVANT la rafale reste en dessous).
      historyRef.current[cursorRef.current] = clone
    } else {
      // Tronquer le futur, empiler, limiter.
      historyRef.current = historyRef.current.slice(0, cursorRef.current + 1)
      historyRef.current.push(clone)
      if (historyRef.current.length > MAX_HISTORY + 1) {
        historyRef.current.shift()
      } else {
        cursorRef.current++
      }
    }
    lastKeyRef.current = coalesceKey ?? null
    lastTimeRef.current = now
  }, [])

  // Réinitialise l'historique à un unique état de base (cursor 0). À utiliser au
  // CHARGEMENT d'une page existante : sinon l'historique garde les blocs de démo
  // du montage, et un Ctrl+Z ramènerait la démo PAR-DESSUS le contenu réel
  // (l'autosave la persisterait) -> perte de contenu.
  const reset = useCallback((next: T) => {
    historyRef.current = [JSON.parse(JSON.stringify(next))]
    cursorRef.current = 0
    lastKeyRef.current = null
    forceRender(n => n + 1)
  }, [])

  const undo = useCallback(() => {
    if (cursorRef.current > 0) {
      cursorRef.current--
      lastKeyRef.current = null // toute frappe ultérieure démarre une nouvelle entrée
      forceRender(n => n + 1)
      return historyRef.current[cursorRef.current]
    }
    return null
  }, [])

  const redo = useCallback(() => {
    if (cursorRef.current < historyRef.current.length - 1) {
      cursorRef.current++
      lastKeyRef.current = null
      forceRender(n => n + 1)
      return historyRef.current[cursorRef.current]
    }
    return null
  }, [])

  const canUndo = () => cursorRef.current > 0
  const canRedo = () => cursorRef.current < historyRef.current.length - 1
  const size = () => historyRef.current.length
  const pos = () => cursorRef.current

  return { getState, push, reset, undo, redo, canUndo, canRedo, size, pos }
}

// ── Hook resize panneau ────────────────────────────────────────────────────
export function useResize(key: string, defaultW: number, min: number, max: number) {
  const [width, setWidth] = useState(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem(`qrfolio_resize_${key}`)
      if (saved) return Math.min(max, Math.max(min, parseInt(saved)))
    }
    return defaultW
  })
  const dragging = useRef(false)
  const startX = useRef(0)
  const startW = useRef(0)

  const onMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    dragging.current = true
    startX.current = e.clientX
    startW.current = width
    document.body.style.cursor = "col-resize"
    document.body.style.userSelect = "none"

    const onMove = (ev: MouseEvent) => {
      if (!dragging.current) return
      const delta = ev.clientX - startX.current
      const next = Math.min(max, Math.max(min, startW.current + delta))
      setWidth(next)
    }
    const onUp = () => {
      dragging.current = false
      document.body.style.cursor = ""
      document.body.style.userSelect = ""
      setWidth(prev => {
        localStorage.setItem(`qrfolio_resize_${key}`, String(prev))
        return prev
      })
      window.removeEventListener("mousemove", onMove)
      window.removeEventListener("mouseup", onUp)
    }
    window.addEventListener("mousemove", onMove)
    window.addEventListener("mouseup", onUp)
  }, [width, min, max, key])

  return { width, onMouseDown }
}
