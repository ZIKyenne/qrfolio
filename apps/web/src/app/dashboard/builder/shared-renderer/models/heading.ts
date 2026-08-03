// Modèle de vue PUR du bloc `heading`. Aucun React, aucun Supabase, aucun tracking.
// Source unique consommée par les adapters éditeur ET public (parité par construction).

export type HeadingViewModel = {
  visible: true              // heading est toujours rendu (jamais null)
  text: string
  subtitle?: string
  align: string              // left | center | right (défaut center)
  size: string               // small | medium | large | xl (défaut medium)
  color: string              // default | primary | accent | muted (défaut default)
}

export function headingViewModel(content: Record<string, any> | null | undefined): HeadingViewModel {
  const c = content || {}
  return {
    visible: true,
    text: typeof c.text === "string" ? c.text : "",
    subtitle: typeof c.subtitle === "string" && c.subtitle ? c.subtitle : undefined,
    align: typeof c.align === "string" && c.align ? c.align : "center",
    size: typeof c.size === "string" && c.size ? c.size : "medium",
    color: typeof c.color === "string" && c.color ? c.color : "default",
  }
}
