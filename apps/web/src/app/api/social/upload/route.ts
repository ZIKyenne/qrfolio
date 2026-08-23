// /api/social/upload — dépôt des visuels sociaux générés par l'agent de contenu.
//
// Pourquoi cette route existe : Buffer n'accepte PAS de fichier, seulement des URL
// publiques (vérifié dans son schéma GraphQL : ImageAssetInput.url est obligatoire).
// L'agent qui produit les visuels chaque matin a donc besoin d'un endroit où les
// poser pour obtenir une URL. Il les envoie ici, la route les range dans le bucket
// public `page-assets` et renvoie l'URL à donner à Buffer.
//
// Sécurité : protégée par un jeton partagé (SOCIAL_UPLOAD_TOKEN). Sans ce jeton,
// n'importe qui pourrait déposer des fichiers sur le domaine. Si la variable n'est
// pas définie, la route est FERMÉE (fail closed) — jamais ouverte par défaut.

import { NextRequest, NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/server"
import { serverError } from "@/lib/apiError"
import { timingSafeEqual } from "node:crypto"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

const BUCKET = "page-assets"
const PREFIX = "social"
const MAX_BYTES = 15 * 1024 * 1024
const ALLOWED: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "video/mp4": "mp4",
}

// Nom de fichier sûr : on ne fait JAMAIS confiance au nom fourni (traversée de
// chemin, caractères exotiques). On garde uniquement [a-z0-9-] et on impose
// l'extension déduite du type MIME réel.
function safeName(raw: string, ext: string): string {
  const base = (raw || "visuel")
    .normalize("NFKD").replace(/[\u0300-\u036f]/g, "")
    .toLowerCase().replace(/\.[a-z0-9]+$/, "")
    .replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 70)
  return `${base || "visuel"}.${ext}`
}

export async function POST(req: NextRequest) {
  const expected = process.env.SOCIAL_UPLOAD_TOKEN
  if (!expected) return NextResponse.json({ error: "Dépôt désactivé." }, { status: 503 })

  const given = req.headers.get("x-upload-token") || ""
  // Comparaison à temps constant : évite qu'on devine le jeton caractère par
  // caractère en mesurant le temps de réponse.
  const a = Buffer.from(given), b = Buffer.from(expected)
  const ok = a.length === b.length && timingSafeEqual(a, b)
  if (!ok) return NextResponse.json({ error: "Jeton invalide." }, { status: 401 })

  try {
    const form = await req.formData()
    const file = form.get("file")
    if (!(file instanceof File)) {
      return NextResponse.json({ error: "Champ `file` manquant." }, { status: 400 })
    }
    const ext = ALLOWED[file.type]
    if (!ext) {
      return NextResponse.json(
        { error: `Type non autorisé : ${file.type || "inconnu"}. Attendus : jpeg, png, webp, mp4.` },
        { status: 400 })
    }
    if (file.size > MAX_BYTES) {
      return NextResponse.json({ error: "Fichier trop lourd (15 Mo maximum)." }, { status: 400 })
    }

    // Dossier par jour : les visuels restent rangés et faciles à purger.
    const day = new Date().toISOString().slice(0, 10)
    const name = safeName(String(form.get("name") || file.name), ext)
    const path = `${PREFIX}/${day}/${name}`

    const admin = createAdminClient()
    const { error } = await admin.storage.from(BUCKET).upload(
      path,
      Buffer.from(await file.arrayBuffer()),
      { contentType: file.type, upsert: true, cacheControl: "31536000" },
    )
    if (error) return serverError("social/upload", error)

    const { data } = admin.storage.from(BUCKET).getPublicUrl(path)
    return NextResponse.json({ url: data.publicUrl, path, bytes: file.size })
  } catch (e) {
    return serverError("social/upload", e)
  }
}
