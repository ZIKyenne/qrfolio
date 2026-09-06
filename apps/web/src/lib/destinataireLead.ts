// Destinataire choisi par le commercant pour UN bloc de formulaire.
//
// `quote_form` et `booking_request` proposent depuis toujours un champ « Email
// destinataire » / « Email de contact booking ». Lu dans le code le 6 septembre :
// personne ne lisait ce champ. Les demandes partaient toujours vers l'adresse du
// compte. Un artisan qui routait ses devis vers devis@son-entreprise.fr ne
// recevait rien a cette adresse — et ne pouvait pas le deviner, puisque les
// messages arrivaient quand meme, ailleurs.
//
// Ce module est PUR et teste seul : il choisit l'adresse, il n'envoie rien.

// Une seule adresse, format simple, bornee. Surtout : aucun retour a la ligne ni
// virgule — un en-tete d'e-mail se coupe a la ligne, et une adresse qui en
// contient permettrait d'ajouter des destinataires ou des en-tetes.
const ADRESSE = /^[^\s@,;<>"'\\]{1,64}@[^\s@,;<>"'\\]{1,190}\.[a-z]{2,24}$/i

export function adresseEmailValide(v: unknown): string | null {
  if (typeof v !== "string") return null
  const s = v.trim()
  if (!s || s.length > 254) return null
  if (/[\r\n\t]/.test(s)) return null
  return ADRESSE.test(s) ? s : null
}

type BlocPage = { id?: unknown; type?: unknown; content?: unknown }

// Renvoie l'adresse saisie sur le bloc a l'origine du message, si elle est
// exploitable. Sinon null : l'appelant retombe sur l'adresse du compte.
export function destinataireDuBloc(blocks: unknown, blockId: unknown): string | null {
  if (!Array.isArray(blocks) || typeof blockId !== "string" || !blockId) return null
  const bloc = (blocks as BlocPage[]).find(b => b && typeof b === "object" && b.id === blockId)
  const contenu = bloc?.content
  if (!contenu || typeof contenu !== "object") return null
  return adresseEmailValide((contenu as Record<string, unknown>).email_dest)
}
