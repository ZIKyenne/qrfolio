"use client"

import { useState, useRef } from "react"
import { Check, ChevronDown, ChevronUp, Plus, Trash2, Copy, Sparkles, X } from "lucide-react"
import { BLOCK_DEFS, BLOCK_CATEGORIES, BLOCK_HINTS, PRESET_CATEGORIES, SOCIAL_NETWORKS, PRESET_THEMES, IDENTITY_PRESETS, ACTION_PRESETS, COMMERCE_PRESETS, MEDIA_PRESETS, SOCIAL_PRESETS, INFO_PRESETS, SOCIAL_URL_TEMPLATES, AVAILABILITY_STATUSES, availabilityStatus, profileBadgeStyle, productBadgeStyle, priceDiscount, countdownParts, stockStatus, paymentBrand, paymentLink, starRow, openStatus, DAY_KEYS, mapEmbedUrl, calendarLinks, spotifyEmbedUrl, youtubeId, docTypeMeta, docActionLabel, announcementMeta, optionLabel, blockDecoration, BLOCK_GRADIENTS, BLOCK_RADIUS_OPTIONS, BLOCK_SHADOW_OPTIONS, BLOCK_SPACE_OPTIONS, BLOCK_WIDTH_OPTIONS, BLOCK_ANIM_OPTIONS, BLOCK_ANIM_SPEED_OPTIONS, BLOCK_HOVER_OPTIONS, BLOCK_LOOP_OPTIONS, BLOCK_INTENSITY_OPTIONS, BLOCK_STYLE_PRESETS, ctaButtonStyle, CTA_ANIM_CSS, stickyActionHref, GOOGLE_FONTS, hexToRgb, rgbToHsl, contrastRatio, wcagLevel, avatarShapeStyle, avatarDecoStyle, avatarBgStyle, bannerBackgroundStyle, bannerHeight, bannerImageStyle, bannerTitleStyle, bannerOverlayLayers, bannerFrame, BANNER_ANIM_CSS, type Block, type BlockContent, type PageTheme } from "./types"
import { G, MUTED } from "./builderConstants"
import { useToast } from "@/components/Toast"
import { canPageIntro } from "@/lib/plans"
import PageIntro from "@/components/pageIntro/PageIntro"
import BannerStudio from "./BannerStudio"
import ImageUpload from "./ImageUpload"
import FileUpload from "./FileUpload"
import { parseMenuPaste } from "./menuImport"

  // Prompt « parfait » à donner à une IA (ChatGPT) : l'utilisateur colle ce prompt + une photo de sa
  // carte, l'IA renvoie des lignes que notre parseur importe directement. Format aligné sur menuImport.ts.
  const MENU_AI_PROMPT = `Tu es un assistant qui transcrit un menu à partir d'une photo.
Je vais t'envoyer une ou plusieurs photos de ma carte (restaurant, bar, café).

Transcris CHAQUE plat ou boisson en UNE ligne, avec 3 colonnes séparées par un point-virgule « ; » :
Nom;Prix;Description

Règles STRICTES :
- Une seule ligne par article, rien d'autre.
- N'invente RIEN : recopie fidèlement les noms, prix et descriptions visibles. Si une info manque, laisse la colonne vide mais garde les « ; ».
- Garde les prix tels quels (ex : 12€, 6,50€).
- Pas d'en-tête, pas de titres de catégories, pas de puces, pas de numéros, aucun texte avant ou après.
- Réponds UNIQUEMENT avec les lignes, dans un bloc de code.

Exemple de sortie attendue :
Margherita;11€;Tomate, mozzarella, basilic
Tiramisu;6,50€;Fait maison`

  // Bouton d'aide + pop-up « remplir le menu avec une photo (IA) ». Réutilisable (menu simple ET
  // grande carte à onglets) : l'utilisateur copie le prompt, l'envoie à ChatGPT avec une photo, puis
  // colle la réponse dans le champ d'import.
  function MenuAiHelp() {
    const [helpOpen, setHelpOpen] = useState(false)
    const [copied, setCopied] = useState(false)
    const copyPrompt = async () => { try { await navigator.clipboard.writeText(MENU_AI_PROMPT); setCopied(true); setTimeout(() => setCopied(false), 2000) } catch { /* noop */ } }
    return (
      <>
        <button type="button" onClick={() => setHelpOpen(true)}
          style={{ display: "inline-flex", alignItems: "center", gap: 6, alignSelf: "flex-start", padding: "6px 10px", borderRadius: 8, border: "1px solid rgba(201,168,76,0.3)", background: "rgba(201,168,76,0.08)", color: G, fontSize: 11.5, fontWeight: 700, cursor: "pointer" }}>
          <Sparkles size={13} /> Pas de tableur ? Photographiez votre carte (IA)
        </button>
        {helpOpen && (
          <div onClick={() => setHelpOpen(false)} style={{ position: "fixed", inset: 0, zIndex: 520, background: "rgba(0,0,0,0.72)", backdropFilter: "blur(5px)", display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
            <div onClick={e => e.stopPropagation()} style={{ width: "100%", maxWidth: 460, maxHeight: "88vh", overflowY: "auto", background: "#141210", border: "1px solid rgba(201,168,76,0.25)", borderRadius: 18, padding: 18, boxShadow: "0 20px 60px rgba(0,0,0,0.7)" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
                <span style={{ width: 30, height: 30, borderRadius: 9, background: "rgba(201,168,76,0.14)", border: "1px solid rgba(201,168,76,0.3)", display: "flex", alignItems: "center", justifyContent: "center", color: G }}><Sparkles size={16} /></span>
                <p style={{ flex: 1, color: "#F5F0E8", fontSize: 15, fontWeight: 700, margin: 0 }}>Remplir le menu avec une photo (IA)</p>
                <button onClick={() => setHelpOpen(false)} aria-label="Fermer" style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, color: MUTED, cursor: "pointer", width: 28, height: 28 }}><X size={14} /></button>
              </div>
              <ol style={{ color: "#F5F0E8", fontSize: 12.5, lineHeight: 1.6, margin: "0 0 12px", paddingLeft: 18, display: "flex", flexDirection: "column", gap: 4 }}>
                <li>Copiez le prompt ci-dessous.</li>
                <li>Ouvrez ChatGPT, collez le prompt et <b>ajoutez une photo</b> de votre carte.</li>
                <li>Copiez la réponse de ChatGPT.</li>
                <li>Collez-la dans le champ d'import de la section, puis validez.</li>
              </ol>
              <div style={{ position: "relative", background: "#0A0A0A", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 10, padding: "10px 12px", marginBottom: 10 }}>
                <pre style={{ color: "#D8D2C4", fontSize: 11, lineHeight: 1.5, margin: 0, whiteSpace: "pre-wrap", fontFamily: "monospace", maxHeight: 220, overflowY: "auto" }}>{MENU_AI_PROMPT}</pre>
              </div>
              <div style={{ display: "flex", gap: 9 }}>
                <button type="button" onClick={copyPrompt}
                  style={{ flex: 1, display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 6, padding: "11px", borderRadius: 10, border: "none", background: copied ? "rgba(57,255,143,0.15)" : "linear-gradient(90deg,var(--accent),color-mix(in srgb,var(--accent) 75%,#000))", color: copied ? "var(--success)" : "#080808", fontSize: 13, fontWeight: 700, cursor: "pointer" }}>
                  {copied ? <><Check size={15} /> Copié !</> : <><Copy size={15} /> Copier le prompt</>}
                </button>
                <a href="https://chatgpt.com" target="_blank" rel="noopener noreferrer"
                  style={{ flex: 1, display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 6, padding: "11px", borderRadius: 10, border: "1px solid rgba(255,255,255,0.12)", background: "rgba(255,255,255,0.04)", color: "#F5F0E8", fontSize: 13, fontWeight: 700, textDecoration: "none" }}>
                  Ouvrir ChatGPT ↗
                </a>
              </div>
              <p style={{ color: MUTED, fontSize: 10.5, margin: "11px 0 0", lineHeight: 1.5 }}>
                Astuce : pour un menu à plusieurs catégories, demandez une liste par catégorie et collez chacune dans sa section.
              </p>
            </div>
          </div>
        )}
      </>
    )
  }

  // Import d'un menu depuis un tableur (copier-coller). Écrit item{i}_name/price/desc et nettoie les
  // items au-delà. Rendu au-dessus du répéteur de plats. Le parseur est pur + testé (menuImport.ts).
  function MenuImport({ block, onChange }: { block: Block; onChange: (key: string, val: string) => void }) {
    const [open, setOpen] = useState(false)
    const [text, setText] = useState("")
    const [msg, setMsg] = useState("")
    const MAX = 50
    const doImport = () => {
      const items = parseMenuPaste(text, MAX)
      if (items.length === 0) { setMsg("Aucune ligne détectée. Collez un plat par ligne (Nom, Prix, Description).") ; return }
      items.forEach((it, k) => {
        const i = k + 1
        onChange(`item${i}_name`, it.name)
        onChange(`item${i}_price`, it.price)
        onChange(`item${i}_desc`, it.desc)
      })
      // Nettoie les plats existants au-delà de l'import (évite les résidus).
      for (let i = items.length + 1; i <= MAX; i++) {
        if (block.content[`item${i}_name`] || block.content[`item${i}_price`] || block.content[`item${i}_desc`]) {
          onChange(`item${i}_name`, ""); onChange(`item${i}_price`, ""); onChange(`item${i}_desc`, "")
        }
      }
      const cat = items.find(it => it.category)?.category
      if (cat && !block.content.category) onChange("category", cat)
      setMsg(`${items.length} plat${items.length > 1 ? "s" : ""} importé${items.length > 1 ? "s" : ""} ✓`)
      setText("")
    }
    const inputStyle: React.CSSProperties = { width: "100%", background: "#0A0A0A", border: "1px solid rgba(201,168,76,0.2)", borderRadius: 8, padding: "9px 11px", color: "#F5F0E8", fontSize: 12, outline: "none", boxSizing: "border-box", fontFamily: "DM Sans, sans-serif" }
    return (
      <div style={{ border: "1px solid rgba(201,168,76,0.25)", borderRadius: 12, background: "rgba(201,168,76,0.04)", overflow: "hidden" }}>
        <button type="button" onClick={() => setOpen(o => !o)} style={{ width: "100%", display: "flex", alignItems: "center", gap: 8, padding: "11px 12px", background: "transparent", border: "none", color: G, fontSize: 12.5, fontWeight: 700, cursor: "pointer", textAlign: "left" }}>
          <span style={{ fontSize: 15 }}>📋</span> Importer depuis un tableur
          <ChevronDown size={16} style={{ marginLeft: "auto", transform: open ? "rotate(180deg)" : "none", transition: "transform .2s" }} />
        </button>
        {open && (
          <div style={{ padding: "0 12px 12px", display: "flex", flexDirection: "column", gap: 8 }}>
            <p style={{ color: MUTED, fontSize: 11, margin: 0, lineHeight: 1.5 }}>
              Copiez vos plats depuis Excel, Google Sheets ou Numbers et collez-les ci-dessous. Une ligne
              par plat, colonnes dans l'ordre : <b>Nom</b>, <b>Prix</b>, <b>Description</b>. Idéal pour les gros menus.
            </p>
            <MenuAiHelp />
            <textarea value={text} onChange={e => { setText(e.target.value); setMsg("") }} rows={6}
              placeholder={"Margherita\t11€\tTomate, mozzarella\nRegina\t13€\tJambon, champignons"}
              style={{ ...inputStyle, fontFamily: "monospace", whiteSpace: "pre", resize: "vertical" }} />
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <button type="button" onClick={doImport} disabled={!text.trim()}
                style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "9px 16px", borderRadius: 9, border: "none", background: text.trim() ? "linear-gradient(90deg,var(--accent),color-mix(in srgb,var(--accent) 75%,#000))" : "rgba(201,168,76,0.2)", color: text.trim() ? "#080808" : MUTED, fontSize: 12.5, fontWeight: 700, cursor: text.trim() ? "pointer" : "not-allowed" }}>
                <Plus size={15} /> Importer les plats
              </button>
              {msg && <span style={{ color: msg.includes("✓") ? "var(--success)" : "var(--warning)", fontSize: 11.5, fontWeight: 600 }}>{msg}</span>}
            </div>
          </div>
        )}
      </div>
    )
  }

  function GalleryImagesEditor({ block, onChange }: { block: Block; onChange: (key: string, val: string) => void }) {
    const M = "#A8A190", TXT = "#F5F0E8", GG = "var(--accent, #C9A84C)"
    const isCarousel = block.type === "image_carousel"
    const KEYS = ["img1", "img2", "img3", "img4", "img5", "img6", "img7", "img8", "img9", "img10", "img11", "img12"]
    const MAX = KEYS.length
    const imgs: string[] = KEYS.map(k => block.content[k]).filter(Boolean) as string[]
    const write = (arr: string[]) => KEYS.forEach((k, i) => onChange(k, arr[i] || ""))
    const move = (i: number, d: number) => { const j = i + d; if (j < 0 || j >= imgs.length) return; const a = [...imgs];[a[i], a[j]] = [a[j], a[i]]; write(a) }
    const replaceAt = (i: number, url: string) => { if (!url) { write(imgs.filter((_, j) => j !== i)); return } const a = [...imgs]; a[i] = url; write(a) }
    const add = (url: string) => { if (url && imgs.length < MAX) write([...imgs, url]) }
    const inputStyle: React.CSSProperties = { width: "100%", background: "#0A0A0A", border: "1px solid rgba(201,168,76,0.2)", borderRadius: 8, padding: "9px 11px", color: TXT, fontSize: 12, outline: "none", boxSizing: "border-box" }
    const Seg = ({ opts, val, k }: { opts: { k: string; l: string }[]; val: string; k: string }) => (
      <div style={{ display: "flex", gap: 4, background: "rgba(255,255,255,0.04)", borderRadius: 9, padding: 3 }}>
        {opts.map(o => <button key={o.k} type="button" onClick={() => onChange(k, o.k)} style={{ flex: 1, padding: "7px 4px", borderRadius: 7, background: val === o.k ? GG : "transparent", border: "none", color: val === o.k ? "#080808" : M, fontSize: 11, fontWeight: val === o.k ? 700 : 500, cursor: "pointer" }}>{o.l}</button>)}
      </div>
    )
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 13 }}>
        <div>
          <label style={{ color: M, fontSize: 11, display: "block", marginBottom: 5, fontWeight: 500 }}>Titre (optionnel)</label>
          <input value={block.content.title || ""} placeholder={isCarousel ? "Mes photos" : "Ma galerie"} onChange={e => onChange("title", e.target.value)} style={inputStyle} />
        </div>
        {isCarousel ? (
          <div><label style={{ color: M, fontSize: 11, display: "block", marginBottom: 6, fontWeight: 500 }}>Défilement automatique</label><Seg k="auto_play" val={block.content.auto_play || "no"} opts={[{ k: "no", l: "Non" }, { k: "yes", l: "Oui" }]} /></div>
        ) : (<>
          <div><label style={{ color: M, fontSize: 11, display: "block", marginBottom: 6, fontWeight: 500 }}>Affichage</label><Seg k="layout" val={block.content.layout || "grid"} opts={[{ k: "grid", l: "Grille" }, { k: "masonry", l: "Mosaïque" }, { k: "compact", l: "Compact" }]} /></div>
          <div><label style={{ color: M, fontSize: 11, display: "block", marginBottom: 6, fontWeight: 500 }}>Colonnes (ordinateur)</label><Seg k="columns" val={block.content.columns || "3"} opts={[{ k: "2", l: "2" }, { k: "3", l: "3" }, { k: "4", l: "4" }]} /></div>
          <div><label style={{ color: M, fontSize: 11, display: "block", marginBottom: 6, fontWeight: 500 }}>Colonnes (mobile)</label><Seg k="columns_mobile" val={block.content.columns_mobile || "2"} opts={[{ k: "1", l: "1" }, { k: "2", l: "2" }, { k: "3", l: "3" }]} /></div>
        </>)}
        <div>
          <label style={{ color: M, fontSize: 11, display: "flex", justifyContent: "space-between", marginBottom: 6, fontWeight: 500 }}><span>Images</span><span>{imgs.length}/{MAX}</span></label>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {imgs.map((img, i) => (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                  <button type="button" onClick={() => move(i, -1)} disabled={i === 0} title="Monter" style={{ background: "none", border: "none", cursor: i === 0 ? "default" : "pointer", color: i === 0 ? "rgba(255,255,255,0.15)" : M, padding: 0, lineHeight: 0.7, fontSize: 11 }}>▲</button>
                  <button type="button" onClick={() => move(i, 1)} disabled={i === imgs.length - 1} title="Descendre" style={{ background: "none", border: "none", cursor: i === imgs.length - 1 ? "default" : "pointer", color: i === imgs.length - 1 ? "rgba(255,255,255,0.15)" : M, padding: 0, lineHeight: 0.7, fontSize: 11 }}>▼</button>
                </span>
                <img src={img} alt="" style={{ width: 44, height: 44, borderRadius: 8, objectFit: "cover", flexShrink: 0 }} />
                <span style={{ flex: 1, color: M, fontSize: 11 }}>Image {i + 1}</span>
                <button type="button" onClick={() => replaceAt(i, "")} title="Retirer" style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.2)", borderRadius: 6, width: 24, height: 24, cursor: "pointer", color: "#EF4444", flexShrink: 0 }}>×</button>
              </div>
            ))}
          </div>
          {imgs.length < MAX && <div style={{ marginTop: 8 }}><ImageUpload value="" onChange={add} hint="Ajouter une image" /></div>}
        </div>
      </div>
    )
  }

  function SkillsEditor({ content, onChange }: { content: BlockContent; onChange: (key: string, val: string) => void }) {
    const M = "#A8A190", TXT = "#F5F0E8", GG = "var(--accent, #C9A84C)"
    const tags: string[] = String(content.tags || "").split(",").map(t => t.trim()).filter(Boolean)
    const [input, setInput] = useState("")
    const commit = (arr: string[]) => onChange("tags", arr.join(", "))
    const add = (v: string) => { const t = v.trim(); if (!t) return; if (!tags.some(x => x.toLowerCase() === t.toLowerCase())) commit([...tags, t]); setInput("") }
    const remove = (i: number) => commit(tags.filter((_, j) => j !== i))
    const move = (i: number, d: number) => { const j = i + d; if (j < 0 || j >= tags.length) return; const a = [...tags];[a[i], a[j]] = [a[j], a[i]]; commit(a) }
    const PRESETS: { label: string; tags: string[] }[] = [
      { label: "Créatif", tags: ["Photographie", "Retouche", "Direction artistique"] },
      { label: "Dév / Tech", tags: ["React", "TypeScript", "UI/UX"] },
      { label: "Coach", tags: ["Coaching", "Nutrition", "Motivation"] },
      { label: "Marketing", tags: ["SEO", "Contenu", "Réseaux sociaux"] },
      { label: "Resto / Bar", tags: ["Cuisine", "Cocktails", "Fait maison"] },
      { label: "Business", tags: ["Conseil", "Stratégie", "Gestion"] },
    ]
    const inputStyle: React.CSSProperties = { width: "100%", background: "#0A0A0A", border: "1px solid rgba(201,168,76,0.2)", borderRadius: 8, padding: "9px 11px", color: TXT, fontSize: 12, outline: "none", boxSizing: "border-box" }
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 13 }}>
        <div>
          <label style={{ color: M, fontSize: 11, display: "block", marginBottom: 5, fontWeight: 500 }}>Titre (optionnel)</label>
          <input value={content.title || ""} placeholder="Mes compétences" onChange={e => onChange("title", e.target.value)} style={inputStyle} />
        </div>
        <div>
          <label style={{ color: M, fontSize: 11, display: "flex", justifyContent: "space-between", marginBottom: 6, fontWeight: 500 }}><span>Compétences</span><span style={{ color: M, fontSize: 10 }}>{tags.length}</span></label>
          {tags.length === 0 && <p style={{ color: M, fontSize: 11, margin: "0 0 8px", fontStyle: "italic" }}>Aucune compétence. Ajoutez-en ci-dessous ou via un modèle.</p>}
          <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
            {tags.map((t, i) => (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: 6, background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 8, padding: "6px 8px" }}>
                <span style={{ display: "flex", flexDirection: "column", gap: 1 }}>
                  <button type="button" onClick={() => move(i, -1)} disabled={i === 0} title="Monter" style={{ background: "none", border: "none", cursor: i === 0 ? "default" : "pointer", color: i === 0 ? "rgba(255,255,255,0.15)" : M, padding: 0, lineHeight: 0.7, fontSize: 10 }}>▲</button>
                  <button type="button" onClick={() => move(i, 1)} disabled={i === tags.length - 1} title="Descendre" style={{ background: "none", border: "none", cursor: i === tags.length - 1 ? "default" : "pointer", color: i === tags.length - 1 ? "rgba(255,255,255,0.15)" : M, padding: 0, lineHeight: 0.7, fontSize: 10 }}>▼</button>
                </span>
                <span style={{ flex: 1, color: TXT, fontSize: 12.5, fontWeight: 600 }}>{t}</span>
                <button type="button" onClick={() => remove(i)} title="Supprimer" style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.2)", borderRadius: 6, width: 22, height: 22, cursor: "pointer", color: "#EF4444", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>×</button>
              </div>
            ))}
          </div>
          <div style={{ display: "flex", gap: 6, marginTop: 8 }}>
            <input value={input} placeholder="Ajouter une compétence…" onChange={e => setInput(e.target.value)} onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); add(input) } }} style={inputStyle} />
            <button type="button" onClick={() => add(input)} disabled={!input.trim()} style={{ flexShrink: 0, background: GG, border: "none", borderRadius: 8, padding: "0 14px", color: "#080808", fontSize: 13, fontWeight: 700, cursor: input.trim() ? "pointer" : "not-allowed", opacity: input.trim() ? 1 : 0.5 }}>+</button>
          </div>
        </div>
        <div>
          <label style={{ color: M, fontSize: 11, display: "block", marginBottom: 6, fontWeight: 500 }}>Modèles rapides (ajoute les compétences)</label>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
            {PRESETS.map(p => (
              <button key={p.label} type="button" onClick={() => commit([...tags, ...p.tags.filter(t => !tags.some(x => x.toLowerCase() === t.toLowerCase()))])}
                style={{ background: "rgba(201,168,76,0.06)", border: "1px solid rgba(201,168,76,0.2)", borderRadius: 20, padding: "5px 11px", color: GG, fontSize: 11, fontWeight: 600, cursor: "pointer" }}>+ {p.label}</button>
            ))}
          </div>
        </div>
      </div>
    )
  }

  function AvailabilityEditor({ content, onChange }: { content: BlockContent; onChange: (key: string, val: string) => void }) {
    const M = "#A8A190", TXT = "#F5F0E8", GG = "var(--accent, #C9A84C)"
    const cur = content.status || "available"
    const sc = availabilityStatus(cur, content.dot_color)
    const inputStyle: React.CSSProperties = { width: "100%", background: "#0A0A0A", border: "1px solid rgba(201,168,76,0.2)", borderRadius: 8, padding: "9px 11px", color: TXT, fontSize: 12, outline: "none", boxSizing: "border-box" }
    const msgSuggestions = ["Ouvert aux nouvelles missions", "Disponible cette semaine", "Complet ce mois-ci", "Réponse en moins de 24h", "Sur réservation uniquement"]
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 13 }}>
        <div>
          <label style={{ color: M, fontSize: 11, display: "block", marginBottom: 7, fontWeight: 500 }}>Statut</label>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
            {AVAILABILITY_STATUSES.map(st => {
              const on = cur === st.key
              return (
                <button key={st.key} type="button" onClick={() => onChange("status", st.key)}
                  style={{ display: "flex", alignItems: "center", gap: 7, padding: "8px 10px", borderRadius: 8, cursor: "pointer", textAlign: "left" as const, background: on ? `${st.color}14` : "rgba(255,255,255,0.03)", border: `1px solid ${on ? `${st.color}66` : "rgba(255,255,255,0.08)"}`, color: on ? TXT : M, fontSize: 11, fontWeight: on ? 700 : 500 }}>
                  <span style={{ width: 8, height: 8, borderRadius: "50%", background: st.color, boxShadow: `0 0 6px ${st.color}80`, flexShrink: 0 }} />
                  <span style={{ lineHeight: 1.2 }}>{st.label}</span>
                </button>
              )
            })}
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
          <label style={{ color: M, fontSize: 11, fontWeight: 500 }}>Couleur de la pastille</label>
          <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
            {content.dot_color && <button type="button" onClick={() => onChange("dot_color", "")} title="Couleur auto" style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 6, padding: "4px 8px", color: M, fontSize: 10, cursor: "pointer" }}>Auto</button>}
            <label style={{ width: 26, height: 26, borderRadius: 7, border: "1px solid rgba(255,255,255,0.15)", background: sc.color, cursor: "pointer", position: "relative", overflow: "hidden", flexShrink: 0 }}>
              <input type="color" value={sc.color} onChange={e => onChange("dot_color", e.target.value)} style={{ position: "absolute", inset: -4, width: 40, height: 40, border: "none", padding: 0, cursor: "pointer", opacity: 0 }} />
            </label>
          </div>
        </div>
        <div>
          <label style={{ color: M, fontSize: 11, display: "block", marginBottom: 5, fontWeight: 500 }}>Message</label>
          <input value={content.message || ""} placeholder="Ouvert aux nouvelles missions" onChange={e => onChange("message", e.target.value)} style={inputStyle} />
          <div style={{ display: "flex", flexWrap: "wrap", gap: 5, marginTop: 6 }}>
            {msgSuggestions.map(m => <button key={m} type="button" onClick={() => onChange("message", m)} style={{ background: "rgba(201,168,76,0.06)", border: "1px solid rgba(201,168,76,0.18)", borderRadius: 20, padding: "4px 9px", color: GG, fontSize: 10, cursor: "pointer" }}>{m}</button>)}
          </div>
        </div>
        <div>
          <label style={{ color: M, fontSize: 11, display: "block", marginBottom: 5, fontWeight: 500 }}>Disponible à partir de (optionnel)</label>
          <input value={content.available_from || ""} placeholder="Janvier 2025" onChange={e => onChange("available_from", e.target.value)} style={inputStyle} />
        </div>
        <div>
          <label style={{ color: M, fontSize: 11, display: "block", marginBottom: 5, fontWeight: 500 }}>Bouton (optionnel)</label>
          <input value={content.cta_label || ""} placeholder="Prendre contact" onChange={e => onChange("cta_label", e.target.value)} style={{ ...inputStyle, marginBottom: 6 }} />
          <input value={content.cta_url || ""} placeholder="https://calendly.com/…" onChange={e => onChange("cta_url", e.target.value)} style={inputStyle} />
        </div>
      </div>
    )
  }

  // Clés de champs considérées comme « mise en page » (onglet dédié), le reste = « contenu ».
  const LAYOUT_FIELD_KEYS = new Set(["align", "layout", "width", "height", "columns", "cols", "disposition", "orientation", "size"])
  const isLayoutField = (key: string) => LAYOUT_FIELD_KEYS.has(key) || key.endsWith("_align")
  // Blocs à éditeur personnalisé : leur UI complète reste sous l'onglet Contenu.
  const CUSTOM_EDITOR_TYPES = new Set(["cover_banner", "skills", "gallery", "image_carousel", "availability", "social_links", "menu_section", "product_catalog", "services_list", "team", "google_reviews_block", "stats_block", "event_guests", "multi_contact", "business_certifications", "reassurance", "info_table", "concerts", "portfolio_work", "partners", "process_steps", "tabs_block", "accordion_block", "favorite_links", "video_testimonials", "event_program", "popular_products", "discography", "timeline", "documents", "packs", "brands", "services_pricing", "values", "certifications", "youtube_gallery", "languages", "expertise", "trust_badge", "on_site_services", "advantages", "logo_wall", "multi_cta", "business_stats"])
  // Clés d'apparence copiables d'un bloc à l'autre (hors __name interne).
  export const STYLE_COPY_KEYS = ["__grad", "__bg", "__intensity", "__border", "__radius", "__shadow", "__glow", "__glass", "__space", "__width", "__anim", "__anim_speed", "__hover", "__loop"]

  // Contrôle segmenté sombre (pastilles) — remplace les <select> natifs. `on` gère les valeurs
  // héritées via optionLabel (ex: "warning" -> pastille "Attention").
  export function Segmented({ value, options, onChange, active = "#C9A84C", muted = "#9A948A" }: { value: string; options: string[]; onChange: (v: string) => void; active?: string; muted?: string }) {
    return (
      <div style={{ display: "flex", flexWrap: "wrap", gap: 4, background: "rgba(255,255,255,0.04)", borderRadius: 9, padding: 3 }}>
        {options.map(o => {
          const on = value === o || optionLabel(value) === o
          return <button key={o} type="button" onClick={() => onChange(o)}
            style={{ flex: "1 1 auto", minWidth: 0, padding: "6px 9px", borderRadius: 7, border: "none", cursor: "pointer", background: on ? active : "transparent", color: on ? "#080808" : muted, fontSize: 11, fontWeight: on ? 700 : 500, whiteSpace: "nowrap", transition: "all .12s" }}>{optionLabel(o)}</button>
        })}
      </div>
    )
  }

  // Repeteur generique config-driven : liste dynamique d'items (ajouter/supprimer/reordonner) au-dela
  // des champs numerotes fixes. Conserve les cles plates <prefix><i>_<suffix> (aucune migration ; le
  // renderer public de chaque bloc doit lire <prefix>1..<prefix>N dynamiquement, cf Menu/Produits).
  function RepeaterEditor({ block, onChange, prefix, noun, fields, addLabel, topFields = [], bottomFields = [] }: {
    block: Block; onChange: (key: string, val: string) => void
    prefix: string; noun: string; addLabel: string
    fields: { suffix: string; kind?: "text" | "url" | "image" | "file" | "textarea"; placeholder?: string; options?: string[] }[]
    topFields?: { key: string; label: string; placeholder?: string; options?: string[] }[]
    bottomFields?: { key: string; label: string; placeholder?: string; options?: string[] }[]
  }) {
    const c = block.content
    const MAX = 50 // plafond aligne sur les renderers (Array.from({length:50})) -> aucun item cree mais non rendu
    // Cle plate : <prefix><i>_<suffix>, ou <prefix><i> si le suffixe est vide (ex : adv1, logo1).
    const key = (i: number, s: string) => s ? `${prefix}${i}_${s}` : `${prefix}${i}`
    const item = (i: number) => Object.fromEntries(fields.map(f => [f.suffix, c[key(i, f.suffix)] || ""])) as Record<string, string>
    const writeItem = (i: number, v: Record<string, string>) => fields.forEach(f => onChange(key(i, f.suffix), v[f.suffix] || ""))
    let derived = 0
    for (let i = 1; i <= MAX; i++) { if (fields.some(f => c[key(i, f.suffix)])) derived = i }
    const [rows, setRows] = useState(() => Math.max(1, derived))
    const count = Math.max(rows, derived)
    const inputStyle: React.CSSProperties = { width: "100%", background: "#0A0A0A", border: "1px solid rgba(201,168,76,0.2)", borderRadius: 8, padding: "9px 11px", color: "#F5F0E8", fontSize: 12, outline: "none", boxSizing: "border-box", fontFamily: "DM Sans, sans-serif" }
    const foc = (on: boolean) => (e: React.FocusEvent<HTMLInputElement>) => { e.target.style.borderColor = on ? "rgba(201,168,76,0.5)" : "rgba(201,168,76,0.2)" }
    const iconBtn = (disabled: boolean): React.CSSProperties => ({ width: 36, height: 36, display: "flex", alignItems: "center", justifyContent: "center", borderRadius: 8, border: "1px solid rgba(255,255,255,0.1)", background: "rgba(255,255,255,0.03)", color: disabled ? "rgba(255,255,255,0.2)" : "#F5F0E8", cursor: disabled ? "default" : "pointer", flexShrink: 0 })
    const lbl: React.CSSProperties = { color: MUTED, fontSize: 11, display: "block", marginBottom: 5, fontWeight: 500 }
    const deleteItem = (idx: number) => {
      for (let j = idx; j < count; j++) writeItem(j, item(j + 1))
      writeItem(count, {})
      setRows(Math.max(1, count - 1))
    }
    const moveItem = (idx: number, dir: -1 | 1) => { const a = item(idx), b = item(idx + dir); writeItem(idx, b); writeItem(idx + dir, a) }
    const renderLone = (t: { key: string; label: string; placeholder?: string; options?: string[] }) => (
      <div key={t.key}>
        <label style={lbl}>{t.label}</label>
        {t.options
          ? <Segmented value={c[t.key] || t.options[0]} options={t.options} onChange={v => onChange(t.key, v)} />
          : <input value={c[t.key] || ""} onChange={e => onChange(t.key, e.target.value)} placeholder={t.placeholder} style={inputStyle} onFocus={foc(true)} onBlur={foc(false)} />}
      </div>
    )
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {topFields.map(renderLone)}
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {Array.from({ length: count }, (_, k) => k + 1).map(i => {
            const it = item(i)
            return (
              <div key={i} style={{ border: "1px solid rgba(255,255,255,0.08)", borderRadius: 12, padding: 11, background: "rgba(255,255,255,0.02)", display: "flex", flexDirection: "column", gap: 8 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <span style={{ flex: 1, color: MUTED, fontSize: 10.5, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1 }}>{noun} {i}</span>
                  <button type="button" onClick={() => moveItem(i, -1)} disabled={i === 1} aria-label="Monter" style={iconBtn(i === 1)}><ChevronUp size={16} /></button>
                  <button type="button" onClick={() => moveItem(i, 1)} disabled={i === count} aria-label="Descendre" style={iconBtn(i === count)}><ChevronDown size={16} /></button>
                  <button type="button" onClick={() => deleteItem(i)} aria-label="Supprimer" style={{ ...iconBtn(false), color: "var(--danger)" }}><Trash2 size={15} /></button>
                </div>
                {fields.map(f => f.kind === "image"
                  ? <ImageUpload key={f.suffix} value={it[f.suffix]} onChange={url => onChange(key(i, f.suffix), url)} />
                  : f.kind === "file"
                  ? <FileUpload key={f.suffix} value={it[f.suffix]} onChange={url => onChange(key(i, f.suffix), url)} />
                  : f.kind === "textarea"
                  ? <textarea key={f.suffix} value={it[f.suffix]} onChange={e => onChange(key(i, f.suffix), e.target.value)} placeholder={f.placeholder} rows={5} style={{ ...inputStyle, fontFamily: "monospace", whiteSpace: "pre", resize: "vertical" }} />
                  : f.options
                  ? <div key={f.suffix}>{f.placeholder && <label style={{ color: MUTED, fontSize: 10, display: "block", marginBottom: 4, fontWeight: 500 }}>{f.placeholder}</label>}<Segmented value={it[f.suffix]} options={f.options} onChange={v => onChange(key(i, f.suffix), v)} /></div>
                  : <input key={f.suffix} type={f.kind === "url" ? "url" : "text"} value={it[f.suffix]} onChange={e => onChange(key(i, f.suffix), e.target.value)} placeholder={f.placeholder} style={inputStyle} onFocus={foc(true)} onBlur={foc(false)} />
                )}
              </div>
            )
          })}
        </div>
        {count < MAX
          ? <button type="button" onClick={() => setRows(Math.min(MAX, count + 1))}
              style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 7, minHeight: 46, border: "2px dashed rgba(201,168,76,0.3)", borderRadius: 11, background: "rgba(201,168,76,0.04)", color: G, fontSize: 13, fontWeight: 700, cursor: "pointer" }}>
              <Plus size={16} /> {addLabel}
            </button>
          : <p style={{ textAlign: "center", color: MUTED, fontSize: 11.5, margin: 0, padding: "11px", border: "1px dashed rgba(255,255,255,0.12)", borderRadius: 11 }}>Maximum de {MAX} éléments atteint.</p>}
        {bottomFields.map(renderLone)}
      </div>
    )
  }

  export function EditPanel({ block, onChange, only }: { block: Block; onChange: (key: string, val: string) => void; only?: "content" | "layout" }) {
    // Accordeon de l'editeur social_links : un groupe de reseaux ouvert a la fois (evite 78 champs empiles).
    const [openNetGroup, setOpenNetGroup] = useState<string | null>(null)
    // Cartes repliables pour les champs numerotes ("Plat 1 — Nom" -> carte "Plat 1"). Presentation seule.
    const [openCards, setOpenCards] = useState<Set<string>>(() => new Set())
    const def = BLOCK_DEFS[block.type]
    if (!def) return null
    // Les éditeurs personnalisés ne s'affichent que côté Contenu (leur mise en page passe par les réglages universels).
    if (only === "layout" && CUSTOM_EDITOR_TYPES.has(block.type)) return null
    const inputStyle: React.CSSProperties = { width: "100%", background: "#0A0A0A", border: "1px solid rgba(201,168,76,0.2)", borderRadius: 8, padding: "9px 11px", color: "#F5F0E8", fontSize: 12, outline: "none", boxSizing: "border-box", fontFamily: "DM Sans, sans-serif" }

    if (block.type === "cover_banner") {
      return <BannerStudio content={block.content} onChange={onChange} />
    }

    if (block.type === "skills") {
      return <SkillsEditor content={block.content} onChange={onChange} />
    }

    if (block.type === "gallery" || block.type === "image_carousel") {
      return <GalleryImagesEditor block={block} onChange={onChange} />
    }

    if (block.type === "availability") {
      return <AvailabilityEditor content={block.content} onChange={onChange} />
    }

    if (block.type === "menu_section") {
      return (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <MenuImport block={block} onChange={onChange} />
          <RepeaterEditor block={block} onChange={onChange} prefix="item" noun="Plat" addLabel="Ajouter un plat"
            topFields={[{ key: "category", label: "Nom de la section", placeholder: "Entrées, Plats, Desserts…" }, { key: "menu_display", label: "Affichage", options: ["Liste", "Grande carte dépliable"] }, { key: "item_columns", label: "Colonnes", options: ["1 colonne", "2 colonnes"] }]}
            fields={[{ suffix: "name", placeholder: "Nom du plat" }, { suffix: "price", placeholder: "12€" }, { suffix: "desc", placeholder: "Description (optionnel)" }]} />
        </div>
      )
    }

    if (block.type === "menu_tabs") {
      return (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <div style={{ border: "1px solid rgba(201,168,76,0.25)", borderRadius: 12, background: "rgba(201,168,76,0.04)", padding: 12, display: "flex", flexDirection: "column", gap: 8 }}>
            <p style={{ color: MUTED, fontSize: 11, margin: 0, lineHeight: 1.5 }}>
              Une <b>section = un onglet</b>. Collez les produits d'une section (depuis un tableur ou ChatGPT),
              un par ligne : <b>Nom;Prix;Description</b>. Idéal pour les gros menus (150+ produits).
            </p>
            <MenuAiHelp />
          </div>
          <RepeaterEditor block={block} onChange={onChange} prefix="sec" noun="Section" addLabel="Ajouter une section"
            topFields={[
              { key: "title", label: "Titre général (sert d'en-tête si repliable)", placeholder: "Boissons, Nourriture…" },
              { key: "menu_collapsible", label: "Repliable (fermé par défaut)", options: ["Non", "Oui"] },
              { key: "text_size", label: "Taille du texte", options: ["Compact", "Normal", "Grand"] },
              { key: "row_density", label: "Densité", options: ["Serré", "Normal", "Aéré"] },
              { key: "item_columns", label: "Colonnes", options: ["1 colonne", "2 colonnes"] },
            ]}
            fields={[
              { suffix: "title", placeholder: "Nom de la section (ex : Cocktails)" },
              { suffix: "items", kind: "textarea", placeholder: "Un produit par ligne :\nMojito;10€;Havana, menthe, citron\nPina Colada;10€;Ananas, coco" },
            ]} />
        </div>
      )
    }

    if (block.type === "product_catalog") {
      return <RepeaterEditor block={block} onChange={onChange} prefix="p" noun="Produit" addLabel="Ajouter un produit"
        topFields={[{ key: "title", label: "Titre de la section", placeholder: "Nos produits" }]}
        bottomFields={[{ key: "cta_label", label: "Texte du bouton", placeholder: "Acheter" }]}
        fields={[{ suffix: "img", kind: "image" }, { suffix: "name", placeholder: "Nom du produit" }, { suffix: "price", placeholder: "29€" }, { suffix: "desc", placeholder: "Description courte" }, { suffix: "url", kind: "url", placeholder: "https://… (lien d'achat)" }]} />
    }

    if (block.type === "services_list") {
      return <RepeaterEditor block={block} onChange={onChange} prefix="s" noun="Service" addLabel="Ajouter un service"
        topFields={[{ key: "title", label: "Titre de la section", placeholder: "Mes services" }]}
        fields={[{ suffix: "icon", placeholder: "Emoji (ex : 💻)" }, { suffix: "name", placeholder: "Nom du service" }, { suffix: "desc", placeholder: "Description courte" }]} />
    }

    if (block.type === "team") {
      return <RepeaterEditor block={block} onChange={onChange} prefix="m" noun="Membre" addLabel="Ajouter un membre"
        topFields={[{ key: "title", label: "Titre de la section", placeholder: "Notre équipe" }, { key: "layout", label: "Disposition", options: ["Liste", "Grille"] }]}
        fields={[{ suffix: "photo", kind: "image" }, { suffix: "name", placeholder: "Nom" }, { suffix: "role", placeholder: "Rôle / poste" }, { suffix: "bio", placeholder: "Bio courte" }, { suffix: "phone", placeholder: "Téléphone (optionnel)" }, { suffix: "email", placeholder: "Email (optionnel)" }, { suffix: "linkedin", placeholder: "LinkedIn URL (optionnel)" }]} />
    }

    if (block.type === "google_reviews_block") {
      return <RepeaterEditor block={block} onChange={onChange} prefix="r" noun="Avis" addLabel="Ajouter un avis"
        topFields={[{ key: "title", label: "Titre", placeholder: "Avis clients" }, { key: "avg_rating", label: "Note moyenne", placeholder: "4.8" }, { key: "total_reviews", label: "Nombre d'avis affiché", placeholder: "127" }]}
        bottomFields={[{ key: "google_url", label: "Lien « Voir sur Google »", placeholder: "https://…" }]}
        fields={[{ suffix: "name", placeholder: "Nom du client" }, { suffix: "text", placeholder: "Son avis" }, { suffix: "stars", placeholder: "Note sur 5 (ex : 5)" }]} />
    }

    if (block.type === "stats_block") {
      return <RepeaterEditor block={block} onChange={onChange} prefix="s" noun="Statistique" addLabel="Ajouter une statistique"
        fields={[{ suffix: "icon", placeholder: "Emoji (ex : 🚀)" }, { suffix: "value", placeholder: "Valeur (ex : 10k+)" }, { suffix: "label", placeholder: "Libellé (ex : clients)" }]} />
    }

    if (block.type === "event_guests") {
      return <RepeaterEditor block={block} onChange={onChange} prefix="g" noun="Invité" addLabel="Ajouter un invité"
        topFields={[{ key: "title", label: "Titre de la section", placeholder: "Nos invités" }]}
        fields={[{ suffix: "photo", kind: "image" }, { suffix: "name", placeholder: "Nom" }, { suffix: "role", placeholder: "Rôle / titre (optionnel)" }, { suffix: "desc", placeholder: "Description (optionnel)" }]} />
    }

    if (block.type === "multi_contact") {
      return <RepeaterEditor block={block} onChange={onChange} prefix="c" noun="Contact" addLabel="Ajouter un contact"
        topFields={[{ key: "title", label: "Titre de la section", placeholder: "Nous contacter" }]}
        fields={[{ suffix: "photo", kind: "image" }, { suffix: "name", placeholder: "Nom" }, { suffix: "role", placeholder: "Rôle / poste (optionnel)" }, { suffix: "phone", placeholder: "Téléphone (optionnel)" }, { suffix: "email", placeholder: "Email (optionnel)" }]} />
    }

    if (block.type === "business_certifications") {
      return <RepeaterEditor block={block} onChange={onChange} prefix="c" noun="Certification" addLabel="Ajouter une certification"
        topFields={[{ key: "title", label: "Titre de la section", placeholder: "Nos certifications" }]}
        fields={[{ suffix: "icon", placeholder: "Emoji (ex : 🏅)" }, { suffix: "name", placeholder: "Nom de la certification" }, { suffix: "org", placeholder: "Organisme (optionnel)" }, { suffix: "year", placeholder: "Année (optionnel)" }]} />
    }

    if (block.type === "reassurance") {
      return <RepeaterEditor block={block} onChange={onChange} prefix="g" noun="Garantie" addLabel="Ajouter une garantie"
        fields={[{ suffix: "icon", placeholder: "Emoji (ex : ✅)" }, { suffix: "label", placeholder: "Titre (ex : Livraison offerte)" }, { suffix: "desc", placeholder: "Détail (optionnel)" }]} />
    }

    if (block.type === "info_table") {
      return <RepeaterEditor block={block} onChange={onChange} prefix="r" noun="Ligne" addLabel="Ajouter une ligne"
        topFields={[{ key: "title", label: "Titre du tableau", placeholder: "Informations" }]}
        fields={[{ suffix: "label", placeholder: "Intitulé (ex : Horaires)" }, { suffix: "value", placeholder: "Valeur (ex : 9h – 18h)" }]} />
    }

    if (block.type === "concerts") {
      return <RepeaterEditor block={block} onChange={onChange} prefix="c" noun="Date" addLabel="Ajouter une date"
        topFields={[{ key: "title", label: "Titre de la section", placeholder: "Prochaines dates" }]}
        fields={[{ suffix: "date", placeholder: "Date (ex : 12 JUIN)" }, { suffix: "city", placeholder: "Ville" }, { suffix: "venue", placeholder: "Salle / lieu (optionnel)" }, { suffix: "url", kind: "url", placeholder: "Lien billetterie (optionnel)" }]} />
    }

    if (block.type === "portfolio_work") {
      return <RepeaterEditor block={block} onChange={onChange} prefix="work" noun="Réalisation" addLabel="Ajouter une réalisation"
        topFields={[{ key: "title", label: "Titre de la section", placeholder: "Mes réalisations" }]}
        bottomFields={[{ key: "cta_label", label: "Bouton (optionnel)", placeholder: "Voir plus" }, { key: "cta_url", label: "Lien du bouton", placeholder: "https://…" }]}
        fields={[{ suffix: "img", kind: "image" }, { suffix: "title", placeholder: "Titre" }, { suffix: "desc", placeholder: "Description (optionnel)" }]} />
    }

    if (block.type === "partners") {
      return <RepeaterEditor block={block} onChange={onChange} prefix="logo" noun="Partenaire" addLabel="Ajouter un partenaire"
        topFields={[{ key: "title", label: "Titre de la section", placeholder: "Ils nous font confiance" }]}
        fields={[{ suffix: "img", kind: "image" }, { suffix: "name", placeholder: "Nom (affiché si pas de logo)" }]} />
    }

    if (block.type === "process_steps") {
      return <RepeaterEditor block={block} onChange={onChange} prefix="s" noun="Étape" addLabel="Ajouter une étape"
        topFields={[{ key: "title", label: "Titre de la section", placeholder: "Comment ça marche" }]}
        fields={[{ suffix: "icon", placeholder: "Emoji (ex : 1️⃣)" }, { suffix: "title", placeholder: "Titre de l'étape" }, { suffix: "desc", placeholder: "Description" }]} />
    }

    if (block.type === "tabs_block") {
      return <RepeaterEditor block={block} onChange={onChange} prefix="tab" noun="Onglet" addLabel="Ajouter un onglet"
        fields={[{ suffix: "label", placeholder: "Titre de l'onglet" }, { suffix: "content", placeholder: "Contenu" }]} />
    }

    if (block.type === "accordion_block") {
      return <RepeaterEditor block={block} onChange={onChange} prefix="a" noun="Question" addLabel="Ajouter une question"
        topFields={[{ key: "title", label: "Titre de la section", placeholder: "Questions fréquentes" }]}
        fields={[{ suffix: "title", placeholder: "Question" }, { suffix: "content", placeholder: "Réponse" }]} />
    }

    if (block.type === "favorite_links") {
      return <RepeaterEditor block={block} onChange={onChange} prefix="link_" noun="Lien" addLabel="Ajouter un lien"
        topFields={[{ key: "title", label: "Titre de la section", placeholder: "Mes liens favoris" }]}
        fields={[{ suffix: "icon", placeholder: "Emoji (ex : 🔗)" }, { suffix: "label", placeholder: "Libellé" }, { suffix: "url", kind: "url", placeholder: "https://…" }]} />
    }

    if (block.type === "video_testimonials") {
      return <RepeaterEditor block={block} onChange={onChange} prefix="t" noun="Témoignage" addLabel="Ajouter un témoignage"
        topFields={[{ key: "title", label: "Titre de la section", placeholder: "Ils témoignent" }]}
        fields={[{ suffix: "video_url", kind: "url", placeholder: "Lien vidéo YouTube" }, { suffix: "name", placeholder: "Nom" }, { suffix: "company", placeholder: "Entreprise (optionnel)" }, { suffix: "quote", placeholder: "Citation (optionnel)" }]} />
    }

    if (block.type === "event_program") {
      return <RepeaterEditor block={block} onChange={onChange} prefix="s" noun="Créneau" addLabel="Ajouter un créneau"
        topFields={[{ key: "title", label: "Titre de la section", placeholder: "Programme" }]}
        fields={[{ suffix: "time", placeholder: "Heure (ex : 14h)" }, { suffix: "title", placeholder: "Titre" }, { suffix: "desc", placeholder: "Description (optionnel)" }]} />
    }

    if (block.type === "popular_products") {
      return <RepeaterEditor block={block} onChange={onChange} prefix="p" noun="Produit" addLabel="Ajouter un produit"
        topFields={[{ key: "title", label: "Titre de la section", placeholder: "Nos best-sellers" }]}
        fields={[{ suffix: "rank", placeholder: "Badge (ex : 🥇 Best-seller)" }, { suffix: "img", kind: "image" }, { suffix: "name", placeholder: "Nom du produit" }, { suffix: "price", placeholder: "Prix" }, { suffix: "sales", placeholder: "Ventes (ex : 1200 vendus)" }, { suffix: "url", kind: "url", placeholder: "Lien (optionnel)" }]} />
    }

    if (block.type === "discography") {
      return <RepeaterEditor block={block} onChange={onChange} prefix="a" noun="Sortie" addLabel="Ajouter une sortie"
        topFields={[{ key: "title", label: "Titre de la section", placeholder: "Discographie" }]}
        fields={[{ suffix: "cover", kind: "image" }, { suffix: "title", placeholder: "Titre de l'album" }, { suffix: "year", placeholder: "Année" }, { suffix: "type", placeholder: "Type (Album, EP, Single)" }, { suffix: "url", kind: "url", placeholder: "Lien d'écoute" }]} />
    }

    if (block.type === "timeline") {
      return <RepeaterEditor block={block} onChange={onChange} prefix="e" noun="Événement" addLabel="Ajouter un événement"
        topFields={[{ key: "title", label: "Titre de la section", placeholder: "Mon parcours" }, { key: "layout", label: "Disposition", options: ["Verticale", "Horizontale"] }]}
        fields={[{ suffix: "icon", placeholder: "Emoji (optionnel)" }, { suffix: "date", placeholder: "Date (ex : 2024)" }, { suffix: "title", placeholder: "Titre" }, { suffix: "desc", placeholder: "Description (optionnel)" }, { suffix: "link_url", placeholder: "Lien externe (optionnel, https://…)" }, { suffix: "link_label", placeholder: "Texte du lien (ex : Voir l'événement)" }]} />
    }

    if (block.type === "documents") {
      return <RepeaterEditor block={block} onChange={onChange} prefix="d" noun="Document" addLabel="Ajouter un document"
        topFields={[{ key: "title", label: "Titre de la section", placeholder: "Mes documents" }]}
        fields={[{ suffix: "title", placeholder: "Nom du document" }, { suffix: "desc", placeholder: "Description (optionnel)" }, { suffix: "url", kind: "file" }, { suffix: "type", placeholder: "Type (PDF, Contrat…)" }, { suffix: "meta", placeholder: "Info (ex : 2 Mo)" }]} />
    }

    if (block.type === "packs") {
      return <RepeaterEditor block={block} onChange={onChange} prefix="pack" noun="Formule" addLabel="Ajouter une formule"
        topFields={[{ key: "title", label: "Titre de la section", placeholder: "Nos formules" }]}
        fields={[{ suffix: "icon", placeholder: "Emoji (ex : 📦)" }, { suffix: "name", placeholder: "Nom de la formule" }, { suffix: "price", placeholder: "Prix" }, { suffix: "content", placeholder: "Ce qui est inclus" }, { suffix: "url", kind: "url", placeholder: "Lien (optionnel)" }]} />
    }

    if (block.type === "brands") {
      return <RepeaterEditor block={block} onChange={onChange} prefix="brand" noun="Marque" addLabel="Ajouter une marque"
        topFields={[{ key: "title", label: "Titre de la section", placeholder: "Nos marques" }]}
        fields={[{ suffix: "icon", placeholder: "Emoji / initiale (si pas de logo)" }, { suffix: "name", placeholder: "Nom de la marque" }]} />
    }

    if (block.type === "services_pricing") {
      return <RepeaterEditor block={block} onChange={onChange} prefix="s" noun="Tarif" addLabel="Ajouter un tarif"
        topFields={[{ key: "title", label: "Titre de la section", placeholder: "Nos tarifs" }]}
        fields={[{ suffix: "name", placeholder: "Prestation" }, { suffix: "price", placeholder: "Prix" }, { suffix: "duration", placeholder: "Durée (optionnel)" }, { suffix: "desc", placeholder: "Description (optionnel)" }]} />
    }

    if (block.type === "values") {
      return <RepeaterEditor block={block} onChange={onChange} prefix="v" noun="Valeur" addLabel="Ajouter une valeur"
        topFields={[{ key: "title", label: "Titre de la section", placeholder: "Nos valeurs" }]}
        fields={[{ suffix: "icon", placeholder: "Emoji (ex : ⭐)" }, { suffix: "label", placeholder: "Titre" }, { suffix: "desc", placeholder: "Description (optionnel)" }]} />
    }

    if (block.type === "certifications") {
      return <RepeaterEditor block={block} onChange={onChange} prefix="cert_" noun="Certification" addLabel="Ajouter une certification"
        topFields={[{ key: "title", label: "Titre de la section", placeholder: "Mes certifications" }]}
        fields={[{ suffix: "icon", placeholder: "Emoji (ex : 🏆)" }, { suffix: "name", placeholder: "Nom de la certification" }, { suffix: "org", placeholder: "Organisme (optionnel)" }, { suffix: "year", placeholder: "Année (optionnel)" }]} />
    }

    if (block.type === "youtube_gallery") {
      return <RepeaterEditor block={block} onChange={onChange} prefix="video" noun="Vidéo" addLabel="Ajouter une vidéo"
        topFields={[{ key: "title", label: "Titre de la section", placeholder: "Mes vidéos" }]}
        fields={[{ suffix: "url", kind: "url", placeholder: "Lien YouTube" }, { suffix: "title", placeholder: "Titre de la vidéo (optionnel)" }]} />
    }

    if (block.type === "languages") {
      return <RepeaterEditor block={block} onChange={onChange} prefix="lang_" noun="Langue" addLabel="Ajouter une langue"
        topFields={[{ key: "title", label: "Titre de la section", placeholder: "Langues" }]}
        fields={[{ suffix: "flag", placeholder: "Drapeau emoji (ex : 🇫🇷)" }, { suffix: "name", placeholder: "Langue" }, { suffix: "level", placeholder: "Niveau", options: ["Natif", "Courant", "Avance", "Intermediaire", "Debutant"] }]} />
    }

    if (block.type === "expertise") {
      return <RepeaterEditor block={block} onChange={onChange} prefix="s" noun="Expertise" addLabel="Ajouter une expertise"
        topFields={[{ key: "title", label: "Titre de la section", placeholder: "Mes expertises" }]}
        fields={[{ suffix: "icon", placeholder: "Emoji (ex : 💻)" }, { suffix: "name", placeholder: "Compétence" }, { suffix: "level", placeholder: "Niveau (1 à 5)", options: ["1", "2", "3", "4", "5"] }]} />
    }

    if (block.type === "trust_badge") {
      return <RepeaterEditor block={block} onChange={onChange} prefix="b" noun="Badge" addLabel="Ajouter un badge"
        topFields={[{ key: "title", label: "Titre de la section", placeholder: "Garanties" }]}
        fields={[{ suffix: "icon", placeholder: "Emoji (ex : ✔)" }, { suffix: "label", placeholder: "Libellé" }]} />
    }

    if (block.type === "on_site_services") {
      return <RepeaterEditor block={block} onChange={onChange} prefix="s" noun="Service" addLabel="Ajouter un service"
        topFields={[{ key: "title", label: "Titre de la section", placeholder: "Sur place" }]}
        fields={[{ suffix: "icon", placeholder: "Emoji (ex : 📶)" }, { suffix: "label", placeholder: "Service (ex : Wi-Fi gratuit)" }]} />
    }

    if (block.type === "advantages") {
      return <RepeaterEditor block={block} onChange={onChange} prefix="adv" noun="Avantage" addLabel="Ajouter un avantage"
        topFields={[{ key: "title", label: "Titre de la section", placeholder: "Nos avantages" }]}
        fields={[{ suffix: "", placeholder: "Avantage (ex : Livraison en 24h)" }]} />
    }

    if (block.type === "logo_wall") {
      return <RepeaterEditor block={block} onChange={onChange} prefix="logo" noun="Logo" addLabel="Ajouter un logo"
        topFields={[{ key: "title", label: "Titre de la section", placeholder: "Ils nous font confiance" }]}
        fields={[{ suffix: "", kind: "image" }, { suffix: "name", placeholder: "Nom (affiché si pas de logo)" }]} />
    }

    if (block.type === "multi_cta") {
      return <RepeaterEditor block={block} onChange={onChange} prefix="btn" noun="Bouton" addLabel="Ajouter un bouton"
        fields={[{ suffix: "icon", placeholder: "Emoji (ex : 📞)" }, { suffix: "label", placeholder: "Texte du bouton" }, { suffix: "url", kind: "url", placeholder: "Lien (https://, tel:, mailto:)" }]} />
    }

    if (block.type === "business_stats") {
      return <RepeaterEditor block={block} onChange={onChange} prefix="stat" noun="Chiffre clé" addLabel="Ajouter un chiffre"
        fields={[{ suffix: "icon", placeholder: "Emoji (ex : 📈)" }, { suffix: "value", placeholder: "Valeur (ex : 500+)" }, { suffix: "label", placeholder: "Libellé (ex : clients)" }]} />
    }

    if (block.type === "social_links") {
      const disp = block.content.display || "list"
      return (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <div>
            <label style={{ color: MUTED, fontSize: 11, display: "block", marginBottom: 6, fontWeight: 500 }}>Affichage</label>
            <div style={{ display: "flex", gap: 4, background: "rgba(255,255,255,0.04)", borderRadius: 9, padding: 3 }}>
              {[{ k: "list", l: "Liste" }, { k: "grid", l: "Grille" }, { k: "icons", l: "Icônes" }].map(o => {
                const on = disp === o.k
                return <button key={o.k} type="button" onClick={() => onChange("display", o.k)} style={{ flex: 1, padding: "7px 4px", borderRadius: 7, background: on ? G : "transparent", border: "none", color: on ? "#080808" : MUTED, fontSize: 11, fontWeight: on ? 700 : 500, cursor: "pointer" }}>{o.l}</button>
              })}
            </div>
          </div>
          {(() => {
            const GROUP_LABELS: Record<string, string> = { social: "Réseaux sociaux", messaging: "Messagerie", video: "Vidéo", music: "Musique", podcast: "Podcast", creative: "Créatif & portfolio", ecommerce: "Boutique", freelance: "Freelance & pro", payment: "Paiement & pourboire", local: "Local & avis", dev: "Développeur", generic: "Autres liens" }
            const GROUP_ORDER = ["social", "messaging", "video", "music", "podcast", "creative", "ecommerce", "freelance", "payment", "local", "dev", "generic"]
            const filled = SOCIAL_NETWORKS.filter(n => block.content[n.key])
            const renderNet = (n: typeof SOCIAL_NETWORKS[number]) => (
              <div key={n.key}>
                <label style={{ color: MUTED, fontSize: 11, display: "flex", alignItems: "center", gap: 5, marginBottom: 4 }}>
                  <span style={{ fontSize: 14 }}>{n.icon}</span>
                  <span style={{ color: n.color, fontWeight: 600 }}>{n.label}</span>
                </label>
                <input type="url" value={block.content[n.key]||""} onChange={e => onChange(n.key, e.target.value)}
                  placeholder={`https://${n.key}.com/...`}
                  style={{ ...inputStyle, borderColor: block.content[n.key] ? n.color+"50" : "rgba(201,168,76,0.2)" }}
                  onFocus={e => e.target.style.borderColor = n.color+"80"}
                  onBlur={e => e.target.style.borderColor = block.content[n.key] ? n.color+"50" : "rgba(201,168,76,0.2)"} />
                {block.content[n.key] && (
                  <div style={{ display: "flex", gap: 6, marginTop: 5 }}>
                    <input value={block.content[n.key+"__label"]||""} onChange={e => onChange(n.key+"__label", e.target.value)} placeholder={`Libellé (${n.label})`} style={{ ...inputStyle, flex: 1, fontSize: 11, padding: "7px 9px" }} />
                    <input value={block.content[n.key+"__count"]||""} onChange={e => onChange(n.key+"__count", e.target.value)} placeholder="Abonnés (ex : 12,5k)" style={{ ...inputStyle, width: 130, fontSize: 11, padding: "7px 9px" }} />
                  </div>
                )}
              </div>
            )
            const grpHeader: React.CSSProperties = { color: MUTED, fontSize: 8.5, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1.2, margin: "2px 2px 6px" }
            return (
              <>
                {filled.length > 0 && (
                  <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                    <p style={grpHeader}>Réseaux ajoutés · {filled.length}</p>
                    {filled.map(renderNet)}
                  </div>
                )}
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  <p style={grpHeader}>{filled.length ? "Ajouter un autre réseau" : "Choisir un réseau"}</p>
                  {GROUP_ORDER.map(g => {
                    const nets = SOCIAL_NETWORKS.filter(n => (n as any).group === g && !block.content[n.key])
                    if (!nets.length) return null
                    const open = openNetGroup === g
                    return (
                      <div key={g}>
                        <button type="button" onClick={() => setOpenNetGroup(open ? null : g)}
                          style={{ width: "100%", display: "flex", alignItems: "center", gap: 8, minHeight: 46, padding: "10px 12px", borderRadius: 10, border: `1px solid ${open ? "rgba(201,168,76,0.4)" : "rgba(255,255,255,0.08)"}`, background: open ? "rgba(201,168,76,0.06)" : "rgba(255,255,255,0.02)", color: "#F5F0E8", cursor: "pointer", textAlign: "left" }}>
                          <span style={{ flex: 1, fontSize: 13, fontWeight: 600 }}>{GROUP_LABELS[g] || g}</span>
                          <span style={{ fontSize: 11, color: MUTED }}>{nets.length}</span>
                          <ChevronDown size={16} color={MUTED} style={{ transform: open ? "rotate(180deg)" : "none", transition: "transform .2s", flexShrink: 0 }} />
                        </button>
                        {open && (
                          <div style={{ display: "flex", flexDirection: "column", gap: 10, padding: "10px 2px 6px" }}>
                            {nets.map(renderNet)}
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              </>
            )
          })()}
        </div>
      )
    }

    const scoped = def.fields.filter(f => only === "layout" ? isLayoutField(f.key) : only === "content" ? !isLayoutField(f.key) : true)
    if (only === "layout" && scoped.length === 0) return null
    const visibleFields = scoped.filter(field => {
      const si = (field as any).showIf
      if (!si) return true
      // Valeur effective : si le champ contrôleur n'est pas encore défini, on retombe sur
      // sa valeur par défaut (1re option d'un select) — sinon les pages existantes masqueraient
      // à tort les champs dont le contrôleur n'a jamais été touché.
      const ctrl = def.fields.find(f => f.key === si.key) as any
      const v = block.content[si.key] ?? ctrl?.options?.[0]
      if (si.equals !== undefined) return v === si.equals
      if (Array.isArray(si.in)) return si.in.includes(v)
      return true
    })
    // Regroupe les champs numerotes ("Plat 1 — Nom", "Produit 2 — Prix"...) en cartes repliables.
    // Presentation seule : meme content/onChange, aucun changement de data-model ni de rendu public.
    const DASH = " — "
    const cardOrder: string[] = []
    const cardMap: Record<string, typeof visibleFields> = {}
    const loneFields: typeof visibleFields = []
    for (const f of visibleFields) {
      const di = f.label.indexOf(DASH)
      if (di > 0) { const g = f.label.slice(0, di); if (!cardMap[g]) { cardMap[g] = []; cardOrder.push(g) } cardMap[g].push(f) }
      else loneFields.push(f)
    }
    const useCards = cardOrder.length >= 2
    const renderField = (field: typeof scoped[number], labelOverride?: string) => (
          <div key={field.key}>
            <label style={{ color: MUTED, fontSize: 11, display: "block", marginBottom: 5, fontWeight: 500 }}>{labelOverride ?? field.label}</label>
            {field.type === "textarea"
              ? <textarea value={block.content[field.key]||""} onChange={e => onChange(field.key, e.target.value)}
                  placeholder={field.placeholder} rows={3}
                  style={{ ...inputStyle, resize: "vertical" }}
                  onFocus={e => e.target.style.borderColor = "rgba(201,168,76,0.5)"}
                  onBlur={e => e.target.style.borderColor = "rgba(201,168,76,0.2)"} />
              : field.type === "select"
              ? (field.options && field.options.length <= 5
                  ? <Segmented value={block.content[field.key] || field.options[0]} options={field.options} onChange={v => onChange(field.key, v)} />
                  : <select value={block.content[field.key]||field.options?.[0]} onChange={e => onChange(field.key, e.target.value)} style={inputStyle}>
                      {field.options?.map(o => <option key={o} value={o}>{optionLabel(o)}</option>)}
                    </select>)
              : field.type === "color"
              ? <div style={{ display: "flex", gap: 7 }}>
                  <input type="color" value={block.content[field.key]||"#C9A84C"} onChange={e => onChange(field.key, e.target.value)} style={{ width: 34, height: 32, border: "none", borderRadius: 6, cursor: "pointer", padding: 0 }} />
                  <input type="text" value={block.content[field.key]||""} onChange={e => onChange(field.key, e.target.value)} placeholder={field.placeholder} style={{ ...inputStyle, flex: 1 }} onFocus={e => e.target.style.borderColor = "rgba(201,168,76,0.5)"} onBlur={e => e.target.style.borderColor = "rgba(201,168,76,0.2)"} />
                </div>
              : field.type === "image"
              ? <ImageUpload value={block.content[field.key]||""} onChange={url => onChange(field.key, url)} hint={field.hint} cropAspect={(field as any).cropAspect} />
              : field.type === "file"
              ? <FileUpload value={block.content[field.key]||""} onChange={url => onChange(field.key, url)} hint={field.hint} />
              : field.type === "datetime"
              ? <input type="datetime-local" value={block.content[field.key]||""} onChange={e => onChange(field.key, e.target.value)} style={inputStyle} onFocus={e => e.target.style.borderColor = "rgba(201,168,76,0.5)"} onBlur={e => e.target.style.borderColor = "rgba(201,168,76,0.2)"} />
              : <input type={field.type==="url" ? "url" : "text"} value={block.content[field.key]||""}
                  onChange={e => onChange(field.key, e.target.value)}
                  placeholder={field.placeholder} style={inputStyle}
                  onFocus={e => e.target.style.borderColor = "rgba(201,168,76,0.5)"}
                  onBlur={e => e.target.style.borderColor = "rgba(201,168,76,0.2)"} />}
            {field.hint && <p style={{ color: MUTED, fontSize: 11, margin: "3px 0 0", lineHeight: 1.4 }}>{field.hint}</p>}
            {/* Validation guidée : URL / email / téléphone (affichage seul) */}
            {(() => {
              const val = String(block.content[field.key] || "").trim()
              if (!val) return null
              const key = field.key.toLowerCase()
              let valid: boolean | null = null, msg = ""
              if (field.type === "url") {
                if (/^(https?:\/\/|mailto:|tel:|\/|#)/i.test(val)) valid = true
                else { valid = false; msg = "Ajoutez https:// au début du lien" }
              } else if (key.includes("email")) {
                valid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val); if (!valid) msg = "Adresse email invalide"
              } else if (key.includes("phone") || key.includes("numero") || key === "num") {
                valid = val.replace(/\D/g, "").length >= 6; if (!valid) msg = "Numéro trop court"
              }
              if (valid === null) return null
              const isTestable = field.type === "url" && valid && /^https?:\/\//i.test(val)
              return (
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, marginTop: 4 }}>
                  <span style={{ color: valid ? "var(--success)" : "#F59E0B", fontSize: 10.5, fontWeight: 600 }}>{valid ? "✓ Format valide" : `⚠ ${msg}`}</span>
                  {isTestable && <a href={val} target="_blank" rel="noopener noreferrer" style={{ color: G, fontSize: 9, fontWeight: 700, textDecoration: "none" }}>Tester ↗</a>}
                </div>
              )
            })()}
            {/* Compteur + score de lisibilité mobile pour les textes longs (bio, à propos…) */}
            {field.type === "textarea" && !(field as any).maxRecommended && (() => {
              const len = (block.content[field.key] || "").length
              if (!len) return null
              const [txt, col] = len < 40 ? ["Un peu court", "#F59E0B"] : len <= 200 ? ["Bonne longueur ✓", "var(--success)"] : ["Un peu long pour mobile", "#F59E0B"]
              return (
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 4 }}>
                  <span style={{ color: col, fontSize: 10.5, fontWeight: 600 }}>{txt}</span>
                  <span style={{ color: MUTED, fontSize: 10.5 }}>{len} car.</span>
                </div>
              )
            })()}
            {/* Compteur X/max + score pour champs à longueur conseillée (accroche…) */}
            {(field as any).maxRecommended && (() => {
              const len = (block.content[field.key] || "").length
              if (!len) return null
              const max = (field as any).maxRecommended as number
              const short = Math.max(12, Math.round(max * 0.15))
              const [txt, col] = len < short ? ["Un peu court", "#F59E0B"] : len <= max * 0.9 ? ["Excellent ✓", "var(--success)"] : len <= max ? ["Bonne longueur ✓", "var(--success)"] : ["Trop long", "var(--danger)"]
              return (
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 4 }}>
                  <span style={{ color: col, fontSize: 10.5, fontWeight: 600 }}>{txt}</span>
                  <span style={{ color: len > max ? "var(--danger)" : MUTED, fontSize: 10.5 }}>{len}/{max}</span>
                </div>
              )
            })()}
            {/* Suggestions curées — pour ne jamais partir d'un champ vide */}
            {(field as any).suggestions && ((field as any).suggestionsMode === "append" || (block.content[field.key] || "").trim() === "") && (
              <div style={{ display: "flex", flexWrap: "wrap", gap: 5, marginTop: 6 }}>
                <span style={{ color: MUTED, fontSize: 9, alignSelf: "center", marginRight: 1 }}>Exemples&nbsp;:</span>
                {((field as any).suggestions as string[]).map(sug => {
                  const append = (field as any).suggestionsMode === "append"
                  const parts = (block.content[field.key] || "").split(/[,\n]/).map((s: string) => s.trim()).filter(Boolean)
                  const active = append && parts.includes(sug)
                  return (
                    <button key={sug} type="button" title={active ? `Retirer : ${sug}` : `Ajouter : ${sug}`}
                      onClick={() => {
                        if (!append) { onChange(field.key, sug); return }
                        if (active) onChange(field.key, parts.filter((p: string) => p !== sug).join(", "))
                        else if (parts.length < 5) onChange(field.key, [...parts, sug].join(", "))
                      }}
                      style={{ padding: "4px 9px", borderRadius: 999, background: active ? G : "rgba(201,168,76,0.1)", border: `1px solid ${active ? G : "rgba(201,168,76,0.25)"}`, color: active ? "#080808" : G, fontSize: 10, fontWeight: active ? 800 : 600, cursor: "pointer", whiteSpace: "nowrap" as const, maxWidth: "100%", overflow: "hidden", textOverflow: "ellipsis" }}>
                      {active ? "✓ " : ""}{sug}
                    </button>
                  )
                })}
              </div>
            )}
          </div>
    )
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {(useCards ? loneFields : visibleFields).map(f => renderField(f))}
        {useCards && cardOrder.map(g => {
          const fields = cardMap[g]
          const open = openCards.has(g)
          const filled = fields.filter(f => String(block.content[f.key] ?? "").trim()).length
          return (
            <div key={g}>
              <button type="button" onClick={() => setOpenCards(prev => { const n = new Set(prev); if (n.has(g)) n.delete(g); else n.add(g); return n })}
                style={{ width: "100%", display: "flex", alignItems: "center", gap: 8, minHeight: 46, padding: "10px 12px", borderRadius: 10, border: `1px solid ${open ? "rgba(201,168,76,0.4)" : "rgba(255,255,255,0.08)"}`, background: open ? "rgba(201,168,76,0.06)" : "rgba(255,255,255,0.02)", color: "#F5F0E8", cursor: "pointer", textAlign: "left" }}>
                <span style={{ width: 7, height: 7, borderRadius: "50%", background: filled ? "var(--success)" : "rgba(255,255,255,0.18)", flexShrink: 0 }} />
                <span style={{ flex: 1, fontSize: 13, fontWeight: 600 }}>{g}</span>
                <span style={{ fontSize: 10.5, color: MUTED }}>{filled ? `${filled}/${fields.length}` : "vide"}</span>
                <ChevronDown size={16} color={MUTED} style={{ transform: open ? "rotate(180deg)" : "none", transition: "transform .2s", flexShrink: 0 }} />
              </button>
              {open && (
                <div style={{ display: "flex", flexDirection: "column", gap: 12, padding: "12px 2px 6px" }}>
                  {fields.map(f => renderField(f, f.label.slice(f.label.indexOf(DASH) + DASH.length)))}
                </div>
              )}
            </div>
          )
        })}
      </div>
    )
  }

  export function ThemePanel({ theme, onThemeChange, userPlan = null, previewName = "", previewAvatar = "" }: { theme: PageTheme; onThemeChange: (t: PageTheme) => void; userPlan?: string | null; previewName?: string; previewAvatar?: string }) {
    const toast = useToast()
    const [themeTab, setThemeTab] = useState<"themes"|"colors"|"fonts"|"bg"|"blocks"|"intro">("themes")
    const [themeBlocksAdv, setThemeBlocksAdv] = useState(false) // Avance masque par defaut (animation, effet verre) — review #4
    const [bgMode, setBgMode] = useState<string>(theme.bgMode||"solid")
    const [bgSubTab, setBgSubTab] = useState<"type"|"effects"|"animation"|"presets"|"advanced">("presets")
    const [activeCat, setActiveCat] = useState<string>(PRESET_CATEGORIES[0].id)
    const [colorFormat, setColorFormat] = useState<"hex"|"rgb"|"hsl">("hex")
    const [recentColors, setRecentColors] = useState<string[]>(() => {
      try { return JSON.parse(localStorage.getItem("qrfolio_recent_colors") || "[]") } catch { return [] }
    })

    function addRecentColor(hex: string) {
      setRecentColors(prev => {
        const next = [hex, ...prev.filter(c => c !== hex)].slice(0, 10)
        localStorage.setItem("qrfolio_recent_colors", JSON.stringify(next))
        return next
      })
    }

    function formatColor(hex: string, fmt: "hex"|"rgb"|"hsl"): string {
      if (fmt === "hex") return hex
      const rgb = hexToRgb(hex)
      if (!rgb) return hex
      if (fmt === "rgb") return `rgb(${rgb.r}, ${rgb.g}, ${rgb.b})`
      const hsl = rgbToHsl(rgb.r, rgb.g, rgb.b)
      return `hsl(${hsl.h}, ${hsl.s}%, ${hsl.l}%)`
    }

    function parseColorInput(val: string): string | null {
      val = val.trim()
      if (/^#[0-9a-fA-F]{3,6}$/.test(val)) return val
      const rgbM = val.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/)
      if (rgbM) {
        const [, r, g, b] = rgbM.map(Number)
        return "#" + [r,g,b].map(v => v.toString(16).padStart(2,"0")).join("")
      }
      return null
    }
    const [patternType, setPatternType] = useState<string>((theme as any).bgPattern||"dots")
    const [effectNoise, setEffectNoise] = useState(false)
    const [effectGlow, setEffectGlow] = useState(false)
    const [effectVignette, setEffectVignette] = useState(false)
    const [animation, setAnimation] = useState<string>("none")
    const [copiedStyle, setCopiedStyle] = useState(false)
    // Aperçu live de l'animation d'entrée (mode scopé : joue dans le cadre, pas en plein écran).
    const [introReplay, setIntroReplay] = useState(0)
    const introPreviewRef = useRef<HTMLDivElement>(null)

    const G = "#C9A84C"
    const MUTED = "#A8A190"

    const inputStyle: React.CSSProperties = {
      width: "100%", background: "#0A0A0A", border: "1px solid rgba(201,168,76,0.2)",
      borderRadius: 8, padding: "8px 10px", color: "#F5F0E8", fontSize: 12,
      outline: "none", boxSizing: "border-box" as const, fontFamily: "monospace"
    }

    // 40+ presets
    const PRESETS = [
      // Business
      { name: "Executive Blue", group: "Business", bg: "#0A1628", primary: "#1E88E5", accent: "#42A5F5", text: "#F5F0E8", muted: "#8A9BA8", gradient: "linear-gradient(135deg,#0A1628 0%,#1A2A4A 100%)" },
      { name: "Corporate Black", group: "Business", bg: "#080808", primary: "#C9A84C", accent: "var(--success)", text: "#F5F0E8", muted: "#A8A190", gradient: "linear-gradient(135deg,#080808 0%,#111111 100%)" },
      { name: "Premium Navy", group: "Business", bg: "#0D1B2A", primary: "#C9A84C", accent: "#E8C96A", text: "#F5F0E8", muted: "#7A8B9A", gradient: "linear-gradient(135deg,#0D1B2A 0%,#1A3050 100%)" },
      { name: "Midnight Gold", group: "Business", bg: "#080808", primary: "#C9A84C", accent: "var(--success)", text: "#F5F0E8", muted: "#A8A190", gradient: "linear-gradient(135deg,#080808,#1a1a08)" },
      { name: "Boardroom", group: "Business", bg: "#1A1A1A", primary: "#E0E0E0", accent: "#C9A84C", text: "#F5F0E8", muted: "#888888", gradient: "linear-gradient(160deg,#1A1A1A,#2D2D2D)" },
      // Luxury
      { name: "Velvet Noir", group: "Luxury", bg: "#0D0A1A", primary: "#9B59B6", accent: "#E056FD", text: "#F5F0E8", muted: "#8A7A9A", gradient: "linear-gradient(135deg,#0D0A1A 0%,#1A0D2E 100%)" },
      { name: "Golden Luxury", group: "Luxury", bg: "#0A0800", primary: "#FFD700", accent: "#FFA500", text: "#F5EDD0", muted: "#9A8A70", gradient: "linear-gradient(135deg,#0A0800,#1A1200)" },
      { name: "Royal Purple", group: "Luxury", bg: "#0A0015", primary: "#8B00FF", accent: "#DA70D6", text: "#F5F0E8", muted: "#8A7A9A", gradient: "linear-gradient(135deg,#0A0015,#150020)" },
      { name: "Diamond White", group: "Luxury", bg: "#FAFAFA", primary: "#1A1A1A", accent: "#C9A84C", text: "#1A1A1A", muted: "#6B7280", gradient: "linear-gradient(135deg,#FAFAFA,#F0F0F5)" },
      { name: "Prestige", group: "Luxury", bg: "#0C0C0C", primary: "#C9A84C", accent: "#FFD700", text: "#F5EDD0", muted: "#A8A190", gradient: "linear-gradient(160deg,#0C0C0C,#1A1500)" },
      // SaaS
      { name: "Deep Space", group: "SaaS", bg: "#020B18", primary: "#00D4FF", accent: "#7B2FBE", text: "#F5F0E8", muted: "#8A9BA8", gradient: "linear-gradient(135deg,#020B18,#0A1628)" },
      { name: "Aurora", group: "SaaS", bg: "#0A0F1E", primary: "#00FF9D", accent: "var(--danger)", text: "#F5F0E8", muted: "#8A8FA0", gradient: "linear-gradient(135deg,#0A0F1E,#0D1628)" },
      { name: "Ocean Tech", group: "SaaS", bg: "#050F1A", primary: "#00B4D8", accent: "#0096C7", text: "#F5F0E8", muted: "#6A8A9A", gradient: "linear-gradient(160deg,#050F1A,#0A1E2A)" },
      { name: "Matrix Code", group: "SaaS", bg: "#000D00", primary: "#00FF41", accent: "#00CC33", text: "#00FF41", muted: "#006B1A", gradient: "linear-gradient(180deg,#000D00,#001500)" },
      { name: "Future Grid", group: "SaaS", bg: "#08001A", primary: "#7B2FBE", accent: "#9B59B6", text: "#F5F0E8", muted: "#7A6A8A", gradient: "linear-gradient(135deg,#08001A,#100028)" },
      // Restaurant
      { name: "Wine Red", group: "Restaurant", bg: "#1A0008", primary: "#C0392B", accent: "#E74C3C", text: "#F5E8E0", muted: "#9A7A78", gradient: "linear-gradient(135deg,#1A0008,#2D0010)" },
      { name: "Sunset Fire", group: "Restaurant", bg: "#1A0500", primary: "#FF6B00", accent: "#FF8C00", text: "#F5E8D0", muted: "#9A7A5A", gradient: "linear-gradient(135deg,#1A0500,#2D0A00)" },
      { name: "Coffee House", group: "Restaurant", bg: "#1A0F0A", primary: "#8B4513", accent: "#D2691E", text: "#F5EDE0", muted: "#9A8A7A", gradient: "linear-gradient(135deg,#1A0F0A,#2D1A10)" },
      { name: "Olive Garden", group: "Restaurant", bg: "#0A0F05", primary: "#556B2F", accent: "#6B8E23", text: "#F5F0E8", muted: "#7A8A6A", gradient: "linear-gradient(135deg,#0A0F05,#141A08)" },
      { name: "Italian Night", group: "Restaurant", bg: "#0D0808", primary: "#8B0000", accent: "#C9A84C", text: "#F5E8D0", muted: "#9A8070", gradient: "linear-gradient(160deg,#0D0808,#1A0D0D)" },
      // Creator
      { name: "Neon Pink", group: "Creator", bg: "#0D0010", primary: "#FF0080", accent: "#FF69B4", text: "#F5F0E8", muted: "#8A7A8A", gradient: "linear-gradient(135deg,#0D0010,#180015)" },
      { name: "TikTok Vibes", group: "Creator", bg: "#010101", primary: "#FF0050", accent: "#00F2EA", text: "#F5F0E8", muted: "#888888", gradient: "linear-gradient(135deg,#010101,#0A000A)" },
      { name: "Cyber Purple", group: "Creator", bg: "#0A0015", primary: "#BF00FF", accent: "#7B2FBE", text: "#F5F0E8", muted: "#7A6A8A", gradient: "linear-gradient(135deg,#0A0015,#150020)" },
      { name: "Creator Blue", group: "Creator", bg: "#000A20", primary: "#0066FF", accent: "#4A90FF", text: "#F5F0E8", muted: "#6A7A9A", gradient: "linear-gradient(135deg,#000A20,#000F30)" },
      { name: "Electric Neon", group: "Creator", bg: "#050505", primary: "var(--success)", accent: "#00FFFF", text: "#F5F0E8", muted: "#5A8A7A", gradient: "linear-gradient(135deg,#050505,#050F0A)" },
      // Minimal
      { name: "Pure White", group: "Minimal", bg: "#FFFFFF", primary: "#1A1A1A", accent: "#C9A84C", text: "#1A1A1A", muted: "#6B7280", gradient: "linear-gradient(135deg,#FFFFFF,#F8F8F8)" },
      { name: "Minimal Cream", group: "Minimal", bg: "#FAF7F2", primary: "#1A1A1A", accent: "#C9A84C", text: "#2D2D2D", muted: "#7A7060", gradient: "linear-gradient(135deg,#FAF7F2,#F0EDE8)" },
      { name: "Graphite", group: "Minimal", bg: "#1C1C1E", primary: "#AEAEB2", accent: "#C9A84C", text: "#F5F0E8", muted: "#8E8E93", gradient: "linear-gradient(135deg,#1C1C1E,#2C2C2E)" },
      { name: "Stone", group: "Minimal", bg: "#F5F5F0", primary: "#5A5A5A", accent: "#A8A190", text: "#2D2D2D", muted: "#8A8A8A", gradient: "linear-gradient(135deg,#F5F5F0,#EDEDEA)" },
      { name: "Soft Grey", group: "Minimal", bg: "#F0F0F0", primary: "#333333", accent: "#666666", text: "#1A1A1A", muted: "#888888", gradient: "linear-gradient(135deg,#F0F0F0,#E8E8E8)" },
      // Nature
      { name: "Forest Zen", group: "Nature", bg: "#0A1A0E", primary: "#2ECC71", accent: "#27AE60", text: "#F5F0E8", muted: "#6A8A6A", gradient: "linear-gradient(135deg,#0A1A0E,#0F2414)" },
      { name: "Emerald", group: "Nature", bg: "#022A22", primary: "#00A878", accent: "#00C896", text: "#F5F0E8", muted: "#5A8A7A", gradient: "linear-gradient(135deg,#022A22,#043830)" },
      { name: "Ocean Green", group: "Nature", bg: "#021A1A", primary: "#1ABC9C", accent: "#16A085", text: "#F5F0E8", muted: "#5A8A80", gradient: "linear-gradient(135deg,#021A1A,#042828)" },
      { name: "Arctic", group: "Nature", bg: "#E8F4F8", primary: "#2980B9", accent: "#3498DB", text: "#1A2A3A", muted: "#6A8A9A", gradient: "linear-gradient(135deg,#E8F4F8,#D8ECF8)" },
      { name: "Bamboo", group: "Nature", bg: "#F5F0E8", primary: "#4A7C3F", accent: "#6B9E5E", text: "#2D2D1A", muted: "#7A8A6A", gradient: "linear-gradient(135deg,#F5F0E8,#EDE8D8)" },
      // Event
      { name: "Festival Night", group: "Event", bg: "#050008", primary: "#FF6B35", accent: "#FF8C42", text: "#F5F0E8", muted: "#8A7A6A", gradient: "linear-gradient(135deg,#050008,#0A000F)" },
      { name: "Party Purple", group: "Event", bg: "#0A0015", primary: "#9B59B6", accent: "#8E44AD", text: "#F5F0E8", muted: "#7A6A8A", gradient: "linear-gradient(135deg,#0A0015,#150020)" },
      { name: "Celebration", group: "Event", bg: "#0A0500", primary: "#F39C12", accent: "#E67E22", text: "#F5EDD0", muted: "#9A8A6A", gradient: "linear-gradient(135deg,#0A0500,#150A00)" },
      { name: "Fireworks", group: "Event", bg: "#000008", primary: "#FF0000", accent: "#FFD700", text: "#F5F0E8", muted: "#8A8A8A", gradient: "linear-gradient(135deg,#000008,#050010)" },
      { name: "Spotlight", group: "Event", bg: "#080808", primary: "#FFFFFF", accent: "#C9A84C", text: "#F5F0E8", muted: "#8A8A8A", gradient: "linear-gradient(180deg,#1A1A1A,#080808)" },
    ]

    const PATTERNS_LIST = [
      { id: "dots", label: "Points", icon: "·" },
      { id: "grid", label: "Grille", icon: "#" },
      { id: "lines", label: "Lignes", icon: "═" },
      { id: "waves", label: "Vagues", icon: "～" },
      { id: "diagonals", label: "Diagonales", icon: "╱" },
      { id: "hexagons", label: "Hexagones", icon: "⬡" },
      { id: "squares", label: "Carrés", icon: "□" },
      { id: "circles", label: "Cercles", icon: "○" },
      { id: "zigzag", label: "Zigzag", icon: "∧" },
      { id: "stars", label: "Étoiles", icon: "✦" },
    ]

    const getPatternCSS = (pattern: string, color: string, size: number, opacity: number) => {
      const c = color + Math.round(opacity * 255).toString(16).padStart(2, "0")
      const s = size
      switch(pattern) {
        case "dots": return `radial-gradient(circle, ${c} 1.5px, transparent 1.5px)`
        case "grid": return `linear-gradient(${c} 1px, transparent 1px), linear-gradient(90deg, ${c} 1px, transparent 1px)`
        case "lines": return `repeating-linear-gradient(0deg, ${c} 0px, ${c} 1px, transparent 1px, transparent ${s}px)`
        case "waves": return `repeating-linear-gradient(90deg, ${c} 0px, ${c} 1px, transparent 1px, transparent ${s}px), repeating-linear-gradient(180deg, ${c} 0px, ${c} 1px, transparent 1px, transparent ${s}px)`
        case "diagonals": return `repeating-linear-gradient(45deg, ${c} 0px, ${c} 1px, transparent 1px, transparent ${s}px)`
        case "hexagons": return `radial-gradient(circle at 0% 50%, ${c} ${s*0.12}px, transparent ${s*0.12}px), radial-gradient(circle at 100% 50%, ${c} ${s*0.12}px, transparent ${s*0.12}px), radial-gradient(circle at 50% 0%, ${c} ${s*0.12}px, transparent ${s*0.12}px)`
        case "squares": return `linear-gradient(${c} 1px, transparent 1px), linear-gradient(90deg, ${c} 1px, transparent 1px)`
        case "circles": return `radial-gradient(circle, transparent ${s*0.3}px, ${c} ${s*0.3}px, ${c} ${s*0.35}px, transparent ${s*0.35}px)`
        case "zigzag": return `linear-gradient(135deg, ${c} 25%, transparent 25%), linear-gradient(225deg, ${c} 25%, transparent 25%)`
        case "stars": return `radial-gradient(circle, ${c} 1px, transparent 1px), radial-gradient(circle at ${s/2}px ${s/2}px, ${c} 1px, transparent 1px)`
        default: return `radial-gradient(circle, ${c} 1.5px, transparent 1.5px)`
      }
    }

    const presetGroups = Array.from(new Set(PRESETS.map(p => p.group)))
    const [activePresetGroup, setActivePresetGroup] = useState("Business")

    // Appliquer un preset complet
    const applyPreset = (preset: typeof PRESETS[0]) => {
      onThemeChange({
        ...theme,
        bg: preset.bg,
        bgGradient: preset.gradient,
        bgMode: "gradient",
        primary: preset.primary,
        accent: preset.accent,
        text: preset.text,
        muted: preset.muted,
        name: preset.name,
      } as any)
    }

    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
        {/* Onglets principaux */}
        <div style={{ display: "flex", borderBottom: "1px solid rgba(255,255,255,0.06)", marginBottom: 14, flexShrink: 0 }}>
          {(["themes","colors","fonts","bg","blocks","intro"] as const).map(tab => (
            <button key={tab} onClick={() => setThemeTab(tab)}
              style={{ flex: 1, padding: "10px 2px", background: "transparent", border: "none", borderBottom: `2px solid ${themeTab===tab ? G : "transparent"}`, color: themeTab===tab ? G : MUTED, fontSize: 10.5, fontWeight: themeTab===tab ? 700 : 400, cursor: "pointer" }}>
              {tab==="themes" ? "Thèmes" : tab==="colors" ? "Couleurs" : tab==="fonts" ? "Polices" : tab==="bg" ? "Fond" : tab==="blocks" ? "Blocs" : "Intro"}
            </button>
          ))}
        </div>

        {/* ── ONGLET THÈMES ── */}
        {themeTab==="themes" && (
          <div>
            {/* Chips catégories */}
            <div style={{ display: "flex", gap: 5, flexWrap: "wrap", marginBottom: 12 }}>
              {PRESET_CATEGORIES.map(cat => (
                <button key={cat.id} onClick={() => setActiveCat(cat.id)}
                  style={{ display: "flex", alignItems: "center", gap: 4, padding: "4px 10px", background: activeCat===cat.id ? cat.color+"20" : "rgba(255,255,255,0.04)", border: `1px solid ${activeCat===cat.id ? cat.color+"50" : "rgba(255,255,255,0.08)"}`, borderRadius: 20, color: activeCat===cat.id ? cat.color : MUTED, fontSize: 10, fontWeight: activeCat===cat.id ? 700 : 400, cursor: "pointer", transition: "all 0.15s" }}>
                  <span>{cat.icon}</span><span style={{ marginLeft: 3 }}>{cat.id}</span>
                </button>
              ))}
            </div>
            {/* Grille presets filtrés par catégorie */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 7 }}>
              {Object.entries(PRESET_THEMES).filter(([, t]) => t.category === activeCat).map(([key, t]) => (
                <button key={key} onClick={() => onThemeChange(t)}
                  style={{ background: t.bgGradient || t.bg, border: `2px solid ${theme.name===t.name ? G : "rgba(255,255,255,0.1)"}`, borderRadius: 12, padding: "10px 10px", cursor: "pointer", textAlign: "left" as const, position: "relative", overflow: "hidden", minHeight: 72, transition: "border-color 0.15s" }}>
                  <div style={{ display: "flex", gap: 4, marginBottom: 6 }}>
                    {[t.primary, t.accent, t.text].map((col, i) => (
                      <div key={i} style={{ width: 10, height: 10, borderRadius: "50%", background: col, boxShadow: `0 0 4px ${col}80` }} />
                    ))}
                  </div>
                  <p style={{ color: t.text, fontSize: 11, fontWeight: 700, margin: "0 0 2px", fontFamily: `${t.fontDisplay}, serif`, textShadow: "0 1px 3px rgba(0,0,0,0.5)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" as const }}>{t.name}</p>
                  <span style={{ fontSize: 11, opacity: 0.7 }}>{t.emoji}</span>
                  {theme.name===t.name && (
                    <div style={{ position: "absolute", top: 5, right: 5, width: 16, height: 16, background: G, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center" }}>
                      <Check size={9} color="#000" />
                    </div>
                  )}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* ── ONGLET COULEURS ── */}
        {themeTab==="colors" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
            {/* Sélecteur de format */}
            <div style={{ display: "flex", gap: 4, marginBottom: 14 }}>
              {(["hex","rgb","hsl"] as const).map(fmt => (
                <button key={fmt} onClick={() => setColorFormat(fmt)}
                  style={{ flex: 1, padding: "5px", background: colorFormat===fmt ? G+"15" : "rgba(255,255,255,0.04)", border: `1px solid ${colorFormat===fmt ? G+"40" : "rgba(255,255,255,0.07)"}`, borderRadius: 7, color: colorFormat===fmt ? G : MUTED, fontSize: 10, fontWeight: colorFormat===fmt ? 700 : 400, cursor: "pointer", textTransform: "uppercase" as const }}>
                  {fmt}
                </button>
              ))}
            </div>

            {/* Tokens de couleur */}
            {[
              { key: "primary",   label: "Primaire",   hint: "Boutons, CTA, liens",       icon: "🎨" },
              { key: "accent",    label: "Accent",      hint: "Highlights, hover",          icon: "✨" },
              { key: "bg",        label: "Fond",        hint: "Arrière-plan de la page",   icon: "🖼️" },
              { key: "surface",   label: "Cartes",      hint: "Fond des blocs et cartes",  icon: "▣" },
              { key: "text",      label: "Texte",       hint: "Texte principal",           icon: "T" },
              { key: "muted",     label: "Secondaire",  hint: "Texte secondaire, labels",  icon: "t" },
              { key: "border",    label: "Bordures",    hint: "Contours des éléments",     icon: "⬜" },
            ].map(({ key, label, hint, icon }) => {
              const val: string = (theme as any)[key] || "#000000"
              const ratio = contrastRatio(val, (theme as any).bg || "#000000")
              const wcag = wcagLevel(ratio)
              return (
                <div key={key} style={{ marginBottom: 12 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 5 }}>
                    <span style={{ fontSize: 12, width: 18, textAlign: "center" as const }}>{icon}</span>
                    <label style={{ color: "#F5F0E8", fontSize: 11, fontWeight: 600, flex: 1 }}>{label}</label>
                    <span style={{ fontSize: 9, color: MUTED }}>{hint}</span>
                    {/* Badge contraste */}
                    {(key === "text" || key === "muted") && (
                      <span style={{ background: wcag==="AAA" ? "rgba(57,255,143,0.15)" : wcag==="AA" ? "rgba(251,191,36,0.15)" : "rgba(239,68,68,0.15)", border: `1px solid ${wcag==="AAA" ? "rgba(57,255,143,0.3)" : wcag==="AA" ? "rgba(251,191,36,0.3)" : "rgba(239,68,68,0.3)"}`, borderRadius: 6, padding: "1px 6px", fontSize: 9, fontWeight: 700, color: wcag==="AAA" ? "var(--success)" : wcag==="AA" ? "#FBBF24" : "#EF4444" }}>
                        {wcag} {ratio.toFixed(1)}:1
                      </span>
                    )}
                  </div>
                  <div style={{ display: "flex", gap: 7, alignItems: "center" }}>
                    {/* Color picker natif */}
                    <div style={{ position: "relative", flexShrink: 0 }}>
                      <input type="color" value={val.startsWith("#") ? val : "#000000"}
                        onChange={e => { onThemeChange({...theme, [key]: e.target.value} as any); addRecentColor(e.target.value) }}
                        style={{ width: 38, height: 36, border: "none", borderRadius: 8, cursor: "pointer", padding: 2, background: "transparent" }} />
                      <div style={{ position: "absolute", inset: 0, borderRadius: 8, border: "2px solid rgba(255,255,255,0.15)", pointerEvents: "none" }} />
                    </div>
                    {/* Input format */}
                    <input
                      value={formatColor(val, colorFormat)}
                      onChange={e => {
                        const parsed = parseColorInput(e.target.value) || e.target.value
                        if (parsed.startsWith("#")) { onThemeChange({...theme, [key]: parsed} as any); addRecentColor(parsed) }
                      }}
                      style={{ ...inputStyle, flex: 1, fontFamily: "JetBrains Mono, monospace", fontSize: 11 }}
                      placeholder={colorFormat === "hex" ? "#000000" : colorFormat === "rgb" ? "rgb(0,0,0)" : "hsl(0,0%,0%)"}
                    />
                  </div>
                </div>
              )
            })}

            {/* Couleurs récentes */}
            {recentColors.length > 0 && (
              <div style={{ marginTop: 8 }}>
                <p style={{ color: MUTED, fontSize: 9, textTransform: "uppercase" as const, letterSpacing: 2, margin: "0 0 8px" }}>Récentes</p>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                  {recentColors.map((col, i) => (
                    <button key={i} title={col}
                      style={{ width: 24, height: 24, borderRadius: 6, background: col, border: "2px solid rgba(255,255,255,0.1)", cursor: "pointer", flexShrink: 0 }}
                      onClick={() => onThemeChange({...theme, primary: col} as any)} />
                  ))}
                </div>
              </div>
            )}

            {/* Aperçu des couleurs appliquées */}
            <div style={{ marginTop: 14, background: theme.surface || theme.bg, borderRadius: 12, overflow: "hidden", border: "1px solid rgba(255,255,255,0.06)" }}>
              <div style={{ padding: "12px 14px" }}>
                <p style={{ color: theme.text, fontSize: 13, fontWeight: 700, margin: "0 0 3px", fontFamily: theme.fontDisplay }}>Aperçu live</p>
                <p style={{ color: theme.muted, fontSize: 11, margin: "0 0 10px" }}>Texte secondaire exemple</p>
                <div style={{ display: "flex", gap: 7 }}>
                  <div style={{ flex: 1, background: theme.primary, borderRadius: 7, padding: "7px", textAlign: "center", fontSize: 11, fontWeight: 700, color: contrastRatio(theme.primary, "#ffffff") > 4.5 ? "#ffffff" : "#000000" }}>Bouton primaire</div>
                  <div style={{ flex: 1, background: theme.accent, borderRadius: 7, padding: "7px", textAlign: "center", fontSize: 11, fontWeight: 700, color: contrastRatio(theme.accent, "#ffffff") > 4.5 ? "#ffffff" : "#000000" }}>Accent</div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── ONGLET POLICES ── */}
        {themeTab==="fonts" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            {[
              { key: "fontDisplay", label: "Police titres" },
              { key: "fontBody", label: "Police corps" },
            ].map(({ key, label }) => (
              <div key={key}>
                <label style={{ color: MUTED, fontSize: 10, display: "block", marginBottom: 8, fontWeight: 500, textTransform: "uppercase" as const, letterSpacing: 1.5 }}>{label}</label>
                <div style={{ display: "flex", flexDirection: "column", gap: 4, maxHeight: 200, overflowY: "auto" }} className="iphone-scroll">
                  {GOOGLE_FONTS.map(f => (
                    <button key={f} onClick={() => onThemeChange({...theme, [key]: f})}
                      style={{ padding: "9px 12px", background: (theme as any)[key]===f ? G+"12" : "rgba(255,255,255,0.03)", border: `1px solid ${(theme as any)[key]===f ? G+"30" : "rgba(255,255,255,0.06)"}`, borderRadius: 8, color: (theme as any)[key]===f ? G : "#F5F0E8", fontSize: 14, cursor: "pointer", textAlign: "left", fontFamily: f, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                      {f}
                      {(theme as any)[key]===f && <Check size={11} color={G} />}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ── ONGLET FOND ── */}
        {themeTab==="bg" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
            {/* Sous-onglets Fond */}
            <div style={{ display: "flex", gap: 4, marginBottom: 14, flexWrap: "wrap" }}>
              {(["presets","type","effects","animation","advanced"] as const).map(sub => (
                <button key={sub} onClick={() => setBgSubTab(sub)}
                  style={{ flex: 1, minWidth: 60, padding: "7px 4px", background: bgSubTab===sub ? G+"15" : "rgba(255,255,255,0.03)", border: `1px solid ${bgSubTab===sub ? G+"40" : "rgba(255,255,255,0.07)"}`, borderRadius: 8, color: bgSubTab===sub ? G : MUTED, fontSize: 10, fontWeight: bgSubTab===sub ? 700 : 400, cursor: "pointer", transition: "all 0.15s" }}>
                  {sub==="presets" ? "Presets" : sub==="type" ? "Type" : sub==="effects" ? "Effets" : sub==="animation" ? "Anim" : "Avancé"}
                </button>
              ))}
            </div>

            {/* PRESETS */}
            {bgSubTab==="presets" && (
              <div>
                {/* Groupes */}
                <div style={{ display: "flex", gap: 5, flexWrap: "wrap", marginBottom: 12 }}>
                  {presetGroups.map(group => (
                    <button key={group} onClick={() => setActivePresetGroup(group)}
                      style={{ padding: "4px 10px", background: activePresetGroup===group ? G+"15" : "rgba(255,255,255,0.04)", border: `1px solid ${activePresetGroup===group ? G+"40" : "rgba(255,255,255,0.08)"}`, borderRadius: 20, color: activePresetGroup===group ? G : MUTED, fontSize: 10, fontWeight: activePresetGroup===group ? 700 : 400, cursor: "pointer" }}>
                      {group}
                    </button>
                  ))}
                </div>
                {/* Presets du groupe */}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 7 }}>
                  {PRESETS.filter(p => p.group===activePresetGroup).map(preset => (
                    <button key={preset.name} onClick={() => applyPreset(preset)}
                      style={{ background: preset.gradient, border: `2px solid ${theme.name===preset.name ? G : "rgba(255,255,255,0.1)"}`, borderRadius: 12, padding: "12px 10px", cursor: "pointer", textAlign: "left", position: "relative", overflow: "hidden", minHeight: 70 }}>
                      <div style={{ display: "flex", gap: 4, marginBottom: 6 }}>
                        {[preset.primary, preset.accent, preset.text].map((col, i) => <div key={i} style={{ width: 10, height: 10, borderRadius: "50%", background: col, boxShadow: `0 0 4px ${col}80` }} />)}
                      </div>
                      <p style={{ color: preset.text, fontSize: 10, fontWeight: 700, margin: 0, textShadow: "0 1px 3px rgba(0,0,0,0.5)" }}>{preset.name}</p>
                      {theme.name===preset.name && <div style={{ position: "absolute", top: 4, right: 4, width: 14, height: 14, background: G, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center" }}><Check size={8} color="#000" /></div>}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* TYPE DE FOND */}
            {bgSubTab==="type" && (
              <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                {/* Type selector */}
                <div>
                  <label style={{ color: MUTED, fontSize: 10, display: "block", marginBottom: 8, textTransform: "uppercase" as const, letterSpacing: 1.5 }}>Type de fond</label>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 5 }}>
                    {[
                      { id: "solid", label: "Uni", icon: "🎨" },
                      { id: "gradient", label: "Linéaire", icon: "🌈" },
                      { id: "radial", label: "Radial", icon: "🔴" },
                      { id: "mesh", label: "Mesh", icon: "✨" },
                      { id: "pattern", label: "Motif", icon: "▦" },
                      { id: "image", label: "Image", icon: "🖼️" },
                    ].map(({ id, label, icon }) => (
                      <button type="button" key={id} onClick={() => { setBgMode(id); onThemeChange({...theme, bgMode: id} as any) }}
                        style={{ background: bgMode===id ? G+"15" : "rgba(255,255,255,0.03)", border: `1.5px solid ${bgMode===id ? G+"50" : "rgba(255,255,255,0.08)"}`, borderRadius: 9, padding: "9px 5px", cursor: "pointer", color: bgMode===id ? G : MUTED, fontSize: 10, fontWeight: bgMode===id ? 700 : 400, display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
                        <span style={{ fontSize: 16 }}>{icon}</span>
                        <span>{label}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* UNI */}
                {bgMode==="solid" && (
                  <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                    <label style={{ color: MUTED, fontSize: 10, textTransform: "uppercase" as const, letterSpacing: 1.5 }}>Couleur de fond</label>
                    <div style={{ display: "flex", gap: 8 }}>
                      <input type="color" value={theme.bg} onChange={e => onThemeChange({...theme, bg: e.target.value})}
                        style={{ width: 44, height: 40, border: "none", borderRadius: 8, cursor: "pointer", padding: 0 }} />
                      <input type="text" value={theme.bg} onChange={e => onThemeChange({...theme, bg: e.target.value})} style={{ ...inputStyle, flex: 1 }} />
                    </div>
                  </div>
                )}

                {/* DÉGRADÉ */}
                {bgMode==="gradient" && (
                  <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                    <label style={{ color: MUTED, fontSize: 10, textTransform: "uppercase" as const, letterSpacing: 1.5 }}>Dégradé linéaire</label>
                    <div style={{ height: 50, borderRadius: 10, background: theme.bgGradient||"linear-gradient(135deg,#080808,#1a1a08)", border: "1px solid rgba(255,255,255,0.1)" }} />
                    {[
                      { label: "Couleur 1", key: "grad_c1", default: "#080808" },
                      { label: "Couleur 2", key: "grad_c2", default: "#C9A84C" },
                      { label: "Couleur 3 (optionnel)", key: "grad_c3", default: "" },
                    ].map(({ label, key, default: def }) => (
                      <div key={key}>
                        <label style={{ color: MUTED, fontSize: 10, display: "block", marginBottom: 4 }}>{label}</label>
                        <div style={{ display: "flex", gap: 7 }}>
                          <input type="color" value={(theme as any)[key]||def||"#080808"} onChange={e => {
                            const t2 = {...theme, [key]: e.target.value}
                            const c1 = (t2 as any).grad_c1||"#080808"
                            const c2 = (t2 as any).grad_c2||"#C9A84C"
                            const c3 = (t2 as any).grad_c3
                            const angle = (t2 as any).grad_angle||135
                            onThemeChange({...t2, bgGradient: `linear-gradient(${angle}deg,${c1},${c2}${c3?`,${c3}`:""})` } as any)
                          }} style={{ width: 34, height: 32, border: "none", borderRadius: 6, cursor: "pointer", padding: 0 }} />
                          <input type="text" value={(theme as any)[key]||""} onChange={e => onThemeChange({...theme, [key]: e.target.value} as any)}
                            placeholder={def} style={{ ...inputStyle, flex: 1 }} />
                        </div>
                      </div>
                    ))}
                    <div>
                      <label style={{ color: MUTED, fontSize: 10, display: "block", marginBottom: 4 }}>Angle: {(theme as any).grad_angle||135}°</label>
                      <input type="range" min="0" max="360" value={(theme as any).grad_angle||135}
                        onChange={e => {
                          const angle = parseInt(e.target.value)
                          const c1 = (theme as any).grad_c1||theme.bg||"#080808"
                          const c2 = (theme as any).grad_c2||"#C9A84C"
                          const c3 = (theme as any).grad_c3
                          onThemeChange({...theme, grad_angle: angle, bgGradient: `linear-gradient(${angle}deg,${c1},${c2}${c3?`,${c3}`:""})` } as any)
                        }}
                        style={{ width: "100%", accentColor: G }} />
                    </div>
                    <label style={{ color: MUTED, fontSize: 10, textTransform: "uppercase" as const, letterSpacing: 1.5, marginTop: 4 }}>Presets rapides</label>
                    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                      {[
                        "linear-gradient(135deg,#080808,#1a1a08)",
                        "linear-gradient(135deg,#020B18,#0A1628)",
                        "linear-gradient(135deg,#0D0A1A,#1A0D2E)",
                        "linear-gradient(135deg,#0A1A0E,#0F2414)",
                        "linear-gradient(135deg,#1A0A00,#2D1500)",
                        "linear-gradient(135deg,#FAFAFA,#F0F0F0)",
                        "linear-gradient(135deg,#0A0F1E,#1A0A28)",
                        "linear-gradient(160deg,#080808,#1A0010)",
                      ].map((g, i) => (
                        <button key={i} onClick={() => onThemeChange({...theme, bgGradient: g, bgMode: "gradient"} as any)}
                          style={{ height: 32, background: g, border: `2px solid ${theme.bgGradient===g ? G : "rgba(255,255,255,0.08)"}`, borderRadius: 8, cursor: "pointer", position: "relative" }}>
                          {theme.bgGradient===g && <Check size={11} color={G} style={{ position: "absolute", right: 8, top: "50%", transform: "translateY(-50%)" }} />}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* DÉGRADÉ RADIAL */}
                {bgMode==="radial" && (
                  <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                    <label style={{ color: MUTED, fontSize: 10, textTransform: "uppercase" as const, letterSpacing: 1.5 }}>Dégradé radial</label>
                    {/* Preview */}
                    <div style={{ height: 80, borderRadius: 10, background: `radial-gradient(circle at ${(theme as any).radial_x||50}% ${(theme as any).radial_y||50}%, ${(theme as any).radial_c1||"#C9A84C"}, ${(theme as any).radial_c2||"#080808"}${(theme as any).radial_c3 ? `, ${(theme as any).radial_c3}` : ""})`, border: "1px solid rgba(255,255,255,0.1)" }} />
                    {/* Couleurs */}
                    {[
                      { label: "Couleur centre", key: "radial_c1", default: "#C9A84C" },
                      { label: "Couleur milieu", key: "radial_c2", default: "#1A1A1A" },
                      { label: "Couleur bord (opt.)", key: "radial_c3", default: "" },
                    ].map(({ label, key, default: def }) => (
                      <div key={key}>
                        <label style={{ color: MUTED, fontSize: 10, display: "block", marginBottom: 4 }}>{label}</label>
                        <div style={{ display: "flex", gap: 7 }}>
                          <input type="color" value={(theme as any)[key]||def||"#080808"}
                            onChange={e => {
                              const t2 = {...theme, [key]: e.target.value}
                              const c1 = (t2 as any).radial_c1||"#C9A84C"
                              const c2 = (t2 as any).radial_c2||"#080808"
                              const c3 = (t2 as any).radial_c3
                              const x = (t2 as any).radial_x||50
                              const y = (t2 as any).radial_y||50
                              onThemeChange({...t2, bgGradient: `radial-gradient(circle at ${x}% ${y}%, ${c1}, ${c2}${c3?`, ${c3}`:""})`} as any)
                            }}
                            style={{ width: 34, height: 32, border: "none", borderRadius: 6, cursor: "pointer", padding: 0 }} />
                          <input type="text" value={(theme as any)[key]||""}
                            onChange={e => onThemeChange({...theme, [key]: e.target.value} as any)}
                            placeholder={def} style={{ ...inputStyle, flex: 1 }} />
                        </div>
                      </div>
                    ))}
                    {/* Position du centre */}
                    <div style={{ display: "flex", gap: 10 }}>
                      <div style={{ flex: 1 }}>
                        <label style={{ color: MUTED, fontSize: 10, display: "block", marginBottom: 4 }}>Centre X: {(theme as any).radial_x||50}%</label>
                        <input type="range" min="0" max="100" value={(theme as any).radial_x||50}
                          onChange={e => {
                            const x = parseInt(e.target.value)
                            const c1 = (theme as any).radial_c1||"#C9A84C"
                            const c2 = (theme as any).radial_c2||"#080808"
                            const c3 = (theme as any).radial_c3
                            const y = (theme as any).radial_y||50
                            onThemeChange({...theme, radial_x: x, bgGradient: `radial-gradient(circle at ${x}% ${y}%, ${c1}, ${c2}${c3?`, ${c3}`:""})`} as any)
                          }}
                          style={{ width: "100%", accentColor: G }} />
                      </div>
                      <div style={{ flex: 1 }}>
                        <label style={{ color: MUTED, fontSize: 10, display: "block", marginBottom: 4 }}>Centre Y: {(theme as any).radial_y||50}%</label>
                        <input type="range" min="0" max="100" value={(theme as any).radial_y||50}
                          onChange={e => {
                            const y = parseInt(e.target.value)
                            const c1 = (theme as any).radial_c1||"#C9A84C"
                            const c2 = (theme as any).radial_c2||"#080808"
                            const c3 = (theme as any).radial_c3
                            const x = (theme as any).radial_x||50
                            onThemeChange({...theme, radial_y: y, bgGradient: `radial-gradient(circle at ${x}% ${y}%, ${c1}, ${c2}${c3?`, ${c3}`:""})`} as any)
                          }}
                          style={{ width: "100%", accentColor: G }} />
                      </div>
                    </div>
                    {/* Type de forme */}
                    <div style={{ display: "flex", gap: 6 }}>
                      {["circle", "ellipse"].map(shape => (
                        <button key={shape} onClick={() => {
                          const c1 = (theme as any).radial_c1||"#C9A84C"
                          const c2 = (theme as any).radial_c2||"#080808"
                          const c3 = (theme as any).radial_c3
                          const x = (theme as any).radial_x||50
                          const y = (theme as any).radial_y||50
                          onThemeChange({...theme, radial_shape: shape, bgGradient: `radial-gradient(${shape} at ${x}% ${y}%, ${c1}, ${c2}${c3?`, ${c3}`:""})`} as any)
                        }}
                        style={{ flex: 1, padding: "6px", background: ((theme as any).radial_shape||"circle")===shape ? G+"15" : "rgba(255,255,255,0.04)", border: `1px solid ${((theme as any).radial_shape||"circle")===shape ? G+"40" : "rgba(255,255,255,0.08)"}`, borderRadius: 8, color: ((theme as any).radial_shape||"circle")===shape ? G : MUTED, fontSize: 10, cursor: "pointer" }}>
                          {shape === "circle" ? "⭕ Cercle" : "🔵 Ellipse"}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* MESH */}
                {bgMode==="mesh" && (
                  <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                    <label style={{ color: MUTED, fontSize: 10, textTransform: "uppercase" as const, letterSpacing: 1.5 }}>Dégradé Mesh</label>
                    <div style={{ height: 60, borderRadius: 10, background: `radial-gradient(ellipse at 0% 0%, ${(theme as any).mesh_c1||"#C9A84C"}80, transparent 50%), radial-gradient(ellipse at 100% 100%, ${(theme as any).mesh_c2||"var(--success)"}80, transparent 50%), radial-gradient(ellipse at 100% 0%, ${(theme as any).mesh_c3||"#7B2FBE"}60, transparent 50%), ${theme.bg}`, border: "1px solid rgba(255,255,255,0.1)", filter: `blur(${Math.round(((theme as any).mesh_blur||40)/5)}px)`, overflow: "hidden" }} />
                    {[
                      { label: "Couleur 1", key: "mesh_c1", default: "#C9A84C" },
                      { label: "Couleur 2", key: "mesh_c2", default: "var(--success)" },
                      { label: "Couleur 3", key: "mesh_c3", default: "#7B2FBE" },
                    ].map(({ label, key, default: def }) => (
                      <div key={key} style={{ display: "flex", gap: 7, alignItems: "center" }}>
                        <input type="color" value={(theme as any)[key]||def} onChange={e => onThemeChange({...theme, [key]: e.target.value} as any)}
                          style={{ width: 34, height: 32, border: "none", borderRadius: 6, cursor: "pointer", padding: 0 }} />
                        <span style={{ color: MUTED, fontSize: 11 }}>{label}</span>
                      </div>
                    ))}
                    <div>
                      <label style={{ color: MUTED, fontSize: 10, display: "block", marginBottom: 4 }}>Flou: {(theme as any).mesh_blur||40}px</label>
                      <input type="range" min="0" max="100" value={(theme as any).mesh_blur||40}
                        onChange={e => onThemeChange({...theme, mesh_blur: parseInt(e.target.value)} as any)}
                        style={{ width: "100%", accentColor: G }} />
                    </div>
                  </div>
                )}

                {/* MOTIF */}
                {bgMode==="pattern" && (
                  <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                    <label style={{ color: MUTED, fontSize: 10, textTransform: "uppercase" as const, letterSpacing: 1.5 }}>Motif</label>
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(5,1fr)", gap: 5 }}>
                      {PATTERNS_LIST.map(p => (
                        <button key={p.id} onClick={() => { setPatternType(p.id); onThemeChange({...theme, bgPattern: p.id} as any) }}
                          style={{ padding: "8px 4px", background: patternType===p.id ? G+"15" : "rgba(255,255,255,0.03)", border: `1.5px solid ${patternType===p.id ? G+"50" : "rgba(255,255,255,0.08)"}`, borderRadius: 8, cursor: "pointer", color: patternType===p.id ? G : MUTED, fontSize: 9, display: "flex", flexDirection: "column", alignItems: "center", gap: 3 }}>
                          <span style={{ fontSize: 16 }}>{p.icon}</span>
                          <span>{p.label}</span>
                        </button>
                      ))}
                    </div>
                    <div>
                      <label style={{ color: MUTED, fontSize: 10, display: "block", marginBottom: 4 }}>Taille: {(theme as any).pattern_size||20}px</label>
                      <input type="range" min="5" max="80" value={(theme as any).pattern_size||20} onChange={e => onThemeChange({...theme, pattern_size: parseInt(e.target.value)} as any)} style={{ width: "100%", accentColor: G }} />
                    </div>
                    <div>
                      <label style={{ color: MUTED, fontSize: 10, display: "block", marginBottom: 4 }}>Opacité: {Math.round(((theme as any).pattern_opacity||0.15)*100)}%</label>
                      <input type="range" min="1" max="100" value={Math.round(((theme as any).pattern_opacity||0.15)*100)} onChange={e => onThemeChange({...theme, pattern_opacity: parseInt(e.target.value)/100} as any)} style={{ width: "100%", accentColor: G }} />
                    </div>
                    <div style={{ display: "flex", gap: 7, alignItems: "center" }}>
                      <input type="color" value={(theme as any).pattern_color||"#C9A84C"} onChange={e => onThemeChange({...theme, pattern_color: e.target.value} as any)} style={{ width: 34, height: 32, border: "none", borderRadius: 6, cursor: "pointer", padding: 0 }} />
                      <span style={{ color: MUTED, fontSize: 11 }}>Couleur du motif</span>
                    </div>
                    <div style={{ height: 50, borderRadius: 8, background: theme.bg, backgroundImage: getPatternCSS(patternType, (theme as any).pattern_color||"#C9A84C", (theme as any).pattern_size||20, (theme as any).pattern_opacity||0.15), backgroundSize: `${(theme as any).pattern_size||20}px ${(theme as any).pattern_size||20}px`, border: "1px solid rgba(255,255,255,0.08)" }} />
                  </div>
                )}

                {/* IMAGE */}
                {bgMode==="image" && (
                  <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                    <label style={{ color: MUTED, fontSize: 10, textTransform: "uppercase" as const, letterSpacing: 1.5 }}>Image de fond</label>
                    {/* Upload fichier */}
                    <label style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, height: 48, background: "rgba(201,168,76,0.08)", border: "1.5px dashed rgba(201,168,76,0.3)", borderRadius: 10, cursor: "pointer", color: G, fontSize: 12, fontWeight: 600 }}>
                      <span>📁</span> Choisir une image
                      <input type="file" accept="image/*" style={{ display: "none" }} onChange={e => {
                        const file = e.target.files?.[0]
                        if (file) {
                          const reader = new FileReader()
                          reader.onload = ev => onThemeChange({...theme, bgImage: ev.target?.result as string, bgMode: "image"} as any)
                          reader.readAsDataURL(file)
                        }
                      }} />
                    </label>
                    {/* OU lien URL */}
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <div style={{ flex: 1, height: 1, background: "rgba(255,255,255,0.1)" }} />
                      <span style={{ color: MUTED, fontSize: 10 }}>ou URL</span>
                      <div style={{ flex: 1, height: 1, background: "rgba(255,255,255,0.1)" }} />
                    </div>
                    <input type="url" value={(theme as any).bgImage?.startsWith("data:") ? "" : (theme as any).bgImage||""} onChange={e => onThemeChange({...theme, bgImage: e.target.value} as any)}
                      placeholder="https://..." style={{ ...inputStyle }} />
                    {(theme as any).bgImage && (
                      <div style={{ position: "relative" }}>
                        <img src={(theme as any).bgImage} alt="" style={{ width: "100%", height: 80, objectFit: "cover", borderRadius: 8, display: "block" }} />
                        <button onClick={() => onThemeChange({...theme, bgImage: ""} as any)} style={{ position: "absolute", top: 4, right: 4, background: "rgba(0,0,0,0.7)", border: "none", borderRadius: "50%", width: 22, height: 22, color: "#fff", cursor: "pointer", fontSize: 12, display: "flex", alignItems: "center", justifyContent: "center" }}>×</button>
                      </div>
                    )}
                    <div>
                      <label style={{ color: MUTED, fontSize: 10, display: "block", marginBottom: 6 }}>Taille & position</label>
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
                        {[
                          { val: "cover", label: "Cover", icon: "⬛", desc: "Remplit tout" },
                          { val: "contain", label: "Contain", icon: "🔲", desc: "Affiche tout" },
                          { val: "repeat", label: "Mosaïque", icon: "⊞", desc: "Répète" },
                          { val: "auto", label: "Auto", icon: "⬜", desc: "Taille réelle" },
                        ].map(({ val, label, icon, desc }) => (
                          <button key={val} onClick={() => onThemeChange({...theme, bgImageSize: val} as any)}
                            style={{ padding: "7px", background: ((theme as any).bgImageSize||"cover")===val ? G+"15" : "rgba(255,255,255,0.04)", border: `1px solid ${((theme as any).bgImageSize||"cover")===val ? G+"40" : "rgba(255,255,255,0.08)"}`, borderRadius: 8, cursor: "pointer", color: ((theme as any).bgImageSize||"cover")===val ? G : MUTED, fontSize: 10, textAlign: "left" as const }}>
                            <div style={{ fontSize: 14, marginBottom: 2 }}>{icon}</div>
                            <div style={{ fontWeight: 600 }}>{label}</div>
                            <div style={{ fontSize: 8, opacity: 0.7 }}>{desc}</div>
                          </button>
                        ))}
                      </div>
                    </div>
                    <div>
                      <label style={{ color: MUTED, fontSize: 10, display: "block", marginBottom: 4 }}>Overlay: {Math.round(((theme as any).bgOverlayOpacity||0.5)*100)}%</label>
                      <input type="range" min="0" max="100" value={Math.round(((theme as any).bgOverlayOpacity||0.5)*100)} onChange={e => onThemeChange({...theme, bgOverlayOpacity: parseInt(e.target.value)/100} as any)} style={{ width: "100%", accentColor: G }} />
                    </div>
                    <div>
                      <label style={{ color: MUTED, fontSize: 10, display: "block", marginBottom: 4 }}>Flou: {(theme as any).bgBlur||0}px</label>
                      <input type="range" min="0" max="20" value={(theme as any).bgBlur||0} onChange={e => onThemeChange({...theme, bgBlur: parseInt(e.target.value)} as any)} style={{ width: "100%", accentColor: G }} />
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* EFFETS */}
            {bgSubTab==="effects" && (
              <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                {/* Preview fond actuel avec effets */}
                <div style={{ position: "relative", height: 80, borderRadius: 12, overflow: "hidden", border: "1px solid rgba(255,255,255,0.1)", marginBottom: 4 }}>
                  <div style={{ position: "absolute", inset: 0, background: theme.bgGradient||theme.bg }} />
                  {effectNoise && <div style={{ position: "absolute", inset: 0, background: "rgba(128,128,128,0.15)", opacity: 0.2, mixBlendMode: "overlay" as const }} />}
                  {effectGlow && <div style={{ position: "absolute", inset: 0, background: `radial-gradient(circle at 50% 50%, ${(theme as any).glow_color||G}${Math.round(((theme as any).glow_intensity||30)/100*255).toString(16).padStart(2,"0")}, transparent ${(theme as any).glow_size||200}px)` }} />}
                  {effectVignette && <div style={{ position: "absolute", inset: 0, background: `radial-gradient(ellipse at center, transparent ${100-(theme as any).vignette_intensity||60}%, rgba(0,0,0,0.8) 100%)` }} />}
                  <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <p style={{ color: "rgba(255,255,255,0.4)", fontSize: 10, margin: 0, letterSpacing: 2, textTransform: "uppercase" as const }}>Aperçu des effets</p>
                  </div>
                </div>
                {/* Noise */}
                <div style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 12, padding: "12px 14px" }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: (theme as any).effect_noise ? 10 : 0 }}>
                    <label style={{ color: "#F5F0E8", fontSize: 12, fontWeight: 600 }}>🌫️ Noise</label>
                    <button onClick={() => onThemeChange({...theme, effect_noise: !(theme as any).effect_noise} as any)} style={{ width: 36, height: 20, borderRadius: 10, background: (theme as any).effect_noise ? G : "rgba(255,255,255,0.15)", border: "none", cursor: "pointer", position: "relative", transition: "background 0.2s" }}>
                      <div style={{ width: 16, height: 16, borderRadius: "50%", background: "#fff", position: "absolute", top: 2, left: (theme as any).effect_noise ? 18 : 2, transition: "left 0.2s" }} />
                    </button>
                  </div>
                  {(theme as any).effect_noise && (
                    <div>
                      <label style={{ color: MUTED, fontSize: 10, display: "block", marginBottom: 4 }}>Opacité: {(theme as any).noise_opacity||20}%</label>
                      <input type="range" min="1" max="80" value={(theme as any).noise_opacity||20} onChange={e => onThemeChange({...theme, noise_opacity: parseInt(e.target.value)} as any)} style={{ width: "100%", accentColor: G }} />
                    </div>
                  )}
                </div>

                {/* Glow */}
                <div style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 12, padding: "12px 14px" }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: (theme as any).effect_glow ? 10 : 0 }}>
                    <label style={{ color: "#F5F0E8", fontSize: 12, fontWeight: 600 }}>✨ Glow</label>
                    <button onClick={() => onThemeChange({...theme, effect_glow: !(theme as any).effect_glow} as any)} style={{ width: 36, height: 20, borderRadius: 10, background: (theme as any).effect_glow ? G : "rgba(255,255,255,0.15)", border: "none", cursor: "pointer", position: "relative", transition: "background 0.2s" }}>
                      <div style={{ width: 16, height: 16, borderRadius: "50%", background: "#fff", position: "absolute", top: 2, left: (theme as any).effect_glow ? 18 : 2, transition: "left 0.2s" }} />
                    </button>
                  </div>
                  {(theme as any).effect_glow && (
                    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                      <div style={{ display: "flex", gap: 7, alignItems: "center" }}>
                        <input type="color" value={(theme as any).glow_color||G} onChange={e => onThemeChange({...theme, glow_color: e.target.value} as any)} style={{ width: 34, height: 32, border: "none", borderRadius: 6, cursor: "pointer", padding: 0 }} />
                        <span style={{ color: MUTED, fontSize: 11 }}>Couleur</span>
                      </div>
                      <div>
                        <label style={{ color: MUTED, fontSize: 10, display: "block", marginBottom: 4 }}>Intensité: {(theme as any).glow_intensity||30}%</label>
                        <input type="range" min="5" max="100" value={(theme as any).glow_intensity||30} onChange={e => onThemeChange({...theme, glow_intensity: parseInt(e.target.value)} as any)} style={{ width: "100%", accentColor: G }} />
                      </div>
                      <div>
                        <label style={{ color: MUTED, fontSize: 10, display: "block", marginBottom: 4 }}>Taille: {(theme as any).glow_size||200}px</label>
                        <input type="range" min="50" max="600" value={(theme as any).glow_size||200} onChange={e => onThemeChange({...theme, glow_size: parseInt(e.target.value)} as any)} style={{ width: "100%", accentColor: G }} />
                      </div>
                    </div>
                  )}
                </div>

                {/* Vignette */}
                <div style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 12, padding: "12px 14px" }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: (theme as any).effect_vignette ? 10 : 0 }}>
                    <label style={{ color: "#F5F0E8", fontSize: 12, fontWeight: 600 }}>🌑 Vignette</label>
                    <button onClick={() => onThemeChange({...theme, effect_vignette: !(theme as any).effect_vignette} as any)} style={{ width: 36, height: 20, borderRadius: 10, background: (theme as any).effect_vignette ? G : "rgba(255,255,255,0.15)", border: "none", cursor: "pointer", position: "relative", transition: "background 0.2s" }}>
                      <div style={{ width: 16, height: 16, borderRadius: "50%", background: "#fff", position: "absolute", top: 2, left: (theme as any).effect_vignette ? 18 : 2, transition: "left 0.2s" }} />
                    </button>
                  </div>
                  {(theme as any).effect_vignette && (
                    <div>
                      <label style={{ color: MUTED, fontSize: 10, display: "block", marginBottom: 4 }}>Intensité: {(theme as any).vignette_intensity||40}%</label>
                      <input type="range" min="5" max="100" value={(theme as any).vignette_intensity||40} onChange={e => onThemeChange({...theme, vignette_intensity: parseInt(e.target.value)} as any)} style={{ width: "100%", accentColor: G }} />
                    </div>
                  )}
                </div>

                {/* Overlay couleur */}
                <div style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 12, padding: "12px 14px" }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: (theme as any).effect_overlay ? 10 : 0 }}>
                    <label style={{ color: "#F5F0E8", fontSize: 12, fontWeight: 600 }}>🎨 Overlay</label>
                    <button onClick={() => onThemeChange({...theme, effect_overlay: !(theme as any).effect_overlay} as any)}
                      style={{ width: 36, height: 20, borderRadius: 10, background: (theme as any).effect_overlay ? G : "rgba(255,255,255,0.15)", border: "none", cursor: "pointer", position: "relative", transition: "background 0.2s" }}>
                      <div style={{ width: 16, height: 16, borderRadius: "50%", background: "#fff", position: "absolute", top: 2, left: (theme as any).effect_overlay ? 18 : 2, transition: "left 0.2s" }} />
                    </button>
                  </div>
                  {(theme as any).effect_overlay && (
                    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                      <div style={{ display: "flex", gap: 7, alignItems: "center" }}>
                        <input type="color" value={(theme as any).overlay_color||"#000000"}
                          onChange={e => onThemeChange({...theme, overlay_color: e.target.value} as any)}
                          style={{ width: 34, height: 32, border: "none", borderRadius: 6, cursor: "pointer", padding: 0 }} />
                        <span style={{ color: MUTED, fontSize: 11 }}>Couleur de l overlay</span>
                      </div>
                      <div>
                        <label style={{ color: MUTED, fontSize: 10, display: "block", marginBottom: 4 }}>Opacité: {(theme as any).overlay_opacity||30}%</label>
                        <input type="range" min="1" max="90" value={(theme as any).overlay_opacity||30}
                          onChange={e => onThemeChange({...theme, overlay_opacity: parseInt(e.target.value)} as any)}
                          style={{ width: "100%", accentColor: G }} />
                      </div>
                    </div>
                  )}
                </div>

                {/* Blur global */}
                <div style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 12, padding: "12px 14px" }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: (theme as any).effect_blur ? 10 : 0 }}>
                    <label style={{ color: "#F5F0E8", fontSize: 12, fontWeight: 600 }}>💧 Blur</label>
                    <button onClick={() => onThemeChange({...theme, effect_blur: !(theme as any).effect_blur} as any)}
                      style={{ width: 36, height: 20, borderRadius: 10, background: (theme as any).effect_blur ? G : "rgba(255,255,255,0.15)", border: "none", cursor: "pointer", position: "relative", transition: "background 0.2s" }}>
                      <div style={{ width: 16, height: 16, borderRadius: "50%", background: "#fff", position: "absolute", top: 2, left: (theme as any).effect_blur ? 18 : 2, transition: "left 0.2s" }} />
                    </button>
                  </div>
                  {(theme as any).effect_blur && (
                    <div>
                      <label style={{ color: MUTED, fontSize: 10, display: "block", marginBottom: 4 }}>Intensité: {(theme as any).blur_amount||4}px</label>
                      <input type="range" min="1" max="20" value={(theme as any).blur_amount||4}
                        onChange={e => onThemeChange({...theme, blur_amount: parseInt(e.target.value)} as any)}
                        style={{ width: "100%", accentColor: G }} />
                      <p style={{ color: MUTED, fontSize: 9, margin: "5px 0 0" }}>⚠ S applique au fond — les blocs restent nets</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* ANIMATION */}
            {bgSubTab==="animation" && (
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {/* Preview animation */}
                <div style={{ position: "relative", height: 80, borderRadius: 12, overflow: "hidden", border: "1px solid rgba(255,255,255,0.1)", marginBottom: 4 }}>
                  <div style={{
                    position: "absolute", inset: 0,
                    background: animation==="aurora"
                      ? `radial-gradient(ellipse at 20% 50%, ${theme.primary}40, transparent 50%), radial-gradient(ellipse at 80% 20%, ${theme.accent||"var(--success)"}30, transparent 50%), ${theme.bgGradient||theme.bg}`
                      : theme.bgGradient||theme.bg,
                    animation: animation==="gradient-flow" ? `gradientShift ${(theme as any).anim_speed||8}s ease infinite` : animation==="aurora" ? `auroraShift ${(theme as any).anim_speed||12}s ease infinite` : "none",
                    backgroundSize: "200% 200%",
                  }} />
                  <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <p style={{ color: "rgba(255,255,255,0.5)", fontSize: 10, margin: 0, letterSpacing: 2, textTransform: "uppercase" as const }}>
                      {animation==="none" ? "Statique" : animation==="gradient-flow" ? "🌊 Gradient Flow" : animation==="aurora" ? "🌌 Aurora" : animation}
                    </p>
                  </div>
                </div>
                <label style={{ color: MUTED, fontSize: 10, textTransform: "uppercase" as const, letterSpacing: 1.5 }}>Animation de fond</label>
                {[
                  { id: "none", label: "Statique", desc: "Aucune animation", icon: "⏸" },
                  { id: "gradient-flow", label: "Gradient Flow", desc: "Dégradé animé lent", icon: "🌊" },
                  { id: "aurora", label: "Aurora", desc: "Effet Stripe Aurora", icon: "🌌" },
                  { id: "pulse", label: "Pulse", desc: "Pulsation douce", icon: "💫", soon: true },
                  { id: "wave", label: "Wave", desc: "Vagues animées", icon: "〰", soon: true },
                ].map(({ id, label, desc, icon, soon }) => (
                  <button key={id} onClick={() => { if (!soon) { setAnimation(id); onThemeChange({...theme, bgAnimation: id} as any) } }}
                    style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 14px", background: animation===id ? G+"10" : "rgba(255,255,255,0.03)", border: `1.5px solid ${animation===id ? G+"40" : "rgba(255,255,255,0.07)"}`, borderRadius: 11, cursor: soon ? "not-allowed" : "pointer", opacity: soon ? 0.5 : 1 }}>
                    <span style={{ fontSize: 22, flexShrink: 0 }}>{icon}</span>
                    <div style={{ flex: 1, textAlign: "left" }}>
                      <p style={{ color: animation===id ? G : "#F5F0E8", fontSize: 12, fontWeight: 700, margin: "0 0 2px" }}>{label} {soon && <span style={{ color: MUTED, fontSize: 9, fontWeight: 400 }}>— Bientôt</span>}</p>
                      <p style={{ color: MUTED, fontSize: 10, margin: 0 }}>{desc}</p>
                    </div>
                    {animation===id && <Check size={13} color={G} style={{ flexShrink: 0 }} />}
                  </button>
                ))}
                {animation==="gradient-flow" && (
                  <div style={{ marginTop: 6 }}>
                    <label style={{ color: MUTED, fontSize: 10, display: "block", marginBottom: 4 }}>Vitesse: {(theme as any).anim_speed||8}s</label>
                    <input type="range" min="2" max="30" value={(theme as any).anim_speed||8} onChange={e => onThemeChange({...theme, anim_speed: parseInt(e.target.value)} as any)} style={{ width: "100%", accentColor: G }} />
                  </div>
                )}
                {animation==="aurora" && (
                  <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 6 }}>
                    <div>
                      <label style={{ color: MUTED, fontSize: 10, display: "block", marginBottom: 4 }}>Vitesse: {(theme as any).anim_speed||12}s</label>
                      <input type="range" min="4" max="40" value={(theme as any).anim_speed||12} onChange={e => onThemeChange({...theme, anim_speed: parseInt(e.target.value)} as any)} style={{ width: "100%", accentColor: G }} />
                    </div>
                    <div>
                      <label style={{ color: MUTED, fontSize: 10, display: "block", marginBottom: 4 }}>Intensité: {(theme as any).anim_intensity||60}%</label>
                      <input type="range" min="10" max="100" value={(theme as any).anim_intensity||60} onChange={e => onThemeChange({...theme, anim_intensity: parseInt(e.target.value)} as any)} style={{ width: "100%", accentColor: G }} />
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* AVANCÉ */}
            {bgSubTab==="advanced" && (
              <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                <div>
                  <label style={{ color: MUTED, fontSize: 10, display: "block", marginBottom: 6, textTransform: "uppercase" as const, letterSpacing: 1.5 }}>CSS personnalisé</label>
                  <textarea value={(theme as any).customCSS||""} onChange={e => onThemeChange({...theme, bgGradient: e.target.value, customCSS: e.target.value} as any)}
                    placeholder={"linear-gradient(135deg, #080808, #1a1a08)\n\n/* Ou tout CSS valide pour 'background' */"}
                    rows={5}
                    style={{ ...inputStyle, resize: "vertical" as const, lineHeight: 1.6 }} />
                </div>
                <div style={{ display: "flex", gap: 8 }}>
                  <button onClick={() => {
                    const style = { bg: theme.bg, bgGradient: theme.bgGradient, bgMode: (theme as any).bgMode, bgImage: (theme as any).bgImage }
                    navigator.clipboard.writeText(JSON.stringify(style, null, 2))
                    setCopiedStyle(true)
                    setTimeout(() => setCopiedStyle(false), 2000)
                  }} style={{ flex: 1, background: copiedStyle ? "var(--success)20" : "rgba(255,255,255,0.05)", border: `1px solid ${copiedStyle ? "var(--success)40" : "rgba(255,255,255,0.1)"}`, borderRadius: 9, padding: "10px", color: copiedStyle ? "var(--success)" : MUTED, fontSize: 11, fontWeight: 600, cursor: "pointer" }}>
                    {copiedStyle ? "✓ Copié !" : "📋 Copier le style"}
                  </button>
                  <button onClick={() => {
                    const input = prompt("Collez le JSON du style:")
                    if (input) {
                      try {
                        const parsed = JSON.parse(input)
                        onThemeChange({...theme, ...parsed} as any)
                      } catch { toast.error("JSON invalide") }
                    }
                  }} style={{ flex: 1, background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 9, padding: "10px", color: MUTED, fontSize: 11, fontWeight: 600, cursor: "pointer" }}>
                    📥 Importer
                  </button>
                </div>
                <button onClick={() => {
                  const exportData = {
                    background: { bg: theme.bg, bgGradient: theme.bgGradient, bgMode: (theme as any).bgMode, bgImage: (theme as any).bgImage },
                    effects: { noise: (theme as any).noise_opacity, glow: (theme as any).glow_color, vignette: (theme as any).vignette_intensity },
                    animation: { type: (theme as any).bgAnimation, speed: (theme as any).anim_speed }
                  }
                  const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: "application/json" })
                  const url = URL.createObjectURL(blob)
                  const a = document.createElement("a"); a.href = url; a.download = "qrfolio-style.json"; a.click()
                }} style={{ background: "rgba(201,168,76,0.08)", border: "1px solid rgba(201,168,76,0.2)", borderRadius: 9, padding: "10px", color: G, fontSize: 11, fontWeight: 600, cursor: "pointer" }}>
                  📤 Exporter le style complet
                </button>
                {/* Aperçu fond actuel */}
                <div>
                  <label style={{ color: MUTED, fontSize: 10, display: "block", marginBottom: 6 }}>Aperçu fond actuel</label>
                  <div style={{ height: 60, borderRadius: 10, background: theme.bgGradient || theme.bg, backgroundImage: (theme as any).bgMode==="pattern" ? getPatternCSS(patternType, (theme as any).pattern_color||G, (theme as any).pattern_size||20, (theme as any).pattern_opacity||0.15) : undefined, backgroundSize: (theme as any).bgMode==="pattern" ? `${(theme as any).pattern_size||20}px ${(theme as any).pattern_size||20}px` : undefined, border: "1px solid rgba(255,255,255,0.1)" }} />
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── ONGLET BLOCS (style global appliqué à tous les blocs) ── */}
        {themeTab==="blocks" && (() => {
          const bs = (theme.blockStyle || {}) as Record<string, any>
          const setBS = (key: string, val: any) => onThemeChange({ ...theme, blockStyle: { ...bs, [key]: val } } as any)
          const clearBS = () => { const t: any = { ...theme }; delete t.blockStyle; onThemeChange(t) }
          const rows = [
            { key: "__radius", label: "Coins arrondis", opts: BLOCK_RADIUS_OPTIONS, def: "Défaut" },
            { key: "__shadow", label: "Ombre", opts: BLOCK_SHADOW_OPTIONS, def: "Non" },
            { key: "__space",  label: "Espacement vertical", opts: BLOCK_SPACE_OPTIONS, def: "Défaut" },
          ]
          const hasStyle = Object.keys(bs).length > 0
          return (
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <p style={{ color: MUTED, fontSize: 11, margin: 0, lineHeight: 1.5 }}>
                Un style appliqué à <strong style={{ color: "#F5F0E8" }}>tous les blocs</strong> d&apos;un coup. Chaque bloc peut le surcharger dans son onglet <strong style={{ color: "#F5F0E8" }}>Style</strong>.
              </p>
              {rows.map(r => (
                <div key={r.key}>
                  <label style={{ color: MUTED, fontSize: 10, display: "block", marginBottom: 6, textTransform: "uppercase" as const, letterSpacing: 1.5 }}>{r.label}</label>
                  <Segmented value={String(bs[r.key] ?? r.def)} options={r.opts} onChange={v => setBS(r.key, v)} />
                </div>
              ))}
              {/* Avance masque par defaut : animation + effet verre (review #4 "options avancees trop tot") */}
              <button type="button" onClick={() => setThemeBlocksAdv(o => !o)}
                style={{ display: "flex", alignItems: "center", justifyContent: "space-between", width: "100%", background: "none", border: "none", cursor: "pointer", padding: "2px 0", color: MUTED, fontSize: 10, textTransform: "uppercase" as const, letterSpacing: 1.5, fontWeight: 700 }}>
                Avancé
                <ChevronDown size={14} style={{ transform: themeBlocksAdv ? "rotate(180deg)" : "none", transition: "transform .2s" }} />
              </button>
              {themeBlocksAdv && (<>
                <div>
                  <label style={{ color: MUTED, fontSize: 10, display: "block", marginBottom: 6, textTransform: "uppercase" as const, letterSpacing: 1.5 }}>Animation à l&apos;apparition</label>
                  <Segmented value={String(bs.__anim ?? "Aucune")} options={BLOCK_ANIM_OPTIONS} onChange={v => setBS("__anim", v)} />
                </div>
                <div>
                  <label style={{ color: MUTED, fontSize: 10, display: "block", marginBottom: 6, textTransform: "uppercase" as const, letterSpacing: 1.5 }}>Effet verre (flou)</label>
                  <Segmented value={bs.__glass ? "Oui" : "Non"} options={["Non", "Oui"]} onChange={v => setBS("__glass", v === "Oui")} />
                </div>
              </>)}
              {hasStyle && (
                <button onClick={clearBS}
                  style={{ marginTop: 2, background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 9, padding: "9px", color: MUTED, fontSize: 11, fontWeight: 600, cursor: "pointer" }}>
                  ↺ Réinitialiser le style des blocs
                </button>
              )}
              <p style={{ color: "#6E685E", fontSize: 9.5, margin: 0, lineHeight: 1.5 }}>
                Astuce : posez ici l&apos;ambiance générale (coins, ombre, animation), puis affinez au cas par cas dans chaque bloc.
              </p>
            </div>
          )
        })()}

        {/* ── ONGLET ANIMATION D'ENTRÉE (Pro+) ── */}
        {themeTab==="intro" && (() => {
          const canIntro = canPageIntro(userPlan)
          const enabled = !!(theme as any).intro_enabled
          const curStyle = (theme as any).intro_style || "reveal"
          const curDur = (theme as any).intro_duration || 2400
          // accent = primary (hexa fiable ; theme.accent peut valoir var(--success)).
          const introAccentHex = /^#[0-9a-fA-F]{3,8}$/.test(theme.primary) ? theme.primary : "#C9A84C"
          const setIntro = (patch: Partial<PageTheme>) => onThemeChange({ ...theme, ...patch })
          const STYLES_L: [string, string][] = [["reveal","Révélation"],["fade","Fondu"],["curtain","Rideau"],["pulse","Pulse"],["ring","Anneau"],["stack","Pile"],["zoom","Zoom"],["flip","Flip"],["slide","Glissé"],["corners","Coins QR"]]
          if (!canIntro) return (
            <div style={{ padding: "22px 16px", textAlign: "center", border: "1px solid color-mix(in srgb, var(--accent) 25%, transparent)", borderRadius: 12, background: "rgba(201,168,76,0.05)" }}>
              <div style={{ fontSize: 26, marginBottom: 8 }}>✨</div>
              <p style={{ color: "#F5F0E8", fontSize: 13, fontWeight: 700, margin: "0 0 5px" }}>Animation d&apos;entrée</p>
              <p style={{ color: MUTED, fontSize: 11.5, margin: "0 0 14px", lineHeight: 1.5 }}>Une courte animation aux couleurs de ta page accueille tes visiteurs. Réservé au plan <b style={{ color: G }}>Pro</b> et plus.</p>
              <a href="/upgrade" style={{ display: "inline-block", background: G, color: "#080808", fontSize: 12, fontWeight: 700, padding: "9px 20px", borderRadius: 9, textDecoration: "none" }}>Passer Pro</a>
            </div>
          )
          return (
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <label style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, cursor: "pointer" }}>
                <span style={{ color: "#F5F0E8", fontSize: 12.5, fontWeight: 600 }}>Activer l&apos;animation d&apos;entrée</span>
                <button onClick={() => setIntro({ intro_enabled: !enabled })}
                  style={{ width: 40, height: 23, borderRadius: 12, border: "none", cursor: "pointer", background: enabled ? G : "rgba(255,255,255,0.12)", position: "relative", transition: "background 0.2s", flexShrink: 0 }}>
                  <span style={{ position: "absolute", top: 3, left: enabled ? 20 : 3, width: 17, height: 17, borderRadius: "50%", background: "#fff", transition: "left 0.2s" }} />
                </button>
              </label>
              {enabled && (<>
                <div>
                  <p style={{ color: MUTED, fontSize: 10.5, textTransform: "uppercase", letterSpacing: 1, margin: "0 0 7px" }}>Style</p>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 6 }}>
                    {STYLES_L.map(([id, label]) => (
                      <button key={id} onClick={() => setIntro({ intro_style: id })}
                        style={{ padding: "9px 4px", borderRadius: 9, border: `1px solid ${curStyle===id ? G : "rgba(255,255,255,0.1)"}`, background: curStyle===id ? "color-mix(in srgb, var(--accent) 12%, transparent)" : "rgba(255,255,255,0.02)", color: curStyle===id ? G : MUTED, fontSize: 11, fontWeight: curStyle===id ? 700 : 500, cursor: "pointer" }}>
                        {label}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <div style={{ display: "flex", justifyContent: "space-between", color: MUTED, fontSize: 10.5, textTransform: "uppercase", letterSpacing: 1, marginBottom: 6 }}>
                    <span>Durée</span><span style={{ color: G }}>{(curDur / 1000).toFixed(1)} s</span>
                  </div>
                  <input type="range" min={800} max={3000} step={100} value={curDur} onChange={e => setIntro({ intro_duration: parseInt(e.target.value, 10) })} style={{ width: "100%", accentColor: G }} />
                </div>
                <div>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                    <span style={{ color: MUTED, fontSize: 10.5, textTransform: "uppercase", letterSpacing: 1 }}>Aperçu</span>
                    <button onClick={() => setIntroReplay(r => r + 1)}
                      style={{ background: "rgba(255,255,255,0.05)", border: `1px solid ${G}55`, borderRadius: 8, color: G, fontSize: 11, fontWeight: 600, padding: "5px 11px", cursor: "pointer" }}>
                      ▶ Rejouer
                    </button>
                  </div>
                  <div ref={introPreviewRef} style={{ position: "relative", width: "100%", height: 300, borderRadius: 14, overflow: "hidden", border: "1px solid rgba(255,255,255,0.08)", background: theme.bg }}>
                    {/* Faux contenu de page derrière — pour juger la transition de révélation. */}
                    <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", gap: 9, padding: "40px 18px" }}>
                      <div style={{ width: 54, height: 54, borderRadius: 15, background: introAccentHex, flexShrink: 0, overflow: "hidden", display: "grid", placeItems: "center", color: "#fff", fontSize: 22, fontWeight: 600 }}>
                        {previewAvatar ? <img src={previewAvatar} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : (String(previewName || "?").trim().charAt(0) || "?").toUpperCase()}
                      </div>
                      <div style={{ width: 96, height: 12, borderRadius: 6, background: theme.text, opacity: 0.9 }} />
                      <div style={{ width: 64, height: 7, borderRadius: 5, background: theme.text, opacity: 0.35 }} />
                      {[0, 1, 2].map(i => <div key={i} style={{ width: "88%", height: 32, borderRadius: 10, border: `1px solid ${theme.text}18` }} />)}
                    </div>
                    <PageIntro
                      style={curStyle as any}
                      accent={introAccentHex}
                      bg={theme.bg}
                      text={theme.text}
                      title={previewName || "Votre nom"}
                      avatar={previewAvatar || ""}
                      duration={curDur}
                      oncePerSession={false}
                      containerRef={introPreviewRef}
                      replayKey={introReplay + 1}
                    />
                  </div>
                </div>
                <p style={{ color: "#6E685E", fontSize: 9.5, margin: 0, lineHeight: 1.5 }}>
                  L&apos;animation reprend l&apos;accent, le fond et le nom de ta page. Elle ne joue qu&apos;une fois par session visiteur et se passe au toucher.
                </p>
              </>)}
            </div>
          )
        })()}
      </div>
    )
  }



