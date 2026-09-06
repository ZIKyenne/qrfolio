// QRowg · Atelier d'impression — jetons de design (réduits à ce qui est RÉELLEMENT consommé).
//
// Aligné sur le design system de l'app (globals.css) : les couleurs référencent les VARIABLES CSS
// (`var(--bg)`, `var(--ink)`, `var(--accent)`…) → impossible de dériver du reste du dashboard, et
// la couleur d'accent suit l'utilisateur. Les variantes *A** existent parce que certains styles
// concatènent une alpha (`${C.gold}55`) et qu'on ne peut pas suffixer une var() — on passe par color-mix.
//
// NB : les anciennes échelles `space` / `type` / `font` / `motion` / `breakpoints` étaient déclarées
// mais jamais consommées (fiction de rigueur) → supprimées. La typo/espacement suivent globals.css.
export const color = {
  bg: 'var(--bg)',
  surface: 'var(--surface)',                 // panneau opaque (near-black chaud)
  surfaceUp: 'rgba(255,255,255,.04)',
  hairline: 'rgba(255,255,255,.08)',
  fg: 'var(--ink)',                          // crème
  fgMuted: 'var(--muted)',
  fgFaint: 'rgba(245,240,232,.44)',
  gold: 'var(--accent)',                     // suit l'accent utilisateur (défaut = or)
  goldSoft: 'color-mix(in srgb, var(--accent) 14%, transparent)',
  goldA22: 'color-mix(in srgb, var(--accent) 14%, transparent)',
  goldA33: 'color-mix(in srgb, var(--accent) 22%, transparent)',
  goldA55: 'color-mix(in srgb, var(--accent) 36%, transparent)',
  goldA88: 'color-mix(in srgb, var(--accent) 56%, transparent)',
  ok: 'var(--success)',
  okA22: 'color-mix(in srgb, var(--success) 14%, transparent)',
  bad: 'var(--danger)',
  badA22: 'var(--danger-bg)',
  badA55: 'var(--danger-border)',
}

export const radius = { chip: 999, control: 12, card: 16, sheet: 20, print: 3 }
