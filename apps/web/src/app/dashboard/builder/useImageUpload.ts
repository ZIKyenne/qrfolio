import { useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { validerImage, validerFichier, type RaisonEnvoi, type ResultatEnvoi } from "./validationEnvoi"

// Compresse une image cote client avant upload : downscale (cote max) + reencodage WebP.
// Objectif : des pages publiques rapides et un stockage leger (une photo smartphone brute
// fait souvent 5-12 Mo). Non destructif pour les formats non-raster / animes (SVG, GIF).
async function compressImage(file: File, maxDim = 1600, quality = 0.82): Promise<File> {
  // On ne touche qu'aux formats raster fixes ; SVG/GIF/anime passent tels quels.
  if (!/^image\/(jpeg|png|webp)$/i.test(file.type)) return file
  if (typeof document === "undefined" || typeof createImageBitmap === "undefined") return file
  try {
    // imageOrientation "from-image" -> respecte l'orientation EXIF (photos portrait).
    const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" } as ImageBitmapOptions)
    const longest = Math.max(bitmap.width, bitmap.height)
    const scale = Math.min(1, maxDim / longest)
    // Deja petite et fichier raisonnable -> on ne recompresse pas inutilement.
    if (scale === 1 && file.size < 600_000) { bitmap.close?.(); return file }
    const w = Math.max(1, Math.round(bitmap.width * scale))
    const h = Math.max(1, Math.round(bitmap.height * scale))
    const canvas = document.createElement("canvas")
    canvas.width = w
    canvas.height = h
    const ctx = canvas.getContext("2d")
    if (!ctx) { bitmap.close?.(); return file }
    ctx.drawImage(bitmap, 0, 0, w, h)
    bitmap.close?.()
    const blob = await new Promise<Blob | null>(res => canvas.toBlob(res, "image/webp", quality))
    // Si l'encodage echoue ou n'apporte rien, on garde l'original.
    if (!blob || blob.size >= file.size) return file
    const name = file.name.replace(/\.[^.]+$/, "") + ".webp"
    return new File([blob], name, { type: "image/webp" })
  } catch {
    return file
  }
}

export function useImageUpload() {
  const [uploading, setUploading] = useState(false)
  // Un envoi échouait en silence quand il n'y avait pas de session : l'image ne
  // s'insérait pas, sans un mot. Depuis l'essai sans inscription, ce cas est la
  // norme pour un visiteur — il doit savoir que c'est le compte qui manque, pas
  // son fichier, et surtout qu'il ne sert à rien de réessayer.
  //
  // `lastError` reste exposé pour l'affichage, mais la raison est AUSSI renvoyée
  // avec le résultat : lue depuis l'état après un await, elle avait un rendu de
  // retard (« Erreur upload » au lieu de « Créez un compte », corrigé au 2ᵉ essai).
  const [lastError, setLastError] = useState<RaisonEnvoi | null>(null)

  // Validation AVANT l'envoi (type, taille), puis stockage. Jamais d'exception.
  async function envoyerImage(file: File, path: string): Promise<ResultatEnvoi> {
    setUploading(true); setLastError(null)
    const echec = (raison: RaisonEnvoi): ResultatEnvoi => { setLastError(raison); return { url: null, raison } }
    try {
      const invalide = validerImage(file)
      if (invalide) return echec(invalide)
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return echec("no_account")

      const optimized = await compressImage(file)

      const ext = (optimized.name.split(".").pop() || "webp").toLowerCase()
      const fileName = `${user.id}/${path}-${Date.now()}.${ext}`

      const { error } = await supabase.storage
        .from("page-assets")
        .upload(fileName, optimized, { upsert: true, contentType: optimized.type })

      if (error) { console.error("Upload error:", error); return echec("failed") }

      const { data: { publicUrl } } = supabase.storage
        .from("page-assets")
        .getPublicUrl(fileName)

      return { url: publicUrl, raison: null }
    } catch (e) {
      console.error("Upload error:", e)
      return echec("failed")
    } finally {
      setUploading(false)
    }
  }

  // Compatibilité : l'ancienne signature (URL ou null).
  async function uploadImage(file: File, path: string): Promise<string | null> {
    return (await envoyerImage(file, path)).url
  }

  // Liste les fichiers déjà uploadés par l'utilisateur (bibliothèque réutilisable, sans ré-upload).
  // kind: "image" (défaut) = images ; "file" = documents (pdf, doc, csv…).
  const IMAGE_RE = /\.(webp|jpe?g|png|gif|svg|avif)$/i
  async function listAssets(kind: "image" | "file" = "image"): Promise<{ name: string; url: string }[]> {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return []
    const { data, error } = await supabase.storage
      .from("page-assets")
      .list(user.id, { limit: 200, sortBy: { column: "created_at", order: "desc" } })
    if (error || !data) return []
    return data
      .filter(f => f.name && (kind === "image" ? IMAGE_RE.test(f.name) : !IMAGE_RE.test(f.name)))
      .map(f => {
        const { data: { publicUrl } } = supabase.storage.from("page-assets").getPublicUrl(`${user.id}/${f.name}`)
        return { name: f.name, url: publicUrl }
      })
  }

  // Upload d'un fichier NON-image (PDF, doc…) : pas de compression, nom d'origine préservé (slug) pour rester lisible.
  async function envoyerFichier(file: File, path = "docs"): Promise<ResultatEnvoi> {
    setUploading(true); setLastError(null)
    const echec = (raison: RaisonEnvoi): ResultatEnvoi => { setLastError(raison); return { url: null, raison } }
    try {
      const invalide = validerFichier(file)
      if (invalide) return echec(invalide)
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return echec("no_account")
      const ext = (file.name.split(".").pop() || "bin").toLowerCase()
      const base = file.name.replace(/\.[^.]+$/, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 40) || "fichier"
      const fileName = `${user.id}/${path}-${base}-${Date.now()}.${ext}`
      const { error } = await supabase.storage
        .from("page-assets")
        .upload(fileName, file, { upsert: true, contentType: file.type || undefined })
      if (error) { console.error("Upload error:", error); return echec("failed") }
      const { data: { publicUrl } } = supabase.storage.from("page-assets").getPublicUrl(fileName)
      return { url: publicUrl, raison: null }
    } catch (e) {
      console.error("Upload error:", e)
      return echec("failed")
    } finally {
      setUploading(false)
    }
  }

  async function uploadFile(file: File, path = "docs"): Promise<string | null> {
    return (await envoyerFichier(file, path)).url
  }

  // Supprime une image de la bibliothèque (storage). `name` = nom de fichier seul (sans le dossier userId).
  async function deleteAsset(name: string): Promise<boolean> {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return false
    const { error } = await supabase.storage.from("page-assets").remove([`${user.id}/${name}`])
    return !error
  }

  return { uploadImage, uploadFile, envoyerImage, envoyerFichier, uploading, listAssets, deleteAsset, lastError }
}
