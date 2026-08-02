"use client"

import { useEffect, useRef, useState, type ReactNode } from "react"
import { useDeviceOrientation } from "@/lib/useDeviceOrientation"
import RotateInstructionScreen from "./RotateInstructionScreen"

type GateState = "locked" | "unlocking" | "unlocked"

/**
 * Porte d'orientation : sur téléphone en portrait, affiche un écran premium
 * « Tournez votre téléphone » (l'enfant n'est PAS monté). Dès le passage en
 * paysage, joue une transition de déverrouillage puis révèle l'enfant.
 *
 * Desktop / tablette / paysage : l'enfant est rendu directement.
 */
export default function RotateToLandscapeGate({
  children,
  onExit,
  allowContinueAnyway = true,
  title,
  subtitle,
}: {
  children: ReactNode
  onExit?: () => void
  allowContinueAnyway?: boolean
  title?: string
  subtitle?: string
}) {
  const { isMobile, isPortrait } = useDeviceOrientation()
  // Écran téléphone (plus petit côté < 768) en portrait. On n'exige PAS isTouch :
  // l'émulation DevTools ne l'expose pas de façon fiable, et un desktop normal a
  // toujours un côté ≥ 768px donc n'est jamais barré.
  const shouldGate = isMobile && isPortrait
  const [continueAnyway, setContinueAnyway] = useState(false)
  const [state, setState] = useState<GateState>(shouldGate ? "locked" : "unlocked")
  const prev = useRef<GateState>(state)

  // Transitions d'état pilotées par l'orientation
  useEffect(() => {
    if (continueAnyway) { setState("unlocked"); return }
    if (shouldGate) {
      setState("locked")
    } else {
      // Pas (plus) à barrer : si on venait de "locked", on joue le déverrouillage
      setState(prev.current === "locked" ? "unlocking" : "unlocked")
    }
  }, [shouldGate, continueAnyway])

  useEffect(() => { prev.current = state }, [state])

  // Fin de la transition de déverrouillage
  useEffect(() => {
    if (state !== "unlocking") return
    const id = setTimeout(() => setState("unlocked"), 950)
    return () => clearTimeout(id)
  }, [state])

  const showChildren = state === "unlocked" || state === "unlocking"

  return (
    <>
      {showChildren && children}

      {state === "locked" && (
        <RotateInstructionScreen
          title={title}
          subtitle={subtitle}
          onExit={onExit}
          allowContinueAnyway={allowContinueAnyway}
          onContinue={() => setContinueAnyway(true)}
        />
      )}

      {state === "unlocking" && (
        <div aria-hidden style={{ position: "fixed", inset: 0, zIndex: 4500, pointerEvents: "none", animation: "rgUnlock .95s var(--mo-ease-standard) forwards" }}>
          <style>{`
            @keyframes rgUnlock {
              0%   { opacity: 0;   backdrop-filter: blur(0px); }
              22%  { opacity: 1; }
              45%  { opacity: 1;   backdrop-filter: blur(2px); }
              100% { opacity: 0;   backdrop-filter: blur(0px); }
            }
            @keyframes rgFlash { 0% { opacity: 0; transform: scale(.6) } 40% { opacity: .9 } 100% { opacity: 0; transform: scale(1.25) } }
          `}</style>
          <div style={{ position: "absolute", inset: 0, background: "radial-gradient(60% 50% at 50% 50%, color-mix(in srgb, var(--accent) 38%, transparent) 0%, color-mix(in srgb, var(--accent) 14%, transparent) 38%, transparent 70%)", mixBlendMode: "screen" }} />
          <div style={{ position: "absolute", left: "50%", top: "50%", width: "70vmin", height: "70vmin", transform: "translate(-50%,-50%)", borderRadius: "50%", background: "radial-gradient(circle, rgba(255,255,255,0.5), color-mix(in srgb, var(--accent) 40%, transparent) 40%, transparent 70%)", filter: "blur(18px)", mixBlendMode: "screen", animation: "rgFlash .95s ease-out forwards" }} />
        </div>
      )}
    </>
  )
}
