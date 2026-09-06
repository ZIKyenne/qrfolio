import { describe, it, expect } from "vitest"
import { renderToStaticMarkup } from "react-dom/server"
import { EMPTY_STATE_BLOCK_TYPES, hasPublishableContent } from "./blockEmptyState"
import { BLOCK_DEFS } from "./blockDefs"
import { RenduLegacy } from "../../[slug]/renduLegacy"
import { SHARED_RENDERER_BLOCKS } from "./shared-renderer/architecture"

// ═══════════════════════════════════════════════════════════════════════════════
// LA DOCTRINE DE L'ÉTAT VIDE, VÉRIFIÉE SUR LE RENDU RÉEL.
//
// `blockEmptyState.ts` s'annonce lui-même comme « miroir EXACT du filtre
// public » : hasPublishableContent(type, contenu) === false doit vouloir dire
// que la page publiée ne rend RIEN. Jusqu'ici, cette affirmation n'était qu'une
// phrase en commentaire. Deux tests l'entouraient sans la vérifier :
//   · blockEmptyState.test.ts éprouve les détecteurs entre eux ;
//   · blockEmptyState.parity.test.ts vérifie que l'ÉDITEUR a bien une garde.
// Aucun des deux ne rendait la page publiée pour voir ce qui en sortait.
//
// Écrit le 6 septembre au soir. Une divergence ici est double : l'éditeur
// afficherait « Invisible en ligne tant qu'il est vide » sous un bloc qui, lui,
// s'affiche — ou l'inverse, il laisserait composer un bloc qui disparaîtra.
//
// PÉRIMÈTRE : les blocs LEGACY, ceux dont c'était encore invérifié. Les blocs du
// renderer partagé sont déjà couverts un par un par les fichiers wave*.test.tsx,
// qui importent leur adapter et exigent `null` — ils ne peuvent pas l'être ici,
// le registre public les charge par `dynamic()` et un composant chargé à la
// demande ne rend rien sous renderToStaticMarkup. Les inclure aurait donné un
// test vert qui ne vérifie rien : le pire des deux mondes.
// ═══════════════════════════════════════════════════════════════════════════════

const theme: any = {
  bg: "#080808", surface: "#111009", primary: "#C9A84C", accent: "#39FF8F",
  text: "#F5F0E8", muted: "#A8A190", fontDisplay: "Fraunces, serif", fontBody: "DM Sans, sans-serif",
}

/** Rend le bloc comme le voit un visiteur : renderer partagé, sinon legacy. */
function rendrePublic(type: string, content: Record<string, any>): string {
  return renderToStaticMarkup(
    <RenduLegacy block={{ id: "b1", type, content, position: 0 }} theme={theme} pageId="p1" ownerEmail="a@b.co" totalViews={0} />,
  )
}

/** Les types déclarés qui sont encore rendus par le chemin legacy. */
const LEGACY = EMPTY_STATE_BLOCK_TYPES.filter(t => BLOCK_DEFS[t] && !SHARED_RENDERER_BLOCKS.has(t))

/** Rien du tout. La doctrine dit `null`, pas « une coquille sans texte » :
 *  un conteneur vide laisse quand même un trou dans la page — c'est ce que
 *  pageVide.test.ts reproche par ailleurs. Une version indulgente de ce contrôle
 *  laissait passer un bloc qui se rend toujours (vérifié par mutation). */
function neRendRien(html: string): boolean {
  return html === ""
}

/** Vrai si le visiteur voit quelque chose : du texte, ou un média. */
function montreQuelqueChose(html: string): boolean {
  const texte = html.replace(/<[^>]*>/g, "").replace(/\s|&[a-z#0-9]+;/g, "")
  return texte !== "" || /<(?:img|iframe|svg|video|audio|input|button|a)\b/.test(html)
}

describe("le rendu réel confirme ce que la doctrine annonce", () => {
  it("le rendu legacy répond, sinon ce test ne vérifie rien", () => {
    expect(rendrePublic("profile", { name: "Camille" })).toContain("Camille")
    expect(LEGACY.length, "plus aucun bloc legacy déclaré : ce fichier peut disparaître").toBeGreaterThan(5)
  })

  const echecs: string[] = []
  for (const type of LEGACY) {
    // Un contenu vide : par construction, hasPublishableContent doit dire faux.
    const vide = {}
    if (hasPublishableContent(type, vide)) { echecs.push(`${type} : le détecteur dit « publiable » pour un contenu vide`); continue }
    let html = ""
    try { html = rendrePublic(type, vide) } catch (e) { echecs.push(`${type} : le rendu public a levé « ${(e as Error).message.slice(0, 80)} »`); continue }
    if (!neRendRien(html)) echecs.push(`${type} : annoncé invisible, rend pourtant ${html.length} caractères de HTML`)
  }

  it("un bloc annoncé « invisible tant qu'il est vide » ne publie effectivement rien", () => {
    expect(echecs).toEqual([])
  })

  it("et la promesse porte sur assez de blocs pour valoir quelque chose", () => {
    expect(EMPTY_STATE_BLOCK_TYPES.length).toBeGreaterThan(35)
  })
})

describe("dès qu'il y a du contenu, le bloc apparaît vraiment", () => {
  // L'autre moitié de la doctrine : hasPublishableContent === true doit vouloir
  // dire que le visiteur voit quelque chose. Sinon l'éditeur laisse composer un
  // bloc qui disparaîtra en ligne — le défaut que ce fichier existe pour éviter.
  const REMPLI: Record<string, Record<string, any>> = {
    values: { v1_label: "Écoute" }, process_steps: { s1_title: "Prise de contact" },
    business_certifications: { c1_name: "Qualibat" }, on_site_services: { s1_label: "WiFi" },
    event_program: { s1_title: "Concert" }, event_guests: { g1_name: "Camille" },
    lineup: { a1_name: "DJ Nord" }, discography: { a1_title: "Premier album" },
    concerts: { c1_city: "Reims" }, merch: { name1: "T-shirt" },
    trust_badge: { b1_label: "Artisan" }, info_table: { r1_label: "Places", r1_value: "40" },
    engagements: { e1: "Réponse sous 24 h" }, stats_block: { s1_value: "12" },
    grid_section: { c1_title: "Notre atelier" }, tabs_block: { tab1_label: "Midi" },
    accordion_block: { a1_title: "Nos services" }, two_columns: { col1_title: "Sur place" },
    promo_code: { code: "PROMO10" }, sales_counter: { count: "127" },
    participants_count: { count: "42" }, scan_counter: { count: "1 240" },
    featured_product: { name: "Le pain de campagne" }, quote_block: { quote: "La qualité se voit." },
    founder_message: { message: "Merci de votre visite." }, info_box: { message: "Ouvert le lundi" },
    google_reviews_block: { r1_name: "Camille" }, event_access: { address: "12 rue des Peupliers" },
    logo_wall: { logo1_name: "Acme" }, partners: { logo1_name: "Acme" },
    certifications: { cert_1_name: "ISO 9001" }, legal_info: { siret: "123 456 789 00012" },
    company: { company_name: "Atelier Nord" }, journey: { line_1: "🏆 Prix 2019" },
    expertise: { s1_name: "Ébénisterie" }, tickets_left: { count: "14" },
    limited_offer: { title: "Black Friday" }, vcard: { name: "Camille Nord" },
    // Balayage du 6 septembre au soir : huit blocs publiaient quelque chose que
    // personne n'avait saisi.
    rich_text: { text: "Notre atelier ouvre à 8 h." },
    cover_banner: { cover_title: "Atelier Nord" },
    product: { name: "Le pain de campagne", price: "4,20 €" },
    availability: { status: "busy", message: "Complet jusqu'au 20" },
    section_banner: { title: "Nos services" },
    calendly: { url: "https://calendly.com/atelier-nord" },
    free_gift: { url: "https://atelier-nord.fr/cadeau" },
    instagram_feed: { cta_url: "https://instagram.com/atelier.nord" },
  }

  it("chaque type déclaré a un exemple rempli — sinon la moitié du contrôle manque", () => {
    const manquants = LEGACY.filter(t => !REMPLI[t])
    expect(manquants, "ajoutez un exemple pour ces types").toEqual([])
  })

  const echecs: string[] = []
  for (const type of LEGACY) {
    const contenu = REMPLI[type]
    if (!contenu) continue
    if (!hasPublishableContent(type, contenu)) { echecs.push(`${type} : l'exemple ne passe pas le détecteur`); continue }
    let html = ""
    try { html = rendrePublic(type, contenu) } catch (e) { echecs.push(`${type} : rendu impossible — ${(e as Error).message.slice(0, 80)}`); continue }
    if (!montreQuelqueChose(html)) echecs.push(`${type} : annoncé publiable, ne montre pourtant rien`)
  }

  it("un bloc rempli arrive bien sur la page publiée", () => {
    expect(echecs).toEqual([])
  })
})

// ═════════════════════════════════════════════════════════════════════════════
// BALAYAGE — TOUS les blocs legacy rendus À VIDE, pas seulement les déclarés.
//
// Les deux contrôles ci-dessus partent de la liste des blocs qui SE DÉCLARENT
// « invisibles tant qu'ils sont vides ». Un bloc qui publie quelque chose sans
// s'être déclaré passait donc entre les mailles. Ce balayage part de l'autre
// bout : on pose chaque bloc vide sur une page et on regarde ce qui en sort.
//
// Relevé du 6 septembre au soir — huit blocs :
//   · trois coquilles : product, rich_text, cover_banner rendaient un conteneur
//     sans rien dedans, c'est-à-dire un trou dans la page ;
//   · cinq contenus par défaut : calendly et free_gift publiaient un bouton qui
//     menait à « # », instagram_feed un « Me suivre » qui ne suivait personne,
//     section_banner le mot « SECTION » en guise de remplissage — et surtout
//     `availability` annonçait « Disponible », une affirmation faite au visiteur
//     que le commerçant n'avait jamais écrite. Même famille que le « 1 240 » du
//     compteur de scans.
// ═════════════════════════════════════════════════════════════════════════════

// Un formulaire vide reste un formulaire utilisable : ses libellés par défaut
// (« Contact », « Envoyer ») ne sont pas du contenu inventé, ce sont les
// commandes de l'outil. C'est la seule famille qui a le droit de publier sans
// configuration — et elle est nommée, pas devinée.
const FORMULAIRES = new Set([
  "contact_form", "reservation_form", "quote_form", "booking_request",
  "event_register", "rsvp", "quote_request",
])

describe("aucun bloc ne publie ce que personne n'a saisi", () => {
  const coquilles: string[] = []
  const inventes: string[] = []
  for (const type of Object.keys(BLOCK_DEFS)) {
    if (SHARED_RENDERER_BLOCKS.has(type) || FORMULAIRES.has(type)) continue
    let html = ""
    try { html = rendrePublic(type, {}) } catch { continue }   // couvert par les autres tests
    if (html === "") continue
    const texte = html.replace(/<[^>]*>/g, "").replace(/&[a-z#0-9]+;/g, "").trim()
    if (texte) inventes.push(`${type} → « ${texte.slice(0, 60)} »`)
    else coquilles.push(`${type} (${html.length} caractères de HTML, aucun texte)`)
  }

  it("aucun bloc vide ne laisse une coquille dans la page", () => {
    expect(coquilles.sort()).toEqual([])
  })

  it("aucun bloc vide ne publie de texte que personne n'a écrit", () => {
    expect(inventes.sort()).toEqual([])
  })

  it("les formulaires sont la seule exception, et elle est nommée", () => {
    // Si cette liste enflait, le balayage cesserait de garder quoi que ce soit.
    expect(FORMULAIRES.size).toBeLessThan(10)
    for (const f of FORMULAIRES) expect(BLOCK_DEFS[f], `${f} : type inconnu`).toBeTruthy()
    // Et un formulaire vide doit bel et bien rester utilisable.
    expect(rendrePublic("contact_form", {})).toContain("Envoyer")
  })
})

