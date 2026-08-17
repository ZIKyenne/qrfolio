// ════════════════════════════════════════════════════════════════════════════
// Print Studio — COUCHE DE RENDU (fin de PrintStudioClient.tsx, lignes 1521→fin)
// C'est LA partie à refaire : la composition CSS des aperçus.
//
// Dépend de (déjà fournis dans les autres fichiers) :
//   ./print-studio-catalog.ts  -> ITEM_BY_ID, STYLE_BY_ID, LAYOUT_BY_ID, LAYOUTS,
//                                  TYPOS, SIZES, MESSAGES, BRANDNAMES, type Item, type Style
//   ./print-studio-mockup.ts   -> sceneLayers, paletteFromStyle, scaleFor, SCENES
//   ./print-studio-tokens.ts   -> color as C, radius as R
//   type FreeEl, ACCENTS, TITLE_WEIGHT, resolveLayoutId, trimWidthMm, readableOn, shade,
//   chipStyle, inputStyle, secLabel  -> définis dans la 1re moitié du client (non incluse ici).
//   Composants QR : QRCanvas, createQRSvg (../qr-codes) — génèrent l'image du QR.
//
// Composants clés à retravailler :
//   • SupportVisual  : la composition d'un support (titre/QR/CTA/fond/cadre) par layout.  ← CŒUR
//   • Packshot       : SupportVisual posé dans une scène (perspective + ombres).
//   • MiniSupport    : la VIGNETTE de la bibliothèque (SupportVisual en réduit).
//   • FauxQR         : faux QR décoratif CSS (pour les vignettes, non scannable).
//   • FlatEditor     : éditeur libre (drag/redimension).
// ════════════════════════════════════════════════════════════════════════════

/* ─────────────────────────── sous-composants ─────────────────────────── */

const inputStyle: React.CSSProperties = { width: "100%", boxSizing: "border-box", height: 48, background: "#0A0A0A", border: `1px solid ${C.hairline}`, borderRadius: 12, color: C.fg, fontSize: 16, padding: "0 14px", outline: "none" }
// Libellé de section/champ unifié (casse normale, muted) — même convention que <Field>.
const secLabel: React.CSSProperties = { margin: "0 0 8px", fontSize: 11.5, fontWeight: 600, color: C.fgMuted }

// Sélecteur déroulant doré (barre de filtres du Print Studio, refonte DA) : déclencheur + menu ancré,
// overlay de fermeture au clic extérieur. Or fixe assumé (identité DA), a11y : bouton + aria-expanded.
function FilterSelect({ label, value, options, onPick }: { label: string; value: string; options: string[]; onPick: (v: string) => void }) {
  const [open, setOpen] = useState(false)
  return (
    <div style={{ position: "relative" }}>
      <button type="button" className="ps2-sel" aria-expanded={open} onClick={() => setOpen(o => !o)}
        style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 14px", borderRadius: 11, background: "rgba(255,255,255,.025)", border: "1px solid #26211a", color: "#b8b1a6", fontSize: 12.5, cursor: "pointer", whiteSpace: "nowrap" }}>
        <span style={{ fontSize: 10, letterSpacing: ".14em", textTransform: "uppercase", color: "#6b6258", fontWeight: 700 }}>{label}</span>
        <span style={{ color: "#e8c877", fontWeight: 600 }}>{value}</span>
        <span aria-hidden style={{ width: 6, height: 6, borderRight: "1.5px solid #c9a24d", borderBottom: "1.5px solid #c9a24d", transform: open ? "rotate(-135deg) translate(-1px,-1px)" : "rotate(45deg) translateY(-2px)", transition: "transform .22s ease" }} />
      </button>
      {open && (
        <>
          <div onClick={() => setOpen(false)} style={{ position: "fixed", inset: 0, zIndex: 40 }} />
          <div role="listbox" style={{ position: "absolute", top: "calc(100% + 6px)", left: 0, zIndex: 41, minWidth: 190, maxHeight: 300, overflowY: "auto", background: "#17140f", border: "1px solid #2e281f", borderRadius: 12, padding: 6, boxShadow: "0 18px 44px rgba(0,0,0,.62)" }}>
            {options.map(o => {
              const on = o === value
              return (
                <button key={o} type="button" className="ps2-menuitem" onClick={() => { onPick(o); setOpen(false) }}
                  style={{ display: "flex", width: "100%", alignItems: "center", justifyContent: "space-between", gap: 10, padding: "8px 10px", borderRadius: 8, background: on ? "rgba(232,200,119,.08)" : "transparent", border: "none", color: on ? "#e8c877" : "#b8b1a6", fontSize: 12.5, fontWeight: on ? 600 : 500, cursor: "pointer", textAlign: "left" }}>
                  {o}{on && <span aria-hidden style={{ width: 6, height: 6, borderRight: "1.5px solid #e8c877", borderBottom: "1.5px solid #e8c877", transform: "rotate(45deg)" }} />}
                </button>
              )
            })}
          </div>
        </>
      )}
    </div>
  )
}

// Pastille de filtre actif (dorée) avec croix de retrait.
function ActiveChip({ label, onClear }: { label: string; onClear: () => void }) {
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "5px 8px 5px 11px", borderRadius: 999, background: "rgba(232,200,119,.07)", border: "1px solid rgba(232,200,119,.28)", color: "#e8c877", fontSize: 11.5, fontWeight: 600 }}>
      {label}
      <button type="button" aria-label={`Retirer ${label}`} onClick={onClear} className="ps2-x" style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: 14, height: 14, borderRadius: "50%", background: "rgba(232,200,119,.15)", border: "none", cursor: "pointer", padding: 0 }}>
        <span style={{ position: "relative", width: 7, height: 7 }}>
          <span style={{ position: "absolute", top: 2.8, left: 0, width: 7, height: 1.4, background: "#e8c877", transform: "rotate(45deg)" }} />
          <span style={{ position: "absolute", top: 2.8, left: 0, width: 7, height: 1.4, background: "#e8c877", transform: "rotate(-45deg)" }} />
        </span>
      </button>
    </span>
  )
}

function RailInline({ value, options, onPick }: { value: string; options: { id: string; label: string; note?: string }[]; onPick: (v: string) => void }) {
  return (
    <div style={{ display: "flex", gap: 7, overflowX: "auto", paddingBottom: 4 }}>
      {options.map(o => (
        <button key={o.id} className="ps-chip" onClick={() => onPick(o.id)} style={{ ...chipStyle(value === o.id), flexDirection: "column", alignItems: "flex-start", minWidth: o.note ? 108 : undefined }}>
          <span>{o.label}</span>{o.note && <span style={{ fontSize: 9.5, color: value === o.id ? "#0A0A0A" : C.fgFaint }}>{o.note}</span>}
        </button>
      ))}
    </div>
  )
}
function chipStyle(on: boolean): React.CSSProperties {
  // minHeight 44 = cible tactile mobile (§12). alignItems center pour centrer le texte à cette hauteur.
  return { flexShrink: 0, minHeight: 44, padding: "10px 14px", borderRadius: R.chip, cursor: "pointer", fontSize: 12.5, fontWeight: 700, whiteSpace: "nowrap", border: `1px solid ${on ? C.gold : C.hairline}`, background: on ? C.gold : C.surfaceUp, color: on ? "#0A0A0A" : C.fg, display: "inline-flex", alignItems: "center", justifyContent: "center" }
}

function Panel({ id, title, resume, open, setOpen, children, flash }: { id: string; title: string; resume: string; open: string | null; setOpen: (v: string | null) => void; children: React.ReactNode; flash?: boolean }) {
  const isOpen = open === id
  return (
    <div data-panel={id} className={flash ? "ps-flash" : undefined} style={{ background: C.surface, border: `1px solid ${flash ? C.goldA55 : C.hairline}`, borderRadius: R.card, overflow: "hidden", scrollMarginTop: 14 }}>
      <button onClick={() => setOpen(isOpen ? null : id)} style={{ width: "100%", display: "flex", alignItems: "center", gap: 10, padding: "14px 16px", background: "none", border: "none", cursor: "pointer", color: C.fg, textAlign: "left" }}>
        <span style={{ flex: 1 }}>
          <span style={{ display: "block", fontFamily: "Fraunces, Georgia, serif", fontSize: 15.5, fontWeight: 600 }}>{title}</span>
          {!isOpen && <span style={{ display: "block", fontSize: 11.5, color: C.fgMuted, marginTop: 2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{resume}</span>}
        </span>
        <ChevronDown size={18} color={C.fgMuted} style={{ transform: isOpen ? "rotate(180deg)" : "none", transition: "transform .15s" }} />
      </button>
      {isOpen && <div className="mo-fade-up" style={{ padding: "0 16px 16px", display: "flex", flexDirection: "column", gap: 14 }}>{children}</div>}
    </div>
  )
}
function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div><p style={{ margin: "0 0 7px", fontSize: 11.5, fontWeight: 600, color: C.fgMuted }}>{label}</p>{children}</div>
}
// Rangée de suggestions CONTEXTUELLES (secondaire, compacte) : petites puces sous un input.
function SuggRow({ items, active, onPick }: { items: string[]; active: string; onPick: (v: string) => void }) {
  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 8 }}>
      {items.map(m => {
        const on = active === m
        return <button key={m} className="ps-chip" onClick={() => onPick(m)} style={{ padding: "5px 10px", borderRadius: 8, cursor: "pointer", fontSize: 11.5, fontWeight: 600, border: `1px solid ${on ? C.gold : C.hairline}`, background: on ? C.goldSoft : "transparent", color: on ? C.gold : C.fgMuted, whiteSpace: "nowrap" }}>{m}</button>
      })}
    </div>
  )
}
function Seg({ value, options, onPick, labels }: { value: string; options: string[]; onPick: (v: string) => void; labels?: string[] }) {
  return (
    <div style={{ display: "flex", gap: 4, background: C.surfaceUp, borderRadius: 11, padding: 3 }}>
      {options.map((o, i) => <button key={o} onClick={() => onPick(o)} style={{ flex: 1, minHeight: 44, borderRadius: 8, border: "none", cursor: "pointer", background: value === o ? C.gold : "transparent", color: value === o ? "#0A0A0A" : C.fgMuted, fontSize: 12.5, fontWeight: value === o ? 800 : 600 }}>{labels ? labels[i] : o}</button>)}
    </div>
  )
}
function ColorField({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  // value === "" => auto (couleur du thème). Sinon un hex choisi librement.
  return (
    <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
      <button onClick={() => onChange("")} style={{ ...chipStyle(value === ""), minHeight: 40 }}>Auto</button>
      <label style={{ width: 44, height: 44, borderRadius: 11, border: `2px solid ${value ? C.gold : C.hairline}`, cursor: "pointer", position: "relative", flexShrink: 0, background: value || "conic-gradient(from 210deg,#C9A84C,#D4483B,#3E9E6E,#3B6FD4,#7A5CD4,#C9A84C)", overflow: "hidden" }}>
        <input type="color" value={value || "#C9A84C"} onChange={e => onChange(e.target.value)} style={{ position: "absolute", inset: 0, width: "100%", height: "100%", opacity: 0, cursor: "pointer", border: "none" }} />
      </label>
      {value && <span style={{ fontFamily: "ui-monospace, monospace", fontSize: 11, color: C.fgMuted }}>{value}</span>}
    </div>
  )
}
function Range({ value, min, max, step, onChange, hint }: { value: number; min: number; max: number; step: number; onChange: (v: number) => void; hint?: string }) {
  return (
    <div>
      <input type="range" min={min} max={max} step={step} value={value} onChange={e => onChange(parseFloat(e.target.value))} style={{ width: "100%", accentColor: C.gold, height: 40, cursor: "pointer" }} />
      {hint && <div style={{ fontSize: 10.5, color: C.fgFaint, marginTop: -2 }}>{hint}</div>}
    </div>
  )
}
function Swatch({ s, on, label, onClick }: { s: Style; on: boolean; label?: string; onClick: () => void }) {
  return (
    <button onClick={onClick} title={s.label} style={{ borderRadius: 12, overflow: "hidden", border: `2px solid ${on ? C.gold : "transparent"}`, cursor: "pointer", background: "none", padding: 0 }}>
      <div style={{ height: 46, background: s.bg, display: "flex", alignItems: "center", justifyContent: "center", gap: 4 }}>
        <span style={{ width: 12, height: 12, borderRadius: "50%", background: s.accent }} />
        <span style={{ width: 12, height: 12, borderRadius: 3, background: s.ink }} />
      </div>
      {label && <div style={{ fontSize: 9.5, color: C.fgMuted, padding: "3px 4px", background: C.surface, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{label}</div>}
    </button>
  )
}

/* Rendu du support (le visuel imprimé) — palette + texte + QR, arrangé par layout. */
function SupportVisual({ item, pal, layout, brand, subtitle, title, cta, size, qrValue, qrImg, qrBadge, qrPos, qrStatic, qrVector, physW, qrDx, qrDy, qrFree, qrFx, qrFy, logo, logoUrl, bgFinish, bgImage, frame, accent, titleCase, titleWeight, titleColor, subColor, ctaColor, blockY, eCorner, eAccent, eTypo, eAlign, eTitle, ePad, freeEls, w, h, onFocus }:
  { item: Item; style: Style; pal: ReturnType<typeof paletteFromStyle>; layout: { content: string; deco: string | null }; brand: string; subtitle: string; title: string; cta: string; size: { factor: number }; qrValue: string; qrImg: string | null; qrBadge: string; qrPos: string; qrStatic?: boolean; qrVector?: boolean; physW: number; qrDx: number; qrDy: number; qrFree?: boolean; qrFx?: number; qrFy?: number; logo: string; logoUrl: string | null; bgFinish: string; bgImage: string | null; frame: string; accent: string; titleCase: string; titleWeight: string; titleColor: string; subColor: string; ctaColor: string; blockY: number; eCorner: string; eAccent: string; eTypo: string; eAlign: "left" | "center" | "right"; eTitle: number; ePad: number; freeEls?: FreeEl[]; w: number; h: number; onFocus?: (panel: string) => void }) {
  const typo = TYPOS.find(t => t.id === eTypo)
  const titleFont = typo?.t ? `"${typo.t}",Georgia,serif` : pal.titleFont
  const bodyFont = typo?.b ? `"${typo.b}",Helvetica,Arial,sans-serif` : pal.bodyFont
  const unit = Math.min(w, h)
  const isRound = item.shape === "round"
  // Réf. de taille du TEXTE = min(w,h), REHAUSSÉE sur les supports très hauts/étroits (marque-page 55×160)
  // pour que le titre ne soit pas riquiqui à côté du QR (le QR, lui, reste piloté par sa taille physique).
  const sizeRef = unit * (item.ratio < 0.6 ? Math.min(1.5, 0.6 / item.ratio) : 1)
  // Sur un support ROND, le contenu doit tenir dans le CERCLE inscrit (≈ 0,707 × Ø) : marge plancher (~15 %).
  const pad = Math.max(isRound ? unit * 0.15 : 0, unit * 0.09 * ePad)
  const cornerInset = isRound ? unit * 0.15 : pad * 0.5   // repères de coin visibles même sur un rond (près du carré inscrit)
  const titleSize = sizeRef * 0.11 * eTitle
  // Taille du QR pilotée par la PHYSIQUE (item.qrMm × facteur), convertie en px via l'échelle du support.
  // Garde-fou anti-débordement : rond = QR modeste (cercle inscrit + kicker retiré) ; « QR géant » = laisse la place
  // au titre/bouton ; sinon borné à la largeur. Aperçu/planche/contrôle réfèrent toujours le MÊME mm hors garde-fou.
  const qrMax = isRound ? unit * 0.44 : (layout.content === "qrbig" ? unit * 0.5 : unit * 0.86)
  const qrPx = Math.min(qrMax, Math.max(24, item.qrMm * size.factor * (w / physW)))
  const radiusEl = eCorner === "vif" ? 0 : eCorner === "rond" ? 999 : 10

  // Couleur d'accent : override d'ambiance (« auto » garde pal.band / pal.ctaBg).
  const accHex = ACCENTS.find(a => a.id === accent)?.hex || ""
  const bandColor = accHex || pal.band
  const bandFg = accHex ? readableOn(accHex) : pal.bandFg
  const ctaBg = accHex || pal.ctaBg
  const ctaFg = accHex ? readableOn(accHex) : pal.ctaFg
  const effWeight = TITLE_WEIGHT[titleWeight] || Number(pal.titleWeight) || 500
  const shownTitle = titleCase === "upper" ? title.toUpperCase() : title

  // Couleurs par élément : "" = auto (couleur du thème/accent). Le bouton peut avoir sa propre couleur.
  const titleCol = titleColor || pal.fg
  const subCol = subColor || pal.fg
  const btnBg = ctaColor || ctaBg
  const btnFg = ctaColor ? readableOn(ctaColor) : ctaFg
  const btnStroke = ctaColor || bandColor
  const clampTxt: React.CSSProperties = { maxWidth: "100%", overflowWrap: "anywhere" }
  // Sélection contextuelle (#12/#32) : quand `onFocus` est fourni (aperçu principal SEULEMENT), chaque objet
  // du support (titre/QR/bouton/marque) devient cliquable → ouvre son volet dédié. Vignettes/planche/éditeur libre
  // ne reçoivent pas `onFocus` → aucun impact ailleurs.
  const fcur: React.CSSProperties = onFocus ? { cursor: "pointer" } : {}
  const fcls = onFocus ? "ps-foc" : undefined
  const fclick = (panel: string) => onFocus ? (e: React.MouseEvent) => { e.stopPropagation(); onFocus(panel) } : undefined
  const kickerEl = <div className={fcls} onClick={fclick("texte")} style={{ fontFamily: bodyFont, fontSize: sizeRef * 0.045, fontWeight: 700, letterSpacing: ".08em", textTransform: "uppercase", color: bandColor, ...clampTxt, ...fcur }}>{brand}</div>
  const titleEl = <div className={fcls} onClick={fclick("texte")} style={{ fontFamily: titleFont, fontSize: titleSize, fontWeight: effWeight as any, letterSpacing: pal.titleLs, lineHeight: 1.02, color: titleCol, ...clampTxt, ...fcur }}>{shownTitle}</div>
  const subtitleEl = subtitle.trim() ? <div className={fcls} onClick={fclick("texte")} style={{ fontFamily: bodyFont, fontSize: sizeRef * 0.05, fontWeight: 500, lineHeight: 1.25, color: subCol, opacity: subColor ? 1 : 0.82, ...clampTxt, ...fcur }}>{subtitle}</div> : null
  // Le QR est FOURNI (code existant réencodé, ou PNG importé) — jamais recréé/redesigné ici.
  const qrInner = qrImg
    ? <img src={qrImg} alt="" style={{ display: "block", width: Math.round(qrPx), height: Math.round(qrPx), objectFit: "contain" }} />
    : qrStatic
    ? <FauxQR size={Math.round(qrPx)} fg={pal.ink} bg={pal.qrBg} />
    : qrVector
    ? <QRVector value={qrValue} size={Math.round(qrPx)} fg={pal.ink} bg={pal.qrBg} />
    : <QRCanvas value={qrValue} size={Math.round(qrPx)} fg={pal.ink} bg={pal.qrBg} ecc="M" />
  const qrBadgeEl = qrBadge === "aucune"
    ? <div className={fcls} onClick={fclick("qr")} style={{ lineHeight: 0, ...fcur }}>{qrInner}</div>
    : <div className={fcls} onClick={fclick("qr")} style={{ background: pal.qrBg, padding: unit * (qrBadge === "cercle" ? 0.05 : 0.028), borderRadius: qrBadge === "cercle" ? "50%" : (eCorner === "rond" ? 16 : eCorner === "vif" ? 2 : 8), lineHeight: 0, display: "inline-block", ...fcur }}>{qrInner}</div>
  // QR libre : retiré du flux de la mise en page (rendu en absolu à qrFx/qrFy plus bas). Sinon, décalage fin X/Y.
  const qrEl = qrFree ? null : ((qrDx || qrDy) ? <div style={{ transform: `translate(${qrDx * 18}%, ${qrDy * 18}%)`, display: "inline-block" }}>{qrBadgeEl}</div> : qrBadgeEl)
  const ctaEl = eAccent === "aucun" ? null : (
    <div className={fcls} onClick={fclick("texte")} style={{ ...fcur, fontFamily: bodyFont, fontSize: sizeRef * 0.05, fontWeight: 800, padding: `${unit * 0.035}px ${unit * 0.09}px`, borderRadius: radiusEl, maxWidth: "100%", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", boxSizing: "border-box",
      ...(eAccent === "trait" ? { border: `2px solid ${btnStroke}`, color: btnStroke }
        : eAccent === "degrade" ? { background: `linear-gradient(135deg, ${shade(btnBg, 0.12)}, ${shade(btnBg, -0.28)})`, color: btnFg }
        : { background: btnBg, color: btnFg }) }}>{cta}</div>
  )

  const alignItems = eAlign === "left" ? "flex-start" : eAlign === "right" ? "flex-end" : "center"
  // Fini du fond : uni, dégradé (voile lumière→ombre) ou grain (trame de points fine). Composé sur pal.bg.
  const grainStep = Math.max(4, unit * 0.02)
  const gridStep = Math.max(8, unit * 0.06)
  const stripeStep = Math.max(6, unit * 0.05)
  const bgCss = bgFinish === "degrade"
    ? `linear-gradient(155deg, rgba(255,255,255,0.10), transparent 42%, rgba(0,0,0,0.16)), ${pal.bg}`
    : bgFinish === "grain"
    ? `radial-gradient(rgba(255,255,255,0.06) 1px, transparent 1.5px) 0 0 / ${grainStep}px ${grainStep}px, ${pal.bg}`
    : bgFinish === "rayures"
    ? `repeating-linear-gradient(45deg, rgba(255,255,255,0.05) 0 ${stripeStep * 0.5}px, transparent ${stripeStep * 0.5}px ${stripeStep}px), ${pal.bg}`
    : bgFinish === "quadrillage"
    ? `linear-gradient(rgba(255,255,255,0.05) 1px, transparent 1px) 0 0 / ${gridStep}px ${gridStep}px, linear-gradient(90deg, rgba(255,255,255,0.05) 1px, transparent 1px) 0 0 / ${gridStep}px ${gridStep}px, ${pal.bg}`
    : pal.bg
  // Photo de fond : voile de lisibilité auto (sombre si le texte est clair, clair si le texte est sombre).
  const scrim = readableOn(pal.fg) === "#0A0A0A"
    ? "linear-gradient(rgba(0,0,0,0.30), rgba(0,0,0,0.52))"
    : "linear-gradient(rgba(255,255,255,0.42), rgba(255,255,255,0.64))"
  const finalBg = bgImage ? `${scrim}, url(${bgImage}) center / cover no-repeat` : bgCss
  const base: React.CSSProperties = { width: w, height: h, boxSizing: "border-box", background: finalBg, color: pal.fg, borderRadius: isRound ? "50%" : (item.ratio >= 2 || item.ratio <= 0.5 ? 6 : 10), overflow: "hidden", position: "relative", display: "flex", padding: pad }

  // Cadre décoratif INDÉPENDANT de la mise en page (aucun / filet / double filet / coins ornés).
  const frameEl = frame === "filet"
    ? <div style={{ position: "absolute", inset: pad * 0.5, border: `1.5px solid ${pal.rule}`, borderRadius: isRound ? "50%" : 6, pointerEvents: "none" }} />
    : frame === "double"
    ? <><div style={{ position: "absolute", inset: pad * 0.42, border: `1.5px solid ${pal.rule}`, borderRadius: isRound ? "50%" : 6, pointerEvents: "none" }} /><div style={{ position: "absolute", inset: pad * 0.64, border: `1px solid ${pal.rule}`, borderRadius: isRound ? "50%" : 5, opacity: 0.6, pointerEvents: "none" }} /></>
    : frame === "coins"
    ? <><Corner p={pal.rule} s={unit * 0.085} pos={{ top: cornerInset, left: cornerInset }} /><Corner p={pal.rule} s={unit * 0.085} pos={{ top: cornerInset, right: cornerInset }} r /><Corner p={pal.rule} s={unit * 0.085} pos={{ bottom: cornerInset, left: cornerInset }} b /><Corner p={pal.rule} s={unit * 0.085} pos={{ bottom: cornerInset, right: cornerInset }} b r /></>
    : null

  let body: React.ReactNode
  if (layout.content === "band") {
    body = (
      <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column" }}>
        <div className={fcls} onClick={fclick("texte")} style={{ background: bandColor, color: bandFg, padding: `${pad * 0.7}px ${pad}px`, fontFamily: titleFont, fontSize: titleSize * 0.86, fontWeight: effWeight as any, ...fcur }}>{shownTitle}</div>
        <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: unit * 0.05, padding: pad }}>{subtitleEl}{qrEl}{ctaEl}</div>
      </div>
    )
  } else if (layout.content === "qrbig") {
    // « QR géant » = layout centré sur le QR. La taille du QR reste PHYSIQUE (réglée par la taille/le curseur) :
    // pas de scale CSS ici (ça gonflait le QR au-delà de qrMm et débordait). On rapproche juste les textes.
    body = <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: unit * (isRound ? 0.028 : 0.04), minHeight: 0, overflow: "hidden" }}><div className={fcls} onClick={fclick("texte")} style={{ fontFamily: titleFont, fontSize: titleSize * 0.72, fontWeight: effWeight as any, color: titleCol, textAlign: "center", ...clampTxt, ...fcur }}>{shownTitle}</div>{subtitleEl}{qrEl}{ctaEl}</div>
  } else if (layout.content === "split") {
    body = <div style={{ flex: 1, display: "flex", alignItems: "center", gap: pad, minWidth: 0 }}><div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: unit * 0.035 }}>{kickerEl}{titleEl}{subtitleEl}{ctaEl}</div>{qrEl}</div>
  } else if (layout.content === "poster") {
    // Bloc bas (QR + bouton) : alignSelf stretch + flexWrap → si la largeur manque, le bouton passe SOUS le QR
    // (jamais coupé au bord). Filet anti-débordement complémentaire au garde-fou layoutOk (poster = A5+).
    body = <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems, justifyContent: "space-between", minWidth: 0 }}><div style={{ display: "flex", flexDirection: "column", gap: unit * 0.03, alignItems, maxWidth: "100%" }}>{kickerEl}<div className={fcls} onClick={fclick("texte")} style={{ fontFamily: titleFont, fontSize: titleSize * 1.5, fontWeight: effWeight as any, letterSpacing: pal.titleLs, lineHeight: 1, color: titleCol, ...clampTxt, ...fcur }}>{shownTitle}</div>{subtitleEl}</div><div style={{ alignSelf: "stretch", display: "flex", flexWrap: "wrap", alignItems: "center", gap: pad, justifyContent: eAlign === "right" ? "flex-end" : eAlign === "left" ? "flex-start" : "center" }}>{qrEl}{ctaEl}</div></div>
  } else { // stack / center — la position du QR se règle (haut / centre / bas)
    // Sur un rond, on retire le kicker (marque) : le cercle inscrit ne tient pas kicker+titre+QR+bouton sans rogner.
    const kick = isRound ? null : kickerEl
    const stackInner = qrPos === "haut"
      ? <>{qrEl}{kick}{titleEl}{subtitleEl}{ctaEl}</>
      : qrPos === "bas"
      ? <>{kick}{titleEl}{subtitleEl}{ctaEl}{qrEl}</>
      : <>{kick}{titleEl}{subtitleEl}{qrEl}{ctaEl}</>
    body = <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems, justifyContent: "center", gap: unit * (isRound ? 0.032 : 0.045), textAlign: eAlign, minHeight: 0, overflow: "hidden" }}>{stackInner}</div>
  }

  // Placement vertical (curseur) : on décale le bloc de contenu — sauf le bandeau (absolu, plein cadre).
  const placed = layout.content === "band"
    ? body
    : <div style={{ flex: 1, display: "flex", minWidth: 0, transform: blockY ? `translateY(${blockY * 12}%)` : undefined }}>{body}</div>
  return (
    <div style={{ ...base, ...fcur }} onClick={onFocus ? (e => { e.stopPropagation(); onFocus("details") }) : undefined}>
      {placed}
      {logo === "objet" && logoUrl && <img src={logoUrl} alt="" style={{ position: "absolute", top: isRound ? unit * 0.2 : pad, left: isRound ? unit * 0.2 : pad, width: unit * 0.14, height: unit * 0.14, objectFit: "contain", zIndex: 2 }} />}
      {frameEl}
      {/* décor optionnel (lié à la mise en page) */}
      {layout.deco === "frame" && <div style={{ position: "absolute", inset: pad * 0.5, border: `2px solid ${pal.rule}`, borderRadius: isRound ? "50%" : 6, pointerEvents: "none" }} />}
      {layout.deco === "footer" && <div style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: unit * 0.04, background: pal.band }} />}
      {layout.deco === "diagonal" && <div style={{ position: "absolute", top: -h * 0.3, right: -w * 0.2, width: w * 0.9, height: h * 0.5, background: pal.band, opacity: 0.16, transform: "rotate(-24deg)", pointerEvents: "none" }} />}
      {layout.deco === "ornate" && <><Corner p={pal.rule} s={unit * 0.085} pos={{ top: cornerInset, left: cornerInset }} /><Corner p={pal.rule} s={unit * 0.085} pos={{ top: cornerInset, right: cornerInset }} r /><Corner p={pal.rule} s={unit * 0.085} pos={{ bottom: cornerInset, left: cornerInset }} b /><Corner p={pal.rule} s={unit * 0.085} pos={{ bottom: cornerInset, right: cornerInset }} b r /></>}
      {/* QR en position LIBRE (taille physique conservée -> reste scannable ; seule la position est libre). */}
      {qrFree && <div style={{ position: "absolute", left: `${(qrFx ?? 0.32) * 100}%`, top: `${(qrFy ?? 0.55) * 100}%`, zIndex: 3 }}>{qrBadgeEl}</div>}
      {/* Éléments libres (mode Studio libre) — posés en fraction du support, rendus statiques ici (masqués ignorés). */}
      {(freeEls ?? []).filter(el => !el.hidden).map(el => <FreeElView key={el.id} el={el} unit={unit} bodyFont={bodyFont} />)}
    </div>
  )
}
function Corner({ p, pos, r, b, s = 14 }: { p: string; pos: React.CSSProperties; r?: boolean; b?: boolean; s?: number }) {
  const bw = `${Math.max(1.5, s * 0.16)}px solid ${p}`
  return <span style={{ position: "absolute", width: s, height: s, ...(pos), borderTop: b ? "none" : bw, borderBottom: b ? bw : "none", borderLeft: r ? "none" : bw, borderRight: r ? bw : "none", pointerEvents: "none" }} />
}

/* Largeur physique du support (trim), en mm — sert d'échelle mm→px pour le QR. */
function trimWidthMm(item: Item) { return item.shape === "round" ? item.hMm : item.hMm * item.ratio }
/* Dimensions physiques de la PLANCHE (trim + fond perdu), en mm. */
function pageDims(item: Item) {
  const trimW = trimWidthMm(item)
  return { pageWmm: +(trimW + 2 * item.bleed).toFixed(1), pageHmm: +(item.hMm + 2 * item.bleed).toFixed(1) }
}
/* Marge blanche prépresse pour loger les traits de coupe (coupe droite uniquement ;
   les supports ronds sont découpés à la forme -> pas de repères rectangulaires). */
const CROP_MARGIN_MM = 4, CROP_LEN_MM = 3, CROP_STROKE_MM = 0.25
function marksMargin(item: Item) { return item.shape === "round" ? 0 : CROP_MARGIN_MM }
/* Dimensions du SUPPORT physique imprimé (planche + marge des traits de coupe) = format @page réel. */
function mediaDims(item: Item) {
  const { pageWmm, pageHmm } = pageDims(item)
  const m = marksMargin(item)
  return { mediaWmm: +(pageWmm + 2 * m).toFixed(1), mediaHmm: +(pageHmm + 2 * m).toFixed(1) }
}
/* Planche d'impression : le support à sa taille RÉELLE (mm) rendu en haute résolution puis
   remis à l'échelle physique — consommé par window.print() -> PDF prêt imprimeur (fidèle à l'aperçu). */
function PrintSheet(props: Omit<React.ComponentProps<typeof SupportVisual>, "w" | "h" | "physW">) {
  const { item } = props
  const { pageWmm, pageHmm } = pageDims(item)
  const { mediaWmm, mediaHmm } = mediaDims(item)
  const m = marksMargin(item)
  const long = 1600
  const bigW = item.ratio >= 1 ? long : Math.round(long * item.ratio)
  const bigH = item.shape === "round" ? bigW : Math.round(bigW / item.ratio)
  const scale = (pageWmm * 96 / 25.4) / bigW  // px haute-déf -> mm réels (1mm = 96/25.4 px CSS)
  // Traits de coupe : au trait de rogne (trim), dans la marge blanche, sans toucher le fond perdu.
  const L = CROP_LEN_MM, S = CROP_STROKE_MM
  const tlx = m + item.bleed, tty = m + item.bleed
  const trx = m + pageWmm - item.bleed, tby = m + pageHmm - item.bleed
  const marks: { left: number; top: number; width: number; height: number }[] = m === 0 ? [] : [
    { left: tlx, top: m - L, width: S, height: L }, { left: m - L, top: tty, width: L, height: S },           // haut-gauche
    { left: trx, top: m - L, width: S, height: L }, { left: mediaWmm - m, top: tty, width: L, height: S },     // haut-droite
    { left: tlx, top: mediaHmm - m, width: S, height: L }, { left: m - L, top: tby, width: L, height: S },     // bas-gauche
    { left: trx, top: mediaHmm - m, width: S, height: L }, { left: mediaWmm - m, top: tby, width: L, height: S }, // bas-droite
  ]
  return (
    <div style={{ position: "relative", width: `${mediaWmm}mm`, height: `${mediaHmm}mm`, background: "#fff", overflow: "hidden" }}>
      <div style={{ position: "absolute", left: `${m}mm`, top: `${m}mm`, width: `${pageWmm}mm`, height: `${pageHmm}mm`, overflow: "hidden", background: props.pal.flat }}>
        <div style={{ width: bigW, height: bigH, transformOrigin: "top left", transform: `scale(${scale})` }}>
          <SupportVisual {...props} qrVector physW={pageWmm} w={bigW} h={bigH} />
        </div>
      </div>
      {marks.map((mk, i) => <div key={i} aria-hidden style={{ position: "absolute", background: "#000", left: `${mk.left}mm`, top: `${mk.top}mm`, width: `${mk.width}mm`, height: `${mk.height}mm` }} />)}
    </div>
  )
}

// Tous les réglages de design partagés (sans ce qui dépend du support/rendu).
type DesignProps = Omit<React.ComponentProps<typeof SupportVisual>, "item" | "physW" | "w" | "h" | "qrStatic">

/* Une case de la planche multi-supports : le support à sa taille TRIM réelle (mm), haute-déf puis mis à l'échelle. */
function GangCell({ it, wmm, design }: { it: Item; wmm: number; design: DesignProps }) {
  const long = 1100
  const bigW = it.ratio >= 1 ? long : Math.round(long * it.ratio)
  const bigH = it.shape === "round" ? bigW : Math.round(bigW / it.ratio)
  const scale = (wmm * 96 / 25.4) / bigW
  return (
    <div style={{ width: bigW, height: bigH, transformOrigin: "top left", transform: `scale(${scale})` }}>
      <SupportVisual {...design} item={it} qrVector physW={wmm} w={bigW} h={bigH} />
    </div>
  )
}

/* Planche multi-supports : une seule feuille auto-dimensionnée, supports rangés en étagères (mm réels),
   chacun avec un repère de découpe. Même mécanisme fixe que la planche simple (une page => fiable). */
function MultiSheet({ items, design }: { items: Item[]; design: DesignProps }) {
  const GAP = 8, MARGIN = 10, MAXW = 380   // MAXW ~ largeur A3
  let x = 0, y = 0, rowH = 0, totalW = 0
  const placed: { it: Item; x: number; y: number; w: number; h: number }[] = []
  for (const it of items) {
    const w = trimWidthMm(it), h = it.hMm
    if (x > 0 && x + GAP + w > MAXW) { totalW = Math.max(totalW, x - GAP); y += rowH + GAP; x = 0; rowH = 0 }
    placed.push({ it, x, y, w, h })
    x += w + GAP; rowH = Math.max(rowH, h)
  }
  totalW = Math.max(totalW, x - GAP)
  const pageW = +(totalW + 2 * MARGIN).toFixed(1), pageH = +(y + rowH + 2 * MARGIN).toFixed(1)
  const css = `@media screen{.ps-print-root{display:none!important}}@media print{body *{visibility:hidden!important}.ps-print-root,.ps-print-root *{visibility:visible!important}.ps-print-root{position:fixed!important;left:0;top:0;display:block!important}@page{size:${pageW}mm ${pageH}mm;margin:0}}`
  return (
    <div className="ps-print-root" aria-hidden>
      <style>{css}</style>
      <div style={{ position: "relative", width: `${pageW}mm`, height: `${pageH}mm`, background: "#fff" }}>
        {placed.map(({ it, x, y, w, h }, i) => (
          <div key={i} style={{ position: "absolute", left: `${MARGIN + x}mm`, top: `${MARGIN + y}mm`, width: `${w}mm`, height: `${h}mm`, overflow: "hidden", border: "0.2mm dashed rgba(0,0,0,0.45)", borderRadius: it.shape === "round" ? "50%" : 0 }}>
            <GangCell it={it} wmm={w} design={design} />
          </div>
        ))}
      </div>
    </div>
  )
}

/* Rendu unifié d'un élément libre (texte / icône / forme). editable=true -> déplaçable (éditeur à plat),
   sinon statique (aperçu packshot + planche). Une seule source -> pas de dérive entre édition et rendu. */
function FreeElView({ el, unit, bodyFont, editable, selected, onDown, onEdit }: { el: FreeEl; unit: number; bodyFont: string; editable?: boolean; selected?: boolean; onDown?: (e: React.PointerEvent, el: FreeEl) => void; onEdit?: (el: FreeEl) => void }) {
  const base: React.CSSProperties = { position: "absolute", left: `${el.x * 100}%`, top: `${el.y * 100}%`,
    ...(el.rot ? { transform: `rotate(${el.rot}deg)`, transformOrigin: "top left" } : {}), ...(el.opacity != null ? { opacity: el.opacity } : {}),
    ...(editable ? { cursor: "move", userSelect: "none", outline: selected ? `2px solid ${C.gold}` : "1px dashed rgba(255,255,255,.35)", outlineOffset: 2, zIndex: 5 } : { pointerEvents: "none", zIndex: 4 }) }
  const dp = editable && onDown ? { onPointerDown: (e: React.PointerEvent) => onDown(e, el), ...(onEdit ? { onDoubleClick: () => onEdit(el) } : {}) } : {}
  if (el.kind === "icon") {
    const Ico = ICON_LIB[el.icon || "Star"] || ICON_LIB.Star
    return <div {...dp} style={{ ...base, lineHeight: 0 }}><Ico size={Math.round(unit * el.size)} color={el.color} /></div>
  }
  if (el.kind === "shape") {
    const s = el.shape || "circle"
    const br = s === "circle" ? "50%" : s === "pill" ? "999px" : s === "rrect" ? "12%" : "0"
    return <div {...dp} style={{ ...base, width: `${el.w * 100}%`, height: `${(el.h2 ?? 0.12) * 100}%`, background: el.color, borderRadius: br }} />
  }
  return <div {...dp} style={{ ...base, width: `${el.w * 100}%`, fontSize: unit * el.size, color: el.color, textAlign: el.align, fontFamily: el.font || bodyFont, fontWeight: el.weight, lineHeight: 1.15, whiteSpace: "pre-wrap", overflowWrap: "anywhere" }}>{el.text}</div>
}

/* Vignette de modèle « 1 clic » : aperçu représentatif LÉGER (palette + casse/alignement + accent + faux QR).
   Pas un rendu lourd du support complet — juste assez pour VOIR la personnalité du modèle d'un coup d'œil. */
function PresetThumb({ preset, item, on, onClick }: { preset: Preset; item: Item; on: boolean; onClick: () => void }) {
  const s = STYLE_BY_ID[preset.style] || STYLE_BY_ID.premiumdark
  const pal = paletteFromStyle(s)
  const accHex = ACCENTS.find(a => a.id === preset.accent)?.hex || pal.band
  const align = preset.eAlign === "left" ? "flex-start" : preset.eAlign === "right" ? "flex-end" : "center"
  const titleTxt = preset.titleCase === "upper" ? "TITRE" : "Titre"
  return (
    <button onClick={onClick} title={preset.label} style={{ borderRadius: 12, overflow: "hidden", border: `2px solid ${on ? C.gold : "transparent"}`, background: "none", padding: 0, cursor: "pointer" }}>
      <div style={{ height: 72, background: pal.bg, display: "flex", flexDirection: "column", alignItems: align, justifyContent: "center", gap: 5, padding: 8 }}>
        <span style={{ fontFamily: pal.titleFont, fontSize: 11, fontWeight: 700, color: pal.fg, lineHeight: 1, letterSpacing: pal.titleLs }}>{titleTxt}</span>
        <FauxQR size={22} fg={pal.ink} bg={pal.qrBg} />
        <span style={{ width: 26, height: 6, borderRadius: preset.eCorner === "rond" ? 999 : 2, background: accHex }} />
      </div>
      <div style={{ fontSize: 10.5, fontWeight: 700, color: on ? C.gold : C.fgMuted, padding: "4px 6px", background: C.surface, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", textAlign: "center" }}>{preset.label}</div>
    </button>
  )
}

/* Vignette de TEMPLATE : aperçu représentatif léger (palette + titre réel + casse/alignement + accent + faux QR).
   Reflète le contenu du modèle, pas juste un look — l'utilisateur reconnaît le point de départ. */
function TemplateThumb({ t, onClick }: { t: PrintTemplate; onClick: () => void }) {
  const L = t.look
  const s = STYLE_BY_ID[L.style] || STYLE_BY_ID.premiumdark
  const pal = paletteFromStyle(s)
  const accHex = ACCENTS.find(a => a.id === L.accent)?.hex || pal.band
  const align = L.eAlign === "left" ? "flex-start" : L.eAlign === "right" ? "flex-end" : "center"
  const raw = t.content.title || "Titre"
  const titleTxt = L.titleCase === "upper" ? raw.toUpperCase() : raw
  return (
    <button onClick={onClick} title={t.name} className="ps-tpl" style={{ borderRadius: 12, overflow: "hidden", border: "2px solid transparent", background: "none", padding: 0, cursor: "pointer" }}>
      <div style={{ height: 78, background: pal.bg, display: "flex", flexDirection: "column", alignItems: align, justifyContent: "center", gap: 5, padding: 8 }}>
        <span style={{ fontFamily: pal.titleFont, fontSize: 10.5, fontWeight: 700, color: pal.fg, lineHeight: 1.05, letterSpacing: pal.titleLs, maxWidth: "100%", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{titleTxt}</span>
        <FauxQR size={22} fg={pal.ink} bg={pal.qrBg} />
        <span style={{ width: 24, height: 6, borderRadius: L.eCorner === "rond" ? 999 : 2, background: accHex }} />
      </div>
      <div style={{ fontSize: 10.5, fontWeight: 700, color: C.fgMuted, padding: "4px 6px", background: C.surface, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", textAlign: "center" }}>{t.name}</div>
    </button>
  )
}

/* Bibliothèque de TEMPLATES (§3-4/19-20) : recherche + catégories + « Recommandés » + grille.
   Réutilisée desktop (volet Modèles) et mobile (onglet Thème). Ne montre jamais un mur brut. */
const TPL_CATS: { id: string; label: string; m?: (t: PrintTemplate) => boolean }[] = [
  { id: "pour-vous", label: "Pour vous" },
  { id: "resto", label: "Restaurant", m: t => t.business.includes("Restaurant") || t.business.includes("Café") || t.business.includes("Boulangerie") },
  { id: "bar", label: "Bar", m: t => t.business.includes("Bar") || t.business.includes("Caviste") },
  { id: "commerce", label: "Commerce", m: t => t.business.some(b => ["Boutique", "Food truck", "Boucherie", "Traiteur"].includes(b)) },
  { id: "avis", label: "Avis", m: t => t.objective.includes("Avis") },
  { id: "wifi", label: "Wi-Fi", m: t => t.objective.includes("Wifi") },
  { id: "event", label: "Événement", m: t => t.business.includes("Événement") },
  { id: "reseaux", label: "Réseaux", m: t => t.objective.includes("Réseaux") },
  { id: "business", label: "Business", m: t => t.business.some(b => ["Freelance", "Artisan", "Immobilier", "Coach", "Photographe"].includes(b)) || t.objective.includes("Contact") },
]
// Aperçu RICHE au survol (#4) — rendu représentatif agrandi + méta (objectif). Desktop `hover:fine` uniquement,
// en position fixed (échappe à l'overflow du volet), non interactif (pointer-events none).
function TemplateHoverCard({ t }: { t: PrintTemplate }) {
  const L = t.look
  const s = STYLE_BY_ID[L.style] || STYLE_BY_ID.premiumdark
  const pal = paletteFromStyle(s)
  const accHex = ACCENTS.find(a => a.id === L.accent)?.hex || pal.band
  const align = L.eAlign === "left" ? "flex-start" : L.eAlign === "right" ? "flex-end" : "center"
  const raw = t.content.title || "Titre"
  const titleTxt = L.titleCase === "upper" ? raw.toUpperCase() : raw
  return (
    <div style={{ width: 210, borderRadius: 14, overflow: "hidden", border: `1px solid ${C.hairline}`, background: C.surface, boxShadow: "0 18px 50px rgba(0,0,0,.6)" }}>
      <div style={{ height: 184, background: pal.bg, display: "flex", flexDirection: "column", alignItems: align, justifyContent: "center", gap: 9, padding: 18, textAlign: align === "center" ? "center" : align === "flex-end" ? "right" : "left" }}>
        <span style={{ fontFamily: pal.bodyFont, fontSize: 8.5, fontWeight: 700, letterSpacing: ".1em", textTransform: "uppercase", color: accHex }}>{t.business[0] || "QRowg"}</span>
        <span style={{ fontFamily: pal.titleFont, fontSize: 17, fontWeight: 700, color: pal.fg, lineHeight: 1.05, letterSpacing: pal.titleLs, maxWidth: "100%", overflowWrap: "anywhere" }}>{titleTxt}</span>
        {t.content.subtitle && <span style={{ fontFamily: pal.bodyFont, fontSize: 9.5, fontWeight: 500, color: pal.fg, opacity: 0.8, lineHeight: 1.2, maxWidth: "100%" }}>{t.content.subtitle}</span>}
        <FauxQR size={46} fg={pal.ink} bg={pal.qrBg} />
        {t.content.cta && <span style={{ fontFamily: pal.bodyFont, fontSize: 9, fontWeight: 800, color: readableOn(accHex), background: accHex, borderRadius: L.eCorner === "rond" ? 999 : L.eCorner === "vif" ? 0 : 6, padding: "5px 12px", maxWidth: "100%", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{t.content.cta}</span>}
      </div>
      <div style={{ padding: "9px 12px", background: C.surface }}>
        <div style={{ fontSize: 12.5, fontWeight: 700, color: C.fg, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{t.name}</div>
        {t.objective.length > 0 && <div style={{ fontSize: 10.5, color: C.fgMuted, marginTop: 2, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{t.objective.slice(0, 3).join(" · ")}</div>}
      </div>
    </div>
  )
}
function TemplateLibrary({ item, onApply, onApplyVariant }: { item: Item; onApply: (t: PrintTemplate) => void; onApplyVariant: (t: PrintTemplate, v: TemplateVariant) => void }) {
  const [q, setQ] = useState("")
  const [cat, setCat] = useState("pour-vous")
  const [hoverT, setHoverT] = useState<{ t: PrintTemplate; x: number; y: number } | null>(null)
  const ql = q.trim().toLowerCase()
  const matchSearch = (t: PrintTemplate) => !ql || t.name.toLowerCase().includes(ql) || t.business.some(b => b.toLowerCase().includes(ql)) || t.objective.some(o => o.toLowerCase().includes(ql)) || t.style.some(s => s.toLowerCase().includes(ql))
  let list = filterTemplates(item).filter(matchSearch)
  if (!ql && cat !== "pour-vous") { const c = TPL_CATS.find(x => x.id === cat); if (c?.m) list = list.filter(c.m) }
  const showReco = !ql && cat === "pour-vous"
  const reco = showReco ? list.slice(0, 6) : []
  const rest = showReco ? list.slice(6) : list
  const grid: React.CSSProperties = { display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(96px,1fr))", gap: 10 }
  // Survol enrichi (desktop pointeur fin) : positionne la carte à côté du thumbnail, repliée dans le viewport.
  function onHover(t: PrintTemplate, e: React.MouseEvent) {
    if (!window.matchMedia || !window.matchMedia("(hover: hover) and (pointer: fine)").matches) return
    const r = (e.currentTarget as HTMLElement).getBoundingClientRect()
    const W = 210, H = 232, gap = 12
    const x = r.right + gap + W <= window.innerWidth ? r.right + gap : Math.max(8, r.left - gap - W)
    const y = Math.max(8, Math.min(r.top - 24, window.innerHeight - H - 8))
    setHoverT({ t, x, y })
  }
  const card = (t: PrintTemplate) => (
    <div key={t.id} style={{ display: "flex", flexDirection: "column", gap: 5 }} onMouseEnter={e => onHover(t, e)} onMouseMove={e => onHover(t, e)} onMouseLeave={() => setHoverT(h => (h?.t.id === t.id ? null : h))}>
      <TemplateThumb t={t} onClick={() => onApply(t)} />
      {t.variants && t.variants.length > 0 && <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>{t.variants.map(v => <button key={v.id} onClick={() => onApplyVariant(t, v)} title={`${t.name} — ${v.label}`} aria-label={`${t.name} — ${v.label}`} style={{ width: 16, height: 16, borderRadius: "50%", border: `1px solid ${C.hairline}`, background: v.hex, cursor: "pointer", padding: 0, flexShrink: 0 }} />)}</div>}
    </div>
  )
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      <style>{`.ps-tpl{transition:transform var(--mo-fast) var(--mo-ease-standard)}.ps-tpl:hover{transform:scale(1.04)}@media(prefers-reduced-motion:reduce){.ps-tpl:hover{transform:none}}`}</style>
      {hoverT && <div className="mo-pop-in" style={{ position: "fixed", left: hoverT.x, top: hoverT.y, zIndex: 200, pointerEvents: "none" }}><TemplateHoverCard t={hoverT.t} /></div>}
      <input value={q} onChange={e => setQ(e.target.value)} placeholder="Rechercher un modèle…" style={{ ...inputStyle, height: 42 }} />
      <div style={{ display: "flex", gap: 6, overflowX: "auto", paddingBottom: 2, scrollbarWidth: "none" }}>
        {TPL_CATS.map(c => <button key={c.id} onClick={() => { setCat(c.id); setQ("") }} style={{ ...chipStyle(!ql && cat === c.id), minHeight: 36, fontSize: 12 }}>{c.label}</button>)}
      </div>
      {showReco && reco.length > 0 && <>
        <p style={{ margin: 0, fontSize: 11.5, fontWeight: 700, color: C.gold }}>Recommandés pour ce support</p>
        <div style={grid}>{reco.map(card)}</div>
        <p style={secLabel}>Tous les modèles</p>
      </>}
      <div style={grid}>{rest.map(card)}</div>
      {list.length === 0 && <p style={{ color: C.fgMuted, fontSize: 13, textAlign: "center", padding: "8px 0" }}>Aucun modèle pour « {q} ».</p>}
    </div>
  )
}

/* Bibliothèque d'éléments « + Ajouter » : Texte + Formes + Icônes catégorisées, avec recherche FR.
   Ne montre pas 40 boutons en vrac — sections claires + filtre. Sur choix : ajoute l'élément et ferme. */
function AddLibrary({ query, setQuery, onComp, onText, onShape, onIcon }: { query: string; setQuery: (v: string) => void; onComp: (id: string) => void; onText: () => void; onShape: (id: string) => void; onIcon: (name: string) => void }) {
  const q = query.trim().toLowerCase()
  const comps = q ? COMPOSITIONS.filter(c => c.label.toLowerCase().includes(q) || c.hint.toLowerCase().includes(q)) : COMPOSITIONS
  const shownShapes = q ? SHAPES.filter(s => s.label.toLowerCase().includes(q)) : SHAPES
  const cats = ICON_CATS.map(c => ({ cat: c.cat, items: q ? c.items.filter(i => i.label.toLowerCase().includes(q) || i.name.toLowerCase().includes(q)) : c.items })).filter(c => c.items.length)
  const showText = !q || "texte".includes(q) || "text".includes(q)
  const empty = !comps.length && !showText && !shownShapes.length && !cats.length
  const gridStyle: React.CSSProperties = { display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(74px,1fr))", gap: 8 }
  const tile: React.CSSProperties = { display: "flex", flexDirection: "column", alignItems: "center", gap: 5, padding: "10px 6px", borderRadius: 10, border: `1px solid ${C.hairline}`, background: C.surfaceUp, color: C.fg, cursor: "pointer", fontSize: 10.5, minHeight: 62 }
  const secLbl: React.CSSProperties = { margin: "0 0 8px", fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.8, color: C.fgFaint }
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <input autoFocus value={query} onChange={e => setQuery(e.target.value)} placeholder="Rechercher (avis, wifi, réserver…)" style={{ ...inputStyle, height: 44 }} />
      {comps.length > 0 && <div><p style={secLbl}>Compositions prêtes</p><div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(132px,1fr))", gap: 8 }}>{comps.map(c => <button key={c.id} className="ps-chip" onClick={() => onComp(c.id)} style={{ ...tile, flexDirection: "row", alignItems: "flex-start", justifyContent: "flex-start", textAlign: "left", minHeight: 0, padding: "10px 12px" }}><span style={{ display: "flex", flexDirection: "column", gap: 2 }}><span style={{ fontSize: 12.5, fontWeight: 700 }}>{c.label}</span><span style={{ fontSize: 10.5, color: C.fgFaint }}>{c.hint}</span></span></button>)}</div></div>}
      {showText && <div><p style={secLbl}>Texte</p><div style={gridStyle}><button className="ps-chip" onClick={onText} style={tile}><span style={{ fontSize: 20, fontWeight: 800, lineHeight: 1 }}>T</span>Texte</button></div></div>}
      {shownShapes.length > 0 && <div><p style={secLbl}>Formes</p><div style={gridStyle}>{shownShapes.map(s => <button key={s.id} className="ps-chip" onClick={() => onShape(s.id)} style={tile}><span style={{ fontSize: 18, lineHeight: 1 }}>{s.g}</span>{s.label}</button>)}</div></div>}
      {cats.map(c => <div key={c.cat}><p style={secLbl}>{c.cat}</p><div style={gridStyle}>{c.items.map(i => { const Ico = ICON_LIB[i.name]; return <button key={i.name} className="ps-chip" onClick={() => onIcon(i.name)} style={tile}>{Ico ? <Ico size={20} /> : null}{i.label}</button> })}</div></div>)}
      {empty && <p style={{ color: C.fgMuted, fontSize: 13, textAlign: "center", padding: "12px 0" }}>Aucun élément pour « {query} ».</p>}
    </div>
  )
}

/* Barre de zoom de l'éditeur à plat : − / % / + / Ajuster. Discrète, ancrée au-dessus du support. */
function ZoomBar({ zoom, setZoom }: { zoom: number; setZoom: (v: number | ((z: number) => number)) => void }) {
  const btn: React.CSSProperties = { width: 32, height: 32, borderRadius: 8, border: `1px solid ${C.hairline}`, background: C.surfaceUp, color: C.fg, cursor: "pointer", fontSize: 16, lineHeight: 1, display: "inline-flex", alignItems: "center", justifyContent: "center" }
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 6, marginBottom: 6 }}>
      <button onClick={() => setZoom(z => Math.max(0.5, +(z - 0.1).toFixed(2)))} title="Dézoomer" aria-label="Dézoomer" style={btn}>−</button>
      <span style={{ minWidth: 46, textAlign: "center", fontSize: 12, fontWeight: 700, color: C.fgMuted, fontFamily: "ui-monospace, monospace" }}>{Math.round(zoom * 100)} %</span>
      <button onClick={() => setZoom(z => Math.min(2, +(z + 0.1).toFixed(2)))} title="Zoomer" aria-label="Zoomer" style={btn}>+</button>
      <button onClick={() => setZoom(1)} title="Ajuster à l'écran" style={{ ...btn, width: "auto", padding: "0 12px", fontSize: 12, fontWeight: 700 }}>Ajuster</button>
    </div>
  )
}

/* Éditeur À PLAT (mode Studio libre) : le support de face, éléments libres déplaçables à la souris.
   Positions en fraction du support -> l'aperçu packshot et la planche PDF les rendent au même endroit. */
function FlatEditor({ item, design, freeEls, setFreeEls, selEl, setSelEl, onQrMove, zoom = 1 }: { item: Item; design: any; freeEls: FreeEl[]; setFreeEls: React.Dispatch<React.SetStateAction<FreeEl[]>>; selEl: string | null; setSelEl: (v: string | null) => void; onQrMove: (x: number, y: number) => void; zoom?: number }) {
  const wrapRef = useRef<HTMLDivElement>(null)
  const [avail, setAvail] = useState(460)   // largeur dispo mesurée → l'éditeur TIENT à l'écran à 100 % (mobile inclus)
  useEffect(() => { const m = () => { const cw = wrapRef.current?.clientWidth; if (cw) setAvail(cw) }; m(); window.addEventListener("resize", m); return () => window.removeEventListener("resize", m) }, [])
  const ref = useRef<HTMLDivElement>(null)
  const drag = useRef<{ id: string; sx: number; sy: number; ox: number; oy: number; wpx: number; hpx: number } | null>(null)
  const rez = useRef<{ id: string; sx: number; sy: number; sw: number; sh: number; ss: number; kind: string } | null>(null)   // redimensionnement en cours
  const [editingId, setEditingId] = useState<string | null>(null)   // texte en édition INLINE (double-clic)
  const [guide, setGuide] = useState<{ x: number | null; y: number | null }>({ x: null, y: null })
  const ratio = item.shape === "round" ? 1 : item.ratio
  const box = Math.round(Math.min(460, Math.max(180, avail)) * zoom)   // 100 % = ajusté à l'écran ; zoom>1 agrandit (défilement)
  const w = ratio >= 1 ? box : Math.round(box * ratio)
  const h = ratio >= 1 ? Math.round(box / ratio) : box
  const unit = Math.min(w, h)
  const wmm = item.shape === "round" ? item.hMm : item.hMm * item.ratio
  const qrFrac = Math.max(0.1, Math.min(0.9, (item.qrMm * (design.size?.factor || 1)) / wmm))  // taille du QR en fraction de largeur
  function startDrag(e: React.PointerEvent, id: string, ox: number, oy: number, wpx: number, hpx: number) {
    e.stopPropagation(); try { (e.target as HTMLElement).setPointerCapture(e.pointerId) } catch {}
    drag.current = { id, sx: e.clientX, sy: e.clientY, ox, oy, wpx, hpx }
  }
  function onDown(e: React.PointerEvent, el: FreeEl) {
    setSelEl(el.id)
    if (el.locked) { e.stopPropagation(); return }   // verrouillé : sélectionnable mais pas déplaçable
    const wpx = (el.kind === "text" || el.kind === "shape") ? el.w * w : unit * el.size
    const hpx = el.kind === "shape" ? (el.h2 ?? 0.12) * h : el.kind === "text" ? unit * el.size * 1.2 : unit * el.size
    startDrag(e, el.id, el.x, el.y, wpx, hpx)
  }
  function onMove(e: React.PointerEvent) {
    const r = ref.current?.getBoundingClientRect(); if (!r) return
    const cl = (v: number, lo = 0, hi = 1) => Math.max(lo, Math.min(hi, v))
    // Redimensionnement (poignée coin bas-droite) prioritaire sur le déplacement.
    const z = rez.current
    if (z) {
      const dx = (e.clientX - z.sx) / r.width, dy = (e.clientY - z.sy) / r.height
      setFreeEls(els => els.map(x => {
        if (x.id !== z.id) return x
        if (z.kind === "shape") return { ...x, w: cl(z.sw + dx, 0.03, 1), h2: cl(z.sh + dy, 0.01, 1) }
        if (z.kind === "icon") return { ...x, size: cl(z.ss + (dx + dy) / 2, 0.03, 0.6) }
        const dd = (dx + dy) / 2   // texte : police + largeur suivent le glissement (uniforme)
        return { ...x, size: cl(z.ss + dd, 0.02, 0.4), w: cl(z.sw + dd * 2, 0.05, 1) }
      }))
      return
    }
    const d = drag.current; if (!d) return
    const clamp = (v: number) => Math.max(0, Math.min(1, v))
    let nx = clamp(d.ox + (e.clientX - d.sx) / r.width)
    let ny = clamp(d.oy + (e.clientY - d.sy) / r.height)
    const TH = 7  // aimantation (px) : centre du support, marges de sécurité, et CENTRE des autres éléments (guides dorés).
    const mX = (item.margin / wmm) * w, mY = (item.margin / item.hMm) * h
    const xc = [w / 2, mX, w - mX], yc = [h / 2, mY, h - mY]
    for (const el of freeEls) {
      if (el.hidden || el.id === d.id) continue
      const ewp = (el.kind === "text" || el.kind === "shape") ? el.w * w : unit * el.size
      const ehp = el.kind === "shape" ? (el.h2 ?? 0.12) * h : el.kind === "text" ? unit * el.size * 1.2 : unit * el.size
      xc.push(el.x * w + ewp / 2); yc.push(el.y * h + ehp / 2)
    }
    let cx = nx * w + d.wpx / 2, cy = ny * h + d.hpx / 2
    let gx: number | null = null, gy: number | null = null
    for (const c of xc) if (Math.abs(cx - c) < TH) { nx = clamp((c - d.wpx / 2) / w); cx = c; gx = c; break }
    for (const c of yc) if (Math.abs(cy - c) < TH) { ny = clamp((c - d.hpx / 2) / h); cy = c; gy = c; break }
    if (d.id === "__qr__") onQrMove(nx, ny)
    else setFreeEls(els => els.map(x => (x.id === d.id ? { ...x, x: nx, y: ny } : x)))
    setGuide({ x: gx, y: gy })
  }
  const onUp = () => { drag.current = null; rez.current = null; setGuide({ x: null, y: null }) }
  return (
    <div ref={wrapRef} style={{ width: "100%", display: "flex", justifyContent: "center" }}>
    <div ref={ref} onPointerMove={onMove} onPointerUp={onUp} onPointerLeave={onUp} onPointerDown={() => setSelEl(null)}
      style={{ position: "relative", width: w, height: h, borderRadius: item.shape === "round" ? "50%" : 12, overflow: "hidden", touchAction: "none", boxShadow: "0 14px 44px rgba(0,0,0,.55)" }}>
      <SupportVisual {...design} item={item} freeEls={[]} physW={wmm} w={w} h={h} />
      {/* Zone de sécurité (marge d'impression) — repère discret : rien d'important au-delà. */}
      <div style={{ position: "absolute", left: (item.margin / wmm) * w, top: (item.margin / item.hMm) * h, right: (item.margin / wmm) * w, bottom: (item.margin / item.hMm) * h, border: `1px dashed ${C.goldA33}`, borderRadius: item.shape === "round" ? "50%" : 6, pointerEvents: "none", zIndex: 1 }} />
      {design.qrFree && <div onPointerDown={e => startDrag(e, "__qr__", design.qrFx ?? 0.32, design.qrFy ?? 0.55, qrFrac * w, qrFrac * w)}
        style={{ position: "absolute", left: `${(design.qrFx ?? 0.32) * 100}%`, top: `${(design.qrFy ?? 0.55) * 100}%`, width: qrFrac * w, height: qrFrac * w, cursor: "move", outline: `2px solid ${C.gold}`, outlineOffset: 2, zIndex: 7, touchAction: "none" }} title="Déplacer le QR" />}
      {freeEls.filter(el => !el.hidden).map(el => {
        // Édition INLINE : un textarea calé sur le texte (mêmes police/taille/couleur/largeur) — WYSIWYG.
        if (editingId === el.id && el.kind === "text") {
          return <textarea key={el.id} autoFocus value={el.text}
            onChange={e => setFreeEls(els => els.map(x => x.id === el.id ? { ...x, text: e.target.value } : x))}
            onBlur={() => setEditingId(null)}
            onKeyDown={e => { if (e.key === "Escape") e.currentTarget.blur() }}
            onPointerDown={e => e.stopPropagation()}
            rows={Math.max(1, el.text.split("\n").length)}
            style={{ position: "absolute", left: `${el.x * 100}%`, top: `${el.y * 100}%`, width: `${el.w * 100}%`, fontSize: unit * el.size, color: el.color, textAlign: el.align, fontFamily: el.font || "Inter, system-ui, sans-serif", fontWeight: el.weight, lineHeight: 1.15, background: "rgba(0,0,0,0.18)", border: `1px solid ${C.gold}`, outline: "none", resize: "none", overflow: "hidden", padding: 0, margin: 0, zIndex: 8, boxSizing: "border-box", transform: el.rot ? `rotate(${el.rot}deg)` : undefined, transformOrigin: "top left", opacity: el.opacity ?? 1 }} />
        }
        return <FreeElView key={el.id} el={el} unit={unit} bodyFont="Inter, system-ui, sans-serif" editable selected={selEl === el.id} onDown={onDown} onEdit={() => { if (!el.locked) setEditingId(el.id) }} />
      })}
      {/* Poignée de redimensionnement (coin bas-droite de l'élément sélectionné). */}
      {(() => {
        const s = freeEls.find(e => e.id === selEl)
        if (!s || s.hidden || s.locked || editingId === s.id) return null
        const wpx = (s.kind === "text" || s.kind === "shape") ? s.w * w : unit * s.size
        const hpx = s.kind === "shape" ? (s.h2 ?? 0.12) * h : s.kind === "text" ? unit * s.size * 1.2 : unit * s.size
        return <div title="Redimensionner" onPointerDown={e => { e.stopPropagation(); try { (e.target as HTMLElement).setPointerCapture(e.pointerId) } catch {} rez.current = { id: s.id, sx: e.clientX, sy: e.clientY, sw: s.w, sh: s.h2 ?? 0.12, ss: s.size, kind: s.kind } }}
          style={{ position: "absolute", left: s.x * w + wpx - 7, top: s.y * h + hpx - 7, width: 14, height: 14, borderRadius: 4, background: C.gold, border: "2px solid #0A0A0A", cursor: "nwse-resize", zIndex: 9, touchAction: "none" }} />
      })()}
      {guide.x != null && <div style={{ position: "absolute", left: guide.x, top: 0, bottom: 0, width: 1, background: C.gold, opacity: 0.85, pointerEvents: "none", zIndex: 6 }} />}
      {guide.y != null && <div style={{ position: "absolute", top: guide.y, left: 0, right: 0, height: 1, background: C.gold, opacity: 0.85, pointerEvents: "none", zIndex: 6 }} />}
    </div>
    </div>
  )
}

/* Aperçu packshot : le support posé dans sa scène (perspective + ombres + sol). */
function Packshot(props: { item: Item; scene: ReturnType<typeof sceneLayers>; pal: ReturnType<typeof paletteFromStyle>; style: Style; layout: { content: string; deco: string | null }; size: { factor: number }; qrValue: string; qrImg: string | null; qrBadge: string; qrPos: string; qrDx: number; qrDy: number; qrFree?: boolean; qrFx?: number; qrFy?: number; logo: string; logoUrl: string | null; bgFinish: string; bgImage: string | null; frame: string; accent: string; titleCase: string; titleWeight: string; titleColor: string; subColor: string; ctaColor: string; blockY: number; brand: string; subtitle: string; title: string; cta: string; eCorner: string; eAccent: string; eTypo: string; eAlign: "left" | "center" | "right"; eTitle: number; ePad: number; freeEls?: FreeEl[]; box?: number; onFocus?: (panel: string) => void }) {
  const { item, scene } = props
  const box = props.box ?? 520
  const hPx = scaleFor(item.hMm, box, SCENES[item.scene])
  const wPx = item.shape === "round" ? hPx : hPx * item.ratio
  const clampedW = Math.min(wPx, box - 40)
  const clampedH = item.shape === "round" ? clampedW : clampedW / item.ratio
  const support = (
    <SupportVisual {...props} physW={trimWidthMm(item)} w={clampedW} h={clampedH} />
  )
  return (
    <div style={{ position: "relative", width: "100%", aspectRatio: "1 / 1", maxWidth: box, margin: "0 auto", borderRadius: 20, overflow: "hidden", background: scene.background }}>
      {/* sol */}
      {scene.floorHeight > 0 && <div style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: `${scene.floorHeight * 100}%`, background: scene.floor }} />}
      {scene.floorHeight > 0 && <div style={{ position: "absolute", left: 0, right: 0, bottom: `${scene.floorHeight * 100}%`, height: 1, background: scene.horizon }} />}
      {/* scène 3D */}
      <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", perspective: scene.perspective, perspectiveOrigin: scene.perspectiveOrigin }}>
        <div style={{ transform: `${scene.transform} translateY(${scene.verticalOffset * 100}%)`, transformStyle: "preserve-3d", position: "relative" }}>
          {/* ombre portée */}
          <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,1)", opacity: scene.castShadow.opacity, filter: `blur(${scene.castShadow.blur}px)`, transform: `translate(${scene.castShadow.dx}px, ${scene.castShadow.dy}px) scaleX(${scene.castShadow.scaleX})`, borderRadius: item.shape === "round" ? "50%" : 10 }} />
          {support}
          {/* reflet */}
          {scene.mirror > 0 && <div style={{ position: "absolute", top: "100%", left: 0, right: 0, transform: "scaleY(-1)", opacity: scene.mirror, maskImage: "linear-gradient(to bottom, rgba(0,0,0,.5), transparent 60%)", WebkitMaskImage: "linear-gradient(to bottom, rgba(0,0,0,.5), transparent 60%)", pointerEvents: "none" }}>{support}</div>}
        </div>
      </div>
      {/* lumière + grain */}
      <div style={{ position: "absolute", inset: 0, background: scene.light, pointerEvents: "none" }} />
      {scene.grainOpacity > 0 && scene.grain !== "none" && <div style={{ position: "absolute", inset: 0, background: scene.grain, opacity: scene.grainOpacity, mixBlendMode: "overlay", pointerEvents: "none" }} />}
      {scene.streak && <div style={{ position: "absolute", top: "-20%", left: "-10%", width: "50%", height: "140%", background: "linear-gradient(105deg, transparent, rgba(255,255,255,.10), transparent)", transform: "rotate(8deg)", pointerEvents: "none" }} />}
    </div>
  )
}

/* Faux QR décoratif (100 % CSS, zéro moteur) — pour les vignettes : on ne veut PAS instancier
   16 moteurs qr-code-styling sur la grille (ça faisait ramer/planter mobile). Non scannable, assumé. */
function FauxQR({ size, fg, bg }: { size: number; fg: string; bg: string }) {
  const cell = Math.max(3, Math.round(size / 9))
  // Vrais « repères » de coin (carré plein → trou → point) pour que ça se lise comme un QR, pas un damier.
  const finder = (pos: React.CSSProperties) => (
    <span style={{ position: "absolute", width: cell * 2.6, height: cell * 2.6, background: fg, display: "flex", alignItems: "center", justifyContent: "center", ...pos }}>
      <span style={{ width: "56%", height: "56%", background: bg, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <span style={{ width: "50%", height: "50%", background: fg }} />
      </span>
    </span>
  )
  return (
    <div style={{ width: size, height: size, background: bg, position: "relative", overflow: "hidden", borderRadius: Math.max(2, size * 0.04), backgroundImage: `radial-gradient(${fg} 44%, transparent 47%)`, backgroundSize: `${cell}px ${cell}px`, backgroundPosition: `${cell / 2}px ${cell / 2}px` }}>
      {finder({ top: cell * 0.5, left: cell * 0.5 })}
      {finder({ top: cell * 0.5, right: cell * 0.5 })}
      {finder({ bottom: cell * 0.5, left: cell * 0.5 })}
    </div>
  )
}

/* QR VECTORIEL (SVG natif qr-code-styling) — utilisé sur le chemin d'impression pour un PDF prêt imprimeur. */
function QRVector({ value, size, fg, bg }: { value: string; size: number; fg: string; bg: string }) {
  const holder = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const qr = createQRSvg({ data: value || "https://qrowg.com", fg, bg, ecc: "M", style: {}, size })
    if (holder.current) { holder.current.innerHTML = ""; qr.append(holder.current) }
  }, [value, size, fg, bg])
  return <div ref={holder} style={{ width: size, height: size, lineHeight: 0 }} />
}

/* Mini-visuel pour la grille de bibliothèque : le VRAI support (mise en page + palette + QR),
   rendu grand puis mis à l'échelle et centré dans la vignette — lisible d'un coup d'œil. */
function MiniSupport({ item, style }: { item: Item; style: Style }) {
  const pal = paletteFromStyle(style)
  const layout = LAYOUT_BY_ID[resolveLayoutId(item.layout)] || LAYOUT_BY_ID.centre
  const BW = 152, BH = 120                          // zone d'aperçu de la vignette
  const baseW = item.shape === "round" ? 220 : (item.ratio >= 1 ? 220 : Math.round(220 * item.ratio))
  const baseH = item.shape === "round" ? 220 : Math.round(baseW / item.ratio)
  const scale = Math.min((BW - 22) / baseW, (BH - 20) / baseH)
  return (
    <div style={{ width: BW, height: BH, display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden" }}>
      <div style={{ width: baseW, height: baseH, transform: `scale(${scale})`, transformOrigin: "center", filter: "drop-shadow(0 10px 22px rgba(0,0,0,.55))" }}>
        <SupportVisual item={item} style={style} pal={pal} layout={layout} brand={BRANDNAMES[0]} subtitle="" title={MESSAGES[item.id]?.[0] || item.title} cta={item.cta} size={{ factor: 1 }} qrValue="https://qrowg.com" qrImg={null} qrBadge="carre" qrPos="centre" qrStatic physW={trimWidthMm(item)} qrDx={0} qrDy={0} logo="aucun" logoUrl={null} bgFinish="uni" bgImage={null} frame="aucun" accent="auto" titleCase="normal" titleWeight="normal" titleColor="" subColor="" ctaColor="" blockY={0} eCorner="adouci" eAccent="plein" eTypo="auto" eAlign="center" eTitle={1} ePad={1} w={baseW} h={baseH} />
      </div>
    </div>
  )
}
