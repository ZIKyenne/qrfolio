// builderFlags.ts — Feature flags LOCAUX du Builder (mission C01).
//
// `BUILDER_REDESIGN` gate la refonte UX (Vagues 1+). Défaut **OFF** : la production rend la coquille
// actuelle à l'identique. Passer à `true` (ou définir NEXT_PUBLIC_BUILDER_REDESIGN=1) active le
// chemin refondu — à ne faire qu'après QA navigateur (l'agent ne peut pas rendre le Builder
// authentifié ; cf. docs/BUILDER-REDESIGN-ROADMAP.md §0). Rollback = repasser à false.
//
// Le flag est TEMPORAIRE : il sécurise la transition écran par écran et sera retiré une fois la
// coquille migrée et validée (§26 de la mission — ne pas laisser deux Builders en prod indéfiniment).

function envFlag(name: string): boolean {
  try {
    const v = process.env[name]
    return v === "1" || v === "true"
  } catch {
    return false
  }
}

export const BUILDER_REDESIGN: boolean = envFlag("NEXT_PUBLIC_BUILDER_REDESIGN")
