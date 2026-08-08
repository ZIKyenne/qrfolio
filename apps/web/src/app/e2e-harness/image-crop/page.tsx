// Route de harness E2E — modale de recadrage d'image (pan/zoom/ratio). GATÉE 404 en production.
import { notFound } from "next/navigation"
import { ImageCropHarness } from "./ImageCropHarness"

export const dynamic = "force-dynamic"

export default function E2EImageCropPage() {
  if (process.env.NODE_ENV === "production") notFound()
  return <ImageCropHarness />
}
