// supportsImprimables.ts — Le catalogue des supports imprimables et le dessin de
// leur aperçu (affiche, flyer, sticker, carte de table, badge, story…).
//
// 715 lignes qui vivaient à l'intérieur du composant QRStudio, en fermeture sur son
// état : le catalogue de 25 gabarits, leurs thèmes, et tout le tracé canvas de
// chacun. Extraites telles quelles ; les trois valeurs que le tracé lisait dans le
// composant — couleur des modules, couleur du fond, adresse du QR — sont devenues
// des paramètres explicites.
"use client"

// -- Themes d'imprimables (palette independante du QR) -----------------------
export type SuppTheme = { id: string; label: string; bg: string; text: string; accent: string; plan: string }
export const SUPP_THEMES: SuppTheme[] = [
  { id:"auto",      label:"Auto (couleurs du QR)", bg:"",        text:"",        accent:"",        plan:"free" },
  { id:"minimal",   label:"Minimal",               bg:"#FFFFFF", text:"#1A1A1A", accent:"#1A1A1A", plan:"free" },
  { id:"blackgold", label:"Black Gold",            bg:"#0A0A0A", text:"#F5F0E8", accent:"#C9A84C", plan:"free" },
  { id:"cream",     label:"Creme & Or",            bg:"#F6F1E7", text:"#2A2419", accent:"#C9A84C", plan:"free" },
  { id:"modern",    label:"Modern",                bg:"#0F1729", text:"#F1F5FF", accent:"#5B8DEF", plan:"free" },
  { id:"nature",    label:"Nature",                bg:"#F2F4EC", text:"#26331C", accent:"#5B8A3A", plan:"free" },
  { id:"coral",     label:"Coral",                 bg:"#FFF5F0", text:"#3A1E16", accent:"#E5634D", plan:"free" },
  // -- Premium --
  { id:"emeraude",  label:"Emeraude",              bg:"#06231C", text:"#EAF7F0", accent:"#34D399", plan:"pro" },
  { id:"velours",   label:"Velours",               bg:"#1A0F2E", text:"#F3ECFF", accent:"#C9A84C", plan:"pro" },
  { id:"ardoise",   label:"Ardoise",               bg:"#1E232B", text:"#EEF2F6", accent:"#C9A84C", plan:"pro" },
  { id:"marbre",    label:"Marbre",                bg:"#F4F2EC", text:"#262220", accent:"#8A7250", plan:"pro" },
  { id:"neon",      label:"Neon",                  bg:"#0A0A12", text:"#EAEAFF", accent:"#FF3D9A", plan:"business" },
  { id:"royal",     label:"Royal",                 bg:"#0C1A3A", text:"#F5F8FF", accent:"#D4AF37", plan:"business" },
  // -- Palettes signature (un clic = tout le support change) --
  { id:"corporate", label:"Corporate",             bg:"#F5F8FC", text:"#102A43", accent:"#1D4ED8", plan:"free" },
  { id:"restaurant",label:"Restaurant",            bg:"#FFF4E8", text:"#3A2316", accent:"#C0392B", plan:"free" },
  { id:"ocean",     label:"Ocean",                 bg:"#EAF6F6", text:"#0B3A3A", accent:"#0E7490", plan:"free" },
  { id:"dark",      label:"Dark",                  bg:"#0E0E11", text:"#F2F2F2", accent:"#FFFFFF", plan:"free" },
  { id:"luxgold",   label:"Luxury Gold",           bg:"#0B0805", text:"#F4E7C4", accent:"#D4AF37", plan:"pro" },
  { id:"crypto",    label:"Crypto",                bg:"#0A0F1A", text:"#E4ECF7", accent:"#F7931A", plan:"pro" },
  { id:"bordeaux",  label:"Bordeaux",              bg:"#1A0610", text:"#F5E4EA", accent:"#C9A84C", plan:"business" },
]

// Objectifs marketing : on pense "but" (avis, menu, reservation...) plutot que "format"
type SuppObjective = { id: string; label: string; emoji: string; cta: string; supports: string[] }
const SUPP_OBJECTIVES: SuppObjective[] = [
  { id:"avis",      label:"Obtenir des avis",      emoji:"⭐", cta:"Scannez pour laisser un avis",   supports:["Sticker","Carte de table","Sous-bock"] },
  { id:"menu",      label:"Faire voir le menu",    emoji:"🍽️", cta:"Scannez pour voir la carte",     supports:["Carte de table","Menu","Sous-bock"] },
  { id:"reserver",  label:"Faire réserver",        emoji:"📅", cta:"Scannez pour réserver",          supports:["Carte de table","Affiche"] },
  { id:"insta",     label:"Gagner des abonnés",    emoji:"📷", cta:"Scannez pour nous suivre",       supports:["Sticker","Story","Affiche"] },
  { id:"contact",   label:"Partager mes infos",    emoji:"💳", cta:"Scannez pour mes coordonnées",   supports:["Carte de visite"] },
  { id:"page",      label:"Faire voir ma page",    emoji:"🔗", cta:"Scannez pour découvrir",         supports:["Affiche","Flyer","Post"] },
]

export type SuppTpl = {
  id: string; label: string; emoji: string; w: number; h: number
  plan: string; cat: string; desc: string; support: string
}

export const SUPP_TPLS: SuppTpl[] = [
  { id:"qr-only",     label:"QR seul",           emoji:"▣", w:800,  h:800,  plan:"free",     cat:"Base",       desc:"QR Code sans décoration" , support:"QR seul"},
  { id:"a4-poster",   label:"Affiche A4",         emoji:"📋", w:795,  h:1122, plan:"free",     cat:"Print",      desc:"Portrait A4 avec titre et fond" , support:"Affiche"},
  { id:"flyer",       label:"Flyer",              emoji:"📄", w:795,  h:561,  plan:"free",     cat:"Print",      desc:"Demi A4 paysage" , support:"Flyer"},
  { id:"sticker",     label:"Sticker vitrine",    emoji:"🏷️",  w:600,  h:600,  plan:"free",     cat:"Print",      desc:"Carré 6cm avec cadre" , support:"Sticker"},
  { id:"table-card",  label:"Carte de table",     emoji:"🪧",  w:900,  h:506,  plan:"free",      cat:"Restaurant", desc:"Format paysage 9x5cm" , support:"Carte de table"},
  { id:"menu-qr",     label:"Menu QR",            emoji:"🍽",  w:600,  h:900,  plan:"free",      cat:"Restaurant", desc:"Carte portrait avec titre menu" , support:"Menu"},
  { id:"business",    label:"Carte de visite",    emoji:"💳", w:1063, h:591,  plan:"free",      cat:"Business",   desc:"Format CR80 standard" , support:"Carte de visite"},
  { id:"event-badge", label:"Badge événement",    emoji:"🎫", w:680,  h:400,  plan:"free",      cat:"Event",      desc:"Badge horizontal 85x50mm" , support:"Badge"},
  { id:"story",       label:"Story Instagram",    emoji:"📱", w:1080, h:1920, plan:"free", cat:"Social",     desc:"9:16 vertical stories" , support:"Story"},
  { id:"post",        label:"Post Instagram",     emoji:"🟫", w:1080, h:1080, plan:"free", cat:"Social",     desc:"Carré 1:1" , support:"Post"},

  // ===== LOT 15 templates supplementaires =====
// ---- Print ----
{ id:"affiche-minimal",     label:"Affiche minimale",   emoji:"🖼️", w:795,  h:1122, plan:"free",     cat:"Print",      desc:"A4 épuré, grand QR centré" , support:"Affiche"},
{ id:"affiche-premium",     label:"Affiche premium",    emoji:"✨", w:795,  h:1122, plan:"free",      cat:"Print",      desc:"A4 filets dorés, look haut de gamme" , support:"Affiche"},
{ id:"flyer-paysage",       label:"Flyer paysage",      emoji:"📄", w:795,  h:561,  plan:"free",     cat:"Print",      desc:"Demi-A4, bande latérale + QR" , support:"Flyer"},

// ---- Restaurant ----
{ id:"menu-resto-portrait", label:"Menu resto",         emoji:"🍽️", w:600,  h:900,  plan:"free",     cat:"Restaurant", desc:"Header coloré, QR vers la carte" , support:"Menu"},
{ id:"carte-table-resto",   label:"Carte de table",     emoji:"🍴", w:900,  h:506,  plan:"free",      cat:"Restaurant", desc:"Paysage, QR à gauche, texte à droite" , support:"Carte de table"},
{ id:"sticker-avis",        label:"Sticker avis",       emoji:"⭐", w:600,  h:600,  plan:"free",     cat:"Restaurant", desc:"Carré, demande d'avis client" , support:"Sticker"},

// ---- Business ----
{ id:"carte-visite-classic",label:"Carte de visite",    emoji:"💼", w:1063, h:591,  plan:"free",      cat:"Business",   desc:"CR80, split coloré + QR" , support:"Carte de visite"},
{ id:"carte-visite-dark",   label:"Carte premium",      emoji:"🥇", w:1063, h:591,  plan:"free", cat:"Business",   desc:"CR80, cadre doré, ultra premium" , support:"Carte de visite"},

// ---- Event ----
{ id:"badge-event-pro",     label:"Badge événement",    emoji:"🎫", w:680,  h:400,  plan:"free",      cat:"Event",      desc:"Badge header coloré + QR" , support:"Badge"},
{ id:"affiche-event",       label:"Affiche événement",  emoji:"🎉", w:795,  h:1122, plan:"free",      cat:"Event",      desc:"A4 bold, grand header" , support:"Affiche"},
  { id:"affiche-centre",  label:"Affiche centrée",     emoji:"🖼️", w:800, h:1131, plan:"free",     cat:"Print", desc:"Titre centré, QR encadré", support:"Affiche" },
  { id:"affiche-cadre",   label:"Affiche cadre",       emoji:"🖼️", w:800, h:1131, plan:"free",     cat:"Print", desc:"Cadre élégant, ornements", support:"Affiche" },
  { id:"affiche-bandeau", label:"Affiche bandeau",     emoji:"🖼️", w:800, h:1131, plan:"pro",      cat:"Print", desc:"QR en haut, bande de couleur", support:"Affiche" },
  { id:"affiche-split",   label:"Affiche split",       emoji:"🖼️", w:800, h:1131, plan:"pro",      cat:"Print", desc:"Colonne couleur + QR", support:"Affiche" },
  { id:"affiche-ticket",  label:"Affiche ticket",      emoji:"🎟️", w:800, h:1131, plan:"business", cat:"Print", desc:"Style billet, perforations", support:"Affiche" },
{ id:"carte-table-event",   label:"Carte table event",  emoji:"📋", w:900,  h:506,  plan:"free",      cat:"Event",      desc:"Paysage, QR centré, filets" , support:"Carte de table"},
  { id:"carte-bloc",    label:"Carte bloc",        emoji:"🍽️", w:900, h:506, plan:"free",     cat:"Restaurant", desc:"Bloc de couleur + QR", support:"Carte de table" },
  { id:"carte-header",  label:"Carte header",      emoji:"🍽️", w:900, h:506, plan:"pro",      cat:"Restaurant", desc:"Bandeau couleur en haut", support:"Carte de table" },
  { id:"carte-pleine",  label:"Carte pleine",      emoji:"🍽️", w:900, h:506, plan:"pro",      cat:"Restaurant", desc:"Couleur pleine + monogramme", support:"Carte de table" },
  { id:"carte-duo",     label:"Carte duo",         emoji:"🍽️", w:900, h:506, plan:"free",     cat:"Restaurant", desc:"QR à gauche, texte à droite", support:"Carte de table" },
  { id:"bock-plein",    label:"Sous-bock plein",   emoji:"🍺", w:900, h:900, plan:"free",     cat:"Bar",        desc:"Rond, couleur pleine", support:"Sous-bock" },
  { id:"bock-cerne",    label:"Sous-bock cerné",   emoji:"🍺", w:900, h:900, plan:"free",     cat:"Bar",        desc:"Rond, double anneau doré", support:"Sous-bock" },
  { id:"bock-mono",     label:"Sous-bock mono",    emoji:"🍺", w:900, h:900, plan:"pro",      cat:"Bar",        desc:"Rond, monogramme", support:"Sous-bock" },
{ id:"badge-nominatif",     label:"Badge nominatif",    emoji:"🪪", w:680,  h:400,  plan:"free", cat:"Event",      desc:"Badge avec nom du participant" , support:"Badge"},

// ---- Social ----
{ id:"story-insta",         label:"Story Instagram",    emoji:"📱", w:1080, h:1920, plan:"free",      cat:"Social",     desc:"9:16, QR centré, bandes translucides" , support:"Story"},
{ id:"post-insta",          label:"Post Instagram",     emoji:"🟧", w:1080, h:1080, plan:"free",     cat:"Social",     desc:"1:1, QR cadré" , support:"Post"},
{ id:"story-promo",         label:"Story promo",        emoji:"🔥", w:1080, h:1920, plan:"free",      cat:"Social",     desc:"9:16, gros header promo, QR bas" , support:"Story"},
]

// -- Rendu d'un support sur canvas ----------------------------------------
export async function renderSupport(
  canvas: HTMLCanvasElement,
  tpl: SuppTpl,
  opts: { title: string; subtitle: string; qrDataUrl: string;
    /** Couleurs et adresse du QR : lues dans le composant, passées ici. */
    fg: string; bg: string; qrUrl: string; titreParDefaut?: string; logoUrl?: string; scale?: number; theme?: SuppTheme; phone?: string; website?: string; font?: string; titleColor?: string; subColor?: string; offX?: number; offY?: number; subFont?: string; tracking?: number; titleScale?: number; subScale?: number }
): Promise<void> {
  const sc  = opts.scale ?? 1
  const w   = Math.round(tpl.w * sc)
  const h   = Math.round(tpl.h * sc)
  canvas.width  = w
  canvas.height = h
  const ctx = canvas.getContext("2d")!
  ctx.clearRect(0, 0, w, h)

  // Theme : si defini (autre que auto), il pilote fond/texte/accent du support
  const th       = opts.theme && opts.theme.bg ? opts.theme : null
  const fgColor  = th ? th.accent : (opts.fg || "#080808")
  const bgColor  = th ? th.bg     : (opts.bg || "#FFFFFF")
  const isDark   = parseInt(bgColor.replace("#","").slice(0,2), 16) < 128
  const textCol  = th ? th.text   : (isDark ? "#F5F0E8" : "#1A1A1A")
  const accentCol= th ? th.accent : fgColor
  const gold     = "#C9A84C"

  const loadImg  = (src: string): Promise<HTMLImageElement> =>
    new Promise((res, rej) => {
      const i = new Image(); i.crossOrigin = "anonymous"
      i.onload = () => res(i); i.onerror = () => rej(); i.src = src
    })

  // Charger le QR
  const qrImg = await loadImg(opts.qrDataUrl).catch(() => null)

  // -- QR seul ------------------------------------------------------------
  if (tpl.id === "qr-only") {
    if (qrImg) ctx.drawImage(qrImg, 0, 0, w, h)
    return
  }

  // -- Fond commun --------------------------------------------------------
  if (tpl.id === "story" || tpl.id === "post") {
    const grad = ctx.createLinearGradient(0, 0, 0, h)
    grad.addColorStop(0, bgColor); grad.addColorStop(1, isDark ? "#0A0A0A" : "#E8E8E8")
    ctx.fillStyle = grad
  } else {
    ctx.fillStyle = bgColor
  }
  ctx.fillRect(0, 0, w, h)

  // -- Bande de couleur laterale (sauf social) ----------------------------
  if (!["story","post","qr-only"].includes(tpl.id)) {
    ctx.fillStyle = fgColor
    const bw = Math.round(w * 0.04)
    ctx.fillRect(0, 0, bw, h)
  }

  // -- Templates specifiques ---------------------------------------------
  const pad    = Math.round(w * 0.06)
  const bw     = Math.round(w * 0.04)  // largeur bande

  const offX = Math.round((opts.offX ?? 0) / 100 * w)
  const offY = Math.round((opts.offY ?? 0) / 100 * h)
  const titleFont = opts.font && opts.font.trim() ? opts.font : "Fraunces"
  const subFont   = opts.subFont && opts.subFont.trim() ? opts.subFont : "Arial"
  const trk       = Math.max(0, opts.tracking ?? 0)
  const tScale    = opts.titleScale ?? 1
  const sScale    = opts.subScale ?? 1
  const setTrk = (px: number) => { try { (ctx as unknown as { letterSpacing: string }).letterSpacing = `${px}px` } catch { /* noop */ } }

  const drawQR = (x: number, y: number, size: number) => {
    if (!qrImg) return
    x += offX; y += offY
    // Fond blanc derriere le QR si fond sombre
    if (isDark) {
      ctx.fillStyle = "#FFFFFF"
      const margin = Math.round(size * 0.04)
      ctx.fillRect(x - margin, y - margin, size + margin*2, size + margin*2)
    }
    ctx.drawImage(qrImg, x, y, size, size)
  }

  const drawTitle = (text: string, x: number, y: number, size: number, color: string, align: CanvasTextAlign = "left", maxW?: number) => {
    if (!text) return
    const col = opts.titleColor && opts.titleColor.trim() ? opts.titleColor : color
    ctx.fillStyle = col; ctx.font = `700 ${size*tScale}px '${titleFont}', Georgia, 'Times New Roman', serif`; ctx.textAlign = align; setTrk(trk)
    ctx.fillText(text, x + offX, y + offY, maxW ?? w * 0.9)
    ctx.textAlign = "left"; setTrk(0)
  }

  const drawSub = (text: string, x: number, y: number, size: number, color: string, align: CanvasTextAlign = "left", maxW?: number) => {
    if (!text) return
    const col = (opts.subColor && opts.subColor.trim() && text === opts.subtitle) ? opts.subColor : color
    ctx.fillStyle = col; ctx.font = `400 ${size*sScale}px '${subFont}', Arial, sans-serif`; ctx.textAlign = align; setTrk(trk)
    ctx.fillText(text, x + offX, y + offY, maxW ?? w * 0.85)
    ctx.textAlign = "left"; setTrk(0)
  }

  const drawAccentLine = (x: number, y: number, lineW: number) => {
    ctx.fillStyle = accentCol
    ctx.fillRect(x + offX, y + offY, lineW, Math.max(3, Math.round(w * 0.005)))
  }

  // Ligne de contact (tel + site) : dessinee seulement si renseignee
  const contactStr = [opts.phone?.trim(), opts.website?.trim()].filter(Boolean).join("   ·   ")
  const drawContact = (x: number, y: number, size: number, color: string, align: CanvasTextAlign = "center", maxW?: number) => {
    if (!contactStr) return
    ctx.fillStyle = color; ctx.font = `500 ${size}px 'Arial', sans-serif`; ctx.textAlign = align
    ctx.fillText(contactStr, x + offX, y + offY, maxW ?? w * 0.85)
    ctx.textAlign = "left"
  }

  // -- Helpers premium (variantes abouties) -------------------------------
  const shade = (hex: string, amt: number) => {
    if (!/^#[0-9a-fA-F]{6}$/.test(hex)) return hex
    const n = parseInt(hex.slice(1), 16)
    const cl = (v: number) => Math.max(0, Math.min(255, v))
    const r = cl((n >> 16) + amt), g = cl(((n >> 8) & 255) + amt), b = cl((n & 255) + amt)
    return "#" + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)
  }
  const isDarkHex = (hex: string) => /^#/.test(hex) && parseInt(hex.replace("#","").slice(0,2), 16) < 128
  const rr = (x: number, y: number, ww: number, hh: number, r: number) => {
    ctx.beginPath(); ctx.moveTo(x+r,y); ctx.arcTo(x+ww,y,x+ww,y+hh,r); ctx.arcTo(x+ww,y+hh,x,y+hh,r)
    ctx.arcTo(x,y+hh,x,y,r); ctx.arcTo(x,y,x+ww,y,r); ctx.closePath()
  }
  const shadowOn = (blur: number, oy: number, col = "rgba(0,0,0,0.18)") => { ctx.shadowColor = col; ctx.shadowBlur = blur; ctx.shadowOffsetY = oy }
  const shadowOff = () => { ctx.shadowColor = "transparent"; ctx.shadowBlur = 0; ctx.shadowOffsetY = 0 }
  const drawLabel = (text: string, x: number, y: number, size: number, color: string, align: CanvasTextAlign = "center") => {
    if (!text) return
    ctx.fillStyle = color; ctx.font = `700 ${size}px 'Arial', sans-serif`; ctx.textAlign = align
    try { (ctx as unknown as { letterSpacing: string }).letterSpacing = `${Math.max(2, Math.round(size*0.32))}px` } catch { /* noop */ }
    ctx.fillText(text.toUpperCase(), x + offX, y + offY)
    try { (ctx as unknown as { letterSpacing: string }).letterSpacing = "0px" } catch { /* noop */ }
    ctx.textAlign = "left"
  }
  // Titre qui retrecit pour tenir sur une ligne (pas de compression)
  const drawTitleFit = (text: string, x: number, y: number, maxSize: number, color: string, align: CanvasTextAlign = "center", maxW = w*0.85) => {
    if (!text) return
    const col = opts.titleColor && opts.titleColor.trim() ? opts.titleColor : color
    let s = maxSize*tScale; setTrk(trk); ctx.font = `700 ${s}px '${titleFont}', Georgia, serif`
    while (s > maxSize*tScale*0.55 && ctx.measureText(text).width > maxW) { s -= 2; ctx.font = `700 ${s}px '${titleFont}', Georgia, serif` }
    ctx.fillStyle = col; ctx.textAlign = align; ctx.fillText(text, x + offX, y + offY); ctx.textAlign = "left"; setTrk(0)
  }
  // Titre multi-lignes, renvoie le Y de la derniere ligne
  const drawTitleWrap = (text: string, x: number, y: number, size: number, lineH: number, color: string, align: CanvasTextAlign, maxW: number) => {
    const col = opts.titleColor && opts.titleColor.trim() ? opts.titleColor : color
    ctx.fillStyle = col; ctx.font = `700 ${size*tScale}px '${titleFont}', Georgia, serif`; ctx.textAlign = align; setTrk(trk)
    const words = (text || "").split(" "); let line = "", yy = y; const lh = lineH*tScale
    for (const wd of words) { const t = line ? line+" "+wd : wd; if (ctx.measureText(t).width > maxW && line) { ctx.fillText(line, x + offX, yy + offY); line = wd; yy += lh } else line = t }
    if (line) ctx.fillText(line, x + offX, yy + offY)
    ctx.textAlign = "left"; setTrk(0); return yy
  }
  // Separateur ornemental : ligne - losange - ligne
  const drawOrn = (cx: number, y: number, half: number, color: string) => {
    ctx.fillStyle = color
    ctx.fillRect(cx - half + offX, y - 1.5 + offY, half - 18, 3)
    ctx.fillRect(cx + 18 + offX, y - 1.5 + offY, half - 18, 3)
    ctx.save(); ctx.translate(cx + offX, y + offY); ctx.rotate(Math.PI/4); ctx.fillRect(-6, -6, 12, 12); ctx.restore()
  }
  // QR dans une carte blanche arrondie avec ombre douce
  const drawQRFramed = (x: number, y: number, size: number) => {
    if (!qrImg) return
    x += offX; y += offY
    const m = Math.round(size * 0.06)
    ctx.fillStyle = "#FFFFFF"; shadowOn(28, 10, "rgba(0,0,0,0.22)")
    rr(x - m, y - m, size + m*2, size + m*2, 14); ctx.fill(); shadowOff()
    ctx.drawImage(qrImg, x, y, size, size)
  }

  // -- A4 Poster ----------------------------------------------------------
  if (tpl.id === "a4-poster") {
    const qrSize = Math.round(w * 0.52)
    const qrX    = bw + pad
    const qrY    = Math.round(h * 0.28)
    drawAccentLine(bw + pad, Math.round(h * 0.07), Math.round(w * 0.2))
    drawTitle(opts.title || opts.titreParDefaut || "", bw + pad, Math.round(h * 0.13), Math.round(w * 0.045), textCol, "left", w - bw - pad*2)
    drawSub(opts.subtitle, bw + pad, Math.round(h * 0.19), Math.round(w * 0.03), accentCol)
    drawQR(qrX + (w - bw - pad*2 - qrSize)/2, qrY, qrSize)
    drawContact(w/2, Math.round(h * 0.84), Math.round(w * 0.024), accentCol, "center")
    drawSub(opts.qrUrl, w/2, Math.round(h * 0.89), Math.round(w * 0.022), isDark ? "rgba(245,240,232,0.5)" : "rgba(26,26,26,0.4)", "center")
    ctx.fillStyle = accentCol; ctx.fillRect(bw, h - Math.round(h*0.04), w - bw, Math.round(h*0.04))
  }

  // -- Flyer --------------------------------------------------------------
  else if (tpl.id === "flyer") {
    const qrSize = Math.round(h * 0.72)
    const qrX    = w - qrSize - pad
    const qrY    = Math.round((h - qrSize) / 2)
    const txtX   = bw + pad
    ctx.fillStyle = fgColor; ctx.fillRect(w - qrSize - pad*2, 0, Math.round(w * 0.004), h)
    drawTitle(opts.title || opts.titreParDefaut || "", txtX, Math.round(h * 0.32), Math.round(w * 0.038), textCol, "left", qrX - txtX - pad)
    drawAccentLine(txtX, Math.round(h * 0.37), Math.round(w * 0.15))
    drawSub(opts.subtitle, txtX, Math.round(h * 0.55), Math.round(w * 0.026), accentCol)
    drawContact(txtX, Math.round(h * 0.70), Math.round(w * 0.023), textCol, "left")
    drawQR(qrX, qrY, qrSize)
  }

  // -- Sticker ------------------------------------------------------------
  else if (tpl.id === "sticker") {
    const r = Math.round(w * 0.08)
    ctx.save(); ctx.beginPath()
    ctx.moveTo(r,0); ctx.lineTo(w-r,0); ctx.quadraticCurveTo(w,0,w,r)
    ctx.lineTo(w,h-r); ctx.quadraticCurveTo(w,h,w-r,h)
    ctx.lineTo(r,h); ctx.quadraticCurveTo(0,h,0,h-r)
    ctx.lineTo(0,r); ctx.quadraticCurveTo(0,0,r,0); ctx.closePath()
    ctx.clip()
    ctx.fillStyle = bgColor; ctx.fillRect(0, 0, w, h)
    // Bordure accent
    ctx.strokeStyle = accentCol; ctx.lineWidth = Math.round(w * 0.025)
    ctx.beginPath()
    ctx.moveTo(r,0); ctx.lineTo(w-r,0); ctx.quadraticCurveTo(w,0,w,r)
    ctx.lineTo(w,h-r); ctx.quadraticCurveTo(w,h,w-r,h)
    ctx.lineTo(r,h); ctx.quadraticCurveTo(0,h,0,h-r)
    ctx.lineTo(0,r); ctx.quadraticCurveTo(0,0,r,0); ctx.closePath(); ctx.stroke()
    ctx.restore()
    const qrSize = Math.round(w * 0.62)
    drawQR((w - qrSize)/2, Math.round(h * 0.12), qrSize)
    drawSub(opts.subtitle, w/2, Math.round(h * 0.88), Math.round(w * 0.038), accentCol, "center")
  }

  // -- Carte de table -----------------------------------------------------
  else if (tpl.id === "table-card") {
    const qrSize = Math.round(h * 0.7)
    const qrY    = Math.round((h - qrSize) / 2)
    const qrX    = w - qrSize - pad
    ctx.fillStyle = fgColor
    ctx.fillRect(0, 0, w, Math.round(h * 0.08))
    ctx.fillRect(0, h - Math.round(h*0.08), w, Math.round(h * 0.08))
    const txtX   = bw + pad
    drawTitle(opts.title || opts.titreParDefaut || "", txtX, Math.round(h * 0.38), Math.round(h * 0.09), textCol, "left", qrX - txtX - pad)
    drawAccentLine(txtX, Math.round(h * 0.44), Math.round(w * 0.1))
    drawSub(opts.subtitle, txtX, Math.round(h * 0.6), Math.round(h * 0.065), accentCol)
    drawContact(txtX, Math.round(h * 0.76), Math.round(h * 0.05), textCol, "left")
    drawQR(qrX, qrY, qrSize)
  }

  // -- Menu QR ------------------------------------------------------------
  else if (tpl.id === "menu-qr") {
    const headerH = Math.round(h * 0.22)
    ctx.fillStyle = fgColor; ctx.fillRect(0, 0, w, headerH)
    const qrSize  = Math.round(w * 0.62)
    drawTitle(opts.title || opts.titreParDefaut || "Notre Menu", w/2, Math.round(headerH * 0.55), Math.round(w * 0.055), bgColor, "center", w * 0.85)
    drawSub(opts.subtitle, w/2, Math.round(headerH * 0.80), Math.round(w * 0.034), isDark ? "rgba(201,168,76,0.85)" : "rgba(255,255,255,0.75)", "center")
    drawQR((w - qrSize)/2, Math.round(h * 0.3), qrSize)
    drawContact(w/2, Math.round(h * 0.86), Math.round(w * 0.026), accentCol, "center")
    drawSub(opts.qrUrl, w/2, Math.round(h * 0.93), Math.round(w * 0.027), isDark ? "rgba(245,240,232,0.4)" : "rgba(26,26,26,0.35)", "center")
    ctx.fillStyle = fgColor; ctx.fillRect(0, h - Math.round(h*0.035), w, Math.round(h*0.035))
  }

  // -- Carte de visite ----------------------------------------------------
  else if (tpl.id === "business") {
    const qrSize  = Math.round(h * 0.72)
    const qrX     = w - qrSize - pad
    const qrY     = Math.round((h - qrSize) / 2)
    ctx.fillStyle = fgColor; ctx.fillRect(0, 0, Math.round(w * 0.38), h)
    ctx.fillStyle = bgColor
    const lx = Math.round(w * 0.19); const ly = Math.round(h * 0.3)
    drawTitle(opts.title || opts.titreParDefaut || "", lx, ly, Math.round(h * 0.11), isDark?"#F5F0E8":"#FFFFFF", "center", Math.round(w * 0.32))
    ctx.fillStyle = isDark ? "rgba(201,168,76,0.8)" : "rgba(255,255,255,0.6)"
    ctx.fillRect(lx - Math.round(w * 0.05), ly + Math.round(h*0.04), Math.round(w * 0.14), Math.round(h*0.007))
    drawSub(opts.subtitle, lx, Math.round(h * 0.66), Math.round(h * 0.05), isDark?"rgba(201,168,76,0.9)":"rgba(255,255,255,0.85)", "center", Math.round(w * 0.30))
    drawContact(lx, Math.round(h * 0.80), Math.round(h * 0.036), isDark?"rgba(245,240,232,0.85)":"rgba(255,255,255,0.85)", "center", Math.round(w * 0.30))
    drawQR(qrX, qrY, qrSize)
  }

  // -- Badge evenement ----------------------------------------------------
  else if (tpl.id === "event-badge") {
    const qrSize  = Math.round(h * 0.68)
    const qrX     = Math.round(w * 0.52)
    const qrY     = Math.round((h - qrSize) / 2)
    ctx.fillStyle = fgColor; ctx.fillRect(0, 0, w, Math.round(h * 0.14))
    ctx.fillStyle = fgColor; ctx.fillRect(0, h - Math.round(h*0.14), w, Math.round(h*0.14))
    drawTitle(opts.title || opts.titreParDefaut || "", pad, Math.round(h * 0.44), Math.round(h * 0.1), textCol, "left", qrX - pad - Math.round(w*0.03))
    drawAccentLine(pad, Math.round(h * 0.51), Math.round(w * 0.12))
    drawSub(opts.subtitle, pad, Math.round(h * 0.68), Math.round(h * 0.075), accentCol)
    drawContact(pad, Math.round(h * 0.79), Math.round(h * 0.05), textCol, "left")
    drawQR(qrX, qrY, qrSize)
  }

  // -- Story Instagram ----------------------------------------------------
  else if (tpl.id === "story") {
    const qrSize  = Math.round(w * 0.55)
    const qrY     = Math.round(h * 0.35)
    ctx.fillStyle = fgColor + "22"
    ctx.fillRect(0, 0, w, Math.round(h * 0.28))
    ctx.fillRect(0, Math.round(h * 0.72), w, Math.round(h * 0.28))
    drawTitle(opts.title || opts.titreParDefaut || "", w/2, Math.round(h * 0.12), Math.round(w * 0.055), textCol, "center", w * 0.82)
    drawAccentLine(Math.round(w*0.3), Math.round(h * 0.16), Math.round(w * 0.4))
    drawSub(opts.subtitle, w/2, Math.round(h * 0.21), Math.round(w * 0.038), accentCol, "center")
    drawQR((w - qrSize)/2, qrY, qrSize)
    drawSub(opts.qrUrl, w/2, Math.round(h * 0.82), Math.round(w * 0.028), isDark?"rgba(245,240,232,0.5)":"rgba(26,26,26,0.4)", "center")
    drawContact(w/2, Math.round(h * 0.92), Math.round(w * 0.026), textCol, "center")
    ctx.fillStyle = accentCol
    ctx.fillRect(Math.round(w*0.1), Math.round(h*0.87), Math.round(w*0.8), Math.round(h*0.005))
  }

  // -- Post Instagram -----------------------------------------------------
  else if (tpl.id === "post") {
    const qrSize  = Math.round(w * 0.52)
    ctx.fillStyle = fgColor + "18"; ctx.fillRect(0, 0, w, h)
    drawTitle(opts.title || opts.titreParDefaut || "", w/2, Math.round(h * 0.14), Math.round(w * 0.052), textCol, "center", w * 0.82)
    drawAccentLine(Math.round(w*0.35), Math.round(h * 0.18), Math.round(w * 0.3))
    drawSub(opts.subtitle, w/2, Math.round(h * 0.24), Math.round(w * 0.036), accentCol, "center")
    drawQR((w - qrSize)/2, Math.round(h * 0.31), qrSize)
    drawSub(opts.qrUrl, w/2, Math.round(h * 0.91), Math.round(w * 0.026), isDark?"rgba(245,240,232,0.4)":"rgba(26,26,26,0.35)", "center")
    ctx.strokeStyle = accentCol + "40"; ctx.lineWidth = Math.round(w * 0.018)
    ctx.strokeRect(Math.round(w*0.009), Math.round(h*0.009), w - Math.round(w*0.018), h - Math.round(h*0.018))
  }

// ===== Print =====
else if (tpl.id === "affiche-minimal") {
  ctx.fillStyle = bgColor; ctx.fillRect(0, 0, w, h)
  drawTitle(opts.title || opts.titreParDefaut || "", w/2, Math.round(h*0.16), Math.round(w*0.06), textCol, "center", w*0.82)
  drawAccentLine(Math.round(w*0.38), Math.round(h*0.21), Math.round(w*0.24))
  drawSub(opts.subtitle, w/2, Math.round(h*0.27), Math.round(w*0.032), accentCol, "center")
  const s = Math.round(w*0.52)
  drawQR((w-s)/2, Math.round(h*0.38), s)
  drawSub("Scannez-moi", w/2, Math.round(h*0.38)+s+Math.round(h*0.035), Math.round(w*0.026), textCol, "center")
  drawContact(w/2, Math.round(h*0.9), Math.round(w*0.024), textCol, "center")
}
else if (tpl.id === "affiche-premium") {
  ctx.fillStyle = bgColor; ctx.fillRect(0, 0, w, h)
  ctx.fillStyle = gold; ctx.fillRect(0, 0, w, Math.round(h*0.014))
  ctx.fillStyle = gold; ctx.fillRect(0, h-Math.round(h*0.014), w, Math.round(h*0.014))
  drawTitle(opts.title || opts.titreParDefaut || "", w/2, Math.round(h*0.15), Math.round(w*0.062), gold, "center", w*0.82)
  drawAccentLine(Math.round(w*0.4), Math.round(h*0.2), Math.round(w*0.2))
  drawSub(opts.subtitle, w/2, Math.round(h*0.25), Math.round(w*0.032), textCol, "center")
  const s = Math.round(w*0.5)
  drawQR((w-s)/2, Math.round(h*0.34), s)
  drawContact(w/2, Math.round(h*0.88), Math.round(w*0.024), textCol, "center")
  drawSub(opts.qrUrl, w/2, Math.round(h*0.93), Math.round(w*0.022), isDark?"rgba(245,240,232,0.45)":"rgba(26,26,26,0.4)", "center")
}
else if (tpl.id === "flyer-paysage") {
  ctx.fillStyle = bgColor; ctx.fillRect(0, 0, w, h)
  ctx.fillStyle = fgColor; ctx.fillRect(0, 0, Math.round(w*0.42), h)
  const txtX = Math.round(w*0.06)
  drawTitle(opts.title || opts.titreParDefaut || "", txtX, Math.round(h*0.3), Math.round(w*0.045), bgColor, "left", w*0.32)
  drawAccentLine(txtX, Math.round(h*0.42), Math.round(w*0.18))
  drawSub(opts.subtitle, txtX, Math.round(h*0.52), Math.round(w*0.026), bgColor, "left")
  drawContact(txtX, Math.round(h*0.82), Math.round(w*0.02), bgColor, "left")
  const s = Math.round(h*0.62)
  drawQR(Math.round(w*0.42)+Math.round((w*0.58-s)/2), Math.round((h-s)/2), s)
}

// ===== Restaurant =====
else if (tpl.id === "menu-resto-portrait") {
  ctx.fillStyle = bgColor; ctx.fillRect(0, 0, w, h)
  ctx.fillStyle = fgColor; ctx.fillRect(0, 0, w, Math.round(h*0.18))
  drawTitle(opts.title || opts.titreParDefaut || "Notre Menu", w/2, Math.round(h*0.1), Math.round(w*0.07), bgColor, "center", w*0.85)
  drawSub(opts.subtitle, w/2, Math.round(h*0.26), Math.round(w*0.04), accentCol, "center")
  const s = Math.round(w*0.62)
  drawQR((w-s)/2, Math.round(h*0.36), s)
  drawSub("Scannez pour voir la carte", w/2, Math.round(h*0.36)+s+Math.round(h*0.04), Math.round(w*0.032), textCol, "center")
  drawContact(w/2, Math.round(h*0.92), Math.round(w*0.03), textCol, "center")
}
else if (tpl.id === "carte-table-resto") {
  ctx.fillStyle = bgColor; ctx.fillRect(0, 0, w, h)
  const s = Math.round(h*0.66)
  drawQR(Math.round(w*0.08), Math.round((h-s)/2), s)
  const tx = Math.round(w*0.08)+s+Math.round(w*0.06)
  drawTitle(opts.title || opts.titreParDefaut || "Commandez ici", tx, Math.round(h*0.34), Math.round(w*0.05), textCol, "left", w*0.42)
  drawAccentLine(tx, Math.round(h*0.46), Math.round(w*0.18))
  drawSub(opts.subtitle, tx, Math.round(h*0.58), Math.round(w*0.028), accentCol, "left")
  drawContact(tx, Math.round(h*0.8), Math.round(w*0.022), textCol, "left")
}
else if (tpl.id === "sticker-avis") {
  ctx.fillStyle = bgColor; ctx.fillRect(0, 0, w, h)
  drawTitle(opts.title || "Votre avis compte", w/2, Math.round(h*0.16), Math.round(w*0.07), textCol, "center", w*0.85)
  drawAccentLine(Math.round(w*0.38), Math.round(h*0.22), Math.round(w*0.24))
  const s = Math.round(w*0.5)
  drawQR((w-s)/2, Math.round(h*0.3), s)
  drawSub(opts.subtitle || "Scannez & laissez un avis", w/2, Math.round(h*0.3)+s+Math.round(h*0.05), Math.round(w*0.04), accentCol, "center")
  drawContact(w/2, Math.round(h*0.92), Math.round(w*0.03), textCol, "center")
}

// ===== Business =====
else if (tpl.id === "carte-visite-classic") {
  ctx.fillStyle = bgColor; ctx.fillRect(0, 0, w, h)
  ctx.fillStyle = fgColor; ctx.fillRect(0, 0, Math.round(w*0.5), h)
  const lx = Math.round(w*0.06)
  drawTitle(opts.title || opts.titreParDefaut || "", lx, Math.round(h*0.3), Math.round(w*0.05), bgColor, "left", w*0.38)
  drawAccentLine(lx, Math.round(h*0.42), Math.round(w*0.14))
  drawSub(opts.subtitle, lx, Math.round(h*0.52), Math.round(w*0.026), bgColor, "left")
  drawContact(lx, Math.round(h*0.82), Math.round(w*0.022), bgColor, "left")
  const s = Math.round(h*0.6)
  drawQR(Math.round(w*0.5)+Math.round((w*0.5-s)/2), Math.round((h-s)/2), s)
}
else if (tpl.id === "carte-visite-dark") {
  ctx.fillStyle = bgColor; ctx.fillRect(0, 0, w, h)
  ctx.strokeStyle = gold; ctx.lineWidth = Math.max(2, Math.round(w*0.006))
  ctx.strokeRect(Math.round(w*0.03), Math.round(h*0.05), w-Math.round(w*0.06), h-Math.round(h*0.1))
  const lx = Math.round(w*0.08)
  drawTitle(opts.title || opts.titreParDefaut || "", lx, Math.round(h*0.32), Math.round(w*0.052), gold, "left", w*0.46)
  drawAccentLine(lx, Math.round(h*0.44), Math.round(w*0.16))
  drawSub(opts.subtitle, lx, Math.round(h*0.55), Math.round(w*0.026), textCol, "left")
  drawContact(lx, Math.round(h*0.8), Math.round(w*0.022), textCol, "left")
  const s = Math.round(h*0.58)
  drawQR(w-s-Math.round(w*0.1), Math.round((h-s)/2), s)
}

// ===== Event =====
else if (tpl.id === "badge-event-pro") {
  ctx.fillStyle = bgColor; ctx.fillRect(0, 0, w, h)
  ctx.fillStyle = fgColor; ctx.fillRect(0, 0, w, Math.round(h*0.22))
  drawTitle(opts.title || opts.titreParDefaut || "BADGE", w/2, Math.round(h*0.13), Math.round(w*0.05), bgColor, "center", w*0.85)
  drawSub(opts.subtitle, Math.round(w*0.08), Math.round(h*0.42), Math.round(w*0.04), textCol, "left")
  drawContact(Math.round(w*0.08), Math.round(h*0.78), Math.round(w*0.028), accentCol, "left")
  const s = Math.round(h*0.5)
  drawQR(w-s-Math.round(w*0.08), Math.round(h*0.32), s)
}
else if (tpl.id === "affiche-event") {
  ctx.fillStyle = bgColor; ctx.fillRect(0, 0, w, h)
  ctx.fillStyle = fgColor; ctx.fillRect(0, 0, w, Math.round(h*0.32))
  drawTitle(opts.title || opts.titreParDefaut || "ÉVÉNEMENT", w/2, Math.round(h*0.15), Math.round(w*0.075), bgColor, "center", w*0.88)
  drawSub(opts.subtitle, w/2, Math.round(h*0.25), Math.round(w*0.036), bgColor, "center")
  const s = Math.round(w*0.5)
  drawQR((w-s)/2, Math.round(h*0.42), s)
  drawSub("Scannez pour participer", w/2, Math.round(h*0.42)+s+Math.round(h*0.035), Math.round(w*0.03), accentCol, "center")
  drawContact(w/2, Math.round(h*0.9), Math.round(w*0.024), textCol, "center")
}
else if (tpl.id === "carte-table-event") {
  ctx.fillStyle = bgColor; ctx.fillRect(0, 0, w, h)
  ctx.fillStyle = fgColor; ctx.fillRect(0, 0, w, Math.round(h*0.04))
  ctx.fillStyle = fgColor; ctx.fillRect(0, h-Math.round(h*0.04), w, Math.round(h*0.04))
  drawTitle(opts.title || opts.titreParDefaut || "Bienvenue", w/2, Math.round(h*0.2), Math.round(w*0.045), textCol, "center", w*0.8)
  const s = Math.round(h*0.42)
  drawQR((w-s)/2, Math.round(h*0.3), s)
  drawSub(opts.subtitle || "Scannez pour le programme", w/2, Math.round(h*0.3)+s+Math.round(h*0.06), Math.round(w*0.026), accentCol, "center")
  drawContact(w/2, Math.round(h*0.9), Math.round(w*0.02), textCol, "center")
}
else if (tpl.id === "badge-nominatif") {
  ctx.fillStyle = bgColor; ctx.fillRect(0, 0, w, h)
  ctx.fillStyle = fgColor; ctx.fillRect(0, 0, Math.round(w*0.04), h)
  const lx = Math.round(w*0.1)
  drawSub(opts.subtitle || "PARTICIPANT", lx, Math.round(h*0.2), Math.round(w*0.026), accentCol, "left")
  drawTitle(opts.title || opts.titreParDefaut || "Nom Prénom", lx, Math.round(h*0.42), Math.round(w*0.055), textCol, "left", w*0.55)
  drawAccentLine(lx, Math.round(h*0.54), Math.round(w*0.2))
  drawContact(lx, Math.round(h*0.82), Math.round(w*0.024), textCol, "left")
  const s = Math.round(h*0.5)
  drawQR(w-s-Math.round(w*0.08), Math.round((h-s)/2), s)
}

// ===== Social =====
else if (tpl.id === "story-insta") {
  ctx.fillStyle = bgColor; ctx.fillRect(0, 0, w, h)
  ctx.fillStyle = fgColor + "22"; ctx.fillRect(0, Math.round(h*0.12), w, Math.round(h*0.1))
  drawTitle(opts.title || opts.titreParDefaut || "", w/2, Math.round(h*0.18), Math.round(w*0.07), textCol, "center", w*0.85)
  drawSub(opts.subtitle, w/2, Math.round(h*0.28), Math.round(w*0.034), accentCol, "center")
  const s = Math.round(w*0.62)
  drawQR((w-s)/2, Math.round(h*0.4), s)
  drawSub("Scannez l'écran", w/2, Math.round(h*0.4)+s+Math.round(h*0.035), Math.round(w*0.03), textCol, "center")
  drawContact(w/2, Math.round(h*0.82), Math.round(w*0.026), textCol, "center")
}
else if (tpl.id === "post-insta") {
  ctx.fillStyle = bgColor; ctx.fillRect(0, 0, w, h)
  ctx.strokeStyle = accentCol; ctx.lineWidth = Math.max(2, Math.round(w*0.008))
  ctx.strokeRect(Math.round(w*0.06), Math.round(h*0.06), w-Math.round(w*0.12), h-Math.round(h*0.12))
  drawTitle(opts.title || opts.titreParDefaut || "", w/2, Math.round(h*0.2), Math.round(w*0.06), textCol, "center", w*0.8)
  const s = Math.round(w*0.46)
  drawQR((w-s)/2, Math.round(h*0.32), s)
  drawSub(opts.subtitle || "Scannez-moi", w/2, Math.round(h*0.32)+s+Math.round(h*0.05), Math.round(w*0.032), accentCol, "center")
  drawContact(w/2, Math.round(h*0.86), Math.round(w*0.024), textCol, "center")
}
else if (tpl.id === "story-promo") {
  ctx.fillStyle = bgColor; ctx.fillRect(0, 0, w, h)
  ctx.fillStyle = fgColor; ctx.fillRect(0, 0, w, Math.round(h*0.45))
  drawTitle(opts.title || opts.titreParDefaut || "PROMO", w/2, Math.round(h*0.2), Math.round(w*0.09), bgColor, "center", w*0.85)
  drawSub(opts.subtitle, w/2, Math.round(h*0.32), Math.round(w*0.038), bgColor, "center")
  const s = Math.round(w*0.55)
  drawQR((w-s)/2, Math.round(h*0.56), s)
  drawSub("Scannez pour en profiter", w/2, Math.round(h*0.56)+s+Math.round(h*0.04), Math.round(w*0.032), textCol, "center")
  drawContact(w/2, Math.round(h*0.9), Math.round(w*0.026), textCol, "center")
}

// ===== Affiches abouties =====
else if (tpl.id === "affiche-centre") {
  const k = w/800, T = opts.title || opts.titreParDefaut || ""
  ctx.fillStyle = bgColor; ctx.fillRect(0,0,w,h)
  drawLabel("Établissement", w/2, 150*k, 16*k, accentCol)
  drawTitleFit(T, w/2, 250*k, 82*k, textCol, "center", w*0.86)
  drawOrn(w/2, 300*k, 90*k, accentCol)
  drawSub(opts.subtitle, w/2, 360*k, 27*k, isDark?"rgba(245,240,232,0.8)":"rgba(42,36,25,0.75)", "center", w*0.78)
  const s = 400*k, x = (w-s)/2, y = 440*k, p = 42*k
  ctx.fillStyle = isDark?"rgba(255,255,255,0.05)":"#FFFFFF"; shadowOn(40*k,16*k, isDark?"rgba(0,0,0,0.45)":"rgba(0,0,0,0.12)")
  rr(x-p, y-p, s+p*2, s+p*2, 22*k); ctx.fill(); shadowOff()
  ctx.strokeStyle = accentCol; ctx.lineWidth = 1; rr(x-p+10*k, y-p+10*k, s+p*2-20*k, s+p*2-20*k, 16*k); ctx.stroke()
  drawQR(x, y, s)
  drawLabel("Scannez pour découvrir", w/2, y+s+p+58*k, 15*k, accentCol)
  ctx.fillStyle = isDark?"rgba(245,240,232,0.18)":"rgba(42,36,25,0.15)"; ctx.fillRect(w/2-120*k, h-130*k, 240*k, 1)
  drawContact(w/2, h-90*k, 21*k, isDark?"rgba(245,240,232,0.6)":"rgba(42,36,25,0.6)", "center")
}
else if (tpl.id === "affiche-bandeau") {
  const k = w/800, T = opts.title || opts.titreParDefaut || ""
  ctx.fillStyle = bgColor; ctx.fillRect(0,0,w,h)
  drawLabel("Bienvenue", w/2, 120*k, 15*k, accentCol)
  drawTitleFit(T, w/2, 200*k, 66*k, textCol, "center", w*0.86)
  drawOrn(w/2, 250*k, 80*k, accentCol)
  const s = 400*k; drawQRFramed((w-s)/2, 300*k, s)
  const by = Math.round(h*0.72)
  const g = ctx.createLinearGradient(0,by,0,h); g.addColorStop(0, accentCol); g.addColorStop(1, shade(accentCol,-18))
  ctx.fillStyle = g; ctx.fillRect(0, by, w, h-by)
  ctx.fillStyle = "rgba(255,255,255,0.25)"; ctx.fillRect(0, by, w, 2)
  const on = isDarkHex(accentCol) ? "#FFFFFF" : "#0A0A0A"
  drawSub(opts.subtitle, w/2, by+85*k, 30*k, on, "center", w*0.82)
  drawLabel("Scannez le code ci-dessus", w/2, by+135*k, 13*k, on)
  drawContact(w/2, h-65*k, 21*k, on, "center")
}
else if (tpl.id === "affiche-cadre") {
  const k = w/800, T = opts.title || opts.titreParDefaut || ""
  ctx.fillStyle = bgColor; ctx.fillRect(0,0,w,h)
  ctx.strokeStyle = accentCol; ctx.lineWidth = 2.5*k; ctx.strokeRect(42*k,42*k,w-84*k,h-84*k)
  ctx.lineWidth = 1; ctx.strokeRect(56*k,56*k,w-112*k,h-112*k)
  ;[[56*k,56*k],[w-56*k,56*k],[56*k,h-56*k],[w-56*k,h-56*k]].forEach(([cx,cy]) => { ctx.fillStyle = accentCol; ctx.save(); ctx.translate(cx,cy); ctx.rotate(Math.PI/4); ctx.fillRect(-7*k,-7*k,14*k,14*k); ctx.restore() })
  drawLabel("Établissement", w/2, 160*k, 15*k, accentCol)
  drawTitleFit(T, w/2, 250*k, 80*k, textCol, "center", w*0.74)
  drawOrn(w/2, 300*k, 80*k, accentCol)
  drawSub(opts.subtitle, w/2, 358*k, 25*k, isDark?"rgba(245,240,232,0.8)":"rgba(42,36,25,0.72)", "center", w*0.7)
  const s = 380*k; drawQRFramed((w-s)/2, 430*k, s)
  drawLabel("Scannez-moi", w/2, 430*k+s+70*k, 15*k, textCol)
  ctx.fillStyle = isDark?"rgba(245,240,232,0.18)":"rgba(42,36,25,0.15)"; ctx.fillRect(w/2-110*k, h-145*k, 220*k, 1)
  drawContact(w/2, h-110*k, 20*k, isDark?"rgba(245,240,232,0.6)":"rgba(42,36,25,0.6)", "center")
}
else if (tpl.id === "affiche-split") {
  const k = w/800, T = opts.title || opts.titreParDefaut || ""
  ctx.fillStyle = bgColor; ctx.fillRect(0,0,w,h)
  const cw = w*0.46
  const g = ctx.createLinearGradient(0,0,0,h); g.addColorStop(0, accentCol); g.addColorStop(1, shade(accentCol,-16))
  ctx.fillStyle = g; ctx.fillRect(0,0,cw,h)
  ctx.fillStyle = "rgba(255,255,255,0.12)"; ctx.fillRect(cw-1, 0, 2, h)
  const on = isDarkHex(accentCol) ? "#FFFFFF" : "#0A0A0A"
  drawLabel("Établissement", 54*k, 150*k, 14*k, on, "left")
  const tb = drawTitleWrap(T, 54*k, 240*k, 56*k, 56*k, on, "left", cw-100*k)
  ctx.fillStyle = on; ctx.fillRect(54*k, tb+34*k, 80*k, 3)
  drawSub(opts.subtitle, 54*k, tb+90*k, 22*k, on, "left", cw-100*k)
  ctx.fillStyle = isDarkHex(accentCol)?"rgba(255,255,255,0.3)":"rgba(0,0,0,0.25)"; ctx.fillRect(54*k, h-130*k, cw-108*k, 1)
  drawContact(54*k, h-95*k, 17*k, on, "left", cw-90*k)
  const s = Math.min((w-cw)*0.78, 360*k), x = cw + ((w-cw)-s)/2, y = (h-s)/2 - 20*k
  drawQRFramed(x, y, s)
  drawLabel("Scannez-moi", cw+(w-cw)/2, y+s+70*k, 14*k, textCol)
}
else if (tpl.id === "affiche-ticket") {
  const k = w/800, T = opts.title || opts.titreParDefaut || ""
  ctx.fillStyle = bgColor; ctx.fillRect(0,0,w,h)
  const cx = 86*k, cw = w-172*k, cy = 120*k, ch = h-240*k
  ctx.fillStyle = isDark?"#15140F":"#FFFFFF"; shadowOn(45*k,18*k, isDark?"rgba(0,0,0,0.5)":"rgba(0,0,0,0.14)")
  rr(cx, cy, cw, ch, 24*k); ctx.fill(); shadowOff()
  ctx.strokeStyle = accentCol; ctx.lineWidth = 1.5; rr(cx+8*k, cy+8*k, cw-16*k, ch-16*k, 18*k); ctx.stroke()
  const onC = isDark ? "#F5F0E8" : "#1A1A1A"
  drawLabel("Invitation", w/2, cy+72*k, 15*k, accentCol)
  drawTitleFit(T, w/2, cy+158*k, 66*k, onC, "center", cw-90*k)
  drawSub(opts.subtitle, w/2, cy+212*k, 23*k, isDark?"rgba(245,240,232,0.75)":"rgba(42,36,25,0.7)", "center", cw-90*k)
  const sy = cy+268*k; ctx.strokeStyle = accentCol; ctx.setLineDash([9*k,8*k]); ctx.lineWidth = 2
  ctx.beginPath(); ctx.moveTo(cx+34*k, sy); ctx.lineTo(cx+cw-34*k, sy); ctx.stroke(); ctx.setLineDash([])
  ctx.fillStyle = bgColor; ctx.beginPath(); ctx.arc(cx, sy, 17*k, 0, 7); ctx.fill(); ctx.beginPath(); ctx.arc(cx+cw, sy, 17*k, 0, 7); ctx.fill()
  const s = 300*k; drawQRFramed((w-s)/2, sy+48*k, s)
  drawLabel("Scannez pour réserver", w/2, sy+48*k+s+52*k, 14*k, accentCol)
  drawContact(w/2, h-78*k, 19*k, isDark?"rgba(245,240,232,0.6)":"rgba(42,36,25,0.6)", "center")
}

// ===== Cartes de table (v2, contraste fort) =====
else if (tpl.id === "carte-bloc") {
  const k = w/900, T = opts.title || opts.titreParDefaut || "", pw = w*0.54
  ctx.fillStyle = bgColor; ctx.fillRect(0,0,w,h)
  const g = ctx.createLinearGradient(0,0,pw,h); g.addColorStop(0, shade(accentCol,12)); g.addColorStop(1, shade(accentCol,-22))
  ctx.fillStyle = g; ctx.fillRect(0,0,pw,h)
  const on = isDarkHex(accentCol) ? "#FFFFFF" : "#1A1209"
  drawLabel("Établissement", 56*k, 96*k, 15*k, on, "left")
  drawTitleFit(T, 56*k, 176*k, 58*k, on, "left", pw-100*k)
  ctx.fillStyle = on; ctx.fillRect(56*k, 206*k, 72*k, Math.max(2,Math.round(3*k)))
  drawSub(opts.subtitle, 56*k, 254*k, 23*k, on, "left", pw-100*k)
  drawContact(56*k, h-56*k, 17*k, on, "left", pw-90*k)
  const s = 300*k; drawQRFramed(pw + ((w-pw)-s)/2, (h-s)/2, s)
}
else if (tpl.id === "carte-header") {
  const k = w/900, T = opts.title || opts.titreParDefaut || "", bh = h*0.40
  ctx.fillStyle = bgColor; ctx.fillRect(0,0,w,h)
  const g = ctx.createLinearGradient(0,0,w,0); g.addColorStop(0, accentCol); g.addColorStop(1, shade(accentCol,-20))
  ctx.fillStyle = g; ctx.fillRect(0,0,w,bh)
  const on = isDarkHex(accentCol) ? "#FFFFFF" : "#1A1209"
  drawLabel("Bienvenue", 56*k, 70*k, 13*k, on, "left")
  drawTitleFit(T, 56*k, 140*k, 52*k, on, "left", w-120*k)
  const txt = isDark?"#F5F0E8":"#2A2419", soft = isDark?"rgba(245,240,232,0.7)":"rgba(42,36,25,0.65)"
  const qs = 210*k, qx = 64*k, qy = bh+30*k; drawQRFramed(qx, qy, qs)
  const tx = qx+qs+46*k
  drawSub(opts.subtitle, tx, bh+90*k, 24*k, txt, "left", w-tx-60*k)
  ctx.fillStyle = accentCol; ctx.fillRect(tx, bh+112*k, 60*k, Math.max(2,Math.round(3*k)))
  drawContact(tx, bh+170*k, 18*k, soft, "left", w-tx-60*k)
}
else if (tpl.id === "carte-pleine") {
  const k = w/900, T = opts.title || opts.titreParDefaut || ""
  const base = isDark ? bgColor : textCol, on = isDark ? textCol : bgColor
  const ini = ((T || "A").trim()[0] || "A").toUpperCase()
  ctx.fillStyle = base; ctx.fillRect(0,0,w,h)
  ctx.save(); ctx.globalAlpha = 0.06; ctx.fillStyle = on; ctx.font = `700 ${520*k}px '${titleFont}', serif`; ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.fillText(ini, w*0.30, h*0.52); ctx.restore(); ctx.textBaseline = "alphabetic"
  drawLabel("La Carte", 60*k, 108*k, 14*k, accentCol, "left")
  drawTitleFit(T, 60*k, 182*k, 56*k, on, "left", w*0.56)
  ctx.fillStyle = accentCol; ctx.fillRect(60*k, 212*k, 72*k, Math.max(2,Math.round(3*k)))
  drawSub(opts.subtitle, 60*k, 262*k, 23*k, on, "left", w*0.52)
  drawContact(60*k, h-56*k, 17*k, accentCol, "left", w*0.52)
  const s = 300*k; drawQRFramed(w-s-70*k, (h-s)/2, s)
}
else if (tpl.id === "carte-duo") {
  const k = w/900, T = opts.title || opts.titreParDefaut || ""
  const txt = isDark?"#F5F0E8":"#2A2419", soft = isDark?"rgba(245,240,232,0.7)":"rgba(42,36,25,0.62)"
  const ini = ((T || "A").trim()[0] || "A").toUpperCase()
  ctx.fillStyle = bgColor; ctx.fillRect(0,0,w,h)
  ctx.fillStyle = accentCol; ctx.fillRect(0,0,14*k,h)
  const qs = 346*k, qx = 70*k, qy = (h-qs)/2; drawQRFramed(qx, qy, qs)
  const x0 = qx+qs+60*k, mw = w-x0-60*k
  ctx.save(); ctx.globalAlpha = 0.05; ctx.fillStyle = accentCol; ctx.font = `700 ${360*k}px '${titleFont}', serif`; ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.fillText(ini, x0+mw*0.6, h*0.5); ctx.restore(); ctx.textBaseline = "alphabetic"
  drawLabel("Établissement", x0, 112*k, 15*k, accentCol, "left")
  drawTitleFit(T, x0, 180*k, 54*k, txt, "left", mw)
  ctx.fillStyle = accentCol; ctx.fillRect(x0, 210*k, 72*k, Math.max(2,Math.round(3*k)))
  drawSub(opts.subtitle, x0, 258*k, 23*k, txt, "left", mw)
  drawContact(x0, h-58*k, 17*k, soft, "left", mw)
}
// ===== Sous-bocks (ronds) =====
else if (tpl.id === "bock-plein") {
  const k = w/900, T = opts.title || opts.titreParDefaut || "", R = 430*k
  ctx.fillStyle = bgColor; ctx.fillRect(0,0,w,h)
  ctx.save(); ctx.beginPath(); ctx.arc(w/2,h/2,R,0,Math.PI*2); ctx.clip()
  const base = isDark ? bgColor : textCol, on = isDark ? textCol : bgColor
  ctx.fillStyle = base; ctx.fillRect(0,0,w,h)
  drawLabel("La Carte des bières", w/2, 180*k, 18*k, accentCol, "center")
  drawTitleFit(T, w/2, 255*k, 52*k, on, "center", R*1.5)
  const qs = 300*k; drawQRFramed(w/2-qs/2, h/2-qs/2+30*k, qs)
  drawSub(opts.subtitle, w/2, h/2+qs/2+90*k, 22*k, on, "center", R*1.5)
  ctx.restore()
  ctx.strokeStyle = accentCol; ctx.lineWidth = 6*k; ctx.beginPath(); ctx.arc(w/2,h/2,R-3*k,0,Math.PI*2); ctx.stroke()
}
else if (tpl.id === "bock-cerne") {
  const k = w/900, T = opts.title || opts.titreParDefaut || "", R = 430*k
  ctx.fillStyle = isDark?"#0A0A0A":"#FFFFFF"; ctx.fillRect(0,0,w,h)
  ctx.save(); ctx.beginPath(); ctx.arc(w/2,h/2,R,0,Math.PI*2); ctx.clip(); ctx.fillStyle = bgColor; ctx.fillRect(0,0,w,h); ctx.restore()
  ctx.strokeStyle = accentCol; ctx.lineWidth = 8*k; ctx.beginPath(); ctx.arc(w/2,h/2,R-6*k,0,Math.PI*2); ctx.stroke()
  ctx.lineWidth = 2*k; ctx.beginPath(); ctx.arc(w/2,h/2,R-26*k,0,Math.PI*2); ctx.stroke()
  const txt = isDark?"#F5F0E8":"#2A2419"
  drawLabel("Bières & Cocktails", w/2, 210*k, 17*k, accentCol, "center")
  drawTitleFit(T, w/2, 285*k, 50*k, txt, "center", R*1.4)
  const qs = 300*k; drawQRFramed(w/2-qs/2, h/2-qs/2+40*k, qs)
  drawSub(opts.subtitle, w/2, h/2+qs/2+100*k, 21*k, txt, "center", R*1.4)
}
else if (tpl.id === "bock-mono") {
  const k = w/900, T = opts.title || opts.titreParDefaut || "", R = 430*k
  const ini = ((T || "A").trim()[0] || "A").toUpperCase()
  ctx.fillStyle = isDark?"#0A0A0A":"#FFFFFF"; ctx.fillRect(0,0,w,h)
  ctx.save(); ctx.beginPath(); ctx.arc(w/2,h/2,R,0,Math.PI*2); ctx.clip()
  const base = isDark ? bgColor : textCol, on = isDark ? textCol : bgColor
  ctx.fillStyle = base; ctx.fillRect(0,0,w,h); ctx.restore()
  ctx.strokeStyle = accentCol; ctx.lineWidth = 6*k; ctx.beginPath(); ctx.arc(w/2,h/2,R-4*k,0,Math.PI*2); ctx.stroke()
  ctx.lineWidth = 3*k; ctx.beginPath(); ctx.arc(w/2,205*k,54*k,0,Math.PI*2); ctx.stroke()
  const onTxt = isDark ? textCol : bgColor
  ctx.fillStyle = onTxt; ctx.font = `700 ${62*k}px '${titleFont}', serif`; ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.fillText(ini, w/2, 208*k); ctx.textBaseline = "alphabetic"; ctx.textAlign = "left"
  drawTitleFit(T, w/2, 330*k, 40*k, onTxt, "center", R*1.3)
  const qs = 270*k; drawQRFramed(w/2-qs/2, h/2-qs/2+70*k, qs)
  drawLabel("Scannez la carte", w/2, h/2+qs/2+120*k, 14*k, accentCol, "center")
}

}
