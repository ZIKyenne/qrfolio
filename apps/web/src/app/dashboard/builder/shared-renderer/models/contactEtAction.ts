// Modeles PURS de la vague « contact et action » (aucun React).
//
// Ce sont les blocs les plus courants d'une page scannee : appeler, trouver
// l'adresse, obtenir l'itineraire, cliquer sur le bouton. Ecrits deux fois, ils
// avaient derive :
//   • call_button : le sous-titre (« 7j/7 de 9h a 19h ») etait reglable et
//     affiche au visiteur, mais absent de l'apercu de l'editeur.
//   • directions_button : l'apercu montrait l'adresse en texte ; la page
//     publiait, elle, un bouton « Copier l'adresse ».
//   • google_maps : sans adresse, les deux cotes dessinaient quand meme la
//     carte — et la page publiait un lien vers une recherche Google VIDE.
//   • quick_contact : l'apercu fabriquait « tel:… » et « wa.me/… » a la main,
//     sans passer par les fonctions qui nettoient le numero, et ignorait
//     l'indicatif pays du WhatsApp.
import { extHref, telLink, waLink, directionsLink } from "../../types"
import type { CtaLink } from "./ctaLink"

const txt = (v: unknown): string => (typeof v === "string" ? v.trim() : "")

// ── Bouton d'appel ──────────────────────────────────────────────────────────
export type BoutonAppel = { href: string; icone: string; label: string; sous: string }
export function boutonAppel(c: Record<string, any> | null | undefined): BoutonAppel | null {
  const src = c || {}
  const href = telLink(txt(src.phone))
  if (!href) return null
  return { href, icone: txt(src.icon) || "📞", label: txt(src.label) || "Appeler maintenant", sous: txt(src.sub) }
}

// ── Bouton d'itineraire ─────────────────────────────────────────────────────
export type BoutonItineraire = { href: string; label: string; adresse: string; copier: boolean }
export function boutonItineraire(c: Record<string, any> | null | undefined): BoutonItineraire | null {
  const src = c || {}
  const adresse = txt(src.address)
  const href = directionsLink(adresse, src.provider)
  if (!href) return null
  return { href, label: txt(src.label) || "Obtenir l'itinéraire", adresse, copier: txt(src.show_copy) !== "no" && !!adresse }
}

// ── Carte d'adresse ─────────────────────────────────────────────────────────
// Sans adresse, il n'y a rien a montrer : la page publiait une carte dont le
// lien menait a une recherche Google vide.
export type CarteAdresse = { href: string; label: string; adresse: string; transport: string }
export function carteAdresse(c: Record<string, any> | null | undefined): CarteAdresse | null {
  const src = c || {}
  const adresse = txt(src.address)
  if (!adresse) return null
  return {
    href: `https://maps.google.com/?q=${encodeURIComponent(adresse)}`,
    label: txt(src.label) || "Adresse", adresse, transport: txt(src.transport),
  }
}

// ── Contacts rapides ────────────────────────────────────────────────────────
export type LigneContact = { valeur: string; icone: string; couleur: "success" | "action" | "whatsapp" | "accent" | "muted"; lien: CtaLink | null }
export function contactsRapides(c: Record<string, any> | null | undefined): LigneContact[] {
  const src = c || {}
  const out: LigneContact[] = []
  const pousser = (valeur: string, icone: string, couleur: LigneContact["couleur"], href: string | null, externe: boolean) => {
    if (!valeur) return
    out.push({ valeur, icone, couleur, lien: href ? { href, external: externe, trackTarget: href, visible: true } : null })
  }
  const tel = txt(src.phone)
  pousser(tel, "📞", "success", telLink(tel) || null, false)
  const mail = txt(src.email)
  pousser(mail, "✉️", "action", mail ? `mailto:${mail}` : null, false)
  const wa = txt(src.whatsapp)
  pousser(wa, "💬", "whatsapp", waLink(wa, undefined, txt(src.whatsapp_cc) || "33") || null, true)
  pousser(txt(src.address), "📍", "accent", null, false)
  pousser(txt(src.hours), "🕐", "muted", null, false)
  return out
}

// ── Bouton d'action libre ───────────────────────────────────────────────────
export type BoutonAction = { label: string; icone: string; style: string; pleineLargeur: boolean; lien: CtaLink }
export function boutonAction(c: Record<string, any> | null | undefined): BoutonAction | null {
  const src = c || {}
  const label = txt(src.label), url = txt(src.url)
  if (!label && !url) return null
  return {
    label: label || "Bouton",
    icone: txt(src.icon),
    style: txt(src.style),
    // « Pleine largeur » etait propose dans les reglages et n'avait aucun effet.
    pleineLargeur: txt(src.full_width) !== "no",
    lien: { href: extHref(url) || "#", external: false, trackTarget: url || "cta_button", visible: true },
  }
}
