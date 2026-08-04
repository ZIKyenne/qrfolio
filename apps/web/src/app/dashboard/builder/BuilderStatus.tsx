// BuilderStatus.tsx — Indicateur de statut de sauvegarde UNIFIÉ (mission C01, Vague 1).
// Présentational et props-driven : consomme la taxonomie pure `resolveSaveStatus` (builderUx.ts).
// Tokenisé (--success/--warning/--danger/--muted) au lieu des littéraux bruts de la coquille, et
// accessible (role="status" + aria-live="polite" → annonce lecteur d'écran, absente aujourd'hui).
// Rendu UNIQUEMENT quand BUILDER_REDESIGN est actif (flag OFF = coquille inchangée).

import { resolveSaveStatus, type UxTone } from "./builderUx"

const TONE_COLOR: Record<UxTone, string> = {
  neutral: "#8A8478",
  success: "var(--success)",
  warning: "var(--warning)",
  danger: "var(--danger)",
  accent: "var(--accent)",
}

const TONE_BG: Record<UxTone, string> = {
  neutral: "transparent",
  success: "transparent",
  warning: "color-mix(in srgb, var(--warning) 12%, transparent)",
  danger: "color-mix(in srgb, var(--danger) 12%, transparent)",
  accent: "color-mix(in srgb, var(--accent) 12%, transparent)",
}

export interface BuilderStatusProps {
  mobile?: boolean
  saving: boolean
  saved: boolean
  saveError: boolean
  saveErrorMsg?: string
  hasUnsaved: boolean
  creating?: boolean
  onSave?: () => void
  onRetry?: () => void
}

export function BuilderStatus(props: BuilderStatusProps) {
  const s = resolveSaveStatus({
    saving: props.saving,
    saved: props.saved,
    saveError: props.saveError,
    hasUnsaved: props.hasUnsaved,
    creating: props.creating,
    errorMessage: props.saveErrorMsg,
  })

  if (s.kind === "idle") return <span role="status" aria-live="polite" aria-hidden="true" style={{ display: "none" }} />

  const color = TONE_COLOR[s.tone]
  const text = props.mobile ? s.shortLabel : s.label
  const dot = (
    <span aria-hidden="true" style={{ width: 6, height: 6, borderRadius: "50%", background: color, flexShrink: 0 }} />
  )

  const base: React.CSSProperties = {
    display: "flex", alignItems: "center", gap: 5, fontSize: 10, fontWeight: 600,
    color, flexShrink: 0, whiteSpace: "nowrap", maxWidth: props.mobile ? 150 : 360,
    overflow: "hidden", textOverflow: "ellipsis",
  }

  // États actionnables → bouton cliquable (Enregistrer / Réessayer).
  if (s.actionable) {
    const onClick = s.kind === "error" ? props.onRetry : props.onSave
    const title = s.kind === "error"
      ? (props.saveErrorMsg ? `Erreur : ${props.saveErrorMsg} — cliquer pour réessayer` : "Réessayer la sauvegarde")
      : "Enregistrer maintenant (sinon sauvegarde auto après ~1s)"
    return (
      <span role="status" aria-live="polite">
        <button type="button" onClick={onClick} title={title} aria-label={s.label}
          style={{ ...base, cursor: "pointer", background: TONE_BG[s.tone], border: `1px solid color-mix(in srgb, ${color} 30%, transparent)`, borderRadius: 6, padding: "3px 8px" }}>
          {dot}{text}
        </button>
      </span>
    )
  }

  // États informatifs (enregistrement / enregistré / création).
  return (
    <span role="status" aria-live="polite" style={base}>
      {dot}{text}
    </span>
  )
}
