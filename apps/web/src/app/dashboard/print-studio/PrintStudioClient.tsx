"use client"

// Print Studio — UI guidée « objets, pas outils » (Print Studio Mobile v3).
// Bibliothèque -> aperçu packshot + 3 volets bornés -> contrôle avant export -> export.
// Consomme les modules purs : catalog / mockup / states / tokens.

import { useEffect, useMemo, useRef, useState } from "react"
import Link from "next/link"
import { ArrowLeft, Lock, Check, X, Download, ShieldCheck, AlertTriangle, ChevronDown } from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import QRCanvas from "../qr-codes/QRCanvas"
import { getQRBlob, type QROptions } from "../qr-codes/qrRender"
import { normalizeUrl } from "../qr-link/qrLinkUtils"
import {
  METIERS, OBJECTIFS, BRANDNAMES, filterItems, ambiancesFor, ITEM_BY_ID, STYLE_BY_ID,
  LAYOUT_BY_ID, LAYOUTS, STYLES, TYPOS, SIZES, MESSAGES, OBJ, type Item, type Style,
} from "./catalog"
import { sceneLayers, paletteFromStyle, scaleFor, SCENES } from "./mockup"
import { evaluateControls, canExport } from "./states"
import { color as C, radius as R } from "./tokens"

// item.layout est parfois une clé de contenu ('stack'), parfois un id de layout ('orne').
// On résout toujours vers un id de LAYOUTS valide (pour le volet Mise en page).
function resolveLayoutId(itemLayout: string): string {
  if (LAYOUT_BY_ID[itemLayout]) return itemLayout
  const byContent = LAYOUTS.find(l => l.content === itemLayout)
  return byContent ? byContent.id : "centre"
}
const CORNER_MAP: Record<string, "square" | "rounded" | "circle"> = { vif: "square", adouci: "rounded", rond: "circle" }
const PAD_MM = [0.7, 1, 1.35]      // multiplicateur d'air autour (ePad 0..2)
const TITLE_MM = [0.82, 1, 1.2]    // multiplicateur de titre (eTitle 0..2)

export default function PrintStudioClient({ canAccess }: { canAccess: boolean }) {
  const [phase, setPhase] = useState<"library" | "studio">("library")
  const [metier, setMetier] = useState("Tout")
  const [objectif, setObjectif] = useState("Tout")
  const [itemId, setItemId] = useState<string | null>(null)

  // état studio
  const [styleId, setStyleId] = useState("premiumdark")
  const [layoutId, setLayoutId] = useState("centre")
  const [sizeId, setSizeId] = useState("moyen")
  const [brandIdx, setBrandIdx] = useState(0)
  const [message, setMessage] = useState("")
  const [destIdx, setDestIdx] = useState(0)
  const [logo, setLogo] = useState("aucun")
  const [eTitle, setETitle] = useState(1)
  const [ePad, setEPad] = useState(1)
  const [eCorner, setECorner] = useState("adouci")
  const [eAccent, setEAccent] = useState("plein")
  const [eTypo, setETypo] = useState("auto")
  const [eAlign, setEAlign] = useState<"left" | "center" | "right">("center")
  const [open, setOpen] = useState<string | null>(null)   // un seul volet ouvert
  const [showAllColors, setShowAllColors] = useState(false)
  const [control, setControl] = useState(false)           // écran « contrôle avant export »
  const [busy, setBusy] = useState(false)
  const [done, setDone] = useState(false)
  const [destUrl, setDestUrl] = useState("")   // lien réel encodé par le QR (sinon page QRowg)
  const [destMode, setDestMode] = useState<"page" | "url">("url")  // pointer vers une page QRowg publiée ou un lien externe
  const [myPages, setMyPages] = useState<{ slug: string; title: string }[]>([])
  const [logoUrl, setLogoUrl] = useState<string | null>(null)
  const logoInput = useRef<HTMLInputElement>(null)

  // Pages publiées de l'utilisateur (RLS = seulement les siennes / celles de son équipe) pour le sélecteur de destination.
  useEffect(() => {
    let alive = true
    createClient().from("pages").select("slug,title,status").eq("status", "published").order("created_at", { ascending: false }).limit(50)
      .then(({ data }) => { if (alive && data) setMyPages(data.filter(p => p.slug).map(p => ({ slug: p.slug as string, title: (p.title as string) || (p.slug as string) }))) })
    return () => { alive = false }
  }, [])

  const item = itemId ? ITEM_BY_ID[itemId] : null
  const style = STYLE_BY_ID[styleId] || STYLE_BY_ID.premiumdark
  const layout = LAYOUT_BY_ID[layoutId] || LAYOUT_BY_ID.centre
  const size = SIZES.find(s => s.id === sizeId) || SIZES[1]
  const messages = item ? (MESSAGES[item.id] || []) : []
  const dests = item ? (OBJ[item.id] || []) : []
  const brand = BRANDNAMES[brandIdx % BRANDNAMES.length]
  const dest = dests.length ? dests[destIdx % dests.length] : ""
  const title = message.trim() || (messages[0] ?? item?.title ?? "")
  const qrValue = destUrl.trim() ? normalizeUrl(destUrl) : "https://qrowg.com"
  const ambiances = useMemo(() => ambiancesFor(metier), [metier])
  const controls = useMemo(() => item ? evaluateControls(item, style, size) : [], [item, style, size])
  const ok = canExport(controls)

  function openItem(id: string) {
    const it = ITEM_BY_ID[id]; if (!it) return
    setItemId(id); setStyleId(it.pal); setLayoutId(resolveLayoutId(it.layout))
    setSizeId("moyen"); setBrandIdx(0); setMessage(""); setDestIdx(0); setLogo("aucun")
    setETitle(1); setEPad(1); setECorner("adouci"); setEAccent("plein"); setETypo("auto"); setEAlign("center")
    setDestUrl(""); setLogoUrl(null); setOpen(null); setShowAllColors(false); setControl(false); setPhase("studio")
  }

  async function exportQr(ext: "png" | "svg") {
    if (!item || !ok || busy) return
    setBusy(true)
    try {
      const withLogo = logo === "qr" && !!logoUrl
      const opts: QROptions = { data: qrValue, fg: style.qr, bg: style.qrBg, ecc: withLogo ? "H" : "M", style: { cornerStyle: CORNER_MAP[eCorner], ...(withLogo ? { logoUrl: logoUrl!, logoSize: 22, logoShape: "rounded" as const, logoBg: "white" as const, logoPadding: 5 } : {}) }, size: 1024 }
      const blob = await getQRBlob(opts, ext)
      if (blob) { const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = `qrowg-${item.support}.${ext}`.replace(/\s+/g, "-").toLowerCase(); a.click(); URL.revokeObjectURL(a.href); setDone(true); setTimeout(() => setDone(false), 1800) }
    } finally { setBusy(false) }
  }

  // ── Upsell (free) ──────────────────────────────────────────────────────────
  if (!canAccess) {
    return (
      <div style={{ minHeight: "100dvh", background: C.bg, color: C.fg, display: "flex", alignItems: "center", justifyContent: "center", padding: 24, fontFamily: "system-ui, sans-serif" }}>
        <div style={{ maxWidth: 400, textAlign: "center" }}>
          <div style={{ width: 54, height: 54, borderRadius: 16, background: C.goldSoft, border: `1px solid ${C.gold}55`, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px" }}><Lock size={22} color={C.gold} /></div>
          <h1 style={{ fontSize: 22, fontWeight: 700, margin: "0 0 8px" }}>Print Studio</h1>
          <p style={{ color: C.fgMuted, fontSize: 14.5, lineHeight: 1.6, margin: "0 0 20px" }}>Concevez des supports imprimables prêts à poser — stickers, chevalets, affiches, cartes — avec votre QR. Inclus dès le plan Starter.</p>
          <Link href="/upgrade" style={{ display: "inline-flex", alignItems: "center", gap: 8, background: C.gold, color: "#0A0A0A", fontWeight: 800, fontSize: 14, padding: "12px 24px", borderRadius: 12, textDecoration: "none" }}>Voir les plans →</Link>
        </div>
      </div>
    )
  }

  // ── Bibliothèque ─────────────────────────────────────────────────────────────
  if (phase === "library" || !item) {
    const items = filterItems(metier, objectif)
    const skel = [{ w: 92, h: 92, r: "50%" }, { w: 132, h: 92, r: 12 }, { w: 82, h: 116, r: 12 }]
    return (
      <div style={{ minHeight: "100dvh", background: C.bg, color: C.fg, fontFamily: "system-ui, sans-serif", padding: "0 16px 40px" }}>
        <header style={{ maxWidth: 1040, margin: "0 auto", padding: "18px 0 8px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <Link href="/dashboard/qr-codes" style={{ display: "inline-flex", alignItems: "center", gap: 6, color: C.fgMuted, textDecoration: "none", fontSize: 13 }}><ArrowLeft size={16} /> QR codes</Link>
          <span style={{ fontSize: 13, fontWeight: 700, color: C.gold, letterSpacing: 0.3 }}>Print Studio</span>
        </header>
        <div style={{ maxWidth: 1040, margin: "0 auto" }}>
          <h1 style={{ fontSize: "clamp(24px,4vw,34px)", fontWeight: 700, letterSpacing: "-0.02em", margin: "10px 0 6px" }}>Choisissez un support</h1>
          <p style={{ color: C.fgMuted, fontSize: 14, margin: "0 0 18px" }}>Un objet réel, déjà réussi. Trois suffisent : à table, en vitrine, dans la main.</p>

          {/* Filtres métier × objectif */}
          <Rail label="Métier" value={metier} options={METIERS} onPick={setMetier} />
          <Rail label="Objectif" value={objectif} options={OBJECTIFS} onPick={setObjectif} />

          {/* Grille d'objets */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(150px,1fr))", gap: 12, marginTop: 18 }}>
            {items.map(it => (
              <button key={it.id} onClick={() => openItem(it.id)} style={{ textAlign: "left", background: C.surface, border: `1px solid ${C.hairline}`, borderRadius: R.card, padding: 12, cursor: "pointer", color: C.fg, display: "flex", flexDirection: "column", gap: 10 }}>
                <div style={{ height: 92, borderRadius: 10, background: `radial-gradient(80% 70% at 50% 8%, #2a2e34, #16181c)`, display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden" }}>
                  <MiniSupport item={it} style={STYLE_BY_ID[it.pal]} />
                </div>
                <div>
                  <p style={{ margin: 0, fontSize: 13.5, fontWeight: 700 }}>{it.name}</p>
                  <p style={{ margin: "2px 0 0", fontSize: 11, color: C.fgFaint, fontFamily: "ui-monospace, monospace" }}>{it.support} · {it.size}</p>
                </div>
              </button>
            ))}
          </div>
          {items.length === 0 && <p style={{ color: C.fgMuted, fontSize: 13, marginTop: 20 }}>Aucun support pour ce filtre. <button onClick={() => { setMetier("Tout"); setObjectif("Tout") }} style={{ background: "none", border: "none", color: C.gold, cursor: "pointer", fontSize: 13 }}>Tout afficher</button></p>}

          {/* squelettes (état chargement, décoratif) */}
          <div aria-hidden style={{ display: "flex", gap: 10, marginTop: 24, opacity: 0.25 }}>
            {skel.map((s, i) => <div key={i} style={{ width: s.w, height: s.h, borderRadius: s.r as any, background: C.surfaceUp }} />)}
          </div>
        </div>
      </div>
    )
  }

  // ── Studio (aperçu + volets + action) ─────────────────────────────────────────
  const scene = sceneLayers(item.scene, metier === "Tout" ? null : metier)
  const pal = paletteFromStyle(style)
  return (
    <div style={{ minHeight: "100dvh", background: C.bg, color: C.fg, fontFamily: "system-ui, sans-serif" }}>
      <header style={{ maxWidth: 1180, margin: "0 auto", padding: "14px 16px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <button onClick={() => setPhase("library")} style={{ display: "inline-flex", alignItems: "center", gap: 6, background: "none", border: "none", color: C.fgMuted, cursor: "pointer", fontSize: 13 }}><ArrowLeft size={16} /> Bibliothèque</button>
        <span style={{ fontSize: 12.5, fontWeight: 700, color: C.fgMuted }}>{item.name} · <span style={{ fontFamily: "ui-monospace, monospace" }}>{item.size}</span></span>
      </header>

      <div className="ps-grid" style={{ maxWidth: 1180, margin: "0 auto", padding: "0 16px 120px", display: "grid", gap: 18, gridTemplateColumns: "1fr" }}>
        <style>{`@media(min-width:1025px){.ps-grid{grid-template-columns:1.2fr 1fr!important}.ps-aside{position:sticky;top:14px;align-self:start}}`}</style>

        {/* Aperçu packshot */}
        <div className="ps-aside">
          <Packshot item={item} scene={scene} pal={pal} style={style} layout={layout} size={size} qrValue={qrValue} logo={logo} logoUrl={logoUrl}
            brand={brand} title={title} cta={item.cta} eCorner={eCorner} eAccent={eAccent} eTypo={eTypo} eAlign={eAlign} eTitle={eTitle} ePad={ePad} />
          <p style={{ textAlign: "center", color: C.fgFaint, fontSize: 11.5, margin: "8px 0 0" }}>{scene.caption} · {destUrl.trim() ? "le QR pointe vers votre lien" : "définissez le lien du QR dans « Ce qui est écrit »"}</p>
        </div>

        {/* Volets + action */}
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {/* Volet TEXTE */}
          <Panel id="texte" title="Ce qui est écrit" resume={`${brand} · « ${title} »`} open={open} setOpen={setOpen}>
            <Field label="Nom affiché"><Cycle value={brand} onPrev={() => setBrandIdx(i => (i + BRANDNAMES.length - 1) % BRANDNAMES.length)} onNext={() => setBrandIdx(i => (i + 1) % BRANDNAMES.length)} /></Field>
            <Field label="Message">
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 8 }}>
                {messages.map(m => <Chip key={m} on={title === m} onClick={() => setMessage(m)}>{m}</Chip>)}
              </div>
              <input value={message} onChange={e => setMessage(e.target.value)} placeholder="Message libre…" style={inputStyle} />
            </Field>
            {dests.length > 0 && <Field label="Destination du scan"><Cycle value={dest} onPrev={() => setDestIdx(i => (i + dests.length - 1) % dests.length)} onNext={() => setDestIdx(i => (i + 1) % dests.length)} /></Field>}
            <Field label="Lien du QR">
              {myPages.length > 0 && <div style={{ marginBottom: 8 }}><Seg value={destMode} options={["page", "url"]} labels={["Ma page QRowg", "Lien externe"]} onPick={v => { setDestMode(v as "page" | "url"); if (v === "page") { const p = myPages[0]; setDestUrl(p ? `${window.location.origin}/${p.slug}` : "") } else setDestUrl("") }} /></div>}
              {destMode === "page" && myPages.length > 0 ? (
                <select value={destUrl} onChange={e => setDestUrl(e.target.value)} style={{ ...inputStyle, appearance: "none", cursor: "pointer" }}>
                  <option value="">— Choisir une page publiée —</option>
                  {myPages.map(p => <option key={p.slug} value={`${window.location.origin}/${p.slug}`}>{p.title} · /{p.slug}</option>)}
                </select>
              ) : (
                <input value={destUrl} onChange={e => setDestUrl(e.target.value)} inputMode="url" placeholder="ex : monsite.fr — sinon page QRowg par défaut" style={inputStyle} />
              )}
            </Field>
          </Panel>

          {/* Volet ALLURE */}
          <Panel id="allure" title="L'allure" resume={`${style.label} · ${layout.label} · QR ${size.label.toLowerCase()}`} open={open} setOpen={setOpen}>
            <Field label="Ambiance">
              <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 8 }}>
                {(showAllColors ? STYLES : ambiances.map(a => STYLE_BY_ID[a.rep])).map(s => (
                  <Swatch key={s.id} s={s} on={styleId === s.id} label={showAllColors ? s.label : undefined} onClick={() => setStyleId(s.id)} />
                ))}
              </div>
              <button onClick={() => setShowAllColors(v => !v)} style={{ background: "none", border: "none", color: C.gold, cursor: "pointer", fontSize: 12, marginTop: 8, padding: 0 }}>{showAllColors ? "Voir les ambiances" : `Voir les ${STYLES.length} coloris détaillés`}</button>
            </Field>
            <Field label="Mise en page"><RailInline value={layoutId} options={LAYOUTS.map(l => ({ id: l.id, label: l.label }))} onPick={setLayoutId} /></Field>
            <Field label="Taille du QR"><RailInline value={sizeId} options={SIZES.map(s => ({ id: s.id, label: s.label, note: s.note }))} onPick={setSizeId} /></Field>
          </Panel>

          {/* Volet DÉTAILS */}
          <Panel id="details" title="Les détails" resume="logo · six réglages sans risque" open={open} setOpen={setOpen}>
            <Field label="Logo">
              <Seg value={logo} options={["objet", "qr", "aucun"]} onPick={setLogo} />
              {logo !== "aucun" && (logoUrl
                ? <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 8 }}>
                    <div style={{ width: 40, height: 40, borderRadius: 8, background: "#fff", overflow: "hidden", flexShrink: 0, border: `1px solid ${C.hairline}` }}><img src={logoUrl} alt="" style={{ width: "100%", height: "100%", objectFit: "contain" }} /></div>
                    <span style={{ flex: 1, fontSize: 11.5, color: C.fgMuted, lineHeight: 1.4 }}>Logo ajouté{logo === "qr" ? " — correction d'erreur portée au max." : ""}</span>
                    <button onClick={() => setLogoUrl(null)} aria-label="Retirer le logo" style={{ background: "rgba(255,86,74,0.1)", border: "1px solid rgba(255,86,74,0.25)", borderRadius: 8, width: 34, height: 34, color: C.bad, cursor: "pointer", flexShrink: 0 }}><X size={15} /></button>
                  </div>
                : <button onClick={() => logoInput.current?.click()} style={{ marginTop: 8, width: "100%", minHeight: 42, borderRadius: 11, border: `1.5px dashed ${C.gold}55`, background: C.goldSoft, color: C.gold, fontSize: 13, fontWeight: 600, cursor: "pointer" }}>Ajouter un logo</button>
              )}
              <input ref={logoInput} type="file" accept="image/*" style={{ display: "none" }} onChange={e => { const f = e.target.files?.[0]; if (f) { const r = new FileReader(); r.onload = () => setLogoUrl(String(r.result)); r.readAsDataURL(f) } if (e.target) e.target.value = "" }} />
            </Field>
            <Field label="Titre"><Step value={eTitle} min={0} max={2} onChange={setETitle} labels={["plus petit", "normal", "plus grand"]} /></Field>
            <Field label="Air autour"><Step value={ePad} min={0} max={2} onChange={setEPad} labels={["serré", "normal", "large"]} /></Field>
            <Field label="Coins"><Seg value={eCorner} options={["vif", "adouci", "rond"]} onPick={setECorner} /></Field>
            <Field label="Accent"><Seg value={eAccent} options={["plein", "trait", "aucun"]} onPick={setEAccent} /></Field>
            <Field label="Typographie"><RailInline value={eTypo} options={TYPOS.map(t => ({ id: t.id, label: t.label }))} onPick={setETypo} /></Field>
            <Field label="Alignement"><Seg value={eAlign} options={["left", "center", "right"]} onPick={(v) => setEAlign(v as any)} labels={["Gauche", "Centre", "Droite"]} /></Field>
          </Panel>
        </div>
      </div>

      {/* Barre d'action ancrée */}
      <div style={{ position: "fixed", left: 0, right: 0, bottom: 0, background: `${C.surface}f2`, borderTop: `1px solid ${C.hairline}`, backdropFilter: "blur(8px)", padding: "12px 16px calc(12px + env(safe-area-inset-bottom))", zIndex: 30 }}>
        <div style={{ maxWidth: 1180, margin: "0 auto", display: "flex", gap: 10, alignItems: "center", justifyContent: "flex-end" }}>
          <span style={{ marginRight: "auto", fontSize: 12, color: ok ? C.ok : C.bad, display: "inline-flex", alignItems: "center", gap: 6 }}>{ok ? <><ShieldCheck size={14} /> Prêt à imprimer</> : <><AlertTriangle size={14} /> Un réglage à corriger</>}</span>
          <button onClick={() => setControl(true)} style={{ background: C.gold, color: "#0A0A0A", fontWeight: 800, fontSize: 14, padding: "12px 24px", borderRadius: 12, border: "none", cursor: "pointer" }}>Vérifier & exporter</button>
        </div>
      </div>

      {/* Écran CONTRÔLE avant export */}
      {control && (
        <div onClick={() => setControl(false)} style={{ position: "fixed", inset: 0, zIndex: 50, background: "rgba(0,0,0,0.55)", display: "flex", alignItems: "flex-end", justifyContent: "center", padding: 0 }}>
          <div onClick={e => e.stopPropagation()} style={{ width: "100%", maxWidth: 520, background: C.surface, borderRadius: "20px 20px 0 0", border: `1px solid ${C.hairline}`, padding: "18px 18px calc(18px + env(safe-area-inset-bottom))", maxHeight: "86vh", overflowY: "auto" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
              <p style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>Contrôle avant export</p>
              <button onClick={() => setControl(false)} style={{ background: "none", border: "none", color: C.fgMuted, cursor: "pointer" }}><X size={18} /></button>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {controls.map(c => (
                <div key={c.cle} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 12px", borderRadius: 11, background: C.surfaceUp, border: `1px solid ${c.ok ? "transparent" : (c.gravite === "bloquant" ? `${C.bad}55` : `${C.gold}55`)}` }}>
                  <span style={{ width: 20, height: 20, borderRadius: "50%", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", background: c.ok ? `${C.ok}22` : (c.gravite === "bloquant" ? `${C.bad}22` : `${C.gold}22`), color: c.ok ? C.ok : (c.gravite === "bloquant" ? C.bad : C.gold) }}>{c.ok ? <Check size={12} /> : <AlertTriangle size={12} />}</span>
                  <span style={{ flex: 1, fontSize: 13 }}>{c.libelle}{!c.ok && c.gravite === "avertissement" && <span style={{ color: C.gold, fontSize: 11 }}> · avertissement</span>}</span>
                  <span style={{ fontFamily: "ui-monospace, monospace", fontSize: 12, color: C.fgMuted }}>{c.valeur}</span>
                </div>
              ))}
            </div>
            <div style={{ display: "flex", gap: 10, marginTop: 14 }}>
              <button onClick={() => exportQr("png")} disabled={!ok || busy} style={{ flex: 1, minHeight: 50, borderRadius: 12, border: "none", cursor: ok ? "pointer" : "default", background: ok ? C.gold : "rgba(201,168,76,0.3)", color: "#0A0A0A", fontSize: 15, fontWeight: 800, display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
                {done ? <Check size={18} /> : <Download size={18} />} {busy ? "…" : done ? "Téléchargé" : ok ? "Exporter le QR (PNG)" : "Corrigez le réglage rouge"}
              </button>
              <button onClick={() => exportQr("svg")} disabled={!ok || busy} style={{ minHeight: 50, padding: "0 18px", borderRadius: 12, border: `1px solid ${C.hairline}`, background: C.surfaceUp, color: C.fg, fontSize: 14, fontWeight: 700, cursor: ok ? "pointer" : "default", opacity: ok ? 1 : 0.5 }}>SVG</button>
            </div>
            <button onClick={() => { setControl(false); setTimeout(() => window.print(), 180) }} disabled={!ok} style={{ width: "100%", marginTop: 10, minHeight: 46, borderRadius: 12, border: `1px solid ${C.gold}66`, background: "transparent", color: C.gold, fontSize: 14, fontWeight: 700, cursor: ok ? "pointer" : "default", opacity: ok ? 1 : 0.5 }}>Exporter la planche (PDF · taille réelle)</button>
            <p style={{ color: C.fgFaint, fontSize: 11, textAlign: "center", margin: "8px 0 0" }}>Ouvre l'impression du navigateur → « Enregistrer en PDF » : à la taille réelle ({pageDims(item).pageWmm} × {pageDims(item).pageHmm} mm, {item.shape === "round" ? "fond perdu inclus" : "fond perdu + traits de coupe inclus"}).</p>
          </div>
        </div>
      )}

      {/* Planche d'impression — window.print() -> PDF à taille réelle (mm), fidèle à l'aperçu. */}
      <div className="ps-print-root" aria-hidden>
        <style>{`@media screen{.ps-print-root{display:none!important}}@media print{body *{visibility:hidden!important}.ps-print-root,.ps-print-root *{visibility:visible!important}.ps-print-root{position:fixed!important;left:0;top:0;display:block!important}@page{size:${mediaDims(item).mediaWmm}mm ${mediaDims(item).mediaHmm}mm;margin:0}}`}</style>
        <PrintSheet item={item} style={style} pal={pal} layout={layout} brand={brand} title={title} cta={item.cta} size={size} qrValue={qrValue} logo={logo} logoUrl={logoUrl} eCorner={eCorner} eAccent={eAccent} eTypo={eTypo} eAlign={eAlign} eTitle={eTitle} ePad={ePad} />
      </div>
    </div>
  )
}

/* ─────────────────────────── sous-composants ─────────────────────────── */

const inputStyle: React.CSSProperties = { width: "100%", boxSizing: "border-box", height: 42, background: "#0A0B0D", border: `1px solid ${C.hairline}`, borderRadius: 11, color: C.fg, fontSize: 14, padding: "0 12px", outline: "none" }

function Rail({ label, value, options, onPick }: { label: string; value: string; options: string[]; onPick: (v: string) => void }) {
  return (
    <div style={{ marginTop: 12 }}>
      <p style={{ margin: "0 0 6px", fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1, color: C.fgFaint }}>{label}</p>
      <div style={{ display: "flex", gap: 7, overflowX: "auto", paddingBottom: 4 }}>
        {options.map(o => <button key={o} onClick={() => onPick(o)} style={chipStyle(value === o)}>{o}</button>)}
      </div>
    </div>
  )
}
function RailInline({ value, options, onPick }: { value: string; options: { id: string; label: string; note?: string }[]; onPick: (v: string) => void }) {
  return (
    <div style={{ display: "flex", gap: 7, overflowX: "auto", paddingBottom: 4 }}>
      {options.map(o => (
        <button key={o.id} onClick={() => onPick(o.id)} style={{ ...chipStyle(value === o.id), flexDirection: "column", alignItems: "flex-start", minWidth: o.note ? 108 : undefined }}>
          <span>{o.label}</span>{o.note && <span style={{ fontSize: 9.5, color: value === o.id ? "#0A0A0A" : C.fgFaint }}>{o.note}</span>}
        </button>
      ))}
    </div>
  )
}
function chipStyle(on: boolean): React.CSSProperties {
  return { flexShrink: 0, minHeight: 40, padding: "8px 14px", borderRadius: R.chip, cursor: "pointer", fontSize: 12.5, fontWeight: 700, whiteSpace: "nowrap", border: `1px solid ${on ? C.gold : C.hairline}`, background: on ? C.gold : C.surfaceUp, color: on ? "#0A0A0A" : C.fg, display: "inline-flex" }
}

function Panel({ id, title, resume, open, setOpen, children }: { id: string; title: string; resume: string; open: string | null; setOpen: (v: string | null) => void; children: React.ReactNode }) {
  const isOpen = open === id
  return (
    <div style={{ background: C.surface, border: `1px solid ${C.hairline}`, borderRadius: R.card, overflow: "hidden" }}>
      <button onClick={() => setOpen(isOpen ? null : id)} style={{ width: "100%", display: "flex", alignItems: "center", gap: 10, padding: "14px 16px", background: "none", border: "none", cursor: "pointer", color: C.fg, textAlign: "left" }}>
        <span style={{ flex: 1 }}>
          <span style={{ display: "block", fontSize: 14.5, fontWeight: 700 }}>{title}</span>
          {!isOpen && <span style={{ display: "block", fontSize: 11.5, color: C.fgMuted, marginTop: 2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{resume}</span>}
        </span>
        <ChevronDown size={18} color={C.fgMuted} style={{ transform: isOpen ? "rotate(180deg)" : "none", transition: "transform .15s" }} />
      </button>
      {isOpen && <div style={{ padding: "0 16px 16px", display: "flex", flexDirection: "column", gap: 14 }}>{children}</div>}
    </div>
  )
}
function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div><p style={{ margin: "0 0 7px", fontSize: 11.5, fontWeight: 600, color: C.fgMuted }}>{label}</p>{children}</div>
}
function Cycle({ value, onPrev, onNext }: { value: string; onPrev: () => void; onNext: () => void }) {
  const btn: React.CSSProperties = { width: 40, minHeight: 42, borderRadius: 10, border: `1px solid ${C.hairline}`, background: C.surfaceUp, color: C.fg, cursor: "pointer", fontSize: 16, flexShrink: 0 }
  return (
    <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
      <button onClick={onPrev} style={btn} aria-label="Précédent">‹</button>
      <span style={{ flex: 1, textAlign: "center", fontSize: 14, fontWeight: 600, padding: "0 8px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{value}</span>
      <button onClick={onNext} style={btn} aria-label="Suivant">›</button>
    </div>
  )
}
function Chip({ on, onClick, children }: { on: boolean; onClick: () => void; children: React.ReactNode }) {
  return <button onClick={onClick} style={{ minHeight: 36, padding: "6px 12px", borderRadius: R.chip, cursor: "pointer", fontSize: 12.5, fontWeight: 600, border: `1px solid ${on ? C.gold : C.hairline}`, background: on ? C.goldSoft : "transparent", color: on ? C.gold : C.fg }}>{children}</button>
}
function Seg({ value, options, onPick, labels }: { value: string; options: string[]; onPick: (v: string) => void; labels?: string[] }) {
  return (
    <div style={{ display: "flex", gap: 4, background: C.surfaceUp, borderRadius: 11, padding: 3 }}>
      {options.map((o, i) => <button key={o} onClick={() => onPick(o)} style={{ flex: 1, minHeight: 38, borderRadius: 8, border: "none", cursor: "pointer", background: value === o ? C.gold : "transparent", color: value === o ? "#0A0A0A" : C.fgMuted, fontSize: 12.5, fontWeight: value === o ? 800 : 600 }}>{labels ? labels[i] : o}</button>)}
    </div>
  )
}
function Step({ value, min, max, onChange, labels }: { value: number; min: number; max: number; onChange: (v: number) => void; labels: string[] }) {
  const opts = []; for (let i = min; i <= max; i++) opts.push(i)
  return (
    <div style={{ display: "flex", gap: 4, background: C.surfaceUp, borderRadius: 11, padding: 3 }}>
      {opts.map(i => <button key={i} onClick={() => onChange(i)} style={{ flex: 1, minHeight: 38, borderRadius: 8, border: "none", cursor: "pointer", background: value === i ? C.gold : "transparent", color: value === i ? "#0A0A0A" : C.fgMuted, fontSize: 12, fontWeight: value === i ? 800 : 600 }}>{labels[i - min]}</button>)}
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
function SupportVisual({ item, pal, layout, brand, title, cta, size, qrValue, logo, logoUrl, eCorner, eAccent, eTypo, eAlign, eTitle, ePad, w, h }:
  { item: Item; style: Style; pal: ReturnType<typeof paletteFromStyle>; layout: { content: string; deco: string | null }; brand: string; title: string; cta: string; size: { factor: number }; qrValue: string; logo: string; logoUrl: string | null; eCorner: string; eAccent: string; eTypo: string; eAlign: "left" | "center" | "right"; eTitle: number; ePad: number; w: number; h: number }) {
  const typo = TYPOS.find(t => t.id === eTypo)
  const titleFont = typo?.t ? `"${typo.t}",Georgia,serif` : pal.titleFont
  const bodyFont = typo?.b ? `"${typo.b}",Helvetica,Arial,sans-serif` : pal.bodyFont
  const unit = Math.min(w, h)
  const pad = unit * 0.09 * PAD_MM[ePad]
  const titleSize = unit * 0.11 * TITLE_MM[eTitle]
  const qrPx = Math.max(28, unit * 0.34 * (size.factor / 1))
  const radiusEl = eCorner === "vif" ? 0 : eCorner === "rond" ? 999 : 10
  const isRound = item.shape === "round"

  const kickerEl = <div style={{ fontFamily: bodyFont, fontSize: unit * 0.045, fontWeight: 700, letterSpacing: ".08em", textTransform: "uppercase", color: pal.band }}>{brand}</div>
  const titleEl = <div style={{ fontFamily: titleFont, fontSize: titleSize, fontWeight: pal.titleWeight as any, letterSpacing: pal.titleLs, lineHeight: 1.02, color: pal.fg }}>{title}</div>
  const qrLogo = logo === "qr" && !!logoUrl
  const qrEl = (
    <div style={{ background: pal.qrBg, padding: unit * 0.028, borderRadius: eCorner === "rond" ? 16 : 8, lineHeight: 0, position: "relative" }}>
      <QRCanvas value={qrValue} size={Math.round(qrPx)} fg={pal.ink} bg={pal.qrBg} style={{ cornerStyle: CORNER_MAP[eCorner] }} ecc={qrLogo ? "H" : "M"} />
      {qrLogo && <img src={logoUrl!} alt="" style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%,-50%)", width: qrPx * 0.26, height: qrPx * 0.26, objectFit: "contain", background: "#fff", borderRadius: 5, padding: qrPx * 0.02, boxSizing: "border-box" }} />}
    </div>
  )
  const ctaEl = eAccent === "aucun" ? null : (
    <div style={{ fontFamily: bodyFont, fontSize: unit * 0.05, fontWeight: 800, padding: `${unit * 0.035}px ${unit * 0.09}px`, borderRadius: radiusEl, whiteSpace: "nowrap",
      ...(eAccent === "trait" ? { border: `2px solid ${pal.band}`, color: pal.band } : { background: pal.ctaBg, color: pal.ctaFg }) }}>{cta}</div>
  )

  const alignItems = eAlign === "left" ? "flex-start" : eAlign === "right" ? "flex-end" : "center"
  const base: React.CSSProperties = { width: w, height: h, boxSizing: "border-box", background: pal.bg, color: pal.fg, borderRadius: isRound ? "50%" : (item.ratio >= 2 || item.ratio <= 0.5 ? 6 : 10), overflow: "hidden", position: "relative", display: "flex", padding: pad }

  let body: React.ReactNode
  if (layout.content === "band") {
    body = (
      <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column" }}>
        <div style={{ background: pal.band, color: pal.bandFg, padding: `${pad * 0.7}px ${pad}px`, fontFamily: titleFont, fontSize: titleSize * 0.86, fontWeight: pal.titleWeight as any }}>{title}</div>
        <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: unit * 0.05, padding: pad }}>{qrEl}{ctaEl}</div>
      </div>
    )
  } else if (layout.content === "qrbig") {
    body = <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: unit * 0.05 }}><div style={{ fontFamily: titleFont, fontSize: titleSize * 0.7, color: pal.fg }}>{title}</div><div style={{ transform: "scale(1.35)" }}>{qrEl}</div>{ctaEl}</div>
  } else if (layout.content === "split") {
    body = <div style={{ flex: 1, display: "flex", alignItems: "center", gap: pad }}><div style={{ flex: 1, display: "flex", flexDirection: "column", gap: unit * 0.04 }}>{kickerEl}{titleEl}{ctaEl}</div>{qrEl}</div>
  } else if (layout.content === "poster") {
    body = <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems, justifyContent: "space-between" }}><div style={{ display: "flex", flexDirection: "column", gap: unit * 0.03, alignItems }}>{kickerEl}<div style={{ fontFamily: titleFont, fontSize: titleSize * 1.5, fontWeight: pal.titleWeight as any, letterSpacing: pal.titleLs, lineHeight: 1, color: pal.fg }}>{title}</div></div><div style={{ display: "flex", alignItems: "center", gap: pad, alignSelf: eAlign === "right" ? "flex-end" : eAlign === "left" ? "flex-start" : "center" }}>{qrEl}{ctaEl}</div></div>
  } else { // stack / center
    body = <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems, justifyContent: "center", gap: unit * 0.05, textAlign: eAlign }}>{kickerEl}{titleEl}{qrEl}{ctaEl}</div>
  }

  return (
    <div style={base}>
      {body}
      {logo === "objet" && logoUrl && <img src={logoUrl} alt="" style={{ position: "absolute", top: pad, left: pad, width: unit * 0.14, height: unit * 0.14, objectFit: "contain", zIndex: 2 }} />}
      {/* décor optionnel */}
      {layout.deco === "frame" && <div style={{ position: "absolute", inset: pad * 0.5, border: `2px solid ${pal.rule}`, borderRadius: isRound ? "50%" : 6, pointerEvents: "none" }} />}
      {layout.deco === "footer" && <div style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: unit * 0.04, background: pal.band }} />}
      {layout.deco === "diagonal" && <div style={{ position: "absolute", top: -h * 0.3, right: -w * 0.2, width: w * 0.9, height: h * 0.5, background: pal.band, opacity: 0.16, transform: "rotate(-24deg)", pointerEvents: "none" }} />}
      {layout.deco === "ornate" && <><Corner p={pal.rule} pos={{ top: pad * 0.5, left: pad * 0.5 }} /><Corner p={pal.rule} pos={{ top: pad * 0.5, right: pad * 0.5 }} r /><Corner p={pal.rule} pos={{ bottom: pad * 0.5, left: pad * 0.5 }} b /><Corner p={pal.rule} pos={{ bottom: pad * 0.5, right: pad * 0.5 }} b r /></>}
    </div>
  )
}
function Corner({ p, pos, r, b }: { p: string; pos: React.CSSProperties; r?: boolean; b?: boolean }) {
  return <span style={{ position: "absolute", width: 14, height: 14, ...(pos), borderTop: b ? "none" : `2px solid ${p}`, borderBottom: b ? `2px solid ${p}` : "none", borderLeft: r ? "none" : `2px solid ${p}`, borderRight: r ? `2px solid ${p}` : "none", pointerEvents: "none" }} />
}

/* Dimensions physiques de la PLANCHE (trim + fond perdu), en mm. */
function pageDims(item: Item) {
  const trimW = item.shape === "round" ? item.hMm : item.hMm * item.ratio
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
function PrintSheet(props: Omit<React.ComponentProps<typeof SupportVisual>, "w" | "h">) {
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
          <SupportVisual {...props} w={bigW} h={bigH} />
        </div>
      </div>
      {marks.map((mk, i) => <div key={i} aria-hidden style={{ position: "absolute", background: "#000", left: `${mk.left}mm`, top: `${mk.top}mm`, width: `${mk.width}mm`, height: `${mk.height}mm` }} />)}
    </div>
  )
}

/* Aperçu packshot : le support posé dans sa scène (perspective + ombres + sol). */
function Packshot(props: { item: Item; scene: ReturnType<typeof sceneLayers>; pal: ReturnType<typeof paletteFromStyle>; style: Style; layout: { content: string; deco: string | null }; size: { factor: number }; qrValue: string; logo: string; logoUrl: string | null; brand: string; title: string; cta: string; eCorner: string; eAccent: string; eTypo: string; eAlign: "left" | "center" | "right"; eTitle: number; ePad: number }) {
  const { item, scene } = props
  const box = 380
  const hPx = scaleFor(item.hMm, box, SCENES[item.scene])
  const wPx = item.shape === "round" ? hPx : hPx * item.ratio
  const clampedW = Math.min(wPx, box - 40)
  const clampedH = item.shape === "round" ? clampedW : clampedW / item.ratio
  const support = (
    <SupportVisual {...props} w={clampedW} h={clampedH} />
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

/* Mini-visuel pour la grille de bibliothèque (support à plat, petit). */
function MiniSupport({ item, style }: { item: Item; style: Style }) {
  const pal = paletteFromStyle(style)
  const w = item.shape === "round" ? 72 : Math.min(120, 72 * item.ratio)
  return (
    <div style={{ width: w, height: item.shape === "round" ? 72 : Math.min(72, w / item.ratio), background: pal.bg, borderRadius: item.shape === "round" ? "50%" : 6, display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 6px 18px rgba(0,0,0,.4)" }}>
      <div style={{ width: "34%", aspectRatio: "1", background: pal.qrBg, borderRadius: 3, display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 1, padding: 2 }}>
        {Array.from({ length: 9 }).map((_, i) => <span key={i} style={{ background: i % 2 === 0 ? pal.ink : "transparent", borderRadius: 0.5 }} />)}
      </div>
    </div>
  )
}
