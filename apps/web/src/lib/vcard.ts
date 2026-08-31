// vcard.ts — Une seule fiche contact, conforme à la norme.
//
// Deux générateurs coexistaient. Celui du bloc « contact » de la page publique
// joignait ses lignes en CRLF, comme l'exige la RFC 6350 ; celui qui fabrique les
// QR de contact — le dashboard ET le générateur public — les joignait en LF
// simple. C'est la version fautive qui partait à l'impression : une partie des
// lecteurs Android et des importeurs de contacts refusent une vCard en LF.
//
// Les deux avaient aussi leur propre fonction d'échappement, quasi identique, et
// des champs différents : l'un savait faire une adresse postale, l'autre savait
// séparer prénom et nom. Ici, les deux.

export type ChampsVCard = {
  prenom?: string
  nom?: string
  /** Nom complet, quand prénom et nom ne sont pas connus séparément. */
  nomComplet?: string
  telephone?: string
  email?: string
  organisation?: string
  fonction?: string
  siteWeb?: string
  adresse?: string
}

/** Échappe les caractères réservés d'une valeur vCard : \ , ; et retours à la ligne. */
export function echapperVCard(v: unknown): string {
  return String(v ?? "")
    .replace(/\\/g, "\\\\")
    .replace(/\r?\n/g, "\\n")
    .replace(/,/g, "\\,")
    .replace(/;/g, "\\;")
}

/** Sépare un nom complet en prénom(s) / nom, pour le champ structuré N. */
export function separerNom(complet?: string): { prenom: string; nom: string } {
  const morceaux = (complet || "").trim().split(/\s+/).filter(Boolean)
  if (morceaux.length === 0) return { prenom: "", nom: "" }
  if (morceaux.length === 1) return { prenom: morceaux[0], nom: "" }
  return { prenom: morceaux.slice(0, -1).join(" "), nom: morceaux[morceaux.length - 1] }
}

/**
 * Construit une vCard 3.0 valide. Chaîne vide s'il n'y a rien pour nommer la
 * fiche : `FN` est obligatoire, et un QR de contact sans nom n'a aucun sens.
 */
export function construireVCard(c: ChampsVCard): string {
  const prenom = (c.prenom || "").trim()
  const nom = (c.nom || "").trim()
  const complet = (c.nomComplet || "").trim()

  // Prénom + nom s'ils sont fournis séparément, sinon le nom complet.
  const affiche = [prenom, nom].filter(Boolean).join(" ") || complet
  if (!affiche) return ""

  const structure = prenom || nom ? { prenom, nom } : separerNom(complet)

  const lignes: string[] = ["BEGIN:VCARD", "VERSION:3.0"]
  lignes.push(`N:${echapperVCard(structure.nom)};${echapperVCard(structure.prenom)};;;`)
  lignes.push(`FN:${echapperVCard(affiche)}`)
  if (c.organisation?.trim()) lignes.push(`ORG:${echapperVCard(c.organisation.trim())}`)
  if (c.fonction?.trim())     lignes.push(`TITLE:${echapperVCard(c.fonction.trim())}`)
  if (c.telephone?.trim())    lignes.push(`TEL;TYPE=CELL:${echapperVCard(c.telephone.trim())}`)
  if (c.email?.trim())        lignes.push(`EMAIL;TYPE=INTERNET:${echapperVCard(c.email.trim())}`)
  if (c.siteWeb?.trim())      lignes.push(`URL:${echapperVCard(c.siteWeb.trim())}`)
  if (c.adresse?.trim())      lignes.push(`ADR;TYPE=WORK:;;${echapperVCard(c.adresse.trim())};;;;`)
  lignes.push("END:VCARD")

  // CRLF : la RFC 6350 l'impose, et c'est ce qui manquait au générateur de QR.
  return lignes.join("\r\n")
}
