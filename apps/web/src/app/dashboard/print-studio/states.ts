// QRowg · Atelier d'impression — machine d'états et structure d'écran. Porté depuis Atelier d'impression Mobile v3.
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
