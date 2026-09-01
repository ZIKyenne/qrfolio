"use client"
// TemplateWizardModal.tsx — Assistant de personnalisation d'un modèle.
//
// Une question à la fois, avec l'aperçu qui se remplit en direct à côté. Les questions
// ne sont pas écrites à la main : elles sont DÉRIVÉES des blocs du modèle choisi
// (voir builder/templateWizard.ts), donc un nouveau modèle est couvert sans rien ajouter.
//
// Trois temps : les questions → la revue bloc par bloc (garder / masquer / retirer) →
// le nom de la page. L'utilisateur arrive dans l'éditeur avec une page qui lui ressemble.

import { useMemo, useRef, useState, useEffect } from "react"
import { X, ArrowRight, ArrowLeft, Check, Eye, EyeOff, Trash2, SkipForward, Sparkles } from "lucide-react"
import { type Block, type PageTheme } from "../builder/types"
import { BLOCK_DEFS } from "../builder/blockDefs"
import {
  buildWizard, applyAnswers, reviewBlocks, finalizeBlocks,
  type WizardStep, type BlockDecision, type BlockReview,
} from "../builder/templateWizard"
import { BlockPreview, computeBgStyle } from "./TemplatePreviewModal"
import { slugifyBase } from "@/lib/slug"
import { useIsMobile } from "@/lib/useIsMobile"

const MUTED = "#A8A190"
const INK = "#F5F0E8"

// Les informations PERSONNELLES arrivent vides, avec l'exemple du modèle en gris :
// personne ne doit publier « 12 rue de la Paix » sans s'en rendre compte. Le contenu
// éditorial, lui, arrive prérempli — c'est un point de départ à corriger, pas une
// donnée à inventer.
const PERSONAL = new Set(["identite", "contact", "horaires", "reseaux"])

const GROUP_LABEL: Record<string, string> = {
  identite: "Votre identité", contact: "Vous joindre", horaires: "Vos horaires",
  contenu: "Le contenu de la page", reseaux: "Vos réseaux",
}

export default function TemplateWizardModal({
  templateName, templateEmoji, blocks, theme, onClose, onCreate,
}: {
  templateName: string
  templateEmoji: string
  blocks: { type: string; content: Record<string, any> }[]
  theme: PageTheme
  onClose: () => void
  onCreate: (payload: {
    name: string; slug: string
    blocks: { type: string; content: Record<string, any>; visible: boolean }[]
  }) => Promise<{ ok?: boolean; error?: string }>
}) {
  const isMobile = useIsMobile(900)
  const { steps, initial } = useMemo(() => buildWizard(blocks), [blocks])

  const [phase, setPhase] = useState<"questions" | "review" | "naming">("questions")
  const [idx, setIdx] = useState(0)
  const [answers, setAnswers] = useState<Record<string, string>>(() => {
    // Seul le contenu éditorial démarre prérempli.
    const a: Record<string, string> = {}
    for (const s of steps) if (!PERSONAL.has(s.group)) a[s.id] = initial[s.id] ?? ""
    return a
  })
  const [seen, setSeen] = useState<Set<string>>(new Set())
  const [decisions, setDecisions] = useState<Record<number, BlockDecision>>({})
  const [pageName, setPageName] = useState("")
  const [slug, setSlug] = useState("")
  const [slugTouched, setSlugTouched] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState("")

  const previewRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement | HTMLTextAreaElement>(null)
  const step: WizardStep | undefined = steps[idx]

  // Seules les réponses VALIDÉES comptent : passer une question laisse le modèle en l'état.
  const effective = useMemo(() => {
    const out: Record<string, string> = {}
    for (const s of steps) if (seen.has(s.id)) {
      if (s.kind === "group") { for (const f of s.fields || []) if (f.id in answers) out[f.id] = answers[f.id] }
      else if (s.id in answers) out[s.id] = answers[s.id]
    }
    return out
  }, [steps, seen, answers])

  const applied = useMemo(() => applyAnswers(blocks, effective), [blocks, effective])
  const review: BlockReview[] = useMemo(
    () => reviewBlocks(blocks, applied, steps, effective), [blocks, applied, steps, effective],
  )

  // Blocs affichés dans l'aperçu : on retire en direct ceux qu'on a décidé d'enlever.
  const previewBlocks: Block[] = useMemo(() => applied.map((b, i) => ({
    id: "wz_" + i, type: b.type, content: b.content as any,
    visible: (decisions[i] || "keep") !== "hide",
  })).filter((_, i) => (decisions[i] || "keep") !== "remove"), [applied, decisions])

  useEffect(() => { document.body.style.overflow = "hidden"; return () => { document.body.style.overflow = "" } }, [])
  useEffect(() => {
    function onKey(e: KeyboardEvent) { if (e.key === "Escape") onClose() }
    window.addEventListener("keydown", onKey); return () => window.removeEventListener("keydown", onKey)
  }, [onClose])

  // Fait défiler l'aperçu jusqu'au bloc que la question modifie.
  useEffect(() => {
    if (phase !== "questions" || !step) return
    const target = step.blockIndexes[0]
    const el = previewRef.current?.querySelector(`[data-wz-block="${target}"]`)
    el?.scrollIntoView({ behavior: "smooth", block: "center" })
    setTimeout(() => inputRef.current?.focus(), 80)
  }, [idx, phase, step])

  const setAnswer = (id: string, v: string) => setAnswers(a => ({ ...a, [id]: v }))

  function goNext(validate: boolean) {
    if (!step) return
    setSeen(s => { const n = new Set(s); if (validate) n.add(step.id); else n.delete(step.id); return n })
    if (idx + 1 < steps.length) setIdx(idx + 1)
    else startReview()
  }

  function startReview() {
    setDecisions(d => {
      const next = { ...d }
      for (const r of review) if (!(r.index in next)) next[r.index] = r.suggested
      return next
    })
    setPhase("review")
  }

  function startNaming() {
    const base = effective.businessName || answers.businessName || templateName
    setPageName(base)
    if (!slugTouched) setSlug(slugifyBase(base))
    setPhase("naming")
  }

  async function create() {
    setError("")
    if (!pageName.trim()) { setError("Donnez un nom à votre page."); return }
    setBusy(true)
    const finalBlocks = finalizeBlocks(applied, decisions)
    const res = await onCreate({ name: pageName.trim(), slug: slug.trim() || slugifyBase(pageName), blocks: finalBlocks })
    setBusy(false)
    if (res?.error) setError(res.error)
  }

  const answeredCount = seen.size
  const progress = phase === "questions"
    ? Math.round((idx / Math.max(1, steps.length)) * 100)
    : phase === "review" ? 100 : 100

  const kept = review.filter(r => (decisions[r.index] || r.suggested) === "keep").length
  const hidden = review.filter(r => (decisions[r.index] || r.suggested) === "hide").length
  const removed = review.filter(r => (decisions[r.index] || r.suggested) === "remove").length

  const bg = computeBgStyle(theme, false)

  return (
    <div role="dialog" aria-modal="true" aria-label="Personnaliser le modèle"
      style={{ position: "fixed", inset: 0, zIndex: 200, background: "rgba(4,4,4,0.88)", backdropFilter: "blur(10px)", display: "flex", alignItems: "center", justifyContent: "center", padding: isMobile ? 0 : 20 }}>
      <div style={{
        width: "100%", maxWidth: 1080, height: isMobile ? "100%" : "min(92vh, 860px)",
        background: "#0B0B0A", border: "1px solid rgba(201,168,76,0.22)", borderRadius: isMobile ? 0 : 20,
        display: "flex", flexDirection: "column", overflow: "hidden",
      }}>
        {/* En-tête + progression */}
        <div style={{ padding: "14px 18px", borderBottom: "1px solid rgba(255,255,255,0.07)", display: "flex", alignItems: "center", gap: 12 }}>
          <span style={{ fontSize: 20 }}>{templateEmoji}</span>
          <div style={{ flex: 1, minWidth: 0 }}>
            {/* Le titre se coupe plutôt que de passer sur deux lignes : la ligne
                d'en-tête doit garder une hauteur stable d'une question à l'autre. */}
            <p style={{ color: INK, fontSize: 14, fontWeight: 700, margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>Personnaliser « {templateName} »</p>
            <p style={{ color: MUTED, fontSize: 11, margin: "2px 0 0" }}>
              {phase === "questions" ? `Question ${idx + 1} sur ${steps.length} · ${answeredCount} remplie${answeredCount > 1 ? "s" : ""}`
                : phase === "review" ? `${kept} bloc${kept > 1 ? "s" : ""} gardé${kept > 1 ? "s" : ""} · ${hidden} masqué${hidden > 1 ? "s" : ""} · ${removed} retiré${removed > 1 ? "s" : ""}`
                : "Dernière étape"}
            </p>
          </div>
          <button type="button" onClick={onClose} aria-label="Fermer"
            // 30 x 30 : la seule sortie de l'assistant, et il faut viser juste.
            // Le carré visible garde sa taille, la zone tapable passe à 44.
            style={{ background: "transparent", border: "1px solid rgba(255,255,255,0.14)", borderRadius: 9, width: 44, height: 44, color: MUTED, cursor: "pointer", display: "grid", placeItems: "center", flexShrink: 0 }}>
            <X size={15} />
          </button>
        </div>
        <div style={{ height: 3, background: "rgba(255,255,255,0.06)" }}>
          <div style={{ width: `${progress}%`, height: "100%", background: "var(--accent)", transition: "width .3s ease" }} />
        </div>

        {/* Corps : aperçu + panneau */}
        <div style={{ flex: 1, display: "flex", flexDirection: isMobile ? "column" : "row", minHeight: 0 }}>
          {!isMobile && (
            <div style={{ width: 340, borderRight: "1px solid rgba(255,255,255,0.07)", background: "#070707", padding: 16, display: "flex", flexDirection: "column", minHeight: 0 }}>
              <p style={{ color: MUTED, fontSize: 10, textTransform: "uppercase", letterSpacing: 1.5, margin: "0 0 10px", textAlign: "center" }}>Aperçu en direct</p>
              <div ref={previewRef} style={{ flex: 1, overflowY: "auto", borderRadius: 16, border: "1px solid rgba(255,255,255,0.1)", ...bg }}>
                {previewBlocks.map((b, i) => (
                  <div key={b.id} data-wz-block={i}
                    style={{
                      opacity: b.visible ? 1 : 0.32,
                      position: "relative", borderRadius: 8, transition: "box-shadow .25s, background .25s",
                      // Liseré vers l'INTÉRIEUR : un bloc collé au bord verrait son halo
                      // extérieur coupé par le défilement du conteneur.
                      ...(step?.blockIndexes.includes(i) && phase === "questions"
                        ? { outline: "2px solid var(--accent)", outlineOffset: "-3px", background: "color-mix(in srgb, var(--accent) 8%, transparent)" }
                        : {}),
                    }}>
                    <BlockPreview block={b} theme={theme} dayMode={false} />
                  </div>
                ))}
                {previewBlocks.length === 0 && <p style={{ color: MUTED, fontSize: 12, textAlign: "center", padding: 30 }}>Tous les blocs ont été retirés.</p>}
              </div>
            </div>
          )}

          <div style={{
            flex: 1, overflowY: "auto", padding: isMobile ? "18px 16px" : "26px 30px", minHeight: 0,
            display: "flex", flexDirection: "column",
            // Centrer verticalement une question courte dans un panneau haut est
            // agréable sur ordinateur. Sur téléphone, le panneau fait tout l'écran :
            // mesuré en capture, la question flottait sous 450 px de vide, et elle
            // sautait à l'ouverture du clavier. On lit un téléphone de haut en bas.
            justifyContent: phase === "questions" && !isMobile ? "center" : "flex-start",
          }}>
            {phase === "questions" && step && (
              <QuestionCard
                step={step} value={answers[step.id] ?? ""} answers={answers}
                placeholder={PERSONAL.has(step.group) ? initial[step.id] : undefined}
                onChange={setAnswer} inputRef={inputRef}
                onSubmit={() => goNext(true)}
              />
            )}
            {phase === "review" && (
              <ReviewList review={review} decisions={decisions} onChange={(i, d) => setDecisions(x => ({ ...x, [i]: d }))} />
            )}
            {phase === "naming" && (
              <NamingCard
                name={pageName} slug={slug} error={error}
                onName={v => { setPageName(v); if (!slugTouched) setSlug(slugifyBase(v)) }}
                onSlug={v => { setSlugTouched(true); setSlug(slugifyBase(v)) }}
                counts={{ kept, hidden, removed }}
              />
            )}
          </div>
        </div>

        {/* Pied : navigation */}
        <div style={{ padding: "12px 18px", borderTop: "1px solid rgba(255,255,255,0.07)", display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
          {phase === "questions" && (
            <>
              <button type="button" onClick={() => idx > 0 ? setIdx(idx - 1) : onClose()} className="da-btn-neutral da-btn-neutral--sm">
                <ArrowLeft size={13} /> {idx > 0 ? "Précédent" : "Annuler"}
              </button>
              <button type="button" onClick={startReview}
                style={{ background: "transparent", border: "none", color: MUTED, fontSize: 12, cursor: "pointer", textDecoration: "underline", minHeight: 44, padding: "0 6px", display: "inline-flex", alignItems: "center" }}>
                Passer toutes les questions
              </button>
              <div style={{ flex: 1 }} />
              <button type="button" onClick={() => goNext(false)} className="da-btn-neutral da-btn-neutral--sm">
                <SkipForward size={13} /> Passer
              </button>
              <button type="button" onClick={() => goNext(true)} className="da-btn-primary da-btn-primary--sm">
                {idx + 1 < steps.length ? <><span>Suivant</span> <ArrowRight size={14} /></> : <><span>Voir le récapitulatif</span> <ArrowRight size={14} /></>}
              </button>
            </>
          )}
          {phase === "review" && (
            <>
              <button type="button" onClick={() => { setPhase("questions"); setIdx(Math.max(0, steps.length - 1)) }} className="da-btn-neutral da-btn-neutral--sm">
                <ArrowLeft size={13} /> Revenir aux questions
              </button>
              <div style={{ flex: 1 }} />
              <button type="button" onClick={startNaming} className="da-btn-primary da-btn-primary--sm">
                <span>Continuer</span> <ArrowRight size={14} />
              </button>
            </>
          )}
          {phase === "naming" && (
            <>
              <button type="button" onClick={() => setPhase("review")} className="da-btn-neutral da-btn-neutral--sm">
                <ArrowLeft size={13} /> Retour
              </button>
              <div style={{ flex: 1 }} />
              <button type="button" onClick={create} disabled={busy} className="da-btn-primary da-btn-primary--sm">
                {busy ? <span>Création…</span> : <><Sparkles size={14} /> <span>Créer ma page</span></>}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

// ── Une question ─────────────────────────────────────────────────────────────
function QuestionCard({ step, value, answers, placeholder, onChange, onSubmit, inputRef }: {
  step: WizardStep
  value: string
  answers: Record<string, string>
  placeholder?: string
  onChange: (id: string, v: string) => void
  onSubmit: () => void
  inputRef: React.RefObject<any>
}) {
  const common = {
    width: "100%", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.14)",
    borderRadius: 11, padding: "13px 14px", color: INK, fontSize: 16, outline: "none",
    fontFamily: "inherit", boxSizing: "border-box" as const,
  }
  const onKey = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && step.kind !== "textarea" && step.kind !== "list") { e.preventDefault(); onSubmit() }
  }

  return (
    <div style={{ maxWidth: 560 }}>
      <p style={{ color: "var(--accent)", fontSize: 10, textTransform: "uppercase", letterSpacing: 1.8, margin: "0 0 8px", fontWeight: 700 }}>
        {GROUP_LABEL[step.group] || ""}
      </p>
      <h2 style={{ color: INK, fontSize: 22, fontWeight: 700, margin: "0 0 6px", lineHeight: 1.3 }}>{step.label}</h2>
      {step.hint ? <p style={{ color: MUTED, fontSize: 13, margin: "0 0 16px", lineHeight: 1.55 }}>{step.hint}</p> : <div style={{ height: 14 }} />}

      {step.kind === "group" ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {(step.fields || []).map((f, i) => (
            <label key={f.id} style={{ display: "block" }}>
              <span style={{ color: MUTED, fontSize: 11, display: "block", marginBottom: 4 }}>{f.label}</span>
              <input
                ref={i === 0 ? inputRef : undefined}
                type={f.kind === "url" ? "url" : f.kind === "tel" ? "tel" : f.kind === "email" ? "email" : "text"}
                value={answers[f.id] ?? ""}
                onChange={e => onChange(f.id, e.target.value)}
                onKeyDown={onKey}
                style={{ ...common, fontSize: 15, padding: "10px 12px" }}
              />
            </label>
          ))}
        </div>
      ) : step.kind === "list" ? (
        <>
          <p style={{ color: MUTED, fontSize: 11, margin: "0 0 6px" }}>
            Une ligne par élément · colonnes séparées par un point-virgule — <b style={{ color: INK }}>{step.listFormat}</b>
          </p>
          <textarea
            ref={inputRef} value={value} rows={7}
            onChange={e => onChange(step.id, e.target.value)}
            style={{ ...common, resize: "vertical", lineHeight: 1.6, fontSize: 14 }}
          />
        </>
      ) : step.kind === "textarea" ? (
        <textarea
          ref={inputRef} value={value} rows={5} placeholder={placeholder}
          onChange={e => onChange(step.id, e.target.value)}
          style={{ ...common, resize: "vertical", lineHeight: 1.6 }}
        />
      ) : (
        <input
          ref={inputRef}
          type={step.kind === "url" ? "url" : step.kind === "tel" ? "tel" : step.kind === "email" ? "email" : "text"}
          value={value} placeholder={placeholder}
          onChange={e => onChange(step.id, e.target.value)}
          onKeyDown={onKey}
          style={common}
        />
      )}

      {placeholder && !value && (
        <p style={{ color: MUTED, fontSize: 11.5, margin: "9px 0 0", lineHeight: 1.5 }}>
          Le modèle affiche « {placeholder} ». Si vous passez, ce champ restera vide plutôt que d'afficher cet exemple.
        </p>
      )}
    </div>
  )
}

// ── Revue bloc par bloc ──────────────────────────────────────────────────────
const STATE_META: Record<string, { label: string; color: string }> = {
  filled:     { label: "Rempli", color: "#39FF8F" },
  example:    { label: "Contenu d'exemple", color: "#F59E0B" },
  decorative: { label: "Décoratif", color: "#8A8478" },
  empty:      { label: "Vide", color: "#EF4444" },
}

function ReviewList({ review, decisions, onChange }: {
  review: BlockReview[]
  decisions: Record<number, BlockDecision>
  onChange: (i: number, d: BlockDecision) => void
}) {
  const examples = review.filter(r => r.state === "example").length
  return (
    <div style={{ maxWidth: 620 }}>
      <h2 style={{ color: INK, fontSize: 22, fontWeight: 700, margin: "0 0 6px" }}>Que garde-t-on ?</h2>
      <p style={{ color: MUTED, fontSize: 13, margin: "0 0 18px", lineHeight: 1.6 }}>
        {examples > 0
          ? `Vous avez passé ${examples} partie${examples > 1 ? "s" : ""} : elle${examples > 1 ? "s contiennent" : " contient"} encore le texte d'exemple du modèle. Retirez-la${examples > 1 ? "s" : ""} ou masquez-la${examples > 1 ? "s" : ""} — tout reste modifiable ensuite dans l'éditeur.`
          : "Vérifiez d'un coup d'œil la composition de votre page. Un bloc masqué reste dans l'éditeur mais n'apparaît pas en ligne."}
      </p>
      <div style={{ display: "flex", gap: 8, marginBottom: 14, flexWrap: "wrap" }}>
        <button type="button" onClick={() => review.forEach(r => onChange(r.index, "keep"))}
          className="da-btn-neutral da-btn-neutral--sm">Tout garder</button>
        <button type="button" onClick={() => review.forEach(r => onChange(r.index, r.state === "example" ? "remove" : "keep"))}
          className="da-btn-neutral da-btn-neutral--sm">Retirer les exemples</button>
        <button type="button" onClick={() => review.forEach(r => onChange(r.index, r.state === "example" ? "hide" : "keep"))}
          className="da-btn-neutral da-btn-neutral--sm">Masquer les exemples</button>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
        {review.map(r => {
          const d = decisions[r.index] || r.suggested
          const meta = STATE_META[r.state]
          return (
            <div key={r.index} style={{
              display: "flex", alignItems: "center", gap: 10, padding: "10px 12px",
              background: d === "remove" ? "rgba(239,68,68,0.06)" : "rgba(255,255,255,0.035)",
              border: `1px solid ${d === "remove" ? "rgba(239,68,68,0.22)" : "rgba(255,255,255,0.09)"}`,
              borderRadius: 11, opacity: d === "remove" ? 0.6 : 1,
            }}>
              <span style={{ width: 7, height: 7, borderRadius: "50%", background: meta.color, flexShrink: 0 }} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ color: INK, fontSize: 13, fontWeight: 600, margin: 0, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", textDecoration: d === "remove" ? "line-through" : "none" }}>
                  {r.preview || BLOCK_DEFS[r.type]?.label || r.type}
                </p>
                <p style={{ color: MUTED, fontSize: 10.5, margin: "1px 0 0" }}>{BLOCK_DEFS[r.type]?.label || r.type} · {meta.label}</p>
              </div>
              <div style={{ display: "flex", gap: 3, flexShrink: 0 }}>
                <DecisionButton active={d === "keep"} onClick={() => onChange(r.index, "keep")} title="Garder"><Eye size={13} /></DecisionButton>
                <DecisionButton active={d === "hide"} onClick={() => onChange(r.index, "hide")} title="Masquer en ligne"><EyeOff size={13} /></DecisionButton>
                <DecisionButton active={d === "remove"} onClick={() => onChange(r.index, "remove")} title="Retirer" danger><Trash2 size={13} /></DecisionButton>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function DecisionButton({ active, onClick, title, children, danger }: {
  active: boolean; onClick: () => void; title: string; children: React.ReactNode; danger?: boolean
}) {
  const c = danger ? "#EF4444" : "var(--accent)"
  return (
    <button type="button" onClick={onClick} title={title} aria-pressed={active}
      style={{
        width: 30, height: 30, borderRadius: 8, cursor: "pointer", display: "grid", placeItems: "center",
        background: active ? (danger ? "rgba(239,68,68,0.18)" : "color-mix(in srgb, var(--accent) 18%, transparent)") : "transparent",
        border: `1px solid ${active ? c : "rgba(255,255,255,0.12)"}`,
        color: active ? c : MUTED,
      }}>{children}</button>
  )
}

// ── Nom de la page ───────────────────────────────────────────────────────────
function NamingCard({ name, slug, error, onName, onSlug, counts }: {
  name: string; slug: string; error: string
  onName: (v: string) => void; onSlug: (v: string) => void
  counts: { kept: number; hidden: number; removed: number }
}) {
  const common = {
    width: "100%", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.14)",
    borderRadius: 11, padding: "13px 14px", color: INK, fontSize: 16, outline: "none",
    fontFamily: "inherit", boxSizing: "border-box" as const,
  }
  return (
    <div style={{ maxWidth: 520 }}>
      <h2 style={{ color: INK, fontSize: 22, fontWeight: 700, margin: "0 0 6px" }}>Presque fini</h2>
      <p style={{ color: MUTED, fontSize: 13, margin: "0 0 20px", lineHeight: 1.6 }}>
        {counts.kept} bloc{counts.kept > 1 ? "s" : ""} sur votre page{counts.hidden > 0 ? `, ${counts.hidden} masqué${counts.hidden > 1 ? "s" : ""}` : ""}
        {counts.removed > 0 ? `, ${counts.removed} retiré${counts.removed > 1 ? "s" : ""}` : ""}. Vous pourrez tout modifier ensuite.
      </p>
      <label style={{ display: "block", marginBottom: 14 }}>
        <span style={{ color: MUTED, fontSize: 11, display: "block", marginBottom: 5 }}>Nom de la page (visible par vous seul)</span>
        <input value={name} onChange={e => onName(e.target.value)} style={common} autoFocus />
      </label>
      <label style={{ display: "block" }}>
        <span style={{ color: MUTED, fontSize: 11, display: "block", marginBottom: 5 }}>Son adresse</span>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <span style={{ color: MUTED, fontSize: 13, whiteSpace: "nowrap" }}>qrowg.com/</span>
          <input value={slug} onChange={e => onSlug(e.target.value)} style={{ ...common, fontSize: 15 }} />
        </div>
      </label>
      {error && <p style={{ color: "#EF4444", fontSize: 12.5, margin: "14px 0 0" }}>{error}</p>}
    </div>
  )
}
