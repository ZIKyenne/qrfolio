// Route de harness E2E — modale de recadrage d'image (pan/zoom/ratio). GATÉE 404 en production.
import { notFound } from "next/navigation"
import { harnessAutorise } from "../gate"
import { ImageCropHarness } from "./ImageCropHarness"

export const dynamic = "force-dynamic"

export default function E2EImageCropPage() {
  if (!harnessAutorise()) notFound()
  return <ImageCropHarness />
}
