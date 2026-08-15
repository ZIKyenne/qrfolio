"use client"

// Print Studio — UI guidée « objets, pas outils » (Print Studio Mobile v3).
// Bibliothèque -> aperçu packshot + 3 volets bornés -> contrôle avant export -> export.
// Consomme les modules purs : catalog / mockup / states / tokens.

import { useEffect, useMemo, useRef, useState } from "react"
import Link from "next/link"
import { ArrowLeft, Lock, Unlock, Eye, EyeOff, ChevronUp, Check, X, Download, ShieldCheck, AlertTriangle, ChevronDown, Copy, Layers, Undo2, Redo2, Plus,
  Star, Heart, Phone, Mail, MapPin, Wifi, Clock, Gift, Coffee, Globe, Sparkles, Camera, Music, Tag, Zap,
  Award, Sun, Moon, Leaf, Navigation, Home, Users, Utensils, Wine, Beer, Pizza, ShoppingBag, ShoppingCart,
  CreditCard, Percent, MessageCircle, ThumbsUp, Share2, Send, AtSign, Link2, QrCode, Smartphone, Calendar, Bell, Info, Scissors, ArrowDown } from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import Particles from "@/components/Particles"
import { Modal } from "@/components/ui/Modal"
import { Button } from "@/components/ui/Button"
import QRCanvas from "../qr-codes/QRCanvas"
import { getQRBlob, createQRSvg, type QROptions } from "../qr-codes/qrRender"
import {
  METIERS, OBJECTIFS, BRANDNAMES, filterItems, ambiancesFor, ITEM_BY_ID, STYLE_BY_ID,
  LAYOUT_BY_ID, LAYOUTS, STYLES, TYPOS, SIZES, MESSAGES, type Item, type Style,
} from "./catalog"
import { sceneLayers, paletteFromStyle, scaleFor, SCENES } from "./mockup"
import { filterTemplates, type PrintTemplate, type TemplateVariant } from "./templates"
import { printPreflight, hexContrastRatio } from "../qr-codes/printPreflight"
import { color as C, radius as R } from "./tokens"

// item.layout est parfois une clé de contenu ('stack'), parfois un id de layout ('orne').
// On résout toujours vers un id de LAYOUTS valide (pour le volet Mise en page).
function resolveLayoutId(itemLayout: string): string {
  if (LAYOUT_BY_ID[itemLayout]) return itemLayout
  const byContent = LAYOUTS.find(l => l.content === itemLayout)
  return byContent ? byContent.id : "centre"
}
// eTitle / ePad sont des MULTIPLICATEURS continus (curseurs), 1 = valeur nominale.
const FINISH_LABEL: Record<string, string> = { uni: "Uni", degrade: "Dégradé", grain: "Grain", rayures: "Rayures", quadrillage: "Quadrillage" }
const FINISH_OPTS = [{ id: "uni", label: "Uni" }, { id: "degrade", label: "Dégradé" }, { id: "grain", label: "Grain" }, { id: "rayures", label: "Rayures" }, { id: "quadrillage", label: "Quadrillage" }]
const FRAME_LABEL: Record<string, string> = { aucun: "sans cadre", filet: "filet", double: "double filet", coins: "coins ornés" }
// Mises en page adaptées aux supports RONDS (centrées/symétriques) : les autres (bandeau, affiche, colonnes…)
// supposent un rectangle et se retrouvent rognées par le cercle.
const ROUND_LAYOUTS = new Set(["centre", "qrgeant", "cadre", "orne"])
// Une mise en page est-elle COMPATIBLE avec la forme/le ratio du support ?
// - rond : uniquement les mises en page centrées.
// - « colonnes/split » (QR À CÔTÉ du texte) : besoin de largeur (ratio ≥ 1.15) sinon le texte est écrasé/déborde.
function layoutOk(id: string, item: Item): boolean {
  if (item.shape === "round") return ROUND_LAYOUTS.has(id)
  const l = LAYOUT_BY_ID[id]
  if (!l) return false
  if (l.content === "split") return item.ratio >= 1.15
  // « Affiche » (poster) suppose un GRAND support (A5+) : titre géant + QR + bouton côte à côte
  // débordent sur une petite carte. Sur un petit support, le preset est ramené au centré.
  if (l.content === "poster") return item.hMm >= 180
  return true
}
// Ramène une mise en page vers une compatible (fallback = centré).
function fitLayout(id: string, item: Item): string {
  return layoutOk(id, item) ? id : "centre"
}
// Couleurs d'accent (override de l'ambiance) : « auto » = laisse l'ambiance décider.
const ACCENTS: { id: string; label: string; hex: string }[] = [
  { id: "auto", label: "Auto", hex: "" },
  { id: "or", label: "Or", hex: "#C9A84C" },
  { id: "rouge", label: "Rouge", hex: "#D4483B" },
  { id: "corail", label: "Corail", hex: "#E5735B" },
  { id: "vert", label: "Vert", hex: "#3E9E6E" },
  { id: "bleu", label: "Bleu", hex: "#3B6FD4" },
  { id: "violet", label: "Violet", hex: "#7A5CD4" },
  { id: "rose", label: "Rose", hex: "#D45C9E" },
]
const TITLE_WEIGHT: Record<string, number> = { fin: 400, normal: 0, gras: 800 } // 0 = graisse de l'ambiance
// Encre lisible (noir/blanc) sur une couleur donnée — pour le libellé du bouton accentué.
function readableOn(hex: string): string {
  const m = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
  if (!m) return "#0A0A0A"
  const L = (0.299 * parseInt(m[1], 16) + 0.587 * parseInt(m[2], 16) + 0.114 * parseInt(m[3], 16)) / 255
  return L > 0.6 ? "#0A0A0A" : "#FFFFFF"
}
// Éclaircit (amt>0) ou assombrit (amt<0) une couleur hex ; renvoie l'entrée si non hex (bi-ton du bouton).
function shade(hex: string, amt: number): string {
  const m = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
  if (!m) return hex
  const adj = (c: number) => Math.max(0, Math.min(255, Math.round(amt < 0 ? c * (1 + amt) : c + (255 - c) * amt)))
  return `#${[1, 2, 3].map(i => adj(parseInt(m[i], 16)).toString(16).padStart(2, "0")).join("")}`
}
// Élément LIBRE (mode « Studio libre ») : texte / icône / forme posé et déplacé n'importe où sur le support.
// x/y/w/h2/size en FRACTION du support -> invariant à l'échelle (aperçu, planche PDF identiques).
type FreeEl = { id: string; kind: "text" | "icon" | "shape"; x: number; y: number; w: number; h2?: number; size: number; color: string; align: "left" | "center" | "right"; weight: number; font: string; text: string; icon?: string; shape?: string; rot?: number; opacity?: number; hidden?: boolean; locked?: boolean }
// Libellé court d'un élément pour la liste des calques.
function layerLabel(el: FreeEl): string {
  if (el.kind === "text") return el.text.trim() ? (el.text.length > 22 ? el.text.slice(0, 22) + "…" : el.text) : "Texte"
  if (el.kind === "icon") return el.icon || "Icône"
  return el.shape === "line" ? "Ligne" : el.shape === "pill" ? "Pilule" : el.shape === "rrect" ? "Rectangle" : "Cercle"
}
// Bibliothèque d'icônes libres (lucide, NON-marque — lucide-react 1.17 n'a plus les logos ; cf [[lucide-icons-gotcha]]).
// Le garde-fou check-jsx-imports + tsc valident leur existence au build.
const ICON_LIB: Record<string, any> = {
  Star, Heart, Sparkles, Award, Sun, Moon, Leaf,
  Phone, Mail, MapPin, Navigation, Globe, Clock, Home, Users,
  Coffee, Utensils, Wine, Beer, Pizza,
  ShoppingBag, ShoppingCart, CreditCard, Percent, Tag, Gift,
  Camera, Music, MessageCircle, ThumbsUp, Share2, Send, AtSign, Link2,
  Wifi, QrCode, Smartphone, Zap, Calendar, Bell, Info, Scissors, ArrowDown,
}
// Bibliothèque d'icônes ORGANISÉE (catégories + libellés FR pour la recherche du « + Ajouter »).
const ICON_CATS: { cat: string; items: { name: string; label: string }[] }[] = [
  { cat: "Général", items: [{ name: "Star", label: "Étoile" }, { name: "Heart", label: "Cœur" }, { name: "Sparkles", label: "Éclat" }, { name: "Award", label: "Récompense" }, { name: "Sun", label: "Soleil" }, { name: "Moon", label: "Lune" }, { name: "Leaf", label: "Feuille" }] },
  { cat: "Contact", items: [{ name: "Phone", label: "Téléphone" }, { name: "Mail", label: "Email" }, { name: "MapPin", label: "Adresse" }, { name: "Navigation", label: "Itinéraire" }, { name: "Globe", label: "Site web" }, { name: "Clock", label: "Horaires" }, { name: "Home", label: "Accueil" }, { name: "Users", label: "Équipe" }] },
  { cat: "Restaurant", items: [{ name: "Coffee", label: "Café" }, { name: "Utensils", label: "Couverts" }, { name: "Wine", label: "Vin" }, { name: "Beer", label: "Bière" }, { name: "Pizza", label: "Pizza" }] },
  { cat: "Commerce", items: [{ name: "ShoppingBag", label: "Sac" }, { name: "ShoppingCart", label: "Panier" }, { name: "CreditCard", label: "Paiement" }, { name: "Percent", label: "Promo" }, { name: "Tag", label: "Étiquette" }, { name: "Gift", label: "Cadeau" }] },
  { cat: "Réseaux", items: [{ name: "Camera", label: "Photo" }, { name: "Music", label: "Musique" }, { name: "MessageCircle", label: "Message" }, { name: "ThumbsUp", label: "J'aime" }, { name: "Share2", label: "Partager" }, { name: "Send", label: "Envoyer" }, { name: "AtSign", label: "Mention" }, { name: "Link2", label: "Lien" }] },
  { cat: "Fonctionnel", items: [{ name: "Wifi", label: "Wifi" }, { name: "QrCode", label: "QR" }, { name: "Smartphone", label: "Mobile" }, { name: "Zap", label: "Éclair" }, { name: "Calendar", label: "Agenda" }, { name: "Bell", label: "Cloche" }, { name: "Info", label: "Info" }, { name: "Scissors", label: "Coupe" }] },
]
// Formes libres (avec libellé FR pour la recherche du « + Ajouter »).
const SHAPES: { id: string; label: string; g: string }[] = [
  { id: "circle", label: "Cercle", g: "●" }, { id: "rrect", label: "Rectangle", g: "▢" }, { id: "pill", label: "Pilule", g: "▬" }, { id: "line", label: "Ligne", g: "―" },
]
// Légende d'aperçu CONTEXTUELLE au support (§23) : selon où l'objet se pose réellement.
function supportHint(item: Item): string {
  switch (item.place) {
    case "Vitrine": return "Placez le téléphone contre la vitre pour prévisualiser"
    case "Mur": return "Visualisez la taille réelle sur votre mur"
    case "Comptoir": return "Posé sur le comptoir — taille réelle"
    case "Main": return "Dans la main — taille réelle"
    case "Table": return "À poser sur la table — taille réelle"
    default: return "Aperçu à taille réelle"
  }
}
// Safe-area des éléments libres : plus petite distance d'un élément au bord du support (mm).
// Sert au pré-vol (mode Studio libre) — un élément au ras du bord = risque de rognage.
function freeElsEdgeMm(els: FreeEl[], item: Item): number {
  const wmm = item.shape === "round" ? item.hMm : item.hMm * item.ratio, hmm = item.hMm
  let min = Infinity
  for (const e of els) {
    const wEl = e.kind === "icon" ? e.size : e.w
    const hEl = e.kind === "shape" ? (e.h2 ?? 0.12) : e.size
    const m = Math.min(e.x * wmm, (1 - (e.x + wEl)) * wmm, e.y * hmm, (1 - (e.y + hEl)) * hmm)
    if (m < min) min = m
  }
  return min === Infinity ? item.margin : Math.max(0, +min.toFixed(1))
}
// Compositions prêtes (§13) : des GROUPES d'éléments finis, posés en un clic autour du QR (près du haut du support,
// pour ne pas recouvrir le QR au centre). Positions en fraction ; couleurs dérivées du thème courant à l'ajout.
type Palette = ReturnType<typeof paletteFromStyle>
function cT(x: number, y: number, w: number, size: number, text: string, weight: number, color: string, align: "left" | "center" | "right" = "center"): Omit<FreeEl, "id"> { return { kind: "text", x, y, w, size, color, align, weight, font: "", text } }
function cI(x: number, y: number, size: number, icon: string, color: string): Omit<FreeEl, "id"> { return { kind: "icon", x, y, w: size, h2: size, size, color, align: "center", weight: 700, font: "", text: "", icon } }
function cS(x: number, y: number, w: number, h2: number, shape: string, color: string): Omit<FreeEl, "id"> { return { kind: "shape", x, y, w, h2, size: 0.06, color, align: "center", weight: 700, font: "", text: "", shape } }
const COMPOSITIONS: { id: string; label: string; hint: string; build: (p: Palette) => Omit<FreeEl, "id">[] }[] = [
  { id: "scannez", label: "Scannez ici", hint: "flèche + accroche", build: p => [cT(0.2, 0.06, 0.6, 0.07, "Scannez ici", 800, p.fg), cI(0.44, 0.18, 0.12, "ArrowDown", p.band)] },
  { id: "avis", label: "Votre avis", hint: "5 étoiles + texte", build: p => [...[0, 1, 2, 3, 4].map(i => cI(0.18 + i * 0.13, 0.08, 0.08, "Star", p.band)), cT(0.15, 0.2, 0.7, 0.055, "Votre avis compte", 700, p.fg)] },
  { id: "wifi", label: "Wi-Fi gratuit", hint: "icône + réseau", build: p => [cI(0.43, 0.06, 0.14, "Wifi", p.band), cT(0.15, 0.24, 0.7, 0.07, "Wi-Fi gratuit", 800, p.fg), cT(0.15, 0.34, 0.7, 0.04, "Réseau : ________", 500, p.fg)] },
  { id: "suivre", label: "Suivez-nous", hint: "@ + identifiant", build: p => [cI(0.34, 0.06, 0.1, "AtSign", p.band), cT(0.15, 0.19, 0.7, 0.065, "Suivez-nous", 800, p.fg), cT(0.15, 0.28, 0.7, 0.045, "@votrecompte", 600, p.band)] },
  { id: "reserver", label: "Réservez", hint: "bouton + infos", build: p => [cS(0.28, 0.08, 0.44, 0.1, "pill", p.band), cT(0.28, 0.1, 0.44, 0.055, "Réservez", 800, p.bandFg), cT(0.2, 0.23, 0.6, 0.04, "Sur place ou en ligne", 500, p.fg)] },
  { id: "fidelite", label: "Fidélité", hint: "tampons + points", build: p => [cT(0.2, 0.06, 0.6, 0.065, "Vos points", 800, p.fg), ...[0, 1, 2, 3, 4].map(i => cS(0.18 + i * 0.13, 0.18, 0.08, 0.08, "circle", p.band))] },
]
// Modèles « 1 clic » : combinaisons de réglages prêtes (ambiance + mise en page + accent + fond + cadre + textes).
type Preset = { id: string; label: string; style: string; layout: string; accent: string; bgFinish: string; frame: string; titleCase: string; titleWeight: string; qrBadge: string; eCorner: string; eAccent: string; eAlign: "left" | "center" | "right" }
const PRESETS: Preset[] = [
  { id: "epure", label: "Épuré", style: "minimal", layout: "centre", accent: "auto", bgFinish: "uni", frame: "aucun", titleCase: "normal", titleWeight: "normal", qrBadge: "carre", eCorner: "adouci", eAccent: "trait", eAlign: "center" },
  { id: "luxe", label: "Luxe", style: "luxgold", layout: "cadre", accent: "or", bgFinish: "degrade", frame: "coins", titleCase: "upper", titleWeight: "normal", qrBadge: "cercle", eCorner: "adouci", eAccent: "plein", eAlign: "center" },
  { id: "nuit", label: "Nuit", style: "premiumdark", layout: "centre", accent: "auto", bgFinish: "degrade", frame: "filet", titleCase: "normal", titleWeight: "normal", qrBadge: "carre", eCorner: "adouci", eAccent: "plein", eAlign: "center" },
  { id: "pop", label: "Pop", style: "neon", layout: "bandeau", accent: "rose", bgFinish: "grain", frame: "aucun", titleCase: "upper", titleWeight: "gras", qrBadge: "carre", eCorner: "vif", eAccent: "plein", eAlign: "left" },
  { id: "nature", label: "Nature", style: "sage", layout: "centre", accent: "vert", bgFinish: "uni", frame: "filet", titleCase: "normal", titleWeight: "normal", qrBadge: "carre", eCorner: "rond", eAccent: "plein", eAlign: "center" },
  { id: "affiche", label: "Affiche", style: "sunset", layout: "affiche", accent: "corail", bgFinish: "degrade", frame: "aucun", titleCase: "upper", titleWeight: "gras", qrBadge: "carre", eCorner: "vif", eAccent: "plein", eAlign: "left" },
  { id: "carte", label: "Carte", style: "modernblack", layout: "colonnes", accent: "auto", bgFinish: "uni", frame: "filet", titleCase: "normal", titleWeight: "normal", qrBadge: "carre", eCorner: "adouci", eAccent: "trait", eAlign: "left" },
  { id: "edito", label: "Édito", style: "inkedit", layout: "diagonale", accent: "auto", bgFinish: "quadrillage", frame: "aucun", titleCase: "upper", titleWeight: "normal", qrBadge: "carre", eCorner: "vif", eAccent: "trait", eAlign: "left" },
]

// Détection responsive (sans dupliquer le métier, §16) : bascule le shell en mode mobile ≤ bp.
function useIsMobile(bp = 1024) {
  const [m, setM] = useState(false)
  useEffect(() => {
    const mq = window.matchMedia(`(max-width:${bp}px)`)
    const on = () => setM(mq.matches); on()
    mq.addEventListener("change", on)
    return () => mq.removeEventListener("change", on)
  }, [bp])
  return m
}

// UX clavier mobile (§11) : hauteur du clavier virtuel (visualViewport) + champ texte focalisé.
// Actif seulement sur mobile pour ne pas perturber le desktop (pas de scroll auto au focus).
function useKeyboard(enabled: boolean) {
  const [kb, setKb] = useState(0)
  const [typing, setTyping] = useState(false)
  useEffect(() => {
    if (!enabled) { setKb(0); setTyping(false); return }
    const vv = window.visualViewport
    // On ARRONDIT (pas de re-render pour 1-2px) et on ne réagit QUE si le palier change ⇒ zéro churn pendant la frappe
    // (évite les artefacts de saisie type « jourtr » avec les claviers prédictifs). Pas d'écoute « scroll » (trop bruyante).
    const quant = () => { if (!vv) return 0; const h = Math.max(0, window.innerHeight - vv.height - vv.offsetTop); return h > 120 ? Math.round(h / 20) * 20 : 0 }
    const onResize = () => setKb(prev => { const q = quant(); return q === prev ? prev : q })
    const isField = (el: EventTarget | null) => { const t = el as HTMLElement | null; return !!t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.isContentEditable) }
    const onFocus = (e: FocusEvent) => { if (isField(e.target)) { setTyping(true); const t = e.target as HTMLElement; setTimeout(() => { try { t.scrollIntoView({ block: "center", behavior: "smooth" }) } catch {} }, 160) } }
    const onBlur = () => setTyping(false)
    vv?.addEventListener("resize", onResize); onResize()
    window.addEventListener("focusin", onFocus); window.addEventListener("focusout", onBlur)
    return () => { vv?.removeEventListener("resize", onResize); window.removeEventListener("focusin", onFocus); window.removeEventListener("focusout", onBlur) }
  }, [enabled])
  return { kb, typing }
}
// Attributs anti-artefacts pour les champs texte du studio (claviers mobiles prédictifs).
const textInputProps = { autoCorrect: "off", autoCapitalize: "sentences", spellCheck: false, enterKeyHint: "done" as const }

export default function PrintStudioClient({ canAccess }: { canAccess: boolean }) {
  const isMobile = useIsMobile()
  const { kb, typing } = useKeyboard(isMobile)   // clavier virtuel : hauteur + saisie en cours (§11)
  const [sheetOpen, setSheetOpen] = useState(false)   // bottom sheet des réglages (mobile)
  const [mobileTab, setMobileTab] = useState<"theme" | "couleurs" | "texte" | "qr">("theme")   // onglet simple mobile
  const [phase, setPhase] = useState<"library" | "studio">("library")
  const [metier, setMetier] = useState("Tout")
  const [objectif, setObjectif] = useState("Tout")
  const [itemId, setItemId] = useState<string | null>(null)

  // état studio
  const [styleId, setStyleId] = useState("premiumdark")
  const [layoutId, setLayoutId] = useState("centre")
  const [sizeId, setSizeId] = useState("moyen")
  const [brandText, setBrandText] = useState(BRANDNAMES[0])   // nom affiché (libre)
  const [subtitle, setSubtitle] = useState("")               // accroche / sous-titre optionnel
  const [message, setMessage] = useState("")                 // titre principal
  const [ctaText, setCtaText] = useState("")                 // libellé du bouton
  const [logo, setLogo] = useState("aucun")            // logo de marque sur l'OBJET (jamais sur le QR)
  const [eTitle, setETitle] = useState(1)
  const [ePad, setEPad] = useState(1)
  const [eCorner, setECorner] = useState("adouci")     // arrondi des éléments du support (pas le QR)
  const [eAccent, setEAccent] = useState("plein")
  const [eTypo, setETypo] = useState("auto")
  const [eAlign, setEAlign] = useState<"left" | "center" | "right">("center")
  const [accent, setAccent] = useState("auto")         // couleur d'accent (override d'ambiance)
  const [titleCase, setTitleCase] = useState("normal") // casse du titre : Aa / MAJUSCULES
  const [titleWeight, setTitleWeight] = useState("normal") // graisse du titre : fin / normal / gras
  const [qrBadge, setQrBadge] = useState("carre")      // pastille derrière le QR : carré / cercle / aucune
  const [qrPos, setQrPos] = useState("centre")         // position verticale du QR (mise en page centrée)
  const [qrScale, setQrScale] = useState(1)            // curseur fin de taille du QR (× facteur du palier)
  const [blockY, setBlockY] = useState(0)              // placement vertical du bloc (curseur, -1..1)
  const [qrDx, setQrDx] = useState(0)                  // décalage fin du QR en X (-1..1)
  const [qrDy, setQrDy] = useState(0)                  // décalage fin du QR en Y (-1..1)
  const [bgImage, setBgImage] = useState<string | null>(null)  // photo de fond optionnelle (data URL ou URL Unsplash)
  const [bgSearch, setBgSearch] = useState("")                 // recherche de photos (Unsplash via /api/unsplash)
  const [bgPhotos, setBgPhotos] = useState<{ id: string; thumb: string; regular: string; author: string }[]>([])
  const [bgLoading, setBgLoading] = useState(false)
  const [bgMsg, setBgMsg] = useState("")
  const [bgCredit, setBgCredit] = useState("")
  const [titleColor, setTitleColor] = useState("")     // couleurs par élément ("" = auto/thème)
  const [subColor, setSubColor] = useState("")
  const [ctaColor, setCtaColor] = useState("")
  const [advColor, setAdvColor] = useState(false)      // repli des couleurs avancées
  const [advQr, setAdvQr] = useState(false)            // repli du décalage fin du QR
  const [advText, setAdvText] = useState(false)        // repli des options de texte (casse/graisse/typo/alignement)
  const [advSel, setAdvSel] = useState(false)          // repli des réglages avancés de l'élément sélectionné (X/Y/rotation/opacité)
  const [bgFinish, setBgFinish] = useState("uni")      // fini du fond du support (uni / dégradé / grain)
  const [frame, setFrame] = useState("aucun")          // cadre décoratif indépendant
  const [open, setOpen] = useState<string | null>("modeles")   // un seul volet ouvert (Modèles à l'entrée — templates = primaire)
  const [flashPanel, setFlashPanel] = useState<string | null>(null)   // volet à surligner brièvement après une sélection contextuelle (#12/#32)
  const [showAllColors, setShowAllColors] = useState(false)
  const [control, setControl] = useState(false)           // écran « contrôle avant export »
  const [declineOpen, setDeclineOpen] = useState(false)    // sélecteur « décliner sur un autre support »
  const [campaignOpen, setCampaignOpen] = useState(false)  // sélecteur « planche multi-supports »
  const [campaign, setCampaign] = useState<string[]>([])   // supports retenus pour la planche
  const [campaignQty, setCampaignQty] = useState(1)        // exemplaires par format (imposition N-up)
  const [multiPrinting, setMultiPrinting] = useState(false)
  const [busy, setBusy] = useState(false)
  const [done, setDone] = useState(false)
  const [printing, setPrinting] = useState(false)         // la planche PDF n'est montée QUE pendant l'impression
  const [designSaved, setDesignSaved] = useState(false)   // feedback « Enregistré »
  const [qrFree, setQrFree] = useState(false)             // QR en position LIBRE (déplaçable), sinon dans la mise en page
  const [qrFx, setQrFx] = useState(0.32)                  // position libre du QR (coin haut-gauche, fraction)
  const [qrFy, setQrFy] = useState(0.55)
  const [zoom, setZoom] = useState(1)                     // zoom de l'éditeur à plat (Studio libre)
  const [fsOpen, setFsOpen] = useState(false)             // aperçu PLEIN ÉCRAN (mobile §2/§9 : « tap = plein écran »)
  const [addOpen, setAddOpen] = useState(false)           // bibliothèque « + Ajouter » (formes/icônes catégorisées)
  const [addSearch, setAddSearch] = useState("")          // recherche dans la bibliothèque d'éléments
  const [libre, setLibre] = useState(false)               // mode « Studio libre » (édition à plat + éléments libres)
  const [freeEls, setFreeEls] = useState<FreeEl[]>([])    // éléments texte libres posés sur le support
  const [selEl, setSelEl] = useState<string | null>(null) // élément libre sélectionné
  const [logoUrl, setLogoUrl] = useState<string | null>(null)
  const logoInput = useRef<HTMLInputElement>(null)
  const bgInput = useRef<HTMLInputElement>(null)
  // Historique Annuler/Rétablir : snapshots du design complet, coalescés (une entrée par salve d'édition).
  const undoRef = useRef<{ past: string[]; future: string[]; apply: boolean; last: string; t: any }>({ past: [], future: [], apply: false, last: "", t: null })
  const [canUndo, setCanUndo] = useState(false)
  const [canRedo, setCanRedo] = useState(false)
  const kbd = useRef<any>({})   // dernières closures (raccourcis clavier montés une seule fois)

  // Source du QR : un QR EXISTANT de l'utilisateur, ou un PNG importé. AUCUNE création ici
  // (Print Studio n'est pas un concepteur de QR — il met en scène un QR déjà fait).
  const [qrSource, setQrSource] = useState<"mine" | "png">("mine")
  const [qrPickId, setQrPickId] = useState("")
  const [qrPng, setQrPng] = useState<string | null>(null)
  const [myQRs, setMyQRs] = useState<{ id: string; label: string; url: string }[]>([])
  const qrPngInput = useRef<HTMLInputElement>(null)

  // Modèles personnels (enregistrés sur CE navigateur — localStorage, aucune donnée serveur).
  const [savedPresets, setSavedPresets] = useState<{ id: string; name: string; cfg: Record<string, any> }[]>([])
  const [presetsRemote, setPresetsRemote] = useState(false)   // true = table print_presets dispo (compte) ; false = localStorage
  const [saving, setSaving] = useState(false)
  const [saveName, setSaveName] = useState("")
  // Ma charte (logo + accent + police), au compte ; repli localStorage.
  const [brandKit, setBrandKit] = useState<{ logo: string | null; accent: string; accent2: string; typo: string } | null>(null)
  const [brandRemote, setBrandRemote] = useState(false)
  // Modèles : d'abord le compte (Supabase, multi-appareils) ; repli localStorage si la table n'existe pas encore.
  useEffect(() => {
    let alive = true
    const sb = createClient()
    sb.from("print_presets").select("id, name, cfg").order("created_at", { ascending: false })
      .then(({ data, error }) => {
        if (!alive) return
        if (!error && data) { setSavedPresets(data.map((r: any) => ({ id: r.id, name: r.name, cfg: r.cfg || {} }))); setPresetsRemote(true) }
        else { try { const raw = localStorage.getItem("qrowg-print-presets"); if (raw) setSavedPresets(JSON.parse(raw)) } catch {} }
      })
    // Charte : peut renvoyer plusieurs lignes en équipe (une par membre) -> on prend la plus récente.
    // Sélection avec accent2 (couleur secondaire) : si la colonne n'existe pas encore (migration non appliquée),
    // la requête échoue → repli localStorage (aucune donnée perdue). Sinon, source de vérité = le compte.
    sb.from("print_brand_kit").select("logo, accent, accent2, typo").order("updated_at", { ascending: false }).limit(1).maybeSingle()
      .then(({ data, error }) => {
        if (!alive) return
        if (!error) { setBrandRemote(true); if (data) setBrandKit({ logo: (data as any).logo || null, accent: (data as any).accent || "auto", accent2: (data as any).accent2 || "", typo: (data as any).typo || "auto" }) }
        else { try { const raw = localStorage.getItem("qrowg-print-brandkit"); if (raw) { const k = JSON.parse(raw); setBrandKit({ accent2: "", ...k }) } } catch {} }
      })
    return () => { alive = false }
  }, [])
  // Montage à la demande de la planche PDF : on la monte, on laisse le QR se rendre, puis on imprime.
  // Rouvrir un design enregistré : arrivée depuis un QR (?qr=) → on restaure sa composition si elle existe.
  useEffect(() => {
    let code = ""
    try { code = new URLSearchParams(window.location.search).get("qr") || "" } catch {}
    if (!code) return
    let alive = true
    fetch(`/api/print-design?short_code=${encodeURIComponent(code)}`)
      .then(r => r.json()).then(d => { if (alive && d && d.design && typeof d.design === "object") restoreDesign(d.design) })
      .catch(() => {})
    return () => { alive = false }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
  useEffect(() => {
    if (!printing) return
    const t = setTimeout(() => { try { window.print() } catch {} }, 220)   // laisse le QR SVG se rendre
    const after = () => setPrinting(false)
    window.addEventListener("afterprint", after)
    return () => { clearTimeout(t); window.removeEventListener("afterprint", after) }
  }, [printing])
  useEffect(() => {
    if (!multiPrinting) return
    const t = setTimeout(() => { try { window.print() } catch {} }, 340)   // multi = plus de QR SVG à rendre
    const after = () => setMultiPrinting(false)
    window.addEventListener("afterprint", after)
    return () => { clearTimeout(t); window.removeEventListener("afterprint", after) }
  }, [multiPrinting])
  function persistPresets(next: { id: string; name: string; cfg: Record<string, any> }[]) { setSavedPresets(next); try { localStorage.setItem("qrowg-print-presets", JSON.stringify(next)) } catch {} }

  // QR existants de l'utilisateur (codes statiques liés à une page + QR instantanés dynamiques/statiques).
  // RLS scope automatiquement. Le QR imprimé encode /q/<short_code> (redirigeable) ou le payload direct.
  useEffect(() => {
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://qrowg.com"
    let alive = true
    const sb = createClient()
    Promise.all([
      sb.from("qr_codes").select("short_code, pages(title, slug)").order("created_at", { ascending: false }).limit(60),
      sb.from("instant_qrs").select("id, label, kind, payload, dynamic, short_code").order("created_at", { ascending: false }).limit(60),
    ]).then(([a, b]) => {
      if (!alive) return
      const list: { id: string; label: string; url: string }[] = []
      for (const r of ((a.data || []) as any[])) {
        if (!r.short_code) continue
        const pg = Array.isArray(r.pages) ? r.pages[0] : r.pages
        list.push({ id: `q_${r.short_code}`, label: pg?.title || pg?.slug || "QR code", url: `${appUrl}/q/${r.short_code}` })
      }
      for (const r of ((b.data || []) as any[])) {
        const url = r.dynamic && r.short_code ? `${appUrl}/q/${r.short_code}` : (r.payload || "")
        if (!url) continue
        list.push({ id: `i_${r.id}`, label: r.label || (r.kind ? `QR ${r.kind}` : "QR instantané"), url })
      }
      setMyQRs(list)
      // Présélection depuis ?qr=<short_code> (ouverture depuis un QR code) : on cible ce QR précis.
      let preferred = ""
      try { const q = new URLSearchParams(window.location.search).get("qr"); if (q && list.some(x => x.id === `q_${q}`)) preferred = `q_${q}` } catch {}
      setQrPickId(prev => prev || preferred || (list[0]?.id ?? ""))
    }).catch(() => { /* liste vide : on retombe sur l'import PNG, pas de crash */ })
    return () => { alive = false }
  }, [])

  const item = itemId ? ITEM_BY_ID[itemId] : null
  const style = STYLE_BY_ID[styleId] || STYLE_BY_ID.premiumdark
  const layout = LAYOUT_BY_ID[layoutId] || LAYOUT_BY_ID.centre
  const size = SIZES.find(s => s.id === sizeId) || SIZES[1]
  const messages = item ? (MESSAGES[item.id] || []) : []
  const brand = brandText.trim() || BRANDNAMES[0]
  const title = message.trim() || (messages[0] ?? item?.title ?? "")
  const cta = ctaText.trim() || item?.cta || ""
  const pickedQR = myQRs.find(q => q.id === qrPickId)
  const qrValue = qrSource === "mine" ? (pickedQR?.url || "https://qrowg.com") : "https://qrowg.com"
  const qrImg = qrSource === "png" ? qrPng : null
  const qrReady = qrSource === "png" ? !!qrPng : !!pickedQR
  const activePreset = PRESETS.find(p => p.style === styleId && p.layout === layoutId && p.accent === accent && p.bgFinish === bgFinish && p.frame === frame && p.titleCase === titleCase && p.titleWeight === titleWeight && p.qrBadge === qrBadge && p.eCorner === eCorner && p.eAccent === eAccent && p.eAlign === eAlign)?.id
  // Config de DESIGN capturable pour un modèle personnel (ni QR ni textes — c'est un « look »).
  const currentCfg: Record<string, any> = { styleId, layoutId, accent, bgFinish, frame, titleCase, titleWeight, qrBadge, qrPos, blockY, qrDx, qrDy, titleColor, subColor, ctaColor, eCorner, eAccent, eTypo, eAlign, eTitle, ePad }
  const activeSavedId = savedPresets.find(p => Object.keys(currentCfg).every(k => p.cfg[k] === currentCfg[k]))?.id
  const ambiances = useMemo(() => ambiancesFor(metier), [metier])
  // Taille EFFECTIVE du QR = palier × curseur fin. Sert au rendu ET au contrôle (guard ≥ 20 mm honnête).
  const effSize = { ...size, factor: +(size.factor * qrScale).toFixed(3) }
  // Pré-vol impression (moteur pur `printPreflight`, testé) — mesures HONNÊTES du design courant.
  // - Contraste : modules du QR vs son fond immédiat (pastille blanche). Sur photo SANS pastille : non mesurable (na).
  // - Zone franche : le QR (marge intégrée) + pastille blanche la garantissent ; le vrai risque = QR posé sur une PHOTO sans pastille.
  // - Safe-area : distance des éléments libres au bord (mode Studio libre).
  const noBadgeOnPhoto = qrBadge === "aucune" && !!bgImage
  const preflight = printPreflight({
    qrSizeMm: item ? +(item.qrMm * effSize.factor).toFixed(1) : null,
    contrastRatio: (qrSource === "png" || noBadgeOnPhoto) ? null : hexContrastRatio(style.qr, style.qrBg),
    quietZoneMm: qrBadge === "aucune" ? (bgImage ? 1 : null) : 5,
    logoPct: 0,
    // Export vectoriel (QR + texte) = net à toute taille ; seule une PHOTO de fond est limitée par le DPI du support.
    dpi: item ? (bgImage ? item.dpi : Math.max(300, item.dpi)) : null,
    edgeMarginMm: item ? (freeEls.length ? freeElsEdgeMm(freeEls, item) : item.margin) : null,
    isScreen: false,
    cmykRiskyColors: null,
  })
  const hasFail = preflight.checks.some(c => c.status === "fail")
  const ok = !hasFail

  function applyPreset(p: Preset) {
    // La mise en page du modèle est ramenée à une compatible avec le support courant (ex. « colonnes » sur un portrait).
    setStyleId(p.style); setLayoutId(item ? fitLayout(p.layout, item) : p.layout); setAccent(p.accent); setBgFinish(p.bgFinish); setFrame(p.frame)
    setTitleCase(p.titleCase); setTitleWeight(p.titleWeight); setQrBadge(p.qrBadge); setECorner(p.eCorner); setEAccent(p.eAccent); setEAlign(p.eAlign)
  }
  function applyCfg(c: Record<string, any>) {
    if (c.styleId) setStyleId(c.styleId); if (c.layoutId) setLayoutId(item ? fitLayout(c.layoutId, item) : c.layoutId); if (c.accent) setAccent(c.accent)
    if (c.bgFinish) setBgFinish(c.bgFinish); if (c.frame) setFrame(c.frame); if (c.titleCase) setTitleCase(c.titleCase)
    if (c.titleWeight) setTitleWeight(c.titleWeight); if (c.qrBadge) setQrBadge(c.qrBadge); if (c.qrPos) setQrPos(c.qrPos)
    if (c.eCorner) setECorner(c.eCorner); if (c.eAccent) setEAccent(c.eAccent); if (c.eTypo) setETypo(c.eTypo); if (c.eAlign) setEAlign(c.eAlign)
    if (typeof c.eTitle === "number") setETitle(c.eTitle); if (typeof c.ePad === "number") setEPad(c.ePad); if (typeof c.blockY === "number") setBlockY(c.blockY)
    if (typeof c.qrDx === "number") setQrDx(c.qrDx); if (typeof c.qrDy === "number") setQrDy(c.qrDy)
    setTitleColor(c.titleColor || ""); setSubColor(c.subColor || ""); setCtaColor(c.ctaColor || "")
  }
  function resetDesign() {
    if (!item) return
    setStyleId(item.pal); setLayoutId(resolveLayoutId(item.layout)); setAccent("auto"); setBgFinish("uni"); setFrame("aucun")
    setTitleCase("normal"); setTitleWeight("normal"); setQrBadge("carre"); setQrPos("centre"); setQrScale(1); setBlockY(0); setBgImage(null); setBgCredit("")
    setQrDx(0); setQrDy(0); setTitleColor(""); setSubColor(""); setCtaColor("")
    setECorner("adouci"); setEAccent("plein"); setETypo("auto"); setEAlign("center"); setETitle(1); setEPad(1)
  }
  async function saveCurrent() {
    const name = saveName.trim() || `Mon style ${savedPresets.length + 1}`
    setSaving(false); setSaveName("")
    if (presetsRemote) {
      const { data, error } = await createClient().from("print_presets").insert({ name, cfg: currentCfg }).select("id, name, cfg").single()
      if (!error && data) { setSavedPresets(p => [{ id: (data as any).id, name: (data as any).name, cfg: (data as any).cfg || {} }, ...p]); return }
    }
    persistPresets([...savedPresets, { id: `sv_${Date.now()}`, name, cfg: currentCfg }])
  }
  function deletePreset(id: string) {
    const next = savedPresets.filter(x => x.id !== id)
    setSavedPresets(next)
    if (presetsRemote) createClient().from("print_presets").delete().eq("id", id).then(() => {})
    else persistPresets(next)
  }
  // Recherche de photos de fond (Unsplash via proxy serveur). Orientation calée sur le format du support.
  async function searchPhotos() {
    const q = bgSearch.trim() || "background"
    setBgLoading(true); setBgMsg("")
    try {
      const orient = item ? (item.ratio < 0.9 ? "portrait" : item.ratio > 1.1 ? "landscape" : "squarish") : "squarish"
      const r = await fetch(`/api/unsplash?q=${encodeURIComponent(q)}&orientation=${orient}`)
      const d = await r.json().catch(() => ({}))
      if (Array.isArray(d.photos) && d.photos.length) setBgPhotos(d.photos)
      else { setBgPhotos([]); setBgMsg(d.error || "Aucune photo trouvée.") }
    } catch { setBgPhotos([]); setBgMsg("Recherche indisponible.") }
    finally { setBgLoading(false) }
  }
  // La charte capture le LOOK courant : logo, couleur principale (accent), couleur secondaire (= couleur du bouton), police.
  async function saveBrandKit() {
    const kit = { logo: logoUrl, accent, accent2: ctaColor || "", typo: eTypo }
    setBrandKit(kit)
    try { localStorage.setItem("qrowg-print-brandkit", JSON.stringify(kit)) } catch {}   // backup local systématique
    if (brandRemote) {
      // Tente avec accent2 ; si la colonne manque (migration non appliquée), replie sur les colonnes historiques.
      const sb = createClient(), now = new Date().toISOString()
      const { error } = await sb.from("print_brand_kit").upsert({ logo: logoUrl, accent, accent2: ctaColor || null, typo: eTypo, updated_at: now }, { onConflict: "user_id" })
      if (error) { try { await sb.from("print_brand_kit").upsert({ logo: logoUrl, accent, typo: eTypo, updated_at: now }, { onConflict: "user_id" }) } catch {} }
    }
  }
  function applyBrandKit() {
    if (!brandKit) return
    if (brandKit.logo) { setLogoUrl(brandKit.logo); setLogo("objet") }
    if (brandKit.accent) setAccent(brandKit.accent)
    if (brandKit.accent2) setCtaColor(brandKit.accent2)   // couleur secondaire → bouton
    if (brandKit.typo) setETypo(brandKit.typo)
  }
  // ── Persistance d'un design PAR QR (colonne qr_codes.print_design) ──────────────
  // Le « code » de rattachement = le short_code du QR (via ?qr= à l'ouverture depuis un QR, ou le QR sélectionné).
  const designCode = (() => {
    try { const q = new URLSearchParams(window.location.search).get("qr"); if (q) return q } catch {}
    if (qrSource === "mine" && pickedQR) { const m = pickedQR.url.match(/\/q\/([^/?#]+)/); return m?.[1] || "" }
    return ""
  })()
  function captureDesign(): Record<string, any> {
    return { v: 2, itemId, styleId, layoutId, sizeId, accent, bgFinish, frame, titleCase, titleWeight, qrBadge, qrPos, qrScale, blockY, qrDx, qrDy, qrFree, qrFx, qrFy, eCorner, eAccent, eTypo, eAlign, eTitle, ePad, titleColor, subColor, ctaColor, logo, logoUrl, bgImage, bgCredit, brandText, subtitle, message, ctaText, qrSource, qrPickId, qrPng, freeEls }
  }
  function restoreDesign(c: Record<string, any>) {
    if (!c || typeof c !== "object") return
    if (c.itemId && ITEM_BY_ID[c.itemId]) setItemId(c.itemId)
    if (c.styleId) setStyleId(c.styleId); if (c.layoutId) setLayoutId(c.layoutId); if (c.sizeId) setSizeId(c.sizeId)
    if (c.accent) setAccent(c.accent); if (c.bgFinish) setBgFinish(c.bgFinish); if (c.frame) setFrame(c.frame)
    if (c.titleCase) setTitleCase(c.titleCase); if (c.titleWeight) setTitleWeight(c.titleWeight); if (c.qrBadge) setQrBadge(c.qrBadge)
    if (c.qrPos) setQrPos(c.qrPos); if (c.eCorner) setECorner(c.eCorner); if (c.eAccent) setEAccent(c.eAccent)
    if (c.eTypo) setETypo(c.eTypo); if (c.eAlign) setEAlign(c.eAlign)
    if (typeof c.qrScale === "number") setQrScale(c.qrScale); if (typeof c.blockY === "number") setBlockY(c.blockY)
    if (typeof c.qrDx === "number") setQrDx(c.qrDx); if (typeof c.qrDy === "number") setQrDy(c.qrDy)
    if (typeof c.eTitle === "number") setETitle(c.eTitle); if (typeof c.ePad === "number") setEPad(c.ePad)
    setTitleColor(c.titleColor || ""); setSubColor(c.subColor || ""); setCtaColor(c.ctaColor || "")
    if (c.logo) setLogo(c.logo); setLogoUrl(c.logoUrl ?? null); setBgImage(c.bgImage ?? null); setBgCredit(c.bgCredit || "")
    setBrandText(c.brandText || BRANDNAMES[0]); setSubtitle(c.subtitle || ""); setMessage(c.message || ""); setCtaText(c.ctaText || "")
    if (c.qrSource) setQrSource(c.qrSource); if (c.qrPickId) setQrPickId(c.qrPickId); setQrPng(c.qrPng ?? null)
    setFreeEls(Array.isArray(c.freeEls) ? c.freeEls : [])
    setQrFree(!!c.qrFree); if (typeof c.qrFx === "number") setQrFx(c.qrFx); if (typeof c.qrFy === "number") setQrFy(c.qrFy)
    setPhase("studio")
  }
  async function saveDesign() {
    if (!designCode) return
    try {
      await fetch("/api/print-design", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ short_code: designCode, design: captureDesign(), format: "a4" }) })
      setDesignSaved(true); setTimeout(() => setDesignSaved(false), 1800)
    } catch { /* silencieux : le design reste éditable */ }
  }

  // ── Annuler / Rétablir (historique du design complet) ───────────────────────────
  // Snapshot sérialisé du design courant (mêmes champs que captureDesign) — clé de l'historique.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const snap = useMemo(() => JSON.stringify(captureDesign()), [itemId, styleId, layoutId, sizeId, accent, bgFinish, frame, titleCase, titleWeight, qrBadge, qrPos, qrScale, blockY, qrDx, qrDy, qrFree, qrFx, qrFy, eCorner, eAccent, eTypo, eAlign, eTitle, ePad, titleColor, subColor, ctaColor, logo, logoUrl, bgImage, bgCredit, brandText, subtitle, message, ctaText, qrSource, qrPickId, qrPng, freeEls])
  // Empile (débounce 350 ms) : une salve de réglages = une seule entrée d'historique.
  useEffect(() => {
    if (phase !== "studio") return
    const u = undoRef.current
    if (u.last === "") { u.last = snap; return }          // base à l'entrée du studio
    if (snap === u.last) return
    if (u.apply) { u.apply = false; u.last = snap; return } // changement dû à undo/redo → ne pas ré-empiler
    clearTimeout(u.t)
    const prev = u.last
    u.t = setTimeout(() => {
      u.past.push(prev); if (u.past.length > 30) u.past.shift()
      u.future = []; u.last = snap
      setCanUndo(true); setCanRedo(false)
    }, 350)
  }, [snap, phase])
  function undo() {
    const u = undoRef.current
    if (!u.past.length) return
    clearTimeout(u.t)
    const prev = u.past.pop() as string
    u.future.push(JSON.stringify(captureDesign())); if (u.future.length > 30) u.future.shift()
    u.apply = true; u.last = prev
    try { restoreDesign(JSON.parse(prev)) } catch {}
    setCanUndo(u.past.length > 0); setCanRedo(true); setSelEl(null)
  }
  function redo() {
    const u = undoRef.current
    if (!u.future.length) return
    clearTimeout(u.t)
    const nxt = u.future.pop() as string
    u.past.push(JSON.stringify(captureDesign())); if (u.past.length > 30) u.past.shift()
    u.apply = true; u.last = nxt
    try { restoreDesign(JSON.parse(nxt)) } catch {}
    setCanUndo(true); setCanRedo(u.future.length > 0); setSelEl(null)
  }
  // Raccourcis clavier — montés une fois, lisent les dernières closures via `kbd`. On n'intercepte jamais la saisie.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const k = kbd.current
      if (!k || k.phase !== "studio") return
      const t = e.target as HTMLElement | null
      const typing = !!t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.tagName === "SELECT" || t.isContentEditable)
      const mod = e.ctrlKey || e.metaKey
      if (mod && (e.key === "z" || e.key === "Z")) { e.preventDefault(); if (e.shiftKey) k.redo(); else k.undo(); return }
      if (mod && (e.key === "y" || e.key === "Y")) { e.preventDefault(); k.redo(); return }
      if (typing || !k.selEl) return
      if (e.key === "Delete" || e.key === "Backspace") { e.preventDefault(); k.deleteEl(k.selEl); return }
      if (mod && (e.key === "d" || e.key === "D")) { e.preventDefault(); k.duplicateEl(k.selEl); return }
      const step = e.shiftKey ? 0.02 : 0.005
      if (e.key === "ArrowLeft") { e.preventDefault(); k.nudge(k.selEl, -step, 0) }
      else if (e.key === "ArrowRight") { e.preventDefault(); k.nudge(k.selEl, step, 0) }
      else if (e.key === "ArrowUp") { e.preventDefault(); k.nudge(k.selEl, 0, -step) }
      else if (e.key === "ArrowDown") { e.preventDefault(); k.nudge(k.selEl, 0, step) }
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [])
  // Échap ferme l'aperçu plein écran.
  useEffect(() => {
    if (!fsOpen) return
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setFsOpen(false) }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [fsOpen])

  // ── Éléments libres (mode Studio libre) ─────────────────────────────────────────
  function addFreeText() {
    const p = paletteFromStyle(style)
    const id = `f_${Date.now()}`
    setFreeEls(els => [...els, { id, kind: "text", x: 0.28, y: 0.44, w: 0.44, size: 0.06, color: p.fg, align: "center", weight: 700, font: "", text: "Votre texte" }])
    setSelEl(id); setLibre(true)
  }
  function addFreeIcon(name: string) {
    const p = paletteFromStyle(style); const id = `f_${Date.now()}`
    setFreeEls(els => [...els, { id, kind: "icon", x: 0.44, y: 0.44, w: 0.12, h2: 0.12, size: 0.12, color: p.fg, align: "center", weight: 700, font: "", text: "", icon: name }])
    setSelEl(id); setLibre(true)
  }
  function addFreeShape(shape: string) {
    const p = paletteFromStyle(style); const id = `f_${Date.now()}`
    setFreeEls(els => [...els, { id, kind: "shape", x: 0.35, y: 0.4, w: 0.3, h2: shape === "line" ? 0.015 : 0.2, size: 0.06, color: p.band, align: "center", weight: 700, font: "", text: "", shape }])
    setSelEl(id); setLibre(true)
  }
  // Compositions prêtes : ajoute un GROUPE d'éléments finis (ids uniques) dérivés du thème (ou d'un style cible).
  function addComposition(cid: string, styleOverride?: Style) {
    const c = COMPOSITIONS.find(x => x.id === cid); if (!c) return
    const p = paletteFromStyle(styleOverride || style), base = Date.now()
    const parts: FreeEl[] = c.build(p).map((part, i) => ({ ...part, id: `f_${base}_${i}` }))
    setFreeEls(els => [...els, ...parts])
    setSelEl(parts[0]?.id ?? null); setLibre(true)
  }
  // Appliquer un TEMPLATE (§7) : look + contenu suggéré (+ composition), recoercé au support. Annulable (undo).
  function applyTemplate(t: PrintTemplate, variant?: TemplateVariant) {
    const L = t.look
    const st = variant?.style || L.style
    setStyleId(st); setLayoutId(item ? fitLayout(L.layout, item) : L.layout); setAccent(variant?.accent || L.accent)
    setBgFinish(L.bgFinish); setFrame(L.frame); setTitleCase(L.titleCase); setTitleWeight(L.titleWeight)
    setQrBadge(L.qrBadge); setECorner(L.eCorner); setEAccent(L.eAccent); setEAlign(L.eAlign)
    if (L.eTypo) setETypo(L.eTypo)
    if (t.content.brand) setBrandText(t.content.brand)
    setMessage(t.content.title ?? ""); setSubtitle(t.content.subtitle ?? ""); setCtaText(t.content.cta ?? "")
    if (t.comp) addComposition(t.comp, STYLE_BY_ID[st])   // couleurs de la composition = style cible (pas l'ancien)
  }
  function updateEl(id: string, patch: Partial<FreeEl>) { setFreeEls(els => els.map(e => e.id === id ? { ...e, ...patch } : e)) }
  function deleteEl(id: string) { setFreeEls(els => els.filter(e => e.id !== id)); setSelEl(s => (s === id ? null : s)) }
  // Dupliquer un élément libre (léger décalage) et sélectionner la copie ; déplacer au clavier (flèches).
  function duplicateEl(id: string) {
    const e = freeEls.find(x => x.id === id); if (!e) return
    const nid = `f_${Date.now()}`
    setFreeEls(els => [...els, { ...e, id: nid, x: Math.min(0.92, e.x + 0.03), y: Math.min(0.92, e.y + 0.03) }])
    setSelEl(nid)
  }
  function nudge(id: string, dx: number, dy: number) {
    setFreeEls(els => els.map(e => e.id === id && !e.locked ? { ...e, x: Math.max(0, Math.min(1, e.x + dx)), y: Math.max(0, Math.min(1, e.y + dy)) } : e))
  }
  // Ordre des calques (l'ordre du tableau = z) : premier plan = fin, arrière-plan = début.
  function bringFront(id: string) { setFreeEls(els => { const e = els.find(x => x.id === id); return e ? [...els.filter(x => x.id !== id), e] : els }) }
  function sendBack(id: string) { setFreeEls(els => { const e = els.find(x => x.id === id); return e ? [e, ...els.filter(x => x.id !== id)] : els }) }
  // Calques : l'ordre du tableau = z (0 = arrière, dernier = avant). « up » = vers l'avant, « down » = vers l'arrière.
  function moveLayer(id: string, dir: "up" | "down") {
    setFreeEls(els => { const i = els.findIndex(e => e.id === id); if (i < 0) return els; const j = dir === "up" ? i + 1 : i - 1; if (j < 0 || j >= els.length) return els; const next = els.slice(); const [it] = next.splice(i, 1); next.splice(j, 0, it); return next })
  }
  function toggleHide(id: string) { setFreeEls(els => els.map(e => e.id === id ? { ...e, hidden: !e.hidden } : e)) }
  function toggleLock(id: string) { setFreeEls(els => els.map(e => e.id === id ? { ...e, locked: !e.locked } : e)) }
  function centerEl(id: string, axis: "x" | "y" | "both") { setFreeEls(els => els.map(e => e.id === id ? { ...e, ...(axis !== "y" ? { x: 0.5 - e.w / 2 } : {}), ...(axis !== "x" ? { y: 0.5 - (e.kind === "shape" ? (e.h2 ?? 0.12) : e.size) / 2 } : {}) } : e)) }

  // Décliner : on change de support en GARDANT tout (design + textes + QR). Rien n'est réinitialisé.
  function switchSupport(id: string) {
    const it = ITEM_BY_ID[id]; if (!it) return
    // La mise en page courante peut ne pas convenir au nouveau format (rond, ou colonnes sur un portrait) -> on recentre.
    if (!layoutOk(layoutId, it)) setLayoutId(fitLayout(layoutId, it))
    setItemId(id); setDeclineOpen(false)
  }

  function openItem(id: string) {
    const it = ITEM_BY_ID[id]; if (!it) return
    setItemId(id); setStyleId(it.pal); setLayoutId(resolveLayoutId(it.layout))
    setSizeId("moyen"); setBrandText(BRANDNAMES[0]); setSubtitle(""); setMessage(""); setCtaText(it.cta); setLogo("aucun")
    setETitle(1); setEPad(1); setECorner("adouci"); setEAccent("plein"); setETypo("auto"); setEAlign("center")
    setAccent("auto"); setTitleCase("normal"); setTitleWeight("normal"); setQrBadge("carre"); setQrPos("centre"); setQrScale(1); setBlockY(0); setBgImage(null); setBgCredit("")
    setQrDx(0); setQrDy(0); setTitleColor(""); setSubColor(""); setCtaColor(""); setAdvColor(false); setAdvQr(false)
    setBgFinish("uni"); setFrame("aucun"); setLogoUrl(null); setOpen(null); setShowAllColors(false); setControl(false)
    setLibre(false); setFreeEls([]); setSelEl(null); setQrFree(false); setQrFx(0.32); setQrFy(0.55); setPhase("studio")
    undoRef.current = { past: [], future: [], apply: false, last: "", t: null }; setCanUndo(false); setCanRedo(false)
  }

  // Ré-export du QR choisi, seul (source « Mes QR »). On réencode le lien du QR existant :
  // aucune création de destination — c'est le même code, juste au format fichier.
  async function exportQr(ext: "png" | "svg") {
    if (!item || !ok || busy || qrSource !== "mine") return
    setBusy(true)
    try {
      const opts: QROptions = { data: qrValue, fg: style.qr, bg: style.qrBg, ecc: "M", style: {}, size: 1024 }
      const blob = await getQRBlob(opts, ext)
      if (blob) { const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = `qrowg-${item.support}.${ext}`.replace(/\s+/g, "-").toLowerCase(); a.click(); URL.revokeObjectURL(a.href); setDone(true); setTimeout(() => setDone(false), 1800) }
    } finally { setBusy(false) }
  }

  // « Corriger » un contrôle de pré-vol : ferme le contrôle, ouvre le bon volet, applique un correctif sûr quand c'est net.
  function fixCheck(id: string) {
    setControl(false)
    if (id === "contrast") setOpen("allure")                                  // changer l'ambiance (couleurs du QR)
    else if (id === "qrsize") { setSizeId("grand"); setOpen("qr") }           // agrandir le QR
    else if (id === "quiet") { setQrBadge(qrBadge === "aucune" ? "carre" : "cercle"); setOpen("qr") }  // pastille = zone franche
    else if (id === "margin") { if (!freeEls.length) setOpen("details") }     // en libre : l'utilisateur écarte l'élément du bord
    else setOpen("details")
  }

  // Dernières closures pour les raccourcis clavier (montés une seule fois plus haut).
  kbd.current = { phase, selEl, undo, redo, deleteEl, duplicateEl, nudge }

  // ── Upsell (free) ──────────────────────────────────────────────────────────
  if (!canAccess) {
    return (
      <div style={{ minHeight: "100dvh", background: C.bg, color: C.fg, display: "flex", alignItems: "center", justifyContent: "center", padding: 24, fontFamily: "Inter, system-ui, sans-serif" }}>
        <div style={{ maxWidth: 400, textAlign: "center" }}>
          <div style={{ width: 54, height: 54, borderRadius: 16, background: C.goldSoft, border: `1px solid ${C.goldA55}`, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px" }}><Lock size={22} color={C.gold} /></div>
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
    return (
      <div style={{ position: "relative", minHeight: "100dvh", color: C.fg, fontFamily: "Inter, system-ui, sans-serif", padding: "0 16px 40px" }}>
        <Particles behind />
        <header style={{ maxWidth: 1040, margin: "0 auto", padding: "18px 0 8px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <Link href="/dashboard/qr-codes" style={{ display: "inline-flex", alignItems: "center", gap: 6, color: C.fgMuted, textDecoration: "none", fontSize: 13 }}><ArrowLeft size={16} /> QR codes</Link>
          <span style={{ fontSize: 13, fontWeight: 700, color: C.gold, letterSpacing: 0.3 }}>Print Studio</span>
        </header>
        <div style={{ maxWidth: 1040, margin: "0 auto" }}>
          <style>{`.ps-card{transition:border-color .15s var(--mo-ease,ease), transform .15s var(--mo-ease,ease), background .15s}.ps-card:hover{border-color:color-mix(in srgb,var(--accent) 45%,transparent);transform:translateY(-2px)}.ps-chip{transition:border-color .14s var(--mo-ease,ease),background .14s,color .14s}.ps-chip:hover{border-color:color-mix(in srgb,var(--accent) 50%,transparent)}@media(min-width:720px){.ps-rail{flex-wrap:wrap!important;overflow:visible!important}.ps-rail-fade{display:none!important}}`}</style>
          <h1 style={{ fontFamily: "Fraunces, Georgia, serif", fontSize: "clamp(24px,4vw,34px)", fontWeight: 600, letterSpacing: "-0.02em", margin: "10px 0 6px" }}>Choisissez un support</h1>
          <p style={{ color: C.fgMuted, fontSize: 14, margin: "0 0 18px" }}>Un objet réel, déjà réussi. Trois suffisent : à table, en vitrine, dans la main.</p>

          {/* Filtres métier × objectif */}
          <Rail label="Métier" value={metier} options={METIERS} onPick={setMetier} />
          <Rail label="Objectif" value={objectif} options={OBJECTIFS} onPick={setObjectif} />

          {/* Grille d'objets */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(150px,1fr))", gap: 12, marginTop: 18 }}>
            {items.map(it => (
              <button key={it.id} className="ps-card" onClick={() => openItem(it.id)} style={{ textAlign: "left", background: C.surface, border: `1px solid ${C.hairline}`, borderRadius: R.card, padding: 12, cursor: "pointer", color: C.fg, display: "flex", flexDirection: "column", gap: 10 }}>
                <div style={{ height: 122, borderRadius: 10, background: `radial-gradient(80% 70% at 50% 8%, #2a2e34, #16181c)`, display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden" }}>
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
        </div>
      </div>
    )
  }

  // ── Studio (aperçu + volets + action) ─────────────────────────────────────────
  const scene = sceneLayers(item.scene, metier === "Tout" ? null : metier)
  const pal = paletteFromStyle(style)
  // Tous les réglages de DESIGN partagés (sans `item`/`physW`/`w`/`h`) — réutilisés pour la planche multi-supports.
  const designProps = { style, pal, layout, size: effSize, qrValue, qrImg, qrBadge, qrPos, qrDx, qrDy, qrFree, qrFx, qrFy, logo, logoUrl, bgFinish, bgImage, frame, accent, titleCase, titleWeight, titleColor, subColor, ctaColor, blockY, brand, subtitle, title, cta, eCorner, eAccent, eTypo, eAlign, eTitle, ePad, freeEls }
  // Planche = chaque format retenu, répété `campaignQty` fois (imposition N-up : N exemplaires par format).
  const campaignItems = (campaign.length ? campaign : [item.id]).flatMap(id => Array(Math.max(1, campaignQty)).fill(id)).map(id => ITEM_BY_ID[id]).filter(Boolean)
  const sel = freeEls.find(e => e.id === selEl)
  const tmpls = filterTemplates(item)   // templates pertinents au support courant (pertinents d'abord)
  const showFlat = libre && !isMobile   // l'édition libre (drag/calques) est réservée au desktop — mobile = guidé simple
  // Sélection contextuelle (#12/#32) : cliquer un objet de l'aperçu (titre/QR/bouton/fond) ouvre son volet dédié.
  // Desktop = ouvre l'accordéon + le fait défiler + surligne ; mobile = ouvre l'onglet correspondant de la sheet.
  function focusPanel(panel: string) {
    setLibre(false); setSelEl(null)
    if (isMobile) {
      const tab = panel === "qr" ? "qr" : panel === "texte" ? "texte" : panel === "details" ? "couleurs" : "theme"
      setMobileTab(tab); setSheetOpen(true)
      return
    }
    setOpen(panel); setFlashPanel(panel)
    requestAnimationFrame(() => document.querySelector(`[data-panel="${panel}"]`)?.scrollIntoView({ behavior: "smooth", block: "nearest" }))
    window.setTimeout(() => setFlashPanel(p => (p === panel ? null : p)), 1000)
  }
  const layBtn: React.CSSProperties = { width: 28, height: 28, borderRadius: 7, border: "none", background: "transparent", color: C.fgMuted, cursor: "pointer", display: "inline-flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }
  return (
    <div style={{ position: "relative", minHeight: "100dvh", color: C.fg, fontFamily: "Inter, system-ui, sans-serif" }}>
      <Particles behind />
      <header style={{ maxWidth: 1320, margin: "0 auto", padding: "14px 16px", display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 8 }}>
        <button onClick={() => setPhase("library")} style={{ display: "inline-flex", alignItems: "center", gap: 6, background: "none", border: "none", color: C.fgMuted, cursor: "pointer", fontSize: 13, flexShrink: 0 }}><ArrowLeft size={16} /> Bibliothèque</button>
        <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", justifyContent: "flex-end" }}>
          {/* Mobile = simplifié : on masque annuler/rétablir · Décliner · Planche (fonctions avancées desktop). */}
          {!isMobile && <>
            <div style={{ display: "inline-flex", gap: 4 }}>
              <button onClick={undo} disabled={!canUndo} title="Annuler (Ctrl+Z)" aria-label="Annuler" style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: 42, height: 42, background: "transparent", border: `1px solid ${C.hairline}`, borderRadius: 10, color: canUndo ? C.fg : C.fgFaint, cursor: canUndo ? "pointer" : "default", opacity: canUndo ? 1 : 0.5 }}><Undo2 size={16} /></button>
              <button onClick={redo} disabled={!canRedo} title="Rétablir (Ctrl+Maj+Z)" aria-label="Rétablir" style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: 42, height: 42, background: "transparent", border: `1px solid ${C.hairline}`, borderRadius: 10, color: canRedo ? C.fg : C.fgFaint, cursor: canRedo ? "pointer" : "default", opacity: canRedo ? 1 : 0.5 }}><Redo2 size={16} /></button>
            </div>
            <button onClick={() => setDeclineOpen(true)} style={{ display: "inline-flex", alignItems: "center", gap: 6, background: "transparent", border: `1px solid ${C.hairline}`, color: C.fg, cursor: "pointer", fontSize: 12.5, fontWeight: 700, borderRadius: 999, padding: "10px 16px" }}><Copy size={14} /> Décliner</button>
            <button onClick={() => { if (!campaign.length) setCampaign([item.id]); setCampaignOpen(true) }} style={{ display: "inline-flex", alignItems: "center", gap: 6, background: "transparent", border: `1px solid ${C.hairline}`, color: C.fg, cursor: "pointer", fontSize: 12.5, fontWeight: 700, borderRadius: 999, padding: "10px 16px" }}><Layers size={14} /> Planche</button>
          </>}
          {designCode && <button onClick={saveDesign} style={{ display: "inline-flex", alignItems: "center", gap: 6, background: designSaved ? C.goldSoft : "transparent", border: `1px solid ${designSaved ? C.gold : C.hairline}`, color: designSaved ? C.gold : C.fg, cursor: "pointer", fontSize: 12.5, fontWeight: 700, borderRadius: 999, padding: "10px 16px" }}>{designSaved ? <Check size={14} /> : <ShieldCheck size={14} />} {designSaved ? "Enregistré" : "Enregistrer"}</button>}
          {!isMobile && <span style={{ fontSize: 12.5, fontWeight: 700, color: C.fgMuted }}>{item.name} · <span style={{ fontFamily: "ui-monospace, monospace" }}>{item.size}</span></span>}
        </div>
      </header>

      <div className="ps-grid" style={{ maxWidth: 1320, margin: "0 auto", padding: isMobile ? "0 12px 172px" : "0 16px 120px", display: "grid", gap: 24, gridTemplateColumns: "1fr" }}>
        {/* Canvas héros (#2) : l'aperçu prend toute la largeur élastique, l'inspecteur reste une colonne fixe et lisible (372 px). */}
        <style>{`@media(min-width:1025px){.ps-grid{grid-template-columns:minmax(0,1fr) 372px!important}.ps-aside{position:sticky;top:14px;align-self:start}}.ps-chip{transition:border-color .14s var(--mo-ease,ease),background .14s,color .14s}.ps-chip:hover{border-color:color-mix(in srgb,var(--accent) 50%,transparent)}.ps-foc{outline:2px solid transparent;outline-offset:3px;border-radius:4px;transition:outline-color .12s var(--mo-ease,ease)}.ps-foc:hover{outline-color:color-mix(in srgb,var(--accent) 60%,transparent)}.ps-flash{animation:psflash 1s ease}@keyframes psflash{0%{box-shadow:0 0 0 0 color-mix(in srgb,var(--accent) 60%,transparent)}30%{box-shadow:0 0 0 3px color-mix(in srgb,var(--accent) 45%,transparent)}100%{box-shadow:0 0 0 0 transparent}}`}</style>

        {/* Aperçu packshot */}
        <div className="ps-aside">
          {showFlat
            ? <>
                <ZoomBar zoom={zoom} setZoom={setZoom} />
                <div style={{ overflow: "auto", maxWidth: "100%", display: "flex", justifyContent: "center", padding: "4px 0" }}>
                  <FlatEditor item={item} design={designProps} freeEls={freeEls} setFreeEls={setFreeEls} selEl={selEl} setSelEl={setSelEl} onQrMove={(x, y) => { setQrFx(x); setQrFy(y) }} zoom={zoom} />
                </div>
              </>
            : <div style={{ position: "relative", ...(isMobile ? {} : { background: "radial-gradient(130% 90% at 50% -10%, rgba(255,255,255,.05), transparent 70%)", border: `1px solid ${C.hairline}`, borderRadius: 24, padding: 28 }) }}>
                <div onClick={() => setFsOpen(true)} title="Agrandir l'aperçu" style={{ cursor: "zoom-in" }}><Packshot item={item} scene={scene} {...designProps} box={isMobile ? 520 : 640} onFocus={focusPanel} /></div>
                <button onClick={e => { e.stopPropagation(); setFsOpen(true) }} aria-label="Plein écran" title="Plein écran" style={{ position: "absolute", top: isMobile ? 12 : 40, right: isMobile ? 12 : 40, width: 40, height: 40, borderRadius: 11, background: "rgba(0,0,0,0.45)", border: "1px solid rgba(255,255,255,0.2)", color: "#fff", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", backdropFilter: "blur(4px)", fontSize: 17, lineHeight: 1, zIndex: 2 }}>⛶</button>
              </div>}
          {!isMobile && <div style={{ display: "flex", gap: 8, justifyContent: "center", marginTop: 10, flexWrap: "wrap" }}>
            <button onClick={() => { setLibre(v => !v); setSelEl(null) }} style={chipStyle(libre)}>{libre ? "↩ Aperçu" : "✎ Édition libre"}</button>
          </div>}
          {!showFlat && <p style={{ textAlign: "center", color: C.fgMuted, fontSize: 11.5, margin: "8px 0 0" }}>{supportHint(item)} · {qrReady ? "votre QR est en place" : "ajoutez votre QR"}</p>}
          {!showFlat && !isMobile && <p style={{ textAlign: "center", color: C.fgFaint, fontSize: 11, margin: "4px 0 0" }}>Cliquez le titre, le QR ou le fond de l'aperçu pour le régler directement.</p>}
          {showFlat && <>
            <p style={{ textAlign: "center", color: C.fgFaint, fontSize: 11, margin: "8px 0 0" }}>Glissez pour placer · double-clic pour écrire · coin doré pour redimensionner.</p>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", justifyContent: "center", marginTop: 8 }}>
              <button onClick={addFreeText} style={chipStyle(false)}>＋ Texte</button>
              <button onClick={() => { setAddSearch(""); setAddOpen(true) }} style={chipStyle(true)}><Plus size={14} style={{ marginRight: 4, verticalAlign: "-2px" }} />Ajouter</button>
            </div>
            {sel && (isMobile
              ? <div style={{ display: "flex", justifyContent: "center", marginTop: 10 }}><button onClick={() => setSheetOpen(true)} style={chipStyle(true)}>Modifier l'élément</button></div>
              : <p style={{ textAlign: "center", color: C.gold, fontSize: 11, margin: "10px 0 0" }}>Élément sélectionné — réglages dans le panneau à droite.</p>)}
          </>}
        </div>

        {/* Volets — DESKTOP uniquement : colonne accordéon complète. (Mobile = sheet SIMPLIFIÉE, définie plus bas.) */}
        {!isMobile && (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {/* Inspecteur CONTEXTUEL : un élément libre sélectionné → ses propriétés (essentiel d'abord, avancé au besoin). */}
          {sel && (
            <div style={{ background: C.surface, border: `1px solid ${C.goldA55}`, borderRadius: R.card, padding: 14, display: "flex", flexDirection: "column", gap: 12 }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <span style={{ fontFamily: "Fraunces, Georgia, serif", fontSize: 15.5, fontWeight: 600, color: C.fg }}>{sel.kind === "text" ? "Texte" : sel.kind === "icon" ? "Icône" : "Forme"}</span>
                <button onClick={() => setSelEl(null)} aria-label="Désélectionner" style={{ background: "none", border: "none", color: C.fgMuted, cursor: "pointer", fontSize: 18, lineHeight: 1, padding: 0 }}>×</button>
              </div>
              {sel.kind === "text" && <input value={sel.text} onChange={e => updateEl(sel.id, { text: e.target.value })} placeholder="Texte…" style={inputStyle} />}
              <div style={{ display: "flex", gap: 10, alignItems: "flex-end" }}>
                <div style={{ flex: 1 }}>
                  <p style={secLabel}>{sel.kind === "shape" ? "Largeur" : "Taille"}</p>
                  {sel.kind === "shape"
                    ? <Range value={sel.w} min={0.05} max={0.9} step={0.01} onChange={v => updateEl(sel.id, { w: v })} />
                    : <Range value={sel.size} min={0.03} max={0.2} step={0.005} onChange={v => updateEl(sel.id, { size: v })} />}
                </div>
                <label title="Couleur" style={{ width: 44, height: 44, borderRadius: 11, border: `1px solid ${C.hairline}`, overflow: "hidden", position: "relative", flexShrink: 0, background: sel.color, cursor: "pointer" }}><input type="color" value={sel.color} onChange={e => updateEl(sel.id, { color: e.target.value })} style={{ position: "absolute", inset: 0, width: "100%", height: "100%", opacity: 0, cursor: "pointer", border: "none" }} /></label>
              </div>
              {sel.kind === "shape" && <div><p style={secLabel}>Hauteur</p><Range value={sel.h2 ?? 0.12} min={0.01} max={0.9} step={0.01} onChange={v => updateEl(sel.id, { h2: v })} /></div>}
              {sel.kind === "text" && <div style={{ display: "flex", gap: 8 }}>
                <div style={{ flex: 1 }}><Seg value={sel.align} options={["left", "center", "right"]} onPick={v => updateEl(sel.id, { align: v as any })} labels={["Gauche", "Centre", "Droite"]} /></div>
                <div style={{ flex: 1 }}><Seg value={String(sel.weight)} options={["400", "700", "800"]} onPick={v => updateEl(sel.id, { weight: Number(v) })} labels={["Fin", "Gras", "Extra"]} /></div>
              </div>}
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                <button onClick={() => centerEl(sel.id, "x")} style={{ ...chipStyle(false), fontSize: 11.5 }}>Centrer ↔</button>
                <button onClick={() => centerEl(sel.id, "y")} style={{ ...chipStyle(false), fontSize: 11.5 }}>Centrer ↕</button>
                <button onClick={() => duplicateEl(sel.id)} style={{ ...chipStyle(false), fontSize: 11.5 }}>Dupliquer</button>
                <button onClick={() => bringFront(sel.id)} style={{ ...chipStyle(false), fontSize: 11.5 }}>Premier plan</button>
                <button onClick={() => sendBack(sel.id)} style={{ ...chipStyle(false), fontSize: 11.5 }}>Arrière-plan</button>
              </div>
              <button onClick={() => setAdvSel(v => !v)} style={{ alignSelf: "flex-start", background: "none", border: "none", color: C.fgMuted, cursor: "pointer", fontSize: 12, padding: 0 }}>{advSel ? "Masquer les réglages avancés" : "Réglages avancés (position · rotation · opacité) →"}</button>
              {advSel && <>
                <div style={{ display: "flex", gap: 8 }}>
                  <div style={{ flex: 1 }}><p style={secLabel}>Position X</p><Range value={sel.x} min={0} max={1} step={0.01} onChange={v => updateEl(sel.id, { x: v })} hint={`${Math.round(sel.x * 100)} %`} /></div>
                  <div style={{ flex: 1 }}><p style={secLabel}>Position Y</p><Range value={sel.y} min={0} max={1} step={0.01} onChange={v => updateEl(sel.id, { y: v })} hint={`${Math.round(sel.y * 100)} %`} /></div>
                </div>
                <div><p style={secLabel}>Rotation</p><Range value={sel.rot ?? 0} min={-180} max={180} step={1} onChange={v => updateEl(sel.id, { rot: v })} hint={`${Math.round(sel.rot ?? 0)}°`} /></div>
                <div><p style={secLabel}>Opacité</p><Range value={sel.opacity ?? 1} min={0.1} max={1} step={0.05} onChange={v => updateEl(sel.id, { opacity: v })} hint={`${Math.round((sel.opacity ?? 1) * 100)} %`} /></div>
              </>}
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
                <span style={{ fontSize: 10.5, color: C.fgFaint }}>Flèches : déplacer · Suppr · Ctrl+D</span>
                <button onClick={() => deleteEl(sel.id)} style={{ background: "none", border: "none", color: C.bad, cursor: "pointer", fontSize: 12, padding: 0, whiteSpace: "nowrap" }}>Supprimer</button>
              </div>
            </div>
          )}

          {/* Modèles (§7) — point de départ complet (look + textes + composition), recoercé au support. Primaire. */}
          <Panel id="modeles" title="Modèles" resume={`${tmpls.length} prêts à l'emploi · contenu inclus`} open={open} setOpen={setOpen}>
            <TemplateLibrary item={item} onApply={applyTemplate} onApplyVariant={(t, v) => applyTemplate(t, v)} />
          </Panel>

          {/* Calques (mode Studio libre) — liste réordonnable des éléments : sélectionner, masquer, verrouiller, avant/arrière. */}
          {libre && freeEls.length > 0 && (
            <Panel id="calques" title="Calques" resume={`${freeEls.length} élément${freeEls.length > 1 ? "s" : ""}`} open={open} setOpen={setOpen}>
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {[...freeEls].reverse().map(el => {
                  const on = selEl === el.id
                  return (
                    <div key={el.id} style={{ display: "flex", alignItems: "center", gap: 4, padding: "5px 8px", borderRadius: 9, background: on ? C.goldSoft : C.surfaceUp, border: `1px solid ${on ? C.goldA55 : C.hairline}` }}>
                      <button onClick={() => setSelEl(el.id)} style={{ flex: 1, minWidth: 0, textAlign: "left", background: "none", border: "none", color: el.hidden ? C.fgFaint : (on ? C.gold : C.fg), cursor: "pointer", fontSize: 12, fontWeight: 600, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", padding: 0 }}>{layerLabel(el)}</button>
                      <button onClick={() => toggleHide(el.id)} title={el.hidden ? "Afficher" : "Masquer"} aria-label={el.hidden ? "Afficher" : "Masquer"} style={{ ...layBtn, color: el.hidden ? C.gold : C.fgMuted }}>{el.hidden ? <EyeOff size={14} /> : <Eye size={14} />}</button>
                      <button onClick={() => toggleLock(el.id)} title={el.locked ? "Déverrouiller" : "Verrouiller"} aria-label={el.locked ? "Déverrouiller" : "Verrouiller"} style={{ ...layBtn, color: el.locked ? C.gold : C.fgMuted }}>{el.locked ? <Lock size={14} /> : <Unlock size={14} />}</button>
                      <button onClick={() => moveLayer(el.id, "up")} title="Avancer" aria-label="Avancer" style={layBtn}><ChevronUp size={14} /></button>
                      <button onClick={() => moveLayer(el.id, "down")} title="Reculer" aria-label="Reculer" style={layBtn}><ChevronDown size={14} /></button>
                    </div>
                  )
                })}
              </div>
            </Panel>
          )}

          {/* Styles rapides — volet accordéon (comme les autres) : modèles prêts, modèles perso, charte. */}
          <Panel id="styles" title="Styles rapides" resume={activePreset ? `Modèle : ${PRESETS.find(p => p.id === activePreset)?.label}` : "Modèles prêts · mes modèles · charte"} open={open} setOpen={setOpen}>
            <div>
              <p style={secLabel}>Modèles prêts</p>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(72px,1fr))", gap: 8 }}>
                {PRESETS.map(p => <PresetThumb key={p.id} preset={p} item={item} on={activePreset === p.id} onClick={() => applyPreset(p)} />)}
              </div>
            </div>
            <div>
              <p style={secLabel}>Mes modèles</p>
              <div style={{ display: "flex", gap: 7, flexWrap: "wrap", alignItems: "center" }}>
                {savedPresets.map(p => (
                  <span key={p.id} style={{ ...chipStyle(activeSavedId === p.id), padding: "0 4px 0 12px", gap: 2 }}>
                    <button onClick={() => applyCfg(p.cfg)} style={{ background: "none", border: "none", color: "inherit", font: "inherit", fontWeight: "inherit", cursor: "pointer", padding: "8px 2px 8px 0" }}>{p.name}</button>
                    <button onClick={() => deletePreset(p.id)} aria-label="Supprimer ce modèle" style={{ background: "none", border: "none", color: "inherit", cursor: "pointer", padding: "0 8px", opacity: 0.6, fontSize: 15, lineHeight: 1 }}>×</button>
                  </span>
                ))}
                {saving ? (
                  <span style={{ display: "inline-flex", gap: 6, alignItems: "center", flexShrink: 0 }}>
                    <input autoFocus value={saveName} onChange={e => setSaveName(e.target.value)} onKeyDown={e => { if (e.key === "Enter") saveCurrent(); if (e.key === "Escape") { setSaving(false); setSaveName("") } }} placeholder="Nom du modèle…" style={{ ...inputStyle, height: 40, width: 160 }} />
                    <button onClick={saveCurrent} style={{ ...chipStyle(true), minHeight: 40 }}>OK</button>
                    <button onClick={() => { setSaving(false); setSaveName("") }} aria-label="Annuler" style={{ ...chipStyle(false), minHeight: 40, padding: "0 12px" }}>×</button>
                  </span>
                ) : (
                  <button onClick={() => setSaving(true)} style={{ ...chipStyle(false), whiteSpace: "nowrap", flexShrink: 0 }}>＋ Enregistrer ce style</button>
                )}
              </div>
            </div>
            <div>
              <p style={secLabel}>Ma charte</p>
              {brandKit && (
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8, padding: "6px 10px", borderRadius: 9, background: C.surfaceUp, border: `1px solid ${C.hairline}` }}>
                  {brandKit.logo && <img src={brandKit.logo} alt="" style={{ width: 24, height: 24, borderRadius: 5, objectFit: "contain", background: "#fff", flexShrink: 0 }} />}
                  <span title="Couleur principale" style={{ width: 16, height: 16, borderRadius: "50%", flexShrink: 0, border: `1px solid ${C.hairline}`, background: ACCENTS.find(a => a.id === brandKit!.accent)?.hex || "conic-gradient(from 210deg,#C9A84C,#D4483B,#3E9E6E,#3B6FD4,#7A5CD4,#C9A84C)" }} />
                  {brandKit.accent2 && <span title="Couleur secondaire (bouton)" style={{ width: 16, height: 16, borderRadius: "50%", flexShrink: 0, border: `1px solid ${C.hairline}`, background: brandKit.accent2 }} />}
                  <span style={{ fontSize: 11, color: C.fgMuted, marginLeft: "auto", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{TYPOS.find(t => t.id === brandKit!.typo)?.label || "Du thème"}</span>
                </div>
              )}
              <div style={{ display: "flex", gap: 7, alignItems: "center", flexWrap: "wrap" }}>
                {brandKit && <button onClick={applyBrandKit} style={chipStyle(false)}>Appliquer</button>}
                <button onClick={saveBrandKit} style={{ ...chipStyle(false), whiteSpace: "nowrap" }}>{brandKit ? "Mettre à jour la charte" : "Enregistrer ma charte (logo · couleurs · police)"}</button>
              </div>
              <p style={{ margin: "6px 0 0", fontSize: 10.5, color: C.fgFaint }}>Capture le look courant — logo, couleur principale (accent), secondaire (bouton), police.</p>
            </div>
          </Panel>

          {/* Volet QR — on RÉUTILISE un QR existant ou on importe un PNG. Aucune création. */}
          <Panel id="qr" title="Le QR" resume={qrSource === "png" ? (qrPng ? "PNG importé" : "importer un PNG") : (pickedQR ? pickedQR.label : "choisir un QR")} open={open} setOpen={setOpen} flash={flashPanel === "qr"}>
            <Seg value={qrSource} options={["mine", "png"]} labels={["Mes QR", "Importer un PNG"]} onPick={v => setQrSource(v as "mine" | "png")} />
            {qrSource === "mine" ? (
              myQRs.length > 0 ? (
                <Field label="Votre QR code">
                  <select value={qrPickId} onChange={e => setQrPickId(e.target.value)} style={{ ...inputStyle, appearance: "none", cursor: "pointer" }}>
                    {myQRs.map(q => <option key={q.id} value={q.id}>{q.label}</option>)}
                  </select>
                  <p style={{ margin: "8px 0 0", fontSize: 11, color: C.fgFaint, lineHeight: 1.45 }}>On met en scène ce QR existant — il reste pilotable depuis vos QR codes (destination modifiable) même après impression.</p>
                </Field>
              ) : (
                <p style={{ fontSize: 12.5, color: C.fgMuted, lineHeight: 1.5, margin: "10px 0 0" }}>Vous n'avez pas encore de QR. <Link href="/dashboard/qr-codes" style={{ color: C.gold }}>Créez-en un</Link>, ou importez un PNG ci-dessus.</p>
              )
            ) : (
              qrPng ? (
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 10 }}>
                  <div style={{ width: 48, height: 48, borderRadius: 8, background: "#fff", overflow: "hidden", flexShrink: 0, border: `1px solid ${C.hairline}` }}><img src={qrPng} alt="" style={{ width: "100%", height: "100%", objectFit: "contain" }} /></div>
                  <span style={{ flex: 1, fontSize: 11.5, color: C.fgMuted, lineHeight: 1.4 }}>QR importé — placé tel quel sur le support.</span>
                  <button onClick={() => setQrPng(null)} aria-label="Retirer le QR" style={{ background: "rgba(255,86,74,0.1)", border: "1px solid rgba(255,86,74,0.25)", borderRadius: 8, width: 34, height: 34, color: C.bad, cursor: "pointer", flexShrink: 0 }}><X size={15} /></button>
                </div>
              ) : (
                <button onClick={() => qrPngInput.current?.click()} style={{ marginTop: 10, width: "100%", minHeight: 44, borderRadius: 11, border: `1.5px dashed ${C.goldA55}`, background: C.goldSoft, color: C.gold, fontSize: 13, fontWeight: 600, cursor: "pointer" }}>Importer un PNG</button>
              )
            )}
            <input ref={qrPngInput} type="file" accept="image/png,image/*" style={{ display: "none" }} onChange={e => { const f = e.target.files?.[0]; if (f) { const r = new FileReader(); r.onload = () => setQrPng(String(r.result)); r.readAsDataURL(f) } if (e.target) e.target.value = "" }} />
            {/* Essentiel : les presets de taille sont le contrôle principal (§4). */}
            <Field label="Taille du QR"><RailInline value={sizeId} options={SIZES.map(s => ({ id: s.id, label: s.label, note: s.note }))} onPick={setSizeId} /></Field>
            <Field label="Pastille"><Seg value={qrBadge} options={["carre", "cercle", "aucune"]} onPick={setQrBadge} labels={["Carré", "Cercle", "Aucune"]} /></Field>
            {/* Score QR en temps réel (§4/§10) — lisibilité mesurée, pas décorative. */}
            {(() => {
              const qc = preflight.checks.filter(c => ["contrast", "qrsize", "quiet"].includes(c.id) && c.status !== "na")
              const worst = qc.some(c => c.status === "fail") ? "fail" : qc.some(c => c.status === "warn") ? "warn" : "ok"
              const col = worst === "ok" ? C.ok : worst === "warn" ? C.gold : C.bad
              const label = worst === "ok" ? "QR lisible" : worst === "warn" ? "QR lisible — à surveiller" : "QR peu lisible"
              const dist = preflight.scanDistanceM ? ` · lisible ~${preflight.scanDistanceM} m` : ""
              return <div style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 12, fontWeight: 600, color: col, background: C.surfaceUp, borderRadius: 999, padding: "6px 12px", alignSelf: "flex-start" }}>{worst === "ok" ? <Check size={13} /> : <AlertTriangle size={13} />} {label}{dist}</div>
            })()}
            <button onClick={() => setAdvQr(v => !v)} style={{ alignSelf: "flex-start", background: "none", border: "none", color: C.gold, cursor: "pointer", fontSize: 12, padding: 0 }}>{advQr ? "Masquer les réglages avancés" : "Réglages avancés (taille précise · position) →"}</button>
            {advQr && <>
              <Field label="Ajustement fin"><Range value={qrScale} min={0.7} max={1.5} step={0.05} onChange={setQrScale} hint={`${Math.round(qrScale * 100)} % · ${Math.round(item.qrMm * size.factor * qrScale)} mm`} /></Field>
              {layout.content === "stack" && !qrFree && <Field label="Position du QR"><Seg value={qrPos} options={["haut", "centre", "bas"]} onPick={setQrPos} labels={["Haut", "Centre", "Bas"]} /></Field>}
              <Field label="Position libre du QR"><Seg value={qrFree ? "libre" : "auto"} options={["auto", "libre"]} onPick={v => { setQrFree(v === "libre"); if (v === "libre") setLibre(true) }} labels={["Mise en page", "Libre (glisser)"]} /></Field>
              <Field label="Décalage horizontal"><Range value={qrDx} min={-1} max={1} step={0.1} onChange={setQrDx} hint={qrDx < -0.05 ? "← gauche" : qrDx > 0.05 ? "droite →" : "centré"} /></Field>
              <Field label="Décalage vertical"><Range value={qrDy} min={-1} max={1} step={0.1} onChange={setQrDy} hint={qrDy < -0.05 ? "↑ haut" : qrDy > 0.05 ? "bas ↓" : "centré"} /></Field>
            </>}
          </Panel>

          {/* Volet TEXTE — inputs d'abord (compact), suggestions contextuelles secondaires, mise en forme repliée. */}
          <Panel id="texte" title="Les textes" resume={`${brand} · « ${title} »`} open={open} setOpen={setOpen} flash={flashPanel === "texte"}>
            <Field label="Nom affiché">
              <input {...textInputProps} value={brandText} onChange={e => setBrandText(e.target.value)} placeholder="Votre marque…" style={inputStyle} />
              <SuggRow items={BRANDNAMES} active={brand} onPick={setBrandText} />
            </Field>
            <Field label="Titre">
              <input {...textInputProps} value={message} onChange={e => setMessage(e.target.value)} placeholder="Titre principal…" style={inputStyle} />
              {messages.length > 0 && <SuggRow items={messages} active={title} onPick={setMessage} />}
            </Field>
            <Field label="Sous-titre (optionnel)"><input {...textInputProps} value={subtitle} onChange={e => setSubtitle(e.target.value)} placeholder="Une ligne d'accroche…" style={inputStyle} /></Field>
            <Field label="Bouton"><input {...textInputProps} value={ctaText} onChange={e => setCtaText(e.target.value)} placeholder={item.cta} style={inputStyle} /></Field>
            <button onClick={() => setAdvText(v => !v)} style={{ alignSelf: "flex-start", background: "none", border: "none", color: C.gold, cursor: "pointer", fontSize: 12, padding: 0 }}>{advText ? "Masquer la mise en forme" : "Casse · graisse · typo · alignement →"}</button>
            {advText && <>
              <Field label="Casse du titre"><Seg value={titleCase} options={["normal", "upper"]} onPick={setTitleCase} labels={["Aa normal", "MAJUSCULES"]} /></Field>
              <Field label="Graisse du titre"><Seg value={titleWeight} options={["fin", "normal", "gras"]} onPick={setTitleWeight} labels={["Fin", "Normal", "Gras"]} /></Field>
              <Field label="Typographie"><RailInline value={eTypo} options={TYPOS.map(t => ({ id: t.id, label: t.label }))} onPick={setETypo} /></Field>
              <Field label="Alignement"><Seg value={eAlign} options={["left", "center", "right"]} onPick={(v) => setEAlign(v as any)} labels={["Gauche", "Centre", "Droite"]} /></Field>
            </>}
          </Panel>

          {/* Volet ALLURE */}
          <Panel id="allure" title="L'allure" resume={`${style.label} · ${ACCENTS.find(a => a.id === accent)?.label ?? "Auto"} · ${layout.label}`} open={open} setOpen={setOpen}>
            <Field label="Ambiance">
              <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 8 }}>
                {(showAllColors ? STYLES : ambiances.map(a => STYLE_BY_ID[a.rep])).map(s => (
                  <Swatch key={s.id} s={s} on={styleId === s.id} label={showAllColors ? s.label : undefined} onClick={() => setStyleId(s.id)} />
                ))}
              </div>
              <button onClick={() => setShowAllColors(v => !v)} style={{ background: "none", border: "none", color: C.gold, cursor: "pointer", fontSize: 12, marginTop: 8, padding: 0 }}>{showAllColors ? "Voir les ambiances" : `Voir les ${STYLES.length} coloris détaillés`}</button>
            </Field>
            <Field label="Couleur d'accent">
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                {ACCENTS.map(a => (
                  <button key={a.id} onClick={() => setAccent(a.id)} title={a.label} style={{ width: 44, height: 44, borderRadius: 11, cursor: "pointer", border: `2px solid ${accent === a.id ? C.gold : "transparent"}`, boxShadow: accent === a.id ? `0 0 0 2px ${C.goldA33}` : "none", background: a.hex || "conic-gradient(from 210deg,#C9A84C,#D4483B,#3E9E6E,#3B6FD4,#7A5CD4,#C9A84C)", position: "relative" }}>
                    {a.id === "auto" && <span style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 8.5, fontWeight: 800, color: "#fff", textShadow: "0 1px 2px rgba(0,0,0,.6)" }}>AUTO</span>}
                  </button>
                ))}
              </div>
            </Field>
            <Field label="Mise en page"><RailInline value={layoutId} options={LAYOUTS.filter(l => layoutOk(l.id, item)).map(l => ({ id: l.id, label: l.label }))} onPick={setLayoutId} /></Field>
          </Panel>

          {/* Volet DESIGN — 100 % design (aucun réglage du QR : il est fourni tel quel) */}
          <Panel id="details" title="Le design" resume={`${FINISH_LABEL[bgFinish] ?? "Uni"} · ${FRAME_LABEL[frame] ?? "sans cadre"}`} open={open} setOpen={setOpen} flash={flashPanel === "details"}>
            <Field label="Fond"><RailInline value={bgFinish} options={FINISH_OPTS} onPick={setBgFinish} /></Field>
            <Field label="Photo de fond">
              {bgImage
                ? <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <div style={{ width: 44, height: 44, borderRadius: 8, overflow: "hidden", flexShrink: 0, border: `1px solid ${C.hairline}`, backgroundImage: `url(${bgImage})`, backgroundSize: "cover", backgroundPosition: "center" }} />
                    <span style={{ flex: 1, fontSize: 11.5, color: C.fgMuted, lineHeight: 1.4 }}>Photo en fond — voile de lisibilité auto.{bgCredit ? ` Photo : ${bgCredit} (Unsplash).` : ""}</span>
                    <button onClick={() => { setBgImage(null); setBgCredit("") }} aria-label="Retirer la photo" style={{ background: "rgba(255,86,74,0.1)", border: "1px solid rgba(255,86,74,0.25)", borderRadius: 8, width: 40, height: 40, color: C.bad, cursor: "pointer", flexShrink: 0 }}><X size={15} /></button>
                  </div>
                : <button onClick={() => bgInput.current?.click()} style={{ width: "100%", minHeight: 42, borderRadius: 11, border: `1.5px dashed ${C.goldA55}`, background: C.goldSoft, color: C.gold, fontSize: 13, fontWeight: 600, cursor: "pointer" }}>Importer une photo</button>}
              <input ref={bgInput} type="file" accept="image/*" style={{ display: "none" }} onChange={e => { const f = e.target.files?.[0]; if (f) { const r = new FileReader(); r.onload = () => { setBgImage(String(r.result)); setBgCredit("") }; r.readAsDataURL(f) } if (e.target) e.target.value = "" }} />
              {/* Recherche de photos (Unsplash) — orientation calée sur le support */}
              <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
                <input value={bgSearch} onChange={e => setBgSearch(e.target.value)} onKeyDown={e => { if (e.key === "Enter") searchPhotos() }} placeholder="Chercher une photo (café, nature…)" style={{ ...inputStyle, height: 42 }} />
                <button onClick={searchPhotos} disabled={bgLoading} style={{ ...chipStyle(false), minHeight: 42, whiteSpace: "nowrap" }}>{bgLoading ? "…" : "Chercher"}</button>
              </div>
              {bgMsg && <p style={{ margin: "6px 0 0", fontSize: 11, color: C.fgFaint }}>{bgMsg}</p>}
              {bgPhotos.length > 0 && (
                <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 6, marginTop: 8 }}>
                  {bgPhotos.map(p => (
                    <button key={p.id} className="ps-chip" onClick={() => { setBgImage(p.regular); setBgCredit(p.author || "") }} title={`Photo : ${p.author} · Unsplash`} style={{ aspectRatio: "1", borderRadius: 8, overflow: "hidden", border: `1px solid ${bgImage === p.regular ? C.gold : C.hairline}`, cursor: "pointer", backgroundImage: `url(${p.thumb})`, backgroundSize: "cover", backgroundPosition: "center", padding: 0 }} />
                  ))}
                </div>
              )}
            </Field>
            <Field label="Cadre"><Seg value={frame} options={["aucun", "filet", "double", "coins"]} onPick={setFrame} labels={["Aucun", "Filet", "Double", "Coins"]} /></Field>
            <Field label="Taille du titre"><Range value={eTitle} min={0.7} max={1.6} step={0.05} onChange={setETitle} hint={`${Math.round(eTitle * 100)} %`} /></Field>
            <Field label="Air autour"><Range value={ePad} min={0.5} max={1.6} step={0.05} onChange={setEPad} hint={ePad < 0.85 ? "serré" : ePad > 1.2 ? "large" : "équilibré"} /></Field>
            {layout.content !== "band" && <Field label="Placement vertical"><Range value={blockY} min={-1} max={1} step={0.1} onChange={setBlockY} hint={blockY < -0.1 ? "vers le haut" : blockY > 0.1 ? "vers le bas" : "centré"} /></Field>}
            <Field label="Arrondi"><Seg value={eCorner} options={["vif", "adouci", "rond"]} onPick={setECorner} labels={["Vif", "Adouci", "Rond"]} /></Field>
            <Field label="Style du bouton"><Seg value={eAccent} options={["plein", "degrade", "trait", "aucun"]} onPick={setEAccent} labels={["Plein", "Dégradé", "Trait", "Aucun"]} /></Field>
            <Field label="Logo de marque">
              <Seg value={logo} options={["objet", "aucun"]} onPick={setLogo} labels={["Sur l'objet", "Aucun"]} />
              {logo === "objet" && (logoUrl
                ? <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 8 }}>
                    <div style={{ width: 40, height: 40, borderRadius: 8, background: "#fff", overflow: "hidden", flexShrink: 0, border: `1px solid ${C.hairline}` }}><img src={logoUrl} alt="" style={{ width: "100%", height: "100%", objectFit: "contain" }} /></div>
                    <span style={{ flex: 1, fontSize: 11.5, color: C.fgMuted, lineHeight: 1.4 }}>Logo posé dans le coin du support.</span>
                    <button onClick={() => setLogoUrl(null)} aria-label="Retirer le logo" style={{ background: "rgba(255,86,74,0.1)", border: "1px solid rgba(255,86,74,0.25)", borderRadius: 8, width: 34, height: 34, color: C.bad, cursor: "pointer", flexShrink: 0 }}><X size={15} /></button>
                  </div>
                : <button onClick={() => logoInput.current?.click()} style={{ marginTop: 8, width: "100%", minHeight: 42, borderRadius: 11, border: `1.5px dashed ${C.goldA55}`, background: C.goldSoft, color: C.gold, fontSize: 13, fontWeight: 600, cursor: "pointer" }}>Ajouter un logo</button>
              )}
              <input ref={logoInput} type="file" accept="image/*" style={{ display: "none" }} onChange={e => { const f = e.target.files?.[0]; if (f) { const r = new FileReader(); r.onload = () => setLogoUrl(String(r.result)); r.readAsDataURL(f) } if (e.target) e.target.value = "" }} />
            </Field>
            <button onClick={() => setAdvColor(v => !v)} style={{ alignSelf: "flex-start", background: "none", border: "none", color: C.gold, cursor: "pointer", fontSize: 12, padding: 0 }}>{advColor ? "Masquer les couleurs par élément" : "Couleurs par élément (avancé) →"}</button>
            {advColor && <>
              <Field label="Couleur du titre"><ColorField value={titleColor} onChange={setTitleColor} /></Field>
              <Field label="Couleur du sous-titre"><ColorField value={subColor} onChange={setSubColor} /></Field>
              <Field label="Couleur du bouton"><ColorField value={ctaColor} onChange={setCtaColor} /></Field>
            </>}
            <button onClick={resetDesign} style={{ alignSelf: "flex-start", background: "none", border: "none", color: C.fgMuted, cursor: "pointer", fontSize: 12, padding: 0, textDecoration: "underline" }}>Réinitialiser le design</button>
          </Panel>
        </div>
        )}
      </div>

      {/* ── MOBILE : version SIMPLIFIÉE — Thème · Couleurs · Texte · QR uniquement (sheet courte, canvas visible). ── */}
      {isMobile && (
        <>
          {sheetOpen && <div onClick={() => setSheetOpen(false)} aria-hidden style={{ position: "fixed", inset: 0, zIndex: 69, background: "rgba(0,0,0,0.4)" }} />}
          <div style={{ position: "fixed", left: 0, right: 0, bottom: kb, zIndex: 70, maxHeight: kb ? `calc(74vh - ${kb}px)` : "62vh", overflowY: "auto", WebkitOverflowScrolling: "touch", background: C.bg, borderTopLeftRadius: 20, borderTopRightRadius: 20, borderTop: `1px solid ${C.hairline}`, boxShadow: "0 -16px 44px rgba(0,0,0,0.5)", padding: `8px 16px ${kb ? "66px" : "calc(18px + env(safe-area-inset-bottom))"}`, transform: sheetOpen ? "translateY(0)" : "translateY(112%)", transition: "transform .26s var(--mo-ease-standard, ease)", display: "flex", flexDirection: "column", gap: 12 }}>
            <div style={{ position: "sticky", top: 0, zIndex: 3, background: C.bg, paddingBottom: 6 }}>
              <div style={{ width: 40, height: 4, borderRadius: 4, background: "rgba(255,255,255,0.18)", margin: "2px auto 8px" }} />
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <span style={{ fontFamily: "Fraunces, Georgia, serif", fontSize: 16, fontWeight: 600 }}>{mobileTab === "theme" ? "Thème" : mobileTab === "couleurs" ? "Couleurs" : mobileTab === "texte" ? "Texte" : "QR code"}</span>
                <button onClick={() => setSheetOpen(false)} aria-label="Fermer" style={{ background: "none", border: "none", color: C.fgMuted, cursor: "pointer", fontSize: 22, lineHeight: 1, padding: "0 4px" }}>×</button>
              </div>
            </div>

            {mobileTab === "theme" && <>
              <p style={{ margin: 0, fontSize: 11.5, color: C.fgMuted }}>Un thème complet en un tap — tout reste modifiable.</p>
              <TemplateLibrary item={item} onApply={applyTemplate} onApplyVariant={(t, v) => applyTemplate(t, v)} />
              <p style={secLabel}>Styles rapides</p>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(80px,1fr))", gap: 8 }}>
                {PRESETS.map(p => <PresetThumb key={p.id} preset={p} item={item} on={activePreset === p.id} onClick={() => applyPreset(p)} />)}
              </div>
            </>}

            {mobileTab === "couleurs" && <>
              <p style={secLabel}>Ambiance</p>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 8 }}>
                {(showAllColors ? STYLES : ambiances.map(a => STYLE_BY_ID[a.rep])).map(s => <Swatch key={s.id} s={s} on={styleId === s.id} label={showAllColors ? s.label : undefined} onClick={() => setStyleId(s.id)} />)}
              </div>
              <button onClick={() => setShowAllColors(v => !v)} style={{ alignSelf: "flex-start", background: "none", border: "none", color: C.gold, cursor: "pointer", fontSize: 12, padding: 0 }}>{showAllColors ? "Voir les ambiances" : `Voir les ${STYLES.length} coloris`}</button>
              <p style={secLabel}>Couleur d'accent</p>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                {ACCENTS.map(a => (
                  <button key={a.id} onClick={() => setAccent(a.id)} title={a.label} style={{ width: 44, height: 44, borderRadius: 12, cursor: "pointer", border: `2px solid ${accent === a.id ? C.gold : "transparent"}`, boxShadow: accent === a.id ? `0 0 0 2px ${C.goldA33}` : "none", background: a.hex || "conic-gradient(from 210deg,#C9A84C,#D4483B,#3E9E6E,#3B6FD4,#7A5CD4,#C9A84C)", position: "relative" }}>
                    {a.id === "auto" && <span style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 8.5, fontWeight: 800, color: "#fff", textShadow: "0 1px 2px rgba(0,0,0,.6)" }}>AUTO</span>}
                  </button>
                ))}
              </div>
            </>}

            {mobileTab === "texte" && <>
              <Field label="Nom affiché"><input {...textInputProps} value={brandText} onChange={e => setBrandText(e.target.value)} placeholder="Votre marque…" style={inputStyle} /></Field>
              <Field label="Titre"><input {...textInputProps} value={message} onChange={e => setMessage(e.target.value)} placeholder="Titre principal…" style={inputStyle} />{messages.length > 0 && <SuggRow items={messages} active={title} onPick={setMessage} />}</Field>
              <Field label="Sous-titre (optionnel)"><input {...textInputProps} value={subtitle} onChange={e => setSubtitle(e.target.value)} placeholder="Une ligne d'accroche…" style={inputStyle} /></Field>
              <Field label="Bouton"><input {...textInputProps} value={ctaText} onChange={e => setCtaText(e.target.value)} placeholder={item.cta} style={inputStyle} /></Field>
              <Field label="Taille du titre"><Range value={eTitle} min={0.7} max={1.6} step={0.05} onChange={setETitle} hint={`${Math.round(eTitle * 100)} %`} /></Field>
              {layout.content !== "band" && <Field label="Position verticale"><Range value={blockY} min={-1} max={1} step={0.1} onChange={setBlockY} hint={blockY < -0.1 ? "vers le haut" : blockY > 0.1 ? "vers le bas" : "centré"} /></Field>}
              <Field label="Alignement"><Seg value={eAlign} options={["left", "center", "right"]} onPick={v => setEAlign(v as any)} labels={["Gauche", "Centre", "Droite"]} /></Field>
              <Field label="Typographie"><RailInline value={eTypo} options={TYPOS.map(t => ({ id: t.id, label: t.label }))} onPick={setETypo} /></Field>
            </>}

            {mobileTab === "qr" && <>
              <Field label="Taille du QR"><RailInline value={sizeId} options={SIZES.map(s => ({ id: s.id, label: s.label, note: s.note }))} onPick={setSizeId} /></Field>
              <Field label="Pastille"><Seg value={qrBadge} options={["carre", "cercle", "aucune"]} onPick={setQrBadge} labels={["Carré", "Cercle", "Aucune"]} /></Field>
              {(() => {
                const qc = preflight.checks.filter(c => ["contrast", "qrsize", "quiet"].includes(c.id) && c.status !== "na")
                const worst = qc.some(c => c.status === "fail") ? "fail" : qc.some(c => c.status === "warn") ? "warn" : "ok"
                const col = worst === "ok" ? C.ok : worst === "warn" ? C.gold : C.bad
                const label = worst === "ok" ? "QR lisible" : worst === "warn" ? "QR lisible — à surveiller" : "QR peu lisible"
                return <div style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 12, fontWeight: 600, color: col, background: C.surfaceUp, borderRadius: 999, padding: "8px 12px", alignSelf: "flex-start" }}>{worst === "ok" ? <Check size={13} /> : <AlertTriangle size={13} />} {label}{preflight.scanDistanceM ? ` · ~${preflight.scanDistanceM} m` : ""}</div>
              })()}
              <p style={{ margin: 0, fontSize: 11, color: C.fgFaint, lineHeight: 1.4 }}>On met en scène votre QR existant — il reste pilotable (destination modifiable) même après impression.</p>
            </>}
          </div>
        </>
      )}

      {/* Barre d'action ancrée — mobile : onglets (ouvrent la sheet) + action ; desktop : statut + action. */}
      <div style={{ position: "fixed", left: 0, right: 0, bottom: 0, background: "color-mix(in srgb, var(--surface) 92%, transparent)", borderTop: `1px solid ${C.hairline}`, backdropFilter: "blur(8px)", padding: "10px 16px calc(10px + env(safe-area-inset-bottom))", zIndex: 30 }}>
        <div style={{ maxWidth: 1320, margin: "0 auto", display: "flex", flexDirection: "column", gap: 8 }}>
          {isMobile && (
            <div style={{ display: "flex", gap: 6 }}>
              {([["theme", "Thème"], ["couleurs", "Couleurs"], ["texte", "Texte"], ["qr", "QR"]] as const).map(([id, lbl]) => (
                <button key={id} onClick={() => { setMobileTab(id); setSheetOpen(true) }} style={{ ...chipStyle(sheetOpen && mobileTab === id), minHeight: 42, fontSize: 12.5, flex: 1 }}>{lbl}</button>
              ))}
            </div>
          )}
          <div style={{ display: "flex", gap: 10, alignItems: "center", justifyContent: "flex-end" }}>
            <button onClick={() => setControl(true)} title="Voir la vérification" style={{ marginRight: "auto", fontSize: 12, fontWeight: 600, cursor: "pointer", color: ok ? C.ok : C.bad, background: ok ? "var(--success-bg)" : "var(--danger-bg)", border: `1px solid ${ok ? "color-mix(in srgb,var(--success) 30%,transparent)" : "var(--danger-border)"}`, borderRadius: 999, padding: "8px 12px", display: "inline-flex", alignItems: "center", gap: 6 }}>{ok ? <><ShieldCheck size={14} /> Prêt à imprimer</> : <><AlertTriangle size={14} /> {preflight.checks.filter(c => c.status === "fail").length} à corriger</>}</button>
            <Button variant="primary" onClick={() => setControl(true)}>Vérifier & exporter</Button>
          </div>
        </div>
      </div>

      {/* Barre « Terminé » au-dessus du clavier (§11) — ferme le clavier sans perdre le champ. */}
      {isMobile && typing && (
        <div style={{ position: "fixed", left: 0, right: 0, bottom: kb, zIndex: 90, display: "flex", justifyContent: "flex-end", padding: "8px 12px", background: "color-mix(in srgb, var(--surface) 96%, transparent)", borderTop: `1px solid ${C.hairline}`, backdropFilter: "blur(6px)" }}>
          <button onPointerDown={e => e.preventDefault()} onClick={() => { const a = document.activeElement as HTMLElement | null; a?.blur?.() }} style={{ ...chipStyle(true), minHeight: 40 }}>Terminé</button>
        </div>
      )}

      {/* Écran de VALIDATION & export — moment de satisfaction : score mis en scène + bénéfices + CTA clair. */}
      <Modal open={control} onClose={() => setControl(false)} title="Votre création" maxWidth={520}>
        {/* Score mis en scène (§8/§27) : gros chiffre + étoiles + titre + bénéfice de lecture. */}
        <div style={{ textAlign: "center", padding: "4px 0 16px" }}>
          <div style={{ fontSize: 42, fontWeight: 800, lineHeight: 1, color: hasFail ? C.bad : preflight.score >= 90 ? C.ok : C.gold }}>{preflight.score}<span style={{ fontSize: 17, fontWeight: 700, color: C.fgMuted }}> / 100</span></div>
          <div style={{ fontSize: 16, letterSpacing: 2, margin: "6px 0 4px", color: C.gold }}>{"★".repeat(preflight.stars)}<span style={{ color: C.fgFaint }}>{"☆".repeat(5 - preflight.stars)}</span></div>
          <div style={{ fontFamily: "Fraunces, Georgia, serif", fontSize: 17, fontWeight: 600, color: C.fg }}>{hasFail ? "Un réglage à corriger" : "Votre création est prête"}</div>
          {preflight.scanDistanceM && !hasFail && <p style={{ margin: "8px auto 0", maxWidth: 340, fontSize: 12.5, color: C.fgMuted, lineHeight: 1.4 }}>Votre QR devrait être facilement scannable jusqu'à ~{preflight.scanDistanceM} m.</p>}
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {preflight.checks.filter(c => c.status !== "na").map(c => {
            const col = c.status === "ok" ? C.ok : c.status === "warn" ? C.gold : C.bad
            const bgA = c.status === "ok" ? C.okA22 : c.status === "warn" ? C.goldA22 : C.badA22
            const canFix = c.status !== "ok" && ["contrast", "qrsize", "quiet", "margin"].includes(c.id)
            return (
              <div key={c.id} style={{ display: "flex", alignItems: "flex-start", gap: 10, padding: "10px 12px", borderRadius: 11, background: C.surfaceUp, border: `1px solid ${c.status === "ok" ? "transparent" : (c.status === "fail" ? C.badA55 : C.goldA55)}` }}>
                <span style={{ width: 20, height: 20, borderRadius: "50%", flexShrink: 0, marginTop: 1, display: "flex", alignItems: "center", justifyContent: "center", background: bgA, color: col }}>{c.status === "ok" ? <Check size={12} /> : <AlertTriangle size={12} />}</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <span style={{ fontSize: 13, fontWeight: 600, color: C.fg }}>{c.label}</span>
                  <p style={{ margin: "2px 0 0", fontSize: 11.5, color: C.fgMuted, lineHeight: 1.35 }}>{c.detail}</p>
                </div>
                {canFix && <button onClick={() => fixCheck(c.id)} style={{ flexShrink: 0, alignSelf: "center", background: C.goldSoft, border: `1px solid ${C.goldA55}`, color: C.gold, cursor: "pointer", fontSize: 11.5, fontWeight: 700, borderRadius: 8, padding: "6px 10px" }}>Corriger</button>}
              </div>
            )
          })}
        </div>
        {!qrReady && <p style={{ margin: "12px 0 0", fontSize: 12, color: C.gold, display: "inline-flex", alignItems: "center", gap: 6 }}><AlertTriangle size={13} /> Ajoutez d'abord votre QR (volet « Le QR »).</p>}
        <div style={{ marginTop: 16 }}>
          <Button variant="primary" fullWidth disabled={!ok || !qrReady} leftIcon={<Download size={18} />} onClick={() => { setControl(false); setPrinting(true) }}>{ok ? "Télécharger le PDF prêt à imprimer" : "Corrigez les points rouges"}</Button>
        </div>
        <p style={{ color: C.fgFaint, fontSize: 11, textAlign: "center", margin: "8px 0 0" }}>À la taille réelle ({pageDims(item).pageWmm} × {pageDims(item).pageHmm} mm, {item.shape === "round" ? "fond perdu inclus" : "fond perdu + traits de coupe"}, texte + QR vectoriels) — via « Enregistrer en PDF » de l'impression.</p>
        {qrSource === "mine" && (
          <div style={{ marginTop: 16 }}>
            <p style={{ margin: "0 0 6px", fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.8, color: C.fgFaint }}>Autres formats — QR seul</p>
            <div style={{ display: "flex", gap: 10 }}>
              <Button variant="secondary" fullWidth disabled={!ok || !qrReady || busy} leftIcon={done ? <Check size={16} /> : <Download size={16} />} onClick={() => exportQr("png")}>{busy ? "…" : done ? "Téléchargé" : "PNG"}</Button>
              <Button variant="secondary" fullWidth disabled={!ok || !qrReady || busy} onClick={() => exportQr("svg")}>SVG</Button>
            </div>
          </div>
        )}
      </Modal>

      {/* Décliner : choisir un autre support en gardant tout le design + textes + QR. */}
      {declineOpen && (
        <Modal open={declineOpen} onClose={() => setDeclineOpen(false)} title="Décliner sur un autre support" maxWidth={720}>
          <p style={{ margin: "0 0 14px", fontSize: 12.5, color: C.fgMuted }}>Le design, les textes et le QR sont conservés — même campagne, autre format.</p>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(130px,1fr))", gap: 10 }}>
            {filterItems("Tout", "Tout").map(it => (
              <button key={it.id} className="ps-card" onClick={() => switchSupport(it.id)} style={{ textAlign: "left", background: it.id === item.id ? C.goldSoft : C.surfaceUp, border: `1px solid ${it.id === item.id ? `${C.goldA88}` : C.hairline}`, borderRadius: R.card, padding: 10, cursor: "pointer", color: C.fg, display: "flex", flexDirection: "column", gap: 8 }}>
                <div style={{ height: 96, borderRadius: 9, background: "radial-gradient(80% 70% at 50% 8%, #2a2e34, #16181c)", display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden" }}>
                  <MiniSupport item={it} style={style} />
                </div>
                <div>
                  <p style={{ margin: 0, fontSize: 12.5, fontWeight: 700, color: C.fg }}>{it.name}{it.id === item.id && <span style={{ color: C.gold }}> · actuel</span>}</p>
                  <p style={{ margin: "2px 0 0", fontSize: 10.5, color: C.fgFaint, fontFamily: "ui-monospace, monospace" }}>{it.size}</p>
                </div>
              </button>
            ))}
          </div>
        </Modal>
      )}

      {/* Planche multi-supports : choisir plusieurs formats, tous avec le MÊME design. */}
      {campaignOpen && (
        <Modal open={campaignOpen} onClose={() => setCampaignOpen(false)} title="Planche multi-supports" maxWidth={720}
          footer={<Button variant="primary" fullWidth disabled={!campaign.length} leftIcon={<Download size={18} />} onClick={() => { if (campaign.length) { setCampaignOpen(false); setMultiPrinting(true) } }}>Exporter la planche ({campaign.length} format{campaign.length > 1 ? "s" : ""}{campaignQty > 1 ? ` × ${campaignQty}` : ""})</Button>}>
          <p style={{ margin: "0 0 14px", fontSize: 12.5, color: C.fgMuted }}>Cochez les formats à imprimer ensemble (même design, mêmes textes, même QR). Une seule feuille, à découper.</p>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(130px,1fr))", gap: 10 }}>
            {filterItems("Tout", "Tout").map(it => {
              const on = campaign.includes(it.id)
              return (
                <button key={it.id} className="ps-card" onClick={() => setCampaign(cur => on ? cur.filter(x => x !== it.id) : [...cur, it.id])} style={{ position: "relative", textAlign: "left", background: on ? C.goldSoft : C.surfaceUp, border: `1px solid ${on ? `${C.goldA88}` : C.hairline}`, borderRadius: R.card, padding: 10, cursor: "pointer", color: C.fg, display: "flex", flexDirection: "column", gap: 8 }}>
                  {on && <span style={{ position: "absolute", top: 8, right: 8, width: 22, height: 22, borderRadius: "50%", background: C.gold, color: "#0A0A0A", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 2 }}><Check size={13} /></span>}
                  <div style={{ height: 96, borderRadius: 9, background: "radial-gradient(80% 70% at 50% 8%, #2a2e34, #16181c)", display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden" }}>
                    <MiniSupport item={it} style={style} />
                  </div>
                  <div>
                    <p style={{ margin: 0, fontSize: 12.5, fontWeight: 700, color: C.fg }}>{it.name}</p>
                    <p style={{ margin: "2px 0 0", fontSize: 10.5, color: C.fgFaint, fontFamily: "ui-monospace, monospace" }}>{it.size}</p>
                  </div>
                </button>
              )
            })}
          </div>
          <div style={{ marginTop: 14 }}>
            <p style={{ margin: "0 0 6px", fontSize: 11.5, fontWeight: 600, color: C.fgMuted }}>Exemplaires par format · {campaignQty}</p>
            <Range value={campaignQty} min={1} max={24} step={1} onChange={v => setCampaignQty(Math.round(v))} hint={`${(campaign.length || 1) * campaignQty} vignette${(campaign.length || 1) * campaignQty > 1 ? "s" : ""} au total`} />
          </div>
          <p style={{ color: C.fgFaint, fontSize: 11, textAlign: "center", margin: "10px 0 0" }}>Une feuille auto-dimensionnée, chaque exemplaire à sa taille réelle avec repère de découpe (idéal cartes/stickers en série).</p>
        </Modal>
      )}

      {/* Aperçu PLEIN ÉCRAN (mobile §2/§9) — tap/⛶ ouvre ; tap hors visuel, X ou Échap ferme. */}
      {fsOpen && (
        <div onClick={() => setFsOpen(false)} style={{ position: "fixed", inset: 0, zIndex: 80, background: "rgba(0,0,0,0.92)", backdropFilter: "blur(4px)", display: "flex", alignItems: "center", justifyContent: "center", padding: "calc(env(safe-area-inset-top) + 16px) 16px calc(env(safe-area-inset-bottom) + 16px)" }}>
          <button onClick={() => setFsOpen(false)} aria-label="Fermer l'aperçu" style={{ position: "absolute", top: "calc(env(safe-area-inset-top) + 12px)", right: 16, width: 42, height: 42, borderRadius: 999, background: "rgba(255,255,255,0.12)", border: "1px solid rgba(255,255,255,0.22)", color: "#fff", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 2 }}><X size={20} /></button>
          <div onClick={e => e.stopPropagation()} style={{ width: "min(94vw, 94vh)", maxWidth: 760 }}>
            <Packshot item={item} scene={scene} {...designProps} box={1400} />
            <p style={{ textAlign: "center", color: "rgba(255,255,255,0.6)", fontSize: 12, margin: "12px 0 0" }}>{supportHint(item)} · {qrReady ? "votre QR est en place" : "ajoutez votre QR"}</p>
          </div>
        </div>
      )}

      {/* Bibliothèque d'éléments « + Ajouter » : formes + icônes catégorisées + recherche. */}
      <Modal open={addOpen} onClose={() => setAddOpen(false)} title="Ajouter un élément" maxWidth={560}>
        <AddLibrary query={addSearch} setQuery={setAddSearch}
          onComp={(id) => { addComposition(id); setAddOpen(false) }}
          onText={() => { addFreeText(); setAddOpen(false) }}
          onShape={(s) => { addFreeShape(s); setAddOpen(false) }}
          onIcon={(n) => { addFreeIcon(n); setAddOpen(false) }} />
      </Modal>

      {/* Rendu de la PLANCHE multi-supports — monté seulement pendant l'impression. */}
      {multiPrinting && <MultiSheet items={campaignItems} design={designProps} />}

      {/* Planche d'impression — montée UNIQUEMENT pendant l'impression (évite un 2e moteur QR en fond). */}
      {printing && <div className="ps-print-root" aria-hidden>
        <style>{`@media screen{.ps-print-root{display:none!important}}@media print{body *{visibility:hidden!important}.ps-print-root,.ps-print-root *{visibility:visible!important}.ps-print-root{position:fixed!important;left:0;top:0;display:block!important}@page{size:${mediaDims(item).mediaWmm}mm ${mediaDims(item).mediaHmm}mm;margin:0}}`}</style>
        <PrintSheet item={item} style={style} pal={pal} layout={layout} brand={brand} subtitle={subtitle} title={title} cta={cta} size={effSize} qrValue={qrValue} qrImg={qrImg} qrBadge={qrBadge} qrPos={qrPos} qrDx={qrDx} qrDy={qrDy} qrFree={qrFree} qrFx={qrFx} qrFy={qrFy} logo={logo} logoUrl={logoUrl} bgFinish={bgFinish} bgImage={bgImage} frame={frame} accent={accent} titleCase={titleCase} titleWeight={titleWeight} titleColor={titleColor} subColor={subColor} ctaColor={ctaColor} blockY={blockY} freeEls={freeEls} eCorner={eCorner} eAccent={eAccent} eTypo={eTypo} eAlign={eAlign} eTitle={eTitle} ePad={ePad} />
      </div>}
    </div>
  )
}

/* ─────────────────────────── sous-composants ─────────────────────────── */

const inputStyle: React.CSSProperties = { width: "100%", boxSizing: "border-box", height: 48, background: "#0A0A0A", border: `1px solid ${C.hairline}`, borderRadius: 12, color: C.fg, fontSize: 16, padding: "0 14px", outline: "none" }
// Libellé de section/champ unifié (casse normale, muted) — même convention que <Field>.
const secLabel: React.CSSProperties = { margin: "0 0 8px", fontSize: 11.5, fontWeight: 600, color: C.fgMuted }

function Rail({ label, value, options, onPick }: { label: string; value: string; options: string[]; onPick: (v: string) => void }) {
  return (
    <div style={{ marginTop: 12 }}>
      <p style={{ margin: "0 0 6px", fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1, color: C.fgFaint }}>{label}</p>
      {/* Desktop : les puces s'enroulent (tout visible). Étroit : défilement horizontal + fondu. */}
      <div style={{ position: "relative" }}>
        <div className="ps-rail" style={{ display: "flex", gap: 7, overflowX: "auto", paddingBottom: 4, scrollbarWidth: "none" }}>
          {options.map(o => <button key={o} className="ps-chip" onClick={() => onPick(o)} style={chipStyle(value === o)}>{o}</button>)}
        </div>
        <div aria-hidden className="ps-rail-fade" style={{ position: "absolute", top: 0, right: 0, bottom: 4, width: 28, pointerEvents: "none", background: "linear-gradient(90deg, transparent, #080808)" }} />
      </div>
    </div>
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
      {isOpen && <div style={{ padding: "0 16px 16px", display: "flex", flexDirection: "column", gap: 14 }}>{children}</div>}
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
function TemplateLibrary({ item, onApply, onApplyVariant }: { item: Item; onApply: (t: PrintTemplate) => void; onApplyVariant: (t: PrintTemplate, v: TemplateVariant) => void }) {
  const [q, setQ] = useState("")
  const [cat, setCat] = useState("pour-vous")
  const ql = q.trim().toLowerCase()
  const matchSearch = (t: PrintTemplate) => !ql || t.name.toLowerCase().includes(ql) || t.business.some(b => b.toLowerCase().includes(ql)) || t.objective.some(o => o.toLowerCase().includes(ql)) || t.style.some(s => s.toLowerCase().includes(ql))
  let list = filterTemplates(item).filter(matchSearch)
  if (!ql && cat !== "pour-vous") { const c = TPL_CATS.find(x => x.id === cat); if (c?.m) list = list.filter(c.m) }
  const showReco = !ql && cat === "pour-vous"
  const reco = showReco ? list.slice(0, 6) : []
  const rest = showReco ? list.slice(6) : list
  const grid: React.CSSProperties = { display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(96px,1fr))", gap: 10 }
  const card = (t: PrintTemplate) => (
    <div key={t.id} style={{ display: "flex", flexDirection: "column", gap: 5 }}>
      <TemplateThumb t={t} onClick={() => onApply(t)} />
      {t.variants && t.variants.length > 0 && <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>{t.variants.map(v => <button key={v.id} onClick={() => onApplyVariant(t, v)} title={`${t.name} — ${v.label}`} aria-label={`${t.name} — ${v.label}`} style={{ width: 16, height: 16, borderRadius: "50%", border: `1px solid ${C.hairline}`, background: v.hex, cursor: "pointer", padding: 0, flexShrink: 0 }} />)}</div>}
    </div>
  )
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      <style>{`.ps-tpl{transition:transform .15s var(--mo-ease,ease)}.ps-tpl:hover{transform:scale(1.04)}`}</style>
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
