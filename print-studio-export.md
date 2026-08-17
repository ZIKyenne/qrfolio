# Print Studio — export complet de l'outil de génération de supports

> **But de ce fichier** : un copier-coller unique de TOUT l'outil « Print Studio » de QRowg
> (route `/dashboard/print-studio`) pour l'emmener dans Claude (design), refaire à fond les
> **aperçus** (les rendus qui « ne veulent rien dire ») et la **bibliothèque** (trop petite),
> puis me renvoyer le résultat pour que je le reporte proprement dans le code.

## Ce que fait l'outil
Print Studio génère des **supports imprimables réels** (sticker de table, chevalet, carte,
affiche, marque-page…) autour du **QR code** de l'utilisateur. Deux phases :

1. **`library`** — l'écran « Choisissez un support » (le sélecteur : filtres métier/objectif,
   recherche, tri, grille de cartes avec vignette de chaque support). *(refonte dorée récente)*
2. **`studio`** — l'éditeur : grand **aperçu (Packshot)** du support + panneaux à droite
   (Modèles, Styles rapides, Le QR, Les textes, L'allure, Le design) + **édition libre**
   (glisser/redimensionner) + contrôle pré-vol + export PDF/PNG.

## Carte des fichiers (dans `apps/web/src/app/dashboard/print-studio/`)
| Fichier | Rôle |
|---|---|
| `page.tsx` | Page serveur : garde d'auth, rend `PrintStudioClient`. |
| `PrintStudioClient.tsx` | **TOUTE l'UI** (îlot client). Contient les 2 phases + tous les composants de rendu : `MiniSupport` (vignette de la bibliothèque), `Packshot` / `SupportVisual` (le grand aperçu du support), `FlatEditor` (édition libre), les panneaux, l'export. |
| `catalog.ts` | **Données** : `ITEMS` (les 16 supports réels), `STYLES` (palettes), `LAYOUTS` (mises en page), `TYPOS`, `SIZES`, `MESSAGES`, filtres `filterItems`, métiers/objectifs. |
| `mockup.ts` | Moteur pur : `sceneLayers` (décor de scène), `paletteFromStyle`, échelles. |
| `templates.ts` | Bibliothèque de **modèles** prêts-à-l'emploi (panneau « Modèles »). |
| `tokens.ts` | Jetons de design (couleurs = variables CSS `var(--accent)`… , rayons). |
| `states.ts` | Presets/états (module pur, complémentaire). |

## OÙ SONT LES APERÇUS À REFAIRE (le cœur du sujet)
- **Vignette de la bibliothèque** = composant `MiniSupport` (bas de `PrintStudioClient.tsx`) →
  il rend `SupportVisual` en réduit.
- **Grand aperçu** = `Packshot` → `SupportVisual` (composition CSS du support : titre, QR,
  bouton/CTA, fond, cadre…), avec le décor de `sceneLayers` (mockup.ts).
- La « forme » de chaque support vient de `LAYOUTS` (catalog.ts) + `item.layout` + `item.ratio`.
- Les **palettes/ambiances** viennent de `STYLES` (catalog.ts) via `paletteFromStyle` (mockup.ts).
- ⇒ C'est cette **composition CSS** (SupportVisual + layouts + palettes) qu'il faut rendre plus
  réaliste / plus lisible, et la **bibliothèque** qu'il faut agrandir (plus de supports, plus
  grandes vignettes, meilleurs rendus).

## Modèle de données (l'essentiel)
`Item` (catalog.ts) : `{ id, name, support, size, ratio, shape, layout, pal, qrMm, kicker, title, cta, place, scene, plain, bleed, margin, dpi, hMm }`.
`Style` = palette nommée (fond, encre, accent, QR, QR bg…).

## Dépendances périphériques (NON incluses ici — infra générique)
Ces modules sont importés par le client mais ne concernent pas le design des aperçus :
- `../qr-codes/QRCanvas`, `../qr-codes/qrRender` (`getQRBlob`, `createQRSvg`) — génération de l'image QR.
- `../qr-codes/printPreflight` — contrôle qualité avant export.
- `@/components/Particles`, `@/components/ui/Modal`, `@/components/ui/Button` — UI partagée.
- Les couleurs des jetons référencent les variables CSS globales (`--accent` = or de la marque,
  `--bg`, `--ink`, `--muted`, `--surface`, `--success`, `--danger`). Palette DA dorée :
  or clair `#e8c877` → or profond `#c9a24d`, fond `#0d0b09`, cartes `#141210`, chaud `#17140f`.

## Round-trip (important)
C'est du **React/TSX avec styles inline**, pas du `.dc.html`. Dans Claude design, tu peux :
soit produire une **maquette `.dc.html`** des nouveaux aperçus/bibliothèque (je la porte ensuite
en TSX), soit réécrire directement les composants `SupportVisual` / `MiniSupport` / la grille.
Renvoie-moi le résultat et je l'intègre (zéro régression, je garde le câblage réel).

---

## `apps/web/src/app/dashboard/print-studio/page.tsx`

~~~tsx
// Print Studio (nouveau) — route dédiée. Page serveur : garde d'auth + plan.
// L'UI guidée « objets, pas outils » vit dans PrintStudioClient (îlot client).
import { redirect } from "next/navigation"
import { createServerSupabaseClient } from "@/lib/supabase/server"
import PrintStudioClient from "./PrintStudioClient"

export const metadata = { title: "Print Studio" }

export default async function PrintStudioPage() {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect("/auth/login?redirect=/dashboard/print-studio")

  // Print Studio est GRATUIT pour tous les plans (il n'y a plus de création de QR :
  // on réutilise ses propres QR existants ou on importe un PNG — aucune facturation).
  return <PrintStudioClient canAccess />
}
~~~


## `apps/web/src/app/dashboard/print-studio/PrintStudioClient.tsx`

~~~tsx
"use client"

// Print Studio — UI guidée « objets, pas outils » (Print Studio Mobile v3).
// Bibliothèque -> aperçu packshot + 3 volets bornés -> contrôle avant export -> export.
// Consomme les modules purs : catalog / mockup / states / tokens.

import { useEffect, useMemo, useRef, useState } from "react"
import Link from "next/link"
import { ArrowLeft, Lock, Unlock, Eye, EyeOff, ChevronUp, Check, X, Download, ShieldCheck, AlertTriangle, ChevronDown, Copy, Layers, Undo2, Redo2, Plus, MoreVertical,
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
// Bottom sheet mobile (#17) : 3 positions ancrées (repère + hauteur en vh). Canvas visible dès « peek »/« half ».
const SHEET_ORDER = ["peek", "half", "full"] as const
type SheetPos = typeof SHEET_ORDER[number]
const SHEET_VH: Record<SheetPos, number> = { peek: 40, half: 66, full: 90 }
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
  const [sheetPos, setSheetPos] = useState<SheetPos>("half")   // #17 : position ancrée de la sheet (peek/half/full)
  const [sheetDragging, setSheetDragging] = useState(false)    // drag du handle en cours (désactive la transition)
  const [sheetDragPx, setSheetDragPx] = useState(0)            // décalage vertical live pendant le drag
  const sheetDrag = useRef<{ y0: number; moved: number } | null>(null)
  const [mobileTab, setMobileTab] = useState<"theme" | "couleurs" | "texte" | "qr">("theme")   // onglet simple mobile
  const [phase, setPhase] = useState<"library" | "studio">("library")
  const [metier, setMetier] = useState("Tout")
  const [objectif, setObjectif] = useState("Tout")
  // Écran bibliothèque (refonte DA) : recherche libre, tri, expansions.
  const [suppSearch, setSuppSearch] = useState("")
  const [suppSort, setSuppSort] = useState<"pop" | "az">("pop")
  const [showOthers, setShowOthers] = useState(false)     // « Voir les N autres »
  const [allMetiers, setAllMetiers] = useState(false)     // « + N métiers » (déplie les raccourcis)
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
  const [mode, setMode] = useState<"simple" | "studio">("simple")   // #34 : Simple (essentiel) vs Studio (avancé). Desktop uniquement, persisté localStorage.
  const [moreMenu, setMoreMenu] = useState(false)   // menu « ··· » : actions secondaires (Décliner/Planche) hors du header principal
  useEffect(() => { try { const m = localStorage.getItem("qrowg-print-mode"); if (m === "studio" || m === "simple") setMode(m) } catch {} }, [])
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
  const [realSize, setRealSize] = useState(false)         // #24 : aperçu à TAILLE RÉELLE (physique) dans le plein écran
  const [calib, setCalib] = useState(false)               // panneau de calibrage (carte bancaire de référence)
  const [pxPerMm, setPxPerMm] = useState(96 / 25.4)       // px/mm de l'écran (défaut = référence CSS 96 dpi ; calibrable)
  useEffect(() => { try { const v = parseFloat(localStorage.getItem("qrowg-px-per-mm") || ""); if (v > 1 && v < 20) setPxPerMm(v) } catch {} }, [])
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
  // Échap ferme le calibrage puis l'aperçu plein écran.
  useEffect(() => {
    if (!fsOpen && !calib) return
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") { if (calib) setCalib(false); else setFsOpen(false) } }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [fsOpen, calib])

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
    setLibre(true); setFreeEls([]); setSelEl(null); setQrFree(false); setQrFx(0.32); setQrFy(0.55); setPhase("studio")
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
    // Données réelles dérivées du catalogue (jamais de chiffres inventés).
    const allItems = filterItems("Tout", "Tout")
    const totalFormats = new Set(allItems.map(i => i.size)).size
    const q = suppSearch.trim().toLowerCase()
    const match = (i: Item) => !q || [i.name, i.support, i.size, i.place, i.plain].some(s => s.toLowerCase().includes(q))
    const sortList = (l: Item[]) => (suppSort === "az" ? l.slice().sort((a, b) => a.name.localeCompare(b.name, "fr")) : l)
    const hasFilter = metier !== "Tout" || objectif !== "Tout"
    const reco = sortList(filterItems(metier, objectif).filter(match))
    const recoIds = new Set(reco.map(i => i.id))
    const others = hasFilter ? sortList(allItems.filter(i => !recoIds.has(i.id)).filter(match)) : []
    const othersShown = showOthers ? others : others.slice(0, 4)
    const nothing = reco.length === 0 && others.length === 0
    const quick = allMetiers ? METIERS.slice(1) : METIERS.slice(1, 7)
    // Carte de support (aperçu réel via MiniSupport ; badge de format ; ruban « Recommandé » sur la 1re).
    const card = (it: Item, top?: string) => (
      <button key={it.id} className="ps2-card" onClick={() => openItem(it.id)} style={{ position: "relative", textAlign: "left", display: "flex", flexDirection: "column", background: "#141210", border: "1px solid #221f1b", borderRadius: 14, overflow: "hidden", cursor: "pointer", color: "#e8e3da" }}>
        <div style={{ position: "relative", aspectRatio: "4 / 3", display: "flex", alignItems: "center", justifyContent: "center", background: "radial-gradient(120% 100% at 50% 0%, #191512, #100e0c 72%)", borderBottom: "1px solid #1c1917" }}>
          <span style={{ position: "absolute", top: 11, right: 11, padding: "3px 9px", borderRadius: 999, background: "rgba(232,200,119,.1)", border: "1px solid rgba(232,200,119,.3)", color: "#c9a24d", fontSize: 9.5, letterSpacing: ".1em", textTransform: "uppercase", fontWeight: 700, whiteSpace: "nowrap" }}>{it.size}</span>
          {top && <span style={{ position: "absolute", top: 11, left: 11, padding: "3px 9px", borderRadius: 999, background: "linear-gradient(135deg,#e8c877,#c9a24d)", color: "#1a1408", fontSize: 9.5, letterSpacing: ".08em", textTransform: "uppercase", fontWeight: 700, whiteSpace: "nowrap" }}>{top}</span>}
          <MiniSupport item={it} style={STYLE_BY_ID[it.pal]} />
        </div>
        <div style={{ padding: "13px 15px 15px", display: "flex", flexDirection: "column", gap: 5 }}>
          <div style={{ fontSize: 14.5, fontWeight: 600, letterSpacing: "-.01em" }}>{it.name}</div>
          <div style={{ fontSize: 11.5, color: "#8a8177", fontFamily: "ui-monospace, monospace" }}>{it.support} · {it.size}</div>
          <div style={{ fontSize: 11.5, color: "#8a8177", lineHeight: 1.45, overflow: "hidden", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" as any }}>{it.plain}</div>
          <div className="ps2-perso" style={{ marginTop: 4, display: "flex", alignItems: "center", gap: 7, fontSize: 12, fontWeight: 600, color: "#c9a24d" }}>Personnaliser<span aria-hidden style={{ width: 6, height: 6, borderRight: "1.5px solid currentColor", borderTop: "1.5px solid currentColor", transform: "rotate(45deg)" }} /></div>
        </div>
      </button>
    )
    return (
      <div style={{ position: "relative", minHeight: "100dvh", color: "#e8e3da", fontFamily: "Inter, system-ui, sans-serif", padding: "0 16px 56px" }}>
        <Particles behind />
        <style>{`.ps2-card{transition:border-color .26s ease, transform .26s cubic-bezier(.2,.85,.3,1)}.ps2-card:hover{border-color:rgba(232,200,119,.45);transform:translateY(-2px)}.ps2-card:hover .ps2-perso{color:#e8c877}.ps2-sel:hover{border-color:rgba(232,200,119,.4);color:#e8e3da}.ps2-chip{transition:border-color .24s ease,color .24s ease}.ps2-chip:hover{border-color:rgba(232,200,119,.34);color:#e8e3da}.ps2-menuitem:hover{background:rgba(232,200,119,.07)!important}.ps2-x{opacity:.7;transition:opacity .2s ease}.ps2-x:hover{opacity:1}.ps2-search::placeholder{color:#6b6258}.ps2-search:focus{outline:none}.ps2-editeur{transition:background .28s ease,color .28s ease}.ps2-editeur:hover{background:linear-gradient(135deg,#e8c877,#c9a24d)!important;color:#1a1408!important}.ps2-more:hover{color:#e8c877}`}</style>
        <div style={{ maxWidth: 1180, margin: "0 auto", display: "flex", flexDirection: "column", gap: 22 }}>

          {/* En-tête : fil d'Ariane + eyebrow */}
          <header style={{ padding: "18px 0 0", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16, flexWrap: "wrap" }}>
            <Link href="/dashboard/qr-codes" className="ps2-chip" style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "6px 13px 6px 10px", borderRadius: 999, border: "1px solid #26211a", color: "#8a8177", fontSize: 12, fontWeight: 600, textDecoration: "none", whiteSpace: "nowrap" }}>
              <span aria-hidden style={{ width: 6, height: 6, borderLeft: "1.5px solid currentColor", borderBottom: "1.5px solid currentColor", transform: "rotate(45deg)" }} /> QR codes
            </Link>
            <span style={{ fontSize: 10, letterSpacing: ".16em", textTransform: "uppercase", color: "#8a8177", fontWeight: 700 }}>Print Studio</span>
          </header>

          {/* Titre + compteurs réels */}
          <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: 24, flexWrap: "wrap" }}>
            <div style={{ display: "flex", flexDirection: "column", gap: 8, maxWidth: 620 }}>
              <h1 style={{ fontFamily: "Fraunces, Georgia, serif", fontSize: "clamp(26px,4vw,34px)", fontWeight: 700, letterSpacing: "-.025em", lineHeight: 1.05, margin: 0 }}>Choisissez un support</h1>
              <p style={{ fontSize: 14.5, lineHeight: 1.5, color: "#8a8177", margin: 0, textWrap: "pretty" as any }}>Un objet réel, déjà réussi. Trois suffisent : à table, en vitrine, dans la main.</p>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 22, padding: "14px 20px", borderRadius: 12, background: "#141210", border: "1px solid #221f1b" }}>
              <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
                <div style={{ fontSize: 17, fontWeight: 700, color: "#e8c877", letterSpacing: "-.01em" }}>{allItems.length}</div>
                <div style={{ fontSize: 10, letterSpacing: ".16em", textTransform: "uppercase", color: "#8a8177", fontWeight: 600 }}>Supports</div>
              </div>
              <span style={{ width: 1, height: 26, background: "#221f1b" }} />
              <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
                <div style={{ fontSize: 17, fontWeight: 700, color: "#e8c877", letterSpacing: "-.01em" }}>{totalFormats}</div>
                <div style={{ fontSize: 10, letterSpacing: ".16em", textTransform: "uppercase", color: "#8a8177", fontWeight: 600 }}>Formats</div>
              </div>
            </div>
          </div>

          {/* Barre de filtres collante */}
          <div style={{ position: "sticky", top: 0, zIndex: 5, background: "rgba(20,18,16,.95)", backdropFilter: "blur(10px)", border: "1px solid #221f1b", borderRadius: 14, padding: "16px 18px", display: "flex", flexDirection: "column", gap: 14 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
              <div style={{ flex: "1 1 220px", minWidth: 180, display: "flex", alignItems: "center", gap: 9, padding: "10px 13px", borderRadius: 11, background: "#100e0c", border: "1px solid #26211a" }}>
                <span aria-hidden style={{ position: "relative", width: 11, height: 11, flex: "none", border: "1.5px solid #c9a24d", borderRadius: "50%" }}><span style={{ position: "absolute", right: -4, bottom: -3, width: 5, height: 1.5, background: "#c9a24d", transform: "rotate(45deg)" }} /></span>
                <input className="ps2-search" value={suppSearch} onChange={e => setSuppSearch(e.target.value)} placeholder="Sticker, chevalet, carte…" style={{ flex: 1, minWidth: 0, background: "transparent", border: "none", color: "#e8e3da", fontSize: 12.5, caretColor: "#e8c877" }} />
                {suppSearch && <button type="button" aria-label="Effacer" onClick={() => setSuppSearch("")} style={{ background: "none", border: "none", color: "#8a8177", cursor: "pointer", fontSize: 15, lineHeight: 1, padding: 0 }}>×</button>}
              </div>
              <FilterSelect label="Métier" value={metier} options={METIERS} onPick={setMetier} />
              <FilterSelect label="Objectif" value={objectif} options={OBJECTIFS} onPick={setObjectif} />
              <FilterSelect label="Trier" value={suppSort === "az" ? "A → Z" : "Populaires"} options={["Populaires", "A → Z"]} onPick={v => setSuppSort(v === "A → Z" ? "az" : "pop")} />
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
              <span style={{ fontSize: 10, letterSpacing: ".16em", textTransform: "uppercase", color: "#5c554b", fontWeight: 700, marginRight: 2 }}>Rapide</span>
              {quick.map(m => {
                const on = metier === m
                return (
                  <button key={m} type="button" className={on ? undefined : "ps2-chip"} onClick={() => setMetier(on ? "Tout" : m)}
                    style={{ padding: "6px 13px", borderRadius: 999, cursor: "pointer", fontSize: 12, fontWeight: on ? 600 : 500, background: on ? "rgba(232,200,119,.1)" : "transparent", border: `1px solid ${on ? "rgba(232,200,119,.4)" : "#26211a"}`, color: on ? "#e8c877" : "#8a8177" }}>{m}</button>
                )
              })}
              <button type="button" className="ps2-more" onClick={() => setAllMetiers(a => !a)} style={{ padding: "6px 4px", background: "none", border: "none", color: "#8a8177", fontSize: 12, fontWeight: 600, cursor: "pointer", textDecoration: "underline", textDecorationColor: "rgba(232,200,119,.3)", textUnderlineOffset: 3, transition: "color .24s ease" }}>{allMetiers ? "− Réduire" : `+ ${METIERS.length - 1 - 6} métiers`}</button>
            </div>

            {hasFilter && (
              <div style={{ display: "flex", alignItems: "center", gap: 10, paddingTop: 12, borderTop: "1px solid #1c1917", flexWrap: "wrap" }}>
                <span style={{ fontSize: 11.5, color: "#8a8177", whiteSpace: "nowrap" }}>Filtres actifs</span>
                {metier !== "Tout" && <ActiveChip label={metier} onClear={() => setMetier("Tout")} />}
                {objectif !== "Tout" && <ActiveChip label={objectif} onClear={() => setObjectif("Tout")} />}
                <button type="button" onClick={() => { setMetier("Tout"); setObjectif("Tout") }} style={{ marginLeft: "auto", background: "none", border: "none", color: "#8a8177", fontSize: 11.5, fontWeight: 600, cursor: "pointer", whiteSpace: "nowrap" }}>Tout effacer</button>
              </div>
            )}
          </div>

          {nothing && (
            <p style={{ color: "#8a8177", fontSize: 13, margin: "8px 0" }}>Aucun support pour ce filtre. <button type="button" onClick={() => { setMetier("Tout"); setObjectif("Tout"); setSuppSearch("") }} style={{ background: "none", border: "none", color: "#e8c877", cursor: "pointer", fontSize: 13, fontWeight: 600 }}>Tout afficher</button></p>
          )}

          {/* Section recommandés (filtre actif) */}
          {hasFilter && reco.length > 0 && (
            <>
              <div style={{ display: "flex", alignItems: "baseline", gap: 14, flexWrap: "wrap" }}>
                <span style={{ fontSize: 15, fontWeight: 700, letterSpacing: "-.01em" }}>{reco.length} recommandé{reco.length > 1 ? "s" : ""} pour {metier !== "Tout" ? metier : objectif}{metier !== "Tout" && objectif !== "Tout" ? ` · ${objectif}` : ""}</span>
                <span style={{ fontSize: 12, color: "#8a8177" }}>les plus adaptés d'abord</span>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(238px, 1fr))", gap: 18 }}>
                {reco.map((it, i) => card(it, i === 0 ? "Recommandé" : undefined))}
              </div>
            </>
          )}

          {/* Section « Tous les supports » (les autres si filtre, sinon tout) */}
          {(hasFilter ? others.length > 0 : reco.length > 0) && (
            <>
              <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 14, flexWrap: "wrap", paddingTop: 4 }}>
                <div style={{ display: "flex", alignItems: "baseline", gap: 14, flexWrap: "wrap" }}>
                  <span style={{ fontSize: 15, fontWeight: 700, letterSpacing: "-.01em" }}>Tous les supports</span>
                  <span style={{ fontSize: 12, color: "#8a8177" }}>{hasFilter ? `${others.length} autre${others.length > 1 ? "s" : ""}, tous métiers confondus` : `${reco.length} support${reco.length > 1 ? "s" : ""}`}</span>
                </div>
                {hasFilter && others.length > 4 && (
                  <button type="button" className="ps2-chip" onClick={() => setShowOthers(s => !s)} style={{ padding: "7px 15px", borderRadius: 999, border: "1px solid #26211a", background: "none", color: "#8a8177", fontSize: 12, fontWeight: 600, cursor: "pointer", whiteSpace: "nowrap" }}>{showOthers ? "Réduire" : `Voir les ${others.length - 4} autres`}</button>
                )}
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(238px, 1fr))", gap: 18 }}>
                {(hasFilter ? othersShown : reco).map(it => card(it))}
              </div>
            </>
          )}

          {/* Pied de page : éditeur libre */}
          <div style={{ display: "flex", alignItems: "center", gap: 14, padding: "16px 18px", borderRadius: 12, background: "#17140f", border: "1px solid #2e281f", flexWrap: "wrap" }}>
            <span aria-hidden style={{ width: 2, alignSelf: "stretch", minHeight: 34, borderRadius: 2, background: "linear-gradient(180deg, #e8c877, #c9a24d)" }} />
            <div style={{ display: "flex", flexDirection: "column", gap: 3, minWidth: 0 }}>
              <span style={{ fontSize: 13, fontWeight: 600, color: "#e8e3da" }}>Vous ne trouvez pas votre support ?</span>
              <span style={{ fontSize: 11.5, color: "#8a8177" }}>L'éditeur libre part d'un format A4 : vous posez le QR où vous voulez.</span>
            </div>
            <button type="button" className="ps2-editeur" onClick={() => openItem("i11")} style={{ marginLeft: "auto", padding: "9px 18px", borderRadius: 999, border: "1px solid rgba(232,200,119,.35)", background: "linear-gradient(135deg, rgba(232,200,119,.16), rgba(201,162,77,.1))", color: "#e8c877", fontSize: 12.5, fontWeight: 700, whiteSpace: "nowrap", cursor: "pointer" }}>Éditeur libre</button>
          </div>
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
  // Édition libre TOUJOURS active en mode Studio (desktop) : plus de bascule Aperçu/Édition — on entre direct en édition.
  const showFlat = libre && mode === "studio" && !isMobile   // réservée au desktop ; mobile = guidé simple
  // Sélection contextuelle (#12/#32) — DESKTOP uniquement (onFocus n'est pas passé sur mobile : le tap y reste « plein écran »).
  // Cliquer un objet de l'aperçu (titre/QR/bouton/fond) ouvre son volet dédié : accordéon + scroll + surlignage.
  function focusPanel(panel: string) {
    setLibre(false); setSelEl(null)
    // En mode Simple, le volet « Le design » (fond fin) est masqué → on renvoie vers « L'allure » (couleurs présentes).
    const target = mode === "simple" && panel === "details" ? "allure" : panel
    setOpen(target); setFlashPanel(target)
    requestAnimationFrame(() => document.querySelector(`[data-panel="${target}"]`)?.scrollIntoView({ behavior: "smooth", block: "nearest" }))
    window.setTimeout(() => setFlashPanel(p => (p === target ? null : p)), 1000)
  }
  // #34 : bascule Simple/Studio (persistée). Passer en Simple ferme l'édition libre et rabat vers un volet essentiel.
  function applyMode(m: "simple" | "studio") {
    setMode(m); try { localStorage.setItem("qrowg-print-mode", m) } catch {}
    if (m === "simple") { setLibre(false); setSelEl(null); setOpen(o => (o === "styles" || o === "details" || o === "calques" ? "texte" : o)) }
    else setLibre(true)   // Studio = édition libre d'office
  }
  // #17 : bottom sheet mobile à positions ancrées. Ouvrir un onglet ouvre la sheet à « half ».
  function openSheet(tab: "theme" | "couleurs" | "texte" | "qr") { setMobileTab(tab); setSheetPos("half"); setSheetOpen(true) }
  // Déplace la sheet d'un cran (dir +1 = plus grande, -1 = plus petite ; sous « peek » = fermer).
  function stepSheet(dir: 1 | -1) {
    const i = SHEET_ORDER.indexOf(sheetPos) + dir
    if (i < 0) { setSheetOpen(false); return }
    setSheetPos(SHEET_ORDER[Math.min(SHEET_ORDER.length - 1, i)])
  }
  // Drag du handle : suit le doigt (translate), puis snap au cran voisin ; tap sec = cran suivant (cyclique).
  function onSheetDown(e: React.PointerEvent) { sheetDrag.current = { y0: e.clientY, moved: 0 }; setSheetDragging(true); try { (e.target as HTMLElement).setPointerCapture(e.pointerId) } catch {} }
  function onSheetMove(e: React.PointerEvent) { const d = sheetDrag.current; if (!d) return; d.moved = e.clientY - d.y0; setSheetDragPx(Math.max(-48, d.moved)) }
  function onSheetUp() {
    const d = sheetDrag.current; sheetDrag.current = null; setSheetDragging(false); const dy = d?.moved ?? 0; setSheetDragPx(0)
    if (Math.abs(dy) < 8) { const i = SHEET_ORDER.indexOf(sheetPos); setSheetPos(SHEET_ORDER[(i + 1) % SHEET_ORDER.length]); return }
    if (dy > 56) stepSheet(-1); else if (dy < -56) stepSheet(1)
  }
  const layBtn: React.CSSProperties = { width: 28, height: 28, borderRadius: 7, border: "none", background: "transparent", color: C.fgMuted, cursor: "pointer", display: "inline-flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }
  return (
    <div className="ps-root" style={{ position: "relative", minHeight: "100dvh", color: C.fg, fontFamily: "Inter, system-ui, sans-serif" }}>
      <Particles behind />
      <header className="ps-hdr" style={{ maxWidth: 1320, margin: "0 auto", padding: "14px 16px", display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 8 }}>
        <button onClick={() => setPhase("library")} style={{ display: "inline-flex", alignItems: "center", gap: 6, background: "none", border: "none", color: C.fgMuted, cursor: "pointer", fontSize: 13, flexShrink: 0 }}><ArrowLeft size={16} /> Bibliothèque</button>
        <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", justifyContent: "flex-end" }}>
          {/* #34 : bascule Simple/Studio (desktop). Simple = essentiel ; Studio révèle l'avancé (design fin, styles, édition libre, planche). */}
          {!isMobile && (
            <div style={{ display: "inline-flex", gap: 3, background: C.surfaceUp, borderRadius: 999, padding: 3 }} role="tablist" aria-label="Mode d'édition">
              {(["simple", "studio"] as const).map(m => (
                <button key={m} role="tab" aria-selected={mode === m} onClick={() => applyMode(m)} title={m === "simple" ? "Essentiel — l'indispensable" : "Studio — tous les réglages avancés"} style={{ minHeight: 34, padding: "0 15px", borderRadius: 999, border: "none", cursor: "pointer", fontSize: 12.5, fontWeight: mode === m ? 800 : 600, background: mode === m ? C.gold : "transparent", color: mode === m ? "#0A0A0A" : C.fgMuted }}>{m === "simple" ? "Simple" : "Studio"}</button>
              ))}
            </div>
          )}
          {/* Mobile = simplifié : on masque annuler/rétablir · Décliner · Planche (fonctions avancées desktop). */}
          {!isMobile && <>
            <div style={{ display: "inline-flex", gap: 4 }}>
              <button onClick={undo} disabled={!canUndo} title="Annuler (Ctrl+Z)" aria-label="Annuler" style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: 42, height: 42, background: "transparent", border: `1px solid ${C.hairline}`, borderRadius: 10, color: canUndo ? C.fg : C.fgFaint, cursor: canUndo ? "pointer" : "default", opacity: canUndo ? 1 : 0.5 }}><Undo2 size={16} /></button>
              <button onClick={redo} disabled={!canRedo} title="Rétablir (Ctrl+Maj+Z)" aria-label="Rétablir" style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: 42, height: 42, background: "transparent", border: `1px solid ${C.hairline}`, borderRadius: 10, color: canRedo ? C.fg : C.fgFaint, cursor: canRedo ? "pointer" : "default", opacity: canRedo ? 1 : 0.5 }}><Redo2 size={16} /></button>
            </div>
          </>}
          {/* Actions secondaires regroupées dans un menu « ··· » (§P1/§9 : header allégé, sorties clarifiées). */}
          {!isMobile && mode === "studio" && (
            <div style={{ position: "relative" }}>
              <button onClick={() => setMoreMenu(v => !v)} aria-haspopup="menu" aria-expanded={moreMenu} title="Plus d'actions" style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: 42, height: 42, background: moreMenu ? C.surfaceUp : "transparent", border: `1px solid ${C.hairline}`, borderRadius: 10, color: C.fg, cursor: "pointer" }}><MoreVertical size={16} /></button>
              {moreMenu && (
                <>
                  <div onClick={() => setMoreMenu(false)} style={{ position: "fixed", inset: 0, zIndex: 40 }} />
                  <div role="menu" className="mo-fade-up" style={{ position: "absolute", top: "calc(100% + 6px)", right: 0, zIndex: 41, minWidth: 180, background: C.surface, border: `1px solid ${C.hairline}`, borderRadius: 12, padding: 6, boxShadow: "0 16px 44px rgba(0,0,0,0.5)" }}>
                    <button role="menuitem" onClick={() => { setMoreMenu(false); setDeclineOpen(true) }} style={{ display: "flex", alignItems: "center", gap: 9, width: "100%", padding: "10px 12px", background: "none", border: "none", borderRadius: 8, color: C.fg, cursor: "pointer", fontSize: 13, fontWeight: 600, textAlign: "left" }}><Copy size={15} color={C.fgMuted} /> Décliner sur un support</button>
                    <button role="menuitem" onClick={() => { setMoreMenu(false); if (!campaign.length) setCampaign([item.id]); setCampaignOpen(true) }} style={{ display: "flex", alignItems: "center", gap: 9, width: "100%", padding: "10px 12px", background: "none", border: "none", borderRadius: 8, color: C.fg, cursor: "pointer", fontSize: 13, fontWeight: 600, textAlign: "left" }}><Layers size={15} color={C.fgMuted} /> Planche multi-supports</button>
                  </div>
                </>
              )}
            </div>
          )}
          {designCode && <button onClick={saveDesign} style={{ display: "inline-flex", alignItems: "center", gap: 6, background: designSaved ? C.goldSoft : "transparent", border: `1px solid ${designSaved ? C.gold : C.hairline}`, color: designSaved ? C.gold : C.fg, cursor: "pointer", fontSize: 12.5, fontWeight: 700, borderRadius: 999, padding: "10px 16px" }}>{designSaved ? <Check size={14} /> : <ShieldCheck size={14} />} {designSaved ? "Enregistré" : "Enregistrer"}</button>}
          {!isMobile && <span style={{ fontSize: 12.5, fontWeight: 700, color: C.fgMuted }}>{item.name} · <span style={{ fontFamily: "ui-monospace, monospace" }}>{item.size}</span></span>}
        </div>
      </header>

      <div className="ps-grid" style={{ maxWidth: 1320, margin: "0 auto", padding: isMobile ? "0 12px 172px" : "0 16px 10px", display: "grid", gap: 24, gridTemplateColumns: "1fr" }}>
        {/* Canvas héros (#2) + shell ZÉRO-SCROLL (§11) : sur desktop le root est une colonne 100dvh (header figé,
            grille flex:1 à overflow interne, barre d'action en pied statique) → aucun scroll de page, seuls les
            panneaux/canvas scrollent en interne. Mobile inchangé (scroll doux + sheet). */}
        <style>{`@media(min-width:1025px){.ps-root{height:100dvh;display:flex;flex-direction:column;overflow:hidden}.ps-hdr{flex-shrink:0}.ps-grid{grid-template-columns:minmax(0,1fr) 372px!important;flex:1;min-height:0;overflow:hidden}.ps-aside{min-height:0;overflow-y:auto;align-self:stretch}.ps-panels{min-height:0;overflow-y:auto}.ps-actionbar{position:static!important}}.ps-chip{transition:border-color var(--mo-fast) var(--mo-ease-standard),background var(--mo-fast) var(--mo-ease-standard),color var(--mo-fast) var(--mo-ease-standard)}.ps-chip:hover{border-color:color-mix(in srgb,var(--accent) 50%,transparent)}.ps-foc{outline:2px solid transparent;outline-offset:3px;border-radius:4px;transition:outline-color var(--mo-fast) var(--mo-ease-standard)}.ps-foc:hover{outline-color:color-mix(in srgb,var(--accent) 60%,transparent)}.ps-flash{animation:psflash var(--mo-slow) var(--mo-ease-emphasized)}@keyframes psflash{0%{box-shadow:0 0 0 0 color-mix(in srgb,var(--accent) 60%,transparent)}30%{box-shadow:0 0 0 3px color-mix(in srgb,var(--accent) 45%,transparent)}100%{box-shadow:0 0 0 0 transparent}}@media(prefers-reduced-motion:reduce){.ps-flash{animation:none}.ps-foc{transition:none}}`}</style>

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
                <div onClick={() => { if (isMobile && sheetOpen && sheetPos !== "peek") setSheetPos("peek"); else setFsOpen(true) }} title="Agrandir l'aperçu" style={{ cursor: "zoom-in" }}><Packshot item={item} scene={scene} {...designProps} box={isMobile ? 520 : 640} onFocus={isMobile ? undefined : focusPanel} /></div>
                <button onClick={e => { e.stopPropagation(); setFsOpen(true) }} aria-label="Plein écran" title="Plein écran" style={{ position: "absolute", top: isMobile ? 12 : 40, right: isMobile ? 12 : 40, width: 40, height: 40, borderRadius: 11, background: "rgba(0,0,0,0.45)", border: "1px solid rgba(255,255,255,0.2)", color: "#fff", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", backdropFilter: "blur(4px)", fontSize: 17, lineHeight: 1, zIndex: 2 }}>⛶</button>
              </div>}
          {/* Bascule « Aperçu / Édition libre » retirée : en Studio, l'édition libre est active d'office. */}
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
        <div className="ps-panels" style={{ display: "flex", flexDirection: "column", gap: 10, paddingRight: 2 }}>
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

          {/* Styles rapides (Studio) — volet accordéon : modèles prêts, modèles perso, charte. */}
          {mode === "studio" && <Panel id="styles" title="Styles rapides" resume={activePreset ? `Modèle : ${PRESETS.find(p => p.id === activePreset)?.label}` : "Modèles prêts · mes modèles · charte"} open={open} setOpen={setOpen}>
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
          </Panel>}

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
          <Panel id="allure" title="L'allure" resume={`${style.label} · ${ACCENTS.find(a => a.id === accent)?.label ?? "Auto"} · ${layout.label}`} open={open} setOpen={setOpen} flash={flashPanel === "allure"}>
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

          {/* Volet DESIGN (Studio) — réglages fins du fond : finition, cadre, photo, placement. */}
          {mode === "studio" && <Panel id="details" title="Le design" resume={`${FINISH_LABEL[bgFinish] ?? "Uni"} · ${FRAME_LABEL[frame] ?? "sans cadre"}`} open={open} setOpen={setOpen} flash={flashPanel === "details"}>
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
          </Panel>}
        </div>
        )}
      </div>

      {/* ── MOBILE : version SIMPLIFIÉE — Thème · Couleurs · Texte · QR uniquement (sheet courte, canvas visible). ── */}
      {isMobile && (
        <>
          {/* Backdrop seulement en « full » (tap = revenir à half) ; en peek/half le canvas reste VISIBLE et interactif. */}
          {sheetOpen && sheetPos === "full" && <div onClick={() => setSheetPos("half")} aria-hidden style={{ position: "fixed", inset: 0, zIndex: 69, background: "rgba(0,0,0,0.35)" }} />}
          {/* Padding bas généreux : la barre d'onglets (zIndex 71) reste AU-DESSUS de la sheet → onglets toujours cliquables. */}
          <div style={{ position: "fixed", left: 0, right: 0, bottom: kb, zIndex: 70, height: kb ? `calc(74vh - ${kb}px)` : `${SHEET_VH[sheetPos]}vh`, maxHeight: "92vh", overflowY: "auto", WebkitOverflowScrolling: "touch", background: C.bg, borderTopLeftRadius: 20, borderTopRightRadius: 20, borderTop: `1px solid ${C.hairline}`, boxShadow: "0 -16px 44px rgba(0,0,0,0.5)", padding: `0 16px ${kb ? "66px" : "calc(128px + env(safe-area-inset-bottom))"}`, transform: sheetOpen ? `translateY(${sheetDragPx}px)` : "translateY(112%)", transition: sheetDragging ? "none" : "transform var(--mo-sheet) var(--mo-ease-standard), height var(--mo-sheet) var(--mo-ease-standard)", display: "flex", flexDirection: "column", gap: 12 }}>
            <div style={{ position: "sticky", top: 0, zIndex: 3, background: C.bg, paddingTop: 8 }}>
              {/* Handle : glisser pour changer de hauteur (snap au cran voisin) · tap pour passer au cran suivant. */}
              <div onPointerDown={onSheetDown} onPointerMove={onSheetMove} onPointerUp={onSheetUp} onPointerCancel={onSheetUp} role="slider" aria-label="Hauteur du panneau" aria-valuetext={sheetPos} tabIndex={0} style={{ touchAction: "none", cursor: "grab", padding: "2px 0 6px" }}>
                <div style={{ width: 40, height: 4, borderRadius: 4, background: "rgba(255,255,255,0.22)", margin: "0 auto 8px" }} />
              </div>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", paddingBottom: 6 }}>
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

      {/* Barre d'action ancrée — mobile : onglets (ouvrent la sheet) + action ; desktop : statut + action.
          zIndex 71 > sheet (70) : les onglets restent tappables même sheet ouverte (peek/half = non modal). */}
      <div className="ps-actionbar" style={{ position: "fixed", left: 0, right: 0, bottom: 0, background: "color-mix(in srgb, var(--surface) 92%, transparent)", borderTop: `1px solid ${C.hairline}`, backdropFilter: "blur(8px)", padding: "10px 16px calc(10px + env(safe-area-inset-bottom))", zIndex: isMobile ? 71 : 30 }}>
        <div style={{ maxWidth: 1320, margin: "0 auto", display: "flex", flexDirection: "column", gap: 8 }}>
          {isMobile && (
            <div style={{ display: "flex", gap: 6 }}>
              {([["theme", "Thème"], ["couleurs", "Couleurs"], ["texte", "Texte"], ["qr", "QR"]] as const).map(([id, lbl]) => (
                <button key={id} onClick={() => { if (sheetOpen && mobileTab === id) setSheetOpen(false); else openSheet(id) }} style={{ ...chipStyle(sheetOpen && mobileTab === id), minHeight: 42, fontSize: 12.5, flex: 1 }}>{lbl}</button>
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
        <div className="mo-pop-in" style={{ textAlign: "center", padding: "4px 0 16px" }}>
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
          <div onClick={e => e.stopPropagation()} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 14, maxWidth: "100%", maxHeight: "100%" }}>
            {/* Bascule Scène / Taille réelle (#24) — répond à « est-ce assez grand ? » avant impression. */}
            <div style={{ display: "inline-flex", gap: 3, background: "rgba(255,255,255,0.1)", borderRadius: 999, padding: 3 }}>
              {([["scene", "Scène"], ["real", "Taille réelle"]] as const).map(([id, lbl]) => {
                const on = realSize === (id === "real")
                return <button key={id} onClick={() => setRealSize(id === "real")} style={{ minHeight: 36, padding: "0 16px", borderRadius: 999, border: "none", cursor: "pointer", fontSize: 12.5, fontWeight: on ? 800 : 600, background: on ? "#fff" : "transparent", color: on ? "#0A0A0A" : "rgba(255,255,255,0.7)" }}>{lbl}</button>
              })}
            </div>
            {realSize ? (
              <>
                <div style={{ overflow: "auto", maxWidth: "92vw", maxHeight: "62vh", display: "flex", justifyContent: "center", alignItems: "flex-start", borderRadius: 8 }}>
                  <div style={{ flexShrink: 0 }}><SupportVisual {...designProps} item={item} physW={trimWidthMm(item)} w={Math.round(trimWidthMm(item) * pxPerMm)} h={Math.round(item.hMm * pxPerMm)} /></div>
                </div>
                <p style={{ textAlign: "center", color: "rgba(255,255,255,0.8)", fontSize: 13, margin: 0 }}>Taille réelle : <b>{trimWidthMm(item)} × {item.hMm} mm</b> · QR ≈ <b>{(item.qrMm * effSize.factor).toFixed(1)} mm</b></p>
                {/* Le calibrage carte bancaire (85,6 mm) n'a de sens que sur un écran plus large qu'une carte → desktop. */}
                {!isMobile && <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                  <button onClick={() => setCalib(true)} style={{ background: "rgba(255,255,255,0.12)", border: "1px solid rgba(255,255,255,0.24)", color: "#fff", cursor: "pointer", fontSize: 12.5, fontWeight: 700, borderRadius: 999, padding: "9px 16px" }}>Ajuster à mon écran</button>
                </div>}
                <p style={{ textAlign: "center", color: "rgba(255,255,255,0.42)", fontSize: 11, margin: 0, maxWidth: 340 }}>Approximatif selon l'écran{!isMobile ? " — ajustez avec une carte bancaire pour une précision au millimètre." : "."}</p>
              </>
            ) : (
              <>
                <div style={{ width: "min(92vw, 76vh)", maxWidth: 760 }}><Packshot item={item} scene={scene} {...designProps} box={1400} /></div>
                <p style={{ textAlign: "center", color: "rgba(255,255,255,0.6)", fontSize: 12, margin: 0 }}>{supportHint(item)} · {qrReady ? "votre QR est en place" : "ajoutez votre QR"}</p>
              </>
            )}
          </div>
        </div>
      )}

      {/* Calibrage écran (#24) — carte bancaire de référence : règle px/mm pour un aperçu au mm près (persisté). */}
      {calib && (
        <div style={{ position: "fixed", inset: 0, zIndex: 95, background: "rgba(0,0,0,0.95)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 22, padding: 24 }}>
          <p style={{ color: "#fff", fontSize: 14, textAlign: "center", maxWidth: 360, margin: 0, lineHeight: 1.45 }}>Placez une carte bancaire contre l'écran et ajustez jusqu'à ce que le rectangle ait <b>exactement</b> sa taille.</p>
          <div style={{ width: 85.6 * pxPerMm, height: 53.98 * pxPerMm, borderRadius: 3.18 * pxPerMm, border: `2px solid ${C.gold}`, background: C.goldSoft, display: "flex", alignItems: "center", justifyContent: "center", color: "rgba(255,255,255,0.8)", fontSize: 12, flexShrink: 0 }}>Carte bancaire</div>
          <div style={{ width: "min(90vw, 360px)" }}><Range value={pxPerMm} min={2.5} max={7.5} step={0.01} onChange={v => { setPxPerMm(v); try { localStorage.setItem("qrowg-px-per-mm", String(v)) } catch {} }} hint={`${pxPerMm.toFixed(2)} px/mm`} /></div>
          <div style={{ display: "flex", gap: 10 }}>
            <button onClick={() => { setPxPerMm(96 / 25.4); try { localStorage.removeItem("qrowg-px-per-mm") } catch {} }} style={{ background: "transparent", border: "1px solid rgba(255,255,255,0.24)", color: "#fff", cursor: "pointer", fontSize: 12.5, fontWeight: 700, borderRadius: 999, padding: "10px 18px" }}>Réinitialiser</button>
            <Button variant="primary" onClick={() => setCalib(false)}>Terminé</Button>
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
~~~


## `apps/web/src/app/dashboard/print-studio/catalog.ts`

~~~tsx
// QRowg · Print Studio — catalogue de données
// Porté depuis « Print Studio Mobile v3 ». Aucune dépendance, aucun DOM.
// Tout est en français côté libellés : ce sont les chaînes affichées à l'utilisateur.
//
// Vocabulaire :
// - OBJET (ITEMS)  : un support réel (« Sticker de table »), pas un format.
// - STYLE          : un thème graphique complet (fond, encre, accent, typos, couleurs du QR).
// - AMBIANCE       : un regroupement de styles proposé à l'utilisateur (8 entrées).
// - MÉTIER         : filtre d'entrée (20 entrées) — ordonne objets et ambiances.
// - OBJECTIF (OBJ) : à quoi sert l'objet (Menu, Avis, Wifi…), pour le filtre croisé.

export type Style = {
  id: string; label: string; bg: string; ink: string; accent: string;
  title: string; body: string; qr: string; qrBg: string;
}
export type Typo = { id: string; label: string; t: string | null; b: string | null }
export type Ambiance = { id: string; label: string; rep: string; styles: string[] }
export type Layout = { id: string; label: string; content: string; deco: string | null }
export type Item = {
  id: string; hMm: number; place: string; scene: string; layout: string;
  name: string; support: string; size: string; bleed: number; margin: number;
  dpi: number; shape: string; ratio: number; plain: string; kicker: string;
  title: string; cta: string; qrMm: number; pal: string;
}
export type Size = { id: string; label: string; factor: number; note: string }

const STYLES: Style[] = [
  { id: 'luxgold', label: 'Luxury Gold', bg: '#0B0805', ink: '#F4E7C4', accent: '#D4AF37', title: 'Fraunces', body: 'Montserrat', qr: '#0A0A0A', qrBg: '#FBF8F0' },
  { id: 'modernblack', label: 'Modern Black', bg: '#0E0E10', ink: '#FFFFFF', accent: '#FFFFFF', title: 'Bebas Neue', body: 'Montserrat', qr: '#0A0A0A', qrBg: '#FFFFFF' },
  { id: 'restofresh', label: 'Restaurant Fresh', bg: '#FFF8EE', ink: '#2A2419', accent: '#C0392B', title: 'Playfair Display', body: 'Poppins', qr: '#3A1212', qrBg: '#FFFFFF' },
  { id: 'corporate', label: 'Corporate Blue', bg: '#F4F8FC', ink: '#0F2540', accent: '#1D4ED8', title: 'Montserrat', body: 'Montserrat', qr: '#1D4ED8', qrBg: '#EAF2FF' },
  { id: 'neon', label: 'Neon Creator', bg: '#0A0A14', ink: '#EAEAFF', accent: '#FF3D9A', title: 'Bebas Neue', body: 'Poppins', qr: '#2A0A2E', qrBg: '#FFFFFF' },
  { id: 'minimal', label: 'Minimal White', bg: '#FFFFFF', ink: '#1A1A1A', accent: '#1A1A1A', title: 'Raleway', body: 'Raleway', qr: '#0A0A0A', qrBg: '#F8F8F8' },
  { id: 'premiumdark', label: 'Premium Dark', bg: '#101010', ink: '#F5F0E8', accent: '#C9A84C', title: 'Fraunces', body: 'Montserrat', qr: '#0A0A0A', qrBg: '#FBF8F0' },
  { id: 'sunset', label: 'Bold Sunset', bg: '#1A0E14', ink: '#FFE8D6', accent: '#FF7A4D', title: 'Bebas Neue', body: 'Poppins', qr: '#5A3A12', qrBg: '#FFFFFF' },
  { id: 'sage', label: 'Sage Natural', bg: '#F2F4EE', ink: '#2B3326', accent: '#6B8E5A', title: 'Lora', body: 'Raleway', qr: '#0F3D2E', qrBg: '#FFFFFF' },
  { id: 'inkedit', label: 'Ink Editorial', bg: '#FBFAF7', ink: '#1A1A1A', accent: '#1A1A1A', title: 'Playfair Display', body: 'Montserrat', qr: '#0A0A0A', qrBg: '#FFFFFF' },
  { id: 'menuclair', label: 'Menu Clair', bg: '#FBF3E7', ink: '#3A2316', accent: '#B8860B', title: 'Playfair Display', body: 'Poppins', qr: '#5A3A12', qrBg: '#FFFFFF' },
  { id: 'resa', label: 'Réservation', bg: '#06231C', ink: '#EAF7F0', accent: '#34D399', title: 'Montserrat', body: 'Poppins', qr: '#0F3D2E', qrBg: '#FFFFFF' },
  { id: 'resaclair', label: 'Réservation Clair', bg: '#F2F7F4', ink: '#10271E', accent: '#0E7A5F', title: 'Lora', body: 'Raleway', qr: '#0F3D2E', qrBg: '#FFFFFF' },
  { id: 'insta', label: 'Instagram', bg: '#1A0A14', ink: '#FFF0F6', accent: '#E1306C', title: 'Bebas Neue', body: 'Poppins', qr: '#2A0A2E', qrBg: '#FFFFFF' },
  { id: 'instaclair', label: 'Instagram Clair', bg: '#FFF5F8', ink: '#2A0A18', accent: '#E1306C', title: 'Raleway', body: 'Poppins', qr: '#2A0A2E', qrBg: '#FFFFFF' },
  { id: 'contact', label: 'Contact', bg: '#0F1729', ink: '#F1F5FF', accent: '#5B8DEF', title: 'Montserrat', body: 'Montserrat', qr: '#13243A', qrBg: '#EAF2FF' },
  { id: 'contactclair', label: 'Contact Clair', bg: '#F7F9FC', ink: '#0F2540', accent: '#1D4ED8', title: 'Montserrat', body: 'Montserrat', qr: '#1D4ED8', qrBg: '#EAF2FF' },
  { id: 'decouvrir', label: 'Découvrir', bg: '#10130F', ink: '#EAF4E6', accent: '#16A34A', title: 'Raleway', body: 'Montserrat', qr: '#0F3D2E', qrBg: '#FFFFFF' },
  { id: 'aviscadre', label: 'Avis Cadre', bg: '#FBF6EC', ink: '#2A2419', accent: '#B8860B', title: 'Playfair Display', body: 'Montserrat', qr: '#5A3A12', qrBg: '#FBF8F0' },
  { id: 'barnoir', label: 'Bar Cocktails', bg: '#0E0B07', ink: '#F2E6CE', accent: '#C9A84C', title: 'Fraunces', body: 'Montserrat', qr: '#0A0A0A', qrBg: '#FBF8F0' },
  { id: 'offre', label: 'Commerce Offre', bg: '#1A0E0A', ink: '#FFF3EA', accent: '#E8602C', title: 'Bebas Neue', body: 'Poppins', qr: '#3A1212', qrBg: '#FFFFFF' },
  { id: 'ticket', label: 'Événement Ticket', bg: '#160726', ink: '#F3E9FF', accent: '#A855F7', title: 'Bebas Neue', body: 'Poppins', qr: '#2A0A2E', qrBg: '#FFFFFF' },
  { id: 'airbnb', label: 'Airbnb Bienvenue', bg: '#EFE3D2', ink: '#2A2419', accent: '#C56B3E', title: 'Lora', body: 'Raleway', qr: '#5A3A12', qrBg: '#FFFFFF' },
  { id: 'immo', label: 'Immobilier Fiche', bg: '#F2F4F1', ink: '#1E2A24', accent: '#2E6F5E', title: 'Montserrat', body: 'Raleway', qr: '#0F3D2E', qrBg: '#FFFFFF' },
  { id: 'soldes', label: 'Soldes Méga', bg: '#0E1116', ink: '#FFFFFF', accent: '#FF4D4D', title: 'Bebas Neue', body: 'Montserrat', qr: '#0A0A0A', qrBg: '#FFFFFF' },
  { id: 'creator', label: 'Link in bio', bg: '#120A1F', ink: '#F2E9FF', accent: '#9B5CF6', title: 'Bebas Neue', body: 'Poppins', qr: '#7C3AED', qrBg: '#FFFFFF' },
  { id: 'portfolio', label: 'Portfolio', bg: '#15181C', ink: '#F0F2F4', accent: '#D9A441', title: 'Raleway', body: 'Montserrat', qr: '#0A0A0A', qrBg: '#F8F8F8' },
  { id: 'wifivert', label: 'Wifi Vert', bg: '#0E1A16', ink: '#EAF4F0', accent: '#2E8B7B', title: 'Montserrat', body: 'Poppins', qr: '#0F3D2E', qrBg: '#FFFFFF' },
  { id: 'guide', label: 'Guide Étapes', bg: '#F3F0E9', ink: '#2A2419', accent: '#3FA796', title: 'Lora', body: 'Raleway', qr: '#0A0A0A', qrBg: '#FFFFFF' },
]

// Polices RÉELLEMENT rendues : self-hostées (Fraunces / Inter / DM Sans / JetBrains Mono, cf. globals.css)
// + familles système présentes quasi partout. On évite les Google Fonts non chargées (rendu silencieusement cassé).
const TYPOS: Typo[] = [
  { id: 'auto', label: 'Du thème', t: null, b: null },
  { id: 'serifchic', label: 'Serif chic', t: 'Fraunces', b: 'DM Sans' },
  { id: 'editorial', label: 'Éditorial', t: 'Georgia', b: 'Inter' },
  { id: 'affiche', label: 'Affiche', t: 'Impact', b: 'Arial' },
  { id: 'elegant', label: 'Élégant', t: 'Palatino Linotype', b: 'Inter' },
  { id: 'classique', label: 'Classique', t: 'Times New Roman', b: 'Georgia' },
  { id: 'moderne', label: 'Moderne', t: 'Inter', b: 'Inter' },
  { id: 'doux', label: 'Doux', t: 'Georgia', b: 'DM Sans' },
  { id: 'techno', label: 'Techno', t: 'JetBrains Mono', b: 'Inter' },
  { id: 'net', label: 'Net', t: 'Trebuchet MS', b: 'Verdana' },
  { id: 'machine', label: 'Machine', t: 'Courier New', b: 'Inter' },
  { id: 'naturel', label: 'Naturel', t: 'Garamond', b: 'Inter' },
]

const AMBIANCES: Ambiance[] = [
  { id: 'chaleureux', label: 'Chaleureux', rep: 'restofresh', styles: ['restofresh', 'menuclair', 'airbnb', 'aviscadre', 'offre', 'sunset'] },
  { id: 'epure', label: 'Épuré', rep: 'minimal', styles: ['minimal', 'inkedit', 'immo', 'guide'] },
  { id: 'nuit', label: 'Nuit', rep: 'modernblack', styles: ['modernblack', 'premiumdark', 'portfolio', 'contact', 'decouvrir'] },
  { id: 'dore', label: 'Doré', rep: 'luxgold', styles: ['luxgold', 'barnoir', 'menuclair'] },
  { id: 'vif', label: 'Vif', rep: 'neon', styles: ['neon', 'insta', 'ticket', 'creator', 'soldes'] },
  { id: 'naturel', label: 'Naturel', rep: 'sage', styles: ['sage', 'wifivert', 'resa', 'resaclair'] },
  { id: 'marin', label: 'Marin', rep: 'corporate', styles: ['corporate', 'contactclair', 'contact'] },
  { id: 'pastel', label: 'Pastel', rep: 'instaclair', styles: ['instaclair', 'resaclair', 'airbnb', 'guide'] },
]

// style id -> ambiance id (première ambiance qui le revendique)
export const AMB_OF: Record<string, string> = {}
AMBIANCES.forEach(a => a.styles.forEach(id => { if (!AMB_OF[id]) AMB_OF[id] = a.id }))

// métier -> 3 ambiances mises en avant, dans l'ordre
const MET_AMB: Record<string, string[]> = {
  'Tout': ['chaleureux', 'epure', 'nuit'],
  'Restaurant': ['chaleureux', 'dore', 'nuit'],
  'Bar': ['nuit', 'dore', 'vif'],
  'Boulangerie': ['chaleureux', 'naturel', 'epure'],
  'Coiffeur': ['epure', 'pastel', 'nuit'],
  'Beauté': ['pastel', 'epure', 'dore'],
  'Boutique': ['vif', 'epure', 'chaleureux'],
  'Hôtel': ['dore', 'chaleureux', 'marin'],
  'Artisan': ['naturel', 'chaleureux', 'epure'],
  'Coach': ['naturel', 'marin', 'epure'],
  'Immobilier': ['marin', 'epure', 'naturel'],
  'Freelance': ['epure', 'nuit', 'marin'],
  'Événement': ['vif', 'nuit', 'dore'],
  'Fleuriste': ['naturel', 'pastel', 'chaleureux'],
  'Caviste': ['dore', 'nuit', 'naturel'],
  'Food truck': ['vif', 'chaleureux', 'nuit'],
  'Salle de sport': ['nuit', 'vif', 'marin'],
  'Photographe': ['nuit', 'epure', 'dore'],
  'Tatoueur': ['nuit', 'vif', 'epure'],
  'Pharmacie': ['marin', 'epure', 'naturel'],
  'Café': ['chaleureux', 'dore', 'epure'],
  'Boucherie': ['chaleureux', 'naturel', 'vif'],
  'Traiteur': ['chaleureux', 'naturel', 'dore'],
  'Spa': ['pastel', 'naturel', 'epure'],
  'Bijouterie': ['dore', 'nuit', 'epure'],
  'Garage': ['nuit', 'marin', 'epure'],
}

// mise en page : content = corps du visuel, deco = ornement optionnel
const LAYOUTS: Layout[] = [
  { id: 'centre', label: 'Centré', content: 'stack', deco: null },
  { id: 'bandeau', label: 'Bandeau', content: 'band', deco: null },
  { id: 'cadre', label: 'Cadre', content: 'center', deco: 'frame' },
  { id: 'footer', label: 'Footer', content: 'center', deco: 'footer' },
  { id: 'qrgeant', label: 'QR géant', content: 'qrbig', deco: null },
  { id: 'diagonale', label: 'Diagonale', content: 'center', deco: 'diagonal' },
  { id: 'orne', label: 'Orné', content: 'center', deco: 'ornate' },
  { id: 'colonnes', label: 'Deux colonnes', content: 'split', deco: null },
  { id: 'affiche', label: 'Affiche', content: 'poster', deco: null },
]

// objet -> métiers concernés
const MET: Record<string, string[]> = {
  i1: ['Restaurant', 'Café', 'Bar', 'Boulangerie', 'Traiteur', 'Hôtel'],
  i2: ['Restaurant', 'Café', 'Bar', 'Traiteur', 'Hôtel', 'Événement'],
  i3: ['Boutique', 'Café', 'Coiffeur', 'Beauté', 'Spa', 'Bijouterie', 'Boulangerie', 'Restaurant'],
  i4: ['Hôtel', 'Café', 'Bar', 'Restaurant', 'Coiffeur', 'Spa'],
  i5: ['Boutique', 'Artisan', 'Boulangerie', 'Boucherie', 'Coiffeur', 'Garage'],
  i6: ['Freelance', 'Artisan', 'Immobilier', 'Coach', 'Beauté', 'Café', 'Spa', 'Garage', 'Bijouterie'],
  i7: ['Événement', 'Immobilier', 'Boutique', 'Coach', 'Traiteur'],
  i8: ['Événement', 'Boutique', 'Restaurant', 'Immobilier', 'Traiteur'],
  i9: ['Boutique', 'Coach', 'Freelance', 'Hôtel', 'Garage', 'Bijouterie'],
  i10: ['Bar', 'Caviste', 'Restaurant', 'Café', 'Food truck'],
  i11: ['Restaurant', 'Café', 'Hôtel', 'Bar', 'Traiteur', 'Boucherie', 'Food truck'],
  i12: ['Caviste', 'Artisan', 'Fleuriste', 'Boulangerie', 'Boucherie'],
  i13: ['Boulangerie', 'Café', 'Coiffeur', 'Boutique', 'Beauté', 'Spa', 'Boucherie', 'Food truck'],
  i14: ['Événement', 'Salle de sport', 'Immobilier', 'Photographe', 'Traiteur', 'Bijouterie'],
  i15: ['Salle de sport', 'Photographe', 'Tatoueur', 'Spa', 'Événement'],
  i16: ['Pharmacie', 'Boutique', 'Salle de sport', 'Coiffeur', 'Spa', 'Garage', 'Boucherie'],
}

// objet -> objectifs couverts
const OBJ: Record<string, string[]> = {
  i1: ['Menu', 'Commander', 'Avis', 'Réseaux', 'Site web'],
  i2: ['Menu', 'Commander', 'Réservation', 'Avis', 'Localisation'],
  i3: ['Avis', 'Réseaux', 'Site web', 'Horaires'],
  i4: ['Wifi', 'Menu', 'Horaires', 'Localisation'],
  i5: ['Paiement', 'Fidélité', 'Avis'],
  i6: ['Contact', 'Réseaux', 'Site web', 'Réservation'],
  i7: ['Promo', 'Réservation', 'Contact', 'Site web'],
  i8: ['Promo', 'Réseaux', 'Menu', 'Localisation'],
  i9: ['Fidélité', 'Réseaux', 'Site web', 'Contact'],
  i10: ['Menu', 'Commander', 'Promo', 'Réseaux'],
  i11: ['Menu', 'Commander', 'Horaires', 'Avis'],
  i12: ['Contact', 'Promo', 'Réseaux', 'Site web'],
  i13: ['Fidélité', 'Promo', 'Contact'],
  i14: ['Promo', 'Contact', 'Réservation', 'Localisation'],
  i15: ['Promo', 'Réseaux', 'Réservation', 'Site web'],
  i16: ['Horaires', 'Avis', 'Contact', 'Localisation'],
}

// Les 16 objets. hMm = hauteur réelle en mm (sert à l'échelle du rendu),
// ratio = largeur/hauteur, qrMm = taille du QR imprimé, pal = style par défaut,
// bleed/margin/dpi = contraintes fichier d'impression.
const ITEMS: Item[] = [
  { id: 'i1', hMm: 50, place: 'Table', scene: 'table', layout: 'stack', name: 'Sticker de table', support: 'Sticker rond', size: 'Ø 50 mm', bleed: 2, margin: 4, dpi: 300, shape: 'round', ratio: 1, plain: 'Collé sur chaque table : vos clients scannent et la carte s\'ouvre sur leur téléphone.', kicker: 'Café Lune', title: 'Menu du jour', cta: 'Voir le menu', qrMm: 26, pal: 'premiumdark' },
  { id: 'i2', hMm: 70, place: 'Table', scene: 'comptoir', layout: 'band', name: 'Chevalet de table', support: 'Carte de table', size: '100 × 70 mm', bleed: 3, margin: 4, dpi: 300, shape: 'rect', ratio: 100 / 70, plain: 'Debout entre le sel et le poivre : menu, avis ou réservation, sans rien demander.', kicker: 'Commandez ici', title: 'À table', cta: 'Voir le menu', qrMm: 30, pal: 'restofresh' },
  { id: 'i3', hMm: 50, place: 'Vitrine', scene: 'vitrine', layout: 'stack', name: 'Sticker vitrine', support: 'Sticker carré', size: '50 × 50 mm', bleed: 2, margin: 3, dpi: 300, shape: 'rect', ratio: 1, plain: 'Collé côté rue : les passants laissent un avis Google en dix secondes.', kicker: 'Votre avis compte', title: 'Notez-nous', cta: 'Laisser un avis', qrMm: 26, pal: 'inkedit' },
  { id: 'i4', hMm: 148, place: 'Vitrine', scene: 'vitrine', layout: 'band', name: 'Panneau Wifi', support: 'A6 · carte postale', size: '105 × 148 mm', bleed: 3, margin: 4, dpi: 300, shape: 'rect', ratio: 105 / 148, plain: 'Le code Wifi sans le dicter : on scanne, on est connecté.', kicker: 'Wifi gratuit', title: 'Connectez-vous', cta: 'Scannez-moi', qrMm: 48, pal: 'corporate' },
  { id: 'i5', hMm: 85, place: 'Comptoir', scene: 'comptoir', layout: 'stack', name: 'Carte portrait paiement', support: 'Carte portrait', size: '55 × 85 mm', bleed: 2, margin: 3, dpi: 300, shape: 'rect', ratio: 55 / 85, plain: 'Au comptoir : le client scanne, paie, repart. Aucun terminal à tendre.', kicker: 'Sans contact', title: 'Payer ici', cta: 'Profitez-en', qrMm: 28, pal: 'luxgold' },
  { id: 'i6', hMm: 55, place: 'Main', scene: 'main', layout: 'split', name: 'Carte de visite', support: 'Carte de visite', size: '85 × 55 mm', bleed: 2, margin: 3, dpi: 300, shape: 'rect', ratio: 85 / 55, plain: 'Tout votre profil en un scan — menu, horaires, réseaux, itinéraire.', kicker: 'Café Lune', title: 'Bonjour', cta: 'Scannez-moi', qrMm: 24, pal: 'minimal' },
  { id: 'i7', hMm: 210, place: 'Main', scene: 'main', layout: 'band', name: 'Flyer A5', support: 'Flyer A5', size: '148 × 210 mm', bleed: 3, margin: 4, dpi: 300, shape: 'rect', ratio: 148 / 210, plain: 'À distribuer : l\'offre du moment, mise à jour sans réimprimer.', kicker: 'Cette semaine', title: 'Happy hour', cta: 'Profiter de l\'offre', qrMm: 46, pal: 'sunset' },
  { id: 'i8', hMm: 420, place: 'Mur', scene: 'mur', layout: 'poster', name: 'Affiche A3', support: 'A3', size: '297 × 420 mm', bleed: 3, margin: 6, dpi: 200, shape: 'rect', ratio: 297 / 420, plain: 'Visible de loin : événement, ouverture, soirée — un QR lisible à deux mètres.', kicker: 'Samedi 21 h', title: 'Soirée jazz', cta: 'Réservez', qrMm: 68, pal: 'neon' },
  { id: 'i9', hMm: 160, place: 'Comptoir', scene: 'comptoir', layout: 'stack', name: 'Marque-page', support: 'Marque-page', size: '55 × 160 mm', bleed: 2, margin: 4, dpi: 300, shape: 'rect', ratio: 55 / 160, plain: 'Glissé dans le sac ou le livre : votre page reste à portée de scan.', kicker: 'Suivez-nous', title: 'Restons liés', cta: 'En savoir plus', qrMm: 30, pal: 'sage' },
  { id: 'i10', hMm: 95, place: 'Table', scene: 'table', layout: 'centre', name: 'Sous-bock', support: 'Sous-bock rond', size: 'Ø 95 mm', bleed: 3, margin: 5, dpi: 300, shape: 'round', ratio: 1, plain: 'Sous chaque verre : la carte des boissons arrive avant le serveur.', kicker: 'Au comptoir', title: 'Cocktails', cta: 'Voir la carte', qrMm: 42, pal: 'barnoir' },
  { id: 'i11', hMm: 297, place: 'Table', scene: 'comptoir', layout: 'orne', name: 'Porte-menu A4', support: 'A4 · porte-menu', size: '210 × 297 mm', bleed: 3, margin: 8, dpi: 300, shape: 'rect', ratio: 210 / 297, plain: 'Glissé dans le porte-menu : la carte complète, mise à jour sans réimprimer.', kicker: 'Café Lune', title: 'La carte', cta: 'Tout voir', qrMm: 58, pal: 'menuclair' },
  { id: 'i12', hMm: 90, place: 'Comptoir', scene: 'comptoir', layout: 'footer', name: 'Étiquette bouteille', support: 'Étiquette', size: '60 × 90 mm', bleed: 2, margin: 3, dpi: 600, shape: 'rect', ratio: 60 / 90, plain: 'Collée sur le flacon : l\'origine, le producteur et l\'histoire au dos du scan.', kicker: 'Domaine', title: 'Cuvée 2024', cta: 'Notre histoire', qrMm: 24, pal: 'sage' },
  { id: 'i13', hMm: 55, place: 'Main', scene: 'main', layout: 'colonnes', name: 'Carte de fidélité', support: 'Carte paysage', size: '85 × 55 mm', bleed: 2, margin: 3, dpi: 300, shape: 'rect', ratio: 85 / 55, plain: 'Dans le portefeuille : les points se comptent en scannant, plus de tampons.', kicker: 'Fidélité', title: 'Votre carte', cta: 'Vos points', qrMm: 22, pal: 'airbnb' },
  { id: 'i14', hMm: 2000, place: 'Mur', scene: 'mur', layout: 'affiche', name: 'Roll-up', support: 'Roll-up', size: '850 × 2000 mm', bleed: 20, margin: 40, dpi: 150, shape: 'rect', ratio: 850 / 2000, plain: 'Déployé à l\'entrée : visible de loin, scannable de près.', kicker: 'Portes ouvertes', title: 'Bienvenue', cta: 'Le programme', qrMm: 220, pal: 'corporate' },
  { id: 'i15', hMm: 594, place: 'Mur', scene: 'mur', layout: 'diagonale', name: 'Affiche A2', support: 'A2', size: '420 × 594 mm', bleed: 5, margin: 10, dpi: 200, shape: 'rect', ratio: 420 / 594, plain: 'Sur la vitre ou le mur : une offre qui se lit à cinq mètres.', kicker: 'Nouvelle saison', title: 'Rejoignez-nous', cta: 'Premier cours offert', qrMm: 92, pal: 'neon' },
  { id: 'i16', hMm: 210, place: 'Vitrine', scene: 'vitrine', layout: 'cadre', name: 'Panneau horaires', support: 'A5 · panneau', size: '148 × 210 mm', bleed: 3, margin: 5, dpi: 300, shape: 'rect', ratio: 148 / 210, plain: 'Sur la porte : horaires, garde et coordonnées, toujours à jour.', kicker: 'Infos pratiques', title: 'Nos horaires', cta: 'Tout savoir', qrMm: 44, pal: 'contactclair' },
]

// propositions de message par objet (le 1er est la valeur par défaut)
const MESSAGES: Record<string, string[]> = {
  i10: ['Notre carte', 'Cocktails', 'Happy hour', 'Nos vins'],
  i11: ['La carte', 'Menu du jour', 'Nos plats', 'À la carte'],
  i12: ['Notre histoire', 'Cuvée 2024', 'Fait ici', 'En savoir plus'],
  i13: ['Votre carte', 'Fidélité', '10e offert', 'Vos points'],
  i14: ['Bienvenue', 'Portes ouvertes', 'Nouveau', 'Découvrez'],
  i15: ['Rejoignez-nous', 'Premier cours offert', 'Nouvelle saison', 'Inscrivez-vous'],
  i16: ['Nos horaires', 'Infos pratiques', 'Nous trouver', 'Service de garde'],
  i1: ['Menu du jour', 'Notre carte', 'Nos boissons', 'La suite ici'],
  i2: ['À table', 'Menu du jour', 'Commandez ici', 'Nos suggestions'],
  i3: ['Notez-nous', 'Votre avis', 'Merci !', 'Laissez un mot'],
  i4: ['Connectez-vous', 'Wifi gratuit', 'Réseau invité', 'Bienvenue'],
  i5: ['Payer ici', 'Paiement', 'Sans contact', 'Réglez ici'],
  i6: ['Bonjour', 'Café Lune', 'Restons en contact', 'Notre carte'],
  i7: ['Happy hour', 'Offre du moment', '-20 % ce soir', 'Nouveau menu'],
  i8: ['Soirée jazz', 'Concert live', 'Ouverture', 'Événement'],
  i9: ['Restons liés', 'Nos actus', 'Notre page', 'Suivez-nous'],
}

// taille du QR : facteur appliqué à qrMm
const SIZES: Size[] = [
  { id: 'petit', label: 'Discret', factor: .8, note: 'lisible à 30 cm' },
  { id: 'moyen', label: 'Équilibré', factor: 1, note: 'lisible à 50 cm' },
  { id: 'grand', label: 'Bien visible', factor: 1.26, note: 'lisible à 1 m et plus' },
]

export const BRANDNAMES = ['Café Lune', 'Maison Petit', 'Studio Nord', 'Le Comptoir 12']

export const METIERS = ['Tout', 'Restaurant', 'Café', 'Bar', 'Boulangerie', 'Boucherie', 'Traiteur', 'Food truck', 'Caviste', 'Coiffeur', 'Beauté', 'Spa', 'Tatoueur', 'Boutique', 'Bijouterie', 'Fleuriste', 'Pharmacie', 'Hôtel', 'Artisan', 'Garage', 'Coach', 'Salle de sport', 'Immobilier', 'Freelance', 'Photographe', 'Événement']

export const OBJECTIFS = ['Tout', 'Menu', 'Commander', 'Avis', 'Wifi', 'Réseaux', 'Site web', 'Paiement', 'Réservation', 'Promo', 'Contact', 'Fidélité', 'Localisation', 'Horaires']

export { STYLES, TYPOS, AMBIANCES, MET_AMB, LAYOUTS, MET, OBJ, ITEMS, MESSAGES, SIZES }

// --- dérivés utiles ---
export const ITEM_BY_ID: Record<string, Item> = Object.fromEntries(ITEMS.map(i => [i.id, i]))
export const STYLE_BY_ID: Record<string, Style> = Object.fromEntries(STYLES.map(s => [s.id, s]))
export const LAYOUT_BY_ID: Record<string, Layout> = Object.fromEntries(LAYOUTS.map(l => [l.id, l]))

// Filtre croisé métier × objectif, dans l'ordre d'affichage de la bibliothèque.
export function filterItems(metier = 'Tout', objectif = 'Tout'): Item[] {
  return ITEMS.filter(i =>
    (metier === 'Tout' || (MET[i.id] || []).includes(metier)) &&
    (objectif === 'Tout' || (OBJ[i.id] || []).includes(objectif)),
  )
}

// Ambiances triées pour un métier : les 3 recommandées d'abord.
export function ambiancesFor(metier = 'Tout'): Ambiance[] {
  const order = MET_AMB[metier] || MET_AMB['Tout']
  return AMBIANCES.slice().sort((a, b) => {
    const ia = order.indexOf(a.id), ib = order.indexOf(b.id)
    return (ia < 0 ? 9 : ia) - (ib < 0 ? 9 : ib)
  })
}
~~~


## `apps/web/src/app/dashboard/print-studio/mockup.ts`

~~~tsx
// QRowg · Print Studio — rendu packshot studio
// Paramètres de scène et calculs de rendu, sans DOM ni framework.
// Un moteur (React, Vue, canvas, WebGL) consomme ces valeurs telles quelles.
//
// Principe : l'objet est photographié en studio, pas dessiné à plat.
// Chaque scène = un fond, un sol, une lumière, une perspective, une ombre de contact
// (ao) et une ombre portée (cast), plus un reflet optionnel (mirror).

import type { Style } from './catalog'

// ao   : [scaleX, opacité, flou px]         — ombre de contact, sous l'objet
// cast : [scaleX, opacité, flou px, dx, dy] — ombre portée, décalée
// stage: transform 3D appliqué à l'objet    — la pose
// persp/pOrigin : perspective de la scène
// floorH: hauteur du sol en fraction de la scène (0 = scène murale)
// mirror: opacité du reflet (0 = aucun)
export type Scene = {
  caption: string; scenePad: number; floorH: number; studio: boolean; mirror: number;
  bg: string; floor: string; grain: string; grainOpacity: number; horizon: string;
  light: string; hasStreak?: boolean; persp: number; pOrigin: string; stage: string;
  offset: number; ao: [number, number, number]; cast: [number, number, number, number, number];
}

const SCENES: Record<string, Scene> = {
  table: {
    caption: 'Sur une table', scenePad: 18, floorH: .8, studio: true, mirror: .3,
    bg: 'radial-gradient(82% 72% at 50% 6%,#3c4046 0%,#202327 56%,#121417 100%)', floor: 'linear-gradient(180deg,#262a32 0%,#1a1d22 42%,#101215 100%)',
    grain: 'linear-gradient(180deg,rgba(255,255,255,.07) 0%,rgba(255,255,255,.015) 26%,transparent 52%)', grainOpacity: 1, horizon: 'rgba(255,255,255,.14)',
    light: 'radial-gradient(62% 46% at 50% 4%,rgba(255,255,255,.13),transparent 60%)',
    persp: 1000, pOrigin: '50% 34%', stage: 'rotateX(16deg) rotateZ(-2deg)', offset: -.04,
    ao: [1, .14, 5], cast: [1.3, .2, 8, 0, 12],
  },
  vitrine: {
    caption: 'Collé sur la vitrine', scenePad: 22, floorH: 0, studio: true, mirror: 0,
    bg: 'radial-gradient(82% 72% at 50% 6%,#3c4046 0%,#202327 56%,#121417 100%)', floor: 'transparent',
    grain: 'none', grainOpacity: 0, horizon: 'transparent',
    light: 'radial-gradient(60% 48% at 52% 4%,rgba(214,238,255,.13),transparent 62%)',
    hasStreak: true,
    persp: 1300, pOrigin: '44% 42%', stage: 'rotateY(-7deg) rotateX(1deg)', offset: 0,
    ao: [.98, .12, 5], cast: [1.14, .2, 10, -4, 9],
  },
  comptoir: {
    caption: 'Posé au comptoir', scenePad: 18, floorH: .46, studio: true, mirror: .26,
    bg: 'radial-gradient(82% 72% at 50% 6%,#3c4046 0%,#202327 56%,#121417 100%)', floor: 'linear-gradient(180deg,#262a32 0%,#1a1d22 42%,#101215 100%)',
    grain: 'linear-gradient(180deg,rgba(255,255,255,.07) 0%,rgba(255,255,255,.015) 26%,transparent 52%)', grainOpacity: 1, horizon: 'rgba(255,255,255,.14)',
    light: 'radial-gradient(64% 44% at 48% 2%,rgba(255,255,255,.12),transparent 60%)',
    persp: 1000, pOrigin: '50% 44%', stage: 'rotateX(6deg) rotateY(-9deg)', offset: -.03,
    ao: [1, .13, 5], cast: [1.34, .2, 9, 8, 11],
  },
  main: {
    caption: 'Donné en main', scenePad: 22, floorH: .38, studio: true, mirror: .18,
    bg: 'radial-gradient(82% 72% at 50% 6%,#3c4046 0%,#202327 56%,#121417 100%)', floor: 'linear-gradient(180deg,#262a32 0%,#1a1d22 42%,#101215 100%)',
    grain: 'linear-gradient(180deg,rgba(255,255,255,.07) 0%,rgba(255,255,255,.015) 26%,transparent 52%)', grainOpacity: 1, horizon: 'rgba(255,255,255,.1)',
    light: 'radial-gradient(58% 46% at 34% 4%,rgba(255,255,255,.12),transparent 60%)',
    persp: 900, pOrigin: '50% 50%', stage: 'rotateZ(-6deg) rotateY(12deg) rotateX(5deg)', offset: -.02,
    ao: [.92, .14, 6], cast: [1.26, .22, 12, 8, 14],
  },
  mur: {
    caption: 'Affiché au mur', scenePad: 20, floorH: 0, studio: true, mirror: 0,
    bg: 'radial-gradient(82% 72% at 50% 6%,#3c4046 0%,#202327 56%,#121417 100%)', floor: 'transparent',
    grain: 'none', grainOpacity: 0, horizon: 'transparent',
    light: 'radial-gradient(60% 46% at 50% 0%,rgba(255,255,255,.14),transparent 62%),radial-gradient(130% 100% at 50% 128%,rgba(0,0,0,.42),transparent 60%)',
    persp: 1400, pOrigin: '50% 44%', stage: 'rotateY(-5deg) rotateX(1deg)', offset: 0,
    ao: [.96, .12, 5], cast: [1.2, .24, 16, -8, 16],
  },
}

// Teinte et sol propres au métier : remplacent le sol neutre quand un métier est choisi.
// tint = lumière colorée du lieu, posée en surimpression légère.
export type Trade = { lieu: string; floor: string; tint: string }
const TRADES: Record<string, Trade> = {
  Restaurant: { lieu: 'du restaurant', floor: 'linear-gradient(180deg,#7a5b41 0%,#553d2a 38%,#2e2117 100%)', tint: 'rgba(255,238,205,.20)' },
  Bar: { lieu: 'du bar', floor: 'linear-gradient(180deg,#2b2f36 0%,#1c2026 42%,#101317 100%)', tint: 'rgba(255,190,120,.22)' },
  Boulangerie: { lieu: 'de la boulangerie', floor: 'linear-gradient(180deg,#c9b393 0%,#a08a68 40%,#6b5a41 100%)', tint: 'rgba(255,236,200,.24)' },
  Coiffeur: { lieu: 'du salon', floor: 'linear-gradient(180deg,#26282c 0%,#15171a 44%,#0b0c0e 100%)', tint: 'rgba(210,235,255,.16)' },
  'Beauté': { lieu: "de l'institut", floor: 'linear-gradient(180deg,#e6d9d6 0%,#c3aeaa 42%,#7d6c69 100%)', tint: 'rgba(255,225,230,.20)' },
  Boutique: { lieu: 'de la boutique', floor: 'linear-gradient(180deg,#b99a72 0%,#8d7050 42%,#4f3d29 100%)', tint: 'rgba(255,242,220,.18)' },
  'Hôtel': { lieu: "de l'hôtel", floor: 'linear-gradient(180deg,#3b3a38 0%,#232220 46%,#121110 100%)', tint: 'rgba(255,228,180,.20)' },
  Artisan: { lieu: "de l'atelier", floor: 'linear-gradient(180deg,#6f6a62 0%,#4a453f 44%,#252220 100%)', tint: 'rgba(255,240,215,.14)' },
  Coach: { lieu: 'de la salle', floor: 'linear-gradient(180deg,#2f3a3a 0%,#1e2626 44%,#0f1414 100%)', tint: 'rgba(190,255,235,.14)' },
  Immobilier: { lieu: "de l'agence", floor: 'linear-gradient(180deg,#54595f 0%,#363a3f 44%,#1a1d20 100%)', tint: 'rgba(215,232,255,.16)' },
  Freelance: { lieu: 'du bureau', floor: 'linear-gradient(180deg,#8f8272 0%,#635a4d 44%,#332e28 100%)', tint: 'rgba(255,240,220,.16)' },
  'Événement': { lieu: 'du stand', floor: 'linear-gradient(180deg,#4a3f52 0%,#2e2836 46%,#16131b 100%)', tint: 'rgba(235,205,255,.18)' },
}

export { SCENES, TRADES }

// --- utilitaires couleur ---
export const rgb = (hex: string): number[] => {
  const h = hex.replace('#', '')
  const n = parseInt(h.length === 3 ? h.split('').map(c => c + c).join('') : h, 16)
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255]
}
export const rgba = (hex: string, a: number): string => { const c = rgb(hex); return `rgba(${c[0]},${c[1]},${c[2]},${a})` }
export const shade = (hex: string, amt: number): string => {
  const c = rgb(hex).map(v => Math.max(0, Math.min(255, Math.round(v + 255 * amt))))
  return `rgb(${c[0]},${c[1]},${c[2]})`
}
export const darken = (hex: string, amt: number): string => {
  const c = rgb(hex).map(v => Math.round(v * (1 - amt)))
  return `rgb(${c[0]},${c[1]},${c[2]})`
}
const lum = (hex: string): number => rgb(hex).map(v => v / 255)
  .map(v => v <= .03928 ? v / 12.92 : Math.pow((v + .055) / 1.055, 2.4))
  .reduce((a, v, i) => a + [.2126, .7152, .0722][i] * v, 0)
export const wcag = (a: string, b: string): number => { const l1 = lum(a), l2 = lum(b); return (Math.max(l1, l2) + .05) / (Math.min(l1, l2) + .05) }
// encre lisible sur un fond donné (noir ou blanc, celui qui contraste le plus)
export const on = (hex: string): string => wcag('#0A0A0A', hex) >= wcag('#FFFFFF', hex) ? '#0A0A0A' : '#FFFFFF'
// dégradé subtil : un fond plat n'a jamais l'air photographié
export const grad = (hex: string): string => `linear-gradient(165deg,${shade(hex, .06)},${shade(hex, -.05)})`

// Palette prête à peindre, dérivée d'un STYLE du catalogue.
export function paletteFromStyle(s: Style) {
  return {
    id: s.id, label: s.label,
    flat: s.bg, bg: grad(s.bg), fg: s.ink, muted: rgba(s.ink, .55),
    ctaBg: s.accent, ctaFg: on(s.accent), ink: s.qr, qrBg: s.qrBg,
    band: s.accent, bandFg: on(s.accent), rule: rgba(s.ink, .3),
    titleFont: `"${s.title}",Georgia,serif`,
    bodyFont: `"${s.body}",Helvetica,Arial,sans-serif`,
    titleWeight: s.title === 'Bebas Neue' ? 400 : 600,
    titleLs: s.title === 'Bebas Neue' ? '.02em' : '-.015em',
  }
}

// Échelle : convertit les mm réels de l'objet en px d'écran pour une scène donnée.
// REF_MM = hauteur de référence ; un roll-up de 2 m et une carte de visite
// restent tous deux cadrés, avec un rapport de taille crédible.
export const REF_MM = 210
export function scaleFor(hMm: number, boxPx: number, scene?: Scene): number {
  const pad = (scene && scene.scenePad) || 18
  const usable = boxPx - pad * 2
  const rel = Math.pow(hMm / REF_MM, 0.42) // compression douce : le roll-up ne sort pas du cadre
  return Math.max(48, Math.min(usable, usable * Math.min(1, rel)))
}

// Toutes les couches d'une scène, dans l'ordre de peinture (fond → objet → ombres → reflet).
export function sceneLayers(sceneId: string, trade?: string | null) {
  const s = SCENES[sceneId]
  const t = trade ? TRADES[trade] : null
  return {
    background: s.bg,
    floor: t && s.floorH ? t.floor : s.floor,
    floorHeight: s.floorH,
    grain: s.grain, grainOpacity: s.grainOpacity,
    horizon: s.horizon,
    light: t ? `radial-gradient(70% 50% at 50% 0%,${t.tint},transparent 64%),${s.light}` : s.light,
    streak: !!s.hasStreak,       // reflet de vitre en diagonale
    perspective: s.persp, perspectiveOrigin: s.pOrigin,
    transform: s.stage, verticalOffset: s.offset,
    contactShadow: { scaleX: s.ao[0], opacity: s.ao[1], blur: s.ao[2] },
    castShadow: { scaleX: s.cast[0], opacity: s.cast[1], blur: s.cast[2], dx: s.cast[3], dy: s.cast[4] },
    mirror: s.mirror,
    caption: s.caption,
  }
}
~~~


## `apps/web/src/app/dashboard/print-studio/templates.ts`

~~~tsx
// QRowg · Print Studio — Moteur de TEMPLATES (data-driven, §7-9 de la spec produit).
// Un template n'est PAS un design figé : c'est une COMPOSITION PARAMÉTRIQUE (look + contenu + taxonomie
// + composition optionnelle) que le studio applique au support courant. Ajouter un modèle = éditer ce fichier,
// zéro écran à coder. Réutilise les vocabulaires du catalogue (styles, layouts, items, objectifs).

import { STYLE_BY_ID, LAYOUT_BY_ID, ITEM_BY_ID, OBJ, type Item } from "./catalog"

// Contenu suggéré (points de départ éditables) — pas figé.
export type TemplateContent = { brand?: string; title?: string; subtitle?: string; cta?: string }

// « Look » = mêmes leviers que les presets (ambiance/mise en page/accent/fond/cadre/typo…).
export type TemplateLook = {
  style: string; layout: string; accent: string; bgFinish: string; frame: string
  titleCase: string; titleWeight: string; qrBadge: string; eCorner: string; eAccent: string
  eAlign: "left" | "center" | "right"; eTypo?: string
}

// Variante = déclinaison de palette SANS dupliquer la structure (§7 « 3-6 variantes »).
export type TemplateVariant = { id: string; label: string; hex: string; style?: string; accent?: string }

export type PrintTemplate = {
  id: string; name: string
  business: string[]; objective: string[]; style: string[]; orientation: "portrait" | "paysage" | "carré"
  supports: string[]        // ids d'items recommandés (pour filtrer/recommander/décliner)
  look: TemplateLook
  content: TemplateContent
  variants?: TemplateVariant[]
  comp?: string             // id d'une composition prête à poser (optionnel) — appliqué côté client
}

// Registre : 10 modèles premium réellement différents (V1). Chaque `look` référence des styles/layouts VALIDES ;
// la mise en page est recoercée au support à l'application (fitLayout). Les variantes ne changent que la palette.
export const TEMPLATES: PrintTemplate[] = [
  {
    id: "menu-luxe", name: "Menu · Luxe", business: ["Restaurant", "Bar", "Café", "Hôtel"], objective: ["Menu", "Commander"], style: ["premium", "luxe", "dark"], orientation: "portrait",
    supports: ["i11", "i2", "i1"],
    look: { style: "luxgold", layout: "centre", accent: "or", bgFinish: "degrade", frame: "coins", titleCase: "upper", titleWeight: "normal", qrBadge: "cercle", eCorner: "adouci", eAccent: "plein", eAlign: "center", eTypo: "serifchic" },
    content: { title: "La carte", subtitle: "Scannez pour découvrir", cta: "Voir le menu" },
    variants: [{ id: "or", label: "Or", hex: "#C9A84C" }, { id: "ivoire", label: "Ivoire", hex: "#FBF3E7", style: "menuclair", accent: "auto" }, { id: "nuit", label: "Nuit", hex: "#101010", style: "premiumdark" }, { id: "bordeaux", label: "Bordeaux", hex: "#7A1F2B", style: "restofresh", accent: "rouge" }],
  },
  {
    id: "avis-google", name: "Avis · Étoiles", business: ["Restaurant", "Café", "Boutique", "Coiffeur", "Beauté"], objective: ["Avis"], style: ["minimal", "clair"], orientation: "portrait",
    supports: ["i3", "i5", "i2"],
    look: { style: "minimal", layout: "centre", accent: "auto", bgFinish: "uni", frame: "filet", titleCase: "normal", titleWeight: "normal", qrBadge: "carre", eCorner: "rond", eAccent: "plein", eAlign: "center", eTypo: "moderne" },
    content: { title: "Votre avis compte", subtitle: "En 10 secondes", cta: "Laisser un avis" },
    comp: "avis",
    variants: [{ id: "clair", label: "Clair", hex: "#FFFFFF" }, { id: "cadre", label: "Chaleureux", hex: "#FBF6EC", style: "aviscadre", accent: "or" }, { id: "nuit", label: "Nuit", hex: "#0E0E10", style: "modernblack" }],
  },
  {
    id: "wifi-invite", name: "Wi-Fi · Invité", business: ["Hôtel", "Café", "Restaurant", "Bar"], objective: ["Wifi"], style: ["clair", "nature"], orientation: "portrait",
    supports: ["i4", "i16", "i2"],
    look: { style: "wifivert", layout: "centre", accent: "vert", bgFinish: "uni", frame: "filet", titleCase: "normal", titleWeight: "gras", qrBadge: "carre", eCorner: "adouci", eAccent: "plein", eAlign: "center", eTypo: "moderne" },
    content: { title: "Wi-Fi gratuit", subtitle: "Connectez-vous en un scan", cta: "Se connecter" },
    comp: "wifi",
    variants: [{ id: "vert", label: "Vert", hex: "#2E8B7B" }, { id: "marine", label: "Marine", hex: "#1D4ED8", style: "corporate", accent: "bleu" }, { id: "nuit", label: "Nuit", hex: "#101010", style: "premiumdark" }],
  },
  {
    id: "reservation", name: "Réserver", business: ["Restaurant", "Coiffeur", "Spa", "Beauté"], objective: ["Réservation"], style: ["nature", "premium"], orientation: "portrait",
    supports: ["i5", "i6", "i2"],
    look: { style: "resa", layout: "centre", accent: "vert", bgFinish: "degrade", frame: "aucun", titleCase: "normal", titleWeight: "normal", qrBadge: "cercle", eCorner: "rond", eAccent: "plein", eAlign: "center", eTypo: "serifchic" },
    content: { title: "Réservez", subtitle: "Sur place ou en ligne", cta: "Réserver une table" },
    comp: "reserver",
    variants: [{ id: "emeraude", label: "Émeraude", hex: "#34D399" }, { id: "clair", label: "Clair", hex: "#F2F7F4", style: "resaclair", accent: "vert" }, { id: "or", label: "Or", hex: "#C9A84C", style: "luxgold", accent: "or" }],
  },
  {
    id: "insta-follow", name: "Réseaux · Suivez", business: ["Boutique", "Café", "Beauté", "Freelance"], objective: ["Réseaux"], style: ["pop", "vif"], orientation: "portrait",
    supports: ["i3", "i9", "i6"],
    look: { style: "insta", layout: "centre", accent: "rose", bgFinish: "grain", frame: "aucun", titleCase: "upper", titleWeight: "gras", qrBadge: "carre", eCorner: "vif", eAccent: "plein", eAlign: "center", eTypo: "affiche" },
    content: { brand: "@votrecompte", title: "Suivez-nous", subtitle: "Nos actus en avant-première", cta: "S'abonner" },
    comp: "suivre",
    variants: [{ id: "rose", label: "Rose", hex: "#E1306C" }, { id: "clair", label: "Clair", hex: "#FFF5F8", style: "instaclair", accent: "rose" }, { id: "violet", label: "Violet", hex: "#9B5CF6", style: "creator", accent: "violet" }],
  },
  {
    id: "fidelite", name: "Fidélité", business: ["Café", "Boulangerie", "Boutique", "Coiffeur"], objective: ["Fidélité"], style: ["chaleureux", "clair"], orientation: "paysage",
    supports: ["i13", "i5"],
    look: { style: "airbnb", layout: "colonnes", accent: "corail", bgFinish: "uni", frame: "filet", titleCase: "normal", titleWeight: "normal", qrBadge: "carre", eCorner: "adouci", eAccent: "plein", eAlign: "left", eTypo: "moderne" },
    content: { title: "Carte de fidélité", subtitle: "Cumulez, profitez", cta: "Vos points" },
    comp: "fidelite",
    variants: [{ id: "sable", label: "Sable", hex: "#C56B3E" }, { id: "nuit", label: "Nuit", hex: "#15181C", style: "portfolio", accent: "or" }, { id: "vert", label: "Sauge", hex: "#6B8E5A", style: "sage", accent: "vert" }],
  },
  {
    id: "affiche-event", name: "Événement · Affiche", business: ["Événement", "Bar", "Salle de sport"], objective: ["Promo", "Réservation"], style: ["bold", "neon"], orientation: "portrait",
    supports: ["i8", "i7", "i15"],
    look: { style: "neon", layout: "affiche", accent: "violet", bgFinish: "degrade", frame: "aucun", titleCase: "upper", titleWeight: "gras", qrBadge: "carre", eCorner: "vif", eAccent: "plein", eAlign: "left", eTypo: "affiche" },
    content: { title: "Soirée live", subtitle: "Samedi · 21 h", cta: "Réservez" },
    variants: [{ id: "neon", label: "Néon", hex: "#FF3D9A" }, { id: "ticket", label: "Ticket", hex: "#A855F7", style: "ticket", accent: "violet" }, { id: "sunset", label: "Sunset", hex: "#FF7A4D", style: "sunset", accent: "corail" }],
  },
  {
    id: "promo-commerce", name: "Promo · Commerce", business: ["Boutique", "Food truck", "Boulangerie"], objective: ["Promo"], style: ["bold", "pop"], orientation: "portrait",
    supports: ["i7", "i8", "i3"],
    look: { style: "offre", layout: "bandeau", accent: "corail", bgFinish: "uni", frame: "aucun", titleCase: "upper", titleWeight: "gras", qrBadge: "carre", eCorner: "vif", eAccent: "plein", eAlign: "center", eTypo: "affiche" },
    content: { title: "-20 %", subtitle: "Cette semaine seulement", cta: "En profiter" },
    variants: [{ id: "orange", label: "Orange", hex: "#E8602C" }, { id: "rouge", label: "Soldes", hex: "#FF4D4D", style: "soldes", accent: "rouge" }, { id: "nuit", label: "Nuit", hex: "#0E1116", style: "modernblack" }],
  },
  {
    id: "menu-epure", name: "Menu · Épuré", business: ["Café", "Restaurant", "Bar"], objective: ["Menu", "Commander"], style: ["minimal", "editorial"], orientation: "carré",
    supports: ["i2", "i1", "i10"],
    look: { style: "minimal", layout: "centre", accent: "auto", bgFinish: "uni", frame: "aucun", titleCase: "normal", titleWeight: "fin", qrBadge: "carre", eCorner: "adouci", eAccent: "trait", eAlign: "center", eTypo: "editorial" },
    content: { title: "Notre carte", subtitle: "", cta: "Découvrir" },
    variants: [{ id: "blanc", label: "Blanc", hex: "#FFFFFF" }, { id: "sauge", label: "Sauge", hex: "#6B8E5A", style: "sage", accent: "vert" }, { id: "edito", label: "Édito", hex: "#1A1A1A", style: "inkedit" }],
  },
  {
    id: "contact-pro", name: "Contact · Pro", business: ["Freelance", "Artisan", "Immobilier", "Coach"], objective: ["Contact", "Site web"], style: ["corporate", "clair"], orientation: "paysage",
    supports: ["i6", "i9", "i5"],
    look: { style: "contact", layout: "colonnes", accent: "bleu", bgFinish: "uni", frame: "filet", titleCase: "normal", titleWeight: "normal", qrBadge: "carre", eCorner: "adouci", eAccent: "plein", eAlign: "left", eTypo: "moderne" },
    content: { brand: "Votre nom", title: "Restons en contact", subtitle: "Tout mon profil en un scan", cta: "Voir mon profil" },
    variants: [{ id: "nuit", label: "Bleu nuit", hex: "#0F1729" }, { id: "clair", label: "Clair", hex: "#F7F9FC", style: "contactclair", accent: "bleu" }, { id: "or", label: "Or", hex: "#D9A441", style: "portfolio", accent: "or" }],
  },
  // ── Lot 2 (2026-08-15) : +22 modèles curatés (familles §7). Structurellement validés (templates.test.ts). ──
  { id: "cocktails-bar", name: "Cocktails · Bar", business: ["Bar", "Restaurant", "Café"], objective: ["Menu", "Commander"], style: ["dark", "luxe"], orientation: "carré", supports: ["i10", "i2", "i8"], look: { style: "barnoir", layout: "qrgeant", accent: "or", bgFinish: "degrade", frame: "aucun", titleCase: "upper", titleWeight: "normal", qrBadge: "cercle", eCorner: "adouci", eAccent: "plein", eAlign: "center", eTypo: "serifchic" }, content: { title: "Cocktails", subtitle: "La carte des boissons", cta: "Voir la carte" }, comp: "scannez", variants: [{ id: "or", label: "Or", hex: "#C9A84C" }, { id: "nuit", label: "Nuit", hex: "#101010", style: "premiumdark" }, { id: "neon", label: "Néon", hex: "#FF3D9A", style: "neon", accent: "rose" }] },
  { id: "menu-jour", name: "Menu du jour", business: ["Café", "Restaurant", "Boulangerie"], objective: ["Menu", "Commander"], style: ["chaleureux", "clair"], orientation: "portrait", supports: ["i11", "i2"], look: { style: "menuclair", layout: "orne", accent: "or", bgFinish: "uni", frame: "coins", titleCase: "normal", titleWeight: "normal", qrBadge: "carre", eCorner: "adouci", eAccent: "plein", eAlign: "center", eTypo: "serifchic" }, content: { title: "Menu du jour", subtitle: "Fait maison", cta: "Découvrir" }, variants: [{ id: "creme", label: "Crème", hex: "#FBF3E7" }, { id: "sauge", label: "Sauge", hex: "#6B8E5A", style: "sage", accent: "vert" }, { id: "nuit", label: "Nuit", hex: "#101010", style: "premiumdark" }] },
  { id: "happy-hour", name: "Happy hour", business: ["Bar", "Restaurant", "Food truck"], objective: ["Promo", "Menu"], style: ["bold", "vif"], orientation: "portrait", supports: ["i7", "i2", "i8"], look: { style: "sunset", layout: "bandeau", accent: "corail", bgFinish: "degrade", frame: "aucun", titleCase: "upper", titleWeight: "gras", qrBadge: "carre", eCorner: "vif", eAccent: "plein", eAlign: "center", eTypo: "affiche" }, content: { title: "Happy hour", subtitle: "17 h – 19 h", cta: "En profiter" }, variants: [{ id: "sunset", label: "Sunset", hex: "#FF7A4D" }, { id: "neon", label: "Néon", hex: "#FF3D9A", style: "neon", accent: "rose" }, { id: "orange", label: "Orange", hex: "#E8602C", style: "offre", accent: "corail" }] },
  { id: "commander-table", name: "Commander à table", business: ["Restaurant", "Café", "Bar"], objective: ["Commander", "Menu"], style: ["chaleureux"], orientation: "carré", supports: ["i1", "i2"], look: { style: "restofresh", layout: "centre", accent: "rouge", bgFinish: "uni", frame: "filet", titleCase: "normal", titleWeight: "normal", qrBadge: "cercle", eCorner: "rond", eAccent: "plein", eAlign: "center", eTypo: "moderne" }, content: { title: "Commandez ici", subtitle: "Scannez, commandez", cta: "Voir le menu" }, comp: "scannez", variants: [{ id: "rouge", label: "Rouge", hex: "#C0392B" }, { id: "creme", label: "Crème", hex: "#FBF3E7", style: "menuclair", accent: "or" }, { id: "nuit", label: "Nuit", hex: "#101010", style: "premiumdark" }] },
  { id: "avis-luxe", name: "Avis · Premium", business: ["Restaurant", "Hôtel", "Bijouterie"], objective: ["Avis"], style: ["premium", "luxe"], orientation: "portrait", supports: ["i3", "i5"], look: { style: "luxgold", layout: "cadre", accent: "or", bgFinish: "degrade", frame: "coins", titleCase: "upper", titleWeight: "normal", qrBadge: "cercle", eCorner: "adouci", eAccent: "trait", eAlign: "center", eTypo: "serifchic" }, content: { title: "Votre avis", subtitle: "Merci de votre visite", cta: "Nous noter" }, comp: "avis", variants: [{ id: "or", label: "Or", hex: "#C9A84C" }, { id: "nuit", label: "Nuit", hex: "#0E0E10", style: "modernblack" }, { id: "creme", label: "Crème", hex: "#FBF6EC", style: "aviscadre" }] },
  { id: "avis-merci", name: "Avis · Merci", business: ["Café", "Coiffeur", "Boutique", "Beauté"], objective: ["Avis"], style: ["chaleureux"], orientation: "portrait", supports: ["i3", "i2"], look: { style: "aviscadre", layout: "orne", accent: "or", bgFinish: "uni", frame: "coins", titleCase: "normal", titleWeight: "normal", qrBadge: "carre", eCorner: "adouci", eAccent: "plein", eAlign: "center", eTypo: "serifchic" }, content: { title: "Merci !", subtitle: "Un avis en 10 secondes", cta: "Laisser un avis" }, comp: "avis", variants: [{ id: "creme", label: "Crème", hex: "#FBF6EC" }, { id: "or", label: "Or", hex: "#C9A84C", style: "luxgold" }, { id: "sauge", label: "Sauge", hex: "#6B8E5A", style: "sage", accent: "vert" }] },
  { id: "insta-clair", name: "Insta · Clair", business: ["Boutique", "Beauté", "Café"], objective: ["Réseaux"], style: ["pop", "clair"], orientation: "portrait", supports: ["i3", "i9"], look: { style: "instaclair", layout: "centre", accent: "rose", bgFinish: "uni", frame: "aucun", titleCase: "normal", titleWeight: "gras", qrBadge: "carre", eCorner: "rond", eAccent: "plein", eAlign: "center", eTypo: "moderne" }, content: { brand: "@votrecompte", title: "Suivez-nous", subtitle: "Nos nouveautés", cta: "S'abonner" }, comp: "suivre", variants: [{ id: "clair", label: "Clair", hex: "#FFF5F8" }, { id: "rose", label: "Rose", hex: "#E1306C", style: "insta" }, { id: "violet", label: "Violet", hex: "#9B5CF6", style: "creator", accent: "violet" }] },
  { id: "linkinbio", name: "Link in bio", business: ["Freelance", "Photographe", "Artisan"], objective: ["Réseaux", "Site web"], style: ["vif", "dark"], orientation: "carré", supports: ["i6", "i9"], look: { style: "creator", layout: "qrgeant", accent: "violet", bgFinish: "grain", frame: "aucun", titleCase: "upper", titleWeight: "gras", qrBadge: "carre", eCorner: "vif", eAccent: "plein", eAlign: "center", eTypo: "affiche" }, content: { title: "Tous mes liens", subtitle: "En un scan", cta: "Découvrir" }, variants: [{ id: "violet", label: "Violet", hex: "#9B5CF6" }, { id: "rose", label: "Rose", hex: "#E1306C", style: "insta", accent: "rose" }, { id: "nuit", label: "Nuit", hex: "#101010", style: "premiumdark", accent: "or" }] },
  { id: "carte-visite-pro", name: "Carte de visite", business: ["Freelance", "Artisan", "Coach"], objective: ["Contact", "Site web"], style: ["moderne", "dark"], orientation: "paysage", supports: ["i6"], look: { style: "modernblack", layout: "colonnes", accent: "auto", bgFinish: "uni", frame: "filet", titleCase: "normal", titleWeight: "normal", qrBadge: "carre", eCorner: "adouci", eAccent: "plein", eAlign: "left", eTypo: "moderne" }, content: { brand: "Votre nom", title: "Votre métier", subtitle: "Tout mon profil en un scan", cta: "Mon profil" }, variants: [{ id: "nuit", label: "Nuit", hex: "#0E0E10" }, { id: "clair", label: "Clair", hex: "#F7F9FC", style: "contactclair", accent: "bleu" }, { id: "or", label: "Or", hex: "#D9A441", style: "portfolio", accent: "or" }] },
  { id: "portfolio-creatif", name: "Portfolio", business: ["Photographe", "Artisan", "Freelance"], objective: ["Site web", "Contact"], style: ["editorial", "premium"], orientation: "portrait", supports: ["i8", "i15", "i7"], look: { style: "portfolio", layout: "affiche", accent: "or", bgFinish: "degrade", frame: "aucun", titleCase: "upper", titleWeight: "gras", qrBadge: "carre", eCorner: "vif", eAccent: "trait", eAlign: "left", eTypo: "affiche" }, content: { title: "Portfolio", subtitle: "Voir mes projets", cta: "Découvrir" }, variants: [{ id: "or", label: "Or", hex: "#D9A441" }, { id: "nuit", label: "Nuit", hex: "#0E0E10", style: "modernblack" }, { id: "edito", label: "Édito", hex: "#1A1A1A", style: "inkedit" }] },
  { id: "contact-clair", name: "Contact · Clair", business: ["Immobilier", "Coach", "Freelance"], objective: ["Contact"], style: ["clair", "corporate"], orientation: "paysage", supports: ["i6", "i5"], look: { style: "contactclair", layout: "colonnes", accent: "bleu", bgFinish: "uni", frame: "filet", titleCase: "normal", titleWeight: "normal", qrBadge: "carre", eCorner: "adouci", eAccent: "plein", eAlign: "left", eTypo: "moderne" }, content: { brand: "Votre nom", title: "Restons en contact", subtitle: "Écrivez-moi en un scan", cta: "M'écrire" }, variants: [{ id: "clair", label: "Clair", hex: "#F7F9FC" }, { id: "nuit", label: "Nuit", hex: "#0F1729", style: "contact" }, { id: "or", label: "Or", hex: "#D9A441", style: "portfolio", accent: "or" }] },
  { id: "soldes", name: "Soldes", business: ["Boutique", "Commerce", "Food truck"], objective: ["Promo"], style: ["bold", "pop"], orientation: "portrait", supports: ["i8", "i7", "i3"], look: { style: "soldes", layout: "affiche", accent: "rouge", bgFinish: "uni", frame: "aucun", titleCase: "upper", titleWeight: "gras", qrBadge: "carre", eCorner: "vif", eAccent: "plein", eAlign: "left", eTypo: "affiche" }, content: { title: "Soldes", subtitle: "Jusqu'à -50 %", cta: "En profiter" }, variants: [{ id: "rouge", label: "Rouge", hex: "#FF4D4D" }, { id: "orange", label: "Orange", hex: "#E8602C", style: "offre", accent: "corail" }, { id: "nuit", label: "Nuit", hex: "#0E1116", style: "modernblack" }] },
  { id: "coupon", name: "Coupon · Remise", business: ["Boutique", "Commerce", "Coiffeur"], objective: ["Promo", "Fidélité"], style: ["pop", "clair"], orientation: "portrait", supports: ["i5", "i13"], look: { style: "offre", layout: "cadre", accent: "corail", bgFinish: "uni", frame: "double", titleCase: "upper", titleWeight: "gras", qrBadge: "carre", eCorner: "vif", eAccent: "plein", eAlign: "center", eTypo: "affiche" }, content: { title: "-10 %", subtitle: "Sur présentation de ce QR", cta: "Scanner" }, comp: "scannez", variants: [{ id: "orange", label: "Orange", hex: "#E8602C" }, { id: "rouge", label: "Rouge", hex: "#FF4D4D", style: "soldes", accent: "rouge" }, { id: "vert", label: "Vert", hex: "#3E9E6E", style: "sage", accent: "vert" }] },
  { id: "catalogue", name: "Catalogue", business: ["Boutique", "Commerce", "Artisan"], objective: ["Site web", "Menu"], style: ["minimal", "editorial"], orientation: "portrait", supports: ["i2", "i7"], look: { style: "minimal", layout: "centre", accent: "auto", bgFinish: "uni", frame: "aucun", titleCase: "normal", titleWeight: "fin", qrBadge: "carre", eCorner: "adouci", eAccent: "trait", eAlign: "center", eTypo: "editorial" }, content: { title: "Notre catalogue", subtitle: "Toute la collection", cta: "Feuilleter" }, variants: [{ id: "blanc", label: "Blanc", hex: "#FFFFFF" }, { id: "edito", label: "Édito", hex: "#1A1A1A", style: "inkedit" }, { id: "nuit", label: "Nuit", hex: "#0E0E10", style: "modernblack" }] },
  { id: "concert", name: "Concert · Live", business: ["Événement", "Bar"], objective: ["Promo", "Réservation"], style: ["neon", "bold"], orientation: "portrait", supports: ["i8", "i15"], look: { style: "ticket", layout: "affiche", accent: "violet", bgFinish: "degrade", frame: "aucun", titleCase: "upper", titleWeight: "gras", qrBadge: "carre", eCorner: "vif", eAccent: "plein", eAlign: "left", eTypo: "affiche" }, content: { title: "Concert live", subtitle: "Ce soir · 21 h", cta: "Billetterie" }, variants: [{ id: "violet", label: "Violet", hex: "#A855F7" }, { id: "neon", label: "Néon", hex: "#FF3D9A", style: "neon", accent: "rose" }, { id: "sunset", label: "Sunset", hex: "#FF7A4D", style: "sunset", accent: "corail" }] },
  { id: "mariage", name: "Mariage · Élégant", business: ["Événement"], objective: ["Réservation", "Site web"], style: ["premium", "luxe"], orientation: "portrait", supports: ["i5", "i16", "i7"], look: { style: "luxgold", layout: "orne", accent: "or", bgFinish: "degrade", frame: "coins", titleCase: "normal", titleWeight: "fin", qrBadge: "cercle", eCorner: "rond", eAccent: "trait", eAlign: "center", eTypo: "serifchic" }, content: { title: "Nous nous marions", subtitle: "Save the date", cta: "RSVP" }, variants: [{ id: "or", label: "Or", hex: "#C9A84C" }, { id: "ivoire", label: "Ivoire", hex: "#FBF3E7", style: "menuclair", accent: "auto" }, { id: "sauge", label: "Sauge", hex: "#6B8E5A", style: "sage", accent: "vert" }] },
  { id: "portes-ouvertes", name: "Portes ouvertes", business: ["Immobilier", "Salle de sport", "Événement"], objective: ["Promo", "Réservation"], style: ["corporate", "clair"], orientation: "portrait", supports: ["i14", "i8"], look: { style: "corporate", layout: "affiche", accent: "bleu", bgFinish: "uni", frame: "aucun", titleCase: "upper", titleWeight: "gras", qrBadge: "carre", eCorner: "adouci", eAccent: "plein", eAlign: "left", eTypo: "affiche" }, content: { title: "Portes ouvertes", subtitle: "Samedi · 10 h – 18 h", cta: "Le programme" }, variants: [{ id: "bleu", label: "Bleu", hex: "#1D4ED8" }, { id: "nuit", label: "Nuit", hex: "#0F1729", style: "contact" }, { id: "vert", label: "Vert", hex: "#2E8B7B", style: "wifivert", accent: "vert" }] },
  { id: "hotel-welcome", name: "Hôtel · Bienvenue", business: ["Hôtel", "Bar", "Restaurant"], objective: ["Wifi", "Horaires"], style: ["premium", "dark"], orientation: "portrait", supports: ["i4", "i16"], look: { style: "premiumdark", layout: "centre", accent: "or", bgFinish: "degrade", frame: "filet", titleCase: "normal", titleWeight: "normal", qrBadge: "carre", eCorner: "adouci", eAccent: "plein", eAlign: "center", eTypo: "serifchic" }, content: { title: "Bienvenue", subtitle: "Wi-Fi & services", cta: "Se connecter" }, comp: "wifi", variants: [{ id: "nuit", label: "Nuit", hex: "#101010" }, { id: "or", label: "Or", hex: "#C9A84C", style: "luxgold" }, { id: "vert", label: "Vert", hex: "#2E8B7B", style: "wifivert", accent: "vert" }] },
  { id: "airbnb-welcome", name: "Airbnb · Guide", business: ["Hôtel"], objective: ["Wifi", "Localisation", "Contact"], style: ["chaleureux", "clair"], orientation: "portrait", supports: ["i16", "i4", "i9"], look: { style: "airbnb", layout: "centre", accent: "corail", bgFinish: "uni", frame: "coins", titleCase: "normal", titleWeight: "normal", qrBadge: "carre", eCorner: "rond", eAccent: "plein", eAlign: "center", eTypo: "serifchic" }, content: { title: "Bienvenue", subtitle: "Le guide du logement", cta: "Ouvrir le guide" }, variants: [{ id: "sable", label: "Sable", hex: "#C56B3E" }, { id: "sauge", label: "Sauge", hex: "#6B8E5A", style: "sage", accent: "vert" }, { id: "creme", label: "Crème", hex: "#FBF3E7", style: "menuclair", accent: "or" }] },
  { id: "immo-fiche", name: "Immobilier · Bien", business: ["Immobilier"], objective: ["Contact", "Réservation", "Site web"], style: ["nature", "clair"], orientation: "paysage", supports: ["i6", "i7", "i16"], look: { style: "immo", layout: "colonnes", accent: "vert", bgFinish: "uni", frame: "filet", titleCase: "normal", titleWeight: "normal", qrBadge: "carre", eCorner: "adouci", eAccent: "plein", eAlign: "left", eTypo: "moderne" }, content: { title: "À visiter", subtitle: "Toutes les infos du bien", cta: "Voir le bien" }, variants: [{ id: "vert", label: "Vert", hex: "#2E6F5E" }, { id: "bleu", label: "Bleu", hex: "#1D4ED8", style: "corporate", accent: "bleu" }, { id: "nuit", label: "Nuit", hex: "#15181C", style: "portfolio", accent: "or" }] },
  { id: "beaute-resa", name: "Beauté · Rendez-vous", business: ["Beauté", "Coiffeur", "Spa"], objective: ["Réservation"], style: ["clair", "nature"], orientation: "portrait", supports: ["i5", "i3"], look: { style: "resaclair", layout: "centre", accent: "vert", bgFinish: "uni", frame: "filet", titleCase: "normal", titleWeight: "normal", qrBadge: "cercle", eCorner: "rond", eAccent: "plein", eAlign: "center", eTypo: "serifchic" }, content: { title: "Prenez rendez-vous", subtitle: "En ligne, 24/7", cta: "Réserver" }, comp: "reserver", variants: [{ id: "clair", label: "Clair", hex: "#F2F7F4" }, { id: "emeraude", label: "Émeraude", hex: "#34D399", style: "resa" }, { id: "rose", label: "Rose", hex: "#E1306C", style: "instaclair", accent: "rose" }] },
  { id: "spa-detente", name: "Spa · Détente", business: ["Spa", "Beauté", "Hôtel"], objective: ["Réservation", "Site web"], style: ["nature", "premium"], orientation: "portrait", supports: ["i16", "i4"], look: { style: "sage", layout: "cadre", accent: "vert", bgFinish: "uni", frame: "double", titleCase: "normal", titleWeight: "fin", qrBadge: "cercle", eCorner: "rond", eAccent: "trait", eAlign: "center", eTypo: "serifchic" }, content: { title: "Offrez-vous une pause", subtitle: "Nos soins", cta: "Réserver" }, variants: [{ id: "sauge", label: "Sauge", hex: "#6B8E5A" }, { id: "emeraude", label: "Émeraude", hex: "#34D399", style: "resa", accent: "vert" }, { id: "or", label: "Or", hex: "#C9A84C", style: "luxgold", accent: "or" }] },
  // ── Lot 3 (2026-08-15) : +20 modèles (Paiement/Horaires/Localisation + métiers ; layouts diagonale/footer). ──
  { id: "paiement-sans-contact", name: "Paiement · Sans contact", business: ["Café", "Bar", "Boutique", "Coiffeur"], objective: ["Paiement"], style: ["premium", "luxe"], orientation: "portrait", supports: ["i5", "i2"], look: { style: "luxgold", layout: "centre", accent: "or", bgFinish: "degrade", frame: "coins", titleCase: "upper", titleWeight: "normal", qrBadge: "cercle", eCorner: "adouci", eAccent: "plein", eAlign: "center", eTypo: "serifchic" }, content: { title: "Payer ici", subtitle: "Sans contact", cta: "Régler" }, comp: "scannez", variants: [{ id: "or", label: "Or", hex: "#C9A84C" }, { id: "blanc", label: "Épuré", hex: "#FFFFFF", style: "minimal", accent: "auto" }, { id: "nuit", label: "Nuit", hex: "#101010", style: "premiumdark" }] },
  { id: "paiement-pro", name: "Paiement · Pro", business: ["Commerce", "Garage", "Artisan"], objective: ["Paiement"], style: ["corporate", "clair"], orientation: "portrait", supports: ["i5", "i6"], look: { style: "corporate", layout: "centre", accent: "bleu", bgFinish: "uni", frame: "filet", titleCase: "normal", titleWeight: "gras", qrBadge: "carre", eCorner: "adouci", eAccent: "plein", eAlign: "center", eTypo: "moderne" }, content: { title: "Paiement", subtitle: "Rapide & sécurisé", cta: "Payer" }, comp: "scannez", variants: [{ id: "bleu", label: "Bleu", hex: "#1D4ED8" }, { id: "nuit", label: "Nuit", hex: "#0F1729", style: "contact" }, { id: "or", label: "Or", hex: "#C9A84C", style: "luxgold", accent: "or" }] },
  { id: "horaires", name: "Horaires", business: ["Commerce", "Pharmacie", "Coiffeur", "Restaurant"], objective: ["Horaires"], style: ["clair", "corporate"], orientation: "portrait", supports: ["i16", "i4"], look: { style: "contactclair", layout: "cadre", accent: "bleu", bgFinish: "uni", frame: "double", titleCase: "normal", titleWeight: "normal", qrBadge: "carre", eCorner: "adouci", eAccent: "trait", eAlign: "center", eTypo: "moderne" }, content: { title: "Nos horaires", subtitle: "Toujours à jour", cta: "Tout savoir" }, variants: [{ id: "clair", label: "Clair", hex: "#F7F9FC" }, { id: "vert", label: "Vert", hex: "#2E8B7B", style: "wifivert", accent: "vert" }, { id: "nuit", label: "Nuit", hex: "#0F1729", style: "contact" }] },
  { id: "nous-trouver", name: "Nous trouver", business: ["Restaurant", "Commerce", "Hôtel"], objective: ["Localisation"], style: ["corporate", "clair"], orientation: "paysage", supports: ["i6", "i16"], look: { style: "corporate", layout: "colonnes", accent: "bleu", bgFinish: "uni", frame: "filet", titleCase: "normal", titleWeight: "normal", qrBadge: "carre", eCorner: "adouci", eAccent: "plein", eAlign: "left", eTypo: "moderne" }, content: { title: "Nous trouver", subtitle: "L'itinéraire en un scan", cta: "Y aller" }, variants: [{ id: "bleu", label: "Bleu", hex: "#1D4ED8" }, { id: "vert", label: "Vert", hex: "#2E6F5E", style: "immo", accent: "vert" }, { id: "nuit", label: "Nuit", hex: "#0F1729", style: "contact" }] },
  { id: "wifi-pro", name: "Wi-Fi · Pro", business: ["Hôtel", "Restaurant", "Bar"], objective: ["Wifi"], style: ["corporate", "clair"], orientation: "portrait", supports: ["i4", "i16"], look: { style: "corporate", layout: "centre", accent: "bleu", bgFinish: "uni", frame: "filet", titleCase: "normal", titleWeight: "gras", qrBadge: "carre", eCorner: "adouci", eAccent: "plein", eAlign: "center", eTypo: "moderne" }, content: { title: "Wi-Fi", subtitle: "Réseau invité", cta: "Se connecter" }, comp: "wifi", variants: [{ id: "bleu", label: "Bleu", hex: "#1D4ED8" }, { id: "vert", label: "Vert", hex: "#2E8B7B", style: "wifivert", accent: "vert" }, { id: "nuit", label: "Nuit", hex: "#101010", style: "premiumdark", accent: "or" }] },
  { id: "menu-bistrot", name: "Menu · Bistrot", business: ["Restaurant", "Bar", "Café"], objective: ["Menu", "Commander"], style: ["editorial", "minimal"], orientation: "portrait", supports: ["i11", "i2"], look: { style: "inkedit", layout: "orne", accent: "auto", bgFinish: "uni", frame: "coins", titleCase: "upper", titleWeight: "normal", qrBadge: "carre", eCorner: "vif", eAccent: "trait", eAlign: "center", eTypo: "editorial" }, content: { title: "La carte", subtitle: "Nos plats du moment", cta: "Découvrir" }, variants: [{ id: "edito", label: "Édito", hex: "#1A1A1A" }, { id: "creme", label: "Crème", hex: "#FBF3E7", style: "menuclair", accent: "or" }, { id: "nuit", label: "Nuit", hex: "#101010", style: "premiumdark" }] },
  { id: "carte-vins", name: "Carte des vins", business: ["Caviste", "Bar", "Restaurant"], objective: ["Menu"], style: ["dark", "luxe"], orientation: "portrait", supports: ["i11", "i10", "i12"], look: { style: "barnoir", layout: "footer", accent: "or", bgFinish: "degrade", frame: "filet", titleCase: "upper", titleWeight: "normal", qrBadge: "carre", eCorner: "adouci", eAccent: "trait", eAlign: "center", eTypo: "serifchic" }, content: { title: "Notre cave", subtitle: "Vins & spiritueux", cta: "La carte" }, variants: [{ id: "or", label: "Or", hex: "#C9A84C" }, { id: "nuit", label: "Nuit", hex: "#101010", style: "premiumdark" }, { id: "bordeaux", label: "Bordeaux", hex: "#7A1F2B", style: "restofresh", accent: "rouge" }] },
  { id: "boulangerie-fid", name: "Fidélité · Boulangerie", business: ["Boulangerie", "Café", "Boucherie"], objective: ["Fidélité"], style: ["chaleureux", "clair"], orientation: "paysage", supports: ["i13", "i5"], look: { style: "menuclair", layout: "colonnes", accent: "or", bgFinish: "uni", frame: "filet", titleCase: "normal", titleWeight: "normal", qrBadge: "carre", eCorner: "rond", eAccent: "plein", eAlign: "left", eTypo: "serifchic" }, content: { title: "Fidélité", subtitle: "La 10e offerte", cta: "Vos points" }, comp: "fidelite", variants: [{ id: "creme", label: "Crème", hex: "#FBF3E7" }, { id: "sable", label: "Sable", hex: "#C56B3E", style: "airbnb", accent: "corail" }, { id: "vert", label: "Sauge", hex: "#6B8E5A", style: "sage", accent: "vert" }] },
  { id: "fleuriste", name: "Fleuriste · Réseaux", business: ["Fleuriste", "Beauté", "Boutique"], objective: ["Réseaux", "Site web"], style: ["nature", "clair"], orientation: "portrait", supports: ["i3", "i9"], look: { style: "sage", layout: "centre", accent: "vert", bgFinish: "uni", frame: "filet", titleCase: "normal", titleWeight: "normal", qrBadge: "carre", eCorner: "rond", eAccent: "plein", eAlign: "center", eTypo: "serifchic" }, content: { brand: "@votrecompte", title: "Suivez-nous", subtitle: "Nos compositions", cta: "Découvrir" }, comp: "suivre", variants: [{ id: "sauge", label: "Sauge", hex: "#6B8E5A" }, { id: "rose", label: "Rose", hex: "#E1306C", style: "instaclair", accent: "rose" }, { id: "creme", label: "Crème", hex: "#FBF3E7", style: "menuclair", accent: "or" }] },
  { id: "salle-sport", name: "Salle de sport", business: ["Salle de sport", "Coach"], objective: ["Réservation", "Promo"], style: ["bold", "neon"], orientation: "portrait", supports: ["i15", "i8"], look: { style: "neon", layout: "affiche", accent: "rose", bgFinish: "degrade", frame: "aucun", titleCase: "upper", titleWeight: "gras", qrBadge: "carre", eCorner: "vif", eAccent: "plein", eAlign: "left", eTypo: "affiche" }, content: { title: "Premier cours offert", subtitle: "Rejoignez-nous", cta: "S'inscrire" }, variants: [{ id: "rose", label: "Rose", hex: "#FF3D9A" }, { id: "violet", label: "Violet", hex: "#A855F7", style: "ticket", accent: "violet" }, { id: "corail", label: "Corail", hex: "#FF7A4D", style: "sunset", accent: "corail" }] },
  { id: "photographe", name: "Photographe", business: ["Photographe", "Freelance"], objective: ["Site web", "Contact"], style: ["editorial", "dark"], orientation: "portrait", supports: ["i6", "i8"], look: { style: "portfolio", layout: "diagonale", accent: "or", bgFinish: "degrade", frame: "aucun", titleCase: "upper", titleWeight: "normal", qrBadge: "carre", eCorner: "vif", eAccent: "trait", eAlign: "left", eTypo: "affiche" }, content: { title: "Mon portfolio", subtitle: "Voir mes photos", cta: "Découvrir" }, variants: [{ id: "or", label: "Or", hex: "#D9A441" }, { id: "nuit", label: "Nuit", hex: "#0E0E10", style: "modernblack" }, { id: "edito", label: "Édito", hex: "#1A1A1A", style: "inkedit" }] },
  { id: "tatoueur", name: "Tatoueur · Book", business: ["Tatoueur"], objective: ["Réseaux", "Contact"], style: ["dark", "vif"], orientation: "portrait", supports: ["i3", "i9"], look: { style: "modernblack", layout: "diagonale", accent: "auto", bgFinish: "grain", frame: "aucun", titleCase: "upper", titleWeight: "gras", qrBadge: "carre", eCorner: "vif", eAccent: "plein", eAlign: "left", eTypo: "affiche" }, content: { brand: "@votrecompte", title: "Book me", subtitle: "Mes flashs sur Insta", cta: "Voir" }, comp: "suivre", variants: [{ id: "nuit", label: "Nuit", hex: "#0E0E10" }, { id: "neon", label: "Néon", hex: "#FF3D9A", style: "neon", accent: "rose" }, { id: "violet", label: "Violet", hex: "#9B5CF6", style: "creator", accent: "violet" }] },
  { id: "pharmacie", name: "Pharmacie · Infos", business: ["Pharmacie"], objective: ["Horaires", "Localisation"], style: ["clair", "corporate"], orientation: "portrait", supports: ["i16", "i4"], look: { style: "contactclair", layout: "cadre", accent: "vert", bgFinish: "uni", frame: "filet", titleCase: "normal", titleWeight: "normal", qrBadge: "carre", eCorner: "adouci", eAccent: "plein", eAlign: "center", eTypo: "moderne" }, content: { title: "Horaires & garde", subtitle: "Infos pratiques", cta: "Tout savoir" }, variants: [{ id: "vert", label: "Vert", hex: "#2E8B7B", style: "wifivert", accent: "vert" }, { id: "bleu", label: "Bleu", hex: "#1D4ED8", accent: "bleu" }, { id: "nuit", label: "Nuit", hex: "#0F1729", style: "contact" }] },
  { id: "garage", name: "Garage · Rendez-vous", business: ["Garage", "Artisan"], objective: ["Contact", "Réservation"], style: ["dark", "corporate"], orientation: "paysage", supports: ["i6", "i16"], look: { style: "modernblack", layout: "colonnes", accent: "auto", bgFinish: "uni", frame: "filet", titleCase: "normal", titleWeight: "gras", qrBadge: "carre", eCorner: "vif", eAccent: "plein", eAlign: "left", eTypo: "moderne" }, content: { title: "Prendre rendez-vous", subtitle: "Devis en un scan", cta: "Contact" }, variants: [{ id: "nuit", label: "Nuit", hex: "#0E0E10" }, { id: "bleu", label: "Bleu", hex: "#0F1729", style: "contact", accent: "bleu" }, { id: "orange", label: "Orange", hex: "#E8602C", style: "offre", accent: "corail" }] },
  { id: "food-truck", name: "Food truck · Planning", business: ["Food truck", "Traiteur"], objective: ["Localisation", "Menu"], style: ["bold", "chaleureux"], orientation: "carré", supports: ["i1", "i2"], look: { style: "sunset", layout: "bandeau", accent: "corail", bgFinish: "grain", frame: "aucun", titleCase: "upper", titleWeight: "gras", qrBadge: "carre", eCorner: "vif", eAccent: "plein", eAlign: "center", eTypo: "affiche" }, content: { title: "Où nous trouver ?", subtitle: "Notre planning de la semaine", cta: "Voir" }, variants: [{ id: "sunset", label: "Sunset", hex: "#FF7A4D" }, { id: "orange", label: "Orange", hex: "#E8602C", style: "offre" }, { id: "rouge", label: "Rouge", hex: "#C0392B", style: "restofresh", accent: "rouge" }] },
  { id: "traiteur", name: "Traiteur · Devis", business: ["Traiteur", "Restaurant"], objective: ["Contact", "Site web"], style: ["premium", "luxe"], orientation: "portrait", supports: ["i7", "i11"], look: { style: "luxgold", layout: "orne", accent: "or", bgFinish: "degrade", frame: "coins", titleCase: "normal", titleWeight: "normal", qrBadge: "cercle", eCorner: "adouci", eAccent: "trait", eAlign: "center", eTypo: "serifchic" }, content: { title: "Votre événement", subtitle: "Un devis sur mesure", cta: "Nous contacter" }, variants: [{ id: "or", label: "Or", hex: "#C9A84C" }, { id: "creme", label: "Crème", hex: "#FBF3E7", style: "menuclair" }, { id: "nuit", label: "Nuit", hex: "#101010", style: "premiumdark" }] },
  { id: "festival", name: "Festival", business: ["Événement", "Bar"], objective: ["Promo", "Réservation"], style: ["neon", "bold"], orientation: "portrait", supports: ["i8", "i15"], look: { style: "ticket", layout: "diagonale", accent: "violet", bgFinish: "degrade", frame: "aucun", titleCase: "upper", titleWeight: "gras", qrBadge: "carre", eCorner: "vif", eAccent: "plein", eAlign: "left", eTypo: "affiche" }, content: { title: "Festival", subtitle: "3 jours de live", cta: "Billetterie" }, variants: [{ id: "violet", label: "Violet", hex: "#A855F7" }, { id: "neon", label: "Néon", hex: "#FF3D9A", style: "neon", accent: "rose" }, { id: "sunset", label: "Sunset", hex: "#FF7A4D", style: "sunset", accent: "corail" }] },
  { id: "newsletter", name: "Newsletter", business: ["Boutique", "Freelance", "Café"], objective: ["Site web", "Réseaux"], style: ["minimal", "editorial"], orientation: "portrait", supports: ["i3", "i9"], look: { style: "minimal", layout: "centre", accent: "auto", bgFinish: "uni", frame: "filet", titleCase: "normal", titleWeight: "fin", qrBadge: "carre", eCorner: "adouci", eAccent: "trait", eAlign: "center", eTypo: "editorial" }, content: { title: "Rejoignez-nous", subtitle: "La newsletter", cta: "S'inscrire" }, variants: [{ id: "blanc", label: "Blanc", hex: "#FFFFFF" }, { id: "edito", label: "Édito", hex: "#1A1A1A", style: "inkedit" }, { id: "sauge", label: "Sauge", hex: "#6B8E5A", style: "sage", accent: "vert" }] },
  { id: "download-app", name: "Télécharger l'app", business: ["Commerce", "Freelance", "Salle de sport"], objective: ["Site web"], style: ["dark", "moderne"], orientation: "carré", supports: ["i7", "i3"], look: { style: "modernblack", layout: "qrgeant", accent: "auto", bgFinish: "uni", frame: "aucun", titleCase: "normal", titleWeight: "gras", qrBadge: "carre", eCorner: "rond", eAccent: "plein", eAlign: "center", eTypo: "moderne" }, content: { title: "Téléchargez l'app", subtitle: "Scannez pour installer", cta: "Obtenir" }, comp: "scannez", variants: [{ id: "nuit", label: "Nuit", hex: "#0E0E10" }, { id: "bleu", label: "Bleu", hex: "#0F1729", style: "contact", accent: "bleu" }, { id: "violet", label: "Violet", hex: "#120A1F", style: "creator", accent: "violet" }] },
  { id: "promo-flash", name: "Offre flash", business: ["Boutique", "Commerce", "Food truck"], objective: ["Promo"], style: ["bold", "pop"], orientation: "portrait", supports: ["i7", "i3"], look: { style: "soldes", layout: "bandeau", accent: "rouge", bgFinish: "uni", frame: "aucun", titleCase: "upper", titleWeight: "gras", qrBadge: "carre", eCorner: "vif", eAccent: "plein", eAlign: "center", eTypo: "affiche" }, content: { title: "Offre flash", subtitle: "48 h seulement", cta: "En profiter" }, variants: [{ id: "rouge", label: "Rouge", hex: "#FF4D4D" }, { id: "orange", label: "Orange", hex: "#E8602C", style: "offre", accent: "corail" }, { id: "neon", label: "Néon", hex: "#FF3D9A", style: "neon", accent: "rose" }] },
]

export const TEMPLATE_BY_ID: Record<string, PrintTemplate> = Object.fromEntries(TEMPLATES.map(t => [t.id, t]))

// Pertinence d'un template pour le support courant : +2 si le support est recommandé,
// +1 par objectif partagé. Renvoie TOUS les templates, les plus pertinents d'abord (stable).
export function filterTemplates(item?: Item | null): PrintTemplate[] {
  if (!item) return TEMPLATES
  const objs = OBJ[item.id] || []
  const score = (t: PrintTemplate) =>
    (t.supports.includes(item.id) ? 2 : 0) + t.objective.filter(o => objs.includes(o)).length
  return TEMPLATES.map((t, i) => ({ t, i, s: score(t) })).sort((a, b) => (b.s - a.s) || (a.i - b.i)).map(x => x.t)
}
~~~


## `apps/web/src/app/dashboard/print-studio/tokens.ts`

~~~tsx
// QRowg · Print Studio — jetons de design (réduits à ce qui est RÉELLEMENT consommé).
//
// Aligné sur le design system de l'app (globals.css) : les couleurs référencent les VARIABLES CSS
// (`var(--bg)`, `var(--ink)`, `var(--accent)`…) → impossible de dériver du reste du dashboard, et
// la couleur d'accent suit l'utilisateur. Les variantes *A** existent parce que certains styles
// concatènent une alpha (`${C.gold}55`) et qu'on ne peut pas suffixer une var() — on passe par color-mix.
//
// NB : les anciennes échelles `space` / `type` / `font` / `motion` / `breakpoints` étaient déclarées
// mais jamais consommées (fiction de rigueur) → supprimées. La typo/espacement suivent globals.css.
export const color = {
  bg: 'var(--bg)',
  surface: 'var(--surface)',                 // panneau opaque (near-black chaud)
  surfaceUp: 'rgba(255,255,255,.04)',
  hairline: 'rgba(255,255,255,.08)',
  fg: 'var(--ink)',                          // crème
  fgMuted: 'var(--muted)',
  fgFaint: 'rgba(245,240,232,.44)',
  gold: 'var(--accent)',                     // suit l'accent utilisateur (défaut = or)
  goldSoft: 'color-mix(in srgb, var(--accent) 14%, transparent)',
  goldA22: 'color-mix(in srgb, var(--accent) 14%, transparent)',
  goldA33: 'color-mix(in srgb, var(--accent) 22%, transparent)',
  goldA55: 'color-mix(in srgb, var(--accent) 36%, transparent)',
  goldA88: 'color-mix(in srgb, var(--accent) 56%, transparent)',
  ok: 'var(--success)',
  okA22: 'color-mix(in srgb, var(--success) 14%, transparent)',
  bad: 'var(--danger)',
  badA22: 'var(--danger-bg)',
  badA55: 'var(--danger-border)',
}

export const radius = { chip: 999, control: 12, card: 16, sheet: 20, print: 3 }
~~~


## `apps/web/src/app/dashboard/print-studio/states.ts`

~~~tsx
// QRowg · Print Studio — machine d'états et structure d'écran. Porté depuis Print Studio Mobile v3.
//
// Principe : aucun canvas libre. L'utilisateur choisit un objet, puis ajuste dans trois
// volets fermés par défaut. Deux taps suffisent pour obtenir le fichier.

export type Screen = { id: string; titre: string; role: string; sortie: string | null }

export const ECRANS: Screen[] = [
  { id: 'library', titre: 'Bibliothèque', role: 'Choisir un objet réel, filtré par métier × objectif.', sortie: 'preview' },
  { id: 'preview', titre: 'Aperçu et réglages', role: 'Rendu packshot en haut, trois volets en dessous, action en bas.', sortie: 'ready' },
  { id: 'ready', titre: 'Contrôle avant export', role: 'Grille de vérifications (fond perdu, marges, DPI, contraste, taille du QR) puis export.', sortie: 'suite' },
  { id: 'suite', titre: 'Décliner ou imprimer', role: 'Même ambiance sur d\'autres objets, ou planche d\'impression / devis.', sortie: null },
]

export type VoletField = {
  cle: string; type: string; libelle: string;
  source?: string; note?: string; options?: string[]; plage?: [number, number];
}
export type Volet = { id: string; titre: string; ouvertParDefaut: boolean; resume: string; champs: VoletField[] }

export const VOLETS: Volet[] = [
  {
    id: 'texte', titre: 'Ce qui est écrit', ouvertParDefaut: false, resume: 'marque · « message »',
    champs: [
      { cle: 'brand', type: 'cycle', libelle: 'Nom affiché', source: 'catalog.BRANDNAMES' },
      { cle: 'message', type: 'suggestions', libelle: 'Message', source: 'catalog.MESSAGES[item.id]', note: '4 propositions par objet ; champ libre autorisé' },
      { cle: 'dest', type: 'cycle', libelle: 'Destination du scan', note: 'menu, avis, réseaux, paiement… selon OBJ[item.id]' },
    ],
  },
  {
    id: 'allure', titre: 'L\'allure', ouvertParDefaut: false, resume: 'ambiance · mise en page · taille du QR',
    champs: [
      { cle: 'palette', type: 'grille', libelle: 'Ambiance', source: 'catalog.ambiancesFor(metier)', note: '8 ambiances ; lien « Voir les 29 coloris détaillés » déplie catalog.STYLES' },
      { cle: 'layout', type: 'rail', libelle: 'Mise en page', source: 'catalog.LAYOUTS filtré par objet' },
      { cle: 'size', type: 'rail', libelle: 'Taille du QR', source: 'catalog.SIZES', note: 'chaque option annonce sa distance de lecture' },
    ],
  },
  {
    id: 'details', titre: 'Les détails', ouvertParDefaut: false, resume: 'logo · six gestes, tous sans risque',
    champs: [
      { cle: 'logo', type: 'segmenté', libelle: 'Logo', options: ['objet', 'qr', 'aucun'] },
      { cle: 'eTitle', type: 'pas', libelle: 'Titre', plage: [0, 2], note: 'plus petit / normal / plus grand' },
      { cle: 'ePad', type: 'pas', libelle: 'Air autour', plage: [0, 2] },
      { cle: 'eCorner', type: 'segmenté', libelle: 'Coins', options: ['vif', 'adouci', 'rond'] },
      { cle: 'eAccent', type: 'segmenté', libelle: 'Accent', options: ['plein', 'trait', 'aucun'] },
      { cle: 'eTypo', type: 'rail', libelle: 'Typographie', source: 'catalog.TYPOS' },
      { cle: 'eAlign', type: 'segmenté', libelle: 'Alignement', options: ['left', 'center', 'right'] },
    ],
  },
]

export const REGLE_GESTES = 'Chaque levier est borné : aucune combinaison ne peut produire un fichier non imprimable. Pas de valeur libre en px, pas de sélecteur de couleur ouvert.'

export type ControlCheck = { cle: string; libelle: string; regle: string; gravite: 'bloquant' | 'avertissement' }

export const LIGNE_DE_CONTROLE: ControlCheck[] = [
  { cle: 'bleed', libelle: 'Fond perdu', regle: 'item.bleed mm présents sur les 4 côtés', gravite: 'bloquant' },
  { cle: 'margin', libelle: 'Marges de sécurité', regle: 'aucun texte à moins de item.margin mm du bord', gravite: 'bloquant' },
  { cle: 'dpi', libelle: 'Résolution', regle: '≥ item.dpi', gravite: 'bloquant' },
  { cle: 'qr', libelle: 'Taille du QR', regle: 'item.qrMm × SIZES.factor ≥ 20 mm', gravite: 'bloquant' },
  { cle: 'contrast', libelle: 'Contraste du QR', regle: 'wcag(style.qr, style.qrBg) ≥ 4.5', gravite: 'bloquant' },
  { cle: 'textContrast', libelle: 'Contraste du texte', regle: 'wcag(style.ink, style.bg) ≥ 4.5 (AA)', gravite: 'avertissement' },
  { cle: 'quiet', libelle: 'Zone franche', regle: '4 modules blancs autour du QR', gravite: 'bloquant' },
]

export type SystemState = { id: string; declencheur: string; ecran: string }

export const ETATS_SYSTEME: SystemState[] = [
  { id: 'premier-lancement', declencheur: 'aucun objet encore ouvert', ecran: 'encart doré au-dessus de la bibliothèque : trois objets suffisent (à table, en vitrine, dans la main) + bouton « Voir tout »' },
  { id: 'chargement', declencheur: 'rendu en cours', ecran: 'squelettes aux dimensions réelles des objets (92×92, 132×92, 82×116) — jamais de spinner' },
  { id: 'quota', declencheur: 'limite d\'exports atteinte', ecran: 'l\'aperçu reste visible et net ; seul l\'export est verrouillé, avec le compte restant et l\'offre' },
  { id: 'hors-ligne', declencheur: 'pas de réseau', ecran: 'bandeau discret ; les réglages continuent de fonctionner, l\'export se met en attente' },
  { id: 'normal', declencheur: '—', ecran: 'aperçu + trois volets fermés + action en bas' },
]

export const WEB = {
  note: 'Une seule page suffit : aperçu sticky en haut ou à gauche, les trois volets en dessous, la barre d\'action ancrée.',
  navigation: 'Les quatre écrans deviennent des étapes d\'une même page (ancres), pas des pages séparées.',
  reutilisable_ailleurs: 'L\'éclairage packshot (mockup.sceneLayers) s\'applique tel quel aux visuels de présentation des supports du site existant.',
}

// ── Moteur pur de la ligne de contrôle ──────────────────────────────────────
// Évalue les 7 vérifications d'un design donné. Aucun DOM. Réutilise wcag (mockup).
import { wcag, type Scene } from './mockup'
import type { Item, Style, Size } from './catalog'

export type CheckResult = { cle: string; libelle: string; ok: boolean; gravite: 'bloquant' | 'avertissement'; valeur: string }

// `exportDpi` = DPI d'export choisi (par défaut celui du support). `sizeFactor` = SIZES.factor.
export function evaluateControls(item: Item, style: Style, size: Size, exportDpi?: number): CheckResult[] {
  const dpi = exportDpi ?? item.dpi
  const qrPrinted = Math.round(item.qrMm * size.factor)
  const qrContrast = wcag(style.qr, style.qrBg)
  const textContrast = wcag(style.ink, style.bg)
  return [
    { cle: 'bleed', libelle: 'Fond perdu', ok: item.bleed > 0, gravite: 'bloquant', valeur: `${item.bleed} mm` },
    { cle: 'margin', libelle: 'Marges de sécurité', ok: item.margin > 0, gravite: 'bloquant', valeur: `${item.margin} mm` },
    { cle: 'dpi', libelle: 'Résolution', ok: dpi >= item.dpi, gravite: 'bloquant', valeur: `${dpi} dpi` },
    { cle: 'qr', libelle: 'Taille du QR', ok: qrPrinted >= 20, gravite: 'bloquant', valeur: `${qrPrinted} mm` },
    { cle: 'contrast', libelle: 'Contraste du QR', ok: qrContrast >= 4.5, gravite: 'bloquant', valeur: `${qrContrast.toFixed(1)}:1` },
    { cle: 'textContrast', libelle: 'Contraste du texte', ok: textContrast >= 4.5, gravite: 'avertissement', valeur: `${textContrast.toFixed(1)}:1` },
    { cle: 'quiet', libelle: 'Zone franche', ok: true, gravite: 'bloquant', valeur: '4 modules' },
  ]
}

// L'export est autorisé si aucun contrôle BLOQUANT n'échoue (les avertissements passent).
export function canExport(results: CheckResult[]): boolean {
  return !results.some(r => r.gravite === 'bloquant' && !r.ok)
}

export type { Scene }
~~~

