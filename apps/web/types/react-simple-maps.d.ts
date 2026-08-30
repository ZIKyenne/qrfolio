// react-simple-maps@3.0.0 ne publie aucun type et n'a pas de paquet @types.
// Sans cette déclaration, rallumer le mode strict échouait sur un seul import.
// On ne décrit que ce que GeoPanel utilise réellement, plutôt que de poser un
// `any` global sur tout le module — un `any` masquerait les vraies erreurs.
declare module "react-simple-maps" {
  import type { ComponentType, ReactNode, CSSProperties, SVGProps } from "react"
  export const ComposableMap: ComponentType<{
    projection?: string
    projectionConfig?: Record<string, unknown>
    width?: number
    height?: number
    style?: CSSProperties
    children?: ReactNode
  }>
  export const Geographies: ComponentType<{
    geography: string | object
    children: (args: { geographies: any[] }) => ReactNode
  }>
  export const Geography: ComponentType<SVGProps<SVGPathElement> & {
    geography: any
    style?: Record<string, CSSProperties>
  }>
  export const Marker: ComponentType<{ coordinates: [number, number]; children?: ReactNode }>
  export const ZoomableGroup: ComponentType<{ center?: [number, number]; zoom?: number; children?: ReactNode }>
}
