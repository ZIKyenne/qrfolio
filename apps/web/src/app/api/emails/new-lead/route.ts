import { NextResponse } from "next/server"

// Cette route était un relais d'e-mails ouvert : anonyme, sans lead réel, contenu
// libre, envoi depuis @qrowg.com au propriétaire de n'importe quelle page.
// L'e-mail part désormais depuis /api/leads, après l'insertion réussie
// (lib/notifierProprietaireLead.ts). Un ancien bundle encore en cache peut
// l'appeler quelques minutes : on répond « parti » sans rien envoyer.
export async function POST() {
  return NextResponse.json({ error: "Cette route n'existe plus." }, { status: 410 })
}
