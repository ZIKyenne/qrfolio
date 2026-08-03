// Type de lien partagé des CTA. Le modèle prépare href (sûr) + external + cible de
// tracking + visibilité ; l'adapter public l'exécute, l'adapter éditeur l'ignore.
export type CtaLink = { href: string | null; external: boolean; trackTarget: string; visible: boolean }
