"use client"

// Ce que la coquille du tableau de bord sait de la session, partagé aux pages.
// Avant, chaque page devinait : /dashboard/qr-link lançait un fetch protégé à
// chaque ouverture, même pour un visiteur sans compte → un 401 dans la console
// et une requête pour rien.
import { createContext, useContext } from "react"

export type SessionShell = { signedIn: boolean; confirmee: boolean }

export const SessionShellContext = createContext<SessionShell>({ signedIn: false, confirmee: false })

export function useSessionShell(): SessionShell {
  return useContext(SessionShellContext)
}
