// Extracteur d'items indexés PUR (répétiteurs). `build(content, i)` renvoie l'item ou null
// (filtre métier explicite par bloc — jamais de moteur générique à clés arbitraires).
// Préserve l'ordre, borne à `max`, ne mute pas `content`.
export function extractIndexed<T>(content: Record<string, any>, max: number, build: (c: Record<string, any>, i: number) => T | null): T[] {
  const out: T[] = []
  for (let i = 1; i <= max; i++) {
    const item = build(content, i)
    if (item != null) out.push(item)
  }
  return out
}
