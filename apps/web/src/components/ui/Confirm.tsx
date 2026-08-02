"use client"

// Système de confirmation QRowg (design system).
// Remplace les window.confirm() natifs (non stylés, non accessibles) par une
// promesse adossée au primitive Modal : `if (!(await confirm({...}))) return`
// est un remplacement quasi à l'identique de `if (!window.confirm(...)) return`.
// Le Modal apporte le piège de focus, Échap, le clic scrim et la restauration
// du focus. Monté une seule fois dans le layout dashboard (ConfirmProvider).

import { createContext, useCallback, useContext, useRef, useState, type ReactNode } from "react"
import { Modal } from "./Modal"
import { Button } from "./Button"

export interface ConfirmOptions {
  /** Titre du dialogue (défaut : « Confirmer »). */
  title?: string
  /** Corps : texte (les \n deviennent des sauts de ligne) ou nœud React. */
  message: ReactNode
  /** Libellé du bouton de confirmation (défaut : « Confirmer »). */
  confirmLabel?: string
  /** Libellé du bouton d'annulation (défaut : « Annuler »). */
  cancelLabel?: string
  /** Action destructrice : bouton rouge (défaut : primaire). */
  danger?: boolean
}

type ConfirmFn = (opts: ConfirmOptions) => Promise<boolean>

const ConfirmContext = createContext<ConfirmFn | null>(null)

export function ConfirmProvider({ children }: { children: ReactNode }) {
  const [opts, setOpts] = useState<ConfirmOptions | null>(null)
  const resolverRef = useRef<((v: boolean) => void) | null>(null)

  const confirm = useCallback<ConfirmFn>((o) => {
    setOpts(o)
    return new Promise<boolean>((resolve) => { resolverRef.current = resolve })
  }, [])

  const settle = useCallback((v: boolean) => {
    resolverRef.current?.(v)
    resolverRef.current = null
    setOpts(null)
  }, [])

  // Rend les \n comme sauts de ligne quand le message est une simple chaîne.
  const body: ReactNode = typeof opts?.message === "string"
    ? <span style={{ whiteSpace: "pre-line" }}>{opts.message}</span>
    : opts?.message

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      {opts && (
        <Modal
          open
          onClose={() => settle(false)}
          title={opts.title ?? "Confirmer"}
          footer={<>
            <Button variant="ghost" onClick={() => settle(false)}>{opts.cancelLabel ?? "Annuler"}</Button>
            <Button variant={opts.danger ? "danger" : "primary"} onClick={() => settle(true)}>{opts.confirmLabel ?? "Confirmer"}</Button>
          </>}
        >
          {body}
        </Modal>
      )}
    </ConfirmContext.Provider>
  )
}

/**
 * Hook de confirmation. Retourne une fonction `confirm(opts) => Promise<boolean>`.
 * À utiliser à l'intérieur du ConfirmProvider (monté dans le layout dashboard).
 */
export function useConfirm(): ConfirmFn {
  const ctx = useContext(ConfirmContext)
  if (!ctx) throw new Error("useConfirm doit être utilisé dans un ConfirmProvider")
  return ctx
}
