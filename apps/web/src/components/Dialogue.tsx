"use client"

// Dialogue.tsx — Une boîte de dialogue accessible, pour remplacer prompt/confirm/alert.
//
// La page « Créer un QR » en appelait huit : la destination d'un lien, un MOT DE PASSE
// saisi en clair dans une invite du navigateur, une date qu'il fallait taper au format
// AAAA-MM-JJ (et si on se trompait, un alert renvoyait à zéro sans garder la saisie),
// et cinq messages d'erreur. Ces invites bloquent l'onglet, ne se stylent pas, sont
// supprimées par certains navigateurs après un `await`, et n'offrent aucun champ adapté.
//
// Ce composant fait ce qu'elles ne font pas : rôle annoncé, fermeture par Échap,
// focus posé à l'ouverture et rendu à l'élément d'origine, focus qui ne s'échappe
// pas de la boîte, et défilement de la page gelé derrière.

import { useEffect, useId, useRef } from "react"

const G = "#C9A84C"
const MUTED = "#A8A190"

const SELECTEURS_FOCUSABLES =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'

export type DialogueProps = {
  ouvert: boolean
  titre: string
  /** Texte d'explication sous le titre. Facultatif. */
  description?: string
  /** Ce que fait la fermeture (Échap, clic hors du cadre, bouton Annuler). */
  onFermer: () => void
  /** Contenu : champs de saisie, message… */
  children?: React.ReactNode
  /** Libellé du bouton de confirmation. Absent = boîte d'information (un seul bouton). */
  libelleConfirmer?: string
  onConfirmer?: () => void
  /** Rend le bouton de confirmation rouge, pour une action irréversible. */
  destructif?: boolean
  confirmerDesactive?: boolean
  libelleAnnuler?: string
}

export default function Dialogue({
  ouvert, titre, description, onFermer, children,
  libelleConfirmer, onConfirmer, destructif = false, confirmerDesactive = false,
  libelleAnnuler = "Annuler",
}: DialogueProps) {
  const cadre = useRef<HTMLDivElement | null>(null)
  const origine = useRef<HTMLElement | null>(null)
  const idTitre = useId()
  const idDescription = useId()

  useEffect(() => {
    if (!ouvert) return
    origine.current = (document.activeElement as HTMLElement) || null

    // Le premier champ de saisie s'il y en a un, sinon le cadre lui-même : on ne
    // laisse jamais le focus derrière, sur la page qu'on vient de recouvrir.
    const premier = cadre.current?.querySelector<HTMLElement>('input, textarea, select')
    ;(premier ?? cadre.current)?.focus()

    const defilement = document.body.style.overflow
    document.body.style.overflow = "hidden"

    function auClavier(e: KeyboardEvent) {
      if (e.key === "Escape") { e.stopPropagation(); onFermer(); return }
      if (e.key !== "Tab" || !cadre.current) return
      const cibles = Array.from(cadre.current.querySelectorAll<HTMLElement>(SELECTEURS_FOCUSABLES))
        .filter(el => el.offsetParent !== null || el === document.activeElement)
      if (cibles.length === 0) { e.preventDefault(); return }
      const premierEl = cibles[0], dernierEl = cibles[cibles.length - 1]
      if (e.shiftKey && document.activeElement === premierEl) { e.preventDefault(); dernierEl.focus() }
      else if (!e.shiftKey && document.activeElement === dernierEl) { e.preventDefault(); premierEl.focus() }
    }
    document.addEventListener("keydown", auClavier, true)
    return () => {
      document.removeEventListener("keydown", auClavier, true)
      document.body.style.overflow = defilement
      origine.current?.focus?.()
    }
  }, [ouvert, onFermer])

  if (!ouvert) return null

  return (
    <div
      onClick={onFermer}
      style={{ position: "fixed", inset: 0, zIndex: 300, background: "rgba(4,4,4,0.72)", backdropFilter: "blur(3px)", WebkitBackdropFilter: "blur(3px)", display: "flex", alignItems: "center", justifyContent: "center", padding: 18 }}
    >
      <div
        ref={cadre}
        role="dialog"
        aria-modal="true"
        aria-labelledby={idTitre}
        aria-describedby={description ? idDescription : undefined}
        tabIndex={-1}
        onClick={e => e.stopPropagation()}
        style={{ width: "100%", maxWidth: 420, background: "#111010", border: "1px solid rgba(201,168,76,0.24)", borderRadius: 18, padding: "22px 20px 18px", boxSizing: "border-box", boxShadow: "0 24px 70px rgba(0,0,0,0.6)", outline: "none" }}
      >
        <h2 id={idTitre} style={{ color: "#F5F0E8", fontSize: 16.5, fontWeight: 800, margin: 0, letterSpacing: -0.2 }}>{titre}</h2>
        {description && (
          <p id={idDescription} style={{ color: MUTED, fontSize: 12.5, lineHeight: 1.5, margin: "8px 0 0" }}>{description}</p>
        )}
        {children && <div style={{ marginTop: 16 }}>{children}</div>}
        <div style={{ display: "flex", gap: 9, marginTop: 20, justifyContent: "flex-end" }}>
          <button
            type="button"
            onClick={onFermer}
            style={{ minHeight: 44, padding: "0 16px", borderRadius: 11, cursor: "pointer", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.14)", color: "#D8D2C6", fontSize: 13.5, fontWeight: 600 }}
          >
            {libelleConfirmer ? libelleAnnuler : "Fermer"}
          </button>
          {libelleConfirmer && (
            <button
              type="button"
              onClick={onConfirmer}
              disabled={confirmerDesactive}
              style={{
                minHeight: 44, padding: "0 18px", borderRadius: 11,
                cursor: confirmerDesactive ? "not-allowed" : "pointer",
                opacity: confirmerDesactive ? 0.45 : 1,
                background: destructif ? "rgba(255,107,107,0.14)" : G,
                border: destructif ? "1px solid rgba(255,107,107,0.45)" : `1px solid ${G}`,
                color: destructif ? "#FF8F8F" : "#100E09",
                fontSize: 13.5, fontWeight: 800,
              }}
            >
              {libelleConfirmer}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
