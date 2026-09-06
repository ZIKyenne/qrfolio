import { NextResponse } from "next/server"

// Cette route acceptait `email` et `name` dans le corps : quiconque déposait un
// lead avec l'adresse d'un tiers pouvait ensuite lui faire parvenir
// « Merci <texte libre> » depuis @qrowg.com. L'accusé de réception part désormais
// de /api/leads, après l'insertion, avec les champs bornés du lead enregistré
// (lib/accuseReceptionLead.ts). Un ancien bundle en cache peut encore l'appeler.
export async function POST() {
  return NextResponse.json({ error: "Cette route n'existe plus." }, { status: 410 })
}
