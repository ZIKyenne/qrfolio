import { useState, useRef, useCallback } from "react"
import type { Block } from "./types"

// ── Historique Undo/Redo ─────────────────────────────────────────────────
const MAX_HISTORY = 50

export function useUndoRedo(initial: Block[]) {
  const historyRef = useRef<Block[][]>([JSON.parse(JSON.stringify(initial))])
  const cursorRef = useRef(0)
  const [, forceRender] = useState(0)

  const getState = () => historyRef.current[cursorRef.current]

  const push = useCallback((next: Block[]) => {
    // Tronquer le futur
    historyRef.current = historyRef.current.slice(0, cursorRef.current + 1)
    // Deep clone
    historyRef.current.push(JSON.parse(JSON.stringify(next)))
    // Limiter
    if (historyRef.current.length > MAX_HISTORY + 1) {
      historyRef.current.shift()
    } else {
      cursorRef.current++
    }
  }, [])

  // Réinitialise l'historique à un unique état de base (cursor 0). À utiliser au
  // CHARGEMENT d'une page existante : sinon l'historique garde les blocs de démo
  // du montage, et un Ctrl+Z ramènerait la démo PAR-DESSUS le contenu réel
  // (l'autosave la persisterait) -> perte de contenu.
  const reset = useCallback((next: Block[]) => {
    historyRef.current = [JSON.parse(JSON.stringify(next))]
    cursorRef.current = 0
    forceRender(n => n + 1)
  }, [])

  const undo = useCallback(() => {
    if (cursorRef.current > 0) {
      cursorRef.current--
      forceRender(n => n + 1)
      return historyRef.current[cursorRef.current]
    }
    return null
  }, [])

  const redo = useCallback(() => {
    if (cursorRef.current < historyRef.current.length - 1) {
      cursorRef.current++
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
