"use client"

// Système de notifications global unifié (remplace les alert() bloquants et les
// toasts dispersés). Monté une fois dans le layout dashboard ; s'utilise partout
// via useToast(). Accessible : conteneur aria-live, fermeture clavier, auto-dismiss.
import { createContext, useContext, useState, useCallback, useMemo, type ReactNode } from "react"

type ToastKind = "success" | "error" | "info"
type ToastAction = { label: string; onClick: () => void }
type ToastOpts = { action?: ToastAction }
type ToastItem = { id: number; kind: ToastKind; msg: string; action?: ToastAction }
type ToastApi = {
  success: (msg: string, opts?: ToastOpts) => void
  error: (msg: string, opts?: ToastOpts) => void
  info: (msg: string, opts?: ToastOpts) => void
}

const Ctx = createContext<ToastApi | null>(null)

export function useToast(): ToastApi {
  const c = useContext(Ctx)
  if (!c) throw new Error("useToast doit être utilisé à l'intérieur de <ToastProvider>")
  return c
}

let seq = 0

const STYLES: Record<ToastKind, { bar: string; icon: string; ico: string }> = {
  success: { bar: "var(--success)", ico: "✓", icon: "rgba(57,255,143,0.14)" },
  error:   { bar: "var(--danger)", ico: "!", icon: "rgba(255,107,107,0.14)" },
  info:    { bar: "var(--accent)", ico: "i", icon: "color-mix(in srgb, var(--accent) 14%, transparent)" },
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([])

  const dismiss = useCallback((id: number) => {
    setToasts(t => t.filter(x => x.id !== id))
  }, [])

  const push = useCallback((kind: ToastKind, msg: string, opts?: ToastOpts) => {
    const id = ++seq
    setToasts(t => [...t, { id, kind, msg, action: opts?.action }])
    // Erreurs et toasts avec action (ex. « Annuler ») restent plus longtemps.
    setTimeout(() => dismiss(id), opts?.action ? 7000 : kind === "error" ? 6000 : 4000)
  }, [dismiss])

  const api = useMemo<ToastApi>(() => ({
    success: (m, o) => push("success", m, o),
    error: (m, o) => push("error", m, o),
    info: (m, o) => push("info", m, o),
  }), [push])

  return (
    <Ctx.Provider value={api}>
      {children}
      <div
        aria-live="polite"
        aria-atomic="false"
        style={{
          position: "fixed", left: 0, right: 0, bottom: "calc(18px + env(safe-area-inset-bottom))",
          zIndex: 4000, display: "flex", flexDirection: "column", alignItems: "center", gap: 10,
          padding: "0 16px", pointerEvents: "none",
        }}
      >
        <style>{`
          @keyframes qf-toast-in { from { opacity:0; transform:translateY(14px) scale(.98) } to { opacity:1; transform:none } }
          @media (prefers-reduced-motion: reduce) { .qf-toast { animation:none !important } }
        `}</style>
        {toasts.map(t => {
          const s = STYLES[t.kind]
          return (
            <div
              key={t.id}
              className="qf-toast"
              role={t.kind === "error" ? "alert" : "status"}
              style={{
                pointerEvents: "auto", width: "100%", maxWidth: 420,
                display: "flex", alignItems: "flex-start", gap: 12,
                background: "#141210", border: "1px solid rgba(255,255,255,0.10)",
                borderLeft: `3px solid ${s.bar}`, borderRadius: 12,
                boxShadow: "0 12px 40px rgba(0,0,0,0.5)", padding: "13px 14px",
                fontFamily: "'DM Sans', system-ui, sans-serif",
                animation: "qf-toast-in .28s var(--mo-ease-standard)",
              }}
            >
              <span aria-hidden="true" style={{
                flexShrink: 0, width: 22, height: 22, borderRadius: 7, background: s.icon,
                color: s.bar, fontWeight: 800, fontSize: 13, display: "flex",
                alignItems: "center", justifyContent: "center", marginTop: 1,
              }}>{s.ico}</span>
              <span style={{ flex: 1, color: "#F5F0E8", fontSize: 14, lineHeight: 1.45 }}>{t.msg}</span>
              {t.action && (
                <button
                  type="button"
                  onClick={() => { t.action!.onClick(); dismiss(t.id) }}
                  style={{
                    flexShrink: 0, border: `1px solid ${s.bar}55`, background: "transparent",
                    color: s.bar, fontSize: 13, fontWeight: 700, padding: "5px 12px",
                    borderRadius: 7, cursor: "pointer", fontFamily: "'DM Sans', system-ui, sans-serif",
                  }}
                >{t.action.label}</button>
              )}
              <button
                type="button"
                onClick={() => dismiss(t.id)}
                aria-label="Fermer la notification"
                style={{
                  flexShrink: 0, width: 24, height: 24, borderRadius: 6, border: "none",
                  background: "transparent", color: "#8A8478", fontSize: 16, cursor: "pointer",
                  lineHeight: 1,
                }}
              >×</button>
            </div>
          )
        })}
      </div>
    </Ctx.Provider>
  )
}
