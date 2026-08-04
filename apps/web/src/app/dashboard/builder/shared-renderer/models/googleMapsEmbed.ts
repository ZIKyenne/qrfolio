// Modèle pur `google_maps_embed`. Iframe Google Maps STRICTEMENT contrôlée (via SafeEmbedModel →
// mapEmbedUrl : embed custom uniquement depuis google.<tld>/maps, sinon construction canonique
// depuis l'adresse). Lien itinéraire construit à partir de l'adresse (encodeURIComponent).
import { mapEmbedModel, type SafeEmbedModel } from "./embed"

export type MapHeight = "sm" | "md" | "lg"
export type GoogleMapsEmbedViewModel = {
  visible: boolean; embed: SafeEmbedModel; label?: string; address?: string
  height: MapHeight; showDirections: boolean; directionsHref: string | null
}

export function googleMapsEmbedViewModel(content: Record<string, any> | null | undefined): GoogleMapsEmbedViewModel {
  const c = content || {}
  const address = typeof c.address === "string" && c.address.trim() ? c.address.trim() : undefined
  const showDirections = c.show_directions !== "no" && !!address
  return {
    visible: !!(c.embed_url || c.address),  // gate legacy public
    embed: mapEmbedModel(c),
    label: typeof c.label === "string" && c.label ? c.label : undefined,
    address,
    height: c.height === "lg" ? "lg" : c.height === "sm" ? "sm" : "md",
    showDirections,
    directionsHref: address ? `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(address)}` : null,
  }
}
