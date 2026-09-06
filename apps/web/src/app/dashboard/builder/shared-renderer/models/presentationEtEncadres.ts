// Modeles PURS de la vague « presentation et encadres » (aucun React).
//
// Six blocs ecrits deux fois, deux copies qui avaient derive. Releve du 6 septembre :
//   • founder_message : l'apercu affichait un message INVENTE (« Bienvenue ! Notre
//     mission est de vous offrir le meilleur service possible. ») quand le champ
//     etait vide, comme s'il allait etre publie. La page, elle, publiait deux
//     guillemets vides des qu'un nom etait saisi.
//   • quote_block : l'editeur cachait le bloc sans citation ; la page publiait une
//     citation vide suivie de son auteur.
//   • company : l'apercu dessinait toujours la carte (logo 🏢, ligne vide) ; la page
//     ne publiait rien sans nom ni logo.
//   • info_box : les retours a la ligne du message etaient conserves en ligne et
//     ecrases dans l'apercu.
//   • expertise : `parseInt(String(level) || "3")` ne retombe jamais sur 3 —
//     String(undefined) vaut « undefined », qui est vrai. Un niveau non renseigne
//     donnait NaN, donc une barre a « NaN% ». Des deux cotes.
//   • journey : etat vide non standard, sans la mention « invisible en ligne ».

const txt = (v: unknown): string => (typeof v === "string" ? v.trim() : "")

// ── Citation ────────────────────────────────────────────────────────────────
// Sans citation, il n'y a rien a citer : un auteur seul ne publie pas de bloc.
export type Citation = { quote: string; author: string; source: string }
export function citation(c: Record<string, any> | null | undefined): Citation | null {
  const src = c || {}
  const quote = txt(src.quote)
  if (!quote) return null
  return { quote, author: txt(src.author), source: txt(src.source) }
}

// ── Encadre colore ──────────────────────────────────────────────────────────
export type StyleEncadre = { bg: string; border: string; color: string }
export const STYLES_ENCADRE: Record<string, StyleEncadre> = {
  info:      { bg: "rgba(56,189,248,0.08)",  border: "rgba(56,189,248,0.3)",  color: "var(--action)" },
  warning:   { bg: "rgba(251,191,36,0.08)",  border: "rgba(251,191,36,0.3)",  color: "#FBBF24" },
  success:   { bg: "rgba(57,255,143,0.08)",  border: "rgba(57,255,143,0.3)",  color: "var(--success)" },
  tip:       { bg: "rgba(201,168,76,0.08)",  border: "rgba(201,168,76,0.3)",  color: "#C9A84C" },
  important: { bg: "rgba(239,68,68,0.08)",   border: "rgba(239,68,68,0.3)",   color: "#EF4444" },
}
export type Encadre = { emoji: string; title: string; message: string; style: StyleEncadre }
export function encadre(c: Record<string, any> | null | undefined): Encadre | null {
  const src = c || {}
  const title = txt(src.title), message = txt(src.message)
  if (!title && !message) return null
  // Un type inconnu (donnee ancienne, faute de frappe) retombe sur « info » plutot
  // que de faire planter la lecture d'un style indefini.
  return { emoji: txt(src.emoji) || "💡", title, message, style: STYLES_ENCADRE[txt(src.type)] ?? STYLES_ENCADRE.info }
}

// ── Message du fondateur ────────────────────────────────────────────────────
// Le message EST le bloc : sans lui, rien. Aucun texte d'exemple n'est invente.
export type MessageFondateur = { photo: string; name: string; role: string; message: string; signature: string }
export function messageFondateur(c: Record<string, any> | null | undefined): MessageFondateur | null {
  const src = c || {}
  const message = txt(src.message)
  if (!message) return null
  return { photo: txt(src.photo), name: txt(src.name), role: txt(src.role), message, signature: txt(src.signature) }
}

// ── Fiche entreprise ────────────────────────────────────────────────────────
export type FicheEntreprise = { logo: string; name: string; sousTitre: string; site: string }
export function ficheEntreprise(c: Record<string, any> | null | undefined): FicheEntreprise | null {
  const src = c || {}
  const name = txt(src.company_name), logo = txt(src.logo_url)
  if (!name && !logo) return null
  // « Effectif » etait un reglage propose et lu par personne : le commercant le
  // remplissait, rien ne s'affichait. Il rejoint la ligne de sous-titre.
  const annee = txt(src.founded_year)
  const effectif = txt(src.team_size)
  return {
    logo, name,
    sousTitre: [txt(src.sector), annee && `Depuis ${annee}`, effectif].filter(Boolean).join(" · "),
    // « Site web » etait propose et affiche nulle part non plus.
    site: txt(src.website),
  }
}

// ── Parcours : quatre lignes libres, un emoji en tete ────────────────────────
// Le premier mot sert d'icone : c'est la convention du bloc depuis l'origine et
// les pages existantes en dependent. On la conserve telle quelle.
export type LigneParcours = { icone: string; texte: string }
export function lignesParcours(c: Record<string, any> | null | undefined): LigneParcours[] {
  const src = c || {}
  return [src.line_1, src.line_2, src.line_3, src.line_4]
    .map(txt).filter(Boolean)
    .map(l => { const [tete, ...reste] = l.split(" "); return { icone: tete, texte: reste.join(" ") } })
}

// ── Expertises : nom + niveau sur 5 ─────────────────────────────────────────
export type Expertise = { icone: string; nom: string; pct: number }
export function niveauxExpertise(c: Record<string, any> | null | undefined, max = 50): Expertise[] {
  const src = c || {}
  const out: Expertise[] = []
  for (let i = 1; i <= max; i++) {
    const nom = txt(src[`s${i}_name`])
    if (!nom) continue
    out.push({ icone: txt(src[`s${i}_icon`]), nom, pct: pourcentageNiveau(src[`s${i}_level`]) })
  }
  return out
}

// Niveau 1..5 -> pourcentage. Un niveau absent ou illisible vaut 3 (le milieu) :
// l'ancien code ecrivait « NaN% » dans la largeur de la barre.
export function pourcentageNiveau(v: unknown): number {
  const n = parseInt(String(v ?? "").replace(/[^0-9]/g, ""), 10)
  const niveau = Number.isFinite(n) && n >= 1 ? Math.min(5, n) : 3
  return Math.round((niveau / 5) * 100)
}
